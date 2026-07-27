import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Retelecharger from "@/components/mescodes/Retelecharger";
import { currentEmail } from "@/auth";
import { getCode, scansFor } from "@/lib/db/store";
import { QrArtwork } from "@/lib/qr/render";
import { isTrackable, typeLabel } from "@/lib/qr/encode";
import { accentVars } from "@/lib/qr/style";
import { computeStats, formatDate, formatJour, nombre, trancheHoraire } from "@/lib/stats";
import { shortHost } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentEmail();
  const code = await getCode(id);

  if (!code || !email || code.ownerEmail !== email) notFound();

  const stats = computeStats(await scansFor(id));
  const max = Math.max(1, ...stats.jours.map((j) => j.count));

  return (
    // L'accent de la page prend la couleur du code : on reste dans son univers.
    <div style={{ ...accentVars(code.style.color), minHeight: "100vh" }}>
      <Header compact />

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "8px 20px 72px", display: "flex", flexDirection: "column", gap: 34 }}>
        <Link href="/mes-codes" className="tap" style={{ color: "var(--muted)", fontSize: 14, display: "inline-flex", alignItems: "center", width: "fit-content" }}>
          ← Mes codes
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div className="plate" style={{ width: 110, height: 110, padding: 10, borderRadius: 14, flexShrink: 0 }}>
            <QrArtwork content={code.encoded} style={code.style} animate title={`QR code ${code.name}`} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 220 }}>
            <h1 className="display" style={{ fontSize: "clamp(24px,5vw,32px)" }}>
              {code.name}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
              {typeLabel(code.type)}, créé le {formatDate(code.createdAt)}
              {code.tracked ? ` · ${shortHost()}/r/${code.id}` : ""}
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
              <Retelecharger content={code.encoded} style={code.style} name={code.name} />
              <Link href={`/generateur?code=${code.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                Modifier ce code
              </Link>
            </div>
          </div>
        </div>

        {code.tracked ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 20, maxWidth: 560 }}>
              {[
                { v: stats.total, l: "scans en tout" },
                { v: stats.personnes, l: "personnes différentes" },
                { v: stats.semaine, l: "ces 7 derniers jours" },
                { v: stats.aujourdhui, l: "aujourd'hui" },
              ].map((s) => (
                <div key={s.l} style={{ borderTop: "2px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="display" style={{ fontSize: 26, color: "var(--accent)" }}>
                    {nombre(s.v)}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.l}</span>
                </div>
              ))}
            </div>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
              <h2 className="label">Scans des 14 derniers jours</h2>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
                {stats.jours.map((j, i) => {
                  const dernier = i === stats.jours.length - 1;
                  return (
                    <div
                      key={j.date.toISOString()}
                      title={`${j.count} scans, ${formatJour(j.date)}`}
                      style={{
                        flex: 1,
                        height: `${Math.max(4, Math.round((j.count / max) * 100))}%`,
                        background: dernier ? "var(--accent)" : `color-mix(in srgb, var(--accent) 33%, transparent)`,
                        borderRadius: "3px 3px 0 0",
                        transformOrigin: "bottom",
                        animation: "bar-up .5s cubic-bezier(.2,.7,.3,1) both",
                        animationDelay: `${i * 30}ms`,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#a9a6b2" }}>
                <span>{formatJour(stats.jours[0].date)}</span>
                <span>aujourd'hui</span>
              </div>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
              <h2 className="label">D'où viennent les scans</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stats.communes.map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 86, fontSize: 13.5, flexShrink: 0 }}>{c.name}</span>
                    <span style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${c.pct}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
                    </span>
                    <span style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--muted-strong)", flexShrink: 0 }}>
                      {c.pct} %
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
              <h2 className="label">À quelle heure on te scanne</h2>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 76 }}>
                {stats.heures.map((h) => {
                  const maxH = Math.max(1, ...stats.heures.map((x) => x.count));
                  const pointe = stats.meilleureHeure?.heure === h.heure;
                  return (
                    <div
                      key={h.heure}
                      title={`${h.count} scans vers ${trancheHoraire(h.heure)}`}
                      style={{
                        flex: 1,
                        height: `${Math.max(3, Math.round((h.count / maxH) * 100))}%`,
                        background: pointe
                          ? "var(--accent)"
                          : "color-mix(in srgb, var(--accent) 28%, transparent)",
                        borderRadius: "2px 2px 0 0",
                        transformOrigin: "bottom",
                        animation: "bar-up .45s cubic-bezier(.2,.7,.3,1) both",
                        animationDelay: `${h.heure * 18}ms`,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#a9a6b2" }}>
                <span>00 h</span>
                <span>12 h</span>
                <span>23 h</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted-strong)" }}>
                {stats.meilleureHeure
                  ? `Le pic est autour de ${trancheHoraire(stats.meilleureHeure.heure)}, avec ${nombre(stats.meilleureHeure.count)} scans. C'est le moment où il faut être prêt.`
                  : "Pas encore assez de scans pour dégager une heure de pointe."}
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
              <h2 className="label">Les jours qui marchent</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.semaineJours.map((j) => {
                  const maxJ = Math.max(1, ...stats.semaineJours.map((x) => x.count));
                  return (
                    <div key={j.nom} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 86, fontSize: 13.5, flexShrink: 0, textTransform: "capitalize" }}>
                        {j.nom}
                      </span>
                      <span style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                        <span
                          style={{
                            display: "block",
                            width: `${Math.round((j.count / maxJ) * 100)}%`,
                            height: "100%",
                            background: "var(--accent)",
                            borderRadius: 4,
                          }}
                        />
                      </span>
                      <span style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--muted-strong)", flexShrink: 0 }}>
                        {nombre(j.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {stats.appareils.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
                <h2 className="label">Avec quel téléphone</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {stats.appareils.map((a) => (
                    <span
                      key={a.nom}
                      style={{
                        background: "var(--surface)",
                        borderRadius: 10,
                        padding: "9px 14px",
                        fontSize: 13.5,
                      }}
                    >
                      {a.nom} <strong style={{ color: "var(--accent)" }}>{a.pct} %</strong>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <p style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 560 }}>
              {stats.retours > 0
                ? `${nombre(stats.retours)} scans sont des retours : des personnes qui avaient déjà scanné ce code. `
                : ""}
              {stats.meilleurJourSemaine
                ? `Ton meilleur jour de la semaine est le ${stats.meilleurJourSemaine.nom}. `
                : ""}
              Le nombre de personnes est une estimation : deux téléphones sur le même réseau peuvent
              compter pour un seul.
            </p>

            <p style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 560 }}>
              {stats.meilleur
                ? `Meilleur jour : ${formatJour(stats.meilleur.date)} avec ${nombre(stats.meilleur.count)} scans. `
                : "Aucun scan enregistré pour l'instant. "}
              Les scans comptent chaque ouverture réelle du code, pas les aperçus.
            </p>
          </>
        ) : (
          <p style={{ fontSize: 14.5, color: "var(--muted-strong)", maxWidth: 560, background: "var(--surface)", borderRadius: 14, padding: 18 }}>
            {isTrackable(code.type)
              ? "Ce code encode ton lien réel : au scan, l'appareil photo affiche directement ton adresse, ce qui rassure tes clients. En échange, les ouvertures ne passent pas par nos serveurs et ne peuvent pas être comptées. Pour les compter, crée un nouveau code en activant le suivi."
              : `Les statistiques ne sont pas disponibles pour ce type de code. Un ${typeLabel(code.type).toLowerCase()} fonctionne sans connexion : la donnée est écrite directement dans le code, donc rien ne passe par nos serveurs au moment du scan.`}
          </p>
        )}
      </main>
    </div>
  );
}
