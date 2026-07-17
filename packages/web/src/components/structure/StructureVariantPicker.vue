<script setup lang="ts">
import { computed, ref } from 'vue';
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

const expanded = ref<Record<string, boolean>>({});

function isExpanded(type: string): boolean {
  if (expanded.value[type] !== undefined) return expanded.value[type]!;
  if (props.sheet) return props.sheet.structure === type;
  return type === 'mindmap';
}

function toggleSection(type: string) {
  expanded.value[type] = !isExpanded(type);
}

const activeVariantId = computed(() => {
  if (props.selectedVariantId) return props.selectedVariantId;
  if (props.sheet) return matchStructureVariant(props.sheet);
  return 'mindmap-balanced-classic';
});

function onSelect(variantId: string) {
  emit('select', variantId);
}
</script>

<template>
  <div class="variant-picker" :class="{ compact }">
    <section v-for="section in STRUCTURE_SECTIONS" :key="section.type" class="section">
      <button type="button" class="section-header" @click="toggleSection(section.type)">
        <span class="caret" :class="{ collapsed: !isExpanded(section.type) }">▼</span>
        <span class="section-title">{{ section.label }}</span>
      </button>
      <div v-show="isExpanded(section.type)" class="grid">
        <button
          v-for="variant in getVariantsForStructure(section.type)"
          :key="variant.id"
          type="button"
          class="grid-item"
          :aria-pressed="activeVariantId === variant.id"
          @click="onSelect(variant.id)"
        >
          <StructureVariantThumbnail
            :preview="variant.preview"
            :selected="activeVariantId === variant.id"
            :pro="variant.pro"
          />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.variant-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.variant-picker.compact {
  max-height: 360px;
  overflow-y: auto;
}
.section {
  margin-bottom: 8px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 0 8px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #111;
}
.caret {
  font-size: 10px;
  color: #111;
  transition: transform 0.15s;
  display: inline-block;
}
.caret.collapsed {
  transform: rotate(-90deg);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.grid-item {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  min-width: 0;
}
.grid-item:focus-visible :deep(.thumb) {
  outline: 2px solid #4a90d9;
  outline-offset: 2px;
}
</style>
