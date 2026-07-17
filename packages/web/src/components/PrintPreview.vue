<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MindMapDocument } from '@mymind/core';

const props = defineProps<{
  document: MindMapDocument | null;
}>();

const emit = defineEmits<{ close: [] }>();

const visible = ref(true);
const paper = ref<'a4' | 'letter'>('a4');
const sheetScope = ref<'current' | 'all'>('current');

const pageCount = computed(() => {
  if (!props.document) return 0;
  return sheetScope.value === 'all' ? props.document.sheets.length : 1;
});

const dialogVisible = computed({
  get: () => visible.value,
  set: (v: boolean) => {
    visible.value = v;
    if (!v) emit('close');
  },
});

function onPrint() {
  window.print();
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="打印预览"
    width="560px"
    destroy-on-close
    append-to-body
  >
    <el-form label-position="top" inline>
      <el-form-item label="纸张">
        <el-select v-model="paper" style="width: 140px">
          <el-option label="A4" value="a4" />
          <el-option label="Letter" value="letter" />
        </el-select>
      </el-form-item>
      <el-form-item label="范围">
        <el-select v-model="sheetScope" style="width: 160px">
          <el-option label="当前画布" value="current" />
          <el-option label="全部画布" value="all" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-scrollbar max-height="280px">
      <el-card
        v-for="n in pageCount"
        :key="n"
        class="page"
        shadow="never"
      >
        {{ paper.toUpperCase() }} — 第 {{ n }} 页
      </el-card>
    </el-scrollbar>

    <template #footer>
      <el-button @click="emit('close')">关闭</el-button>
      <el-button type="primary" @click="onPrint">打印</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.page {
  margin-bottom: 8px;
  min-height: 100px;
  background: var(--el-fill-color-blank);
}
</style>
