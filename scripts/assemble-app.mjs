import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
const root=resolve('src/legacy-app'),manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8'));
const combine=files=>files.map(file=>{const path=resolve(root,file);if(!path.startsWith(root+sep))throw new Error('Source path outside app');return readFileSync(path,'utf8');}).join('');
const template=combine(manifest.html);
if(template.split('@@EDUTEST_RUNTIME@@').length!==2)throw new Error('Exactly one classic runtime slot required');
const html=template.replace('@@EDUTEST_RUNTIME@@',()=>combine(manifest.runtime));
if(process.argv.includes('--check')){
  if(readFileSync('public/app.html','utf8')!==html)throw new Error('Generated app.html is stale. Run node scripts/assemble-app.mjs.');
}else writeFileSync('public/app.html',html);
console.log('App fragments assembled in original classic-script order.');
