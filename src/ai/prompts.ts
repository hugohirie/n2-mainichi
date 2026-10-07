import type { GrammarPoint, VocabEntry } from '../data/types';
import type { ReadingLength } from './schemas';

export interface Prompt {
  system: string;
  user: string;
}

const WORD_SYSTEM = `あなたは日本語教師です。JLPT N2を目指す学習者のために、与えられた各単語について次の2つを作ってください。
1. definitionJa: やさしい日本語での短い定義（40字以内、N3レベルまでの語彙で書く）。
2. example: その単語を使った自然な例文を1つ（30〜50字、N2レベル）。
例文の中のN2以上の難しい漢字語には {漢字|かな} の形でふりがなを付けてください（例: {台風|たいふう}）。対象の単語そのものにはふりがなを付けないでください。
入力の id をそのまま返し、入力のすべての単語について答えてください。`;

export function wordDetailsPrompt(words: VocabEntry[]): Prompt {
  const list = words.map((w) => ({ id: w.id, expression: w.expression, reading: w.reading, englishMeaning: w.meaning }));
  return { system: WORD_SYSTEM, user: `単語リスト:\n${JSON.stringify(list, null, 2)}` };
}

const GRAMMAR_SYSTEM = `あなたはJLPT N2の問題作成者です。指定された文法項目について、本試験と同じ形式の問題を3問作ってください（type "form" を2問、type "order" を1問）。
- type "form"（文法形式の判断）: 文中の（　　）に入る最もよいものを4つの選択肢から選ぶ問題。stem には（　　）を必ず含める。
- type "order"（文の組み立て）: stem に「＿＿ ＿＿ ★ ＿＿」のような4つの空欄を含め、options の4つを正しく並べたときに ★ に入るものを選ぶ問題。★ は stem にちょうど1つ。
条件:
- 正解はちょうど1つ。ほかの選択肢は紛らわしいが、はっきり誤りであること。同じ選択肢を2回使わない。
- 自然で、N2レベルの語彙を使った日本語にする。
- answerIndex は正解の選択肢の番号（0から始まる）。
- explanationsJa は選択肢と同じ順番で4つ。それぞれ、なぜ正しい／誤りかをやさしい日本語で説明する。
- translationPt は文（正解を入れたもの）のポルトガル語訳。
- explanationJa はこの文法項目の意味と使い方をやさしい日本語で（100字以内）。explanationPt はそのポルトガル語訳。`;

export function grammarPrompt(point: GrammarPoint): Prompt {
  return {
    system: GRAMMAR_SYSTEM,
    user: `文法項目: ${point.pattern}（レベル: ${point.level}、意味の目安: ${point.meaning}）`,
  };
}

const READING_SYSTEM = `あなたはJLPT N2の読解問題の作成者です。指定された長さの文章と、本試験と同じ形式の4択問題を作ってください。
- 文章はN2レベルの自然な日本語（説明文、エッセイ、お知らせ、メールなど）。ふりがなは付けない。
- 指定された単語があれば、できるだけ自然に文章に含める。
- 各問題の選択肢は4つ。正解はちょうど1つ。answerIndex は0から始まる番号。
- explanationsJa は選択肢と同じ順番で4つ。本文のどこを根拠に正しい／誤りかをやさしい日本語で説明する。
- glossary には本文中のN2以上の難しい語を最大10個、本文に出てくる形のまま（word）、読み（reading）、やさしい日本語の意味（meaningJa）で入れる。`;

const READING_SIZE: Record<ReadingLength, string> = {
  short: '短文（約200字）、問題は1問',
  medium: '中文（約500字）、問題は3問',
};

export function readingPrompt(length: ReadingLength, targetWords: string[]): Prompt {
  const words = targetWords.length > 0 ? `含めたい単語: ${targetWords.join('、')}` : '含めたい単語: なし';
  return { system: READING_SYSTEM, user: `長さ: ${READING_SIZE[length]}\n${words}` };
}
