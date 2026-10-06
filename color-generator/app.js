(function () {
  'use strict';
  const data = window.PhycatData, math = window.PhycatPalette;
  const $ = selector => document.querySelector(selector);
  if (!data || !math) { $('#status').textContent = '资源加载失败，请保留完整的 color-generator 文件夹。'; return; }
  const engine = math.createEngine(data), state = engine.initial(), controls = new Map();
  const options = { layout: 'layout-default', h1: 'h1-align-center', h2: { light: 'twin', dark: 'twin' }, accentText: 'auto' };
  const frame = $('#preview');
  let frameReady = false, queued = false;
  function status(message, error = false) { $('#status').textContent = message; $('#status').classList.toggle('error', error); }
  const current = () => state.modes[state.mode];
  function sendPreview() {
    if (!frameReady) return;
    frame.contentWindow.postMessage({ type: 'phycat:update', mode: state.mode, colors: current().colors,
      options: { layout: options.layout, h1: options.h1, h2: options.h2[state.mode], accentText: options.accentText } }, '*');
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
  }
  function fieldControl(field, core) {
    const wrapper = document.createElement('div'); wrapper.className = 'color-control'; wrapper.dataset.field = field.id;
    const top = document.createElement('div'); top.className = 'color-label';
    const label = document.createElement('label'); label.textContent = core && field.id === 'primary-color' ? '主色' : field.label; label.htmlFor = 'color-text-' + field.id;
    top.append(label);
    const badge = document.createElement('span'); badge.className = 'color-state'; if (!core) top.append(badge);
    wrapper.append(top);
    const values = document.createElement('div'); values.className = core ? 'color-value' : 'color-value advanced-value';
    const picker = document.createElement('input'); picker.type = 'color'; picker.setAttribute('aria-label', field.label + '调色盘');
    const input = document.createElement('input'); input.type = 'text'; input.className = 'color-text'; input.id = label.htmlFor;
    input.spellcheck = false; input.setAttribute('aria-label', field.label + '颜色值');
    values.append(picker, input);
    const auto = document.createElement('button'); auto.type = 'button'; auto.className = 'auto-button'; auto.textContent = '自动';
    auto.setAttribute('aria-label', field.label + '恢复自动');
    if (!core) values.append(auto);
    wrapper.append(values);
    let alpha, output;
    if (field.opacity) {
      const line = document.createElement('label'); line.className = 'alpha-control'; line.append(document.createTextNode('不透明度'));
      alpha = document.createElement('input'); alpha.type = 'range'; alpha.min = 0; alpha.max = 100; alpha.step = 1;
      alpha.setAttribute('aria-label', field.label + '不透明度'); output = document.createElement('output'); line.append(alpha, output); wrapper.append(line);
    }
    const contrastLabel = document.createElement('p'); contrastLabel.className = 'field-contrast'; contrastLabel.hidden = true; wrapper.append(contrastLabel);
    function apply(value) {
      try {
        engine.edit(state, state.mode, field.id, value);
        input.removeAttribute('aria-invalid'); input.setCustomValidity('');
        status(core ? '已重新计算未锁定颜色。' : field.label + '已锁定。'); schedule();
      } catch (error) { input.setAttribute('aria-invalid', 'true'); input.setCustomValidity(error.message); status(field.label + '：' + error.message, true); }
    }
    input.addEventListener('change', () => apply(input.value));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { apply(input.value); input.blur(); } });
    picker.addEventListener('input', () => {
      const rgba = math.parse(picker.value); rgba[3] = math.parse(current().colors[field.id])[3]; apply(math.format(rgba, field.opacity));
    });
    if (alpha) alpha.addEventListener('input', () => { const rgba = math.parse(current().colors[field.id]); rgba[3] = Number(alpha.value) / 100; apply(math.format(rgba, true)); });
    auto.addEventListener('click', () => { engine.unlock(state, state.mode, field.id); status(field.label + '已恢复自动计算。'); refresh(); });
    controls.set(field.id, { wrapper, picker, input, badge, auto, alpha, output, contrastLabel, field });
    return wrapper;
  }
  for (const id of math.coreIds) $('#core-controls').append(fieldControl(data.fields.find(field => field.id === id), true));
  for (const group of data.groups) {
    const fields = data.fields.filter(field => field.group === group && !math.coreIds.includes(field.id));
    if (!fields.length) continue;
    const details = document.createElement('details'); details.className = 'color-group';
    const summary = document.createElement('summary'); summary.append(document.createTextNode(group));
    const count = document.createElement('span'); count.className = 'group-count'; count.textContent = fields.length; summary.append(count);
    const content = document.createElement('div'); content.className = 'group-fields';
    let lastSubgroup = '';
    for (const field of fields) {
      if (field.subgroup && field.subgroup !== lastSubgroup) {
        const heading = document.createElement('h3'); heading.className = 'subgroup-heading'; heading.textContent = field.subgroup; content.append(heading); lastSubgroup = field.subgroup;
      }
      content.append(fieldControl(field, false));
    }
    details.append(summary, content); $('#advanced-controls').append(details);
  }
  function backdropFor(id) {
    const colors = current().colors, bg = math.parse(colors['bg-color']);
    if (id.startsWith('code-') && !id.includes('bg')) return math.composite(math.parse(colors['code-block-bg']), bg);
    if (['phycat-code-block-hover-color', 'phycat-code-block-hover-text-fill', 'phycat-settings-nav-active-color', 'phycat-highlight-hover-color', 'phycat-copy-button-hover-color'].includes(id)) return math.parse(colors['primary-color']);
    const match = id.match(/^phycat-callout-(.+)-title-color$/);
    if (match) {
      let type = match[1];
      if (state.mode === 'light' && ['info', 'todo'].includes(type)) type = 'note';
      return math.composite(math.parse(colors['phycat-callout-' + type + '-background'] || colors['bg-color']), bg);
    }
    return bg;
  }
  function refresh() {
    document.body.dataset.mode = state.mode;
    document.querySelectorAll('[data-mode]').forEach(button => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)); });
    const presets = data.presets.filter(preset => preset.mode === state.mode);
    const select = $('#preset');
    select.replaceChildren(new Option('自定义配色', ''));
    for (const preset of presets) select.add(new Option(preset.label, preset.id));
    select.value = current().preset;
    const colors = current().colors;
    for (const [id, control] of controls) {
      const rgba = math.parse(colors[id]), locked = current().locked.has(id);
      control.picker.value = math.hex(rgba);
      if (document.activeElement !== control.input) {
        control.input.value = math.coreIds.includes(id) ? math.hex(rgba) : colors[id]; control.input.removeAttribute('aria-invalid'); control.input.setCustomValidity('');
      }
      control.badge.textContent = locked ? '已锁定' : '自动'; control.badge.classList.toggle('locked', locked);
      control.auto.title = locked ? '解除锁定并重新计算' : '按当前基础色重新计算';
      if (control.alpha) { control.alpha.value = Math.round(rgba[3] * 100); control.output.value = Math.round(rgba[3] * 100) + '%'; }
      const isText = /^(?:h[1-6]|text-color|text-color-secondary|code-normal|code-comment|code-keyword|code-function|code-string|code-property|code-value|code-punctuation|code-tag|code-operator|code-important|phycat-code-block-hover-color|phycat-code-block-hover-text-fill|phycat-settings-nav-active-color)$/.test(id) || /-title-color$/.test(id);
      control.contrastLabel.hidden = !isText || !locked;
      if (isText && locked) control.contrastLabel.textContent = '与背景对比 ' + math.contrast(rgba, backdropFor(id)).toFixed(2) + ':1' + (math.contrast(rgba, backdropFor(id)) < 4.5 ? ' · 建议调整颜色' : '');
    }
    const checks = [ ['正文', 'text-color', 'bg-color'], ['次要文字', 'text-color-secondary', 'bg-color'], ['代码注释', 'code-comment', 'code-block-bg'], ['主色上文字', 'phycat-settings-nav-active-color', 'primary-color'] ];
    $('#contrast-checks').replaceChildren(...checks.map(([label, foreground, background]) => {
      const element = document.createElement('div'); element.className = 'contrast-item';
      const backdrop = math.composite(math.parse(colors[background]), math.parse(colors['bg-color']));
      let color = math.parse(colors[foreground]);
      if (foreground === 'phycat-settings-nav-active-color' && data.features?.autoAccentText && options.accentText === 'auto') {
        const black = math.parse('#000'), white = math.parse('#fff');
        color = math.contrast(black, backdrop) >= math.contrast(white, backdrop) ? black : white;
      }
      const ratio = math.contrast(color, backdrop);
      element.classList.toggle('low', ratio < 4.5); element.title = ratio < 4.5 ? '当前组合低于 4.5:1，可调整或使用自动配色' : '当前组合达到 4.5:1';
      const title = document.createElement('span'); title.textContent = label; const result = document.createElement('b'); result.textContent = ratio.toFixed(2) + ':1'; element.append(title, result); return element;
    }));
    const lockedCount = [...current().locked].filter(id => !math.coreIds.includes(id)).length;
    $('#locked-count').textContent = lockedCount ? '· ' + lockedCount + ' 项锁定' : '';
    $('#counterpart').textContent = '生成对应的' + (state.mode === 'light' ? '暗色' : '亮色') + '配色';
    $('#export-current').textContent = '下载' + (state.mode === 'light' ? '亮色' : '暗色') + ' JSON';
    $('#preview-name').textContent = presets.find(preset => preset.id === current().preset)?.label || '自定义 · ' + (state.mode === 'light' ? '亮色' : '暗色');
    $('#preview-h2').value = options.h2[state.mode];
    sendPreview();
  }
  document.querySelectorAll('button[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; refresh(); status('已切换到' + (state.mode === 'light' ? '亮色' : '暗色') + '配色。'); }));
  $('#preset').addEventListener('change', event => {
    if (!event.target.value) { current().preset = ''; refresh(); status('已切换为自定义配色；修改基础色开始生成。'); return; }
    engine.loadPreset(state, event.target.value, state.mode); refresh(); status('已载入预设；修改基础色后重新推导未锁定颜色。');
  });
  $('#counterpart').addEventListener('click', () => { const target = engine.counterpart(state, state.mode); state.mode = target; refresh(); status('已生成' + (target === 'light' ? '亮色' : '暗色') + '配色，并保留其锁定的高级颜色。'); });
  $('#reset-auto').addEventListener('click', () => { engine.unlock(state, state.mode); refresh(); status('已按当前基础色重新生成全部高级颜色。'); });
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const result = engine.importJSON(state, await file.text());
      if (result.modes.length === 1) state.mode = result.modes[0];
      refresh(); status('已导入 ' + result.count + ' 项并锁定' + (result.ignored ? '，忽略 ' + result.ignored + ' 项无关设置' : '') + '。');
    } catch (error) { status('导入失败：' + error.message, true); }
    finally { event.target.value = ''; }
  });
  function textFor(mode) { return JSON.stringify(engine.exportJSON(state, mode), null, 2) + '\n'; }
  function download(mode) {
    const url = URL.createObjectURL(new Blob([textFor(mode)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'phycat-custom-' + (mode === 'both' ? 'light-dark' : mode) + '.json';
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('已下载 ' + (mode === 'both' ? data.fields.length * 2 : data.fields.length) + ' 项颜色。');
  }
  $('#export-current').addEventListener('click', () => download(state.mode));
  $('#export-both').addEventListener('click', () => download('both'));
  $('#copy-json').addEventListener('click', async () => {
    const text = textFor(state.mode);
    try { if (!navigator.clipboard) throw Error('Clipboard unavailable'); await navigator.clipboard.writeText(text); status('当前模式的 JSON 已复制。'); }
    catch { $('#json-text').value = text; $('#json-dialog').showModal(); $('#json-text').focus(); $('#json-text').select(); }
  });
  $('#close-json').addEventListener('click', () => $('#json-dialog').close());
  $('#json-dialog').addEventListener('click', event => { if (event.target === $('#json-dialog')) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close(); } });
  for (const [id, option] of [['preview-layout', 'layout'], ['preview-h1', 'h1'], ['preview-h2', 'h2']]) {
    $('#' + id).addEventListener('change', event => { if (option === 'h2') options.h2[state.mode] = event.target.value; else options[option] = event.target.value; sendPreview(); });
  }
  $('#accent-text-option').hidden = !data.features?.autoAccentText;
  $('#preview-accent-text').addEventListener('change', event => { options.accentText = event.target.value; refresh(); });
  $('#show-interface').addEventListener('click', () => { if (frameReady) frame.contentWindow.postMessage({ type: 'phycat:interface' }, '*'); });
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'phycat:ready') { frameReady = true; $('#preview-error').hidden = true; sendPreview(); }
    if (event.data.type === 'phycat:error') { $('#preview-error').hidden = false; }
  });
  frame.addEventListener('load', () => frame.contentWindow.postMessage({ type: 'phycat:hello' }, '*'));
  setTimeout(() => { if (!frameReady) $('#preview-error').hidden = false; }, 6000);
  $('#theme-version').textContent = 'v' + data.version;
  $('#color-count').textContent = '当前模式 ' + data.fields.length + ' 项颜色';
  refresh(); status('Sakura / Vampire 已就绪。修改基础色开始生成。');
  // Optional browser-native tools use exactly the same palette and actions as the UI.
  const context = document.modelContext;
  if (context?.registerTool) {
    const lifecycle = new AbortController();
    const tools = [
      { name: 'phycat_read_palette', title: '读取 Phycat 配色', description: '读取当前、亮色、暗色或双模式配色，返回可导入 Style Settings 的 JSON。',
        inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['current', 'light', 'dark', 'both'] } }, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'mode') || (input.mode !== undefined && !['current','light','dark','both'].includes(input.mode))) throw Error('无效的模式');
          const mode = !input.mode || input.mode === 'current' ? state.mode : input.mode;
          return { mode, settings: engine.exportJSON(state, mode) };
        } },
      { name: 'phycat_set_base_colors', title: '调整 Phycat 基础色', description: '设置指定模式的基础色，重新生成未锁定颜色并更新可见预览。保留锁定的高级颜色。',
        inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['light', 'dark'] }, colors: { type: 'object', properties: { primary: { type: 'string' }, secondary: { type: 'string' }, background: { type: 'string' }, text: { type: 'string' } }, minProperties: 1, additionalProperties: false } }, required: ['mode', 'colors'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const mapping = { primary: 'primary-color', secondary: 'secondary-color', background: 'bg-color', text: 'text-color' };
          if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['mode','colors'].includes(key)) || !['light','dark'].includes(input.mode) || !input.colors || typeof input.colors !== 'object' || Array.isArray(input.colors)) throw Error('无效的基础色参数');
          const changes = Object.entries(input.colors);
          if (!changes.length) throw Error('至少需要一个基础色');
          for (const [name, value] of changes) { if (!Object.hasOwn(mapping, name) || math.parse(value)[3] !== 1) throw Error('基础色应为不透明的有效颜色'); }
          for (const [name, value] of changes) engine.edit(state, input.mode, mapping[name], value);
          state.mode = input.mode; refresh(); status('已调整基础色并重新生成未锁定颜色。');
          return { mode: state.mode, colors: changes.length, settingsCount: data.fields.length };
        } }
    ];
    for (const tool of tools) {
      try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(error => console.warn('Phycat tools:', error.message)); }
      catch (error) { console.warn('Phycat tools:', error.message); }
    }
    window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); }, { once: true });
  }
})();
