import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCode, recordScan } from "@/lib/db/store";
import { communeFrom } from "@/lib/geo";

// URL courte encodée dans les QR suivis : on note l'ouverture, puis on redirige.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const code = await getCode(id);

  if (!code || !code.tracked) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const commune = communeFrom(request.headers);

  // L'enregistrement ne doit jamais retarder l'ouverture du lien.
  after(async () => {
    await recordScan({ codeId: id, at: new Date().toISOString(), commune });
  });

  return NextResponse.redirect(code.target, 302);
}
