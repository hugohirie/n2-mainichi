import Dexie, { type Table } from 'dexie';
import type { SrsState } from '../srs/srs';
import type { Level } from '../data/types';
import type { GrammarSet, Reading } from '../ai/schemas';

export type ItemKind = 'word' | 'grammar';
export type ItemOrigin = 'new' | 'triage-known' | 'triage-unknown';

export interface ItemRow {
  id: string;
  kind: ItemKind;
  refId: string;
  level: Level;
  origin: ItemOrigin;
  srs: SrsState;
  due: number;
  introducedAt: number;
  discarded: boolean;
}

export interface WordDetailRow {
  wordId: string;
  definitionJa: string;
  example: string;
  createdAt: number;
}

export interface ExerciseRow {
  id?: number;
  kind: 'grammar' | 'reading';
  refId: string | null;
  content: GrammarSet | Reading;
  answers: number[] | null;
  correctCount: number | null;
  srsBefore: SrsState | null;
  createdAt: number;
  answeredAt: number | null;
  discarded: boolean;
}

export interface DayRow {
  date: string;
  minimumDone: boolean;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface UsageRow {
  id: string;
  month: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export class N2DB extends Dexie {
  items!: Table<ItemRow, string>;
  wordDetails!: Table<WordDetailRow, string>;
  exercises!: Table<ExerciseRow, number>;
  days!: Table<DayRow, string>;
  settings!: Table<SettingRow, string>;
  usage!: Table<UsageRow, string>;

  constructor(name = 'n2-study') {
    super(name);
    this.version(1).stores({
      items: 'id, kind, due',
      wordDetails: 'wordId',
      exercises: '++id, kind, refId, createdAt',
      days: 'date',
      settings: 'key',
      usage: 'id',
    });
  }
}

export const db = new N2DB();
