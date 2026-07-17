import type {
  ExtraShape,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { buildHorizontalCurvePoints, buildLogicPolylinePoints } from './edge-paths.js';
import { collectHidden, finalizeResult, LEVEL_GAP, V_GAP } from './utils.js';

const BRACE_WIDTH = 12;
const BRACE_GAP = 10;

interface LogicChartConfig {
  direction: 'left' | 'right';
  lineStyle: 'curve' | 'polyline';
  nodeDisplay: 'box' | 'underline' | 'mixed';
  groupLeaves: 'none' | 'brace';
  rootDisplay: 'box' | 'underline';
}

function readLogicConfig(options: StructureOptions): LogicChartConfig {
  if (options.type !== 'logic-chart') {
    return {
      direction: 'right',
      lineStyle: 'curve',
      nodeDisplay: 'box',
      groupLeaves: 'none',
      rootDisplay: 'box',
    };
  }
  return {
    direction: options.direction,
    lineStyle: options.lineStyle ?? 'curve',
    nodeDisplay: options.nodeDisplay ?? 'mixed',
    groupLeaves: options.groupLeaves ?? 'brace',
    rootDisplay: options.rootDisplay ?? 'box',
  };
}

function isLeafGroup(topic: Topic, hiddenIds: Set<string>): boolean {
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length < 2) return false;
  return children.every(
    (c) => c.collapsed || !c.children.some((gc) => !hiddenIds.has(gc.id)),
  );
}

function resolveDisplay(
  topic: Topic,
  depth: number,
  config: LogicChartConfig,
  hiddenIds: Set<string>,
): 'box' | 'underline' {
  if (depth === 0) return config.rootDisplay === 'underline' ? 'underline' : 'box';
  if (config.nodeDisplay === 'box') return 'box';
  if (config.nodeDisplay === 'underline') return 'underline';
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (topic.collapsed) return 'box';
  if (children.length === 0) return 'underline';
  const hasNested = children.some(
    (c) => !c.collapsed && c.children.some((gc) => !hiddenIds.has(gc.id)),
  );
  return hasNested ? 'box' : 'underline';
}

function measureLogicNode(
  topic: Topic,
  depth: number,
  display: 'box' | 'underline',
  measure: MeasureFn,
) {
  if (display === 'underline') {
    const text = topic.title || ' ';
    const width = Math.min(Math.max(text.length * 8 + 20, 52), 150);
    return { width, height: 12 };
  }
  return measure(topic, depth);
}

export function layoutLogicChart(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const config = readLogicConfig(options);
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const extraShapes: ExtraShape[] = [];
  const hiddenIds = collectHidden(root);
  const sign = config.direction === 'right' ? 1 : -1;
  let braceSeq = 0;

  function addEdge(
    from: string,
    to: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    const points =
      config.lineStyle === 'curve'
        ? buildHorizontalCurvePoints(x1, y1, x2, y2)
        : buildLogicPolylinePoints(x1, y1, x2, y2);
    edges.push({ id: `${from}-${to}`, from, to, points, type: 'tree' });
  }

  function layout(
    topic: Topic,
    depth: number,
    y: number,
    parentId?: string,
    extraX = 0,
  ): number {
    if (hiddenIds.has(topic.id)) return 0;
    const display = resolveDisplay(topic, depth, config, hiddenIds);
    const size = measureLogicNode(topic, depth, display, measure);
    const x =
      config.direction === 'right'
        ? depth * LEVEL_GAP * sign + extraX
        : depth * LEVEL_GAP * sign - size.width - extraX;

    nodes.set(topic.id, {
      id: topic.id,
      x,
      y,
      width: size.width,
      height: size.height,
      depth,
      display,
    });

    if (parentId) {
      const parent = nodes.get(parentId)!;
      const fromX = config.direction === 'right' ? parent.x + parent.width : parent.x;
      const toX = config.direction === 'right' ? x : x + size.width;
      addEdge(
        parentId,
        topic.id,
        fromX,
        parent.y + parent.height / 2,
        toX,
        y + size.height / 2,
      );
    }

    let currentY = y;
    if (!topic.collapsed) {
      const children = topic.children.filter((c) => !hiddenIds.has(c.id));
      const useBrace = config.groupLeaves === 'brace' && isLeafGroup(topic, hiddenIds);
      const childExtraX = useBrace ? BRACE_WIDTH + BRACE_GAP : 0;
      const childIds: string[] = [];

      for (const child of children) {
        const h = layout(child, depth + 1, currentY, topic.id, childExtraX);
        childIds.push(child.id);
        currentY += h + V_GAP;
      }

      if (useBrace && childIds.length >= 2) {
        const first = nodes.get(childIds[0]!)!;
        const last = nodes.get(childIds[childIds.length - 1]!)!;
        const braceX =
          config.direction === 'right'
            ? first.x - BRACE_GAP - BRACE_WIDTH
            : first.x + first.width + BRACE_GAP;
        extraShapes.push({
          id: `logic-brace-${braceSeq++}`,
          type: 'brace',
          bounds: {
            x: braceX,
            y: first.y,
            width: BRACE_WIDTH,
            height: last.y + last.height - first.y,
          },
          style: {
            stroke: '#888888',
            openSide: config.direction === 'right' ? 'right' : 'left',
          },
        });
      }
    }

    return Math.max(size.height, currentY - y);
  }

  layout(root, 0, 0);
  return finalizeResult(nodes, edges, extraShapes);
}
