// Maintainer tool: preserve each comment hue while meeting contrast on all code surfaces.
import fs from 'node:fs';
import path from 'node:path';
import { root, css, presets, rgb, composite, contrast } from './lib.mjs';

let updatedCSS=css;
const defaults={};
for (const preset of presets) {
  const {mode,data,file}=preset, key=id=>`phycat-colors@@${id}@@${mode}`;
  const base=rgb(data[key('bg-color')]);
  const surfaces=[composite(data[key('code-block-bg')],data[key('bg-color')])];
  if (mode==='light') surfaces.push(rgb(data[key('primary-color')]).map((v,i)=>v*.04+base[i]*.96));
  else surfaces.push(composite(data[key('phycat-code-block-background')],data[key('bg-color')]));
  const original=rgb(data[key('code-comment')]);
  let candidate=original;
  for (let step=0;step<=255&&Math.min(...surfaces.map(bg=>contrast(candidate,bg)))<4.8;step++) candidate=original.map(v=>Math.round(v*(1-step/255)+(mode==='light'?0:255)*step/255));
  const value='#'+candidate.map(v=>v.toString(16).padStart(2,'0')).join('');
  data[key('code-comment')]=value;
  fs.writeFileSync(path.join(root,file),JSON.stringify(data,null,2)+'\n');
  if (file.endsWith(mode==='light'?'sakura.json':'vampire.json')) defaults[mode]=value;
  console.log(`${file}: ${value}, minimum ${Math.min(...surfaces.map(bg=>contrast(candidate,bg))).toFixed(2)}:1`);
}
let index=0;
updatedCSS=updatedCSS.replace(/--code-comment: [^;]+;/g,()=>`--code-comment: ${defaults[index++===0?'light':'dark']};`);
updatedCSS=updatedCSS.replace(/(id: code-comment[\s\S]*?default-light: ')[^']*('[\s\S]*?default-dark: ')[^']*'/,`$1${defaults.light}$2${defaults.dark}'`);
fs.writeFileSync(path.join(root,'theme.css'),updatedCSS);
