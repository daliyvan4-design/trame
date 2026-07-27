import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCode, recordScan } from "@/lib/db/store";
import { lieuDepuis } from "@/lib/geo";
import { appareilDepuis, empreinteDepuis } from "@/lib/visite";

// URL courte encodée dans les QR suivis : on note l'ouverture, puis on redirige.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const code = await getCode(id);

  if (!code || !code.tracked) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const lieu = lieuDepuis(request.headers);
  const appareil = appareilDepuis(request.headers);
  const empreinte = empreinteDepuis(request.headers);

  // L'enregistrement ne doit jamais retarder l'ouverture du lien.
  after(async () => {
    await recordScan({
      codeId: id,
      at: new Date().toISOString(),
      ville: lieu.ville,
      pays: lieu.pays,
      appareil,
      empreinte,
    });
  });

  return NextResponse.redirect(code.target, 302);
}
