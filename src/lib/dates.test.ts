import { describe, it, expect } from 'vitest';
import { addDays, localDateKey, monthKey, startOfLocalDay } from './dates';

describe('dates', () => {
  it('runs in São Paulo time (guard for the tests below)', () => {
    expect(new Date(Date.UTC(2026, 9, 8, 2, 50)).getHours()).toBe(23);
  });

  it('uses the LOCAL date, not UTC, near midnight', () => {
    // 23:50 em São Paulo = 02:50 UTC do dia seguinte
    expect(localDateKey(Date.UTC(2026, 9, 8, 2, 50))).toBe('2026-10-07');
    expect(localDateKey(new Date(2026, 9, 8, 0, 10).getTime())).toBe('2026-10-08');
  });

  it('computes month keys and start of day locally', () => {
    expect(monthKey(new Date(2026, 9, 31, 23, 59).getTime())).toBe('2026-10');
    const start = startOfLocalDay(new Date(2026, 9, 7, 15, 30).getTime());
    expect(start).toBe(new Date(2026, 9, 7, 0, 0).getTime());
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});
