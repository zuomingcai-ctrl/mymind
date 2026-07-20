<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Sheet, Topic, Summary } from '@mymind/core';
import {
  UpdateTopicTitleCommand,
  ToggleCollapseCommand,
  findParentOfTopic,
  findTopicInSheet,
  isInFloatingTopicTree,
} from '@mymind/core';
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
  /** Summary floating tree (not in rootTopic). */
  section: 'main' | 'summary';
  /** True for the floating root of a Summary. */
  isSummaryRoot: boolean;
  /** e.g. "优势 S – 威胁 T" for summary roots. */
  rangeHint: string;
}

function walkTopic(
  topic: Topic,
  depth: number,
  section: Row['section'],
  extras: { isSummaryRoot?: boolean; rangeHint?: string },
  result: Row[],
) {
  result.push({
    id: topic.id,
    title: topic.title,
    depth,
    collapsed: topic.collapsed,
    hasChildren: topic.children.length > 0,
    labels: topic.labels.map((l) => l.text).join(', '),
    markers: topic.markers.join(' '),
    section,
    isSummaryRoot: extras.isSummaryRoot ?? false,
    rangeHint: extras.rangeHint ?? '',
  });
  if (!topic.collapsed) {
    for (const child of topic.children) {
      walkTopic(child, depth + 1, section, {}, result);
    }
  }
}

function summaryRangeHint(sheet: Sheet, summary: Summary): string {
  const [startId, endId] = summary.topicRange;
  const start = findTopicInSheet(sheet, startId);
  const end = findTopicInSheet(sheet, endId);
  if (!start) return '';
  if (!end || startId === endId) return start.title;
  return `${start.title} – ${end.title}`;
}

const mainRows = computed<Row[]>(() => {
  if (!props.sheet) return [];
  const result: Row[] = [];
  walkTopic(props.sheet.rootTopic, 0, 'main', {}, result);
  return result;
});

const summaryRows = computed<Row[]>(() => {
  if (!props.sheet) return [];
  const result: Row[] = [];
  for (const summary of props.sheet.summaries) {
    const topic = props.sheet.floatingTopics.find((t) => t.id === summary.summaryTopicId);
    if (!topic) continue;
    walkTopic(
      topic,
      0,
      'summary',
      { isSummaryRoot: true, rangeHint: summaryRangeHint(props.sheet, summary) },
      result,
    );
  }
  return result;
});

const localTitles = reactive<Record<string, string>>({});
const dragId = reactive({ id: null as string | null });
/** UI-only: collapse entire outliner sections (概要 / 主题). */
const sectionCollapsed = reactive({ summary: false, main: false });

watch(
  () => props.sheet?.id,
  () => {
    for (const key of Object.keys(localTitles)) {
      delete localTitles[key];
    }
    sectionCollapsed.summary = false;
    sectionCollapsed.main = false;
  },
);

function toggleSection(section: 'summary' | 'main') {
  sectionCollapsed[section] = !sectionCollapsed[section];
}

function onRowClick(row: Row, event: MouseEvent) {
  emit('select', {
    id: row.id,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  });
}

/** Title input uses stopPropagation; still sync selection to the canvas. */
function onInputClick(row: Row, event: MouseEvent) {
  event.stopPropagation();
  onRowClick(row, event);
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
  if (!props.sheet || row.section !== 'main' || row.id === props.sheet.rootTopic.id) {
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
  // MoveTopic only operates on the main tree; keep summary / floating topics out.
  if (row.section !== 'main') return;
  if (isInFloatingTopicTree(props.sheet, topicId)) return;
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
        v-if="summaryRows.length"
        class="outliner-section"
        role="group"
        aria-label="概要"
      >
        <button
          type="button"
          class="outliner-section-label"
          :aria-expanded="!sectionCollapsed.summary"
          @click="toggleSection('summary')"
        >
          <el-icon class="section-chevron" :size="12">
            <ArrowRight v-if="sectionCollapsed.summary" />
            <ArrowDown v-else />
          </el-icon>
          <span>概要</span>
        </button>
        <template v-if="!sectionCollapsed.summary">
          <div
            v-for="row in summaryRows"
            :key="`summary-${row.id}`"
            class="outliner-row summary-row"
            role="treeitem"
            :aria-selected="selectedSet.has(row.id)"
            :aria-level="row.depth + 1"
            :aria-expanded="row.hasChildren ? !row.collapsed : undefined"
            :class="{
              selected: selectedSet.has(row.id),
              'summary-root': row.isSummaryRoot,
            }"
            :style="{ paddingLeft: `${8 + row.depth * 16}px` }"
            :draggable="false"
            @click="onRowClick(row, $event)"
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
            <span
              v-if="row.isSummaryRoot"
              class="summary-glyph"
              aria-hidden="true"
              title="概要"
            >⌒</span>
            <div class="outliner-title-block">
              <el-input
                :model-value="displayTitle(row)"
                class="outliner-input"
                size="small"
                :data-topic-id="row.id"
                @update:model-value="(v: string) => onInput(row, v)"
                @blur="onBlur(row)"
                @keydown="(e: Event | KeyboardEvent) => onKeyDown(row, e)"
                @click="(e: MouseEvent) => onInputClick(row, e)"
              />
              <span v-if="row.rangeHint" class="summary-range">涵盖 {{ row.rangeHint }}</span>
            </div>
            <el-tag v-if="row.labels" size="small" type="info" effect="plain" class="col-meta">
              {{ row.labels }}
            </el-tag>
          </div>
        </template>
      </div>

      <div class="outliner-section outliner-section--main" role="group" aria-label="主题">
        <button
          type="button"
          class="outliner-section-label"
          :class="{ 'outliner-section-label--main': summaryRows.length > 0 }"
          :aria-expanded="!sectionCollapsed.main"
          @click="toggleSection('main')"
        >
          <el-icon class="section-chevron" :size="12">
            <ArrowRight v-if="sectionCollapsed.main" />
            <ArrowDown v-else />
          </el-icon>
          <span>主题</span>
        </button>

        <template v-if="!sectionCollapsed.main">
          <div
            v-for="row in mainRows"
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
              @click="(e: MouseEvent) => onInputClick(row, e)"
            />
            <el-tag v-if="row.labels" size="small" type="info" effect="plain" class="col-meta">
              {{ row.labels }}
            </el-tag>
          </div>
        </template>
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
.outliner-section {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 4px;
  margin-bottom: 2px;
}
.outliner-section--main {
  border-bottom: none;
  margin-bottom: 0;
}
.outliner-section-label {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  margin: 0;
  padding: 8px 12px 4px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  text-align: left;
}
.outliner-section-label:hover {
  color: var(--el-text-color-regular);
}
.outliner-section-label--main {
  padding-top: 6px;
}
.section-chevron {
  flex-shrink: 0;
}
.outliner-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  cursor: grab;
}
.outliner-row.summary-row {
  cursor: default;
  align-items: flex-start;
}
.outliner-row.summary-root {
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  margin: 1px 4px;
  padding-top: 4px;
  padding-bottom: 4px;
}
.outliner-row.selected {
  background: var(--el-color-primary-light-9);
}
.outliner-row.summary-root.selected {
  background: var(--el-color-primary-light-9);
}
.summary-glyph {
  flex-shrink: 0;
  width: 16px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--el-color-warning);
  opacity: 0.9;
}
.outliner-title-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.summary-range {
  font-size: 10px;
  line-height: 1.3;
  color: var(--el-text-color-placeholder);
  padding: 0 4px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-shrink: 0;
}
.collapse-spacer {
  width: 20px;
  flex-shrink: 0;
}
.col-meta {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
