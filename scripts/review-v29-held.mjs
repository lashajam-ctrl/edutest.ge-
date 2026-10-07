import fs from 'node:fs';
const ids=new Set(JSON.parse(fs.readFileSync('reports/v29-reviewed-merge.json')).holds.map(x=>x.id));
export const held=JSON.parse(fs.readFileSync('reports/v29-delta-review.json')).added.filter(x=>ids.has(x.id));
const alphabet='აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ', latin=['a','b','g','d','e','v','z','t','i','k','l','m','n','o','p','zh','r','s','t','u','f','k','gh','q','sh','ch','ts','dz','ts','ch','kh','j','h'];
const roman=s=>String(s).replace(/[ა-ჰ]/gu,c=>latin[alphabet.indexOf(c)]||c);
if(process.argv[1]?.endsWith('review-v29-held.mjs')){
 const start=Number(process.argv[2]||0),end=Number(process.argv[3]||held.length);
 for(let i=start;i<end;i++){const q=held[i];console.log(roman(JSON.stringify({n:i,id:q.id.slice(4),g:q.grade,s:q.subject,t:q.p.text,opts:q.p.opts||q.p.items,a:q.a,e:q.explanation})));}
}
