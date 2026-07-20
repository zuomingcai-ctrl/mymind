<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { Theme, TopicStyle } from '@mymind/core';
import { generateId } from '@mymind/core';

const props = defineProps<{
  modelValue: boolean;
  /** Theme used to seed the editor when opened */
  source: Theme;
  /** When true, keep source.id (edit existing custom theme) */
  editExisting?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [theme: Theme];
}>();

const draft = reactive<Theme>(emptyTheme());

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const topicLevels = [
  { key: 'centralTopic' as const, label: '中心主题' },
  { key: 'mainTopic' as const, label: '一级主题' },
  { key: 'subTopic' as const, label: '下级主题' },
  { key: 'floatingTopic' as const, label: '自由主题' },
];

type TopicLevelKey = (typeof topicLevels)[number]['key'];

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    const cloned = structuredClone(props.source) as Theme;
    if (!props.editExisting) {
      cloned.id = `custom-${generateId()}`;
      cloned.name = `${props.source.name} 自定义`;
    }
    Object.assign(draft, cloned);
    draft.colors = structuredClone(cloned.colors);
    draft.edge = structuredClone(cloned.edge);
  },
);

function emptyTheme(): Theme {
  const style = (): TopicStyle => ({
    shape: 'rounded',
    fillColor: '#ffffff',
    borderColor: '#cccccc',
    borderWidth: 1,
    fontSize: 14,
    fontColor: '#333333',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none',
    textAlign: 'left',
    widthMode: 'auto',
  });
  return {
    id: '',
    name: '',
    colors: {
      background: '#ffffff',
      centralTopic: style(),
      mainTopic: style(),
      subTopic: style(),
      floatingTopic: style(),
      branchColors: ['#4A90D9', '#7ED321', '#F5A623', '#BD10E0', '#50E3C2'],
    },
    edge: {
      lineType: 'curve',
      color: '#999999',
      width: 2,
      arrowStart: false,
      arrowEnd: false,
    },
    fontFamily: 'sans-serif',
    handDrawn: false,
  };
}

function topicStyle(key: TopicLevelKey): TopicStyle {
  return draft.colors[key];
}

function patchTopic(key: TopicLevelKey, patch: Partial<TopicStyle>) {
  const next: TopicStyle = { ...draft.colors[key], ...patch };
  if ('borderDash' in patch && !patch.borderDash) {
    delete next.borderDash;
  }
  draft.colors[key] = next;
}

function parseDash(raw: string): number[] | undefined {
  const parts = raw
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parts.length ? parts : undefined;
}

function setEdgeDash(raw: string) {
  const dash = parseDash(raw);
  if (dash) draft.edge.dash = dash;
  else delete draft.edge.dash;
}

function setBranchColor(index: number, color: string | null) {
  if (!color) return;
  const next = [...draft.colors.branchColors];
  next[index] = color;
  draft.colors.branchColors = next;
}

function addBranchColor() {
  draft.colors.branchColors = [...draft.colors.branchColors, '#4A90D9'];
}

function removeBranchColor(index: number) {
  if (draft.colors.branchColors.length <= 1) return;
  draft.colors.branchColors = draft.colors.branchColors.filter((_, i) => i !== index);
}

function onSave() {
  const theme: Theme = structuredClone(draft);
  theme.name = theme.name.trim() || '自定义主题';
  if (!theme.id) theme.id = `custom-${generateId()}`;
  emit('save', theme);
  visible.value = false;
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="editExisting ? '编辑自定义主题' : '自定义主题'"
    width="520px"
    append-to-body
    class="custom-theme-dialog"
    destroy-on-close
  >
    <el-scrollbar max-height="70vh">
      <el-form label-position="top" size="small" class="theme-form">
        <el-form-item label="名称" required>
          <el-input v-model="draft.name" />
        </el-form-item>

        <el-form-item label="全局字体">
          <el-select v-model="draft.fontFamily" style="width: 100%" allow-create filterable>
            <el-option label="Sans" value="sans-serif" />
            <el-option label="Serif" value="serif" />
            <el-option label="等宽" value="monospace" />
            <el-option label="系统 UI" value="system-ui" />
          </el-select>
        </el-form-item>

        <el-form-item label="画布背景">
          <el-color-picker v-model="draft.colors.background" show-alpha />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="draft.handDrawn">手绘风格</el-checkbox>
        </el-form-item>

        <el-divider content-position="left">彩虹分支色</el-divider>
        <div class="branch-row">
          <div v-for="(c, i) in draft.colors.branchColors" :key="i" class="branch-item">
            <el-color-picker :model-value="c" @change="(v: string | null) => setBranchColor(i, v)" />
            <el-button
              text
              type="danger"
              size="small"
              :disabled="draft.colors.branchColors.length <= 1"
              @click="removeBranchColor(i)"
            >
              删
            </el-button>
          </div>
          <el-button size="small" @click="addBranchColor">添加颜色</el-button>
        </div>

        <el-divider content-position="left">连线 (edge)</el-divider>
        <el-form-item label="线型">
          <el-select v-model="draft.edge.lineType" style="width: 100%">
            <el-option label="曲线" value="curve" />
            <el-option label="折线" value="polyline" />
            <el-option label="直线" value="straight" />
          </el-select>
        </el-form-item>
        <div class="inline-fields">
          <el-form-item label="颜色">
            <el-color-picker v-model="draft.edge.color" />
          </el-form-item>
          <el-form-item label="线宽">
            <el-input-number v-model="draft.edge.width" :min="0.5" :max="12" :step="0.5" />
          </el-form-item>
        </div>
        <el-form-item label="虚线 (dash，逗号分隔)">
          <el-input
            :model-value="draft.edge.dash?.join(',') ?? ''"
            placeholder="如 4,2；空为实线"
            @change="setEdgeDash"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="draft.edge.arrowStart">起点箭头</el-checkbox>
          <el-checkbox v-model="draft.edge.arrowEnd">终点箭头</el-checkbox>
        </el-form-item>

        <template v-for="level in topicLevels" :key="level.key">
          <el-divider content-position="left">{{ level.label }}</el-divider>
          <el-form-item label="形状">
            <el-select
              :model-value="topicStyle(level.key).shape"
              style="width: 100%"
              @change="(v: TopicStyle['shape']) => patchTopic(level.key, { shape: v })"
            >
              <el-option label="圆角矩形" value="rounded" />
              <el-option label="矩形" value="rectangle" />
              <el-option label="椭圆" value="ellipse" />
              <el-option label="菱形" value="diamond" />
              <el-option label="无" value="none" />
            </el-select>
          </el-form-item>
          <div class="inline-fields">
            <el-form-item label="填充">
              <el-color-picker
                :model-value="topicStyle(level.key).fillColor"
                show-alpha
                @change="(v: string | null) => v && patchTopic(level.key, { fillColor: v })"
              />
            </el-form-item>
            <el-form-item label="边框色">
              <el-color-picker
                :model-value="topicStyle(level.key).borderColor"
                show-alpha
                @change="(v: string | null) => v && patchTopic(level.key, { borderColor: v })"
              />
            </el-form-item>
            <el-form-item label="边框宽">
              <el-input-number
                :model-value="topicStyle(level.key).borderWidth ?? 1"
                :min="0"
                :max="12"
                :step="0.5"
                @change="
                  (v: number | undefined) =>
                    v != null && patchTopic(level.key, { borderWidth: v })
                "
              />
            </el-form-item>
          </div>
          <el-form-item label="边框虚线 (逗号分隔)">
            <el-input
              :model-value="topicStyle(level.key).borderDash?.join(',') ?? ''"
              placeholder="空为实线"
              @change="(v: string) => patchTopic(level.key, { borderDash: parseDash(v) })"
            />
          </el-form-item>
          <div class="inline-fields">
            <el-form-item label="字号">
              <el-input-number
                :model-value="topicStyle(level.key).fontSize ?? 14"
                :min="8"
                :max="48"
                @change="
                  (v: number | undefined) =>
                    v != null && patchTopic(level.key, { fontSize: v })
                "
              />
            </el-form-item>
            <el-form-item label="字色">
              <el-color-picker
                :model-value="topicStyle(level.key).fontColor"
                @change="(v: string | null) => v && patchTopic(level.key, { fontColor: v })"
              />
            </el-form-item>
          </div>
          <el-form-item label="字体">
            <el-input
              :model-value="topicStyle(level.key).fontFamily ?? ''"
              placeholder="空则跟随全局字体"
              @change="
                (v: string) =>
                  patchTopic(level.key, { fontFamily: v.trim() || undefined })
              "
            />
          </el-form-item>
          <div class="inline-fields">
            <el-form-item label="字重">
              <el-select
                :model-value="topicStyle(level.key).fontWeight ?? 'normal'"
                style="width: 100%"
                @change="(v: TopicStyle['fontWeight']) => patchTopic(level.key, { fontWeight: v })"
              >
                <el-option label="细" value="light" />
                <el-option label="常规" value="normal" />
                <el-option label="中等" value="medium" />
                <el-option label="粗" value="bold" />
              </el-select>
            </el-form-item>
            <el-form-item label="字形">
              <el-select
                :model-value="topicStyle(level.key).fontStyle ?? 'normal'"
                style="width: 100%"
                @change="(v: TopicStyle['fontStyle']) => patchTopic(level.key, { fontStyle: v })"
              >
                <el-option label="常规" value="normal" />
                <el-option label="斜体" value="italic" />
              </el-select>
            </el-form-item>
          </div>
          <div class="inline-fields">
            <el-form-item label="装饰">
              <el-select
                :model-value="topicStyle(level.key).textDecoration ?? 'none'"
                style="width: 100%"
                @change="
                  (v: TopicStyle['textDecoration']) =>
                    patchTopic(level.key, { textDecoration: v })
                "
              >
                <el-option label="无" value="none" />
                <el-option label="下划线" value="underline" />
                <el-option label="删除线" value="line-through" />
              </el-select>
            </el-form-item>
            <el-form-item label="大小写">
              <el-select
                :model-value="topicStyle(level.key).textTransform ?? 'none'"
                style="width: 100%"
                @change="
                  (v: TopicStyle['textTransform']) =>
                    patchTopic(level.key, { textTransform: v })
                "
              >
                <el-option label="无" value="none" />
                <el-option label="大写" value="uppercase" />
                <el-option label="小写" value="lowercase" />
                <el-option label="首字母大写" value="capitalize" />
              </el-select>
            </el-form-item>
          </div>
          <div class="inline-fields">
            <el-form-item label="对齐">
              <el-select
                :model-value="topicStyle(level.key).textAlign ?? 'left'"
                style="width: 100%"
                @change="(v: TopicStyle['textAlign']) => patchTopic(level.key, { textAlign: v })"
              >
                <el-option label="左" value="left" />
                <el-option label="中" value="center" />
                <el-option label="右" value="right" />
              </el-select>
            </el-form-item>
            <el-form-item label="宽度模式">
              <el-select
                :model-value="topicStyle(level.key).widthMode ?? 'auto'"
                style="width: 100%"
                @change="(v: TopicStyle['widthMode']) => patchTopic(level.key, { widthMode: v })"
              >
                <el-option label="自动" value="auto" />
                <el-option label="固定" value="fixed" />
              </el-select>
            </el-form-item>
            <el-form-item
              v-if="(topicStyle(level.key).widthMode ?? 'auto') === 'fixed'"
              label="固定宽度"
            >
              <el-input-number
                :model-value="topicStyle(level.key).width ?? 120"
                :min="40"
                :max="800"
                @change="
                  (v: number | undefined) =>
                    v != null && patchTopic(level.key, { width: v })
                "
              />
            </el-form-item>
          </div>
        </template>
      </el-form>
    </el-scrollbar>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="onSave">保存并应用</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.theme-form {
  padding-right: 8px;
}
.inline-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.inline-fields > :deep(.el-form-item) {
  margin-bottom: 12px;
}
.branch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.branch-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
