import { createEmptyCard, fsrs, Rating, type Card, type Grade as FsrsGrade, type State } from 'ts-fsrs';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
}

const scheduler = fsrs({ enable_fuzz: false });

const RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function fromCard(c: Card): SrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

function toCard(s: SrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    last_review: s.lastReview === null ? undefined : new Date(s.lastReview),
  };
}

export function newState(now: number): SrsState {
  return fromCard(createEmptyCard(new Date(now)));
}

export function review(s: SrsState, grade: Grade, now: number): SrsState {
  return fromCard(scheduler.next(toCard(s), new Date(now), RATING[grade]).card);
}

/** Palavra marcada "sei" na triagem: entra como se tivesse sido respondida "fácil". */
export function knownState(now: number): SrsState {
  return review(newState(now), 'easy', now);
}

export function isDue(s: SrsState, now: number): boolean {
  return s.due <= now;
}
