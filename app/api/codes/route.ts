import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { checkPayment } from "@/lib/payments/provider";
import { getCode, listCodes, saveCode, type SavedCode } from "@/lib/db/store";
import { encodeContent, isTrackable, validateContent, type ContentFields, type ContentType } from "@/lib/qr/encode";
import { nameFor } from "@/lib/qr/name";
import { DEFAULT_STYLE, type QrStyle } from "@/lib/qr/style";
import { appUrl } from "@/lib/url";

type Payload = {
  reference?: string;
  codeId?: string;
  type?: ContentType;
  fields?: ContentFields;
  style?: QrStyle;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Payload;
  const { reference, codeId, type } = body;
  const fields = body.fields ?? {};

  if (!reference || !codeId || !type) {
    return NextResponse.json({ message: "Requête incomplète." }, { status: 400 });
  }

  const invalid = validateContent(type, fields);
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 });

  // Le fichier n'est livré qu'après confirmation du paiement côté agrégateur.
  const payment = await checkPayment(reference);
  if (payment.status !== "paye") {
    return NextResponse.json({ message: "Le paiement n'a pas abouti" }, { status: 402 });
  }

  const existing = await getCode(codeId);
  if (existing) return NextResponse.json(existing);

  const target = encodeContent(type, fields);
  const tracked = isTrackable(type);
  const code: SavedCode = {
    id: codeId,
    ownerEmail: (await currentEmail()) ?? "",
    name: nameFor(type, fields),
    type,
    fields,
    style: { ...DEFAULT_STYLE, ...(body.style ?? {}) },
    // Les types en ligne passent par une URL courte, ce qui rend les scans mesurables.
    encoded: tracked ? `${appUrl()}/r/${codeId}` : target,
    target,
    tracked,
    createdAt: new Date().toISOString(),
    paymentRef: reference,
  };

  await saveCode(code);
  return NextResponse.json(code);
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ message: "Connecte-toi pour voir tes codes." }, { status: 401 });
  return NextResponse.json(await listCodes(email));
}
