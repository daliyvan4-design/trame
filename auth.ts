import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: googleConfigured ? [Google] : [],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/mes-codes" },
  callbacks: {
    // On ne garde que l'adresse : c'est la clé qui relie une personne à ses codes.
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email;
      return session;
    },
  },
});

export async function currentEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}
