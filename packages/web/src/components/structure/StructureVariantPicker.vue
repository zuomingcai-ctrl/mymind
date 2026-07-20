<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Sheet } from '@mymind/core';
import {
  STRUCTURE_SECTIONS,
  getVariantsForStructure,
  matchStructureVariant,
} from '@mymind/core';
import StructureVariantThumbnail from './StructureVariantThumbnail.vue';

const props = defineProps<{
  sheet?: Sheet | null;
  selectedVariantId?: string | null;
  compact?: boolean;
}>();

const emit = defineEmits<{
  select: [variantId: string];
}>();

const activeNames = ref<string[]>(
  props.sheet ? [props.sheet.structure] : ['mindmap'],
);

const activeVariantId = computed(() => {
  if (props.selectedVariantId) return props.selectedVariantId;
  if (props.sheet) return matchStructureVariant(props.sheet);
  return 'mindmap-right-curve';
});

watch(
  () => props.sheet?.structure,
  (s) => {
    if (s && !activeNames.value.includes(s)) {
      activeNames.value = [...activeNames.value, s];
    }
  },
);

function onSelect(variantId: string) {
  emit('select', variantId);
}
</script>

<template>
  <el-collapse v-model="activeNames" class="variant-picker" :class="{ compact }">
    <el-collapse-item
      v-for="section in STRUCTURE_SECTIONS"
      :key="section.type"
      :title="section.label"
      :name="section.type"
    >
      <div class="grid">
        <el-button
          v-for="variant in getVariantsForStructure(section.type)"
          :key="variant.id"
          text
          class="grid-item"
          :aria-pressed="activeVariantId === variant.id"
          @click="onSelect(variant.id)"
        >
          <StructureVariantThumbnail
            :preview="variant.preview"
            :selected="activeVariantId === variant.id"
            :pro="variant.pro"
          />
        </el-button>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.variant-picker.compact {
  max-height: 360px;
  overflow-y: auto;
}
.variant-picker :deep(.el-collapse-item__header) {
  font-weight: 700;
  font-size: 14px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.grid-item {
  padding: 0 !important;
  height: auto !important;
  border: none !important;
  min-width: 0;
  width: 100%;
}
.grid-item:focus-visible :deep(.thumb) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
