import crypto from "node:crypto";

export const APPAREILS = ["iPhone", "Android", "Autre"] as const;
export type Appareil = (typeof APPAREILS)[number];

export function appareilDepuis(headers: Headers): Appareil {
  const ua = (headers.get("user-agent") ?? "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iPhone";
  if (/android/.test(ua)) return "Android";
  return "Autre";
}

// Empreinte grossière d'un appareil, pour distinguer « 40 scans » de « 40 personnes ».
// C'est un condensat non réversible d'adresse IP et de navigateur, salé par le secret
// du serveur : il ne sort jamais de la base, ne permet aucun recoupement avec un autre
// site, et ne dit rien de l'identité de la personne. Deux personnes sur le même réseau
// peuvent compter pour une seule : c'est une estimation, affichée comme telle.
export function empreinteDepuis(headers: Headers): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "inconnue";
  const ua = headers.get("user-agent") ?? "inconnu";
  const sel = process.env.AUTH_SECRET ?? "trame";
  return crypto.createHash("sha256").update(`${ip}|${ua}|${sel}`).digest("hex").slice(0, 16);
}
