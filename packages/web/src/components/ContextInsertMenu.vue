<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import type { Sheet } from '@mymind/core';
import {
  LINK_SUBMENU,
  insertItemLabel,
  isInsertEnabled,
  type InsertActionId,
} from '../insert/insert-items';

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  sheet: Sheet | null;
  selection: string[];
}>();

const emit = defineEmits<{
  insert: [id: InsertActionId];
  close: [];
}>();

const enableCtx = computed(() => ({
  sheet: props.sheet,
  selection: props.selection,
  rootId: props.sheet?.rootTopic.id ?? null,
}));

const primaryItems: InsertActionId[] = [
  'zone',
  'note',
  'label',
  'callout',
  'comment',
  'todo',
  'task',
  'attachment',
  'sticker',
  'illustration',
  'image',
  'equation',
];

function enabled(id: InsertActionId): boolean {
  return isInsertEnabled(id, enableCtx.value);
}

function onPick(id: InsertActionId) {
  if (!enabled(id)) return;
  emit('insert', id);
  emit('close');
}

function onDocClick() {
  if (props.visible) emit('close');
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick);
});
</script>

<template>
  <div
    v-if="visible"
    class="ctx-menu"
    data-testid="context-insert-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mousedown.stop
  >
    <div class="ctx-title">插入</div>
    <button
      v-for="id in primaryItems"
      :key="id"
      type="button"
      class="ctx-item"
      :disabled="!enabled(id)"
      @click="onPick(id)"
    >
      {{ insertItemLabel(id) }}
    </button>
    <div class="ctx-sep" />
    <div class="ctx-title">链接</div>
    <button
      v-for="id in LINK_SUBMENU"
      :key="id"
      type="button"
      class="ctx-item"
      :disabled="!enabled(id)"
      @click="onPick(id)"
    >
      {{ insertItemLabel(id) }}
    </button>
  </div>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 50;
  min-width: 160px;
  max-height: 70vh;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  border-radius: 4px;
}
.ctx-title {
  padding: 4px 12px;
  font-size: 11px;
  color: #888;
}
.ctx-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}
.ctx-item:hover:not(:disabled) {
  background: #f0f4f8;
}
.ctx-item:disabled {
  color: #bbb;
  cursor: not-allowed;
}
.ctx-sep {
  height: 1px;
  background: #eee;
  margin: 4px 0;
}
</style>
