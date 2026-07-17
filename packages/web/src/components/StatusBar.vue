<script setup lang="ts">
defineProps<{
  zoomPercent: number;
}>();

const emit = defineEmits<{
  zoomChange: [percent: number];
  toggleOutline: [];
  fit: [];
  center: [];
}>();

const presets = [25, 50, 75, 100, 125, 150, 200, 300, 400];

function onSelect(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  emit('zoomChange', value);
}
</script>

<template>
  <footer class="status-bar">
    <button type="button" @click="emit('toggleOutline')">大纲</button>
    <button type="button" @click="emit('fit')">适应</button>
    <button type="button" @click="emit('center')">居中</button>
    <span>{{ $t('statusBar.zoom') }}: {{ zoomPercent }}%</span>
    <select :value="zoomPercent" @change="onSelect">
      <option v-for="p in presets" :key="p" :value="p">{{ p }}%</option>
    </select>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 12px;
}
.status-bar button {
  padding: 2px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}
</style>
