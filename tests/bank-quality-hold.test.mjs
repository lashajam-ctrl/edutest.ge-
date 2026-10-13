import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {planQualityHold} from '../scripts/bank-quality-hold.mjs';

const scope = {grade:8, semester:2, subject:'ქართული ენა და ლიტერატურა'};
const row = {id:'reviewed-1', content_hash:'a'.repeat(64), ...scope, active:1};
const candidate = {id:row.id, content_hash:row.content_hash, reason:'Multiple valid word orders; one exact key is unfair'};
test('quality hold is exact-scoped, preserves payload and key, and is idempotent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE assessment_questions(id TEXT,content_hash TEXT,grade INTEGER,semester INTEGER,subject TEXT,active INTEGER,payload TEXT); CREATE TABLE assessment_answer_keys(question_id TEXT,answer_key_json TEXT);');
  const insert = db.prepare('INSERT INTO assessment_questions VALUES(?,?,?,?,?,?,?)');
  for (const id of [row.id, 'unreviewed-same-topic']) insert.run(id,row.content_hash,8,2,scope.subject,1,'preserve old session payload');
  db.prepare('INSERT INTO assessment_answer_keys VALUES(?,?)').run(row.id,'preserve old answer key');
  const [plan] = planQualityHold([row], [candidate], scope);
  db.exec(plan.apply); db.exec(plan.apply);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM assessment_questions WHERE active=1').get().n,1);
  const oldSession = db.prepare('SELECT q.payload,a.answer_key_json FROM assessment_questions q JOIN assessment_answer_keys a ON a.question_id=q.id WHERE q.id=?').get(row.id);
  assert.deepEqual({...oldSession},{payload:'preserve old session payload',answer_key_json:'preserve old answer key'});
  db.exec(plan.rollback);
  assert.equal(db.prepare('SELECT active FROM assessment_questions WHERE id=?').get(row.id).active,1);
  db.close();
});
test('changed question content requires a new review', () => {
  assert.throws(() => planQualityHold([{...row,content_hash:'b'.repeat(64)}],[candidate],scope),/Content drift/);
});
test('wrong class, semester or subject is never held', () => {
  for (const changed of [{grade:7},{semester:1},{subject:'ინგლისური'}])
    assert.throws(() => planQualityHold([{...row,...changed}],[candidate],scope),/Scope mismatch/);
});
test('missing, repeated or unexplained candidates fail closed', () => {
  assert.throws(() => planQualityHold([], [candidate], scope),/Missing/);
  assert.throws(() => planQualityHold([row], [candidate,candidate], scope),/Duplicate manifest/);
  assert.throws(() => planQualityHold([row], [{...candidate,reason:''}], scope),/reason/);
});
test('already held exact records support safe interrupted-release recovery', () => {
  assert.equal(planQualityHold([{...row,active:0}], [candidate], scope)[0].alreadyHeld,true);
});
