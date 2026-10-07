import { describe, it, expect } from 'vitest';
import { planToSteps, planVocabIds } from './steps';

const plan = { reviews: ['word:a|a'], triage: ['b|b'], newWords: ['c|c'], grammar: ['n2-001'], reading: true };

describe('steps', () => {
  it('orders reviews, triage, new words, grammar, then reading', () => {
    expect(planToSteps(plan)).toEqual([
      { kind: 'review', itemId: 'word:a|a' },
      { kind: 'triage', vocabId: 'b|b' },
      { kind: 'new', vocabId: 'c|c' },
      { kind: 'grammar', grammarId: 'n2-001' },
      { kind: 'reading' },
    ]);
  });

  it('lists every vocab id the session will show (for prefetching definitions)', () => {
    expect(planVocabIds(plan)).toEqual(['a|a', 'b|b', 'c|c']);
  });
});
