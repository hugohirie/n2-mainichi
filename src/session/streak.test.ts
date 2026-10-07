import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

describe('computeStreak', () => {
  it('is 0 with no days', () => {
    expect(computeStreak([], '2026-10-07')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-10-05', '2026-10-06', '2026-10-07'], '2026-10-07')).toBe(3);
  });

  it('does not break the streak before today is over', () => {
    expect(computeStreak(['2026-10-05', '2026-10-06'], '2026-10-07')).toBe(2);
  });

  it('breaks on a missed day and crosses month boundaries', () => {
    expect(computeStreak(['2026-10-03', '2026-10-05', '2026-10-06'], '2026-10-06')).toBe(2);
    expect(computeStreak(['2026-09-30', '2026-10-01'], '2026-10-01')).toBe(2);
  });
});
