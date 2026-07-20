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

const BRACE_WIDTH = 16;
const BRACE_GAP = 12;

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
  const size = measure(topic, depth);
  if (display === 'underline') {
    // Keep underline visual short, but width must follow real text (CJK-safe autosize).
    return { width: size.width, height: Math.max(14, Math.round(size.height * 0.45)) };
  }
  return size;
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

  function blockHeight(topic: Topic, depth: number): number {
    if (hiddenIds.has(topic.id)) return 0;
    const display = resolveDisplay(topic, depth, config, hiddenIds);
    const size = measureLogicNode(topic, depth, display, measure);
    if (topic.collapsed) return size.height;
    const children = topic.children.filter((c) => !hiddenIds.has(c.id));
    if (children.length === 0) return size.height;
    let childrenH = 0;
    for (let i = 0; i < children.length; i++) {
      childrenH += blockHeight(children[i]!, depth + 1);
      if (i < children.length - 1) childrenH += V_GAP;
    }
    return Math.max(size.height, childrenH);
  }

  function layout(
    topic: Topic,
    depth: number,
    bandTop: number,
    parentId?: string,
    extraX = 0,
  ): number {
    if (hiddenIds.has(topic.id)) return 0;
    const display = resolveDisplay(topic, depth, config, hiddenIds);
    const size = measureLogicNode(topic, depth, display, measure);
    const x =
      config.direction === 'right'
        ? depth * LEVEL_GAP + extraX
        : -depth * LEVEL_GAP - size.width - extraX;

    const children =
      topic.collapsed ? [] : topic.children.filter((c) => !hiddenIds.has(c.id));
    const useBrace = config.groupLeaves === 'brace' && isLeafGroup(topic, hiddenIds);
    const childExtraX = useBrace ? BRACE_WIDTH + BRACE_GAP : 0;

    let childrenH = 0;
    for (const child of children) {
      childrenH += blockHeight(child, depth + 1);
    }
    if (children.length > 1) childrenH += V_GAP * (children.length - 1);

    const blockH = Math.max(size.height, childrenH || size.height);
    const nodeY = bandTop + (blockH - size.height) / 2;

    nodes.set(topic.id, {
      id: topic.id,
      x,
      y: nodeY,
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
        nodeY + size.height / 2,
      );
    }

    if (children.length > 0) {
      let currentY = bandTop + (blockH - childrenH) / 2;
      const childIds: string[] = [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        const h = layout(child, depth + 1, currentY, topic.id, childExtraX);
        childIds.push(child.id);
        currentY += h;
        if (i < children.length - 1) currentY += V_GAP;
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
            stroke: '#6B7280',
            strokeWidth: 2,
            openSide: config.direction === 'right' ? 'right' : 'left',
          },
        });
      }
    }

    return blockH;
  }

  layout(root, 0, 0);
  return finalizeResult(nodes, edges, extraShapes);
}
