import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release CI uses the package manager and lockfile declared by the repository',()=>{
 const workflow=read('.github/workflows/release-gate.yml'),manifest=JSON.parse(read('package.json'));
 assert.match(manifest.packageManager,/^pnpm@\d+\.\d+\.\d+$/);
 assert.ok(read('pnpm-lock.yaml').includes('lockfileVersion:'));
 assert.match(workflow,/pnpm\/action-setup@/);
 assert.match(workflow,/pnpm install --frozen-lockfile/);
 assert.doesNotMatch(workflow,/cache:\s*npm|\bnpm ci\b/);
 assert.ok(workflow.indexOf('actions/setup-node@')<workflow.indexOf('pnpm/action-setup@'));
 assert.ok(workflow.indexOf('pnpm/action-setup@')<workflow.indexOf('pnpm install'));
 assert.match(workflow,/node scripts\/release-gate\.mjs --no-build/);
 assert.match(workflow,/pnpm run build:cloudflare/);
});
