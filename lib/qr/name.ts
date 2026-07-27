import { normalizePhone, typeLabel, type ContentFields, type ContentType } from "./encode";

// Nom lisible déduit du contenu : la personne retrouve son code sans avoir eu à le nommer.
export function nameFor(type: ContentType, f: ContentFields): string {
  const trim = (s?: string) => (s ?? "").trim();
  switch (type) {
    case "lien":
    case "paiement": {
      try {
        const host = new URL(/^https?:\/\//i.test(trim(f.url)) ? trim(f.url) : "https://" + trim(f.url))
          .host.replace(/^www\./, "");
        return type === "paiement" ? `Paiement ${host}` : host;
      } catch {
        return typeLabel(type);
      }
    }
    case "whatsapp":
      return "WhatsApp +" + normalizePhone(trim(f.phone));
    case "wifi":
      return trim(f.ssid) || "Wi-Fi";
    case "appel":
      return "Appel +" + normalizePhone(trim(f.phone));
    case "sms":
      return "SMS +" + normalizePhone(trim(f.phone));
    case "email":
      return trim(f.address) || "E-mail";
    case "contact":
      return trim(f.name) || "Contact";
    case "lieu":
      return trim(f.name) || "Lieu";
    case "evenement":
      return trim(f.title) || "Événement";
    case "texte": {
      const t = trim(f.text);
      return t.length > 32 ? t.slice(0, 32).trimEnd() + "…" : t || "Texte";
    }
  }
}
