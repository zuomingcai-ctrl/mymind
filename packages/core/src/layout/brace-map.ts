// covers: ST-008
import type {
  ExtraShape,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { collectHidden, finalizeResult, LEVEL_GAP, V_GAP } from './utils.js';

const NEST_INDENT = 48;
const BRACE_W = 14;

interface BraceConfig {
  /** Children grow to the right of their parent. */
  growRight: boolean;
  /** Brace sits between parent and children (opposite) or on the outer side (same). */
  partPosition: 'same' | 'opposite';
}

function readConfig(options: StructureOptions): BraceConfig {
  const braceSide = options.type === 'brace-map' ? options.braceSide : 'right';
  const partPosition =
    options.type === 'brace-map' ? (options.partPosition ?? 'opposite') : 'opposite';

  // opposite: root and parts on opposite sides of the brace (classic).
  // same: root and parts share a column; brace sits on braceSide of the group.
  if (partPosition === 'opposite') {
    return { growRight: braceSide === 'left', partPosition };
  }
  return { growRight: braceSide === 'right', partPosition };
}

function subtreeHeight(topic: Topic, depth: number, hiddenIds: Set<string>, measure: MeasureFn): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  if (topic.collapsed) return size.height;
  const visible = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (visible.length === 0) return size.height;
  let childrenH = 0;
  for (let i = 0; i < visible.length; i++) {
    childrenH += subtreeHeight(visible[i]!, depth + 1, hiddenIds, measure);
    if (i < visible.length - 1) childrenH += V_GAP;
  }
  return Math.max(size.height, childrenH);
}

function addBrace(
  id: string,
  childNodes: LayoutNode[],
  parentNode: LayoutNode,
  config: BraceConfig,
  extraShapes: ExtraShape[],
): void {
  if (childNodes.length === 0) return;
  const first = childNodes[0]!;
  const last = childNodes[childNodes.length - 1]!;
  const braceTop = Math.min(first.y, parentNode.y);
  const braceBottom = Math.max(last.y + last.height, parentNode.y + parentNode.height);
  const braceHeight = Math.max(braceBottom - braceTop, first.height);

  let braceX: number;
  let openSide: 'left' | 'right';
  if (config.partPosition === 'opposite') {
    if (config.growRight) {
      braceX = parentNode.x + parentNode.width + 24;
      openSide = 'right';
    } else {
      braceX = parentNode.x - 24 - BRACE_W;
      openSide = 'left';
    }
  } else if (config.growRight) {
    // same + parts on right of brace → brace on left of group
    braceX = Math.min(parentNode.x, ...childNodes.map((n) => n.x)) - 24 - BRACE_W;
    openSide = 'right';
  } else {
    braceX = Math.max(parentNode.x + parentNode.width, ...childNodes.map((n) => n.x + n.width)) + 24;
    openSide = 'left';
  }

  extraShapes.push({
    id,
    type: 'brace',
    bounds: { x: braceX, y: braceTop, width: BRACE_W, height: braceHeight },
    style: { stroke: '#888888', openSide },
  });
}

function layoutBraceSubtree(
  topic: Topic,
  depth: number,
  x: number,
  y: number,
  config: BraceConfig,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  extraShapes: ExtraShape[],
  parentId?: string,
): number {
  if (hiddenIds.has(topic.id)) return 0;

  const size = measure(topic, depth);
  const visible = topic.collapsed
    ? []
    : topic.children.filter((c) => !hiddenIds.has(c.id));
  const childrenH =
    visible.length === 0
      ? 0
      : visible.reduce(
          (sum, c, i) =>
            sum +
            subtreeHeight(c, depth + 1, hiddenIds, measure) +
            (i < visible.length - 1 ? V_GAP : 0),
          0,
        );
  const blockH = Math.max(size.height, childrenH || size.height);
  const nodeY = y + (blockH - size.height) / 2;

  nodes.set(topic.id, {
    id: topic.id,
    x,
    y: nodeY,
    width: size.width,
    height: size.height,
    depth,
  });

  if (parentId) {
    const parent = nodes.get(parentId)!;
    edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: [
        {
          x: config.growRight ? parent.x + parent.width : parent.x,
          y: parent.y + parent.height / 2,
        },
        {
          x: config.growRight ? x : x + size.width,
          y: nodeY + size.height / 2,
        },
      ],
      type: 'tree',
    });
  }

  if (visible.length === 0) return blockH;

  const childX =
    config.partPosition === 'opposite'
      ? config.growRight
        ? x + size.width + LEVEL_GAP
        : x - LEVEL_GAP
      : // same: children share column, slightly nested
        config.growRight
        ? x + NEST_INDENT
        : x - NEST_INDENT;

  let cy = y;
  const childNodes: LayoutNode[] = [];
  for (const child of visible) {
    // For opposite growLeft, child x is right-edge anchored
    const childSize = measure(child, depth + 1);
    const placedX =
      config.partPosition === 'opposite' && !config.growRight
        ? childX - childSize.width
        : config.partPosition === 'same' && !config.growRight
          ? childX - childSize.width
          : childX;

    const h = layoutBraceSubtree(
      child,
      depth + 1,
      placedX,
      cy,
      config,
      hiddenIds,
      measure,
      nodes,
      edges,
      extraShapes,
      topic.id,
    );
    childNodes.push(nodes.get(child.id)!);
    cy += h + V_GAP;
  }

  addBrace(`brace-${topic.id}`, childNodes, nodes.get(topic.id)!, config, extraShapes);
  return blockH;
}

export function layoutBraceMap(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const config = readConfig(options);
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const extraShapes: ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  // Place root so opposite layouts have room on both sides.
  const rootX =
    config.partPosition === 'opposite'
      ? config.growRight
        ? 0
        : 300
      : config.growRight
        ? 40
        : 300;

  layoutBraceSubtree(
    root,
    0,
    rootX,
    0,
    config,
    hiddenIds,
    measure,
    nodes,
    edges,
    extraShapes,
  );

  // Ensure root exists even if empty
  if (!nodes.has(root.id)) {
    nodes.set(root.id, {
      id: root.id,
      x: rootX,
      y: 0,
      width: rootSize.width,
      height: rootSize.height,
      depth: 0,
    });
  }

  return finalizeResult(nodes, edges, extraShapes);
}
