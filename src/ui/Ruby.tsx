import { parseRuby } from '../lib/ruby';

export function Ruby({ text }: { text: string }) {
  return (
    <>
      {parseRuby(text).map((s, i) =>
        s.ruby ? (
          <ruby key={i}>
            {s.text}
            <rt>{s.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
