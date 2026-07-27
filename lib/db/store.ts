import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { ContentType, ContentFields } from "@/lib/qr/encode";
import type { QrStyle } from "@/lib/qr/style";

export type SavedCode = {
  id: string;
  ownerEmail: string;
  name: string;
  type: ContentType;
  fields: ContentFields;
  style: QrStyle;
  // Contenu final encodé dans le QR : URL de redirection si suivi, donnée brute sinon.
  encoded: string;
  target: string;
  tracked: boolean;
  createdAt: string;
  paymentRef: string;
};

export type Scan = {
  codeId: string;
  at: string;
  commune: string;
};

// Initialisation paresseuse : neon() lève si DATABASE_URL manque, et Next.js
// évalue le code de module au build, avant que les variables soient disponibles.
let client: ReturnType<typeof neon> | null = null;

function sql() {
  if (!client) client = neon(process.env.DATABASE_URL!);
  return client;
}

let ready: Promise<void> | null = null;

// Le schéma est créé à la première requête : pas d'étape de migration à oublier
// avant la première vente.
function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const q = sql();
      await q`
        CREATE TABLE IF NOT EXISTS codes (
          id           TEXT PRIMARY KEY,
          owner_email  TEXT NOT NULL DEFAULT '',
          name         TEXT NOT NULL,
          type         TEXT NOT NULL,
          fields       JSONB NOT NULL,
          style        JSONB NOT NULL,
          encoded      TEXT NOT NULL,
          target       TEXT NOT NULL,
          tracked      BOOLEAN NOT NULL,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          payment_ref  TEXT NOT NULL
        )
      `;
      await q`
        CREATE TABLE IF NOT EXISTS scans (
          id       BIGSERIAL PRIMARY KEY,
          code_id  TEXT NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
          at       TIMESTAMPTZ NOT NULL DEFAULT now(),
          commune  TEXT NOT NULL
        )
      `;
      await q`
        CREATE TABLE IF NOT EXISTS payments (
          reference   TEXT PRIMARY KEY,
          code_id     TEXT NOT NULL,
          status      TEXT NOT NULL DEFAULT 'en_attente',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await q`CREATE INDEX IF NOT EXISTS codes_owner_idx ON codes (owner_email, created_at DESC)`;
      await q`CREATE INDEX IF NOT EXISTS scans_code_idx ON scans (code_id, at DESC)`;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

type CodeRow = {
  id: string;
  owner_email: string;
  name: string;
  type: string;
  fields: ContentFields;
  style: QrStyle;
  encoded: string;
  target: string;
  tracked: boolean;
  created_at: Date | string;
  payment_ref: string;
};

function toCode(r: CodeRow): SavedCode {
  return {
    id: r.id,
    ownerEmail: r.owner_email,
    name: r.name,
    type: r.type as ContentType,
    fields: r.fields,
    style: r.style,
    encoded: r.encoded,
    target: r.target,
    tracked: r.tracked,
    createdAt: new Date(r.created_at).toISOString(),
    paymentRef: r.payment_ref,
  };
}

export function newCodeId(): string {
  return crypto.randomBytes(5).toString("base64url").toLowerCase().replace(/[_-]/g, "a");
}

export async function saveCode(code: SavedCode): Promise<SavedCode> {
  await ensureSchema();
  await sql()`
    INSERT INTO codes (id, owner_email, name, type, fields, style, encoded, target, tracked, created_at, payment_ref)
    VALUES (
      ${code.id}, ${code.ownerEmail}, ${code.name}, ${code.type},
      ${JSON.stringify(code.fields)}::jsonb, ${JSON.stringify(code.style)}::jsonb,
      ${code.encoded}, ${code.target}, ${code.tracked}, ${code.createdAt}, ${code.paymentRef}
    )
    ON CONFLICT (id) DO NOTHING
  `;
  return code;
}

export async function countCodes(ownerEmail: string): Promise<number> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT count(*)::int AS n FROM codes WHERE owner_email = ${ownerEmail}
  `) as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

// Insertion conditionnelle en une seule instruction : deux requêtes simultanées ne
// peuvent pas obtenir deux codes offerts pour le même compte. Renvoie false quand
// le compte avait déjà un code, donc quand le code aurait dû être payé.
export async function saveFirstFreeCode(code: SavedCode): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    INSERT INTO codes (id, owner_email, name, type, fields, style, encoded, target, tracked, created_at, payment_ref)
    SELECT ${code.id}, ${code.ownerEmail}, ${code.name}, ${code.type},
           ${JSON.stringify(code.fields)}::jsonb, ${JSON.stringify(code.style)}::jsonb,
           ${code.encoded}, ${code.target}, ${code.tracked}, ${code.createdAt}, ${code.paymentRef}
    WHERE NOT EXISTS (SELECT 1 FROM codes WHERE owner_email = ${code.ownerEmail})
    RETURNING id
  `) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function getCode(id: string): Promise<SavedCode | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM codes WHERE id = ${id}`) as CodeRow[];
  return rows[0] ? toCode(rows[0]) : null;
}

export async function listCodes(ownerEmail: string): Promise<SavedCode[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM codes WHERE owner_email = ${ownerEmail} ORDER BY created_at DESC
  `) as CodeRow[];
  return rows.map(toCode);
}

export async function recordScan(scan: Scan): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO scans (code_id, at, commune) VALUES (${scan.codeId}, ${scan.at}, ${scan.commune})
  `;
}

export async function scansFor(codeId: string): Promise<Scan[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT code_id, at, commune FROM scans WHERE code_id = ${codeId}
  `) as Array<{ code_id: string; at: Date | string; commune: string }>;
  return rows.map((r) => ({
    codeId: r.code_id,
    at: new Date(r.at).toISOString(),
    commune: r.commune,
  }));
}

export type PaymentStatus = "en_attente" | "paye" | "echec";

// L'état des paiements est conservé chez nous : c'est ce qui permet au webhook
// de trancher même quand l'API de l'agrégateur est indisponible.
export async function openPayment(reference: string, codeId: string): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO payments (reference, code_id) VALUES (${reference}, ${codeId})
    ON CONFLICT (reference) DO NOTHING
  `;
}

export async function setPaymentStatus(reference: string, status: PaymentStatus): Promise<void> {
  await ensureSchema();
  // Un paiement confirmé ne redevient jamais un échec : seul le premier verdict
  // définitif compte, qu'il vienne du webhook ou de la vérification par sondage.
  await sql()`
    UPDATE payments SET status = ${status}, updated_at = now()
    WHERE reference = ${reference} AND status = 'en_attente'
  `;
}

export async function getPayment(
  reference: string,
): Promise<{ reference: string; codeId: string; status: PaymentStatus } | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT reference, code_id, status FROM payments WHERE reference = ${reference}
  `) as Array<{ reference: string; code_id: string; status: PaymentStatus }>;
  const r = rows[0];
  return r ? { reference: r.reference, codeId: r.code_id, status: r.status } : null;
}

export async function scanCountsByCode(ownerEmail: string): Promise<Record<string, Scan[]>> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT s.code_id, s.at, s.commune
    FROM scans s
    JOIN codes c ON c.id = s.code_id
    WHERE c.owner_email = ${ownerEmail}
  `) as Array<{ code_id: string; at: Date | string; commune: string }>;
  const out: Record<string, Scan[]> = {};
  for (const r of rows) {
    (out[r.code_id] ??= []).push({
      codeId: r.code_id,
      at: new Date(r.at).toISOString(),
      commune: r.commune,
    });
  }
  return out;
}
