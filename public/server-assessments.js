(function(){
  'use strict';
  var serverSessionId=null,serverSubmitting=false,catalogUserKey='';
  var subjectBlueprint={
    1:['მათემატიკა','ქართული','ინგლისური','ბუნება'],2:['მათემატიკა','ქართული','ინგლისური','ბუნება'],
    3:['მათემატიკა','ქართული','ინგლისური','ბუნება','მე და საზოგადოება'],4:['მათემატიკა','ქართული','ინგლისური','ბუნება','მე და საზოგადოება'],
    5:['მათემატიკა','ქართული','ინგლისური','რუსული','ბუნება','ჩვენი საქართველო'],6:['მათემატიკა','ქართული','ინგლისური','რუსული','ბუნება','ჩვენი საქართველო'],
    7:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','მოქალაქეობა'],
    8:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    9:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    10:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    11:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','რუსული','ისტორია','გეოგრაფია','ბიოლოგია','ფიზიკა','ქიმია','მოქალაქეობა'],
    12:['მათემატიკა','ქართული ენა და ლიტერატურა','ინგლისური','ისტორია','სამოქალაქო თავდაცვა და უსაფრთხოება']
  };

  ALL_TESTS.forEach(function(test){test.catalogHidden=true;});
  loadCustomTestsFromServer=function(){return Promise.resolve();};
  var originalCurriculumEligible=isCurriculumEligible;
  subjectsForGrade=function(grade){return (subjectBlueprint[Number(grade)]||[]).slice();};
  isCurriculumEligible=function(test){
    if(test&&test.serverBacked)return !test.catalogHidden&&(subjectBlueprint[Number(test.grade)]||[]).includes(subjectFamily(test.subject));
    return originalCurriculumEligible(test);
  };

  function setCatalogMessage(message){
    var list=document.getElementById('s-test-list');
    if(list){list.replaceChildren();var node=document.createElement('div');node.style.cssText='padding:28px;text-align:center;color:var(--gray)';node.textContent=message;list.appendChild(node);}
  }
  function installCatalog(tests){
    for(var i=ALL_TESTS.length-1;i>=0;i--)if(ALL_TESTS[i].serverBacked)ALL_TESTS.splice(i,1);
    (tests||[]).forEach(function(test){ALL_TESTS.push(Object.assign({},test,{catalogHidden:!test.published&&test.createdBy!==CUR_USER?.id}));});
    CATALOG_DIVERSITY_CACHE.clear();
    if(typeof renderStudentTests==='function'&&document.getElementById('p-student')?.classList.contains('active'))renderStudentTests();
    if(typeof renderTeacherTests==='function'&&document.getElementById('p-teacher')?.classList.contains('active'))renderTeacherTests();
    if(typeof renderAssignPanel==='function')renderAssignPanel();
  }
  async function loadServerCatalog(force){
    var userKey=CUR_USER?.email||'public';
    if(!force&&catalogUserKey===userKey&&ALL_TESTS.some(function(test){return test.serverBacked;}))return;
    catalogUserKey=userKey;
    try{
      var response=await fetch('/api/assessments/catalog',{credentials:'same-origin',headers:{'Accept':'application/json'}});
      var data=await response.json().catch(function(){return{};});
      if(!response.ok)throw new Error(data.error||'ტესტების კატალოგი ვერ ჩაიტვირთა');
      installCatalog(data.tests||[]);
    }catch(error){setCatalogMessage(error.message||'ტესტების კატალოგი დროებით მიუწვდომელია.');}
  }

  function adaptQuestion(question){
    var q=Object.assign({},question,{_kaText:question.text,_kaOpts:Array.isArray(question.opts)?question.opts.slice():[]});
    if(q.type==='match'){
      q.pairs=(q.leftItems||[]).map(function(left){return[left,''];});
      q.correct=(q.rightOptions||[]).slice();
    }
    return q;
  }
  var originalStartTest=startTest;
  startTest=async function(){
    if(!curTest?.serverBacked){
      if(curTest){alert('ეს ძველი ტესტი აღარ არის აქტიური. აირჩიეთ განახლებული კატალოგის ტესტი.');go(curRole==='teacher'?'teacher':'student');return;}
      return originalStartTest();
    }
    if(!CUR_USER){go('login');return;}
    if(window.applyTestAgeMode)applyTestAgeMode(curTest);
    if(window.resetQuestionSpeech)resetQuestionSpeech();
    var text=document.getElementById('q-text');if(text)text.textContent='ტესტი იტვირთება…';
    var options=document.getElementById('q-opts');if(options)options.replaceChildren();
    try{
      var response=await fetch('/api/assessments/start',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({testId:curTest.id})});
      var data=await response.json().catch(function(){return{};});
      if(!response.ok)throw new Error(data.error||'ტესტი ვერ დაიწყო');
      serverSessionId=data.sessionId;curTestQs=(data.questions||[]).map(adaptQuestion);qIdx=0;qAnswers={};_tabSwitchCount=0;
      if(data.test){curTest.count=Number(data.test.count||curTestQs.length);if(data.test.componentCounts)curTest.componentCounts=data.test.componentCounts;}
      if(timerInt)clearInterval(timerInt);timerSec=Number(curTest.time||data.test?.time||20)*60;
      document.getElementById('timer').style.display='';document.getElementById('tt-title').textContent=curTest.title;
      renderQ();buildDots();updateTimer();
      timerInt=setInterval(function(){timerSec--;updateTimer();if(timerSec<=0){clearInterval(timerInt);finishTest();}},1000);
    }catch(error){alert(error.message||'ტესტი ვერ დაიწყო');go(curRole==='teacher'?'teacher':'student');}
  };

  function adaptReviewed(question){
    var q=adaptQuestion(question),answer=question.correctDisplay;
    if(q.type==='multiple_choice'||q.type==='true_false')q.correct=Math.max(0,(q.opts||[]).findIndex(function(option){return String(option)===String(answer);}));
    else if(q.type==='calc')q.correct=answer;
    else if(q.type==='order')q.correct=Array.isArray(answer)?answer:[];
    else if(q.type==='match'){
      var pairs=Array.isArray(answer)?answer:[];q.pairs=pairs;q.correct=pairs.map(function(pair){return pair[1];});
    }else if(q.type==='fill')q.blanks=Array.isArray(answer)?answer:[];
    delete q.correctDisplay;return q;
  }
  finishTest=async function(){
    if(!curTest?.serverBacked)return;
    if(serverSubmitting)return;serverSubmitting=true;hideSubmitModal();
    try{
      var response=await fetch('/api/assessments/submit',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({sessionId:serverSessionId,answers:qAnswers})});
      var data=await response.json().catch(function(){return{};});
      if(!response.ok)throw new Error(data.error||'პასუხები ვერ ჩაიბარა სერვერმა');
      if(timerInt)clearInterval(timerInt);
      var result=data.result||{};result.reviewed=(result.reviewed||[]).map(adaptReviewed);result.userId=CUR_USER?.email||'guest';result.userGrade=Number(CUR_USER?.grade||result.grade||1);result.badge=performanceBadgeLabel(Number(result.pct||0));result.bc=result.pct>=90?'b-blue':result.pct>=70?'b-green':result.pct>=50?'b-amber':'b-red';result.xpEarned=0;
      SESSION_RESULTS.unshift(result);saveResults();_lastResult=result;_lastResult=result;renderResultsPage(result);go('results');
      if(window.maybeAutoSpeakResult)setTimeout(function(){maybeAutoSpeakResult(result);},120);
    }catch(error){alert(error.message||'პასუხები ვერ ჩაიბარა სერვერმა. სცადეთ ხელახლა.');}
    finally{serverSubmitting=false;}
  };

  renderBuilderPicker=async function(){
    var picker=document.getElementById('q-picker');if(!picker)return;
    picker.replaceChildren();var loading=document.createElement('div');loading.style.cssText='padding:16px;color:var(--gray)';loading.textContent='კითხვები იტვირთება…';picker.appendChild(loading);
    try{
      var grade=Number(document.getElementById('b-grade')?.value),subject=document.getElementById('b-subj')?.value||'';
      var response=await fetch('/api/assessments/questions?grade='+encodeURIComponent(grade)+'&subject='+encodeURIComponent(subject)+'&limit=100',{credentials:'same-origin'});
      var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'კითხვები ვერ ჩაიტვირთა');
      picker.replaceChildren();if(!(data.questions||[]).length){var empty=document.createElement('div');empty.style.cssText='padding:16px;color:var(--gray)';empty.textContent='ამ კლასისა და საგნისთვის კითხვები ვერ მოიძებნა.';picker.appendChild(empty);return;}
      data.questions.forEach(function(q){
        var label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:flex-start;padding:8px;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer';
        var input=document.createElement('input');input.type='checkbox';input.style.width='auto';input.checked=_builderSelection.some(function(item){return item.id===q.id;});
        input.addEventListener('change',function(){if(input.checked)_builderSelection.push(q);else _builderSelection=_builderSelection.filter(function(item){return item.id!==q.id;});var count=document.getElementById('sel-count');if(count)count.textContent=String(_builderSelection.length);});
        var text=document.createElement('span');text.textContent=q.text||'';label.append(input,text);picker.appendChild(label);
      });
    }catch(error){picker.replaceChildren();var failed=document.createElement('div');failed.style.cssText='padding:16px;color:var(--red)';failed.textContent=error.message||'კითხვები ვერ ჩაიტვირთა.';picker.appendChild(failed);}
  };
  bNav=async function(direction){
    if(direction<0){_builderStep=Math.max(1,_builderStep-1);updateBuilderStep();return;}
    if(_builderStep===1){if(!(document.getElementById('b-title')?.value||'').trim()){alert('შეიყვანეთ ტესტის სათაური.');return;}_builderStep=2;updateBuilderStep();return;}
    if(_builderStep===2){if(!_builderSelection.length){alert('აირჩიეთ მინიმუმ ერთი კითხვა.');return;}_builderStep=3;updateBuilderStep();return;}
    var button=document.getElementById('b-next');if(button){button.disabled=true;button.textContent='ინახება…';}
    try{
      var payload={title:(document.getElementById('b-title')?.value||'').trim(),subject:document.getElementById('b-subj')?.value,grade:Number(document.getElementById('b-grade')?.value),durationMinutes:Number(document.getElementById('b-time')?.value)||20,attemptsAllowed:Number(document.getElementById('b-att')?.value)||1,published:!!document.getElementById('b-pub')?.checked,questionIds:_builderSelection.map(function(q){return q.id;})};
      var response=await fetch('/api/assessments/builder',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'ტესტი ვერ შეიქმნა');
      ALL_TESTS.push(data.test);hideBuilder();renderTeacherTests();renderAssignPanel();alert('ტესტი შეიქმნა და უსაფრთხოდ შეინახა.');
    }catch(error){alert(error.message||'ტესტი ვერ შეიქმნა');}finally{if(button){button.disabled=false;button.textContent='✓ ტესტის შექმნა';}}
  };
  var oldOpenEditor=openQEditor;
  openQEditor=function(testId){var test=ALL_TESTS.find(function(item){return item.id===testId;});if(test?.serverBacked){alert('ამ ტესტის კითხვები დაცულ სერვერულ ბანკშია. ცვლილებისთვის შექმენით ახალი ტესტი ბილდერიდან.');return;}oldOpenEditor(testId);};
  adminDeleteTest=async function(testId){
    var test=ALL_TESTS.find(function(item){return item.id===testId;});if(!test?.serverBacked||!test.teacherCreated){alert('სტანდარტული კურიკულუმის ტესტი ვერ წაიშლება.');return;}if(!confirm('წაიშალოს ტესტი?'))return;
    var response=await fetch('/api/assessments/builder?id='+encodeURIComponent(testId),{method:'DELETE',credentials:'same-origin'});if(!response.ok){alert('ტესტი ვერ წაიშალა.');return;}var index=ALL_TESTS.findIndex(function(item){return item.id===testId;});if(index>=0)ALL_TESTS.splice(index,1);renderTeacherTests();renderAssignPanel();
  };

  loadPublicStats=async function(){
    var status=document.getElementById('lp-live-status');if(status){status.textContent='რეალური მონაცემები იტვირთება…';status.setAttribute('aria-busy','true');}
    try{
      var response=await fetch('/api/public/stats',{headers:{'Accept':'application/json'}}),data=await response.json();if(!response.ok)throw new Error();
      var values={'lp-question-count':data.questions,'lp-test-count':data.tests,'lp-subject-count':data.subjects,'lp-today-tests':data.todayTests,'lp-excellent':data.excellentBadges,'lp-average-score':data.averageScore};
      Object.keys(values).forEach(function(id){var value=Math.max(0,Number(values[id])||0),el=document.getElementById(id),legacy=document.getElementById(id+'-legacy');if(el)el.textContent=value.toLocaleString('ka-GE');if(legacy)legacy.textContent=value.toLocaleString('ka-GE');});
      if(status){status.textContent=Number(data.todayTests||0)?'მონაცემები განახლებულია რეალური აქტივობიდან.':'დღეს ჯერ დასრულებული ტესტი არ დაფიქსირებულა.';status.removeAttribute('aria-busy');}
    }catch(error){['lp-question-count','lp-test-count','lp-subject-count','lp-today-tests','lp-excellent','lp-average-score'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent='—';});if(status){status.textContent='რეალური მაჩვენებლები დროებით მიუწვდომელია.';status.removeAttribute('aria-busy');}}
  };

  var previousGo=go;
  go=function(page){var result=previousGo(page);if(page==='student'||page==='teacher'||page==='admin')loadServerCatalog(false);return result;};
  document.addEventListener('DOMContentLoaded',function(){loadServerCatalog(true);loadPublicStats();});
})();
