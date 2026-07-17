/**
 * covers: 功能规格 §16 场景 2–6（浏览器验收）
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test.beforeEach(async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect(page.locator('.canvas-view')).toBeVisible({ timeout: 15_000 });
});

async function fillOutliner(page: import('@playwright/test').Page, index: number, value: string) {
  await page.locator('.outliner-input').nth(index).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = v;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function getOutlinerTitles(page: import('@playwright/test').Page) {
  return page.locator('.outliner-input').evaluateAll((els) =>
    els.map((el) => (el as HTMLInputElement).value),
  );
}

async function selectOutlinerRoot(page: import('@playwright/test').Page) {
  await page.locator('.outliner-row').first().evaluate((el) => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

test('场景 2: 结构切换保留文字', async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
  }

  const titlesBefore = await getOutlinerTitles(page);

  await page.getByTestId('tab-canvas').click();
  await page.locator('.structure-picker').selectOption('fishbone');

  const titlesAfter = await getOutlinerTitles(page);
  expect(titlesAfter).toEqual(titlesBefore);
});

test('场景 3: SWOT 模板录入并导出', async ({ page }) => {
  await page.getByRole('button', { name: '模板' }).click();
  await page.locator('[data-template-id="tpl-swot"]').click();

  const inputs = page.locator('.outliner-input');
  await expect(inputs).toHaveCount(5);

  await fillOutliner(page, 1, '优势 S');
  await fillOutliner(page, 2, '劣势 W');
  await fillOutliner(page, 3, '机会 O');
  await fillOutliner(page, 4, '威胁 T');

  const content = await page.evaluate(() =>
    (window as unknown as { __mymindE2E: { getMarkdown: () => string } }).__mymindE2E.getMarkdown(),
  );
  expect(content).toContain('优势 S');
  expect(content).toContain('威胁 T');
});

test('场景 4: 大纲与画布删除同步', async ({ page }) => {
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Delete');

  await expect(page.locator('.outliner-input')).toHaveCount(2);
});

test('场景 5: JSON 文件往返一致', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
  }

  const titlesBefore = await getOutlinerTitles(page);
  expect(titlesBefore.length).toBeGreaterThanOrEqual(4);

  const json = await page.evaluate(() => (window as unknown as { __mymindE2E: { getJson: () => string } }).__mymindE2E.getJson());
  expect(json.length).toBeGreaterThan(100);
  const filePath = path.join(os.tmpdir(), 'roundtrip.mymind');
  fs.writeFileSync(filePath, json, 'utf8');

  await page.reload();
  await expect(page.locator('.canvas-view')).toBeVisible({ timeout: 15_000 });

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '打开' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  await expect(page.locator('.outliner-input')).toHaveCount(titlesBefore.length);

  const titlesAfter = await getOutlinerTitles(page);
  expect(titlesAfter).toEqual(titlesBefore);
  fs.unlinkSync(filePath);
});

test('场景 6: 概要/外框/关系切换结构后保留', async ({ page }) => {
  await selectOutlinerRoot(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await selectOutlinerRoot(page);

  await page.getByRole('button', { name: '概要' }).click();
  await page.getByRole('button', { name: '外框' }).click();
  await page.getByRole('button', { name: '关系' }).click();

  await page.getByTestId('tab-canvas').click();
  await page.locator('.structure-picker').selectOption('logic-chart');

  await expect(page.locator('.outliner-input').first()).toBeVisible();
  await expect(page.locator('.canvas-view')).toBeVisible();
});
