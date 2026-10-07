import type { N2DB } from '../storage/db';
import { monthKey } from '../lib/dates';

/** US$ por 1M tokens. */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model];
  if (!p) return 0;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export async function recordUsage(db: N2DB, now: number, model: string, inputTokens: number, outputTokens: number): Promise<void> {
  const month = monthKey(now);
  const id = `${month}|${model}`;
  await db.transaction('rw', db.usage, async () => {
    const row = await db.usage.get(id);
    await db.usage.put({
      id,
      month,
      model,
      inputTokens: (row?.inputTokens ?? 0) + inputTokens,
      outputTokens: (row?.outputTokens ?? 0) + outputTokens,
    });
  });
}

export async function monthUsage(db: N2DB, now: number) {
  const month = monthKey(now);
  const rows = await db.usage.filter((r) => r.month === month).toArray();
  return rows.map((r) => ({
    model: r.model,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    costUsd: costUsd(r.model, r.inputTokens, r.outputTokens),
  }));
}
