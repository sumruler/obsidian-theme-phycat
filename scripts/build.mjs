import './check.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { zipSync, unzipSync } from 'fflate';
import { root, json } from './lib.mjs';

const version = json('manifest.json').version;
const dist = path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
const files = ['manifest.json','theme.css','README.md','PALETTE.md','MIGRATION.md','CHANGELOG.md','AUDIT-FIXES.md','DEVELOPMENT.md','LICENSE','THIRD-PARTY-NOTICES.md','screenshot.png','screenshot-hd.png','donatebtn.png','wechatpay.png','alipay.png'];
function addDirectory(dir) {
  for (const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) addDirectory(file); else files.push(file);
  }
}
addDirectory('presets'); addDirectory('licenses');
const bytes = file => new Uint8Array(fs.readFileSync(path.join(root,file)));
const archive = Object.fromEntries(files.map(file => [`Phycat/${file}`,[bytes(file),{mtime:new Date('2026-01-01T00:00:00Z')}]]));
const zip = zipSync(archive,{level:9});
const unpacked = unzipSync(zip);
assert.deepEqual(Object.keys(unpacked).sort(),files.map(f=>'Phycat/'+f).sort());
for (const file of files) assert.deepEqual(unpacked['Phycat/'+file],bytes(file),`Archive mismatch: ${file}`);
const fullZip = `obsidian-phycat-theme-${version}.zip`;
fs.writeFileSync(path.join(dist,fullZip),zip);
const paletteFiles = files.filter(f=>f.startsWith('presets/')||f.startsWith('licenses/')||['PALETTE.md','LICENSE','THIRD-PARTY-NOTICES.md'].includes(f));
const presetZip = `phycat-presets-${version}.zip`;
fs.writeFileSync(path.join(dist,presetZip),zipSync(Object.fromEntries(paletteFiles.map(f=>[f,[bytes(f),{mtime:new Date('2026-01-01T00:00:00Z')}]])),{level:9}));
for (const file of ['manifest.json','theme.css']) fs.copyFileSync(path.join(root,file),path.join(dist,file));
fs.copyFileSync(path.join(root,`releases/${version}.md`),path.join(dist,'release-notes.md'));
const assets = ['manifest.json','theme.css',fullZip,presetZip];
fs.writeFileSync(path.join(dist,'SHA256SUMS'),assets.map(file=>`${createHash('sha256').update(fs.readFileSync(path.join(dist,file))).digest('hex')}  ${file}`).join('\n')+'\n');
console.log(`Built and verified ${fullZip} (${files.length} files), ${presetZip}, standalone theme assets and SHA256SUMS.`);
