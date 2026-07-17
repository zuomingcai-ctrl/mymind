<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MindMapDocument } from '@mymind/core';

const props = defineProps<{
  document: MindMapDocument | null;
}>();

const emit = defineEmits<{ close: [] }>();

const paper = ref<'a4' | 'letter'>('a4');
const sheetScope = ref<'current' | 'all'>('current');

const pageCount = computed(() => {
  if (!props.document) return 0;
  return sheetScope.value === 'all' ? props.document.sheets.length : 1;
});

function onPrint() {
  window.print();
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog">
      <h2>打印预览</h2>
      <div class="options">
        <label>
          纸张
          <select v-model="paper">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label>
          范围
          <select v-model="sheetScope">
            <option value="current">当前画布</option>
            <option value="all">全部画布</option>
          </select>
        </label>
      </div>
      <div class="preview">
        <div v-for="n in pageCount" :key="n" class="page">{{ paper.toUpperCase() }} — 第 {{ n }} 页</div>
      </div>
      <div class="actions">
        <button @click="emit('close')">关闭</button>
        <button class="primary" @click="onPrint">打印</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 520px;
}
.options {
  display: flex;
  gap: 16px;
  margin: 12px 0;
}
.options label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
}
.preview {
  border: 1px solid #ddd;
  min-height: 200px;
  padding: 12px;
  background: #f5f5f5;
}
.page {
  background: #fff;
  border: 1px solid #ccc;
  padding: 24px;
  margin-bottom: 8px;
  min-height: 120px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.primary {
  background: #4a90d9;
  color: #fff;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
}
</style>
