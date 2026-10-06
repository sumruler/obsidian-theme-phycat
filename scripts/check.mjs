import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { root, read, json, css, ast, groups, settings, presets, rgb, composite, contrast } from './lib.mjs';

const manifest = json('manifest.json');
const require = createRequire(import.meta.url);
const generator = require('../color-generator/palette-data.js');
assert.equal(generator.version, manifest.version, 'Run npm run generator:sync after changing the version');
assert.equal(generator.sourceHash, createHash('sha256').update(css).digest('hex'), 'Run npm run generator:sync after changing theme.css');
assert.equal(generator.fields.length, 194);
assert.equal(generator.presets.length, 12);
assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
assert.equal(manifest.name, 'Phycat');
assert.equal(manifest.version, json('package.json').version);
assert.equal(manifest.version, json('package-lock.json').version);
assert.match(manifest.minAppVersion, /^\d+\.\d+\.\d+$/);
assert.ok(new URL(manifest.authorUrl).protocol === 'https:');
const tag = process.env.RELEASE_TAG || process.argv.find(v => v.startsWith('--tag='))?.slice(6);
if (tag) assert.equal(tag, manifest.version, 'Release tag must exactly match manifest.version (no v prefix)');
for (const file of ['README.md','PALETTE.md','MIGRATION.md','CHANGELOG.md','AUDIT-FIXES.md','DEVELOPMENT.md','LICENSE','THIRD-PARTY-NOTICES.md','screenshot.png',`releases/${manifest.version}.md`]) assert.ok(fs.statSync(path.join(root,file)).size > 0, `Missing release file: ${file}`);
assert.ok(read(`releases/${manifest.version}.md`).startsWith(`# Phycat ${manifest.version}`));
assert.equal(groups.length, 5);
assert.equal(new Set(groups.map(g => g.id)).size, groups.length);
for (const group of groups) {
  assert.ok(group.name.includes('Phycat') && /[\u4e00-\u9fff]/.test(group.name), 'Group names must work without unsupported name.zh localization');
  assert.equal(new Set(group.settings.map(s => s.id)).size, group.settings.length, `Duplicate IDs: ${group.id}`);
}
assert.equal(presets.length, 12);
assert.equal(presets.filter(p => p.mode === 'light').length, 8);
const colorSettings = groups.find(g => g.id === 'phycat-colors').settings.filter(s => s.type === 'variable-themed-color');
for (const p of presets) {
  const key = id => `phycat-colors@@${id}@@${p.mode}`;
  const expected = [...colorSettings.map(s => key(s.id)), ...Array.from({length:6},(_,i)=>`phycat-headings@@h${i+1}-${p.mode}-color`)];
  assert.deepEqual(Object.keys(p.data).sort(), expected.sort(), `Incomplete or cross-mode preset: ${p.file}`);
  for (const [k,v] of Object.entries(p.data)) {
    assert.ok(settings.has(k.split('@@').slice(0,2).join('@@')), `Unknown setting: ${k}`);
    assert.equal(typeof v, 'string');
    assert.match(v, /^(?:#[\da-f]{3,8}|rgba?\([\d.,\s]+\))$/i, `Invalid color: ${k}`);
  }
  const bg = composite(p.data[key('code-block-bg')], p.data[key('bg-color')]);
  assert.ok(contrast(rgb(p.data[key('code-comment')]),bg)>=4.5, `Code comment contrast: ${p.file}`);
  for (const id of ['phycat-settings-nav-active-color','phycat-code-block-hover-color','phycat-code-block-hover-text-fill']) assert.ok(contrast(rgb(p.data[key(id)]),rgb(p.data[key('primary-color')]))>=4.5, `${id} contrast: ${p.file}`);
}
const declarations = new Map();
ast.walkDecls(d => { if (d.prop.startsWith('--')) declarations.set(d.prop, d.value); });
assert.equal(declarations.get('--bg-mix-percent'), '90');
for (const id of ['h2-spacing-scale-start','h2-spacing-scale-end']) assert.equal(String(settings.get('phycat-headings@@'+id).default),declarations.get('--'+id));
assert.ok(!css.includes('#m54fff87155a51594'));
ast.walkRules(rule => {
  if (!rule.nodes.some(n => n.type==='decl')) return;
  for (const selector of rule.selectors || []) {
    if (/^\.markdown-preview-view input\[type="checkbox"\]/.test(selector)) throw new Error('Unscoped reading-mode checkbox rule');
    if (/^\.(?:edgeLabel|cluster|cluster-label|statediagram-cluster)\b/.test(selector)) throw new Error('Unscoped Mermaid rule');
  }
});
for (const file of ['README.md','PALETTE.md','MIGRATION.md','CHANGELOG.md','THIRD-PARTY-NOTICES.md']) for (const match of read(file).matchAll(/\]\(([^\s)]+)\)/g)) {
  const target = match[1].split('#')[0];
  if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
  assert.ok(fs.existsSync(path.join(root,path.dirname(file),target)), `Broken documentation link: ${file} → ${target}`);
}
console.log(`Release ${manifest.version}: CSS/YAML valid; ${groups.length} groups, ${presets.length} complete presets; static contrast and release files passed.`);
