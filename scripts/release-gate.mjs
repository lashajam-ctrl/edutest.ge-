import {spawnSync} from 'node:child_process';
const tests=['assessment-selection','question-policy','security-regression','secure-assessment','claude-audit-regression','v8-question-bank','v11-platform-import','seo-logo','totp','email-mfa','language-blueprint-bank','rendered-html','senior-math-bank','learning-hub','release-lifecycle','learning-reliability'];
function run(args){const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
run(['scripts/assemble-app.mjs','--check']);
run(['scripts/check-browser-syntax.mjs']);
run(['--max-old-space-size=512','node_modules/typescript/bin/tsc','--noEmit','--pretty','false','--incremental','false']);
run(['--test','--test-concurrency=1',...tests.map(name=>'tests/'+name+'.test.mjs')]);
if(!process.argv.includes('--no-build'))run(['node_modules/vinext/dist/cli.js','build']);
console.log('Release gate passed'+(process.argv.includes('--no-build')?' (tests only; build still required).':'.'));
