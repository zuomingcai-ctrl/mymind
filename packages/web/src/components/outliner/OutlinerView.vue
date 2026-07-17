<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Sheet } from '@mymind/core';
import { UpdateTopicTitleCommand, ToggleCollapseCommand, findParentOfTopic } from '@mymind/core';
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue';
import { useDocument } from '../../composables/useDocument';

const props = defineProps<{
  sheet: Sheet | null;
  selectedIds: string[];
}>();

const emit = defineEmits<{
  select: [
    payload: {
      id: string;
      shiftKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
    },
  ];
  move: [payload: { topicId: string; newParentId: string; newIndex: number }];
}>();

const selectedSet = computed(() => new Set(props.selectedIds));
const { dispatch } = useDocument();

interface Row {
  id: string;
  title: string;
  depth: number;
  collapsed: boolean;
  hasChildren: boolean;
  labels: string;
  markers: string;
}

const rows = computed<Row[]>(() => {
  if (!props.sheet) return [];
  const result: Row[] = [];
  function walk(topic: import('@mymind/core').Topic, depth: number) {
    result.push({
      id: topic.id,
      title: topic.title,
      depth,
      collapsed: topic.collapsed,
      hasChildren: topic.children.length > 0,
      labels: topic.labels.map((l) => l.text).join(', '),
      markers: topic.markers.join(' '),
    });
    if (!topic.collapsed) {
      for (const child of topic.children) walk(child, depth + 1);
    }
  }
  walk(props.sheet.rootTopic, 0);
  return result;
});

const localTitles = reactive<Record<string, string>>({});
const dragId = reactive({ id: null as string | null });

watch(
  () => props.sheet?.id,
  () => {
    for (const key of Object.keys(localTitles)) {
      delete localTitles[key];
    }
  },
);

function onRowClick(row: Row, event: MouseEvent) {
  emit('select', {
    id: row.id,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
}

function displayTitle(row: Row): string {
  return localTitles[row.id] ?? row.title;
}

function onInput(row: Row, value: string) {
  localTitles[row.id] = value;
}

function commitEdit(topicId: string, oldTitle: string, nextTitle: string) {
  if (!props.sheet) return;
  const title = nextTitle.trim();
  if (!title || title === oldTitle) return;
  dispatch(new UpdateTopicTitleCommand(props.sheet.id, topicId, title, oldTitle));
}

function onBlur(row: Row) {
  const value = localTitles[row.id] ?? row.title;
  delete localTitles[row.id];
  commitEdit(row.id, row.title, value);
}

function onKeyDown(row: Row, event: Event | KeyboardEvent) {
  const e = event as KeyboardEvent;
  e.stopPropagation();
  if (e.key === 'Enter') {
    e.preventDefault();
    onBlur(row);
    (e.target as HTMLElement)?.blur?.();
  }
}

function toggleCollapse(row: Row, event: MouseEvent) {
  event.stopPropagation();
  if (!props.sheet || !row.hasChildren) return;
  dispatch(new ToggleCollapseCommand(props.sheet.id, row.id));
}

function onDragStart(row: Row, event: DragEvent) {
  if (!props.sheet || row.id === props.sheet.rootTopic.id) {
    event.preventDefault();
    return;
  }
  dragId.id = row.id;
  event.dataTransfer?.setData('text/topic-id', row.id);
}

function onDrop(row: Row, event: DragEvent) {
  event.preventDefault();
  const topicId = event.dataTransfer?.getData('text/topic-id') || dragId.id;
  dragId.id = null;
  if (!topicId || !props.sheet || topicId === row.id) return;
  if (topicId === props.sheet.rootTopic.id) return;
  const parent = findParentOfTopic(props.sheet.rootTopic, row.id);
  if (event.altKey) {
    emit('move', { topicId, newParentId: row.id, newIndex: 0 });
  } else if (parent) {
    const idx = parent.children.findIndex((c) => c.id === row.id);
    emit('move', { topicId, newParentId: parent.id, newIndex: Math.max(0, idx) });
  } else {
    emit('move', { topicId, newParentId: row.id, newIndex: 0 });
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}
</script>

<template>
  <aside class="outliner" role="tree" :aria-label="'大纲'">
    <div class="outliner-header">
      <span>标题</span>
      <span>标签</span>
    </div>
    <el-scrollbar class="outliner-scroll">
      <div
        v-for="row in rows"
        :key="row.id"
        class="outliner-row"
        role="treeitem"
        :aria-selected="selectedSet.has(row.id)"
        :aria-level="row.depth + 1"
        :aria-expanded="row.hasChildren ? !row.collapsed : undefined"
        :class="{ selected: selectedSet.has(row.id) }"
        :style="{ paddingLeft: `${8 + row.depth * 16}px` }"
        draggable="true"
        @click="onRowClick(row, $event)"
        @dragstart="onDragStart(row, $event)"
        @dragover="onDragOver"
        @drop="onDrop(row, $event)"
      >
        <el-button
          v-if="row.hasChildren"
          class="collapse-btn"
          text
          size="small"
          :icon="row.collapsed ? ArrowRight : ArrowDown"
          @click="toggleCollapse(row, $event)"
        />
        <span v-else class="collapse-spacer" />
        <el-input
          :model-value="displayTitle(row)"
          class="outliner-input"
          size="small"
          :data-topic-id="row.id"
          @update:model-value="(v: string) => onInput(row, v)"
          @blur="onBlur(row)"
          @keydown="(e: Event | KeyboardEvent) => onKeyDown(row, e)"
          @click.stop
        />
        <el-tag v-if="row.labels" size="small" type="info" effect="plain" class="col-meta">
          {{ row.labels }}
        </el-tag>
      </div>
    </el-scrollbar>
  </aside>
</template>

<style scoped>
.outliner {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  font-size: 13px;
  display: flex;
  flex-direction: column;
}
.outliner-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.outliner-scroll {
  flex: 1;
}
.outliner-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  cursor: grab;
}
.outliner-row.selected {
  background: var(--el-color-primary-light-9);
}
.outliner-input {
  flex: 1;
  min-width: 0;
}
.outliner-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent;
  padding-left: 4px;
  padding-right: 4px;
}
.outliner-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
  background: var(--el-bg-color);
}
.collapse-btn {
  width: 20px;
  height: 20px;
  padding: 0 !important;
  min-height: 20px;
}
.collapse-spacer {
  width: 20px;
}
.col-meta {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
