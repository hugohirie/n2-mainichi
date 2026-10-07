import { describe, it, expect } from 'vitest';
import { isDue, knownState, newState, review } from './srs';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 7, 9, 0).getTime();

describe('srs', () => {
  it('new state is due immediately and has no reps', () => {
    const s = newState(NOW);
    expect(s.due).toBe(NOW);
    expect(s.reps).toBe(0);
    expect(isDue(s, NOW)).toBe(true);
  });

  it('grading a new card schedules it in the future', () => {
    const s = review(newState(NOW), 'good', NOW);
    expect(s.due).toBeGreaterThan(NOW);
    expect(s.reps).toBe(1);
    expect(s.lastReview).toBe(NOW);
  });

  it('easy schedules further out than again', () => {
    const again = review(newState(NOW), 'again', NOW);
    const easy = review(newState(NOW), 'easy', NOW);
    expect(easy.due).toBeGreaterThan(again.due);
  });

  it('known state (triagem "sei") is due days later, not now', () => {
    const s = knownState(NOW);
    expect(s.due - NOW).toBeGreaterThanOrEqual(2 * DAY);
    expect(isDue(s, NOW + DAY)).toBe(false);
  });

  it('state survives a JSON round-trip (backup) and can still be reviewed', () => {
    const s = review(newState(NOW), 'good', NOW);
    const copy = JSON.parse(JSON.stringify(s));
    const next = review(copy, 'good', s.due);
    expect(next.due).toBeGreaterThan(s.due);
    expect(next.reps).toBe(2);
  });
});
