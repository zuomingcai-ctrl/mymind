import type { Theme, TopicStyle } from '../model/types.js';

export function generatePalette(seed: string): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors: string[] = [];
  for (let i = 0; i < 5; i++) {
    const h = Math.abs((hash + i * 67) % 360);
    colors.push(`hsl(${h}, 65%, 55%)`);
  }
  return colors;
}

export function generateThemeFromSeed(seed: string, name: string): Theme {
  const branchColors = generatePalette(seed);
  const main = branchColors[0]!;
  const baseStyle: TopicStyle = { shape: 'rounded', fillColor: '#ffffff', borderColor: main, fontSize: 14 };
  return {
    id: `generated-${seed}`,
    name,
    colors: {
      background: '#ffffff',
      centralTopic: { shape: 'rounded', fillColor: main, fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { ...baseStyle, fillColor: `${main}22` },
      subTopic: baseStyle,
      floatingTopic: { ...baseStyle, fillColor: '#FFF9E6' },
      branchColors,
    },
    edge: { lineType: 'curve', color: '#999', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  };
}
