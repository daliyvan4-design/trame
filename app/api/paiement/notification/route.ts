import { NextResponse } from "next/server";
import { checkPayment, verifyWebhook } from "@/lib/payments/provider";

// Webhook GeniusPay. Deux garde-fous avant d'en tirer la moindre conclusion :
// la signature HMAC doit être valide, puis on redemande l'état réel de la
// transaction. Un corps de requête n'est jamais une preuve de paiement.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

  if (!verifyWebhook(raw, signature, timestamp)) {
    return NextResponse.json({ recu: false }, { status: 401 });
  }

  let reference = "";
  try {
    reference = String((JSON.parse(raw) as { data?: { reference?: string } })?.data?.reference ?? "");
  } catch {
    return NextResponse.json({ recu: false }, { status: 400 });
  }
  if (!reference) return NextResponse.json({ recu: false }, { status: 400 });

  const result = await checkPayment(reference);
  return NextResponse.json({ recu: true, status: result.status });
}
