import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, json } from './lib.mjs';

const next = process.argv[2];
assert.match(next || '', /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Usage: npm run release:prepare -- X.Y.Z');
const current = json('manifest.json').version;
const a = next.split('.').map(Number), b = current.split('.').map(Number);
const difference = a.findIndex((value,i)=>value!==b[i]);
assert.ok(difference>=0 && a[difference]>b[difference], 'New version must exceed current version');
assert.ok(!execFileSync('git',['tag','--list',next],{cwd:root,encoding:'utf8'}).trim(), 'Tag already exists');
assert.ok(fs.existsSync(path.join(root,`releases/${next}.md`)), 'Write versioned release notes first');
assert.ok(fs.readFileSync(path.join(root,`releases/${next}.md`),'utf8').startsWith(`# Phycat ${next}`), 'Release notes version mismatch');
for (const file of ['manifest.json','package.json','package-lock.json']) {
  const data = json(file); data.version = next;
  if (file==='package-lock.json') data.packages[''].version = next;
  fs.writeFileSync(path.join(root,file),JSON.stringify(data,null,2)+'\n');
}
console.log(`Prepared ${current} → ${next}. Run npm run check, npm test and npm run build, then commit and push main with the matching ${next} tag.`);
