<script setup lang="ts">
import { ref, computed } from 'vue';
import { listTemplates, createFromTemplate, listTemplateCategories, type TemplateCategory } from '@mymind/core';
import { CommandBus } from '@mymind/core';
import { useDocumentStore } from '../stores/document';

const emit = defineEmits<{
  select: [templateId: string];
  cancel: [];
}>();

const category = ref<TemplateCategory | 'all'>('all');
const categories = listTemplateCategories();

const templates = computed(() =>
  category.value === 'all' ? listTemplates() : listTemplates(category.value),
);

const store = useDocumentStore();

function pick(id: string) {
  const doc = createFromTemplate(id);
  store.document = doc;
  store.activeSheetId = doc.sheets[0]!.id;
  store.selection = [doc.sheets[0]!.rootTopic.id];
  store.commandBus = new CommandBus(doc);
  emit('select', id);
}
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="dialog">
      <h2>{{ $t('templates.title') }}</h2>
      <div class="filters">
        <button :class="{ active: category === 'all' }" @click="category = 'all'">All</button>
        <button
          v-for="c in categories"
          :key="c"
          :class="{ active: category === c }"
          @click="category = c"
        >
          {{ $t(`templates.${c}`) }}
        </button>
      </div>
      <div class="grid">
        <button v-for="t in templates" :key="t.id" class="card" :data-template-id="t.id" @click="pick(t.id)">
          <strong>{{ t.name }}</strong>
          <span>{{ t.description }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.dialog {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  max-width: 640px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}
.filters {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  flex-wrap: wrap;
}
.filters button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.filters button.active {
  background: #4a90d9;
  color: #fff;
  border-color: #4a90d9;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.card {
  text-align: left;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card:hover {
  border-color: #4a90d9;
}
.card span {
  font-size: 12px;
  color: #666;
}
</style>
