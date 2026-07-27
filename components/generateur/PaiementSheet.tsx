"use client";

import { useEffect, useRef, useState } from "react";
import { OPERATORS, PRICE_XOF, validPhone, type Operator } from "@/lib/payments/provider";
import type { ContentFields, ContentType } from "@/lib/qr/encode";
import type { QrStyle } from "@/lib/qr/style";
import type { SavedCode } from "@/lib/db/store";

type Etape = "saisie" | "attente" | "succes" | "echec";

const POLL_MS = 1200;
const TIMEOUT_MS = 90_000;

export default function PaiementSheet({
  open,
  onClose,
  type,
  fields,
  style,
  code,
  onPaid,
  onDownloadPng,
  onDownloadSvg,
}: {
  open: boolean;
  onClose: () => void;
  type: ContentType;
  fields: ContentFields;
  style: QrStyle;
  code: SavedCode | null;
  onPaid: (code: SavedCode) => void;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
}) {
  const [operator, setOperator] = useState<Operator>("orange");
  const [phone, setPhone] = useState("");
  const [etape, setEtape] = useState<Etape>(code ? "succes" : "saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [redirige, setRedirige] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const stop = useRef(false);

  useEffect(() => {
    if (code) setEtape("succes");
  }, [code]);

  useEffect(() => {
    if (!open) return;
    stop.current = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && etape !== "attente") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      stop.current = true;
    };
  }, [open, onClose, etape]);

  if (!open) return null;

  async function payer() {
    if (!validPhone(phone)) {
      setErreur("Entre un numéro Mobile Money valide (8 chiffres minimum).");
      return;
    }
    setErreur(null);
    setEtape("attente");

    try {
      const init = await fetch("/api/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator, phone }),
      });
      const started = (await init.json()) as {
        status: string;
        reference?: string;
        codeId?: string;
        message?: string;
        redirectUrl?: string;
      };

      if (!init.ok || started.status === "echec" || !started.reference || !started.codeId) {
        setErreur(started.message ?? "Le paiement n'a pas abouti");
        setEtape("echec");
        return;
      }

      if (started.redirectUrl) {
        setRedirige(true);
        window.open(started.redirectUrl, "_blank", "noopener");
      }

      const deadline = Date.now() + TIMEOUT_MS;
      while (Date.now() < deadline && !stop.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const res = await fetch(`/api/paiement?reference=${encodeURIComponent(started.reference)}`);
        const état = (await res.json()) as { status: string; message?: string };

        if (état.status === "paye") {
          const saved = await fetch("/api/codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: started.reference,
              codeId: started.codeId,
              type,
              fields,
              style,
            }),
          });
          const body = (await saved.json()) as SavedCode & { message?: string };
          if (!saved.ok) {
            setErreur(body.message ?? "Le paiement n'a pas abouti");
            setEtape("echec");
            return;
          }
          onPaid(body);
          setEtape("succes");
          return;
        }

        if (état.status === "echec") {
          setErreur(état.message ?? "Le paiement n'a pas abouti");
          setEtape("echec");
          return;
        }
      }

      if (!stop.current) {
        setErreur("Le paiement n'a pas abouti");
        setEtape("echec");
      }
    } catch {
      setErreur("Le paiement n'a pas abouti");
      setEtape("echec");
    }
  }

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && etape !== "attente") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,21,28,.38)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 60,
        animation: "fade-in .2s ease both",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paiement de ton QR code"
        tabIndex={-1}
        style={{
          background: "var(--page)",
          width: "min(520px, 100%)",
          borderRadius: "20px 20px 0 0",
          padding: "22px 20px calc(24px + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "sheet-up .28s cubic-bezier(.2,.7,.3,1) both",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <h2 className="display" style={{ fontSize: 22 }}>
            {etape === "succes" ? "C'est payé. Tes fichiers sont prêts." : etape === "echec" ? "Le paiement n'a pas abouti" : "Payer et télécharger"}
          </h2>
          {etape !== "attente" && (
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="tap"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--muted)", padding: "0 4px", minWidth: 44 }}
            >
              ×
            </button>
          )}
        </div>

        {etape === "saisie" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="label">Ton opérateur</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {OPERATORS.map((o) => (
                  <button
                    key={o.id}
                    className="chip"
                    aria-pressed={operator === o.id}
                    onClick={() => setOperator(o.id)}
                    style={{ flexDirection: "column", textAlign: "center" }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="label" htmlFor="tel-mm">
                Ton numéro Mobile Money
              </label>
              <input
                id="tel-mm"
                className="field"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07 08 09 10 11"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (erreur) setErreur(null);
                }}
                aria-invalid={Boolean(erreur)}
                aria-describedby={erreur ? "err-tel" : undefined}
              />
              {erreur && (
                <span id="err-tel" role="alert" style={{ color: "var(--danger)", fontSize: 13.5 }}>
                  {erreur}
                </span>
              )}
            </div>

            <button className="btn-accent" onClick={payer}>
              Payer {PRICE_XOF.toLocaleString("fr-FR")} F
            </button>
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Le débit se fait après ta confirmation sur le téléphone. Aucun montant n'est prélevé avant.
            </p>
          </>
        )}

        {etape === "attente" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "26px 0 34px" }}>
            <span
              aria-hidden
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "3px solid var(--line)",
                borderTopColor: "var(--accent)",
                animation: "spin .8s linear infinite",
              }}
            />
            <p style={{ fontSize: 16, fontWeight: 600, textAlign: "center" }}>
              {redirige
                ? "Termine le paiement dans la page qui vient de s'ouvrir."
                : "Confirme le paiement sur ton téléphone."}
            </p>
            <p style={{ fontSize: 13.5, color: "var(--muted)", textAlign: "center", maxWidth: 300 }}>
              {redirige
                ? "Reviens ici une fois que c'est fait : cette page se met à jour toute seule."
                : "Un message vient d'être envoyé au numéro indiqué. Garde cette page ouverte."}
            </p>
          </div>
        )}

        {etape === "succes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 14.5, color: "var(--muted-strong)" }}>
              Le PNG est prêt à imprimer, le SVG s'agrandit sans jamais perdre en netteté.
            </p>
            <button className="btn-accent" onClick={onDownloadPng}>
              Télécharger en PNG
            </button>
            <button className="btn-quiet" onClick={onDownloadSvg}>
              Télécharger en SVG (vectoriel)
            </button>
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Connecte-toi avec Google pour retrouver ce code et suivre ses scans depuis « Mes codes ».
            </p>
          </div>
        )}

        {etape === "echec" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {erreur && erreur !== "Le paiement n'a pas abouti" && (
              <p style={{ fontSize: 15, fontWeight: 600 }}>{erreur}</p>
            )}
            <p style={{ fontSize: 15, color: "var(--muted-strong)" }}>
              Vérifie ton solde ou réessaie avec un autre numéro. Rien n'a été débité.
            </p>
            <button
              className="btn-accent"
              onClick={() => {
                setErreur(null);
                setRedirige(false);
                setEtape("saisie");
              }}
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
