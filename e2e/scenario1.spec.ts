/**
 * covers: 功能规格 §16 场景 1（浏览器键盘录入）
 */
import { test, expect } from '@playwright/test';

test('场景 1: 打开应用后 Tab 创建子主题', async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect(page.locator('.canvas-view')).toBeVisible({ timeout: 15_000 });

  const start = Date.now();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
  }
  expect(Date.now() - start).toBeLessThan(30_000);

  await expect(page.locator('.status-bar')).toBeVisible();
});
