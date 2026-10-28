(function () {
  'use strict';
  const math = window.PhycatPalette, data = window.PhycatData;
  const engine = math.createEngine(data);
  const modal = document.querySelector('#interface-modal');
  let previousFocus;
  const arrow = '<svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const folders = [ ['灵感收集', 'links'], ['学习笔记', 'code'], ['项目计划', 'tasks'], ['生活记录', 'table'], ['阅读摘录', 'callouts'], ['随手记', 'details'], ['归档', 'links'] ];
  const tree = document.createElement('div');
  for (const [name, target] of folders) {
    const folder = document.createElement('div'); folder.className = 'nav-folder';
    const title = document.createElement('div'); title.className = 'nav-folder-title'; title.tabIndex = 0; title.setAttribute('role', 'button'); title.setAttribute('aria-expanded', 'true');
    const content = document.createElement('div'); content.className = 'nav-folder-title-content'; content.textContent = name;
    const icon = document.createElement('div'); icon.className = 'collapse-icon'; icon.innerHTML = arrow; title.append(icon, content);
    const children = document.createElement('div'); children.className = 'nav-folder-children';
    const file = document.createElement('div'); file.className = 'nav-file';
    const fileTitle = document.createElement('div'); fileTitle.className = 'nav-file-title'; fileTitle.tabIndex = 0; fileTitle.setAttribute('role', 'button'); fileTitle.dataset.path = name + '/配色笔记.md';
    const fileContent = document.createElement('div'); fileContent.className = 'nav-file-title-content'; fileContent.textContent = '配色笔记'; fileTitle.append(fileContent); file.append(fileTitle); children.append(file);
    folder.append(title, children); tree.append(folder);
    function toggle() { folder.classList.toggle('is-collapsed'); title.setAttribute('aria-expanded', String(!folder.classList.contains('is-collapsed'))); }
    function open() { document.querySelectorAll('.nav-file-title').forEach(element => element.classList.remove('is-active')); fileTitle.classList.add('is-active'); document.getElementById(target).scrollIntoView({ block: 'start' }); }
    title.addEventListener('click', toggle); fileTitle.addEventListener('click', open);
    for (const [element, action] of [[title, toggle], [fileTitle, open]]) element.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); action(); } });
  }
  tree.querySelector('.nav-file-title').classList.add('is-active'); document.querySelector('#folder-tree').append(tree);
  // Use the same Lucide shapes and Callout type mapping as Obsidian.
  const calloutIcons = {
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'check-circle-2': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    bug: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    'clipboard-list': '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>'
  };
  const iconForType = { note: 'pencil', info: 'info', todo: 'check-circle-2', tip: 'flame', warning: 'alert-triangle', important: 'flame', caution: 'alert-triangle', bug: 'bug', success: 'check', example: 'list', quote: 'quote', danger: 'zap', error: 'zap', failure: 'x', question: 'help-circle', abstract: 'clipboard-list' };
  const types = [['note','笔记','记录值得留下的想法。'],['info','信息','补充一点背景，帮助理解上下文。'],['todo','待办','下一步，从一个小任务开始。'],['tip','提示','试着悬停这里，看看颜色和水印的变化。'],['warning','警告','继续之前，确认重要的信息。'],['important','重要','把需要注意的内容单独标记。'],['caution','注意','有些细节值得再检查一次。'],['bug','漏洞','记录问题，跟进修复。'],['success','成功','又完成了一个小目标。'],['example','示例','一个具体的例子让说明更清晰。'],['quote','引用','记录一句给你启发的话。'],['danger','危险','需要立即留意的事项。'],['error','错误','保存失败时，先检查输入。'],['failure','失败','尝试另一种方法，继续前进。'],['question','问题','为什么？还有没有其他可能？'],['abstract','摘要','用几句话概括一篇长笔记。'],['custom','通用','没有指定类型的提示框。']];
  for (const [type, label, text] of types) {
    const callout = document.createElement('div'); callout.className = 'callout'; callout.dataset.callout = type;
    const title = document.createElement('div'); title.className = 'callout-title';
    const icon = document.createElement('div'); icon.className = 'callout-icon'; icon.setAttribute('aria-hidden', 'true');
    const iconName = iconForType[type] || 'pencil';
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon lucide-' + iconName + '" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + calloutIcons[iconName] + '</svg>';
    const inner = document.createElement('div'); inner.className = 'callout-title-inner'; inner.textContent = label;
    title.append(icon, inner); const content = document.createElement('div'); content.className = 'callout-content'; const p = document.createElement('p'); p.textContent = text; content.append(p); callout.append(title, content); document.querySelector('#callout-samples').append(callout);
  }
  document.querySelectorAll('.task-list-item-checkbox').forEach(input => input.addEventListener('change', () => { input.parentElement.classList.toggle('is-checked', input.checked); input.parentElement.dataset.task = input.checked ? 'x' : ' '; }));
  document.querySelector('.copy-code-button').addEventListener('click', async event => {
    try { await navigator.clipboard.writeText(document.querySelector('pre code').textContent); event.target.textContent = '已复制'; }
    catch { event.target.textContent = '示例代码'; }
    setTimeout(() => { event.target.textContent = '复制'; }, 1500);
  });
  function closeModal() { modal.hidden = true; previousFocus?.focus(); }
  function showModal() { previousFocus = document.activeElement; modal.hidden = false; document.querySelector('.modal-close-button').focus(); }
  document.querySelector('.modal-bg').addEventListener('click', closeModal);
  document.querySelector('.modal-close-button').addEventListener('click', closeModal);
  document.querySelector('.modal-close-button').addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); closeModal(); } });
  document.querySelector('#sample-cancel').addEventListener('click', closeModal);
  document.querySelector('#sample-save').addEventListener('click', () => { document.querySelector('#sample-feedback').textContent = '这里展示界面样式；请在左侧下载配色文件。'; });
  document.querySelector('.checkbox-container').addEventListener('click', event => { event.currentTarget.classList.toggle('is-enabled'); event.currentTarget.setAttribute('aria-checked', String(event.currentTarget.classList.contains('is-enabled'))); });
  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') {
      const items = [...modal.querySelectorAll('button,input,select,[tabindex="0"]')]; const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  function ready() { parent.postMessage({ type: stylesheet.sheet ? 'phycat:ready' : 'phycat:error' }, '*'); }
  window.addEventListener('message', event => {
    if (event.source !== parent || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'phycat:hello') { ready(); return; }
    if (event.data.type === 'phycat:interface') { showModal(); return; }
    if (event.data.type !== 'phycat:update') return;
    try {
      const { mode, colors, options } = event.data;
      if (!['light', 'dark'].includes(mode) || !colors || !options) throw Error('Invalid preview message');
      const vars = engine.variables(mode, colors);
      const layout = ['layout-default', 'layout-cards'].includes(options.layout) ? options.layout : 'layout-default';
      const h1 = options.h1 === 'h1-align-left' ? 'h1-align-left' : 'h1-align-center';
      const h2 = (mode === 'light' ? 'h2-style-' : 'h2-style-dark-') + (options.h2 === 'capsule' ? 'capsule' : 'twin');
      const accentText = data.features?.autoAccentText && options.accentText === 'manual' ? ['manual-accent-contrast'] : [];
      document.body.className = ['theme-' + mode, 'css-settings-manager', layout, h1, h2, 'rainbow-folders', 'folder-icons', 'file-icons', ...accentText].join(' ');
      // Clearing prevents old mode-specific heading values from leaking into the new mode.
      document.body.removeAttribute('style');
      for (const [name, value] of Object.entries(data.previewDefaults)) document.body.style.setProperty('--' + name, value);
      for (const [name, value] of Object.entries(vars)) document.body.style.setProperty('--' + name, value);
    } catch { parent.postMessage({ type: 'phycat:error' }, '*'); }
  });
  const stylesheet = document.querySelector('#phycat-theme');
  if (stylesheet.sheet) ready();
  else { ready(); stylesheet.addEventListener('load', ready); stylesheet.addEventListener('error', () => parent.postMessage({ type: 'phycat:error' }, '*')); }
})();
