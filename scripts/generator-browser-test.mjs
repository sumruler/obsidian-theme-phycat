import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { root } from './lib.mjs';

const require = createRequire(import.meta.url);
const data = require('../color-generator/palette-data.js');
const math = require('../color-generator/palette.js');
const engine = math.createEngine(data);
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', offline: true, acceptDownloads: true });
const page = await context.newPage();
const errors = [], externalRequests = [];
page.on('pageerror', error => errors.push(error.message));
context.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
async function download(selector) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const file = await pending;
  return JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
}
async function importJSON(values) {
  await page.locator('#import-file').setInputFiles({ name: 'palette.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(values)) });
}
try {
  await page.goto(pathToFileURL(path.join(root, 'color-generator/index.html')).href);
  await page.locator('#color-text-primary-color').waitFor();
  const frame = page.frames().find(frame => frame.url().endsWith('/preview.html'));
  assert.ok(frame, 'Local preview iframe is missing');
  await frame.waitForFunction(() => document.body.classList.contains('css-settings-manager'));
  assert.equal(await page.locator('#preview-error').isVisible(), false);
  assert.equal(await frame.locator('.callout').count(), 17);
  assert.equal(await frame.locator('.nav-folder').count(), 7);
  assert.ok(await frame.evaluate(() => document.querySelector('#phycat-theme').sheet !== null));
  for (const preset of data.presets) {
    await page.locator('button[data-mode="' + preset.mode + '"]').click();
    await page.locator('#preset').selectOption(preset.id);
    const state = engine.initial(); engine.loadPreset(state, preset.id, preset.mode);
    const variables = engine.variables(preset.mode, state.modes[preset.mode].colors);
    await frame.waitForFunction(expected => document.body.classList.contains('theme-' + expected.mode) &&
      Object.entries(expected.variables).every(([name, value]) => document.body.style.getPropertyValue('--' + name) === value), { mode: preset.mode, variables });
    assert.equal(await page.locator('#preset').inputValue(), preset.id);
  }
  await page.locator('button[data-mode="light"]').click();
  await page.locator('#preset').selectOption('sakura');
  const initial = await download('#export-current');
  assert.deepEqual(initial, data.presets.find(preset => preset.id === 'sakura').values);
  assert.equal(Object.keys(initial).length, 194);
  const combined = await download('#export-both');
  assert.equal(Object.keys(combined).length, 388);
  for (const [name, value] of Object.entries(data.presets.find(preset => preset.id === 'vampire').values)) assert.equal(combined[name], value);

  await page.locator('#preview-layout').selectOption('layout-cards');
  await page.locator('#preview-h1').selectOption('h1-align-left');
  await page.locator('#preview-h2').selectOption('capsule');
  await frame.waitForFunction(() => ['layout-cards', 'h1-align-left', 'h2-style-capsule'].every(name => document.body.classList.contains(name)));
  assert.deepEqual(await download('#export-current'), initial, 'Preview preferences entered the JSON');
  await page.locator('#show-interface').click();
  await frame.locator('.modal-container').waitFor({ state: 'visible' });
  if (data.features.autoAccentText) {
    await page.locator('#preview-accent-text').selectOption('manual');
    await frame.waitForFunction(() => document.body.classList.contains('manual-accent-contrast'));
    await page.locator('#preview-accent-text').selectOption('auto');
    await frame.waitForFunction(() => !document.body.classList.contains('manual-accent-contrast'));
  }
  await frame.locator('.modal-container').press('Escape');
  await frame.locator('.modal-container').waitFor({ state: 'hidden' });

  await importJSON({ 'phycat-colors@@border-color@@dark': '#12345678', 'unrelated@@setting': true });
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('忽略'));
  const imported = await download('#export-both');
  assert.equal(imported['phycat-colors@@border-color@@dark'], '#12345678');
  for (const [name, value] of Object.entries(initial)) assert.equal(imported[name], value);
  await importJSON({ 'phycat-colors@@primary-color@@light': '#456789', 'phycat-headings@@h3-dark-color': 'invalid' });
  await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
  assert.deepEqual(await download('#export-both'), imported, 'Invalid import partially committed');
  await page.locator('button[data-mode="light"]').click();
  await page.locator('#color-text-primary-color').fill('#285ca8');
  await page.locator('#color-text-primary-color').press('Tab');
  await frame.waitForFunction(() => document.body.style.getPropertyValue('--primary-color') === '#285ca8');
  await page.locator('#counterpart').click();
  await frame.waitForFunction(() => document.body.classList.contains('theme-dark'));
  const generated = await download('#export-current');
  assert.equal(Object.keys(generated).length, 194);
  assert.equal(generated['phycat-colors@@border-color@@dark'], '#12345678');
  await page.screenshot({ path: path.join(root, 'test-results/generator-dark.png'), fullPage: true });
  await page.locator('button[data-mode="light"]').click();
  await page.locator('#preset').selectOption('sakura');
  await page.locator('#preview-layout').selectOption('layout-default');
  await page.locator('#preview-h1').selectOption('h1-align-center');
  await page.locator('#preview-h2').selectOption('twin');
  await frame.waitForFunction(() => document.body.classList.contains('theme-light') && document.body.classList.contains('h2-style-twin'));
  await page.screenshot({ path: path.join(root, 'test-results/generator-light.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 850 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Narrow layout overflows');
  assert.equal(await page.locator('.workbench').evaluate(element => getComputedStyle(element).flexDirection), 'column');
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log('Offline generator passed: file:// without network, 12 presets, preview styles, modal, 194/388 downloads, atomic import, counterpart locks and narrow layout.');
} catch (error) {
  await page.screenshot({ path: path.join(root, 'test-results/generator-failure.png'), fullPage: true });
  throw error;
} finally { await browser.close(); }
