<script setup lang="ts">
import { computed } from 'vue';
import type { StructureVariantPreview } from '@mymind/core';

const props = defineProps<{
  preview: StructureVariantPreview;
  selected?: boolean;
  pro?: boolean;
}>();

const strokeW = computed(() => (props.preview.thickBorder ? 1.8 : 1.2));
const strokeColor = computed(() => (props.preview.nodeStyle === 'ghost' ? '#c8c8c8' : '#333'));
const fillColor = computed(() => {
  if (props.preview.nodeStyle === 'ghost') return '#e8e8e8';
  if (props.preview.nodeStyle === 'filled') return '#d0d0d0';
  return 'none';
});

type Pt = { x: number; y: number };

function drawShape(
  shape: StructureVariantPreview['centralShape'] | StructureVariantPreview['branchShape'],
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    return `M ${x + r} ${y} A ${r} ${r} 0 1 1 ${x + r} ${y + 0.01} Z`;
  }
  if (shape === 'ellipse') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = x + rx;
    const cy = y + ry;
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
  }
  const r = shape === 'rounded' ? Math.min(4, h / 2) : 0;
  return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

function curvePath(from: Pt, to: Pt, handDrawn?: boolean): string {
  const dx = to.x - from.x;
  const offset = Math.max(Math.abs(dx) * 0.45, 6);
  const sign = dx >= 0 ? 1 : -1;
  const c1 = { x: from.x + sign * offset, y: from.y };
  const c2 = { x: to.x - sign * offset, y: to.y };
  if (handDrawn) {
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + ((from.y + to.y) % 2 === 0 ? 1 : -1) };
    return `M ${from.x} ${from.y} Q ${c1.x} ${c1.y + 1} ${mid.x} ${mid.y} T ${to.x} ${to.y}`;
  }
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`;
}

function polylinePath(from: Pt, to: Pt): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

function straightPath(from: Pt, to: Pt): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function connect(from: Pt, to: Pt, lineType: StructureVariantPreview['lineType'], handDrawn?: boolean): string {
  if (lineType === 'curve') return curvePath(from, to, handDrawn);
  if (lineType === 'polyline') return polylinePath(from, to);
  return straightPath(from, to);
}

interface NodeDef {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: StructureVariantPreview['branchShape'];
}

interface Scene {
  central: { x: number; y: number; w: number; h: number };
  nodes: NodeDef[];
  edges: { from: Pt; to: Pt }[];
  extras: string[];
}

function buildScene(preview: StructureVariantPreview): Scene {
  const central = { x: 42, y: 32, w: 16, h: 10 };
  const nodes: NodeDef[] = [];
  const edges: { from: Pt; to: Pt }[] = [];
  const extras: string[] = [];
  const bs = preview.branchShape;
  const branch = (x: number, y: number, w = 14, h = 6) => ({ x, y, w, h, shape: bs });

  switch (preview.layout) {
    case 'radial': {
      const left = [branch(8, 18), branch(6, 32), branch(8, 46)];
      const right = [branch(78, 16), branch(80, 30), branch(78, 44)];
      nodes.push(...left, ...right);
      for (const n of left) {
        edges.push({ from: { x: central.x, y: central.y + central.h / 2 }, to: { x: n.x + n.w, y: n.y + n.h / 2 } });
      }
      for (const n of right) {
        edges.push({ from: { x: central.x + central.w, y: central.y + central.h / 2 }, to: { x: n.x, y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'radial-right': {
      const right = [branch(72, 18), branch(74, 32), branch(72, 46)];
      nodes.push(...right);
      for (const n of right) {
        edges.push({ from: { x: central.x + central.w, y: central.y + central.h / 2 }, to: { x: n.x, y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'horizontal': {
      central.x = 10;
      central.y = 30;
      central.w = 14;
      nodes.push(branch(34, 22, 12, 6), branch(56, 36, 12, 6), branch(78, 24, 12, 6));
      let prev = { x: central.x + central.w, y: central.y + central.h / 2 };
      for (const n of nodes) {
        const to = { x: n.x, y: n.y + n.h / 2 };
        edges.push({ from: prev, to });
        prev = { x: n.x + n.w, y: n.y + n.h / 2 };
      }
      break;
    }
    case 'horizontal-brace': {
      central.x = 4;
      central.y = 28;
      central.w = 12;
      central.h = 8;
      const mids = [
        { x: 22, y: 10, w: 8, h: 5 },
        { x: 22, y: 28, w: 8, h: 5 },
        { x: 22, y: 46, w: 8, h: 5 },
      ];
      for (const m of mids) {
        edges.push({
          from: { x: central.x + central.w, y: central.y + central.h / 2 },
          to: { x: m.x, y: m.y + m.h / 2 },
        });
        extras.push(
          `M ${m.x + m.w + 2} ${m.y} C ${m.x + m.w + 8} ${m.y} ${m.x + m.w + 8} ${m.y + m.h} ${m.x + m.w + 2} ${m.y + m.h}`,
        );
        for (let i = 0; i < 3; i++) {
          const ly = m.y + 1 + i * 1.5;
          nodes.push({ x: m.x + m.w + 12, y: ly, w: 18, h: 1.2, shape: bs });
          edges.push({
            from: { x: m.x + m.w + 10, y: m.y + m.h / 2 },
            to: { x: m.x + m.w + 12, y: ly },
          });
        }
      }
      break;
    }
    case 'horizontal-underline': {
      central.x = 8;
      central.y = 30;
      central.w = 12;
      central.h = 6;
      const lines = [
        { x: 30, y: 16, w: 20 },
        { x: 52, y: 30, w: 18 },
        { x: 74, y: 44, w: 16 },
      ];
      let prev = { x: central.x + central.w, y: central.y + central.h / 2 };
      for (const ln of lines) {
        const to = { x: ln.x, y: ln.y };
        edges.push({ from: prev, to });
        extras.push(`M ${ln.x} ${ln.y} H ${ln.x + ln.w}`);
        prev = { x: ln.x + ln.w, y: ln.y };
      }
      break;
    }
    case 'horizontal-left': {
      central.x = 76;
      central.y = 30;
      nodes.push(branch(54, 22, 12, 6), branch(32, 36, 12, 6), branch(10, 24, 12, 6));
      let prev = { x: central.x, y: central.y + central.h / 2 };
      for (const n of nodes) {
        const to = { x: n.x + n.w, y: n.y + n.h / 2 };
        edges.push({ from: prev, to });
        prev = { x: n.x, y: n.y + n.h / 2 };
      }
      break;
    }
    case 'vertical': {
      central.x = 42;
      central.y = 8;
      nodes.push(branch(24, 30, 14, 6), branch(62, 30, 14, 6), branch(34, 52, 12, 6), branch(54, 52, 12, 6));
      for (const n of nodes.slice(0, 2)) {
        edges.push({
          from: { x: central.x + central.w / 2, y: central.y + central.h },
          to: { x: n.x + n.w / 2, y: n.y },
        });
      }
      for (const n of nodes.slice(2)) {
        edges.push({
          from: { x: nodes[0]!.x + nodes[0]!.w / 2, y: nodes[0]!.y + nodes[0]!.h },
          to: { x: n.x + n.w / 2, y: n.y },
        });
      }
      break;
    }
    case 'vertical-up': {
      central.x = 42;
      central.y = 58;
      nodes.push(branch(24, 34, 14, 6), branch(62, 34, 14, 6));
      for (const n of nodes) {
        edges.push({
          from: { x: central.x + central.w / 2, y: central.y },
          to: { x: n.x + n.w / 2, y: n.y + n.h },
        });
      }
      break;
    }
    case 'org': {
      central.x = 38;
      central.y = 6;
      central.w = 24;
      nodes.push(branch(10, 28, 16, 6), branch(42, 28, 16, 6), branch(74, 28, 16, 6));
      for (const n of nodes) {
        edges.push({
          from: { x: central.x + central.w / 2, y: central.y + central.h },
          to: { x: n.x + n.w / 2, y: n.y },
        });
      }
      break;
    }
    case 'timeline-h': {
      central.x = 8;
      central.y = 34;
      extras.push(`M 8 42 H 92`);
      nodes.push(branch(22, 22, 12, 5), branch(48, 50, 12, 5), branch(74, 22, 12, 5));
      for (const n of nodes) {
        edges.push({ from: { x: n.x + n.w / 2, y: 42 }, to: { x: n.x + n.w / 2, y: n.y + (n.y < 34 ? n.h : 0) } });
      }
      break;
    }
    case 'timeline-v': {
      central.x = 44;
      central.y = 8;
      extras.push(`M 50 8 V 58`);
      nodes.push(branch(18, 24, 12, 5), branch(68, 38, 12, 5), branch(18, 50, 12, 5));
      for (const n of nodes) {
        edges.push({ from: { x: 50, y: n.y + n.h / 2 }, to: { x: n.x + (n.x < 50 ? n.w : 0), y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'fishbone': {
      central.x = 8;
      central.y = 34;
      central.w = 20;
      extras.push(`M 28 37 H 88`);
      nodes.push(branch(40, 16, 12, 5), branch(58, 48, 12, 5), branch(74, 20, 12, 5));
      for (const n of nodes) {
        edges.push({ from: { x: 28 + (n.y < 34 ? 12 : 24), y: 37 }, to: { x: n.x, y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'matrix': {
      central.x = 42;
      central.y = 4;
      central.w = 16;
      central.h = 8;
      extras.push('M 18 22 H 82 M 18 22 V 58 M 82 22 V 58 M 18 40 H 82');
      nodes.push(branch(22, 26, 10, 5), branch(56, 26, 10, 5), branch(22, 44, 10, 5), branch(56, 44, 10, 5));
      break;
    }
    case 'brace-left': {
      central.x = 58;
      central.y = 28;
      nodes.push(branch(12, 20, 14, 6), branch(12, 36), branch(12, 52, 14, 6));
      extras.push('M 48 18 Q 40 18 40 28 Q 40 38 40 48 Q 40 58 48 58');
      for (const n of nodes) {
        edges.push({ from: { x: 48, y: n.y + n.h / 2 }, to: { x: n.x + n.w, y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'brace-right': {
      central.x = 28;
      central.y = 28;
      nodes.push(branch(72, 20, 14, 6), branch(72, 36), branch(72, 52, 14, 6));
      extras.push('M 52 18 Q 60 18 60 28 Q 60 38 60 48 Q 60 58 52 58');
      for (const n of nodes) {
        edges.push({ from: { x: 52, y: n.y + n.h / 2 }, to: { x: n.x, y: n.y + n.h / 2 } });
      }
      break;
    }
    case 'tree-table': {
      central.x = 10;
      central.y = 14;
      central.w = 80;
      central.h = 8;
      extras.push('M 10 30 H 90 M 10 42 H 90 M 10 54 H 90');
      nodes.push(branch(14, 32, 20, 4), branch(14, 44, 28, 4), branch(30, 56, 24, 4));
      break;
    }
  }

  return { central, nodes, edges, extras };
}

const scene = computed(() => buildScene(props.preview));
const edgePaths = computed(() =>
  scene.value.edges.map((e) =>
    connect(e.from, e.to, props.preview.lineType, props.preview.handDrawn),
  ),
);

const showCentral = computed(
  () => props.preview.layout !== 'horizontal-underline' || props.preview.nodeStyle !== 'line',
);
const showBranches = computed(
  () => props.preview.nodeStyle !== 'line' || props.preview.layout === 'horizontal-brace',
);
</script>

<template>
  <div class="thumb" :class="{ selected }">
    <span v-if="pro" class="pro-badge">PRO</span>
    <span v-if="preview.handDrawn" class="sketch-badge" aria-hidden="true">〜</span>
    <svg viewBox="0 0 100 64" class="thumb-svg" aria-hidden="true">
      <path
        v-for="(d, i) in scene.extras"
        :key="'extra-' + i"
        :d="d"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="strokeW"
        stroke-linecap="round"
      />
      <path
        v-for="(d, i) in edgePaths"
        :key="'edge-' + i"
        :d="d"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="strokeW"
        stroke-linecap="round"
        :stroke-dasharray="preview.handDrawn ? '2 1.5' : undefined"
      />
      <path
        v-if="showCentral"
        :d="drawShape(preview.centralShape, scene.central.x, scene.central.y, scene.central.w, scene.central.h)"
        :fill="fillColor"
        :stroke="preview.nodeStyle === 'ghost' ? 'none' : strokeColor"
        :stroke-width="strokeW"
      />
      <template v-if="showBranches">
        <path
          v-for="(n, i) in scene.nodes"
          :key="'node-' + i"
          :d="
            n.h <= 2
              ? `M ${n.x} ${n.y + n.h / 2} H ${n.x + n.w}`
              : drawShape(n.shape, n.x, n.y, n.w, n.h)
          "
          :fill="n.h <= 2 ? 'none' : fillColor"
          :stroke="preview.nodeStyle === 'ghost' && n.h > 2 ? 'none' : strokeColor"
          :stroke-width="n.h <= 2 ? strokeW : strokeW"
        />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.thumb {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  padding: 6px 4px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.thumb:hover {
  border-color: #b0b0b0;
}
.thumb.selected {
  border: 2px solid #404040;
  padding: 5px 3px;
}
.thumb-svg {
  display: block;
  width: 100%;
  height: auto;
}
.pro-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: #000;
  color: #fff;
  font-size: 8px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1.2;
  z-index: 1;
}
.sketch-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  color: #999;
  font-size: 11px;
  line-height: 1;
  z-index: 1;
}
</style>
