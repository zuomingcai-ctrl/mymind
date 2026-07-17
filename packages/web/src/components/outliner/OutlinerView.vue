<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Sheet } from '@mymind/core';
import { UpdateTopicTitleCommand, ToggleCollapseCommand, findParentOfTopic } from '@mymind/core';
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

function onInput(row: Row, event: Event) {
  localTitles[row.id] = (event.target as HTMLInputElement).value;
}

function commitEdit(topicId: string, oldTitle: string, nextTitle: string) {
  if (!props.sheet) return;
  const title = nextTitle.trim();
  if (!title || title === oldTitle) return;
  dispatch(new UpdateTopicTitleCommand(props.sheet.id, topicId, title, oldTitle));
}

function onBlur(row: Row, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  delete localTitles[row.id];
  commitEdit(row.id, row.title, value);
}

function onKeyDown(row: Row, event: KeyboardEvent) {
  event.stopPropagation();
  if (event.key === 'Enter') {
    event.preventDefault();
    const value = (event.target as HTMLInputElement).value;
    delete localTitles[row.id];
    commitEdit(row.id, row.title, value);
    (event.target as HTMLInputElement).blur();
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
  // drop as sibling before target, or as child if alt
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
  <div class="outliner">
    <div class="outliner-header">
      <span>标题</span>
      <span>标签</span>
    </div>
    <div
      v-for="row in rows"
      :key="row.id"
      class="outliner-row"
      :class="{ selected: selectedSet.has(row.id) }"
      :style="{ paddingLeft: `${8 + row.depth * 16}px` }"
      draggable="true"
      @click="onRowClick(row, $event)"
      @dragstart="onDragStart(row, $event)"
      @dragover="onDragOver"
      @drop="onDrop(row, $event)"
    >
      <button
        v-if="row.hasChildren"
        type="button"
        class="collapse-btn"
        @click="toggleCollapse(row, $event)"
      >
        {{ row.collapsed ? '▶' : '▼' }}
      </button>
      <span v-else class="collapse-spacer" />
      <input
        :value="displayTitle(row)"
        class="outliner-input"
        :data-topic-id="row.id"
        @input="onInput(row, $event)"
        @blur="onBlur(row, $event)"
        @keydown="onKeyDown(row, $event)"
        @click.stop
      />
      <span class="col-meta">{{ row.labels }}</span>
    </div>
  </div>
</template>

<style scoped>
.outliner {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  background: #fff;
  font-size: 13px;
}
.outliner-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  color: #888;
  border-bottom: 1px solid #eee;
}
.outliner-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: grab;
}
.outliner-row.selected {
  background: #e8f4fd;
}
.outliner-input {
  border: none;
  background: transparent;
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.outliner-input:focus {
  outline: 1px solid #4a90d9;
  background: #fff;
}
.collapse-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  width: 16px;
  font-size: 10px;
  padding: 0;
}
.collapse-spacer {
  width: 16px;
}
.col-meta {
  font-size: 11px;
  color: #999;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
