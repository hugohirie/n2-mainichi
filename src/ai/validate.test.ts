import { describe, it, expect } from 'vitest';
import { validateGrammarSet, validateReading } from './validate';
import type { GrammarSet, Reading } from './schemas';

const form = {
  type: 'form' as const,
  stem: '雨が降っている（　　）、試合は行われた。',
  options: ['にもかかわらず', 'からには', 'うえで', 'ものの'],
  answerIndex: 0,
  explanationsJa: ['正しい', 'ちがう', 'ちがう', 'ちがう'],
  translationPt: 'Apesar da chuva, o jogo aconteceu.',
};
const order = {
  type: 'order' as const,
  stem: '彼は ＿＿ ＿＿ ★ ＿＿ 来なかった。',
  options: ['約束', 'に', 'した', 'もかかわらず'],
  answerIndex: 1,
  explanationsJa: ['a', 'b', 'c', 'd'],
  translationPt: '...',
};
const validSet: GrammarSet = { explanationJa: '〜のに と似ている', explanationPt: 'apesar de', questions: [form, form, order] };

describe('validateGrammarSet', () => {
  it('accepts a well-formed set', () => {
    expect(validateGrammarSet(validSet)).toEqual([]);
  });

  it('rejects wrong option count, out-of-range answer and missing explanations', () => {
    const bad = { ...validSet, questions: [{ ...form, options: ['a', 'b', 'c'], answerIndex: 5, explanationsJa: ['x'] }, form] };
    const errs = validateGrammarSet(bad);
    expect(errs.join('\n')).toMatch(/4 alternativas/);
    expect(errs.join('\n')).toMatch(/answerIndex/);
    expect(errs.join('\n')).toMatch(/explicação/);
  });

  it('rejects duplicated options (two right answers risk)', () => {
    const bad = { ...validSet, questions: [{ ...form, options: ['に', 'に', 'で', 'を'] }, form] };
    expect(validateGrammarSet(bad).join()).toMatch(/repetidas/);
  });

  it('requires exactly one ★ in ordering questions and a blank in form questions', () => {
    const bad = { ...validSet, questions: [{ ...order, stem: '彼は ＿＿ ＿＿ ＿＿ ＿＿' }, { ...form, stem: '雨が降っている、試合は行われた。' }] };
    const errs = validateGrammarSet(bad).join('\n');
    expect(errs).toMatch(/★/);
    expect(errs).toMatch(/lacuna/);
  });

  it('requires 2 to 3 questions', () => {
    expect(validateGrammarSet({ ...validSet, questions: [form] }).join()).toMatch(/2 a 3/);
  });
});

describe('validateReading', () => {
  const q = { question: '筆者の言いたいことは何か。', options: ['a', 'b', 'c', 'd'], answerIndex: 2, explanationsJa: ['1', '2', '3', '4'] };
  const short: Reading = { title: 't', passage: 'あ'.repeat(200), questions: [q], glossary: [] };

  it('accepts a short text with one question', () => {
    expect(validateReading(short, 'short')).toEqual([]);
  });

  it('requires 3 questions for a medium text and a plausible length', () => {
    expect(validateReading({ ...short, passage: 'あ'.repeat(500) }, 'medium').join()).toMatch(/3 perguntas/);
    expect(validateReading({ ...short, passage: 'あ'.repeat(20) }, 'short').join()).toMatch(/tamanho/);
  });
});
