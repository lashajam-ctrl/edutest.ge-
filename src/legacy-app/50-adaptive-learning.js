function renderStudyPlan(email, poolKey, pct){
  var container = document.getElementById('res-study-plan');
  if(!container) return;
  var weaknesses = getWeaknessProfile(email);
  var top3 = weaknesses.slice(0, 3);
  var diff = getAdaptiveDiff(email, poolKey);
  var diffLabel = diff===0 ? '🟢 მარტივი' : diff===1 ? '🟡 საშუალო' : '🔴 რთული';
  var diffNext  = diff===0 ? 'კარგი შედეგები — სირთულე გაიზარდება' : diff===2 ? 'ბრავო! მაქსიმალური სირთულე' : 'სტაბილური დონე';

  var html = '<div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #93c5fd;border-radius:16px;padding:20px;margin-top:16px">';
  html += '<div style="font-weight:700;font-size:15px;margin-bottom:14px">🎯 პერსონალური სასწავლო გეგმა</div>';

  // Current difficulty badge
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">';
  html += '<span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">'+diffLabel+' დონე</span>';
  html += '<span style="font-size:12px;color:#64748b">'+diffNext+'</span>';
  html += '</div>';

  if(top3.length > 0){
    html += '<div style="font-weight:600;font-size:13px;margin-bottom:10px;color:#374151">📊 შენი სუსტი თემები:</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">';
    top3.forEach(function(w){
      var barColor = w.avgPct < 50 ? '#ef4444' : w.avgPct < 70 ? '#f59e0b' : '#22c55e';
      html += '<div style="background:#fff;border-radius:10px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,.07)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
      html += '<span style="font-size:13px;font-weight:600">'+w.label+'</span>';
      html += '<span style="font-size:12px;font-weight:700;color:'+barColor+'">'+w.avgPct+'%</span>';
      html += '</div>';
      html += '<div style="background:#f1f5f9;border-radius:99px;height:6px">';
      html += '<div style="width:'+w.avgPct+'%;height:100%;background:'+barColor+';border-radius:99px;transition:width .4s"></div>';
      html += '</div>';
      html += '<div style="font-size:11px;color:#64748b;margin-top:4px">'+w.sessions+' ტესტი ჩატარებული</div>';
      html += '</div>';
    });
    html += '</div>';

    // Next recommended test
    var weakest = top3[0];
    var recommended = ALL_TESTS.find(function(t){
      return t.pool===weakest.pool && t.testType==='mid' && t.semester===1;
    }) || ALL_TESTS.find(function(t){ return t.pool===weakest.pool; });
    if(recommended){
      html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#374151">⚡ შემდეგი რეკომენდებული ტესტი:</div>';
      html += '<div onclick="startTest(\''+recommended.id+'\')" style="background:#1d4ed8;color:#fff;border-radius:12px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:opacity .2s" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">';
      html += '<div style="font-size:22px">📝</div>';
      html += '<div><div style="font-weight:700;font-size:13px">'+recommended.title+'</div>';
      html += '<div style="font-size:11px;opacity:.8">'+recommended.count+' კითხვა · '+recommended.time+' წთ.</div></div>';
      html += '</div>';
    }
  } else {
    html += '<div style="font-size:13px;color:#64748b;text-align:center;padding:12px 0">🎉 ახლა ჩატარდი პირველი ტესტი — სისტემა ისწავლის შენს სუსტ ადგილებს!</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Audit log helpers ──────────────────────────────────────────────────────
function logAuditEvent(action, detail){
  try{
    loadAuditLog();
    var entry={ts:Date.now(),admin:CURRENT_USER?CURRENT_USER.email:'?',action:action,detail:detail||''};
    ADMIN_AUDIT_LOG.unshift(entry);
    if(ADMIN_AUDIT_LOG.length>500)ADMIN_AUDIT_LOG=ADMIN_AUDIT_LOG.slice(0,500);
    saveAuditLog();
  }catch(e){}
}

// ── CSV Import ─────────────────────────────────────────────────────────────
function renderImportPanel(){
  // panel HTML already in DOM; nothing dynamic to render on load
}
function previewCSV(input){
  var file=input.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var lines=e.target.result.split('\n').map(function(l){return l.trim();}).filter(Boolean);
    var header=lines[0];
    var rows=lines.slice(1);
    var preview=document.getElementById('a-csv-preview');
    if(!preview)return;
    preview.replaceChildren();
    if(!rows.length){var empty=document.createElement('div');empty.style.cssText='color:red;font-size:13px';empty.textContent='ფაილი ცარიელია';preview.appendChild(empty);return;}
    var summary=document.createElement('div');summary.style.cssText='font-size:13px;margin-bottom:8px;font-weight:600';summary.textContent=rows.length+' ჩანაწერი ნაპოვნია';preview.appendChild(summary);
    var wrap=document.createElement('div');wrap.style.cssText='overflow:auto;max-height:200px;border:1px solid var(--border);border-radius:8px';
    var table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:12px';
    var thead=document.createElement('thead'),headRow=document.createElement('tr');headRow.style.background='var(--bg2)';
    header.split(',').forEach(function(h){var th=document.createElement('th');th.style.cssText='padding:6px 8px;text-align:left;border-bottom:1px solid var(--border)';th.textContent=h;headRow.appendChild(th);});
    thead.appendChild(headRow);table.appendChild(thead);
    var tbody=document.createElement('tbody');
    rows.slice(0,5).forEach(function(row){var tr=document.createElement('tr');row.split(',').forEach(function(cell){var td=document.createElement('td');td.style.cssText='padding:5px 8px;border-bottom:1px solid var(--border)';td.textContent=cell;tr.appendChild(td);});tbody.appendChild(tr);});
    if(rows.length>5){var moreRow=document.createElement('tr'),more=document.createElement('td');more.colSpan=10;more.style.cssText='padding:5px 8px;color:var(--gray);font-size:11px';more.textContent='... და კიდევ '+(rows.length-5)+' ჩანაწერი';moreRow.appendChild(more);tbody.appendChild(moreRow);}
    table.appendChild(tbody);wrap.appendChild(table);preview.appendChild(wrap);
    var btn=document.getElementById('a-csv-import-btn');
    if(btn)btn.style.display='block';
    window._csvRows=rows;
    window._csvHeader=header;
  };
  reader.readAsText(file);
}
function importCSV(){
  if(!window._csvRows||!window._csvRows.length){alert('ჯერ ფაილი ავირჩიოთ');return;}
  var headers=window._csvHeader.split(',').map(function(h){return h.trim().toLowerCase();});
  var imported=0,errors=0;
  window._csvRows.forEach(function(row){
    var cells=row.split(',').map(function(c){return c.trim();});
    var obj={};
    headers.forEach(function(h,i){obj[h]=cells[i]||'';});
    if(!obj.email){errors++;return;}
    var existing=USER_DB.find(function(u){return u.email===obj.email;});
    if(existing){errors++;return;}
    USER_DB.push({email:obj.email,name:obj.name||obj.email,role:'student',grade:parseInt(obj.grade)||7,class:obj.classname||obj['class']||'',coins:0,xp:0,badges:[],paid:false,active:true,pendingImport:true});
    imported++;
  });
  saveDB();
  logAuditEvent('CSV_IMPORT','Imported '+imported+' students, '+errors+' skipped');
  alert('შედეგი: '+imported+' სტუდენტი დარეგისტრირდა, '+errors+' გამოტოვებული (დუბლიკატი ან ცარიელი)');
  document.getElementById('a-csv-preview').replaceChildren();
  var btn=document.getElementById('a-csv-import-btn');if(btn)btn.style.display='none';
  var fi=document.getElementById('a-csv-file');if(fi)fi.value='';
  window._csvRows=[];
}

// ── Enterprise panel ───────────────────────────────────────────────────────
function renderEnterprisePanel(){
  var tw=localStorage.getItem('teams_webhook')||'';
  var twEl=document.getElementById('teams-webhook');
  if(twEl&&tw)twEl.value=tw;
  var notifs=JSON.parse(localStorage.getItem('notif_settings')||'{}');
  ['notif-test-done','notif-teacher-assign','notif-weekly-report','notif-parent'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.checked=!!notifs[id];
  });
}
function saveNotifSettings(){
  var notifs={};
  ['notif-test-done','notif-teacher-assign','notif-weekly-report','notif-parent'].forEach(function(id){
    var el=document.getElementById(id);
    if(el)notifs[id]=el.checked;
  });
  localStorage.setItem('notif_settings',JSON.stringify(notifs));
  logAuditEvent('NOTIF_SETTINGS','Email notification preferences saved');
  alert('შეტყობინებების პარამეტრები შენახულია');
}
function saveTeamsWebhook(){
  var el=document.getElementById('teams-webhook');
  if(!el||!el.value.trim()){alert('შეიყვანე Webhook URL');return;}
  localStorage.setItem('teams_webhook',el.value.trim());
  logAuditEvent('TEAMS_WEBHOOK','Teams webhook configured');
  alert('Teams Webhook შენახულია');
}
function exportAllResultsExcel(){
  var rows=[['Email','სახელი','ტესტი','ქულა','თარიღი']];
  SESSION_RESULTS.filter(function(r){return r.verified===true;}).forEach(function(r){
    var u=USER_DB.find(function(x){return x.email===r.userId;})||{};
    rows.push([r.userId||'',u.name||r.userName||'',r.testId||'',r.pct||'',r.date||'']);
  });
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='edutest_results_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  logAuditEvent('EXPORT','All results exported to CSV');
}
function exportStudentProgress(){
  var rows=[['Email','სახელი','კლასი','XP','კოინები','ჩატარებული ტესტები','საშ. ქულა']];
  USER_DB.filter(function(u){return u.role==='student';}).forEach(function(u){
    var ur=SESSION_RESULTS.filter(function(r){return r.verified===true&&r.userId===u.email;});
    var avg=ur.length?Math.round(ur.reduce(function(a,r){return a+(r.pct||0);},0)/ur.length):0;
    rows.push([u.email,u.name||'',u.class||'',u.xp||0,u.coins||0,ur.length,avg+'%']);
  });
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='edutest_students_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  logAuditEvent('EXPORT','Student progress exported to CSV');
}
function exportAuditLogCSV(){
  loadAuditLog();
  var rows=[['თარიღი','ადმინი','მოქმედება','დეტალი']];
  ADMIN_AUDIT_LOG.forEach(function(e){
    var d=new Date(e.ts).toLocaleString('ka-GE');
    rows.push([d,e.admin||'?',e.action||'',e.detail||'']);
  });
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='edutest_audit_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ── Audit event hooks ──────────────────────────────────────────────────────
function renderAdminHome(){
  const total=USER_DB.length;
  const students=USER_DB.filter(u=>u.role==='student').length;
  const premCount=USER_DB.filter(u=>u.premium).length;
  const el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  el('a-stat-users', total);
  el('a-stat-students', students);
  el('a-stat-tests', ALL_TESTS.length);
  el('a-stat-premium', premCount);
  renderPendingTeachers();
}

// ══════════════════════════════════════════════════════════════
// ADMIN USERS — real data with premium toggle
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// TEACHER HOME — real stats
// ══════════════════════════════════════════════════════════════
function renderTeacherQAnalytics(){
  const el=document.getElementById('t-q-analytics');if(!el)return;
  const qStats={};
  teacherResults().forEach(r=>{
    if(!r.reviewed)return;
    r.reviewed.forEach(q=>{
      if(q.gradingStatus==='pending')return;
      if(!qStats[q.id])qStats[q.id]={text:q._kaText||q.text||q.id,wrong:0,total:0};
      qStats[q.id].total++;
      if(!q.ok)qStats[q.id].wrong++;
    });
  });
  const sorted=Object.values(qStats).filter(s=>s.total>=2)
    .sort((a,b)=>(b.wrong/b.total)-(a.wrong/a.total)).slice(0,8);
  if(!sorted.length){el.innerHTML='<div style="color:var(--gray);font-size:12px;text-align:center;padding:20px">შედეგები ჯერ არ არის</div>';return;}
  el.innerHTML=sorted.map(s=>{
    const pct=Math.round(s.wrong/s.total*100);
    const col=pct>=60?'#fee2e2':pct>=35?'#fef3c7':'#f0fdf4';
    const txtCol=pct>=60?'#991b1b':pct>=35?'#92400e':'#166534';
    return `<div style="padding:8px 12px;background:${col};border-radius:8px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
      <div style="flex:1;font-size:12px;font-weight:500">${esc((s.text||'').slice(0,55))}${s.text&&s.text.length>55?'…':''}</div>
      <div style="font-size:12px;font-weight:700;color:${txtCol};white-space:nowrap">${pct}% ❌ (${s.total})</div>
    </div>`;
  }).join('');
}
function renderTeacherHome(){
  const allResults=teacherResults();
  const students=[...new Set(allResults.map(r=>r.userId))];
  const avgPct=allResults.length?Math.round(allResults.reduce((s,r)=>s+r.pct,0)/allResults.length):0;
  const el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  el('t-stat-tests', ALL_TESTS.length);
  el('t-stat-students', students.length);
  el('t-stat-results', allResults.length);
  el('t-stat-avg', avgPct+'%');
  renderTeacherQAnalytics();
}

// ══════════════════════════════════════════════════════════════
// TEACHER STUDENTS — real data
// ══════════════════════════════════════════════════════════════
function exportResultsCSV(){const rows=[['სახელი','ელ-ფოსტა','ტესტი','%','ქულა','სწ.','თარიღი','verified']];teacherResults().forEach(r=>rows.push([r.userName||r.userId,r.userId,r.testId,r.pct,r.earned+'/'+r.totalPts,r.correct+'/'+r.total,r.date,'yes']));const csv=rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);a.download='edutest_verified_results_'+new Date().toISOString().slice(0,10)+'.csv';a.click();}
function studentTrend(email){
  const rs=SESSION_RESULTS.filter(r=>r.userId===email).slice(0,5).reverse();
  return rs.map(r=>'<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+(r.pct>=70?'#22c55e':r.pct>=50?'#f59e0b':'#ef4444')+';margin:1px" title="'+r.pct+'% — '+r.date+'"></span>').join('');
}
function renderTeacherStudents(){
  const tbody=document.getElementById('t-students-tbody'),hdr=document.getElementById('t-students-hdr');if(!tbody)return;const all=teacherResults();const map=new Map();all.forEach(r=>{if(!map.has(r.userId))map.set(r.userId,{email:r.userId,name:r.userName||r.userId,grade:r.userGrade||'',results:[]});map.get(r.userId).results.push(r);});const students=[...map.values()];if(hdr)hdr.textContent='მოსწავლეები — მხოლოდ server-verified ('+students.length+')';if(!students.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray)">დამოწმებული შედეგები ჯერ არ არის</td></tr>';return;}tbody.innerHTML=students.map(u=>{const results=u.results,avg=Math.round(results.reduce((a,r)=>a+r.pct,0)/results.length),last=results[0];return `<tr><td style="font-weight:500">${esc(u.name)}</td><td>${esc(u.grade||'—')}</td><td style="font-size:11px;color:var(--gray)">${esc(u.email)}</td><td>${results.length}</td><td><b style="color:#2563eb">${avg}%</b></td><td style="font-size:11px;color:var(--gray)">${esc(last?.date||'—')}</td><td><span class="badge b-green">🔐 Verified</span></td><td>${results.slice(0,5).map(r=>'<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+(r.pct>=70?'#22c55e':r.pct>=50?'#f59e0b':'#ef4444')+';margin:1px" title="'+r.pct+'%"></span>').join('')}</td></tr>`;}).join('');
}

// ══════════════════════════════════════════════════════════════
// STUDENT PROFILE — update premium UI
// ══════════════════════════════════════════════════════════════
function renderStudentProfile(){
  if(!CUR_USER)return;
  const av=document.getElementById('s-prof-av');
  const nm=document.getElementById('s-prof-name');
  const em=document.getElementById('s-prof-email');
  const gr=document.getElementById('s-prof-grade');
  const premBadge=document.getElementById('s-prof-premium');
  const premBtn=document.getElementById('s-prof-premium-btn');
  const initials=(CUR_USER.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  if(av)av.textContent=initials;
  if(nm)nm.textContent=CUR_USER.name||'';
  if(em)em.textContent=CUR_USER.email||'';
  if(gr)gr.textContent=(CUR_USER.grade?t('class_label')+' '+CUR_USER.grade:'—');
  const prem=isPremium(CUR_USER.email);
  if(premBadge)premBadge.style.display=prem?'':'none';
  if(premBtn)premBtn.style.display=prem?'none':'';
  const ni=document.getElementById('s-prof-name-input');if(ni)ni.value=CUR_USER.name||'';
  const ei=document.getElementById('s-prof-email-input');if(ei)ei.value=CUR_USER.email||'';
}


async function saveProfile(){
  if(!CUR_USER)return;
  const nameInput=document.getElementById('s-prof-name-input');
  const passInput=document.querySelector('#s-profile input[type="password"]');
  const newName=(nameInput?.value||'').trim();
  const newPass=(passInput?.value||'').trim();
  try{
    if(newPass&&newPass.length<10)throw new Error('ახალი პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს.');
    if(CUR_USER.authProvider==='server'){
      const response=await fetch('/api/auth/profile',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name:newName||CUR_USER.name,password:newPass||undefined})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'პროფილის შენახვა ვერ შესრულდა.');
      CUR_USER=Object.assign(CUR_USER,appUserFromServer(data.user));
    }else if(EDUTEST_CLOUD.client&&EDUTEST_CLOUD.user){
      if(newName){const pr=await EDUTEST_CLOUD.client.from(EDUTEST_SUPABASE_CONFIG.profilesTable).update({name:newName}).eq('id',EDUTEST_CLOUD.user.id);if(pr.error)throw pr.error;CUR_USER.name=newName;}
      if(newPass){const ar=await EDUTEST_CLOUD.client.auth.updateUser({password:newPass});if(ar.error)throw ar.error;}
      EDUTEST_CLOUD.profile=await fetchCloudProfile(EDUTEST_CLOUD.user);
    }else{
      if(!EDUTEST_SUPABASE_CONFIG.allowLocalFallback)throw new Error('პროფილის ცვლილება საჭიროებს Cloud ანგარიშს.');
      if(newName)CUR_USER.name=newName;
    }
    const idx=USER_DB.findIndex(u=>u.email===CUR_USER.email);if(idx>=0){USER_DB[idx]={...USER_DB[idx],...CUR_USER};delete USER_DB[idx].password;}saveUsers();renderStudentProfile();
    if(passInput)passInput.value='';
    const btn=document.querySelector('#s-profile button[onclick="saveProfile()"]');if(btn){const orig=btn.textContent;btn.textContent='✓ შენახულია';setTimeout(()=>{btn.textContent=orig;},1800);}
  }catch(e){alert((e&&e.message)||'პროფილის შენახვა ვერ შესრულდა.');}
}

function approveTeacher(email){
  const u=USER_DB.find(u=>u.email===email);
  if(!u)return;
  u.role='teacher';
  saveUsers();
  renderAdminHome();
  renderAdminUsers&&renderAdminUsers();
}

function rejectTeacher(email){
  if(!confirm('უარყოფა: '+email+'?'))return;
  const idx=USER_DB.findIndex(u=>u.email===email);
  if(idx>=0)USER_DB.splice(idx,1);
  saveUsers();
  renderAdminHome();
}


// ── Class Team Challenge ─────────────────
function renderClassChallenge(){
  const card=document.getElementById('s-class-challenge');
  if(!card||!CUR_USER)return;
  const userGrade=CUR_USER.grade||'';
  if(!userGrade){card.style.display='none';return;}
  // Collect all XP from users in same grade this week
  const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
  const gradeUsers=USER_DB.filter(u=>String(u.grade)===String(userGrade)&&u.role==='student');
  const weekResults=SESSION_RESULTS.filter(r=>{
    const d=new Date(r.date);return !isNaN(d)&&d>=weekAgo;
  });
  let totalXP=0;
  gradeUsers.forEach(u=>{
    const uRes=weekResults.filter(r=>r.userId===u.email);
    uRes.forEach(r=>{totalXP+=(r.xpEarned||calcXP(r.pct,parseInt(u.grade)||1));});
  });
  // Weekly goal: 100 XP per student
  const goal=Math.max(500,gradeUsers.length*100);
  const pct=Math.min(100,Math.round(totalXP/goal*100));
  card.style.display='block';
  const desc=document.getElementById('s-class-challenge-desc');
  if(desc)desc.textContent=userGrade+' კლასი · '+gradeUsers.length+' მოსწავლე · ამ კვირაში';
  const goalLabel=document.getElementById('s-class-goal-label');
  if(goalLabel)goalLabel.textContent=pct+'% შესრულებული';
  const bar=document.getElementById('s-class-bar');
  if(bar)bar.style.width=pct+'%';
  const xpDone=document.getElementById('s-class-xp-done');
  if(xpDone)xpDone.textContent=totalXP+' XP დაგროვებული';
  const xpGoal=document.getElementById('s-class-xp-goal');
  if(xpGoal)xpGoal.textContent='მიზანი: '+goal+' XP';
  // Badge: team_player if class reached 80%+
  if(pct>=80&&CUR_USER){
    const ach=getUserAchievements(CUR_USER.email);
    if(!ach.includes('team_player')){
      // Award automatically via localStorage flag
      try{localStorage.setItem('edutest_team_player_'+CUR_USER.email,'1');}catch(e){}
    }
  }
}
function renderPendingTeachers(){
  const cont=document.getElementById('a-pending-teachers-list');
  if(!cont)return;
  const pending=USER_DB.filter(u=>u.role==='pending_teacher');
  if(pending.length===0){
    const empty=document.createElement('div');empty.style.cssText='color:var(--gray);font-size:13px;padding:8px 0';empty.textContent='დასამტკიცებელი მასწავლებელი არ არის.';cont.replaceChildren(empty);
    return;
  }
  cont.replaceChildren();pending.forEach(user=>{const card=document.createElement('div');card.style.cssText='padding:12px;background:var(--amber-l);border-radius:var(--r);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px';const info=document.createElement('div'),name=document.createElement('div'),meta=document.createElement('div'),actions=document.createElement('div');name.style.cssText='font-weight:600;font-size:13px';name.textContent=String(user.name||user.email||'');meta.style.cssText='font-size:11px;color:var(--gray)';meta.textContent=[user.email,user.school||'—',user.joinDate||''].filter(Boolean).join(' · ');actions.style.cssText='display:flex;gap:6px';[['✓ დამტკიცება','btn btn-green btn-sm',approveTeacher],['✗ უარი','btn btn-danger btn-sm',rejectTeacher]].forEach(([label,className,handler])=>{const button=document.createElement('button');button.type='button';button.className=className;button.textContent=label;button.addEventListener('click',()=>handler(user.email));actions.appendChild(button);});info.append(name,meta);card.append(info,actions);cont.appendChild(card);});
}

// ══════════════════════════════════════════════════════════════
// SERVER-SIDE TEST BUILDER
// ══════════════════════════════════════════════════════════════
let _builderCatalog=[];
function showBuilder(){
  if(!CUR_USER||!['teacher','admin'].includes(CUR_USER.role)){alert('Builder მხოლოდ მასწავლებლის/ადმინის ანგარიშისთვისაა.');return;}
  builderStep=1;selQs=new Set();const m=document.getElementById('builder-modal');if(m)m.classList.remove('hidden');renderBuilderStep();
}
function hideBuilder(){const m=document.getElementById('builder-modal');if(m)m.classList.add('hidden');}
function renderBuilderStep(){for(let i=1;i<=3;i++){const c=document.getElementById('bstep-content-'+i);if(c)c.classList.toggle('hidden',i!==builderStep);const st=document.getElementById('bstep-'+i);if(st)st.classList.toggle('act',i===builderStep);}const prev=document.getElementById('b-prev'),next=document.getElementById('b-next');if(prev)prev.style.visibility=builderStep===1?'hidden':'visible';if(next)next.innerHTML=builderStep===3?'✅ შექმნა':'<span data-i18n="next">შემდეგი</span> →';if(builderStep===2)loadBuilderCatalog();if(builderStep===3)updateBuilderSummary();}
async function bNav(delta){if(delta<0){builderStep=Math.max(1,builderStep-1);renderBuilderStep();return;}if(builderStep===1){const title=(document.getElementById('b-title')?.value||'').trim();if(!title){alert('შეიყვანე ტესტის სათაური.');return;}builderStep=2;renderBuilderStep();return;}if(builderStep===2){if(!selQs.size){alert('აირჩიე მინიმუმ 1 კითხვა.');return;}builderStep=3;renderBuilderStep();return;}if(builderStep===3)await saveBuilderTest();}
async function loadBuilderCatalog(){const box=document.getElementById('q-picker');if(!box)return;box.innerHTML='<div style="padding:16px;color:var(--gray)">იტვირთება server catalog…</div>';try{const grade=Number(document.getElementById('b-grade')?.value||1),subject=document.getElementById('b-subj')?.value||'';const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'catalog',grade,subject});_builderCatalog=d.questions||[];if(!_builderCatalog.length){box.innerHTML='<div style="padding:16px;color:var(--gray)">ამ კლასისა და საგნისთვის კითხვები ვერ მოიძებნა.</div>';return;}box.innerHTML=_builderCatalog.map((q,i)=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border-bottom:1px solid var(--border);font-size:12px"><input type="checkbox" style="width:auto;margin-top:3px" ${selQs.has(q.id)?'checked':''} onchange="toggleBuilderQ('${q.id}',this.checked)"><span><b>${i+1}.</b> ${esc(q.text)}<br><span style="color:var(--gray)">${esc(q.topic||q.type)} · ${q.pts} ქ.</span></span></label>`).join('');updateBuilderCount();}catch(e){box.innerHTML='<div style="padding:16px;color:#b91c1c">'+esc(assessmentErrorMessage(e&&e.message))+'</div>';}}
function toggleBuilderQ(id,on){if(on)selQs.add(id);else selQs.delete(id);updateBuilderCount();}
function updateBuilderCount(){const e=document.getElementById('sel-count');if(e)e.textContent=String(selQs.size);}
function updateBuilderSummary(){const e=document.getElementById('b-summary');if(e)e.innerHTML='<b>'+esc(document.getElementById('b-title')?.value||'')+'</b><br>'+esc(document.getElementById('b-subj')?.value||'')+' · '+esc(document.getElementById('b-grade')?.value||'')+' კლასი · '+selQs.size+' კითხვა<br>🔐 შეფასება შესრულდება მხოლოდ სერვერზე.';}
async function saveBuilderTest(){try{const payload={action:'create',title:(document.getElementById('b-title')?.value||'').trim(),subject:document.getElementById('b-subj')?.value||'',grade:Number(document.getElementById('b-grade')?.value||1),time:Number(document.getElementById('b-time')?.value||20),attempts:Number(document.getElementById('b-att')?.value||2),published:!!document.getElementById('b-pub')?.checked,audience_grade:(document.getElementById('b-audience')?.value||'').trim(),due_at:document.getElementById('b-due')?.value||null,question_ids:[...selQs]};const d=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,payload);if(d.test&&!ALL_TESTS.some(x=>x.id===d.test.id))ALL_TESTS.push(d.test);hideBuilder();renderTeacherTests();alert('✅ ტესტი შეიქმნა server-side და პასუხების გასაღები browser-ში არ გამოქვეყნებულა.');}catch(e){alert('Builder: '+assessmentErrorMessage(e&&e.message));}}

// ══════════════════════════════════════════════════════════════
// QUESTION EDITOR — secure build delegates to server-side Builder.
// ══════════════════════════════════════════════════════════════
function loadCustomQuestions(){}
function saveCustomQuestions(){}
function openQEditor(){ showBuilder(); }
function closeQEditor(){ const m=document.getElementById('qeditor-modal'); if(m)m.classList.add('hidden'); }
function renderQEditorBody(){ const b=document.getElementById('qeditor-body'); if(b)b.innerHTML='<div style="padding:20px;color:var(--gray)">🔐 გამოიყენეთ Server-side Builder.</div>'; }
function addCustomQuestion(){ showBuilder(); }
function removeCustomQ(){}
function saveQEditor(){ showBuilder(); }

async function adminDeleteTest(testId){
  const tx=ALL_TESTS.find(t=>t.id===testId);if(!tx||!tx.serverCustom){alert('სტანდარტული core ტესტი ამ ეკრანიდან არ იშლება.');return;}if(!confirm('წაიშალოს ტესტი '+testId+'?'))return;try{await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.builderFunction,{action:'delete',test_id:testId});const i=ALL_TESTS.findIndex(t=>t.id===testId);if(i>=0)ALL_TESTS.splice(i,1);renderTeacherTests();alert('✅ ტესტი წაიშალა server-side.');}catch(e){alert(assessmentErrorMessage(e&&e.message));}
}


// ══════════════════════════════════════════════════════════════
// REPORT SYSTEM
// ══════════════════════════════════════════════════════════════
let REPORTS = [];
async function loadReports(){
  if(!CUR_USER||CUR_USER.role!=='admin'||!EDUTEST_CLOUD.user){REPORTS=[];return REPORTS;}
  const data=await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.reportFunction,{action:'list'});
  REPORTS=Array.isArray(data.reports)?data.reports:[];
  return REPORTS;
}

function openReportModal(){
  const q=curTestQs&&curTestQs[qIdx];
  const preview=document.getElementById('report-q-preview');
  if(preview&&q) preview.textContent='კითხვა '+(qIdx+1)+': '+(q._kaText||q.text||'').slice(0,80)+'...';
  const comment=document.getElementById('report-comment');
  if(comment)comment.value='';
  document.getElementById('report-modal').classList.remove('hidden');
}
function closeReportModal(){ document.getElementById('report-modal').classList.add('hidden'); }

async function submitReport(){
  const q=curTestQs&&curTestQs[qIdx];
  const type=document.getElementById('report-type')?.value||'other';
  const comment=(document.getElementById('report-comment')?.value||'').trim();
  const btn=document.getElementById('report-submit-btn');
  if(!q||!curTest){alert('რეპორტისთვის აქტიური კითხვა ვერ მოიძებნა.');return;}
  try{
    if(btn){btn.disabled=true;btn.textContent='იგზავნება…';}
    await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.reportFunction,{action:'create',test_id:String(curTest.id||''),question_id:String(q.id||''),report_type:type,comment,question_text:String(q._kaText||q.text||'').slice(0,300)});
    closeReportModal();
    alert('✅ რეპორტი სერვერზე გაიგზავნა. გმადლობ!');
  }catch(e){alert('რეპორტის გაგზავნა ვერ მოხერხდა: '+assessmentErrorMessage(e&&e.message));}
  finally{if(btn){btn.disabled=false;btn.textContent='📤 გაგზავნა';}}
}

// ══════════════════════════════════════════════════════════════
// ADMIN — ALL RESULTS VIEW
// ══════════════════════════════════════════════════════════════
function renderAdminResults(){
  const tbody=document.getElementById('a-results-tbody');
  const userSel=document.getElementById('a-res-user');
  const subjSel=document.getElementById('a-res-subj');
  if(!tbody)return;
  // Populate user dropdown
  if(userSel&&userSel.options.length<=1){
    USER_DB.filter(u=>u.role==='student').forEach(u=>{
      const o=document.createElement('option');o.value=u.email;o.textContent=u.name;userSel.appendChild(o);
    });
  }
  const filterUser=userSel?.value||'';
  const filterSubj=subjSel?.value||'';
  let results=[...SESSION_RESULTS];
  if(filterUser)results=results.filter(r=>r.userId===filterUser);
  if(filterSubj)results=results.filter(r=>r.subject===filterSubj);
  results.sort((a,b)=>b.date.localeCompare(a.date));
  if(!results.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--gray)">შედეგები არ არის</td></tr>';
    return;
  }
  tbody.innerHTML=results.map(r=>{
    const user=USER_DB.find(u=>u.email===r.userId);
    const userName=user?user.name:r.userId;
    const tx=ALL_TESTS.find(x=>x.id===r.testId);
    const testName=tx?txTitle(tx):(r.subject?r.subject+' '+r.grade+'კლ.':'—');
    const pct=r.pct||0;
    const badgeColor=pct>=90?'b-blue':pct>=70?'b-green':pct>=50?'b-amber':'b-red';
    const badgeText=pct>=90?'🏆 შესანიშნავი':pct>=70?'✅ კარგი':pct>=50?'📘 ჩაბარებული':'❌ გასაუმჯობესებელი';
    return `<tr>
      <td style="font-weight:500;font-size:13px">${userName}</td>
      <td style="font-size:12px">${testName}</td>
      <td><span style="font-weight:700;color:${pct>=70?'#16a34a':pct>=50?'#d97706':'#dc2626'}">${pct}%</span></td>
      <td style="font-size:12px">${r.earned||0}/${r.totalPts||0}</td>
      <td><span class="badge ${badgeColor}" style="font-size:11px">${badgeText}</span></td>
      <td style="font-size:11px;color:var(--gray)">${r.date||'—'}</td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// ADMIN — REPORTS VIEW
// ══════════════════════════════════════════════════════════════
const REPORT_TYPES={'wrong_answer':'❌ სავარ. პასუხი','bad_question':'✏️ კითხვა','typo':'🔤 მართლ.','other':'💬 სხვა'};

function renderAdminReports(){
  const tbody=document.getElementById('a-reports-tbody');
  const badge=document.getElementById('a-reports-badge');
  if(!tbody)return;
  const unresolved=REPORTS.filter(r=>!r.resolved).length;
  if(badge){ badge.textContent=unresolved>0?unresolved:''; badge.style.display=unresolved>0?'':'none'; }
  if(!REPORTS.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--gray)">რეპორტები არ არის</td></tr>';
    return;
  }
  tbody.innerHTML=REPORTS.map((r,i)=>`<tr style="${r.resolved?'opacity:.5':''}">
    <td style="font-size:11px;color:var(--gray)">${esc(r.date||'—')}</td>
    <td style="font-size:12px">${esc(r.userName||r.userId||'—')}</td>
    <td style="font-size:12px">${esc(r.testTitle||r.testId||'—')}</td>
    <td style="font-size:11px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(r.qText||'')}">${esc(r.qText||'—')}</td>
    <td><span class="badge b-amber" style="font-size:11px">${esc(REPORT_TYPES[r.type]||r.type||'other')}</span></td>
    <td style="display:flex;gap:4px;align-items:center">
      <span style="font-size:11px;color:var(--gray);flex:1">${esc(r.comment||'—')}</span>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px" data-report-id="${esc(r.id||'')}" onclick="resolveReport(this.dataset.reportId,${r.resolved?'false':'true'})">${r.resolved?'↩':'✓'}</button>
    </td>
  </tr>`).join('');
}

async function resolveReport(id,resolved){try{await invokeAssessment(EDUTEST_ASSESSMENT_CONFIG.reportFunction,{action:'resolve',report_id:String(id||''),resolved:!!resolved});await loadReports();renderAdminReports();}catch(e){alert('რეპორტის სტატუსი ვერ განახლდა: '+assessmentErrorMessage(e&&e.message));}}


// ════════════════════════════════════════════════
// ADMIN SCHOOLS / CLASSES / STUDENTS
// ════════════════════════════════════════════════
function renderAdminSchools(){
  var schF=document.getElementById('a-sch-filter');
  var clsF=document.getElementById('a-cls-filter');
  var tbody=document.getElementById('a-schools-tbody');
  var cards=document.getElementById('a-schools-cards');
  var titleEl=document.getElementById('a-sch-table-title');
  var promBtn=document.getElementById('a-promote-btn');
  if(!tbody)return;
  var students=USER_DB.filter(function(u){return u.role==='student';});
  // Fill school dropdown once
  var schOpts=Array.from(new Set(students.map(function(u){return u.school||'სკოლა მითითებული არ არის';}))).sort();
  if(schF&&schF.options.length<=1){
    schOpts.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=s;schF.appendChild(o);});
  }
  // Fill class dropdown once
  var clsOpts=Array.from(new Set(students.map(function(u){return u.grade||'—';}))).filter(function(g){return g!=='—';}).sort(function(a,b){var na=parseInt(a),nb=parseInt(b);return na!==nb?na-nb:a.localeCompare(b);});
  if(clsF&&clsF.options.length<=1){
    clsOpts.forEach(function(g){var o=document.createElement('option');o.value=g;o.textContent=g+' კლ.';clsF.appendChild(o);});
  }
  var selSch=schF?schF.value:'';
  var selCls=clsF?clsF.value:'';
  // School cards
  if(cards){
    if(!selSch&&!selCls){
      cards.innerHTML='';
      var schMap={};
      students.forEach(function(u){
        var k=u.school||'სკოლა მითითებული არ არის';
        if(!schMap[k])schMap[k]={count:0,results:0};
        schMap[k].count++;
        schMap[k].results+=SESSION_RESULTS.filter(function(r){return r.userId===u.email;}).length;
      });
      Object.keys(schMap).sort().forEach(function(name){
        var d=schMap[name];
        var card=document.createElement('div');
        card.className='card';
        card.style.cssText='padding:14px;cursor:pointer;transition:box-shadow .15s';
        card.innerHTML='<div style="font-size:20px;margin-bottom:6px">🏫</div>'+
          '<div style="font-weight:600;font-size:13px;margin-bottom:4px">'+name+'</div>'+
          '<div style="font-size:11px;color:var(--gray)">'+d.count+' მოსწ. · '+d.results+' შედ.</div>';
        (function(n){card.onclick=function(){schF.value=n;renderAdminSchools();};})(name);
        cards.appendChild(card);
      });
      if(titleEl)titleEl.textContent='ყველა სკოლა ('+students.length+' მოსწ.)';
      tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--gray)">👆 სკოლაზე დაჭერით ნახე მოსწავლეები</td></tr>';
      if(promBtn)promBtn.style.display='none';
      return;
    } else {
      cards.innerHTML='';
    }
  }
  // Filter students
  var filtered=students.slice();
  if(selSch)filtered=filtered.filter(function(u){return (u.school||'სკოლა მითითებული არ არის')===selSch;});
  if(selCls)filtered=filtered.filter(function(u){return u.grade===selCls;});
  if(titleEl)titleEl.textContent='მოსწავლეები'+(selSch?' — '+selSch:'')+(selCls?' — '+selCls+' კლ.':'')+ ' ('+filtered.length+')';
  if(promBtn)promBtn.style.display=selCls?'':'none';
  if(!filtered.length){
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray)">მოსწავლეები არ არის</td></tr>';
    return;
  }
  var defaults=DEFAULT_USERS.map(function(d){return d.email;});
  tbody.innerHTML='';
  filtered.forEach(function(u){
    var ures=SESSION_RESULTS.filter(function(r){return r.userId===u.email;});
    var avg=ures.length?Math.round(ures.reduce(function(s,r){return s+r.pct;},0)/ures.length):null;
    var isDefault=defaults.indexOf(u.email)>=0;
    var tr=document.createElement('tr');
    var avgHtml=avg!==null?('<span style="font-weight:600;color:'+(avg>=70?'#16a34a':avg>=50?'#d97706':'#dc2626')+'">'+avg+'%</span>'):'—';
    tr.innerHTML=
      '<td style="font-weight:500">'+u.name+'</td>'+
      '<td style="font-size:11px;color:var(--gray)">'+u.email+'</td>'+
      '<td style="font-size:12px">'+(u.school||'—')+'</td>'+
      '<td><span class="badge b-blue" style="font-size:11px">'+(u.grade||'—')+'</span></td>'+
      '<td>'+ures.length+'</td>'+
      '<td>'+avgHtml+'</td>'+
      '<td style="font-size:11px;color:var(--gray)">'+(u.joinDate||'—')+'</td>'+
      '<td style="display:flex;gap:4px"></td>';
    var actCell=tr.querySelector('td:last-child');
    var b1=document.createElement('button');
    b1.className='btn btn-ghost btn-sm';b1.title='შედეგების ნახვა';b1.textContent='📊';
    (function(em){b1.onclick=function(){openStudentResults(em);};})(u.email);
    actCell.appendChild(b1);
    if(ures.length){
      var b2=document.createElement('button');
      b2.className='btn btn-danger btn-sm';b2.title='შედეგების წაშლა';b2.textContent='🗑';
      (function(em){b2.onclick=function(){adminDeleteResults(em);renderAdminSchools();};})(u.email);
      actCell.appendChild(b2);
    }
    if(!isDefault){
      var b3=document.createElement('button');
      b3.className='btn btn-danger btn-sm';b3.title='მოსწავლის წაშლა';b3.textContent='✕';
      (function(em){b3.onclick=function(){if(confirm('წაიშალოს '+em+'?')){adminDeleteUser(em);}renderAdminSchools();};})(u.email);
      actCell.appendChild(b3);
    }
    tbody.appendChild(tr);
  });
}

var _srmEmail=null;
function openStudentResults(email){
  _srmEmail=email;
  var u=USER_DB.find(function(x){return x.email===email;});
  var results=SESSION_RESULTS.filter(function(r){return r.userId===email;});
  var nameEl=document.getElementById('srm-name');
  var metaEl=document.getElementById('srm-meta');
  var body=document.getElementById('srm-body');
  var delBtn=document.getElementById('srm-del-btn');
  if(nameEl)nameEl.textContent=(u?u.name:email)+' — შედეგები';
  if(metaEl)metaEl.textContent=(u&&u.school?u.school+' · ':'')+(u&&u.grade?u.grade+' კლ. · ':'')+ results.length+' ჩაბ. ტესტი';
  if(delBtn)delBtn.style.display=results.length?'':'none';
  if(body){
    if(!results.length){
      body.innerHTML='<div style="text-align:center;padding:30px;color:var(--gray)">შედეგები არ არის</div>';
    } else {
      var avg2=Math.round(results.reduce(function(s,r){return s+r.pct;},0)/results.length);
      var statsHtml='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'+
        '<div class="card" style="padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#2563eb">'+results.length+'</div><div style="font-size:11px;color:var(--gray)">ჩაბარებული</div></div>'+
        '<div class="card" style="padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:'+(avg2>=70?'#16a34a':'#d97706')+'">'+avg2+'%</div><div style="font-size:11px;color:var(--gray)">საშ. ქულა</div></div>'+
        '<div class="card" style="padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#7c3aed">'+results.filter(function(r){return r.pct>=90;}).length+'</div><div style="font-size:11px;color:var(--gray)">🏆 შესანიშნავი</div></div>'+
        '</div>';
      var listHtml='<div style="display:flex;flex-direction:column;gap:8px">';
      results.forEach(function(r){
        var tx=ALL_TESTS.find(function(x){return x.id===r.testId;});
        var tname=tx?txTitle(tx):(r.subject||'ტესტი');
        var pct=r.pct||0;
        var col=pct>=90?'#1d4ed8':pct>=70?'#16a34a':pct>=50?'#d97706':'#dc2626';
        listHtml+='<div class="card" style="padding:10px 14px;display:flex;align-items:center;gap:10px">'+
          '<div style="flex:1"><div style="font-weight:500;font-size:13px">'+tname+'</div>'+
          '<div style="font-size:11px;color:var(--gray)">'+r.correct+'/'+r.total+' სწ. · '+r.date+'</div></div>'+
          '<div style="font-weight:700;color:'+col+'">'+pct+'%</div></div>';
      });
      listHtml+='</div>';
      body.innerHTML=statsHtml+listHtml;
    }
  }
  const _srmModal=document.getElementById('student-results-modal');if(_srmModal)_srmModal.classList.remove('hidden');
}
function adminDeleteResultsModal(){
  if(!_srmEmail)return;
  if(!confirm('წაიშალოს '+_srmEmail+'-ის ყველა შედეგი?'))return;
  adminDeleteResults(_srmEmail);
  document.getElementById('student-results-modal').classList.add('hidden');
  renderAdminSchools();
}

function showPromoteModal(){
  var clsF=document.getElementById('a-cls-filter');
  var selCls=clsF?clsF.value:'';
  var pf=document.getElementById('promote-from');
  if(!pf)return;
  var students=USER_DB.filter(function(u){return u.role==='student';});
  var classes=Array.from(new Set(students.map(function(u){return u.grade||'';}))).filter(Boolean).sort(function(a,b){var na=parseInt(a),nb=parseInt(b);return na!==nb?na-nb:a.localeCompare(b);});
  pf.innerHTML='<option value="">-- კლასი --</option>'+classes.map(function(g){return '<option value="'+g+'"'+(g===selCls?' selected':'')+'>'+g+' კლ.</option>';}).join('');
  updatePromotePreview();
  document.getElementById('promote-modal').classList.remove('hidden');
}
function updatePromotePreview(){
  var fromCls=document.getElementById('promote-from')?document.getElementById('promote-from').value:'';
  var prev=document.getElementById('promote-preview');
  if(!fromCls){if(prev)prev.textContent='';return;}
  var sts=USER_DB.filter(function(u){return u.role==='student'&&u.grade===fromCls;});
  var num=parseInt(fromCls);var letter=fromCls.replace(/\d+/,'');
  var nextG=num<12?(num+1)+letter:'XII (დამამთავრებელი)';
  if(prev)prev.innerHTML='<strong>'+sts.length+'</strong> მოსწ.: <strong>'+fromCls+'</strong> → <strong>'+nextG+'</strong>';
}
function executePromotion(){
  var fromCls=document.getElementById('promote-from')?document.getElementById('promote-from').value:'';
  if(!fromCls){alert('აირჩიე კლასი');return;}
  var num=parseInt(fromCls);var letter=fromCls.replace(/\d+/,'');
  if(num>=12){alert('XII კლასელები ასრულებენ სკოლას');return;}
  var nextG=(num+1)+letter;
  var sts=USER_DB.filter(function(u){return u.role==='student'&&u.grade===fromCls;});
  if(!sts.length){alert('ამ კლასში მოსწავლეები არ არიან');return;}
  sts.forEach(function(u){u.prevGrade=u.grade;u.grade=nextG;u.promotedDate=new Date().toLocaleDateString('ka-GE');if(CUR_USER&&CUR_USER.email===u.email)CUR_USER.grade=nextG;});
  saveUsers();
  document.getElementById('promote-modal').classList.add('hidden');
  var cf=document.getElementById('a-cls-filter');if(cf)cf.value=nextG;
  renderAdminSchools();
  alert('✅ '+sts.length+' მოსწ. გადაყვანილია: '+fromCls+' → '+nextG);
}
function applyAuthModeLayout(){
  const registration=loginMode==='reg';
  const panel=document.getElementById('email-auth-panel');if(panel)panel.classList.toggle('hidden',!emailRegistrationExpanded);
  const toggle=document.getElementById('email-auth-toggle');if(toggle){toggle.setAttribute('aria-expanded',emailRegistrationExpanded?'true':'false');toggle.textContent=emailRegistrationExpanded?'✕ ელფოსტის ფორმის დახურვა':'✉️ ელფოსტით და პაროლით გაგრძელება';}
  const role=document.getElementById('email-role-field');if(role){role.classList.toggle('hidden',!registration);role.style.display=registration?'':'none';}
  ['email-address-field','email-password-field','l-btn'].forEach(function(id){const el=document.getElementById(id);if(el)el.style.display='';});
  const reg=document.getElementById('reg-fields');if(reg)reg.classList.toggle('hidden',!registration);
  const actions=document.getElementById('auth-email-actions');if(actions)actions.style.display=!registration?'flex':'none';
  const teacher=document.getElementById('teacher-note');if(teacher)teacher.classList.toggle('hidden',!registration||curRole!=='teacher');
}
function showEmailRegistrationForm(){
  emailRegistrationExpanded=true;applyAuthModeLayout();
  const email=document.getElementById('l-email');if(email)setTimeout(function(){email.focus();},0);
}
function toggleEmailAuth(){
  emailRegistrationExpanded=!emailRegistrationExpanded;
  applyAuthModeLayout();
  if(emailRegistrationExpanded){const email=document.getElementById('l-email');if(email)setTimeout(function(){email.focus();},0);}
  else{const toggle=document.getElementById('email-auth-toggle');if(toggle)setTimeout(function(){toggle.focus();},0);}
}
function loginTab(tab){
  loginMode=tab;
  document.getElementById('ltab-login').classList.toggle('act',tab==='login');
  document.getElementById('ltab-reg').classList.toggle('act',tab==='reg');
  const so=document.getElementById('student-reg-only');if(so)so.classList.toggle('hidden',curRole!=='student');
  document.getElementById('parent-reg-only')?.classList.toggle('hidden',curRole!=='parent');
  const btn=document.getElementById('l-btn');
  if(btn)btn.textContent=tab==='login'?t('login'):t('register');
  applyAuthModeLayout();
  updateSocialButtonLabels();
}

function openAuth(mode){
  go('login');
  emailRegistrationExpanded=false;
  loginTab(mode==='reg'?'reg':'login');
  setTimeout(function(){const first=document.querySelector('#p-login button[id^="oauth-"]:not([disabled])')||document.getElementById('email-auth-toggle');if(first)first.focus();},0);
}

function setRole(r){
  curRole=r;
  ['student','teacher','parent'].forEach(x=>{
    const b=document.getElementById('rb-'+x);if(!b)return;
    if(x===r){b.style.borderColor=r==='teacher'?'#16a34a':r==='admin'?'#7c3aed':'#2563eb';b.style.background=r==='teacher'?'#dcfce7':r==='admin'?'#ede9fe':'#dbeafe';b.style.color=r==='teacher'?'#16a34a':r==='admin'?'#7c3aed':'#1d4ed8';}
    else{b.style.borderColor='var(--border)';b.style.background='#fff';b.style.color='var(--gray)';}
  });
  const em=document.getElementById('l-email');const ps=document.getElementById('l-pass');
  if(loginMode==='reg'){if(em)em.value='';if(ps)ps.value='';}
  const rf=document.getElementById('reg-fields');if(rf)rf.classList.toggle('hidden',loginMode!=='reg'||!emailRegistrationExpanded);
  const so=document.getElementById('student-reg-only');if(so)so.classList.toggle('hidden',r!=='student');
  document.getElementById('parent-reg-only')?.classList.toggle('hidden',r!=='parent');
  const tn=document.getElementById('teacher-note');if(tn)tn.classList.toggle('hidden',r!=='teacher'||loginMode!=='reg'||!emailRegistrationExpanded);
}

async function doLogin(){
  const email=(document.getElementById('l-email')?.value||'').trim().toLowerCase();
  const pass=(document.getElementById('l-pass')?.value||'').trim();
  const errEl=document.getElementById('login-error');
  const btn=document.getElementById('l-btn');
  if(errEl){errEl.classList.add('hidden');errEl.style.color='var(--red)';}
  if(btn)btn.disabled=true;
  try{
    if(loginMode==='login'){
      if(!email||!pass)throw new Error(t('fill_all'));
      const response=await fetch('/api/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email,password:pass})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||t('wrong_pass'));
      const appUser=await adoptServerUser(data.user,{navigate:true});
      logAuditEvent('LOGIN_SERVER',appUser.email+' ('+appUser.role+')');
      return;
    }

    // Registration
    if(curRole==='admin')throw new Error('Admin ანგარიშის თვითრეგისტრაცია გამორთულია. Admin იქმნება მხოლოდ სანდო server/admin პროცესით.');
    if(!isLegalConfigReady() && EDUTEST_PRIVACY_CONFIG.enforceLegalConfig)throw new Error('რეგისტრაცია დაბლოკილია: შეავსეთ EDUTEST_PRIVACY_CONFIG-ში რეალური controller/მისამართი/Supabase region.');
    if(!email||!pass)throw new Error(t('fill_all'));
    if(!email.includes('@')||!email.includes('.'))throw new Error('გთხოვთ შეიყვანეთ სწორი ელ-ფოსტა');
    if(pass.length<10)throw new Error('პაროლი მინიმუმ 10 სიმბოლო უნდა იყოს');
    const rname=(document.getElementById('r-name')?.value||'').trim();
    if(!rname)throw new Error('გთხოვთ შეიყვანეთ სახელი');
    const surname=(document.getElementById('r-surname')?.value||'').trim();
    const name=(rname+' '+surname).trim();
    const grade=curRole==='student'?(document.getElementById('r-grade')?.value||''):'';
    const school=(document.getElementById('r-school')?.value||'').trim();
    const requestedRole=['teacher','parent'].includes(curRole)?curRole:'student'; // self-registration can never create admin
    if(!document.getElementById('r-terms')?.checked||!document.getElementById('r-privacy')?.checked)throw new Error('რეგისტრაციამდე გაეცანით და დაადასტურეთ წესები და კონფიდენციალურობის პოლიტიკა.');
    let birthDate='',guardianEmail='',under16=false;
    if(requestedRole==='parent'){
      birthDate=document.getElementById('r-parent-dob')?.value||'';const age=calculateAge(birthDate);
      if(age===null||age<18||age>100)throw new Error('მშობლის ანგარიში სრულწლოვან პირს ეკუთვნის.');
    }
    if(requestedRole==='student'){
      birthDate=document.getElementById('r-dob')?.value||'';const age=calculateAge(birthDate);
      if(age===null||age<5||age>100)throw new Error('შეიყვანეთ სწორი დაბადების თარიღი.');
      under16=age<16;guardianEmail=(document.getElementById('r-guardian-email')?.value||'').trim().toLowerCase();
      if(under16&&(!guardianEmail||!guardianEmail.includes('@')||guardianEmail===email))throw new Error('16 წლამდე მოსწავლისთვის მიუთითეთ მშობლის/კანონიერი წარმომადგენლის განსხვავებული სწორი ელფოსტა.');
    }

    const registerResponse=await fetch('/api/auth/register',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email,password:pass,name,role:requestedRole,grade,school,birthDate,guardianEmail,termsVersion:EDUTEST_PRIVACY_CONFIG.termsVersion,privacyVersion:EDUTEST_PRIVACY_CONFIG.privacyVersion})});
    const registered=await registerResponse.json().catch(()=>({}));
    if(!registerResponse.ok)throw new Error(registered.error||'რეგისტრაცია ვერ დასრულდა');
    const appUser=await adoptServerUser(registered.user,{navigate:true});
    if(!registered.emailSent){const notice=document.getElementById('email-verification-error');if(notice){notice.textContent='ანგარიში შეიქმნა, მაგრამ წერილი დროებით ვერ გაიგზავნა. დააჭირეთ „ბმულის ხელახლა გაგზავნას“.';notice.classList.remove('hidden');}}
    logAuditEvent('REGISTER_SERVER',appUser.email+' ('+appUser.role+')');
  }catch(e){
    if(errEl){errEl.textContent=(e&&e.message)||String(e);errEl.classList.remove('hidden');}
  }finally{if(btn)btn.disabled=false;}
}

function confirmExitTest(){
  if(confirm(t('exit_test_confirm'))){
    if(timerInt)clearInterval(timerInt);
    _isDailyBonus=false;window._practiceMode=false;
    const dest=curRole==='teacher'?'teacher':'student';
    go(dest);
    setTimeout(()=>{
      const navEl=curRole==='teacher'
        ?document.querySelectorAll('#p-teacher .ni')[1]
        :document.querySelectorAll('#p-student .ni')[1];
      if(curRole==='teacher')tNav('t-tests',navEl);
      else sNav('s-tests',navEl);
    },100);
  }
}
function goBackToTests(){
  const dest=curRole==='teacher'?'teacher':'student';
  go(dest);
  setTimeout(()=>{
    const navEl=curRole==='teacher'
      ?document.querySelectorAll('#p-teacher .ni')[1]
      :document.querySelectorAll('#p-student .ni')[1];
    if(curRole==='teacher')tNav('t-tests',navEl);
    else sNav('s-tests',navEl);
  },100);
}

function renderAdminUsers(){
  const tbody=document.getElementById('a-users-tbody');
  if(!tbody)return;
  const defaults=DEFAULT_USERS.map(d=>d.email);
  tbody.innerHTML=USER_DB.map(u=>{
    const results=SESSION_RESULTS.filter(r=>r.userId===u.email);
    const isDefault=defaults.includes(u.email);
    const avgPct=results.length?Math.round(results.reduce((s,r)=>s+r.pct,0)/results.length):null;
    const roleLabel={'student':'მოსწავლე','teacher':'მასწავლებელი','admin':'Admin'}[u.role]||u.role;
    const roleColor={'student':'b-blue','teacher':'b-green','admin':'b-red'}[u.role]||'b-blue';
    return `<tr>
      <td style="font-weight:500">${esc(u.name)}</td>
      <td style="font-size:11px;color:var(--gray)">${esc(u.email)}</td>
      <td><span class="badge ${roleColor}">${esc(roleLabel)}</span></td>
      <td>${esc(u.grade||'—')}</td>
      <td>${results.length}${avgPct!==null?' <span style="color:var(--gray);font-size:11px">('+avgPct+'%)</span>':''}</td>
      <td>
        ${u.role==='student'?`<button class="btn btn-sm ${u.premium?'btn-amber':'btn-outline'}" data-email="${esc(u.email)}" onclick="grantPremium(this.dataset.email,${!u.premium})" style="${u.premium?'background:#fef3c7;border-color:#d97706;color:#92400e':''}">
          ${u.premium?'⭐ Premium':'○ Free'}</button>`:'—'}
      </td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        ${results.length?`<button class="btn btn-danger btn-sm" data-email="${esc(u.email)}" onclick="adminDeleteResults(this.dataset.email)">🗑 შედეგ.</button>`:''}
        <button class="btn btn-outline btn-sm" data-email="${esc(u.email)}" onclick="adminEditUser(this.dataset.email)" title="რედაქტირება" style="padding:3px 8px">✎</button>
        ${!isDefault?`<button class="btn btn-danger btn-sm" data-email="${esc(u.email)}" onclick="adminDeleteUser(this.dataset.email)">✕</button>`:''}
      </td>
    </tr>`;
  }).join('');
}
async function doLogout(){
  EDUTEST_AUTH_GENERATION++;
  if(timerInt)clearInterval(timerInt);timerInt=null;
  if(EDUTEST_STATE_SYNC_TIMER){clearInterval(EDUTEST_STATE_SYNC_TIMER);EDUTEST_STATE_SYNC_TIMER=null;}
  await syncUserLearningState();
  try{await fetch('/api/auth/logout',{method:'POST',credentials:'include'});}catch(e){console.warn(e);}
  try{if(EDUTEST_CLOUD.client&&EDUTEST_CLOUD.user)await EDUTEST_CLOUD.client.auth.signOut();}catch(e){console.warn(e);}
  EDUTEST_SERVER_AUTH_ACTIVE=false;EDUTEST_CLOUD.user=null;EDUTEST_CLOUD.profile=null;CUR_USER=null;
  USER_DB.splice(0,USER_DB.length);SESSION_RESULTS.splice(0,SESSION_RESULTS.length);ASSIGNMENTS=[];REPORTS=[];ADMIN_AUDIT_LOG=[];ALL_TESTS.splice(0,ALL_TESTS.length);
  try{localStorage.removeItem('edutest_users');localStorage.removeItem('edutest_results');}catch(_){}
  ['age-verification-modal','guardian-pending-modal','email-verification-modal','admin-mfa-modal'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
  go('landing');if(typeof refreshAssessmentCatalog==='function')refreshAssessmentCatalog(true);
}

// ── Update UI after login ─────────────────────────────────────────────────────
function updateStudentUI(){
  if(!CUR_USER)return;
  applyGradeTheme(CUR_USER.grade);
  const initials=(CUR_USER.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2);
  const av=document.getElementById('s-sidebar-av');if(av)av.textContent=initials;
  const sn=document.getElementById('s-sidebar-name');if(sn)sn.textContent=CUR_USER.name||'';
  const se=document.getElementById('s-sidebar-email');if(se)se.textContent=CUR_USER.email||'';
  const sub=document.getElementById('s-topbar-sub');if(sub)sub.textContent=(CUR_USER.grade?t('class_label')+' '+CUR_USER.grade+' · ':'')+t('student_label');
  const badge=document.getElementById('s-topbar-badge');if(badge)badge.textContent=CUR_USER.grade?t('grade')+' '+CUR_USER.grade:'Student';
  const greet=document.getElementById('s-home-greeting');if(greet)greet.textContent=t('hello_label')+', '+(CUR_USER.name.split(' ')[0]||'')+'!';
  const pn=document.getElementById('s-prof-name');if(pn)pn.textContent=CUR_USER.name||'';
  const pe=document.getElementById('s-prof-email');if(pe)pe.textContent=CUR_USER.email||'';
  const pg=document.getElementById('s-prof-grade');if(pg)pg.textContent=CUR_USER.grade?t('class_label')+' '+CUR_USER.grade:'Student';
  const pi=document.getElementById('s-prof-av');if(pi)pi.textContent=initials;
  const pni=document.getElementById('s-prof-name-input');if(pni)pni.value=CUR_USER.name||'';
  const pei=document.getElementById('s-prof-email-input');if(pei)pei.value=CUR_USER.email||'';
  const userGradeNum2=CUR_USER?.grade?parseInt(CUR_USER.grade):null;
  const sFilterGrade=document.getElementById('s-filter-grade');
  if(sFilterGrade&&userGradeNum2)sFilterGrade.value=String(userGradeNum2);
  updateStudentHomeStats();
  updatePrivacyStatus();
}

function updateTeacherUI(){
  if(!CUR_USER)return;
  const initials=(CUR_USER.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2);
  const av=document.getElementById('t-sidebar-av');if(av)av.textContent=initials;
  const sn=document.getElementById('t-sidebar-name');if(sn)sn.textContent=CUR_USER.name||'';
  const se=document.getElementById('t-sidebar-email');if(se)se.textContent=CUR_USER.email||'';
  const sub=document.getElementById('t-topbar-sub');if(sub)sub.textContent=t('teacher_label');
}

function updateStudentHomeStats(){
  const uid=CUR_USER?.email||'';
  const mine=SESSION_RESULTS.filter(r=>r.userId===uid);
  const el_t=document.getElementById('sh-tests');if(el_t)el_t.textContent=mine.length;
  const el_p=document.getElementById('sh-pts');if(el_p)el_p.textContent=mine.reduce((s,r)=>s+r.earned,0);
  const el_e=document.getElementById('sh-exc');if(el_e)el_e.textContent=mine.filter(r=>r.pct>=90).length;
  const avg=mine.length?Math.round(mine.reduce((s,r)=>s+r.pct,0)/mine.length):null;
  const el_a=document.getElementById('sh-avg');if(el_a)el_a.textContent=avg!==null?avg+'%':'—';
  // XP & level on home
  const xp=getUserXP(uid);
  const lv=getLevel(xp);
  const streak=getUserStreak(uid);
  const el_xp=document.getElementById('sh-xp');if(el_xp)el_xp.textContent=xp+' XP';
  const el_lv=document.getElementById('sh-level');if(el_lv)el_lv.textContent=lv.name;
  const el_st=document.getElementById('sh-streak');if(el_st)el_st.textContent='🔥 '+streak+' დღე';
  const freezeN=CUR_USER?getFreezesAvailable(CUR_USER.email):0;
  const fbadge=document.getElementById('sh-freeze-badge');
  const fcnt=document.getElementById('sh-freeze-count');
  if(fbadge){fbadge.style.display=freezeN>0?'inline':'none';}
  if(fcnt)fcnt.textContent=freezeN;
  const rec=document.getElementById('s-home-recent');
  if(rec){
    if(!mine.length){rec.innerHTML='<div style="color:var(--gray);font-size:13px;text-align:center;padding:20px">'+t('no_test_taken')+'</div>';}
    else{rec.innerHTML=mine.slice(0,3).map(r=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:12px;font-weight:500">${esc(rTitle(r))}</div><div style="font-size:11px;color:var(--gray)">${esc(String(r.date||''))}</div></div><span class="badge ${Number(r.pct)>=90?'b-blue':Number(r.pct)>=70?'b-green':Number(r.pct)>=50?'b-amber':'b-red'}">${performanceBadgeLabel(Number(r.pct))}</span></div>`).join('');}
  }
}

// ── Student Tests List ────────────────────────────────────────────────────────
