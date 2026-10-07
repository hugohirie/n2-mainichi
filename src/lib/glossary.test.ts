import { describe, it, expect } from 'vitest';
import { splitByGlossary } from './glossary';

describe('splitByGlossary', () => {
  it('marks every occurrence and prefers the longest word', () => {
    expect(splitByGlossary('経済と経済学', ['経済', '経済学'])).toEqual([
      { text: '経済', entry: 0 },
      { text: 'と' },
      { text: '経済学', entry: 1 },
    ]);
  });

  it('returns the passage as-is when nothing matches', () => {
    expect(splitByGlossary('こんにちは', ['経済'])).toEqual([{ text: 'こんにちは' }]);
  });
});
