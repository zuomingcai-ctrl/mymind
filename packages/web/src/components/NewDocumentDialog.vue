<script setup lang="ts">
import { ref, computed } from 'vue';
import { getDefaultVariantForStructure } from '@mymind/core';
import StructureVariantPicker from './structure/StructureVariantPicker.vue';

const emit = defineEmits<{
  confirm: [variantId: string];
  cancel: [];
}>();

const visible = ref(true);
const selectedVariantId = ref(getDefaultVariantForStructure('mindmap').id);

const dialogVisible = computed({
  get: () => visible.value,
  set: (v: boolean) => {
    visible.value = v;
    if (!v) emit('cancel');
  },
});
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('newDocument.title')"
    width="440px"
    destroy-on-close
    append-to-body
  >
    <p class="hint">{{ $t('newDocument.structure') }}</p>
    <StructureVariantPicker
      :selected-variant-id="selectedVariantId"
      compact
      @select="(id) => (selectedVariantId = id)"
    />
    <template #footer>
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button type="primary" @click="emit('confirm', selectedVariantId)">创建</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
