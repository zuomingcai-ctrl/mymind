<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  AddTopicCommand,
  DeleteTopicCommand,
  AddSummaryCommand,
  AddBoundaryCommand,
  AddRelationshipCommand,
  ToggleCollapseCommand,
  InsertParentTopicCommand,
  AddFloatingTopicCommand,
  FormatPainterCommand,
  SaveAsDocumentCommand,
  CopySheetCommand,
  ReplaceTextCommand,
  MoveTopicCommand,
  createDefaultLayoutRegistry,
  createMeasureFn,
  findParentOfTopic,
  type Topic,
  CommandBus,
  importMarkdown,
  importOpml,
  importPlainTextIndented,
  importFreeMind,
  importXMind,
  exportMarkdown,
  exportSvg,
  exportOpml,
  exportWordOutline,
  exportExcelCsv,
  exportExcelXml,
  exportPdf,
  exportPptxOutline,
  exportTextBundle,
  encryptDocumentJson,
  decryptDocumentJson,
  isEncryptedDocumentJson,
  serializeDocument,
  deserializeDocument,
  mergeDocuments,
  documentToUserTemplate,
} from '@mymind/core';
import { useDocument } from './composables/useDocument';
import { useViewport } from './composables/useViewport';
import { useDocumentStore } from './stores/document';

import CanvasView from './components/canvas/CanvasView.vue';
import OutlinerView from './components/outliner/OutlinerView.vue';
import PropertyPanel from './components/property-panel/PropertyPanel.vue';
import StatusBar from './components/StatusBar.vue';
import TemplatePicker from './components/TemplatePicker.vue';
import PrintPreview from './components/PrintPreview.vue';
import TopicTextEditor from './components/TopicTextEditor.vue';
import SheetTabs from './components/SheetTabs.vue';
import NewDocumentDialog from './components/NewDocumentDialog.vue';
import InsertMenu from './components/InsertMenu.vue';
import ContextInsertMenu from './components/ContextInsertMenu.vue';
import Minimap from './components/Minimap.vue';
import {
  saveDocument,
  openJsonFile,
  exportPng,
  pickImportFile,
  downloadText,
  downloadAsJson,
  downloadBlob,
  listDocuments,
  loadDocument,
} from './adapters/browser-export';
import { useSearch } from './composables/useSearch';
import { useZenMode } from './composables/useZenMode';
import { useAutoSave } from './composables/useAutoSave';
import { usePitchMode } from './composables/usePitchMode';
import { useClipboard, isEditableTarget } from './composables/useClipboard';
import { useContextMenu } from './composables/useContextMenu';
import { useRecentInserts } from './composables/useRecentInserts';
import { buildInsertAction } from './composables/useInsertActions';
import type { InsertActionId } from './insert/insert-items';
import {
  computeNextSelection,
  shouldUpdateSelectionAnchor,
  type SelectionModifiers,
} from './composables/useSelection';
import { useBranchFocus } from './composables/useBranchFocus';
import { useLabelFilter } from './composables/useLabelFilter';
const { query: searchQuery, results: searchResults, search, selectResult } = useSearch();
const { active: zenActive, toggle: toggleZen } = useZenMode();
const { active: pitchActive, enter: enterPitch, exit: exitPitch, next: pitchNext, prev: pitchPrev, currentTopicId: pitchTopicId } = usePitchMode();
useAutoSave();
const { focusId: branchFocusId, visibleIds: branchVisibleIds, focus: focusBranch, clear: clearBranchFocus } = useBranchFocus();
useLabelFilter();
const searchInputRef = ref<HTMLInputElement | null>(null);
const formatPainterSource = ref<string | null>(null);
const showRecent = ref(false);
const recentDocs = ref<{ id: string; title: string }[]>([]);
const showReplace = ref(false);
const replaceFind = ref('');
const replaceWith = ref('');
const showOutliner = ref(true);
const showPanel = ref(true);
const showMinimap = ref(true);const { t } = useI18n();
const {
  mindDocument,
  activeSheet,
  selectedId,
  selection,
  dispatch,
  undo,
  redo,
  canUndo,
  canRedo,
  newDocument,
  setSelection,
} = useDocument();

const selectionAnchorId = ref<string | null>(null);

const { viewport, zoomPercent, setZoom, fitContent, zoomBy, pan, ensureVisible, viewWidth, viewHeight } =
  useViewport();

const showNewDialog = ref(false);
const showTemplates = ref(false);
const showPrint = ref(false);
const editingTopic = ref<{
  topicId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  initialText?: string;
} | null>(null);
const keyboardCaptureRef = ref<HTMLInputElement | null>(null);
const canvasEditorRef = ref<InstanceType<typeof TopicTextEditor> | null>(null);
const docStore = useDocumentStore();
const { copyTopic, canPaste, buildPasteCommand } = useClipboard();
const { menu: ctxMenu, openAt: openCtxMenu, close: closeCtxMenu } = useContextMenu();
const { record: recordRecentInsert } = useRecentInserts();
const panelFocus = ref<'note' | 'comment' | 'todo' | 'task' | 'equation' | 'hyperlink' | null>(null);

onMounted(() => {
  newDocument('mindmap-balanced-classic');
  fitInitial();
  if (new URLSearchParams(window.location.search).has('e2e')) {
    (window as unknown as {
      __mymindE2E?: { getJson: () => string; getMarkdown: () => string };
    }).__mymindE2E = {
      getJson: () => {
        const doc = docStore.document;
        return doc ? serializeDocument(doc) : '';
      },
      getMarkdown: () => {
        const doc = docStore.document;
        if (!doc) return '';
        return exportMarkdown(doc, docStore.activeSheetId || undefined);
      },
    };
  }
  window.addEventListener('keydown', onKeyDown, true);
  nextTick(() => focusKeyboardCapture());
});

watch(selectedId, (id) => {
  if (editingTopic.value && editingTopic.value.topicId !== id) {
    editingTopic.value = null;
  }
  nextTick(() => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.classList.contains('outliner-input')) return;
    if (el?.classList.contains('topic-text-editor')) return;
    focusKeyboardCapture();
  });
});

watch(
  viewport,
  () => {
    if (!editingTopic.value || !activeSheet.value) return;
    const layout = computeEditorLayout(editingTopic.value.topicId);
    if (!layout) return;
    const cur = editingTopic.value;
    if (
      cur.left === layout.left &&
      cur.top === layout.top &&
      cur.width === layout.width &&
      cur.height === layout.height
    ) {
      return;
    }
    editingTopic.value = { ...cur, ...layout };
  },
  { deep: true },
);

function focusKeyboardCapture() {
  if (zenActive.value || pitchActive.value) return;
  keyboardCaptureRef.value?.focus({ preventScroll: true });
}

function canStartCanvasEdit(e: KeyboardEvent | Event): boolean {
  if (!activeSheet.value || !selectedId.value || zenActive.value || pitchActive.value) return false;
  const t = (e.target as HTMLElement | null) ?? document.activeElement;
  if (!(t instanceof HTMLElement)) return true;
  if (t.classList.contains('topic-text-editor')) return false;
  if (t.classList.contains('outliner-input')) return false;
  if (t.closest('.property-panel, .toolbar, .search-input')) return false;
  return true;
}

function computeEditorLayout(topicId: string) {
  if (!activeSheet.value) return null;
  const canvas = window.document.querySelector('.canvas-view') as HTMLCanvasElement | null;
  if (!canvas) return null;

  const registry = createDefaultLayoutRegistry();
  const layout = registry.layout(activeSheet.value, createMeasureFn());
  const node = layout.nodes.get(topicId);
  if (!node) return null;

  const rect = canvas.getBoundingClientRect();
  return {
    left: rect.left + (node.x - viewport.value.x) * viewport.value.zoom,
    top: rect.top + (node.y - viewport.value.y) * viewport.value.zoom,
    width: node.width * viewport.value.zoom,
    height: node.height * viewport.value.zoom,
  };
}

function openEditorForSelection(initialText?: string) {
  if (!activeSheet.value || !selectedId.value) return;
  if (!canStartCanvasEdit({ target: document.activeElement } as Event)) return;
  const nodeLayout = computeEditorLayout(selectedId.value);
  if (!nodeLayout) return;

  editingTopic.value = {
    topicId: selectedId.value,
    ...nodeLayout,
    initialText,
  };
}

function closeEditor() {
  editingTopic.value = null;
  nextTick(() => focusKeyboardCapture());
}

function onCaptureBeforeInput(e: Event) {
  if (editingTopic.value) return;
  if (!canStartCanvasEdit(e)) return;
  const ev = e as InputEvent;
  if (ev.inputType === 'insertText' && ev.data) {
    e.preventDefault();
    openEditorForSelection(ev.data);
  } else if (ev.inputType === 'deleteContentBackward') {
    e.preventDefault();
    openEditorForSelection('');
  }
}

function onCaptureInput(e: Event) {
  (e.target as HTMLInputElement).value = '';
}

function handleCanvasEditKeys(e: KeyboardEvent): boolean {
  if (!canStartCanvasEdit(e)) return false;

  if (e.key === 'F2') {
    e.preventDefault();
    if (editingTopic.value) {
      canvasEditorRef.value?.focus();
    } else {
      openEditorForSelection();
    }
    return true;
  }
  if (e.key === ' ' || e.code === 'Space') {
    return false;
  }
  if (e.key === 'Backspace' && !editingTopic.value) {
    e.preventDefault();
    openEditorForSelection('');
    return true;
  }
  if (
    e.key.length === 1 &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.isComposing &&
    !editingTopic.value
  ) {
    e.preventDefault();
    openEditorForSelection(e.key);
    return true;
  }
  return false;
}

function startEditingTopic(payload: {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  editingTopic.value = {
    topicId: payload.id,
    left: payload.left,
    top: payload.top,
    width: payload.width,
    height: payload.height,
  };
}

function applyTopicSelect(id: string | null, mods: SelectionModifiers = {}) {
  closeEditor();
  if (!activeSheet.value) {
    setSelection(id ? [id] : []);
    selectionAnchorId.value = id;
    focusKeyboardCapture();
    return;
  }

  const next = computeNextSelection(
    selection.value,
    id,
    activeSheet.value.rootTopic,
    mods,
    selectionAnchorId.value ?? selection.value[0] ?? null,
  );
  setSelection(next);
  if (shouldUpdateSelectionAnchor(mods)) {
    selectionAnchorId.value = id;
  } else if (next.length === 0) {
    selectionAnchorId.value = null;
  } else if (!selectionAnchorId.value && next[0]) {
    selectionAnchorId.value = next[0];
  }
  focusKeyboardCapture();
}

function onCanvasSelect(payload: {
  id: string | null;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  applyTopicSelect(payload.id, payload);
}

function onOutlinerSelect(payload: {
  id: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  applyTopicSelect(payload.id, payload);
}

function onCanvasResize(width: number, height: number) {
  viewWidth.value = width;
  viewHeight.value = height;
}

function fitInitial() {
  if (!activeSheet.value) return;
  const registry = createDefaultLayoutRegistry();
  const layout = registry.layout(activeSheet.value, createMeasureFn());
  fitContent(layout.bounds);
}

function onNewConfirm(variantId: string) {
  newDocument(variantId);
  showNewDialog.value = false;
  fitInitial();
}

async function onSave() {
  if (mindDocument.value) await saveDocument(mindDocument.value);
}

async function onOpen() {
  const doc = await openJsonFile();
  docStore.document = doc;
  docStore.activeSheetId = doc.sheets[0]!.id;
  docStore.selection = [doc.sheets[0]!.rootTopic.id];
  docStore.commandBus = new CommandBus(doc);
  fitInitial();
}

async function onExportPng() {
  const canvas = window.document.querySelector('.canvas-view') as HTMLCanvasElement;
  if (!canvas) return;
  const blob = await exportPng(canvas);
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `${mindDocument.value?.title ?? 'export'}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

async function onExportSvg() {
  if (!activeSheet.value || !mindDocument.value) return;
  const registry = createDefaultLayoutRegistry();
  const layout = registry.layout(activeSheet.value, createMeasureFn());
  const svg = exportSvg(layout, activeSheet.value.canvasSettings.backgroundColor);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `${mindDocument.value.title}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function onExportMarkdown() {
  if (!mindDocument.value) return;
  const md = exportMarkdown(mindDocument.value, activeSheet.value?.id);
  downloadText(md, `${mindDocument.value.title}.md`, 'text/markdown');
}

function onExportOpml() {
  if (!mindDocument.value) return;
  const xml = exportOpml(mindDocument.value, activeSheet.value?.id);
  downloadText(xml, `${mindDocument.value.title}.opml`, 'text/xml');
}

function onExportCsv() {
  if (!mindDocument.value) return;
  const csv = exportExcelCsv(mindDocument.value, activeSheet.value?.id);
  downloadText(csv, `${mindDocument.value.title}.csv`, 'text/csv');
}

function onExportWord() {
  if (!mindDocument.value) return;
  const xml = exportWordOutline(mindDocument.value);
  downloadText(xml, `${mindDocument.value.title}.doc`, 'application/msword');
}

async function onImport() {
  try {
    const file = await pickImportFile();
    const lower = file.name.toLowerCase();
    let root: Topic;
    if (lower.endsWith('.opml')) {
      root = importOpml(file.text!);
    } else if (lower.endsWith('.mm')) {
      root = importFreeMind(file.text!);
    } else if (lower.endsWith('.txt')) {
      root = importPlainTextIndented(file.text!);
    } else if (lower.endsWith('.xmind')) {
      root = importXMind(file.buffer!);
    } else {
      root = importMarkdown(file.text!);
    }
    applyImportedTopic(root);
  } catch {
    // user cancelled file picker
  }
}

function applyImportedTopic(root: Topic) {
  if (!mindDocument.value || !activeSheet.value) return;
  const sheetId = activeSheet.value.id;
  const updated = {
    ...mindDocument.value,
    sheets: mindDocument.value.sheets.map((s) =>
      s.id === sheetId ? { ...s, rootTopic: root } : s,
    ),
  };
  docStore.document = updated;
  docStore.commandBus = new CommandBus(updated);
  docStore.selection = [root.id];
  fitInitial();
}

function onExportJson() {
  if (!mindDocument.value) return;
  downloadAsJson(mindDocument.value);
}

function onSwitchSheet(sheetId: string) {
  docStore.setActiveSheet(sheetId);
  fitInitial();
}

function onInsertSummary() {
  if (!activeSheet.value || selection.value.length < 2) return;
  const root = activeSheet.value.rootTopic;
  const first = selection.value[0]!;
  const parent = findParentOfTopic(root, first);
  if (!parent) return;
  if (!selection.value.every((id) => parent.children.some((c) => c.id === id))) return;

  const indices = selection.value
    .map((id) => parent.children.findIndex((c) => c.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length < 2) return;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i]! !== indices[i - 1]! + 1) return;
  }
  const startId = parent.children[indices[0]!]!.id;
  const endId = parent.children[indices[indices.length - 1]!]!.id;
  dispatch(new AddSummaryCommand(activeSheet.value.id, parent.id, [startId, endId]));
}

function onInsertBoundary() {
  if (!activeSheet.value || selection.value.length === 0) return;
  dispatch(new AddBoundaryCommand(activeSheet.value.id, [...selection.value], '外框'));
}

function onInsertRelationship() {
  if (!activeSheet.value || selection.value.length < 2) return;
  const fromId = selection.value[0]!;
  const toId = selection.value[1]!;
  if (fromId === toId) return;
  dispatch(new AddRelationshipCommand(activeSheet.value.id, fromId, toId, '关联'));
}

async function onInsertAction(id: InsertActionId) {
  if (!activeSheet.value) return;
  const result = await buildInsertAction(id, activeSheet.value, selection.value);
  if (!result) return;
  if (result.command) dispatch(result.command);
  recordRecentInsert(id);
  if (result.focusPanel) {
    panelFocus.value = result.focusPanel;
  }
}

function onCanvasContextMenu(payload: { clientX: number; clientY: number; topicId: string | null }) {
  if (payload.topicId) {
    if (!selection.value.includes(payload.topicId)) {
      setSelection([payload.topicId]);
      selectionAnchorId.value = payload.topicId;
    }
  }
  openCtxMenu(payload.clientX, payload.clientY, payload.topicId);
}

function findTopicById(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  return null;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && editingTopic.value) {
    closeEditor();
    return;
  }

  if (e.key === 'Tab' && e.shiftKey && activeSheet.value && selectedId.value && !isEditableTarget(e)) {
    e.preventDefault();
    dispatch(new InsertParentTopicCommand(activeSheet.value.id, selectedId.value));
    return;
  }

  if (e.key === 'Tab' && !e.shiftKey && activeSheet.value && selectedId.value) {
    if (isEditableTarget(e)) {
      const input = e.target as HTMLInputElement;
      if (input.classList.contains('topic-text-editor')) {
        input.blur();
      } else if (input.classList.contains('outliner-input')) {
        return;
      }
    }
    e.preventDefault();
    const sheetId = activeSheet.value.id;
    const sel = selectedId.value;
    dispatchAddTopic(new AddTopicCommand(sheetId, sel, '分支主题'));
    return;
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && activeSheet.value && selection.value.length > 0 && !isEditableTarget(e) && !editingTopic.value) {
    // Backspace opens editor when used for typing; only Delete deletes with confirm
    if (e.key === 'Backspace') {
      // fall through to edit keys unless ctrl
      if (!e.ctrlKey) {
        /* handled below */
      }
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      const sheetId = activeSheet.value.id;
      const root = activeSheet.value.rootTopic;
      const rootId = root.id;
      const selected = new Set(selection.value.filter((id) => id !== rootId));
      if (selected.size === 0) return;
      if (!window.confirm(`确定删除选中的 ${selected.size} 个主题及其子树？`)) return;

      const toDelete = [...selected].filter((id) => {
        let parent = findParentOfTopic(root, id);
        while (parent) {
          if (selected.has(parent.id)) return false;
          parent = findParentOfTopic(root, parent.id);
        }
        return true;
      });

      for (const id of toDelete) {
        dispatch(new DeleteTopicCommand(sheetId, id));
      }
      setSelection([rootId]);
      selectionAnchorId.value = rootId;
      return;
    }
  }

  if (handleCanvasEditKeys(e)) return;

  if (isEditableTarget(e)) return;
  if (e.key === 'Escape' && zenActive.value) {
    toggleZen();
    return;
  }
  if (e.key === 'Escape' && pitchActive.value) {
    exitPitch();
    return;
  }

  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    searchInputRef.value?.focus();
    searchInputRef.value?.select();
    return;
  }

  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    showReplace.value = !showReplace.value;
    return;
  }

  if (e.ctrlKey && (e.key === ']' || e.key === '】')) {
    e.preventDefault();
    onInsertSummary();
    return;
  }
  if (e.ctrlKey && e.key === 'g') {
    e.preventDefault();
    onInsertBoundary();
    return;
  }
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    onInsertRelationship();
    return;
  }

  if ((e.key === ' ' || e.code === 'Space') && activeSheet.value && selectedId.value && !e.ctrlKey) {
    e.preventDefault();
    dispatch(new ToggleCollapseCommand(activeSheet.value.id, selectedId.value));
    return;
  }

  if (e.ctrlKey && e.key === 'c' && !isEditableTarget(e)) {
    if (!activeSheet.value || !selectedId.value) return;
    if (copyTopic(activeSheet.value.id, activeSheet.value.rootTopic, selectedId.value)) {
      e.preventDefault();
    }
    return;
  }
  if (e.ctrlKey && e.key === 'v' && !isEditableTarget(e)) {
    if (!activeSheet.value || !selectedId.value || !canPaste()) return;
    const cmd = buildPasteCommand(activeSheet.value.id, selectedId.value);
    if (cmd) {
      e.preventDefault();
      dispatch(cmd);
    }
    return;
  }

  if (pitchActive.value) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      pitchNext();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      pitchPrev();
      return;
    }
  }

  if (!activeSheet.value || !selectedId.value) return;
  const sheetId = activeSheet.value.id;
  const sel = selectedId.value;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    navigateByArrow(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const isRoot = sel === activeSheet.value.rootTopic.id;
    if (isRoot) {
      dispatchAddTopic(new AddTopicCommand(sheetId, sel, '分支主题'));
    } else {
      dispatchAddTopic(new AddTopicCommand(sheetId, sel, '同级主题', undefined, true));
    }
  } else if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && e.key === 'y') {
    e.preventDefault();
    redo();
  } else if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    onSave();
  }
}

function navigateByArrow(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  if (!activeSheet.value || !selectedId.value) return;
  const root = activeSheet.value.rootTopic;
  const parent = findParentOfTopic(root, selectedId.value);
  const topic = findTopicByIdLocal(root, selectedId.value);
  if (!topic) return;

  if (key === 'ArrowDown' && topic.children.length && !topic.collapsed) {
    setSelection([topic.children[0]!.id]);
    selectionAnchorId.value = topic.children[0]!.id;
    revealTopic(topic.children[0]!.id);
    return;
  }
  if (key === 'ArrowUp' && parent) {
    setSelection([parent.id]);
    selectionAnchorId.value = parent.id;
    revealTopic(parent.id);
    return;
  }
  if ((key === 'ArrowLeft' || key === 'ArrowRight') && parent) {
    const idx = parent.children.findIndex((c) => c.id === selectedId.value);
    const next = key === 'ArrowLeft' ? parent.children[idx - 1] : parent.children[idx + 1];
    if (next) {
      setSelection([next.id]);
      selectionAnchorId.value = next.id;
      revealTopic(next.id);
    }
  }
}

function findTopicByIdLocal(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const f = findTopicByIdLocal(c, id);
    if (f) return f;
  }
  return null;
}

function onFormatPainter() {
  if (!selectedId.value) return;
  if (!formatPainterSource.value) {
    formatPainterSource.value = selectedId.value;
    return;
  }
  if (!activeSheet.value) return;
  const targets = selection.value.filter((id) => id !== formatPainterSource.value);
  if (targets.length) {
    dispatch(new FormatPainterCommand(activeSheet.value.id, formatPainterSource.value, targets));
  }
  formatPainterSource.value = null;
}

function onSaveAs() {
  if (!mindDocument.value) return;
  const title = window.prompt('另存为', `${mindDocument.value.title} 副本`);
  if (!title) return;
  const cmd = new SaveAsDocumentCommand(title);
  const next = cmd.execute(mindDocument.value);
  docStore.document = next;
  docStore.commandBus = new CommandBus(next);
  downloadAsJson(next);
}

async function onShowRecent() {
  const docs = await listDocuments();
  recentDocs.value = docs.map((d) => ({ id: d.id, title: d.title }));
  showRecent.value = true;
}

async function openRecent(id: string) {
  const doc = await loadDocument(id);
  if (!doc) return;
  docStore.document = doc;
  docStore.activeSheetId = doc.sheets[0]!.id;
  docStore.selection = [doc.sheets[0]!.rootTopic.id];
  docStore.commandBus = new CommandBus(doc);
  showRecent.value = false;
  fitInitial();
}

function onAddFloating() {
  if (!activeSheet.value) return;
  const cmd = new AddFloatingTopicCommand(activeSheet.value.id);
  dispatch(cmd);
  if (cmd.addedTopicId) {
    setSelection([cmd.addedTopicId]);
  }
}

function onCopySheet() {
  if (!activeSheet.value) return;
  const cmd = new CopySheetCommand(activeSheet.value.id);
  dispatch(cmd);
  if (cmd.addedSheetId) {
    docStore.setActiveSheet(cmd.addedSheetId);
    fitInitial();
  }
}

function onReplaceAll() {
  if (!activeSheet.value || !replaceFind.value) return;
  dispatch(new ReplaceTextCommand(activeSheet.value.id, replaceFind.value, replaceWith.value, true));
}

function onExportPdf() {
  if (!mindDocument.value) return;
  const bytes = exportPdf(mindDocument.value, activeSheet.value?.id);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy], { type: 'application/pdf' }), `${mindDocument.value.title}.pdf`);
}

function onExportPpt() {
  if (!mindDocument.value || !activeSheet.value) return;
  const html = exportPptxOutline(mindDocument.value, activeSheet.value);
  downloadText(html, `${mindDocument.value.title}-pitch.html`, 'text/html');
}

function onExportExcel() {
  if (!mindDocument.value) return;
  const xml = exportExcelXml(mindDocument.value, activeSheet.value?.id);
  downloadText(xml, `${mindDocument.value.title}.xml`, 'application/vnd.ms-excel');
}

function onExportTextBundle() {
  if (!mindDocument.value) return;
  const bundle = exportTextBundle(mindDocument.value);
  downloadText(bundle.textMd, `${mindDocument.value.title}.textbundle.md`, 'text/markdown');
  downloadText(bundle.infoJson, `${mindDocument.value.title}.info.json`, 'application/json');
}

function onEncryptSave() {
  if (!mindDocument.value) return;
  const pwd = window.prompt('设置打开密码');
  if (pwd === null) return;
  const enc = encryptDocumentJson(serializeDocument(mindDocument.value), pwd);
  downloadText(enc, `${mindDocument.value.title}.mymind.enc`, 'application/json');
}

function onOpenEncrypted() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.enc,.mymind,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (isEncryptedDocumentJson(text)) {
      const pwd = window.prompt('输入密码') ?? '';
      try {
        const json = decryptDocumentJson(text, pwd);
        const doc = deserializeDocument(json);
        docStore.document = doc;
        docStore.activeSheetId = doc.sheets[0]!.id;
        docStore.selection = [doc.sheets[0]!.rootTopic.id];
        docStore.commandBus = new CommandBus(doc);
        fitInitial();
      } catch {
        window.alert('解密失败');
      }
    } else {
      window.alert('不是加密文件');
    }
  };
  input.click();
}

function onSaveAsTemplate() {
  if (!mindDocument.value) return;
  const name = window.prompt('模板名称', mindDocument.value.title);
  if (!name) return;
  const tpl = documentToUserTemplate(mindDocument.value, name);
  const key = 'mymind-user-templates';
  const raw = localStorage.getItem(key);
  const list = raw ? (JSON.parse(raw) as unknown[]) : [];
  list.push(tpl);
  localStorage.setItem(key, JSON.stringify(list));
  window.alert('已保存到本地模板库');
}

function onMergeFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mymind,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file || !mindDocument.value) return;
    const doc = deserializeDocument(await file.text());
    const merged = mergeDocuments(mindDocument.value, [doc]);
    docStore.document = merged;
    docStore.commandBus = new CommandBus(merged);
    fitInitial();
  };
  input.click();
}

function onTopicMove(payload: { topicId: string; newParentId: string; newIndex: number }) {
  if (!activeSheet.value) return;
  dispatch(new MoveTopicCommand(activeSheet.value.id, payload.topicId, payload.newParentId, payload.newIndex));
}

function onMinimapNavigate(x: number, y: number) {
  viewport.value = { ...viewport.value, x, y };
}

function revealTopic(topicId: string) {
  if (!activeSheet.value) return;
  const registry = createDefaultLayoutRegistry();
  const layout = registry.layout(activeSheet.value, createMeasureFn());
  const node = layout.nodes.get(topicId);
  if (!node || node.hidden) return;
  ensureVisible({ x: node.x, y: node.y, width: node.width, height: node.height });
}

function dispatchAddTopic(cmd: AddTopicCommand) {
  dispatch(cmd);
  if (cmd.addedTopicId) {
    setSelection([cmd.addedTopicId]);
    selectionAnchorId.value = cmd.addedTopicId;
    revealTopic(cmd.addedTopicId);
  }
}

function onWheel(e: WheelEvent) {
  if (e.ctrlKey) {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? -0.1 : 0.1);
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown, true);
});
</script>

<template>
  <div class="app-shell" @wheel="onWheel">
    <header class="toolbar">
      <span class="logo">{{ t('app.title') }}</span>
      <button @click="showNewDialog = true">{{ t('toolbar.new') }}</button>
      <button :disabled="!canUndo" @click="undo">{{ t('toolbar.undo') }}</button>
      <button :disabled="!canRedo" @click="redo">{{ t('toolbar.redo') }}</button>
      <button :class="{ active: formatPainterSource }" title="格式刷：先点源主题再点此按钮，再选目标" @click="onFormatPainter">格式刷</button>
      <button @click="onSave">{{ t('toolbar.save') }}</button>
      <button @click="onSaveAs">另存为</button>
      <button @click="onShowRecent">最近</button>
      <button @click="onOpen">{{ t('toolbar.open') }}</button>
      <button @click="onOpenEncrypted">打开加密</button>
      <button @click="onEncryptSave">加密保存</button>
      <button @click="onMergeFile">合并</button>
      <button @click="onImport">导入</button>
      <button @click="onExportJson">JSON</button>
      <button @click="onExportPng">PNG</button>
      <button @click="onExportSvg">SVG</button>
      <button @click="onExportPdf">PDF</button>
      <button @click="onExportMarkdown">MD</button>
      <button @click="onExportOpml">OPML</button>
      <button @click="onExportCsv">CSV</button>
      <button @click="onExportExcel">Excel</button>
      <button @click="onExportWord">Word</button>
      <button @click="onExportPpt">演说稿</button>
      <button @click="onExportTextBundle">TextBundle</button>
      <button title="概要 Ctrl+]" @click="onInsertSummary">概要</button>
      <button title="外框 Ctrl+G" @click="onInsertBoundary">外框</button>
      <button title="关系 Ctrl+L" @click="onInsertRelationship">关系</button>
      <button @click="onAddFloating">自由主题</button>
      <button @click="onCopySheet">复制画布</button>
      <InsertMenu :sheet="activeSheet" :selection="selection" @insert="onInsertAction" />
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索 Ctrl+F"
        @input="search"
      />
      <button @click="showReplace = !showReplace">替换</button>
      <button @click="showTemplates = true">模板</button>
      <button @click="onSaveAsTemplate">存为模板</button>
      <button @click="showPrint = true">打印</button>
      <button @click="showOutliner = !showOutliner">大纲</button>
      <button @click="showPanel = !showPanel">属性</button>
      <button @click="showMinimap = !showMinimap">小地图</button>
      <button
        @click="selectedId ? (branchFocusId === selectedId ? clearBranchFocus() : focusBranch(selectedId)) : clearBranchFocus()"
      >
        {{ branchFocusId ? '退出聚焦' : '分支聚焦' }}
      </button>
      <button @click="pitchActive ? exitPitch() : enterPitch()">{{ pitchActive ? '退出演说' : '演说' }}</button>
      <button @click="toggleZen">{{ zenActive ? '退出 ZEN' : 'ZEN' }}</button>
      <button @click="fitInitial">适应窗口</button>
    </header>

    <div v-if="showReplace" class="replace-bar">
      <input v-model="replaceFind" placeholder="查找" />
      <input v-model="replaceWith" placeholder="替换为" />
      <button @click="onReplaceAll">全部替换</button>
      <button @click="showReplace = false">关闭</button>
    </div>

    <div v-if="showRecent" class="recent-panel">
      <div class="recent-title">最近文件</div>
      <button v-for="d in recentDocs" :key="d.id" @click="openRecent(d.id)">{{ d.title || d.id }}</button>
      <button @click="showRecent = false">关闭</button>
    </div>

    <SheetTabs
      :document="mindDocument"
      :active-sheet-id="docStore.activeSheetId"
      @switch="onSwitchSheet"
    />

    <main class="main">
      <OutlinerView
        v-if="!zenActive && !pitchActive && showOutliner"
        :sheet="activeSheet"
        :selected-ids="pitchActive ? (pitchTopicId ? [pitchTopicId] : []) : selection"
        @select="onOutlinerSelect"
        @move="onTopicMove"
      />
      <div class="canvas-wrap">
        <CanvasView
          :sheet="activeSheet"
          :viewport="viewport"
          :selected-ids="pitchActive ? (pitchTopicId ? [pitchTopicId] : []) : selection"
          :visible-topic-ids="branchVisibleIds"
          @select="onCanvasSelect"
          @edit-topic="startEditingTopic"
          @pan="(dx, dy) => pan(dx, dy)"
          @resize="onCanvasResize"
          @context-menu="onCanvasContextMenu"
          @move-topic="onTopicMove"
        />
        <Minimap
          v-if="showMinimap && !zenActive"
          :sheet="activeSheet"
          :viewport="viewport"
          :view-width="viewWidth"
          :view-height="viewHeight"
          @navigate="onMinimapNavigate"
        />
      </div>
      <PropertyPanel
        v-if="!zenActive && !pitchActive && showPanel"
        :sheet="activeSheet"
        :selected-id="selectedId"
        :focus-field="panelFocus"
        @focus-consumed="panelFocus = null"
        @start-pitch="enterPitch"
      />
    </main>

    <ContextInsertMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :sheet="activeSheet"
      :selection="selection"
      @insert="onInsertAction"
      @close="closeCtxMenu"
    />

    <div v-if="pitchActive" class="pitch-bar">
      <button @click="pitchPrev">上一帧</button>
      <span>{{ pitchTopicId ?? '—' }}</span>
      <button @click="pitchNext">下一帧</button>
    </div>

    <ul v-if="searchResults.length && !zenActive" class="search-results">
      <li v-for="r in searchResults" :key="r.topicId + r.matchField" @click="selectResult(r)">
        {{ r.title }} — {{ r.snippet }}
      </li>
    </ul>

    <StatusBar
      :zoom-percent="zoomPercent"
      @zoom-change="(p) => setZoom(p / 100)"
      @toggle-outline="showOutliner = !showOutliner"
      @fit="fitInitial"
      @center="fitInitial"
    />

    <NewDocumentDialog
      v-if="showNewDialog"
      @confirm="onNewConfirm"
      @cancel="showNewDialog = false"
    />
    <TemplatePicker v-if="showTemplates" @select="showTemplates = false" @cancel="showTemplates = false" />
    <PrintPreview v-if="showPrint" :document="mindDocument" @close="showPrint = false" />

    <input
      ref="keyboardCaptureRef"
      class="keyboard-capture"
      tabindex="-1"
      aria-hidden="true"
      @beforeinput="onCaptureBeforeInput"
      @input="onCaptureInput"
    />

    <TopicTextEditor
      v-if="editingTopic && activeSheet && !zenActive && !pitchActive"
      ref="canvasEditorRef"
      :key="editingTopic.topicId + String(editingTopic.initialText ?? '')"
      :sheet-id="activeSheet.id"
      :topic-id="editingTopic.topicId"
      :title="findTopicById(activeSheet.rootTopic, editingTopic.topicId)?.title ?? ''"
      :left="editingTopic.left"
      :top="editingTopic.top"
      :width="editingTopic.width"
      :height="editingTopic.height"
      :initial-text="editingTopic.initialText"
      @close="closeEditor"
    />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html,
body,
#app {
  height: 100%;
  font-family: system-ui, sans-serif;
}
</style>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}
.logo {
  font-weight: 600;
  margin-right: 12px;
}
.toolbar button {
  padding: 4px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toolbar button.active {
  background: #e8f4fd;
  border-color: #4a90d9;
}
.toolbar {
  flex-wrap: wrap;
}
.canvas-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
  display: flex;
}
.replace-bar,
.recent-panel {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
  background: #fffbe6;
  border-bottom: 1px solid #f0e6c8;
}
.recent-panel {
  flex-direction: column;
  align-items: stretch;
  max-height: 200px;
  overflow: auto;
}
.recent-title {
  font-weight: 600;
  font-size: 13px;
}
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fafafa;
}
.main :deep(.canvas-view) {
  flex: 1;
  min-width: 0;
}
.search-input {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-left: auto;
}
.search-results {
  position: absolute;
  top: 48px;
  right: 300px;
  background: #fff;
  border: 1px solid #ddd;
  list-style: none;
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  min-width: 240px;
}
.search-results li {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.search-results li:hover {
  background: #e8f4fd;
}
.pitch-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 8px;
  background: #333;
  color: #fff;
}
.pitch-bar button {
  padding: 4px 12px;
  cursor: pointer;
}
.keyboard-capture {
  position: fixed;
  opacity: 0;
  width: 0;
  height: 0;
  padding: 0;
  border: none;
  pointer-events: none;
}
</style>
