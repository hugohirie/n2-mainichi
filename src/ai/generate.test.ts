import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import type { Llm, LlmCall, LlmResult } from './client';
import { AiError } from './errors';
import { generateGrammarSet, generateReading, generateWordDetails, type AiDeps } from './generate';
import type { GrammarSet } from './schemas';
import type { VocabEntry } from '../data/types';

function fakeDeps(responses: unknown[]) {
  const calls: LlmCall<unknown>[] = [];
  const usage: [string, number, number][] = [];
  const llm: Llm = async <T>(call: LlmCall<T>): Promise<LlmResult<T>> => {
    calls.push(call as LlmCall<unknown>);
    const r = responses.shift();
    if (r instanceof Error || (r && typeof r === 'object' && 'status' in r)) throw r;
    return { data: (r ?? null) as T | null, inputTokens: 100, outputTokens: 200 };
  };
  const deps: AiDeps = {
    llm,
    wordModel: 'claude-sonnet-5-5',
    examModel: 'claude-opus-5-5',
    onUsage: async (m, i, o) => {
      usage.push([m, i, o]);
    },
  };
  return { deps, calls, usage };
}

const q = (type: 'form' | 'order') => ({
  type,
  stem: type === 'form' ? '雨（　　）行く。' : 'A ＿＿ ＿＿ ★ ＿＿ B',
  options: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
  explanationsJa: ['1', '2', '3', '4'],
  translationPt: 'x',
});
const goodSet: GrammarSet = { explanationJa: '説明', explanationPt: 'explicação', questions: [q('form'), q('form'), q('order')] };
const badSet: GrammarSet = { ...goodSet, questions: [q('form')] };
const point = { id: 'n2-001', level: 'N2' as const, pattern: '〜にもかかわらず', meaning: 'apesar de' };

describe('generateGrammarSet', () => {
  it('returns a valid set on the first try using the exam model', async () => {
    const { deps, calls, usage } = fakeDeps([goodSet]);
    expect(await generateGrammarSet(deps, point)).toEqual(goodSet);
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe('claude-opus-5-5');
    expect(usage).toEqual([['claude-opus-5-5', 100, 200]]);
  });

  it('retries once when the first answer is invalid or refused', async () => {
    expect(await generateGrammarSet(fakeDeps([badSet, goodSet]).deps, point)).toEqual(goodSet);
    expect(await generateGrammarSet(fakeDeps([null, goodSet]).deps, point)).toEqual(goodSet);
  });

  it('gives up with null after two invalid answers, recording usage for both', async () => {
    const { deps, calls, usage } = fakeDeps([badSet, badSet]);
    expect(await generateGrammarSet(deps, point)).toBeNull();
    expect(calls).toHaveLength(2);
    expect(usage).toHaveLength(2);
  });

  it('treats an SDK structured-output parse failure as invalid output and retries', async () => {
    const parseFailure = new Anthropic.AnthropicError('Failed to parse structured output');
    const { deps, calls } = fakeDeps([parseFailure, goodSet]);
    expect(await generateGrammarSet(deps, point)).toEqual(goodSet);
    expect(calls).toHaveLength(2);
  });

  it('throws a classified AiError when the API fails', async () => {
    const { deps } = fakeDeps([{ status: 401 }]);
    await expect(generateGrammarSet(deps, point)).rejects.toMatchObject({ kind: 'auth' });
    await expect(generateGrammarSet(fakeDeps([{ status: 429 }]).deps, point)).rejects.toBeInstanceOf(AiError);
  });
});

describe('generateWordDetails', () => {
  const w = (expression: string): VocabEntry => ({ id: `${expression}|x`, level: 'N2', expression, reading: 'x', meaning: 'm', rank: 0 });

  it('keeps only requested, non-empty words and uses the word model', async () => {
    const { deps, calls } = fakeDeps([
      {
        words: [
          { id: '影響|x', definitionJa: ' 定義 ', example: '例文' },
          { id: '経済|x', definitionJa: '', example: '例文' },
          { id: '関係ない|x', definitionJa: '定義', example: '例文' },
        ],
      },
    ]);
    const map = await generateWordDetails(deps, [w('影響'), w('経済'), w('政治')]);
    expect([...map.keys()]).toEqual(['影響|x']);
    expect(map.get('影響|x')).toEqual({ definitionJa: '定義', example: '例文' });
    expect(calls[0].model).toBe('claude-sonnet-5-5');
  });

  it('retries when none of the requested words came back', async () => {
    const { deps, calls } = fakeDeps([{ words: [] }, { words: [{ id: '影響|x', definitionJa: '定義', example: '例文' }] }]);
    expect((await generateWordDetails(deps, [w('影響')])).size).toBe(1);
    expect(calls).toHaveLength(2);
  });
});

describe('generateReading', () => {
  it('validates against the requested length', async () => {
    const reading = {
      title: 't',
      passage: 'あ'.repeat(200),
      questions: [{ question: '問', options: ['a', 'b', 'c', 'd'], answerIndex: 1, explanationsJa: ['1', '2', '3', '4'] }],
      glossary: [],
    };
    expect(await generateReading(fakeDeps([reading]).deps, 'short', [])).toEqual(reading);
    expect(await generateReading(fakeDeps([reading, reading]).deps, 'medium', [])).toBeNull();
  });
});
