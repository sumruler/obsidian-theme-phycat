import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root, css } from './lib.mjs';

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const foundation = fs.readFileSync(path.join(root, 'color-generator/preview-base.css'), 'utf8');
const headings = Array.from({ length: 6 }, (_, i) => '<div class="cm-line HyperMD-header HyperMD-header-' + (i + 1) + '" id="edit-h' + (i + 1) + '"><span class="cm-header-' + (i + 1) + '">Heading ' + (i + 1) + '</span></div>').join('<div class="cm-line"><br></div>');
const reading = colors.map(c => '<mark id="read-' + c + '" data-highlight="' + c + '">' + c + '</mark>').join(' ');
const editing = colors.map(c => '<span id="edit-' + c + '" class="cm-highlight cm-highlight-' + c + '">' + c + '</span>').join(' ');
const host = 'html,body{height:auto!important;overflow:auto!important;display:block!important}body{padding:24px;--heading-spacing:12px}.cm-content{width:640px}.cm-line{line-height:24px}.callout{margin-top:20px}';
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, reducedMotion: 'reduce' });
try {
  await page.setContent('<style>' + foundation + '</style><style>' + css + '</style><style>' + host + '</style><div class="markdown-source-view mod-cm6"><div class="cm-s-obsidian"><div class="cm-content">' + headings + '</div>' + editing + '</div></div><div class="markdown-preview-view markdown-rendered">' + reading + '<mark id="plain">plain</mark><mark id="custom" style="background:rgb(1,2,3)">custom</mark><mark class="obsidian-search-match-highlight" id="search">search</mark><h2 id="reading-h2">Heading</h2></div><div class="callout" data-callout="info"><div class="callout-title"><div class="callout-icon"><svg id="callout-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/></svg></div><div class="callout-title-inner">Information</div></div></div>');
  for (const mode of ['light', 'dark']) for (const style of ['twin', 'capsule']) {
    await page.evaluate(({ mode, style }) => { document.body.className = 'theme-' + mode + ' h1-align-center ' + (mode === 'light' ? 'h2-style-' : 'h2-style-dark-') + style; }, { mode, style });
    for (let level = 1; level <= 6; level++) {
      const geometry = await page.locator('#edit-h' + level).evaluate(el => { const rect = el.getBoundingClientRect(), parent = el.parentElement.getBoundingClientRect(), computed = getComputedStyle(el), hit = document.elementFromPoint(rect.right - 3, rect.top + rect.height / 2); return { width: rect.width, parentWidth: parent.width, marginTop: computed.marginTop, marginBottom: computed.marginBottom, paddingTop: parseFloat(computed.paddingTop), paddingBottom: parseFloat(computed.paddingBottom), receivesClick: hit === el || el.contains(hit) }; });
      assert.ok(Math.abs(geometry.width - geometry.parentWidth) < 1, mode + ' H' + level + ' line does not fill the editor');
      assert.equal(geometry.marginTop, '0px'); assert.equal(geometry.marginBottom, '0px');
      assert.ok(geometry.paddingTop > 0 && geometry.paddingBottom > 0, 'Heading spacing must belong to the editable line');
      assert.ok(geometry.receivesClick, 'Empty space on the heading line must receive clicks');
    }
    if (style === 'capsule') assert.ok(await page.locator('#reading-h2').evaluate(el => el.getBoundingClientRect().width < document.querySelector('.cm-content').getBoundingClientRect().width), 'Reading capsules must remain compact');
    const gradients = [];
    for (const color of colors) {
      const read = await page.locator('#read-' + color).evaluate(el => getComputedStyle(el).backgroundImage);
      const edit = await page.locator('#edit-' + color).evaluate(el => getComputedStyle(el).backgroundImage);
      assert.notEqual(read, 'none'); assert.equal(read, edit, 'Reading and editing highlight colors differ: ' + color); gradients.push(read);
    }
    assert.equal(new Set(gradients).size, 6, 'Native highlight colors must remain distinct');
    const normal = await page.locator('#plain').evaluate(el => getComputedStyle(el).backgroundImage);
    await page.evaluate(() => document.body.style.setProperty('--color-accent', '#123456'));
    assert.notEqual(await page.locator('#plain').evaluate(el => getComputedStyle(el).backgroundImage), normal, 'Uncolored highlights should follow the accent');
    assert.equal(await page.locator('#read-red').evaluate(el => getComputedStyle(el).backgroundImage), gradients[0], 'Native highlight colors should not follow the accent');
    await page.evaluate(() => document.body.style.removeProperty('--color-accent'));
    await page.locator('#read-red').hover();
    assert.equal(await page.locator('#read-red').evaluate(el => getComputedStyle(el).backgroundSize), '100% 100%');
    await page.mouse.move(0, 0);
    assert.equal(await page.locator('#custom').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(1, 2, 3)');
    assert.equal(await page.locator('#search').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    const icon = await page.locator('#callout-svg').evaluate(el => ({ fill: getComputedStyle(el).fill, color: getComputedStyle(el).color, title: getComputedStyle(el.closest('.callout-title')).color }));
    assert.equal(icon.fill, 'none', 'Outline SVGs must retain their native fill'); assert.equal(icon.color, icon.title);
  }
  // Exercise the text fragments CodeMirror uses for mixed and wrapped headings.
  const fragmentMarkup = '<div class="markdown-source-view mod-cm6"><div class="cm-s-obsidian"><div class="cm-content">'
    + '<div class="cm-line HyperMD-header HyperMD-header-2" id="mixed-heading"><span class="cm-header-2">Heading </span><span class="cm-header-2 cm-strong">bold </span><span class="cm-header-2 cm-link"><span class="cm-underline">link</span></span><span class="cm-header-2 external-link" id="empty-link"></span></div>'
    + '<div class="cm-line HyperMD-header HyperMD-header-2" id="wrapped-heading"><span class="cm-header-2">' + 'Long heading with words that wrap naturally. '.repeat(8) + '</span></div>'
    + '<div class="cm-line HyperMD-header HyperMD-header-2" id="highlight-heading"><span class="cm-header-2 cm-highlight cm-highlight-blue">Highlighted heading</span></div>'
    + '</div></div></div><div class="workspace-ribbon mod-left" id="ribbon-left"></div><div class="workspace-ribbon mod-primary" id="ribbon-primary"></div><div id="frame-color" style="background-color:var(--background-card)"></div>';
  await page.setContent('<style>' + foundation + '</style><style>' + css + '</style><style>' + host + '</style>' + fragmentMarkup);
  for (const mode of ['light', 'dark']) {
    await page.evaluate(mode => { document.body.className = 'theme-' + mode + ' layout-cards ' + (mode === 'light' ? 'h2-style-' : 'h2-style-dark-') + 'capsule'; }, mode);
    const heading = await page.locator('#mixed-heading').evaluate(el => {
      const line = el.getBoundingClientRect(), fragments = [...el.querySelectorAll(':scope > .cm-header-2:not(:empty)')];
      return { lineWidth: line.width, parentWidth: el.parentElement.getBoundingClientRect().width, lineBackground: getComputedStyle(el).backgroundImage,
        textWidth: fragments.at(-1).getBoundingClientRect().right - fragments[0].getBoundingClientRect().left,
        gradients: fragments.map(s => getComputedStyle(s).backgroundImage) };
    });
    assert.equal(heading.lineWidth, heading.parentWidth, 'Text-width capsules must retain full-line click targets');
    assert.ok(heading.textWidth < heading.lineWidth / 2, 'Short editor capsules should follow text width');
    assert.equal(heading.lineBackground, 'none', 'The empty part of the editor line must not be painted as a capsule');
    assert.ok(heading.gradients.every(g => g !== 'none' && g === heading.gradients[0]), 'Formatted heading fragments must share one gradient');
    const wrapped = await page.locator('#wrapped-heading > span').evaluate(el => { const text = document.createRange(); text.selectNodeContents(el); return { rects: [...el.getClientRects()].map(r => ({ width: r.width, top: r.top })), textWidths: [...text.getClientRects()].map(r => r.width), lineWidth: el.parentElement.getBoundingClientRect().width, parentWidth: el.parentElement.parentElement.getBoundingClientRect().width }; });
    assert.ok(new Set(wrapped.rects.map(r => r.top)).size > 1, 'Long editor capsules must wrap');
    assert.equal(wrapped.lineWidth, wrapped.parentWidth, 'Wrapping must not widen the editor line');
    // Text ranges exclude the cloned capsule padding around each wrapped fragment.
    assert.ok(wrapped.textWidths.every(width => width <= wrapped.lineWidth + 1), 'Wrapped heading text must fit the editor: ' + JSON.stringify({mode,...wrapped}));
    const empty = await page.locator('#empty-link').evaluate(el => ({ width: el.getBoundingClientRect().width, padding: getComputedStyle(el).padding }));
    assert.equal(empty.width, 0, 'An empty link token must not leave a gap in the capsule');
    const highlight = await page.locator('#highlight-heading > span').evaluate(el => getComputedStyle(el).backgroundImage);
    assert.ok(highlight.includes('), linear-gradient('), 'Heading highlights must retain both highlight and capsule backgrounds');
    await page.locator('#highlight-heading > span').hover();
    assert.equal(await page.locator('#highlight-heading > span').evaluate(el => getComputedStyle(el).backgroundSize), '100% 100%, 100% 100%');
    if (mode === 'light') {
      const frame = await page.locator('#frame-color').evaluate(el => getComputedStyle(el).backgroundColor);
      for (const id of ['#ribbon-left', '#ribbon-primary']) assert.equal(await page.locator(id).evaluate(el => getComputedStyle(el, '::before').backgroundColor), frame, 'The complete upper-left corner must match the light card frame');
    }
    await page.mouse.move(0, 0);
  }
  console.log('Compatibility passed: editable heading click targets, text-width and wrapped capsules, formatted heading highlights, light card corners, six native highlight colors and Callout SVG fills.');
} finally { await browser.close(); }
