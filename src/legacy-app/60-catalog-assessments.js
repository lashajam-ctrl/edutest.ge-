const SCHOOL_SUBJECTS_BY_GRADE=globalThis.EduTestSchoolRules.subjectsByGrade;
function subjectFamily(value){
  const subject=String(value||'').trim();
  if(['ალგებრა','გეომეტრია'].includes(subject))return 'მათემატიკა';
  if(['ქართული ენა','ქართული ლიტ.','ქართული ლიტერატურა'].includes(subject))return 'ქართული ენა და ლიტერატურა';
  if(['ინგლ. ლიტ.','ინგლ. გრამ.','ინგლისური ლიტერატურა','ინგლისური გრამატიკა'].includes(subject))return 'ინგლისური';
  if(['რუს. გრამ.','მეორე უცხოური — რუსული'].includes(subject))return 'რუსული';
  return subject;
}
function subjectsForGrade(grade){return (SCHOOL_SUBJECTS_BY_GRADE[Number(grade)]||[]).slice();}
function populateBuilderSubjects(){
  const select=document.getElementById('b-subj'),grade=Number(document.getElementById('b-grade')?.value||1);if(!select)return;
  const current=subjectFamily(select.value),allowed=subjectsForGrade(grade);select.replaceChildren(...allowed.map(subject=>new Option(subject,subject,false,subject===current)));
}
function populateSubjectDropdown(selId){
  const sel=document.getElementById(selId);if(!sel)return;
  const curVal=subjectFamily(sel.dataset.realVal||sel.value),catalogSubjects=[...new Set(ALL_TESTS.filter(test=>test&&test.serverBacked===true).map(test=>subjectFamily(test.subject)).filter(Boolean))];
  const fallbackGrade=Number(CUR_USER?.grade||0),values=(catalogSubjects.length?catalogSubjects:(fallbackGrade?subjectsForGrade(fallbackGrade):[...new Set(Object.values(SCHOOL_SUBJECTS_BY_GRADE).flat())])).sort((a,b)=>a.localeCompare(b,'ka'));
  sel.replaceChildren(new Option(t('all_subjects'),''),...values.map(value=>new Option(value,value,false,value===curVal)));
}
function renderStudentTests(){
  populateSubjectDropdown('s-filter-subject');
  const subj=document.getElementById('s-filter-subject')?.value||'';
  let grade=document.getElementById('s-filter-grade')?.value||'';
  const semFilter=document.getElementById('s-filter-semester')?.value||'';
  const typeFilter=document.getElementById('s-filter-testtype')?.value||'';
  const userGradeNum=CUR_USER?.grade?parseInt(CUR_USER.grade):null;
  // Match the server policy: own grade and one adjacent grade in either direction.
  const gradeDropdown=document.getElementById('s-filter-grade');
  if(gradeDropdown&&userGradeNum){
    const curVal=gradeDropdown.value;
    gradeDropdown.innerHTML='<option value="">'+t('all_grades')+'</option>';
    const minGrade=Math.max(1,userGradeNum-1),maxGrade=Math.min(12,userGradeNum+1);
    for(let g=minGrade;g<=maxGrade;g++){
      const opt=document.createElement('option');
      opt.value=g; opt.textContent=g+' '+t('class_label');
      if(String(g)===curVal)opt.selected=true;
      gradeDropdown.appendChild(opt);
    }
    if(grade&&Math.abs(parseInt(grade)-userGradeNum)>1){
      gradeDropdown.value=String(userGradeNum);
      grade=String(userGradeNum);
    }
  }
  if(!grade&&userGradeNum)grade=String(userGradeNum);
  const list=document.getElementById('s-test-list');if(!list)return;
  let tests=ALL_TESTS.filter(tx=>tx&&tx.serverBacked===true);
  if(userGradeNum) tests=tests.filter(tx=>Math.abs(Number(tx.grade)-userGradeNum)<=1);
  if(subj)tests=tests.filter(test=>subjectFamily(test.subject)===subjectFamily(subj));
  if(grade)tests=tests.filter(t=>t.grade===parseInt(grade));
  if(semFilter)tests=tests.filter(t=>String(t.semester)===semFilter);
  const availableTypes=[...new Set(tests.map(tx=>globalThis.EduTestSchoolRules.canonicalTestType(tx.testType)))];
  const typeSelect=document.getElementById('s-filter-testtype');
  if(typeSelect){
    const requested=globalThis.EduTestSchoolRules.canonicalTestType(typeFilter);
    const labels={practice:'სავარჯიშო',sum:'შემაჯამებელი'};
    typeSelect.replaceChildren(new Option('ყველა ტიპი',''),...availableTypes.map(value=>new Option(labels[value]||value,value,false,value===requested)));
    if(requested&&!availableTypes.includes(requested)){const unavailable=new Option((labels[requested]||requested)+' — ამ ფილტრით არ არის',requested,true,true);unavailable.disabled=true;typeSelect.append(unavailable);}
  }
  if(typeFilter)tests=tests.filter(tx=>globalThis.EduTestSchoolRules.canonicalTestType(tx.testType)===globalThis.EduTestSchoolRules.canonicalTestType(typeFilter));
  const hdr=document.querySelector('#s-tests > div > div:first-child');
  if(hdr){const gN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];hdr.textContent=userGradeNum?t('tests_label')+' — '+gN[userGradeNum-1]+' '+t('class_label'):t('grade_label_roman');}
  if(!tests.length){
    const state=window.EDUTEST_CATALOG_STATE||'loading';
    const message=state==='loading'?'ტესტების კატალოგი იტვირთება…':state==='error'?'ტესტების კატალოგი დროებით ვერ ჩაიტვირთა. განაახლეთ გვერდი და სცადეთ ხელახლა.':t('no_tests');
    list.replaceChildren();const empty=document.createElement('div');empty.style.cssText='text-align:center;color:var(--gray);padding:40px 20px';empty.setAttribute('role','status');
    empty.textContent=state==='ready'?'არჩეული ფილტრების კომბინაციით ტესტი არ არის. ეს არ ნიშნავს, რომ კითხვების ბანკი ცარიელია.':message;list.append(empty);
    if(state==='ready'){
      const reset=document.createElement('button');reset.type='button';reset.className='btn btn-outline';
      reset.textContent=typeFilter&&availableTypes.length?'ამ საგნის ხელმისაწვდომი ტიპების ჩვენება':'ფილტრების გასუფთავება';
      reset.addEventListener('click',()=>{if(typeFilter&&availableTypes.length){if(typeSelect)typeSelect.value='';}else{['s-filter-subject','s-filter-semester','s-filter-testtype'].forEach(id=>{const control=document.getElementById(id);if(control)control.value='';});}renderStudentTests();});empty.append(document.createElement('br'),reset);
    }
    return;
  }
  list.innerHTML=tests.map(tx=>`
    <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px">
      <div style="width:44px;height:44px;border-radius:10px;background:${SUBJ_COLORS[tx.subject]||'#6366f1'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${SUBJ_ICONS[tx.subject]||'📝'}</div>
      <div style="flex:1"><div style="font-weight:600;margin-bottom:6px">${esc(txTitle(tx))}<span class="ver-badge">🔐 გონივრული შერჩევა</span></div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">⏱ ${Number(tx.time)||0} ${t('min_abbr')}</span><span class="chip">❓ ${Number(tx.count)||0} ${t('q_label')}</span>${tx.semester?`<span class="chip" style="background:#ede9fe;color:#5b21b6">📅 ${tx.semester===1?t('sem1'):tx.semester===2?t('sem2'):''}</span>`:''}${tx.testType==='sum'?`<span class="chip" style="background:#fef3c7;color:#92400e">📋 ${t('test_sum')}</span>`:''}${(()=>{const a=getTestAccess(CUR_USER?.email||'',tx.id);if(a==='free')return'<span class="chip" style="background:#d1fae5;color:#065f46">🆓 უფასო ტესტი</span>';if(a==='locked')return`<span class="chip" style="background:#fef3c7;color:#92400e">💳 ${fmtPrice('perSubject')}</span>`;if(a==='premium')return'<span class="chip" style="background:#ede9fe;color:#5b21b6">⭐ Premium</span>';return'<span class="chip" style="background:#dbeafe;color:#1e40af">✅ შეძენილი</span>';})()}</div></div>
      ${(()=>{const acc=getTestAccess(CUR_USER?.email||'',tx.id);if(acc==='locked')return`<button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none;cursor:pointer" onclick="showPayModal('${tx.id}')">💳 ${fmtPrice('perSubject')}</button>`;if(acc==='free')return`<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none;cursor:pointer" onclick="startTestById('${tx.id}')">🆓 ${t('start_test')}</button>`;return`<button class="btn btn-primary btn-sm" onclick="startTestById('${tx.id}')">🚀 ${t('start_test')}</button>`;})()}
    </div>`).join('');
}

// ── Teacher Tests Table ───────────────────────────────────────────────────────
function renderTeacherTests(){
  populateSubjectDropdown('t-filter-subject');
  const subj=document.getElementById('t-filter-subject')?.value||'';
  const grade=document.getElementById('t-filter-grade')?.value||'';
  const tbody=document.getElementById('t-test-tbody');if(!tbody)return;
  let tests=ALL_TESTS.filter(tx=>tx&&tx.serverBacked===true);
  if(subj)tests=tests.filter(test=>subjectFamily(test.subject)===subjectFamily(subj));
  if(grade)tests=tests.filter(t=>t.grade===parseInt(grade));
  if(!tests.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:24px">'+t('no_tests')+'</td></tr>';return;}
  tbody.innerHTML=tests.map(tx=>`
    <tr>
      <td style="font-weight:500">${esc(txTitle(tx))}</td>
      <td><span class="chip">${SUBJ_ICONS[subjectFamily(tx.subject)]||''} ${esc(subjectFamily(tx.subject))}</span></td>
      <td><span style="display:inline-flex;width:26px;height:26px;border-radius:50%;background:#dbeafe;color:#1d4ed8;align-items:center;justify-content:center;font-weight:700;font-size:11px">${tx.grade}</span></td>
      <td>${tx.count}</td>
      <td>${tx.paid?'<span class="badge b-amber">💳 '+t('paid')+'</span>':'<span class="badge b-green">'+t('plan_free')+'</span>'}</td>
      <td style="display:flex;gap:4px"><button class="btn btn-ghost btn-sm" aria-label="ტესტის წინასწარი ნახვა" onclick="startTestById('${tx.id}')">▶</button><button class="btn btn-ghost btn-sm" aria-label="უსაფრთხო ტესტის შექმნა" onclick="showBuilder()" title="უსაფრთხო ტესტის შექმნა">✨</button><button class="btn btn-ghost btn-sm" aria-label="ტესტის წაშლა" style="color:var(--red)" onclick="adminDeleteTest('${tx.id}')">🗑</button></td>
    </tr>`).join('');
}

// ── Student Results ───────────────────────────────────────────────────────────
function renderStudentResults(){
  const el=document.getElementById('s-results-list');if(!el)return;
  const uid=CUR_USER?.email||'';
  const mine=SESSION_RESULTS.filter(r=>r.userId===uid);
  if(!mine.length){el.innerHTML='<div style="text-align:center;color:var(--gray);padding:40px">'+t('no_result_taken')+'</div>';return;}
  el.innerHTML=mine.map(r=>`
    <div class="card" style="padding:16px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div><div style="font-weight:600">${esc(rTitle(r))}</div><div style="font-size:11px;color:var(--gray)">${esc(String(r.date||''))}</div></div>
        <span class="badge ${r.bc}">${performanceBadgeLabel(r.pct)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${r.earned}/${r.totalPts} ${t('pts_label')} · ${r.correct}/${r.total} ${t('correct')}</span><span style="font-weight:600;color:var(--blue)">${r.pct}%</span></div>
      <div class="pbar"><div class="pfill" style="width:${r.pct}%;background:${r.pct>=90?'#2563eb':r.pct>=70?'#16a34a':r.pct>=50?'#d97706':'#dc2626'}"></div></div>
    </div>`).join('');
}

// ── Test Taking / Assignments ────────────────────────────────────────────────
// Assignments are authoritative server objects created by the Server-side Builder.
let ASSIGNMENTS=[];
function saveAssignments(){}
function getMyAssignments(){return [];}
function createAssignment(){alert('🔐 დავალება შექმენით უსაფრთხო ტესტის შემქმნელიდან — იქვე მიუთითეთ კლასი და ვადა.');showBuilder();}
function deleteAssignment(){alert('სერვერული დავალების წასაშლელად გამოიყენეთ ტესტების სია.');}
async function renderAssignmentsList(){
  const el=document.getElementById('t-assign-list');if(!el)return;
  try{const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'list_mine'});const rows=d.tests||[];
    if(!rows.length){el.innerHTML='<div style="color:var(--gray);text-align:center;padding:20px">სერვერული დავალებები არ არის</div>';return;}
    el.innerHTML=rows.map(a=>`<div style="padding:10px 14px;border:1px solid var(--border);border-radius:var(--r);margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(a.title||a.id)}</div><div style="font-size:11px;color:var(--gray)">📚 ${esc(a.subject||'')} · ${esc(String(a.grade||''))} კლ.${a.dueAt?' · ⏰ '+esc(a.dueAt.slice(0,10)):''}</div><div style="font-size:10px;color:#1d4ed8;margin-top:2px">🔐 server-verified</div></div><button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:none" onclick="adminDeleteTest('${a.id}')">🗑</button></div>`).join('');
  }catch(e){el.innerHTML='<div style="color:var(--gray);text-align:center;padding:20px">სერვერული დავალებების ჩატვირთვა ვერ მოხერხდა</div>';}
}
function renderAssignPanel(){renderAssignmentsList();}

async function renderAssignedTests(){
  if(!CUR_USER)return;const el=document.getElementById('s-assigned-tests');if(!el)return;
  try{const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'my_assignments'});const mine=d.tests||[];mine.forEach(t=>{if(!ALL_TESTS.some(x=>x.id===t.id))ALL_TESTS.push(t);});if(!mine.length){el.innerHTML='';return;}el.innerHTML=`<div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#1d4ed8">📋 მასწავლებლის დავალებები (${mine.length})</div>`+mine.map(a=>`<div style="padding:10px 14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:var(--r);margin-bottom:8px;display:flex;align-items:center;gap:12px"><div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(a.title||a.id)}</div><div style="font-size:11px;color:#3b82f6">🔐 server-verified${a.dueAt?' · ⏰ '+esc(a.dueAt.slice(0,10)):''}</div></div><button class="btn btn-primary btn-sm" onclick="startAssignedTest('${a.id}')">▶ დაწყება</button></div>`).join('');}catch(e){console.warn('assignments',e);el.innerHTML='';}
}
function startAssignedTest(id){
  // Bypass payment gate for teacher-assigned tests
  const tx=ALL_TESTS.find(t=>t.id===id)||null;
  if(!tx)return;
  curTest=tx;
  window._practiceMode=false;
  go('take-test');
}
function startTestById(id,practice=false){
  if(!id)return;
  curTest=ALL_TESTS.find(t=>t.id===id)||null;
  if(!curTest)return;
  const email=CUR_USER?.email||'';
  const access=getTestAccess(email,id);
  if(access==='locked'){
    showPayModal(id);
    return;
  }
  window._practiceMode=!!practice;
  go('take-test');
}

function renderOnboardingIfNeeded(){
  if(!CUR_USER)return;
  const key='edutest_onboard_'+CUR_USER.email;
  try{if(localStorage.getItem(key)==='done')return;}catch(e){}
  const mine=SESSION_RESULTS.filter(r=>r.userId===CUR_USER.email);
  if(mine.length>0){try{localStorage.setItem(key,'done');}catch(e){}return;}
  const cont=document.getElementById('s-home');
  if(!cont||document.getElementById('s-onboard-banner'))return;
  const banner=document.createElement('div');
  banner.id='s-onboard-banner';
  banner.style.cssText='background:linear-gradient(135deg,#dbeafe,#ede9fe);border-radius:14px;padding:18px 20px;margin-bottom:18px;position:relative';
  const name=CUR_USER.name||'';
  const lang=window._lang||'ka';
  const greet   = lang==='ru'?'Добро пожаловать, ':lang==='en'?'Welcome, ':'გამარჯობა, ';
  const sub     = lang==='ru'?'в EduTest!':lang==='en'?'to EduTest!':'EduTest-ზე!';
  const task1   = lang==='ru'?'Пройди первый тест':lang==='en'?'Take your first test':'ჩაატარე შენი პირველი ტEST';
  const goBtn   = lang==='ru'?'Тесты →':lang==='en'?'Tests →':'ტEST-ები →';
  const task2   = lang==='ru'?'Используй Freeze Token':lang==='en'?'Use a Freeze Token':'გამოიყენე Streak Freeze Token';
  banner.innerHTML=
    '<button onclick="dismissOnboarding()" style="position:absolute;top:10px;right:12px;background:none;border:none;font-size:18px;cursor:pointer;color:#6b7280">✕</button>'
    +'<div style="font-size:28px;margin-bottom:8px">👋</div>'
    +'<div style="font-weight:700;font-size:16px;color:#1d4ed8;margin-bottom:6px">'+greet+name+'!</div>'
    +'<div style="font-size:13px;color:#374151;margin-bottom:14px">'+sub+'</div>'
    +'<div style="padding:8px 12px;background:rgba(255,255,255,.8);border-radius:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
    +'<span style="font-size:20px">🚀</span><div style="flex:1"><div style="font-weight:600">'+task1+'</div></div>'
    +'<button class="btn btn-primary btn-sm" onclick="dismissOnboarding();sNav(\'s-tests\',null)">'+goBtn+'</button></div>'
    +'<div style="padding:8px 12px;background:rgba(255,255,255,.8);border-radius:8px;display:flex;align-items:center;gap:10px">'
    +'<span style="font-size:20px">🔥</span><div><div style="font-weight:600">'+task2+'</div></div></div>';
  const fc=cont.firstElementChild;
  if(fc)cont.insertBefore(banner,fc);else cont.appendChild(banner);
}

function dismissOnboarding(){const b=document.getElementById('s-onboard-banner');if(b)b.remove();if(CUR_USER){try{localStorage.setItem('edutest_onboard_'+CUR_USER.email,'done');}catch(e){}}}

function useStreakFreeze(){if(!CUR_USER)return;const n=getFreezesAvailable(CUR_USER.email);if(n<=0){showXpToast('🧊 Freeze token არ გაქვს',null);return;}if(!confirm(t('freeze_confirm')||('გამოიყენო Streak Freeze? დარჩება: '+(n-1))))return;useFreeze(CUR_USER.email);showXpToast('🧊 Streak Freeze გამოიყენა!',null);updateStudentHomeStats();}

function startPractice(test){
  window._practiceMode=true;
  startTestById(test.id);
}
function startExam(test){
  window._practiceMode=false;
  startTestById(test.id);
}

async function startTest(){
  _tabSwitchCount=0;if(!curTest){go(curRole==='teacher'?'teacher':'student');return;}setTestLoading('🔐 უსაფრთხო ტესტი სერვერიდან იტვირთება…');
  try{
    const mode=window._practiceMode?'practice':'verified';const data=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.startFunction,{test_id:curTest.id,mode});curAssessmentSessionId=data.session_id;curTest={...curTest,...(data.test||{})};curTestQs=data.questions||[];if(!curTestQs.length)throw new Error('NO_QUESTIONS');
    if(window._practiceMode){timerSec=9999*60;document.getElementById('timer').style.display='none';const pb=document.getElementById('tt-practice-badge');if(pb)pb.classList.remove('hidden');}
    else{document.getElementById('timer').style.display='';const pb=document.getElementById('tt-practice-badge');if(pb)pb.classList.add('hidden');timerSec=(Number(curTest.time)||20)*60;}
    qIdx=0;qAnswers={};if(timerInt)clearInterval(timerInt);const ttl=document.getElementById('tt-title');if(ttl)ttl.textContent=curTest.title;renderQ();buildDots();timerInt=setInterval(()=>{timerSec--;updateTimer();if(timerSec<=0){clearInterval(timerInt);finishTest();}},1000);
  }catch(e){alert('ტესტი ვერ ჩაიტვირთა: '+assessmentErrorMessage(e&&e.message));go('student');}
}

function updateTimer(){
  const m=Math.floor(timerSec/60),s=timerSec%60;
  const el=document.getElementById('timer');if(!el)return;
  el.textContent=m+':'+(s<10?'0':'')+s;
  el.className='timer'+(timerSec<30?' red':timerSec<60?' amb':'');
}

const GRADE_THEME_CLASSES=['grade-band-early','grade-band-primary','grade-band-middle','grade-band-senior'];
function clearGradeTheme(){GRADE_THEME_CLASSES.forEach(name=>document.body.classList.remove(name));}
function gradeThemeFor(value){
  const grade=parseInt(String(value??''),10);
  if(!Number.isInteger(grade))return null;
  if(grade<=2)return {name:'grade-band-early',mascot:'🌞',title:'შენ ეს შეგიძლია!',hint:'ყურადღებით ნახე და მონიშნე ერთი პასუხი.'};
  if(grade<=6)return {name:'grade-band-primary',mascot:'🌱',title:'იფიქრე ნაბიჯ-ნაბიჯ',hint:'წაიკითხე პირობა და მშვიდად აირჩიე საუკეთესო პასუხი.'};
  if(grade<=9)return {name:'grade-band-middle',mascot:'🧭',title:'ყურადღებით გააანალიზე',hint:'შეადარე ვარიანტები და გადაწყვეტილება შემდეგ მიიღე.'};
  return {name:'grade-band-senior',mascot:'🎓',title:'შეაფასე და დაასაბუთე',hint:'გამოიყენე ცოდნა, ლოგიკა და დეტალებზე დაკვირვება.'};
}
function applyGradeTheme(value){
  const theme=gradeThemeFor(value);clearGradeTheme();if(!theme)return null;
  document.body.classList.add(theme.name);return theme;
}
function applyTestAgeMode(test){
  const theme=applyGradeTheme(test?.grade??CUR_USER?.grade);if(!theme)return;
  document.body.classList.add('test-age-theme');
  const mascot=document.getElementById('q-grade-mascot'),title=document.getElementById('q-grade-title'),hint=document.getElementById('q-grade-hint');
  if(mascot)mascot.textContent=theme.mascot;if(title)title.textContent=theme.title;if(hint)hint.textContent=theme.hint;
}

function renderQ(){
  const qs=curTestQs;const q=qs[qIdx];if(!q)return;
  document.getElementById('q-num').textContent=qIdx+1;
  const ofSep=LANG==='ka'?' '+t('of'):' '+t('of')+' ';document.getElementById('q-counter').textContent=t('question')+' '+(qIdx+1)+ofSep+qs.length;
  document.getElementById('q-prog').style.width=(((qIdx+1)/qs.length)*100)+'%';
  document.getElementById('q-type-badge').textContent=q.type==='multiple_choice'?'MCQ':q.type==='true_false'?'T/F':q.type==='calc'?'🧮':q.type==='order'?'🔀':q.type==='match'?'🔗':q.type==='fill'?'✏️':'Short';
  document.getElementById('q-pts-badge').textContent=q.pts+' '+t('pts_label');
  const _qtEl=document.getElementById('q-text');
  _qtEl.textContent=qTransText(q);
  // Read-aloud button
  if(window.isTTSOn&&isTTSOn()){
    const _raBtn=document.createElement('button');
    _raBtn.className='read-aloud-btn';_raBtn.textContent=' 🔊';_raBtn.title='მოსმენა';_raBtn.setAttribute('aria-label','კითხვის ხმამაღლა მოსმენა');
    _raBtn.onclick=function(e){e.stopPropagation();speakText(qTransText(q));};
    _qtEl.appendChild(_raBtn);
  }
  const opts=document.getElementById('q-opts');opts.innerHTML='';
  if(q.type==='short_answer'){
    const ta=document.createElement('textarea');ta.rows=4;ta.placeholder=t('enter_ans');ta.style.cssText='width:100%;padding:10px;border:1.5px solid var(--border);border-radius:var(--r);font-family:inherit;font-size:13px;resize:vertical';
    ta.value=qAnswers[q.id]||'';ta.oninput=e=>qAnswers[q.id]=e.target.value;opts.appendChild(ta);
  }else if(q.type==='calc'){
    const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:12px';
    const hint=document.createElement('div');hint.style.cssText='font-size:12px;color:var(--gray);padding:8px 12px;background:#f0f9ff;border-radius:var(--r);border:1px solid #bae6fd';
    hint.textContent='🧮 ჩაწერეთ რიცხვითი პასუხი';
    const inp=document.createElement('input');inp.type='number';inp.placeholder='0';
    inp.style.cssText='width:100%;max-width:220px;padding:14px;border:2px solid var(--primary);border-radius:var(--r);font-size:22px;font-weight:700;text-align:center';
    inp.value=qAnswers[q.id]!==undefined?qAnswers[q.id]:'';
    inp.oninput=e=>{const v=parseFloat(e.target.value);qAnswers[q.id]=isNaN(v)?undefined:v;updateDots();};
    wrap.appendChild(hint);wrap.appendChild(inp);opts.appendChild(wrap);
  }else if(q.type==='order'){
    let curOrder;
    if(qAnswers[q.id]){
      curOrder=[...qAnswers[q.id]];
    }else{
      if(!q._startOrder){
        q._startOrder=[...q.items];
        for(let i=q._startOrder.length-1;i>0;i--){
          const j=Math.floor(Math.random()*(i+1));
          [q._startOrder[i],q._startOrder[j]]=[q._startOrder[j],q._startOrder[i]];
        }
      }
      curOrder=[...q._startOrder];
    }
    const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:8px';
    const hint=document.createElement('div');hint.style.cssText='font-size:12px;color:var(--gray);padding:8px 12px;background:#f0f9ff;border-radius:var(--r);border:1px solid #bae6fd';
    hint.textContent='🔀 გადააადგილეთ სწორი თანმიმდევრობით';
    wrap.appendChild(hint);
    const renderItems=()=>{
      while(wrap.children.length>1)wrap.removeChild(wrap.lastChild);
      curOrder.forEach((item,i)=>{
        const row=document.createElement('div');
        row.draggable=true;row.dataset.idx=i;
        row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);cursor:grab;user-select:none;transition:opacity .2s';
        row.innerHTML='<span style="color:var(--gray);font-size:18px;cursor:grab">⠿</span><span style="font-weight:700;min-width:22px;color:var(--primary)">'+(i+1)+'.</span><span style="flex:1">'+item+'</span>';
        row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(i));row.style.opacity='0.4';});
        row.addEventListener('dragend',()=>{row.style.opacity='1';});
        row.addEventListener('dragover',e=>{e.preventDefault();row.style.borderColor='var(--primary)';});
        row.addEventListener('dragleave',()=>{row.style.borderColor='var(--border)';});
        row.addEventListener('drop',e=>{
          e.preventDefault();row.style.borderColor='var(--border)';
          const from=parseInt(e.dataTransfer.getData('text/plain'));
          const to=parseInt(row.dataset.idx);
          if(from===to)return;
          const [mv]=curOrder.splice(from,1);curOrder.splice(to,0,mv);
          qAnswers[q.id]=[...curOrder];renderItems();updateDots();
        });
        // Mobile touch fallback: Up/Down buttons
        const btnUp=document.createElement('button');btnUp.textContent='↑';
        btnUp.style.cssText='background:none;border:1px solid var(--border);border-radius:4px;padding:2px 6px;cursor:pointer;display:none';
        const btnDn=document.createElement('button');btnDn.textContent='↓';
        btnDn.style.cssText='background:none;border:1px solid var(--border);border-radius:4px;padding:2px 6px;cursor:pointer;display:none';
        if('ontouchstart' in window){btnUp.style.display='block';btnDn.style.display='block';row.draggable=false;}
        btnUp.onclick=()=>{if(i===0)return;const[a]=curOrder.splice(i,1);curOrder.splice(i-1,0,a);qAnswers[q.id]=[...curOrder];renderItems();updateDots();};
        btnDn.onclick=()=>{if(i===curOrder.length-1)return;const[a]=curOrder.splice(i,1);curOrder.splice(i+1,0,a);qAnswers[q.id]=[...curOrder];renderItems();updateDots();};
        const btnWrap=document.createElement('div');btnWrap.style.cssText='display:flex;flex-direction:column;gap:2px';
        btnWrap.appendChild(btnUp);btnWrap.appendChild(btnDn);
        row.appendChild(btnWrap);
        wrap.appendChild(row);
      });
    };
    renderItems();opts.appendChild(wrap);
  }else if(q.type==='match'){
    // Server sends only left items + shuffled candidate values; correct mapping never reaches client before submit.
    const allRight=[...(q.rightOptions||[])].sort(()=>Math.random()-.5);
    const saved=qAnswers[q.id]||{};
    const wrap=document.createElement('div');wrap.style.cssText='display:flex;flex-direction:column;gap:10px';
    const hint=document.createElement('div');hint.style.cssText='font-size:12px;color:var(--gray);padding:8px 12px;background:#f0f9ff;border-radius:var(--r);border:1px solid #bae6fd';
    hint.textContent='🔗 დაუკავშირეთ სწორი წყვილები';wrap.appendChild(hint);
    (q.leftItems||[]).forEach((leftText,i)=>{const pair=[leftText,null];
      const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;min-width:0';
      const left=document.createElement('div');left.style.cssText='padding:10px 14px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);font-weight:600;font-size:13px';left.textContent=pair[0];
      const arrow=document.createElement('div');arrow.textContent='→';arrow.style.cssText='color:var(--gray);font-size:16px;text-align:center';
      const sel=document.createElement('select');sel.style.cssText='padding:10px;border:1.5px solid var(--primary);border-radius:var(--r);font-family:inherit;font-size:13px;background:var(--bg);cursor:pointer;width:100%';
      const blank=document.createElement('option');blank.value='';blank.textContent='— აირჩიეთ —';blank.disabled=true;blank.selected=!qAnswers[q.id]||!qAnswers[q.id][i];sel.appendChild(blank);
      allRight.forEach(opt=>{const o=document.createElement('option');o.value=opt;o.textContent=opt;if(saved[i]===opt)o.selected=true;sel.appendChild(o);});
      sel.onchange=e=>{if(!qAnswers[q.id])qAnswers[q.id]={};qAnswers[q.id][i]=e.target.value;updateDots();};
      row.appendChild(left);row.appendChild(arrow);row.appendChild(sel);wrap.appendChild(row);
    });
    opts.appendChild(wrap);
  }else if(q.type==='fill'){
    const parts=q.text.split('___');
    const wrap=document.createElement('div');wrap.style.cssText='line-height:2.2;font-size:15px;padding:8px 0';
    const saved=qAnswers[q.id]||[];
    const inputs=[];
    parts.forEach((part,i)=>{
      const sp=document.createElement('span');sp.textContent=part;wrap.appendChild(sp);
      if(i<parts.length-1){
        const inp=document.createElement('input');inp.type='text';inp.placeholder='___';
        inp.style.cssText='display:inline-block;width:120px;padding:4px 8px;border:none;border-bottom:2px solid var(--primary);background:transparent;font-family:inherit;font-size:15px;text-align:center;margin:0 4px;outline:none';
        inp.value=saved[i]||'';
        inp.oninput=e=>{if(!qAnswers[q.id])qAnswers[q.id]=[];qAnswers[q.id][i]=e.target.value.trim();updateDots();};
        inputs.push(inp);wrap.appendChild(inp);
      }
    });
    // Override q-text to hide original (fill text is rendered inline)
    document.getElementById('q-text').textContent='';
    opts.appendChild(wrap);
  }else{
    const dispOpts=(q.type==='true_false')?[t('true_ans'),t('false_ans')]:q.opts.map((_,i)=>qTransOpt(q,i));
    dispOpts.forEach((o,i)=>{
      const selected=qAnswers[q.id]===i,d=document.createElement('button');d.type='button';d.className='qopt'+(selected?' sel':'');d.style.width='100%';d.style.textAlign='left';d.setAttribute('aria-pressed',String(selected));
      const radio=document.createElement('span');radio.className='radio'+(selected?' sel':'');radio.setAttribute('aria-hidden','true');if(selected){const check=document.createElement('span');check.textContent='✓';check.style.cssText='color:#fff;font-size:9px';radio.appendChild(check);}
      const optionText=document.createElement('span');optionText.textContent=String(o);d.append(radio,optionText);
      d.onclick=()=>{qAnswers[q.id]=i;renderQ();updateDots();};opts.appendChild(d);
    });
  }  const prevBtn=document.getElementById('q-prev');if(prevBtn){prevBtn.textContent='← '+t('prev');prevBtn.disabled=qIdx===0;}
  const nxt=document.getElementById('q-next');
  if(qIdx===qs.length-1){nxt.textContent='✉ '+t('submit');nxt.className='btn btn-green';nxt.onclick=()=>{const _answered=Object.keys(qAnswers).filter(id=>{const v=qAnswers[id];return Array.isArray(v)?v.some(x=>String(x||'').trim()):v!==undefined&&v!==''&&v!==null;}).length;
        const _total=qs.length;
        const _warn=_answered<_total?'\n⚠️ '+(_total-_answered)+' კითხვა გამოტოვებულია!':'';
        document.getElementById('submit-msg').textContent=t('question')+': '+_answered+'/'+_total+_warn;document.getElementById('submit-modal').classList.remove('hidden');};}
  else{nxt.textContent=t('next')+' →';nxt.className='btn btn-primary';nxt.onclick=()=>qNav(1);}
}

function qNav(d){qIdx=Math.max(0,Math.min(curTestQs.length-1,qIdx+d));renderQ();updateDots();}

function buildDots(){
  const c=document.getElementById('q-dots');c.innerHTML='';
  curTestQs.forEach((_,i)=>{const d=document.createElement('div');d.className='dot';d.setAttribute('tabindex','0');d.setAttribute('role','button');d.setAttribute('aria-label','კითხვა '+(i+1));d.onclick=()=>{qIdx=i;renderQ();updateDots();};d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){qIdx=i;renderQ();updateDots();}};c.appendChild(d);});
  updateDots();
}

function updateDots(){
  const dots=document.querySelectorAll('.dot');
  dots.forEach((d,i)=>d.style.background=i===qIdx?'var(--grade-accent,var(--blue))':(()=>{const a=qAnswers[curTestQs[i]?.id];if(a===undefined||a===null)return'#d1d5db';if(typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===0)return'#d1d5db';if(Array.isArray(a)&&a.filter(v=>v).length===0)return'#d1d5db';return'var(--mint,#16a34a)';})());
}

function hideSubmitModal(){document.getElementById('submit-modal').classList.add('hidden');}

async function finishTest(){
  if(timerInt)clearInterval(timerInt);hideSubmitModal();if(!curAssessmentSessionId){if(document.getElementById('p-results')?.classList.contains('active'))return;alert('უსაფრთხო სესია ვერ მოიძებნა.');return;}
  setTestLoading('🔐 პასუხები სერვერზე მოწმდება…');
  try{const data=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.submitFunction,{session_id:curAssessmentSessionId,answers:qAnswers,tab_switch_count:_tabSwitchCount});const sr=data.result||{};const pct=Number(sr.pct||0);const badge=pct>=90?'🏆 შესანიშნავი':pct>=70?'✅ კარგი':pct>=50?'📘 ჩაბარებული':'❌ გასაუმჯობესებელი';const bc=pct>=90?'b-blue':pct>=70?'b-green':pct>=50?'b-amber':'b-red';const result={userId:CUR_USER?.email||'',testId:sr.testId||curTest.id,title:sr.title||curTest.title,subject:sr.subject||curTest.subject,grade:sr.grade||curTest.grade,earned:Number(sr.earned||0),totalPts:Number(sr.totalPts||0),correct:Number(sr.correct||0),total:Number(sr.total||curTestQs.length),pct,badge,bc,date:sr.date||new Date().toLocaleDateString('ka-GE'),verified:true,serverSessionId:sr.sessionId||curAssessmentSessionId,reviewed:data.review||[]};SESSION_RESULTS.unshift(result);saveResults();_lastResult=result;curAssessmentSessionId=null;try{if(EDUTEST_CLOUD.user)await syncAdaptiveFromCloud(CUR_USER.email,EDUTEST_CLOUD.user.id);}catch(_){}
    if(CUR_USER){const g=parseInt(CUR_USER.grade)||parseInt(curTest.grade)||1;let xpEarned=calcXP(pct,g);if(_isDailyBonus){xpEarned*=2;markDailyDone(CUR_USER.email);_isDailyBonus=false;}result.xpEarned=xpEarned;saveResults();showXpToast(xpEarned,null);}logAuditEvent('TEST_DONE_VERIFIED',(CUR_USER?CUR_USER.email:'')+' | '+result.testId+' | '+pct+'%');renderResultsPage(result);go('results');
  }catch(e){alert('შეფასება ვერ დასრულდა: '+assessmentErrorMessage(e&&e.message));go('student');}
}

function renderResultsPage(r){
  const sumEl=document.getElementById('res-summary');
  if(sumEl){
    if(r.pct===100){
      sumEl.innerHTML=`
        <div style="font-size:52px;margin-bottom:10px">🎊</div>
        <h2 style="font-weight:800;font-size:22px;margin-bottom:6px;color:#1d4ed8">${t('bravo_perfect')}</h2>
        <p style="color:var(--gray);margin-bottom:16px;font-size:13px">${esc(rTitle(r))}</p>
        <div style="background:linear-gradient(135deg,#dbeafe,#ede9fe);border-radius:12px;padding:14px;margin-bottom:16px">
          <p style="color:#1d4ed8;font-weight:600;font-size:14px">${t('bravo_msg')}</p>
        </div>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 20px;border-radius:999px;font-weight:700;font-size:15px;margin-bottom:18px" class="badge ${r.bc}">${performanceBadgeLabel(r.pct)} — ${r.pct}%</div>
        <div style="display:flex;justify-content:center;gap:28px">
          <div><div style="font-size:28px;font-weight:800;color:var(--blue)">${r.pct}%</div><div style="font-size:11px;color:var(--gray)">${t('percentage')}</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div><div style="font-size:28px;font-weight:800">${r.earned}/${r.totalPts}</div><div style="font-size:11px;color:var(--gray)">${t('score')}</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div><div style="font-size:28px;font-weight:800">${r.correct}/${r.total}</div><div style="font-size:11px;color:var(--gray)">${t('correct')}</div></div>
        </div>`;
    } else {
      sumEl.innerHTML=`
        <div style="font-size:52px;margin-bottom:10px">${r.pct>=90?'🌟':r.pct>=70?'🎉':r.pct>=50?'👍':'💪'}</div>
        <h2 style="font-weight:800;font-size:20px;margin-bottom:6px">${t('test_done')}</h2>
        <p style="color:var(--gray);margin-bottom:16px;font-size:13px">${esc(rTitle(r))}</p>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 20px;border-radius:999px;font-weight:700;font-size:15px;margin-bottom:18px" class="badge ${r.bc}">${performanceBadgeLabel(r.pct)} — ${r.pct}%</div>
        <div style="display:flex;justify-content:center;gap:28px">
          <div><div style="font-size:28px;font-weight:800;color:var(--blue)">${r.pct}%</div><div style="font-size:11px;color:var(--gray)">${t('percentage')}</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div><div style="font-size:28px;font-weight:800">${r.correct}/${r.total}</div><div style="font-size:11px;color:var(--gray)">${t('correct')}</div></div>
        </div>`;
    }
  }
  const revEl=document.getElementById('res-review');
  if(revEl)revEl.innerHTML='<div style="font-weight:600;margin-bottom:12px;font-size:13px">'+t('q_review')+'</div>'+buildReviewHTML(r.reviewed);
  // Adaptive difficulty suggestion
  const adaptEl=document.getElementById('res-adaptive');
  if(adaptEl){
    const grade=r.grade||CUR_USER?.grade||1;
    const subj=r.subject||'';
    let adaptHTML='';
    if(r.pct>=85){
      // Suggest harder test (next grade band)
      const nextGrade=Math.min(12,grade+1);
      const harderTests=ALL_TESTS.filter(t2=>t2.subject===subj&&t2.grade===nextGrade);
      if(harderTests.length){
        const ht=harderTests[0];
        adaptHTML=`<div style="background:linear-gradient(135deg,#dbeafe,#ede9fe);border-radius:12px;padding:14px;margin-top:12px;display:flex;gap:12px;align-items:center">
          <div style="font-size:28px">🚀</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px;color:#1d4ed8">შესანიშნავია! გაართულე!</div>
            <div style="font-size:12px;color:#374151;margin-top:2px">შენი შედეგი ${r.pct}% — სცადე ${nextGrade} კლასის ტესტი</div>
          </div>
          <button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="startTestById('${ht.id}')">📚 სცადე</button>
        </div>`;
      }
    }else if(r.pct<50){
      // Suggest same grade different version
      const sameTests=ALL_TESTS.filter(t2=>t2.subject===subj&&t2.grade===grade&&t2.id!==r.testId);
      if(sameTests.length){
        const st=sameTests[0];
        adaptHTML=`<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:14px;margin-top:12px;display:flex;gap:12px;align-items:center">
          <div style="font-size:28px">💪</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px;color:#92400e">გამეორება გჭირდება!</div>
            <div style="font-size:12px;color:#374151;margin-top:2px">შენი შედეგი ${r.pct}% — სცადე ამავე კლასის სხვა ვარიანტი</div>
          </div>
          <button class="btn btn-amber" style="font-size:12px;padding:6px 12px" onclick="startTestById('${st.id}')">🔄 სცადე</button>
        </div>`;
      }
    }
    adaptEl.innerHTML=adaptHTML;
  }
}

// ── Payment modal ──
let _payPlan='single';
function showPayModal(tid){
  if(!PAYMENTS_ENABLED){alert('ყველა ტესტი სატესტო ეტაპზე უფასოა; გადახდები გამორთულია.');return;}
  if(tid)curTest=ALL_TESTS.find(t=>t.id===tid)||curTest;
  const sn=document.getElementById('pay-subj-name');
  if(sn&&curTest)sn.textContent=curTest.subject+' — უფასო მცდელობები';
  const elSingle=document.getElementById('pay-price-single');
  const elPremium=document.getElementById('pay-price-monthly');
  if(elSingle)elSingle.textContent=fmtPrice('perSubject');
  if(elPremium)elPremium.textContent=fmtPrice('monthly');
  _payPlan='single';
  selectPayPlan('single');
  document.getElementById('pay-modal').classList.remove('hidden');
  document.getElementById('pay-step-1').classList.remove('hidden');
  document.getElementById('pay-step-2').classList.add('hidden');
}
function hidePayModal(){document.getElementById('pay-modal').classList.add('hidden');}
function selectPayPlan(plan){
  _payPlan=plan;
  document.getElementById('pay-plan-single').style.borderColor=plan==='single'?'var(--blue)':'var(--border)';
  document.getElementById('pay-plan-single').style.background=plan==='single'?'var(--blue-l)':'';
  document.getElementById('pay-plan-premium').style.borderColor=plan==='premium'?'var(--blue)':'var(--border)';
  document.getElementById('pay-plan-premium').style.background=plan==='premium'?'var(--blue-l)':'';
}
function payStep2(method){
  if(!PAYMENTS_ENABLED)return;
  document.getElementById('pay-step-1').classList.add('hidden');
  document.getElementById('pay-step-2').classList.remove('hidden');
}
function payComplete(){
  if(!PAYMENTS_ENABLED){hidePayModal();return;}
  const email=CUR_USER?.email||'';
  if(_payPlan==='premium'){grantPremium(email,true);}
  else{if(curTest)grantSubjectAccess(email,curTest.subject);}
  hidePayModal();
  startTestById(curTest&&curTest.id);
  renderStudentTests();
  const badge=document.getElementById('s-prof-premium');
  if(badge&&isPremium(email))badge.style.display='';
}
loadPersistedData();
// Restore the secure HttpOnly server session first, then initialize optional Supabase email/cloud features.
initServerAuth().then(function(){return initEduTestCloud();}).catch(function(e){console.warn('Cloud init',e);});
window.addEventListener('edutest-supabase-ready',function(){if(!EDUTEST_CLOUD.ready)initEduTestCloud();},{once:true});
loadPrices();
loadCustomQuestions();
loadReports();
updateI18n();

// ── Accessibility modes ─────────────────
(function(){
  const MODES=['large','contrast','dyslexia','tts'];
  let cloudSpeechAudio=null,cloudSpeechUrl='';
  function loadAcc(){
    try{
      MODES.forEach(m=>{
        const on=localStorage.getItem('edutest_acc_'+m)==='1';
        if(on&&m!=='tts')document.body.classList.add('acc-'+m);
        const btn=document.getElementById('acc-'+m);
        if(btn){if(on)btn.classList.add('on');btn.setAttribute('aria-pressed',String(on));}
      });
    }catch(e){}
  }
  window.toggleAcc=function(mode){
    const btn=document.getElementById('acc-'+mode);
    const isOn=btn&&btn.classList.contains('on');
    if(btn){if(isOn)btn.classList.remove('on');else btn.classList.add('on');btn.setAttribute('aria-pressed',String(!isOn));}
    if(mode!=='tts'){if(isOn)document.body.classList.remove('acc-'+mode);else document.body.classList.add('acc-'+mode);}
    try{localStorage.setItem('edutest_acc_'+mode,isOn?'0':'1');}catch(e){}
  };
  window.isTTSOn=function(){
    try{return localStorage.getItem('edutest_acc_tts')==='1';}catch(e){return false;}
  };
  window.speakText=async function(text){
    if(!isTTSOn())return;
    const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return;
    const lang=/[ა-ჰ]/u.test(clean)?'ka':/[А-Яа-яЁё]/u.test(clean)?'ru':LANG==='ru'?'ru':LANG==='en'?'en':'ka';
    try{
      if(cloudSpeechAudio){cloudSpeechAudio.pause();cloudSpeechAudio=null;}if(cloudSpeechUrl){URL.revokeObjectURL(cloudSpeechUrl);cloudSpeechUrl='';}
      const response=await fetch('/api/tts',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:clean,lang})});
      if(!response.ok)throw new Error('cloud speech unavailable');
      cloudSpeechUrl=URL.createObjectURL(await response.blob());cloudSpeechAudio=new Audio(cloudSpeechUrl);cloudSpeechAudio.addEventListener('ended',()=>{if(cloudSpeechUrl)URL.revokeObjectURL(cloudSpeechUrl);cloudSpeechUrl='';cloudSpeechAudio=null;},{once:true});await cloudSpeechAudio.play();return;
    }catch(_){
      if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean);u.lang=lang==='ru'?'ru-RU':lang==='en'?'en-US':'ka-GE';u.rate=0.9;window.speechSynthesis.speak(u);
    }
  };
  // Add read-aloud buttons to question text when rendered
  window.addReadAloudBtn=function(el){
    if(!el)return;
    const h3=el.querySelector('h3');
    if(!h3||h3.querySelector('.read-aloud-btn'))return;
    const btn=document.createElement('button');
    btn.className='read-aloud-btn';btn.textContent='🔊';btn.title='მოსმენა';btn.setAttribute('aria-label','ტექსტის ხმამაღლა მოსმენა');
    btn.onclick=function(e){e.stopPropagation();speakText(h3.textContent.replace('🔊','').trim());};
    h3.appendChild(btn);
  };
  document.addEventListener('DOMContentLoaded',loadAcc);
})();

// Also run when navigating to landing
const _origGo=window.go;


// ══════════════════════════════════════════════════════════════════════════════
// MISTAKE TRACKING & AI ANALYSIS SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function getMistakeHistory(email){
  try{
    var raw=localStorage.getItem('mistake_hist_'+email);
    return raw?JSON.parse(raw):{};
  }catch(e){return{};}
}

function saveMistakeHistory(email,hist){
  try{localStorage.setItem('mistake_hist_'+email,JSON.stringify(hist));}catch(e){}
}

function recordMistakes(email,reviewed){
  var hist=getMistakeHistory(email);
  reviewed.forEach(function(q){
    if(!q.ok&&q.type!=='short_answer'){
      var key=(q._poolKey||'')+'|'+(q._poolIdx||0)+'|'+(q.id||'');
      hist[key]=(hist[key]||0)+1;
    }
  });
  saveMistakeHistory(email,hist);
  return hist;
}

function getTopicHint(q){
  if(q.explain) return q.explain;
  if(q.type==='tf') return 'ყურადღებით გაიმეორე ეს თემა სახელმძღვანელოში.';
  var opts=q.options||[];
  var correctOpt=opts.find(function(o){return o.value===q.correct;});
  if(correctOpt&&correctOpt.text){
    return 'სწორი პასუხი: "'+String(correctOpt.text).replace(/<[^>]*>/g,'').slice(0,80)+'"';
  }
  return 'გაიმეორე ეს კითხვა და სცადე კვლავ.';
}

function buildAiAnalysisHTML(r,mistakeHist){
  var wrong=r.reviewed.filter(function(q){return !q.ok&&q.type!=='short_answer';});
  if(!wrong.length){
    return '<div class="card" style="padding:20px;border:2px solid #16a34a;background:linear-gradient(135deg,#f0fdf4,#dcfce7)">'
      +'<div style="display:flex;align-items:center;gap:12px">'
      +'<div style="font-size:36px">🤖</div>'
      +'<div><div style="font-weight:700;font-size:15px;color:#15803d">AI ანალიზი — შესანიშნავი!</div>'
      +'<div style="font-size:13px;color:#166534;margin-top:4px">ყველა კითხვა სწორად უპასუხე! შემაჯამებელ ვარიანტზეც სცადე.</div>'
      +'</div></div></div>';
  }

  var repeated=wrong.filter(function(q){
    var key=(q._poolKey||'')+'|'+(q._poolIdx||0)+'|'+(q.id||'');
    return (mistakeHist[key]||0)>=2;
  });

  var mistakeItems=wrong.map(function(q,i){
    var key=(q._poolKey||'')+'|'+(q._poolIdx||0)+'|'+(q.id||'');
    var times=mistakeHist[key]||1;
    var isRepeat=times>=2;
    var hint=getTopicHint(q);
    var qText=(typeof qTransText==='function'?qTransText(q):null)||q.text||('კითხვა '+(i+1));
    qText=String(qText).replace(/<[^>]*>/g,'').slice(0,100);
    var badge=isRepeat?'<span style="background:#fee2e2;color:#dc2626;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:700">🔁 '+times+'×-ჯერ</span>':'';
    var bg=isRepeat?'#fff1f2':'#fffbeb';
    var border=isRepeat?'#dc2626':'#d97706';
    return '<div style="padding:10px 12px;background:'+bg+';border-left:3px solid '+border+';border-radius:0 6px 6px 0;margin-bottom:8px">'
      +'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">'
      +'<span style="font-size:13px;font-weight:600;flex:1;color:#111">'+esc(qText)+'</span>'+badge+'</div>'
      +'<div style="font-size:12px;color:#92400e">💡 '+esc(hint)+'</div>'
      +'</div>';
  }).join('');

  var summaryMsg=r.pct<50?'ეს თემა კარგად უნდა გაიმეოროს. სახელმძღვანელოს შესაბამის თავებს დაუბრუნდი.'
    :r.pct<75?'კარგი მცდელობაა! '+wrong.length+' კითხვა ყურადღებით გაარჩიე.'
    :'თითქმის სრულყოფილი! მხოლოდ '+wrong.length+' კითხვა გამოგეპარა.';

  var repeatWarn=repeated.length
    ?'<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#991b1b">'
      +'<strong>⚠️ განმეორებითი შეცდომები ('+repeated.length+'):</strong> ამ კითხვებს რამდენჯერმე ასცდი. განსაკუთრებით ყურადღებით გაიმეორე!'
      +'</div>'
    :'<div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px">შეცდომები შენახულია — განმეორებას გამოვაჩენ შემდეგ ტესტში</div>';

  return '<div class="card" style="padding:20px;border:2px solid #f59e0b;background:#fffdf0">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<div style="font-size:28px">🤖</div>'
    +'<div><div style="font-weight:700;font-size:15px">AI შეცდომების ანალიზი</div>'
    +'<div style="font-size:12px;color:#6b7280;margin-top:2px">'+esc(summaryMsg)+'</div></div></div>'
    +repeatWarn
    +'<div style="font-weight:600;font-size:12px;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">შეცდომების ჩამონათვალი ('+wrong.length+')</div>'
    +mistakeItems
    +'</div>';
}

function buildHabitNudgeHTML(){
  var streakDays=CUR_USER&&typeof getDailyStreak==='function'?getDailyStreak(CUR_USER.email):0;
  var nextStreakMsg=streakDays>=7?'🔥 7-დღიანი streak! გამოცდილი მოსწავლე ხარ!'
    :streakDays>=3?'🔥 '+streakDays+' დღე ზედიზედ! გაგრძელება?'
    :'📅 ხვალ 10 XP-ის მოსაგებად დაბრუნდი!';
  return '<div class="card" style="padding:16px;border:2px dashed #d946ef;background:linear-gradient(135deg,#fdf4ff,#f5f3ff);display:flex;align-items:center;gap:14px">'
    +'<div style="font-size:32px">🎯</div>'
    +'<div style="flex:1">'
    +'<div style="font-weight:700;font-size:14px;color:#7e22ce">ყოველდღიური ჩვევა</div>'
    +'<div style="font-size:12px;color:#6b7280;margin-top:3px">'+nextStreakMsg+'</div></div>'
    +'<button class="btn" style="background:#d946ef;color:#fff;font-size:12px;padding:6px 14px" onclick="sNav(\'s-tests\',null);renderStudentTests()">▶ ხვალის მისია</button>'
    +'</div>';
}

// ── Enhanced renderResultsPage with AI analysis ─────────────────────────────
var _origRenderResultsPage=renderResultsPage;
renderResultsPage=function(r){
  _origRenderResultsPage(r);
  var email=CUR_USER?CUR_USER.email:'';
  var hist=email?recordMistakes(email,r.reviewed):{};
  var aiEl=document.getElementById('res-ai-analysis');
  if(aiEl) aiEl.innerHTML=buildAiAnalysisHTML(r,hist);
  var habitEl=document.getElementById('res-habit-nudge');
  if(habitEl) habitEl.innerHTML=buildHabitNudgeHTML();
  // Adaptive study plan
  var adaptEmail=CUR_USER?CUR_USER.email:'guest';
  renderStudyPlan(adaptEmail, r.testId ? (ALL_TESTS.find(function(t){return t.id===r.testId;})||{pool:''}).pool : '', r.pct||0);
};



// ══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION SYSTEM — Weekly League · Monthly Champion · Avatar Shop · Friends
// ══════════════════════════════════════════════════════════════════════════════

// ── Coin economy ─────────────────────────────────────────────────────────────
function getUserCoins(email){
  try{ return parseInt(localStorage.getItem('coins_'+email)||'0'); }catch(e){return 0;}
}
function addCoins(email, amount){
  try{
    var cur=getUserCoins(email);
    localStorage.setItem('coins_'+email, String(cur+amount));
  }catch(e){}
}
function spendCoins(email, amount){
  var cur=getUserCoins(email);
  if(cur<amount) return false;
  try{ localStorage.setItem('coins_'+email, String(cur-amount)); return true; }catch(e){return false;}
}

// Award coins after each test (called from finishTest flow via XP toast)
var _origShowXpToast=typeof showXpToast==='function'?showXpToast:null;
var _coinsPending=0;
// Patch finishTest to award coins
var _origFinishTest=typeof finishTest==='function'?finishTest:null;
if(_origFinishTest){
  finishTest=function(){
    _origFinishTest();
    if(CUR_USER){
      var r=SESSION_RESULTS&&SESSION_RESULTS[0];
      if(r){
        var coins=r.pct>=90?15:r.pct>=70?10:r.pct>=50?5:2;
        addCoins(CUR_USER.email, coins);
      }
    }
  };
}

// ── Avatar Shop ───────────────────────────────────────────────────────────────
var SHOP_ITEMS=[
  {id:'av_red',    type:'color', label:'წითელი avatar',   icon:'🔴', color:'#dc2626', price:20},
  {id:'av_green',  type:'color', label:'მწვანე avatar',   icon:'🟢', color:'#16a34a', price:20},
  {id:'av_purple', type:'color', label:'იისფერი avatar',  icon:'🟣', color:'#7c3aed', price:25},
  {id:'av_gold',   type:'color', label:'ოქროსფერი avatar',icon:'🟡', color:'#d97706', price:40},
  {id:'av_pink',   type:'color', label:'ვარდისფერი avatar',icon:'🩷', color:'#db2777', price:30},
  {id:'av_teal',   type:'color', label:'ფირუზა avatar',   icon:'🩵', color:'#0891b2', price:35},
  {id:'frame_star',  type:'frame', label:'⭐ ვარსკვლავი ჩარჩო', icon:'⭐', price:50},
  {id:'frame_fire',  type:'frame', label:'🔥 ცეცხლის ჩარჩო',  icon:'🔥', price:60},
  {id:'frame_crown', type:'frame', label:'👑 გვირგვინი',        icon:'👑', price:80},
  {id:'bg_space',  type:'bg',    label:'🚀 კოსმოსი ფონი',  icon:'🚀', price:70},
  {id:'bg_forest', type:'bg',    label:'🌲 ტყის ფონი',     icon:'🌲', price:70},
  {id:'bg_ocean',  type:'bg',    label:'🌊 ოკეანე ფონი',   icon:'🌊', price:70},
];

function getOwnedItems(email){
  try{ return JSON.parse(localStorage.getItem('shop_owned_'+email)||'[]'); }catch(e){return[];}
}
function getEquippedItems(email){
  try{ return JSON.parse(localStorage.getItem('shop_equipped_'+email)||'{}'); }catch(e){return{};}
}
function buyItem(itemId){
  if(!CUR_USER) return;
  var item=SHOP_ITEMS.find(function(i){return i.id===itemId;});
  if(!item) return;
  var owned=getOwnedItems(CUR_USER.email);
  if(owned.indexOf(itemId)>=0){alert('უკვე გაქვს ეს ნივთი!'); return;}
  if(!spendCoins(CUR_USER.email, item.price)){alert('მონეტები არ გყოფნის!'); return;}
  owned.push(itemId);
  try{localStorage.setItem('shop_owned_'+CUR_USER.email, JSON.stringify(owned));}catch(e){}
  renderShop();
}
function equipItem(itemId){
  if(!CUR_USER) return;
  var item=SHOP_ITEMS.find(function(i){return i.id===itemId;});
  if(!item) return;
  var eq=getEquippedItems(CUR_USER.email);
  if(eq[item.type]===itemId) delete eq[item.type];
  else eq[item.type]=itemId;
  try{localStorage.setItem('shop_equipped_'+CUR_USER.email, JSON.stringify(eq));}catch(e){}
  applyAvatarCosmetics();
  renderShop();
}
function applyAvatarCosmetics(){
  if(!CUR_USER) return;
  var eq=getEquippedItems(CUR_USER.email);
  var avEl=document.getElementById('s-sidebar-av');
  var avFrame=document.getElementById('s-av-frame');
  if(eq.color){
    var item=SHOP_ITEMS.find(function(i){return i.id===eq.color;});
    if(avEl&&item) avEl.style.background=item.color;
  } else if(avEl){
    avEl.style.background='#2563eb';
  }
  var frameEl=document.querySelectorAll('.s-av-frame-icon');
  frameEl.forEach(function(el){
    var item=eq.frame?SHOP_ITEMS.find(function(i){return i.id===eq.frame;}):null;
    el.textContent=item?item.icon:'';
  });
}
function renderShop(){
  if(!CUR_USER) return;
  var coins=getUserCoins(CUR_USER.email);
  var coinsEl=document.getElementById('s-shop-coins');
  if(coinsEl) coinsEl.textContent=coins;
  var owned=getOwnedItems(CUR_USER.email);
  var eq=getEquippedItems(CUR_USER.email);
  var cont=document.getElementById('s-shop-content');
  if(!cont) return;
  var byType={color:[],frame:[],bg:[]};
  SHOP_ITEMS.forEach(function(it){if(byType[it.type])byType[it.type].push(it);});
  var typeLabels={color:'🎨 Avatar ფერი',frame:'🖼 ჩარჩო',bg:'🌄 ფონი'};
  var html='<div class="card" style="padding:14px;margin-bottom:12px;background:linear-gradient(135deg,#fffbeb,#fef3c7)">'
    +'<div style="font-size:13px;color:#92400e">🪙 შენი ბალანსი: <strong>'+coins+' მონეტა</strong></div>'
    +'<div style="font-size:11px;color:#6b7280;margin-top:4px">ტესტების შემდეგ იღებ: 90%+=15🪙 · 70%+=10🪙 · 50%+=5🪙 · სხვა=2🪙</div>'
    +'</div>';
  Object.keys(byType).forEach(function(type){
    html+='<div style="font-weight:600;font-size:13px;margin:12px 0 8px">'+typeLabels[type]+'</div>';
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">';
    byType[type].forEach(function(item){
      var isOwned=owned.indexOf(item.id)>=0;
      var isEq=eq[item.type]===item.id;
      var bg=isEq?'#ede9fe':isOwned?'#f0fdf4':'#fff';
      var border=isEq?'2px solid #7c3aed':isOwned?'2px solid #16a34a':'1px solid #e5e7eb';
      html+='<div style="padding:12px;text-align:center;background:'+bg+';border:'+border+';border-radius:10px">'
        +'<div style="font-size:28px;margin-bottom:6px">'+item.icon+'</div>'
        +'<div style="font-size:11px;font-weight:600;margin-bottom:6px">'+item.label+'</div>';
      if(isOwned){
        html+='<button class="btn btn-sm" style="width:100%;font-size:11px;background:'+(isEq?'#7c3aed':'#16a34a')+';color:#fff" onclick="equipItem(\''+item.id+'\')">'+(isEq?'✓ ჩახსნა':'▶ გამოყენება')+'</button>';
      } else {
        html+='<div style="font-size:11px;color:#d97706;margin-bottom:4px">🪙 '+item.price+'</div>';
        html+='<button class="btn btn-sm btn-amber" style="width:100%;font-size:11px" onclick="buyItem(\''+item.id+'\')">'+(coins>=item.price?'🛒 ყიდვა':'🔒 არ გყოფნის')+'</button>';
      }
      html+='</div>';
    });
    html+='</div>';
  });
  cont.innerHTML=html;
}

// ── Weekly League & Monthly Champion ─────────────────────────────────────────
function getWeekKey(){
  var d=new Date();
  var day=d.getDay()||7;
  var mon=new Date(d);
  mon.setDate(d.getDate()-day+1);
  return mon.toISOString().slice(0,10);
}
function getMonthKey(){
  return new Date().toISOString().slice(0,7);
}
function getWeeklyXP(email){
  var wk=getWeekKey();
  try{
    var raw=localStorage.getItem('weekly_xp_'+email);
    var data=raw?JSON.parse(raw):{};
    return data[wk]||0;
  }catch(e){return 0;}
}
function addWeeklyXP(email, xp){
  var wk=getWeekKey();
  try{
    var raw=localStorage.getItem('weekly_xp_'+email);
    var data=raw?JSON.parse(raw):{};
    data[wk]=(data[wk]||0)+xp;
    localStorage.setItem('weekly_xp_'+email, JSON.stringify(data));
  }catch(e){}
}
function getMonthlyXP(email){
  var mk=getMonthKey();
  try{
    var raw=localStorage.getItem('monthly_xp_'+email);
    var data=raw?JSON.parse(raw):{};
    return data[mk]||0;
  }catch(e){return 0;}
}
function addMonthlyXP(email, xp){
  var mk=getMonthKey();
  try{
    var raw=localStorage.getItem('monthly_xp_'+email);
    var data=raw?JSON.parse(raw):{};
    data[mk]=(data[mk]||0)+xp;
    localStorage.setItem('monthly_xp_'+email, JSON.stringify(data));
  }catch(e){}
}

function renderLeague(){
  var cont=document.getElementById('s-league-content');
  if(!cont) return;
  var users=USER_DB.filter(function(u){return u.role==='student';});
  var weeklyData=users.map(function(u){
    return {name:u.name||u.email, email:u.email, wXP:getWeeklyXP(u.email), mXP:getMonthlyXP(u.email)};
  }).sort(function(a,b){return b.wXP-a.wXP;});
  var monthlyData=users.map(function(u){
    return {name:u.name||u.email, email:u.email, mXP:getMonthlyXP(u.email)};
  }).sort(function(a,b){return b.mXP-a.mXP;});

  var medals=['🥇','🥈','🥉'];
  var myEmail=CUR_USER?CUR_USER.email:'';

  function leagueRow(row, i, xp, label){
    var isMe=row.email===myEmail;
    var bg=isMe?'#dbeafe':'#fff';
    var medal=medals[i]||('#'+(i+1));
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:'+bg+';border-radius:8px;margin-bottom:4px">'
      +'<div style="width:28px;text-align:center;font-weight:700;font-size:14px">'+medal+'</div>'
      +'<div style="flex:1;font-size:13px;font-weight:'+(isMe?'700':'400')+'">'+esc(row.name)+(isMe?' (შენ)':'')+'</div>'
      +'<div style="font-size:12px;font-weight:600;color:#2563eb">'+xp+' XP</div>'
      +'</div>';
  }

  var wRows=weeklyData.slice(0,10).map(function(r,i){return leagueRow(r,i,r.wXP,'');}).join('');
  var mRows=monthlyData.slice(0,10).map(function(r,i){return leagueRow(r,i,r.mXP,'');}).join('');

  var monthChamp=monthlyData[0];
  var champBanner=monthChamp&&monthChamp.mXP>0
    ?'<div class="card" style="padding:14px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #d97706;margin-bottom:16px;display:flex;align-items:center;gap:12px">'
      +'<div style="font-size:36px">👑</div>'
      +'<div><div style="font-weight:700;font-size:14px">თვის ჩემპიონი</div>'
      +'<div style="font-size:15px;font-weight:800;color:#92400e">'+esc(monthChamp.name)+'</div>'
      +'<div style="font-size:12px;color:#78350f">'+monthChamp.mXP+' XP — '+getMonthKey()+'</div></div>'
      +'</div>'
    :'';

  cont.innerHTML=champBanner
    +'<div style="font-weight:600;font-size:13px;margin-bottom:8px">⚡ კვირის ლიგა <span style="font-size:11px;color:var(--gray);font-weight:400">(შ. '+getWeekKey()+')</span></div>'
    +(wRows||'<div style="text-align:center;color:var(--gray);padding:20px;font-size:13px">ჯერ არ არის მონაცემები</div>')
    +'<div style="font-weight:600;font-size:13px;margin:16px 0 8px">📅 თვის ლიგა <span style="font-size:11px;color:var(--gray);font-weight:400">('+getMonthKey()+')</span></div>'
    +(mRows||'<div style="text-align:center;color:var(--gray);padding:20px;font-size:13px">ჯერ არ არის მონაცემები</div>');
}

// ── Achievements Gallery ───────────────────────────────────────────────────────
function renderAchievements(){
  if(!CUR_USER) return;
  var cont=document.getElementById('s-achievements-content');
  if(!cont) return;
  var earned=typeof getUserAchievements==='function'?getUserAchievements(CUR_USER.email):[];
  var defs=typeof ACHIEVEMENT_DEFS!=='undefined'?ACHIEVEMENT_DEFS:[];
  var total=SESSION_RESULTS?SESSION_RESULTS.filter(function(r){return r.userId===CUR_USER.email;}).length:0;
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px">';
  defs.forEach(function(a){
    var isEarned=earned.indexOf(a.id)>=0;
    var bg=isEarned?'linear-gradient(135deg,#fffbeb,#fef3c7)':'#f9fafb';
    var border=isEarned?'2px solid #d97706':'1px solid #e5e7eb';
    var opacity=isEarned?'1':'0.45';
    html+='<div style="padding:14px;text-align:center;background:'+bg+';border:'+border+';border-radius:10px;opacity:'+opacity+'">'
      +'<div style="font-size:32px;margin-bottom:6px">'+a.icon+'</div>'
      +'<div style="font-size:11px;font-weight:600;line-height:1.3">'+esc(a.label)+'</div>'
      +(isEarned?'<div style="font-size:10px;color:#d97706;margin-top:4px">✓ მიღებულია</div>':'<div style="font-size:10px;color:#9ca3af;margin-top:4px">🔒 ჩაკეტილი</div>')
      +'</div>';
  });
  html+='</div>';
  html+='<div style="text-align:center;margin-top:16px;font-size:13px;color:var(--gray)">მიღებულია '+earned.length+'/'+defs.length+' · '+total+' ტესტი გავლილი</div>';
  cont.innerHTML=html;
}

// ── Friends System ─────────────────────────────────────────────────────────────
function getFriends(email){
  try{ return JSON.parse(localStorage.getItem('friends_'+email)||'[]'); }catch(e){return[];}
}
function addFriend(){
  if(!CUR_USER) return;
  var input=document.getElementById('s-friend-input');
  var friendEmail=(input?input.value:'').trim().toLowerCase();
  if(!friendEmail){alert('შეიყვანე ელ.ფოსტა!'); return;}
  if(friendEmail===CUR_USER.email){alert('საკუთარ თავს ვერ დაამეგობრებ!'); return;}
  var friends=getFriends(CUR_USER.email);
  if(friends.indexOf(friendEmail)>=0){alert('უკვე მეგობრები ხართ!'); return;}
  var friendUser=USER_DB.find(function(u){return u.email===friendEmail;});
  if(!friendUser){alert('ასეთი მომხმარებელი ვერ მოიძებნა!'); return;}
  friends.push(friendEmail);
  try{localStorage.setItem('friends_'+CUR_USER.email, JSON.stringify(friends));}catch(e){}
  if(input) input.value='';
  renderFriends();
}
function removeFriend(email){
  if(!CUR_USER) return;
  var friends=getFriends(CUR_USER.email).filter(function(e){return e!==email;});
  try{localStorage.setItem('friends_'+CUR_USER.email, JSON.stringify(friends));}catch(e){}
  renderFriends();
}
function renderFriends(){
  if(!CUR_USER) return;
  var cont=document.getElementById('s-friends-content');
  if(!cont) return;
  var friends=getFriends(CUR_USER.email);
  if(!friends.length){
    cont.innerHTML='<div style="text-align:center;color:var(--gray);padding:40px;font-size:13px">მეგობარი ჯერ არ დამატებია.<br>დაამატე ელ.ფოსტით!</div>';
    return;
  }
  var html='';
  friends.forEach(function(email){
    var u=USER_DB.find(function(u){return u.email===email;});
    var name=u?(u.name||email):email;
    var uXP=typeof getUserXP==='function'?getUserXP(email):0;
    var uLvl=typeof getLevel==='function'?getLevel(uXP):{name:'?'};
    var results=SESSION_RESULTS?SESSION_RESULTS.filter(function(r){return r.userId===email;}):[];
    var lastScore=results.length?(results[0].pct+'%'):'—';
    html+='<div class="card" style="padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">'
      +'<div style="width:40px;height:40px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0">'+(name[0]||'?').toUpperCase()+'</div>'
      +'<div style="flex:1">'
      +'<div style="font-weight:600;font-size:13px">'+esc(name)+'</div>'
      +'<div style="font-size:11px;color:var(--gray)">'+uXP+' XP · '+uLvl.name+' · ბოლო: '+lastScore+'</div>'
      +'</div>'
      +'<button class="btn btn-ghost" style="font-size:11px;color:#dc2626;padding:4px 8px" onclick="removeFriend(\''+email+'\')">✕</button>'
      +'</div>';
  });
  cont.innerHTML=html;
}

// ── Patch XP system to also update weekly/monthly XP ─────────────────────────
var _origCalcXP=typeof calcXP==='function'?calcXP:null;
var _origGiveXP=null;
// Hook into finishTest result to add weekly/monthly XP
document.addEventListener('DOMContentLoaded',function(){
  applyAvatarCosmetics();
});
// Also apply on login
var _origGo2=typeof go==='function'?go:null;
if(_origGo2){
  go=function(page){
    _origGo2(page);
    if(page==='student') setTimeout(applyAvatarCosmetics,100);
  };
}



// ── Skeleton screens ──────────────────────────────────────────────────────────
function skelCards(n){
  var html='';
  for(var i=0;i<n;i++){
    html+='<div class="skel-card"><div class="skel-row">'
      +'<div class="skel skel-circle" style="width:36px;height:36px;flex-shrink:0"></div>'
      +'<div style="flex:1"><div class="skel skel-title"></div><div class="skel skel-text" style="width:40%"></div></div>'
      +'</div><div class="skel skel-text" style="width:80%"></div><div class="skel skel-text" style="width:55%"></div></div>';
  }
  return html;
}
function skelRows(n){
  var html='';
  for(var i=0;i<n;i++){
    html+='<div class="skel-card" style="padding:12px"><div class="skel-row">'
      +'<div class="skel" style="width:30px;height:20px;flex-shrink:0"></div>'
      +'<div style="flex:1"><div class="skel skel-text"></div></div>'
      +'<div class="skel" style="width:60px;height:20px"></div>'
      +'</div></div>';
  }
  return html;
}

// Show skeleton while loading test list
var _origRenderStudentTests=renderStudentTests;
renderStudentTests=function(){
  var list=document.getElementById('s-test-list');
  if(list) list.innerHTML=skelCards(4);
  setTimeout(_origRenderStudentTests, 80);
};

// Show skeleton while loading leaderboard
var _origRenderLeaderboard=typeof renderLeaderboard==='function'?renderLeaderboard:null;
if(_origRenderLeaderboard){
  renderLeaderboard=function(){
    var lb=document.getElementById('lb-list');
    if(lb) lb.innerHTML=skelRows(6);
    setTimeout(_origRenderLeaderboard, 80);
  };
}

// Show skeleton while loading league
var _origRenderLeague=typeof renderLeague==='function'?renderLeague:null;
if(_origRenderLeague){
  renderLeague=function(){
    var lc=document.getElementById('s-league-content');
    if(lc) lc.innerHTML=skelRows(6);
    setTimeout(_origRenderLeague, 100);
  };
}

// Global page spinner (top progress bar)
var _spinnerEl=null;
function showSpinner(){
  if(!_spinnerEl) _spinnerEl=document.getElementById('global-spinner');
  if(_spinnerEl) _spinnerEl.style.display='block';
}
function hideSpinner(){
  if(!_spinnerEl) _spinnerEl=document.getElementById('global-spinner');
  if(_spinnerEl) _spinnerEl.style.display='none';
}

// Patch go() to show/hide spinner
var _origGoPremium=typeof go==='function'?go:null;
if(_origGoPremium){
  go=function(page){
    showSpinner();
    _origGoPremium(page);
    setTimeout(hideSpinner, 250);
  };
}

// Button ripple
document.addEventListener('click',function(e){
  var btn=e.target.closest('.btn');
  if(!btn) return;
  var r=document.createElement('span');
  r.className='ripple-el';
  var rect=btn.getBoundingClientRect();
  r.style.left=(e.clientX-rect.left)+'px';
  r.style.top=(e.clientY-rect.top)+'px';
  btn.appendChild(r);
  setTimeout(function(){r.remove();},500);
});

// Keep keyboard focus inside the currently open dialog.
document.addEventListener('keydown',function(event){
  if(event.key!=='Tab')return;
  const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(dialog=>!dialog.classList.contains('hidden')&&getComputedStyle(dialog).display!=='none');
  const dialog=dialogs[dialogs.length-1];if(!dialog)return;
  const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.offsetParent!==null);
  if(!items.length){event.preventDefault();dialog.setAttribute('tabindex','-1');dialog.focus();return;}
  const first=items[0],last=items[items.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

