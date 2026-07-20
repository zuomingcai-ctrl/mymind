<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import type { Sheet, Topic, TopicStyle, EdgeStyle } from '@mymind/core';
import {
  UpdateNoteCommand,
  AddLabelCommand,
  DeleteLabelCommand,
  ToggleTodoCommand,
  DeleteTodoCommand,
  ReorderTodosCommand,
  UpdateEquationCommand,
  UpdateTaskCommand,
  AddCommentCommand,
  DeleteCommentCommand,
  UpdateTopicStyleCommand,
  UpdateCanvasSettingsCommand,
  AddMarkerCommand,
  DeleteMarkerCommand,
  listMarkers,
  markerGlyph,
  UpdateZoneStyleCommand,
  UpdateAudioCommand,
  UpdateRelationshipTitleCommand,
  UpdateRelationshipStyleCommand,
  nextTextTransform,
  generateId,
} from '@mymind/core';
import { useDocument } from '../../composables/useDocument';
import StructurePicker from './StructurePicker.vue';
import ThemeInlinePanel from './ThemeInlinePanel.vue';
import { Top, Bottom, Close, Plus } from '@element-plus/icons-vue';
import type { StructureSelectionKind } from '../canvas/CanvasView.vue';

const props = defineProps<{
  sheet: Sheet | null;
  selectedId: string | null;
  selectedStructure?: { kind: StructureSelectionKind; id: string } | null;
  focusField?: 'note' | 'comment' | 'todo' | 'task' | 'equation' | 'hyperlink' | null;
}>();

const emit = defineEmits<{
  'focus-consumed': [];
  'export-zone': [zoneId: string];
}>();

const activeTab = ref('style');
const { dispatch } = useDocument();
const markers = listMarkers();
const canvasSections = ref(['structure', 'appearance']);

const noteRef = ref<{ focus: () => void } | null>(null);
const commentRef = ref<{ focus: () => void; input?: HTMLInputElement } | null>(null);
const equationRef = ref<{ focus: () => void } | null>(null);
const commentDraft = ref('');
const noteDraft = ref('');
const equationDraft = ref('');
const audioInput = ref<HTMLInputElement | null>(null);

const selectedTopic = (): Topic | null => {
  if (!props.sheet || !props.selectedId) return null;
  return findTopic(props.sheet.rootTopic, props.selectedId);
};

const selectedRelationship = computed(() => {
  if (!props.sheet || props.selectedStructure?.kind !== 'relationship') return null;
  return props.sheet.relationships.find((r) => r.id === props.selectedStructure!.id) ?? null;
});

const style = computed(() => selectedTopic()?.style);

function findTopic(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const f = findTopic(c, id);
    if (f) return f;
  }
  return null;
}

watch(
  () => [props.selectedId, selectedTopic()?.note] as const,
  () => {
    noteDraft.value = selectedTopic()?.note ?? '';
  },
  { immediate: true },
);

watch(
  () => [props.selectedId, selectedTopic()?.equation] as const,
  () => {
    equationDraft.value = selectedTopic()?.equation ?? '';
  },
  { immediate: true },
);

function updateRelationshipTitle(value: string) {
  if (!props.sheet || !selectedRelationship.value) return;
  dispatch(
    new UpdateRelationshipTitleCommand(props.sheet.id, selectedRelationship.value.id, value.trim() || '关联'),
  );
}

function patchRelationshipStyle(patch: Partial<EdgeStyle>) {
  if (!props.sheet || !selectedRelationship.value) return;
  dispatch(new UpdateRelationshipStyleCommand(props.sheet.id, selectedRelationship.value.id, patch));
}

function setRelationshipArrow(mode: 'none' | 'end' | 'both') {
  patchRelationshipStyle({
    arrowStart: mode === 'both',
    arrowEnd: mode !== 'none',
  });
}

watch(
  () => props.focusField,
  async (field) => {
    if (!field) return;
    activeTab.value = 'style';
    await nextTick();
    if (field === 'note') noteRef.value?.focus();
    if (field === 'comment') commentRef.value?.focus();
    if (field === 'equation') equationRef.value?.focus();
    emit('focus-consumed');
  },
);

function patchStyle(patch: Partial<TopicStyle>) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new UpdateTopicStyleCommand(props.sheet.id, props.selectedId, patch));
}

function updateNote(value: string) {
  if (!props.sheet || !props.selectedId) return;
  noteDraft.value = value;
  if ((selectedTopic()?.note ?? '') === value) return;
  dispatch(new UpdateNoteCommand(props.sheet.id, props.selectedId, value));
}

function addLabel() {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new AddLabelCommand(props.sheet.id, props.selectedId, '新标签'));
}

function removeLabel(labelId: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new DeleteLabelCommand(props.sheet.id, props.selectedId, labelId));
}

function patchCanvas(patch: Partial<Sheet['canvasSettings']>) {
  if (!props.sheet) return;
  dispatch(new UpdateCanvasSettingsCommand(props.sheet.id, patch));
}

function toggleTodo(todoId: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new ToggleTodoCommand(props.sheet.id, props.selectedId, todoId));
}

function deleteTodo(todoId: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new DeleteTodoCommand(props.sheet.id, props.selectedId, todoId));
}

function moveTodo(todoId: string, direction: -1 | 1) {
  if (!props.sheet || !props.selectedId) return;
  const todos = [...(selectedTopic()?.todos ?? [])].sort((a, b) => a.order - b.order);
  const idx = todos.findIndex((t) => t.id === todoId);
  const swap = idx + direction;
  if (idx < 0 || swap < 0 || swap >= todos.length) return;
  const ordered = todos.map((t) => t.id);
  [ordered[idx], ordered[swap]] = [ordered[swap]!, ordered[idx]!];
  dispatch(new ReorderTodosCommand(props.sheet.id, props.selectedId, ordered));
}

function updateEquation(value: string) {
  if (!props.sheet || !props.selectedId) return;
  equationDraft.value = value;
  if ((selectedTopic()?.equation ?? '') === value) return;
  dispatch(new UpdateEquationCommand(props.sheet.id, props.selectedId, value));
}

function updateTaskField(patch: Partial<NonNullable<Topic['task']>>) {
  if (!props.sheet || !props.selectedId) return;
  const current = selectedTopic()?.task ?? { progress: 0, priority: 'none' as const };
  dispatch(new UpdateTaskCommand(props.sheet.id, props.selectedId, { ...current, ...patch }));
}

function addCommentFromPanel() {
  if (!props.sheet || !props.selectedId) return;
  const text = commentDraft.value.trim();
  if (!text) return;
  dispatch(new AddCommentCommand(props.sheet.id, props.selectedId, text));
  commentDraft.value = '';
}

function deleteComment(commentId: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new DeleteCommentCommand(props.sheet.id, props.selectedId, commentId));
}

function cycleTextTransform() {
  patchStyle({ textTransform: nextTextTransform(style.value?.textTransform) });
}

function patchZone(
  zoneId: string,
  patch: {
    style?: Partial<import('@mymind/core').ZoneStyle>;
    aspectPreset?: string;
    title?: string;
    showTitle?: boolean;
  },
) {
  if (!props.sheet) return;
  dispatch(new UpdateZoneStyleCommand(props.sheet.id, zoneId, patch));
}

function onAudioFile(ev: Event) {
  if (!props.sheet || !props.selectedId) return;
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    dispatch(
      new UpdateAudioCommand(props.sheet!.id, props.selectedId!, {
        id: generateId(),
        name: file.name,
        mimeType: file.type || 'audio/webm',
        data: String(reader.result),
      }),
    );
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function clearAudio() {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new UpdateAudioCommand(props.sheet.id, props.selectedId, undefined));
}

function triggerAudioPick() {
  audioInput.value?.click();
}

function toggleMarker(id: string) {
  if (!props.sheet || !props.selectedId) return;
  const has = selectedTopic()?.markers.includes(id);
  if (has) dispatch(new DeleteMarkerCommand(props.sheet.id, props.selectedId, id));
  else dispatch(new AddMarkerCommand(props.sheet.id, props.selectedId, id));
}

const borderLineType = computed({
  get() {
    if (style.value?.borderWidth === 0) return 'none';
    if (style.value?.borderDash?.length) {
      return style.value.borderDash[0] === 1 ? 'dot' : 'dash';
    }
    return 'solid';
  },
  set(v: string) {
    if (v === 'none') patchStyle({ borderWidth: 0, borderDash: undefined });
    else if (v === 'dash') patchStyle({ borderWidth: style.value?.borderWidth || 1, borderDash: [6, 3] });
    else if (v === 'dot') patchStyle({ borderWidth: style.value?.borderWidth || 1, borderDash: [1, 3] });
    else patchStyle({ borderWidth: style.value?.borderWidth || 1, borderDash: undefined });
  },
});
</script>

<template>
  <aside class="property-panel">
    <el-tabs v-model="activeTab" class="panel-tabs" stretch>
      <el-tab-pane label="样式" name="style">
        <el-scrollbar v-if="selectedRelationship" class="tab-scroll">
          <el-alert title="关系线" type="info" :closable="false" class="preview" />
          <div class="section-title">内容</div>
          <el-form label-position="top" size="small">
            <el-form-item label="文字">
              <el-input
                :model-value="selectedRelationship.title ?? ''"
                placeholder="关联"
                @change="updateRelationshipTitle"
              />
            </el-form-item>
            <el-form-item label="箭头">
              <el-radio-group
                :model-value="
                  selectedRelationship.style?.arrowStart
                    ? 'both'
                    : selectedRelationship.style?.arrowEnd === false
                      ? 'none'
                      : 'end'
                "
                size="small"
                @change="(v: string | number | boolean | undefined) => setRelationshipArrow(v as 'none' | 'end' | 'both')"
              >
                <el-radio-button value="none">无</el-radio-button>
                <el-radio-button value="end">单向</el-radio-button>
                <el-radio-button value="both">双向</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="颜色">
              <el-color-picker
                :model-value="selectedRelationship.style?.color ?? '#E67E22'"
                @change="(v: string | null) => v && patchRelationshipStyle({ color: v })"
              />
            </el-form-item>
          </el-form>
        </el-scrollbar>
        <el-empty
          v-else-if="!selectedId"
          description="选择主题或关系线以编辑属性"
          :image-size="64"
        />
        <el-scrollbar v-else class="tab-scroll">
          <el-alert :title="selectedTopic()?.title || '主题'" type="info" :closable="false" class="preview" />

          <div class="section-title">形状</div>
          <el-form label-position="top" size="small">
            <el-form-item label="形状">
              <el-select
                :model-value="style?.shape ?? 'rounded'"
                style="width: 100%"
                @change="(v: TopicStyle['shape']) => patchStyle({ shape: v })"
              >
                <el-option label="圆角矩形" value="rounded" />
                <el-option label="矩形" value="rectangle" />
                <el-option label="椭圆" value="ellipse" />
                <el-option label="菱形" value="diamond" />
                <el-option label="无框" value="none" />
              </el-select>
            </el-form-item>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-form-item label="填充">
                  <el-color-picker
                    :model-value="style?.fillColor ?? '#E8F4FD'"
                    @change="(v: string | null) => v && patchStyle({ fillColor: v })"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="边框色">
                  <el-color-picker
                    :model-value="style?.borderColor ?? '#4A90D9'"
                    @change="(v: string | null) => v && patchStyle({ borderColor: v })"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-form-item label="边框线型">
                  <el-select v-model="borderLineType" style="width: 100%">
                    <el-option label="实线" value="solid" />
                    <el-option label="虚线" value="dash" />
                    <el-option label="点线" value="dot" />
                    <el-option label="无" value="none" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="粗细">
                  <el-input-number
                    :model-value="style?.borderWidth ?? 1"
                    :min="0"
                    :max="5"
                    controls-position="right"
                    style="width: 100%"
                    @change="(v: number | undefined) => patchStyle({ borderWidth: v ?? 1 })"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="宽度">
              <div class="inline-row">
                <el-input-number
                  :model-value="style?.width"
                  :min="40"
                  placeholder="自适应"
                  controls-position="right"
                  style="flex: 1"
                  @change="(v: number | undefined) => patchStyle({ width: v, widthMode: v ? 'fixed' : 'auto' })"
                />
                <el-button @click="patchStyle({ width: undefined, widthMode: 'auto' })">适合</el-button>
              </div>
            </el-form-item>

            <div class="section-title">文本</div>
            <el-form-item label="字体">
              <el-select
                :model-value="style?.fontFamily ?? ''"
                style="width: 100%"
                @change="(v: string) => patchStyle({ fontFamily: v || undefined })"
              >
                <el-option label="跟随主题" value="" />
                <el-option label="Sans" value="sans-serif" />
                <el-option label="Serif" value="serif" />
                <el-option label="等宽" value="monospace" />
                <el-option label="Segoe UI" value="'Segoe UI', sans-serif" />
              </el-select>
            </el-form-item>
            <el-row :gutter="8">
              <el-col :span="12">
                <el-form-item label="字号">
                  <el-input-number
                    :model-value="style?.fontSize ?? 14"
                    :min="8"
                    :max="48"
                    controls-position="right"
                    style="width: 100%"
                    @change="(v: number | undefined) => patchStyle({ fontSize: v ?? 14 })"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="字色">
                  <el-color-picker
                    :model-value="style?.fontColor ?? '#333333'"
                    @change="(v: string | null) => v && patchStyle({ fontColor: v })"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="字重">
              <el-select
                :model-value="style?.fontWeight ?? 'normal'"
                style="width: 100%"
                @change="(v: TopicStyle['fontWeight']) => patchStyle({ fontWeight: v })"
              >
                <el-option label="Light" value="light" />
                <el-option label="Regular" value="normal" />
                <el-option label="Medium" value="medium" />
                <el-option label="Bold" value="bold" />
              </el-select>
            </el-form-item>
            <el-button-group class="btn-row">
              <el-button
                :type="style?.fontWeight === 'bold' ? 'primary' : 'default'"
                @click="patchStyle({ fontWeight: style?.fontWeight === 'bold' ? 'normal' : 'bold' })"
              >B</el-button>
              <el-button
                :type="style?.fontStyle === 'italic' ? 'primary' : 'default'"
                @click="patchStyle({ fontStyle: style?.fontStyle === 'italic' ? 'normal' : 'italic' })"
              ><i>I</i></el-button>
              <el-button
                :type="style?.textDecoration === 'underline' ? 'primary' : 'default'"
                @click="patchStyle({ textDecoration: style?.textDecoration === 'underline' ? 'none' : 'underline' })"
              ><u>U</u></el-button>
              <el-button
                :type="style?.textDecoration === 'line-through' ? 'primary' : 'default'"
                @click="patchStyle({ textDecoration: style?.textDecoration === 'line-through' ? 'none' : 'line-through' })"
              ><s>S</s></el-button>
              <el-button @click="cycleTextTransform" :title="style?.textTransform ?? 'none'">Tt</el-button>
            </el-button-group>
            <el-radio-group
              class="align-row"
              :model-value="style?.textAlign ?? 'center'"
              size="small"
              @change="(v: string | number | boolean | undefined) => patchStyle({ textAlign: v as TopicStyle['textAlign'] })"
            >
              <el-radio-button value="left">左</el-radio-button>
              <el-radio-button value="center">中</el-radio-button>
              <el-radio-button value="right">右</el-radio-button>
            </el-radio-group>

            <div class="section-title">标记</div>
            <div class="markers">
              <el-check-tag
                v-for="m in markers"
                :key="m.id"
                :checked="!!selectedTopic()?.markers.includes(m.id)"
                @change="toggleMarker(m.id)"
              >
                {{ markerGlyph(m.id) }}
              </el-check-tag>
            </div>

            <div class="section-title">内容</div>
            <el-form-item label="备注">
              <el-input
                ref="noteRef"
                v-model="noteDraft"
                type="textarea"
                :rows="3"
                @change="updateNote"
              />
            </el-form-item>
            <el-form-item label="标签">
              <div class="labels">
                <el-tag
                  v-for="l in selectedTopic()?.labels ?? []"
                  :key="l.id"
                  closable
                  :color="l.color"
                  effect="dark"
                  @close="removeLabel(l.id)"
                >
                  {{ l.text }}
                </el-tag>
              </div>
              <el-button :icon="Plus" size="small" @click="addLabel">添加标签</el-button>
            </el-form-item>
            <el-form-item v-if="selectedTopic()?.callout" label="标注">
              <el-text type="info">{{ selectedTopic()?.callout?.text }}</el-text>
            </el-form-item>
            <el-form-item label="待办">
              <div
                v-for="todo in [...(selectedTopic()?.todos ?? [])].sort((a, b) => a.order - b.order)"
                :key="todo.id"
                class="todo-item"
              >
                <el-checkbox :model-value="todo.checked" @change="toggleTodo(todo.id)">
                  {{ todo.text }}
                </el-checkbox>
                <div class="todo-actions">
                  <el-button
                    :icon="Top"
                    size="small"
                    text
                    title="上移"
                    @click="moveTodo(todo.id, -1)"
                  />
                  <el-button
                    :icon="Bottom"
                    size="small"
                    text
                    title="下移"
                    @click="moveTodo(todo.id, 1)"
                  />
                  <el-button
                    :icon="Close"
                    size="small"
                    text
                    type="danger"
                    title="删除"
                    @click="deleteTodo(todo.id)"
                  />
                </div>
              </div>
            </el-form-item>
            <el-form-item label="任务">
              <div class="inline-row">
                <el-select
                  :model-value="selectedTopic()?.task?.priority ?? 'none'"
                  style="flex: 1"
                  @change="(v: NonNullable<Topic['task']>['priority']) => updateTaskField({ priority: v })"
                >
                  <el-option label="无优先级" value="none" />
                  <el-option label="低" value="low" />
                  <el-option label="中" value="medium" />
                  <el-option label="高" value="high" />
                </el-select>
                <el-input-number
                  :model-value="selectedTopic()?.task?.progress ?? 0"
                  :min="0"
                  :max="100"
                  controls-position="right"
                  style="width: 100px"
                  @change="(v: number | undefined) => updateTaskField({ progress: v ?? 0 })"
                />
              </div>
              <el-input
                class="mt-6"
                :model-value="selectedTopic()?.task?.assignee ?? ''"
                placeholder="负责人"
                @change="(v: string) => updateTaskField({ assignee: v })"
              />
            </el-form-item>
            <el-form-item label="方程">
              <el-input
                ref="equationRef"
                v-model="equationDraft"
                placeholder="LaTeX"
                @change="updateEquation"
              />
            </el-form-item>
            <el-form-item label="链接">
              <el-text v-if="selectedTopic()?.hyperlink" type="info" size="small">
                {{ selectedTopic()?.hyperlink?.type }}: {{ selectedTopic()?.hyperlink?.target }}
              </el-text>
              <el-text v-else type="info" size="small">无</el-text>
            </el-form-item>
            <el-form-item label="评论">
              <el-timeline v-if="selectedTopic()?.comments?.length">
                <el-timeline-item
                  v-for="c in selectedTopic()?.comments ?? []"
                  :key="c.id"
                  :timestamp="c.author ?? '我'"
                  placement="top"
                >
                  <div class="comment-row">
                    <span>{{ c.text }}</span>
                    <el-button :icon="Close" size="small" text type="danger" @click="deleteComment(c.id)" />
                  </div>
                </el-timeline-item>
              </el-timeline>
              <div class="inline-row">
                <el-input
                  ref="commentRef"
                  v-model="commentDraft"
                  placeholder="添加评论…"
                  @keydown.enter="addCommentFromPanel"
                />
                <el-button type="primary" @click="addCommentFromPanel">发送</el-button>
              </div>
            </el-form-item>
            <el-form-item label="音频备注">
              <div v-if="selectedTopic()?.audio" class="audio-row">
                <audio :src="selectedTopic()?.audio?.data" controls style="max-width: 100%" />
                <el-button size="small" type="danger" plain @click="clearAudio">移除</el-button>
              </div>
              <el-button v-else size="small" @click="triggerAudioPick">上传音频</el-button>
              <input ref="audioInput" type="file" accept="audio/*" hidden @change="onAudioFile" />
            </el-form-item>
            <template v-if="sheet?.zones?.length">
              <div class="section-title">专区样式</div>
              <div v-for="z in sheet.zones" :key="z.id" class="zone-style-block">
                <div class="zone-title">{{ z.title || z.id.slice(0, 6) }}</div>
                <el-form-item label="背景">
                  <el-color-picker
                    :model-value="z.style?.backgroundColor ?? 'rgba(64,158,255,0.08)'"
                    show-alpha
                    @change="(v: string | null) => v && patchZone(z.id, { style: { backgroundColor: v } })"
                  />
                </el-form-item>
                <el-form-item label="边框">
                  <el-color-picker
                    :model-value="z.style?.borderColor ?? '#409eff'"
                    @change="(v: string | null) => v && patchZone(z.id, { style: { borderColor: v } })"
                  />
                </el-form-item>
                <el-form-item label="比例预设">
                  <el-select
                    :model-value="z.aspectPreset ?? 'none'"
                    style="width: 100%"
                    @change="(v: string) => patchZone(z.id, { aspectPreset: v === 'none' ? undefined : v })"
                  >
                    <el-option label="无" value="none" />
                    <el-option label="A4" value="a4" />
                    <el-option label="16:9" value="16:9" />
                  </el-select>
                </el-form-item>
                <el-button size="small" @click="emit('export-zone', z.id)">导出专区 PNG</el-button>
              </div>
            </template>
          </el-form>
        </el-scrollbar>
      </el-tab-pane>

      <el-tab-pane label="画布" name="canvas">
        <template #label>
          <span data-testid="tab-canvas">画布</span>
        </template>
        <el-scrollbar class="tab-scroll">
          <el-collapse v-model="canvasSections" class="canvas-collapse">
            <el-collapse-item title="结构" name="structure">
              <StructurePicker v-if="sheet" :sheet-id="sheet.id" :sheet="sheet" />
            </el-collapse-item>

            <el-collapse-item title="外观" name="appearance">
              <el-form label-position="top" size="small" class="canvas-form">
                <div class="compact-row">
                  <el-form-item label="背景">
                    <el-color-picker
                      :model-value="sheet?.canvasSettings.backgroundColor ?? '#ffffff'"
                      @change="(v: string | null) => v && patchCanvas({ backgroundColor: v })"
                    />
                  </el-form-item>
                  <el-form-item label="纹理" class="grow">
                    <el-select
                      :model-value="sheet?.canvasSettings.backgroundPattern ?? 'solid'"
                      style="width: 100%"
                      @change="(v: Sheet['canvasSettings']['backgroundPattern']) => patchCanvas({ backgroundPattern: v })"
                    >
                      <el-option label="纯色" value="solid" />
                      <el-option label="网格" value="grid" />
                      <el-option label="点阵" value="dots" />
                    </el-select>
                  </el-form-item>
                </div>
                <el-form-item label="全局字体">
                  <el-select
                    :model-value="sheet?.canvasSettings.globalFontFamily ?? ''"
                    style="width: 100%"
                    @change="(v: string) => patchCanvas({ globalFontFamily: v || undefined })"
                  >
                    <el-option label="默认" value="" />
                    <el-option label="Sans" value="sans-serif" />
                    <el-option label="Serif" value="serif" />
                    <el-option label="等宽" value="monospace" />
                  </el-select>
                </el-form-item>
                <el-form-item label="画布比例">
                  <el-select
                    :model-value="sheet?.canvasSettings.aspectGuide ?? 'none'"
                    style="width: 100%"
                    @change="(v: Sheet['canvasSettings']['aspectGuide']) => patchCanvas({ aspectGuide: v })"
                  >
                    <el-option label="无" value="none" />
                    <el-option label="A4" value="a4" />
                    <el-option label="A3" value="a3" />
                    <el-option label="16:9" value="16:9" />
                    <el-option label="4:3" value="4:3" />
                    <el-option label="1:1" value="1:1" />
                  </el-select>
                </el-form-item>
                <div class="toggle-row">
                  <el-checkbox
                    :model-value="sheet?.canvasSettings.coloredBranch ?? true"
                    @change="(v: string | number | boolean) => patchCanvas({ coloredBranch: !!v })"
                  >
                    彩虹分支
                  </el-checkbox>
                  <el-checkbox
                    :model-value="sheet?.canvasSettings.handDrawn ?? false"
                    @change="(v: string | number | boolean) => patchCanvas({ handDrawn: !!v })"
                  >
                    手绘风格
                  </el-checkbox>
                </div>
              </el-form>
              <ThemeInlinePanel v-if="sheet" :sheet="sheet" class="appearance-theme" />
            </el-collapse-item>
          </el-collapse>
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </aside>
</template>

<style scoped>
.property-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}
.panel-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.panel-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
}
.panel-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}
.panel-tabs :deep(.el-tab-pane) {
  height: 100%;
}
.tab-scroll {
  height: calc(100vh - 160px);
  padding: 8px 10px 16px;
}
.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin: 8px 0 6px;
  text-transform: uppercase;
}
.canvas-collapse {
  border: none;
}
.canvas-collapse :deep(.el-collapse-item__header) {
  height: 36px;
  line-height: 36px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-bottom-color: var(--el-border-color-lighter);
}
.canvas-collapse :deep(.el-collapse-item__wrap) {
  border-bottom-color: var(--el-border-color-lighter);
}
.canvas-collapse :deep(.el-collapse-item__content) {
  padding: 8px 2px 14px;
}
.canvas-form :deep(.el-form-item) {
  margin-bottom: 10px;
}
.compact-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.compact-row .grow {
  flex: 1;
  min-width: 0;
}
.toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding-top: 2px;
  margin-bottom: 4px;
}
.appearance-theme {
  margin-top: 12px;
}
.preview {
  margin-bottom: 12px;
}
.inline-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}
.btn-row {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
}
.align-row {
  margin-bottom: 12px;
}
.markers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 4px;
}
.todo-actions {
  display: flex;
  flex-shrink: 0;
}
.comment-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.audio-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.zone-style-block {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.zone-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.full-btn {
  width: 100%;
}
.mt-6 {
  margin-top: 6px;
}
.mt-8 {
  margin-top: 8px;
}
</style>
