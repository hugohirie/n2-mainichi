import type { Level, VocabEntry } from '../../src/data/types';

export interface RawWord {
  expression: string;
  reading: string;
  meaning: string;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function rowsToWords(rows: string[][]): RawWord[] {
  const [header, ...body] = rows;
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`coluna ausente no CSV: ${name}`);
    return i;
  };
  const e = col('expression');
  const r = col('reading');
  const m = col('meaning');
  return body
    .map((cells) => ({
      expression: (cells[e] ?? '').trim(),
      reading: (cells[r] ?? '').trim(),
      meaning: (cells[m] ?? '').trim(),
    }))
    .filter((w) => w.expression !== '');
}

const HAN = /\p{Script=Han}/gu;
const UNKNOWN_KANJI_FREQ = 3000;

/** Frequência do kanji mais raro da palavra (menor = mais comum). Palavras só em kana = 0. */
export function kanjiScore(expression: string, freq: Record<string, number | null>): number {
  const chars = expression.match(HAN) ?? [];
  return chars.reduce((max, ch) => Math.max(max, freq[ch] ?? UNKNOWN_KANJI_FREQ), 0);
}

export function buildVocab(n3: RawWord[], n2: RawWord[], freq: Record<string, number | null>): VocabEntry[] {
  const seen = new Set<string>();
  const out: VocabEntry[] = [];
  const levels: [Level, RawWord[]][] = [
    ['N3', n3],
    ['N2', n2],
  ];
  for (const [level, words] of levels) {
    const unique = words.filter((w) => {
      const id = `${w.expression}|${w.reading}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const scored = unique.map((w, i) => ({ w, i, score: kanjiScore(w.expression, freq) }));
    scored.sort((a, b) => a.score - b.score || a.i - b.i);
    scored.forEach(({ w }, rank) =>
      out.push({ id: `${w.expression}|${w.reading}`, level, expression: w.expression, reading: w.reading, meaning: w.meaning, rank }),
    );
  }
  return out;
}

export function collectKanji(vocab: VocabEntry[]): string[] {
  const set = new Set<string>();
  for (const v of vocab) for (const ch of v.expression.match(HAN) ?? []) set.add(ch);
  return [...set].sort();
}
