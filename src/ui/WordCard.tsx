import { useEffect, useState } from 'react';
import { HAN_CHAR, kanjiInfo } from '../data';
import type { Grade } from '../srs/srs';
import { answerReview, getWordView, introduceWord, type Ctx, type WordView } from '../session/service';
import { Ruby } from './Ruby';

interface Props {
  ctx: Ctx;
  vocabId: string;
  introduce: boolean;
  onDone: () => void;
}

const GRADES: { grade: Grade; ja: string; pt: string }[] = [
  { grade: 'again', ja: 'もう一度', pt: 'Errei' },
  { grade: 'hard', ja: '難しい', pt: 'Difícil' },
  { grade: 'good', ja: '良い', pt: 'Bom' },
  { grade: 'easy', ja: '簡単', pt: 'Fácil' },
];

export function WordCard({ ctx, vocabId, introduce, onDone }: Props) {
  const [view, setView] = useState<WordView | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showGloss, setShowGloss] = useState(false);
  const [kanji, setKanji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (introduce) await introduceWord(ctx, vocabId, 'new');
      setView(await getWordView(ctx, vocabId));
    })();
  }, [ctx, vocabId, introduce]);

  if (!view) return <div className="card">読み込み中…</div>;
  const { entry, details } = view;
  const info = kanji ? kanjiInfo(kanji) : undefined;

  const grade = async (g: Grade) => {
    if (busy) return;
    setBusy(true);
    await answerReview(ctx, `word:${vocabId}`, g);
    onDone();
  };

  return (
    <div className="card">
      {introduce && <p className="muted">Palavra nova</p>}
      <p className="big">
        {revealed
          ? [...entry.expression].map((ch, i) =>
              HAN_CHAR.test(ch) ? (
                <button key={i} className="kanji-btn" onClick={() => setKanji(ch === kanji ? null : ch)}>
                  {ch}
                </button>
              ) : (
                <span key={i}>{ch}</span>
              ),
            )
          : entry.expression}
      </p>
      {!revealed ? (
        <button className="primary" onClick={() => setRevealed(true)}>Mostrar resposta</button>
      ) : (
        <>
          <p className="reading">{entry.reading}</p>
          {info && (
            <div className="popover">
              <p>
                <b>{kanji}</b> — {info.meanings.join(', ')}
              </p>
              <p className="muted">音: {info.on.join('、') || '—'}　訓: {info.kun.join('、') || '—'}</p>
            </div>
          )}
          {details ? (
            <>
              <p><Ruby text={details.definitionJa} /></p>
              <p className="muted"><Ruby text={details.example} /></p>
            </>
          ) : (
            <p className="muted">(sem definição em japonês ainda)</p>
          )}
          {showGloss || !details ? <p className="muted">EN: {entry.meaning}</p> : <button className="link" onClick={() => setShowGloss(true)}>Ver em inglês</button>}
          <div className="grid4">
            {GRADES.map((g) => (
              <button key={g.grade} disabled={busy} onClick={() => grade(g.grade)}>
                {g.ja}
                <br />
                <span className="muted">{g.pt}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
