// covers: ST-006
/**
 * Classic Ishikawa / XMind fishbone:
 * - Horizontal spine from the fish head
 * - Level-1 category labels sit at the TIP of each diagonal bone
 * - Level-2 causes are horizontal ribs between spine and tip (toward the head)
 * - Level-3+ continue horizontally toward the head
 */
import type {
  ExtraShape,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

/** Compact gaps — fishbone reads best when ribs sit tight on the bone. */
const H_GAP = 20;
const V_GAP = 8;
const RIB_ALONG_GAP = 6;
const SPINE_CLEAR = 28;
const TIP_CLEAR = 14;
const MIN_BONE = 64;

function nodeReach(size: { width: number; height: number }): number {
  return Math.hypot(size.width, size.height) / 2;
}

function measureRib(
  topic: Topic,
  depth: number,
  measure: MeasureFn,
): { width: number; height: number } {
  // Underline ribs: strip box padding so the line sits under glyphs, not through them.
  const size = measure(topic, depth);
  return { width: size.width, height: Math.max(20, size.height - 12) };
}

function horizontalExtent(
  topic: Topic,
  depth: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = depth >= 2 ? measureRib(topic, depth, measure) : measure(topic, depth);
  if (topic.collapsed) return size.width;
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return size.width;
  let maxChildW = 0;
  for (const child of children) {
    maxChildW = Math.max(maxChildW, horizontalExtent(child, depth + 1, hiddenIds, measure));
  }
  return size.width + H_GAP + maxChildW;
}

function horizontalBlockHeight(
  topic: Topic,
  depth: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = depth >= 2 ? measureRib(topic, depth, measure) : measure(topic, depth);
  if (topic.collapsed) return size.height;
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return size.height;
  let kidsH = 0;
  for (let i = 0; i < children.length; i++) {
    kidsH += horizontalBlockHeight(children[i]!, depth + 1, hiddenIds, measure);
    if (i < children.length - 1) kidsH += V_GAP;
  }
  return Math.max(size.height, kidsH);
}

/** Nest further causes horizontally away from the head. */
function layoutOutward(
  parent: Topic,
  parentNode: LayoutNode,
  depth: number,
  ribDir: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
): void {
  if (parent.collapsed) return;
  const children = parent.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return;

  const heights = children.map((c) => horizontalBlockHeight(c, depth, hiddenIds, measure));
  let totalH = heights.reduce((a, b) => a + b, 0);
  if (children.length > 1) totalH += V_GAP * (children.length - 1);

  // Connect along underline baselines (topic bottom).
  const parentBaseY = parentNode.y + parentNode.height;
  let y = parentBaseY - totalH / 2;
  const origin =
    ribDir > 0 ? parentNode.x + parentNode.width + H_GAP : parentNode.x - H_GAP;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const size = measureRib(child, depth, measure);
    const blockH = heights[i]!;
    const nodeY = y + (blockH - size.height) / 2;
    const nodeX = ribDir > 0 ? origin : origin - size.width;

    nodes.set(child.id, {
      id: child.id,
      x: nodeX,
      y: nodeY,
      width: size.width,
      height: size.height,
      depth,
      display: 'underline',
    });

    const fromX = ribDir > 0 ? parentNode.x + parentNode.width : parentNode.x;
    const toX = ribDir > 0 ? nodeX : nodeX + size.width;
    const toY = nodeY + size.height;
    // Straight segments only (horizontal + optional vertical stub).
    if (Math.abs(toY - parentBaseY) < 1) {
      edges.push({
        id: `${parent.id}-${child.id}`,
        from: parent.id,
        to: child.id,
        points: [
          { x: fromX, y: parentBaseY },
          { x: toX, y: toY },
        ],
        type: 'tree',
      });
    } else {
      edges.push({
        id: `${parent.id}-${child.id}`,
        from: parent.id,
        to: child.id,
        points: [
          { x: fromX, y: parentBaseY },
          { x: toX, y: parentBaseY },
          { x: toX, y: toY },
        ],
        type: 'tree',
      });
    }

    layoutOutward(child, nodes.get(child.id)!, depth + 1, ribDir, hiddenIds, measure, nodes, edges);
    y += blockH + V_GAP;
  }
}

function ribAlongSpan(
  topic: Topic,
  depth: number,
  angle: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  const blockH = horizontalBlockHeight(topic, depth, hiddenIds, measure);
  const sin = Math.max(Math.abs(Math.sin(angle)), 0.35);
  return blockH / sin + RIB_ALONG_GAP;
}

function estimatePrimaryBone(
  category: Topic,
  depth: number,
  angle: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
): { boneLen: number; ribReach: number } {
  const catSize = measure(category, depth);
  const catReach = nodeReach(catSize);
  if (category.collapsed) {
    return { boneLen: Math.max(MIN_BONE, catReach + SPINE_CLEAR), ribReach: 0 };
  }
  const ribs = category.children.filter((c) => !hiddenIds.has(c.id));
  if (ribs.length === 0) {
    return { boneLen: Math.max(MIN_BONE, catReach + SPINE_CLEAR), ribReach: 0 };
  }

  let along = SPINE_CLEAR;
  let maxRib = 0;
  for (const rib of ribs) {
    along += ribAlongSpan(rib, depth + 1, angle, hiddenIds, measure);
    maxRib = Math.max(maxRib, horizontalExtent(rib, depth + 1, hiddenIds, measure));
  }
  along += TIP_CLEAR + catReach;
  return { boneLen: Math.max(MIN_BONE, along), ribReach: maxRib };
}

export function layoutFishbone(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const branchAngle =
    options.type === 'fishbone' ? (options.branchAngle * Math.PI) / 180 : Math.PI / 4;
  const headPosition = options.type === 'fishbone' ? options.headPosition : 'right';
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const extraShapes: ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const children = root.children.filter((c) => !hiddenIds.has(c.id));

  const spineDir = headPosition === 'left' ? 1 : -1;
  // Ribs grow away from the head (XMind / reference: deeper notes continue outward).
  const ribDir = spineDir;

  const boneMeta = children.map((c, i) => {
    const sign = i % 2 === 0 ? -1 : 1;
    const angle = sign * branchAngle;
    return { ...estimatePrimaryBone(c, 1, angle, hiddenIds, measure), angle };
  });

  const maxBoneLen = boneMeta.length ? Math.max(...boneMeta.map((b) => b.boneLen)) : MIN_BONE;
  const maxRibReach = boneMeta.length ? Math.max(...boneMeta.map((b) => b.ribReach)) : 0;
  const cosA = Math.cos(branchAngle);
  const spineStep = Math.max(100, maxBoneLen * cosA * 0.3 + maxRibReach * 0.55 + 40);
  const spineLen = Math.max(360, (children.length + 1) * spineStep + maxRibReach + 80);
  const headX = headPosition === 'left' ? 0 : spineLen + maxRibReach + 24;
  const spineY = 80 + rootSize.height / 2;

  nodes.set(root.id, {
    id: root.id,
    x: headX,
    y: spineY - rootSize.height / 2,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const spineStart = headPosition === 'left' ? headX + rootSize.width : headX;
  const spineEnd = headX + spineDir * spineLen;
  extraShapes.push({
    id: 'fishbone-spine',
    type: 'timeline-axis',
    bounds: {
      x: Math.min(spineStart, spineEnd),
      y: spineY,
      width: Math.abs(spineEnd - spineStart),
      height: 2,
    },
    style: { stroke: '#888888' },
  });

  children.forEach((child, i) => {
    const size = measure(child, 1);
    const meta = boneMeta[i]!;
    const angle = meta.angle;
    const ux = spineDir * Math.cos(Math.abs(angle));
    const uy = Math.sin(angle);
    const spineX = headX + spineDir * (i + 1) * spineStep;
    const boneLen = meta.boneLen;
    const tipCx = spineX + ux * boneLen;
    const tipCy = spineY + uy * boneLen;
    const catReach = nodeReach(size);

    nodes.set(child.id, {
      id: child.id,
      x: tipCx - size.width / 2,
      y: tipCy - size.height / 2,
      width: size.width,
      height: size.height,
      depth: 1,
      angle,
    });

    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: spineX, y: spineY },
        { x: tipCx - ux * catReach, y: tipCy - uy * catReach },
      ],
      type: 'tree',
    });

    if (child.collapsed) return;
    const ribs = child.children.filter((c) => !hiddenIds.has(c.id));
    if (ribs.length === 0) return;

    let cursor = SPINE_CLEAR;
    for (const rib of ribs) {
      const span = ribAlongSpan(rib, 2, angle, hiddenIds, measure);
      const dist = cursor + span / 2;
      const attachX = spineX + ux * dist;
      const attachY = spineY + uy * dist;
      const ribSize = measureRib(rib, 2, measure);

      // Topic on the head-facing side; horizontal underline at the topic bottom
      // runs the full width from the bone (matches XMind fishbone ribs).
      const ribX = ribDir > 0 ? attachX : attachX - ribSize.width;
      const ribY = attachY - ribSize.height;

      nodes.set(rib.id, {
        id: rib.id,
        x: ribX,
        y: ribY,
        width: ribSize.width,
        height: ribSize.height,
        depth: 2,
        display: 'underline',
      });

      const farX = ribDir > 0 ? ribX + ribSize.width : ribX;
      edges.push({
        id: `${child.id}-${rib.id}`,
        from: child.id,
        to: rib.id,
        points: [
          { x: attachX, y: attachY },
          { x: farX, y: attachY },
        ],
        type: 'tree',
      });

      layoutOutward(rib, nodes.get(rib.id)!, 3, ribDir, hiddenIds, measure, nodes, edges);
      cursor += span;
    }
  });

  return finalizeResult(nodes, edges, extraShapes);
}
