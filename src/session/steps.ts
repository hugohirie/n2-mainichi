import type { DailyPlan } from './plan';

export type Step =
  | { kind: 'review'; itemId: string }
  | { kind: 'triage'; vocabId: string }
  | { kind: 'new'; vocabId: string }
  | { kind: 'grammar'; grammarId: string }
  | { kind: 'reading' };

export function planToSteps(plan: DailyPlan): Step[] {
  return [
    ...plan.reviews.map((itemId): Step => ({ kind: 'review', itemId })),
    ...plan.triage.map((vocabId): Step => ({ kind: 'triage', vocabId })),
    ...plan.newWords.map((vocabId): Step => ({ kind: 'new', vocabId })),
    ...plan.grammar.map((grammarId): Step => ({ kind: 'grammar', grammarId })),
    ...(plan.reading ? [{ kind: 'reading' } as Step] : []),
  ];
}

export function planVocabIds(plan: DailyPlan): string[] {
  const reviewWords = plan.reviews.filter((id) => id.startsWith('word:')).map((id) => id.slice('word:'.length));
  return [...reviewWords, ...plan.triage, ...plan.newWords];
}
