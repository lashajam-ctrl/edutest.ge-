const USER_DB=[...DEFAULT_USERS];


// Subject → i18n key map for dynamic title translation
const SUBJ_KEY={'მათემატიკა':'math','ქართული':'georgian','ინგლისური':'english','რუსული':'russian','ბუნება':'nature','ისტორია':'history','გეოგრაფია':'geography','ბიოლოგია':'biology','ქიმია':'chemistry','ფიზიკა':'physics'};
const GRADE_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// Generate translated test title on-the-fly
function txTitle(tx){
  if(!tx) return '';
  if((tx.isCustom||tx.teacherCreated)&&tx.title)return tx.title;
  const subjKey=SUBJ_KEY[tx.subject]||'';
  const subjName=subjKey?t(subjKey):tx.subject;
  const gradeStr=tx.grade?GRADE_ROMAN[tx.grade-1]+' '+t('class_label'):'';
  const semester=tx.semester===1?t('sem1'):tx.semester===2?t('sem2'):'';
  const type=tx.testType==='sum'?t('test_sum'):tx.testType==='mid'?t('test_mid'):'';
  return [subjName,gradeStr,semester,type].filter(Boolean).join(' — ');
}

// Get title from a result record (uses testId to look up tx in ALL_TESTS)
function rTitle(r){
  if(!r) return '';
  const tx=ALL_TESTS.find(x=>x.id===r.testId);
  return tx?txTitle(tx):r.title||'';
}

const SESSION_RESULTS=[];  // populated by loadPersistedData()
let CUR_USER=null;

// ── Price config ──────────────────────────────────────────────────────────────
const PRICE_DEFAULTS={perSubject:9.99,monthly:19.99,yearly:169};
let PRICE_CONFIG={...PRICE_DEFAULTS};
function loadPrices(){PRICE_CONFIG={...PRICE_DEFAULTS};}
function savePrices(){return false;}
function getPrice(key){return(PRICE_CONFIG[key]||PRICE_DEFAULTS[key]).toFixed(2);}
function fmtPrice(key){return getPrice(key)+'₾';}
let curRole='student';
let builderStep=1;
let selQs=new Set();
let qIdx=0;
let qAnswers={};
let timerSec=1200;
let timerInt=null;
let curTest=null;
let curTestQs=[];

// ── Helpers ──────────────────────────────────────────────────────────────────
const SUBJ_COLORS={'მათემატიკა':'linear-gradient(135deg,#6366f1,#8b5cf6)','ქართული':'linear-gradient(135deg,#f59e0b,#d97706)','ინგლისური':'linear-gradient(135deg,#10b981,#059669)','რუსული':'linear-gradient(135deg,#ef4444,#dc2626)','ბუნება':'linear-gradient(135deg,#0ea5e9,#0284c7)','ისტორია':'linear-gradient(135deg,#8b5cf6,#7c3aed)','გეოგრაფია':'linear-gradient(135deg,#14b8a6,#0d9488)','ბიოლოგია':'linear-gradient(135deg,#22c55e,#16a34a)','ქიმია':'linear-gradient(135deg,#f97316,#ea580c)','ფიზიკა':'linear-gradient(135deg,#3b82f6,#2563eb)'};
const SUBJ_ICONS={'მათემატიკა':'📐','ქართული':'📚','ინგლისური':'🇬🇧','რუსული':'🇷🇺','ბუნება':'🌿','ისტორია':'🏛️','გეოგრაფია':'🌍','ბიოლოგია':'🧬','ქიმია':'⚗️','ფიზიკა':'⚡'};

function shuffleArr(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
let _tabSwitchCount=0;
document.addEventListener('visibilitychange',()=>{
  const onTest=document.getElementById('p-take-test')?.classList.contains('active');
  if(document.hidden&&onTest){
    _tabSwitchCount++;
    if(_tabSwitchCount>=3){
      showXpToast('⚠️ ტაბიდან გამოსვლა ჩაიწერება! ('+_tabSwitchCount+'x)',null);
    }
  }
});

function shuffleOpts(q){ return q; }

function prepareQ(q){
  // Server already sends a sanitized presentation payload. Never derive or
  // transform an answer key in the browser.
  const base={...q};
  base._kaText=q.text;
  base._kaOpts=q.opts?[...q.opts]:[];
  const tr=Q_TRANS[q.id];
  if(tr){
    if(LANG==='en'&&tr.en)base.text=tr.en;
    else if(LANG==='ru'&&tr.ru)base.text=tr.ru;
    if(Array.isArray(base.opts)){
      if(LANG==='en'&&tr.opts_en)base.opts=[...tr.opts_en];
      else if(LANG==='ru'&&tr.opts_ru)base.opts=[...tr.opts_ru];
    }
  }
  if(q.type==='true_false')base.opts=[t('true_ans'),t('false_ans')];
  return base;
}

// Get translated text for a question (live, for current LANG)
function qTransText(q){
  if(!q) return '';
  const tr=Q_TRANS[q.id];
  if(tr&&tr[LANG]) return tr[LANG];
  return q._kaText||q.text;
}

// Get translated opt text at shuffled position i (live, for current LANG)
function qTransOpt(q,i){
  if(!q||!q._shuffleMap) return q.opts?q.opts[i]:'';
  const origIdx=q._shuffleMap[i];
  const tr=Q_TRANS[q.id];
  if(tr){
    if(LANG==='en'&&tr.opts_en&&tr.opts_en[origIdx]) return tr.opts_en[origIdx];
    if(LANG==='ru'&&tr.opts_ru&&tr.opts_ru[origIdx]) return tr.opts_ru[origIdx];
  }
  return q._kaOpts?q._kaOpts[origIdx]:(q.opts?q.opts[i]:'');
}


// Georgian Language & Literature balance (Grades 5-11)
// Official weekly allocation is for the integrated subject; internal language hours are flexible.
// EduTest default assessment balance: 60% literature/reading and 40% language/writing.
function inferGeorgianStrand(q){
  if(q && (q.strand==='language'||q.strand==='literature')) return q.strand;
  const t=((q&&q.topic)||'').trim();
  const grade=Number(q&&q.grade||0), sem=Number(q&&q.semester||0);
  const exact={
    '5-1':new Set(['მეტყველების ნაწილები','პუნქტუაცია','წინადადების აგება','მართლწერა']),
    '5-2':new Set(['კავშირები','ტექსტის სტრუქტურა','წერის პროცესი','მიზნობრივი წერა']),
    '6-1':new Set(['მეტყველების ნაწილები კონტექსტში','პირდაპირი ნათქვამი და პუნქტუაცია','კავშირები','წინადადების რედაქტირება']),
    '6-2':new Set(['არგუმენტირებული პასუხი','ზმნის დრო კონტექსტში','პუნქტუაცია','ტექსტის კავშირი']),
    '7-1':new Set(['პუნქტუაცია','გრამატიკა კონტექსტში','სიტყვათწარმოება','ენობრივი ცნებები']),
    '7-2':new Set(['წინადადების რედაქტირება','კავშირები','წერითი პასუხი','არგუმენტაცია'])
  };
  const known=exact[grade+'-'+sem];
  if(known) return known.has(t)?'language':'literature';
  if(/გრამატ|პუნქტუ|მართლწერ|ზმნ|ბრუნვ|სიტყვათწარმო|რედაქტირ|წერითი|წერის|ენობრივ|პირდაპირი ნათქვამ|სინტაქს|მორფოლოგ/.test(t)) return 'language';
  return 'literature';
}
function balancedGeorgianSelect(email, tagged, count){
  const items=tagged.map(q=>({...q,strand:inferGeorgianStrand(q)}));
  const lit=items.filter(q=>q.strand==='literature');
  const lang=items.filter(q=>q.strand==='language');
  const litNeed=Math.round(count*0.60);
  const langNeed=count-litNeed;
  let selected=[];
  selected.push(...adaptiveSelectQs(email,lit,Math.min(litNeed,lit.length)));
  selected.push(...adaptiveSelectQs(email,lang,Math.min(langNeed,lang.length)));
  if(selected.length<count){
    const used=new Set(selected.map(q=>q.id));
    const rest=items.filter(q=>!used.has(q.id));
    selected.push(...adaptiveSelectQs(email,rest,Math.min(count-selected.length,rest.length)));
  }
  return shuffleArr(selected).slice(0,count);
}


function balancedHistorySelect(email, tagged, count){
  const items=tagged.map(q=>({...q}));
  const world=items.filter(q=>q.strand==='world');
  const georgia=items.filter(q=>q.strand==='georgia');
  const worldNeed=Math.floor(count/2);
  const georgiaNeed=count-worldNeed;
  let selected=[];
  selected.push(...adaptiveSelectQs(email,world,Math.min(worldNeed,world.length)));
  selected.push(...adaptiveSelectQs(email,georgia,Math.min(georgiaNeed,georgia.length)));
  if(selected.length<count){
    const used=new Set(selected.map(q=>q.id));
    const rest=items.filter(q=>!used.has(q.id));
    selected.push(...adaptiveSelectQs(email,rest,Math.min(count-selected.length,rest.length)));
  }
  return shuffleArr(selected).slice(0,count);
}

function balancedMathSelect(email, tagged, count){
  const items=tagged.map(q=>({...q}));
  if(!items.length||count<=0)return [];
  const keys=['numbers_operations','patterns_algebra','geometry_space','data_probability_statistics'];
  const groups={}; keys.forEach(k=>groups[k]=[]);
  items.forEach(q=>{const k=q.mathStrandKey||edutestInferMathStrand(q);(groups[k]||groups.numbers_operations).push(q);});
  const total=items.length;
  const quotas={}; let used=0;
  const fractions=[];
  keys.forEach(k=>{
    const raw=count*groups[k].length/total;
    quotas[k]=Math.min(groups[k].length,Math.floor(raw));
    used+=quotas[k];
    fractions.push([k,raw-Math.floor(raw)]);
  });
  fractions.sort((a,b)=>b[1]-a[1]);
  while(used<count){
    let progressed=false;
    for(const [k] of fractions){
      if(used>=count)break;
      if(quotas[k]<groups[k].length){quotas[k]++;used++;progressed=true;}
    }
    if(!progressed)break;
  }
  let selected=[];
  keys.forEach(k=>selected.push(...adaptiveSelectQs(email,groups[k],Math.min(quotas[k],groups[k].length))));
  if(selected.length<count){
    const chosen=new Set(selected.map(q=>q.id));
    const rest=items.filter(q=>!chosen.has(q.id));
    selected.push(...adaptiveSelectQs(email,rest,Math.min(count-selected.length,rest.length)));
  }
  return shuffleArr(selected).slice(0,count);
}

function getTestQs(test){
  throw new Error('SERVER_VERIFIED_REQUIRED: client-side question bank is disabled.');
}


// ══════════════════════════════════════════════════════════════
// SERVER-VERIFIED ASSESSMENT CLIENT
// ══════════════════════════════════════════════════════════════
const EDUTEST_ASSESSMENT_CONFIG={startFunction:'assessment-start',submitFunction:'assessment-submit',builderFunction:'assessment-builder',reportFunction:'assessment-report',required:true};
let curAssessmentSessionId=null;
let SERVER_VERIFIED_RESULTS=[];
async function invokeAssessment(name,body){
  if(!EDUTEST_CLOUD.client||!EDUTEST_CLOUD.user)throw new Error('უსაფრთხო შეფასებისთვის Cloud Auth საჭიროა.');
  const r=await EDUTEST_CLOUD.client.functions.invoke(name,{body});
  if(r.error){let msg=r.error.message||'Edge Function error';try{if(r.error.context){const j=await r.error.context.json();msg=j.error||msg;}}catch(_){}throw new Error(msg);}return r.data;
}
function assessmentErrorMessage(m){const x=String(m||'');if(x.includes('ATTEMPTS_EXHAUSTED'))return 'მცდელობების ლიმიტი ამოწურულია.';if(x.includes('GUARDIAN_CONSENT_REQUIRED'))return 'მშობლის/კანონიერი წარმომადგენლის თანხმობა ჯერ არ არის დადასტურებული.';if(x.includes('AGE_VERIFICATION_REQUIRED'))return 'ჯერ დაადასტურე ასაკი პროფილში.';if(x.includes('DEADLINE_PASSED'))return 'დავალების ვადა გასულია.';if(x.includes('SESSION_EXPIRED'))return 'ტესტის სესიის დრო ამოიწურა.';return x||'სერვერული შეფასება ვერ შესრულდა.';}
function setTestLoading(text){const el=document.getElementById('q-text');if(el)el.textContent=text||'იტვირთება...';const opts=document.getElementById('q-opts');if(opts)opts.innerHTML='<div style="padding:22px;text-align:center;color:var(--gray)">🔐 Server-verified assessment</div>';}
async function loadTeacherCustomTests(){try{if(!CUR_USER||!['teacher','admin'].includes(CUR_USER.role))return;const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'list_mine'});(d.tests||[]).forEach(t=>{if(!ALL_TESTS.some(x=>x.id===t.id))ALL_TESTS.push(t);});renderTeacherTests();}catch(e){console.warn('custom tests',e);}}
async function loadTeacherVerifiedResults(){try{if(!CUR_USER||!['teacher','admin'].includes(CUR_USER.role))return;const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'verified_results'});SERVER_VERIFIED_RESULTS=d.results||[];renderTeacherHome();renderTeacherStudents();}catch(e){console.warn('verified results',e);}}
function teacherResults(){return SERVER_VERIFIED_RESULTS||[];}

// ── Navigation ───────────────────────────────────────────────────────────────
function go(p){
  const role=CUR_USER?.role;
  if((p==='admin'&&role!=='admin')||(p==='teacher'&&!['teacher','admin'].includes(role))||(p==='student'&&role!=='student')||(p==='parent'&&role!=='parent'))p='landing';
  if(p!=='take-test'&&timerInt){clearInterval(timerInt);timerInt=null;}
  if(p!=='take-test')document.body.classList.remove('test-age-theme');
  if(['landing','login','teacher','admin','parent'].includes(p))clearGradeTheme();
  document.querySelectorAll('.page').forEach(x=>{x.classList.remove('active');});
  const el=document.getElementById('p-'+p);
  if(el){el.classList.add('active');el.classList.add('fade');}
  if(p==='take-test')startTest();
  if(p==='landing'){setTimeout(()=>renderLandingPrices(),50);}
  if(p==='student'){updateStudentUI();renderStudentProfile();renderSubjectMastery('s-mastery-home');renderClassChallenge();setTimeout(()=>renderDailyChallenge(),50);setTimeout(()=>renderOnboardingIfNeeded(),100);setTimeout(()=>renderAssignedTests(),80);}
  if(p==='teacher'){updateTeacherUI();renderTeacherHome();renderTeacherTests();setTimeout(()=>loadTeacherCustomTests(),30);setTimeout(()=>loadTeacherVerifiedResults(),60);}
  if(p==='admin'){if(typeof updateAdminUI==='function')updateAdminUI();if(typeof renderAdminHome==='function')renderAdminHome();if(typeof renderAdminUsers==='function')renderAdminUsers();}
}

// ── Sidebar (mobile) ─────────────────────────────────────────────────────────
let _curSidebarRole=null;
function toggleSidebar(role){
  _curSidebarRole=role;
  const panel=document.getElementById('p-'+role);
  const sb=panel?.querySelector('.sidebar');
  if(!sb)return;
  const isOpen=sb.classList.contains('open');
  if(isOpen){closeSidebar();}
  else{sb.classList.add('open');document.getElementById('sidebar-overlay').classList.add('show');document.body.style.overflow='hidden';}
}
function closeSidebar(){
  document.querySelectorAll('.sidebar.open').forEach(s=>s.classList.remove('open'));
  document.getElementById('sidebar-overlay').classList.remove('show');
  document.body.style.overflow='';
}

function sNav(id,el){
  if(window.innerWidth<=640)closeSidebar();
  ['s-home','s-tests','s-results','s-profile','s-leaderboard'].forEach(x=>{
    const e=document.getElementById(x);if(e){e.classList.add('hidden');e.classList.remove('fade');}
  });
  const tgt=document.getElementById(id);
  if(tgt){tgt.classList.remove('hidden');setTimeout(()=>tgt.classList.add('fade-in'),10);}
  document.querySelectorAll('#p-student .ni').forEach(x=>x.classList.remove('act'));
  if(el)el.classList.add('act');
  const titles={'s-home':t('adm_dashboard'),'s-tests':t('tests'),'s-results':t('my_results'),'s-profile':t('profile'),'s-leaderboard':'🏆 ლიდერბორდი'}
  if(id==='s-profile')setTimeout(()=>renderSubjectMastery('s-mastery-bars'),50);
  if(id==='s-home')setTimeout(()=>renderDailyChallenge(),50);;
  const tb=document.getElementById('s-topbar-title');if(tb)tb.textContent=titles[id]||'';
  const sb=document.getElementById('s-back-btn');if(sb)sb.style.display=(id==='s-home')?'none':'inline-flex';
  if(id==='s-tests')renderStudentTests();
  if(id==='s-results')renderStudentResults();
  if(id==='s-home'){updateStudentHomeStats();renderAssignedTests();}
}

function tNav(id,el){
  if(window.innerWidth<=640)closeSidebar();
  const tb2=document.getElementById('t-back-btn');if(tb2)tb2.style.display=(id==='t-home')?'none':'inline-flex';
  ['t-home','t-tests','t-students','t-analytics','t-assign'].forEach(x=>{
    const e=document.getElementById(x);if(e){e.classList.add('hidden');e.classList.remove('fade');}
  });
  const tgt=document.getElementById(id);
  if(tgt){tgt.classList.remove('hidden');setTimeout(()=>tgt.classList.add('fade-in'),10);}
  document.querySelectorAll('#p-teacher .ni').forEach(x=>x.classList.remove('act'));
  if(el)el.classList.add('act');
  if(id==='t-home')renderTeacherHome();
  if(id==='t-tests')renderTeacherTests();
  if(id==='t-students')renderTeacherStudents();
  if(id==='t-analytics')renderTeacherQAnalytics();
  const nb=document.getElementById('t-new-btn');
  if(nb)nb.style.display=id==='t-tests'?'':'none';
  
}

function aNav(id,el){
  if(window.innerWidth<=640)closeSidebar();
  const ab=document.getElementById('a-back-btn');if(ab)ab.style.display=(id==='a-home')?'none':'inline-flex';
  if(id==='a-users')renderAdminUsers(); if(id==='a-home')renderAdminHome(); if(id==='a-results')renderAdminResults(); if(id==='a-reports'){loadReports().then(renderAdminReports).catch(function(e){console.warn('reports',e);renderAdminReports();});} if(id==='a-schools'){renderAdminSchools();} if(id==='a-settings'){renderAdminPrices();} if(id==='a-questions')renderAdminQuestions(); if(id==='a-audit')renderAdminAudit(); if(id==='a-import')renderImportPanel(); if(id==='a-enterprise')renderEnterprisePanel();
  ['a-home','a-schools','a-users','a-pending','a-results','a-reports','a-settings','a-questions','a-audit','a-import','a-enterprise'].forEach(x=>{
    const e=document.getElementById(x);if(e){e.classList.add('hidden');e.classList.remove('fade');}
  });
  const tgt=document.getElementById(id);
  if(tgt){tgt.classList.remove('hidden');setTimeout(()=>tgt.classList.add('fade-in'),10);}
  document.querySelectorAll('#p-admin .ni').forEach(x=>x.classList.remove('act'));
  if(el)el.classList.add('act');
}

// ── Admin price management ────────────────────────────────────────────────────
function renderAdminPrices(){renderAdminPrizeForm();
  const ps=document.getElementById('adm-price-subject');
  const pm=document.getElementById('adm-price-monthly');
  const py=document.getElementById('adm-price-yearly');
  if(ps)ps.value=PRICE_CONFIG.perSubject;
  if(pm)pm.value=PRICE_CONFIG.monthly;
  if(py)py.value=PRICE_CONFIG.yearly;
  const msg=document.getElementById('adm-price-saved');
  if(msg)msg.style.display='none';
}
function showPremiumModal(){
  alert('Premium და გადახდები სატესტო ეტაპზე გამორთულია.');
}
function adminSavePrices(){
  alert('ფასების მართვა მეორე ეტაპამდე გამორთულია.');
}

// ── Login ────────────────────────────────────────────────────────────────────
let loginMode='login';
let emailRegistrationExpanded=false;

// ══════════════════════════════════════════════════════════════
// PREMIUM SYSTEM
// ══════════════════════════════════════════════════════════════
function isPremium(email){ const u=USER_DB.find(x=>x.email===email); return u&&u.premium; }

// ── Free-trial & paid-subject logic ──────────────────────────────────────────
// Each registered user gets 1 free test per subject at their grade.
// After using it they must pay: 9.99₾ per subject OR 19.99₾/month (Premium).

function getPaidSubjects(email){
  const u=USER_DB.find(x=>x.email===email);
  return u&&u.paidSubjects?u.paidSubjects:[];
}
function grantSubjectAccess(email, subject){
  const u=USER_DB.find(x=>x.email===email);
  if(!u)return;
  if(!u.paidSubjects)u.paidSubjects=[];
  if(!u.paidSubjects.includes(subject))u.paidSubjects.push(subject);
  saveUsers();
}
function hasUsedFreeTrial(email, subject){
  // Free trial consumed if user has any completed result in this subject
  return SESSION_RESULTS.some(r=>r.userId===email&&r.subject===subject);
}
// Returns: 'premium' | 'paid' | 'free' | 'locked'
function getTestAccess(email, testId){
  if(!PAYMENTS_ENABLED)return 'free';
  if(isPremium(email))return 'premium';
  const tx=ALL_TESTS.find(t=>t.id===testId);
  if(!tx)return 'locked';
  if(tx.paid===false)return 'free';
  const paidSubjs=getPaidSubjects(email);
  if(paidSubjs.includes(tx.subject))return 'paid';
  if(!hasUsedFreeTrial(email, tx.subject))return 'free';
  return 'locked';
}

function grantPremium(email, val){
  const u=USER_DB.find(x=>x.email===email);
  if(!u)return;
  u.premium=val;
  saveUsers();
  renderAdminUsers();
  if(CUR_USER&&CUR_USER.email===email){ CUR_USER.premium=val; renderStudentProfile(); }
}

// ══════════════════════════════════════════════════════════════
// ADMIN HOME — real stats
// ══════════════════════════════════════════════════════════════
function renderLandingPrices(){
  const el=document.getElementById('landing-price-monthly');
  if(el&&typeof PRICE_CONFIG!=='undefined')el.textContent=(PRICE_CONFIG.monthly||19.99)+'₾/თვე';
}
function updateAdminUI(){
  if(!CUR_USER)return;
  const av=document.getElementById('a-sidebar-av');if(av)av.textContent=(CUR_USER.name||'?')[0];
  const sn=document.getElementById('a-sidebar-name');if(sn)sn.textContent=CUR_USER.name||'';
  const se=document.getElementById('a-sidebar-email');if(se)se.textContent=CUR_USER.email||'—';
}


// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLOUD LAYER — Auth + multi-device adaptive history
// Setup: replace ONLY the two public values below, then run EduTest-Supabase-Setup.sql
// in Supabase SQL Editor. NEVER put a service_role/secret key in this HTML.
// ══════════════════════════════════════════════════════════════════════════════
const EDUTEST_SUPABASE_CONFIG = Object.freeze({
  url:'https://rlvxujpwoooxprhzgysj.supabase.co',
  publishableKey:'sb_publishable_ypVpw39S9Ppz8C3dL54EcQ_In3zFEf_',
  profilesTable:'profiles',
  questionHistoryTable:'question_history',
  subjectHistoryTable:'subject_history',
  // Optional explicit production callback URL. Leave blank to use the current https page.
  // This URL must also exist in Supabase Auth > URL Configuration > Redirect URLs.
  authRedirectUrl:'',
  allowDemoAccounts:false,
  allowLocalFallback:false,
  requireAdminMFA:true
});

// Legal/controller values MUST be completed before public registration is enabled.
// Do not invent these values: use the actual legal entity/controller and the actual Supabase project region.
const EDUTEST_PRIVACY_CONFIG = Object.freeze({
  controllerLegalName:'ლაშა ჯამაშვილი',
  controllerAddress:'გიორგი დანელიას ქ. 12, ბინა 10',
  controllerContactEmail:'lasha.jam@gmail.com',
  dpoContactEmail:'',
  processorName:'Supabase',
  processorRegion:'eu-central-1 (Frankfurt, Germany)',
  processorTransferBasis:'ძირითადი მონაცემები განთავსებულია გერმანიაში (eu-central-1), რომელიც საქართველოს პერსონალურ მონაცემთა დაცვის სამსახურის სათანადო გარანტიების მქონე ქვეყნების ნუსხაშია; Supabase მოქმედებს მონაცემთა დამუშავების შეთანხმებისა (DPA) და მასში ჩართული სტანდარტული სახელშეკრულებო პირობების (SCC) შესაბამისად.',
  privacyVersion:'privacy-2026-08-09-v1',
  termsVersion:'terms-2026-08-09-v1',
  guardianConsentVersion:'guardian-consent-2026-08-09-v1',
  learningHistoryRetentionMonths:24,
  pendingGuardianRetentionDays:30,
  enforceLegalConfig:true
});

const EDUTEST_CLOUD={client:null,user:null,profile:null,ready:false,syncing:false,lastError:null};

function isSupabaseConfigured(){
  const c=EDUTEST_SUPABASE_CONFIG;
  return !!(c.url && c.publishableKey && !c.url.includes('YOUR_PROJECT_REF') && !c.publishableKey.includes('REPLACE_ME'));
}
function setCloudStatus(msg,ok){
  const el=document.getElementById('cloud-auth-status');
  if(!el)return;
  el.textContent=(ok?'☁️ ':'⚠️ ')+msg;
  el.style.color=ok?'#166534':'#92400e';
  el.style.background=ok?'#f0fdf4':'#fffbeb';
  el.style.borderColor=ok?'#bbf7d0':'#fde68a';
}
function cloudUserEmail(){return (EDUTEST_CLOUD.user&&EDUTEST_CLOUD.user.email)||'';}
function tsToMs(v){ if(!v)return 0; const n=Date.parse(v); return Number.isFinite(n)?n:0; }
function msToIso(v){ const n=Number(v)||0; return n?new Date(n).toISOString():null; }
function getEduTestAuthRedirectUrl(){
  const explicit=(EDUTEST_SUPABASE_CONFIG.authRedirectUrl||'').trim();
  if(explicit)return explicit;
  if(/^https?:$/.test(location.protocol))return location.origin+location.pathname;
  return '';
}
function setLoginNotice(message,kind){
  const el=document.getElementById('login-error');
  if(!el)return;
  const ok=kind==='success';
  el.textContent=message;
  el.style.color=ok?'#166534':'#92400e';
  el.style.background=ok?'#f0fdf4':'#fffbeb';
  el.classList.remove('hidden');
}
const EDUTEST_OAUTH_PROVIDERS=Object.freeze({
  google:{label:'Google'},
  azure:{label:'Microsoft',serverKey:'microsoft'},
  facebook:{label:'Facebook'}
});
function updateSocialButtonLabels(){
  Object.keys(EDUTEST_OAUTH_PROVIDERS).forEach(function(provider){
    const button=document.getElementById('oauth-'+provider);
    const label=button?.querySelector('.oauth-label');
    if(label)label.textContent=EDUTEST_OAUTH_PROVIDERS[provider].label+'-ით გაგრძელება';
  });
}
function setOAuthButtonState(provider,enabled){
  const button=document.getElementById('oauth-'+provider);
  if(!button)return;
  button.disabled=!enabled;
  button.style.opacity=enabled?'1':'.55';
  button.setAttribute('aria-disabled',enabled?'false':'true');
}
async function refreshSocialProviderButtons(){
  const status=document.getElementById('oauth-provider-status');
  updateSocialButtonLabels();
  Object.keys(EDUTEST_OAUTH_PROVIDERS).forEach(p=>setOAuthButtonState(p,false));
  try{
    const response=await fetch('/api/auth/providers',{credentials:'include',cache:'no-store'});
    if(!response.ok)throw new Error('Auth settings unavailable');
    const settings=await response.json();
    const enabled=Object.keys(EDUTEST_OAUTH_PROVIDERS).filter(function(provider){
      const key=EDUTEST_OAUTH_PROVIDERS[provider].serverKey||provider;
      return settings[key]===true;
    });
    enabled.forEach(p=>setOAuthButtonState(p,true));
    if(status){
      const pendingFacebook=settings.facebookPendingReview===true;
      status.textContent=enabled.length
        ? 'უსაფრთხო შესვლა მზადაა'+(pendingFacebook?' · Facebook დაემატება Meta-ს დამტკიცების შემდეგ':'')
        : 'სოციალური შესვლა დროებით მიუწვდომელია.';
    }
  }catch(error){
    console.warn('OAuth provider availability',error);
    if(status)status.textContent='სოციალური შესვლის სტატუსი ვერ შემოწმდა. სცადეთ მოგვიანებით.';
  }
}
async function doSocialLogin(provider){
  const info=EDUTEST_OAUTH_PROVIDERS[provider];
  const button=document.getElementById('oauth-'+provider);
  if(!info||!button||button.disabled)return;
  try{
    button.disabled=true;
    setLoginNotice(info.label+' იხსნება…','success');
    const serverKey=info.serverKey||provider;
    const params=new URLSearchParams({mode:'auto'});
    window.top.location.assign('/api/auth/oauth/'+encodeURIComponent(serverKey)+'?'+params.toString());
  }catch(error){
    console.warn('OAuth sign-in',provider,error);
    setLoginNotice((error&&error.message)||info.label+'-ით შესვლა ვერ გაიხსნა. სცადეთ ხელახლა.','warn');
    await refreshSocialProviderButtons();
  }
}
function openPasswordRecoveryModal(){
  const m=document.getElementById('password-recovery-modal');
  if(m){m.classList.remove('hidden');m.style.display='flex';}
  const p=document.getElementById('recovery-pass-1');if(p)setTimeout(function(){p.focus();},0);
}
function closePasswordRecoveryModal(){
  const m=document.getElementById('password-recovery-modal');
  if(m){m.classList.add('hidden');m.style.display='none';}
}
async function requestPasswordReset(){
  const email=(document.getElementById('l-email')?.value||'').trim().toLowerCase();
  if(!email||!email.includes('@')){setLoginNotice('პაროლის აღსადგენად ჯერ შეიყვანეთ სწორი ელ-ფოსტა.','warn');return;}
  try{
    const response=await fetch('/api/auth/password/request',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email:email})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'მოთხოვნა ვერ გაიგზავნა');
    setLoginNotice(data.message||'თუ ეს ანგარიში არსებობს, პაროლის აღდგენის ბმული ელ-ფოსტაზე გაიგზავნა.','success');
  }catch(e){
    console.warn(e);
    setLoginNotice('პაროლის აღდგენის მოთხოვნა ვერ გაიგზავნა. შეამოწმეთ Cloud/SMTP კონფიგურაცია და სცადეთ მოგვიანებით.','warn');
  }
}
async function resendSignupConfirmation(){
  const email=(document.getElementById('l-email')?.value||'').trim().toLowerCase();
  if(!email||!email.includes('@')){setLoginNotice('ჯერ შეიყვანეთ სწორი ელ-ფოსტა.','warn');return;}
  try{
    if(!isSupabaseConfigured())throw new Error('Cloud Auth ჯერ არ არის კონფიგურირებული.');
    if(!EDUTEST_CLOUD.client)await initEduTestCloud();
    const redirectTo=getEduTestAuthRedirectUrl();
    const credentials={type:'signup',email:email};
    if(redirectTo)credentials.options={emailRedirectTo:redirectTo};
    const r=await EDUTEST_CLOUD.client.auth.resend(credentials);
    if(r.error)console.warn('resend confirmation',r.error);
    setLoginNotice('თუ ელ-ფოსტა დადასტურებას ელოდება, ახალი ბმული გაიგზავნა.','success');
  }catch(e){
    console.warn(e);
    setLoginNotice('დადასტურების წერილის მოთხოვნა ვერ გაიგზავნა. შეამოწმეთ Cloud/SMTP კონფიგურაცია.','warn');
  }
}
async function completePasswordRecovery(){
  const p1=document.getElementById('recovery-pass-1')?.value||'';
  const p2=document.getElementById('recovery-pass-2')?.value||'';
  const err=document.getElementById('recovery-error');
  const btn=document.getElementById('recovery-save-btn');
  function show(msg,ok){if(!err)return;err.textContent=msg;err.style.color=ok?'#166534':'#b91c1c';err.style.background=ok?'#f0fdf4':'#fef2f2';err.classList.remove('hidden');}
  if(p1.length<10){show('პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს.',false);return;}
  if(p1!==p2){show('პაროლები ერთმანეთს არ ემთხვევა.',false);return;}
  try{
    if(btn)btn.disabled=true;
    const resetToken=new URLSearchParams(location.search).get('reset')||'';
    if(resetToken){
      const response=await fetch('/api/auth/password/complete',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({token:resetToken,password:p1})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'პაროლის განახლება ვერ მოხერხდა.');
      show('პაროლი განახლდა — ანგარიში უკვე გახსნილია.',true);
      try{const clean=new URL(window.top.location.href);clean.searchParams.delete('reset');window.top.history.replaceState({},'',clean.pathname+clean.search+clean.hash);}catch(_){}
      setTimeout(async function(){closePasswordRecoveryModal();await adoptServerUser(data.user,{navigate:true});},700);
    }else{
      if(!EDUTEST_CLOUD.client)throw new Error('აღდგენის ბმული არასწორია ან ვადაგასულია.');
      const r=await EDUTEST_CLOUD.client.auth.updateUser({password:p1});
      if(r.error)throw r.error;
      show('პაროლი განახლდა. ახლა ერთხელ შედით ახალი პაროლით — ძველი ანგარიში ავტომატურად გადმოვა.',true);
      setTimeout(async function(){try{await EDUTEST_CLOUD.client.auth.signOut();}catch(_){}closePasswordRecoveryModal();openAuth('login');},1000);
    }
  }catch(e){show((e&&e.message)||'პაროლის განახლება ვერ მოხერხდა.',false);}
  finally{if(btn)btn.disabled=false;}
}


function edutestEscapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function edutestHashStr(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h|0;}
function isLegalConfigReady(){
  const c=EDUTEST_PRIVACY_CONFIG;
  const required=[c.controllerLegalName,c.controllerAddress,c.controllerContactEmail,c.processorRegion,c.processorTransferBasis];
  return required.every(v=>v && !String(v).includes('REPLACE_WITH_'));
}
function calculateAge(dob){
  if(!dob)return null; const d=new Date(dob+'T00:00:00'); if(Number.isNaN(d.getTime()))return null;
  const now=new Date(); let a=now.getFullYear()-d.getFullYear();
  const m=now.getMonth()-d.getMonth(); if(m<0||(m===0&&now.getDate()<d.getDate()))a--;
  return a;
}
function isUnder16Dob(dob){const a=calculateAge(dob);return a!==null&&a<16;}
function maskEmail(email){const [u,d]=(email||'').split('@');if(!d)return email||'';return (u.slice(0,2)||'*')+'***@'+d;}
function updateMinorRegistrationUI(){
  const dob=document.getElementById('r-dob')?.value||'';const wrap=document.getElementById('guardian-fields');
  if(wrap)wrap.classList.toggle('hidden',!isUnder16Dob(dob));
}
function updateAgeVerificationUI(){
  const role=document.getElementById('age-verify-role')?.value||'student';
  const dob=document.getElementById('age-verify-dob')?.value||'';
  const guardianWrap=document.getElementById('age-verify-guardian-wrap');
  const gradeWrap=document.getElementById('age-verify-grade-wrap');
  if(gradeWrap)gradeWrap.classList.toggle('hidden',role!=='student');
  if(guardianWrap)guardianWrap.classList.toggle('hidden',role!=='student'||!isUnder16Dob(dob));
}
function clearPendingMinorLocalLearning(email){
  if(!email)return;
  try{
    localStorage.removeItem('adaptive_'+email);
    localStorage.removeItem('edutest_cloud_migrated_'+String(EDUTEST_CLOUD.user?.id||'')+'_v1');
    for(let i=SESSION_RESULTS.length-1;i>=0;i--)if(SESSION_RESULTS[i].userId===email)SESSION_RESULTS.splice(i,1);
    saveResults();
  }catch(e){console.warn('minor local history purge',e);}
}
function studentPrivacyGate(appUser){
  if(!appUser||appUser.role!=='student')return 'ok';
  if(appUser.accountStatus==='deletion_requested')return 'blocked';
  if(!appUser.birthDate)return 'age_required';
  if(isUnder16Dob(appUser.birthDate)&&!appUser.guardianVerifiedAt)return 'guardian_required';
  if(appUser.accountStatus&&appUser.accountStatus!=='active')return 'blocked';
  return 'ok';
}
function legalControllerSummary(){
  const c=EDUTEST_PRIVACY_CONFIG;
  return `<b>${edutestEscapeHtml(c.controllerLegalName)}</b><br>${edutestEscapeHtml(c.controllerAddress)}<br><a href="mailto:${edutestEscapeHtml(c.controllerContactEmail)}">${edutestEscapeHtml(c.controllerContactEmail)}</a>`;
}
function openLegalDocument(kind){
  const m=document.getElementById('legal-modal'),body=document.getElementById('legal-modal-content');if(!m||!body)return;
  const c=EDUTEST_PRIVACY_CONFIG;
  let html='';
  if(kind==='terms') html=`<h2 style="margin-bottom:10px;color:#0f172a">წესები და პირობები</h2>
    <p><b>ვერსია:</b> ${edutestEscapeHtml(c.termsVersion)}</p>
    <p>EduTest.ge არის სასწავლო/სატესტო სერვისი და არ ცვლის სკოლის ოფიციალურ შეფასებას, მასწავლებლის პროფესიულ გადაწყვეტილებას ან სახელმწიფო გამოცდის ოფიციალურ შედეგს.</p>
    <p>ანგარიშის მონაცემები უნდა იყოს ზუსტი. აკრძალულია სხვა პირის ანგარიშზე უნებართვო წვდომა, უსაფრთხოების გვერდის ავლა, ავტომატიზებული ბოროტად გამოყენება და სხვა მომხმარებლის მონაცემების მოპოვების მცდელობა.</p>
    <p>16 წლამდე მოსწავლისთვის პლატფორმა ითხოვს მშობლის/კანონიერი წარმომადგენლის დადასტურებას მანამდე, სანამ პერსონალიზებული სწავლის ისტორია ჩაირთვება.</p>
    <p>შეკითხვები/შედეგები სწავლის მხარდამჭერია. თუ კითხვაში შეცდომას აღმოაჩენთ, გამოიყენეთ რეპორტის ფუნქცია.</p>`;
  else if(kind==='child') html=`<h2 style="margin-bottom:10px;color:#0f172a">ბავშვთა უსაფრთხოების პოლიტიკა</h2>
    <p>EduTest ბავშვთან დაკავშირებულ გადაწყვეტილებებში პრიორიტეტად მიიჩნევს ბავშვის საუკეთესო ინტერესებს.</p>
    <ul><li>16 წლამდე მოსწავლის ანგარიშის სასწავლო მონაცემთა დამუშავება იბლოკება წარმომადგენლის დადასტურებამდე.</li><li>peer-to-peer პირადი ჩატი/DM არ არის ჩართული.</li><li>სხვა მოსწავლეებისთვის სრული სახელი ლიდერბორდზე ნაგულისხმევად არ ქვეყნდება; ლიდერბორდში მონაწილეობა default-ად გამორთულია.</li><li>სკოლა სურვილისამებრ ივსება და საჯაროდ არ ქვეყნდება.</li><li>მომხმარებელს შეუძლია პრობლემური კითხვის/კონტენტის რეპორტი.</li><li>ბავშვს ან წარმომადგენელს შეუძლია მონაცემების ასლის მოთხოვნა, გასწორება და ანგარიშის წაშლა.</li></ul>
    <p>კონტაქტი უსაფრთხოებისა და კონფიდენციალურობის საკითხებზე: <a href="mailto:${edutestEscapeHtml(c.controllerContactEmail)}">${edutestEscapeHtml(c.controllerContactEmail)}</a>.</p>`;
  else html=`<h2 style="margin-bottom:10px;color:#0f172a">კონფიდენციალურობის პოლიტიკა</h2>
    <p><b>ვერსია:</b> ${edutestEscapeHtml(c.privacyVersion)}</p>
    <p><b>დამუშავებისთვის პასუხისმგებელი პირი:</b><br>${legalControllerSummary()}</p>
    <h3>რა მონაცემებს ვამუშავებთ და რა არის სავალდებულო</h3><p>ანგარიშისთვის სავალდებულოა ელფოსტა, სახელი და მოსწავლისთვის კლასი/დაბადების თარიღი; <b>სკოლა სურვილისამებრია</b>. 16 წლამდე ანგარიშისთვის სავალდებულოა მშობლის/სხვა კანონიერი წარმომადგენლის ელფოსტა და დადასტურებული consent-log. პერსონალიზებული სწავლისას ინახება ტესტის/კითხვის შესრულების ისტორია, სწორი/არასწორი პასუხების სტატისტიკა და ბოლო გამოყენების დრო; უსაფრთხოებისთვის შეიძლება დამუშავდეს აუცილებელი ტექნიკური ჟურნალი. სავალდებულო ანგარიშის მონაცემის არმიწოდებისას ანგარიში ან შესაბამისი ფუნქცია ვერ გააქტიურდება.</p>
    <h3>მიზნები და სამართლებრივი საფუძვლები</h3>
    <ul><li><b>ანგარიში, ავტორიზაცია და ტესტის მიწოდება:</b> მომხმარებელთან დადებული სერვისის პირობების შესრულება და მომხმარებლის მოთხოვნით მომსახურების გაწევა.</li><li><b>სწავლის ისტორია და Smart Selection:</b> მოსწავლის თანხმობა, ხოლო 16 წლამდე — მშობლის/სხვა კანონიერი წარმომადგენლის დადასტურებული თანხმობა. თანხმობის უკან წაღების შემდეგ პერსონალიზებული ისტორიის დამუშავება წყდება.</li><li><b>ანგარიშის უსაფრთხოება, ბოროტად გამოყენების პრევენცია და ტექნიკური ჟურნალები:</b> პლატფორმისა და მომხმარებლების უსაფრთხოების მნიშვნელოვანი ლეგიტიმური ინტერესი და, შესაბამის შემთხვევაში, სამართლებრივი ვალდებულება.</li><li><b>ტრანზაქციული email (დადასტურება/პაროლის აღდგენა/guardian consent):</b> ანგარიშის უსაფრთხო ფუნქციონირებისა და მოთხოვნილი სერვისის მიწოდება.</li></ul>
    <h3>მიმღებები და უცხოეთში გადაცემა</h3><p>Cloud/Auth დამუშავებისთვის გამოიყენება ${edutestEscapeHtml(c.processorName)}; პროექტის კონფიგურირებული რეგიონია <b>${edutestEscapeHtml(c.processorRegion)}</b>. ტრანსსასაზღვრო გადაცემის დოკუმენტირებული საფუძველი/გარანტია: <b>${edutestEscapeHtml(c.processorTransferBasis)}</b>. SMTP/email პროვაიდერი ამუშავებს მხოლოდ ტრანზაქციული წერილისთვის აუცილებელ მონაცემებს. წარმოებაში ქვეპროცესორების სია და გადაცემის საფუძველი უნდა ემთხვეოდეს რეალურად მოქმედ კონტრაქტებს.</p>
    <h3>შენახვის ვადა</h3><p>აქტიური ანგარიშის სასწავლო ისტორია ინახება სერვისის გამოყენებისას; ხანგრძლივი უმოქმედობისას სამიზნე retention არის ${c.learningHistoryRetentionMonths} თვე. წარმომადგენლის დაუდასტურებელი მოთხოვნა იწურება ${c.pendingGuardianRetentionDays} დღეში. ანგარიშის წაშლის მოთხოვნა სრულდება გონივრულად სწრაფად და კანონით დასაშვები გამონაკლისების გათვალისწინებით; შესაბამისობის/თანხმობის მინიმალური ჩანაწერები შეიძლება შენარჩუნდეს მხოლოდ სამართლებრივი დაცვისთვის საჭირო ვადით.</p>
    <h3>თქვენი უფლებები</h3><p>შეგიძლიათ მოითხოვოთ ინფორმაცია და მონაცემის ასლი, გასწორება/განახლება, კანონით გათვალისწინებულ შემთხვევებში დამუშავების შეწყვეტა/წაშლა/განადგურება ან შეზღუდვა, თანხმობის უკან წაღება და გასაჩივრება. აპში დამატებულია მონაცემების export და ანგარიშის წაშლის ფუნქცია. უფლებების დარღვევის შემთხვევაში შეგიძლიათ მიმართოთ საქართველოს სახელმწიფო აუდიტის სამსახურს ან სასამართლოს მოქმედი წესით.</p>
    <h3>ავტომატიზებული არჩევა</h3><p>Smart Selection იყენებს სწავლის ისტორიას მხოლოდ მომდევნო სასწავლო კითხვების დასალაგებლად; ის არ იღებს სამართლებრივი, ფინანსური ან სხვა ანალოგიურად არსებითი შედეგის მქონე გადაწყვეტილებას.</p>`;
  body.innerHTML=html;m.classList.remove('hidden');m.style.display='flex';
}
function closeLegalDocument(){const m=document.getElementById('legal-modal');if(m){m.classList.add('hidden');m.style.display='none';}}
function showAgeVerificationModal(){
  const m=document.getElementById('age-verification-modal');if(!m)return;
  const metadata=EDUTEST_CLOUD.user?.user_metadata||{};
  const name=document.getElementById('age-verify-name');
  const role=document.getElementById('age-verify-role');
  const grade=document.getElementById('age-verify-grade');
  const school=document.getElementById('age-verify-school');
  if(name&&!name.value)name.value=CUR_USER?.name||metadata.name||metadata.full_name||'';
  if(role)role.value=CUR_USER?.role==='pending_teacher'?'teacher':CUR_USER?.role==='parent'?'parent':'student';
  if(grade&&!grade.value)grade.value=String(CUR_USER?.grade||'').replace(/[^0-9].*$/,'');
  if(school&&!school.value)school.value=CUR_USER?.school||metadata.school||'';
  updateAgeVerificationUI();m.classList.remove('hidden');m.style.display='flex';
}
function hideAgeVerificationModal(){const m=document.getElementById('age-verification-modal');if(m){m.classList.add('hidden');m.style.display='none';}}
function showGuardianPendingModal(appUser){
  const m=document.getElementById('guardian-pending-modal');if(!m)return;
  const e=document.getElementById('guardian-pending-email');if(e)e.textContent='დადასტურების მისამართი: '+maskEmail(appUser.guardianEmail||'');
  m.classList.remove('hidden');m.style.display='flex';
}
function hideGuardianPendingModal(){const m=document.getElementById('guardian-pending-modal');if(m){m.classList.add('hidden');m.style.display='none';}}
function guardianConsentChildId(){try{return new URLSearchParams(location.search).get('guardian_consent_child')||'';}catch(_){return '';}}
function clearGuardianConsentParam(){try{const u=new URL(location.href);u.searchParams.delete('guardian_consent_child');history.replaceState({},'',u.pathname+u.search+u.hash);}catch(_){}}
function guardianRedirectUrl(childId){
  const base=getEduTestAuthRedirectUrl(); if(!base)return '';
  const u=new URL(base);u.searchParams.set('guardian_consent_child',childId);return u.toString();
}
async function sendGuardianConsentEmail(guardianEmail,childId){
  if(!guardianEmail||!childId)throw new Error('Guardian consent data incomplete');
  const redirectTo=guardianRedirectUrl(childId); if(!redirectTo)throw new Error('Production HTTPS redirect URL is required');
  const r=await EDUTEST_CLOUD.client.auth.signInWithOtp({email:guardianEmail,options:{emailRedirectTo:redirectTo,shouldCreateUser:true,data:{requested_role:'guardian'}}});
  if(r.error)throw r.error; return true;
}
async function resendGuardianConsent(){
  try{
    if(CUR_USER?.authProvider==='server'){
      const response=await fetch('/api/auth/guardian/resend',{method:'POST',credentials:'include'});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'ბმულის გაგზავნა ვერ მოხერხდა.');
      alert('დადასტურების ახალი ბმული გაიგზავნა წარმომადგენლის ელფოსტაზე.');return;
    }
    if(!EDUTEST_CLOUD.client||!EDUTEST_CLOUD.user)throw new Error('შესვლა საჭიროა');
    let q=await EDUTEST_CLOUD.client.from('guardian_consent_requests').select('child_user_id,guardian_email,status').eq('child_user_id',EDUTEST_CLOUD.user.id).order('requested_at',{ascending:false}).limit(1).maybeSingle();
    if(q.error||!q.data)throw q.error||new Error('თანხმობის მოთხოვნა ვერ მოიძებნა');
    if(q.data.status==='accepted'){alert('წარმომადგენლის თანხმობა უკვე დადასტურებულია. დააჭირეთ „სტატუსის შემოწმებას“.');return;}
    if(q.data.status!=='pending'){
      const rr=await EDUTEST_CLOUD.client.rpc('restart_guardian_consent',{p_consent_version:EDUTEST_PRIVACY_CONFIG.guardianConsentVersion});
      if(rr.error)throw rr.error;
      q=await EDUTEST_CLOUD.client.from('guardian_consent_requests').select('child_user_id,guardian_email,status').eq('child_user_id',EDUTEST_CLOUD.user.id).maybeSingle();
      if(q.error||!q.data)throw q.error||new Error('თანხმობის მოთხოვნა ვერ განახლდა');
    }
    await sendGuardianConsentEmail(q.data.guardian_email,q.data.child_user_id);
    alert('დადასტურების ბმული გაიგზავნა წარმომადგენლის ელფოსტაზე.');
  }catch(e){alert((e&&e.message)||'ბმულის გაგზავნა ვერ მოხერხდა.');}
}
async function refreshGuardianConsentStatus(){
  try{
    if(CUR_USER?.authProvider==='server'){
      const response=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
      const data=await response.json().catch(()=>({}));if(!response.ok||!data.user)throw new Error('სესია ვერ მოიძებნა');
      const app=await adoptServerUser(data.user,{navigate:false});
      if(studentPrivacyGate(app)==='ok'){hideGuardianPendingModal();go('student');alert('თანხმობა დადასტურებულია — ანგარიში გააქტიურდა.');}
      else alert('თანხმობა ჯერ არ არის დადასტურებული.');return;
    }
    if(!EDUTEST_CLOUD.user)throw new Error('შესვლა საჭიროა');
    const p=await fetchCloudProfile(EDUTEST_CLOUD.user);if(!p)throw new Error('პროფილი ვერ მოიძებნა');
    EDUTEST_CLOUD.profile=p;const app=appUserFromCloud(EDUTEST_CLOUD.user,p);mergeAppUserIntoLocal(app);
    if(studentPrivacyGate(app)==='ok'){hideGuardianPendingModal();await syncAdaptiveFromCloud(app.email,EDUTEST_CLOUD.user.id);go('student');alert('თანხმობა დადასტურებულია — ანგარიში გააქტიურდა.');}
    else alert('თანხმობა ჯერ არ არის დადასტურებული.');
  }catch(e){alert((e&&e.message)||'სტატუსის შემოწმება ვერ შესრულდა.');}
}
async function maybeOpenGuardianConsentFlow(){
  const childId=guardianConsentChildId(); if(!childId||!EDUTEST_CLOUD.client||!EDUTEST_CLOUD.user)return false;
  try{
    const q=await EDUTEST_CLOUD.client.from('guardian_consent_requests').select('*').eq('child_user_id',childId).order('requested_at',{ascending:false}).limit(1).maybeSingle();
    if(q.error)throw q.error;if(!q.data)throw new Error('თანხმობის მოთხოვნა არ მოიძებნა ან ამ ელფოსტაზე არ არის გაცემული.');
    window._guardianConsentRequest=q.data;
    const sum=document.getElementById('guardian-review-summary');
    if(sum)sum.innerHTML=`თქვენ ხართ შესული როგორც <b>${edutestEscapeHtml(EDUTEST_CLOUD.user.email||'')}</b>.<br>თანხმობის მოთხოვნა ეხება მოსწავლეს: <b>${edutestEscapeHtml(q.data.child_display_name||'მოსწავლე')}</b>.<br>სტატუსი: <b>${edutestEscapeHtml(q.data.status)}</b>`;
    const pending=document.getElementById('guardian-pending-actions'),withdraw=document.getElementById('guardian-withdraw-btn'),check=document.getElementById('guardian-consent-check');
    if(pending)pending.style.display=q.data.status==='pending'?'flex':'none';
    if(withdraw)withdraw.classList.toggle('hidden',q.data.status!=='accepted');
    if(check)check.disabled=q.data.status!=='pending';
    const m=document.getElementById('guardian-review-modal');if(m){m.classList.remove('hidden');m.style.display='flex';}
    return true;
  }catch(e){setLoginNotice((e&&e.message)||'თანხმობის ბმული ვერ დამუშავდა.','warn');go('login');return false;}
}
async function submitGuardianConsent(accept){
  const req=window._guardianConsentRequest,err=document.getElementById('guardian-review-error');
  if(!req)return;
  if(accept&&!document.getElementById('guardian-consent-check')?.checked){if(err){err.textContent='თანხმობის დასადასტურებლად მონიშნეთ შესაბამისი ველი.';err.classList.remove('hidden');}return;}
  try{
    const fn=accept?'accept_guardian_consent':'decline_guardian_consent';
    const r=await EDUTEST_CLOUD.client.rpc(fn,{p_child_user_id:req.child_user_id,p_consent_version:req.consent_version});
    if(r.error)throw r.error;
    alert(accept?'თანხმობა დაფიქსირდა. ბავშვს შეუძლია ანგარიშში შესვლა.':'თანხმობა არ გაიცა. ბავშვის პერსონალიზებული ანგარიში არ გააქტიურდება.');
    const m=document.getElementById('guardian-review-modal');if(m){m.classList.add('hidden');m.style.display='none';}
    clearGuardianConsentParam();await EDUTEST_CLOUD.client.auth.signOut();go('landing');
  }catch(e){if(err){err.textContent=(e&&e.message)||'ოპერაცია ვერ შესრულდა.';err.classList.remove('hidden');}}
}
async function withdrawGuardianConsent(){
  const req=window._guardianConsentRequest;if(!req)return;
  if(!confirm('ნამდვილად გსურთ თანხმობის უკან წაღება? ბავშვის პერსონალიზებული მონაცემების დამუშავება დაიბლოკება.'))return;
  try{
    const r=await EDUTEST_CLOUD.client.rpc('withdraw_guardian_consent',{p_child_user_id:req.child_user_id,p_consent_version:req.consent_version});if(r.error)throw r.error;
    alert('თანხმობა გაუქმდა. ბავშვის ანგარიში დაიბლოკება წარმომადგენლის ახალი თანხმობის მიღებამდე.');
    clearGuardianConsentParam();await EDUTEST_CLOUD.client.auth.signOut();go('landing');
  }catch(e){alert((e&&e.message)||'თანხმობის გაუქმება ვერ შესრულდა.');}
}
async function submitAgeVerification(){
  const name=(document.getElementById('age-verify-name')?.value||'').trim();
  const role=document.getElementById('age-verify-role')?.value||'student';
  const grade=document.getElementById('age-verify-grade')?.value||'';
  const school=(document.getElementById('age-verify-school')?.value||'').trim();
  const dob=document.getElementById('age-verify-dob')?.value||'',g=(document.getElementById('age-verify-guardian')?.value||'').trim().toLowerCase();
  const err=document.getElementById('age-verify-error');const fail=m=>{if(err){err.textContent=m;err.classList.remove('hidden');}};
  if(name.length<2||name.length>100)return fail('შეიყვანეთ სახელი და გვარი.');
  if(role==='student'&&!/^(?:[1-9]|1[0-2])$/.test(grade))return fail('აირჩიეთ კლასი.');
  const age=calculateAge(dob);if(age===null||age<(role!=='student'?18:5)||age>100)return fail('შეიყვანეთ სწორი დაბადების თარიღი. მშობელი/მასწავლებელი სრულწლოვანი უნდა იყოს.');
  if(!document.getElementById('age-verify-terms')?.checked||!document.getElementById('age-verify-privacy')?.checked)return fail('გაგრძელებამდე გაეცანით და დაადასტურეთ წესები/კონფიდენციალურობა.');
  if(role==='student'&&age<16&&(!g||!g.includes('@')||g===String(CUR_USER?.email||EDUTEST_CLOUD.user?.email||'').toLowerCase()))return fail('16 წლამდე მოსწავლისთვის მიუთითეთ წარმომადგენლის განსხვავებული სწორი ელფოსტა.');
  try{
    if(CUR_USER?.authProvider==='server'){
      const response=await fetch('/api/auth/profile',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,requestedRole:role,grade:grade,school:school,birthDate:dob,guardianEmail:g||'',termsVersion:EDUTEST_PRIVACY_CONFIG.termsVersion,privacyVersion:EDUTEST_PRIVACY_CONFIG.privacyVersion})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'პროფილის დასრულება ვერ შესრულდა.');
      hideAgeVerificationModal();const app=await adoptServerUser(data.user,{navigate:false});
      if(role==='student'&&age<16){clearPendingMinorLocalLearning(app.email);showGuardianPendingModal(app);}
      else if(app.role==='pending_teacher'){go('login');setLoginNotice('🕐 მასწავლებლის ანგარიში შექმნილია და ადმინისტრატორის დამტკიცებას ელოდება.','success');}
      else go(app.role);return;
    }
    const socialProfile=EDUTEST_CLOUD.profile&&!EDUTEST_CLOUD.profile.profile_completed_at;
    const r=socialProfile
      ? await EDUTEST_CLOUD.client.rpc('complete_social_profile',{p_name:name,p_requested_role:role,p_grade:grade,p_school:school,p_birth_date:dob,p_guardian_email:g||null,p_terms_version:EDUTEST_PRIVACY_CONFIG.termsVersion,p_privacy_version:EDUTEST_PRIVACY_CONFIG.privacyVersion,p_guardian_consent_version:EDUTEST_PRIVACY_CONFIG.guardianConsentVersion})
      : await EDUTEST_CLOUD.client.rpc('complete_age_verification',{p_birth_date:dob,p_guardian_email:g||null,p_terms_version:EDUTEST_PRIVACY_CONFIG.termsVersion,p_privacy_version:EDUTEST_PRIVACY_CONFIG.privacyVersion,p_guardian_consent_version:EDUTEST_PRIVACY_CONFIG.guardianConsentVersion});
    if(r.error)throw r.error;hideAgeVerificationModal();
    if(role==='student'&&age<16){clearPendingMinorLocalLearning(EDUTEST_CLOUD.user.email||'');await sendGuardianConsentEmail(g,EDUTEST_CLOUD.user.id);const app=await adoptSupabaseUser(EDUTEST_CLOUD.user,{navigate:false});showGuardianPendingModal(app);}
    else await adoptSupabaseUser(EDUTEST_CLOUD.user,{navigate:true});
  }catch(e){fail((e&&e.message)||'პროფილის დასრულება ვერ შესრულდა.');}
}
let ADMIN_MFA_FACTOR_ID='';
let ADMIN_MFA_PENDING=null;
let ADMIN_MFA_METHOD='totp';
function setAdminMFAError(message){
  const el=document.getElementById('admin-mfa-error');if(!el)return;
  el.textContent=message||'';el.classList.toggle('hidden',!message);
}
function showAdminMFAModal(mode,totp){
  const modal=document.getElementById('admin-mfa-modal');
  const enroll=document.getElementById('admin-mfa-enroll');
  const help=document.getElementById('admin-mfa-help');
  if(!modal||!enroll||!help)throw new Error('MFA ინტერფეისი მიუწვდომელია.');
  const isEnroll=mode==='enroll';
  ADMIN_MFA_METHOD=mode==='email'?'email':'totp';
  const sendButton=document.getElementById('admin-mfa-email-send');
  if(sendButton){sendButton.classList.toggle('hidden',mode!=='email');sendButton.disabled=false;sendButton.textContent='კოდის ელფოსტაზე გაგზავნა';}
  const codeLabel=document.getElementById('admin-mfa-code-label');if(codeLabel)codeLabel.textContent=mode==='email'?'ელფოსტაზე მიღებული 6-ნიშნა კოდი':'Authenticator-ის 6-ნიშნა კოდი';
  enroll.classList.toggle('hidden',!isEnroll);
  help.textContent=mode==='email'?'დააჭირეთ კოდის გაგზავნას. წერილი მივა '+String(totp?.maskedEmail||'დაკავშირებულ ელფოსტაზე')+'-ზე. კოდი მოქმედებს 5 წუთი. შეამოწმეთ სპამის საქაღალდეც.':isEnroll
    ? 'გახსენით Google Authenticator, Microsoft Authenticator ან სხვა TOTP აპი, დაამატეთ ანგარიში ქვემოთ მოცემული საიდუმლო კოდით და შეიყვანეთ მიღებული 6-ნიშნა კოდი.'
    : 'შეიყვანეთ თქვენს Authenticator აპში ნაჩვენები მიმდინარე 6-ნიშნა კოდი.';
  if(isEnroll){
    const qr=document.getElementById('admin-mfa-qr'),secret=document.getElementById('admin-mfa-secret');
    if(qr){const source=String(totp&&totp.qr_code||'');qr.src=source;qr.parentElement.style.display=source?'flex':'none';}
    if(secret)secret.textContent=String(totp&&totp.secret||'');
  }
  const code=document.getElementById('admin-mfa-code');if(code){code.value='';setTimeout(()=>code.focus(),50);}
  setAdminMFAError('');modal.classList.remove('hidden');modal.style.display='flex';
}
function hideAdminMFAModal(){
  const modal=document.getElementById('admin-mfa-modal');if(modal){modal.classList.add('hidden');modal.style.display='none';}
  const secret=document.getElementById('admin-mfa-secret'),code=document.getElementById('admin-mfa-code');if(secret)secret.textContent='';if(code)code.value='';
}
async function sendAdminMFAEmail(){
  const button=document.getElementById('admin-mfa-email-send'),userId=CUR_USER?.cloudId;
  if(!button||button.disabled||ADMIN_MFA_METHOD!=='email')return;
  button.disabled=true;button.textContent='იგზავნება…';setAdminMFAError('');
  try{
    const response=await fetch('/api/auth/mfa',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'email_send'})});
    const data=await response.json().catch(()=>({}));if(CUR_USER?.cloudId!==userId)return;
    if(!response.ok)throw new Error(data.error||'კოდი ვერ გაიგზავნა.');
    document.getElementById('admin-mfa-help').textContent='კოდი გაიგზავნა '+data.maskedEmail+'-ზე. შეიყვანეთ 5 წუთის განმავლობაში. თუ წერილი არ ჩანს, შეამოწმეთ სპამი.';
    button.textContent='ხელახლა გაგზავნა — 1 წუთში';
    setTimeout(()=>{if(CUR_USER?.cloudId===userId){button.disabled=false;button.textContent='კოდის ხელახლა გაგზავნა';}},60000);
    document.getElementById('admin-mfa-code')?.focus();
  }catch(error){if(CUR_USER?.cloudId===userId){setAdminMFAError(error.message);button.disabled=false;button.textContent='კოდის გაგზავნის ხელახლა ცდა';}}
}
async function beginAdminMFA(){
  if(CUR_USER&&CUR_USER.authProvider==='server'){
    const statusResponse=await fetch('/api/auth/mfa',{credentials:'include',cache:'no-store'});
    const status=await statusResponse.json().catch(()=>({}));
    if(!statusResponse.ok)throw new Error(status.error||'MFA სტატუსის მიღება ვერ მოხერხდა.');
    if(status.verified)return true;
    if(status.method==='email')showAdminMFAModal('email',status);
    else if(status.enrolled)showAdminMFAModal('challenge');
    else{
      const enrollResponse=await fetch('/api/auth/mfa',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'enroll'})});
      const enrolled=await enrollResponse.json().catch(()=>({}));
      if(!enrollResponse.ok)throw new Error(enrolled.error||'MFA ჩართვა ვერ შესრულდა.');
      if(enrolled.enrolled)showAdminMFAModal('challenge');
      else showAdminMFAModal('enroll',{secret:enrolled.secret});
    }
    return new Promise((resolve,reject)=>{ADMIN_MFA_PENDING={resolve,reject};});
  }
  const listed=await EDUTEST_CLOUD.client.auth.mfa.listFactors();
  if(listed.error)throw listed.error;
  const totpFactors=(listed.data&&listed.data.totp)||[];
  const verified=totpFactors.find(f=>f.status==='verified');
  if(verified){ADMIN_MFA_FACTOR_ID=verified.id;showAdminMFAModal('challenge');}
  else{
    for(const stale of totpFactors.filter(f=>f.status!=='verified')){
      try{await EDUTEST_CLOUD.client.auth.mfa.unenroll({factorId:stale.id});}catch(_){ }
    }
    const enrolled=await EDUTEST_CLOUD.client.auth.mfa.enroll({factorType:'totp',issuer:'EduTest.ge',friendlyName:'EduTest Admin'});
    if(enrolled.error)throw enrolled.error;
    ADMIN_MFA_FACTOR_ID=enrolled.data.id;showAdminMFAModal('enroll',enrolled.data.totp);
  }
  return new Promise((resolve,reject)=>{ADMIN_MFA_PENDING={resolve,reject};});
}
async function verifyAdminMFA(){
  const code=(document.getElementById('admin-mfa-code')?.value||'').replace(/\D/g,'');
  if(!/^\d{6}$/.test(code)){setAdminMFAError('შეიყვანეთ სწორი 6-ნიშნა კოდი.');return;}
  const button=document.getElementById('admin-mfa-verify');if(button)button.disabled=true;
  try{
    if(CUR_USER&&CUR_USER.authProvider==='server'){
      const response=await fetch('/api/auth/mfa',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:ADMIN_MFA_METHOD==='email'?'email_verify':'verify',code})});
      const verified=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(verified.error||'კოდის დადასტურება ვერ შესრულდა.');
    }else{
      const verified=await EDUTEST_CLOUD.client.auth.mfa.challengeAndVerify({factorId:ADMIN_MFA_FACTOR_ID,code});
      if(verified.error)throw verified.error;
    }
    hideAdminMFAModal();const pending=ADMIN_MFA_PENDING;ADMIN_MFA_PENDING=null;if(pending)pending.resolve(true);
  }catch(e){setAdminMFAError((e&&e.message)||'კოდის დადასტურება ვერ შესრულდა.');}
  finally{if(button)button.disabled=false;}
}
async function cancelAdminMFA(){
  hideAdminMFAModal();const pending=ADMIN_MFA_PENDING;ADMIN_MFA_PENDING=null;
  if(CUR_USER&&CUR_USER.authProvider==='server')await doLogout();
  else{
    try{await EDUTEST_CLOUD.client.auth.signOut();}catch(_){ }
    CUR_USER=null;EDUTEST_CLOUD.user=null;EDUTEST_CLOUD.profile=null;go('login');
  }
  if(pending)pending.reject(new Error('ადმინისტრატორის MFA დადასტურება გაუქმდა.'));
}
async function ensureAdminMFA(appUser){
  if(!appUser||appUser.role!=='admin'||!EDUTEST_SUPABASE_CONFIG.requireAdminMFA)return true;
  if(appUser.authProvider==='server')return beginAdminMFA();
  const assurance=await EDUTEST_CLOUD.client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error)throw assurance.error;
  if(assurance.data&&assurance.data.currentLevel==='aal2')return true;
  return beginAdminMFA();
}
async function touchCloudActivity(){try{if(EDUTEST_CLOUD.client&&EDUTEST_CLOUD.user)await EDUTEST_CLOUD.client.rpc('touch_edutest_activity');}catch(e){console.warn('activity touch',e);}}
async function exportMyData(){
  if(!CUR_USER)return;
  try{
    if(CUR_USER.authProvider==='server'){
      const response=await fetch('/api/auth/data',{credentials:'include',cache:'no-store'});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'მონაცემების ჩამოტვირთვა ვერ შესრულდა.');
      payload.local_results=SESSION_RESULTS.filter(r=>r.userId===CUR_USER.email);
      payload.local_adaptive=loadAdaptive(CUR_USER.email);
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='edutest-my-data-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      return;
    }
    let cloud={profile:EDUTEST_CLOUD.profile,question_history:[],subject_history:[],guardian_consent:[]};
    if(EDUTEST_CLOUD.client&&EDUTEST_CLOUD.user){
      const [q,s,g]=await Promise.all([
        EDUTEST_CLOUD.client.from(EDUTEST_SUPABASE_CONFIG.questionHistoryTable).select('*').eq('user_id',EDUTEST_CLOUD.user.id),
        EDUTEST_CLOUD.client.from(EDUTEST_SUPABASE_CONFIG.subjectHistoryTable).select('*').eq('user_id',EDUTEST_CLOUD.user.id),
        EDUTEST_CLOUD.client.from('guardian_consent_log').select('*').eq('child_user_id',EDUTEST_CLOUD.user.id)
      ]);cloud.question_history=q.data||[];cloud.subject_history=s.data||[];cloud.guardian_consent=g.data||[];
    }
    const payload={exported_at:new Date().toISOString(),user:{email:CUR_USER.email,name:CUR_USER.name,grade:CUR_USER.grade,school:CUR_USER.school},cloud,local_results:SESSION_RESULTS.filter(r=>r.userId===CUR_USER.email),local_adaptive:loadAdaptive(CUR_USER.email)};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='edutest-my-data-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(e){alert('მონაცემების export ვერ შესრულდა: '+((e&&e.message)||e));}
}
function purgeLocalUserData(email){
  try{
    for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.includes(email))localStorage.removeItem(k);}
    for(let i=SESSION_RESULTS.length-1;i>=0;i--)if(SESSION_RESULTS[i].userId===email)SESSION_RESULTS.splice(i,1);
    for(let i=USER_DB.length-1;i>=0;i--)if(USER_DB[i].email===email)USER_DB.splice(i,1);
    saveResults();saveUsers();
  }catch(e){console.warn('local purge',e);}
}
async function deleteMyAccount(){
  if(!CUR_USER){alert('ანგარიშის წასაშლელად ჯერ გაიარეთ ავტორიზაცია.');return;}
  if(!confirm('გსურთ ანგარიშისა და სასწავლო ისტორიის წაშლა? ეს მოქმედება შეუქცევადია.'))return;
  if(!confirm('ბოლო დადასტურება: ნამდვილად წავშალოთ EduTest ანგარიში?'))return;
  const email=CUR_USER.email;
  try{
    if(CUR_USER.authProvider==='server'){
      const response=await fetch('/api/auth/data',{method:'DELETE',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:'DELETE'})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'ანგარიშის წაშლა ვერ შესრულდა.');
      purgeLocalUserData(email);EDUTEST_SERVER_AUTH_ACTIVE=false;CUR_USER=null;alert('ანგარიში წაიშალა.');go('landing');return;
    }
    if(!EDUTEST_CLOUD.client||!EDUTEST_CLOUD.user)throw new Error('Cloud სესია მიუწვდომელია.');
    const r=await EDUTEST_CLOUD.client.functions.invoke('delete-account',{body:{confirm:'DELETE'}});
    if(r.error)throw r.error;
    purgeLocalUserData(email);
    try{await EDUTEST_CLOUD.client.auth.signOut({scope:'local'});}catch(_){ }
    EDUTEST_CLOUD.user=null;EDUTEST_CLOUD.profile=null;CUR_USER=null;alert('ანგარიში წაიშალა.');go('landing');
  }catch(e){
    try{await EDUTEST_CLOUD.client.rpc('request_account_deletion',{p_reason:'browser_fallback'});await EDUTEST_CLOUD.client.auth.signOut();alert('ავტომატური წაშლა ვერ დასრულდა, მაგრამ წაშლის მოთხოვნა დაფიქსირდა. ადმინისტრატორმა უნდა დაასრულოს მოთხოვნა კანონით განსაზღვრულ/გონივრულ ვადაში.');go('landing');}
    catch(e2){alert('წაშლის მოთხოვნა ვერ შესრულდა: '+((e2&&e2.message)||e2));}
  }
}
function updatePrivacyStatus(){
  const el=document.getElementById('s-privacy-status');if(!el||!CUR_USER)return;
  const gate=studentPrivacyGate(CUR_USER);const txt=gate==='age_required'?'ასაკის დადასტურება საჭიროა':gate==='guardian_required'?'16 წლამდე ანგარიში — წარმომადგენლის თანხმობა მოლოდინში':'ასაკობრივი/თანხმობის სტატუსი დადასტურებულია';
  el.textContent=txt+' · Privacy '+EDUTEST_PRIVACY_CONFIG.privacyVersion;
}

let EDUTEST_SERVER_AUTH_ACTIVE=false;
let EDUTEST_STATE_SYNC_TIMER=null;
let EDUTEST_STATE_SYNCING=false;
const EDUTEST_DURABLE_PREFIXES=['adaptive_','coins_','shop_owned_','shop_equipped_','weekly_xp_','monthly_xp_','friends_','mistake_hist_','edutest_daily_','edutest_freeze_','edutest_onboard_','edutest_team_player_'];
function isDurableLearningKey(key,email){return EDUTEST_DURABLE_PREFIXES.some(prefix=>key.startsWith(prefix))&&key.includes(email);}
function collectDurableLearningState(email){
  const state={};if(!email)return state;
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&isDurableLearningKey(key,email)){const value=localStorage.getItem(key);if(value!==null)state[key]=value;}}}catch(_){}
  return state;
}
async function syncUserLearningState(){
  if(EDUTEST_STATE_SYNCING||!CUR_USER||CUR_USER.authProvider!=='server'||!CUR_USER.emailVerified)return false;
  EDUTEST_STATE_SYNCING=true;
  try{const response=await fetch('/api/user-state',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:collectDurableLearningState(CUR_USER.email)}),keepalive:true});return response.ok;}catch(_){return false;}finally{EDUTEST_STATE_SYNCING=false;}
}
let EDUTEST_AUTH_GENERATION=0;
async function hydrateServerLearningState(appUser,generation){
  if(!appUser||!appUser.emailVerified)return;
  try{
    const [stateResponse,attemptResponse]=await Promise.all([fetch('/api/user-state',{credentials:'include',cache:'no-store'}),fetch('/api/attempts',{credentials:'include',cache:'no-store'})]);
    const [statePayload,attemptPayload]=await Promise.all([stateResponse.ok?stateResponse.json():null,attemptResponse.ok?attemptResponse.json():null]);
    if(generation!==EDUTEST_AUTH_GENERATION)return;
    if(statePayload)Object.entries(statePayload.state||{}).forEach(([key,value])=>{if(isDurableLearningKey(key,appUser.email)&&typeof value==='string')localStorage.setItem(key,value);});
    if(attemptPayload){
      const remote=(attemptPayload.attempts||[]).map(row=>Object.assign({},row.result||{},{userId:appUser.email,_serverAttemptId:row.id,verified:true}));
      const remoteIds=new Set(remote.map(row=>row._serverAttemptId)),seen=new Set();
      const local=[...SESSION_RESULTS,...(_ls('edutest_results')||[])].filter(row=>{
        if(row.userId!==appUser.email||(row._serverAttemptId&&remoteIds.has(row._serverAttemptId)))return false;
        const key=JSON.stringify(row);if(seen.has(key))return false;seen.add(key);return true;
      });
      SESSION_RESULTS.splice(0,SESSION_RESULTS.length,...remote,...local);_lsSet('edutest_results',SESSION_RESULTS);
    }
  }catch(e){console.warn('learning state restore',e);}
  if(generation!==EDUTEST_AUTH_GENERATION)return;
  if(EDUTEST_STATE_SYNC_TIMER)clearInterval(EDUTEST_STATE_SYNC_TIMER);
  EDUTEST_STATE_SYNC_TIMER=setInterval(syncUserLearningState,20000);
}
function appUserFromServer(user){
  const safeRole=['student','pending_teacher','teacher','admin','parent'].includes(user&&user.role)?user.role:'student';
  return {
    cloudId:user.id,email:user.email||'',role:safeRole,name:user.name||user.email||'მოსწავლე',
    grade:user.grade||'',school:user.school||'',birthDate:user.birthDate||'',guardianEmail:user.guardianEmail||'',
    guardianVerifiedAt:user.guardianVerifiedAt||'',termsVersion:user.termsVersion||'',privacyVersion:user.privacyVersion||'',
    profileCompletedAt:user.profileCompletedAt||'',accountStatus:user.accountStatus||'active',emailVerified:user.emailVerified===true,authProvider:'server',
    premium:false,paidSubjects:[],joinDate:new Date().toLocaleDateString('ka-GE')
  };
}
async function adoptServerUser(user,opts){
  opts=opts||{};const appUser=appUserFromServer(user);EDUTEST_SERVER_AUTH_ACTIVE=true;
  const generation=++EDUTEST_AUTH_GENERATION;
  if(appUser.emailVerified)await hydrateServerLearningState(appUser,generation);
  if(generation!==EDUTEST_AUTH_GENERATION)return;
  mergeAppUserIntoLocal(appUser);curRole=appUser.role;setCloudStatus('უსაფრთხო სესია აქტიურია · '+appUser.email,true);
  const gate=studentPrivacyGate(appUser);
  if(opts.navigate){
    if(!appUser.emailVerified||appUser.accountStatus==='email_pending'){go('login');showEmailVerificationModal(appUser);}
    else if(curRole==='pending_teacher'&&!appUser.profileCompletedAt){go('login');showAgeVerificationModal();}
    else if(curRole==='pending_teacher'){go('login');setLoginNotice('🕐 მასწავლებლის ანგარიში ჯერ დასამტკიცებელია.','success');}
    else if(curRole==='student'&&gate==='age_required'){go('login');showAgeVerificationModal();}
    else if(curRole==='student'&&gate==='guardian_required'){go('login');showGuardianPendingModal(appUser);}
    else if(curRole==='student'&&gate==='blocked'){go('login');setLoginNotice('ანგარიში დროებით დაბლოკილია.','warn');}
    else if(curRole==='parent'&&!appUser.profileCompletedAt){go('login');showAgeVerificationModal();}
    else if(['student','teacher','admin','parent'].includes(curRole)){
      if(curRole==='admin')await ensureAdminMFA(appUser);
      go(curRole);
    }
  }
  return appUser;
}
function clearOAuthStatusParam(){
  try{
    const clean=new URL(window.top.location.href);clean.searchParams.delete('auth');
    window.top.history.replaceState({},'',clean.pathname+clean.search+clean.hash);
  }catch(_){try{const clean=new URL(location.href);clean.searchParams.delete('auth');history.replaceState({},'',clean.pathname+clean.search+clean.hash);}catch(__){}}
}
function oauthStatusMessage(status){
  return ({
    cancelled:'ავტორიზაცია გაუქმდა.',invalid:'ავტორიზაციის მოთხოვნა არასწორია ან ვადაგასულია.',unconfigured:'ეს პროვაიდერი ჯერ არ არის კონფიგურირებული.',
    failed:'პროვაიდერთან ავტორიზაცია ვერ დასრულდა.','no-email':'პროვაიდერმა დადასტურებული ელფოსტა არ მოგვაწოდა.',
    'email-unverified':'ელფოსტა ჯერ არ არის დადასტურებული.','account-exists':'ეს ელფოსტა უკვე არსებობს. სოციალური ანგარიშის დასაკავშირებლად შედით ელფოსტით.',
    'confirm-password':'ამ ელფოსტაზე ანგარიში უკვე არსებობს. უსაფრთხოდ დასაკავშირებლად ერთხელ შეიყვანეთ მისი პაროლი; შემდეგში ერთი დაჭერით შეხვალთ.',
    'use-existing-method':'ეს ელფოსტა უკვე სხვა შესვლის მეთოდთანაა დაკავშირებული. შედით ადრე გამოყენებული Google/Microsoft/Facebook ღილაკით; შემდეგ პროფილიდან შეგიძლიათ სხვა მეთოდიც მიაბათ.',
    'registration-details-required':'ანგარიში ვერ მოიძებნა. სოციალური ღილაკით ხელახლა გაგრძელებისას ახალი ანგარიში ავტომატურად შეიქმნება.',
    'provider-in-use':'ეს სოციალური ანგარიში სხვა მომხმარებელზეა მიბმული.'
  })[status]||'ავტორიზაცია ვერ დასრულდა. სცადეთ ხელახლა.';
}
