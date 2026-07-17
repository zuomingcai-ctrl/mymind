<script setup lang="ts">
import { ElMessageBox } from 'element-plus';
import { Close, Plus } from '@element-plus/icons-vue';
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
  const sheets = store.document?.sheets;
  const newSheet = sheets?.[sheets.length - 1];
  if (newSheet) {
    store.setActiveSheet(newSheet.id);
    emit('switch', newSheet.id);
  }
}

function onDelete(sheetId: string, e?: Event) {
  e?.stopPropagation();
  if (!props.document || props.document.sheets.length <= 1) return;
  dispatch(new DeleteSheetCommand(sheetId));
  if (props.activeSheetId === sheetId) {
    const first = store.document?.sheets[0];
    if (first) {
      store.setActiveSheet(first.id);
      emit('switch', first.id);
    }
  }
}

function onSelect(sheetId: string) {
  if (sheetId === props.activeSheetId) return;
  emit('switch', sheetId);
}

async function onRename(sheetId: string, title: string) {
  try {
    const { value } = await ElMessageBox.prompt('重命名画布', '画布', {
      inputValue: title,
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    if (!value?.trim()) return;
    dispatch(new RenameSheetCommand(sheetId, value.trim()));
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div v-if="document" class="sheet-tabs" data-testid="sheet-tabs">
    <div class="sheet-list" role="tablist">
      <button
        v-for="sheet in document.sheets"
        :key="sheet.id"
        type="button"
        role="tab"
        class="sheet-tab"
        :class="{ active: sheet.id === activeSheetId }"
        :aria-selected="sheet.id === activeSheetId"
        :data-sheet-id="sheet.id"
        @click="onSelect(sheet.id)"
        @dblclick="onRename(sheet.id, sheet.title)"
      >
        <span class="sheet-title">{{ sheet.title }}</span>
        <button
          v-if="document.sheets.length > 1"
          type="button"
          class="sheet-close"
          title="删除画布"
          data-testid="sheet-close"
          @click="onDelete(sheet.id, $event)"
        >
          <el-icon :size="12"><Close /></el-icon>
        </button>
      </button>
      <button
        type="button"
        class="sheet-add"
        data-testid="sheet-add"
        title="添加画布"
        @click="onAdd"
      >
        <el-icon :size="14"><Plus /></el-icon>
        <span>添加</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sheet-tabs {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  min-height: 36px;
}
.sheet-list {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
}
.sheet-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 160px;
  padding: 4px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  flex-shrink: 0;
}
.sheet-tab.active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.sheet-title {
  overflow: hidden;
  text-overflow: ellipsis;
}
.sheet-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.sheet-close:hover {
  color: var(--el-color-danger);
  background: var(--el-fill-color);
}
.sheet-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
}
.sheet-add:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
</style>
