import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InsertMenu from '../components/InsertMenu.vue';
import { createDocument } from '@mymind/core';
import { isInsertEnabled } from '../insert/insert-items';

describe('InsertMenu IN-001/003/004', () => {
  it('opens dropdown and disables topic-required items when nothing selected', async () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    const wrapper = mount(InsertMenu, {
      props: { sheet, selection: [] },
    });
    await wrapper.find('.insert-trigger').trigger('click');
    expect(wrapper.find('[data-testid="insert-menu"] .insert-dropdown').exists()).toBe(true);
    const noteBtn = wrapper.findAll('.menu-item').find((b) => b.text() === '笔记');
    expect(noteBtn?.attributes('disabled')).toBeDefined();
  });

  it('enables note when a topic is selected', async () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    const wrapper = mount(InsertMenu, {
      props: { sheet, selection: [sheet.rootTopic.id] },
    });
    await wrapper.find('.insert-trigger').trigger('click');
    const noteBtn = wrapper.findAll('.menu-item').find((b) => b.text() === '笔记');
    expect(noteBtn?.attributes('disabled')).toBeUndefined();
  });

  it('shows link submenu items', async () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    const wrapper = mount(InsertMenu, {
      props: { sheet, selection: [sheet.rootTopic.id] },
    });
    await wrapper.find('.insert-trigger').trigger('click');
    await wrapper.find('.has-sub').trigger('click');
    const labels = wrapper.findAll('.submenu .menu-item').map((b) => b.text());
    expect(labels).toEqual(expect.arrayContaining(['网页', '主题', '文件']));
  });
});

describe('isInsertEnabled IN-004', () => {
  it('disables zone when central topic is selected', () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    expect(
      isInsertEnabled('zone', {
        sheet,
        selection: [sheet.rootTopic.id],
        rootId: sheet.rootTopic.id,
      }),
    ).toBe(false);
  });

  it('allows sticker without selection', () => {
    const doc = createDocument();
    expect(
      isInsertEnabled('sticker', {
        sheet: doc.sheets[0]!,
        selection: [],
        rootId: doc.sheets[0]!.rootTopic.id,
      }),
    ).toBe(true);
  });
});
