import { describe, it, expect } from 'vitest';
import { testDb } from '../test-utils';
import { vocab, grammar } from '../data';
import type { AiDeps } from '../ai/generate';
import type { Llm, LlmCall, LlmResult } from '../ai/client';
import type { GrammarSet } from '../ai/schemas';
import {
  answerGrammar,
  answerReview,
  answerTriage,
  discardExercise,
  ensureWordDetails,
  getStreak,
  getTodayPlan,
  introduceWord,
  isMinimumDoneToday,
  markMinimumDone,
  resolveMode,
  sessionDate,
  startGrammar,
  type Ctx,
} from './service';

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 7, 9).getTime();

function fakeAi(responder: (call: LlmCall<unknown>) => unknown) {
  const calls: LlmCall<unknown>[] = [];
  const llm: Llm = async <T>(call: LlmCall<T>): Promise<LlmResult<T>> => {
    calls.push(call as LlmCall<unknown>);
    const r = responder(call as LlmCall<unknown>);
    if (r && typeof r === 'object' && 'status' in r) throw r;
    return { data: r as T | null, inputTokens: 1, outputTokens: 1 };
  };
  const ai: AiDeps = { llm, wordModel: 'claude-sonnet-5-5', examModel: 'claude-opus-5-5', onUsage: async () => {} };
  return { ai, calls };
}

function ctxAt(t: { now: number }, ai: AiDeps | null = null): Ctx {
  return { db: testDb(), ai, now: () => t.now };
}

const q = (type: 'form' | 'order', answerIndex: number) => ({
  type,
  stem: type === 'form' ? '雨（　　）行く。' : 'A ＿＿ ＿＿ ★ ＿＿ B',
  options: ['a', 'b', 'c', 'd'],
  answerIndex,
  explanationsJa: ['1', '2', '3', '4'],
  translationPt: 'x',
});
const SET: GrammarSet = { explanationJa: '説明', explanationPt: 'exp', questions: [q('form', 0), q('form', 1), q('order', 2)] };

const n3 = vocab.filter((v) => v.level === 'N3');

describe('daily plan from the database', () => {
  it('starts with N3 triage and the first grammar point', async () => {
    const ctx = ctxAt({ now: T0 });
    const plan = await getTodayPlan(ctx);
    expect(plan.triage).toEqual(n3.slice(0, 30).map((v) => v.id));
    expect(plan.newWords).toEqual([]);
    expect(plan.grammar).toEqual([grammar[0].id]);
    expect(plan.reviews).toEqual([]);
  });

  it('triage: "sei" is scheduled for later, "não sei" becomes due now; quota shrinks', async () => {
    const ctx = ctxAt({ now: T0 });
    const known = await answerTriage(ctx, n3[0].id, true);
    const unknown = await answerTriage(ctx, n3[1].id, false);
    expect(known.due).toBeGreaterThan(T0 + DAY);
    expect(unknown.due).toBeLessThanOrEqual(T0);
    const plan = await getTodayPlan(ctx);
    expect(plan.reviews).toEqual([`word:${n3[1].id}`]);
    expect(plan.triage).toHaveLength(28);
    expect(plan.triage).not.toContain(n3[0].id);
  });

  it('introduceWord is idempotent and reviews move the due date forward', async () => {
    const ctx = ctxAt({ now: T0 });
    const a = await introduceWord(ctx, n3[0].id, 'new');
    const b = await introduceWord(ctx, n3[0].id, 'triage-known');
    expect(b).toEqual(a);
    const reviewed = await answerReview(ctx, a.id, 'good');
    expect(reviewed.due).toBeGreaterThan(T0);
    expect((await ctx.db.items.get(a.id))?.srs.reps).toBe(1);
  });
});

describe('word details', () => {
  it('generates missing details in batches of 10 and skips existing ones', async () => {
    const { ai, calls } = fakeAi((call) => {
      const ids = [...call.user.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]);
      return { words: ids.map((id) => ({ id, definitionJa: '定義', example: '例文' })) };
    });
    const ctx = ctxAt({ now: T0 }, ai);
    const ids = n3.slice(0, 25).map((v) => v.id);
    expect(await ensureWordDetails(ctx, ids)).toBeNull();
    expect(calls).toHaveLength(3);
    expect(await ctx.db.wordDetails.count()).toBe(25);
    await ensureWordDetails(ctx, ids);
    expect(calls).toHaveLength(3);
  });

  it('reports the API error kind instead of throwing', async () => {
    const { ai } = fakeAi(() => ({ status: 401 }));
    expect(await ensureWordDetails(ctxAt({ now: T0 }, ai), [n3[0].id])).toBe('auth');
  });

  it('does nothing without an API key', async () => {
    expect(await ensureWordDetails(ctxAt({ now: T0 }, null), [n3[0].id])).toBeNull();
  });
});

describe('grammar exercises', () => {
  it('creates the grammar item only after a valid exercise exists, then grades it', async () => {
    const { ai } = fakeAi(() => SET);
    const ctx = ctxAt({ now: T0 }, ai);
    const started = await startGrammar(ctx, grammar[0].id);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const result = await answerGrammar(ctx, started.exerciseId, [0, 1, 2]);
    expect(result).toEqual({ correct: 3, total: 3, grade: 'good' });
    const item = await ctx.db.items.get(`grammar:${grammar[0].id}`);
    expect(item!.due).toBeGreaterThan(T0);
  });

  it('returns "invalid" and creates nothing when generation fails twice', async () => {
    const { ai } = fakeAi(() => ({ ...SET, questions: [] }));
    const ctx = ctxAt({ now: T0 }, ai);
    expect(await startGrammar(ctx, grammar[0].id)).toEqual({ ok: false, error: 'invalid' });
    expect(await ctx.db.items.count()).toBe(0);
  });

  it('discarding an answered exercise restores the previous SRS state', async () => {
    const { ai } = fakeAi(() => SET);
    const ctx = ctxAt({ now: T0 }, ai);
    const started = await startGrammar(ctx, grammar[0].id);
    if (!started.ok) throw new Error('expected ok');
    const before = (await ctx.db.items.get(`grammar:${grammar[0].id}`))!.srs;
    await answerGrammar(ctx, started.exerciseId, [3, 3, 3]);
    await discardExercise(ctx, started.exerciseId);
    expect((await ctx.db.items.get(`grammar:${grammar[0].id}`))!.srs).toEqual(before);
    expect((await ctx.db.exercises.get(started.exerciseId))!.discarded).toBe(true);
  });
});

describe('days and streak', () => {
  it('marks today done and counts the streak across local days', async () => {
    const t = { now: T0 - DAY };
    const ctx = ctxAt(t);
    await markMinimumDone(ctx);
    t.now = T0;
    expect(await isMinimumDoneToday(ctx)).toBe(false);
    expect(await getStreak(ctx)).toBe(1);
    await markMinimumDone(ctx);
    expect(await getStreak(ctx)).toBe(2);
  });

  it('a session started at 23:50 and finished at 00:10 counts for the day it started', async () => {
    const t = { now: new Date(2026, 9, 7, 23, 50).getTime() };
    const ctx = ctxAt(t);
    const startedOn = sessionDate(ctx);
    t.now = new Date(2026, 9, 8, 0, 10).getTime();
    await markMinimumDone(ctx, startedOn);
    expect(await ctx.db.days.get('2026-10-07')).toEqual({ date: '2026-10-07', minimumDone: true });
    expect(await isMinimumDoneToday(ctx)).toBe(false);
  });

  it('a "continue" request becomes the minimum session when today is not done yet', async () => {
    const ctx = ctxAt({ now: T0 });
    expect(await resolveMode(ctx, 'continue')).toBe('minimum');
    await markMinimumDone(ctx);
    expect(await resolveMode(ctx, 'continue')).toBe('continue');
  });
});
