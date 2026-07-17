<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { Sheet } from '@mymind/core';
import {
  INSERT_ITEMS,
  LINK_SUBMENU,
  insertItemLabel,
  isInsertEnabled,
  type InsertActionId,
} from '../insert/insert-items';
import { useRecentInserts } from '../composables/useRecentInserts';

const props = defineProps<{
  sheet: Sheet | null;
  selection: string[];
}>();

const emit = defineEmits<{
  insert: [id: InsertActionId];
}>();

const open = ref(false);
const linkOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const { recent } = useRecentInserts();

const enableCtx = computed(() => ({
  sheet: props.sheet,
  selection: props.selection,
  rootId: props.sheet?.rootTopic.id ?? null,
}));

const leftItems: InsertActionId[] = ['zone', 'callout', 'comment'];
const rightItems: InsertActionId[] = [
  'note',
  'label',
  'todo',
  'task',
  'attachment',
  'sticker',
  'illustration',
  'image',
  'equation',
];

function enabled(id: InsertActionId): boolean {
  return isInsertEnabled(id, enableCtx.value);
}

function onPick(id: InsertActionId) {
  if (!enabled(id)) return;
  emit('insert', id);
  open.value = false;
  linkOpen.value = false;
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
    linkOpen.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));

const recentItems = computed(() =>
  recent.value
    .map((id) => INSERT_ITEMS.find((i) => i.id === id))
    .filter((x): x is (typeof INSERT_ITEMS)[number] => !!x),
);
</script>

<template>
  <div ref="rootRef" class="insert-menu" data-testid="insert-menu">
    <button
      type="button"
      class="insert-trigger"
      :aria-expanded="open"
      @click="open = !open"
    >
      + 插入
    </button>
    <div v-if="open" class="insert-dropdown" role="menu">
      <div v-if="recentItems.length" class="recent-row">
        <span class="recent-label">最近</span>
        <button
          v-for="item in recentItems"
          :key="item.id"
          type="button"
          class="menu-item recent"
          :disabled="!enabled(item.id)"
          @click="onPick(item.id)"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="columns">
        <div class="col">
          <button
            v-for="id in leftItems"
            :key="id"
            type="button"
            class="menu-item"
            :disabled="!enabled(id)"
            @click="onPick(id)"
          >
            {{ insertItemLabel(id) }}
          </button>
          <div
            class="submenu-wrap"
            @mouseenter="linkOpen = true"
            @mouseleave="linkOpen = false"
          >
            <button
              type="button"
              class="menu-item has-sub"
              :disabled="!enabled('link-web')"
              @click="linkOpen = !linkOpen"
            >
              链接 ▸
            </button>
            <div v-if="linkOpen" class="submenu" role="menu">
              <button
                v-for="id in LINK_SUBMENU"
                :key="id"
                type="button"
                class="menu-item"
                :disabled="!enabled(id)"
                @click="onPick(id)"
              >
                {{ insertItemLabel(id) }}
              </button>
            </div>
          </div>
        </div>
        <div class="col">
          <button
            v-for="id in rightItems"
            :key="id"
            type="button"
            class="menu-item"
            :disabled="!enabled(id)"
            @click="onPick(id)"
          >
            {{ insertItemLabel(id) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.insert-menu {
  position: relative;
  display: inline-block;
}
.insert-trigger {
  padding: 4px 10px;
  cursor: pointer;
}
.insert-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 40;
  margin-top: 4px;
  min-width: 280px;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 8px;
}
.recent-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.recent-label {
  font-size: 11px;
  color: #888;
  margin-right: 4px;
}
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-item {
  text-align: left;
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}
.menu-item:hover:not(:disabled) {
  background: #f0f4f8;
}
.menu-item:disabled {
  color: #bbb;
  cursor: not-allowed;
}
.menu-item.recent {
  background: #f5f5f5;
  font-size: 12px;
}
.submenu-wrap {
  position: relative;
}
.submenu {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 4px;
  min-width: 88px;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 4px;
  z-index: 41;
}
.has-sub {
  display: flex;
  justify-content: space-between;
}
</style>
