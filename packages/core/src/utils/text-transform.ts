/** PT-009: cycle none → capitalize → uppercase → lowercase → none */
export type TextTransformMode = 'none' | 'capitalize' | 'uppercase' | 'lowercase';

const CYCLE: TextTransformMode[] = ['none', 'capitalize', 'uppercase', 'lowercase'];

export function nextTextTransform(current: TextTransformMode | undefined): TextTransformMode {
  const idx = CYCLE.indexOf(current ?? 'none');
  return CYCLE[(idx + 1) % CYCLE.length]!;
}

export function applyTextTransform(text: string, mode: TextTransformMode | undefined): string {
  if (!mode || mode === 'none') return text;
  if (mode === 'uppercase') return text.toUpperCase();
  if (mode === 'lowercase') return text.toLowerCase();
  // sentence / capitalize: first letter of string upper, rest lower
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
