import { libelleDuLieu } from "./geo";
import type { Scan } from "./db/store";

export type Stats = {
  total: number;
  semaine: number;
  aujourdhui: number;
  jours: Array<{ date: Date; count: number }>;
  // Ce que le réseau rapporte vraiment : des villes, pas des quartiers.
  lieux: Array<{ nom: string; pct: number; count: number }>;
  meilleur: { date: Date; count: number } | null;
  // Insights supplémentaires, tous déduits de ce qui est déjà collecté.
  heures: Array<{ heure: number; count: number }>;
  meilleureHeure: { heure: number; count: number } | null;
  semaineJours: Array<{ nom: string; count: number }>;
  meilleurJourSemaine: { nom: string; count: number } | null;
  personnes: number;
  retours: number;
  appareils: Array<{ nom: string; count: number; pct: number }>;
};

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const JOURS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeStats(scans: Scan[], now = new Date()): Stats {
  const byDay = new Map<string, number>();
  for (const s of scans) {
    const k = s.at.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const jours: Array<{ date: Date; count: number }> = [];
  for (let i = JOURS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    jours.push({ date: d, count: byDay.get(dayKey(d)) ?? 0 });
  }

  const semaine = jours.slice(-7).reduce((a, b) => a + b.count, 0);
  const aujourdhui = jours[jours.length - 1]?.count ?? 0;

  const total = scans.length;
  const parLieu = new Map<string, number>();
  for (const s of scans) {
    const nom = libelleDuLieu({ ville: s.ville ?? "", pays: s.pays ?? "" });
    parLieu.set(nom, (parLieu.get(nom) ?? 0) + 1);
  }
  const lieux = [...parLieu.entries()]
    .map(([nom, count]) => ({ nom, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const meilleur = jours.reduce<{ date: Date; count: number } | null>(
    (best, j) => (j.count > 0 && (!best || j.count > best.count) ? j : best),
    null,
  );

  // La Côte d'Ivoire est à UTC+0 toute l'année : l'heure UTC est l'heure d'Abidjan,
  // aucune conversion n'est nécessaire.
  const parHeure = new Array(24).fill(0) as number[];
  const parJourSemaine = new Array(7).fill(0) as number[];
  const vues = new Map<string, number>();
  const parAppareil = new Map<string, number>();

  for (const s of scans) {
    const d = new Date(s.at);
    parHeure[d.getUTCHours()]++;
    parJourSemaine[d.getUTCDay()]++;
    const e = s.empreinte ?? "";
    if (e) vues.set(e, (vues.get(e) ?? 0) + 1);
    const a = s.appareil ?? "Autre";
    parAppareil.set(a, (parAppareil.get(a) ?? 0) + 1);
  }

  const heures = parHeure.map((count, heure) => ({ heure, count }));
  const meilleureHeure = heures.reduce<{ heure: number; count: number } | null>(
    (best, h) => (h.count > 0 && (!best || h.count > best.count) ? h : best),
    null,
  );

  const semaineJours = parJourSemaine.map((count, i) => ({ nom: NOMS_JOURS[i], count }));
  const meilleurJourSemaine = semaineJours.reduce<{ nom: string; count: number } | null>(
    (best, j) => (j.count > 0 && (!best || j.count > best.count) ? j : best),
    null,
  );

  // Une personne qui scanne trois fois compte pour une seule, et pour deux retours.
  const personnes = vues.size;
  const retours = [...vues.values()].reduce((n, v) => n + Math.max(0, v - 1), 0);

  const appareils = [...parAppareil.entries()]
    .map(([nom, count]) => ({ nom, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    semaine,
    aujourdhui,
    jours,
    lieux,
    meilleur,
    heures,
    meilleureHeure,
    semaineJours,
    meilleurJourSemaine,
    personnes,
    retours,
    appareils,
  };
}

export function trancheHoraire(h: number): string {
  return `${String(h).padStart(2, "0")} h`;
}

export function formatJour(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function nombre(n: number): string {
  return n.toLocaleString("fr-FR");
}
