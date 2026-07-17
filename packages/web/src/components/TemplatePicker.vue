<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  listTemplates,
  createFromTemplate,
  listTemplateCategories,
  createFromUserTemplate,
  type TemplateCategory,
  type UserTemplate,
} from '@mymind/core';
import { useDocumentStore } from '../stores/document';

const emit = defineEmits<{
  select: [templateId: string];
  cancel: [];
}>();

const visible = ref(true);
const category = ref<TemplateCategory | 'all' | 'user'>('all');
const categories = listTemplateCategories();

const userTemplates = computed((): UserTemplate[] => {
  try {
    const raw = localStorage.getItem('mymind-user-templates');
    if (!raw) return [];
    return JSON.parse(raw) as UserTemplate[];
  } catch {
    return [];
  }
});

const templates = computed(() =>
  category.value === 'all' ? listTemplates() : category.value === 'user' ? [] : listTemplates(category.value),
);

const store = useDocumentStore();

const dialogVisible = computed({
  get: () => visible.value,
  set: (v: boolean) => {
    visible.value = v;
    if (!v) emit('cancel');
  },
});

function pick(id: string) {
  const doc = createFromTemplate(id);
  store.loadDocument(doc);
  emit('select', id);
}

function pickUser(tpl: UserTemplate) {
  store.loadDocument(createFromUserTemplate(tpl));
  emit('select', tpl.id);
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('templates.title')"
    width="680px"
    destroy-on-close
    append-to-body
  >
    <el-radio-group v-model="category" class="filters">
      <el-radio-button value="all">All</el-radio-button>
      <el-radio-button value="user">{{ $t('templates.user') }}</el-radio-button>
      <el-radio-button v-for="c in categories" :key="c" :value="c">
        {{ $t(`templates.${c}`) }}
      </el-radio-button>
    </el-radio-group>

    <el-row v-if="category === 'user'" :gutter="12" class="grid">
      <el-col v-if="!userTemplates.length" :span="24">
        <el-empty :description="$t('templates.noUser')" />
      </el-col>
      <el-col v-for="t in userTemplates" :key="t.id" :xs="24" :sm="12" :md="8">
        <el-card
          shadow="hover"
          class="template-card"
          :body-style="{ padding: '12px', cursor: 'pointer' }"
          @click="pickUser(t)"
        >
          <div class="name">{{ t.name }}</div>
          <div class="desc">{{ t.createdAt.slice(0, 10) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row v-else :gutter="12" class="grid">
      <el-col v-for="t in templates" :key="t.id" :xs="24" :sm="12" :md="8">
        <el-card
          shadow="hover"
          class="template-card"
          :body-style="{ padding: '12px', cursor: 'pointer' }"
          :data-template-id="t.id"
          @click="pick(t.id)"
        >
          <div class="name">{{ t.name }}</div>
          <div class="desc">{{ t.description }}</div>
        </el-card>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<style scoped>
.filters {
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.grid {
  max-height: 55vh;
  overflow-y: auto;
}
.template-card {
  margin-bottom: 12px;
}
.name {
  font-weight: 600;
  margin-bottom: 4px;
}
.desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
