import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeContent,
  isTrackable,
  normalizePhone,
  validateContent,
  CONTENT_TYPES,
} from "../lib/qr/encode";
import { computeStats } from "../lib/stats";
import { luminance, onAccent } from "../lib/qr/style";
import { validPhone } from "../lib/payments/provider";

test("les 11 types de contenu sont exposés", () => {
  assert.equal(CONTENT_TYPES.length, 11);
});

test("un numéro ivoirien local reçoit l'indicatif 225", () => {
  assert.equal(normalizePhone("07 08 09 10 11"), "2250708091011");
  assert.equal(normalizePhone("+225 07 08 09 10 11"), "2250708091011");
  assert.equal(normalizePhone("00225 0708091011"), "2250708091011");
});

test("le lien est complété par https quand il manque", () => {
  assert.equal(encodeContent("lien", { url: "trame.ci" }), "https://trame.ci");
  assert.equal(encodeContent("lien", { url: "http://trame.ci" }), "http://trame.ci");
});

test("le Wi-Fi échappe les caractères réservés", () => {
  const out = encodeContent("wifi", { ssid: "Chez;Awa", password: "a:b" });
  assert.match(out, /^WIFI:T:WPA;S:Chez\\;Awa;P:a\\:b;;$/);
});

test("un réseau sans mot de passe est marqué nopass", () => {
  assert.match(encodeContent("wifi", { ssid: "Ouvert", password: "" }), /T:nopass/);
});

test("la vCard sépare nom et prénom", () => {
  const out = encodeContent("contact", {
    name: "Awa Koné",
    org: "Chez Awa",
    phone: "0708091011",
    address: "awa@example.ci",
  });
  assert.match(out, /N:Koné;Awa;;;/);
  assert.match(out, /FN:Awa Koné/);
  assert.match(out, /TEL;TYPE=CELL:\+2250708091011/);
});

test("la validation refuse un lien incomplet et accepte un domaine nu", () => {
  assert.ok(validateContent("lien", { url: "pas-un-lien" }));
  assert.equal(validateContent("lien", { url: "maquis.ci" }), null);
});

test("la validation exige des coordonnées GPS plausibles", () => {
  assert.ok(validateContent("lieu", { lat: "999", lng: "0" }));
  assert.equal(validateContent("lieu", { lat: "5.3364", lng: "-4.0267" }), null);
});

test("seuls les types en ligne sont suivis", () => {
  assert.equal(isTrackable("lien"), true);
  assert.equal(isTrackable("whatsapp"), true);
  assert.equal(isTrackable("paiement"), true);
  assert.equal(isTrackable("wifi"), false);
  assert.equal(isTrackable("contact"), false);
  assert.equal(isTrackable("appel"), false);
});

test("le numéro Mobile Money demande 8 chiffres minimum", () => {
  assert.equal(validPhone("0708091"), false);
  assert.equal(validPhone("07 08 09 10 11"), true);
  assert.equal(validPhone("+225 07080910"), true);
});

test("--on-accent bascule selon la luminance", () => {
  assert.equal(onAccent("#17151C"), "#FFFFFF");
  assert.equal(onAccent("#6C3BF5"), "#FFFFFF");
  assert.ok(luminance("#FFFFFF") > luminance("#17151C"));
});

test("les statistiques couvrent 14 jours et repèrent le meilleur", () => {
  const now = new Date("2026-07-27T12:00:00.000Z");
  const scans = [
    { codeId: "a", at: "2026-07-27T08:00:00.000Z", commune: "Cocody" },
    { codeId: "a", at: "2026-07-27T09:00:00.000Z", commune: "Cocody" },
    { codeId: "a", at: "2026-07-25T09:00:00.000Z", commune: "Yopougon" },
    { codeId: "a", at: "2026-07-01T09:00:00.000Z", commune: "Plateau" },
  ];
  const s = computeStats(scans, now);
  assert.equal(s.jours.length, 14);
  assert.equal(s.total, 4);
  assert.equal(s.aujourdhui, 2);
  assert.equal(s.semaine, 3);
  assert.equal(s.meilleur?.count, 2);
  assert.equal(s.communes[0].name, "Cocody");
  assert.equal(s.communes[0].pct, 50);
});

test("le pilote de démonstration est sans état : la référence porte son instant de départ", async () => {
  const { newReference, checkPayment } = await import("../lib/payments/provider");
  const ref = newReference();
  assert.match(ref, /^TRAME-[0-9A-Z]+-[0-9A-Z]+$/);
  // juste après l'émission : en attente de confirmation sur le téléphone
  assert.equal((await checkPayment(ref)).status, "en_attente");
  // une référence inventée n'ouvre jamais l'accès aux fichiers
  assert.equal((await checkPayment("TRAME-INVENTE")).status, "echec");
  assert.equal((await checkPayment("n'importe quoi")).status, "echec");
});
