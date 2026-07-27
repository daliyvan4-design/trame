"use client";

import { useRef, useState } from "react";
import { QrArtwork } from "@/lib/qr/render";
import type { QrStyle } from "@/lib/qr/style";
import { downloadPng, downloadSvg, slugify } from "@/lib/qr/export";

export default function Retelecharger({
  content,
  style,
  name,
}: {
  content: string;
  style: QrStyle;
  name: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const filename = slugify("trame-" + name);

  function node(): SVGSVGElement | null {
    return ref.current?.querySelector("svg") ?? null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {ouvert ? (
          <>
            <button
              className="btn-accent"
              style={{ padding: "12px 18px", minHeight: 44, fontSize: 14.5 }}
              onClick={async () => {
                const n = node();
                if (!n) return;
                try {
                  await downloadPng(n, filename);
                } catch {
                  setErreur("Le fichier n'a pas pu être créé. Réessaie dans un instant.");
                }
              }}
            >
              PNG
            </button>
            <button
              className="btn-quiet"
              onClick={() => {
                const n = node();
                if (n) downloadSvg(n, filename);
              }}
            >
              SVG (vectoriel)
            </button>
          </>
        ) : (
          <button className="btn-accent" style={{ padding: "12px 18px", minHeight: 44, fontSize: 14.5 }} onClick={() => setOuvert(true)}>
            Retélécharger
          </button>
        )}
      </div>
      {erreur && (
        <span role="alert" style={{ color: "var(--danger)", fontSize: 13 }}>
          {erreur}
        </span>
      )}
      <div ref={ref} aria-hidden style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
        <QrArtwork content={content} style={style} />
      </div>
    </div>
  );
}
