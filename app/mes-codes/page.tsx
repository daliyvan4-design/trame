import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Connexion from "@/components/mescodes/Connexion";
import { currentEmail } from "@/auth";
import { listCodes, scanCountsByCode } from "@/lib/db/store";
import { QrArtwork } from "@/lib/qr/render";
import { typeLabel } from "@/lib/qr/encode";
import { computeStats, formatDate, nombre } from "@/lib/stats";
import { PRICE_XOF } from "@/lib/payments/provider";

export const metadata: Metadata = { title: "Mes codes, Trame" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const email = await currentEmail();

  if (!email) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Header compact />
        <Connexion />
      </div>
    );
  }

  const codes = await listCodes(email);
  const scans = await scanCountsByCode(email);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header compact />

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "16px 20px 72px", display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="display" style={{ fontSize: "clamp(28px,6vw,38px)" }}>
            Mes QR codes
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            {codes.length === 0
              ? `Connecté avec ${email}`
              : `${codes.length} ${codes.length > 1 ? "codes actifs" : "code actif"}, connecté avec ${email}`}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {codes.map((code) => {
            const stats = computeStats(scans[code.id] ?? []);
            return (
              <Link
                key={code.id}
                href={`/mes-codes/${code.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  borderTop: "1px solid var(--line)",
                  padding: "16px 4px",
                  minHeight: 44,
                }}
              >
                <span
                  style={{
                    width: 54,
                    height: 54,
                    background: "var(--plate)",
                    borderRadius: 10,
                    padding: 5,
                    boxShadow: "0 0 0 1px var(--line)",
                    flexShrink: 0,
                  }}
                >
                  <QrArtwork content={code.encoded} style={code.style} />
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{code.name}</span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {typeLabel(code.type)}, créé le {formatDate(code.createdAt)}
                  </span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end", flexShrink: 0 }}>
                  <span className="display" style={{ fontSize: 17 }}>
                    {code.tracked ? `${nombre(stats.total)} scans` : "hors ligne"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: code.tracked ? code.style.color : "var(--muted)",
                    }}
                  >
                    {code.tracked ? `+${nombre(stats.semaine)} cette semaine` : "sans statistiques"}
                  </span>
                </span>
              </Link>
            );
          })}

          <Link
            href="/generateur"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              borderTop: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              padding: "16px 4px",
              fontWeight: 600,
              fontSize: 14.5,
              minHeight: 44,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 54,
                height: 54,
                borderRadius: 10,
                boxShadow: "inset 0 0 0 1.5px #c9c6d1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: "var(--muted)",
                flexShrink: 0,
              }}
            >
              +
            </span>
            Créer un nouveau code : {PRICE_XOF.toLocaleString("fr-FR")} F
          </Link>
        </div>

        {codes.length === 0 && (
          <p style={{ fontSize: 14.5, color: "var(--muted-strong)", maxWidth: 460 }}>
            Tu n'as pas encore de code enregistré. Compose le premier, paie 2 000 F, et il apparaîtra ici
            avec ses statistiques de scan.
          </p>
        )}
      </main>
    </div>
  );
}
