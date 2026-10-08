// Narrow, deterministic checks for explicitly worded letter tasks. Unsupported
// prompts are not silently labelled correct or rewritten by keyword heuristics.
export function letterTaskMatches(payload){
 const text=String(payload.text??''),options=payload.opts;
 if(!Array.isArray(options))return null;
 let match,predicate,rule;
 if((match=text.match(/რომელი (?:ასოთი|ბგერით) (იწყება|ბოლოვდება) სიტყვა „([^“]+)“/u))){
  const letters=Array.from(match[2]);const expected=match[1]==='იწყება'?letters[0]:letters.at(-1);
  predicate=value=>value===expected;rule='word-boundary-letter';
 }else if((match=text.match(/რომელი სიტყვა (შეიცავს|იწყება|მთავრდება) ასო „([ა-ჰ])“/u))){
  const operation=match[1],letter=match[2];
  predicate=value=>operation==='შეიცავს'?value.includes(letter):operation==='იწყება'?value.startsWith(letter):value.endsWith(letter);rule='option-word-letter';
 }else if((match=text.match(/სიტყვა „([^“]+)“ რამდენი ასოსგან შედგება/u))){
  const expected=Array.from(match[1]).length;predicate=value=>String(expected)===value;rule='letter-count';
 }else if((match=text.match(/რომელი სიტყვა იწყება იგივე ასოთი, როგორც „([^“]+)“/u))){
  const expected=Array.from(match[1])[0];predicate=value=>value.startsWith(expected);rule='same-first-letter';
 }else if((match=text.match(/რომელია ხმოვანი ბგერა სიტყვაში „([^“]+)“/u))){
  const word=match[1];predicate=value=>Array.from(value).length===1&&'აეიოუ'.includes(value)&&word.includes(value);rule='vowel-in-word';
 }else return null;
 return {rule,validIndices:options.flatMap((value,index)=>predicate(String(value).normalize('NFC').trim())?[index]:[])};
}
export function auditLetterQuestions(rows){
 const checked=[],issues=[];
 for(const row of rows){
  if(row.question_type!=='multiple_choice')continue;
  const payload=JSON.parse(row.public_payload_json),key=JSON.parse(row.answer_key_json),result=letterTaskMatches(payload);
  if(!result)continue;
  checked.push(row.id);
  if(result.validIndices.length!==1||result.validIndices[0]!==key.correct)issues.push({id:row.id,...result,storedCorrect:key.correct});
 }
 return {checked:checked.length,issues};
}
