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
  hitTestCallout,
  hitTestRelationshipControlHandle,
  getTheme,
  strokeEdge,
  drawExtraShape,
  drawRelationshipHandles,
  drawRelationshipArrows,
  relationshipLabelPoint,
  markerGlyph,
  layoutMarkerHits,
  layoutTopicContent,
  listTopicAccessories,
  accessoryGlyph,
  PRIORITY_COLORS,
  MARKER_SIZE,
  ACCESSORY_SIZE,
  LABEL_CHIP_H,
  LABEL_CHIP_GAP,
  estimateLabelChipWidth,
  findTopicInSheet,
  findTopicByCalloutId,
  calloutBoundsFromOffset,
  topicCalloutAnchor,
  todoCompletionRate,
  getDecorationAsset,
  resolveDecorationWorldRect,
  wrapPlainText,
  approximateLineWidth,
  hitTestCollapseButton,
  layoutCollapseButton,
  type Viewport,
  type Sheet,
  type TopicStyle,
  type EdgeStyle,
  type TodoItem,
  type MarkerHitRect,
  type Label,
  type Topic,
  type ExtraShape,
  type LayoutResult,
  type CollapseButtonLayout,
} from '@mymind/core';
import { useCanvasPan } from '../../composables/useCanvasPan';
import { computeSnap } from '../../utils/align-snap';

export type StructureSelectionKind = 'summary' | 'relationship' | 'boundary' | 'callout';

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
  'update-decoration': [
    payload: {
      id: string;
      patch: { x?: number; y?: number; width?: number; height?: number; rotation?: number };
    },
  ];
  'select-structure': [payload: { kind: StructureSelectionKind; id: string } | null];
  'update-callout': [payload: { topicId: string; offset: { x: number; y: number } }];
  'update-topic-width': [payload: { topicId: string; width: number }];
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
  'edit-marker': [
    payload: {
      topicId: string;
      markerId: string;
      left: number;
      top: number;
    },
  ];
  'toggle-collapse': [topicId: string];
  'request-keyboard-focus': [];
}>();

const selectedSet = computed(() => new Set(props.selectedIds));

type DecorationDragMode = 'move' | 'resize' | 'rotate';
const decoDrag = ref<{
  id: string;
  mode: DecorationDragMode;
  startClientX: number;
  startClientY: number;
  origin: { x: number; y: number; width: number; height: number; rotation: number };
  center?: { x: number; y: number };
  moved: boolean;
} | null>(null);
const decoLivePatch = ref<{
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
} | null>(null);

const calloutDrag = ref<{
  calloutId: string;
  topicId: string;
  text: string;
  startClientX: number;
  startClientY: number;
  baseOffset: { x: number; y: number };
  moved: boolean;
} | null>(null);
const calloutLiveOffset = ref<{ x: number; y: number } | null>(null);

const { panCursor, isPanning, onPointerDown, shouldSuppressClick } = useCanvasPan((dx, dy) =>
  emit('pan', dx, dy),
);

const canvasCursor = computed(() => {
  if (widthResizeDrag.value) return 'ew-resize';
  if (widthHandleHover.value) return 'ew-resize';
  if (collapseHover.value) return 'pointer';
  if (decoDrag.value?.mode === 'resize') return 'nwse-resize';
  if (decoDrag.value?.mode === 'rotate') return 'grabbing';
  if (decoDrag.value?.mode === 'move') return 'move';
  if (calloutDrag.value) return 'move';
  return panCursor.value;
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const registry = createDefaultLayoutRegistry();
const baseMeasure = createMeasureFn();

const widthResizeDrag = ref<{
  topicId: string;
  edge: 'left' | 'right';
  startClientX: number;
  originWidth: number;
  liveWidth: number;
  moved: boolean;
} | null>(null);
const widthHandleHover = ref(false);
const collapseHover = ref(false);

function measure(topic: Topic, depth: number) {
  const drag = widthResizeDrag.value;
  if (drag && drag.topicId === topic.id) {
    const patched: Topic = {
      ...topic,
      style: {
        shape: topic.style?.shape ?? 'rounded',
        ...topic.style,
        width: drag.liveWidth,
        widthMode: 'fixed',
      },
    };
    return baseMeasure(patched, depth);
  }
  return baseMeasure(topic, depth);
}

function resolveLineType(sheet: Sheet): EdgeStyle['lineType'] {
  const opts = sheet.structureOptions;
  if (opts.type === 'logic-chart') {
    return opts.lineStyle === 'polyline' ? 'polyline' : 'curve';
  }
  // Fishbone bones/ribs are geometric straight segments (Ishikawa), never theme curves.
  if (opts.type === 'fishbone') {
    return 'straight';
  }
  return getTheme(sheet.canvasSettings.themeId).edge.lineType;
}

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  nodes: Map<string, { id: string; x: number; y: number; width: number; height: number; hidden?: boolean }>,
) {
  const handle = 8 / Math.max(props.viewport.zoom, 0.01);
  const rotateStem = 14 / Math.max(props.viewport.zoom, 0.01);
  for (const raw of sheet.decorations) {
    const dec = decorationWithLivePatch(raw);
    const rect = resolveDecorationWorldRect(dec, nodes);
    const asset = getDecorationAsset(dec.assetId);
    const glyph = asset?.glyph ?? '◆';
    const hw = rect.width / 2;
    const hh = rect.height / 2;

    ctx.save();
    ctx.translate(rect.x + hw, rect.y + hh);
    ctx.rotate((dec.rotation * Math.PI) / 180);

    if (dec.type === 'illustration') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = '#D0D5DD';
      ctx.lineWidth = 1.5;
      roundRect(ctx, -hw, -hh, rect.width, rect.height, 10);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#333333';
    ctx.font = `${Math.min(rect.width, rect.height) * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, 0, 0);

    // Selection chrome in local (rotated) space so the box follows the decoration
    if (props.selectedDecorationId === dec.id) {
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2 / Math.max(props.viewport.zoom, 0.01);
      ctx.setLineDash([]);
      ctx.strokeRect(-hw, -hh, rect.width, rect.height);
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(hw - handle / 2, hh - handle / 2, handle, handle);
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(0, -hh - rotateStem);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -hh - rotateStem, handle * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function decorationWithLivePatch<T extends { id: string }>(dec: T): T & {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
} {
  const live = decoLivePatch.value;
  if (live && decoDrag.value?.id === dec.id) {
    return { ...dec, ...live } as T & {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    };
  }
  return dec as T & {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
}

function drawTopicNode(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; width: number; height: number; depth: number; display?: 'box' | 'underline' },
  topic: Topic,
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

  const content = layoutTopicContent(node, topic);

  if (merged.shape === 'none' || node.display === 'underline') {
    const lineY = node.y + node.height - 1;
    ctx.strokeStyle = merged.borderColor ?? '#888888';
    ctx.lineWidth = merged.borderWidth ?? 1;
    ctx.beginPath();
    ctx.moveTo(node.x, lineY);
    ctx.lineTo(node.x + node.width, lineY);
    ctx.stroke();
    drawTopicAdornments(ctx, node, topic, displayTitle, merged, ff, content, 'left');
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

  drawTopicAdornments(
    ctx,
    node,
    topic,
    displayTitle,
    merged,
    ff,
    content,
    merged.textAlign ?? 'center',
  );
}

function drawTopicAdornments(
  ctx: CanvasRenderingContext2D,
  node: { x: number; y: number; width: number; height: number },
  topic: Topic,
  displayTitle: string,
  style: TopicStyle,
  fontFamily: string,
  content: ReturnType<typeof layoutTopicContent>,
  align: 'left' | 'center' | 'right',
) {
  drawInnerMarkers(ctx, topic.markers ?? [], content.markersOrigin);
  fillTopicTextInBand(ctx, displayTitle, node, style, fontFamily, align, content);
  drawAccessoryIcons(ctx, listTopicAccessories(topic), content.accessoriesOrigin);
  drawLabelChips(ctx, topic.labels ?? [], content.labelsOrigin);
  drawTodoRate(ctx, topic.todos, node);
}

function drawInnerMarkers(
  ctx: CanvasRenderingContext2D,
  markers: string[],
  origin: { x: number; y: number },
) {
  if (!markers.length) return;
  let ox = origin.x;
  for (const id of markers) {
    const color = PRIORITY_COLORS[id];
    if (color) {
      const num = id.replace('priority-', '');
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(ox + MARKER_SIZE / 2, origin.y + MARKER_SIZE / 2, MARKER_SIZE / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(num, ox + MARKER_SIZE / 2, origin.y + MARKER_SIZE / 2 + 0.5);
      ox += MARKER_SIZE + 3;
    } else {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333';
      const glyph = markerGlyph(id);
      ctx.fillText(glyph, ox, origin.y + MARKER_SIZE / 2);
      ox += Math.max(MARKER_SIZE, ctx.measureText(glyph).width) + 3;
    }
  }
}

function drawAccessoryIcons(
  ctx: CanvasRenderingContext2D,
  kinds: ReturnType<typeof listTopicAccessories>,
  origin: { x: number; y: number },
) {
  if (!kinds.length) return;
  let ox = origin.x;
  for (const kind of kinds) {
    if (kind === 'note') {
      // XMind-style note pill: light circle with "⋯"
      ctx.beginPath();
      ctx.fillStyle = '#E8E8E8';
      ctx.arc(ox + ACCESSORY_SIZE / 2, origin.y + ACCESSORY_SIZE / 2, ACCESSORY_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('···', ox + ACCESSORY_SIZE / 2, origin.y + ACCESSORY_SIZE / 2);
    } else {
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#666';
      ctx.fillText(accessoryGlyph(kind), ox + ACCESSORY_SIZE / 2, origin.y + ACCESSORY_SIZE / 2);
    }
    ox += ACCESSORY_SIZE + 3;
  }
}

function drawLabelChips(
  ctx: CanvasRenderingContext2D,
  labels: Label[],
  origin: { x: number; y: number },
) {
  if (!labels.length) return;
  let ox = origin.x;
  ctx.font = '11px sans-serif';
  ctx.textBaseline = 'middle';
  for (const label of labels) {
    const w = estimateLabelChipWidth(label.text);
    const h = LABEL_CHIP_H;
    ctx.fillStyle = '#F5F5F5';
    ctx.strokeStyle = label.color || '#CCCCCC';
    ctx.lineWidth = 1;
    roundRect(ctx, ox, origin.y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText(label.text, ox + w / 2, origin.y + h / 2);
    ox += w + LABEL_CHIP_GAP;
  }
}

function fillTopicTextInBand(
  ctx: CanvasRenderingContext2D,
  title: string,
  node: { x: number; y: number; width: number; height: number },
  style: TopicStyle,
  fontFamily: string,
  align: 'left' | 'center' | 'right',
  content: ReturnType<typeof layoutTopicContent>,
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
  const fontSize = style.fontSize ?? 14;
  ctx.fillStyle = style.fontColor ?? '#333333';
  ctx.font = `${italic}${weight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  const left = content.titleX;
  const right = content.accessoriesWidth
    ? content.accessoriesOrigin.x - 4
    : node.x + node.width - 8;
  const maxW = Math.max(8, right - left);
  const lines = wrapPlainText(title, maxW, approximateLineWidth);
  const lineH = Math.max(16, fontSize * 1.35);
  const blockH = lines.length * lineH;
  const startY = node.y + Math.max(lineH / 2, (content.titleBandHeight - blockH) / 2 + lineH / 2);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const y = startY + i * lineH;
    const x = align === 'left' ? left : align === 'right' ? right : (left + right) / 2;
    ctx.fillText(line, x, y);
    if (style.textDecoration === 'underline' || style.textDecoration === 'line-through') {
      const metrics = ctx.measureText(line);
      const tw = metrics.width;
      const textLeft = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
      const decoY =
        style.textDecoration === 'line-through' ? y : y + fontSize / 2;
      ctx.beginPath();
      ctx.strokeStyle = style.fontColor ?? '#333';
      ctx.lineWidth = 1;
      ctx.moveTo(textLeft, decoY);
      ctx.lineTo(textLeft + tw, decoY);
      ctx.stroke();
    }
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

function drawCollapseButton(ctx: CanvasRenderingContext2D, btn: CollapseButtonLayout) {
  const { center, radius, collapsed, childCount } = btn;
  ctx.beginPath();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.25;
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#555555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (collapsed) {
    const label = childCount > 9 ? '9+' : String(childCount);
    ctx.font = `bold ${childCount > 9 ? 8 : 10}px sans-serif`;
    ctx.fillText(label, center.x, center.y + 0.5);
  } else {
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('−', center.x, center.y + 0.5);
  }
}

function hitTestMarkerAt(
  world: { x: number; y: number },
  sheet: Sheet,
): { topicId: string; markerId: string; hit: MarkerHitRect } | null {
  const layout = registry.layout(sheet, measure);
  const measureCtx = canvasRef.value?.getContext('2d');
  if (measureCtx) {
    measureCtx.font = '12px sans-serif';
  }
  const measureGlyph = (g: string) =>
    measureCtx ? measureCtx.measureText(g).width : Math.max(14, [...g].length * 12);

  const nodes = [...layout.nodes.values()].filter((n) => !n.hidden).reverse();
  for (const node of nodes) {
    const topic = findTopicInSheet(sheet, node.id);
    if (!topic?.markers?.length) continue;
    const content = layoutTopicContent(node, topic);
    const hits = layoutMarkerHits(
      topic.markers,
      content.markersOrigin.x,
      content.markersOrigin.y,
      measureGlyph,
    );
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i]!;
      if (
        world.x >= h.x - 2 &&
        world.x <= h.x + h.width + 2 &&
        world.y >= h.y - 2 &&
        world.y <= h.y + h.height + 2
      ) {
        return { topicId: node.id, markerId: h.markerId, hit: h };
      }
    }
  }
  return null;
}

function applyCalloutLivePatch(shape: ExtraShape, layout: LayoutResult): ExtraShape {
  const drag = calloutDrag.value;
  const live = calloutLiveOffset.value;
  if (!drag || !live || shape.type !== 'callout' || shape.id !== drag.calloutId) return shape;
  const node = layout.nodes.get(drag.topicId);
  if (!node || node.hidden) return shape;
  const bounds = calloutBoundsFromOffset(node, live, drag.text);
  const anchor = topicCalloutAnchor(node);
  return {
    ...shape,
    bounds,
    style: {
      ...shape.style,
      anchorX: anchor.x,
      anchorY: anchor.y,
      topicX: node.x,
      topicY: node.y,
      topicW: node.width,
      topicH: node.height,
    },
  };
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

  for (const layer of frame.layers) {
    if (layer.type === 'background') continue;
    if (layer.type === 'extra-shapes') {
      for (const shape of layer.shapes) {
        const drawn = applyCalloutLivePatch(shape, layout);
        drawExtraShape(ctx, drawn, { roundRect });
        if (
          (drawn.type === 'boundary' || drawn.type === 'callout') &&
          props.selectedStructure?.kind === drawn.type &&
          props.selectedStructure.id === drawn.id
        ) {
          ctx.strokeStyle = '#4A90D9';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          roundRect(
            ctx,
            drawn.bounds.x - 2,
            drawn.bounds.y - 2,
            drawn.bounds.width + 4,
            drawn.bounds.height + 4,
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
      // Fold controls above topic boxes so they stay clickable
      for (const node of layer.nodes) {
        if (props.visibleTopicIds && !props.visibleTopicIds.has(node.id)) continue;
        const topic = layer.topics.get(node.id);
        if (!topic) continue;
        const btn = layoutCollapseButton(
          topic,
          node,
          layout,
          sheet.structure,
          sheet.structureOptions,
        );
        if (btn) drawCollapseButton(ctx, btn);
      }
    }
  }

  // stickers / illustrations above topics (visible free layer)
  drawDecorations(ctx, sheet, layout.nodes);

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

  const calloutHit = hitTestCallout(world, boundaryShapes);
  if (calloutHit) return { kind: 'callout', id: calloutHit };
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

      // Fold control beats width resize when both sit on the child-facing edge
      {
        const collapseHit = hitTestCollapseButton(world, sheet, layout);
        if (collapseHit) {
          suppressNextClick = true;
          emit('select-structure', null);
          emit('select', {
            id: collapseHit.topicId,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
          emit('toggle-collapse', collapseHit.topicId);
          event.preventDefault();
          return;
        }
      }

      // Width handles on selected topics (before pan / topic-drag)
      const widthHit = hitTestTopicWidthHandle(world, layout);
      if (widthHit) {
        const node = layout.nodes.get(widthHit.topicId);
        if (node) {
          suppressNextClick = true;
          widthResizeDrag.value = {
            topicId: widthHit.topicId,
            edge: widthHit.edge,
            startClientX: event.clientX,
            originWidth: node.width,
            liveWidth: node.width,
            moved: false,
          };
          window.addEventListener('mousemove', onWidthResizeMove);
          window.addEventListener('mouseup', onWidthResizeEnd);
          event.preventDefault();
          return;
        }
      }

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

      // Stickers / illustrations: select + drag/resize; never start canvas pan
      const decoHit = hitTestDecorationAt(world, sheet);
      if (decoHit) {
        emit('select-structure', null);
        emit('select-decoration', decoHit.dec.id);
        decoDrag.value = {
          id: decoHit.dec.id,
          mode: decoHit.handle,
          startClientX: event.clientX,
          startClientY: event.clientY,
          origin: {
            x: decoHit.dec.x,
            y: decoHit.dec.y,
            width: decoHit.dec.width,
            height: decoHit.dec.height,
            rotation: decoHit.dec.rotation,
          },
          center:
            decoHit.handle === 'rotate'
              ? {
                  x: decoHit.rect.x + decoHit.rect.width / 2,
                  y: decoHit.rect.y + decoHit.rect.height / 2,
                }
              : undefined,
          moved: false,
        };
        decoLivePatch.value = null;
        window.addEventListener('mousemove', onDecorationDragMove);
        window.addEventListener('mouseup', onDecorationDragEnd);
        event.preventDefault();
        return;
      }

      // Marker sits outside the topic box — treat like topic so pan doesn't steal the click
      const markerHit = hitTestMarkerAt(world, sheet);
      if (markerHit) {
        emit('select-structure', null);
        return;
      }

      // Callout bubbles sit above topics; pick before topic so they remain clickable
      {
        const shapesLayer = buildFrame(sheet, layout).layers.find((l) => l.type === 'extra-shapes');
        const shapes =
          shapesLayer && shapesLayer.type === 'extra-shapes' ? shapesLayer.shapes : [];
        const calloutHit = hitTestCallout(world, shapes);
        if (calloutHit) {
          const topic = findTopicByCalloutId(sheet, calloutHit);
          suppressNextClick = true;
          emit('select-structure', { kind: 'callout', id: calloutHit });
          if (topic?.callout) {
            calloutDrag.value = {
              calloutId: calloutHit,
              topicId: topic.id,
              text: topic.callout.text,
              startClientX: event.clientX,
              startClientY: event.clientY,
              baseOffset: { ...topic.callout.offset },
              moved: false,
            };
            calloutLiveOffset.value = { ...topic.callout.offset };
            window.addEventListener('mousemove', onCalloutDragMove);
            window.addEventListener('mouseup', onCalloutDragEnd);
          }
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

function worldToDecorationLocal(
  world: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  rotationDeg: number,
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = world.x - cx;
  const dy = world.y - cy;
  const rad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function hitTestTopicWidthHandle(
  world: { x: number; y: number },
  layout: LayoutResult,
): { topicId: string; edge: 'left' | 'right' } | null {
  if (!props.selectedIds.length) return null;
  const pad = 8 / Math.max(props.viewport.zoom, 0.01);
  for (let i = props.selectedIds.length - 1; i >= 0; i--) {
    const id = props.selectedIds[i]!;
    const node = layout.nodes.get(id);
    if (!node || node.hidden) continue;
    const midY = node.y + node.height / 2;
    if (Math.abs(world.y - midY) > Math.max(node.height / 2, pad * 2)) continue;
    if (Math.abs(world.x - node.x) <= pad) return { topicId: id, edge: 'left' };
    if (Math.abs(world.x - (node.x + node.width)) <= pad) return { topicId: id, edge: 'right' };
  }
  return null;
}

function onWidthResizeMove(event: MouseEvent) {
  const drag = widthResizeDrag.value;
  if (!drag) return;
  const zoom = Math.max(props.viewport.zoom, 0.01);
  const dx = (event.clientX - drag.startClientX) / zoom;
  if (Math.abs(dx) > 1) drag.moved = true;
  const next =
    drag.edge === 'right' ? drag.originWidth + dx : drag.originWidth - dx;
  widthResizeDrag.value = {
    ...drag,
    liveWidth: Math.max(40, Math.round(next)),
  };
  draw();
}

function onWidthResizeEnd() {
  window.removeEventListener('mousemove', onWidthResizeMove);
  window.removeEventListener('mouseup', onWidthResizeEnd);
  const drag = widthResizeDrag.value;
  widthResizeDrag.value = null;
  if (drag?.moved) {
    suppressNextClick = true;
    emit('update-topic-width', { topicId: drag.topicId, width: drag.liveWidth });
  }
  draw();
}

function hitTestDecorationAt(
  world: { x: number; y: number },
  sheet: Sheet,
): {
  dec: (typeof sheet.decorations)[number];
  rect: { x: number; y: number; width: number; height: number };
  handle: DecorationDragMode;
} | null {
  const layout = registry.layout(sheet, measure);
  const pad = 10 / Math.max(props.viewport.zoom, 0.01);
  const rotateR = 10 / Math.max(props.viewport.zoom, 0.01);
  const rotateStem = 14 / Math.max(props.viewport.zoom, 0.01);
  for (let i = sheet.decorations.length - 1; i >= 0; i--) {
    const raw = sheet.decorations[i]!;
    const dec = decorationWithLivePatch(raw);
    const rect = resolveDecorationWorldRect(dec, layout.nodes);
    const local = worldToDecorationLocal(world, rect, dec.rotation);
    const hw = rect.width / 2;
    const hh = rect.height / 2;

    if (props.selectedDecorationId === dec.id) {
      // SE resize handle (local bottom-right)
      if (
        local.x >= hw - pad &&
        local.x <= hw + pad &&
        local.y >= hh - pad &&
        local.y <= hh + pad
      ) {
        return { dec, rect, handle: 'resize' };
      }
      // top-center rotate handle
      if (local.x ** 2 + (local.y + hh + rotateStem) ** 2 <= rotateR * rotateR) {
        return { dec, rect, handle: 'rotate' };
      }
    }

    if (local.x >= -hw && local.x <= hw && local.y >= -hh && local.y <= hh) {
      return { dec, rect, handle: 'move' };
    }
  }
  return null;
}

function onDecorationDragMove(event: MouseEvent) {
  const drag = decoDrag.value;
  if (!drag) return;
  const zoom = Math.max(props.viewport.zoom, 0.01);
  const dx = (event.clientX - drag.startClientX) / zoom;
  const dy = (event.clientY - drag.startClientY) / zoom;
  if (Math.hypot(dx, dy) > 2) drag.moved = true;

  if (drag.mode === 'move') {
    decoLivePatch.value = {
      x: drag.origin.x + dx,
      y: drag.origin.y + dy,
    };
  } else if (drag.mode === 'resize') {
    // Project pointer delta into the decoration's local axes so SE handle stays intuitive when rotated
    const rad = (drag.origin.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const localDx = dx * cos + dy * sin;
    const localDy = -dx * sin + dy * cos;
    decoLivePatch.value = {
      width: Math.max(24, drag.origin.width + localDx),
      height: Math.max(24, drag.origin.height + localDy),
    };
  } else if (drag.mode === 'rotate' && drag.center) {
    const world = worldFromEvent(event);
    if (world) {
      const ang =
        (Math.atan2(world.y - drag.center.y, world.x - drag.center.x) * 180) / Math.PI + 90;
      decoLivePatch.value = { rotation: ((ang % 360) + 360) % 360 };
    }
  }
  draw();
}

function onDecorationDragEnd() {
  window.removeEventListener('mousemove', onDecorationDragMove);
  window.removeEventListener('mouseup', onDecorationDragEnd);
  const drag = decoDrag.value;
  const patch = decoLivePatch.value;
  decoDrag.value = null;
  decoLivePatch.value = null;
  if (drag?.moved && patch) {
    suppressNextClick = true;
    emit('update-decoration', { id: drag.id, patch });
  }
  draw();
}

function onCalloutDragMove(event: MouseEvent) {
  const drag = calloutDrag.value;
  if (!drag) return;
  const zoom = Math.max(props.viewport.zoom, 0.01);
  const dx = (event.clientX - drag.startClientX) / zoom;
  const dy = (event.clientY - drag.startClientY) / zoom;
  if (Math.hypot(dx, dy) > 2) drag.moved = true;
  calloutLiveOffset.value = {
    x: drag.baseOffset.x + dx,
    y: drag.baseOffset.y + dy,
  };
  draw();
}

function onCalloutDragEnd() {
  window.removeEventListener('mousemove', onCalloutDragMove);
  window.removeEventListener('mouseup', onCalloutDragEnd);
  const drag = calloutDrag.value;
  const live = calloutLiveOffset.value;
  calloutDrag.value = null;
  calloutLiveOffset.value = null;
  if (drag?.moved && live) {
    suppressNextClick = true;
    emit('update-callout', { topicId: drag.topicId, offset: live });
  }
  draw();
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

      const markerHit = hitTestMarkerAt(world, props.sheet);
      if (markerHit) {
        emit('select', {
          id: markerHit.topicId,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        });
        const left =
          rect.left +
          (markerHit.hit.x + markerHit.hit.width / 2 - props.viewport.x) * props.viewport.zoom;
        const top =
          rect.top +
          (markerHit.hit.y + markerHit.hit.height - props.viewport.y) * props.viewport.zoom;
        emit('edit-marker', {
          topicId: markerHit.topicId,
          markerId: markerHit.markerId,
          left,
          top,
        });
        return;
      }

      {
        const layout = registry.layout(props.sheet, measure);
        const collapseHit = hitTestCollapseButton(world, props.sheet, layout);
        if (collapseHit) {
          emit('select', {
            id: collapseHit.topicId,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
          emit('toggle-collapse', collapseHit.topicId);
          return;
        }
      }

      const decoHit = hitTestDecorationAt(world, props.sheet);
      if (decoHit) {
        emit('select-decoration', decoHit.dec.id);
        return;
      }

      {
        const layout = registry.layout(props.sheet, measure);
        const shapesLayer = buildFrame(props.sheet, layout).layers.find((l) => l.type === 'extra-shapes');
        const shapes =
          shapesLayer && shapesLayer.type === 'extra-shapes' ? shapesLayer.shapes : [];
        const calloutHit = hitTestCallout(world, shapes);
        if (calloutHit) {
          emit('select-structure', { kind: 'callout', id: calloutHit });
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

function onMouseMoveHover(event: MouseEvent) {
  if (widthResizeDrag.value || decoDrag.value || calloutDrag.value) return;
  const sheet = props.sheet;
  if (!sheet) {
    if (widthHandleHover.value) widthHandleHover.value = false;
    if (collapseHover.value) collapseHover.value = false;
    return;
  }
  const world = worldFromEvent(event);
  if (!world) return;
  const layout = registry.layout(sheet, measure);

  const collapseHit = hitTestCollapseButton(world, sheet, layout);
  const nextCollapse = !!collapseHit;
  if (collapseHover.value !== nextCollapse) collapseHover.value = nextCollapse;
  if (nextCollapse) {
    if (widthHandleHover.value) widthHandleHover.value = false;
    return;
  }

  if (!props.selectedIds.length) {
    if (widthHandleHover.value) widthHandleHover.value = false;
    return;
  }
  const hit = hitTestTopicWidthHandle(world, layout);
  const next = !!hit;
  if (widthHandleHover.value !== next) widthHandleHover.value = next;
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
  () => [
    props.sheet,
    props.viewport,
    props.selectedIds,
    props.selectedStructure,
    props.selectedDecorationId,
    props.alignGuides,
  ],
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
    @mousemove="onMouseMoveHover"
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
