import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import StatusBar from '../components/StatusBar.vue';
import zhCN from '../i18n/locales/zh-CN.json';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN },
});

describe('i18n', () => {
  it('defaults to zh-CN', () => {
    expect(i18n.global.locale.value).toBe('zh-CN');
    expect(i18n.global.t('app.title')).toBe('MyMind');
  });
});

describe('StatusBar', () => {
  it('shows zoom percent', () => {
    const wrapper = mount(StatusBar, {
      props: { zoomPercent: 100 },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toContain('100%');
  });
});
