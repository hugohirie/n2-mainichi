import { describe, it, expect } from 'vitest';
import { gradeFromResults } from './grading';

describe('gradeFromResults', () => {
  it('all right → good; one wrong → hard; most wrong → again', () => {
    expect(gradeFromResults(3, 3)).toBe('good');
    expect(gradeFromResults(2, 3)).toBe('hard');
    expect(gradeFromResults(1, 3)).toBe('again');
    expect(gradeFromResults(0, 3)).toBe('again');
    expect(gradeFromResults(1, 2)).toBe('hard');
    expect(gradeFromResults(0, 1)).toBe('again');
  });
});
