/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { computed, defineComponent, h } from 'vue';
import ElementPlus from 'element-plus';
import SheetTabs from '../SheetTabs.vue';
import { useDocumentStore } from '../../stores/document';

describe('SheetTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function mountWithStore() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useDocumentStore();
    store.newDocument();

    const Host = defineComponent({
      setup() {
        const document = computed(() => store.document);
        const activeSheetId = computed(() => store.activeSheetId);
        return () =>
          h(SheetTabs, {
            document: document.value,
            activeSheetId: activeSheetId.value,
            onSwitch: (id: string) => store.setActiveSheet(id),
          });
      },
    });

    const wrapper = mount(Host, {
      global: { plugins: [ElementPlus, pinia] },
    });
    return { wrapper, store };
  }

  it('adds a sheet when clicking 添加', async () => {
    const { wrapper, store } = mountWithStore();
    expect(store.document!.sheets).toHaveLength(1);

    await wrapper.get('[data-testid="sheet-add"]').trigger('click');
    await flushPromises();

    expect(store.document!.sheets).toHaveLength(2);
    expect(wrapper.findAll('.sheet-tab')).toHaveLength(2);
  });

  it('shows close and deletes sheet when more than one', async () => {
    const { wrapper, store } = mountWithStore();

    await wrapper.get('[data-testid="sheet-add"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="sheet-close"]')).toHaveLength(2);

    const toDelete = store.document!.sheets[1]!.id;
    await wrapper.findAll('[data-testid="sheet-close"]')[1]!.trigger('click');
    await flushPromises();

    expect(store.document!.sheets).toHaveLength(1);
    expect(store.document!.sheets[0]!.id).not.toBe(toDelete);
    expect(wrapper.findAll('[data-testid="sheet-close"]')).toHaveLength(0);
  });
});
