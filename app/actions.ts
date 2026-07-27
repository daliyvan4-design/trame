"use server";

import { signIn, signOut } from "@/auth";

export async function connexionGoogle() {
  await signIn("google", { redirectTo: "/mes-codes" });
}

export async function deconnexion() {
  await signOut({ redirectTo: "/" });
}
