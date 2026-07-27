import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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

type Shape = { codes: SavedCode[]; scans: Scan[] };

const FILE = path.join(process.cwd(), ".data", "trame.json");
const EMPTY: Shape = { codes: [], scans: [] };

// Driver fichier : suffisant en développement, remplaçable par Neon Postgres
// (Vercel Marketplace) sans toucher aux appels ci-dessous.
async function read(): Promise<Shape> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Shape>;
    return { codes: parsed.codes ?? [], scans: parsed.scans ?? [] };
  } catch {
    return { ...EMPTY };
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

async function write(next: Shape): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
}

// Sérialise les écritures pour éviter que deux requêtes concurrentes s'écrasent.
function mutate<T>(fn: (data: Shape) => Promise<T> | T): Promise<T> {
  const run = writeChain.then(async () => {
    const data = await read();
    const result = await fn(data);
    await write(data);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export function newCodeId(): string {
  return crypto.randomBytes(5).toString("base64url").toLowerCase().replace(/[_-]/g, "a");
}

export async function saveCode(code: SavedCode): Promise<SavedCode> {
  return mutate((data) => {
    const existing = data.codes.findIndex((c) => c.id === code.id);
    if (existing >= 0) data.codes[existing] = code;
    else data.codes.unshift(code);
    return code;
  });
}

export async function getCode(id: string): Promise<SavedCode | null> {
  const data = await read();
  return data.codes.find((c) => c.id === id) ?? null;
}

export async function listCodes(ownerEmail: string): Promise<SavedCode[]> {
  const data = await read();
  return data.codes
    .filter((c) => c.ownerEmail === ownerEmail)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function recordScan(scan: Scan): Promise<void> {
  await mutate((data) => {
    data.scans.push(scan);
  });
}

export async function scansFor(codeId: string): Promise<Scan[]> {
  const data = await read();
  return data.scans.filter((s) => s.codeId === codeId);
}

export async function scanCountsByCode(ownerEmail: string): Promise<Record<string, Scan[]>> {
  const data = await read();
  const mine = new Set(data.codes.filter((c) => c.ownerEmail === ownerEmail).map((c) => c.id));
  const out: Record<string, Scan[]> = {};
  for (const s of data.scans) {
    if (!mine.has(s.codeId)) continue;
    (out[s.codeId] ??= []).push(s);
  }
  return out;
}
