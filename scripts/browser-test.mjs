import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root, css, groups, presets, presetCSS, contrast } from './lib.mjs';

// Small host fixture for CI; OBSIDIAN_ASAR allows local checks against the installed app CSS.
let nativeCSS = `body{--color-accent:hsl(var(--accent-h),var(--accent-s),var(--accent-l));--color-accent-1:hsl(var(--accent-h),var(--accent-s),calc(var(--accent-l) + 5%));--font-text-size:16px;--font-monospace:ui-monospace;--background-primary:#fff;--text-normal:#222;--p-spacing:1em;--scrollbar-thumb-bg:rgba(128,128,128,.5)}.theme-dark{--background-primary:#222;--text-normal:#eee}.markdown-rendered p{margin-block:var(--p-spacing)}input[type=checkbox]{position:static}body{font-size:var(--font-text-size)}`;
let host = 'CI host fixture';
if (process.env.OBSIDIAN_ASAR) {
  const asar = fs.readFileSync(process.env.OBSIDIAN_ASAR);
  const index = JSON.parse(asar.subarray(16,16+asar.readUInt32LE(12)).toString());
  const read = name => { const file=index.files[name], start=8+asar.readUInt32LE(4)+Number(file.offset);return asar.subarray(start,start+file.size).toString(); };
  nativeCSS = read('app.css'); host = `Obsidian ${JSON.parse(read('package.json')).version} native CSS`;
}
const browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
const page = await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:'reduce'});
const report = {host, browser:browser.version(), presets:[], checks:[]};
const defaults = groups.flatMap(g=>g.settings).filter(s=>s.type==='class-toggle'&&s.default===true).map(s=>s.id).join(' ');
const scaffold = `.fixture{padding:20px;max-width:850px}.markdown-preview-view{position:relative;min-height:200px}pre{margin-top:25px}.mermaid{color:var(--text-normal)}.mermaid .actor{fill:gray}.scroll-test{overflow:auto;height:80px;width:120px}.scroll-content{height:800px}.inline-test{display:inline-block}html,body{overflow:auto!important;height:auto!important;min-height:0!important;display:block!important;position:static!important;contain:none!important}.nav-files-container{display:block}`;
const markup = `<main class="fixture"><div class="workspace-tabs">Cards</div><div class="markdown-preview-view markdown-rendered"><h1>Phycat</h1><h2 id="heading">Heading</h2><p id="paragraph">Paragraph</p><input type="checkbox" id="html-checkbox"><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" id="task-checkbox" checked>Task</li><li class="task-list-item" data-task="/"><input type="checkbox" class="task-list-item-checkbox" id="progress-checkbox" checked>In progress</li></ul><pre><code><span class="token comment" id="comment">// readable comment</span></code></pre><p><code id="inline" class="inline-test">inline code</code></p></div><div class="markdown-source-view mod-cm6"><span class="cm-link"><span class="external-link" id="link-text">Link text</span></span><span class="cm-url external-link" id="url">https://example.com</span><span class="cm-formatting-link-string external-link" id="url-format">https://example.com</span><div class="HyperMD-header-2" id="editor-heading">Editor heading</div></div><div class="vertical-tab-nav-item is-active" id="nav">Selected settings</div><div class="mermaid"><span class="edgeLabel"><p id="mermaid-label">diagram label</p></span><svg id="diagram-random"><rect class="actor" id="actor" width="100" height="30"/></svg></div><div class="nav-files-container"><div class="nav-file-title" data-path="Note.md"><div class="nav-file-title-content" id="file-title">Note</div></div><div class="nav-folder-title"><div class="nav-folder-title-content" id="folder-title">Folder</div></div></div><div class="scroll-test"><div class="scroll-content">Scroll</div></div></main>`;
const expandedMarkup=markup.replace('<pre><code>','<pre class="language-js"><code>').replace('</main>','<div class="markdown-preview-view"><pre><code><span class="token comment" id="plain-comment">// output comment</span></code></pre></div><div class="markdown-source-view mod-cm6"><div class="HyperMD-codeblock"><span class="cm-comment" id="editor-comment">// editor comment</span></div></div></main>');
await page.setContent(`<style>${nativeCSS}</style><style>${scaffold}</style><style>${css}</style><style id="settings"></style>${expandedMarkup}`);
async function mode(mode, data={}, classes='') {
  await page.evaluate(({mode,data,classes,defaults})=>{
    document.body.className=`theme-${mode} ${defaults} ${classes}`;
    document.body.removeAttribute('style');
    document.querySelector('#settings').textContent=data;
  },{mode,data:presetCSS(data),classes,defaults});
  // Settings navigation is outside note containers and retains its normal transition.
  await page.waitForTimeout(650);
}
async function color(selector, property='color', pseudo=null) {
  return page.evaluate(({selector,property,pseudo})=>{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=1;
    ctx.fillStyle=getComputedStyle(document.querySelector(selector),pseudo).getPropertyValue(property);ctx.fillRect(0,0,1,1);
    return [...ctx.getImageData(0,0,1,1).data];
  },{selector,property,pseudo});
}
async function value(selector, property, pseudo=null) {return page.$eval(selector,(el,{property,pseudo})=>getComputedStyle(el,pseudo).getPropertyValue(property),{property,pseudo});}
try {
  for (const light of [true,false]) for (const plugin of [true,false]) {
    const m=light?'light':'dark';
    await mode(m,{},`layout-cards ${plugin?'css-settings-manager':''}`);
    assert.equal((await page.$eval('body',el=>getComputedStyle(el).getPropertyValue('--bg-mix-percent'))).trim(),'90');
    const card=await page.evaluate(()=>{const el=document.createElement('div');el.style.backgroundColor='var(--background-card)';document.body.append(el);const c=getComputedStyle(el).backgroundColor;el.remove();return c;});
    assert.notEqual(card,'rgba(0, 0, 0, 0)',`Missing ${m} card default`);
    for (const id of ['#url','#url-format','#link-text']) {assert.notEqual(await value(id,'display'),'none');assert.ok(await page.$eval(id,el=>el.getBoundingClientRect().width)>0);}
    assert.notEqual(await value('#html-checkbox','position'),'absolute');
    assert.equal(await value('#task-checkbox','position'),'absolute');
    report.checks.push(`${m}: defaults, cards, link text and checkbox scope (${plugin?'settings enabled':'no settings'})`);
  }
  for (const preset of presets) {
    await mode(preset.mode,preset.data,'css-settings-manager layout-cards rainbow-folders');
    await page.locator('#inline').hover();
    await page.waitForTimeout(250);
    const nav = contrast((await color('#nav')).slice(0,3),(await color('#nav','background-color')).slice(0,3));
    const inline=contrast((await color('#inline','-webkit-text-fill-color')).slice(0,3),(await color('#inline','background-color')).slice(0,3));
    const bg=(await color('pre.language-js','background-color'));
    // The note background is the theme's primary surface, including translucent code backgrounds.
    const backdrop=await page.evaluate(()=>{const ctx=document.createElement('canvas').getContext('2d');ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--background-primary');ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);});
    const codeBg=bg.slice(0,3).map((c,i)=>c*bg[3]/255+backdrop[i]*(1-bg[3]/255));
    const comment=contrast((await color('#comment')).slice(0,3),codeBg);
    const otherComments=[];
    for (const [selector,surface] of [['#plain-comment','pre:not([class])'],['#editor-comment','.HyperMD-codeblock']]) {
      const background=await color(surface,'background-color');
      const opaque=background.slice(0,3).map((c,i)=>c*background[3]/255+backdrop[i]*(1-background[3]/255));
      const ratio=contrast((await color(selector)).slice(0,3),opaque);
      assert.ok(ratio>=4.5,`${preset.file}: ${selector} ${ratio}`);
      otherComments.push(ratio);
    }
    const mermaid=contrast((await color('#mermaid-label')).slice(0,3),(await color('#mermaid-label','background-color')).slice(0,3));
    assert.ok(nav>=4.5,`${preset.file}: nav ${nav}; color=${await value('#nav','color')}; background=${await value('#nav','background-color')}; pixels=${JSON.stringify([await color('#nav'),await color('#nav','background-color')])}`);
    assert.ok(inline>=4.5,`${preset.file}: inline ${inline}`);
    assert.ok(comment>=4.5,`${preset.file}: comment ${comment}; text=${await value('#comment','color')}; background=${await value('pre','background-color')}; backdrop=${JSON.stringify(backdrop)}; code=${await value('pre code','background-color')}`);
    assert.ok(mermaid>=4.5,`${preset.file}: Mermaid label ${mermaid}`);
    assert.notEqual(await value('#actor','fill'),'rgb(128, 128, 128)');
    assert.equal(await value('#mermaid-label','font-size'),await value('body','--font-text-size'));
    report.presets.push({file:preset.file,nav:+nav.toFixed(2),inline:+inline.toFixed(2),comment:+comment.toFixed(2),plainComment:+otherComments[0].toFixed(2),editorComment:+otherComments[1].toFixed(2),mermaid:+mermaid.toFixed(2)});
  }
  // Native accents override imported primary colors and remain legible at both extremes.
  for (const m of ['light','dark']) for (const accent of ['#000000','#ffffff','#006600','#ffff00','#ff00cc','#808080']) {
    const data=presets.find(p=>p.mode===m).data;
    await mode(m,data,'css-settings-manager');
    await page.evaluate(accent=>{document.body.style.setProperty('--color-accent',accent);document.body.style.setProperty('--color-accent-1',accent);},accent);
    await page.locator('#inline').hover();
    await page.waitForTimeout(300);
    for (const selector of ['#nav','#inline']) assert.ok(contrast((await color(selector,selector==='#inline'?'-webkit-text-fill-color':'color')).slice(0,3),(await color(selector,'background-color')).slice(0,3))>=4.5,`${m} ${accent}: ${selector}`);
  }
  report.checks.push('Native accent override and text contrast: 12 light/dark scenarios');
  // Imports preserve the other mode and unrelated settings by limiting preset keys.
  const first=presets.find(p=>p.file.endsWith('light/mint.json')),second=presets.find(p=>p.file.endsWith('light/sky.json')),dark=presets.find(p=>p.file.endsWith('dark/everforest.json'));
  const combined={...first.data,...dark.data,'phycat-spacing@@p-spacing':'80px',...second.data};
  await mode('light',combined,'css-settings-manager');
  assert.equal(await value('#paragraph','margin-bottom'),'80px');
  assert.deepEqual((await color('#nav','background-color')).slice(0,3),[52,152,219]);
  await mode('dark',combined,'css-settings-manager');
  assert.deepEqual((await color('#nav','background-color')).slice(0,3),[167,192,128]);
  report.checks.push('Sequential imports replace one mode while retaining the other mode and paragraph spacing');
  await mode('light',{'phycat-colors@@phycat-settings-nav-active-color@@light':'#123456'},'css-settings-manager manual-accent-contrast');
  assert.deepEqual((await color('#nav')).slice(0,3),[18,52,86]);
  // Both file and folder switches operate independently; plugins take priority in either CSS order.
  await mode('light');
  assert.equal(await value('#file-title','content','::before'),'""');
  await page.evaluate(()=>document.body.classList.remove('file-icons'));
  assert.equal(await value('#file-title','content','::before'),'none');
  assert.equal(await value('#folder-title','content','::before'),'""');
  await page.evaluate(()=>{document.body.classList.add('file-icons');document.body.classList.remove('folder-icons');});
  assert.equal(await value('#folder-title','content','::before'),'none');
  await page.evaluate(()=>{document.body.classList.add('folder-icons');document.querySelector('#file-title').insertAdjacentHTML('beforeend','<span class="iconize-icon">I</span>');document.querySelector('#folder-title').insertAdjacentHTML('beforeend','<svg></svg>');});
  for (const selector of ['#file-title','#folder-title']) assert.equal(await value(selector,'display','::before'),'none');
  report.checks.push('Independent icon toggles and plugin icon priority');
  await page.locator('#task-checkbox').focus();
  assert.equal(await value('#task-checkbox','outline-style'),'solid');
  assert.equal(await value('#task-checkbox','animation-name','::before'),'none');
  await page.evaluate(()=>document.body.classList.add('is-mobile'));
  assert.ok((await color('.scroll-test','background-color','::-webkit-scrollbar-thumb'))[3]>0);
  report.checks.push('Keyboard task focus, reduced motion and touch scrollbar visibility');
  await page.evaluate(()=>{document.body.style.setProperty('--font-text-size','20px');document.body.style.setProperty('--font-monospace','"Courier New"');});
  assert.equal(await value('#mermaid-label','font-size'),'20px');
  assert.ok((await value('pre code','font-family')).includes('Courier New'));
  report.checks.push('Mermaid text size and code font respect user preferences');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{const el=document.querySelector('#task-checkbox');el.checked=false;el.checked=true;});
  assert.equal(await value('#task-checkbox','animation-name','::before'),'task-pulse');
  await page.emulateMedia({reducedMotion:'reduce'});
  await mode('light',{},'h2-style-capsule');
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results/light.png'),fullPage:true});
  await mode('dark',dark.data,'css-settings-manager layout-cards');
  await page.screenshot({path:path.join(root,'test-results/dark.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'test-results/browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Browser regression passed: ${report.presets.length} rendered presets; ${report.checks.length} scenario groups; ${host}; Chromium ${browser.version()}.`);
} catch (error) {
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results/failure.png'),fullPage:true});
  console.error(await page.$eval('#inline',el=>({rect:el.getBoundingClientRect().toJSON(),display:getComputedStyle(el).display,body:document.body.getBoundingClientRect().toJSON()})));
  throw error;
} finally {await browser.close();}
