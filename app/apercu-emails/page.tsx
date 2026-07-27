import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { currentEmail } from "@/auth";
import { estProprietaire } from "@/lib/pricing";
import { emailBienvenue, emailCodeLivre } from "@/lib/email/templates";
import { appUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

// Page d'aperçu des e-mails, réservée au compte propriétaire (ouverte en développement).
export default async function Page() {
  const email = await currentEmail();
  const autorise = process.env.NODE_ENV !== "production" || estProprietaire(email);
  if (!autorise) notFound();

  const exemples = [
    {
      titre: "Bienvenue",
      quand: "À la première connexion Google, une seule fois par compte.",
      html: emailBienvenue({
        prenom: "Awa",
        email: "awa.kone@gmail.com",
        lien: `${appUrl()}/generateur`,
      }),
    },
    {
      titre: "Code offert livré",
      quand: "Quand le code offert du compte vient d'être créé.",
      html: emailCodeLivre({
        nomDuCode: "maquis-chez-tantie.ci",
        typeLabel: "Lien",
        accent: "#0E9D63",
        lien: `${appUrl()}/mes-codes`,
        suivi: true,
        offert: true,
      }),
    },
    {
      titre: "Code payé livré",
      quand: "Après un paiement Mobile Money confirmé.",
      html: emailCodeLivre({
        nomDuCode: "Salon Chez Awa",
        typeLabel: "Wi-Fi",
        accent: "#E8631C",
        lien: `${appUrl()}/mes-codes`,
        suivi: false,
        offert: false,
      }),
    },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header compact />
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "8px 20px 72px",
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="display" style={{ fontSize: "clamp(26px,5vw,34px)" }}>
            Aperçu des e-mails
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 620 }}>
            Rendu réel des messages envoyés. Trame passant par la connexion Google, l'adresse est
            déjà vérifiée : il n'y a donc pas d'e-mail de confirmation à cliquer, mais un message de
            bienvenue et un message de livraison.
          </p>
        </div>

        <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
          {exemples.map((e) => (
            <section key={e.titre} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderTop: "2px solid var(--line)", paddingTop: 12 }}>
                <h2 className="display" style={{ fontSize: 18 }}>
                  {e.titre}
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>{e.quand}</p>
              </div>
              <iframe
                title={`Aperçu de l'e-mail : ${e.titre}`}
                srcDoc={e.html}
                style={{
                  width: "100%",
                  height: 620,
                  border: "none",
                  borderRadius: 14,
                  boxShadow: "0 0 0 1px var(--line)",
                  background: "#FBFBFA",
                }}
              />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
