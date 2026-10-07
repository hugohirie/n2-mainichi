export type Level = 'N3' | 'N2';

export interface VocabEntry {
  id: string;
  level: Level;
  expression: string;
  reading: string;
  meaning: string;
  rank: number;
}

export interface KanjiEntry {
  meanings: string[];
  on: string[];
  kun: string[];
}

export type KanjiMap = Record<string, KanjiEntry>;

export interface GrammarPoint {
  id: string;
  level: Level;
  pattern: string;
  meaning: string;
}
