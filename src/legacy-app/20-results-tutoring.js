function buildReviewHTML(reviewed){
  return reviewed.map((q,i)=>{
    const answerHidden=q.reveal===false;
    const col=q.type==='short_answer'?'fffbeb':q.ok?'f0fdf4':'fff1f2';
    const bc2=q.type==='short_answer'?'fde68a':q.ok?'bbf7d0':'fecaca';
    const pts=q.type==='short_answer'?t('pending_pts'):q.ok?'✓ '+q.pts+'/'+q.pts+' '+t('pts_label'):'✗ 0/'+q.pts+' '+t('pts_label');
    const ptsCol=q.type==='short_answer'?'#d97706':q.ok?'#16a34a':'#dc2626';
    // Build user answer display for all types
    let userAnsText='— ('+t('skipped')+')';
    let corrExtra='';
    if(q.type==='match'){
      if(q.ua&&typeof q.ua==='object'){
        userAnsText=q.pairs.map((p,i)=>p[0]+' → '+(q.ua[i]||'?')).join(' | ');
      }
      if(!q.ok){
        corrExtra=q.pairs.map((p,i)=>'<span style="color:#166534">'+esc(p[0])+' → <strong>'+esc(q.correct[i])+'</strong></span>').join('<br>');
      }
    }else if(q.type==='order'){
      userAnsText=Array.isArray(q.ua)?q.ua.join(' → '):'— ('+t('skipped')+')';
      if(!q.ok)corrExtra='<span style="color:#166534">'+q.correct.map(esc).join(' → ')+'</span>';
    }else if(q.type==='fill'){
      userAnsText=Array.isArray(q.ua)?q.ua.filter(Boolean).join(', '):'— ('+t('skipped')+')';
      if(!q.ok)corrExtra=q.blanks.map(esc).join(', ');
    }else if(q.type==='calc'){
      userAnsText=q.ua!==undefined?String(q.ua):'— ('+t('skipped')+')';
      if(!q.ok)corrExtra=esc(String(q.correct!==undefined?q.correct:q.answer))+(q.tolerance?'  (±'+esc(q.tolerance)+')':'');
    }else if(q.type==='short_answer'){
      userAnsText=q.ua||'— ('+t('skipped')+')';
    }else{
      userAnsText=q.ua!==undefined?qTransOpt(q,q.ua):'— ('+t('skipped')+')';
      if(!q.ok)corrExtra=esc(qTransOpt(q,q.correct));
    }
    const wrongDiv=(!answerHidden&&!q.ok&&q.type!=='short_answer'&&corrExtra)?
      `<div style="margin-top:6px;padding:8px 10px;background:#dcfce7;border-radius:6px;font-size:11px;color:#166534;border-left:3px solid #16a34a">
        <strong>✓ ${t('correct_ans_was')}:</strong> ${corrExtra}
        ${q.explain?'<br><span style="color:#15803d;margin-top:4px;display:block">💡 '+esc(q.explain)+'</span>':''}
       </div>`:'';
    const explainDiv=(q.ok&&q.explain)?
      `<div style="margin-top:5px;font-size:11px;color:#6b7280">💡 ${esc(q.explain)}</div>`:'';
    const hiddenDiv=(answerHidden&&!q.ok)?'<div style="margin-top:6px;font-size:11px;color:#64748b">🔒 სწორი პასუხი ამ შეფასების რეჟიმში არ ქვეყნდება.</div>':'';
    const aiDiv=(!q.ok&&q.type!=='short_answer'&&!answerHidden)?`<div style="margin-top:8px"><button type="button" class="btn btn-outline btn-sm" data-ai-review-index="${i}" onclick="requestAiExplanation(${i},this)">🤖 ამიხსენი შეცდომა</button>${_lastResult?.verified===true?` <button type="button" class="btn btn-outline btn-sm" onclick="practiceReviewQuestion(${i})">სხვა სავარჯიშო ამ თემაზე</button>`:''}<div id="ai-feedback-${i}" role="status" aria-live="polite" style="margin-top:8px"></div></div>`:'';
    return `<div style="padding:10px;background:#${col};border:1px solid #${bc2};border-radius:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600">${t('q_num_label')}${i+1}: ${esc(qTransText(q))}</span>
        <span style="font-size:11px;color:${ptsCol};flex-shrink:0;margin-left:8px">${pts}</span>
      </div>
      <div style="font-size:11px;color:var(--gray)">${t('your_ans_label')} <strong>${esc(String(userAnsText))}</strong></div>
      ${wrongDiv}${explainDiv}${hiddenDiv}${aiDiv}
    </div>`;
  }).join('');
}

function reviewAnswerText(q,value){
  if(value===undefined||value===null||value==='')return 'პასუხი არ არის მონიშნული';
  if((q.type==='multiple_choice'||q.type==='true_false'||q.type==='mcq'||q.type==='tf')&&Array.isArray(q.opts))return String(q.opts[Number(value)]??value);
  if(Array.isArray(value))return value.join(' → ');
  if(typeof value==='object')return Object.values(value).join(' | ');
  return String(value);
}
function reviewCorrectAnswerText(q){
  if((q.type==='multiple_choice'||q.type==='true_false'||q.type==='mcq'||q.type==='tf')&&Array.isArray(q.opts))return String(q.opts[Number(q.correct)]??q.correct??'');
  if(Array.isArray(q.correct))return q.correct.join(' → ');
  if(Array.isArray(q.blanks))return q.blanks.join(', ');
  return String(q.correct??q.answer??'');
}
function appendAiText(parent,tag,text,style){const node=document.createElement(tag);if(style)node.style.cssText=style;node.textContent=String(text||'');parent.appendChild(node);return node;}
function renderAiExplanation(container,feedback,index){
  container.replaceChildren();container.style.cssText='margin-top:8px;padding:12px;border-radius:10px;background:#eef6ff;border:1px solid #bfdbfe;color:#1e3a5f';
  appendAiText(container,'div','🤖 AI მასწავლებლის ახსნა','font-weight:700;margin-bottom:6px');
  if(feedback.misconception)appendAiText(container,'div',feedback.misconception,'font-size:12px;margin-bottom:6px');
  const steps=Array.isArray(feedback.explanationSteps)?feedback.explanationSteps:[];
  if(steps.length){const list=document.createElement('ol');list.style.cssText='margin:6px 0 8px 20px;font-size:12px';steps.forEach(step=>{const li=document.createElement('li');li.textContent=String(step);li.style.marginBottom='4px';list.appendChild(li);});container.appendChild(list);}
  if(feedback.correctReason)appendAiText(container,'div','რატომ არის სწორი: '+feedback.correctReason,'font-size:12px;margin-top:6px');
  if(feedback.nextStep)appendAiText(container,'div','შემდეგი ნაბიჯი: '+feedback.nextStep,'font-size:12px;margin-top:6px;font-weight:600');
  if(feedback.practiceQuestion&&feedback.practiceQuestion.text){appendAiText(container,'div','სავარჯიშო: '+feedback.practiceQuestion.text,'font-size:12px;margin-top:8px;padding-top:8px;border-top:1px solid #bfdbfe');const options=Array.isArray(feedback.practiceQuestion.options)?feedback.practiceQuestion.options:[];options.forEach((option,i)=>appendAiText(container,'div',String.fromCharCode(65+i)+'. '+option,'font-size:12px;margin-top:3px'));}
  const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline btn-sm';retry.style.marginTop='10px';retry.textContent='↻ თავიდან მოთხოვნა';retry.addEventListener('click',()=>requestAiExplanation(index,retry));container.appendChild(retry);
}
async function requestAiExplanation(index,button){
  const q=_lastResult&&Array.isArray(_lastResult.reviewed)?_lastResult.reviewed[index]:null;
  const container=document.getElementById('ai-feedback-'+index);
  if(!q||q.ok||q.reveal===false||!container)return;
  button.disabled=true;button.textContent='⏳ ახსნა მზადდება…';container.replaceChildren();appendAiText(container,'div','AI მასწავლებელი ამზადებს ასაკზე მორგებულ ახსნას…','font-size:12px;color:#475569');
  try{
    if(!CUR_USER)throw new Error('სესია დასრულდა — გთხოვთ, თავიდან შეხვიდეთ');
    const response=await fetch('/api/ai/feedback',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:_lastResult.subject||'',item:{id:String(q.id||''),text:String(q.text||''),userAnswer:reviewAnswerText(q,q.ua),correctAnswer:reviewCorrectAnswerText(q),explanation:String(q.explain||''),skill:String(q.topic||'general'),outcome:null}})});
    const data=await response.json().catch(()=>({}));
    const feedback=data.feedback||data.fallback;
    if(!response.ok&&!feedback)throw new Error(data.error||'AI ახსნა დროებით მიუწვდომელია');
    if(!feedback)throw new Error('AI ახსნა დროებით მიუწვდომელია');
    renderAiExplanation(container,feedback,index);
  }catch(error){container.replaceChildren();container.style.cssText='margin-top:8px;padding:10px;border-radius:8px;background:#fff1f2;border:1px solid #fecaca';appendAiText(container,'div',error&&error.message||'AI ახსნა დროებით მიუწვდომელია','font-size:12px;color:#b91c1c');const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline btn-sm';retry.style.marginTop='8px';retry.textContent='↻ ხელახლა ცდა';retry.addEventListener('click',()=>requestAiExplanation(index,retry));container.appendChild(retry);
  }finally{button.disabled=false;if(button.isConnected)button.textContent='🤖 ამიხსენი შეცდომა';}
}

