<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {
  createDefaultLayoutRegistry,
  createMeasureFn,
  type Sheet,
  type Viewport,
} from '@mymind/core';

const props = defineProps<{
  sheet: Sheet | null;
  viewport: Viewport;
  viewWidth: number;
  viewHeight: number;
}>();

const emit = defineEmits<{
  navigate: [x: number, y: number];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const registry = createDefaultLayoutRegistry();
const measure = createMeasureFn();

function draw() {
  const canvas = canvasRef.value;
  if (!canvas || !props.sheet) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);

  const layout = registry.layout(props.sheet, measure);
  const { bounds } = layout;
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const scale = Math.min(w / (bounds.width + 40), h / (bounds.height + 40));
  const ox = -bounds.x * scale + 10;
  const oy = -bounds.y * scale + 10;

  ctx.fillStyle = '#c5d9f0';
  for (const node of layout.nodes.values()) {
    if (node.hidden) continue;
    ctx.fillRect(ox + node.x * scale, oy + node.y * scale, Math.max(2, node.width * scale), Math.max(2, node.height * scale));
  }

  // viewport rect
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    ox + props.viewport.x * scale,
    oy + props.viewport.y * scale,
    (props.viewWidth / props.viewport.zoom) * scale,
    (props.viewHeight / props.viewport.zoom) * scale,
  );
}

function onClick(e: MouseEvent) {
  if (!props.sheet || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const layout = registry.layout(props.sheet, measure);
  const { bounds } = layout;
  const scale = Math.min(140 / (bounds.width + 40), 100 / (bounds.height + 40));
  const ox = -bounds.x * scale + 10;
  const oy = -bounds.y * scale + 10;
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const worldX = (mx - ox) / scale;
  const worldY = (my - oy) / scale;
  emit('navigate', worldX - props.viewWidth / props.viewport.zoom / 2, worldY - props.viewHeight / props.viewport.zoom / 2);
}

watch(() => [props.sheet, props.viewport, props.viewWidth, props.viewHeight], draw, { deep: true });
onMounted(draw);
</script>

<template>
  <canvas ref="canvasRef" class="minimap" width="140" height="100" title="小地图" @click="onClick" />
</template>

<style scoped>
.minimap {
  position: absolute;
  right: 12px;
  bottom: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  z-index: 5;
}
</style>
