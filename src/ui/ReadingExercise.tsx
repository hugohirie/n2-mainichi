import { useCallback, useEffect, useState } from 'react';
import type { Reading } from '../ai/schemas';
import { splitByGlossary } from '../lib/glossary';
import { answerReading, discardExercise, startReading, type Ctx } from '../session/service';
import { errorText } from './errorText';

interface Props {
  ctx: Ctx;
  onDone: () => void;
}

type Phase =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'answering'; exerciseId: number; reading: Reading; answers: number[] }
  | { name: 'result'; exerciseId: number; reading: Reading; answers: number[]; correct: number };

export function ReadingExercise({ ctx, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [gloss, setGloss] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPhase({ name: 'loading' });
    const r = await startReading(ctx);
    setPhase(r.ok ? { name: 'answering', exerciseId: r.exerciseId, reading: r.content, answers: [] } : { name: 'error', message: errorText(r.error) });
  }, [ctx]);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase.name === 'loading') return <div className="card"><p>Gerando texto de leitura…</p></div>;
  if (phase.name === 'error')
    return (
      <div className="card">
        <p className="bad">{phase.message}</p>
        <div className="row">
          <button onClick={() => void load()}>Tentar de novo</button>
          <button onClick={onDone}>Pular</button>
        </div>
      </div>
    );

  const { reading, exerciseId } = phase;
  const words = reading.glossary.map((g) => g.word);
  const entry = gloss !== null ? reading.glossary[gloss] : null;

  const choose = async (option: number) => {
    if (phase.name !== 'answering' || busy) return;
    const answers = [...phase.answers, option];
    if (answers.length < reading.questions.length) {
      setPhase({ ...phase, answers });
      return;
    }
    setBusy(true);
    const { correct } = await answerReading(ctx, exerciseId, answers);
    setBusy(false);
    setPhase({ name: 'result', exerciseId, reading, answers, correct });
  };

  const report = async () => {
    await discardExercise(ctx, exerciseId);
    onDone();
  };

  return (
    <div className="card">
      <p className="muted">読解</p>
      <h2>{reading.title}</h2>
      <p className="passage">
        {splitByGlossary(reading.passage, words).map((s, i) =>
          s.entry !== undefined ? (
            <span key={i} className="gloss" onClick={() => setGloss(s.entry === gloss ? null : s.entry!)}>
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {entry && (
        <div className="popover">
          <p>
            <b>{entry.word}</b>（{entry.reading}）
          </p>
          <p className="muted">{entry.meaningJa}</p>
        </div>
      )}

      {phase.name === 'answering' ? (
        (() => {
          const i = phase.answers.length;
          const q = reading.questions[i];
          return (
            <>
              <p className="muted">Pergunta {i + 1}/{reading.questions.length}</p>
              <p>{q.question}</p>
              {q.options.map((o, k) => (
                <button key={k} className="option" disabled={busy} onClick={() => void choose(k)}>
                  {k + 1}. {o}
                </button>
              ))}
            </>
          );
        })()
      ) : (
        <>
          <p className={phase.correct === reading.questions.length ? 'ok' : 'bad'}>
            Acertou {phase.correct} de {reading.questions.length}
          </p>
          {reading.questions.map((q, i) => (
            <div key={i} className="popover">
              <p>{q.question}</p>
              {q.options.map((o, k) => (
                <div key={k}>
                  <p className={k === q.answerIndex ? 'ok' : k === phase.answers[i] ? 'bad' : 'muted'}>
                    {k === q.answerIndex ? '✓' : k === phase.answers[i] ? '✗' : '・'} {o}
                  </p>
                  <p className="muted">{q.explanationsJa[k]}</p>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
      <div className="row">
        <button onClick={() => void report()}>Questão com problema</button>
        {phase.name === 'result' && <button className="primary" onClick={onDone}>Próximo</button>}
      </div>
    </div>
  );
}
