(function(){
'use strict';
let users=[],filtered=[],settings={},stats={},queue=[];
let filterNF=false,minScore=0,searchQ='',isSchedulerOn=false,scanning=false;

function send(msg){return new Promise((res,rej)=>{chrome.runtime.sendMessage(msg,r=>{if(chrome.runtime.lastError)rej(new Error(chrome.runtime.lastError.message));else res(r)})});}

async function init(){
  try{settings=await send({type:'GET_SETTINGS'})||{unfollowCount:15,intervalMinutes:15,maxDailyUnfollows:100,minDelay:3000,maxDelay:8000,skipVerified:false,autoMode:false};}catch(e){settings={unfollowCount:15,intervalMinutes:15,maxDailyUnfollows:100,minDelay:3000,maxDelay:8000,skipVerified:false,autoMode:false};}
  isSchedulerOn=settings.autoMode||false;
  try{stats=await send({type:'GET_STATS'})||{totalUnfollowed:0,todayUnfollowed:0};}catch(e){stats={totalUnfollowed:0,todayUnfollowed:0};}
  try{const r=await send({type:'GET_QUEUE'});queue=Array.isArray(r)?r:[];}catch(e){queue=[];}
  render();bindEvents();
}

function render(){
  const today=stats.todayUnfollowed||0,max=settings.maxDailyUnfollows||100,pct=(today/max)*100;
  el('progressText').textContent=today+'/'+max;
  el('statToday').textContent=today;el('statTotal').textContent=stats.totalUnfollowed||0;el('statRemain').textContent=max-today;
  const fill=el('progressFill');fill.style.width=Math.min(pct,100)+'%';fill.className='progress-fill'+(pct>=90?' danger':pct>=60?' warn':'');
  el('inpBatch').value=settings.unfollowCount||15;el('inpInterval').value=settings.intervalMinutes||15;
  el('schedSub').textContent=queue.length+' in queue';
  const badge=el('statusBadge'),logo=el('logoIcon'),schedIcon=el('schedIcon'),schedStatus=el('schedStatus');
  if(isSchedulerOn){badge.classList.add('active');badge.querySelector('span').textContent='Active';logo.classList.add('spin');schedIcon.classList.add('active');schedStatus.classList.remove('hidden');el('schedStatusTxt').textContent='Running: '+settings.unfollowCount+' every '+settings.intervalMinutes+' min';el('schedToggle').classList.add('active');}
  else{badge.classList.remove('active');badge.querySelector('span').textContent='Idle';logo.classList.remove('spin');schedIcon.classList.remove('active');schedStatus.classList.add('hidden');el('schedToggle').classList.remove('active');}
  if(queue.length>0){el('queueCard').classList.remove('hidden');el('queueText').textContent='Queue: '+queue.length;}else{el('queueCard').classList.add('hidden');}
  if(users.length>0){el('filterCard').classList.remove('hidden');applyFilters();renderUsers();}
}

function applyFilters(){
  filtered=users.filter(u=>{
    if(filterNF&&u.followsYou)return false;
    if(minScore>0&&(u.wallchainScore===null||u.wallchainScore<minScore))return false;
    if(searchQ){const q=searchQ.toLowerCase();return u.username.toLowerCase().includes(q)||(u.displayName||'').toLowerCase().includes(q);}
    return true;
  });
  el('filterCount').textContent='Showing '+filtered.length+' of '+users.length;
}

function renderUsers(){
  if(filtered.length===0){el('userSection').classList.add('hidden');return;}
  el('userSection').classList.remove('hidden');el('userTitle').textContent='Users ('+filtered.length+')';
  const qSet=new Set(queue.map(u=>u.username));
  el('userList').innerHTML=filtered.slice(0,100).map(u=>{
    const inQ=qSet.has(u.username);
    const init=(u.displayName||u.username).charAt(0).toUpperCase();
    const av=u.avatar?'<img src="'+u.avatar+'" alt="">':init;
    let scoreBadge='';
    if(u.wallchainScore!==null){const cls=u.wallchainScore>=70?'badge-green':u.wallchainScore>=40?'badge-yellow':'badge-red';scoreBadge='<span class="badge '+cls+'">WC:'+u.wallchainScore+'</span>';}
    const nfBadge=!u.followsYou?'<span class="badge badge-red">Not following</span>':'';
    return '<div class="user-card" data-u="'+u.username+'"><div class="user-avatar">'+av+'<div class="follow-dot '+(u.followsYou?'yes':'no')+'"></div></div><div class="user-info"><div class="user-name">'+
    (u.displayName||u.username)+(u.isVerified?' ✓':'')+'</div><div class="user-meta"><span class="user-handle">@'+u.username+'</span>'+scoreBadge+nfBadge+'</div></div><div class="user-actions"><button class="q-btn'+(inQ?' on':'')+'" data-act="queue" data-u="'+u.username+'">'+(inQ?'✓':'+')+'</button><button class="uf-btn" data-act="uf" data-u="'+u.username+'">Unfollow</button></div></div>';
  }).join('');
}

function bindEvents(){
  el('settingsBtn').onclick=()=>{el('settingsView').classList.remove('hidden');el('sMaxDaily').value=settings.maxDailyUnfollows;el('sMinDelay').value=settings.minDelay;el('sMaxDelay').value=settings.maxDelay;if(settings.skipVerified)el('sSkipVerified').classList.add('active');};
  el('backBtn').onclick=()=>el('settingsView').classList.add('hidden');
  el('saveBtn').onclick=async()=>{settings.maxDailyUnfollows=+el('sMaxDaily').value||100;settings.minDelay=+el('sMinDelay').value||3000;settings.maxDelay=+el('sMaxDelay').value||8000;settings.skipVerified=el('sSkipVerified').classList.contains('active');await send({type:'SAVE_SETTINGS',settings});el('settingsView').classList.add('hidden');render();};
  el('sSkipVerified').onclick=function(){this.classList.toggle('active');};
  el('schedToggle').onclick=async()=>{
    if(isSchedulerOn){await send({type:'STOP_SCHEDULER'});isSchedulerOn=false;}
    else{settings.unfollowCount=+el('inpBatch').value||15;settings.intervalMinutes=+el('inpInterval').value||15;await send({type:'SAVE_SETTINGS',settings});await send({type:'START_SCHEDULER'});isSchedulerOn=true;}
    render();
  };
  el('loadBtn').onclick=scanUsers;
  el('clearQueueBtn').onclick=async()=>{await send({type:'CLEAR_QUEUE'});queue=[];render();};
  el('btnNonFollowers').onclick=function(){filterNF=!filterNF;this.classList.toggle('active',filterNF);applyFilters();renderUsers();};
  el('btnQueueAll').onclick=async()=>{const toQ=filtered.filter(u=>!u.followsYou);if(toQ.length){await send({type:'ADD_TO_QUEUE',users:toQ});const r=await send({type:'GET_QUEUE'});queue=Array.isArray(r)?r:[];render();}};
  el('scoreSlider').oninput=function(){minScore=+this.value;const v=el('scoreVal');v.textContent=minScore;v.className='score-val'+(minScore>0?' on':'');applyFilters();renderUsers();};
  el('searchInput').oninput=function(){searchQ=this.value;applyFilters();renderUsers();};
  el('userList').onclick=async(e)=>{
    const btn=e.target.closest('[data-act]');if(!btn)return;
    const act=btn.dataset.act,uname=btn.dataset.u,user=users.find(u=>u.username===uname);if(!user)return;
    if(act==='uf'){btn.disabled=true;btn.textContent='...';const r=await send({type:'MANUAL_UNFOLLOW',user});if(r&&r.success){users=users.filter(u=>u.username!==uname);stats=await send({type:'GET_STATS'})||stats;render();}else{btn.disabled=false;btn.textContent='Unfollow';}}
    if(act==='queue'){const inQ=queue.some(u=>u.username===uname);if(inQ)await send({type:'REMOVE_FROM_QUEUE',username:uname});else await send({type:'ADD_TO_QUEUE',users:[user]});const r=await send({type:'GET_QUEUE'});queue=Array.isArray(r)?r:[];render();}
  };
  chrome.runtime.onMessage.addListener(msg=>{
    if(msg.type==='UNFOLLOW_PROGRESS'||msg.type==='BATCH_COMPLETE'){send({type:'GET_STATS'}).then(r=>{stats=r||stats;render();});send({type:'GET_QUEUE'}).then(r=>{queue=Array.isArray(r)?r:[];render();});}
    if(msg.type==='SCAN_PROGRESS')el('loadBtnText').textContent='Scanning... ('+msg.scanned+' found)';
  });
}

async function scanUsers(){
  if(scanning)return;scanning=true;
  const btn=el('loadBtn'),hint=el('loadHint'),err=el('loadError');
  btn.classList.add('scanning');el('loadBtnText').textContent='⏳ Scanning...';hint.classList.add('hidden');err.classList.add('hidden');
  try{
    const r=await send({type:'SCAN_USERS'});
    if(r&&r.success){users=r.users||[];el('loadBtnText').textContent='⬇ Rescan ('+users.length+' loaded)';render();}
    else{err.textContent=r?.reason||'Scan failed. Open x.com/YourUsername/following first.';err.classList.remove('hidden');el('loadBtnText').textContent='⬇ Load Following List';}
  }catch(e){err.textContent=e.message;err.classList.remove('hidden');el('loadBtnText').textContent='⬇ Load Following List';}
  btn.classList.remove('scanning');scanning=false;
}

function el(id){return document.getElementById(id);}
document.addEventListener('DOMContentLoaded',init);
})();
