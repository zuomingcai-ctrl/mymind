// covers: ST-008
import type {
  ExtraShape,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { collectHidden, finalizeResult, V_GAP } from './utils.js';
import { COLLAPSE_BTN_RADIUS } from '../render/collapse-button.js';

const NEST_INDENT = 48;
const BRACE_W = 18;
const BRACE_PAD = 16;
/** Clear the fold control between parent edge and brace. */
const BRACE_PARENT_GAP = COLLAPSE_BTN_RADIUS * 2 + 6;
/** Gap between brace and the children column. */
const BRACE_CHILD_GAP = 14;

interface BraceConfig {
  /** Children grow to the right of their parent. */
  growRight: boolean;
  /** Brace sits between parent and children (opposite) or on the outer side (same). */
  partPosition: 'same' | 'opposite';
  /** Which side of the root/group the brace glyph sits on. */
  braceSide: 'left' | 'right';
}

interface ChildBand {
  node: LayoutNode;
  /** Top of the child's full subtree band (includes nested descendants). */
  top: number;
  height: number;
}

function readConfig(options: StructureOptions): BraceConfig {
  const braceSide = options.type === 'brace-map' ? options.braceSide : 'right';
  const partPosition =
    options.type === 'brace-map' ? (options.partPosition ?? 'opposite') : 'opposite';

  return {
    growRight: braceSide === 'right',
    partPosition,
    braceSide,
  };
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
  bands: ChildBand[],
  parentNode: LayoutNode,
  config: BraceConfig,
  extraShapes: ExtraShape[],
): void {
  if (bands.length === 0) return;
  const first = bands[0]!;
  const last = bands[bands.length - 1]!;
  // Span each child's full subtree band so nested content is enclosed and the
  // brace cusp stays vertically aligned with the parent.
  const braceTop = first.top;
  const braceBottom = last.top + last.height;
  const braceHeight = Math.max(braceBottom - braceTop, first.node.height);

  const childNodes = bands.map((b) => b.node);

  let braceX: number;
  let openSide: 'left' | 'right';
  if (config.partPosition === 'opposite') {
    if (config.braceSide === 'right') {
      // Sit just past the parent (and fold control), not centered in a wide gap.
      braceX = parentNode.x + parentNode.width + BRACE_PARENT_GAP;
      openSide = 'right';
    } else {
      braceX = parentNode.x - BRACE_PARENT_GAP - BRACE_W;
      openSide = 'left';
    }
  } else if (config.braceSide === 'right') {
    braceX =
      Math.max(parentNode.x + parentNode.width, ...childNodes.map((n) => n.x + n.width)) +
      BRACE_PAD;
    openSide = 'left';
  } else {
    braceX = Math.min(parentNode.x, ...childNodes.map((n) => n.x)) - BRACE_PAD - BRACE_W;
    openSide = 'right';
  }

  extraShapes.push({
    id,
    type: 'brace',
    bounds: { x: braceX, y: braceTop, width: BRACE_W, height: braceHeight },
    style: {
      stroke: '#6B7280',
      strokeWidth: 2,
      openSide,
    },
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
  extraShapes: ExtraShape[],
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

  if (visible.length === 0) return blockH;

  // Tight column: fold control + brace + children (no long stem gap).
  const gap =
    config.partPosition === 'opposite'
      ? BRACE_PARENT_GAP + BRACE_W + BRACE_CHILD_GAP
      : NEST_INDENT;
  const childX =
    config.partPosition === 'opposite'
      ? config.growRight
        ? x + size.width + gap
        : x - gap
      : config.growRight
        ? x + NEST_INDENT
        : x - NEST_INDENT;

  let cy = y;
  const bands: ChildBand[] = [];
  for (const child of visible) {
    const childSize = measure(child, depth + 1);
    const placedX =
      config.partPosition === 'opposite' && !config.growRight
        ? childX - childSize.width
        : config.partPosition === 'same' && !config.growRight
          ? childX - childSize.width
          : childX;

    const bandTop = cy;
    const h = layoutBraceSubtree(
      child,
      depth + 1,
      placedX,
      cy,
      config,
      hiddenIds,
      measure,
      nodes,
      extraShapes,
    );
    bands.push({ node: nodes.get(child.id)!, top: bandTop, height: h });
    cy += h + V_GAP;
  }

  addBrace(`brace-${topic.id}`, bands, nodes.get(topic.id)!, config, extraShapes);
  return blockH;
}

export function layoutBraceMap(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const config = readConfig(options);
  const nodes = new Map<string, LayoutNode>();
  const extraShapes: ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const rootX =
    config.partPosition === 'opposite'
      ? config.growRight
        ? 0
        : 300
      : config.growRight
        ? 40
        : 300;

  layoutBraceSubtree(root, 0, rootX, 0, config, hiddenIds, measure, nodes, extraShapes);

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

  // Brace is the connector — no parent–child tree edges and no stem lines.
  return finalizeResult(nodes, [], extraShapes);
}
