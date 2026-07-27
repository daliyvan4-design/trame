import QRCode from "qrcode";

export type Matrix = {
  size: number;
  // true = module sombre
  get: (x: number, y: number) => boolean;
  // true = module appartenant à l'un des 3 yeux (dessinés à part)
  isEye: (x: number, y: number) => boolean;
  eyes: Array<{ x: number; y: number }>;
};

const EYE = 7;

export function buildMatrix(content: string, needsHighCorrection: boolean): Matrix {
  const qr = QRCode.create(content || " ", {
    errorCorrectionLevel: needsHighCorrection ? "H" : "Q",
  });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const eyes = [
    { x: 0, y: 0 },
    { x: size - EYE, y: 0 },
    { x: 0, y: size - EYE },
  ];
  const isEye = (x: number, y: number) =>
    eyes.some((e) => x >= e.x - 1 && x <= e.x + EYE && y >= e.y - 1 && y <= e.y + EYE);
  return {
    size,
    get: (x, y) => x >= 0 && y >= 0 && x < size && y < size && data[y * size + x] === 1,
    isEye,
    eyes,
  };
}

// Zone centrale dégagée pour le logo : rayon en modules, calculé sur la taille réelle du code.
export function logoClearRadius(size: number): number {
  return Math.max(2.5, Math.round(size * 0.11));
}

export function isInLogoZone(x: number, y: number, size: number): boolean {
  const c = (size - 1) / 2;
  const r = logoClearRadius(size);
  return Math.abs(x - c) <= r && Math.abs(y - c) <= r;
}
