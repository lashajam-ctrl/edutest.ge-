// One-time, byte-preserving extraction. This script does not regroup statements.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
const destination='src/legacy-app';
if(existsSync(destination)&&readdirSync(destination).length)throw new Error('Refusing to overwrite existing modular sources');
mkdirSync(destination,{recursive:true});
const original=readFileSync('public/app.html','utf8');
const script=[...original.matchAll(/<script>\s*\n([\s\S]*?)<\/script>/g)].sort((a,b)=>b[1].length-a[1].length)[0];
if(!script||script[1].length<150000)throw new Error('Main classic runtime boundary not found');
const start=script.index+script[0].indexOf(script[1]),runtime=script[1];
function parts(text,boundaries,extension){
  const points=[['00-shared',0],...boundaries.map(([name,marker])=>{const index=text.indexOf(marker);if(index<0)throw new Error('Missing boundary '+marker);return [name,index];})];
  points.sort((a,b)=>a[1]-b[1]);
  if(new Set(points.map(p=>p[1])).size!==points.length)throw new Error('Duplicate boundaries');
  const files=points.map(([name,index],n)=>{const file=name+extension;writeFileSync(destination+'/'+file,text.slice(index,points[n+1]?.[1]??text.length));return file;});
  if(files.map(f=>readFileSync(destination+'/'+f,'utf8')).join('')!==text)throw new Error('Extraction changed source bytes');
  return files;
}
const runtimeFiles=parts(runtime,[
  ['10-student-progress','function renderDailyChallenge(){'],
  ['20-results-tutoring','function buildReviewHTML('],
  ['30-state-navigation','const USER_DB='],
  ['40-authentication','async function initServerAuth('],
  ['50-adaptive-learning','function renderStudyPlan('],
  ['60-catalog-assessments','const SCHOOL_SUBJECTS_BY_GRADE='],
],'.js');
const template=original.slice(0,start)+'@@EDUTEST_RUNTIME@@'+original.slice(start+runtime.length);
const htmlFiles=parts(template,[['10-auth-markup','<div id="p-login"'],['20-student-markup','<div id="p-student"'],
  ['30-teacher-markup','<div id="p-teacher"'],['40-admin-markup','<div id="p-admin"'],['50-runtime-loader','<script src="/school-rules.js'] ],'.html');
writeFileSync(destination+'/manifest.json',JSON.stringify({format:1,html:htmlFiles,runtime:runtimeFiles},null,2)+'\n');
console.log(JSON.stringify({htmlParts:htmlFiles.length,runtimeParts:runtimeFiles.length,byteEquivalent:true}));
