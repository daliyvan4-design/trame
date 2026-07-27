import { countCodes } from "@/lib/db/store";

export const PRIX_XOF = 2000;

export type Droit = {
  gratuit: boolean;
  // Phrase affichée sous le bouton, qui explique toujours ce que la personne va payer ou non.
  motif: string;
};

// Le compte propriétaire génère sans limite ni paiement.
export function estProprietaire(email: string | null): boolean {
  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  return Boolean(owner) && Boolean(email) && email!.trim().toLowerCase() === owner;
}

// Règle de prix : le propriétaire ne paie jamais, chaque autre compte reçoit son
// premier code offert, les suivants sont à 2 000 F. Sans connexion, impossible
// d'attribuer un code offert à quelqu'un : le paiement s'applique.
export async function droitAuCodeGratuit(email: string | null): Promise<Droit> {
  if (estProprietaire(email)) {
    return { gratuit: true, motif: "Compte propriétaire : génération illimitée." };
  }

  if (!email) {
    return {
      gratuit: false,
      motif: "Connecte-toi avec Google pour recevoir ton premier code offert.",
    };
  }

  const dejaCrees = await countCodes(email);
  if (dejaCrees === 0) {
    return { gratuit: true, motif: "Ton premier code est offert. Les suivants sont à 2 000 F." };
  }

  return {
    gratuit: false,
    motif: "Paiement par Mobile Money : Orange, MTN, Wave. Fichiers PNG et SVG.",
  };
}
