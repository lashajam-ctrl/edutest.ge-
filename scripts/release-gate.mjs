import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const tests=['assessment-selection','bank-expansion-quality','civics-expansion-quality','early-georgian-quality','question-policy','security-regression','secure-assessment','claude-audit-regression','v8-question-bank','v11-platform-import','v29-corrections','v29-held-review','open-response-grading','seo-logo','totp','email-mfa','language-blueprint-bank','rendered-html','senior-math-bank','learning-hub','release-lifecycle','learning-reliability','result-delivery'];
function run(args){const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
run(['scripts/assemble-app.mjs','--check']);
run(['scripts/check-browser-syntax.mjs']);
run(['--max-old-space-size=512','node_modules/typescript/bin/tsc','--noEmit','--pretty','false','--incremental','false']);
run(['--test','--test-concurrency=1','tests/ci-workflow.test.mjs',...tests.map(name=>'tests/'+name+'.test.mjs')]);
if(process.argv.includes('--bank-review')){
 if(!fs.existsSync('data/v29-held-reviewed.json'))throw Error('Private bank review artifact is required');
 run(['--test','.openai/v29-held-review.test.mjs']);
}
if(process.argv.includes('--capacity-expansion')){
 run(['scripts/verify-capacity-expansion-local.mjs']);
 run(['scripts/verify-bank-workloads.mjs']);
}
if(process.argv.includes('--civics-expansion'))run(['scripts/verify-civics-expansion-local.mjs']);
if(!process.argv.includes('--no-build'))run(['node_modules/vinext/dist/cli.js','build']);
console.log('Release gate passed'+(process.argv.includes('--no-build')?' (tests only; build still required).':'.'));
