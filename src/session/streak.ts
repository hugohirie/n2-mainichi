import { addDays } from '../lib/dates';

/** Dias seguidos com a sessão mínima cumprida. Se hoje ainda não foi feito, conta a partir de ontem. */
export function computeStreak(doneDays: Iterable<string>, today: string): number {
  const done = new Set(doneDays);
  let day = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
