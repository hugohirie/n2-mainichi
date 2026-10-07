import { describe, it, expect } from 'vitest';
import { buildContinuePlan, buildDailyPlan, type PlanInput } from './plan';

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

const base: PlanInput = {
  dueWordItemIds: [],
  dueGrammarIds: [],
  untriagedN3Ids: [],
  unintroducedN2Ids: ids('n2-', 100),
  unintroducedGrammarIds: ids('g', 50),
  introducedToday: { newWords: 0, triage: 0, grammar: 0 },
  settings: { newWordsPerDay: 10, newGrammarPerDay: 1, triagePerSession: 30 },
};

describe('buildDailyPlan', () => {
  it('takes the daily quotas of new words and grammar', () => {
    const p = buildDailyPlan({ ...base, dueWordItemIds: ids('w', 12) });
    expect(p.reviews).toHaveLength(12);
    expect(p.newWords).toEqual(ids('n2-', 10));
    expect(p.grammar).toEqual(['g0']);
    expect(p.reading).toBe(false);
  });

  it('runs N3 triage before introducing N2 words', () => {
    const p = buildDailyPlan({ ...base, untriagedN3Ids: ids('n3-', 500) });
    expect(p.triage).toHaveLength(30);
    expect(p.newWords).toEqual([]);
  });

  it('subtracts what was already introduced today', () => {
    const p = buildDailyPlan({ ...base, untriagedN3Ids: ids('n3-', 500), introducedToday: { newWords: 0, triage: 25, grammar: 1 } });
    expect(p.triage).toHaveLength(5);
    expect(p.grammar).toEqual([]);
  });

  it('caps reviews at 40 and pauses new words when more than 80 are overdue', () => {
    const p = buildDailyPlan({ ...base, dueWordItemIds: ids('w', 300) });
    expect(p.reviews).toEqual(ids('w', 40));
    expect(p.newWords).toEqual([]);
  });

  it('puts due grammar first and limits grammar to 3 per minimum session', () => {
    const p = buildDailyPlan({ ...base, dueGrammarIds: ['d1', 'd2', 'd3', 'd4'] });
    expect(p.grammar).toEqual(['d1', 'd2', 'd3']);
  });
});

describe('buildContinuePlan', () => {
  it('offers remaining reviews, extra words, due grammar and a reading', () => {
    const p = buildContinuePlan({ ...base, dueWordItemIds: ids('w', 50), dueGrammarIds: ['d1'] });
    expect(p.reviews).toHaveLength(40);
    expect(p.newWords).toHaveLength(5);
    expect(p.grammar).toEqual(['d1', 'g0', 'g1']);
    expect(p.reading).toBe(true);
  });

  it('offers new grammar points in "continue" even when none is due', () => {
    expect(buildContinuePlan(base).grammar).toEqual(['g0', 'g1', 'g2']);
  });

  it('offers more triage instead of N2 words while N3 triage is unfinished', () => {
    const p = buildContinuePlan({ ...base, untriagedN3Ids: ids('n3-', 100) });
    expect(p.triage).toHaveLength(20);
    expect(p.newWords).toEqual([]);
  });
});
