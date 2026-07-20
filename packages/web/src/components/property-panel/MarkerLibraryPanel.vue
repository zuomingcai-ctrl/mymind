<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Sheet, MarkerPreset, DecorationAsset } from '@mymind/core';
import {
  AddMarkerCommand,
  DeleteMarkerCommand,
  listMarkers,
  listDecorationAssets,
} from '@mymind/core';
import { useDocument } from '../../composables/useDocument';
import MarkerIcon from '../MarkerIcon.vue';

const props = defineProps<{
  sheet: Sheet | null;
  selectedId: string | null;
  initialTab?: 'markers' | 'stickers' | 'illustrations';
}>();

const emit = defineEmits<{
  'add-decoration': [asset: DecorationAsset];
}>();

const { dispatch } = useDocument();
const activeTab = ref(props.initialTab ?? 'markers');

const CATEGORY_LABELS: Record<MarkerPreset['category'], string> = {
  tag: '标签',
  priority: '优先级',
  progress: '任务',
  flag: '旗帜',
  star: '星星',
  people: '人像',
  symbol: '符号',
};

const CATEGORY_ORDER: MarkerPreset['category'][] = [
  'tag',
  'priority',
  'progress',
  'flag',
  'star',
  'people',
  'symbol',
];

const expandedCategories = ref<string[]>([...CATEGORY_ORDER]);

const markerGroups = computed(() => {
  const all = listMarkers();
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: all.filter((m) => m.category === category),
  })).filter((g) => g.items.length > 0);
});

const stickers = computed(() => listDecorationAssets('sticker'));
const illustrations = computed(() => listDecorationAssets('illustration'));

const selectedMarkers = computed(() => {
  if (!props.sheet || !props.selectedId) return [] as string[];
  return findTopicMarkers(props.sheet.rootTopic, props.selectedId) ?? [];
});

function findTopicMarkers(topic: Sheet['rootTopic'], id: string): string[] | null {
  if (topic.id === id) return topic.markers;
  for (const child of topic.children) {
    const found = findTopicMarkers(child, id);
    if (found !== null) return found;
  }
  return null;
}

function toggleMarker(id: string) {
  if (!props.sheet || !props.selectedId) return;
  const has = selectedMarkers.value.includes(id);
  if (has) dispatch(new DeleteMarkerCommand(props.sheet.id, props.selectedId, id));
  else dispatch(new AddMarkerCommand(props.sheet.id, props.selectedId, id));
}

function addDecoration(asset: DecorationAsset) {
  if (!props.sheet) return;
  emit('add-decoration', asset);
}
</script>

<template>
  <aside class="marker-library" data-testid="marker-library">
    <div class="library-header">
      <el-tabs v-model="activeTab" class="library-tabs" stretch>
        <el-tab-pane label="标记" name="markers" />
        <el-tab-pane label="贴纸" name="stickers" />
        <el-tab-pane label="插画" name="illustrations" />
      </el-tabs>
    </div>

    <el-scrollbar class="library-scroll">
      <template v-if="activeTab === 'markers'">
        <el-alert
          v-if="!selectedId"
          type="info"
          :closable="false"
          title="选择主题以添加标记"
          class="hint"
        />
        <el-collapse v-model="expandedCategories">
          <el-collapse-item
            v-for="group in markerGroups"
            :key="group.category"
            :title="group.label"
            :name="group.category"
          >
            <div class="icon-grid">
              <button
                v-for="m in group.items"
                :key="m.id"
                type="button"
                class="icon-btn"
                :class="{ active: selectedMarkers.includes(m.id), disabled: !selectedId }"
                :title="m.label"
                :disabled="!selectedId"
                @click="toggleMarker(m.id)"
              >
                <MarkerIcon :preset="m" :size="24" />
              </button>
            </div>
          </el-collapse-item>
        </el-collapse>
      </template>

      <template v-else-if="activeTab === 'stickers'">
        <p class="hint-text">点击贴纸放入画布</p>
        <div class="icon-grid asset-grid">
          <button
            v-for="a in stickers"
            :key="a.id"
            type="button"
            class="icon-btn asset-btn"
            :title="a.label"
            :disabled="!sheet"
            @click="addDecoration(a)"
          >
            <span class="glyph large">{{ a.glyph }}</span>
            <span class="asset-label">{{ a.label }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <p class="hint-text">点击插画放入画布</p>
        <div class="icon-grid asset-grid">
          <button
            v-for="a in illustrations"
            :key="a.id"
            type="button"
            class="icon-btn asset-btn"
            :title="a.label"
            :disabled="!sheet"
            @click="addDecoration(a)"
          >
            <span class="glyph large">{{ a.glyph }}</span>
            <span class="asset-label">{{ a.label }}</span>
          </button>
        </div>
      </template>
    </el-scrollbar>
  </aside>
</template>

<style scoped>
.marker-library {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}
.library-header {
  padding: 0 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.library-tabs {
  min-width: 0;
}
.library-tabs :deep(.el-tabs__header) {
  margin: 0;
}
.library-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
.library-tabs :deep(.el-tabs__content) {
  display: none;
}
.library-scroll {
  flex: 1;
  padding: 4px 10px 12px;
  height: calc(100vh - 160px);
}
.hint {
  margin-bottom: 8px;
}
.hint-text {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.asset-grid {
  gap: 8px;
}
.icon-btn {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, border-color 0.15s;
}
.icon-btn:hover:not(:disabled) {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-lighter);
}
.icon-btn.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}
.icon-btn:disabled,
.icon-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.asset-btn {
  width: 72px;
  height: 72px;
  flex-direction: column;
  gap: 4px;
  background: var(--el-fill-color-light);
}
.glyph {
  font-size: 18px;
  line-height: 1;
}
.glyph.large {
  font-size: 28px;
}
.asset-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.marker-library :deep(.el-collapse-item__header) {
  font-size: 12px;
  font-weight: 600;
  height: 28px;
  line-height: 28px;
}
.marker-library :deep(.el-collapse-item__content) {
  padding-bottom: 6px;
}
.marker-library :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}
</style>
