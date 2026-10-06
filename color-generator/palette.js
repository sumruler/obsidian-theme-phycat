/* Color math and Style Settings interchange; also usable with Node for verification. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PhycatPalette = api;
})(globalThis, function () {
  'use strict';
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const coreIds = ['primary-color', 'secondary-color', 'bg-color', 'text-color'];
  function number(token, percentScale = 1) {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(token)) throw Error('无效的颜色数值');
    return token.endsWith('%') ? parseFloat(token) / 100 * percentScale : Number(token);
  }
  function parse(value) {
    if (typeof value !== 'string') throw Error('颜色必须是字符串');
    const color = value.trim().toLowerCase();
    const hex = color.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/);
    if (hex) {
      let digits = hex[1];
      if (digits.length <= 4) digits = [...digits].map(char => char + char).join('');
      return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16) / 255)
        .concat(digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1);
    }
    const fn = color.match(/^(rgba?|hsla?)\(([^()]*)\)$/);
    if (!fn) throw Error('请输入 HEX、RGB/RGBA 或 HSL/HSLA 颜色');
    const comma = fn[2].includes(',');
    const parts = comma ? fn[2].split(',').map(part => part.trim()) : fn[2].trim().split(/[\s/]+/);
    if (parts.length !== 3 && parts.length !== 4) throw Error('颜色分量数量不正确');
    const alpha = parts.length === 4 ? number(parts[3]) : 1;
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw Error('透明度应在 0 到 1 之间');
    if (fn[1].startsWith('rgb')) {
      const rgb = parts.slice(0, 3).map(part => part.endsWith('%') ? number(part) : number(part) / 255);
      if (rgb.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 1)) throw Error('RGB 分量超出范围');
      return rgb.concat(alpha);
    }
    const hueMatch = parts[0].match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|rad|turn|grad)?$/);
    if (!hueMatch || !parts[1].endsWith('%') || !parts[2].endsWith('%')) throw Error('HSL 格式不正确');
    let hue = Number(hueMatch[1]);
    hue *= ({ rad: 180 / Math.PI, turn: 360, grad: 0.9, deg: 1 })[hueMatch[2] || 'deg'];
    const sat = number(parts[1]), light = number(parts[2]);
    if (!Number.isFinite(hue) || !Number.isFinite(sat) || !Number.isFinite(light) || sat < 0 || sat > 1 || light < 0 || light > 1) throw Error('HSL 分量超出范围');
    hue = ((hue % 360) + 360) % 360 / 360;
    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const part = hue * 6, x = chroma * (1 - Math.abs(part % 2 - 1)), offset = light - chroma / 2;
    const rgb = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][Math.floor(part) % 6];
    return rgb.map(channel => channel + offset).concat(alpha);
  }
  const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const gamma = value => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  function lab(rgb) {
    const [r, g, b] = rgb.map(linear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function lch(rgb) {
    const [light, a, b] = lab(rgb);
    return [light, Math.hypot(a, b), ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360];
  }
  function rawRgb(light, chroma, hue) {
    const a = chroma * Math.cos(hue * Math.PI / 180), b = chroma * Math.sin(hue * Math.PI / 180);
    const l = (light + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (light - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (light - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(gamma);
  }
  function fromLch(light, chroma, hue, alpha = 1) {
    light = clamp(light); chroma = Math.max(0, chroma);
    let rgb = rawRgb(light, chroma, hue);
    const inGamut = channels => channels.every(value => Number.isFinite(value) && value >= -0.00001 && value <= 1.00001);
    if (!inGamut(rgb)) {
      let low = 0, high = chroma;
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        if (inGamut(rawRgb(light, mid, hue))) low = mid; else high = mid;
      }
      rgb = rawRgb(light, low, hue);
    }
    return rgb.map(value => clamp(value)).concat(clamp(alpha));
  }
  function mix(a, b, amount) {
    const left = lab(a), right = lab(b);
    const merged = left.map((value, i) => value * (1 - amount) + right[i] * amount);
    return fromLch(merged[0], Math.hypot(merged[1], merged[2]), Math.atan2(merged[2], merged[1]) * 180 / Math.PI);
  }
  function composite(foreground, background) {
    return foreground.slice(0, 3).map((channel, i) => channel * foreground[3] + background[i] * (1 - foreground[3])).concat(1);
  }
  const luminance = color => color.slice(0, 3).map(linear).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  function contrast(a, b) {
    const first = luminance(composite(a, b)), second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }
  function readable(color, background, minimum = 4.5) {
    if (contrast(color, background) >= minimum) return color;
    const [light, chroma, hue] = lch(color);
    const white = [1, 1, 1, 1], black = [0, 0, 0, 1];
    const end = contrast(white, background) > contrast(black, background) ? 1 : 0;
    let low = 0, high = 1;
    for (let i = 0; i < 25; i++) {
      const distance = (low + high) / 2;
      const candidate = fromLch(light + (end - light) * distance, chroma, hue);
      if (contrast(candidate, background) >= minimum + 0.03) high = distance; else low = distance;
    }
    return fromLch(light + (end - light) * high, chroma, hue);
  }
  function onColor(backgrounds) {
    const options = [[0.06, 0.06, 0.08, 1], [1, 1, 1, 1]];
    return options.sort((a, b) => Math.min(...backgrounds.map(bg => contrast(b, bg))) - Math.min(...backgrounds.map(bg => contrast(a, bg))))[0];
  }
  function hex(color) {
    return '#' + color.slice(0, 3).map(value => Math.round(clamp(value) * 255).toString(16).padStart(2, '0')).join('');
  }
  function format(color, opacity = false) {
    if (!opacity) return hex(color);
    return 'rgba(' + color.slice(0, 3).map(value => Math.round(clamp(value) * 255)).join(', ') + ', ' +
      Number(clamp(color[3]).toFixed(4)) + ')';
  }
  function hsl(color) {
    const [r, g, b] = color, max = Math.max(r, g, b), min = Math.min(r, g, b), difference = max - min;
    const light = (max + min) / 2;
    let hue = 0;
    if (difference) {
      hue = max === r ? (g - b) / difference + (g < b ? 6 : 0) : max === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
      hue *= 60;
    }
    return [hue, difference ? difference / (1 - Math.abs(2 * light - 1)) * 100 : 0, light * 100];
  }
  function interchange(value, field) {
    const color = value.trim();
    const hex = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;
    const rgb = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?:\d+(?:\.\d*)?|\.\d+)\s*)?\)$/i;
    const hsl = /^hsla?\(\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*,\s*(?:\d+(?:\.\d*)?|\.\d+)%\s*,\s*(?:\d+(?:\.\d*)?|\.\d+)%\s*(?:,\s*(?:\d+(?:\.\d*)?|\.\d+)\s*)?\)$/i;
    // Preserve legacy syntax byte-for-byte; canonicalize newer CSS syntax that
    // the plugin's bundled color parser cannot read (slash syntax, #RGBA, units).
    const fn = color.match(/^(rgba?|hsla?)\((.*)\)$/i);
    const legacyArity = fn && fn[2].split(',').length === (fn[1].toLowerCase().endsWith('a') ? 4 : 3);
    return hex.test(color) || ((rgb.test(color) || hsl.test(color)) && legacyArity) ? value : format(parse(value), field.opacity);
  }

  // Every non-semantic field is assigned explicitly. Newly added theme fields fail
  // catalogue generation until a meaningful recipe is provided here.
  const recipes = {};
  function assign(kind, ids) { for (const id of ids.split(/\s+/).filter(Boolean)) { if (recipes[id]) throw Error('Duplicate recipe: ' + id); recipes[id] = kind; } }
  assign('core', coreIds.join(' '));
  assign('primary', 'h1-underline-color hover-background-color table-cell-hover-text');
  assign('primaryText', 'light-deep');
  assign('light', 'light-light'); assign('lighter', 'light-lighter');
  assign('text', 'mermaid-text-color phycat-interface-color');
  assign('muted', 'text-color-secondary phycat-task-color-2 phycat-strikethrough-color');
  assign('accentText', 'checkmark-color phycat-task-color phycat-highlight-hover-color phycat-copy-button-hover-color phycat-code-block-hover-color phycat-code-block-hover-text-fill phycat-settings-nav-active-color');
  assign('capsuleText', 'phycat-h2-color phycat-h2-color-2');
  assign('text', 'phycat-heading-indicator-color');
  assign('selection', 'select-text-bg-color');
  assign('primaryAlpha', 'border-color glow-color phycat-h1-box-shadow checkbox-bg-unchecked checkbox-border-unchecked phycat-blockquote-background phycat-cards-active-border');
  assign('secondaryAlpha', 'h2-shadow-color h2-shadow-hover phycat-code-block-border-left phycat-code-block-border-right phycat-code-block-border-top phycat-code-block-border-bottom');
  assign('gradientEdge', 'phycat-h2-gradient-start phycat-h2-gradient-end');
  assign('gradientMiddle', 'phycat-h2-gradient-middle');
  assign('primaryAlpha', 'phycat-h2-radial-color phycat-h2-radial-hover phycat-h2-text-shadow');
  assign('surface', 'table-bg code-block-bg phycat-code-block-background phycat-keyboard-background phycat-interface-background phycat-modal-background phycat-cards-modal-background phycat-cards-background');
  assign('surfaceAlpha', 'phycat-h5-decoration-background phycat-h2-background phycat-code-block-background-2 phycat-code-block-background-3');
  assign('inkAlpha', 'background-modifier-hover background-modifier-active-hover table-border-inner table-row-hover-bg phycat-h2-border-top phycat-keyboard-border phycat-keyboard-border-top phycat-keyboard-border-bottom phycat-modal-border phycat-cards-border phycat-cards-border-2 phycat-cards-modal-border phycat-database-row-hover-border-bottom scrollbar-thumb-bg scrollbar-active-thumb-bg');
  assign('shadow', 'phycat-h2-hover-box-shadow phycat-interface-box-shadow phycat-keyboard-box-shadow phycat-keyboard-box-shadow-2 phycat-keyboard-hover-box-shadow phycat-keyboard-hover-box-shadow-2 phycat-modal-box-shadow phycat-modal-box-shadow-2 phycat-modal-box-shadow-3 phycat-cards-box-shadow phycat-cards-box-shadow-2 phycat-cards-modal-box-shadow phycat-cards-modal-box-shadow-2 phycat-cards-active-box-shadow');
  assign('header', 'code-block-header-bg');
  assign('codeText', 'code-normal'); assign('codeMuted', 'code-comment code-punctuation');
  assign('codePrimary', 'code-keyword code-tag code-important');
  assign('codeSecondary', 'code-function code-operator');
  assign('semanticCode', 'code-string code-property code-value');
  assign('semanticText', 'background-modifier-error background-modifier-success phycat-strikethrough-hover-text-decoration');

  function createEngine(data) {
    const fields = data.fields, byId = new Map(fields.map(field => [field.id, field]));
    const key = (field, mode) => field.heading ? 'phycat-headings@@' + field.id + '-' + mode + '-color'
      : 'phycat-colors@@' + field.id + '@@' + mode;
    const keys = new Map();
    for (const mode of ['light', 'dark']) for (const field of fields) keys.set(key(field, mode), { field, mode });
    const types = {};
    for (const field of fields) {
      const callout = field.id.match(/^phycat-callout-([a-z]+)-(.+)$/);
      const calloutTypes = ['note','info','todo','tip','warning','important','caution','bug','success','example','quote','danger','error','failure','question','abstract','common'];
      const calloutProperties = ['background','title-color','hover-background','watermark-color','border','border-left','box-shadow','title-background','title-border','title-background-2','title-border-2'];
      const knownCallout = callout && calloutTypes.includes(callout[1]) && calloutProperties.includes(callout[2]);
      const folder = /^nav-c-(pink|cyan|orange|green|purple|red|blue)$/.test(field.id);
      types[field.id] = field.heading ? 'text' : recipes[field.id] || (knownCallout ? 'callout' : folder ? 'folder' : undefined);
      if (!types[field.id]) throw Error('Missing color recipe: ' + field.id);
      if (knownCallout && callout[1] !== 'common') {
        const family = ({ error: 'danger', caution: 'danger' })[callout[1]] || callout[1];
        if (!byId.has('phycat-callout-' + family + '-title-color')) throw Error('Missing semantic seed: ' + field.id);
      }
      for (const mode of ['light', 'dark']) parse(field.defaults[mode]);
    }
    function initial() {
      const state = { mode: 'light', modes: {} };
      for (const mode of ['light', 'dark']) {
        const preset = data.presets.find(preset => preset.id === (mode === 'light' ? 'sakura' : 'vampire') && preset.mode === mode);
        if (!preset) throw Error('Missing default preset: ' + mode);
        state.modes[mode] = { colors: Object.fromEntries(fields.map(field => [field.id, preset.values[key(field, mode)]])), locked: new Set(), preset: preset.id };
      }
      return state;
    }
    function calculate(mode, colors) {
      const bases = Object.fromEntries(coreIds.map(id => [id, parse(colors[id])]));
      const primary = bases['primary-color'], secondary = bases['secondary-color'], bg = bases['bg-color'], text = bases['text-color'];
      const ink = luminance(bg) > 0.35 ? [0, 0, 0, 1] : [1, 1, 1, 1];
      const defaultBg = parse(byId.get('bg-color').defaults[mode]);
      const defaultBgLight = lch(defaultBg)[0];
      const output = { ...colors };
      const surface = mix(bg, ink, mode === 'light' ? 0.016 : 0.028);
      const muted = readable(mix(text, bg, 0.38), bg);
      const codeBg = composite(parse(colors['code-block-bg'] || format(surface)), bg);
      const gradientEdge = mix(primary, secondary, 0.24), gradientMiddle = primary;
      const capsule = onColor(['phycat-h2-gradient-start', 'phycat-h2-gradient-middle', 'phycat-h2-gradient-end'].map(id => parse(colors[id])));
      for (const field of fields) {
        const id = field.id, reference = parse(field.defaults[mode]), kind = types[id];
        const referenceLch = lch(reference);
        let color;
        switch (kind) {
          case 'core': continue;
          case 'primary': color = primary; break;
          case 'primaryText': color = readable(primary, bg); break;
          case 'light': color = mix(primary, bg, 0.5); break;
          case 'lighter': color = mix(primary, bg, 0.85); break;
          case 'text': color = text; break;
          case 'muted': color = muted; break;
          case 'accentText': {
            const checkedBg = id === 'checkmark-color' && mode === 'dark' ? composite(primary.slice(0, 3).concat(0.2), bg) : primary;
            color = onColor([checkedBg]); break;
          }
          case 'capsuleText': color = capsule; break;
          case 'selection': color = primary.slice(); break;
          case 'primaryAlpha': color = primary.slice(); break;
          case 'secondaryAlpha': color = secondary.slice(); break;
          case 'gradientEdge': color = gradientEdge; break;
          case 'gradientMiddle': color = gradientMiddle; break;
          case 'surface': {
            const delta = referenceLch[0] - defaultBgLight;
            const baseLch = lch(bg);
            color = fromLch(baseLch[0] + clamp(delta, -0.08, 0.08), Math.min(baseLch[1], 0.04), baseLch[2]); break;
          }
          case 'surfaceAlpha': color = surface; break;
          case 'inkAlpha': color = ink.slice(); break;
          case 'shadow': color = [0, 0, 0, 1]; break;
          case 'header': color = primary.slice(); break;
          case 'codeText': color = readable(text, codeBg); break;
          case 'codeMuted': color = readable(mix(text, codeBg, 0.4), codeBg); break;
          case 'codePrimary': color = readable(primary, codeBg); break;
          case 'codeSecondary': color = readable(secondary, codeBg); break;
          case 'semanticCode': color = readable(fromLch(mode === 'light' ? 0.49 : 0.78, referenceLch[1], referenceLch[2]), codeBg); break;
          case 'semanticText': color = readable(fromLch(mode === 'light' ? 0.52 : 0.75, referenceLch[1], referenceLch[2]), bg); break;
          case 'folder': color = readable(fromLch(mode === 'light' ? 0.55 : 0.77, referenceLch[1], referenceLch[2]), bg, 3); break;
          case 'callout': {
            const [, type, property] = id.match(/^phycat-callout-([a-z]+)-(.+)$/);
            if (type === 'common') {
              color = property.includes('border') ? ink.slice() : surface.slice();
            } else {
              const family = ({ error: 'danger', caution: 'danger' })[type] || type;
              const seedField = byId.get('phycat-callout-' + family + '-title-color');
              const seed = lch(parse(seedField.defaults[mode]));
              const semantic = fromLch(mode === 'light' ? 0.52 : 0.76, seed[1], seed[2]);
              if (property.includes('background')) {
                color = reference[3] < 1 ? semantic : mix(bg, semantic, property.includes('hover') ? 0.18 : 0.1);
              } else if (property.includes('title-color')) {
                // Check text against both the normal and hover backgrounds.
                const backgroundFamily = mode === 'light' && ['info', 'todo'].includes(family) ? 'note' : family;
                const actualBackground = colors['phycat-callout-' + backgroundFamily + '-background'];
                const backdrop = actualBackground ? composite(parse(actualBackground), bg) : mix(bg, semantic, 0.1);
                const hoverBackground = colors['phycat-callout-' + backgroundFamily + '-hover-background'];
                color = readable(semantic, backdrop);
                if (hoverBackground) color = readable(color, composite(parse(hoverBackground), bg));
              } else color = semantic;
            }
            break;
          }
          default: throw Error('Unknown color recipe: ' + id);
        }
        color = color.slice();
        color[3] = field.opacity ? reference[3] : 1;
        // Selection should remain useful even when its old preset was opaque.
        if (kind === 'selection') color[3] = mode === 'light' ? 0.2 : 0.28;
        output[id] = format(color, field.opacity);
      }
      return output;
    }
    function regenerate(entry, mode) {
      // Surfaces first; then text is measured against the resulting code surface.
      const first = calculate(mode, entry.colors);
      const merged = { ...entry.colors };
      for (const field of fields) if (!coreIds.includes(field.id) && !entry.locked.has(field.id)) merged[field.id] = first[field.id];
      const second = calculate(mode, merged);
      for (const field of fields) if (!coreIds.includes(field.id) && !entry.locked.has(field.id)) entry.colors[field.id] = second[field.id];
      entry.preset = '';
    }
    function edit(state, mode, id, value) {
      const field = byId.get(id);
      if (!field) throw Error('Unknown field');
      const color = parse(value);
      if (!field.opacity && color[3] !== 1) throw Error('此颜色不支持透明度');
      const entry = state.modes[mode];
      entry.colors[id] = format(color, field.opacity);
      if (coreIds.includes(id)) { entry.locked.delete(id); regenerate(entry, mode); }
      else { entry.locked.add(id); entry.preset = ''; }
    }
    function unlock(state, mode, id) {
      const entry = state.modes[mode];
      if (id) entry.locked.delete(id); else entry.locked.clear();
      regenerate(entry, mode);
    }
    function loadPreset(state, presetId, mode) {
      const preset = data.presets.find(preset => preset.id === presetId && preset.mode === mode);
      if (!preset) throw Error('Preset not found');
      state.modes[mode] = { colors: Object.fromEntries(fields.map(field => [field.id, preset.values[key(field, mode)]])), locked: new Set(), preset: preset.id };
    }
    function counterpart(state, sourceMode) {
      const targetMode = sourceMode === 'light' ? 'dark' : 'light';
      const target = state.modes[targetMode], source = state.modes[sourceMode];
      const lights = targetMode === 'light' ? [0.55, 0.57, 0.97, 0.24] : [0.75, 0.78, 0.2, 0.94];
      coreIds.forEach((id, index) => {
        const [, chroma, hue] = lch(parse(source.colors[id]));
        target.colors[id] = format(fromLch(lights[index], index === 2 ? Math.min(chroma, 0.02) : index === 3 ? Math.min(chroma, 0.015) : chroma, hue));
        target.locked.delete(id);
      });
      regenerate(target, targetMode);
      return targetMode;
    }
    function importJSON(state, input) {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('文件应为 Style Settings JSON 对象');
      const updates = [], ignored = [];
      for (const [name, value] of Object.entries(parsed)) {
        const known = keys.get(name);
        if (!known) { ignored.push(name); continue; }
        try {
          const rgba = parse(value);
          if (!known.field.opacity && rgba[3] !== 1) throw Error('该项目不支持透明度');
          updates.push({ ...known, value: interchange(value, known.field) });
        } catch (error) { throw Error(known.field.label + '：' + error.message); }
      }
      if (!updates.length) throw Error('没有找到此主题支持的配色项目');
      // Only commit after the entire file passes validation.
      for (const update of updates) {
        const entry = state.modes[update.mode];
        entry.colors[update.field.id] = update.value;
        entry.locked.add(update.field.id);
        entry.preset = '';
      }
      return { count: updates.length, ignored: ignored.length, modes: [...new Set(updates.map(update => update.mode))] };
    }
    function exportJSON(state, mode) {
      const result = {};
      for (const selected of mode === 'both' ? ['light', 'dark'] : [mode]) {
        for (const field of fields) result[key(field, selected)] = state.modes[selected].colors[field.id];
      }
      return result;
    }
    function variables(mode, colors) {
      const vars = {};
      for (const field of fields) {
        const source = colors[field.id];
        const rgba = parse(source);
        // Style Settings 1.0.9's chroma parser rounds HEX alpha to 2 places,
        // and its HSL-to-RGB conversion rounds RGB channels before alt-format.
        if (/^hsla?\(/i.test(source.trim())) for (let i = 0; i < 3; i++) rgba[i] = Math.round(rgba[i] * 255) / 255;
        if (/^#[\da-f]{8}$/i.test(source.trim())) rgba[3] = Math.round(rgba[3] * 100) / 100;
        if (!field.opacity && rgba[3] !== 1) throw Error('Unexpected opacity: ' + field.id);
        const rgb = rgba.slice(0, 3).map(value => Math.round(value * 255)).join(', ');
        vars[field.heading ? field.id + '-' + mode + '-color' : field.id] = field.format === 'rgb'
          ? (rgba[3] === 1 ? 'rgb(' + rgb + ')' : 'rgba(' + rgb + ', ' + rgba[3] + ')') : colors[field.id];
        if (field.alt) {
          const [hue, sat, light] = hsl(rgba);
          vars[field.alt + '-h'] = String(hue);
          vars[field.alt + '-s'] = sat + '%';
          vars[field.alt + '-l'] = light + '%';
        }
      }
      return vars;
    }
    return { initial, key, calculate, regenerate, edit, unlock, loadPreset, counterpart, importJSON, exportJSON, variables, types };
  }
  return { parse, format, hex, hsl, lch, fromLch, mix, composite, contrast, readable, coreIds, createEngine };
});
