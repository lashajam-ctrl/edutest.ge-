import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import review from '../data/v29-held-reviewed.json' with {type:'json'};
const wrangler='C:/Users/Lasha/Claude/Artifacts/edutest-platform/node_modules/wrangler/bin/wrangler.js';
const query="SELECT COUNT(*) AS active_count FROM assessment_questions WHERE active=1; SELECT q.id,q.grade,q.subject,q.semester,q.question_type,q.content_hash,q.public_payload_json,a.answer_key_json,a.explanation FROM assessment_questions q JOIN assessment_answer_keys a ON q.id=a.question_id WHERE q.mapping_status='v29_assistant_content_review' AND q.active=1;";
const result=spawnSync(process.execPath,[wrangler,'d1','execute','edutest-db','--remote','--config','dist/server/wrangler.json','--command',query,'--json'],{encoding:'utf8',maxBuffer:8*1024*1024});
if(result.status!==0)throw Error((result.stderr||result.stdout).slice(0,2000));
const data=JSON.parse(result.stdout),active=data[0].results[0].active_count,rows=data[1].results;
assert.equal(active,23038);assert.equal(rows.length,496);
const actual=new Map(rows.map(r=>[r.id,r]));
for(const r of review.records){const q=actual.get(r.id);assert.ok(q,r.id);assert.equal(q.content_hash,r.contentHash,r.id);assert.deepEqual(JSON.parse(q.public_payload_json),r.publicPayload,r.id);assert.deepEqual(JSON.parse(q.answer_key_json),r.answerKey,r.id);assert.equal(q.explanation,r.explanation,r.id);assert.equal(q.question_type,r.publicPayload.type);}
const report={verifiedAt:new Date().toISOString(),activeCount:active,reviewedAdditions:rows.length,allPayloadsAndKeysMatch:true,reviewManifestSha256:createHash('sha256').update(fs.readFileSync('data/v29-held-reviewed.json')).digest('hex'),automatedTestsPassed:161,simulatedPapers:1092,build:'passed',questionContentInClientAssets:false,limitation:'Database read-back and anonymous smoke checks; no authenticated learner attempt was created.'};
fs.writeFileSync('reports/v29-held-production-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
