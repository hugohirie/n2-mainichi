import { describe, it, expect } from 'vitest';
import { buildVocab, collectKanji, kanjiScore, parseCsv, rowsToWords } from './vocab';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas, CRLF and BOM', () => {
    const csv = '\uFEFFexpression,reading,meaning\r\n影響,えいきょう,"influence, effect"\r\n"言う","いう","say ""hi"""\r\n';
    expect(parseCsv(csv)).toEqual([
      ['expression', 'reading', 'meaning'],
      ['影響', 'えいきょう', 'influence, effect'],
      ['言う', 'いう', 'say "hi"'],
    ]);
  });
});

describe('rowsToWords', () => {
  it('maps columns by header name and skips empty rows', () => {
    const rows = [['reading', 'expression', 'meaning', 'tags'], ['えいきょう', '影響', 'influence', 'JLPT'], ['', '', '', '']];
    expect(rowsToWords(rows)).toEqual([{ expression: '影響', reading: 'えいきょう', meaning: 'influence' }]);
  });

  it('throws when a column is missing', () => {
    expect(() => rowsToWords([['expression', 'reading']])).toThrow(/meaning/);
  });
});

describe('buildVocab', () => {
  const freq = { 日: 1, 本: 10, 影: 500, 響: 900 };

  it('scores words by their rarest kanji; kana-only words score 0', () => {
    expect(kanjiScore('影響', freq)).toBe(900);
    expect(kanjiScore('ちょっと', freq)).toBe(0);
    expect(kanjiScore('鬱', freq)).toBe(3000);
  });

  it('orders each level by score, drops N2 duplicates of N3 and builds ids', () => {
    const n3 = [
      { expression: '影響', reading: 'えいきょう', meaning: 'influence' },
      { expression: '日本', reading: 'にほん', meaning: 'Japan' },
    ];
    const n2 = [
      { expression: '日本', reading: 'にほん', meaning: 'Japan' },
      { expression: 'ちょっと', reading: 'ちょっと', meaning: 'a little' },
    ];
    const v = buildVocab(n3, n2, freq);
    expect(v.map((e) => [e.level, e.expression, e.rank])).toEqual([
      ['N3', '日本', 0],
      ['N3', '影響', 1],
      ['N2', 'ちょっと', 0],
    ]);
    expect(v[0].id).toBe('日本|にほん');
  });

  it('collects the distinct kanji used', () => {
    const v = buildVocab([{ expression: '日本', reading: 'にほん', meaning: '' }], [{ expression: '本日', reading: 'ほんじつ', meaning: '' }], freq);
    expect(collectKanji(v)).toEqual(['日', '本'].sort());
  });
});
