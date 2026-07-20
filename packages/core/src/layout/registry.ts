import type {
  LayoutStrategy,
  MeasureFn,
  Sheet,
  StructureType,
} from '../model/types.js';
import { layoutMindmap, layoutLogicChart, layoutTreeChart } from './mindmap.js';
import { layoutOrgChart } from './org-chart.js';
import { layoutTimeline } from './timeline.js';
import { layoutFishbone } from './fishbone.js';
import { layoutMatrix } from './matrix.js';
import { layoutBraceMap } from './brace-map.js';
import { layoutTreeTable } from './tree-table.js';
import { layoutStructureElements } from './utils.js';
import { getTheme } from '../theme/custom.js';

export { layoutMindmap, layoutLogicChart, layoutTreeChart } from './mindmap.js';
export { layoutTimeline } from './timeline.js';
export { layoutFishbone } from './fishbone.js';
export { layoutMatrix } from './matrix.js';
export { layoutBraceMap } from './brace-map.js';
export { layoutTreeTable } from './tree-table.js';

export class LayoutRegistry {
  private strategies = new Map<StructureType, LayoutStrategy>();

  register(strategy: LayoutStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  get(type: StructureType): LayoutStrategy {
    const s = this.strategies.get(type);
    if (!s) throw new Error(`Unknown structure type: ${type}`);
    return s;
  }

  layout(sheet: Sheet, measure: MeasureFn) {
    let options = sheet.structureOptions;
    // Logic-chart edge geometry follows canvas theme line type (UI lives under 配色).
    if (options.type === 'logic-chart') {
      const lineType = getTheme(sheet.canvasSettings.themeId).edge.lineType;
      const lineStyle = lineType === 'polyline' ? 'polyline' : 'curve';
      options = { ...options, lineStyle };
    }
    const base = this.get(sheet.structure).layout(
      sheet.rootTopic,
      options,
      measure,
      { floatingTopics: sheet.floatingTopics, summaries: sheet.summaries },
    );
    return layoutStructureElements(sheet, base, measure);
  }
}

export function createDefaultLayoutRegistry(): LayoutRegistry {
  const registry = new LayoutRegistry();
  registry.register({ type: 'mindmap', layout: (r, o, m, e) => layoutMindmap(r, o, m, e) });
  registry.register({ type: 'logic-chart', layout: (r, o, m) => layoutLogicChart(r, o, m) });
  registry.register({ type: 'tree-chart', layout: (r, o, m) => layoutTreeChart(r, o, m) });
  registry.register({ type: 'org-chart', layout: (r, o, m) => layoutOrgChart(r, o, m) });
  registry.register({ type: 'timeline', layout: (r, o, m) => layoutTimeline(r, o, m) });
  registry.register({ type: 'fishbone', layout: (r, o, m) => layoutFishbone(r, o, m) });
  registry.register({ type: 'matrix', layout: (r, o, m) => layoutMatrix(r, o, m) });
  registry.register({ type: 'brace-map', layout: (r, o, m) => layoutBraceMap(r, o, m) });
  registry.register({ type: 'tree-table', layout: (r, o, m) => layoutTreeTable(r, o, m) });
  return registry;
}
