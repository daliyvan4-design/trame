import { NextResponse } from "next/server";
import { checkPayment } from "@/lib/payments/provider";

// Webhook de l'agrégateur : on ne fait jamais confiance au corps reçu,
// on redemande l'état réel de la transaction avant toute conclusion.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const reference = String(form?.get("cpm_trans_id") ?? "");
  if (!reference) return NextResponse.json({ recu: false }, { status: 400 });
  const result = await checkPayment(reference);
  return NextResponse.json({ recu: true, status: result.status });
}
