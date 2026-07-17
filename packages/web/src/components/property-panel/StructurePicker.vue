<script setup lang="ts">
import type { Sheet } from '@mymind/core';
import { ApplyStructureVariantCommand } from '@mymind/core';
import { useDocument } from '../../composables/useDocument';
import StructureVariantPicker from '../structure/StructureVariantPicker.vue';

const props = defineProps<{
  sheetId: string;
  sheet: Sheet;
}>();

const { dispatch } = useDocument();

function onSelect(variantId: string) {
  dispatch(new ApplyStructureVariantCommand(props.sheetId, variantId));
}
</script>

<template>
  <StructureVariantPicker :sheet="sheet" @select="onSelect" />
</template>
