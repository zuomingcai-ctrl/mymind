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

function onPick(id: string) {
  const actionId = id as InsertActionId;
  if (!enabled(actionId)) return;
  emit('insert', actionId);
  emit('close');
}

function onDocClick(e: MouseEvent) {
  if (!props.visible) return;
  const t = e.target as HTMLElement | null;
  if (t?.closest?.('[data-testid="context-insert-menu"]')) return;
  emit('close');
}

onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <el-card
    v-if="visible"
    class="ctx-menu"
    data-testid="context-insert-menu"
    shadow="always"
    :body-style="{ padding: '4px 0' }"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @mousedown.stop
  >
    <el-menu class="ctx-el-menu" @select="onPick">
      <el-menu-item-group title="插入">
        <el-menu-item
          v-for="id in primaryItems"
          :key="id"
          :index="id"
          :disabled="!enabled(id)"
        >
          {{ insertItemLabel(id) }}
        </el-menu-item>
      </el-menu-item-group>
      <el-divider style="margin: 4px 0" />
      <el-menu-item-group title="链接">
        <el-menu-item
          v-for="id in LINK_SUBMENU"
          :key="id"
          :index="id"
          :disabled="!enabled(id)"
        >
          {{ insertItemLabel(id) }}
        </el-menu-item>
      </el-menu-item-group>
    </el-menu>
  </el-card>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 50;
  min-width: 168px;
  max-height: 70vh;
  overflow-y: auto;
  border: none;
}
.ctx-el-menu {
  border-right: none;
}
.ctx-el-menu :deep(.el-menu-item) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}
.ctx-el-menu :deep(.el-menu-item-group__title) {
  padding: 4px 16px;
  font-size: 11px;
}
</style>
