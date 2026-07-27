// Géolocalisation approximative par IP, fournie par l'infrastructure (en-têtes Vercel).
// Aucune donnée précise n'est stockée : seulement une commune parmi cinq.

export const COMMUNES = ["Cocody", "Yopougon", "Plateau", "Marcory", "Autres"] as const;
export type Commune = (typeof COMMUNES)[number];

const KNOWN: Record<string, Commune> = {
  cocody: "Cocody",
  yopougon: "Yopougon",
  plateau: "Plateau",
  "le plateau": "Plateau",
  marcory: "Marcory",
};

export function communeFrom(headers: Headers): Commune {
  const raw = headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity") ?? "";
  const city = decodeURIComponent(raw).trim().toLowerCase();
  return KNOWN[city] ?? "Autres";
}
