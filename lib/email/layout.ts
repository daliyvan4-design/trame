// Gabarit commun des e-mails Trame.
//
// Les clients de messagerie ne savent pas faire ce qu'un navigateur fait : pas de
// variables CSS, pas de flexbox fiable, pas de polices web dans Outlook ni Gmail.
// Tout est donc en tableaux, en styles en ligne et en couleurs hexadécimales,
// avec la même grammaire visuelle que le site : fond calme, filets fins,
// beaucoup de vide, et l'accent qui reprend la couleur du code.

export const ENCRE = "#17151C";
export const PAGE = "#FBFBFA";
export const SOURD = "#77737F";
export const SOURD_FORT = "#5B5864";
export const SURFACE = "#F3F2F6";
export const FILET = "#ECEBEF";
export const BLANC = "#FFFFFF";

export const TITRE_FONT = "'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const CORPS_FONT = "'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function onAccentEmail(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const l = 0.2126 * c((n >> 16) & 255) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255);
  return l > 0.5 ? ENCRE : BLANC;
}

export function bouton(href: string, texte: string, accent: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" bgcolor="${accent}" style="border-radius:12px;">
        <a href="${href}"
           style="display:inline-block;padding:15px 26px;font-family:${TITRE_FONT};font-size:16px;font-weight:700;letter-spacing:-0.01em;color:${onAccentEmail(accent)};text-decoration:none;border-radius:12px;">
          ${texte}
        </a>
      </td>
    </tr>
  </table>`;
}

export function enveloppe(args: {
  preheader: string;
  accent: string;
  contenu: string;
  pied?: string;
}): string {
  const { preheader, accent, contenu } = args;
  const pied =
    args.pied ??
    "Tu reçois ce message parce que tu as un compte Trame. Fait à Abidjan.";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Trame</title>
<style>
  /* Seuls quelques clients honorent ces règles : le rendu reste correct sans elles. */
  @media (max-width: 620px) {
    .cadre { width: 100% !important; }
    .marge { padding-left: 22px !important; padding-right: 22px !important; }
    .titre { font-size: 26px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .fond { background: #131117 !important; }
    .carte { background: #1B1920 !important; }
    .txt { color: #F4F3F6 !important; }
    .txt-sourd { color: #A9A6B2 !important; }
    .filet { border-color: #2C2934 !important; }
  }
</style>
</head>
<body class="fond" style="margin:0;padding:0;background:${PAGE};">
  <!-- Aperçu affiché dans la liste des messages, avant l'ouverture -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="fond" style="background:${PAGE};">
    <tr>
      <td align="center" style="padding:32px 12px 48px;">

        <table role="presentation" class="cadre" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <tr>
            <td class="marge" style="padding:0 34px 22px;">
              <span style="font-family:${TITRE_FONT};font-size:21px;font-weight:700;letter-spacing:-0.02em;color:${ENCRE};" class="txt">Trame<span style="color:${accent};">.</span></span>
            </td>
          </tr>

          <tr>
            <td class="carte" bgcolor="${BLANC}" style="background:${BLANC};border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="marge" style="padding:34px;">
                    ${contenu}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="marge" style="padding:24px 34px 0;">
              <p class="txt-sourd" style="margin:0;font-family:${CORPS_FONT};font-size:12.5px;line-height:1.55;color:${SOURD};">
                ${pied}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
