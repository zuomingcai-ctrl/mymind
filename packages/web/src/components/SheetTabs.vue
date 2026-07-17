<script setup lang="ts">
import type { MindMapDocument } from '@mymind/core';
import { AddSheetCommand, DeleteSheetCommand, RenameSheetCommand } from '@mymind/core';
import { useDocument } from '../composables/useDocument';
import { useDocumentStore } from '../stores/document';

const props = defineProps<{
  document: MindMapDocument | null;
  activeSheetId: string;
}>();

const emit = defineEmits<{
  switch: [sheetId: string];
}>();

const { dispatch } = useDocument();
const store = useDocumentStore();

function onAdd() {
  const cmd = new AddSheetCommand();
  dispatch(cmd);
  const doc = store.document;
  const newSheet = doc?.sheets[doc.sheets.length - 1];
  if (newSheet) {
    store.setActiveSheet(newSheet.id);
    emit('switch', newSheet.id);
  }
}

function onDelete(sheetId: string, event: MouseEvent) {
  event.stopPropagation();
  if (!props.document || props.document.sheets.length <= 1) return;
  dispatch(new DeleteSheetCommand(sheetId));
  if (props.activeSheetId === sheetId) {
    const doc = store.document;
    const first = doc?.sheets[0];
    if (first) {
      store.setActiveSheet(first.id);
      emit('switch', first.id);
    }
  }
}

function onRename(sheetId: string, title: string) {
  if (!title.trim()) return;
  dispatch(new RenameSheetCommand(sheetId, title.trim()));
}

function onDblClick(sheetId: string, title: string) {
  const next = prompt('重命名画布', title);
  if (next !== null) onRename(sheetId, next);
}
</script>

<template>
  <div v-if="document" class="sheet-tabs">
    <button
      v-for="sheet in document.sheets"
      :key="sheet.id"
      class="sheet-tab"
      :class="{ active: sheet.id === activeSheetId }"
      @click="emit('switch', sheet.id)"
      @dblclick="onDblClick(sheet.id, sheet.title)"
    >
      <span>{{ sheet.title }}</span>
      <span
        v-if="document.sheets.length > 1"
        class="close"
        title="删除画布"
        @click="onDelete(sheet.id, $event)"
      >×</span>
    </button>
    <button class="sheet-tab add" title="新建画布" @click="onAdd">+</button>
  </div>
</template>

<style scoped>
.sheet-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #f0f0f0;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
}
.sheet-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #ccc;
  border-radius: 4px 4px 0 0;
  background: #e8e8e8;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.sheet-tab.active {
  background: #fff;
  border-bottom-color: #fff;
  font-weight: 500;
}
.sheet-tab.add {
  padding: 4px 10px;
  font-weight: 600;
}
.close {
  font-size: 14px;
  line-height: 1;
  opacity: 0.5;
}
.close:hover {
  opacity: 1;
  color: #c00;
}
</style>
