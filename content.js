/**
 * X Unfollower Pro v2 - Content Script
 * Injects floating modal dashboard directly into X.com
 */
(function() {
'use strict';

let modalOpen = false;
let users = [];
let filtered = [];
let queue = [];
let settings = {};
let stats = {};
let filterNF = false;
let minScore = 0;
let searchQ = '';
let isSchedulerOn = false;
let scanning = false;
let displayCount = 50;
let scrollObserver = null;

// ============================================================
// CHROME MESSAGE HELPERS
// ============================================================
async function send(msg, retries) {
  retries = retries || 3;
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((res, rej) => {
        chrome.runtime.sendMessage(msg, r => {
          if (chrome.runtime.lastError) rej(new Error(chrome.runtime.lastError.message));
          else res(r);
        });
      });
    } catch(e) {
      if (i < retries - 1) await sleep(300 * (i + 1));
      else throw e;
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// ============================================================
// DOM SCANNER
// ============================================================
const scannedUsers = new Map();
let isScanning = false;

function extractUserFromCell(cell) {
  try {
    const links = cell.querySelectorAll('a[role="link"]');
    let username = '';
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('/status/') && href.split('/').length === 2) {
        username = href.replace('/', ''); break;
      }
    }
    if (!username) return null;
    let displayName = username;
    const nameEl = cell.querySelector('[data-testid="UserName"]');
    if (nameEl) {
      const spans = nameEl.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent && !span.textContent.startsWith('@') && span.textContent.trim()) {
          displayName = span.textContent.trim(); break;
        }
      }
    }
    const avatarImg = cell.querySelector('img[src*="profile_images"]');
    const avatar = avatarImg ? avatarImg.src : '';
    const isVerified = !!(cell.querySelector('[data-testid="icon-verified"]') || cell.querySelector('[aria-label="Verified account"]'));
    const followsYou = (cell.textContent || '').includes('Follows you');
    const wallchainScore = getWallchainScore(cell, username);
    return { username, displayName, avatar, isVerified, followsYou, wallchainScore, scannedAt: Date.now() };
  } catch(e) { return null; }
}

function getWallchainScore(cell, username) {
  const el = cell.querySelector('[data-wallchain-score]');
  if (el) { const s = parseInt(el.getAttribute('data-wallchain-score'), 10); if (!isNaN(s)) return s; }
  const wcEl = cell.querySelector('.wallchain-score');
  if (wcEl) { const m = wcEl.textContent.match(/(\d+)/); if (m) return parseInt(m[1], 10); }
  const all = cell.querySelectorAll('[class*="wallchain"],[class*="Wallchain"]');
  for (const e of all) { const m = e.textContent.match(/(\d+)/); if (m) return parseInt(m[1], 10); }
  try { const g = window.__wallchain_scores || window.wallchainData; if (g && g[username]) return g[username]; } catch(e) {}
  return null;
}


async function fullScan(progressCb) {
  if (isScanning) return { success: false, reason: 'Already scanning' };
  isScanning = true;
  scannedUsers.clear();
  let noNew = 0;
  for (let i = 0; i < 50 && noNew < 5; i++) {
    const prev = scannedUsers.size;
    document.querySelectorAll('[data-testid="UserCell"]').forEach(cell => {
      const u = extractUserFromCell(cell);
      if (u && !scannedUsers.has(u.username)) scannedUsers.set(u.username, u);
    });
    if (progressCb) progressCb(scannedUsers.size);
    if (scannedUsers.size === prev) noNew++; else noNew = 0;
    window.scrollBy(0, window.innerHeight * 0.8);
    await sleep(800 + Math.random() * 700);
    const newH = document.documentElement.scrollHeight;
    if (noNew >= 3) break;
  }
  isScanning = false;
  const arr = Array.from(scannedUsers.values());
  return { success: true, users: arr, total: arr.length, nonFollowers: arr.filter(u => !u.followsYou).length };
}

// ============================================================
// UNFOLLOW ENGINE
// ============================================================
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (const c of cookies) { const [n, v] = c.trim().split('='); if (n === 'ct0') return v; }
  return null;
}

async function getUserId(username, csrf) {
  try {
    const variables = JSON.stringify({ screen_name: username, withSafetyModeUserFields: true });
    const features = JSON.stringify({ hidden_profile_subscriptions_enabled: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true });
    const url = 'https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables=' + encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);
    const r = await fetch(url, { headers: { 'X-Csrf-Token': csrf, 'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'X-Twitter-Auth-Type': 'OAuth2Session', 'Content-Type': 'application/json' }, credentials: 'include' });
    if (r.ok) { const d = await r.json(); return d?.data?.user?.result?.rest_id; }
  } catch(e) {}
  return null;
}

async function executeUnfollow(user) {
  try {
    const csrf = getCsrfToken();
    if (!csrf) return { success: false, reason: 'Not logged in' };
    const userId = await getUserId(user.username, csrf);
    if (!userId) return { success: false, reason: 'Could not get user ID' };
    const r = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Csrf-Token': csrf, 'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'X-Twitter-Auth-Type': 'OAuth2Session', 'X-Twitter-Active-User': 'yes' },
      credentials: 'include', body: 'user_id=' + userId
    });
    return r.ok ? { success: true, username: user.username } : { success: false, reason: 'API ' + r.status };
  } catch(e) { return { success: false, reason: e.message }; }
}


// ============================================================
// MODAL UI - BUILD HTML
// ============================================================
function buildModalHTML() {
  return `
<div id="xuf-overlay" class="xuf-overlay">
  <div id="xuf-modal" class="xuf-modal">
    <!-- Header -->
    <header class="xuf-header">
      <div class="xuf-header-left">
        <div class="xuf-logo"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/></svg></div>
        <div><h1 class="xuf-title">X Unfollower Pro</h1><p class="xuf-subtitle">Premium Dashboard</p></div>
      </div>
      <div class="xuf-header-right">
        <div class="xuf-stat-pill"><span class="xuf-stat-dot"></span><span id="xuf-stat-today">0</span> today</div>
        <div class="xuf-stat-pill"><span id="xuf-stat-total">0</span> total</div>
        <div class="xuf-stat-pill xuf-stat-sched" id="xuf-sched-badge"><span class="xuf-pulse"></span><span id="xuf-sched-text">Idle</span></div>
        <button id="xuf-close" class="xuf-close">&times;</button>
      </div>
    </header>

    <!-- Body -->
    <div class="xuf-body">
      <!-- Sidebar -->
      <aside class="xuf-sidebar">
        <div class="xuf-section">
          <h3 class="xuf-section-title">Filters</h3>
          <label class="xuf-toggle-row"><input type="checkbox" id="xuf-filter-nf"><span>Non-Followers Only</span></label>
          <label class="xuf-toggle-row"><input type="checkbox" id="xuf-filter-verified"><span>Skip Verified</span></label>
          <div class="xuf-score-filter">
            <span>Min Wallchain Score</span>
            <div class="xuf-score-row"><input type="range" id="xuf-score-slider" min="0" max="100" value="0"><span id="xuf-score-val" class="xuf-score-val">0</span></div>
          </div>
          <input type="text" id="xuf-search" class="xuf-input" placeholder="Search username...">
        </div>

        <div class="xuf-section">
          <h3 class="xuf-section-title">Scheduler</h3>
          <div class="xuf-field"><label>Batch</label><input type="number" id="xuf-batch" class="xuf-input-sm" min="1" max="50" value="15"></div>
          <div class="xuf-field"><label>Interval (min)</label><input type="number" id="xuf-interval" class="xuf-input-sm" min="5" max="120" value="15"></div>
          <button id="xuf-sched-toggle" class="xuf-btn xuf-btn-accent">Start Scheduler</button>
        </div>

        <div class="xuf-section">
          <h3 class="xuf-section-title">Queue</h3>
          <p class="xuf-queue-info" id="xuf-queue-info">0 users queued</p>
          <button id="xuf-queue-all" class="xuf-btn xuf-btn-outline">+ Queue Filtered</button>
          <button id="xuf-queue-clear" class="xuf-btn xuf-btn-ghost">Clear Queue</button>
        </div>

        <div class="xuf-section">
          <button id="xuf-scan-btn" class="xuf-btn xuf-btn-primary xuf-btn-full">Load Following List</button>
          <p class="xuf-hint" id="xuf-scan-hint">Go to your Following page first</p>
        </div>
      </aside>

      <!-- User List -->
      <div class="xuf-main">
        <div class="xuf-list-header">
          <span id="xuf-list-count">0 users</span>
          <span class="xuf-list-hint">Scroll for more</span>
        </div>
        <div class="xuf-user-list" id="xuf-user-list"></div>
      </div>
    </div>
  </div>
</div>`;
}


// ============================================================
// MODAL CONTROL
// ============================================================
function openModal() {
  if (modalOpen) return;
  if (document.getElementById('xuf-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', buildModalHTML());
  requestAnimationFrame(() => {
    const overlay = document.getElementById('xuf-overlay');
    const modal = document.getElementById('xuf-modal');
    overlay.classList.add('xuf-show');
    modal.classList.add('xuf-show');
  });
  modalOpen = true;
  bindModalEvents();
  loadData();
}

function closeModal() {
  const overlay = document.getElementById('xuf-overlay');
  const modal = document.getElementById('xuf-modal');
  if (!overlay) return;
  overlay.classList.remove('xuf-show');
  modal.classList.remove('xuf-show');
  setTimeout(() => { overlay.remove(); }, 300);
  modalOpen = false;
  if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
}

function toggleModal() {
  if (modalOpen) closeModal(); else openModal();
}

async function loadData() {
  const defaults = { unfollowCount: 15, intervalMinutes: 15, maxDailyUnfollows: 100, minDelay: 3000, maxDelay: 8000, skipVerified: false, autoMode: false };
  const defaultStats = { totalUnfollowed: 0, todayUnfollowed: 0 };
  try { settings = await send({ type: 'GET_SETTINGS' }) || defaults; } catch(e) {
    try { const d = await chrome.storage.local.get('settings'); settings = d.settings || defaults; } catch(e2) { settings = defaults; }
  }
  isSchedulerOn = settings.autoMode || false;
  try { stats = await send({ type: 'GET_STATS' }) || defaultStats; } catch(e) {
    try { const d = await chrome.storage.local.get('stats'); stats = d.stats || defaultStats; } catch(e2) { stats = defaultStats; }
  }
  try { const r = await send({ type: 'GET_QUEUE' }); queue = Array.isArray(r) ? r : []; } catch(e) {
    try { const d = await chrome.storage.local.get('queue'); queue = Array.isArray(d.queue) ? d.queue : []; } catch(e2) { queue = []; }
  }
  renderModal();
}


// ============================================================
// RENDER MODAL STATE
// ============================================================
function renderModal() {
  const el = id => document.getElementById(id);
  if (!el('xuf-overlay')) return;

  el('xuf-stat-today').textContent = stats.todayUnfollowed || 0;
  el('xuf-stat-total').textContent = stats.totalUnfollowed || 0;
  el('xuf-batch').value = settings.unfollowCount || 15;
  el('xuf-interval').value = settings.intervalMinutes || 15;
  el('xuf-queue-info').textContent = queue.length + ' users queued';

  const schedBtn = el('xuf-sched-toggle');
  const schedBadge = el('xuf-sched-text');
  if (isSchedulerOn) {
    schedBtn.textContent = 'Stop Scheduler';
    schedBtn.classList.add('xuf-btn-danger');
    schedBtn.classList.remove('xuf-btn-accent');
    schedBadge.textContent = 'Active';
    el('xuf-sched-badge').classList.add('active');
  } else {
    schedBtn.textContent = 'Start Scheduler';
    schedBtn.classList.remove('xuf-btn-danger');
    schedBtn.classList.add('xuf-btn-accent');
    schedBadge.textContent = 'Idle';
    el('xuf-sched-badge').classList.remove('active');
  }

  applyFilters();
  renderUserList();
}

function applyFilters() {
  filtered = users.filter(u => {
    if (filterNF && u.followsYou) return false;
    if (minScore > 0 && (u.wallchainScore === null || u.wallchainScore < minScore)) return false;
    if (settings.skipVerified && u.isVerified) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return u.username.toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q);
    }
    return true;
  });
  const el = document.getElementById('xuf-list-count');
  if (el) el.textContent = filtered.length + ' users';
}

function renderUserList() {
  const container = document.getElementById('xuf-user-list');
  if (!container) return;
  const qSet = new Set(queue.map(u => u.username));
  const toShow = filtered.slice(0, displayCount);

  container.innerHTML = toShow.map(u => {
    const inQ = qSet.has(u.username);
    const init = (u.displayName || u.username).charAt(0).toUpperCase();
    const avHTML = u.avatar ? `<img src="${u.avatar}" class="xuf-avatar-img">` : `<span class="xuf-avatar-letter">${init}</span>`;
    let scoreBadge = '';
    if (u.wallchainScore !== null) {
      const cls = u.wallchainScore >= 70 ? 'high' : u.wallchainScore >= 40 ? 'mid' : 'low';
      scoreBadge = `<span class="xuf-badge xuf-badge-${cls}">WC: ${u.wallchainScore}</span>`;
    }
    const nfBadge = !u.followsYou ? '<span class="xuf-badge xuf-badge-red">Not following</span>' : '<span class="xuf-badge xuf-badge-green">Follows you</span>';
    const verifiedMark = u.isVerified ? '<span class="xuf-verified">✓</span>' : '';

    return `<div class="xuf-user-card" data-u="${u.username}">
      <div class="xuf-user-avatar">${avHTML}<div class="xuf-follow-dot ${u.followsYou ? 'yes' : 'no'}"></div></div>
      <div class="xuf-user-info">
        <div class="xuf-user-name">${u.displayName || u.username} ${verifiedMark}</div>
        <div class="xuf-user-meta">@${u.username} ${scoreBadge} ${nfBadge}</div>
      </div>
      <div class="xuf-user-actions">
        <button class="xuf-btn-sm xuf-btn-queue ${inQ ? 'queued' : ''}" data-act="queue" data-u="${u.username}">${inQ ? '✓ Queued' : '+ Queue'}</button>
        <button class="xuf-btn-sm xuf-btn-unfollow" data-act="uf" data-u="${u.username}">Unfollow</button>
      </div>
    </div>`;
  }).join('');

  if (filtered.length > displayCount) {
    container.innerHTML += `<div class="xuf-load-more" id="xuf-load-sentinel">Loading more...</div>`;
    setupInfiniteScroll();
  }
}


// ============================================================
// INFINITE SCROLL
// ============================================================
function setupInfiniteScroll() {
  if (scrollObserver) scrollObserver.disconnect();
  const sentinel = document.getElementById('xuf-load-sentinel');
  if (!sentinel) return;
  scrollObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      displayCount += 50;
      renderUserList();
    }
  }, { root: document.getElementById('xuf-user-list'), threshold: 0.1 });
  scrollObserver.observe(sentinel);
}

// ============================================================
// MODAL EVENT BINDINGS
// ============================================================
function bindModalEvents() {
  const el = id => document.getElementById(id);

  // Close
  el('xuf-close').onclick = closeModal;
  el('xuf-overlay').onclick = e => { if (e.target.id === 'xuf-overlay') closeModal(); };
  document.addEventListener('keydown', handleEsc);

  // Scan
  el('xuf-scan-btn').onclick = scanUsers;

  // Filters
  el('xuf-filter-nf').onchange = function() { filterNF = this.checked; displayCount = 50; applyFilters(); renderUserList(); };
  el('xuf-filter-verified').onchange = function() { settings.skipVerified = this.checked; displayCount = 50; applyFilters(); renderUserList(); };
  el('xuf-score-slider').oninput = function() { minScore = +this.value; el('xuf-score-val').textContent = minScore; displayCount = 50; applyFilters(); renderUserList(); };
  el('xuf-search').oninput = function() { searchQ = this.value; displayCount = 50; applyFilters(); renderUserList(); };

  // Scheduler
  el('xuf-sched-toggle').onclick = async () => {
    try {
      if (isSchedulerOn) { await send({ type: 'STOP_SCHEDULER' }); isSchedulerOn = false; }
      else {
        settings.unfollowCount = +el('xuf-batch').value || 15;
        settings.intervalMinutes = +el('xuf-interval').value || 15;
        await send({ type: 'SAVE_SETTINGS', settings });
        await send({ type: 'START_SCHEDULER' }); isSchedulerOn = true;
      }
    } catch(e) {}
    renderModal();
  };

  // Queue
  el('xuf-queue-all').onclick = async () => {
    const toQ = filtered.filter(u => !u.followsYou);
    if (toQ.length) {
      try { await send({ type: 'ADD_TO_QUEUE', users: toQ }); const r = await send({ type: 'GET_QUEUE' }); queue = Array.isArray(r) ? r : []; } catch(e) {}
      renderModal();
    }
  };
  el('xuf-queue-clear').onclick = async () => {
    try { await send({ type: 'CLEAR_QUEUE' }); } catch(e) { await chrome.storage.local.set({ queue: [] }); }
    queue = []; renderModal();
  };

  // User list actions (delegation)
  el('xuf-user-list').onclick = async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act, uname = btn.dataset.u;
    const user = users.find(u => u.username === uname);
    if (!user) return;

    if (act === 'uf') {
      btn.disabled = true; btn.textContent = '...';
      try {
        const r = await send({ type: 'MANUAL_UNFOLLOW', user });
        if (r && r.success) {
          users = users.filter(u => u.username !== uname);
          try { stats = await send({ type: 'GET_STATS' }) || stats; } catch(e) {}
          displayCount = 50; renderModal();
        } else { btn.disabled = false; btn.textContent = 'Unfollow'; }
      } catch(e) { btn.disabled = false; btn.textContent = 'Unfollow'; }
    }

    if (act === 'queue') {
      const inQ = queue.some(u => u.username === uname);
      try {
        if (inQ) await send({ type: 'REMOVE_FROM_QUEUE', username: uname });
        else await send({ type: 'ADD_TO_QUEUE', users: [user] });
        const r = await send({ type: 'GET_QUEUE' }); queue = Array.isArray(r) ? r : [];
      } catch(e) {}
      renderModal();
    }
  };
}

function handleEsc(e) { if (e.key === 'Escape' && modalOpen) { closeModal(); document.removeEventListener('keydown', handleEsc); } }


// ============================================================
// SCAN USERS
// ============================================================
async function scanUsers() {
  if (scanning) return;
  scanning = true;
  const btn = document.getElementById('xuf-scan-btn');
  const hint = document.getElementById('xuf-scan-hint');
  btn.textContent = 'Scanning...'; btn.disabled = true;
  hint.textContent = '';

  const result = await fullScan((count) => {
    btn.textContent = `Scanning... (${count} found)`;
  });

  if (result.success) {
    users = result.users;
    displayCount = 50;
    btn.textContent = `Rescan (${users.length} loaded)`;
    hint.textContent = `${result.nonFollowers} non-followers found`;
  } else {
    btn.textContent = 'Load Following List';
    hint.textContent = result.reason || 'Scan failed';
  }
  btn.disabled = false;
  scanning = false;
  renderModal();
}

// ============================================================
// MESSAGE LISTENER (from background)
// ============================================================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_MODAL') {
    toggleModal();
    sendResponse({ success: true });
  }
  if (msg.type === 'EXECUTE_UNFOLLOW') {
    executeUnfollow(msg.user).then(sendResponse).catch(e => sendResponse({ success: false, reason: e.message }));
    return true;
  }
  if (msg.type === 'SCAN_FOLLOWING_LIST') {
    fullScan(() => {}).then(r => { users = r.users || []; sendResponse(r); }).catch(e => sendResponse({ success: false, reason: e.message }));
    return true;
  }
  if (msg.type === 'UNFOLLOW_PROGRESS' || msg.type === 'BATCH_COMPLETE') {
    send({ type: 'GET_STATS' }).then(r => { stats = r || stats; if (modalOpen) renderModal(); }).catch(() => {});
    send({ type: 'GET_QUEUE' }).then(r => { queue = Array.isArray(r) ? r : []; if (modalOpen) renderModal(); }).catch(() => {});
  }
});

// SPA navigation detection
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) { lastUrl = window.location.href; scannedUsers.clear(); isScanning = false; }
}).observe(document.body, { childList: true, subtree: true });

console.log('[X Unfollower Pro v2] Content script loaded');
})();
