<script setup lang="ts">
import { computed } from 'vue';
import { getMarker, type MarkerPreset } from '@mymind/core';

const props = withDefaults(
  defineProps<{
    markerId?: string;
    preset?: MarkerPreset;
    size?: number;
  }>(),
  { size: 24 },
);

const m = computed(() => props.preset ?? (props.markerId ? getMarker(props.markerId) : undefined));

const view = 24;
const cx = 12;
const cy = 12;
const r = 10.5;

const progressFraction = computed(() => m.value?.value ?? 0);

/** SVG arc path for progress pie (from 12 o'clock, clockwise). */
const piePath = computed(() => {
  const f = Math.max(0, Math.min(1, progressFraction.value));
  if (f <= 0 || f >= 1) return '';
  const start = -Math.PI / 2;
  const end = start + f * Math.PI * 2;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = f > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
});
</script>

<template>
  <svg
    v-if="m"
    class="marker-icon"
    :width="size"
    :height="size"
    :viewBox="`0 0 ${view} ${view}`"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Progress (task) -->
    <template v-if="m.icon === 'progress'">
      <template v-if="progressFraction >= 1">
        <circle :cx="cx" :cy="cy" :r="r" :fill="m.color" />
        <path
          d="M7.2 12.2 L10.4 15.2 L16.8 8.6"
          fill="none"
          stroke="#fff"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>
      <template v-else>
        <circle
          :cx="cx"
          :cy="cy"
          :r="r - 1"
          fill="none"
          :stroke="m.color"
          stroke-width="2"
        />
        <path v-if="progressFraction > 0" :d="piePath" :fill="m.color" />
        <path
          v-else
          d="M10.2 8.2 L10.2 15.8 L16.2 12 Z"
          :fill="m.color"
        />
      </template>
    </template>

    <!-- Solid badge + white glyph -->
    <template v-else>
      <circle :cx="cx" :cy="cy" :r="r" :fill="m.color" />

      <text
        v-if="m.icon === 'number'"
        :x="cx"
        :y="cy + 0.5"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#fff"
        font-size="13"
        font-weight="700"
        font-family="system-ui, sans-serif"
      >
        {{ m.value }}
      </text>

      <template v-else-if="m.icon === 'flag'">
        <line x1="8" y1="6" x2="8" y2="18" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        <path d="M8.4 6.2 L16.5 8.8 L8.4 11.4 Z" fill="#fff" />
      </template>

      <path
        v-else-if="m.icon === 'star'"
        d="M12 5.2 L13.6 9.6 L18.4 10 L14.8 13.2 L15.9 17.8 L12 15.4 L8.1 17.8 L9.2 13.2 L5.6 10 L10.4 9.6 Z"
        fill="#fff"
      />

      <template v-else-if="m.icon === 'person'">
        <circle cx="12" cy="8.5" r="3.2" fill="#fff" />
        <path d="M6.2 18.5 Q6.2 12.8 12 12.8 Q17.8 12.8 17.8 18.5 Z" fill="#fff" />
      </template>

      <path
        v-else-if="m.icon === 'heart'"
        d="M12 17.2 C8 14.2 5.5 11.5 5.5 9.2 C5.5 7.2 7 5.8 9 5.8 C10.2 5.8 11.3 6.4 12 7.4 C12.7 6.4 13.8 5.8 15 5.8 C17 5.8 18.5 7.2 18.5 9.2 C18.5 11.5 16 14.2 12 17.2 Z"
        fill="#fff"
      />

      <template v-else-if="m.icon === 'thumbs-up'">
        <rect x="8" y="11" width="7" height="6.5" rx="1" fill="#fff" />
        <path d="M10.5 11 Q10.5 6 14 6 Q15.5 6 15.2 11 Z" fill="#fff" />
      </template>

      <template v-else-if="m.icon === 'thumbs-down'">
        <rect x="8" y="6.5" width="7" height="6.5" rx="1" fill="#fff" />
        <path d="M10.5 13 Q10.5 18 14 18 Q15.5 18 15.2 13 Z" fill="#fff" />
      </template>

      <template v-else-if="m.icon === 'pin'">
        <circle cx="12" cy="10" r="3.5" fill="#fff" />
        <line x1="12" y1="13.2" x2="12" y2="18.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
      </template>

      <template v-else-if="m.icon === 'bulb'">
        <path d="M12 5.5 A4.2 4.2 0 0 1 15.5 12.5 L14 15 H10 L8.5 12.5 A4.2 4.2 0 0 1 12 5.5 Z" fill="#fff" />
        <rect x="10" y="15.2" width="4" height="2.4" rx="0.4" fill="#fff" />
      </template>

      <path
        v-else-if="m.icon === 'bolt'"
        d="M13.2 4.5 L8.5 12.5 H12 L10.8 19.5 L17 10.5 H13.2 Z"
        fill="#fff"
      />

      <template v-else-if="m.icon === 'hourglass'">
        <path d="M7.5 6.5 H16.5 L12 12 Z" fill="#fff" />
        <path d="M12 12 L16.5 17.5 H7.5 Z" fill="#fff" />
      </template>

      <path
        v-else-if="m.icon === 'phone'"
        d="M8 9.5 C7.2 14.5 10.5 17.5 14 17 C15.5 14.5 14.5 12.5 13 12 L11.5 10.2 Z"
        fill="#fff"
      />

      <g v-else-if="m.icon === 'pencil'" transform="rotate(-40 12 12)">
        <rect x="10.5" y="5.5" width="3" height="11" rx="0.4" fill="#fff" />
        <path d="M10.5 16.5 L12 19 L13.5 16.5 Z" fill="#fff" />
      </g>

      <template v-else-if="m.icon === 'music'">
        <circle cx="9.5" cy="15.5" r="2.4" fill="#fff" />
        <circle cx="15.5" cy="14" r="2.2" fill="#fff" />
        <rect x="10.8" y="6" width="1.8" height="9" fill="#fff" />
        <rect x="16.5" y="5" width="1.8" height="9" fill="#fff" />
        <path d="M10.8 6 L18.3 5 L18.3 7.5 L10.8 8.5 Z" fill="#fff" />
      </template>

      <template v-else-if="m.icon === 'gamepad'">
        <rect x="5.5" y="9" width="13" height="7" rx="2.5" fill="#fff" />
      </template>

      <template v-else-if="m.icon === 'hundred'">
        <text
          x="12"
          y="11.5"
          text-anchor="middle"
          dominant-baseline="central"
          fill="#fff"
          font-size="8"
          font-weight="800"
          font-family="system-ui, sans-serif"
        >
          100
        </text>
        <line x1="7.5" y1="16" x2="16.5" y2="16" stroke="#fff" stroke-width="1.4" />
      </template>

      <path
        v-else-if="m.icon === 'plane'"
        d="M18.5 12 L7 7.5 L9.5 12 L7 16.5 Z"
        fill="#fff"
      />

      <template v-else-if="m.icon === 'run'">
        <circle cx="11.5" cy="7" r="2.2" fill="#fff" />
        <path
          d="M9.5 10.5 L14 12.5 L11.5 18"
          fill="none"
          stroke="#fff"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M14 12.5 L17 9.5"
          fill="none"
          stroke="#fff"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </template>

      <text
        v-else-if="m.icon === 'exclaim' || m.icon === 'question'"
        :x="cx"
        :y="cy + 0.8"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#fff"
        font-size="14"
        font-weight="800"
        font-family="system-ui, sans-serif"
      >
        {{ m.icon === 'exclaim' ? '!' : '?' }}
      </text>
    </template>
  </svg>
</template>

<style scoped>
.marker-icon {
  display: block;
  flex-shrink: 0;
}
</style>
