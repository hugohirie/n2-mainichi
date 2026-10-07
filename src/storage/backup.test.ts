import { describe, it, expect } from 'vitest';
import { testDb } from '../test-utils';
import { newState } from '../srs/srs';
import { saveSettings, getSettings } from './settings';
import { BackupError, exportBackup, importBackup, parseBackup } from './backup';
import type { N2DB } from './db';

const NOW = new Date(2026, 9, 7, 9).getTime();

async function seed(db: N2DB) {
  const srs = newState(NOW);
  await db.items.put({ id: 'word:影響|えいきょう', kind: 'word', refId: '影響|えいきょう', level: 'N2', origin: 'new', srs, due: srs.due, introducedAt: NOW, discarded: false });
  await db.wordDetails.put({ wordId: '影響|えいきょう', definitionJa: 'ほかのものに変化をあたえること', example: '{台風|たいふう}の影響', createdAt: NOW });
  await db.days.put({ date: '2026-10-07', minimumDone: true });
  await saveSettings(db, { apiKey: 'sk-secret', newWordsPerDay: 12 });
}

describe('backup', () => {
  it('round-trips all tables through JSON text', async () => {
    const a = testDb();
    await seed(a);
    const text = JSON.stringify(await exportBackup(a, NOW));
    const b = testDb();
    await importBackup(b, parseBackup(text));
    expect(await b.items.toArray()).toEqual(await a.items.toArray());
    expect(await b.wordDetails.toArray()).toEqual(await a.wordDetails.toArray());
    expect(await b.days.toArray()).toEqual(await a.days.toArray());
    expect((await getSettings(b)).newWordsPerDay).toBe(12);
  });

  it('never writes the API key into the backup and keeps the current key on import', async () => {
    const a = testDb();
    await seed(a);
    const text = JSON.stringify(await exportBackup(a, NOW));
    expect(text).not.toContain('sk-secret');
    const b = testDb();
    await saveSettings(b, { apiKey: 'sk-other-device' });
    await importBackup(b, parseBackup(text));
    expect((await getSettings(b)).apiKey).toBe('sk-other-device');
  });

  it('rejects files that are not a backup, without touching current data', async () => {
    const db = testDb();
    await seed(db);
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other"}')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"n2-study","version":1,"tables":{"items":[]}}')).toThrow(/wordDetails/);
    expect(await db.items.count()).toBe(1);
  });
});
