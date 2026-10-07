import { describe, it, expect } from 'vitest';
import { grammarPrompt, readingPrompt, wordDetailsPrompt } from './prompts';

describe('prompts', () => {
  it('word prompt lists every requested id', () => {
    const p = wordDetailsPrompt([
      { id: '影響|えいきょう', level: 'N2', expression: '影響', reading: 'えいきょう', meaning: 'influence', rank: 0 },
      { id: '経済|けいざい', level: 'N2', expression: '経済', reading: 'けいざい', meaning: 'economy', rank: 1 },
    ]);
    expect(p.user).toContain('影響|えいきょう');
    expect(p.user).toContain('経済|けいざい');
    expect(p.system).toContain('{漢字|かな}');
  });

  it('grammar prompt names the pattern and the exam formats', () => {
    const p = grammarPrompt({ id: 'n2-001', level: 'N2', pattern: '〜にもかかわらず', meaning: 'apesar de' });
    expect(p.user).toContain('〜にもかかわらず');
    expect(p.system).toContain('★');
  });

  it('reading prompt sets size and target words', () => {
    const p = readingPrompt('short', ['影響', '経済']);
    expect(p.user).toContain('200');
    expect(p.user).toContain('影響、経済');
    expect(readingPrompt('medium', []).user).toContain('500');
  });
});
