import { NextResponse } from "next/server";
import { initPayment, OPERATORS, type Operator } from "@/lib/payments/provider";
import { confirmPayment } from "@/lib/payments/confirm";
import { newCodeId, openPayment } from "@/lib/db/store";

function readOperator(value: unknown): Operator | null {
  return OPERATORS.some((o) => o.id === value) ? (value as Operator) : null;
}

// Lance un paiement Mobile Money et réserve l'identifiant du futur code
// (les codes suivis encodent cet identifiant dans leur URL de redirection).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { operator?: unknown; phone?: unknown };
  const operator = readOperator(body.operator);
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!operator) {
    return NextResponse.json({ status: "echec", message: "Choisis ton opérateur." }, { status: 400 });
  }

  const codeId = newCodeId();
  // La référence est émise par l'agrégateur : on ne l'invente jamais côté Trame.
  const result = await initPayment({
    operator,
    phone,
    description: "Trame, un QR code personnalisé",
    codeId,
  });

  if (result.status === "echec") {
    return NextResponse.json(result, { status: 400 });
  }

  // On garde trace de la transaction dès son ouverture : c'est ce qui permettra
  // au webhook signé de la confirmer même si l'API de vérification est en panne.
  await openPayment(result.reference, codeId);

  return NextResponse.json({ ...result, codeId });
}

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json(
      { status: "echec", message: "Le paiement n'a pas abouti" },
      { status: 400 },
    );
  }
  return NextResponse.json(await confirmPayment(reference));
}
