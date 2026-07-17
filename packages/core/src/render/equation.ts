/** EQ-001: equation rendering helpers (KaTeX integration point for web) */

export function equationToDisplayText(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\^(\w)/g, '^$1')
    .replace(/_\{([^}]+)\}/g, '_$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .trim();
}

export function equationExtraHeight(latex: string): number {
  if (!latex) return 0;
  const hasFraction = latex.includes('\\frac');
  const hasSum = latex.includes('\\sum');
  if (hasSum) return 28;
  if (hasFraction) return 20;
  return 16;
}

export function wrapEquationForSvg(latex: string, x: number, y: number): string {
  const text = equationToDisplayText(latex);
  return `<text x="${x}" y="${y}" font-family="serif" font-size="14" fill="#333">${escapeXml(text)}</text>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
