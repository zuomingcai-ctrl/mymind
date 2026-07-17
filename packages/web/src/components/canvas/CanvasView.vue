<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import {
  createDefaultLayoutRegistry,
  createMeasureFn,
  buildFrame,
  hitTestTopic,
  getTheme,
  strokeEdge,
  drawExtraShape,
  markerGlyph,
  type Viewport,
  type Sheet,
  type TopicStyle,
  type EdgeStyle,
} from '@mymind/core';
import { useCanvasPan } from '../../composables/useCanvasPan';

const props = defineProps<{
  sheet: Sheet | null;
  viewport: Viewport;
  selectedIds: string[];
  /** When set, only these topic ids (and paths) are drawn */
  visibleTopicIds?: Set<string> | null;
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
  topic: { title: string; markers?: string[]; style?: TopicStyle },
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

  if (merged.shape === 'none' || node.display === 'underline') {
    const lineY = node.y + node.height - 1;
    ctx.strokeStyle = merged.borderColor ?? '#888888';
    ctx.lineWidth = merged.borderWidth ?? 1;
    ctx.beginPath();
    ctx.moveTo(node.x, lineY);
    ctx.lineTo(node.x + node.width, lineY);
    ctx.stroke();
    fillTopicText(ctx, displayTitle, node, merged, ff, 'left');
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

  fillTopicText(ctx, displayTitle, node, merged, ff, merged.textAlign ?? 'center');
  drawMarkers(ctx, topic.markers ?? [], node.x + node.width + 4, node.y + 4);
}

function fillTopicText(
  ctx: CanvasRenderingContext2D,
  title: string,
  node: { x: number; y: number; width: number; height: number },
  style: TopicStyle,
  fontFamily: string,
  align: 'left' | 'center' | 'right',
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
  ctx.fillText(title, x, node.y + node.height / 2);
  if (style.textDecoration === 'underline' || style.textDecoration === 'line-through') {
    const metrics = ctx.measureText(title);
    const tw = metrics.width;
    const left = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
    const y =
      style.textDecoration === 'line-through'
        ? node.y + node.height / 2
        : node.y + node.height / 2 + (style.fontSize ?? 14) / 2;
    ctx.beginPath();
    ctx.strokeStyle = style.fontColor ?? '#333';
    ctx.lineWidth = 1;
    ctx.moveTo(left, y);
    ctx.lineTo(left + tw, y);
    ctx.stroke();
  }
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
    ctx.restore();
  }

  for (const layer of frame.layers) {
    if (layer.type === 'background') continue;
    if (layer.type === 'extra-shapes') {
      for (const shape of layer.shapes) {
        drawExtraShape(ctx, shape, { roundRect });
      }
    }
    if (layer.type === 'edges') {
      for (const edge of layer.edges) {
        strokeEdge(ctx, edge, {
          color: theme.edge.color,
          width: theme.edge.width,
          lineType,
          dash: sheet.canvasSettings.handDrawn ? [3, 2] : theme.edge.dash,
        });
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

  ctx.restore();
  emit('resize', w, h);
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

function onMouseDown(event: MouseEvent) {
  const hitId = hitTopicAt(event);
  const rootId = props.sheet?.rootTopic.id ?? null;
  if (hitId && hitId !== rootId && event.button === 0 && !event.shiftKey && !event.ctrlKey) {
    dragState.value = { topicId: hitId, startX: event.clientX, startY: event.clientY, dragging: false };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }
  onPointerDown(event, hitId, rootId);
}

function onDragMove(event: MouseEvent) {
  if (!dragState.value) return;
  const dx = event.clientX - dragState.value.startX;
  const dy = event.clientY - dragState.value.startY;
  if (!dragState.value.dragging && Math.hypot(dx, dy) > 6) {
    dragState.value = { ...dragState.value, dragging: true };
  }
}

function onDragEnd(event: MouseEvent) {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  const state = dragState.value;
  dragState.value = null;
  if (!state?.dragging || !props.sheet) return;
  const dropParent = hitTopicAt(event);
  if (!dropParent || dropParent === state.topicId) return;
  // prevent dropping onto descendant
  const layout = registry.layout(props.sheet, measure);
  void layout;
  const parentTopic = findTopicDeep(props.sheet.rootTopic, dropParent);
  if (!parentTopic) return;
  if (isDescendant(parentTopic, state.topicId)) return;
  emit('move-topic', {
    topicId: state.topicId,
    newParentId: dropParent,
    newIndex: parentTopic.children.length,
  });
}

function findTopicDeep(root: import('@mymind/core').Topic, id: string): import('@mymind/core').Topic | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const f = findTopicDeep(c, id);
    if (f) return f;
  }
  return null;
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
  pickTopic(event, (hit) => emitSelect(event, hit));
}

function onDblClick(event: MouseEvent) {
  pickTopic(event, (hit, node, canvas) => {
    if (!hit || !node) return;
    emitSelect(event, hit);
    const rect = canvas.getBoundingClientRect();
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

watch(() => [props.sheet, props.viewport, props.selectedIds], draw, { deep: true });

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
