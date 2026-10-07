import {createHash} from 'node:crypto';
import fs from 'node:fs';
import index from './v29-held-review-index.json' with {type:'json'};
const manifestUrl=new URL('./v29-held-reviewed.json',import.meta.url);
const review=fs.existsSync(manifestUrl)?JSON.parse(fs.readFileSync(manifestUrl,'utf8')):{records:[]};
const records=new Map(review.records.map(r=>[r.id,r]));
const reviewedIds=new Set(index.ids);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function heldReviewForId(id){const key=String(id).replace(/^v\d+-/,'v28-');return reviewedIds.has(key)?{id:key}:null;}
export function applyHeldReview(input){
 const found=heldReviewForId(input.id);if(!found)return null;
 const record=records.get(found.id);
 if(!record)throw Error('Private reviewed bank artifact is required before importing: '+input.id);
 const p=JSON.parse(input.public_payload_json),a=JSON.parse(input.answer_key_json);
 const normalized={...p,id:record.id};
 const inputHash=digest([normalized,a,input.explanation]);
 const outputHash=digest([record.publicPayload,record.answerKey,record.explanation]);
 if(inputHash!==record.inputHash&&inputHash!==outputHash)throw Error('Reviewed v29 source changed; new content review required: '+input.id);
 if(input.grade!==record.grade||input.subject!==record.subject||input.semester!==record.semester)throw Error('Reviewed v29 classification drift: '+input.id);
 return {row:{...input,question_type:record.publicPayload.type,public_payload_json:JSON.stringify({...record.publicPayload,id:input.id}),answer_key_json:JSON.stringify(record.answerKey),explanation:record.explanation},fixes:['v29_held_content_review']};
}
