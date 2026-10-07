import type { GrammarSet, Reading, ReadingLength } from './schemas';

interface Mcq {
  options: string[];
  answerIndex: number;
  explanationsJa: string[];
}

function checkMcq(q: Mcq, label: string): string[] {
  const errs: string[] = [];
  if (q.options.length !== 4) errs.push(`${label}: precisa de 4 alternativas`);
  if (q.options.some((o) => o.trim() === '')) errs.push(`${label}: alternativa vazia`);
  if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) errs.push(`${label}: alternativas repetidas`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.options.length) {
    errs.push(`${label}: answerIndex fora do intervalo`);
  }
  if (q.explanationsJa.length !== q.options.length) errs.push(`${label}: precisa de uma explicação por alternativa`);
  return errs;
}

export function validateGrammarSet(s: GrammarSet): string[] {
  const errs: string[] = [];
  if (s.questions.length < 2 || s.questions.length > 3) errs.push('precisa de 2 a 3 questões');
  if (!s.explanationJa.trim()) errs.push('explicação do ponto vazia');
  s.questions.forEach((q, i) => {
    const label = `questão ${i + 1}`;
    errs.push(...checkMcq(q, label));
    if (!q.stem.trim()) errs.push(`${label}: enunciado vazio`);
    if (q.type === 'order' && (q.stem.match(/★/g) ?? []).length !== 1) errs.push(`${label}: ordenação precisa de exatamente um ★`);
    if (q.type === 'form' && !/（\s*）|\(\s*\)/.test(q.stem)) errs.push(`${label}: lacuna （　） ausente`);
  });
  return errs;
}

const LENGTH_RULES: Record<ReadingLength, { min: number; max: number; questions: number }> = {
  short: { min: 120, max: 350, questions: 1 },
  medium: { min: 350, max: 800, questions: 3 },
};

export function validateReading(r: Reading, length: ReadingLength): string[] {
  const rule = LENGTH_RULES[length];
  const errs: string[] = [];
  const size = r.passage.trim().length;
  if (size < rule.min || size > rule.max) errs.push(`tamanho do texto fora do esperado (${size} caracteres)`);
  if (r.questions.length !== rule.questions) errs.push(`precisa de ${rule.questions} perguntas`);
  r.questions.forEach((q, i) => {
    errs.push(...checkMcq(q, `pergunta ${i + 1}`));
    if (!q.question.trim()) errs.push(`pergunta ${i + 1}: enunciado vazio`);
  });
  return errs;
}
