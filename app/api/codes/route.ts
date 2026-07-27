import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { confirmPayment } from "@/lib/payments/confirm";
import {
  getCode,
  listCodes,
  newCodeId,
  saveCode,
  saveFirstFreeCode,
  type SavedCode,
} from "@/lib/db/store";
import {
  encodeContent,
  isTrackable,
  validateContent,
  type ContentFields,
  type ContentType,
} from "@/lib/qr/encode";
import { nameFor } from "@/lib/qr/name";
import { DEFAULT_STYLE, type QrStyle } from "@/lib/qr/style";
import { droitAuCodeGratuit, estProprietaire } from "@/lib/pricing";
import { appUrl } from "@/lib/url";

type Payload = {
  reference?: string;
  codeId?: string;
  type?: ContentType;
  fields?: ContentFields;
  style?: QrStyle;
};

function buildCode(args: {
  id: string;
  email: string;
  type: ContentType;
  fields: ContentFields;
  style?: QrStyle;
  paymentRef: string;
}): SavedCode {
  const target = encodeContent(args.type, args.fields);
  const tracked = isTrackable(args.type);
  return {
    id: args.id,
    ownerEmail: args.email,
    name: nameFor(args.type, args.fields),
    type: args.type,
    fields: args.fields,
    style: { ...DEFAULT_STYLE, ...(args.style ?? {}) },
    // Les types en ligne passent par une URL courte, ce qui rend les scans mesurables.
    encoded: tracked ? `${appUrl()}/r/${args.id}` : target,
    target,
    tracked,
    createdAt: new Date().toISOString(),
    paymentRef: args.paymentRef,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const type = body.type;
  const fields = body.fields ?? {};

  if (!type) return NextResponse.json({ message: "Requête incomplète." }, { status: 400 });

  const invalid = validateContent(type, fields);
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 });

  const email = await currentEmail();

  // Parcours offert : aucun paiement n'est demandé, mais le droit est vérifié ici,
  // côté serveur. Ce que le navigateur affiche n'entre jamais dans la décision.
  if (!body.reference) {
    const droit = await droitAuCodeGratuit(email);
    if (!droit.gratuit || !email) {
      return NextResponse.json({ message: "Ce code est payant." }, { status: 402 });
    }

    const code = buildCode({
      id: newCodeId(),
      email,
      type,
      fields,
      style: body.style,
      paymentRef: estProprietaire(email) ? "PROPRIETAIRE" : "PREMIER-OFFERT",
    });

    if (estProprietaire(email)) {
      await saveCode(code);
      return NextResponse.json(code);
    }

    const pose = await saveFirstFreeCode(code);
    if (!pose) {
      return NextResponse.json({ message: "Ce code est payant." }, { status: 402 });
    }
    return NextResponse.json(code);
  }

  // Parcours payant.
  const { reference, codeId } = body;
  if (!codeId) return NextResponse.json({ message: "Requête incomplète." }, { status: 400 });

  const existing = await getCode(codeId);
  if (existing) return NextResponse.json(existing);

  // Le fichier n'est livré qu'après confirmation du paiement côté agrégateur.
  const payment = await confirmPayment(reference);
  if (payment.status !== "paye") {
    return NextResponse.json({ message: "Le paiement n'a pas abouti" }, { status: 402 });
  }

  const code = buildCode({
    id: codeId,
    email: email ?? "",
    type,
    fields,
    style: body.style,
    paymentRef: reference,
  });
  await saveCode(code);
  return NextResponse.json(code);
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ message: "Connecte-toi pour voir tes codes." }, { status: 401 });
  return NextResponse.json(await listCodes(email));
}
