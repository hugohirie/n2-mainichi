import { grammar, grammarById, vocab, vocabById } from '../data';
import type { VocabEntry } from '../data/types';
import type { N2DB, ItemKind, ItemOrigin, ItemRow, WordDetailRow } from '../storage/db';
import { getSettings } from '../storage/settings';
import { knownState, newState, review, type Grade } from '../srs/srs';
import { AiError, type AiErrorKind } from '../ai/errors';
import { generateGrammarSet, generateReading, generateWordDetails, type AiDeps } from '../ai/generate';
import type { GrammarSet, Reading, ReadingLength } from '../ai/schemas';
import { localDateKey, startOfLocalDay } from '../lib/dates';
import { buildContinuePlan, buildDailyPlan, type DailyPlan, type PlanInput } from './plan';
import { computeStreak } from './streak';
import { gradeFromResults } from './grading';

export interface Ctx {
  db: N2DB;
  ai: AiDeps | null;
  now: () => number;
}

export type StartError = AiErrorKind | 'invalid' | 'no-ai';
export type StartResult<T> = { ok: true; exerciseId: number; content: T } | { ok: false; error: StartError };

export interface WordView {
  entry: VocabEntry;
  details: WordDetailRow | undefined;
}

export interface Progress {
  streak: number;
  n3Total: number;
  n3Triaged: number;
  n3Known: number;
  n2Total: number;
  n2Introduced: number;
  grammarTotal: number;
  grammarIntroduced: number;
  matureWords: number;
}

const WORD_BATCH = 10;
const READING_TARGET_WORDS = 8;
const MATURE_STABILITY_DAYS = 21;

const itemId = (kind: ItemKind, refId: string) => `${kind}:${refId}`;

export async function loadPlanInput(ctx: Ctx): Promise<PlanInput> {
  const now = ctx.now();
  const dayStart = startOfLocalDay(now);
  const settings = await getSettings(ctx.db);
  const items = await ctx.db.items.toArray();
  const ids = new Set(items.map((i) => i.id));
  const active = items.filter((i) => !i.discarded);
  const due = active.filter((i) => i.due <= now).sort((a, b) => a.due - b.due);
  const today = items.filter((i) => i.introducedAt >= dayStart);
  return {
    dueWordItemIds: due.filter((i) => i.kind === 'word').map((i) => i.id),
    dueGrammarIds: due.filter((i) => i.kind === 'grammar').map((i) => i.refId),
    untriagedN3Ids: vocab.filter((v) => v.level === 'N3' && !ids.has(itemId('word', v.id))).map((v) => v.id),
    unintroducedN2Ids: vocab.filter((v) => v.level === 'N2' && !ids.has(itemId('word', v.id))).map((v) => v.id),
    unintroducedGrammarIds: grammar.filter((g) => !ids.has(itemId('grammar', g.id))).map((g) => g.id),
    introducedToday: {
      newWords: today.filter((i) => i.kind === 'word' && i.origin === 'new').length,
      triage: today.filter((i) => i.kind === 'word' && i.origin !== 'new').length,
      grammar: today.filter((i) => i.kind === 'grammar').length,
    },
    settings: {
      newWordsPerDay: settings.newWordsPerDay,
      newGrammarPerDay: settings.newGrammarPerDay,
      triagePerSession: settings.triagePerSession,
    },
  };
}

export async function getTodayPlan(ctx: Ctx): Promise<DailyPlan> {
  return buildDailyPlan(await loadPlanInput(ctx));
}

export async function getContinuePlan(ctx: Ctx): Promise<DailyPlan> {
  return buildContinuePlan(await loadPlanInput(ctx));
}

export async function introduceWord(ctx: Ctx, vocabId: string, origin: ItemOrigin): Promise<ItemRow> {
  const entry = vocabById.get(vocabId);
  if (!entry) throw new Error(`palavra desconhecida: ${vocabId}`);
  const id = itemId('word', vocabId);
  const existing = await ctx.db.items.get(id);
  if (existing) return existing;
  const now = ctx.now();
  const srs = origin === 'triage-known' ? knownState(now) : newState(now);
  const row: ItemRow = { id, kind: 'word', refId: vocabId, level: entry.level, origin, srs, due: srs.due, introducedAt: now, discarded: false };
  await ctx.db.items.put(row);
  return row;
}

export function answerTriage(ctx: Ctx, vocabId: string, known: boolean): Promise<ItemRow> {
  return introduceWord(ctx, vocabId, known ? 'triage-known' : 'triage-unknown');
}

export async function ensureWordDetails(ctx: Ctx, vocabIds: string[]): Promise<AiErrorKind | null> {
  if (!ctx.ai) return null;
  const unique = [...new Set(vocabIds)];
  const existing = await ctx.db.wordDetails.bulkGet(unique);
  const missing = unique
    .filter((_, i) => !existing[i])
    .map((id) => vocabById.get(id))
    .filter((v): v is VocabEntry => v !== undefined);
  for (let i = 0; i < missing.length; i += WORD_BATCH) {
    try {
      const map = await generateWordDetails(ctx.ai, missing.slice(i, i + WORD_BATCH));
      const createdAt = ctx.now();
      await ctx.db.wordDetails.bulkPut([...map].map(([wordId, d]) => ({ wordId, ...d, createdAt })));
    } catch (e) {
      if (e instanceof AiError) return e.kind;
      throw e;
    }
  }
  return null;
}

export async function getWordView(ctx: Ctx, vocabId: string): Promise<WordView> {
  const entry = vocabById.get(vocabId);
  if (!entry) throw new Error(`palavra desconhecida: ${vocabId}`);
  return { entry, details: await ctx.db.wordDetails.get(vocabId) };
}

export async function answerReview(ctx: Ctx, id: string, grade: Grade): Promise<ItemRow> {
  const item = await ctx.db.items.get(id);
  if (!item) throw new Error(`item inexistente: ${id}`);
  const srs = review(item.srs, grade, ctx.now());
  const updated = { ...item, srs, due: srs.due };
  await ctx.db.items.put(updated);
  return updated;
}

async function runGeneration<T>(ctx: Ctx, generate: (ai: AiDeps) => Promise<T | null>): Promise<{ ok: true; value: T } | { ok: false; error: StartError }> {
  if (!ctx.ai) return { ok: false, error: 'no-ai' };
  try {
    const value = await generate(ctx.ai);
    return value === null ? { ok: false, error: 'invalid' } : { ok: true, value };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, error: e.kind };
    throw e;
  }
}

export async function startGrammar(ctx: Ctx, grammarId: string): Promise<StartResult<GrammarSet>> {
  const point = grammarById.get(grammarId);
  if (!point) throw new Error(`gramática desconhecida: ${grammarId}`);
  const gen = await runGeneration(ctx, (ai) => generateGrammarSet(ai, point));
  if (!gen.ok) return gen;
  const now = ctx.now();
  const id = itemId('grammar', grammarId);
  if (!(await ctx.db.items.get(id))) {
    const srs = newState(now);
    await ctx.db.items.put({ id, kind: 'grammar', refId: grammarId, level: point.level, origin: 'new', srs, due: srs.due, introducedAt: now, discarded: false });
  }
  const exerciseId = await ctx.db.exercises.add({
    kind: 'grammar',
    refId: grammarId,
    content: gen.value,
    answers: null,
    correctCount: null,
    srsBefore: null,
    createdAt: now,
    answeredAt: null,
    discarded: false,
  });
  return { ok: true, exerciseId, content: gen.value };
}

function countCorrect(questions: { answerIndex: number }[], answers: number[]): number {
  return questions.filter((q, i) => answers[i] === q.answerIndex).length;
}

export async function answerGrammar(ctx: Ctx, exerciseId: number, answers: number[]) {
  const ex = await ctx.db.exercises.get(exerciseId);
  if (!ex || ex.kind !== 'grammar' || !ex.refId) throw new Error(`exercício de gramática inexistente: ${exerciseId}`);
  const set = ex.content as GrammarSet;
  const correct = countCorrect(set.questions, answers);
  const total = set.questions.length;
  const grade = gradeFromResults(correct, total);
  const now = ctx.now();
  await ctx.db.transaction('rw', ctx.db.items, ctx.db.exercises, async () => {
    const item = await ctx.db.items.get(itemId('grammar', ex.refId!));
    if (!item) throw new Error(`item de gramática inexistente: ${ex.refId}`);
    const srs = review(item.srs, grade, now);
    await ctx.db.exercises.update(exerciseId, { answers, correctCount: correct, srsBefore: item.srs, answeredAt: now });
    await ctx.db.items.put({ ...item, srs, due: srs.due });
  });
  return { correct, total, grade };
}

export async function startReading(ctx: Ctx): Promise<StartResult<Reading>> {
  const done = await ctx.db.exercises.where('kind').equals('reading').count();
  const length: ReadingLength = done % 2 === 0 ? 'short' : 'medium';
  const recent = (await ctx.db.items.where('kind').equals('word').toArray())
    .filter((i) => i.origin !== 'triage-known' && !i.discarded)
    .sort((a, b) => b.introducedAt - a.introducedAt)
    .slice(0, READING_TARGET_WORDS)
    .map((i) => vocabById.get(i.refId)?.expression)
    .filter((w): w is string => w !== undefined);
  const gen = await runGeneration(ctx, (ai) => generateReading(ai, length, recent));
  if (!gen.ok) return gen;
  const exerciseId = await ctx.db.exercises.add({
    kind: 'reading',
    refId: null,
    content: gen.value,
    answers: null,
    correctCount: null,
    srsBefore: null,
    createdAt: ctx.now(),
    answeredAt: null,
    discarded: false,
  });
  return { ok: true, exerciseId, content: gen.value };
}

export async function answerReading(ctx: Ctx, exerciseId: number, answers: number[]) {
  const ex = await ctx.db.exercises.get(exerciseId);
  if (!ex || ex.kind !== 'reading') throw new Error(`leitura inexistente: ${exerciseId}`);
  const reading = ex.content as Reading;
  const correct = countCorrect(reading.questions, answers);
  await ctx.db.exercises.update(exerciseId, { answers, correctCount: correct, answeredAt: ctx.now() });
  return { correct, total: reading.questions.length };
}

export async function discardExercise(ctx: Ctx, exerciseId: number): Promise<void> {
  await ctx.db.transaction('rw', ctx.db.items, ctx.db.exercises, async () => {
    const ex = await ctx.db.exercises.get(exerciseId);
    if (!ex) return;
    await ctx.db.exercises.update(exerciseId, { discarded: true });
    if (ex.kind === 'grammar' && ex.refId && ex.srsBefore) {
      const item = await ctx.db.items.get(itemId('grammar', ex.refId));
      if (item) await ctx.db.items.put({ ...item, srs: ex.srsBefore, due: ex.srsBefore.due });
    }
  });
}

/** Dia ao qual uma sessão pertence: o dia (local) em que ela começou. */
export function sessionDate(ctx: Ctx): string {
  return localDateKey(ctx.now());
}

export async function markMinimumDone(ctx: Ctx, date: string = sessionDate(ctx)): Promise<void> {
  await ctx.db.days.put({ date, minimumDone: true });
}

export async function isMinimumDoneToday(ctx: Ctx): Promise<boolean> {
  return (await ctx.db.days.get(localDateKey(ctx.now())))?.minimumDone ?? false;
}

/** Enquanto a sessão mínima de hoje não foi feita, qualquer sessão conta como a mínima. */
export async function resolveMode(ctx: Ctx, requested: 'minimum' | 'continue'): Promise<'minimum' | 'continue'> {
  return (await isMinimumDoneToday(ctx)) ? requested : 'minimum';
}

export async function getStreak(ctx: Ctx): Promise<number> {
  const days = await ctx.db.days.toArray();
  return computeStreak(
    days.filter((d) => d.minimumDone).map((d) => d.date),
    localDateKey(ctx.now()),
  );
}

export async function getProgress(ctx: Ctx): Promise<Progress> {
  const items = await ctx.db.items.toArray();
  const words = items.filter((i) => i.kind === 'word');
  return {
    streak: await getStreak(ctx),
    n3Total: vocab.filter((v) => v.level === 'N3').length,
    n3Triaged: words.filter((i) => i.level === 'N3').length,
    n3Known: words.filter((i) => i.origin === 'triage-known').length,
    n2Total: vocab.filter((v) => v.level === 'N2').length,
    n2Introduced: words.filter((i) => i.level === 'N2').length,
    grammarTotal: grammar.length,
    grammarIntroduced: items.filter((i) => i.kind === 'grammar').length,
    matureWords: words.filter((i) => !i.discarded && i.srs.stability >= MATURE_STABILITY_DAYS).length,
  };
}
