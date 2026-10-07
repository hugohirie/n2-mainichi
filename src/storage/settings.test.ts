import { describe, it, expect } from 'vitest';
import { testDb } from '../test-utils';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './settings';

describe('settings', () => {
  it('returns defaults on a fresh database', async () => {
    expect(await getSettings(testDb())).toEqual(DEFAULT_SETTINGS);
  });

  it('defaults to Sonnet for words and Opus for exams', () => {
    expect(DEFAULT_SETTINGS.wordModel).toBe('claude-sonnet-5-5');
    expect(DEFAULT_SETTINGS.examModel).toBe('claude-opus-5-5');
    expect(DEFAULT_SETTINGS.newWordsPerDay).toBe(10);
  });

  it('merges saved values over defaults', async () => {
    const db = testDb();
    await saveSettings(db, { newWordsPerDay: 15 });
    const s = await getSettings(db);
    expect(s.newWordsPerDay).toBe(15);
    expect(s.newGrammarPerDay).toBe(1);
  });

  it('trims whitespace and newlines from a pasted API key', async () => {
    const db = testDb();
    await saveSettings(db, { apiKey: '  sk-ant-abc123\n' });
    expect((await getSettings(db)).apiKey).toBe('sk-ant-abc123');
  });
});
