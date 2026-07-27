import { NextResponse } from "next/server";
import { checkPayment, initPayment, newReference, type Operator } from "@/lib/payments/provider";
import { newCodeId } from "@/lib/db/store";

// Lance un paiement Mobile Money et réserve l'identifiant du futur code
// (les codes suivis encodent cet identifiant dans leur URL de redirection).
export async function POST(request: Request) {
  const body = (await request.json()) as { operator?: Operator; phone?: string };
  const operator = body.operator;
  const phone = (body.phone ?? "").trim();

  if (!operator) {
    return NextResponse.json({ status: "echec", message: "Choisis ton opérateur." }, { status: 400 });
  }

  const reference = newReference();
  const result = await initPayment({
    operator,
    phone,
    reference,
    description: "Trame, un QR code personnalisé",
  });

  if (result.status === "echec") {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ ...result, codeId: newCodeId() });
}

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json(
      { status: "echec", message: "Le paiement n'a pas abouti" },
      { status: 400 },
    );
  }
  return NextResponse.json(await checkPayment(reference));
}
