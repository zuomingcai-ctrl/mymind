<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import {
  createDefaultLayoutRegistry,
  createMeasureFn,
  buildFrame,
  hitTestTopic,
  hitTestRelationship,
  hitTestSummary,
  hitTestBoundary,
  hitTestRelationshipControlHandle,
  getTheme,
  strokeEdge,
  drawExtraShape,
  drawRelationshipHandles,
  drawRelationshipArrows,
  relationshipLabelPoint,
  markerGlyph,
  todoCompletionRate,
  findTopicInSheet,
  type Viewport,
  type Sheet,
  type TopicStyle,
  type EdgeStyle,
  type TodoItem,
} from '@mymind/core';
import { useCanvasPan } from '../../composables/useCanvasPan';
import { computeSnap } from '../../utils/align-snap';

export type StructureSelectionKind = 'summary' | 'relationship' | 'boundary';

const props = defineProps<{
  sheet: Sheet | null;
  viewport: Viewport;
  selectedIds: string[];
  /** When set, only these topic ids (and paths) are drawn */
  visibleTopicIds?: Set<string> | null;
  alignGuides?: Array<{ orientation: 'v' | 'h'; pos: number }>;
  selectedDecorationId?: string | null;
  selectedStructure?: { kind: StructureSelectionKind; id: string } | null;
}>();

const emit = defineEmits<{
  select: [
    payload: {
      id: string | null;
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
    },
  ];
  resize: [width: number, height: number];
  'edit-topic': [payload: { id: string; left: number; top: number; width: number; height: number }];
  pan: [dx: number, dy: number];
  'context-menu': [payload: { clientX: number; clientY: number; topicId: string | null }];
  'move-topic': [payload: { topicId: string; newParentId: string; newIndex: number }];
  'align-guides': [guides: Array<{ orientation: 'v' | 'h'; pos: number }>];
  'select-decoration': [id: string | null];
  'select-structure': [payload: { kind: StructureSelectionKind; id: string } | null];
  'update-relationship-control': [
    payload: { relationshipId: string; controlPoints: Array<{ x: number; y: number }> },
  ];
  'edit-relationship': [
    payload: {
      id: string;
      left: number;
      top: number;
      width: number;
      height: number;
      title: string;
    },
  ];
  'request-keyboard-focus': [];
}>();

const selectedSet = computed(() => new Set(props.selectedIds));

const { panCursor, isPanning, onPointerDown, shouldSuppressClick } = useCanvasPan((dx, dy) =>
  emit('pan', dx, dy),
);

const canvasCursor = computed(() => panCursor.value);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const registry = createDefaultLayoutRegistry();
const measure = createMeasureFn();

function resolveLineType(sheet: Sheet): EdgeStyle['lineType'] {
  const opts = sheet.structureOptions;
  if (opts.type === 'logic-chart') {
    return opts.lineStyle === 'polyline' ? 'polyline' : 'curve';
  }
  return getTheme(sheet.canvasSettings.themeId).edge.lineType;
}

function drawTopicNode(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; width: number; height: number; depth: number; display?: 'box' | 'underline' },
  topic: { title: string; markers?: string[]; style?: TopicStyle; todos?: TodoItem[] },
  style: TopicStyle,
  fontFamily: string,
  selected: boolean,
) {
  const merged: TopicStyle = {
    ...style,
    ...topic.style,
    shape: topic.style?.shape ?? style.shape ?? 'rounded',
  };
  const ff = merged.fontFamily ?? fontFamily;
  let displayTitle = topic.title;
  if (merged.textTransform === 'uppercase') displayTitle = displayTitle.toUpperCase();
  if (merged.textTransform === 'lowercase') displayTitle = displayTitle.toLowerCase();
  if (merged.textTransform === 'capitalize') {
    displayTitle = displayTitle.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const hasTodos = (topic.todos?.length ?? 0) > 0;
  const titleOffsetY = hasTodos ? -6 : 0;

  if (merged.shape === 'none' || node.display === 'underline') {
    const lineY = node.y + node.height - 1;
    ctx.strokeStyle = merged.borderColor ?? '#888888';
    ctx.lineWidth = merged.borderWidth ?? 1;
    ctx.beginPath();
    ctx.moveTo(node.x, lineY);
    ctx.lineTo(node.x + node.width, lineY);
    ctx.stroke();
    fillTopicText(ctx, displayTitle, node, merged, ff, 'left', titleOffsetY);
    drawTodoRate(ctx, topic.todos, node);
    drawMarkers(ctx, topic.markers ?? [], node.x + node.width + 4, node.y + 4);
    if (selected) {
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.strokeRect(node.x - 2, node.y - 2, node.width + 4, node.height + 4);
    }
    return;
  }

  ctx.fillStyle = merged.fillColor ?? '#ffffff';
  ctx.strokeStyle = merged.borderColor ?? '#cccccc';
  ctx.lineWidth = merged.borderWidth ?? 1;
  if (merged.borderDash?.length) ctx.setLineDash(merged.borderDash);
  else ctx.setLineDash([]);

  if (merged.shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(node.x + node.width / 2, node.y + node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (merged.shape === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(node.x + node.width / 2, node.y);
    ctx.lineTo(node.x + node.width, node.y + node.height / 2);
    ctx.lineTo(node.x + node.width / 2, node.y + node.height);
    ctx.lineTo(node.x, node.y + node.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const r = merged.shape === 'rectangle' ? 2 : 6;
    roundRect(ctx, node.x, node.y, node.width, node.height, r);
    ctx.fill();
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (selected) {
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    roundRect(ctx, node.x - 2, node.y - 2, node.width + 4, node.height + 4, 8);
    ctx.stroke();
  }

  fillTopicText(ctx, displayTitle, node, merged, ff, merged.textAlign ?? 'center', titleOffsetY);
  drawTodoRate(ctx, topic.todos, node);
  drawMarkers(ctx, topic.markers ?? [], node.x + node.width + 4, node.y + 4);
}

function fillTopicText(
  ctx: CanvasRenderingContext2D,
  title: string,
  node: { x: number; y: number; width: number; height: number },
  style: TopicStyle,
  fontFamily: string,
  align: 'left' | 'center' | 'right',
  offsetY = 0,
) {
  const weight =
    style.fontWeight === 'bold'
      ? 'bold'
      : style.fontWeight === 'light'
        ? '300'
        : style.fontWeight === 'medium'
          ? '500'
          : 'normal';
  const italic = style.fontStyle === 'italic' ? 'italic ' : '';
  ctx.fillStyle = style.fontColor ?? '#333333';
  ctx.font = `${italic}${weight} ${style.fontSize ?? 14}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x =
    align === 'left' ? node.x + 8 : align === 'right' ? node.x + node.width - 8 : node.x + node.width / 2;
  const midY = node.y + node.height / 2 + offsetY;
  ctx.fillText(title, x, midY);
  if (style.textDecoration === 'underline' || style.textDecoration === 'line-through') {
    const metrics = ctx.measureText(title);
    const tw = metrics.width;
    const left = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
    const y =
      style.textDecoration === 'line-through'
        ? midY
        : midY + (style.fontSize ?? 14) / 2;
    ctx.beginPath();
    ctx.strokeStyle = style.fontColor ?? '#333';
    ctx.lineWidth = 1;
    ctx.moveTo(left, y);
    ctx.lineTo(left + tw, y);
    ctx.stroke();
  }
}

function drawTodoRate(
  ctx: CanvasRenderingContext2D,
  todos: TodoItem[] | undefined,
  node: { x: number; y: number; width: number; height: number },
) {
  if (!todos?.length) return;
  const { label } = todoCompletionRate(todos);
  ctx.fillStyle = '#666666';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, node.x + node.width / 2, node.y + node.height - 3);
}

function drawMarkers(ctx: CanvasRenderingContext2D, markers: string[], x: number, y: number) {
  if (!markers.length) return;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#333';
  let ox = x;
  for (const m of markers) {
    const glyph = markerGlyph(m);
    ctx.fillText(glyph, ox, y);
    ox += ctx.measureText(glyph).width + 4;
  }
}

function draw() {
  const canvas = canvasRef.value;
  const sheet = props.sheet;
  if (!canvas || !sheet) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const layout = registry.layout(sheet, measure);
  const theme = getTheme(sheet.canvasSettings.themeId);
  const lineType = resolveLineType(sheet);
  const frame = buildFrame(sheet, layout, theme.colors.background);
  const bg = sheet.canvasSettings.backgroundColor || theme.colors.background;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  drawBackgroundPattern(ctx, w, h, sheet.canvasSettings.backgroundPattern, props.viewport);

  ctx.save();
  ctx.translate(-props.viewport.x * props.viewport.zoom, -props.viewport.y * props.viewport.zoom);
  ctx.scale(props.viewport.zoom, props.viewport.zoom);

  // decorations
  for (const dec of sheet.decorations) {
    const asset = dec.assetId;
    ctx.save();
    ctx.translate(dec.x + dec.width / 2, dec.y + dec.height / 2);
    ctx.rotate((dec.rotation * Math.PI) / 180);
    ctx.font = `${Math.min(dec.width, dec.height)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(asset === 'star' ? '⭐' : asset.startsWith('sketch') ? '▭' : '◆', 0, 0);
    if (props.selectedDecorationId === dec.id) {
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.strokeRect(-dec.width / 2, -dec.height / 2, dec.width, dec.height);
      // scale/rotate handles
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(dec.width / 2 - 4, dec.height / 2 - 4, 8, 8);
      ctx.beginPath();
      ctx.arc(0, -dec.height / 2 - 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const layer of frame.layers) {
    if (layer.type === 'background') continue;
    if (layer.type === 'extra-shapes') {
      for (const shape of layer.shapes) {
        drawExtraShape(ctx, shape, { roundRect });
        if (
          shape.type === 'boundary' &&
          props.selectedStructure?.kind === 'boundary' &&
          props.selectedStructure.id === shape.id
        ) {
          ctx.strokeStyle = '#4A90D9';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          roundRect(
            ctx,
            shape.bounds.x - 2,
            shape.bounds.y - 2,
            shape.bounds.width + 4,
            shape.bounds.height + 4,
            6,
          );
          ctx.stroke();
        }
      }
    }
    if (layer.type === 'edges') {
      for (const edge of layer.edges) {
        const selected =
          (edge.type === 'relationship' &&
            props.selectedStructure?.kind === 'relationship' &&
            props.selectedStructure.id === edge.id) ||
          (edge.type === 'summary' &&
            props.selectedStructure?.kind === 'summary' &&
            props.selectedStructure.id === edge.id);
        const rel =
          edge.type === 'relationship'
            ? sheet.relationships.find((r) => r.id === edge.id)
            : undefined;
        strokeEdge(ctx, edge, {
          color: rel?.style?.color ?? '#E67E22',
          width: theme.edge.width,
          lineType,
          dash: sheet.canvasSettings.handDrawn ? [3, 2] : theme.edge.dash,
          selected,
          label: rel?.title,
          arrowStart: rel?.style?.arrowStart,
          arrowEnd: rel?.style?.arrowEnd ?? true,
          skipArrows: edge.type === 'relationship',
        });
        if (
          edge.type === 'relationship' &&
          props.selectedStructure?.kind === 'relationship' &&
          props.selectedStructure.id === edge.id
        ) {
          drawRelationshipHandles(ctx, edge.points);
        }
      }
    }
    if (layer.type === 'topics') {
      for (const node of layer.nodes) {
        if (props.visibleTopicIds && !props.visibleTopicIds.has(node.id)) continue;
        const topic = layer.topics.get(node.id);
        if (!topic) continue;
        const base =
          node.depth === 0
            ? theme.colors.centralTopic
            : node.depth === 1
              ? theme.colors.mainTopic
              : theme.colors.subTopic;

        drawTopicNode(
          ctx,
          node,
          topic,
          base,
          sheet.canvasSettings.globalFontFamily ?? theme.fontFamily,
          selectedSet.value.has(node.id),
        );
      }
    }
  }

  // Relationship arrows above topics so tip is never covered
  for (const layer of frame.layers) {
    if (layer.type !== 'edges') continue;
    for (const edge of layer.edges) {
      if (edge.type !== 'relationship') continue;
      const rel = sheet.relationships.find((r) => r.id === edge.id);
      const selected =
        props.selectedStructure?.kind === 'relationship' &&
        props.selectedStructure.id === edge.id;
      drawRelationshipArrows(ctx, edge, {
        color: selected ? '#4A90D9' : (rel?.style?.color ?? '#E67E22'),
        arrowStart: rel?.style?.arrowStart,
        arrowEnd: rel?.style?.arrowEnd ?? true,
      });
    }
  }

  ctx.restore();

  drawAspectGuide(ctx, w, h, sheet.canvasSettings.aspectGuide, props.viewport);

  if (props.alignGuides?.length) {
    ctx.save();
    ctx.translate(-props.viewport.x * props.viewport.zoom, -props.viewport.y * props.viewport.zoom);
    ctx.scale(props.viewport.zoom, props.viewport.zoom);
    ctx.strokeStyle = '#ff4d4f';
    ctx.lineWidth = 1 / props.viewport.zoom;
    ctx.setLineDash([4 / props.viewport.zoom, 4 / props.viewport.zoom]);
    for (const g of props.alignGuides) {
      ctx.beginPath();
      if (g.orientation === 'v') {
        ctx.moveTo(g.pos, props.viewport.y - 2000);
        ctx.lineTo(g.pos, props.viewport.y + 4000);
      } else {
        ctx.moveTo(props.viewport.x - 2000, g.pos);
        ctx.lineTo(props.viewport.x + 4000, g.pos);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  emit('resize', w, h);
}

function drawAspectGuide(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: Sheet['canvasSettings']['aspectGuide'],
  viewport: Viewport,
) {
  if (!guide || guide === 'none') return;
  const ratios: Record<string, number> = {
    a4: 210 / 297,
    a3: 297 / 420,
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
  };
  const ratio = ratios[guide];
  if (!ratio) return;
  let boxW = w * 0.7;
  let boxH = boxW / ratio;
  if (boxH > h * 0.7) {
    boxH = h * 0.7;
    boxW = boxH * ratio;
  }
  const x = (w - boxW) / 2;
  const y = (h - boxH) / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(64,158,255,0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, boxW, boxH);
  ctx.fillStyle = 'rgba(64,158,255,0.06)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(64,158,255,0.8)';
  ctx.fillText(guide.toUpperCase(), x + 6, y + 14);
  void viewport;
  ctx.restore();
}

function drawBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pattern: Sheet['canvasSettings']['backgroundPattern'],
  viewport: Viewport,
) {
  if (pattern === 'solid') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  const step = 24 * viewport.zoom;
  const ox = (-viewport.x * viewport.zoom) % step;
  const oy = (-viewport.y * viewport.zoom) % step;
  if (pattern === 'grid') {
    ctx.beginPath();
    for (let x = ox; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = oy; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  } else if (pattern === 'dots') {
    for (let x = ox; x < w; x += step) {
      for (let y = oy; y < h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hitTopicAt(event: MouseEvent): string | null {
  const canvas = canvasRef.value;
  const sheet = props.sheet;
  if (!canvas || !sheet) return null;

  const rect = canvas.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const world = {
    x: screen.x / props.viewport.zoom + props.viewport.x,
    y: screen.y / props.viewport.zoom + props.viewport.y,
  };

  const layout = registry.layout(sheet, measure);
  const nodes = [...layout.nodes.values()].filter((n) => !n.hidden);
  return hitTestTopic(world, nodes);
}

const dragState = ref<{
  topicId: string;
  startX: number;
  startY: number;
  dragging: boolean;
} | null>(null);

const relControlDrag = ref<{
  relationshipId: string;
  /** 0 = from-side handle, 1 = to-side handle */
  handleIndex: 0 | 1;
  /** Snapshot of both CPs at drag start */
  baseControlPoints: [{ x: number; y: number }, { x: number; y: number }];
} | null>(null);

/** Suppress the click that follows a structure-element mousedown. */
let suppressNextClick = false;

function worldFromEvent(event: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / props.viewport.zoom + props.viewport.x,
    y: (event.clientY - rect.top) / props.viewport.zoom + props.viewport.y,
  };
}

function pickStructureAt(world: { x: number; y: number }, sheet: Sheet): {
  kind: StructureSelectionKind;
  id: string;
} | null {
  const layout = registry.layout(sheet, measure);
  const frame = buildFrame(sheet, layout);
  const relEdges = layout.edges.filter((e) => e.type === 'relationship');
  const summaryEdges = layout.edges.filter((e) => e.type === 'summary');
  const shapesLayer = frame.layers.find((l) => l.type === 'extra-shapes');
  const boundaryShapes =
    shapesLayer && shapesLayer.type === 'extra-shapes' ? shapesLayer.shapes : [];

  const relHit = hitTestRelationship(world, relEdges);
  if (relHit) return { kind: 'relationship', id: relHit };
  const summaryHit = hitTestSummary(world, summaryEdges);
  if (summaryHit) return { kind: 'summary', id: summaryHit };
  const boundaryHit = hitTestBoundary(world, boundaryShapes);
  if (boundaryHit) return { kind: 'boundary', id: boundaryHit };
  return null;
}

function onMouseDown(event: MouseEvent) {
  emit('request-keyboard-focus');
  const sheet = props.sheet;
  if (sheet && event.button === 0) {
    const world = worldFromEvent(event);
    if (world) {
      const layout = registry.layout(sheet, measure);

      if (props.selectedStructure?.kind === 'relationship') {
        const selected = layout.edges.find(
          (e) => e.type === 'relationship' && e.id === props.selectedStructure!.id,
        );
        const handle = hitTestRelationshipControlHandle(world, selected);
        if (handle !== null && selected && selected.points.length >= 4) {
          relControlDrag.value = {
            relationshipId: props.selectedStructure.id,
            handleIndex: handle,
            baseControlPoints: [
              { ...selected.points[1]! },
              { ...selected.points[2]! },
            ],
          };
          window.addEventListener('mousemove', onRelControlMove);
          window.addEventListener('mouseup', onRelControlEnd);
          event.preventDefault();
          return;
        }
      }

      const topicHit = hitTestTopic(
        world,
        [...layout.nodes.values()].filter((n) => !n.hidden),
      );
      if (!topicHit) {
        const structureHit = pickStructureAt(world, sheet);
        if (structureHit) {
          suppressNextClick = true;
          emit('select-structure', structureHit);
          return;
        }
      }
    }
  }

  const hitId = hitTopicAt(event);
  const rootId = props.sheet?.rootTopic.id ?? null;
  if (hitId && hitId !== rootId && event.button === 0 && !event.shiftKey && !event.ctrlKey) {
    dragState.value = { topicId: hitId, startX: event.clientX, startY: event.clientY, dragging: false };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }
  emit('select-structure', null);
  onPointerDown(event, hitId, rootId);
}

function onRelControlMove(event: MouseEvent) {
  if (!relControlDrag.value) return;
  const world = worldFromEvent(event);
  if (!world) return;
  const drag = relControlDrag.value;
  const cps: [{ x: number; y: number }, { x: number; y: number }] = [
    { ...drag.baseControlPoints[0] },
    { ...drag.baseControlPoints[1] },
  ];
  cps[drag.handleIndex] = { x: world.x, y: world.y };
  relControlDrag.value = { ...drag, baseControlPoints: cps };
  emit('update-relationship-control', {
    relationshipId: drag.relationshipId,
    controlPoints: cps,
  });
}

function onRelControlEnd() {
  window.removeEventListener('mousemove', onRelControlMove);
  window.removeEventListener('mouseup', onRelControlEnd);
  relControlDrag.value = null;
}

function onDragMove(event: MouseEvent) {
  if (!dragState.value || !props.sheet) return;
  const dx = event.clientX - dragState.value.startX;
  const dy = event.clientY - dragState.value.startY;
  if (!dragState.value.dragging && Math.hypot(dx, dy) > 6) {
    dragState.value = { ...dragState.value, dragging: true };
  }
  if (!dragState.value.dragging) return;
  const layout = registry.layout(props.sheet, measure);
  const node = layout.nodes.get(dragState.value.topicId);
  if (!node) return;
  const worldDx = dx / props.viewport.zoom;
  const worldDy = dy / props.viewport.zoom;
  const others = [...layout.nodes.values()]
    .filter((n) => n.id !== dragState.value!.topicId && !n.hidden)
    .map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
  const snapped = computeSnap(
    { x: node.x + worldDx, y: node.y + worldDy, width: node.width, height: node.height },
    others,
  );
  emit('align-guides', snapped.guides);
}

function onDragEnd(event: MouseEvent) {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  emit('align-guides', []);
  const state = dragState.value;
  dragState.value = null;
  if (!state?.dragging || !props.sheet) return;
  const dropParent = hitTopicAt(event);
  if (!dropParent || dropParent === state.topicId) return;
  const layout = registry.layout(props.sheet, measure);
  void layout;
  const parentTopic = props.sheet ? findTopicInSheet(props.sheet, dropParent) : null;
  if (!parentTopic) return;
  if (isDescendant(parentTopic, state.topicId)) return;
  emit('move-topic', {
    topicId: state.topicId,
    newParentId: dropParent,
    newIndex: parentTopic.children.length,
  });
}

function isDescendant(root: import('@mymind/core').Topic, id: string): boolean {
  for (const c of root.children) {
    if (c.id === id || isDescendant(c, id)) return true;
  }
  return false;
}

function emitSelect(event: MouseEvent, hit: string | null) {
  emit('select', {
    id: hit,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
}

function onClick(event: MouseEvent) {
  if (shouldSuppressClick()) return;
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  if (props.sheet) {
    const canvas = canvasRef.value;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const world = {
        x: (event.clientX - rect.left) / props.viewport.zoom + props.viewport.x,
        y: (event.clientY - rect.top) / props.viewport.zoom + props.viewport.y,
      };
      for (let i = props.sheet.decorations.length - 1; i >= 0; i--) {
        const d = props.sheet.decorations[i]!;
        if (world.x >= d.x && world.x <= d.x + d.width && world.y >= d.y && world.y <= d.y + d.height) {
          emit('select-decoration', d.id);
          return;
        }
      }
      const topicHit = hitTestTopic(
        world,
        [...registry.layout(props.sheet, measure).nodes.values()].filter((n) => !n.hidden),
      );
      if (!topicHit) {
        const structureHit = pickStructureAt(world, props.sheet);
        if (structureHit) {
          emit('select-structure', structureHit);
          return;
        }
      }
    }
  }
  emit('select-decoration', null);
  pickTopic(event, (hit) => emitSelect(event, hit));
}

function onDblClick(event: MouseEvent) {
  const sheet = props.sheet;
  const canvas = canvasRef.value;
  if (sheet && canvas) {
    const world = worldFromEvent(event);
    if (world) {
      const topicHit = hitTestTopic(
        world,
        [...registry.layout(sheet, measure).nodes.values()].filter((n) => !n.hidden),
      );
      if (!topicHit) {
        const layout = registry.layout(sheet, measure);
        const relEdges = layout.edges.filter((e) => e.type === 'relationship');
        const relId = hitTestRelationship(world, relEdges, 14);
        if (relId) {
          const edge = relEdges.find((e) => e.id === relId);
          const rel = sheet.relationships.find((r) => r.id === relId);
          const mid = edge ? relationshipLabelPoint(edge.points) : null;
          if (edge && mid) {
            emit('select-structure', { kind: 'relationship', id: relId });
            const rect = canvas.getBoundingClientRect();
            const title = rel?.title ?? '关联';
            const width = Math.max(80, title.length * 12 + 24);
            emit('edit-relationship', {
              id: relId,
              left: rect.left + (mid.x - width / 2 - props.viewport.x) * props.viewport.zoom,
              top: rect.top + (mid.y - 12 - props.viewport.y) * props.viewport.zoom,
              width: width * props.viewport.zoom,
              height: 24 * props.viewport.zoom,
              title,
            });
            return;
          }
        }
      }
    }
  }

  pickTopic(event, (hit, node, canvasEl) => {
    if (!hit || !node) return;
    emitSelect(event, hit);
    const rect = canvasEl.getBoundingClientRect();
    const left = rect.left + (node.x - props.viewport.x) * props.viewport.zoom;
    const top = rect.top + (node.y - props.viewport.y) * props.viewport.zoom;
    const width = node.width * props.viewport.zoom;
    const height = node.height * props.viewport.zoom;
    emit('edit-topic', { id: hit, left, top, width, height });
  });
}

function onContextMenu(event: MouseEvent) {
  event.preventDefault();
  const hit = hitTopicAt(event);
  emit('context-menu', {
    clientX: event.clientX,
    clientY: event.clientY,
    topicId: hit,
  });
}

function pickTopic(
  event: MouseEvent,
  cb: (
    hit: string | null,
    node: { x: number; y: number; width: number; height: number } | undefined,
    canvas: HTMLCanvasElement,
  ) => void,
) {
  const canvas = canvasRef.value;
  const sheet = props.sheet;
  if (!canvas || !sheet) return;

  const rect = canvas.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const world = {
    x: screen.x / props.viewport.zoom + props.viewport.x,
    y: screen.y / props.viewport.zoom + props.viewport.y,
  };

  const layout = registry.layout(sheet, measure);
  const nodes = [...layout.nodes.values()].filter((n) => !n.hidden);
  const hit = hitTestTopic(world, nodes);
  const node = hit ? layout.nodes.get(hit) : undefined;
  cb(hit, node, canvas);
}

watch(
  () => [props.sheet, props.viewport, props.selectedIds, props.selectedStructure],
  draw,
  { deep: true },
);

onMounted(() => {
  draw();
  window.addEventListener('resize', draw);
});

onUnmounted(() => {
  window.removeEventListener('resize', draw);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="canvas-view"
    :class="{ panning: isPanning }"
    :style="{ cursor: canvasCursor }"
    tabindex="-1"
    @mousedown="onMouseDown"
    @click="onClick"
    @dblclick="onDblClick"
    @contextmenu="onContextMenu"
    @focus="emit('request-keyboard-focus')"
  />
</template>

<style scoped>
.canvas-view {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}
.canvas-view.panning {
  user-select: none;
}
</style>
