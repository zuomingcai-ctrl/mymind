<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Sheet } from '@mymind/core';
import {
  DocumentAdd,
  DocumentChecked,
  FolderOpened,
  Folder,
  DocumentCopy,
  Download,
  Upload,
  RefreshLeft,
  RefreshRight,
  Brush,
  Search,
  Printer,
  FullScreen,
  Aim,
  View,
  Hide,
  MagicStick,
  Picture,
  Files,
  Share,
  CollectionTag,
} from '@element-plus/icons-vue';
import InsertMenu from './InsertMenu.vue';
import type { InsertActionId } from '../insert/insert-items';

const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  formatPainterActive: boolean;
  isDirty: boolean;
  hasDocument: boolean;
  sheet: Sheet | null;
  selection: string[];
  searchQuery: string;
  includeRelSearch: boolean;
  showOutliner: boolean;
  showPanel: boolean;
  showMinimap: boolean;
  branchFocusActive: boolean;
  pitchActive: boolean;
  zenActive: boolean;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  new: [];
  'close-document': [];
  undo: [];
  redo: [];
  'format-painter': [];
  save: [];
  'save-as': [];
  recent: [];
  open: [];
  'open-encrypted': [];
  'encrypt-save': [];
  merge: [];
  import: [];
  'export-json': [];
  'export-png': [];
  'export-svg': [];
  'export-pdf': [];
  'export-markdown': [];
  'export-opml': [];
  'export-csv': [];
  'export-excel': [];
  'export-word': [];
  'export-ppt': [];
  'export-text-bundle': [];
  share: [];
  'open-markers': [];
  'insert-summary': [];
  'insert-boundary': [];
  'insert-relationship': [];
  'add-floating': [];
  'copy-sheet': [];
  insert: [id: InsertActionId];
  'update:searchQuery': [value: string];
  'update:includeRelSearch': [value: boolean];
  search: [];
  replace: [];
  templates: [];
  'save-as-template': [];
  print: [];
  'toggle-outliner': [];
  'toggle-panel': [];
  'toggle-minimap': [];
  'toggle-branch-focus': [];
  'toggle-pitch': [];
  'toggle-zen': [];
  fit: [];
  'search-ref': [el: unknown];
}>();

const { t } = useI18n();

const searchModel = computed({
  get: () => props.searchQuery,
  set: (v: string) => emit('update:searchQuery', v),
});

function onFileCommand(cmd: string) {
  const map: Record<string, () => void> = {
    new: () => emit('new'),
    close: () => emit('close-document'),
    open: () => emit('open'),
    recent: () => emit('recent'),
    save: () => emit('save'),
    'save-as': () => emit('save-as'),
    import: () => emit('import'),
    merge: () => emit('merge'),
    'open-encrypted': () => emit('open-encrypted'),
    'encrypt-save': () => emit('encrypt-save'),
    'save-as-template': () => emit('save-as-template'),
    templates: () => emit('templates'),
    'copy-sheet': () => emit('copy-sheet'),
  };
  map[cmd]?.();
}

function onExportCommand(cmd: string) {
  const map: Record<string, () => void> = {
    json: () => emit('export-json'),
    png: () => emit('export-png'),
    svg: () => emit('export-svg'),
    pdf: () => emit('export-pdf'),
    md: () => emit('export-markdown'),
    opml: () => emit('export-opml'),
    csv: () => emit('export-csv'),
    excel: () => emit('export-excel'),
    word: () => emit('export-word'),
    ppt: () => emit('export-ppt'),
    textbundle: () => emit('export-text-bundle'),
  };
  map[cmd]?.();
}

function onInsertCommand(cmd: string) {
  const map: Record<string, () => void> = {
    summary: () => emit('insert-summary'),
    boundary: () => emit('insert-boundary'),
    relationship: () => emit('insert-relationship'),
    floating: () => emit('add-floating'),
  };
  map[cmd]?.();
}

function onViewCommand(cmd: string) {
  const map: Record<string, () => void> = {
    outliner: () => emit('toggle-outliner'),
    panel: () => emit('toggle-panel'),
    minimap: () => emit('toggle-minimap'),
    focus: () => emit('toggle-branch-focus'),
    pitch: () => emit('toggle-pitch'),
    zen: () => emit('toggle-zen'),
    fit: () => emit('fit'),
  };
  map[cmd]?.();
}

function setSearchRef(el: unknown) {
  emit('search-ref', el);
}
</script>

<template>
  <header class="toolbar" data-testid="toolbar">
    <div class="toolbar-left">
      <span class="logo">{{ t('app.title') }}</span>

      <el-dropdown trigger="click" @command="onFileCommand">
        <el-button>
          {{ t('toolbar.file') }}
          <el-icon class="el-icon--right"><Folder /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="new" :icon="DocumentAdd">{{ t('toolbar.new') }}</el-dropdown-item>
            <el-dropdown-item command="open" :icon="FolderOpened">{{ t('toolbar.open') }}</el-dropdown-item>
            <el-dropdown-item command="recent" :icon="Files">{{ t('toolbar.recent') }}</el-dropdown-item>
            <el-dropdown-item divided command="close">{{ t('toolbar.close') }}</el-dropdown-item>
            <el-dropdown-item divided command="save">{{ t('toolbar.save') }}</el-dropdown-item>
            <el-dropdown-item command="save-as">{{ t('toolbar.saveAs') }}</el-dropdown-item>
            <el-dropdown-item divided command="import" :icon="Upload">{{ t('toolbar.import') }}</el-dropdown-item>
            <el-dropdown-item command="merge">{{ t('toolbar.merge') }}</el-dropdown-item>
            <el-dropdown-item divided command="open-encrypted">{{ t('toolbar.openEncrypted') }}</el-dropdown-item>
            <el-dropdown-item command="encrypt-save">{{ t('toolbar.encryptSave') }}</el-dropdown-item>
            <el-dropdown-item divided command="templates" :icon="MagicStick">{{ t('toolbar.templates') }}</el-dropdown-item>
            <el-dropdown-item command="save-as-template">{{ t('toolbar.saveAsTemplate') }}</el-dropdown-item>
            <el-dropdown-item divided command="copy-sheet" :icon="DocumentCopy">{{ t('toolbar.copySheet') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-button
        :type="isDirty ? 'primary' : 'default'"
        :icon="DocumentChecked"
        :disabled="!hasDocument"
        :title="t('toolbar.saveTip')"
        @click="emit('save')"
      >
        {{ t('toolbar.save') }}
      </el-button>

      <el-button-group>
        <el-button :disabled="!canUndo" :icon="RefreshLeft" :title="t('toolbar.undo')" @click="emit('undo')" />
        <el-button :disabled="!canRedo" :icon="RefreshRight" :title="t('toolbar.redo')" @click="emit('redo')" />
        <el-button
          :type="formatPainterActive ? 'primary' : 'default'"
          :icon="Brush"
          :title="t('toolbar.formatPainterTip')"
          @click="emit('format-painter')"
        />
      </el-button-group>

      <el-dropdown trigger="click" @command="onInsertCommand">
        <el-button>{{ t('toolbar.insert') }}</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="summary">{{ t('toolbar.summary') }}</el-dropdown-item>
            <el-dropdown-item command="boundary">{{ t('toolbar.boundary') }}</el-dropdown-item>
            <el-dropdown-item command="relationship">{{ t('toolbar.relationship') }}</el-dropdown-item>
            <el-dropdown-item divided command="floating">{{ t('toolbar.floating') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <InsertMenu :sheet="sheet" :selection="selection" @insert="(id) => emit('insert', id)" />

      <el-dropdown trigger="click" @command="onExportCommand">
        <el-button :icon="Download">{{ t('toolbar.export') }}</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="png" :icon="Picture">PNG</el-dropdown-item>
            <el-dropdown-item command="svg">SVG</el-dropdown-item>
            <el-dropdown-item command="pdf">PDF</el-dropdown-item>
            <el-dropdown-item divided command="json">JSON</el-dropdown-item>
            <el-dropdown-item command="md">Markdown</el-dropdown-item>
            <el-dropdown-item command="opml">OPML</el-dropdown-item>
            <el-dropdown-item command="csv">CSV</el-dropdown-item>
            <el-dropdown-item command="excel">Excel</el-dropdown-item>
            <el-dropdown-item command="word">Word</el-dropdown-item>
            <el-dropdown-item divided command="ppt">{{ t('toolbar.exportPpt') }}</el-dropdown-item>
            <el-dropdown-item command="textbundle">TextBundle</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown trigger="click" @command="onViewCommand">
        <el-button :icon="View">{{ t('toolbar.view') }}</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="outliner">
              {{ showOutliner ? t('toolbar.hideOutliner') : t('toolbar.showOutliner') }}
            </el-dropdown-item>
            <el-dropdown-item command="panel">
              {{ showPanel ? t('toolbar.hidePanel') : t('toolbar.showPanel') }}
            </el-dropdown-item>
            <el-dropdown-item command="minimap">
              {{ showMinimap ? t('toolbar.hideMinimap') : t('toolbar.showMinimap') }}
            </el-dropdown-item>
            <el-dropdown-item divided command="focus" :icon="Aim" :disabled="!selectedId && !branchFocusActive">
              {{ branchFocusActive ? t('toolbar.exitFocus') : t('toolbar.branchFocus') }}
            </el-dropdown-item>
            <el-dropdown-item command="pitch">
              {{ pitchActive ? t('toolbar.exitPitch') : t('toolbar.pitch') }}
            </el-dropdown-item>
            <el-dropdown-item command="zen" :icon="zenActive ? Hide : FullScreen">
              {{ zenActive ? t('toolbar.exitZen') : 'ZEN' }}
            </el-dropdown-item>
            <el-dropdown-item divided command="fit">{{ t('toolbar.fit') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-button :icon="Printer" :aria-label="t('toolbar.print')" @click="emit('print')">{{ t('toolbar.print') }}</el-button>
      <el-button :icon="Share" :disabled="!hasDocument" @click="emit('share')">{{ t('toolbar.share') }}</el-button>
      <el-button :icon="CollectionTag" :disabled="!selectedId" @click="emit('open-markers')">{{ t('toolbar.markersStickers') }}</el-button>
    </div>

    <div class="toolbar-right">
      <el-checkbox
        :model-value="includeRelSearch"
        @change="(v: string | number | boolean) => emit('update:includeRelSearch', !!v)"
      >
        {{ t('toolbar.includeRelSearch') }}
      </el-checkbox>
      <el-input
        :ref="setSearchRef"
        v-model="searchModel"
        class="search-input"
        clearable
        :prefix-icon="Search"
        :placeholder="t('toolbar.searchPlaceholder')"
        :aria-label="t('toolbar.searchPlaceholder')"
        @input="emit('search')"
      />
      <el-button @click="emit('replace')">{{ t('toolbar.replace') }}</el-button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-wrap: wrap;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.logo {
  font-weight: 600;
  font-size: 15px;
  margin-right: 4px;
  color: var(--el-text-color-primary);
  letter-spacing: 0.02em;
}
.search-input {
  width: 180px;
}
</style>
