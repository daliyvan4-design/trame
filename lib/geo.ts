// Localisation approximative d'un scan, fournie par l'infrastructure à partir de l'IP.
//
// Limite importante et assumée : une adresse IP situe une ville, pas un quartier.
// Pour un scan fait à Cocody, le réseau répond « Abidjan », jamais « Cocody ».
// On enregistre donc ce que le réseau dit vraiment, sans inventer une précision
// que la donnée n'a pas. Quand la ville rapportée est justement une commune
// d'Abidjan, elle s'affiche telle quelle : rien n'est perdu.

export type Lieu = { ville: string; pays: string };

export const LIEU_INCONNU = "Lieu inconnu";

const PAYS: Record<string, string> = {
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  ML: "Mali",
  BF: "Burkina Faso",
  GH: "Ghana",
  FR: "France",
  US: "États-Unis",
};

export function nomDuPays(code: string): string {
  return PAYS[code] ?? code;
}

export function lieuDepuis(headers: Headers): Lieu {
  const brut = headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity") ?? "";
  let ville = "";
  try {
    ville = decodeURIComponent(brut).trim();
  } catch {
    ville = brut.trim();
  }
  const pays = (headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? "")
    .trim()
    .toUpperCase();
  return { ville, pays };
}

// Libellé affiché : la ville quand on l'a, sinon le pays, sinon rien d'affirmé.
export function libelleDuLieu(lieu: Lieu): string {
  if (lieu.ville) return lieu.ville;
  if (lieu.pays) return nomDuPays(lieu.pays);
  return LIEU_INCONNU;
}
