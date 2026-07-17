<script setup lang="ts">
defineProps<{
  zoomPercent: number;
  sheetTitle?: string;
  nodeCount?: number;
  titleChars?: number;
  noteChars?: number;
}>();

const emit = defineEmits<{
  zoomChange: [percent: number];
  toggleOutline: [];
  fit: [];
  center: [];
}>();

const presets = [25, 50, 75, 100, 125, 150, 200, 300, 400];
</script>

<template>
  <footer class="status-bar" role="status" aria-live="polite">
    <el-button-group>
      <el-button :aria-label="$t('toolbar.showOutliner')" @click="emit('toggleOutline')">大纲</el-button>
      <el-button @click="emit('fit')">适应</el-button>
      <el-button @click="emit('center')">居中</el-button>
    </el-button-group>
    <span v-if="sheetTitle" class="info">{{ sheetTitle }}</span>
    <span v-if="nodeCount != null" class="info">{{ $t('statusBar.nodes') }}: {{ nodeCount }}</span>
    <span v-if="titleChars != null" class="info" :title="$t('statusBar.wordCountTip')">
      {{ $t('statusBar.chars') }}: {{ titleChars }}
      <template v-if="noteChars"> / {{ $t('statusBar.noteChars') }}: {{ noteChars }}</template>
    </span>
    <span class="zoom-label">{{ $t('statusBar.zoom') }}: {{ zoomPercent }}%</span>
    <el-select
      :model-value="zoomPercent"
      style="width: 100px"
      :aria-label="$t('statusBar.zoom')"
      @change="(v: number) => emit('zoomChange', v)"
    >
      <el-option v-for="p in presets" :key="p" :label="`${p}%`" :value="p" />
    </el-select>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  font-size: 12px;
}
.info {
  color: var(--el-text-color-regular);
}
.zoom-label {
  color: var(--el-text-color-secondary);
  margin-left: auto;
}
</style>
