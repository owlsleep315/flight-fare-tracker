import { readdir, readFile, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { validate } from './validate.mjs';
const config = JSON.parse(await readFile('config.json','utf8'));
const names = (await readdir('data/observations')).filter(n => n.endsWith('.json')).sort();
const observations = [], ids = new Set();
for (const name of names) {
  const o = validate(JSON.parse(await readFile('data/observations/' + name,'utf8')), config);
  if (ids.has(o.id)) throw new Error('중복 observation ID: ' + o.id);
  ids.add(o.id); observations.push(o);
}
await rm('dist', {recursive:true,force:true});
await cp('public','dist',{recursive:true});
await mkdir('dist/data',{recursive:true});
await writeFile('dist/data/history.json', JSON.stringify({schemaVersion:1, config, observations},null,2));
console.log(`Built dist · ${observations.length} observations · no runtime dependencies`);
