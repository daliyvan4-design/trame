// Export des fichiers depuis le SVG réellement affiché : ce que tu vois est ce que tu reçois.

const PNG_SIZE = 2048;

export function svgString(node: SVGSVGElement): string {
  const clone = node.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("aria-hidden");
  const vb = (clone.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
  clone.setAttribute("width", String(vb[2] * 12));
  clone.setAttribute("height", String(vb[3] * 12));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSvg(node: SVGSVGElement, name: string) {
  download(new Blob([svgString(node)], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
}

export async function downloadPng(node: SVGSVGElement, name: string): Promise<void> {
  const source = svgString(node);
  const vb = (node.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
  const ratio = vb[3] / vb[2];
  const width = PNG_SIZE;
  const height = Math.round(PNG_SIZE * ratio);

  const img = new Image();
  img.decoding = "sync";
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Le rendu de l'image a échoué."));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Le rendu de l'image a échoué.");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Le rendu de l'image a échoué.");
  download(blob, `${name}.png`);
}

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "trame-qr"
  );
}
