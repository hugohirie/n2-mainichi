import type { N2DB } from './db';

const TABLES = ['items', 'wordDetails', 'exercises', 'days', 'settings', 'usage'] as const;
type TableName = (typeof TABLES)[number];

export interface Backup {
  app: 'n2-study';
  version: 1;
  exportedAt: number;
  tables: Record<TableName, unknown[]>;
}

export class BackupError extends Error {}

export async function exportBackup(db: N2DB, now: number): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of TABLES) tables[name] = await db.table(name).toArray();
  tables.settings = (tables.settings as { key: string }[]).filter((r) => r.key !== 'apiKey');
  return { app: 'n2-study', version: 1, exportedAt: now, tables };
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('O arquivo não é um JSON válido.');
  }
  const b = data as Partial<Backup> | null;
  if (!b || b.app !== 'n2-study') throw new BackupError('Este arquivo não é um backup deste app.');
  if (b.version !== 1) throw new BackupError(`Versão de backup não suportada: ${String(b.version)}`);
  for (const name of TABLES) {
    if (!Array.isArray(b.tables?.[name])) throw new BackupError(`Backup incompleto: falta a tabela ${name}.`);
  }
  return b as Backup;
}

export async function importBackup(db: N2DB, backup: Backup): Promise<void> {
  await db.transaction('rw', TABLES.map((n) => db.table(n)), async () => {
    const apiKey = await db.settings.get('apiKey');
    for (const name of TABLES) {
      await db.table(name).clear();
      await db.table(name).bulkPut(backup.tables[name]);
    }
    if (apiKey) await db.settings.put(apiKey);
  });
}
