import type { Grade } from '../srs/srs';

export function gradeFromResults(correct: number, total: number): Grade {
  if (correct >= total) return 'good';
  if (total >= 2 && total - correct === 1) return 'hard';
  return 'again';
}
