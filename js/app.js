/* ── State ── */
let completed = store.getObj('la30_tasks',{});
let uploads   = store.getObj('la30_uploads',{});
let notes     = store.getObj('la30_notes',{});
let streak    = store.getObj('la30_streak',{count:0,lastDate:''});
let activeWeek = 0;
let activePage = 'week';

function saveC(){store.setObj('la30_tasks',completed);}
function saveU(){
  if(!store.setObj('la30_uploads',uploads))showToast('Storage is full or blocked: photos will be lost when you close this tab');
}
function saveN(){store.setObj('la30_notes',notes);}
function saveS(){store.setObj('la30_streak',streak);}

function totalTasks(){return WEEKS.reduce((s,w)=>s+w.days.reduce((ss,d)=>ss+d.tasks.length,0),0);}
function totalDone(){return Object.values(completed).filter(Boolean).length;}
function weekDone(wi){return WEEKS[wi].days.reduce((s,d,di)=>s+d.tasks.filter((_,ti)=>completed[wi+'-'+di+'-'+ti]).length,0);}
function weekTotal(wi){return WEEKS[wi].days.reduce((s,d)=>s+d.tasks.length,0);}
function totalUploads(){return Object.values(uploads).reduce((s,a)=>s+(Array.isArray(a)?a.length:0),0);}
function daysActive(){
  const days=new Set();
  Object.keys(completed).forEach(k=>{if(completed[k]){const p=k.split('-');if(p.length===3)days.add(p[0]+'-'+p[1]);}});
  return days.size;
}
function daysLeft(){
  const all=WEEKS.reduce((s,w)=>s+w.days.length,0);
  const doneDays=new Set();
  WEEKS.forEach((w,wi)=>w.days.forEach((d,di)=>{
    const t=d.tasks.length,dn=d.tasks.filter((_,ti)=>completed[wi+'-'+di+'-'+ti]).length;
    if(dn===t&&t>0)doneDays.add(wi+'-'+di);
  }));
  return all-doneDays.size;
}

/* ── Streak ── */
function localDateStr(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function updateStreak(){
  const now=new Date();
  const today=localDateStr(now);
  if(streak.lastDate===today)return;
  const yesterday=localDateStr(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1));
  if(totalDone()>0){
    if(streak.lastDate===yesterday)streak.count++;
    else if(streak.lastDate!==today)streak.count=1;
    streak.lastDate=today;saveS();
  }
}

/* ── XP / UI Update ── */
function updateXP(){
  updateStreak();
  const done=totalDone(),total=totalTasks(),pct=total?Math.round(done/total*100):0;
  const f=document.getElementById('xp-fill');if(f)f.style.width=(total?done/total*100:0).toFixed(1)+'%';
  const xt=document.getElementById('xp-text');if(xt)xt.textContent=done+' / '+total+' complete';
  const hd=document.getElementById('hero-done');if(hd)hd.textContent=done;
  const hs=document.getElementById('hero-streak');if(hs)hs.textContent=streak.count+'🔥';
  const hp=document.getElementById('hero-pct');if(hp)hp.textContent=pct+'%';
  const hl=document.getElementById('hero-days');if(hl)hl.textContent=daysLeft();
  const ns=document.getElementById('nav-streak');if(ns)ns.textContent=streak.count;
  const wx=document.getElementById('week-xp');if(wx)wx.textContent=weekDone(activeWeek)+'/'+weekTotal(activeWeek);
  WEEKS.forEach((_,wi)=>{const tp=document.getElementById('tp-'+wi);if(tp)tp.textContent=weekDone(wi)+'/'+weekTotal(wi);});
  WEEKS.forEach((_,wi)=>{const bar=document.getElementById('wbar-fill-'+wi);if(bar){const wt=weekTotal(wi);bar.style.width=wt?(weekDone(wi)/wt*100).toFixed(0)+'%':'0%';}});
  const cb=document.getElementById('complete-banner');if(cb&&done===total&&total>0)cb.classList.add('show');
}

/* ── Particles ── */
function initParticles(){
  const c=document.getElementById('particles');if(!c)return;
  const colors=['#4a90ff','#9b6bff','#20d47e','#f0c040'];
  for(let i=0;i<24;i++){
    const s=document.createElement('span');
    const sz=1+Math.random()*2.5;
    s.style.cssText=`left:${Math.random()*100}%;top:${30+Math.random()*55}%;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};--d:${6+Math.random()*10}s;--delay:${Math.random()*8}s;--dx:${(Math.random()-0.5)*70}px;`;
    c.appendChild(s);
  }
}

/* ── Build Weeks ── */
function buildWeeks(){
  const container=document.getElementById('weeks-container');
  WEEKS.forEach(function(week,wi){
    const sec=document.createElement('div');
    sec.className='week-section'+(wi===0?' active':'');sec.id='week-'+wi;
    const inner=document.createElement('div');
    const wd=weekDone(wi),wt=weekTotal(wi),wp=wt?Math.round(wd/wt*100):0;
    inner.innerHTML='<div class="week-header">'+
      '<div class="week-num-big">W'+week.number+'</div>'+
      '<div class="week-head-text"><div class="week-title">'+week.title+'</div><div class="week-theme">'+week.theme+'</div></div>'+
      '<div class="week-bar-wrap"><div class="week-bar-label">'+wp+'% complete</div>'+
      '<div class="week-bar-track"><div class="week-bar-fill" id="wbar-fill-'+wi+'" style="width:'+wp+'%"></div></div></div>'+
    '</div>';
    const dl=document.createElement('div');
    week.days.forEach(function(day,di){dl.appendChild(buildDay(wi,di,day));});
    inner.appendChild(dl);sec.appendChild(inner);container.appendChild(sec);
  });
  updateXP();
}

function buildDay(wi,di,day){
  const card=document.createElement('div');
  const allDone=day.tasks.every((_,ti)=>completed[wi+'-'+di+'-'+ti]);
  card.className='day-card'+(day.review?' review-day':'')+(allDone?' complete':'');
  card.id='day-'+wi+'-'+di;
  const dots=[...new Set(day.tasks.map(t=>t.r))].map(r=>'<div class="dot" style="background:'+BDOT[r]+'"></div>').join('');
  const done=day.tasks.filter((_,ti)=>completed[wi+'-'+di+'-'+ti]).length;
  const hdr=document.createElement('div');hdr.className='day-header';
  hdr.innerHTML=
    '<div class="day-num-wrap"><div class="day-num">'+day.day+'</div><div class="day-done-ring">✓</div></div>'+
    '<div class="day-info"><div class="day-topic">'+day.topic+'</div>'+
    '<div class="day-meta"><span class="day-strang">'+day.strang+'</span><div class="day-dots">'+dots+'</div></div></div>'+
    '<div class="day-right">'+
    '<div class="day-prog'+(allDone?' full':'')+'">'+done+'/'+day.tasks.length+'</div>'+
    '<div class="day-chevron">▼</div></div>';
  hdr.setAttribute('role','button');hdr.tabIndex=0;hdr.setAttribute('aria-expanded','false');
  const toggleDay=function(){
    const isOpen=card.classList.contains('open');
    document.querySelectorAll('.day-card.open').forEach(c=>{
      if(c!==card){c.classList.remove('open');const h=c.querySelector('.day-header');if(h)h.setAttribute('aria-expanded','false');}
    });
    card.classList.toggle('open',!isOpen);
    hdr.setAttribute('aria-expanded',String(!isOpen));
  };
  hdr.addEventListener('click',toggleDay);
  hdr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDay();}});
  const body=document.createElement('div');body.className='day-body';
  // tasks
  body.innerHTML='<div class="order-label">Complete in order ↓</div>';
  const tl=document.createElement('div');tl.className='tasks-list';
  day.tasks.forEach(function(task,ti){
    const key=wi+'-'+di+'-'+ti;
    const isDone=!!completed[key];
    const row=document.createElement('div');row.className='task-row'+(isDone?' done':'');
    let linkHtml='';
    if(task.url){linkHtml='<a class="task-link" href="'+task.url+'" target="_blank" rel="noopener">'+task.t+'</a>';}
    else{linkHtml='<span class="task-span">'+task.t+'</span>';}
    let pillsHtml='';
    if(task.ps&&PS[task.ps]){
      const p=PS[task.ps];
      pillsHtml='<a class="task-pill pill-q" href="'+p[0]+'" target="_blank" rel="noopener">📝 Problems</a>'+
                '<a class="task-pill pill-s" href="'+p[1]+'" target="_blank" rel="noopener">💡 Solutions</a>';
    }
    row.innerHTML=
      '<button type="button" class="task-check" aria-pressed="'+isDone+'" aria-label="Mark done: '+task.t.replace(/"/g,'&quot;')+'">'+(isDone?'✓':'')+'</button>'+
      '<span class="task-badge badge-'+task.r+'">'+BADGE[task.r]+'</span>'+
      '<div class="task-main">'+
        '<div class="task-title-row">'+linkHtml+'</div>'+
        (pillsHtml?'<div class="task-sub">'+pillsHtml+'</div>':'')+
      '</div>'+
      '<div class="task-time">'+task.time+'</div>';
    row.querySelector('.task-check').addEventListener('click',function(e){
      e.stopPropagation();
      completed[key]=!completed[key];saveC();
      row.classList.toggle('done',completed[key]);
      const chk=row.querySelector('.task-check');
      chk.textContent=completed[key]?'✓':'';chk.setAttribute('aria-pressed',String(!!completed[key]));
      const allNowDone=day.tasks.every((_,ti2)=>completed[wi+'-'+di+'-'+ti2]);
      card.classList.toggle('complete',allNowDone);
      const prog=hdr.querySelector('.day-prog');
      if(prog){const nd=day.tasks.filter((_,ti2)=>completed[wi+'-'+di+'-'+ti2]).length;prog.textContent=nd+'/'+day.tasks.length;prog.classList.toggle('full',allNowDone);}
      if(allNowDone)showToast('Day '+day.day+' complete! 🎉');
      updateXP();
    });
    tl.appendChild(row);
  });
  body.appendChild(tl);
  // topic summary
  if(day.summary){
    const ts=document.createElement('div');ts.className='topic-summary';
    ts.innerHTML='<div class="topic-summary-hdr"><span class="ts-icon">🧠</span><span class="ts-label">Key Concepts & Intuition</span><span class="ts-toggle">▼</span></div>'+
      '<div class="topic-summary-body">'+day.summary.geo+
      '<div class="key-formula">'+day.summary.formula+'</div>'+
      '<div class="pitfall">⚠ Common pitfall: '+day.summary.pitfall+'</div>'+
    '</div>';
    ts.querySelector('.topic-summary-hdr').addEventListener('click',()=>ts.classList.toggle('open'));
    body.appendChild(ts);
  }
  // sketch
  if(day.sketch){
    const sk=document.createElement('div');sk.className='sketch-box';
    sk.innerHTML='<div class="sketch-icon">✏️</div><div><div class="sketch-label">Today\'s Sketch</div><div class="sketch-text">'+day.sketch+'</div></div>';
    body.appendChild(sk);
  }
  // notes
  const nb=document.createElement('div');nb.className='notes-box';
  const noteKey='note-'+wi+'-'+di;
  nb.innerHTML='<div class="notes-label">My Notes</div>'+
    '<textarea class="notes-area" aria-label="Notes for day '+day.day+'" placeholder="Write notes here — saved automatically..."></textarea>'+
    '<div class="notes-saved" id="ns-'+wi+'-'+di+'">✓ saved</div>';
  let nt=null;
  nb.querySelector('textarea').value=notes[noteKey]||'';
  nb.querySelector('textarea').addEventListener('input',function(){
    notes[noteKey]=this.value;saveN();
    const sv=document.getElementById('ns-'+wi+'-'+di);if(sv){sv.classList.add('show');clearTimeout(nt);nt=setTimeout(()=>sv.classList.remove('show'),1500);}
  });
  body.appendChild(nb);
  // upload
  const uz=document.createElement('div');uz.className='upload-zone';
  const imgKey=wi+'-'+di;
  uz.innerHTML='<div class="upload-zone-top"><span class="upload-zone-label">📸 My Sketches & Photos</span>'+
    '<label class="upload-btn">+ Add photo / sketch<input type="file" class="upload-input" accept="image/*" multiple></label></div>'+
    '<div class="uploads-grid" id="ug-'+wi+'-'+di+'"></div>';
  uz.querySelector('.upload-input').addEventListener('change',function(){
    if(!uploads[imgKey])uploads[imgKey]=[];
    const files=Array.from(this.files);
    files.forEach(function(file){
      downscaleImage(file,1280,0.82).then(function(dataUrl){
        uploads[imgKey].push({dataUrl:dataUrl,name:file.name,date:new Date().toLocaleDateString()});
        saveU();renderUploads(wi,di);
      }).catch(()=>showToast('Could not read "'+file.name+'"'));
    });
    this.value='';
  });
  body.appendChild(uz);
  renderUploads(wi,di);
  card.appendChild(hdr);card.appendChild(body);
  return card;
}

/* Shrink photos to a JPEG (max side `maxSide`px) so they fit in localStorage's ~5MB quota. */
function downscaleImage(file,maxSide,quality){
  return new Promise(function(resolve,reject){
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=function(){
      const k=Math.min(1,maxSide/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      const ctx=c.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height); // flatten transparency for JPEG
      ctx.drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg',quality));
    };
    img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('decode failed'));};
    img.src=url;
  });
}

function renderUploads(wi,di){
  const grid=document.getElementById('ug-'+wi+'-'+di);if(!grid)return;
  const key=wi+'-'+di;const imgs=uploads[key]||[];
  grid.innerHTML='';
  imgs.forEach(function(item,idx){
    const w=document.createElement('div');w.className='upload-thumb';
    const img=document.createElement('img');img.src=item.dataUrl;img.alt=item.name;
    img.addEventListener('click',()=>openLB(item.dataUrl));
    const del=document.createElement('button');del.className='del-btn';del.textContent='✕';
    del.addEventListener('click',function(e){e.stopPropagation();uploads[key].splice(idx,1);saveU();renderUploads(wi,di);});
    const fn=document.createElement('div');fn.className='fname';fn.textContent=item.name;
    w.appendChild(img);w.appendChild(del);w.appendChild(fn);grid.appendChild(w);
  });
}

/* ── Stats ── */
function buildStats(){
  const done=totalDone(),total=totalTasks();
  const sc_done=document.getElementById('sc-done');if(sc_done)sc_done.textContent=done;
  const sc_sub=document.getElementById('sc-done-sub');if(sc_sub)sc_sub.textContent='of '+total+' total ('+(total?Math.round(done/total*100):0)+'%)';
  const sc_streak=document.getElementById('sc-streak');if(sc_streak)sc_streak.textContent=streak.count;
  const sc_days=document.getElementById('sc-days');if(sc_days)sc_days.textContent=daysActive();
  const sc_up=document.getElementById('sc-uploads');if(sc_up)sc_up.textContent=totalUploads();
  const cal=document.getElementById('cal-grid');
  if(cal){
    cal.innerHTML='';
    WEEKS.forEach(function(week,wi){
      week.days.forEach(function(day,di){
        const div=document.createElement('div');div.className='cal-day';
        const t=day.tasks.length,dn=day.tasks.filter((_,ti)=>completed[wi+'-'+di+'-'+ti]).length;
        if(dn===t&&t>0)div.classList.add('done');else if(dn>0)div.classList.add('partial');
        const num=document.createElement('div');num.className='cal-day-num';num.textContent=day.day;
        div.appendChild(num);div.title='Day '+day.day+': '+day.topic+' ('+dn+'/'+t+')';
        cal.appendChild(div);
      });
    });
  }
  const wb=document.getElementById('week-bars');
  if(wb){
    wb.innerHTML='';
    WEEKS.forEach(function(week,wi){
      const wd=weekDone(wi),wt=weekTotal(wi),wp=wt?Math.round(wd/wt*100):0;
      const colors=['var(--blue)','var(--green)','var(--gold)','var(--purple)'];
      const row=document.createElement('div');row.className='week-bar-row';
      row.innerHTML='<div class="week-bar-name">Week '+week.number+'</div>'+
        '<div class="week-bar-bg"><div class="week-bar-inner" style="width:'+wp+'%;background:'+colors[wi]+'"></div></div>'+
        '<div class="week-bar-pct">'+wp+'%</div>';
      wb.appendChild(row);
    });
  }
}

/* ── Gallery ── */
function renderGallery(){
  const content=document.getElementById('gallery-content');if(!content)return;
  const groups=[];
  WEEKS.forEach(function(week,wi){week.days.forEach(function(day,di){
    const imgs=uploads[wi+'-'+di]||[];if(imgs.length)groups.push({wi,di,day,imgs});
  });});
  content.innerHTML='';
  if(!groups.length){
    content.innerHTML='<div class="gallery-empty"><div class="big">NO UPLOADS YET</div><p>Expand any day card and tap "+ Add photo / sketch".</p></div>';return;
  }
  groups.forEach(function(g){
    const grp=document.createElement('div');grp.className='gallery-day-group';
    grp.innerHTML='<div class="gdg-title">Day '+g.day.day+' — '+g.day.topic+'</div><div class="gdg-sub">Week '+(g.wi+1)+' · Strang '+g.day.strang+' · '+g.imgs.length+' upload'+(g.imgs.length>1?'s':'')+'</div>';
    const grid=document.createElement('div');grid.className='gallery-imgs';
    g.imgs.forEach(function(item,idx){
      const wrap=document.createElement('div');wrap.className='gimg-wrap';
      const img=document.createElement('img');img.src=item.dataUrl;img.alt=item.name;
      img.addEventListener('click',()=>openLB(item.dataUrl));
      const cap=document.createElement('div');cap.className='gimg-caption';cap.textContent=(item.date?item.date+' · ':'')+item.name;
      const del=document.createElement('button');del.className='gimg-del';del.textContent='✕ remove';
      del.addEventListener('click',function(e){e.stopPropagation();delUpload(g.wi,g.di,idx);renderGallery();});
      wrap.appendChild(img);wrap.appendChild(cap);wrap.appendChild(del);grid.appendChild(wrap);
    });
    grp.appendChild(grid);content.appendChild(grp);
  });
}

function delUpload(wi,di,idx){const k=wi+'-'+di;if(uploads[k])uploads[k].splice(idx,1);saveU();}

/* ── Navigation ── */
function switchWeek(wi){
  activePage='week';
  ['stats-page','gallery-page','ai-page','quiz-page','vis-page'].forEach(id=>document.getElementById(id)&&document.getElementById(id).classList.remove('active'));
  ['stats-nav-btn','gallery-nav-btn','ai-nav-btn','quiz-nav-btn','vis-nav-btn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  document.querySelectorAll('.week-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  const ws=document.getElementById('week-'+wi);if(ws)ws.classList.add('active');
  const wb=document.getElementById('wbtn-'+wi);if(wb)wb.classList.add('active');
  activeWeek=wi;updateXP();
  document.getElementById('week-nav').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function switchPage(page){
  activePage=page;
  document.querySelectorAll('.week-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'));
  ['stats-page','gallery-page','ai-page','quiz-page','vis-page'].forEach(id=>document.getElementById(id)&&document.getElementById(id).classList.remove('active'));
  ['stats-nav-btn','gallery-nav-btn','ai-nav-btn','quiz-nav-btn','vis-nav-btn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const pageEl=document.getElementById(page+'-page');if(pageEl)pageEl.classList.add('active');
  const navBtn=document.getElementById(page+'-nav-btn');if(navBtn)navBtn.classList.add('active');
  document.getElementById('week-nav').scrollIntoView({behavior:'smooth',block:'nearest'});
  if(page==='stats')buildStats();
  if(page==='gallery')renderGallery();
  if(page==='vis'){setTimeout(drawAllVisuals,50);}
  if(page==='quiz')renderQuiz();
}

/* ── Lightbox ── */
function openLB(src){const lb=document.getElementById('lightbox'),img=document.getElementById('lightbox-img');if(lb&&img){img.src=src;lb.classList.add('open');document.body.style.overflow='hidden';}}
function closeLB(){const lb=document.getElementById('lightbox');if(lb){lb.classList.remove('open');document.body.style.overflow='';}}

/* ── Toast ── */
function showToast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
