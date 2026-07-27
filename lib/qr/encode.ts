// Encodage des 11 types de contenu vers la donnée QR, avec validation en français.

export type ContentType =
  | "lien"
  | "whatsapp"
  | "wifi"
  | "appel"
  | "sms"
  | "email"
  | "contact"
  | "lieu"
  | "evenement"
  | "paiement"
  | "texte";

export type ContentFields = Record<string, string>;

export type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "url" | "textarea" | "date" | "time";
};

export type ContentTypeDef = {
  id: ContentType;
  label: string;
  help: string;
  fields: FieldDef[];
};

// Types "hors ligne" : la donnée brute est encodée dans le QR, pas de redirection,
// donc pas de statistiques de scan possibles.
export const OFFLINE_TYPES: ContentType[] = [
  "wifi",
  "contact",
  "sms",
  "appel",
  "lieu",
  "evenement",
  "texte",
];

export function isTrackable(type: ContentType): boolean {
  return !OFFLINE_TYPES.includes(type);
}

export const CONTENT_TYPES: ContentTypeDef[] = [
  {
    id: "lien",
    label: "Lien",
    help: "Colle l'adresse de ton site, ton menu ou ta page. On ajoute https:// si besoin.",
    fields: [{ key: "url", label: "Ton lien", placeholder: "maquis-chez-tantie.ci", type: "url" }],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    help: "Le scan ouvre une discussion WhatsApp avec toi. L'indicatif 225 est ajouté automatiquement.",
    fields: [{ key: "phone", label: "Numéro WhatsApp", placeholder: "07 08 09 10 11", type: "tel" }],
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    help: "Le scan connecte directement au réseau, sans taper le mot de passe.",
    fields: [
      { key: "ssid", label: "Nom du réseau (SSID)", placeholder: "Salon Chez Awa" },
      { key: "password", label: "Mot de passe", placeholder: "Laisse vide si réseau ouvert" },
    ],
  },
  {
    id: "appel",
    label: "Appel",
    help: "Le scan lance l'appel : pratique sur une vitrine ou un flyer.",
    fields: [{ key: "phone", label: "Numéro à appeler", placeholder: "07 08 09 10 11", type: "tel" }],
  },
  {
    id: "sms",
    label: "SMS",
    help: "Le scan ouvre un SMS déjà rédigé, prêt à envoyer.",
    fields: [
      { key: "phone", label: "Numéro", placeholder: "07 08 09 10 11", type: "tel" },
      { key: "message", label: "Message pré-écrit", placeholder: "Bonjour, je viens pour la commande", type: "textarea" },
    ],
  },
  {
    id: "email",
    label: "E-mail",
    help: "Le scan ouvre un e-mail qui t'est adressé, avec l'objet déjà rempli.",
    fields: [
      { key: "address", label: "Adresse e-mail", placeholder: "awa.kone@gmail.com", type: "email" },
      { key: "subject", label: "Objet (facultatif)", placeholder: "Commande depuis le QR" },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    help: "Le scan propose d'ajouter ta fiche dans les contacts du téléphone.",
    fields: [
      { key: "name", label: "Nom complet", placeholder: "Awa Koné" },
      { key: "org", label: "Entreprise", placeholder: "Chez Awa" },
      { key: "phone", label: "Téléphone", placeholder: "07 08 09 10 11", type: "tel" },
      { key: "address", label: "E-mail", placeholder: "awa.kone@gmail.com", type: "email" },
    ],
  },
  {
    id: "lieu",
    label: "Lieu",
    help: "Appui long sur ton adresse dans Maps pour copier les coordonnées GPS.",
    fields: [
      { key: "name", label: "Nom du lieu", placeholder: "Maquis Chez Tantie" },
      { key: "lat", label: "Latitude", placeholder: "5.3364" },
      { key: "lng", label: "Longitude", placeholder: "-4.0267" },
    ],
  },
  {
    id: "evenement",
    label: "Événement",
    help: "Le scan ajoute l'événement à l'agenda du téléphone.",
    fields: [
      { key: "title", label: "Titre de l'événement", placeholder: "Soirée d'ouverture" },
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Heure (facultatif)", type: "time" },
    ],
  },
  {
    id: "paiement",
    label: "Paiement",
    help: "Colle ton lien Wave ou Orange Money : le scan ouvre directement la page de paiement.",
    fields: [{ key: "url", label: "Ton lien de paiement", placeholder: "https://pay.wave.com/m/...", type: "url" }],
  },
  {
    id: "texte",
    label: "Texte libre",
    help: "Le texte s'affiche tel quel au scan, même sans connexion.",
    fields: [{ key: "text", label: "Ton texte", placeholder: "Écris ce que tu veux transmettre", type: "textarea" }],
  },
];

export function typeLabel(type: ContentType): string {
  return CONTENT_TYPES.find((t) => t.id === type)?.label ?? type;
}

function digits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

// Normalise un numéro pour l'international : indicatif 225 ajouté aux numéros ivoiriens locaux.
export function normalizePhone(raw: string): string {
  let d = digits(raw);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "225" + d;
  return d;
}

function normalizeUrl(raw: string): string {
  const u = (raw || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
}

const wifiEscape = (s: string) => (s || "").replace(/([\\;,:"])/g, "\\$1");
const vcardEscape = (s: string) => (s || "").replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");

// Retourne un message d'erreur concret, ou null si les champs sont valides.
export function validateContent(type: ContentType, f: ContentFields): string | null {
  switch (type) {
    case "lien":
    case "paiement": {
      const u = normalizeUrl(f.url ?? "");
      if (!u || !/^https?:\/\/[^\s.]+(\.[^\s.]+)+/i.test(u))
        return "Colle un lien complet, par exemple https://maquis-chez-tantie.ci";
      return null;
    }
    case "whatsapp":
    case "appel":
      if (normalizePhone(f.phone ?? "").length < 8)
        return "Entre un numéro valide (8 chiffres minimum).";
      return null;
    case "sms":
      if (normalizePhone(f.phone ?? "").length < 8)
        return "Entre un numéro valide (8 chiffres minimum).";
      return null;
    case "wifi":
      if (!(f.ssid ?? "").trim()) return "Donne le nom exact de ton réseau Wi-Fi.";
      return null;
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.address ?? "").trim()))
        return "Entre une adresse e-mail valide.";
      return null;
    case "contact":
      if (!(f.name ?? "").trim()) return "Donne au moins un nom pour la fiche contact.";
      if (normalizePhone(f.phone ?? "").length < 8)
        return "Ajoute un numéro de téléphone valide à la fiche.";
      return null;
    case "lieu": {
      const lat = parseFloat(f.lat ?? "");
      const lng = parseFloat(f.lng ?? "");
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
        return "Entre des coordonnées GPS valides, par exemple 5.3364 et -4.0267.";
      return null;
    }
    case "evenement":
      if (!(f.title ?? "").trim() || !(f.date ?? "").trim())
        return "Donne un titre et une date à ton événement.";
      return null;
    case "texte":
      if (!(f.text ?? "").trim()) return "Écris le texte à encoder.";
      return null;
  }
}

// Construit la donnée réellement encodée dans le QR (ou la cible de redirection pour les types suivis).
export function encodeContent(type: ContentType, f: ContentFields): string {
  switch (type) {
    case "lien":
    case "paiement":
      return normalizeUrl(f.url ?? "");
    case "whatsapp":
      return "https://wa.me/" + normalizePhone(f.phone ?? "");
    case "appel":
      return "tel:+" + normalizePhone(f.phone ?? "");
    case "sms":
      return "SMSTO:+" + normalizePhone(f.phone ?? "") + ":" + (f.message ?? "").trim();
    case "email": {
      const subject = (f.subject ?? "").trim();
      return (
        "mailto:" + (f.address ?? "").trim() + (subject ? "?subject=" + encodeURIComponent(subject) : "")
      );
    }
    case "wifi": {
      const pass = f.password ?? "";
      const sec = pass ? "WPA" : "nopass";
      return `WIFI:T:${sec};S:${wifiEscape(f.ssid ?? "")};P:${wifiEscape(pass)};;`;
    }
    case "contact": {
      const name = (f.name ?? "").trim();
      const parts = name.split(/\s+/);
      const last = parts.length > 1 ? parts[parts.length - 1] : "";
      const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
        `FN:${vcardEscape(name)}`,
      ];
      if ((f.org ?? "").trim()) lines.push(`ORG:${vcardEscape(f.org.trim())}`);
      if (normalizePhone(f.phone ?? "")) lines.push(`TEL;TYPE=CELL:+${normalizePhone(f.phone)}`);
      if ((f.address ?? "").trim()) lines.push(`EMAIL:${vcardEscape(f.address.trim())}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    }
    case "lieu":
      return `geo:${parseFloat(f.lat ?? "0")},${parseFloat(f.lng ?? "0")}`;
    case "evenement": {
      const d = (f.date ?? "").replace(/-/g, "");
      const t = (f.time ?? "").replace(/:/g, "");
      const dtstart = t ? `DTSTART:${d}T${t}00` : `DTSTART;VALUE=DATE:${d}`;
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${vcardEscape((f.title ?? "").trim())}`,
        dtstart,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    }
    case "texte":
      return (f.text ?? "").trim();
  }
}

// Contenu d'exemple par type, pour garder un aperçu vivant tant que les champs sont vides.
const SAMPLE_FIELDS: Record<ContentType, ContentFields> = {
  lien: { url: "https://trame.ci" },
  whatsapp: { phone: "0708091011" },
  wifi: { ssid: "Salon Chez Awa", password: "akwaba2026" },
  appel: { phone: "0708091011" },
  sms: { phone: "0708091011", message: "Bonjour" },
  email: { address: "awa.kone@gmail.com", subject: "Bonjour" },
  contact: { name: "Awa Koné", org: "Chez Awa", phone: "0708091011", address: "awa.kone@gmail.com" },
  lieu: { name: "Maquis", lat: "5.3364", lng: "-4.0267" },
  evenement: { title: "Soirée d'ouverture", date: "2026-08-01", time: "19:00" },
  paiement: { url: "https://pay.wave.com/m/exemple" },
  texte: { text: "Akwaba !" },
};

export function previewContent(type: ContentType, f: ContentFields): { content: string; sample: boolean } {
  if (!validateContent(type, f)) return { content: encodeContent(type, f), sample: false };
  return { content: encodeContent(type, SAMPLE_FIELDS[type]), sample: true };
}

const fmtPhone = (p: string) => "+" + normalizePhone(p);

// Légende affichée sous l'aperçu : dit concrètement ce que le scan déclenche.
export function legendFor(type: ContentType, f: ContentFields): string {
  if (validateContent(type, f)) return "Aperçu d'exemple : complète les champs pour voir ton contenu.";
  switch (type) {
    case "lien": {
      try {
        return "Ouvre " + new URL(normalizeUrl(f.url)).host;
      } catch {
        return "Ouvre ton lien";
      }
    }
    case "whatsapp":
      return "Ouvre WhatsApp au " + fmtPhone(f.phone);
    case "wifi":
      return `Connecte au réseau « ${f.ssid.trim()} »`;
    case "appel":
      return "Appelle le " + fmtPhone(f.phone);
    case "sms":
      return "Prépare un SMS au " + fmtPhone(f.phone);
    case "email":
      return "Écrit à " + f.address.trim();
    case "contact":
      return `Ajoute ${f.name.trim()} aux contacts`;
    case "lieu":
      return (f.name ?? "").trim()
        ? `Ouvre la position de ${f.name.trim()} dans Maps`
        : "Ouvre la position dans Maps";
    case "evenement":
      return `Ajoute « ${f.title.trim()} » à l'agenda`;
    case "paiement":
      return "Ouvre ta page de paiement";
    case "texte":
      return `Affiche ton texte (${f.text.trim().length} caractères)`;
  }
}
