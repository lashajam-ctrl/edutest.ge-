/* Progressive learning tools. All user/API text is rendered as text, never HTML. */
(function () {
  'use strict';
  let planPromise=null,planData=null,planOwner='',planLoadedAt=0;
  const identity=()=>String(CUR_USER?.id||CUR_USER?.email||'');
  const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
  const button=(text,action)=>{const b=element('button',text,'btn btn-outline btn-sm');b.type='button';b.addEventListener('click',action);return b;};
  async function api(path,body) {
    const owner=identity(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try {
      const response=await fetch(path,{method:body?'POST':'GET',credentials:'include',cache:'no-store',signal:controller.signal,
        headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const data=await response.json().catch(()=>({}));
      if(owner!==identity())throw new Error('მომხმარებლის სესია შეიცვალა.');
      if(!response.ok)throw new Error(data.error||'მონაცემები დროებით მიუწვდომელია.');
      return data;
    }catch(error){if(error.name==='AbortError')throw new Error('ჩატვირთვას დიდი დრო დასჭირდა. სცადე თავიდან.');throw error;}
    finally{clearTimeout(timeout);}
  }
  function errorState(box,error,retry) {
    box.replaceChildren(element('p',error.message||'ვერ ჩაიტვირთა.'));
    if(retry)box.append(button('ხელახლა ცდა',retry));
  }
  function dialog(title) {
    const previous=document.activeElement,d=document.createElement('dialog');d.className='learning-dialog';d.dataset.learningPrivate='true';
    const heading=element('h2',title);heading.id='learning-title-'+Date.now();d.setAttribute('aria-labelledby',heading.id);
    const close=button('დახურვა',()=>d.close()),body=element('div');body.setAttribute('aria-live','polite');
    d.append(heading,body,close);d.addEventListener('close',()=>{d.remove();if(previous?.isConnected)previous.focus();});
    document.body.append(d);d.showModal();return {d,body};
  }
  function summaryView(box,data,reload) {
    const s=data.summary;box.replaceChildren();
    if(data.children.length){
      const label=element('label','ვისი შეჯამება გსურს? '),select=document.createElement('select');
      select.append(new Option('ჩემი შეჯამება',''));
      data.children.forEach(child=>select.append(new Option(child.name+' — '+child.grade+' კლასი',child.id)));
      select.value=data.childId||'';select.addEventListener('change',()=>reload(select.value));label.append(select);box.append(label);
    }else box.append(element('p','ბავშვის შეჯამება გამოჩნდება მხოლოდ მშობლის ამ ანგარიშის ელფოსტასთან დადასტურებული კავშირის შემდეგ.'));
    box.append(element('p',s.tests?s.tests+' სრული ტესტი · '+s.correct+'/'+s.questions+' სწორი პასუხი · '+(s.percentage??0)+'%':'ამ პერიოდში დასრულებული ტესტი არ არის.'));
    for(const [title,rows] of [['კარგად შესრულებული თემები',s.strengths],['შემდეგ რაზე ვიმუშაოთ',s.nextTopics]]){
      box.append(element('h3',title));if(!rows.length)box.append(element('p','ჯერ საკმარისი მონაცემი არ არის.'));
      rows.forEach(row=>box.append(element('p',row.subject+' · '+row.topic+' — '+row.correct+'/'+row.questions)));
    }
    box.append(element('p',s.note,'learning-note'),element('p','შეჯამება იხსნება მოთხოვნით. ავტომატური ყოველკვირეული წერილები ჩართული არ არის.','learning-note'));
  }
  window.openWeeklySummary=function(){
    const {body,d}=dialog('კვირის შეჯამება');
    async function load(childId=''){
      body.replaceChildren(element('p','შეჯამება იტვირთება…'));
      try{const data=await api('/api/learning/weekly'+(childId?'?childId='+encodeURIComponent(childId):''));if(d.isConnected)summaryView(body,data,load);}
      catch(error){if(d.isConnected)errorState(body,error,()=>load(childId));}
    }
    load();
  };
  window.startLearningPractice=function(sourceQuestionId){
    const {body,d}=dialog('ერთი ნაბიჯით უკეთ');
    async function start(){
      body.replaceChildren(element('p','განსხვავებული სავარჯიშო მზადდება…'));
      try{
        const data=await api('/api/learning/practice',{action:'start',sourceQuestionId});if(!d.isConnected)return;
        body.replaceChildren(element('p','ეს დამატებითი სავარჯიშოა და სრული ტესტის ქულას არ ცვლის.','learning-note'));
        if(data.previouslyAnswered)body.append(element('p','ეს სხვა შინაარსის კითხვაა, თუმცა ადრე უკვე გაქვს ნაპასუხები.','learning-note'));
        const q=data.question;body.append(element('h3',q.text));let answer;
        const form=document.createElement('form'),fieldset=document.createElement('fieldset');fieldset.append(element('legend','შენი პასუხი'));
        if(q.type==='calc'){
          const label=element('label','რიცხვითი პასუხი'),input=document.createElement('input');input.type='number';input.step='any';input.required=true;
          input.addEventListener('input',()=>{answer=input.value;});label.append(input);fieldset.append(label);
        }else{
          const options=Array.isArray(q.opts)?q.opts:['სწორია','არასწორია'];
          options.forEach((option,index)=>{const label=element('label',undefined,'learning-option'),input=document.createElement('input');
            input.type='radio';input.name='learning-answer';input.required=true;input.value=String(index);input.addEventListener('change',()=>{answer=index;});label.append(input,element('span',option));fieldset.append(label);});
        }
        const send=element('button','პასუხის შემოწმება','btn btn-primary');send.type='submit';const status=element('div');status.setAttribute('aria-live','polite');
        form.append(fieldset,send,status);body.append(form);
        form.addEventListener('submit',async event=>{
          event.preventDefault();if(answer===undefined||answer==='')return;send.disabled=true;status.textContent='პასუხი მოწმდება…';
          try{
            const result=await api('/api/learning/practice',{action:'submit',sessionId:data.sessionId,answer});if(!d.isConnected)return;
            fieldset.disabled=true;send.remove();status.replaceChildren(element('h3',result.correct?'სწორია!':'მოდი, კიდევ დავაკვირდეთ.'));
            if(!result.correct)status.append(element('p','სწორი პასუხი: '+String(result.correctDisplay??'')));
            if(result.explanation)status.append(element('p',result.explanation));
            status.append(element('p',result.correct?'გრძელვადიანი გამეორება 7 დღეში დაიგეგმა.':'ამ საკითხს ხვალაც დაუბრუნდი.','learning-note'));
            refreshLearningPlan(true);
          }catch(error){status.textContent=error.message;send.disabled=false;send.textContent='ხელახლა შემოწმება';}
        });
      }catch(error){if(d.isConnected)errorState(body,error,start);}
    }
    start();
  };
  window.practiceReviewQuestion=function(index){const q=_lastResult?.reviewed?.[index];if(q&&!q.ok&&_lastResult?.verified===true)startLearningPractice(q.id);};
  function planView(box,data){
    box.replaceChildren(element('h2','დღეს რა ვისწავლო?'),element('p','დღეს შესრულებულია '+data.completedToday+' სრული ტესტი. გასამეორებელია '+data.dueQuestions+' საკითხი.'));
    if(!data.actions.length)box.append(element('p','ამ კლასისთვის რეკომენდებული ტესტები ჯერ არ არის.'));
    const list=element('div',undefined,'learning-actions');
    data.actions.forEach((action,index)=>{const card=element('section',undefined,'learning-action');card.append(element('h3',(index+1)+'. '+action.label),element('p',action.title||[action.subject,action.topic].filter(Boolean).join(' · ')));
      card.append(button('დაწყება',()=>action.kind==='practice'?startLearningPractice(action.sourceQuestionId):startTestById(action.testId)));list.append(card);});
    box.append(list,element('p',data.note,'learning-note'),button('კვირის / ბავშვის შეჯამება',openWeeklySummary));
  }
  window.refreshLearningPlan=async function(force=false){
    const box=document.getElementById('learning-plan');if(!box||CUR_USER?.role!=='student')return;
    const owner=identity();
    if(planOwner!==owner){planData=null;planLoadedAt=0;planPromise=null;planOwner=owner;}
    if(!force&&planData&&Date.now()-planLoadedAt<60000){planView(box,planData);return;}
    if(planPromise&&!force)return planPromise;
    box.replaceChildren(element('h2','დღეს რა ვისწავლო?'),element('p','პირადი გეგმა იტვირთება…'));
    const pending=(async()=>{try{const data=await api('/api/learning/plan');if(owner!==identity())return;planData=data;planLoadedAt=Date.now();planView(box,data);}
      catch(error){if(owner===identity())errorState(box,error,()=>refreshLearningPlan(true));}finally{if(planPromise===pending)planPromise=null;}})();
    planPromise=pending;return pending;
  };
  window.openBankHealth=function(){
    const {body,d}=dialog('კითხვების ბანკის მდგომარეობა');
    const filters=element('div',undefined,'learning-filters'),grade=document.createElement('select'),semester=document.createElement('select');
    for(let value=1;value<=12;value++)grade.append(new Option(value+' კლასი',String(value)));
    semester.append(new Option('ორივე სემესტრი',''),new Option('I სემესტრი','1'),new Option('II სემესტრი','2'));
    const gl=element('label','კლასი '),sl=element('label','სემესტრი ');gl.append(grade);sl.append(semester);filters.append(gl,sl);const results=element('div');body.append(filters,results);let sequence=0;
    async function load(){
      const seq=++sequence;results.textContent='ბანკი მოწმდება…';
      try{
        const data=await api('/api/admin/question-bank-health?grade='+grade.value+(semester.value?'&semester='+semester.value:''));if(seq!==sequence||!d.isConnected)return;
        results.replaceChildren(element('p','შემოწმებული ჩანაწერები: '+data.scannedRows+' · უპასუხო გასაღები: '+data.missingAnswerKeys+' · სასკოლო წესის მიღმა: '+data.outsideSchoolRules));
        results.append(element('p','ადამიანის მიერ გადამოწმება: არ აღირიცხება. ავტომატური შემოწმება მას არ უდრის.','learning-note'));
        const wrapper=element('div',undefined,'learning-table-wrap'),table=document.createElement('table'),head=document.createElement('tr');
        ['საგანი / სემესტრი','ბანკი / სირთულე','აქტიური','განსხვავებული ჯგუფი','განმეორებული ჩანაწერი'].forEach(t=>{const th=element('th',t);th.scope='col';head.append(th);});
        const thead=document.createElement('thead');thead.append(head);table.append(thead);const tbody=document.createElement('tbody');
        data.buckets.forEach(row=>{const tr=document.createElement('tr');[row.subject+' / '+row.semester,row.sourcePool+' / '+row.difficulty,row.activeRows,row.selectionGroups,row.duplicateRows].forEach(t=>tr.append(element('td',t)));tbody.append(tr);});
        table.append(tbody);wrapper.append(table);results.append(wrapper);
        data.warnings.forEach(w=>results.append(element('p',w,'learning-note')));
        const details=element('details'),sum=element('summary','წყაროში ჩაწერილი შემოწმების სტატუსები');details.append(sum);
        data.buckets.forEach(row=>details.append(element('p',row.subject+' · '+row.semester+' · '+Object.entries(row.reviewStatuses).map(([k,v])=>k+': '+v).join(', '))));results.append(details);
      }catch(error){if(seq===sequence&&d.isConnected)errorState(results,error,load);}
    }
    grade.addEventListener('change',load);semester.addEventListener('change',load);load();
  };
  function install(page){
    if(page==='student'&&CUR_USER?.role==='student'){
      const home=document.getElementById('s-home');if(home&&!document.getElementById('learning-plan')){const box=element('section',undefined,'card learning-panel');box.id='learning-plan';box.setAttribute('aria-live','polite');home.insertBefore(box,home.children[1]||null);}
      refreshLearningPlan();
    }
    if(['teacher','admin'].includes(page)&&CUR_USER?.role===page){const home=document.getElementById(page==='admin'?'a-home':'t-home');
      if(home&&!home.querySelector('[data-learning-tools]')){const box=element('section',undefined,'card learning-panel');box.dataset.learningTools='true';box.append(button('ოჯახის კვირის შეჯამება',openWeeklySummary));if(page==='admin')box.append(button('ბანკის მდგომარეობა',openBankHealth));home.prepend(box);}}
  }
  const previousGo=go;go=function(page){
    if(!CUR_USER||page==='home'||page==='login'){
      planData=null;planOwner='';planLoadedAt=0;
      document.querySelectorAll('[data-learning-private]').forEach(d=>d.close());
      document.getElementById('learning-plan')?.replaceChildren();
    }
    const result=previousGo(page);install(page);return result;
  };
  const previousSNav=sNav;sNav=function(id,el){const result=previousSNav(id,el);if(id==='s-home')install('student');return result;};
  renderDailyChallenge=function(){const old=document.getElementById('s-daily-card');if(old)old.style.display='none';if(CUR_USER?.role==='student')install('student');};
  renderStudyPlan=function(){
    const box=document.getElementById('res-study-plan');if(!box)return;
    box.replaceChildren(element('h3','შემდეგი სასწავლო ნაბიჯი'),element('p','შეცდომასთან აირჩიე „სხვა სავარჯიშო ამ თემაზე“, ან გახსენი შენს ისტორიაზე დაფუძნებული დღის გეგმა.'));
    box.append(button('ჩემი დღის გეგმა',()=>{go('student');sNav('s-home',document.querySelector('#p-student .ni'));}),button('კვირის შეჯამება',openWeeklySummary));
  };
  document.addEventListener('DOMContentLoaded',()=>{if(CUR_USER)install(CUR_USER.role);});
})();
