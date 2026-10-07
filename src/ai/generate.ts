import type { GrammarPoint, VocabEntry } from '../data/types';
import type { Llm, LlmCall, LlmResult } from './client';
import { AiError, classifyError } from './errors';
import { grammarPrompt, readingPrompt, wordDetailsPrompt } from './prompts';
import {
  GrammarSetSchema,
  ReadingSchema,
  WordDetailsBatchSchema,
  type GrammarSet,
  type Reading,
  type ReadingLength,
} from './schemas';
import { validateGrammarSet, validateReading } from './validate';

export interface AiDeps {
  llm: Llm;
  wordModel: string;
  examModel: string;
  onUsage(model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface WordDetails {
  definitionJa: string;
  example: string;
}

const MAX_ATTEMPTS = 2;

async function callValidated<T>(deps: AiDeps, call: LlmCall<T>, validate: (data: T) => string[]): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: LlmResult<T>;
    try {
      res = await deps.llm(call);
    } catch (e) {
      throw new AiError(classifyError(e), e instanceof Error ? e.message : String(e));
    }
    await deps.onUsage(call.model, res.inputTokens, res.outputTokens);
    if (res.data !== null && validate(res.data).length === 0) return res.data;
  }
  return null;
}

export async function generateWordDetails(deps: AiDeps, words: VocabEntry[]): Promise<Map<string, WordDetails>> {
  const wanted = new Set(words.map((w) => w.id));
  const { system, user } = wordDetailsPrompt(words);
  const data = await callValidated(
    deps,
    { model: deps.wordModel, system, user, schema: WordDetailsBatchSchema, effort: 'low', maxTokens: 8000 },
    (d) => (d.words.some((w) => wanted.has(w.id)) ? [] : ['nenhuma palavra pedida veio na resposta']),
  );
  const out = new Map<string, WordDetails>();
  for (const w of data?.words ?? []) {
    const definitionJa = w.definitionJa.trim();
    const example = w.example.trim();
    if (wanted.has(w.id) && definitionJa && example) out.set(w.id, { definitionJa, example });
  }
  return out;
}

export async function generateGrammarSet(deps: AiDeps, point: GrammarPoint): Promise<GrammarSet | null> {
  const { system, user } = grammarPrompt(point);
  return callValidated(
    deps,
    { model: deps.examModel, system, user, schema: GrammarSetSchema, effort: 'medium', maxTokens: 16000 },
    validateGrammarSet,
  );
}

export async function generateReading(deps: AiDeps, length: ReadingLength, targetWords: string[]): Promise<Reading | null> {
  const { system, user } = readingPrompt(length, targetWords);
  return callValidated(
    deps,
    { model: deps.examModel, system, user, schema: ReadingSchema, effort: 'medium', maxTokens: 16000 },
    (r) => validateReading(r, length),
  );
}
