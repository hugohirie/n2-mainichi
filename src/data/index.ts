import vocabJson from './vocab.json';
import kanjiJson from './kanji.json';
import grammarJson from './grammar.json';
import type { GrammarPoint, KanjiEntry, KanjiMap, VocabEntry } from './types';

export const vocab = vocabJson as VocabEntry[];
export const vocabById = new Map(vocab.map((v) => [v.id, v]));

export const grammar = grammarJson as GrammarPoint[];
export const grammarById = new Map(grammar.map((g) => [g.id, g]));

const kanji = kanjiJson as KanjiMap;

export function kanjiInfo(ch: string): KanjiEntry | undefined {
  return Object.hasOwn(kanji, ch) ? kanji[ch] : undefined;
}

export const HAN_CHAR = /\p{Script=Han}/u;
