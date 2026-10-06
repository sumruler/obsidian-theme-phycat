/* Run from any directory: node color-generator/sync-data.cjs */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'theme.css'), 'utf8');

// This reads only the scalar, fixed-indentation fields used by this theme.
// It deliberately does not execute YAML or depend on an installed Obsidian plugin.
function scalar(text, name, indent = 8) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('^ {' + indent + '}' + escaped + ':\\s*(.*?)\\s*$', 'm'));
  if (!match) return undefined;
  const value = match[1];
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value.startsWith('"')) return JSON.parse(value);
  return value;
}
const blocks = [...css.matchAll(/\/\*\s*@settings\s*\r?\n([\s\S]*?)\*\//g)].map(match => ({
  id: scalar(match[1], 'id', 0),
  items: match[1].split(/^ {4}-\s*\r?\n/m).slice(1)
}));
const fields = [], groups = [], previewDefaults = {};
let group = '', subgroup = '';
for (const block of blocks) {
  for (const item of block.items) {
    const id = scalar(item, 'id'), type = scalar(item, 'type');
    if (block.id === 'phycat-colors') {
      if (type === 'heading') {
        if (scalar(item, 'level') === '2') {
          group = scalar(item, 'title.zh') || scalar(item, 'title');
          subgroup = '';
          groups.push(group);
        } else subgroup = scalar(item, 'title.zh') || scalar(item, 'title');
      } else if (type === 'variable-themed-color') {
        const field = { id, label: scalar(item, 'title.zh') || scalar(item, 'title'), group,
          subgroup, format: scalar(item, 'format'), opacity: scalar(item, 'opacity') === 'true',
          defaults: { light: scalar(item, 'default-light'), dark: scalar(item, 'default-dark') } };
        if (item.includes('alt-format:')) {
          if (!/id: phycat-accent\s+format: hsl-split/.test(item)) throw Error('Unsupported alt-format: ' + id);
          field.alt = 'phycat-accent';
        }
        if (!id || !field.defaults.light || !field.defaults.dark || !['hex', 'rgb'].includes(field.format))
          throw Error('Incomplete color metadata: ' + id);
        fields.push(field);
      }
    }
    if (['phycat-spacing', 'phycat-layout', 'phycat-headings'].includes(block.id) &&
        ['variable-number', 'variable-number-slider'].includes(type)) {
      previewDefaults[id] = scalar(item, 'default') + (scalar(item, 'format') || '');
    }
  }
}
const headingBlock = blocks.find(block => block.id === 'phycat-headings');
if (!headingBlock) throw Error('Missing heading settings');
for (let level = 1; level <= 6; level++) {
  const defaults = {};
  for (const mode of ['light', 'dark']) {
    const item = headingBlock.items.find(item => scalar(item, 'id') === 'h' + level + '-' + mode + '-color');
    if (!item || scalar(item, 'type') !== 'variable-color') throw Error('Missing heading color: ' + level);
    defaults[mode] = scalar(item, 'default');
  }
  fields.push({ id: 'h' + level, label: 'H' + level + ' 标题文字', group: '标题文字', subgroup: '',
    format: 'hex', opacity: false, heading: true, defaults });
}
groups.push('标题文字');
if (new Set(fields.map(field => field.id)).size !== fields.length) throw Error('Duplicate color ids');
const key = (field, mode) => field.heading ? 'phycat-headings@@' + field.id + '-' + mode + '-color'
  : 'phycat-colors@@' + field.id + '@@' + mode;
const names = { sakura: 'Sakura · 樱花', mint: 'Mint · 薄荷', sky: 'Sky · 天空', forest: 'Forest · 森林',
  mauve: 'Mauve · 锦葵紫', golden: 'Golden Hour · 午后黄昏', cherry: 'Cherry · 樱桃',
  prussian: 'Prussian · 普鲁士蓝', vampire: 'Vampire · 吸血鬼', abyss: 'Abyss · 深渊',
  radiation: 'Radiation · 生化辐射', everforest: 'Everforest · 暖绿森林' };
const presets = [];
for (const mode of ['light', 'dark']) {
  const dir = path.join(root, 'presets', mode);
  for (const filename of fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    const values = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'));
    const expected = fields.map(field => key(field, mode));
    if (Object.keys(values).length !== expected.length || expected.some(name => typeof values[name] !== 'string'))
      throw Error('Preset does not match theme settings: ' + filename);
    const id = filename.slice(0, -5);
    presets.push({ id, mode, label: names[id] || id, values });
  }
}
const data = { version: JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).version,
  sourceHash: crypto.createHash('sha256').update(css).digest('hex'), groups, fields, previewDefaults, presets,
  features: { autoAccentText: blocks.some(block => block.items.some(item => scalar(item, 'id') === 'manual-accent-contrast')) } };
// Validate every field's recipe before replacing the generated catalogue.
const engine = require('./palette.js').createEngine(data);
engine.initial();
for (const preset of presets) {
  const state = engine.initial();
  engine.importJSON(state, preset.values);
}
const output = '/* Generated by sync-data.cjs. Do not edit by hand. */\n' +
  '(function (root) { const data = ' + JSON.stringify(data, null, 2) +
  '; if (typeof module === "object" && module.exports) module.exports = data; else root.PhycatData = data; })(globalThis);\n';
fs.writeFileSync(path.join(__dirname, 'palette-data.js'), output);
console.log('Synced ' + fields.length + ' colors per mode and ' + presets.length + ' presets.');
