import { COMMUNES, type Commune } from "./geo";
import type { Scan } from "./db/store";

export type Stats = {
  total: number;
  semaine: number;
  aujourdhui: number;
  jours: Array<{ date: Date; count: number }>;
  communes: Array<{ name: Commune; pct: number; count: number }>;
  meilleur: { date: Date; count: number } | null;
};

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

  const counts = new Map<Commune, number>();
  for (const s of scans) {
    const c = (COMMUNES as readonly string[]).includes(s.commune)
      ? (s.commune as Commune)
      : "Autres";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const total = scans.length;
  const communes = COMMUNES.map((name) => {
    const count = counts.get(name) ?? 0;
    return { name, count, pct: total ? Math.round((count / total) * 100) : 0 };
  }).sort((a, b) => b.count - a.count);

  const meilleur = jours.reduce<{ date: Date; count: number } | null>(
    (best, j) => (j.count > 0 && (!best || j.count > best.count) ? j : best),
    null,
  );

  return { total, semaine, aujourdhui, jours, communes, meilleur };
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
