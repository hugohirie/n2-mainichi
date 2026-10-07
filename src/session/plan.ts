export const MIN_REVIEW_CAP = 40;
export const BACKLOG_PAUSE_NEW = 80;
export const MIN_GRAMMAR = 3;
export const CONTINUE_NEW_WORDS = 5;
export const CONTINUE_TRIAGE = 20;

export interface PlanInput {
  dueWordItemIds: string[];
  dueGrammarIds: string[];
  untriagedN3Ids: string[];
  unintroducedN2Ids: string[];
  unintroducedGrammarIds: string[];
  introducedToday: { newWords: number; triage: number; grammar: number };
  settings: { newWordsPerDay: number; newGrammarPerDay: number; triagePerSession: number };
}

export interface DailyPlan {
  reviews: string[];
  triage: string[];
  newWords: string[];
  grammar: string[];
  reading: boolean;
}

const remaining = (quota: number, used: number) => Math.max(0, quota - used);

export function buildDailyPlan(p: PlanInput): DailyPlan {
  const backlog = p.dueWordItemIds.length > BACKLOG_PAUSE_NEW;
  const triaging = p.untriagedN3Ids.length > 0;
  const newWordQuota = backlog || triaging ? 0 : remaining(p.settings.newWordsPerDay, p.introducedToday.newWords);
  const newGrammar = p.unintroducedGrammarIds.slice(0, remaining(p.settings.newGrammarPerDay, p.introducedToday.grammar));
  return {
    reviews: p.dueWordItemIds.slice(0, MIN_REVIEW_CAP),
    triage: p.untriagedN3Ids.slice(0, remaining(p.settings.triagePerSession, p.introducedToday.triage)),
    newWords: p.unintroducedN2Ids.slice(0, newWordQuota),
    grammar: [...p.dueGrammarIds, ...newGrammar].slice(0, MIN_GRAMMAR),
    reading: false,
  };
}

export function buildContinuePlan(p: PlanInput): DailyPlan {
  const triaging = p.untriagedN3Ids.length > 0;
  return {
    reviews: p.dueWordItemIds.slice(0, MIN_REVIEW_CAP),
    triage: triaging ? p.untriagedN3Ids.slice(0, CONTINUE_TRIAGE) : [],
    newWords: triaging ? [] : p.unintroducedN2Ids.slice(0, CONTINUE_NEW_WORDS),
    grammar: p.dueGrammarIds.slice(0, MIN_GRAMMAR),
    reading: true,
  };
}
