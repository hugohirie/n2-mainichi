import { describe, it, expect } from 'vitest';
import { testDb } from '../test-utils';
import { costUsd, monthUsage, recordUsage } from './usage';

describe('usage', () => {
  it('prices tokens per million', () => {
    expect(costUsd('claude-opus-5-5', 1_000_000, 1_000_000)).toBeCloseTo(24);
    expect(costUsd('claude-sonnet-5-5', 500_000, 100_000)).toBeCloseTo(2);
    expect(costUsd('modelo-desconhecido', 1000, 1000)).toBe(0);
  });

  it('accumulates per model within the local month and resets next month', async () => {
    const db = testDb();
    const oct = new Date(2026, 9, 7).getTime();
    await recordUsage(db, oct, 'claude-opus-5-5', 1000, 2000);
    await recordUsage(db, oct, 'claude-opus-5-5', 500, 500);
    await recordUsage(db, oct, 'claude-sonnet-5-5', 100, 100);
    const rows = await monthUsage(db, oct);
    expect(rows.find((r) => r.model === 'claude-opus-5-5')).toMatchObject({ inputTokens: 1500, outputTokens: 2500 });
    expect(rows).toHaveLength(2);
    expect(await monthUsage(db, new Date(2026, 10, 1).getTime())).toEqual([]);
  });
});
