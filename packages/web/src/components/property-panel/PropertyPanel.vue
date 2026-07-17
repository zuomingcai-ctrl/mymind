<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import type { Sheet, Topic, TopicStyle } from '@mymind/core';
import {
  UpdateNoteCommand,
  AddLabelCommand,
  DeleteLabelCommand,
  UpdateThemeCommand,
  listThemes,
  ToggleTodoCommand,
  UpdateEquationCommand,
  UpdateTaskCommand,
  AddCommentCommand,
  UpdateTopicStyleCommand,
  UpdateCanvasSettingsCommand,
  AddMarkerCommand,
  DeleteMarkerCommand,
  listMarkers,
  markerGlyph,
  AddPitchSlideCommand,
  DeletePitchSlideCommand,
  ReorderPitchSlidesCommand,
} from '@mymind/core';
import { useDocument } from '../../composables/useDocument';
import StructurePicker from './StructurePicker.vue';

const props = defineProps<{
  sheet: Sheet | null;
  selectedId: string | null;
  focusField?: 'note' | 'comment' | 'todo' | 'task' | 'equation' | 'hyperlink' | null;
}>();

const emit = defineEmits<{
  'focus-consumed': [];
  'start-pitch': [];
}>();

const activeTab = ref<'style' | 'canvas' | 'pitch'>('style');
const { dispatch } = useDocument();
const themes = listThemes();
const markers = listMarkers();
const noteRef = ref<HTMLTextAreaElement | null>(null);
const commentRef = ref<HTMLInputElement | null>(null);
const equationRef = ref<HTMLInputElement | null>(null);

const selectedTopic = (): Topic | null => {
  if (!props.sheet || !props.selectedId) return null;
  return findTopic(props.sheet.rootTopic, props.selectedId);
};

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

function onThemeChange(event: Event) {
  if (!props.sheet) return;
  dispatch(new UpdateThemeCommand(props.sheet.id, (event.target as HTMLSelectElement).value));
}

function patchCanvas(patch: Partial<Sheet['canvasSettings']>) {
  if (!props.sheet) return;
  dispatch(new UpdateCanvasSettingsCommand(props.sheet.id, patch));
}

function toggleTodo(todoId: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new ToggleTodoCommand(props.sheet.id, props.selectedId, todoId));
}

function updateEquation(value: string) {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new UpdateEquationCommand(props.sheet.id, props.selectedId, value));
}

function updateTaskField(patch: Partial<NonNullable<Topic['task']>>) {
  if (!props.sheet || !props.selectedId) return;
  const current = selectedTopic()?.task ?? { progress: 0, priority: 'none' as const };
  dispatch(new UpdateTaskCommand(props.sheet.id, props.selectedId, { ...current, ...patch }));
}

function addCommentFromPanel() {
  if (!props.sheet || !props.selectedId || !commentRef.value) return;
  const text = commentRef.value.value.trim();
  if (!text) return;
  dispatch(new AddCommentCommand(props.sheet.id, props.selectedId, text));
  commentRef.value.value = '';
}

function toggleMarker(id: string) {
  if (!props.sheet || !props.selectedId) return;
  const has = selectedTopic()?.markers.includes(id);
  if (has) dispatch(new DeleteMarkerCommand(props.sheet.id, props.selectedId, id));
  else dispatch(new AddMarkerCommand(props.sheet.id, props.selectedId, id));
}

const pitchSlides = computed(() => {
  if (!props.sheet) return [];
  return [...props.sheet.pitchSettings.slides].sort((a, b) => a.order - b.order);
});

function topicTitle(id: string): string {
  if (!props.sheet) return id;
  return findTopic(props.sheet.rootTopic, id)?.title ?? id;
}

function addPitchSlide() {
  if (!props.sheet || !props.selectedId) return;
  dispatch(new AddPitchSlideCommand(props.sheet.id, props.selectedId));
}

function removePitchSlide(slideId: string) {
  if (!props.sheet) return;
  dispatch(new DeletePitchSlideCommand(props.sheet.id, slideId));
}

function movePitchSlide(slideId: string, dir: -1 | 1) {
  if (!props.sheet) return;
  const ids = pitchSlides.value.map((s) => s.id);
  const i = ids.indexOf(slideId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  const next = [...ids];
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  dispatch(new ReorderPitchSlidesCommand(props.sheet.id, next));
}

function autoPitchFromChildren() {
  if (!props.sheet || !props.selectedId) return;
  const topic = selectedTopic();
  if (!topic) return;
  const kids = topic.children.length ? topic.children : [topic];
  for (const c of kids) {
    dispatch(new AddPitchSlideCommand(props.sheet.id, c.id));
  }
}
</script>

<template>
  <aside class="property-panel">
    <div class="tabs">
      <button :class="{ active: activeTab === 'style' }" @click="activeTab = 'style'">样式</button>
      <button :class="{ active: activeTab === 'canvas' }" data-testid="tab-canvas" @click="activeTab = 'canvas'">画布</button>
      <button :class="{ active: activeTab === 'pitch' }" @click="activeTab = 'pitch'">演说</button>
    </div>

    <div v-if="activeTab === 'style'" class="tab-content">
      <div v-if="!selectedId" class="empty">选择主题以编辑属性</div>
      <template v-else>
        <div class="preview">{{ selectedTopic()?.title || '主题' }}</div>

        <div class="section-title">形状</div>
        <div class="field">
          <label>形状</label>
          <select :value="style?.shape ?? 'rounded'" @change="patchStyle({ shape: ($event.target as HTMLSelectElement).value as TopicStyle['shape'] })">
            <option value="rounded">圆角矩形</option>
            <option value="rectangle">矩形</option>
            <option value="ellipse">椭圆</option>
            <option value="diamond">菱形</option>
            <option value="none">无框</option>
          </select>
        </div>
        <div class="row">
          <div class="field half">
            <label>填充</label>
            <input type="color" :value="style?.fillColor ?? '#E8F4FD'" @input="patchStyle({ fillColor: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="field half">
            <label>边框色</label>
            <input type="color" :value="style?.borderColor ?? '#4A90D9'" @input="patchStyle({ borderColor: ($event.target as HTMLInputElement).value })" />
          </div>
        </div>
        <div class="row">
          <div class="field half">
            <label>边框线型</label>
            <select
              :value="style?.borderDash?.length ? (style?.borderDash[0] === 1 ? 'dot' : 'dash') : style?.borderWidth === 0 ? 'none' : 'solid'"
              @change="
                (() => {
                  const v = ($event.target as HTMLSelectElement).value;
                  if (v === 'none') patchStyle({ borderWidth: 0, borderDash: undefined });
                  else if (v === 'dash') patchStyle({ borderWidth: style?.borderWidth || 1, borderDash: [6, 3] });
                  else if (v === 'dot') patchStyle({ borderWidth: style?.borderWidth || 1, borderDash: [1, 3] });
                  else patchStyle({ borderWidth: style?.borderWidth || 1, borderDash: undefined });
                })()
              "
            >
              <option value="solid">实线</option>
              <option value="dash">虚线</option>
              <option value="dot">点线</option>
              <option value="none">无</option>
            </select>
          </div>
          <div class="field half">
            <label>粗细</label>
            <input type="number" min="0" max="5" :value="style?.borderWidth ?? 1" @change="patchStyle({ borderWidth: Number(($event.target as HTMLInputElement).value) })" />
          </div>
        </div>
        <div class="field">
          <label>宽度</label>
          <div class="row">
            <input
              type="number"
              min="40"
              :value="style?.width ?? ''"
              placeholder="自适应"
              @change="
                patchStyle({
                  width: Number(($event.target as HTMLInputElement).value) || undefined,
                  widthMode: ($event.target as HTMLInputElement).value ? 'fixed' : 'auto',
                })
              "
            />
            <button type="button" @click="patchStyle({ width: undefined, widthMode: 'auto' })">适合</button>
          </div>
        </div>

        <div class="section-title">文本</div>
        <div class="field">
          <label>字体</label>
          <select :value="style?.fontFamily ?? ''" @change="patchStyle({ fontFamily: ($event.target as HTMLSelectElement).value || undefined })">
            <option value="">跟随主题</option>
            <option value="sans-serif">Sans</option>
            <option value="serif">Serif</option>
            <option value="monospace">等宽</option>
            <option value="'Segoe UI', sans-serif">Segoe UI</option>
          </select>
        </div>
        <div class="row">
          <div class="field half">
            <label>字号</label>
            <input type="number" min="8" max="48" :value="style?.fontSize ?? 14" @change="patchStyle({ fontSize: Number(($event.target as HTMLInputElement).value) })" />
          </div>
          <div class="field half">
            <label>字色</label>
            <input type="color" :value="style?.fontColor ?? '#333333'" @input="patchStyle({ fontColor: ($event.target as HTMLInputElement).value })" />
          </div>
        </div>
        <div class="field">
          <label>字重</label>
          <select :value="style?.fontWeight ?? 'normal'" @change="patchStyle({ fontWeight: ($event.target as HTMLSelectElement).value as TopicStyle['fontWeight'] })">
            <option value="light">Light</option>
            <option value="normal">Regular</option>
            <option value="medium">Medium</option>
            <option value="bold">Bold</option>
          </select>
        </div>
        <div class="btn-row">
          <button type="button" :class="{ on: style?.fontWeight === 'bold' }" @click="patchStyle({ fontWeight: style?.fontWeight === 'bold' ? 'normal' : 'bold' })">B</button>
          <button type="button" :class="{ on: style?.fontStyle === 'italic' }" @click="patchStyle({ fontStyle: style?.fontStyle === 'italic' ? 'normal' : 'italic' })"><i>I</i></button>
          <button type="button" :class="{ on: style?.textDecoration === 'underline' }" @click="patchStyle({ textDecoration: style?.textDecoration === 'underline' ? 'none' : 'underline' })"><u>U</u></button>
          <button type="button" :class="{ on: style?.textDecoration === 'line-through' }" @click="patchStyle({ textDecoration: style?.textDecoration === 'line-through' ? 'none' : 'line-through' })"><s>S</s></button>
          <button type="button" @click="patchStyle({ textTransform: style?.textTransform === 'uppercase' ? 'none' : 'uppercase' })">Tt</button>
        </div>
        <div class="btn-row">
          <button type="button" :class="{ on: (style?.textAlign ?? 'center') === 'left' }" @click="patchStyle({ textAlign: 'left' })">左</button>
          <button type="button" :class="{ on: (style?.textAlign ?? 'center') === 'center' }" @click="patchStyle({ textAlign: 'center' })">中</button>
          <button type="button" :class="{ on: (style?.textAlign ?? 'center') === 'right' }" @click="patchStyle({ textAlign: 'right' })">右</button>
        </div>

        <div class="section-title">标记</div>
        <div class="markers">
          <button
            v-for="m in markers"
            :key="m.id"
            type="button"
            class="marker-btn"
            :class="{ on: selectedTopic()?.markers.includes(m.id) }"
            :title="m.label"
            @click="toggleMarker(m.id)"
          >
            {{ markerGlyph(m.id) }}
          </button>
        </div>

        <div class="section-title">内容</div>
        <div class="field">
          <label>备注</label>
          <textarea ref="noteRef" :value="selectedTopic()?.note ?? ''" rows="3" @change="updateNote(($event.target as HTMLTextAreaElement).value)" />
        </div>
        <div class="field">
          <label>标签</label>
          <div class="labels">
            <span v-for="l in selectedTopic()?.labels ?? []" :key="l.id" class="label" :style="{ background: l.color }" @click="removeLabel(l.id)" :title="'点击删除'">
              {{ l.text }}
            </span>
          </div>
          <button type="button" @click="addLabel">添加标签</button>
        </div>
        <div v-if="selectedTopic()?.callout" class="field">
          <label>标注</label>
          <div class="meta">{{ selectedTopic()?.callout?.text }}</div>
        </div>
        <div class="field">
          <label>待办</label>
          <ul class="todo-list">
            <li v-for="todo in selectedTopic()?.todos ?? []" :key="todo.id">
              <label>
                <input type="checkbox" :checked="todo.checked" @change="toggleTodo(todo.id)" />
                {{ todo.text }}
              </label>
            </li>
          </ul>
        </div>
        <div class="field">
          <label>任务</label>
          <div class="task-row">
            <select
              :value="selectedTopic()?.task?.priority ?? 'none'"
              @change="updateTaskField({ priority: ($event.target as HTMLSelectElement).value as NonNullable<Topic['task']>['priority'] })"
            >
              <option value="none">无优先级</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              :value="selectedTopic()?.task?.progress ?? 0"
              @change="updateTaskField({ progress: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <input
            type="text"
            placeholder="负责人"
            :value="selectedTopic()?.task?.assignee ?? ''"
            @change="updateTaskField({ assignee: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="field">
          <label>方程</label>
          <input ref="equationRef" type="text" :value="selectedTopic()?.equation ?? ''" placeholder="LaTeX" @change="updateEquation(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="field">
          <label>链接</label>
          <div v-if="selectedTopic()?.hyperlink" class="meta">
            {{ selectedTopic()?.hyperlink?.type }}: {{ selectedTopic()?.hyperlink?.target }}
          </div>
          <div v-else class="meta">无</div>
        </div>
        <div class="field">
          <label>评论</label>
          <ul class="comment-list">
            <li v-for="c in selectedTopic()?.comments ?? []" :key="c.id">
              <strong>{{ c.author ?? '我' }}</strong>: {{ c.text }}
            </li>
          </ul>
          <div class="comment-add">
            <input ref="commentRef" type="text" placeholder="添加评论…" @keydown.enter="addCommentFromPanel" />
            <button type="button" @click="addCommentFromPanel">发送</button>
          </div>
        </div>
      </template>
    </div>

    <div v-else-if="activeTab === 'canvas'" class="tab-content">
      <div class="field structure-field">
        <label>结构</label>
        <StructurePicker v-if="sheet" :sheet-id="sheet.id" :sheet="sheet" />
      </div>
      <div class="field">
        <label>主题</label>
        <select class="theme-picker" :value="sheet?.canvasSettings.themeId ?? 'default'" @change="onThemeChange">
          <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>背景颜色</label>
        <input
          type="color"
          :value="sheet?.canvasSettings.backgroundColor ?? '#ffffff'"
          @input="patchCanvas({ backgroundColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="field">
        <label>背景纹理</label>
        <select
          :value="sheet?.canvasSettings.backgroundPattern ?? 'solid'"
          @change="patchCanvas({ backgroundPattern: ($event.target as HTMLSelectElement).value as Sheet['canvasSettings']['backgroundPattern'] })"
        >
          <option value="solid">纯色</option>
          <option value="grid">网格</option>
          <option value="dots">点阵</option>
        </select>
      </div>
      <div class="field">
        <label>全局字体</label>
        <select
          :value="sheet?.canvasSettings.globalFontFamily ?? ''"
          @change="patchCanvas({ globalFontFamily: ($event.target as HTMLSelectElement).value || undefined })"
        >
          <option value="">默认</option>
          <option value="sans-serif">Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">等宽</option>
        </select>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            :checked="sheet?.canvasSettings.coloredBranch ?? true"
            @change="patchCanvas({ coloredBranch: ($event.target as HTMLInputElement).checked })"
          />
          彩虹分支
        </label>
      </div>
      <div class="field">
        <label>
          <input
            type="checkbox"
            :checked="sheet?.canvasSettings.handDrawn ?? false"
            @change="patchCanvas({ handDrawn: ($event.target as HTMLInputElement).checked })"
          />
          手绘风格
        </label>
      </div>
      <div class="field">
        <label>画布比例</label>
        <select
          :value="sheet?.canvasSettings.aspectGuide ?? 'none'"
          @change="patchCanvas({ aspectGuide: ($event.target as HTMLSelectElement).value as Sheet['canvasSettings']['aspectGuide'] })"
        >
          <option value="none">无</option>
          <option value="a4">A4</option>
          <option value="a3">A3</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="1:1">1:1</option>
        </select>
      </div>
    </div>

    <div v-else class="tab-content">
      <div class="field">
        <button type="button" class="primary" @click="emit('start-pitch')">开始演说</button>
      </div>
      <div class="field">
        <button type="button" @click="addPitchSlide" :disabled="!selectedId">添加当前主题为帧</button>
        <button type="button" @click="autoPitchFromChildren" :disabled="!selectedId">从子主题生成</button>
      </div>
      <ul class="pitch-list">
        <li v-for="s in pitchSlides" :key="s.id">
          <span>{{ topicTitle(s.topicId) }}</span>
          <span class="pitch-actions">
            <button type="button" @click="movePitchSlide(s.id, -1)">↑</button>
            <button type="button" @click="movePitchSlide(s.id, 1)">↓</button>
            <button type="button" @click="removePitchSlide(s.id)">×</button>
          </span>
        </li>
      </ul>
      <div v-if="!pitchSlides.length" class="meta">暂无帧；演说时将按主题树顺序自动生成</div>
    </div>
  </aside>
</template>

<style scoped>
.property-panel {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #ddd;
  background: #fff;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
}
.tabs button {
  flex: 1;
  padding: 8px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
}
.tabs button.active {
  background: #fff;
  border-bottom: 2px solid #4a90d9;
}
.tab-content {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
}
.empty {
  color: #999;
  padding: 24px 8px;
  text-align: center;
}
.preview {
  padding: 10px;
  margin-bottom: 12px;
  background: #f0f6fc;
  border: 1px solid #c5d9f0;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
}
.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  margin: 12px 0 6px;
  text-transform: uppercase;
}
.field {
  margin-bottom: 10px;
}
.field label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.field textarea,
.field input[type='text'],
.field input[type='number'],
.field select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.half {
  flex: 1;
}
.btn-row {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.btn-row button,
.markers button {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.btn-row button.on,
.marker-btn.on {
  background: #e8f4fd;
  border-color: #4a90d9;
}
.markers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}
.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.label {
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.meta {
  font-size: 12px;
  color: #666;
}
.todo-list,
.comment-list,
.pitch-list {
  list-style: none;
  padding: 0;
  margin: 0 0 6px;
  font-size: 13px;
}
.pitch-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}
.pitch-actions {
  display: flex;
  gap: 2px;
}
.task-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.comment-add {
  display: flex;
  gap: 4px;
}
.primary {
  width: 100%;
  padding: 8px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.structure-field {
  margin-bottom: 16px;
}
</style>
