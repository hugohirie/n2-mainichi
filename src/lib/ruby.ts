export type RubySegment = { text: string; ruby?: string };

const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;

export function parseRuby(input: string): RubySegment[] {
  const out: RubySegment[] = [];
  let last = 0;
  for (const m of input.matchAll(RUBY)) {
    if (m.index > last) out.push({ text: input.slice(last, m.index) });
    out.push({ text: m[1], ruby: m[2] });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}
