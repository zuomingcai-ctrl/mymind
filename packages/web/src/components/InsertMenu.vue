<script setup lang="ts">
import { computed } from 'vue';
import type { Sheet } from '@mymind/core';
import { Plus, ArrowRight } from '@element-plus/icons-vue';
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
}

const recentItems = computed(() =>
  recent.value
    .map((id) => INSERT_ITEMS.find((i) => i.id === id))
    .filter((x): x is (typeof INSERT_ITEMS)[number] => !!x),
);
</script>

<template>
  <el-dropdown
    data-testid="insert-menu"
    trigger="click"
    placement="bottom-start"
    :hide-on-click="true"
    :teleported="false"
  >
    <el-button type="primary" class="insert-trigger" data-testid="insert-trigger">
      <el-icon class="el-icon--left"><Plus /></el-icon>
      插入
    </el-button>
    <template #dropdown>
      <div class="insert-dropdown" data-testid="insert-dropdown" role="menu" @click.stop>
        <div v-if="recentItems.length" class="recent-row">
          <span class="recent-label">最近</span>
          <el-button
            v-for="item in recentItems"
            :key="item.id"
            class="menu-item recent"
            size="small"
            text
            :disabled="!enabled(item.id)"
            @click="onPick(item.id)"
          >
            {{ item.label }}
          </el-button>
        </div>
        <div class="columns">
          <div class="col">
            <el-button
              v-for="id in leftItems"
              :key="id"
              class="menu-item"
              text
              :disabled="!enabled(id)"
              @click="onPick(id)"
            >
              {{ insertItemLabel(id) }}
            </el-button>
            <el-dropdown
              placement="right-start"
              trigger="click"
              :teleported="false"
              :disabled="!enabled('link-web')"
            >
              <el-button class="menu-item has-sub" text :disabled="!enabled('link-web')">
                链接
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu class="submenu">
                  <el-dropdown-item
                    v-for="id in LINK_SUBMENU"
                    :key="id"
                    class="menu-item"
                    :disabled="!enabled(id)"
                    @click="onPick(id)"
                  >
                    {{ insertItemLabel(id) }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="col">
            <el-button
              v-for="id in rightItems"
              :key="id"
              class="menu-item"
              text
              :disabled="!enabled(id)"
              @click="onPick(id)"
            >
              {{ insertItemLabel(id) }}
            </el-button>
          </div>
        </div>
      </div>
    </template>
  </el-dropdown>
</template>

<style scoped>
.insert-dropdown {
  min-width: 280px;
  padding: 8px 10px;
}
.recent-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.recent-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
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
  align-items: stretch;
}
.menu-item {
  justify-content: flex-start;
  width: 100%;
  margin: 0 !important;
}
.has-sub {
  display: flex;
  justify-content: space-between;
}
</style>
