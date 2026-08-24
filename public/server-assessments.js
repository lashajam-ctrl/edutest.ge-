(function(){
  'use strict';

  let serverSessionId=null;
  let serverSubmitting=false;
  let catalogUserKey='';
  let catalogReady=false;
  let catalogLoading=null;
  window.EDUTEST_CATALOG_STATE='loading';

  function catalogErrorMessage(error){
    const message=String(error&&error.message||error||'');
    if(message.includes('ავტორიზაცია აუცილებელია'))return 'სესია დასრულდა — გთხოვთ, თავიდან შეხვიდეთ.';
    if(message.includes('ტესტის ახალი განსხვავებული კითხვები ამოიწურა'))return 'დღევანდელი განსხვავებული კითხვები უკვე გაიარეთ. ახალი ნაკრები ხვალ განახლდება.';
    return message||'ტესტი დროებით ვერ გაიხსნა. სცადეთ ხელახლა.';
  }

  function setCatalogMessage(message){
    const list=document.getElementById('s-test-list');
    if(!list)return;
    list.replaceChildren();
    const node=document.createElement('div');
    node.style.cssText='padding:28px;text-align:center;color:var(--gray)';
    node.textContent=message;
    list.appendChild(node);
  }

  function installCatalog(tests,replaceExisting){
    const incoming=Array.isArray(tests)?tests:[];
    const byId=new Map(incoming.map(test=>[String(test.id),Object.assign({},test,{serverBacked:true})]));
    if(replaceExisting){
      ALL_TESTS.splice(0,ALL_TESTS.length,...byId.values());
      catalogReady=true;
      window.EDUTEST_CATALOG_STATE='ready';
    }else{
      for(const test of byId.values()){
        const index=ALL_TESTS.findIndex(existing=>String(existing&&existing.id||'')===String(test.id));
        if(index>=0)ALL_TESTS[index]=Object.assign({},ALL_TESTS[index],test);
        else ALL_TESTS.push(test);
      }
    }
    if(typeof populateSubjectDropdown==='function')populateSubjectDropdown('s-subj-filter');
    if(typeof renderStudentTests==='function'&&document.getElementById('p-student')?.classList.contains('active'))renderStudentTests();
    if(typeof renderTeacherTests==='function'&&document.getElementById('p-teacher')?.classList.contains('active'))renderTeacherTests();
    if(typeof renderAssignPanel==='function')renderAssignPanel();
  }

  async function loadServerCatalog(force){
    const userKey=CUR_USER&&CUR_USER.email||'public';
    if(!force&&catalogReady&&catalogUserKey===userKey)return true;
    if(catalogLoading)return catalogLoading;
    catalogUserKey=userKey;
    window.EDUTEST_CATALOG_STATE='loading';
    catalogLoading=(async()=>{try{
      const response=await fetch('/api/assessments/catalog',{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'ტესტების კატალოგი ვერ ჩაიტვირთა');
      installCatalog(data.tests||[],true);
      return true;
    }catch(error){
      catalogReady=false;
      window.EDUTEST_CATALOG_STATE='error';
      setCatalogMessage(catalogErrorMessage(error));
      return false;
    }finally{catalogLoading=null;}})();
    return catalogLoading;
  }

  function adaptQuestion(question){
    const q=Object.assign({},question,{_kaText:question.text,_kaOpts:Array.isArray(question.opts)?question.opts.slice():[]});
    if(q.type==='match'){
      q.pairs=(q.leftItems||[]).map(left=>[left,'']);
      q.correct=(q.rightOptions||[]).slice();
    }
    return q;
  }

  function adaptReviewed(question){
    const q=adaptQuestion(question);
    const answer=question.correctDisplay;
    if(q.type==='multiple_choice'||q.type==='true_false'||q.type==='mcq'||q.type==='tf'){
      q.correct=Math.max(0,(q.opts||[]).findIndex(option=>String(option)===String(answer)));
    }else if(q.type==='calc')q.correct=answer;
    else if(q.type==='order')q.correct=Array.isArray(answer)?answer:[];
    else if(q.type==='match'){
      const pairs=Array.isArray(answer)?answer:[];
      q.pairs=pairs;
      q.correct=pairs.map(pair=>pair[1]);
    }else if(q.type==='fill')q.blanks=Array.isArray(answer)?answer:[];
    delete q.correctDisplay;
    return q;
  }

  function resultBadge(pct){
    if(pct>=90)return {badge:'🏆 Excellent',bc:'b-blue'};
    if(pct>=70)return {badge:'✅ Good',bc:'b-green'};
    if(pct>=50)return {badge:'📘 Pass',bc:'b-amber'};
    return {badge:'❌ Fail',bc:'b-red'};
  }

  startTest=async function(){
    if(!CUR_USER){go('login');return;}
    let requestedId=curTest&&curTest.id;
    if(!requestedId){alert('ტესტი ვერ მოიძებნა.');go(curRole==='teacher'?'teacher':'student');return;}
    if(!curTest.serverBacked){
      const loaded=await loadServerCatalog(true);
      curTest=ALL_TESTS.find(test=>test&&test.serverBacked&&String(test.id)===String(requestedId))||null;
      if(!loaded||!curTest){
        alert('ტესტების კატალოგი განახლდა. გთხოვთ, აირჩიოთ ტესტი ხელახლა.');
        go(curRole==='teacher'?'teacher':'student');
        return;
      }
      requestedId=curTest.id;
    }
    if(typeof applyTestAgeMode==='function')applyTestAgeMode(curTest);
    if(typeof resetQuestionSpeech==='function')resetQuestionSpeech();
    setTestLoading('ტესტი იტვირთება…');
    try{
      const response=await fetch('/api/assessments/start',{
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({testId:String(requestedId)})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        if(response.status===404){
          await loadServerCatalog(true);
          throw new Error('ტესტების კატალოგი განახლდა. გთხოვთ, აირჩიოთ ტესტი ხელახლა.');
        }
        throw new Error(data.error||'ტესტი ვერ დაიწყო');
      }
      serverSessionId=data.sessionId;
      curTestQs=(data.questions||[]).map(adaptQuestion);
      qIdx=0;qAnswers={};_tabSwitchCount=0;
      if(!curTestQs.length)throw new Error('ტესტისთვის კითხვები ვერ მოიძებნა');
      if(data.test){
        curTest.count=Number(data.test.count||curTestQs.length);
        if(data.test.componentCounts)curTest.componentCounts=data.test.componentCounts;
      }
      if(timerInt)clearInterval(timerInt);
      timerSec=Number(curTest.time||data.test&&data.test.time||20)*60;
      const timer=document.getElementById('timer');if(timer)timer.style.display='';
      const title=document.getElementById('tt-title');if(title)title.textContent=curTest.title||txTitle(curTest);
      renderQ();buildDots();updateTimer();
      timerInt=setInterval(()=>{timerSec--;updateTimer();if(timerSec<=0){clearInterval(timerInt);finishTest();}},1000);
    }catch(error){
      serverSessionId=null;
      alert(catalogErrorMessage(error));
      go(curRole==='teacher'?'teacher':'student');
    }
  };

  const previousStartTestById=startTestById;
  startTestById=async function(id,practice=false){
    let target=ALL_TESTS.find(test=>test&&test.serverBacked&&String(test.id)===String(id));
    if(!target){
      const loaded=await loadServerCatalog(true);
      target=ALL_TESTS.find(test=>test&&test.serverBacked&&String(test.id)===String(id));
      if(!loaded||!target){
        alert('ტესტების კატალოგი განახლდა. გთხოვთ, აირჩიოთ ტესტი ხელახლა.');
        go(curRole==='teacher'?'teacher':'student');
        return;
      }
    }
    return previousStartTestById(target.id,practice);
  };

  finishTest=async function(){
    hideSubmitModal();
    if(serverSubmitting)return;
    if(!serverSessionId){
      if(document.getElementById('p-results')?.classList.contains('active'))return;
      alert('უსაფრთხო ტესტის სესია ვერ მოიძებნა.');return;
    }
    serverSubmitting=true;
    setTestLoading('პასუხები სერვერზე მოწმდება…');
    try{
      const response=await fetch('/api/assessments/submit',{
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({sessionId:serverSessionId,answers:qAnswers})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'პასუხები ვერ ჩაიბარა სერვერმა');
      if(timerInt)clearInterval(timerInt);
      const result=Object.assign({},data.result||{});
      result.reviewed=(result.reviewed||[]).map(adaptReviewed);
      result.userId=CUR_USER&&CUR_USER.email||'guest';
      result.userGrade=Number(CUR_USER&&CUR_USER.grade||result.grade||1);
      Object.assign(result,resultBadge(Number(result.pct||0)));
      const grade=parseInt(CUR_USER&&CUR_USER.grade)||parseInt(result.grade)||1;
      let xpEarned=typeof calcXP==='function'?calcXP(Number(result.pct||0),grade):0;
      if(typeof _isDailyBonus!=='undefined'&&_isDailyBonus){xpEarned*=2;if(typeof markDailyDone==='function')markDailyDone(CUR_USER.email);_isDailyBonus=false;}
      result.xpEarned=xpEarned;
      SESSION_RESULTS.unshift(result);saveResults();_lastResult=result;serverSessionId=null;
      if(typeof showXpToast==='function'&&xpEarned)showXpToast(xpEarned,null);
      if(typeof logAuditEvent==='function')logAuditEvent('TEST_DONE_VERIFIED',(CUR_USER&&CUR_USER.email||'')+' | '+result.testId+' | '+result.pct+'%');
      renderResultsPage(result);go('results');
      if(typeof maybeAutoSpeakResult==='function')setTimeout(()=>maybeAutoSpeakResult(result),120);
    }catch(error){
      alert(catalogErrorMessage(error)+' პასუხები შენარჩუნებულია და შეგიძლიათ ხელახლა გაგზავნოთ.');
    }finally{serverSubmitting=false;}
  };

  loadBuilderCatalog=async function(){
    const box=document.getElementById('q-picker');if(!box)return;
    box.replaceChildren();const loading=document.createElement('div');loading.style.cssText='padding:16px;color:var(--gray)';loading.textContent='კითხვები იტვირთება…';box.appendChild(loading);
    try{
      const grade=Number(document.getElementById('b-grade')?.value||1),subject=document.getElementById('b-subj')?.value||'';
      const response=await fetch('/api/assessments/questions?grade='+encodeURIComponent(grade)+'&subject='+encodeURIComponent(subject)+'&limit=100',{credentials:'include',cache:'no-store'});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'კითხვები ვერ ჩაიტვირთა');
      _builderCatalog=data.questions||[];box.replaceChildren();
      if(!_builderCatalog.length){const empty=document.createElement('div');empty.style.cssText='padding:16px;color:var(--gray)';empty.textContent='ამ კლასისა და საგნისთვის კითხვები ვერ მოიძებნა.';box.appendChild(empty);return;}
      _builderCatalog.forEach((q,index)=>{
        const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:flex-start;padding:8px;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer';
        const input=document.createElement('input');input.type='checkbox';input.style.width='auto';input.checked=selQs.has(q.id);input.addEventListener('change',()=>toggleBuilderQ(q.id,input.checked));
        const text=document.createElement('span');text.textContent=(index+1)+'. '+String(q.text||'');label.append(input,text);box.appendChild(label);
      });updateBuilderCount();
    }catch(error){box.replaceChildren();const failed=document.createElement('div');failed.style.cssText='padding:16px;color:#b91c1c';failed.textContent=catalogErrorMessage(error);box.appendChild(failed);}
  };

  saveBuilderTest=async function(){
    try{
      const payload={title:(document.getElementById('b-title')?.value||'').trim(),subject:document.getElementById('b-subj')?.value||'',grade:Number(document.getElementById('b-grade')?.value||1),durationMinutes:Number(document.getElementById('b-time')?.value||20),attemptsAllowed:Number(document.getElementById('b-att')?.value||2),published:!!document.getElementById('b-pub')?.checked,questionIds:[...selQs]};
      const response=await fetch('/api/assessments/builder',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'ტესტი ვერ შეიქმნა');
      if(data.test)installCatalog([data.test]);hideBuilder();if(typeof renderTeacherTests==='function')renderTeacherTests();alert('ტესტი შეიქმნა და უსაფრთხოდ შეინახა.');
    }catch(error){alert(catalogErrorMessage(error));}
  };

  async function loadPublicStats(){
    const status=document.getElementById('lp-live-status');if(status){status.textContent='რეალური მონაცემები იტვირთება…';status.setAttribute('aria-busy','true');}
    try{
      const response=await fetch('/api/public/stats',{cache:'no-store',headers:{Accept:'application/json'}}),data=await response.json();if(!response.ok)throw new Error();
      const values={'lp-question-count':data.questions,'lp-test-count':data.tests,'lp-subject-count':data.subjects,'lp-today-tests':data.todayTests,'lp-excellent':data.excellentBadges,'lp-average-score':data.averageScore};
      Object.entries(values).forEach(([id,raw])=>{const value=Math.max(0,Number(raw)||0),el=document.getElementById(id);if(el)el.textContent=value.toLocaleString('ka-GE');});
      if(status){status.textContent=Number(data.todayTests||0)?'მონაცემები განახლებულია რეალური აქტივობიდან.':'დღეს ჯერ დასრულებული ტესტი არ დაფიქსირებულა.';status.removeAttribute('aria-busy');}
    }catch(_){
      ['lp-question-count','lp-test-count','lp-subject-count','lp-today-tests','lp-excellent','lp-average-score'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});
      if(status){status.textContent='რეალური მაჩვენებლები დროებით მიუწვდომელია.';status.removeAttribute('aria-busy');}
    }
  }

  const previousGo=go;
  go=function(page){const result=previousGo(page);if(page==='student'||page==='teacher'||page==='admin')loadServerCatalog(false);return result;};
  document.addEventListener('DOMContentLoaded',()=>{loadServerCatalog(true);loadPublicStats();});
})();
