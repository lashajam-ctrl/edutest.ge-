function renderDailyChallenge(){
  if(!CUR_USER)return;
  const card=document.getElementById('s-daily-card');const titleEl=document.getElementById('s-daily-title');const btn=document.getElementById('s-daily-btn');
  if(!card)return;
  const test=getDailyTestForUser(CUR_USER.email);
  if(!test){card.style.display='none';return;}
  _dailyChallengeTest=test;card.style.display='block';
  if(titleEl)titleEl.textContent=test.subject+' — '+test.grade+' კლ.';
  // XP badge
  const xpBadge=document.getElementById('s-daily-xp-badge');
  if(xpBadge){const g=parseInt(test.grade)||1;const xp=g<=4?15:g<=8?25:35;xpBadge.textContent='+'+xp*2+' XP';}
  // Streak label
  const strLbl=document.getElementById('s-daily-streak-label');
  if(strLbl){const st=getUserStreak(CUR_USER.email);strLbl.textContent=st+' დღე';}
  // Countdown to midnight
  const countdown=document.getElementById('s-daily-countdown');
  if(countdown){
    const now=new Date();const midnight=new Date();midnight.setHours(24,0,0,0);
    const diff=midnight-now;const h=Math.floor(diff/3600000);const m=Math.floor((diff%3600000)/60000);
    countdown.textContent='განახლება '+h+'სთ '+m+'წთ-ში';
  }
  const done=hasDoneDaily(CUR_USER.email);
  if(btn){if(done){btn.textContent='✓ შესრულდა';btn.style.background='#16a34a';btn.disabled=true;}
  else{btn.textContent='▶ დაწყება';btn.style.background='linear-gradient(135deg,#d946ef,#a855f7)';btn.disabled=false;}}
}
function startDailyChallenge(){
  if(!_dailyChallengeTest||!CUR_USER)return;
  if(hasDoneDaily(CUR_USER.email)){alert('დღევანდელი გამოწვევა უკვე შესრულდა! ✓');return;}
  _isDailyBonus=true;
  window._practiceMode=false;
  startTestById(_dailyChallengeTest.id);
}

// ══════════════════════════════════════════════════════════════
// SUBJECT MASTERY
// ══════════════════════════════════════════════════════════════
function renderSubjectMastery(containerId){
  const el=document.getElementById(containerId);if(!el||!CUR_USER)return;
  const email=CUR_USER.email;const u=USER_DB.find(x=>x.email===email);
  const grade=parseInt((u&&u.grade)||1)||1;
  const subjects=['მათემატიკა','ქართული','ქართული ლიტ.','ქართული ენა','ინგლისური','ინგლ. ლიტ.','ინგლ. გრამ.','რუსული','რუს. გრამ.','ბუნება','ისტორია','გეოგრაფია','ბიოლოგია','ქიმია','ფიზიკა','ჩვენი ქვეყანა'];
  const icons={'მათემატიკა':'📐','ქართული':'📚','ქართული ლიტ.':'📖','ქართული ენა':'✍️','ინგლისური':'🇬🇧','ინგლ. ლიტ.':'📕','ინგლ. გრამ.':'🔤','რუსული':'🇷🇺','რუს. გრამ.':'📝','ბუნება':'🌿','ისტორია':'🏛️','გეოგრაფია':'🌍','ბიოლოგია':'🧬','ქიმია':'⚗️','ფიზიკა':'⚡','ჩვენი ქვეყანა':'🏔️'};
  const myResults=SESSION_RESULTS.filter(r=>r.userId===email);
  const rows=subjects.map(subj=>{
    const subjTests=ALL_TESTS.filter(t=>t.subject===subj&&(parseInt(t.grade)===grade||t.grade===String(grade)));
    if(!subjTests.length)return null;
    const subjRes=myResults.filter(r=>r.subject===subj);
    const doneIds=new Set(subjRes.map(r=>r.testId));
    // Historical releases used a new id for the same catalog slot. Keep those
    // attempts, but never present more completed tests than currently exist.
    const completedCount=Math.min(doneIds.size,subjTests.length);
    const coverPct=Math.round(completedCount/subjTests.length*100);
    const avgPct=subjRes.length?Math.round(subjRes.reduce((s,r)=>s+r.pct,0)/subjRes.length):null;
    let status,color,barColor;
    if(avgPct===null){status='—';color='#9ca3af';barColor='#e5e7eb';}
    else if(avgPct>=75){status='✅';color='#16a34a';barColor='#22c55e';}
    else if(avgPct>=45){status='⚠️';color='#d97706';barColor='#f59e0b';}
    else{status='❌';color='#dc2626';barColor='#ef4444';}
    const practiceBtn=(avgPct!==null&&avgPct<75)?`<button onclick="practiceWeakSubject('${subj}')" style="font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid ${color};color:${color};background:transparent;cursor:pointer;white-space:nowrap">ივარჯიშე</button>`:'';
    return `<div style="margin-bottom:11px">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
        <span style="display:flex;align-items:center;gap:5px">${status} <span>${icons[subj]||''} ${subj}</span></span>
        <span style="display:flex;align-items:center;gap:6px">
          ${avgPct!==null?`<span style="color:${color};font-weight:700">${avgPct}%</span>`:'<span style="color:#9ca3af">ჯერ არ გასულა</span>'}
          ${practiceBtn}
        </span>
      </div>
      <div style="background:#f3f4f6;border-radius:6px;height:7px;overflow:hidden">
        <div style="width:${coverPct}%;height:100%;background:${barColor};border-radius:6px;transition:width .5s"></div>
      </div>
      ${completedCount>0?`<div style="font-size:10px;color:#9ca3af;margin-top:2px">${completedCount}/${subjTests.length} ტესტი გავლილი</div>`:''}
    </div>`;
  }).filter(Boolean);
  if(!rows.length){el.innerHTML='<div style="color:var(--gray);font-size:13px">ამ კლასის ტესტები ჯერ არ არის</div>';return;}
  el.innerHTML=rows.join('');
}

function practiceWeakSubject(subject){
  // Find a test for this subject at user's grade and start practice mode
  if(!CUR_USER)return;
  const grade=parseInt((USER_DB.find(u=>u.email===CUR_USER.email)?.grade)||1)||1;
  const test=ALL_TESTS.find(t=>t.subject===subject&&(parseInt(t.grade)===grade||t.grade===String(grade)));
  if(test){startTestById(test.id,true);}
  else{alert('ამ საგნის ტესტი ვერ მოიძებნა');}
}

// ══════════════════════════════════════════════════════════════
// IMPROVED REVIEW
// ══════════════════════════════════════════════════════════════
