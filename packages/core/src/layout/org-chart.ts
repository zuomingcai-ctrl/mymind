// covers: ST-004
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import {
  collectHidden,
  finalizeResult,
  layoutTreeVertical,
  layoutSubtreeWidth,
  V_GAP,
} from './utils.js';

export function layoutOrgChart(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const compact = options.type === 'org-chart' ? options.compact : false;
  const vGap = compact ? V_GAP / 2 : V_GAP;
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx = { nodes, edges, measure, hiddenIds, vGap };

  const rootSize = measure(root, 0);
  const totalWidth = layoutSubtreeWidth(root, 0, ctx);
  layoutTreeVertical(root, 0, totalWidth / 2 - rootSize.width / 2, 0, ctx);

  return finalizeResult(nodes, edges);
}
