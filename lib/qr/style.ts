import type { ContentType, ContentFields } from "./encode";

export type ModuleShape = "carre" | "arrondi" | "points";
export type EyeShape = "carres" | "arrondis" | "ronds";
export type EyeColor = "assortis" | "encre";
export type Background = "blanc" | "teinte" | "transparent";
export type LogoKind = "aucun" | "lettre" | "image";
export type FrameKind = "aucun" | "scannez";

export type QrStyle = {
  color: string;
  background: Background;
  modules: ModuleShape;
  eyeShape: EyeShape;
  eyeColor: EyeColor;
  logoKind: LogoKind;
  logoLetter: string;
  logoImage: string | null;
  frame: FrameKind;
};

export type QrDraft = {
  type: ContentType;
  fields: ContentFields;
  style: QrStyle;
};

export const INK = "#17151C";

export const INKS = [
  { id: "violet", label: "Violet", hex: "#6C3BF5" },
  { id: "encre", label: "Encre", hex: "#17151C" },
  { id: "bleu", label: "Bleu", hex: "#2E5BE8" },
  { id: "vert", label: "Vert", hex: "#0E9D63" },
  { id: "orange", label: "Orange", hex: "#E8631C" },
  { id: "rose", label: "Rose", hex: "#DE3A8A" },
] as const;

export const DEFAULT_STYLE: QrStyle = {
  color: "#6C3BF5",
  background: "blanc",
  modules: "arrondi",
  eyeShape: "arrondis",
  eyeColor: "assortis",
  logoKind: "aucun",
  logoLetter: "",
  logoImage: null,
  frame: "aucun",
};

// Luminance relative (WCAG) : décide si le texte posé sur l'accent doit être blanc ou encre.
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

export function onAccent(hex: string): string {
  return luminance(hex) > 0.5 ? INK : "#FFFFFF";
}

// Variables CSS exposées à toute l'interface : l'accent suit la couleur du QR.
export function accentVars(hex: string): React.CSSProperties {
  return {
    ["--accent" as string]: hex,
    ["--on-accent" as string]: onAccent(hex),
    ["--halo" as string]: hex + "66",
  };
}

export function backgroundFill(style: QrStyle): string | null {
  if (style.background === "transparent") return null;
  if (style.background === "teinte") return mixWithWhite(style.color, 0.08);
  return "#FFFFFF";
}

// Mélange l'accent avec du blanc (équivalent statique de color-mix, utilisable en SVG exporté).
export function mixWithWhite(hex: string, ratio: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (v: number) => Math.round(v * ratio + 255 * (1 - ratio));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function styleSignature(d: QrDraft): string {
  const s = d.style;
  return [
    s.color,
    s.background,
    s.modules,
    s.eyeShape,
    s.eyeColor,
    s.logoKind,
    s.logoLetter,
    s.logoImage ? "img" : "no",
    s.frame,
  ].join("|");
}
