<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import { getMarker, listMarkers, markerGlyph, type MarkerPreset } from '@mymind/core';

const props = defineProps<{
  topicId: string;
  markerId: string;
  /** Anchor center X in viewport (client) coords */
  left: number;
  /** Anchor bottom Y in viewport (client) coords — popover sits below */
  top: number;
}>();

const emit = defineEmits<{
  switch: [markerId: string];
  remove: [];
  close: [];
}>();

const siblings = computed((): MarkerPreset[] => {
  const cat = getMarker(props.markerId)?.category;
  if (!cat) return [];
  return listMarkers(cat);
});

function onDocPointerDown(e: PointerEvent) {
  const el = e.target as HTMLElement | null;
  if (el?.closest?.('[data-marker-popover]')) return;
  emit('close');
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('pointerdown', onDocPointerDown, true);
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  window.removeEventListener('pointerdown', onDocPointerDown, true);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div
    class="marker-popover"
    data-marker-popover
    data-testid="marker-edit-popover"
    :style="{ left: `${left}px`, top: `${top}px` }"
    role="dialog"
    aria-label="编辑标记"
    @mousedown.stop
  >
    <div class="caret" />
    <div class="row">
      <button
        v-for="m in siblings"
        :key="m.id"
        type="button"
        class="mark-btn"
        :class="{ active: m.id === markerId }"
        :title="m.label"
        @click="emit('switch', m.id)"
      >
        {{ markerGlyph(m.id) }}
      </button>
      <span class="sep" />
      <button type="button" class="mark-btn danger" title="删除标记" @click="emit('remove')">
        <el-icon :size="16"><Delete /></el-icon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.marker-popover {
  position: fixed;
  z-index: 4000;
  transform: translate(-50%, 8px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
}
.caret {
  position: absolute;
  top: -6px;
  left: 50%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  background: #fff;
  border-left: 1px solid var(--el-border-color-lighter);
  border-top: 1px solid var(--el-border-color-lighter);
  transform: rotate(45deg);
}
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}
.mark-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--el-text-color-primary);
}
.mark-btn:hover {
  background: var(--el-fill-color-light);
}
.mark-btn.active {
  background: var(--el-color-primary-light-9);
}
.mark-btn.danger {
  color: var(--el-color-danger);
}
.sep {
  width: 1px;
  height: 18px;
  background: var(--el-border-color);
  margin: 0 4px;
}
</style>
