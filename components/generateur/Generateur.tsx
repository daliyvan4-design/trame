"use client";

import { useMemo, useRef, useState } from "react";
import {
  CONTENT_TYPES,
  isTrackable,
  legendFor,
  previewContent,
  typeLabel,
  validateContent,
  type ContentFields,
  type ContentType,
} from "@/lib/qr/encode";
import { QrArtwork } from "@/lib/qr/render";
import {
  accentVars,
  DEFAULT_STYLE,
  INKS,
  styleSignature,
  type Background,
  type EyeColor,
  type EyeShape,
  type FrameKind,
  type LogoKind,
  type ModuleShape,
  type QrStyle,
} from "@/lib/qr/style";
import { downloadPng, downloadSvg, slugify } from "@/lib/qr/export";
import { nameFor } from "@/lib/qr/name";
import { PRICE_XOF } from "@/lib/payments/provider";
import type { SavedCode } from "@/lib/db/store";
import PaiementSheet from "./PaiementSheet";

const MAX_LOGO_BYTES = 1_200_000;

export type BrouillonInitial = {
  type: ContentType;
  fields: ContentFields;
  style: QrStyle;
} | null;

export type Droit = { gratuit: boolean; motif: string };

export default function Generateur({
  header,
  initial = null,
  droit,
}: {
  header: React.ReactNode;
  initial?: BrouillonInitial;
  droit: Droit;
}) {
  const [enCours, setEnCours] = useState(false);
  const [erreurOffert, setErreurOffert] = useState<string | null>(null);
  const [type, setType] = useState<ContentType>(initial?.type ?? "lien");
  const [fieldsByType, setFieldsByType] = useState<Record<string, ContentFields>>(
    initial ? { [initial.type]: initial.fields } : {},
  );
  const [style, setStyle] = useState<QrStyle>(initial?.style ?? DEFAULT_STYLE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saved, setSaved] = useState<SavedCode | null>(null);
  const [logoErreur, setLogoErreur] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const fields = fieldsByType[type] ?? {};
  const def = CONTENT_TYPES.find((t) => t.id === type)!;
  const invalid = validateContent(type, fields);
  const { content: preview } = previewContent(type, fields);
  const finalContent = saved?.encoded ?? preview;
  const signature = useMemo(() => styleSignature({ type, fields, style }), [type, fields, style]);
  const tracked = isTrackable(type);

  function setField(key: string, value: string) {
    setTouched(true);
    setFieldsByType((prev) => ({ ...prev, [type]: { ...(prev[type] ?? {}), [key]: value } }));
  }

  function patch(next: Partial<QrStyle>) {
    setStyle((s) => ({ ...s, ...next }));
  }

  function exportNode(): SVGSVGElement | null {
    return exportRef.current?.querySelector("svg") ?? null;
  }

  const filename = slugify("trame-" + nameFor(type, fields));

  async function png() {
    const node = exportNode();
    if (node) await downloadPng(node, filename);
  }

  function svg() {
    const node = exportNode();
    if (node) downloadSvg(node, filename);
  }

  // Parcours offert : on demande le code sans passer par le paiement. Le serveur
  // revérifie le droit, donc un clic forcé depuis la console ne donne rien.
  async function reclamerOffert() {
    setEnCours(true);
    setErreurOffert(null);
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, fields, style }),
      });
      const body = (await res.json()) as SavedCode & { message?: string };
      if (!res.ok) {
        setErreurOffert(body.message ?? "La création n'a pas abouti.");
        return;
      }
      setSaved(body);
      setSheetOpen(true);
    } catch {
      setErreurOffert("La création n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setLogoErreur("Ton image dépasse 1,2 Mo. Choisis une version plus légère.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoErreur(null);
      patch({ logoImage: String(reader.result), logoKind: "image" });
    };
    reader.onerror = () => setLogoErreur("On n'a pas pu lire ce fichier. Essaie une autre image.");
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ ...accentVars(style.color), minHeight: "100vh", paddingBottom: 108 }}>
      {header}

      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 20px",
          display: "grid",
          gap: 32,
          gridTemplateColumns: "minmax(0,1fr)",
          alignItems: "start",
        }}
        className="gen"
      >
        {/* Aperçu épinglé : il reste visible pendant que l'on règle le code. */}
        <div className="apercu">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0 18px" }}>
            <div
              className={`plate${style.background === "transparent" ? " checker" : ""}`}
              style={{ width: "min(300px, 62vw)", padding: "min(22px, 5vw)", transition: "box-shadow .45s" }}
            >
              <QrArtwork
                key={signature}
                content={finalContent}
                style={style}
                animate
                title={`Aperçu du QR code : ${legendFor(type, fields)}`}
              />
            </div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", textAlign: "center", maxWidth: 300 }}>
              {legendFor(type, fields)}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 38, paddingBottom: 24 }}>
          <Groupe titre="Contenu">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CONTENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={type === t.id}
                  onClick={() => {
                    setType(t.id);
                    setTouched(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {def.fields.map((f) => (
                <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted-strong)" }}>{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      className="field"
                      rows={3}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                  ) : (
                    <input
                      className="field"
                      type={f.type ?? "text"}
                      inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
              <p style={{ fontSize: 13, color: "var(--muted)" }}>{def.help}</p>
              {touched && invalid && (
                <p role="alert" style={{ fontSize: 13.5, color: "var(--danger)" }}>
                  {invalid}
                </p>
              )}
              {!tracked && (
                <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  Ce type fonctionne sans connexion : la donnée est écrite dans le code lui-même, donc les
                  statistiques de scan ne sont pas disponibles pour {typeLabel(type).toLowerCase()}.
                </p>
              )}
            </div>
          </Groupe>

          <Groupe titre="Couleur">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {INKS.map((ink) => {
                const on = style.color === ink.hex;
                return (
                  <button
                    key={ink.id}
                    onClick={() => patch({ color: ink.hex })}
                    aria-pressed={on}
                    aria-label={ink.label}
                    title={ink.label}
                    className="tap"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      background: ink.hex,
                      boxShadow: on ? `0 0 0 3px var(--page), 0 0 0 5px ${ink.hex}` : "none",
                      transition: "box-shadow .18s",
                    }}
                  />
                );
              })}
            </div>
          </Groupe>

          <Groupe titre="Fond du code">
            <Choix<Background>
              value={style.background}
              onChange={(v) => patch({ background: v })}
              options={[
                { id: "blanc", label: "Blanc" },
                { id: "teinte", label: "Teinté" },
                { id: "transparent", label: "Transparent" },
              ]}
            />
          </Groupe>

          <Groupe titre="Modules">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(
                [
                  { id: "carre", label: "Carré" },
                  { id: "arrondi", label: "Arrondi" },
                  { id: "points", label: "Points" },
                ] as Array<{ id: ModuleShape; label: string }>
              ).map((o) => (
                <button
                  key={o.id}
                  className="chip"
                  aria-pressed={style.modules === o.id}
                  onClick={() => patch({ modules: o.id })}
                  style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
                >
                  <IconeModule shape={o.id} />
                  {o.label}
                </button>
              ))}
            </div>
          </Groupe>

          <Groupe titre="Yeux (les 3 coins)">
            <Choix<EyeShape>
              value={style.eyeShape}
              onChange={(v) => patch({ eyeShape: v })}
              options={[
                { id: "carres", label: "Carrés" },
                { id: "arrondis", label: "Arrondis" },
                { id: "ronds", label: "Ronds" },
              ]}
            />
            <Choix<EyeColor>
              value={style.eyeColor}
              onChange={(v) => patch({ eyeColor: v })}
              options={[
                { id: "assortis", label: "Assortis au code" },
                { id: "encre", label: "Encre" },
              ]}
            />
          </Groupe>

          <Groupe titre="Logo au centre">
            <Choix<LogoKind>
              value={style.logoKind}
              onChange={(v) => patch({ logoKind: v })}
              options={[
                { id: "aucun", label: "Aucun" },
                { id: "lettre", label: "Lettre" },
                { id: "image", label: "Image" },
              ]}
            />
            {style.logoKind === "lettre" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 220 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted-strong)" }}>
                  Une ou deux lettres
                </span>
                <input
                  className="field"
                  maxLength={2}
                  placeholder="AK"
                  value={style.logoLetter}
                  onChange={(e) => patch({ logoLetter: e.target.value.toUpperCase() })}
                />
              </label>
            )}
            {style.logoKind === "image" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                  className="tap"
                  style={{ fontSize: 14 }}
                />
                {logoErreur && (
                  <span role="alert" style={{ color: "var(--danger)", fontSize: 13.5 }}>
                    {logoErreur}
                  </span>
                )}
              </div>
            )}
            {style.logoKind !== "aucun" && (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                La correction d'erreur passe au niveau maximum : le code reste lisible malgré la zone
                centrale occupée.
              </p>
            )}
          </Groupe>

          <Groupe titre="Cadre">
            <Choix<FrameKind>
              value={style.frame}
              onChange={(v) => patch({ frame: v })}
              options={[
                { id: "aucun", label: "Aucun" },
                { id: "scannez", label: "SCANNEZ-MOI" },
              ]}
            />
          </Groupe>
        </div>
      </main>

      {/* Copie non animée, servant de source exacte aux fichiers téléchargés. */}
      <div
        ref={exportRef}
        aria-hidden
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
      >
        <QrArtwork content={finalContent} style={style} />
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "color-mix(in srgb, var(--page) 92%, transparent)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--line)",
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom))",
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 7 }}>
          <button
            className="btn-accent"
            disabled={Boolean(invalid) || enCours}
            onClick={() => {
              setTouched(true);
              if (invalid) return;
              if (saved || !droit.gratuit) setSheetOpen(true);
              else reclamerOffert();
            }}
          >
            {enCours
              ? "Création en cours..."
              : saved
                ? "Retélécharger mes fichiers"
                : droit.gratuit
                  ? "Télécharger mon QR code, offert"
                  : `Télécharger mon QR code : ${PRICE_XOF.toLocaleString("fr-FR")} F`}
          </button>
          <p
            style={{
              fontSize: 12,
              color: erreurOffert || (invalid && touched) ? "var(--danger)" : "var(--muted)",
              textAlign: "center",
            }}
          >
            {erreurOffert ?? (invalid && touched ? invalid : droit.motif)}
          </p>
        </div>
      </div>

      <PaiementSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        type={type}
        fields={fields}
        style={style}
        code={saved}
        onPaid={setSaved}
        onDownloadPng={png}
        onDownloadSvg={svg}
      />

      <style>{`
        @media (max-width: 899px) {
          .apercu {
            position: sticky;
            top: 0;
            z-index: 30;
            background: color-mix(in srgb, var(--page) 94%, transparent);
            backdrop-filter: blur(12px);
            margin: 0 -20px;
            padding: 0 20px;
            border-bottom: 1px solid var(--line);
          }
        }
        @media (min-width: 900px) {
          .gen { grid-template-columns: 0.95fr 1.05fr !important; gap: 56px !important; padding-top: 12px !important; }
          .apercu { position: sticky; top: 24px; }
        }
      `}</style>
    </div>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="label">{titre}</h2>
      {children}
    </section>
  );
}

function Choix<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <button key={o.id} className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IconeModule({ shape }: { shape: ModuleShape }) {
  const cells = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ];
  return (
    <svg width="16" height="16" viewBox="0 0 3 3" aria-hidden focusable="false">
      {cells.map(([x, y]) =>
        shape === "points" ? (
          <circle key={`${x}${y}`} cx={x + 0.5} cy={y + 0.5} r={0.42} fill="currentColor" />
        ) : (
          <rect
            key={`${x}${y}`}
            x={x + 0.06}
            y={y + 0.06}
            width={0.88}
            height={0.88}
            rx={shape === "arrondi" ? 0.3 : 0}
            fill="currentColor"
          />
        ),
      )}
    </svg>
  );
}
