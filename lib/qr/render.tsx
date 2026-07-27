import React from "react";
import { buildMatrix, isInLogoZone, logoClearRadius, type Matrix } from "./matrix";
import { backgroundFill, INK, type QrStyle } from "./style";

export const QUIET = 4;
const FRAME_BAND = 7;

// Élément signature : chaque module réapparaît en spirale depuis le centre.
// Le délai combine la distance au centre et l'angle, ce qui balaye le code en tournant.
const SPREAD_DIST = 180;
const SPREAD_ANGLE = 80;
export const MODULE_DURATION = 190;
export const RECOMPOSE_MS = SPREAD_DIST + SPREAD_ANGLE + MODULE_DURATION;

function spiralDelay(x: number, y: number, size: number): number {
  const c = (size - 1) / 2;
  const dx = x - c;
  const dy = y - c;
  const dist = Math.hypot(dx, dy) / (Math.hypot(c, c) || 1);
  const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
  return Math.round(dist * SPREAD_DIST + angle * SPREAD_ANGLE);
}

function moduleStyle(delay: number, animate: boolean): React.CSSProperties | undefined {
  if (!animate) return undefined;
  return {
    animation: `qr-mod-in ${MODULE_DURATION}ms cubic-bezier(.2,.7,.3,1) both`,
    animationDelay: `${delay}ms`,
    transformBox: "fill-box",
    transformOrigin: "center",
  };
}

export function eyeRadii(shape: QrStyle["eyeShape"]): { outer: number; inner: number } {
  if (shape === "ronds") return { outer: 3.5, inner: 1.5 };
  if (shape === "arrondis") return { outer: 1.8, inner: 0.8 };
  return { outer: 0, inner: 0 };
}

export type QrGeometry = {
  matrix: Matrix;
  width: number;
  height: number;
  viewBox: string;
};

export function qrGeometry(content: string, style: QrStyle): QrGeometry {
  const matrix = buildMatrix(content, style.logoKind !== "aucun");
  const width = matrix.size + QUIET * 2;
  const height = width + (style.frame === "scannez" ? FRAME_BAND : 0);
  return { matrix, width, height, viewBox: `0 0 ${width} ${height}` };
}

export function QrArtwork({
  content,
  style,
  animate = false,
  title,
}: {
  content: string;
  style: QrStyle;
  animate?: boolean;
  title?: string;
}) {
  const { matrix, width, height, viewBox } = qrGeometry(content, style);
  const { size } = matrix;
  const bg = backgroundFill(style);
  const eyeFill = style.eyeColor === "encre" ? INK : style.color;
  const hasLogo = style.logoKind !== "aucun";
  const nodes: React.ReactNode[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!matrix.get(x, y)) continue;
      if (matrix.isEye(x, y)) continue;
      if (hasLogo && isInLogoZone(x, y, size)) continue;
      const px = x + QUIET;
      const py = y + QUIET;
      const st = moduleStyle(spiralDelay(x, y, size), animate);
      const key = `m${x}-${y}`;
      if (style.modules === "points") {
        nodes.push(<circle key={key} cx={px + 0.5} cy={py + 0.5} r={0.44} fill={style.color} style={st} />);
      } else {
        nodes.push(
          <rect
            key={key}
            x={px + 0.04}
            y={py + 0.04}
            width={0.92}
            height={0.92}
            rx={style.modules === "arrondi" ? 0.3 : 0}
            fill={style.color}
            style={st}
          />,
        );
      }
    }
  }

  const { outer, inner } = eyeRadii(style.eyeShape);
  matrix.eyes.forEach((e, i) => {
    const px = e.x + QUIET;
    const py = e.y + QUIET;
    const st = moduleStyle(spiralDelay(e.x + 3, e.y + 3, size), animate);
    nodes.push(
      <rect
        key={`eo${i}`}
        x={px + 0.5}
        y={py + 0.5}
        width={6}
        height={6}
        rx={outer}
        fill="none"
        stroke={eyeFill}
        strokeWidth={1}
        style={st}
      />,
      <rect
        key={`ei${i}`}
        x={px + 2}
        y={py + 2}
        width={3}
        height={3}
        rx={inner}
        fill={eyeFill}
        style={st}
      />,
    );
  });

  const c = (size - 1) / 2 + QUIET;
  const r = logoClearRadius(size);
  const logoSide = r * 2 - 0.6;

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block" }}
    >
      {bg && <rect x={0} y={0} width={width} height={height} fill={bg} />}
      {nodes}
      {style.logoKind === "lettre" && style.logoLetter.trim() && (
        <>
          <rect
            x={c + 0.5 - logoSide / 2}
            y={c + 0.5 - logoSide / 2}
            width={logoSide}
            height={logoSide}
            rx={logoSide * 0.22}
            fill={bg ?? "#FFFFFF"}
          />
          <text
            x={c + 0.5}
            y={c + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fill={style.color}
            fontFamily="'Space Grotesk', system-ui, sans-serif"
            fontWeight={700}
            fontSize={logoSide * (style.logoLetter.trim().length > 1 ? 0.5 : 0.72)}
          >
            {style.logoLetter.trim().slice(0, 2).toUpperCase()}
          </text>
        </>
      )}
      {style.logoKind === "image" && style.logoImage && (
        <>
          <clipPath id="trame-logo-clip">
            <rect
              x={c + 0.5 - logoSide / 2}
              y={c + 0.5 - logoSide / 2}
              width={logoSide}
              height={logoSide}
              rx={logoSide * 0.22}
            />
          </clipPath>
          <rect
            x={c + 0.5 - logoSide / 2}
            y={c + 0.5 - logoSide / 2}
            width={logoSide}
            height={logoSide}
            rx={logoSide * 0.22}
            fill={bg ?? "#FFFFFF"}
          />
          <image
            href={style.logoImage}
            x={c + 0.5 - logoSide / 2}
            y={c + 0.5 - logoSide / 2}
            width={logoSide}
            height={logoSide}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#trame-logo-clip)"
          />
        </>
      )}
      {style.frame === "scannez" && (
        <text
          x={width / 2}
          y={width + FRAME_BAND / 2 - 0.4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={style.color}
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          fontWeight={700}
          fontSize={3.4}
          letterSpacing={0.9}
        >
          SCANNEZ-MOI
        </text>
      )}
    </svg>
  );
}
