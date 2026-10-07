import { describe, it, expect } from 'vitest';
import { grammar, grammarById, kanjiInfo, vocab, vocabById } from './index';

describe('grammar list', () => {
  it('has well-formed, unique entries', () => {
    const ids = new Set<string>();
    for (const g of grammar) {
      expect(g.id).toMatch(/^(n3|n2)-\d{3}$/);
      expect(g.id.slice(0, 2).toUpperCase()).toBe(g.level);
      expect(g.pattern.trim()).not.toBe('');
      expect(g.meaning.trim()).not.toBe('');
      expect(ids.has(g.id)).toBe(false);
      ids.add(g.id);
    }
    for (const level of ['N3', 'N2'] as const) {
      const patterns = grammar.filter((g) => g.level === level).map((g) => g.pattern);
      expect(new Set(patterns).size).toBe(patterns.length);
    }
  });

  it('covers enough points per level', () => {
    expect(grammar.filter((g) => g.level === 'N3').length).toBeGreaterThanOrEqual(80);
    expect(grammar.filter((g) => g.level === 'N2').length).toBeGreaterThanOrEqual(150);
    expect(grammarById.get('n2-001')?.level).toBe('N2');
  });
});

describe('vocab and kanji', () => {
  it('loads both levels with unique ids', () => {
    expect(vocab.filter((v) => v.level === 'N3').length).toBeGreaterThan(1500);
    expect(vocab.filter((v) => v.level === 'N2').length).toBeGreaterThan(1500);
    expect(vocabById.size).toBe(vocab.length);
  });

  it('looks up kanji readings', () => {
    expect(kanjiInfo('日')?.on).toContain('にち');
    expect(kanjiInfo('a')).toBeUndefined();
  });
});
