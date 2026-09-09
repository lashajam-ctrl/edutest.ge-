// Read-only smoke check. No login credentials, real attempts, or user data are used.
import assert from 'node:assert/strict';
const origin=new URL(process.argv[2]||'https://edutest.ge').origin;
async function check(path,expected=200,options={}){const response=await fetch(origin+path,{...options,signal:AbortSignal.timeout(20000)});assert.equal(response.status,expected,path);return response;}
const home=await check('/'),html=await home.text();
assert.match(html,/learning-hub\.js/);assert.match(html,/s-filter-testtype/);assert.match(html,/ხელმისაწვდომი ტიპების ჩვენება/);
const assets=[...html.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(m=>m[1]);
for(const path of new Set(assets)){const response=await check(path),mime=response.headers.get('content-type')||'';assert.match(mime,path.split('?')[0].endsWith('.js')?/javascript/:/text\/css/);assert.doesNotMatch((await response.text()).slice(0,150),/<!doctype html/i);}
for(const path of ['/privacy','/terms'])await check(path);
for(const path of ['/api/auth/mfa','/api/learning/plan','/api/learning/weekly'])await check(path,401);
await check('/api/admin/question-bank-health?grade=3',403);
for(const path of ['/api/assessments/start','/api/assessments/submit','/api/learning/practice','/api/ai/feedback'])await check(path,401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
const catalog=await (await check('/api/assessments/catalog')).json();
const georgian=catalog.tests.filter(t=>t.grade===3&&t.subject==='ქართული'&&t.semester===2);
assert.ok(georgian.some(t=>t.testType==='practice'||t.testType==='mid'),'Grade 3 Georgian semester 2 practice');
console.log(JSON.stringify({origin,assets:new Set(assets).size,catalogTests:catalog.tests.length,grade3GeorgianSemester2:georgian.map(t=>({id:t.id,type:t.testType,count:t.count})),anonymousAccessBlocked:true,checks:'passed'},null,2));
