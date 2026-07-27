// Domaine public des liens courts : trame.ci en production, l'URL de déploiement sinon.
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

// Version courte affichée dans l'interface (sans le protocole).
export function shortHost(): string {
  return appUrl().replace(/^https?:\/\//, "");
}
