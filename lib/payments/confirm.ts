import { getPayment, setPaymentStatus } from "@/lib/db/store";
import { checkPayment, type PaymentResult } from "./provider";

// Deux sources concordent pour dire qu'un paiement est bon : le webhook signé de
// l'agrégateur, et la vérification par sondage. La première qui tranche fait foi et
// son verdict est conservé, ce qui rend le parcours résistant à une panne de l'API
// de vérification (GeniusPay renvoie parfois une erreur serveur sur ce point d'entrée).
export async function confirmPayment(reference: string): Promise<PaymentResult> {
  const enregistre = await getPayment(reference);

  if (enregistre?.status === "paye") return { status: "paye", reference };
  if (enregistre?.status === "echec") {
    return { status: "echec", reference, message: "Le paiement n'a pas abouti" };
  }

  const distant = await checkPayment(reference);
  if (distant.status === "paye") await setPaymentStatus(reference, "paye");
  if (distant.status === "echec") await setPaymentStatus(reference, "echec");
  return distant;
}
