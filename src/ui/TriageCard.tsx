import { useState } from 'react';
import { vocabById } from '../data';
import { answerTriage, type Ctx } from '../session/service';

interface Props {
  ctx: Ctx;
  vocabId: string;
  onDone: (known: boolean) => void;
}

export function TriageCard({ ctx, vocabId, onDone }: Props) {
  const entry = vocabById.get(vocabId)!;
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  const answer = async (known: boolean) => {
    if (busy) return;
    setBusy(true);
    await answerTriage(ctx, vocabId, known);
    onDone(known);
  };

  return (
    <div className="card">
      <p className="muted">Triagem N3 — você ainda sabe esta palavra?</p>
      <p className="big">{entry.expression}</p>
      {revealed ? (
        <>
          <p className="reading">{entry.reading}</p>
          <p className="muted">EN: {entry.meaning}</p>
        </>
      ) : (
        <button className="link" onClick={() => setRevealed(true)}>Conferir leitura e significado</button>
      )}
      <div className="row">
        <button disabled={busy} onClick={() => answer(false)}>Não sei</button>
        <button className="primary" disabled={busy} onClick={() => answer(true)}>Sei</button>
      </div>
    </div>
  );
}
