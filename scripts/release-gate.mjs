import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const tests=['assessment-selection','bank-expansion-quality','civics-expansion-quality','safety-expansion-quality','georgia-expansion-quality','grade8-expansion-quality','early-georgian-quality','question-policy','security-regression','secure-assessment','claude-audit-regression','v8-question-bank','v11-platform-import','v29-corrections','v29-held-review','open-response-grading','seo-logo','totp','email-mfa','language-blueprint-bank','rendered-html','senior-math-bank','learning-hub','release-lifecycle','learning-reliability','result-delivery'];
tests.push('bank-quality-hold');
tests.push('balanced-bank-capacity');
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
if(process.argv.includes('--civics9-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--grade9']);
if(process.argv.includes('--civics10-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--grade10']);
if(process.argv.includes('--civics11-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--grade11']);
if(process.argv.includes('--safety12-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--safety12']);
if(process.argv.includes('--georgia6-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--georgia6']);
if(process.argv.includes('--biology8-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--biology8']);
if(process.argv.includes('--georgian8-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--georgian8']);
if(process.argv.includes('--georgian8repair-expansion')){
 run(['scripts/verify-civics-expansion-local.mjs','--georgian8repair']);
}
if(process.argv.includes('--georgian8reading-expansion'))run(['scripts/verify-civics-expansion-local.mjs','--georgian8reading']);
if(!process.argv.includes('--no-build'))run(['node_modules/vinext/dist/cli.js','build']);
console.log('Release gate passed'+(process.argv.includes('--no-build')?' (tests only; build still required).':'.'));
