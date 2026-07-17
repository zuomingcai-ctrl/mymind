<script setup lang="ts">
import { ref } from 'vue';
import { getDefaultVariantForStructure } from '@mymind/core';
import StructureVariantPicker from './structure/StructureVariantPicker.vue';

const emit = defineEmits<{
  confirm: [variantId: string];
  cancel: [];
}>();

const selectedVariantId = ref(getDefaultVariantForStructure('mindmap').id);
</script>

<template>
  <div class="dialog-overlay" @click.self="emit('cancel')">
    <div class="dialog">
      <h2>{{ $t('newDocument.title') }}</h2>
      <p class="hint">{{ $t('newDocument.structure') }}</p>
      <StructureVariantPicker
        :selected-variant-id="selectedVariantId"
        compact
        @select="(id) => (selectedVariantId = id)"
      />
      <div class="actions">
        <button type="button" @click="emit('cancel')">取消</button>
        <button type="button" class="primary" @click="emit('confirm', selectedVariantId)">创建</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.dialog {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  width: min(420px, 92vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.dialog h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.hint {
  margin: 0 0 8px;
  color: #666;
  font-size: 13px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}
.actions button {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
}
.primary {
  background: #4a90d9 !important;
  color: white;
  border-color: #4a90d9 !important;
}
</style>
