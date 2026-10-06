import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import postcss from 'postcss';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const read = file => fs.readFileSync(path.join(root, file), 'utf8');
export const json = file => JSON.parse(read(file));
export const css = read('theme.css');
export const ast = postcss.parse(css, { from: 'theme.css' });
export const groups = [...css.matchAll(/\/\*\s*@settings\s*\n([\s\S]*?)\*\//g)].map(m => load(m[1]));
export const settings = new Map(groups.flatMap(group => group.settings.map(s => [group.id + '@@' + s.id, s])));
export const presets = ['light', 'dark'].flatMap(mode => fs.readdirSync(path.join(root, 'presets', mode)).sort().map(file => ({
  mode, file: `presets/${mode}/${file}`, data: json(`presets/${mode}/${file}`)
})));
export function presetCSS(data) {
  const variables = { general: [], light: [], dark: [] };
  for (const [key, value] of Object.entries(data)) {
    const [group, id, mode] = key.split('@@');
    const setting = settings.get(group + '@@' + id);
    variables[mode || 'general'].push(`--${id}:${value}${setting.format === 'em' ? 'em' : ''};`);
    for (const alt of setting['alt-format'] || []) {
      if (alt.format !== 'hsl-split') throw new Error(`Unsupported alternate format: ${alt.format}`);
      const [r,g,b] = rgb(value).map(c => c / 255), max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min, l = (max+min)/2;
      const s = d === 0 ? 0 : d/(1-Math.abs(2*l-1));
      let h = d === 0 ? 0 : max === r ? ((g-b)/d)%6 : max === g ? (b-r)/d+2 : (r-g)/d+4;
      h = (h*60+360)%360;
      variables[mode || 'general'].push(`--${alt.id}-h:${h};--${alt.id}-s:${s*100}%;--${alt.id}-l:${l*100}%;`);
    }
  }
  return `body.css-settings-manager{${variables.general.join('')}}body.theme-light.css-settings-manager{${variables.light.join('')}}body.theme-dark.css-settings-manager{${variables.dark.join('')}}`;
}
export function rgb(value) {
  if (value.startsWith('#')) {
    let h = value.slice(1); if (h.length === 3) h = h.split('').map(c => c+c).join('');
    return [0,2,4].map(i => parseInt(h.slice(i,i+2),16));
  }
  return value.match(/[\d.]+/g).slice(0,3).map(Number);
}
export function composite(value, base) {
  const alpha = value.startsWith('rgba') ? +value.match(/[\d.]+/g)[3] : /^#[\da-f]{8}$/i.test(value) ? parseInt(value.slice(-2),16)/255 : 1;
  return rgb(value).map((v,i) => v*alpha+rgb(base)[i]*(1-alpha));
}
export function contrast(a,b) {
  const lum = color => color.map(v => {v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const [x,y] = [lum(a),lum(b)].sort((a,b)=>b-a);
  return (x+.05)/(y+.05);
}
