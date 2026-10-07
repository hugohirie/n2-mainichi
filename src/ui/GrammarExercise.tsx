import type { Ctx } from '../session/service';

export function GrammarExercise({ onDone }: { ctx: Ctx; grammarId: string; onDone: () => void }) {
  return (
    <div className="card">
      <p>Gramática em construção.</p>
      <button onClick={onDone}>Pular</button>
    </div>
  );
}
