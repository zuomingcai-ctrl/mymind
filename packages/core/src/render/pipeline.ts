import type { LayoutResult, RenderFrame, Sheet, Topic } from '../model/types.js';
import { collectVisibleTopics } from '../model/factory.js';

export function buildFrame(
  sheet: Sheet,
  layout: LayoutResult,
  backgroundColor = '#ffffff',
): RenderFrame {
  const visibleTopics = collectVisibleTopics(sheet.rootTopic);
  const topicMap = new Map<string, Topic>();
  for (const t of visibleTopics) {
    topicMap.set(t.id, t);
  }
  // Summary / free topics live outside the tree but still render (incl. descendants).
  for (const floating of sheet.floatingTopics) {
    for (const t of collectVisibleTopics(floating)) {
      topicMap.set(t.id, t);
    }
  }

  const visibleNodes = [...layout.nodes.values()].filter(
    (n) => !n.hidden && topicMap.has(n.id),
  );

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = layout.edges.filter(
    (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to),
  );

  return {
    layers: [
      { type: 'background', color: backgroundColor },
      { type: 'extra-shapes', shapes: layout.extraShapes },
      { type: 'edges', edges: visibleEdges },
      { type: 'topics', nodes: visibleNodes, topics: topicMap },
    ],
    bounds: layout.bounds,
  };
}
