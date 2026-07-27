import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/payments/provider";
import { setPaymentStatus } from "@/lib/db/store";

type Notification = {
  event?: string;
  data?: { reference?: string; status?: string };
};

// Webhook GeniusPay. La signature HMAC est la preuve : elle atteste que le corps
// vient bien de l'agrégateur et n'a pas été modifié. C'est donc lui, et non le
// sondage de l'API, qui fait autorité, d'autant que ce dernier peut être en panne.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

  if (!verifyWebhook(raw, signature, timestamp)) {
    return NextResponse.json({ recu: false }, { status: 401 });
  }

  let notif: Notification;
  try {
    notif = JSON.parse(raw) as Notification;
  } catch {
    return NextResponse.json({ recu: false }, { status: 400 });
  }

  const reference = String(notif.data?.reference ?? "");
  if (!reference) return NextResponse.json({ recu: false }, { status: 400 });

  const status = notif.data?.status;
  if (status === "completed") {
    await setPaymentStatus(reference, "paye");
  } else if (status === "failed" || status === "cancelled" || status === "expired") {
    await setPaymentStatus(reference, "echec");
  }

  // On répond toujours 200 à une notification authentique, y compris pour un état
  // intermédiaire : sans quoi l'agrégateur la rejouerait indéfiniment.
  return NextResponse.json({ recu: true, reference, status: status ?? "inconnu" });
}
