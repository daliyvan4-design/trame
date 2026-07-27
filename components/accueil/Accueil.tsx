"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QrArtwork } from "@/lib/qr/render";
import { accentVars, DEFAULT_STYLE, type QrStyle } from "@/lib/qr/style";
import { useReducedMotion } from "@/components/useReducedMotion";
import Reveal from "@/components/Reveal";

// Les six visages du hero : à chaque changement, le code se recompose et toute la page suit.
const CYCLE: Array<Partial<QrStyle>> = [
  { color: "#6C3BF5", modules: "arrondi", eyeShape: "arrondis", background: "blanc" },
  { color: "#0E9D63", modules: "points", eyeShape: "ronds", background: "teinte" },
  { color: "#E8631C", modules: "carre", eyeShape: "carres", background: "blanc" },
  { color: "#2E5BE8", modules: "arrondi", eyeShape: "ronds", background: "blanc" },
  { color: "#DE3A8A", modules: "points", eyeShape: "arrondis", background: "teinte" },
  { color: "#17151C", modules: "carre", eyeShape: "arrondis", background: "blanc" },
];

const CYCLE_MS = 2800;

const GESTES = [
  {
    n: "01",
    t: "Compose",
    d: "Choisis ce que ton code doit faire, puis sa couleur, ses formes, ton logo au centre.",
  },
  {
    n: "02",
    t: "Regarde",
    d: "L'aperçu se recompose à chaque réglage. Rien n'est caché derrière un écran de fin.",
  },
  {
    n: "03",
    t: "Paie et télécharge",
    d: "2 000 F par Mobile Money, et tes fichiers PNG et SVG arrivent tout de suite.",
  },
];

const FONCTIONS = [
  { t: "11 usages", d: "Lien, WhatsApp, Wi-Fi, appel, SMS, e-mail, contact, lieu, événement, paiement, texte." },
  { t: "Six encres", d: "Violet, encre, bleu, vert, orange, rose. Toute l'interface prend la couleur choisie." },
  { t: "Formes au choix", d: "Modules carrés, arrondis ou en points, et trois formes d'yeux." },
  { t: "Ton logo au centre", d: "Une lettre ou ton image : la zone centrale est dégagée, le code reste lisible." },
  { t: "PNG et SVG", d: "Le PNG pour imprimer tout de suite, le SVG pour agrandir à l'infini." },
  { t: "Scans comptés", d: "Vois combien de personnes ouvrent ton code, et depuis quelle commune." },
];

const FAQ = [
  {
    q: "Est-ce que mon code se scannera vraiment ?",
    r: "Oui. La correction d'erreur monte automatiquement quand tu ajoutes un logo, et une marge blanche est gardée autour du code. Teste-le avec ton propre téléphone avant d'imprimer : c'est le seul essai qui compte.",
  },
  {
    q: "Comment se passe le paiement ?",
    r: "Tu choisis Orange Money, MTN MoMo ou Wave, tu entres ton numéro, et tu confirmes sur ton téléphone. 2 000 F une seule fois, par code. Si le paiement échoue, rien n'est débité.",
  },
  {
    q: "Qu'est-ce que je reçois exactement ?",
    r: "Deux fichiers : un PNG haute résolution (parfait pour une affiche, un flyer, une devanture) et un SVG vectoriel que ton imprimeur pourra agrandir sans perte.",
  },
];

export default function Accueil({ header }: { header: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % CYCLE.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const style = useMemo<QrStyle>(() => ({ ...DEFAULT_STYLE, ...CYCLE[step] }), [step]);

  return (
    <div style={{ ...accentVars(style.color), transition: "background .45s", minHeight: "100vh" }}>
      {header}

      <main>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "24px 20px 72px",
            display: "grid",
            gap: 48,
            gridTemplateColumns: "minmax(0,1fr)",
            alignItems: "center",
          }}
          className="hero"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 540 }}>
            <h1 className="display" style={{ fontSize: "clamp(34px,7.5vw,56px)" }}>
              Ton QR code mérite mieux que du{" "}
              <span style={{ color: "var(--accent)", transition: "color .45s" }}>noir et blanc</span>.
            </h1>
            <p style={{ fontSize: 17, color: "var(--muted-strong)", maxWidth: 460 }}>
              Compose un code aux couleurs de ton commerce, vois-le se recomposer à chaque réglage, et
              repars avec des fichiers prêts à imprimer.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
              <Link href="/generateur" className="btn-accent" style={{ display: "inline-flex", alignItems: "center" }}>
                Créer mon QR code
              </Link>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>2 000 F le code, c'est tout</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              className="plate"
              style={{
                width: "min(340px, 78vw)",
                padding: "min(26px, 6vw)",
                transition: "box-shadow .5s",
              }}
            >
              <QrArtwork
                key={reduced ? "static" : step}
                content="https://trame.ci"
                style={style}
                animate={!reduced}
                title="Exemple de QR code Trame"
              />
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <Reveal>
            <h2 className="display" style={h2Style}>
              Trois gestes, un fichier.
            </h2>
          </Reveal>
          <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))" }}>
            {GESTES.map((g, i) => (
              <Reveal key={g.n} delay={i * 90}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "2px solid var(--line)", paddingTop: 16 }}>
                  <span className="display" style={{ fontSize: 15, color: "var(--accent)", transition: "color .45s" }}>
                    {g.n}
                  </span>
                  <h3 className="display" style={{ fontSize: 21 }}>
                    {g.t}
                  </h3>
                  <p style={{ color: "var(--muted-strong)", fontSize: 15 }}>{g.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={{ display: "grid", gap: 26, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            {FONCTIONS.map((f, i) => (
              <Reveal key={f.t} delay={i * 60}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 className="display" style={{ fontSize: 17 }}>
                    {f.t}
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: 14.5 }}>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section style={sectionStyle}>
          <Reveal>
            <div
              style={{
                background: "var(--surface)",
                borderRadius: 18,
                padding: "clamp(28px,5vw,48px)",
                display: "grid",
                gap: 30,
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="display" style={{ fontSize: "clamp(24px,4.5vw,32px)" }}>
                  Un prix, pas de piège.
                </h2>
                <p style={{ color: "var(--muted-strong)", fontSize: 15, maxWidth: 360 }}>
                  Tu paies quand ton code te plaît, pas avant. Aucun abonnement, aucun code qui expire.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="display" style={{ fontSize: "clamp(40px,8vw,58px)", color: "var(--accent)", transition: "color .45s" }}>
                  2 000 F
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Un paiement, une fois", "Fichiers PNG et SVG", "Rien à payer chaque mois"].map((li) => (
                    <li key={li} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 15 }}>
                      <span aria-hidden style={{ color: "var(--accent)", transition: "color .45s" }}>
                        •
                      </span>
                      {li}
                    </li>
                  ))}
                </ul>
                <Link href="/generateur" className="btn-accent" style={{ textAlign: "center", display: "inline-flex", justifyContent: "center" }}>
                  Créer mon QR code
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        <section style={sectionStyle}>
          <Reveal>
            <h2 className="display" style={h2Style}>
              Les questions qu'on nous pose.
            </h2>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <details
                  style={{
                    borderTop: "1px solid var(--line)",
                    padding: "18px 0",
                  }}
                >
                  <summary
                    className="display tap"
                    style={{
                      fontSize: 17,
                      cursor: "pointer",
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    {f.q}
                    <span aria-hidden style={{ color: "var(--accent)", fontSize: 22, transition: "color .45s" }}>
                      +
                    </span>
                  </summary>
                  <p style={{ marginTop: 12, color: "var(--muted-strong)", fontSize: 15, maxWidth: 620 }}>{f.r}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "40px 20px 56px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          color: "var(--muted)",
        }}
      >
        <span>Fait à Abidjan.</span>
        <Link href="/generateur" style={{ color: "var(--accent)", fontWeight: 600, transition: "color .45s" }}>
          Créer mon QR code
        </Link>
      </footer>

      <style>{`
        details > summary::-webkit-details-marker { display: none; }
        details[open] > summary > span { transform: rotate(45deg); }
        details > summary > span { transition: transform .2s; display: inline-block; }
        @media (min-width: 860px) {
          .hero { grid-template-columns: 1.05fr 0.95fr !important; padding-top: 40px !important; padding-bottom: 96px !important; }
        }
      `}</style>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "clamp(40px,7vw,72px) 20px",
  display: "flex",
  flexDirection: "column",
  gap: 30,
};

const h2Style: React.CSSProperties = {
  fontSize: "clamp(26px,5vw,36px)",
  maxWidth: 520,
};
