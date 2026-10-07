import type { Ctx } from '../session/service';

export function ReadingExercise({ onDone }: { ctx: Ctx; onDone: () => void }) {
  return (
    <div className="card">
      <p>Leitura em construção.</p>
      <button onClick={onDone}>Pular</button>
    </div>
  );
}
