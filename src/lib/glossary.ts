export type GlossSegment = { text: string; entry?: number };

export function splitByGlossary(passage: string, words: string[]): GlossSegment[] {
  const ordered = words
    .map((w, i) => ({ w, i }))
    .filter((x) => x.w.length > 0)
    .sort((a, b) => b.w.length - a.w.length);
  const out: GlossSegment[] = [];
  let buf = '';
  let pos = 0;
  while (pos < passage.length) {
    const hit = ordered.find(({ w }) => passage.startsWith(w, pos));
    if (hit) {
      if (buf) out.push({ text: buf });
      buf = '';
      out.push({ text: hit.w, entry: hit.i });
      pos += hit.w.length;
    } else {
      buf += passage[pos];
      pos++;
    }
  }
  if (buf) out.push({ text: buf });
  return out;
}
