// Le test qui compte vraiment : on rastérise le SVG réellement produit
// et on le relit avec un décodeur indépendant, comme le ferait un téléphone.
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import jsQR from "jsqr";
import { QrArtwork, QUIET } from "../lib/qr/render";
import { DEFAULT_STYLE, type QrStyle } from "../lib/qr/style";
import { encodeContent } from "../lib/qr/encode";

const SCALE = 6;

function paint(markup: string): { data: Uint8ClampedArray; width: number; height: number } {
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(markup);
  assert.ok(viewBox, "le SVG doit exposer un viewBox");
  const vw = Number(viewBox[1]);
  const vh = Number(viewBox[2]);
  const width = Math.round(vw * SCALE);
  const height = Math.round(vh * SCALE);

  // Fond blanc par défaut : c'est la marge de sécurité attendue autour du code.
  const px = new Uint8ClampedArray(width * height * 4).fill(255);

  const dark = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(height, Math.round(y1)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(width, Math.round(x1)); x++) {
        const i = (y * width + x) * 4;
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
      }
    }
  };

  for (const m of markup.matchAll(/<rect\b([^>]*?)\/?>/g)) {
    const a = m[1];
    if (/fill="none"/.test(a)) {
      // Anneau extérieur d'un œil : dessiné au trait, épaisseur 1 module.
      const x = Number(/(?:^|\s)x="([-\d.]+)"/.exec(a)?.[1]);
      const y = Number(/(?:^|\s)y="([-\d.]+)"/.exec(a)?.[1]);
      const w = Number(/width="([-\d.]+)"/.exec(a)?.[1]);
      const h = Number(/height="([-\d.]+)"/.exec(a)?.[1]);
      const s = Number(/stroke-width="([-\d.]+)"/.exec(a)?.[1] ?? 1);
      const [ox, oy, ow, oh] = [x - s / 2, y - s / 2, w + s, h + s];
      dark(ox * SCALE, oy * SCALE, (ox + ow) * SCALE, (oy + s) * SCALE);
      dark(ox * SCALE, (oy + oh - s) * SCALE, (ox + ow) * SCALE, (oy + oh) * SCALE);
      dark(ox * SCALE, oy * SCALE, (ox + s) * SCALE, (oy + oh) * SCALE);
      dark((ox + ow - s) * SCALE, oy * SCALE, (ox + ow) * SCALE, (oy + oh) * SCALE);
      continue;
    }
    const fill = /fill="([^"]+)"/.exec(a)?.[1] ?? "";
    if (fill === "#FFFFFF" || fill === "none") continue;
    const x = Number(/(?:^|\s)x="([-\d.]+)"/.exec(a)?.[1]);
    const y = Number(/(?:^|\s)y="([-\d.]+)"/.exec(a)?.[1]);
    const w = Number(/width="([-\d.]+)"/.exec(a)?.[1]);
    const h = Number(/height="([-\d.]+)"/.exec(a)?.[1]);
    if (w >= vw) continue; // fond de page
    dark(x * SCALE, y * SCALE, (x + w) * SCALE, (y + h) * SCALE);
  }

  for (const m of markup.matchAll(/<circle\b([^>]*?)\/?>/g)) {
    const a = m[1];
    const cx = Number(/cx="([-\d.]+)"/.exec(a)?.[1]);
    const cy = Number(/cy="([-\d.]+)"/.exec(a)?.[1]);
    const r = Number(/(?:^|\s)r="([-\d.]+)"/.exec(a)?.[1]);
    for (let y = Math.floor((cy - r) * SCALE); y < Math.ceil((cy + r) * SCALE); y++) {
      for (let x = Math.floor((cx - r) * SCALE); x < Math.ceil((cx + r) * SCALE); x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const dx = (x + 0.5) / SCALE - cx;
        const dy = (y + 0.5) / SCALE - cy;
        if (dx * dx + dy * dy > r * r) continue;
        const i = (y * width + x) * 4;
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
      }
    }
  }

  return { data: px, width, height };
}

function decode(content: string, style: Partial<QrStyle>): string | null {
  const markup = renderToStaticMarkup(
    QrArtwork({ content, style: { ...DEFAULT_STYLE, ...style } }) as never,
  );
  const img = paint(markup);
  return jsQR(img.data, img.width, img.height)?.data ?? null;
}

test("la marge de sécurité fait bien 4 modules", () => {
  assert.equal(QUIET, 4);
});

test("chaque forme de module reste lisible", () => {
  const url = "https://trame.ci/r/xtbaw7q";
  for (const modules of ["carre", "arrondi", "points"] as const) {
    assert.equal(decode(url, { modules }), url, `forme ${modules}`);
  }
});

test("chaque forme d'yeux reste lisible", () => {
  const url = "https://trame.ci/r/abc1234";
  for (const eyeShape of ["carres", "arrondis", "ronds"] as const) {
    assert.equal(decode(url, { eyeShape }), url, `yeux ${eyeShape}`);
  }
});

test("les yeux en encre sur un code coloré restent lisibles", () => {
  const url = "https://trame.ci/r/zzz9999";
  assert.equal(decode(url, { color: "#E8631C", eyeColor: "encre" }), url);
});

test("un logo au centre ne casse pas la lecture", () => {
  const url = "https://trame.ci/r/logo123";
  assert.equal(decode(url, { logoKind: "lettre", logoLetter: "MT" }), url);
});

test("le cadre SCANNEZ-MOI n'empiète pas sur le code", () => {
  const url = "https://trame.ci/r/cadre01";
  assert.equal(decode(url, { frame: "scannez", modules: "points" }), url);
});

test("un contenu hors ligne volumineux (vCard) se relit intégralement", () => {
  const vcard = encodeContent("contact", {
    name: "Awa Koné",
    org: "Maquis Chez Tantie",
    phone: "0708091011",
    address: "awa.kone@example.ci",
  });
  assert.equal(decode(vcard, { modules: "arrondi" }), vcard);
});

test("le Wi-Fi encodé se relit tel quel", () => {
  const wifi = encodeContent("wifi", { ssid: "Salon Chez Awa", password: "akwaba2026" });
  assert.equal(decode(wifi, { modules: "points", eyeShape: "ronds" }), wifi);
});
