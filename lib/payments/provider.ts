import crypto from "node:crypto";
import { appUrl } from "@/lib/url";

// Paiement Mobile Money via GeniusPay (Wave, Orange Money, MTN Money en Côte d'Ivoire).
// Sans clés configurées, un pilote de démonstration prend le relais : l'interface reste identique.

export type Operator = "orange" | "mtn" | "wave";

export const OPERATORS: Array<{ id: Operator; label: string; hint: string }> = [
  { id: "orange", label: "Orange Money", hint: "Orange CI" },
  { id: "mtn", label: "MTN MoMo", hint: "MTN CI" },
  { id: "wave", label: "Wave", hint: "Wave CI" },
];

// Noms de méthode attendus par GeniusPay.
const METHODE: Record<Operator, string> = {
  orange: "orange_money",
  mtn: "mtn_money",
  wave: "wave",
};

export const PRICE_XOF = 2000;

const BASE = "https://pay.genius.ci/api/v1/merchant";

export type PaymentInit = {
  operator: Operator;
  phone: string;
  description: string;
  codeId: string;
};

export type PaymentResult =
  | { status: "en_attente"; reference: string; redirectUrl?: string }
  | { status: "paye"; reference: string }
  | { status: "echec"; reference: string; message: string };

export const geniuspayConfigured = Boolean(
  process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_API_SECRET,
);

export function operatorLabel(op: Operator): string {
  return OPERATORS.find((o) => o.id === op)?.label ?? op;
}

function digits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  return d;
}

// 8 chiffres minimum une fois l'indicatif retiré : couvre les numéros ivoiriens à 10 chiffres.
export function validPhone(raw: string): boolean {
  const d = digits(raw);
  return (d.startsWith("225") ? d.slice(3) : d).length >= 8;
}

function toInternational(raw: string): string {
  let d = digits(raw);
  if (!d.startsWith("225")) d = "225" + d;
  return "+" + d;
}

function headers(): Record<string, string> {
  return {
    "X-API-Key": process.env.GENIUSPAY_API_KEY!,
    "X-API-Secret": process.env.GENIUSPAY_API_SECRET!,
    "Content-Type": "application/json",
  };
}

type GeniusData = {
  reference?: string;
  status?: string;
  payment_url?: string;
  checkout_url?: string;
};

// Traduit les états GeniusPay en une phrase que la personne peut comprendre et corriger.
function raisonDeLEchec(status: string | undefined): string {
  switch (status) {
    case "failed":
      return "Le paiement a été refusé par ton opérateur.";
    case "cancelled":
      return "Le paiement a été annulé avant d'être confirmé.";
    case "expired":
      return "Le lien de paiement a expiré avant la confirmation.";
    case "refunded":
      return "Ce paiement a déjà été remboursé.";
    default:
      return "Le paiement n'a pas abouti";
  }
}

async function geniusInit(input: PaymentInit): Promise<PaymentResult> {
  try {
    const res = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        amount: PRICE_XOF,
        currency: "XOF",
        payment_method: METHODE[input.operator],
        description: input.description,
        customer: { phone: toInternational(input.phone), country: "CI" },
        success_url: `${appUrl()}/generateur?paiement=reussi`,
        error_url: `${appUrl()}/generateur?paiement=echoue`,
        // L'identifiant du futur code voyage avec la transaction : il revient
        // tel quel dans la vérification et dans le webhook.
        metadata: { codeId: input.codeId },
      }),
    });
    const body = (await res.json()) as { success?: boolean; data?: GeniusData; message?: string };
    const data = body?.data;
    if (!res.ok || !body?.success || !data?.reference) {
      return { status: "echec", reference: "", message: body?.message ?? "Le paiement n'a pas abouti" };
    }
    return {
      status: "en_attente",
      reference: data.reference,
      redirectUrl: data.payment_url ?? data.checkout_url,
    };
  } catch {
    return { status: "echec", reference: "", message: "Le paiement n'a pas abouti" };
  }
}

// Règle de sûreté : « je ne sais pas » n'est jamais « c'est raté ». Une panne de
// l'agrégateur, une coupure réseau ou une réponse illisible laissent la transaction
// en attente. Seul un état négatif explicite conclut à l'échec, sans quoi une personne
// qui vient de payer se verrait annoncer que son paiement n'a pas abouti.
async function geniusCheck(reference: string): Promise<PaymentResult> {
  try {
    const res = await fetch(`${BASE}/payments/${encodeURIComponent(reference)}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (res.status >= 500 || res.status === 429) return { status: "en_attente", reference };

    const texte = await res.text();
    let body: { success?: boolean; data?: GeniusData; message?: string } | null = null;
    try {
      body = JSON.parse(texte);
    } catch {
      // L'agrégateur a renvoyé une page HTML au lieu de JSON : incident chez lui.
      return { status: "en_attente", reference };
    }

    const status = body?.data?.status;
    if (status === "completed") return { status: "paye", reference };
    if (status === "failed" || status === "cancelled" || status === "expired" || status === "refunded") {
      return { status: "echec", reference, message: raisonDeLEchec(status) };
    }
    return { status: "en_attente", reference };
  } catch {
    return { status: "en_attente", reference };
  }
}

// Vérifie l'authenticité d'un webhook : signature HMAC-SHA256 sur « horodatage.corps »,
// comparée en temps constant, et horodatage récent pour écarter les rejeux.
export function verifyWebhook(rawBody: string, signature: string, timestamp: string): boolean {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !timestamp) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Pilote de démonstration : suit le même cycle (attente puis confirmation) sans débit réel.
// L'instant de départ est lu dans la référence elle-même, donc aucune mémoire partagée
// n'est nécessaire : deux requêtes traitées par deux instances donnent le même verdict.
const DEMO_ATTENTE_MS = 3200;

function demoStartedAt(reference: string): number | null {
  const part = /^TRAME-([0-9A-Z]+)-[0-9A-Z]+$/.exec(reference)?.[1];
  if (!part) return null;
  const ms = parseInt(part, 36);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

export function newReference(): string {
  return (
    "TRAME-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

export async function initPayment(input: PaymentInit): Promise<PaymentResult> {
  if (!validPhone(input.phone)) {
    return {
      status: "echec",
      reference: "",
      message: "Entre un numéro Mobile Money valide (8 chiffres minimum).",
    };
  }
  if (geniuspayConfigured) return geniusInit(input);
  return { status: "en_attente", reference: newReference() };
}

export async function checkPayment(reference: string): Promise<PaymentResult> {
  if (geniuspayConfigured) return geniusCheck(reference);
  const started = demoStartedAt(reference);
  if (started === null) return { status: "echec", reference, message: "Le paiement n'a pas abouti" };
  if (Date.now() - started < DEMO_ATTENTE_MS) return { status: "en_attente", reference };
  return { status: "paye", reference };
}
