async function initServerAuth(){
  await refreshSocialProviderButtons();
  const params=new URLSearchParams(location.search);
  const status=params.get('auth')||'';
  const emailStatus=params.get('email')||'';
  const resetToken=params.get('reset')||'';
  if(resetToken){go('login');setTimeout(openPasswordRecoveryModal,0);}
  try{
    const response=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
    if(response.ok){const data=await response.json();if(data&&data.user){await adoptServerUser(data.user,{navigate:!resetToken});if(status)clearOAuthStatusParam();if(emailStatus){try{const clean=new URL(window.top.location.href);clean.searchParams.delete('email');window.top.history.replaceState({},'',clean.pathname+clean.search+clean.hash);}catch(_){} }return true;}}
    if(emailStatus){go('login');setLoginNotice(emailStatus==='verified'?'ელ-ფოსტა დადასტურდა — ახლა შეგიძლიათ შეხვიდეთ.':'დადასტურების ბმული არასწორია ან ვადაგასულია.',emailStatus==='verified'?'success':'warn');}
    if(status){
      go('login');
      if(status==='registration-details-required'){loginMode='reg';loginTab('reg');}
      if(status==='confirm-password'){loginMode='login';loginTab('login');showEmailRegistrationForm();}
      setLoginNotice(oauthStatusMessage(status),'warn');
      clearOAuthStatusParam();
    }
  }catch(error){console.warn('Server session restore',error);if(status){go('login');setLoginNotice('უსაფრთხო სესიის აღდგენა ვერ მოხერხდა. სცადეთ ხელახლა.','warn');}}
  return false;
}

function showEmailVerificationModal(appUser){
  const modal=document.getElementById('email-verification-modal');
  const address=document.getElementById('email-verification-address');
  const error=document.getElementById('email-verification-error');
  if(address)address.textContent='დადასტურების მისამართი: '+maskEmail(appUser&&appUser.email||'');
  if(error){error.textContent='';error.classList.add('hidden');}
  if(modal){modal.classList.remove('hidden');modal.style.display='flex';setTimeout(()=>modal.querySelector('button')?.focus(),50);}
}
async function resendEmailVerification(){
  const error=document.getElementById('email-verification-error');
  try{
    const response=await fetch('/api/auth/email/resend',{method:'POST',credentials:'include',headers:{Accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'ბმული ვერ გაიგზავნა');
    if(error){error.textContent=data.alreadyVerified?'ელ-ფოსტა უკვე დადასტურებულია. დააჭირეთ სტატუსის შემოწმებას.':'ახალი ბმული გამოგზავნილია.';error.style.color='#166534';error.style.background='#f0fdf4';error.classList.remove('hidden');}
  }catch(e){if(error){error.textContent=(e&&e.message)||'ბმული ვერ გაიგზავნა';error.style.color='#9a3412';error.style.background='#fff7ed';error.classList.remove('hidden');}}
}
async function refreshEmailVerificationStatus(){
  try{
    const response=await fetch('/api/auth/session',{credentials:'include',cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.user)throw new Error('სესია დასრულდა');
    const appUser=appUserFromServer(data.user);
    if(!appUser.emailVerified)throw new Error('ელ-ფოსტა ჯერ არ არის დადასტურებული.');
    const modal=document.getElementById('email-verification-modal');if(modal){modal.classList.add('hidden');modal.style.display='none';}
    await adoptServerUser(data.user,{navigate:true});
  }catch(e){const error=document.getElementById('email-verification-error');if(error){error.textContent=(e&&e.message)||'სტატუსის შემოწმება ვერ მოხერხდა';error.classList.remove('hidden');}}
}

async function initEduTestCloud(){
  if(EDUTEST_CLOUD.ready&&EDUTEST_CLOUD.client)return true;
  if(!isSupabaseConfigured()){
    setCloudStatus('Cloud sync გამორთულია — ჩასვი Supabase URL და publishable key',false);
    return false;
  }
  if(!window.supabase || typeof window.supabase.createClient!=='function'){
    setCloudStatus('Supabase ბიბლიოთეკა ვერ ჩაიტვირთა',false);
    return false;
  }
  try{
    EDUTEST_CLOUD.client=window.supabase.createClient(
      EDUTEST_SUPABASE_CONFIG.url,
      EDUTEST_SUPABASE_CONFIG.publishableKey,
      {auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}}
    );
    EDUTEST_CLOUD.ready=true;
    setCloudStatus('Cloud sync მზადაა',true);
    await refreshSocialProviderButtons();

    // Supabase Auth remains only as a temporary recovery bridge for legacy
    // accounts. Application authentication is always the server HttpOnly session.
    const gu=await EDUTEST_CLOUD.client.auth.getUser();
    if(!EDUTEST_SERVER_AUTH_ACTIVE && gu && gu.data && gu.data.user)EDUTEST_CLOUD.user=gu.data.user;

    EDUTEST_CLOUD.client.auth.onAuthStateChange(function(event,session){
      if(event==='SIGNED_OUT'){
        EDUTEST_CLOUD.user=null;EDUTEST_CLOUD.profile=null;
        setCloudStatus('Cloud sync მზადაა — შესვლა საჭიროა',true);
      }
      if(event==='PASSWORD_RECOVERY' && session && session.user){
        EDUTEST_CLOUD.user=session.user;
        setCloudStatus('პაროლის აღდგენის სესია აქტიურია',true);
        setTimeout(openPasswordRecoveryModal,0);
        return;
      }
      if(!EDUTEST_SERVER_AUTH_ACTIVE && (event==='SIGNED_IN'||event==='TOKEN_REFRESHED') && session && session.user)EDUTEST_CLOUD.user=session.user;
    });
    return true;
  }catch(e){
    EDUTEST_CLOUD.lastError=e;
    setCloudStatus('Cloud init შეცდომა: '+(e.message||e),false);
    return false;
  }
}

async function fetchCloudProfile(user){
  const c=EDUTEST_CLOUD.client;
  if(!c||!user)return null;
  const q=await c.from(EDUTEST_SUPABASE_CONFIG.profilesTable).select('*').eq('id',user.id).maybeSingle();
  if(q.error){console.warn('profile fetch',q.error);return null;}
  return q.data||null;
}
function appUserFromCloud(user,profile){
  const m=(user&&user.user_metadata)||{};
  const p=profile||{};
  const safeRole=['student','pending_teacher','teacher','admin','guardian'].includes(p.role)?p.role:'student';
  return {
    cloudId:user.id,
    email:user.email||p.email||'',
    role:safeRole,
    name:p.name||m.name||m.full_name||user.email||'მოსწავლე',
    grade:p.grade||m.grade||'',
    school:p.school||m.school||'',
    premium:!!p.premium,
    paidSubjects:Array.isArray(p.paid_subjects)?p.paid_subjects:[],
    birthDate:p.birth_date||m.birth_date||'',
    guardianEmail:p.guardian_email||m.guardian_email||'',
    guardianVerifiedAt:p.guardian_consent_verified_at||'',
    leaderboardOptIn:!!p.leaderboard_opt_in,
    termsVersion:p.terms_version||m.terms_version||'',
    privacyVersion:p.privacy_version||m.privacy_version||'',
    profileCompletedAt:p.profile_completed_at||'',
    deletionRequestedAt:p.deletion_requested_at||'',
    accountStatus:p.account_status||'',
    joinDate:p.join_date?new Date(p.join_date).toLocaleDateString('ka-GE'):new Date().toLocaleDateString('ka-GE'),
    authProvider:'supabase'
  };
}
function mergeAppUserIntoLocal(appUser){
  const idx=USER_DB.findIndex(function(u){return u.email===appUser.email;});
  if(idx>=0){
    // Never copy a cloud password into localStorage. Cloud-auth users do not need one.
    USER_DB[idx]={...USER_DB[idx],...appUser}; delete USER_DB[idx].password; CUR_USER=USER_DB[idx];
  }else{
    USER_DB.push(appUser);CUR_USER=appUser;
  }
  saveUsers();
}

async function adoptSupabaseUser(user,opts){
  opts=opts||{};
  EDUTEST_CLOUD.user=user;
  const profile=await fetchCloudProfile(user);
  EDUTEST_CLOUD.profile=profile;
  const appUser=appUserFromCloud(user,profile);
  mergeAppUserIntoLocal(appUser);
  curRole=appUser.role;

  const gate=studentPrivacyGate(appUser);
  if(gate==='ok' && appUser.role!=='guardian')await syncAdaptiveFromCloud(appUser.email,user.id);
  setCloudStatus('Cloud sync აქტიურია · '+appUser.email,true);
  touchCloudActivity();

  if(opts.navigate){
    if(guardianConsentChildId())return appUser;
    if(curRole==='pending_teacher'){
      const err=document.getElementById('login-error');
      if(err){err.textContent='🕐 მასწავლებლის ანგარიში ჯერ დასამტკიცებელია.';err.style.color='#92400e';err.classList.remove('hidden');}
      go('login');
    }else if(curRole==='guardian'){
      go('login');
      setLoginNotice('ეს ანგარიში გამოიყენება წარმომადგენლის თანხმობის დასადასტურებლად. გახსენით ბავშვისთვის გამოგზავნილი consent-link.','success');
    }else if(curRole==='student'&&gate==='age_required'){
      go('login');showAgeVerificationModal();
    }else if(curRole==='student'&&gate==='guardian_required'){
      go('login');showGuardianPendingModal(appUser);
    }else if(curRole==='student'&&gate==='blocked'){
      go('login');setLoginNotice('ანგარიში დროებით დაბლოკილია. თუ ეს შეცდომაა, მიმართეთ კონფიდენციალურობის საკონტაქტო მისამართს.','warn');
    }else if(['student','teacher','admin'].includes(curRole)){
      if(curRole==='admin')await ensureAdminMFA(appUser);
      go(curRole);
    }
  }
  return appUser;
}

function normalizeLocalQuestionPerf(p){
  p=p||{};
  return {
    seen:Number(p.seen)||0,correct:Number(p.correct)||0,wrong:Number(p.wrong)||0,
    lastSeen:Number(p.lastSeen)||0,lastCorrect:Number(p.lastCorrect)||0,lastWrong:Number(p.lastWrong)||0,
    lastTestId:p.lastTestId||null,lastPool:p.lastPool||null
  };
}
function cloudQuestionRowToLocal(r){
  return {seen:Number(r.seen_count)||0,correct:Number(r.correct_count)||0,wrong:Number(r.wrong_count)||0,
    lastSeen:tsToMs(r.last_seen),lastCorrect:tsToMs(r.last_correct),lastWrong:tsToMs(r.last_wrong),
    lastTestId:r.last_test_id||null,lastPool:r.last_pool||null};
}
function localQuestionToCloud(userId,qid,p){
  p=normalizeLocalQuestionPerf(p);
  return {user_id:userId,question_id:qid,seen_count:p.seen,correct_count:p.correct,wrong_count:p.wrong,
    last_seen:msToIso(p.lastSeen),last_correct:msToIso(p.lastCorrect),last_wrong:msToIso(p.lastWrong),
    last_test_id:p.lastTestId,last_pool:p.lastPool};
}
function cloudSubjectRowToLocal(r){
  const d=Number(r.diff); return {sessions:Number(r.sessions)||0,totalPct:Number(r.total_pct)||0,diff:Number.isFinite(d)?d:1,lastSessionAt:tsToMs(r.last_session_at)};
}
function localSubjectToCloud(userId,pool,sp){
  sp=sp||{};
  const d=Number(sp.diff); return {user_id:userId,pool_key:pool,sessions:Number(sp.sessions)||0,total_pct:Number(sp.totalPct)||0,diff:Number.isFinite(d)?d:1,last_session_at:msToIso(sp.lastSessionAt)};
}

async function syncAdaptiveFromCloud(email,userId){
  const c=EDUTEST_CLOUD.client;if(!c||!userId||EDUTEST_CLOUD.syncing)return;EDUTEST_CLOUD.syncing=true;
  try{const [qr,sr]=await Promise.all([c.from(EDUTEST_SUPABASE_CONFIG.questionHistoryTable).select('*').eq('user_id',userId),c.from(EDUTEST_SUPABASE_CONFIG.subjectHistoryTable).select('*').eq('user_id',userId)]);if(qr.error)throw qr.error;if(sr.error)throw sr.error;const local=loadAdaptive(email)||{};local.questionPerf={};(qr.data||[]).forEach(r=>local.questionPerf[r.question_id]=cloudQuestionRowToLocal(r));local.subjectPerf={};(sr.data||[]).forEach(r=>local.subjectPerf[r.pool_key]=cloudSubjectRowToLocal(r));saveAdaptive(email,local,{skipCloud:true});setCloudStatus('Cloud history: server-verified · '+email,true);}catch(e){console.warn('read-only cloud history',e);setCloudStatus('Cloud history დროებით ვერ ჩაიტვირთა',false);}finally{EDUTEST_CLOUD.syncing=false;}
}
async function cloudPushAdaptiveDelta(){/* intentionally disabled: authoritative history is written only by assessment-submit Edge Function */}

// ── Adaptive Learning Engine ──────────────────────────────────────────────────
// Build: PROFESSIONAL-FINAL-SERVER-VERIFIED (2026-08-09)
// Data per user stored as 'adaptive_{email}' in localStorage
// questionPerf: {qId: {seen:N, correct:N, lastWrong:ts}}
// subjectPerf:  {poolKey: {sessions:N, totalPct:N, diff:N}} diff: 0=easy,1=normal,2=hard

function _adaptKey(email){ return 'adaptive_'+(email||'guest'); }

function loadAdaptive(email){
  try{ return JSON.parse(localStorage.getItem(_adaptKey(email))||'{}'); }catch(e){ return {}; }
}
function saveAdaptive(email, data, opts){
  try{ localStorage.setItem(_adaptKey(email), JSON.stringify(data)); }catch(e){}
  // localStorage remains an offline/cache layer. Cloud writes are deliberately
  // performed as small deltas from updateAdaptiveProfile().
}

function updateAdaptiveProfile(email, testId, poolKey, reviewed){
  // reviewed = array of {id, userCorrect (bool)}
  // Per-question history powers no-repeat + spaced review selection.
  var data = loadAdaptive(email);
  if(!data.questionPerf) data.questionPerf = {};
  if(!data.subjectPerf)  data.subjectPerf  = {};

  var correctCount = 0;
  var now = Date.now();
  reviewed.forEach(function(q){
    if(!data.questionPerf[q.id]){
      data.questionPerf[q.id]={seen:0,correct:0,wrong:0,lastSeen:0,lastCorrect:0,lastWrong:0};
    }
    var qp = data.questionPerf[q.id];
    // Backward-compatible migration for profiles created by older EduTest builds.
    if(typeof qp.seen!=='number') qp.seen=0;
    if(typeof qp.correct!=='number') qp.correct=0;
    if(typeof qp.wrong!=='number') qp.wrong=Math.max(0,qp.seen-qp.correct);
    if(typeof qp.lastSeen!=='number') qp.lastSeen=0;
    if(typeof qp.lastCorrect!=='number') qp.lastCorrect=0;
    if(typeof qp.lastWrong!=='number') qp.lastWrong=0;

    qp.seen++;
    qp.lastSeen=now;
    qp.lastTestId=testId;
    qp.lastPool=poolKey;
    if(q.userCorrect){
      qp.correct++;
      qp.lastCorrect=now;
      correctCount++;
    }else{
      qp.wrong++;
      qp.lastWrong=now;
    }
  });

  var pct = reviewed.length ? Math.round(correctCount/reviewed.length*100) : 0;
  if(!data.subjectPerf[poolKey]) data.subjectPerf[poolKey]={sessions:0,totalPct:0,diff:1};
  var sp = data.subjectPerf[poolKey];
  sp.sessions++;
  sp.totalPct += pct;
  sp.lastSessionAt=now;
  var avgPct = sp.sessions ? Math.round(sp.totalPct/sp.sessions) : pct;

  // Difficulty calibration: avg >80% for 2+ sessions → harder; avg <50% for 2+ → easier
  if(sp.sessions >= 2){
    if(avgPct >= 80 && sp.diff < 2) sp.diff = Math.min(2, sp.diff + 1);
    else if(avgPct <= 50 && sp.diff > 0) sp.diff = Math.max(0, sp.diff - 1);
  }

  saveAdaptive(email, data);
  // Non-blocking cloud sync; if offline, local cache remains authoritative until
  // the next successful sign-in/sync.
  try{ cloudPushAdaptiveDelta(email,data,reviewed.map(function(q){return q.id;}),poolKey); }catch(e){}
}

// Returns weakness summary: sorted array of {pool, label, avgPct, sessions}
function getWeaknessProfile(email){
  var data = loadAdaptive(email);
  if(!data.subjectPerf) return [];
  var result = [];
  Object.keys(data.subjectPerf).forEach(function(pool){
    var sp = data.subjectPerf[pool];
    if(!sp.sessions) return;
    var avgPct = Math.round(sp.totalPct / sp.sessions);
    // Find a human label from ALL_TESTS
    var testMatch = ALL_TESTS.find(function(t){ return t.pool===pool; });
    var label = testMatch ? testMatch.subject+(testMatch.grade?' ('+testMatch.grade+' კლ.)':'') : pool;
    result.push({pool:pool, label:label, avgPct:avgPct, sessions:sp.sessions, diff:sp.diff});
  });
  // Sort by avgPct ascending (weakest first)
  result.sort(function(a,b){ return a.avgPct - b.avgPct; });
  return result;
}

// Adaptive no-repeat + spaced-review selector.
// Priority policy:
//   1) unseen questions first (strictly no repeat while enough unseen items exist)
//   2) previously-wrong questions that are due for review
//   3) other due/old questions
//   4) only if the bank is exhausted, least-recently-seen questions
function adaptiveSelectQs(email, subset, count){
  var data = loadAdaptive(email);
  var qp = data.questionPerf || {};
  var now = Date.now();
  var WRONG_DELAY = 2*24*3600*1000;   // retry a missed item after ~2 days
  var CORRECT_DELAY = 7*24*3600*1000; // refresh a mastered item after ~1 week

  // Deduplicate by stable question id before ranking.
  var uniq=[], ids=new Set();
  (subset||[]).forEach(function(q){
    if(!q || !q.id || ids.has(q.id)) return;
    ids.add(q.id); uniq.push(q);
  });
  if(count<=0 || !uniq.length) return [];
  count=Math.min(count,uniq.length);

  function perfOf(q){
    var p=qp[q.id];
    if(!p) return null;
    return {
      seen:Number(p.seen)||0,
      correct:Number(p.correct)||0,
      wrong:Number(p.wrong)||Math.max(0,(Number(p.seen)||0)-(Number(p.correct)||0)),
      lastSeen:Number(p.lastSeen)||0,
      lastCorrect:Number(p.lastCorrect)||0,
      lastWrong:Number(p.lastWrong)||0
    };
  }
  function oldestFirst(a,b){
    var pa=perfOf(a), pb=perfOf(b);
    return ((pa&&pa.lastSeen)||0)-((pb&&pb.lastSeen)||0);
  }

  var unseen=[], wrongDue=[], dueOld=[], recent=[];
  uniq.forEach(function(q){
    var p=perfOf(q);
    if(!p || !p.seen){ unseen.push(q); return; }
    var lastWasWrong=p.lastWrong>0 && p.lastWrong>=p.lastCorrect;
    var age=now-p.lastSeen;
    if(lastWasWrong && age>=WRONG_DELAY) wrongDue.push(q);
    else if(age>=CORRECT_DELAY) dueOld.push(q);
    else recent.push(q);
  });

  // Randomize unseen items so two students do not receive an identical sequence.
  unseen=shuffleArr(unseen);
  wrongDue.sort(oldestFirst);
  dueOld.sort(oldestFirst);
  recent.sort(oldestFirst);

  var selected=[];
  function take(arr,n){
    if(n<=0) return;
    selected=selected.concat(arr.slice(0,n));
  }

  // 1) Use unseen inventory first.
  take(unseen,Math.min(count,unseen.length));
  if(selected.length>=count) return shuffleArr(selected).slice(0,count);

  // 2) When repeats become necessary, cap wrong-review items at ~40% of a test
  // so remediation does not crowd out broad coverage.
  var remaining=count-selected.length;
  var wrongCap=Math.max(1,Math.ceil(count*0.40));
  take(wrongDue,Math.min(remaining,wrongCap,wrongDue.length));

  // 3) Prefer items whose spacing interval has elapsed.
  remaining=count-selected.length;
  take(dueOld,Math.min(remaining,dueOld.length));

  // 4) If the entire relevant bank has effectively been exhausted, recycle the
  // least-recently-seen items first. This maximizes the interval before repetition.
  if(selected.length<count){
    var used=new Set(selected.map(function(q){return q.id;}));
    var fallback=wrongDue.concat(dueOld,recent).filter(function(q){return !used.has(q.id);});
    fallback.sort(oldestFirst);
    take(fallback,count-selected.length);
  }

  return shuffleArr(selected).slice(0,count);
}

// Get current difficulty level for a pool (returns 0/1/2)
function getAdaptiveDiff(email, poolKey){
  var data = loadAdaptive(email);
  var sp = data.subjectPerf && data.subjectPerf[poolKey];
  return sp ? sp.diff : 1;
}

// Render personalized study plan into a container element
