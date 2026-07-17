<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue';
import { UpdateTopicTitleCommand } from '@mymind/core';
import { useDocument } from '../composables/useDocument';

const props = defineProps<{
  sheetId: string;
  topicId: string;
  title: string;
  left: number;
  top: number;
  width: number;
  height: number;
  initialText?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { dispatch } = useDocument();
const inputRef = ref<HTMLInputElement | null>(null);
const replaceMode = computed(() => props.initialText !== undefined);
const draft = ref(props.initialText ?? props.title);

watch(
  () => props.title,
  (t) => {
    if (document.activeElement !== inputRef.value) {
      draft.value = t;
    }
  },
);

function focusInput(selectAll = false) {
  const input = inputRef.value;
  if (!input) return;
  input.focus();
  if (selectAll) {
    input.select();
  }
}

function commit() {
  const next = draft.value.trim() || props.title;
  if (next !== props.title) {
    dispatch(new UpdateTopicTitleCommand(props.sheetId, props.topicId, next, props.title));
  }
  draft.value = next;
}

function onBlur() {
  commit();
  emit('close');
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.stopPropagation();
    e.preventDefault();
    commit();
    inputRef.value?.blur();
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    draft.value = props.title;
    inputRef.value?.blur();
  }
}

function replaceWith(text: string) {
  draft.value = text;
  nextTick(() => {
    const input = inputRef.value;
    if (!input) return;
    input.focus();
    input.setSelectionRange(text.length, text.length);
  });
}

onMounted(() => {
  nextTick(() => {
    if (replaceMode.value) {
      focusInput(false);
      const input = inputRef.value;
      if (input) {
        input.setSelectionRange(draft.value.length, draft.value.length);
      }
    } else {
      focusInput(true);
    }
  });
});

onBeforeUnmount(commit);

defineExpose({ focus: () => focusInput(true), replaceWith });
</script>

<template>
  <input
    ref="inputRef"
    v-model="draft"
    class="topic-text-editor"
    :style="{
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.max(width, 80)}px`,
      height: `${Math.max(height, 28)}px`,
    }"
    @blur="onBlur"
    @keydown="onKeyDown"
    @mousedown.stop
    @click.stop
  />
</template>

<style scoped>
.topic-text-editor {
  position: fixed;
  z-index: 300;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 2px solid #4a90d9;
  border-radius: 6px;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  background: #fff;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
