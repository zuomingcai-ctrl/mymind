<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';
import type { Sheet, Theme, TopicStyle } from '@mymind/core';
import {
  UpdateThemeCommand,
  getTheme,
  loadCustomThemes,
  saveCustomTheme,
} from '@mymind/core';
import { useDocument } from '../../composables/useDocument';

const props = defineProps<{
  sheet: Sheet;
}>();

const { dispatch } = useDocument();
const themeTick = ref(0);
const activeLevel = ref<TopicLevelKey>('centralTopic');

const topicLevels = [
  { key: 'centralTopic' as const, label: '中心' },
  { key: 'mainTopic' as const, label: '一级' },
  { key: 'subTopic' as const, label: '下级' },
  { key: 'floatingTopic' as const, label: '自由' },
];

type TopicLevelKey = (typeof topicLevels)[number]['key'];
type LinePreset = 'solid' | 'dash' | 'dot' | 'none';

const theme = computed(() => {
  themeTick.value;
  return getTheme(props.sheet.canvasSettings.themeId);
});

const activeStyle = computed(() => theme.value.colors[activeLevel.value]);

function commitTheme(next: Theme) {
  saveCustomTheme(next);
  themeTick.value += 1;
  dispatch(new UpdateThemeCommand(props.sheet.id, next.id));
}

/** Builtin themes are read-only; first edit clones into a sheet-bound custom theme. */
function editableTheme(): Theme {
  const current = structuredClone(toRaw(getTheme(props.sheet.canvasSettings.themeId)));
  if (loadCustomThemes().some((t) => t.id === current.id)) return current;
  current.id = `sheet-${props.sheet.id}`;
  current.name = '画布主题';
  return current;
}

function patchTheme(mutator: (t: Theme) => void) {
  const next = editableTheme();
  mutator(next);
  commitTheme(next);
}

function patchTopic(patch: Partial<TopicStyle>) {
  const key = activeLevel.value;
  patchTheme((t) => {
    const next: TopicStyle = { ...t.colors[key], ...patch };
    for (const k of Object.keys(patch) as (keyof TopicStyle)[]) {
      if (patch[k] === undefined) delete next[k];
    }
    if (!next.shape) next.shape = 'rounded';
    t.colors[key] = next;
  });
}

function setTopicColor(key: 'fillColor' | 'borderColor' | 'fontColor', color: string | null) {
  patchTopic({ [key]: color ?? undefined });
}

function dashPreset(dash: number[] | undefined, borderWidth?: number): LinePreset {
  if (borderWidth === 0) return 'none';
  if (!dash?.length) return 'solid';
  return dash[0] === 1 ? 'dot' : 'dash';
}

function applyDashPreset(
  preset: LinePreset,
  currentWidth: number | undefined,
): { borderWidth?: number; borderDash?: number[] } {
  if (preset === 'none') return { borderWidth: 0, borderDash: undefined };
  if (preset === 'dash') return { borderWidth: currentWidth || 1, borderDash: [6, 3] };
  if (preset === 'dot') return { borderWidth: currentWidth || 1, borderDash: [1, 3] };
  return { borderWidth: currentWidth || 1, borderDash: undefined };
}

function setTopicBorderPreset(preset: LinePreset) {
  patchTopic(applyDashPreset(preset, activeStyle.value.borderWidth));
}

function setEdgeDashPreset(preset: LinePreset) {
  patchTheme((t) => {
    if (preset === 'none' || preset === 'solid') delete t.edge.dash;
    else if (preset === 'dash') t.edge.dash = [6, 3];
    else t.edge.dash = [1, 3];
  });
}

function setBranchColor(index: number, color: string | null) {
  if (!color) {
    removeBranchColor(index);
    return;
  }
  patchTheme((t) => {
    const next = [...t.colors.branchColors];
    next[index] = color;
    t.colors.branchColors = next;
  });
}

function addBranchColor() {
  patchTheme((t) => {
    t.colors.branchColors = [...t.colors.branchColors, '#4A90D9'];
  });
}

function removeBranchColor(index: number) {
  if (theme.value.colors.branchColors.length <= 1) return;
  patchTheme((t) => {
    t.colors.branchColors = t.colors.branchColors.filter((_, i) => i !== index);
  });
}

const topicPreviewStyle = computed(() => {
  const s = activeStyle.value;
  const radius =
    s.shape === 'ellipse' ? '999px' : s.shape === 'rounded' ? '8px' : s.shape === 'diamond' ? '0' : '2px';
  const borderW = s.borderWidth ?? 1;
  const dash = s.borderDash;
  const borderStyle =
    borderW <= 0 ? 'none' : dash?.length ? (dash[0] === 1 ? 'dotted' : 'dashed') : 'solid';
  return {
    background: s.fillColor ?? '#fff',
    color: s.fontColor ?? '#333',
    borderColor: s.borderColor ?? 'transparent',
    borderWidth: borderW <= 0 ? '0' : `${borderW}px`,
    borderStyle,
    borderRadius: s.shape === 'none' ? '0' : radius,
    fontSize: `${Math.min(s.fontSize ?? 14, 15)}px`,
    clipPath: s.shape === 'diamond' ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : undefined,
  };
});
</script>

<template>
  <div class="theme-inline">
    <div class="block">
      <div class="block-head">
        <span>分支色</span>
        <el-button text size="small" @click="addBranchColor">＋</el-button>
      </div>
      <div class="swatch-row">
        <div v-for="(c, i) in theme.colors.branchColors" :key="i" class="swatch">
          <el-color-picker
            :model-value="c"
            size="small"
            @change="(v: string | null) => setBranchColor(i, v)"
          />
          <button
            type="button"
            class="swatch-x"
            :disabled="theme.colors.branchColors.length <= 1"
            title="移除"
            @click="removeBranchColor(i)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <div class="block">
      <div class="block-head"><span>连线</span></div>
      <el-radio-group
        :model-value="theme.edge.lineType"
        size="small"
        class="seg"
        @change="(v: string | number | boolean | undefined) => patchTheme((t) => { t.edge.lineType = v as Theme['edge']['lineType']; })"
      >
        <el-radio-button value="curve">曲线</el-radio-button>
        <el-radio-button value="polyline">折线</el-radio-button>
        <el-radio-button value="straight">直线</el-radio-button>
      </el-radio-group>
      <div class="field-grid">
        <div class="field">
          <label>颜色</label>
          <el-color-picker
            :model-value="theme.edge.color"
            size="small"
            @change="(v: string | null) => patchTheme((t) => { t.edge.color = v ?? '#999999'; })"
          />
        </div>
        <div class="field">
          <label>线宽</label>
          <el-input-number
            :model-value="theme.edge.width"
            :min="0.5"
            :max="12"
            :step="0.5"
            size="small"
            controls-position="right"
            @change="(v: number | undefined) => v != null && patchTheme((t) => { t.edge.width = v; })"
          />
        </div>
        <div class="field field-grow">
          <label>样式</label>
          <el-select
            :model-value="dashPreset(theme.edge.dash)"
            size="small"
            @change="(v: LinePreset) => setEdgeDashPreset(v)"
          >
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dash" />
            <el-option label="点线" value="dot" />
          </el-select>
        </div>
      </div>
      <div class="check-row">
        <el-checkbox
          :model-value="theme.edge.arrowStart"
          @change="(v: string | number | boolean) => patchTheme((t) => { t.edge.arrowStart = !!v; })"
        >
          起点箭头
        </el-checkbox>
        <el-checkbox
          :model-value="theme.edge.arrowEnd"
          @change="(v: string | number | boolean) => patchTheme((t) => { t.edge.arrowEnd = !!v; })"
        >
          终点箭头
        </el-checkbox>
      </div>
    </div>

    <div class="block">
      <div class="block-head"><span>节点样式</span></div>
      <el-radio-group v-model="activeLevel" size="small" class="seg">
        <el-radio-button v-for="level in topicLevels" :key="level.key" :value="level.key">
          {{ level.label }}
        </el-radio-button>
      </el-radio-group>

      <div class="node-preview" :style="topicPreviewStyle">
        {{ topicLevels.find((l) => l.key === activeLevel)?.label }}主题
      </div>

      <div class="field-grid">
        <div class="field field-grow">
          <label>形状</label>
          <el-select
            :model-value="activeStyle.shape"
            size="small"
            @change="(v: TopicStyle['shape']) => patchTopic({ shape: v })"
          >
            <el-option label="圆角" value="rounded" />
            <el-option label="矩形" value="rectangle" />
            <el-option label="椭圆" value="ellipse" />
            <el-option label="菱形" value="diamond" />
            <el-option label="无框" value="none" />
          </el-select>
        </div>
        <div class="field">
          <label>填充</label>
          <el-color-picker
            :model-value="activeStyle.fillColor"
            size="small"
            show-alpha
            @change="(v: string | null) => setTopicColor('fillColor', v)"
          />
        </div>
        <div class="field">
          <label>边框</label>
          <el-color-picker
            :model-value="activeStyle.borderColor"
            size="small"
            show-alpha
            @change="(v: string | null) => setTopicColor('borderColor', v)"
          />
        </div>
      </div>
      <div class="field-grid">
        <div class="field field-grow">
          <label>线型</label>
          <el-select
            :model-value="dashPreset(activeStyle.borderDash, activeStyle.borderWidth)"
            size="small"
            @change="(v: LinePreset) => setTopicBorderPreset(v)"
          >
            <el-option label="实线" value="solid" />
            <el-option label="虚线" value="dash" />
            <el-option label="点线" value="dot" />
            <el-option label="无" value="none" />
          </el-select>
        </div>
        <div class="field">
          <label>字号</label>
          <el-input-number
            :model-value="activeStyle.fontSize ?? 14"
            :min="8"
            :max="48"
            size="small"
            controls-position="right"
            @change="(v: number | undefined) => v != null && patchTopic({ fontSize: v })"
          />
        </div>
        <div class="field">
          <label>字色</label>
          <el-color-picker
            :model-value="activeStyle.fontColor"
            size="small"
            @change="(v: string | null) => setTopicColor('fontColor', v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-inline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block {
  padding: 10px 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.swatch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.swatch {
  position: relative;
}

.swatch-x {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swatch-x:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.seg {
  width: 100%;
  display: flex;
  margin-bottom: 10px;
}

.seg :deep(.el-radio-button) {
  flex: 1;
}

.seg :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 5px 4px;
}

.field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-bottom: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 64px;
}

.field-grow {
  flex: 1;
  min-width: 100px;
}

.field label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.field :deep(.el-input-number),
.field :deep(.el-select) {
  width: 100%;
}

.check-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.node-preview {
  margin: 0 0 10px;
  padding: 8px 14px;
  text-align: center;
  line-height: 1.3;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    border-radius 0.15s ease;
}
</style>
