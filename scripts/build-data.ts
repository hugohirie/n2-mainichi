import { writeFileSync } from 'node:fs';
import { buildVocab, collectKanji, parseCsv, rowsToWords } from './lib/vocab';
import type { KanjiMap } from '../src/data/types';

const RAW = { Accept: 'application/vnd.github.raw' };
const vocabUrl = (lvl: string) => `https://api.github.com/repos/jamsinclair/open-anki-jlpt-decks/contents/src/${lvl}.csv`;
const KANJI_URL = 'https://api.github.com/repos/davidluzgouveia/kanji-data/contents/kanji.json';

interface KanjiDataEntry {
  freq: number | null;
  meanings: string[];
  readings_on: string[];
  readings_kun: string[];
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: RAW });
  if (!res.ok) throw new Error(`${res.status} ao baixar ${url}`);
  return res.text();
}

async function main() {
  const [n3csv, n2csv, kanjiText] = await Promise.all([get(vocabUrl('n3')), get(vocabUrl('n2')), get(KANJI_URL)]);
  const kanjiData = JSON.parse(kanjiText) as Record<string, KanjiDataEntry>;
  const freq = Object.fromEntries(Object.entries(kanjiData).map(([k, v]) => [k, v.freq]));
  const vocab = buildVocab(rowsToWords(parseCsv(n3csv)), rowsToWords(parseCsv(n2csv)), freq);
  const kanji: KanjiMap = {};
  for (const ch of collectKanji(vocab)) {
    const k = kanjiData[ch];
    if (k) kanji[ch] = { meanings: k.meanings, on: k.readings_on, kun: k.readings_kun };
  }
  writeFileSync('src/data/vocab.json', JSON.stringify(vocab));
  writeFileSync('src/data/kanji.json', JSON.stringify(kanji));
  const n3 = vocab.filter((v) => v.level === 'N3').length;
  console.log(`vocab: ${vocab.length} (N3 ${n3}, N2 ${vocab.length - n3}); kanji: ${Object.keys(kanji).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
