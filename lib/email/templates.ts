import {
  bouton,
  CORPS_FONT,
  ENCRE,
  enveloppe,
  FILET,
  SOURD,
  SOURD_FORT,
  SURFACE,
  TITRE_FONT,
} from "./layout";

const VIOLET = "#6C3BF5";

function titre(texte: string, accent: string): string {
  return `<h1 class="titre txt" style="margin:0 0 14px;font-family:${TITRE_FONT};font-size:30px;line-height:1.12;letter-spacing:-0.03em;font-weight:700;color:${ENCRE};">${texte}</h1>`;
}

function para(texte: string): string {
  return `<p class="txt-sourd" style="margin:0 0 16px;font-family:${CORPS_FONT};font-size:15.5px;line-height:1.6;color:${SOURD_FORT};">${texte}</p>`;
}

function filet(): string {
  return `<div class="filet" style="border-top:1px solid ${FILET};margin:26px 0 22px;line-height:0;font-size:0;">&nbsp;</div>`;
}

// 1. Bienvenue, envoyé à la première connexion Google.
// Il n'y a rien à « confirmer » : Google a déjà vérifié l'adresse. Ce message
// sert donc à accuser réception du compte et à ouvrir la première action utile.
export function emailBienvenue(args: { prenom?: string; email: string; lien: string }): string {
  const bonjour = args.prenom ? `Bonjour ${args.prenom},` : "Bonjour,";
  return enveloppe({
    preheader: "Ton compte Trame est ouvert, et ton premier QR code est offert.",
    accent: VIOLET,
    contenu: `
      ${titre("Ton compte est ouvert.", VIOLET)}
      ${para(`${bonjour} tu peux maintenant composer tes QR codes et suivre leurs scans depuis « Mes codes ».`)}

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${SURFACE};border-radius:14px;margin:4px 0 22px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-family:${TITRE_FONT};font-size:17px;font-weight:700;color:${ENCRE};" class="txt">Ton premier code est offert</p>
            <p class="txt-sourd" style="margin:0;font-family:${CORPS_FONT};font-size:14px;line-height:1.55;color:${SOURD};">Les suivants sont à 2 000 F, payés une fois, sans abonnement.</p>
          </td>
        </tr>
      </table>

      ${bouton(args.lien, "Composer mon premier code", VIOLET)}

      ${filet()}
      <p class="txt-sourd" style="margin:0;font-family:${CORPS_FONT};font-size:13.5px;line-height:1.6;color:${SOURD};">
        Compte associé à <span style="color:${ENCRE};" class="txt">${args.email}</span>.
        On ne lit que ton adresse, pour retrouver tes codes. Rien d'autre.
      </p>`,
  });
}

// 2. Livraison, envoyé quand un code vient d'être créé.
// L'image du QR est jointe au message : les clients de messagerie bloquent
// souvent les images distantes, un fichier joint reste visible et réutilisable.
export function emailCodeLivre(args: {
  nomDuCode: string;
  typeLabel: string;
  accent: string;
  lien: string;
  suivi: boolean;
  offert: boolean;
}): string {
  const { accent } = args;
  return enveloppe({
    preheader: `${args.nomDuCode} est prêt : tes fichiers PNG et SVG sont en pièce jointe.`,
    accent,
    contenu: `
      ${titre("Ton QR code est prêt.", accent)}
      ${para(
        args.offert
          ? "C'est le code offert de ton compte. Tes fichiers sont joints à ce message : le PNG pour imprimer tout de suite, le SVG pour agrandir sans perte."
          : "Merci pour ton achat. Tes fichiers sont joints à ce message : le PNG pour imprimer tout de suite, le SVG pour agrandir sans perte.",
      )}

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 26px;">
        <tr>
          <td style="padding:0 0 10px;border-bottom:1px solid ${FILET};" class="filet">
            <span class="txt-sourd" style="font-family:${CORPS_FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${SOURD};">Ce que tu as créé</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0 8px;">
            <p style="margin:0 0 3px;font-family:${TITRE_FONT};font-size:19px;font-weight:700;color:${ENCRE};" class="txt">${args.nomDuCode}</p>
            <p class="txt-sourd" style="margin:0;font-family:${CORPS_FONT};font-size:14px;color:${SOURD};">${args.typeLabel}</p>
          </td>
        </tr>
      </table>

      ${bouton(args.lien, "Voir ce code et ses scans", accent)}

      ${filet()}
      <p class="txt-sourd" style="margin:0;font-family:${CORPS_FONT};font-size:13.5px;line-height:1.6;color:${SOURD};">
        ${
          args.suivi
            ? "Chaque ouverture réelle de ce code est comptée, avec la commune d'où elle vient. Teste-le avec ton propre téléphone avant d'imprimer : c'est le seul essai qui compte."
            : "Ce type de code fonctionne sans connexion : la donnée est écrite dans le code lui-même, donc ses scans ne peuvent pas être comptés. Teste-le avec ton propre téléphone avant d'imprimer."
        }
      </p>`,
  });
}
