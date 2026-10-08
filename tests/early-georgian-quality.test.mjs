import test from 'node:test';
import assert from 'node:assert/strict';
import {letterTaskMatches,auditLetterQuestions} from '../scripts/early-georgian-quality.mjs';
test('letter inclusion detects both valid answers rather than trusting one stored index',()=>{
 const p={text:'რომელი სიტყვა შეიცავს ასო „ლ“-ს?',opts:['სახლი','კატა','დედა','წყალი']};
 assert.deepEqual(letterTaskMatches(p).validIndices,[0,3]);
 p.opts[3]='მზე';assert.deepEqual(letterTaskMatches(p).validIndices,[0]);
});
test('letter rules recompute starts, ends, lengths, comparison and vowels',()=>{
 for(const [text,opts,index]of [
  ['რომელი ასოთი იწყება სიტყვა „მზე“?',['ზ','მ','ე'],1],
  ['რომელი ბგერით ბოლოვდება სიტყვა „ბაღი“?',['ღი','ღ','ი'],2],
  ['სიტყვა „კატა“ რამდენი ასოსგან შედგება?',['3','4','5'],1],
  ['რომელი სიტყვა მთავრდება ასო „ა“-ზე?',['მზე','კატა','ხე'],1],
  ['რომელი სიტყვა იწყება იგივე ასოთი, როგორც „დედა“?',['დღე','მზე','კატა'],0],
  ['რომელია ხმოვანი ბგერა სიტყვაში „სკამი“?',['სკ','მ','ა'],2],
 ])assert.deepEqual(letterTaskMatches({text,opts}).validIndices,[index]);
});
test('unsupported prose is not treated as a verified letter question',()=>{
 assert.equal(letterTaskMatches({text:'მას გრძელი ყურები მიუხატა. რა დახატა?',opts:['კურდღელი','კატა']}),null);
});
test('answer mismatch and two valid vowels are release-blocking findings',()=>{
 const row={id:'synthetic',question_type:'multiple_choice',public_payload_json:JSON.stringify({text:'რომელია ხმოვანი ბგერა სიტყვაში „სკამი“?',opts:['ს','მ','ა','ი']}),answer_key_json:'{"correct":2}'};
 assert.equal(auditLetterQuestions([row]).issues.length,1);
 row.public_payload_json=JSON.stringify({text:'რომელი ასოთი იწყება სიტყვა „მზე“?',opts:['მ','ზ']});
 row.answer_key_json='{"correct":1}';assert.equal(auditLetterQuestions([row]).issues.length,1);
});
