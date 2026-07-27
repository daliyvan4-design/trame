import type { Metadata } from "next";
import Header from "@/components/Header";
import Generateur from "@/components/generateur/Generateur";
import { currentEmail } from "@/auth";
import { getCode } from "@/lib/db/store";
import { droitAuCodeGratuit } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Composer mon QR code, Trame",
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code: id } = await searchParams;
  const email = await currentEmail();
  const droit = await droitAuCodeGratuit(email);

  // « Modifier ce code » repart des réglages existants plutôt que d'une page vierge.
  let initial = null;
  if (id) {
    const found = await getCode(id);
    if (found && email && found.ownerEmail === email) {
      initial = { type: found.type, fields: found.fields, style: found.style };
    }
  }

  return <Generateur header={<Header compact />} initial={initial} droit={droit} />;
}
