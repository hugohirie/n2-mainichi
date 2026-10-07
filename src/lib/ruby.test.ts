import { describe, it, expect } from 'vitest';
import { parseRuby } from './ruby';

describe('parseRuby', () => {
  it('splits {漢字|かな} into ruby segments', () => {
    expect(parseRuby('{台風|たいふう}の影響で{電車|でんしゃ}が止まった')).toEqual([
      { text: '台風', ruby: 'たいふう' },
      { text: 'の影響で' },
      { text: '電車', ruby: 'でんしゃ' },
      { text: 'が止まった' },
    ]);
  });

  it('returns plain text unchanged', () => {
    expect(parseRuby('ふつうの文')).toEqual([{ text: 'ふつうの文' }]);
  });
});
