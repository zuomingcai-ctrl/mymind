<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox, ElMessage } from 'element-plus';
import {
  AddTopicCommand,
  DeleteTopicCommand,
  AddSummaryCommand,
  AddBoundaryCommand,
  AddRelationshipCommand,
  DeleteSummaryCommand,
  DeleteBoundaryCommand,
  DeleteRelationshipCommand,
  DeleteCalloutCommand,
  UpdateCalloutCommand,
  UpdateTopicStyleCommand,
  findTopicByCalloutId,
  UpdateRelationshipControlPointsCommand,
  UpdateRelationshipTitleCommand,
  relationshipLabelPoint,
  ToggleCollapseCommand,
  InsertParentTopicCommand,
  AddFloatingTopicCommand,
  DeleteFloatingTopicCommand,
  FormatPainterCommand,
  SaveAsDocumentCommand,
  CopySheetCommand,
  ReplaceTextCommand,
  MoveTopicCommand,
  findTopicInSheet,
  createDefaultLayoutRegistry,
  createMeasureFn,
  themeFontSizeResolver,
  getTheme,
  findParentOfTopic,
  findParentInSheet,
  isFloatingTopicRoot,
  type Topic,
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
  exportPptx,
  exportTextBundleZip,
  encryptDocumentJsonV2,
  decryptDocumentJsonV2,
  decryptDocumentJson,
  isEncryptedDocumentJsonAny,
  isEncryptedV2,
  serializeDocument,
  deserializeDocument,
  mergeDocuments,
  documentToUserTemplate,
  countTopics,
  topicWordStats,
  UpdateDecorationCommand,
  AddDecorationCommand,
  DeleteDecorationCommand,
  AddMarkerCommand,
  DeleteMarkerCommand,
  decorationOffsetBesideTopic,
  decorationAtViewportCenter,
  type DecorationAsset,
} from '@mymind/core';
import { useDocument } from './composables/useDocument';
import { useViewport } from './composables/useViewport';
import { useCanvasWheel } from './composables/useCanvasWheel';
import { useDocumentStore } from './stores/document';
import CanvasView from './components/canvas/CanvasView.vue';
import type { StructureSelectionKind } from './components/canvas/CanvasView.vue';
import OutlinerView from './components/outliner/OutlinerView.vue';
import PropertyPanel from './components/property-panel/PropertyPanel.vue';
import MarkerLibraryPanel from './components/property-panel/MarkerLibraryPanel.vue';
import MarkerEditPopover from './components/MarkerEditPopover.vue';
import StatusBar from './components/StatusBar.vue';
import TemplatePicker from './components/TemplatePicker.vue';
import PrintPreview from './components/PrintPreview.vue';
import TopicTextEditor from './components/TopicTextEditor.vue';
import SheetTabs from './components/SheetTabs.vue';
import NewDocumentDialog from './components/NewDocumentDialog.vue';
import Toolbar from './components/Toolbar.vue';
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

const { t } = useI18n();
const {
  query: searchQuery,
  results: searchResults,
  search,
  selectResult,
  includeRelationships,
} = useSearch();
const { active: zenActive, toggle: toggleZen } = useZenMode();
useAutoSave();
const { focusId: branchFocusId, visibleIds: branchVisibleIds, focus: focusBranch, clear: clearBranchFocus } = useBranchFocus();
useLabelFilter();
const searchInputRef = ref<{ focus: () => void; select?: () => void; input?: HTMLInputElement } | null>(null);
const formatPainterSource = ref<string | null>(null);
const showRecent = ref(false);
const recentDocs = ref<{ id: string; title: string }[]>([]);
const showReplace = ref(false);
const replaceFind = ref('');
const replaceWith = ref('');
const showOutliner = ref(true);
const showPanel = ref(true);
/** XMind-style right panel: properties (样式/画布) vs library (标记/贴纸/插画) */
const rightPanelMode = ref<'properties' | 'library'>('properties');
const showMinimap = ref(true);
const selectedDecorationId = ref<string | null>(null);
const alignGuides = ref<Array<{ orientation: 'v' | 'h'; pos: number }>>([]);
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
const docStore = useDocumentStore();
const isDirty = computed(() => docStore.isDirty);
const hasDocument = computed(() => !!docStore.document);
const statusNodeCount = computed(() => {
  if (!activeSheet.value) return 0;
  return (
    countTopics(activeSheet.value.rootTopic) +
    activeSheet.value.floatingTopics.reduce((n, t) => n + countTopics(t), 0)
  );
});
const statusWordStats = computed(() => {
  if (!activeSheet.value || !selectedId.value) return null;
  const walk = (t: Topic): Topic | null => {
    if (t.id === selectedId.value) return t;
    for (const c of t.children) {
      const f = walk(c);
      if (f) return f;
    }
    return null;
  };
  const topic = walk(activeSheet.value.rootTopic);
  return topic ? topicWordStats(topic) : null;
});
const selectionAnnounce = computed(() => {
  if (!selectedId.value || !activeSheet.value) return '';
  const walk = (t: Topic): string | null => {
    if (t.id === selectedId.value) return t.title;
    for (const c of t.children) {
      const f = walk(c);
      if (f) return f;
    }
    return null;
  };
  return walk(activeSheet.value.rootTopic) ?? '';
});

function onSearchQueryUpdate(v: string) {
  searchQuery.value = v;
}

function onSearchRef(el: unknown) {
  searchInputRef.value = el as typeof searchInputRef.value;
}

function focusSearch() {
  const el = searchInputRef.value;
  if (!el) return;
  const input =
    el.input ??
    ((el as { $el?: HTMLElement }).$el?.querySelector?.('input') as HTMLInputElement | null | undefined);
  if (input) {
    input.focus();
    input.select();
  } else {
    el.focus?.();
  }
}

function onToggleBranchFocus() {
  if (!selectedId.value) {
    clearBranchFocus();
    return;
  }
  if (branchFocusId.value === selectedId.value) clearBranchFocus();
  else focusBranch(selectedId.value);
}

const selectionAnchorId = ref<string | null>(null);

const { viewport, zoomPercent, setZoom, fitContent, zoomBy, pan, ensureVisible, viewWidth, viewHeight } =
  useViewport();
const { onWheel } = useCanvasWheel(pan, zoomBy);

function sheetMeasure(sheet = activeSheet.value) {
  if (!sheet) return createMeasureFn();
  return createMeasureFn({
    resolveFontSize: themeFontSizeResolver(getTheme(sheet.canvasSettings.themeId)),
  });
}

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
const editingRelationship = ref<{
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  title: string;
} | null>(null);
const editingMarker = ref<{
  topicId: string;
  markerId: string;
  left: number;
  top: number;
} | null>(null);
const keyboardCaptureRef = ref<HTMLInputElement | null>(null);
const canvasEditorRef = ref<InstanceType<typeof TopicTextEditor> | null>(null);
const { copyTopic, canPaste, buildPasteCommand } = useClipboard();
const { menu: ctxMenu, openAt: openCtxMenu, close: closeCtxMenu } = useContextMenu();
const { record: recordRecentInsert } = useRecentInserts();
const panelFocus = ref<'note' | 'comment' | 'todo' | 'task' | 'equation' | 'hyperlink' | null>(null);
const selectedStructure = ref<{ kind: StructureSelectionKind; id: string } | null>(null);

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
  window.addEventListener('beforeunload', onBeforeUnload);
  nextTick(() => focusKeyboardCapture());
});

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!docStore.isDirty) return;
  e.preventDefault();
  e.returnValue = '';
}

watch(selectedId, (id) => {
  if (editingTopic.value && editingTopic.value.topicId !== id) {
    editingTopic.value = null;
  }
  nextTick(() => {
    syncKeyboardCapturePosition();
    // Do not steal focus from property panel / toolbar search / editors.
    if (isIntentionalUiFocus(document.activeElement)) return;
    focusKeyboardCapture();
  });
});

watch(
  viewport,
  () => {
    syncKeyboardCapturePosition();
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

const keyboardCaptureStyle = ref({
  left: '0px',
  top: '0px',
  width: '1px',
  height: '1px',
});

/** UI regions that must keep keyboard focus (not the canvas capture input). */
const INTENTIONAL_UI_FOCUS_SELECTOR =
  '.topic-text-editor, .outliner-input, .outliner, .property-panel, .toolbar, .search-input, .el-dialog, .el-message-box, .el-overlay, .rel-title-editor, .marker-popover';

function isIntentionalUiFocus(el: Element | null | undefined): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el === keyboardCaptureRef.value) return false;
  if (el === document.body || el === document.documentElement) return false;
  return !!el.closest(INTENTIONAL_UI_FOCUS_SELECTOR);
}

function focusKeyboardCapture() {
  if (zenActive.value) return;
  if (editingTopic.value || editingRelationship.value) return;
  // Never yank focus away from panel / search / other editors.
  if (isIntentionalUiFocus(document.activeElement)) return;
  syncKeyboardCapturePosition();
  const el = keyboardCaptureRef.value;
  if (!el) return;
  if (document.activeElement === el) return;
  el.focus({ preventScroll: true });
}

function syncKeyboardCapturePosition() {
  const topicId = selectedId.value;
  if (!topicId) return;
  const layout = computeEditorLayout(topicId);
  if (!layout) return;
  keyboardCaptureStyle.value = {
    left: `${layout.left}px`,
    top: `${layout.top}px`,
    width: `${Math.max(layout.width, 40)}px`,
    height: `${Math.max(layout.height, 24)}px`,
  };
}

function reclaimKeyboardCaptureIfNeeded() {
  if (zenActive.value) return;
  if (editingTopic.value || editingRelationship.value) return;
  const active = document.activeElement;
  if (active === keyboardCaptureRef.value) return;
  if (isIntentionalUiFocus(active)) return;
  // During click focus transfer, activeElement is often <body> briefly — wait one more frame.
  if (active === document.body || active === document.documentElement || !(active instanceof HTMLElement)) {
    requestAnimationFrame(() => {
      if (zenActive.value) return;
      if (editingTopic.value || editingRelationship.value) return;
      if (document.activeElement === keyboardCaptureRef.value) return;
      if (isIntentionalUiFocus(document.activeElement)) return;
      focusKeyboardCapture();
    });
    return;
  }
  focusKeyboardCapture();
}

function onKeyboardCaptureBlur() {
  // Keep canvas keyboard focus unless another intentional editor took it.
  // Use rAF so the click target has time to receive focus before we reclaim.
  requestAnimationFrame(() => {
    nextTick(() => reclaimKeyboardCaptureIfNeeded());
  });
}

function canStartCanvasEdit(e: KeyboardEvent | Event): boolean {
  if (!activeSheet.value || !selectedId.value || zenActive.value) return false;
  const t = (e.target as HTMLElement | null) ?? document.activeElement;
  if (!(t instanceof HTMLElement)) return true;
  if (isIntentionalUiFocus(t)) return false;
  return true;
}

function computeEditorLayout(topicId: string) {
  if (!activeSheet.value) return null;
  const canvas = window.document.querySelector('.canvas-view') as HTMLCanvasElement | null;
  if (!canvas) return null;

  const registry = createDefaultLayoutRegistry();
  const layout = registry.layout(activeSheet.value, sheetMeasure());
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
  editingMarker.value = null;
  editingTopic.value = {
    topicId: payload.id,
    left: payload.left,
    top: payload.top,
    width: payload.width,
    height: payload.height,
  };
}

function startEditingMarker(payload: {
  topicId: string;
  markerId: string;
  left: number;
  top: number;
}) {
  closeEditor();
  editingRelationship.value = null;
  editingMarker.value = payload;
}

function closeMarkerPopover() {
  editingMarker.value = null;
}

function onSwitchMarker(markerId: string) {
  if (!activeSheet.value || !editingMarker.value) return;
  const { topicId, markerId: current } = editingMarker.value;
  if (markerId !== current) {
    dispatch(new AddMarkerCommand(activeSheet.value.id, topicId, markerId));
  }
  editingMarker.value = null;
}

function onRemoveMarker() {
  if (!activeSheet.value || !editingMarker.value) return;
  dispatch(
    new DeleteMarkerCommand(
      activeSheet.value.id,
      editingMarker.value.topicId,
      editingMarker.value.markerId,
    ),
  );
  editingMarker.value = null;
}

function applyTopicSelect(id: string | null, mods: SelectionModifiers = {}) {
  closeEditor();
  editingMarker.value = null;
  if (id && activeSheet.value) {
    const summary = activeSheet.value.summaries.find((s) => s.summaryTopicId === id);
    selectedStructure.value = summary ? { kind: 'summary', id: summary.id } : null;
  } else {
    selectedStructure.value = null;
  }
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
  if (id && next.includes(id)) {
    revealTopic(id);
  }
}

function onCanvasSelect(payload: {
  id: string | null;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  applyTopicSelect(payload.id, payload);
}

function onToggleCollapse(topicId: string) {
  if (!activeSheet.value) return;
  dispatch(new ToggleCollapseCommand(activeSheet.value.id, topicId));
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
  const layout = registry.layout(activeSheet.value, sheetMeasure());
  fitContent(layout.bounds);
}

function onNewConfirm(variantId: string) {
  newDocument(variantId);
  showNewDialog.value = false;
  fitInitial();
}

/** Returns true if caller may proceed (saved, discarded, or not dirty). */
async function confirmDiscardIfDirty(): Promise<boolean> {
  if (!docStore.isDirty) return true;
  try {
    await ElMessageBox.confirm(t('toolbar.unsavedMessage'), t('toolbar.unsavedTitle'), {
      distinguishCancelAndClose: true,
      confirmButtonText: t('toolbar.saveAndContinue'),
      cancelButtonText: t('toolbar.discard'),
      type: 'warning',
    });
    await onSave();
    return true;
  } catch (action) {
    return action === 'cancel';
  }
}

async function onRequestNew() {
  if (!(await confirmDiscardIfDirty())) return;
  showNewDialog.value = true;
}

async function onCloseDocument() {
  if (!(await confirmDiscardIfDirty())) return;
  docStore.closeDocument();
}

async function onSave() {
  if (mindDocument.value) {
    await saveDocument(mindDocument.value);
    docStore.markClean();
  }
}

async function onOpen() {
  if (!(await confirmDiscardIfDirty())) return;
  const doc = await openJsonFile();
  docStore.loadDocument(doc);
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
  const layout = registry.layout(activeSheet.value, sheetMeasure());
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
  docStore.loadDocument(updated);
  docStore.setSelection([root.id]);
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
  if (!activeSheet.value) return;
  if (selection.value.length < 2) {
    ElMessage.warning('请先选中至少 2 个同级连续主题，再插入概要');
    return;
  }
  const root = activeSheet.value.rootTopic;
  const first = selection.value[0]!;
  const parent = findParentOfTopic(root, first);
  if (!parent) {
    ElMessage.warning('概要只能加在同一父主题下的子主题上，不能包含中心主题');
    return;
  }
  if (!selection.value.every((id) => parent.children.some((c) => c.id === id))) {
    ElMessage.warning('所选主题必须是同一父主题下的同级节点');
    return;
  }

  const indices = selection.value
    .map((id) => parent.children.findIndex((c) => c.id === id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length < 2) {
    ElMessage.warning('请先选中至少 2 个同级连续主题，再插入概要');
    return;
  }
  for (let i = 1; i < indices.length; i++) {
    if (indices[i]! !== indices[i - 1]! + 1) {
      ElMessage.warning('所选主题必须在兄弟顺序中连续（不可跳选）');
      return;
    }
  }
  const startId = parent.children[indices[0]!]!.id;
  const endId = parent.children[indices[indices.length - 1]!]!.id;
  dispatch(new AddSummaryCommand(activeSheet.value.id, parent.id, [startId, endId]));

  const sheet = docStore.activeSheet;
  const created = sheet?.summaries.find(
    (s) => s.parentTopicId === parent.id && s.topicRange[0] === startId && s.topicRange[1] === endId,
  );
  if (created?.summaryTopicId) {
    selectedStructure.value = { kind: 'summary', id: created.id };
    setSelection([created.summaryTopicId]);
    selectionAnchorId.value = created.summaryTopicId;
    nextTick(() => openEditorForSelection());
  }
}

function onInsertBoundary() {
  if (!activeSheet.value || selection.value.length === 0) return;
  dispatch(new AddBoundaryCommand(activeSheet.value.id, [...selection.value], '外框'));
}

function onInsertRelationship() {
  if (!activeSheet.value) return;
  if (selection.value.length < 2) {
    ElMessage.warning('请先选中两个主题，再插入关系线');
    return;
  }
  const fromId = selection.value[0]!;
  const toId = selection.value[1]!;
  if (fromId === toId) return;
  dispatch(new AddRelationshipCommand(activeSheet.value.id, fromId, toId, '关联'));
  const sheet = docStore.activeSheet;
  const rel = sheet?.relationships[sheet.relationships.length - 1];
  if (rel) {
    selectedStructure.value = { kind: 'relationship', id: rel.id };
    setSelection([]);
    nextTick(() => {
      const canvas = window.document.querySelector('.canvas-view') as HTMLCanvasElement | null;
      if (!canvas || !docStore.activeSheet) return;
      const layout = createDefaultLayoutRegistry().layout(docStore.activeSheet, sheetMeasure(docStore.activeSheet));
      const edge = layout.edges.find((e) => e.id === rel.id);
      const mid = edge ? relationshipLabelPoint(edge.points) : null;
      if (!edge || !mid) return;
      const rect = canvas.getBoundingClientRect();
      const title = rel.title ?? '关联';
      const width = Math.max(80, title.length * 12 + 24);
      startEditingRelationship({
        id: rel.id,
        left: rect.left + (mid.x - width / 2 - viewport.value.x) * viewport.value.zoom,
        top: rect.top + (mid.y - 12 - viewport.value.y) * viewport.value.zoom,
        width: width * viewport.value.zoom,
        height: 24 * viewport.value.zoom,
        title,
      });
    });
  }
}

function onSelectStructure(payload: { kind: StructureSelectionKind; id: string } | null) {
  selectedStructure.value = payload;
  editingRelationship.value = null;
  if (payload) {
    selectedDecorationId.value = null;
    closeEditor();
    if (payload.kind === 'summary' && activeSheet.value) {
      const summary = activeSheet.value.summaries.find((s) => s.id === payload.id);
      if (summary) {
        setSelection([summary.summaryTopicId]);
        selectionAnchorId.value = summary.summaryTopicId;
      } else {
        setSelection([]);
        selectionAnchorId.value = null;
      }
    } else {
      setSelection([]);
      selectionAnchorId.value = null;
    }
    nextTick(() => {
      syncKeyboardCapturePosition();
      focusKeyboardCapture();
    });
  }
}

function startEditingRelationship(payload: {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  title: string;
}) {
  closeEditor();
  editingMarker.value = null;
  editingRelationship.value = payload;
}

function commitRelationshipTitle(next: string) {
  if (!activeSheet.value || !editingRelationship.value) return;
  const title = next.trim() || '关联';
  dispatch(
    new UpdateRelationshipTitleCommand(
      activeSheet.value.id,
      editingRelationship.value.id,
      title,
    ),
  );
  editingRelationship.value = null;
  nextTick(() => focusKeyboardCapture());
}

function cancelRelationshipEdit() {
  editingRelationship.value = null;
  nextTick(() => focusKeyboardCapture());
}

function onUpdateRelationshipControl(payload: {
  relationshipId: string;
  controlPoints: Array<{ x: number; y: number }>;
}) {
  if (!activeSheet.value) return;
  dispatch(
    new UpdateRelationshipControlPointsCommand(
      activeSheet.value.id,
      payload.relationshipId,
      payload.controlPoints,
    ),
  );
}

async function onInsertAction(id: InsertActionId) {
  if (!activeSheet.value) return;
  const result = await buildInsertAction(id, activeSheet.value, selection.value, (asset, topicId) => {
    if (topicId) {
      const layout = createDefaultLayoutRegistry().layout(activeSheet.value!, sheetMeasure());
      const node = layout.nodes.get(topicId);
      if (node && !node.hidden) {
        const offset = decorationOffsetBesideTopic(node, asset, activeSheet.value!.decorations.length);
        return { x: offset.x, y: offset.y, attachedTopicId: topicId };
      }
    }
    const abs = decorationAtViewportCenter(
      viewport.value,
      { width: viewWidth.value, height: viewHeight.value },
      asset,
      activeSheet.value!.decorations.length,
    );
    return { x: abs.x, y: abs.y };
  });
  if (!result) return;
  if (result.command) dispatch(result.command);
  recordRecentInsert(id);
  if (result.focusPanel) {
    panelFocus.value = result.focusPanel;
    showPanel.value = true;
    rightPanelMode.value = 'properties';
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

function resolveTopicTitle(topicId: string): string {
  if (!activeSheet.value) return '';
  return findTopicInSheet(activeSheet.value, topicId)?.title ?? '';
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && editingRelationship.value) {
    cancelRelationshipEdit();
    return;
  }
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
      if (input.closest('.topic-text-editor')) {
        input.blur();
      } else if (isIntentionalUiFocus(input)) {
        // Allow normal Tab navigation in panel / search / outliner inputs.
        return;
      }
    }
    e.preventDefault();
    const sheetId = activeSheet.value.id;
    const sel = selectedId.value;
    dispatchAddTopic(new AddTopicCommand(sheetId, sel, '分支主题'));
    nextTick(() => focusKeyboardCapture());
    return;
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && activeSheet.value && !isEditableTarget(e) && !editingTopic.value) {
    if (e.key === 'Backspace' && !e.ctrlKey) {
      /* fall through to edit keys */
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const sheetId = activeSheet.value.id;

      if (selectedDecorationId.value) {
        dispatch(new DeleteDecorationCommand(sheetId, selectedDecorationId.value));
        selectedDecorationId.value = null;
        return;
      }

      if (selectedStructure.value) {
        const sel = selectedStructure.value;
        if (sel.kind === 'callout') {
          const topic = findTopicByCalloutId(activeSheet.value, sel.id);
          if (topic) {
            dispatch(new DeleteCalloutCommand(sheetId, topic.id));
            selectedStructure.value = null;
          }
          return;
        }
        const label =
          sel.kind === 'summary' ? '概要' : sel.kind === 'relationship' ? '关系线' : '外框';
        void ElMessageBox.confirm(`确定删除该${label}？`, '删除确认', {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        })
          .then(() => {
            if (sel.kind === 'summary') dispatch(new DeleteSummaryCommand(sheetId, sel.id));
            else if (sel.kind === 'relationship') dispatch(new DeleteRelationshipCommand(sheetId, sel.id));
            else dispatch(new DeleteBoundaryCommand(sheetId, sel.id));
            selectedStructure.value = null;
          })
          .catch(() => undefined);
        return;
      }

      if (selection.value.length === 0) return;

      const root = activeSheet.value.rootTopic;
      const rootId = root.id;
      const selected = new Set(selection.value.filter((id) => id !== rootId));
      if (selected.size === 0) return;

      const summaryIds: string[] = [];
      const floatingRootIds: string[] = [];
      const treeIds: string[] = [];
      for (const id of selected) {
        const summary = activeSheet.value.summaries.find((s) => s.summaryTopicId === id);
        if (summary) {
          summaryIds.push(summary.id);
        } else if (isFloatingTopicRoot(activeSheet.value, id)) {
          floatingRootIds.push(id);
        } else {
          treeIds.push(id);
        }
      }

      const toDeleteTree = treeIds.filter((id) => {
        let parent = findParentInSheet(activeSheet.value!, id);
        while (parent) {
          if (selected.has(parent.id)) return false;
          parent = findParentInSheet(activeSheet.value!, parent.id);
        }
        return true;
      });

      void ElMessageBox.confirm(`确定删除选中的 ${selected.size} 个主题及其子树？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
        .then(() => {
          for (const summaryId of summaryIds) {
            dispatch(new DeleteSummaryCommand(sheetId, summaryId));
          }
          for (const id of floatingRootIds) {
            dispatch(new DeleteFloatingTopicCommand(sheetId, id));
          }
          for (const id of toDeleteTree) {
            dispatch(new DeleteTopicCommand(sheetId, id));
          }
          setSelection([rootId]);
          selectionAnchorId.value = rootId;
          selectedStructure.value = null;
          nextTick(() => focusKeyboardCapture());
        })
        .catch(() => undefined);
      return;
    }
  }

  if (handleCanvasEditKeys(e)) return;

  if (isEditableTarget(e)) return;
  if (e.key === 'Escape' && zenActive.value) {
    toggleZen();
    return;
  }

  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    focusSearch();
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
    const isFloatingRoot = isFloatingTopicRoot(activeSheet.value, sel);
    if (isRoot || isFloatingRoot) {
      dispatchAddTopic(new AddTopicCommand(sheetId, sel, '分支主题'));
    } else {
      dispatchAddTopic(new AddTopicCommand(sheetId, sel, '同级主题', undefined, true));
    }
    nextTick(() => focusKeyboardCapture());
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
  const sheet = activeSheet.value;
  const parent = findParentInSheet(sheet, selectedId.value);
  const topic = findTopicInSheet(sheet, selectedId.value);
  if (!topic) return;

  if (key === 'ArrowDown' && topic.children.length && !topic.collapsed) {
    setSelection([topic.children[0]!.id]);
    selectionAnchorId.value = topic.children[0]!.id;
    revealTopic(topic.children[0]!.id);
    nextTick(() => focusKeyboardCapture());
    return;
  }
  if (key === 'ArrowUp' && parent) {
    setSelection([parent.id]);
    selectionAnchorId.value = parent.id;
    revealTopic(parent.id);
    nextTick(() => focusKeyboardCapture());
    return;
  }
  if ((key === 'ArrowLeft' || key === 'ArrowRight') && parent) {
    const idx = parent.children.findIndex((c) => c.id === selectedId.value);
    const next = key === 'ArrowLeft' ? parent.children[idx - 1] : parent.children[idx + 1];
    if (next) {
      setSelection([next.id]);
      selectionAnchorId.value = next.id;
      revealTopic(next.id);
      nextTick(() => focusKeyboardCapture());
    }
  }
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

async function onSaveAs() {
  if (!mindDocument.value) return;
  try {
    const { value: title } = await ElMessageBox.prompt('另存为', '保存', {
      inputValue: `${mindDocument.value.title} 副本`,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    });
    if (!title) return;
    const cmd = new SaveAsDocumentCommand(title);
    const next = cmd.execute(mindDocument.value);
    docStore.loadDocument(next);
    downloadAsJson(next);
  } catch {
    // cancelled
  }
}

async function onShowRecent() {
  const docs = await listDocuments();
  recentDocs.value = docs.map((d) => ({ id: d.id, title: d.title }));
  showRecent.value = true;
}

async function openRecent(id: string) {
  if (!(await confirmDiscardIfDirty())) return;
  const doc = await loadDocument(id);
  if (!doc) return;
  docStore.loadDocument(doc);
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

async function onExportPpt() {
  if (!mindDocument.value || !activeSheet.value) return;
  try {
    const bytes = await exportPptx(mindDocument.value, activeSheet.value);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    downloadBlob(
      new Blob([copy], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
      `${mindDocument.value.title}.pptx`,
    );
  } catch (e) {
    ElMessage.error('PPT 导出失败');
    console.error(e);
  }
}

function onExportExcel() {
  if (!mindDocument.value) return;
  const xml = exportExcelXml(mindDocument.value, activeSheet.value?.id);
  downloadText(xml, `${mindDocument.value.title}.xml`, 'application/vnd.ms-excel');
}

async function onExportTextBundle() {
  if (!mindDocument.value) return;
  const bytes = await exportTextBundleZip(mindDocument.value);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy], { type: 'application/zip' }), `${mindDocument.value.title}.textbundle.zip`);
}

function onShare() {
  if (!mindDocument.value) return;
  const readonly = {
    ...JSON.parse(serializeDocument(mindDocument.value)),
    title: `${mindDocument.value.title} (只读副本)`,
  };
  downloadAsJson(readonly, `${mindDocument.value.title}-readonly.json`);
  ElMessage.success('已导出只读 JSON 副本');
}

/** XMind: smile button → marker/sticker/illustration library; click again to hide */
function onOpenMarkers() {
  if (showPanel.value && rightPanelMode.value === 'library') {
    showPanel.value = false;
    return;
  }
  showPanel.value = true;
  rightPanelMode.value = 'library';
}

/** XMind: panel button → style/canvas properties; click again to hide */
function onOpenProperties() {
  if (showPanel.value && rightPanelMode.value === 'properties') {
    showPanel.value = false;
    return;
  }
  showPanel.value = true;
  rightPanelMode.value = 'properties';
}

/** View menu: fold/unfold right panel without changing mode */
function onTogglePanel() {
  showPanel.value = !showPanel.value;
}

function onExportZone(zoneId: string) {
  if (!mindDocument.value || !activeSheet.value) return;
  const zone = activeSheet.value.zones.find((z) => z.id === zoneId);
  if (!zone) return;
  // PNG: render a simple canvas crop of the zone rect
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(zone.width));
  canvas.height = Math.max(1, Math.round(zone.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = zone.style?.backgroundColor ?? '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = zone.style?.borderColor ?? '#409eff';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  ctx.fillStyle = '#333';
  ctx.font = '14px sans-serif';
  ctx.fillText(zone.title ?? '专区', 12, 24);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${zone.title || 'zone'}.png`);
  });
}

async function onEncryptSave() {
  if (!mindDocument.value) return;
  try {
    const { value: pwd } = await ElMessageBox.prompt('设置打开密码', '加密保存', {
      inputType: 'password',
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    });
    if (pwd === undefined) return;
    const enc = await encryptDocumentJsonV2(serializeDocument(mindDocument.value), pwd);
    downloadText(enc, `${mindDocument.value.title}.mymind.enc`, 'application/json');
  } catch {
    // cancelled
  }
}

async function onOpenEncrypted() {
  if (!(await confirmDiscardIfDirty())) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.enc,.mymind,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (!isEncryptedDocumentJsonAny(text)) {
      ElMessage.warning('不是加密文件');
      return;
    }
    try {
      const { value: pwd } = await ElMessageBox.prompt('输入密码', '打开加密文件', {
        inputType: 'password',
        confirmButtonText: '打开',
        cancelButtonText: '取消',
      });
      try {
        const json = isEncryptedV2(text)
          ? await decryptDocumentJsonV2(text, pwd ?? '')
          : decryptDocumentJson(text, pwd ?? '');
        const doc = deserializeDocument(json);
        docStore.loadDocument(doc);
        fitInitial();
      } catch {
        ElMessage.error('解密失败');
      }
    } catch {
      // cancelled
    }
  };
  input.click();
}

function scaleSelectedDecoration(factor: number, rotationDelta = 0) {
  if (!activeSheet.value || !selectedDecorationId.value) return;
  const dec = activeSheet.value.decorations.find((d) => d.id === selectedDecorationId.value);
  if (!dec) return;
  dispatch(
    new UpdateDecorationCommand(activeSheet.value.id, dec.id, {
      width: Math.max(16, dec.width * factor),
      height: Math.max(16, dec.height * factor),
      rotation: (dec.rotation + rotationDelta) % 360,
    }),
  );
}

function onDeleteSelectedDecoration() {
  if (!activeSheet.value || !selectedDecorationId.value) return;
  dispatch(new DeleteDecorationCommand(activeSheet.value.id, selectedDecorationId.value));
  selectedDecorationId.value = null;
}

function onAddDecoration(asset: DecorationAsset) {
  if (!activeSheet.value) return;
  const sheet = activeSheet.value;
  const index = sheet.decorations.length;
  let x: number;
  let y: number;
  let attachedTopicId: string | undefined;

  if (selectedId.value) {
    const layout = createDefaultLayoutRegistry().layout(sheet, sheetMeasure(sheet));
    const node = layout.nodes.get(selectedId.value);
    if (node && !node.hidden) {
      const offset = decorationOffsetBesideTopic(node, asset, index);
      x = offset.x;
      y = offset.y;
      attachedTopicId = selectedId.value;
    } else {
      const abs = decorationAtViewportCenter(
        viewport.value,
        { width: viewWidth.value, height: viewHeight.value },
        asset,
        index,
      );
      x = abs.x;
      y = abs.y;
    }
  } else {
    const abs = decorationAtViewportCenter(
      viewport.value,
      { width: viewWidth.value, height: viewHeight.value },
      asset,
      index,
    );
    x = abs.x;
    y = abs.y;
  }

  dispatch(
    new AddDecorationCommand(sheet.id, {
      type: asset.type,
      assetId: asset.id,
      x,
      y,
      width: asset.defaultWidth,
      height: asset.defaultHeight,
      rotation: 0,
      zIndex: index + 1,
      attachedTopicId,
    }),
  );
  const added = activeSheet.value?.decorations.at(-1);
  selectedDecorationId.value = added?.id ?? null;
}

async function onSaveAsTemplate() {
  if (!mindDocument.value) return;
  try {
    const { value: name } = await ElMessageBox.prompt('模板名称', '存为模板', {
      inputValue: mindDocument.value.title,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    });
    if (!name) return;
    const tpl = documentToUserTemplate(mindDocument.value, name);
    const key = 'mymind-user-templates';
    const raw = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push(tpl);
    localStorage.setItem(key, JSON.stringify(list));
    ElMessage.success('已保存到本地模板库');
  } catch {
    // cancelled
  }
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
    docStore.loadDocument(merged);
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
  const layout = registry.layout(activeSheet.value, sheetMeasure());
  const node = layout.nodes.get(topicId);
  if (!node || node.hidden) return;
  ensureVisible({ x: node.x, y: node.y, width: node.width, height: node.height });
}

function dispatchAddTopic(cmd: AddTopicCommand) {
  dispatch(cmd);
  if (cmd.addedTopicId) {
    selectedStructure.value = null;
    setSelection([cmd.addedTopicId]);
    selectionAnchorId.value = cmd.addedTopicId;
    revealTopic(cmd.addedTopicId);
    nextTick(() => {
      syncKeyboardCapturePosition();
      focusKeyboardCapture();
    });
  }
}

function onAlignGuides(g: Array<{ orientation: 'v' | 'h'; pos: number }>) {
  alignGuides.value = g;
}

function onSelectDecoration(id: string | null) {
  selectedDecorationId.value = id;
  if (id) selectedStructure.value = null;
}

function onUpdateDecoration(payload: {
  id: string;
  patch: { x?: number; y?: number; width?: number; height?: number; rotation?: number };
}) {
  if (!activeSheet.value) return;
  dispatch(new UpdateDecorationCommand(activeSheet.value.id, payload.id, payload.patch));
}

function onUpdateCallout(payload: { topicId: string; offset: { x: number; y: number } }) {
  if (!activeSheet.value) return;
  dispatch(new UpdateCalloutCommand(activeSheet.value.id, payload.topicId, { offset: payload.offset }));
}

function onUpdateTopicWidth(payload: { topicId: string; width: number }) {
  if (!activeSheet.value) return;
  dispatch(
    new UpdateTopicStyleCommand(activeSheet.value.id, payload.topicId, {
      width: payload.width,
      widthMode: 'fixed',
    }),
  );
}

function onIncludeRelSearch(v: boolean) {
  includeRelationships.value = v;
  search();
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('beforeunload', onBeforeUnload);
});
</script>

<template>
  <div class="app-shell">
    <Toolbar
      v-if="!zenActive"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :format-painter-active="!!formatPainterSource"
      :is-dirty="isDirty"
      :has-document="hasDocument"
      :sheet="activeSheet"
      :selection="selection"
      :search-query="searchQuery"
      :include-rel-search="includeRelationships"
      :show-outliner="showOutliner"
      :show-panel="showPanel"
      :library-panel-active="showPanel && rightPanelMode === 'library'"
      :properties-panel-active="showPanel && rightPanelMode === 'properties'"
      :show-minimap="showMinimap"
      :branch-focus-active="!!branchFocusId"
      :zen-active="zenActive"
      :selected-id="selectedId"
      @new="onRequestNew"
      @close-document="onCloseDocument"
      @undo="undo"
      @redo="redo"
      @format-painter="onFormatPainter"
      @save="onSave"
      @save-as="onSaveAs"
      @recent="onShowRecent"
      @open="onOpen"
      @open-encrypted="onOpenEncrypted"
      @encrypt-save="onEncryptSave"
      @merge="onMergeFile"
      @import="onImport"
      @export-json="onExportJson"
      @export-png="onExportPng"
      @export-svg="onExportSvg"
      @export-pdf="onExportPdf"
      @export-markdown="onExportMarkdown"
      @export-opml="onExportOpml"
      @export-csv="onExportCsv"
      @export-excel="onExportExcel"
      @export-word="onExportWord"
      @export-ppt="onExportPpt"
      @export-text-bundle="onExportTextBundle"
      @share="onShare"
      @open-markers="onOpenMarkers"
      @open-properties="onOpenProperties"
      @insert-summary="onInsertSummary"
      @insert-boundary="onInsertBoundary"
      @insert-relationship="onInsertRelationship"
      @add-floating="onAddFloating"
      @copy-sheet="onCopySheet"
      @insert="onInsertAction"
      @update:search-query="onSearchQueryUpdate"
      @update:include-rel-search="onIncludeRelSearch"
      @search="search"
      @replace="showReplace = !showReplace"
      @templates="showTemplates = true"
      @save-as-template="onSaveAsTemplate"
      @print="showPrint = true"
      @toggle-outliner="showOutliner = !showOutliner"
      @toggle-panel="onTogglePanel"
      @toggle-minimap="showMinimap = !showMinimap"
      @toggle-branch-focus="onToggleBranchFocus"
      @toggle-zen="toggleZen"
      @fit="fitInitial"
      @search-ref="onSearchRef"
    />

    <el-alert
      v-if="showReplace"
      class="replace-bar"
      type="warning"
      :closable="false"
      show-icon
    >
      <div class="replace-row">
        <el-input v-model="replaceFind" placeholder="查找" style="width: 160px" />
        <el-input v-model="replaceWith" placeholder="替换为" style="width: 160px" />
        <el-button type="primary" @click="onReplaceAll">全部替换</el-button>
        <el-button @click="showReplace = false">关闭</el-button>
      </div>
    </el-alert>

    <el-dialog v-model="showRecent" title="最近文件" width="420px" destroy-on-close>
      <el-empty v-if="!recentDocs.length" description="暂无最近文件" />
      <el-menu v-else class="recent-menu">
        <el-menu-item v-for="d in recentDocs" :key="d.id" @click="openRecent(d.id)">
          {{ d.title || d.id }}
        </el-menu-item>
      </el-menu>
    </el-dialog>

    <SheetTabs
      :document="mindDocument"
      :active-sheet-id="docStore.activeSheetId"
      @switch="onSwitchSheet"
    />

    <main v-if="mindDocument" class="main">
      <OutlinerView
        v-if="!zenActive && showOutliner"
        :sheet="activeSheet"
        :selected-ids="selection"
        @select="onOutlinerSelect"
        @move="onTopicMove"
      />
      <div class="canvas-wrap" @wheel.prevent="onWheel">
        <CanvasView
          :sheet="activeSheet"
          :viewport="viewport"
          :selected-ids="selection"
          :visible-topic-ids="branchVisibleIds"
          :align-guides="alignGuides"
          :selected-decoration-id="selectedDecorationId"
          :selected-structure="selectedStructure"
          @select="onCanvasSelect"
          @edit-topic="startEditingTopic"
          @pan="(dx, dy) => pan(dx, dy)"
          @resize="onCanvasResize"
          @context-menu="onCanvasContextMenu"
          @move-topic="onTopicMove"
          @align-guides="onAlignGuides"
          @select-decoration="onSelectDecoration"
          @update-decoration="onUpdateDecoration"
          @update-callout="onUpdateCallout"
          @update-topic-width="onUpdateTopicWidth"
          @select-structure="onSelectStructure"
          @update-relationship-control="onUpdateRelationshipControl"
          @edit-relationship="startEditingRelationship"
          @edit-marker="startEditingMarker"
          @toggle-collapse="onToggleCollapse"
          @request-keyboard-focus="focusKeyboardCapture"
        />
        <div v-if="selectedDecorationId && !zenActive" class="deco-toolbar">
          <el-button size="small" @click="scaleSelectedDecoration(1.1)">放大</el-button>
          <el-button size="small" @click="scaleSelectedDecoration(0.9)">缩小</el-button>
          <el-button size="small" @click="scaleSelectedDecoration(1, 15)">旋转</el-button>
          <el-button size="small" type="danger" @click="onDeleteSelectedDecoration">删除</el-button>
        </div>
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
        v-if="!zenActive && showPanel && rightPanelMode === 'properties'"
        :sheet="activeSheet"
        :selected-id="selectedId"
        :selected-structure="selectedStructure"
        :focus-field="panelFocus"
        @focus-consumed="panelFocus = null"
        @export-zone="onExportZone"
      />
      <MarkerLibraryPanel
        v-else-if="!zenActive && showPanel && rightPanelMode === 'library'"
        :sheet="activeSheet"
        :selected-id="selectedId"
        @add-decoration="onAddDecoration"
      />
    </main>
    <el-empty v-else class="empty-workspace" description="尚未打开文档">
      <el-button type="primary" @click="showNewDialog = true">新建</el-button>
      <el-button @click="onOpen">打开</el-button>
    </el-empty>

    <ContextInsertMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :sheet="activeSheet"
      :selection="selection"
      @insert="onInsertAction"
      @close="closeCtxMenu"
    />

    <div class="sr-only" aria-live="polite">{{ selectionAnnounce }}</div>

    <el-card v-if="searchResults.length && !zenActive" class="search-results" shadow="hover" body-style="padding: 0">
      <ul>
        <li v-for="r in searchResults" :key="r.topicId + r.matchField" @click="selectResult(r)">
          {{ r.title }} ? {{ r.snippet }}
        </li>
      </ul>
    </el-card>

    <StatusBar
      :zoom-percent="zoomPercent"
      :sheet-title="activeSheet?.title"
      :node-count="statusNodeCount"
      :title-chars="statusWordStats?.titleChars"
      :note-chars="statusWordStats?.noteChars"
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
      tabindex="0"
      aria-label="画布键盘输入"
      autocomplete="off"
      :style="keyboardCaptureStyle"
      @beforeinput="onCaptureBeforeInput"
      @input="onCaptureInput"
      @blur="onKeyboardCaptureBlur"
    />

    <TopicTextEditor
      v-if="editingTopic && activeSheet && !zenActive"
      ref="canvasEditorRef"
      :key="editingTopic.topicId + String(editingTopic.initialText ?? '')"
      :sheet-id="activeSheet.id"
      :topic-id="editingTopic.topicId"
      :title="resolveTopicTitle(editingTopic.topicId)"
      :left="editingTopic.left"
      :top="editingTopic.top"
      :width="editingTopic.width"
      :height="editingTopic.height"
      :initial-text="editingTopic.initialText"
      @close="closeEditor"
    />
    <MarkerEditPopover
      v-if="editingMarker && !zenActive"
      :topic-id="editingMarker.topicId"
      :marker-id="editingMarker.markerId"
      :left="editingMarker.left"
      :top="editingMarker.top"
      @switch="onSwitchMarker"
      @remove="onRemoveMarker"
      @close="closeMarkerPopover"
    />
    <input
      v-if="editingRelationship && !zenActive"
      class="rel-title-editor"
      :style="{
        left: editingRelationship.left + 'px',
        top: editingRelationship.top + 'px',
        width: editingRelationship.width + 'px',
        height: editingRelationship.height + 'px',
      }"
      :value="editingRelationship.title"
      autofocus
      @keydown.enter.prevent="commitRelationshipTitle(($event.target as HTMLInputElement).value)"
      @keydown.escape.prevent="cancelRelationshipEdit"
      @blur="commitRelationshipTitle(($event.target as HTMLInputElement).value)"
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
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--el-bg-color-page, #f5f7fa);
}
</style>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.canvas-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
  display: flex;
}
.replace-bar {
  border-radius: 0;
  border-left: none;
  border-right: none;
}
.replace-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.recent-menu {
  border-right: none;
}
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fafafa;
}
.empty-workspace {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main :deep(.canvas-view) {
  flex: 1;
  min-width: 0;
}
.search-results {
  position: absolute;
  top: 52px;
  right: 280px;
  z-index: 50;
  min-width: 260px;
  max-height: 240px;
  overflow-y: auto;
  padding: 0;
}
.search-results ul {
  list-style: none;
}
.search-results li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}
.search-results li:hover {
  background: var(--el-fill-color-light);
}
.deco-toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 20;
  background: var(--el-bg-color);
  padding: 6px 10px;
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.keyboard-capture {
  position: fixed;
  opacity: 0;
  border: none;
  padding: 0;
  margin: 0;
  outline: none;
  caret-color: transparent;
  background: transparent;
  color: transparent;
  z-index: 50;
  pointer-events: none;
  box-sizing: border-box;
}
.rel-title-editor {
  position: fixed;
  z-index: 40;
  border: 2px solid #4a90d9;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  background: #fff;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
