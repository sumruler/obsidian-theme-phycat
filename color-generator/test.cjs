'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const math = require('./palette.js');
const data = require('./palette-data.js');
const engine = math.createEngine(data);
const root = path.resolve(__dirname, '..');
let passed = 0;
function test(name, run) { run(); passed++; console.log('PASS ' + name); }
const snapshot = state => JSON.stringify(engine.exportJSON(state, 'both'));
test('catalogue matches current theme and presets', () => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'theme.css'), 'utf8')).digest('hex');
  assert.equal(data.sourceHash, hash, 'Run sync-data.cjs after changing theme.css');
  assert.equal(data.fields.length, 194); assert.equal(data.presets.length, 12);
  for (const preset of data.presets) {
    assert.deepEqual(preset.values, JSON.parse(fs.readFileSync(path.join(root, 'presets', preset.mode, preset.id + '.json'), 'utf8')));
    const state = engine.initial(); engine.loadPreset(state, preset.id, preset.mode);
    assert.deepEqual(engine.exportJSON(state, preset.mode), preset.values);
    assert.equal(Object.keys(engine.exportJSON(state, 'both')).length, 388);
  }
});
test('HEX, RGB and HSL parsing, including alpha and modern notation', () => {
  assert.equal(math.hex(math.parse('#abc')), '#aabbcc');
  assert.equal(math.hex(math.parse('hsl(120, 100%, 50%)')), '#00ff00');
  assert.equal(math.hex(math.parse('hsl(0.5turn 100% 50% / 50%)')), '#00ffff');
  assert.equal(math.hex(math.parse('rgb(100% 0% 0% / 30%)')), '#ff0000');
  assert.equal(math.parse('#1234')[3], 68 / 255);
  for (const value of ['', '#zzzzzz', 'rgb(999, 0, 0)', 'rgba(0,0,0,2)', 'hsl(0,101%,50%)', 'hsl(' + '9'.repeat(500) + ',10%,50%)', 'var(--x)', 'url(x)', 'rgb(NaN,0,0)', {}, null]) assert.throws(() => math.parse(value));
});
test('OKLCH conversion and chroma reduction stay in gamut', () => {
  for (const value of ['#ff7096', '#bd93f9', '#282a36', '#fff7fa', '#000', '#fff', '#0f0', '#00f']) {
    const rgb = math.parse(value), converted = math.fromLch(...math.lch(rgb));
    rgb.slice(0, 3).forEach((channel, i) => assert.ok(Math.abs(channel - converted[i]) < 0.00005));
  }
  for (let h = 0; h < 360; h += 15) for (const light of [0.1, 0.5, 0.95]) {
    assert.ok(math.fromLch(light, 0.8, h).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  }
});
test('independent modes and locked overrides survive base changes', () => {
  const state = engine.initial(), beforeDark = JSON.stringify(engine.exportJSON(state, 'dark'));
  engine.edit(state, 'light', 'border-color', '#12345678');
  const override = state.modes.light.colors['border-color'];
  const beforeCode = state.modes.light.colors['code-keyword'];
  engine.edit(state, 'light', 'primary-color', '#285ca8');
  assert.equal(state.modes.light.colors['border-color'], override);
  assert.notEqual(state.modes.light.colors['code-keyword'], beforeCode);
  assert.equal(JSON.stringify(engine.exportJSON(state, 'dark')), beforeDark);
  engine.unlock(state, 'light', 'border-color');
  assert.equal(state.modes.light.locked.has('border-color'), false);
  assert.notEqual(state.modes.light.colors['border-color'], override);
});
test('derived text uses the actual generated and manually locked code background', () => {
  for (const mode of ['light', 'dark']) {
    for (const background of ['#fafafa', '#161923', '#626262']) {
      const state = engine.initial();
      engine.edit(state, mode, 'code-block-bg', background);
      engine.edit(state, mode, 'primary-color', '#43c8db');
      const colors = state.modes[mode].colors;
      const codeBg = math.composite(math.parse(colors['code-block-bg']), math.parse(colors['bg-color']));
      for (const id of ['code-normal','code-comment','code-keyword','code-function','code-string','code-property','code-value','code-punctuation']) {
        assert.ok(math.contrast(math.parse(colors[id]), codeBg) >= 4.48, mode + ' ' + background + ' ' + id);
      }
    }
  }
});
test('generation covers all fields and exported formats are parseable', () => {
  for (const preset of data.presets) {
    const state = engine.initial(); engine.loadPreset(state, preset.id, preset.mode); engine.unlock(state, preset.mode);
    for (const field of data.fields) {
      const rgba = math.parse(state.modes[preset.mode].colors[field.id]);
      assert.ok(rgba.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      if (!field.opacity) assert.equal(rgba[3], 1);
    }
    assert.equal(Object.keys(engine.types).length, 194);
  }
  assert.throws(() => math.createEngine({ ...data, fields: [...data.fields, { id: 'unknown-component', defaults: { light: '#fff', dark: '#000' } }] }), /Missing color recipe/);
});
test('counterpart generation preserves target advanced locks and source colors', () => {
  const state = engine.initial(); engine.edit(state, 'dark', 'h2', '#abceff');
  const source = JSON.stringify(engine.exportJSON(state, 'light'));
  assert.equal(engine.counterpart(state, 'light'), 'dark');
  assert.equal(state.modes.dark.colors.h2, '#abceff');
  assert.equal(JSON.stringify(engine.exportJSON(state, 'light')), source);
  assert.ok(math.contrast(math.parse(state.modes.dark.colors['text-color']), math.parse(state.modes.dark.colors['bg-color'])) > 4.5);
});
test('single, dual and partial imports preserve unaffected colors', () => {
  const state = engine.initial(), beforeDark = JSON.stringify(engine.exportJSON(state, 'dark'));
  const result = engine.importJSON(state, { 'phycat-headings@@h3-light-color': '#246', 'other-plugin@@size': 20 });
  assert.deepEqual(result, { count: 1, ignored: 1, modes: ['light'] });
  assert.equal(state.modes.light.colors.h3, '#246'); assert.ok(state.modes.light.locked.has('h3'));
  assert.equal(JSON.stringify(engine.exportJSON(state, 'dark')), beforeDark);
  const dual = engine.exportJSON(state, 'both');
  const loaded = engine.initial(); assert.equal(engine.importJSON(loaded, dual).count, 388); assert.deepEqual(engine.exportJSON(loaded, 'both'), dual);
  assert.equal(engine.importJSON(loaded, JSON.stringify(engine.exportJSON(state, 'dark'))).count, 194);
});
test('invalid imports and edits commit nothing', () => {
  const state = engine.initial(), before = snapshot(state);
  for (const file of [null, [], 'bad json', {}, { 'phycat-colors@@primary-color@@light': '#abc', 'phycat-headings@@h2-dark-color': 'bad' }, { 'phycat-colors@@text-color@@light': '#11223344' }]) {
    assert.throws(() => engine.importJSON(state, file)); assert.equal(snapshot(state), before);
  }
  assert.throws(() => engine.edit(state, 'light', 'primary-color', 'not a color')); assert.equal(snapshot(state), before);
});
test('modern import syntax is normalized for the installed plugin', () => {
  const state = engine.initial();
  engine.importJSON(state, { 'phycat-colors@@border-color@@light': '#1234', 'phycat-colors@@primary-color@@light': 'hsl(0.5turn 100% 50%)' });
  assert.equal(state.modes.light.colors['primary-color'], '#00ffff');
  assert.match(state.modes.light.colors['border-color'], /^rgba\(/);
  assert.equal(engine.variables('light', engine.initial().modes.light.colors)['select-text-bg-color'], 'rgba(220, 227, 233, 0.71)');
});
test('preset reload clears locks; restore-auto keeps all four base controls', () => {
  const state = engine.initial(); engine.edit(state, 'light', 'h1', '#e41');
  engine.loadPreset(state, 'mint', 'light'); assert.equal(state.modes.light.locked.size, 0);
  const bases = math.coreIds.map(id => state.modes.light.colors[id]);
  engine.edit(state, 'light', 'h1', '#e41'); engine.unlock(state, 'light');
  assert.deepEqual(math.coreIds.map(id => state.modes.light.colors[id]), bases);
  assert.equal(state.modes.light.locked.size, 0);
});
test('preview variables follow the primary HSL alt-format and heading suffixes', () => {
  const state = engine.initial();
  for (const mode of ['light', 'dark']) {
    const vars = engine.variables(mode, state.modes[mode].colors);
    assert.equal(Object.keys(vars).length, 197);
    assert.equal(vars['h1-' + mode + '-color'], state.modes[mode].colors.h1);
    const actual = math.parse('hsl(' + vars['phycat-accent-h'] + ', ' + vars['phycat-accent-s'] + ', ' + vars['phycat-accent-l'] + ')');
    assert.equal(math.hex(actual), math.hex(math.parse(state.modes[mode].colors['primary-color'])));
  }
});
console.log('\n' + passed + ' checks passed.');
