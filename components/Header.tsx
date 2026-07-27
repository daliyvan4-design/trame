import Link from "next/link";
import { currentEmail } from "@/auth";
import { deconnexion } from "@/app/actions";

export default async function Header({ compact = false }: { compact?: boolean }) {
  const email = await currentEmail();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "18px 20px",
        maxWidth: 1120,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <Link
        href="/"
        className="display"
        style={{ fontSize: 21, letterSpacing: "-0.02em" }}
        aria-label="Trame, accueil"
      >
        Trame
        <span style={{ color: "var(--accent)", transition: "color .45s" }}>.</span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {email ? (
          <>
            <Link href="/mes-codes" className="tap" style={linkStyle}>
              Mes codes
            </Link>
            <form action={deconnexion}>
              <button type="submit" className="tap" style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer" }}>
                Se déconnecter
              </button>
            </form>
          </>
        ) : (
          <Link href="/mes-codes" className="tap" style={linkStyle}>
            Se connecter
          </Link>
        )}
        {!compact && (
          <Link
            href="/generateur"
            className="tap"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--accent)",
              color: "var(--on-accent)",
              padding: "11px 17px",
              borderRadius: 12,
              fontSize: 14.5,
              fontWeight: 600,
              transition: "background .45s, color .45s, filter .18s",
            }}
          >
            Créer mon QR
          </Link>
        )}
      </nav>
    </header>
  );
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "11px 12px",
  fontSize: 14.5,
  fontWeight: 600,
  color: "var(--muted-strong)",
  borderRadius: 10,
};
