import { z } from 'zod';

export const WordDetailsBatchSchema = z.object({
  words: z.array(z.object({ id: z.string(), definitionJa: z.string(), example: z.string() })),
});
export type WordDetailsBatch = z.infer<typeof WordDetailsBatchSchema>;

export const GrammarQuestionSchema = z.object({
  type: z.enum(['form', 'order']),
  stem: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanationsJa: z.array(z.string()),
  translationPt: z.string(),
});
export type GrammarQuestion = z.infer<typeof GrammarQuestionSchema>;

export const GrammarSetSchema = z.object({
  explanationJa: z.string(),
  explanationPt: z.string(),
  questions: z.array(GrammarQuestionSchema),
});
export type GrammarSet = z.infer<typeof GrammarSetSchema>;

export const ReadingQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanationsJa: z.array(z.string()),
});
export type ReadingQuestion = z.infer<typeof ReadingQuestionSchema>;

export const ReadingSchema = z.object({
  title: z.string(),
  passage: z.string(),
  questions: z.array(ReadingQuestionSchema),
  glossary: z.array(z.object({ word: z.string(), reading: z.string(), meaningJa: z.string() })),
});
export type Reading = z.infer<typeof ReadingSchema>;

export type ReadingLength = 'short' | 'medium';
