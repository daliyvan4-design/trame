// Paiement Mobile Money. L'agrégateur réel est CinetPay (Orange, MTN, Wave en Côte d'Ivoire).
// Sans clés configurées, un pilote de démonstration prend le relais : l'interface reste identique.

export type Operator = "orange" | "mtn" | "wave";

export const OPERATORS: Array<{ id: Operator; label: string; hint: string }> = [
  { id: "orange", label: "Orange Money", hint: "Orange CI" },
  { id: "mtn", label: "MTN MoMo", hint: "MTN CI" },
  { id: "wave", label: "Wave", hint: "Wave CI" },
];

export const PRICE_XOF = 2000;

export type PaymentInit = {
  operator: Operator;
  phone: string;
  reference: string;
  description: string;
};

export type PaymentResult =
  | { status: "en_attente"; reference: string; redirectUrl?: string }
  | { status: "paye"; reference: string }
  | { status: "echec"; reference: string; message: string };

export const cinetpayConfigured = Boolean(
  process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID,
);

export function operatorLabel(op: Operator): string {
  return OPERATORS.find((o) => o.id === op)?.label ?? op;
}

// 8 chiffres minimum une fois l'indicatif retiré : couvre les numéros ivoiriens à 10 chiffres.
export function validPhone(raw: string): boolean {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("225")) d = d.slice(3);
  return d.length >= 8;
}

async function cinetpayInit(input: PaymentInit): Promise<PaymentResult> {
  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: input.reference,
      amount: PRICE_XOF,
      currency: "XOF",
      description: input.description,
      customer_phone_number: input.phone.replace(/\D/g, ""),
      channels: "MOBILE_MONEY",
      notify_url: `${process.env.APP_URL ?? ""}/api/paiement/notification`,
      return_url: `${process.env.APP_URL ?? ""}/generateur`,
    }),
  });
  const body = (await res.json()) as {
    code?: string;
    message?: string;
    data?: { payment_url?: string };
  };
  if (body.code !== "201") {
    return {
      status: "echec",
      reference: input.reference,
      message: body.message ?? "Le paiement n'a pas abouti",
    };
  }
  return { status: "en_attente", reference: input.reference, redirectUrl: body.data?.payment_url };
}

async function cinetpayCheck(reference: string): Promise<PaymentResult> {
  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: reference,
    }),
  });
  const body = (await res.json()) as { data?: { status?: string }; message?: string };
  const status = body.data?.status;
  if (status === "ACCEPTED") return { status: "paye", reference };
  if (status === "PENDING" || status === "WAITING_FOR_CUSTOMER")
    return { status: "en_attente", reference };
  return {
    status: "echec",
    reference,
    message: body.message ?? "Le paiement n'a pas abouti",
  };
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

export async function initPayment(input: PaymentInit): Promise<PaymentResult> {
  if (!validPhone(input.phone)) {
    return {
      status: "echec",
      reference: input.reference,
      message: "Entre un numéro Mobile Money valide (8 chiffres minimum).",
    };
  }
  if (cinetpayConfigured) return cinetpayInit(input);
  return { status: "en_attente", reference: input.reference };
}

export async function checkPayment(reference: string): Promise<PaymentResult> {
  if (cinetpayConfigured) return cinetpayCheck(reference);
  const started = demoStartedAt(reference);
  if (started === null) return { status: "echec", reference, message: "Le paiement n'a pas abouti" };
  if (Date.now() - started < DEMO_ATTENTE_MS) return { status: "en_attente", reference };
  return { status: "paye", reference };
}

export function newReference(): string {
  return (
    "TRAME-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}
