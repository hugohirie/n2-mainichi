import type { N2DB } from './db';

export const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5'] as const;
export type ModelId = (typeof MODELS)[number];

export interface Settings {
  apiKey: string;
  wordModel: ModelId;
  examModel: ModelId;
  newWordsPerDay: number;
  newGrammarPerDay: number;
  triagePerSession: number;
  lastBackupAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  wordModel: 'claude-sonnet-5-5',
  examModel: 'claude-opus-5-5',
  newWordsPerDay: 10,
  newGrammarPerDay: 1,
  triagePerSession: 30,
  lastBackupAt: null,
};

export async function getSettings(db: N2DB): Promise<Settings> {
  const rows = await db.settings.toArray();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSettings(db: N2DB, patch: Partial<Settings>): Promise<void> {
  const clean = { ...patch };
  if (clean.apiKey !== undefined) clean.apiKey = clean.apiKey.trim();
  await db.settings.bulkPut(Object.entries(clean).map(([key, value]) => ({ key, value })));
}
