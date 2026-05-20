/**
 * X Unfollower Pro - Popup Script
 * Premium UI controller (no build step required)
 */

(function() {
  'use strict';

  // ============================================================
  // STATE
  // ============================================================
  let users = [];
  let filteredUsers = [];
  let settings = {};
  let stats = {};
  let queue = [];
  let filterNonFollowers = false;
  let minScore = 0;
  let searchQuery = '';
  let isSchedulerRunning = false;
  let isScanning = false;

  // ============================================================
  // CHROME MESSAGING
  // ============================================================
  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    await loadSettings();
    await loadStats();
    await loadQueue();
    setupListeners();
    setupMessageListener();
    updateUI();
  }

  async function loadSettings() {
    try {
      settings = await sendMessage({ type: 'GET_SETTINGS' }) || {
        unfollowCount: 15,
        intervalMinutes: 15,
        maxDailyUnfollows: 100,
        minDelay: 3000,
        maxDelay: 8000,
        skipVerified: false,
        autoMode: false
      };
      isSchedulerRunning = settings.autoMode || false;
    } catch (e) {
      console.error('Load settings error:', e);
    }
  }

  async function loadStats() {
    try {
      stats = await sendMessage({ type: 'GET_STATS' }) || {
        totalUnfollowed: 0, todayUnfollowed: 0
      };
    } catch (e) {}
  }

  async function loadQueue() {
    try {
      const result = await sendMessage({ type: 'GET_QUEUE' });
      queue = Array.isArray(result) ? result : [];
    } catch (e) {
      queue = [];
    }
  }

  // ============================================================
  // UI UPDATE
  // ============================================================
  function updateUI() {
    updateStats();
    updateScheduler();
    updateQueue();
    updateFilters();
    updateUserList();
  }

  function updateStats() {
    const today = stats.todayUnfollowed || 0;
    const max = settings.maxDailyUnfollows || 100;
    const progress = (today / max) * 100;

    document.getElementById('statsProgress').textContent = `${today}/${max}`;
    document.getElementById('statToday').textContent = today;
    document.getElementById('statTotal').textContent = stats.totalUnfollowed || 0;
    document.getElementById('statRemaining').textContent = max - today;

    const fill = document.getElementById('progressFill');
    fill.style.width = `${Math.min(progress, 100)}%`;
    fill.className = 'progress-fill' +
      (progress >= 90 ? ' danger' : progress >= 60 ? ' warning' : '');
  }

  function updateScheduler() {
    const toggle = document.getElementById('schedulerToggle');
    const icon = document.getElementById('schedulerIcon');
    const status = document.getElementById('schedulerStatus');
    const statusText = document.getElementById('schedulerStatusText');
    const subtitle = document.getElementById('schedulerSubtitle');
    const badge = document.getElementById('statusBadge');
    const logoDot = document.getElementById('statusDot');
    const logoIcon = document.getElementById('logoIcon');

    document.getElementById('unfollowCount').value = settings.unfollowCount || 15;
    document.getElementById('intervalMinutes').value = settings.intervalMinutes || 15;

    subtitle.textContent = `${queue.length} users in queue`;

    if (isSchedulerRunning) {
      toggle.classList.add('active');
      icon.classList.add('active');
      status.classList.remove('hidden');
      statusText.textContent = `Running: ${settings.unfollowCount} users every ${settings.intervalMinutes} min`;
      badge.classList.add('active');
      badge.querySelector('span').textContent = 'Active';
      logoDot.classList.add('active');
      logoIcon.classList.add('spinning');
    } else {
      toggle.classList.remove('active');
      icon.classList.remove('active');
      status.classList.add('hidden');
      badge.classList.remove('active');
      badge.querySelector('span').textContent = 'Idle';
      logoDot.classList.remove('active');
      logoIcon.classList.remove('spinning');
    }
  }

  function updateQueue() {
    const card = document.getElementById('queueCard');
    const text = document.getElementById('queueText');

    if (queue.length > 0) {
      card.classList.remove('hidden');
      text.textContent = `Queue: ${queue.length} users`;
    } else {
      card.classList.add('hidden');
    }
  }

  function updateFilters() {
    const card = document.getElementById('filterCard');
    const count = document.getElementById('filterCount');

    if (users.length > 0) {
      card.classList.remove('hidden');
      applyFilters();
      count.textContent = `Showing ${filteredUsers.length} of ${users.length}`;
    } else {
      card.classList.add('hidden');
    }
  }

  function applyFilters() {
    filteredUsers = users.filter(user => {
      if (filterNonFollowers && user.followsYou) return false;
      if (minScore > 0 && (user.wallchainScore === null || user.wallchainScore < minScore)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return user.username.toLowerCase().includes(q) ||
               (user.displayName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }

  function updateUserList() {
    const listEl = document.getElementById('userList');
    const container = document.getElementById('userListContainer');
    const title = document.getElementById('userListTitle');

    if (filteredUsers.length === 0) {
      listEl.classList.add('hidden');
      return;
    }

    listEl.classList.remove('hidden');
    title.textContent = `Users (${filteredUsers.length})`;

    const queueUsernames = new Set(queue.map(u => u.username));

    container.innerHTML = filteredUsers.slice(0, 100).map(user => {
      const isInQueue = queueUsernames.has(user.username);
      const initial = (user.displayName || user.username).charAt(0).toUpperCase();
      const avatarContent = user.avatar
        ? `<img src="${user.avatar}" alt="">`
        : initial;

      let scoreBadge = '';
      if (user.wallchainScore !== null) {
        const cls = user.wallchainScore >= 70 ? 'badge-score-high' :
                    user.wallchainScore >= 40 ? 'badge-score-mid' : 'badge-score-low';
        scoreBadge = `<span class="user-badge ${cls}">WC: ${user.wallchainScore}</span>`;
      }

      const followBadge = !user.followsYou
        ? '<span class="user-badge badge-not-following">Not following</span>' : '';

      const verifiedIcon = user.isVerified
        ? '<svg class="verified-badge" fill="#1D9BF0" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>'
        : '';

      return `
        <div class="user-card" data-username="${user.username}">
          <div class="user-avatar">
            <div class="user-avatar-img">${avatarContent}</div>
            <div class="follow-dot ${user.followsYou ? 'follows' : 'not-follows'}"></div>
          </div>
          <div class="user-info">
            <div class="user-name-row">
              <span class="user-displayname">${user.displayName || user.username}</span>
              ${verifiedIcon}
            </div>
            <div class="user-meta">
              <span class="user-handle">@${user.username}</span>
              ${scoreBadge}
              ${followBadge}
            </div>
          </div>
          <div class="user-actions">
            <button class="queue-btn ${isInQueue ? 'queued' : ''}" data-action="queue" data-username="${user.username}" title="${isInQueue ? 'Remove from queue' : 'Add to queue'}">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                ${isInQueue
                  ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>'
                  : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>'
                }
              </svg>
            </button>
            <button class="unfollow-btn" data-action="unfollow" data-username="${user.username}">Unfollow</button>
          </div>
        </div>
      `;
    }).join('');

    if (filteredUsers.length > 100) {
      container.innerHTML += `<div style="text-align:center;padding:8px;font-size:10px;color:var(--text-muted)">Showing first 100 of ${filteredUsers.length} users</div>`;
    }
  }

  // ============================================================
  // EVENT LISTENERS
  // ============================================================
  function setupListeners() {
    // Settings toggle
    document.getElementById('settingsBtn').addEventListener('click', () => {
      document.getElementById('settingsPanel').classList.remove('hidden');
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      document.getElementById('settingsPanel').classList.add('hidden');
    });

    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
      settings.maxDailyUnfollows = parseInt(document.getElementById('maxDaily').value) || 100;
      settings.minDelay = parseInt(document.getElementById('minDelay').value) || 3000;
      settings.maxDelay = parseInt(document.getElementById('maxDelay').value) || 8000;
      await sendMessage({ type: 'SAVE_SETTINGS', settings });
      document.getElementById('settingsPanel').classList.add('hidden');
      updateUI();
    });

    // Skip verified toggle
    document.getElementById('skipVerifiedToggle').addEventListener('click', function() {
      this.classList.toggle('active');
      settings.skipVerified = this.classList.contains('active');
    });

    // Scheduler toggle
    document.getElementById('schedulerToggle').addEventListener('click', async () => {
      if (isSchedulerRunning) {
        await sendMessage({ type: 'STOP_SCHEDULER' });
        isSchedulerRunning = false;
      } else {
        // Save scheduler settings first
        settings.unfollowCount = parseInt(document.getElementById('unfollowCount').value) || 15;
        settings.intervalMinutes = parseInt(document.getElementById('intervalMinutes').value) || 15;
        await sendMessage({ type: 'SAVE_SETTINGS', settings });
        await sendMessage({ type: 'START_SCHEDULER' });
        isSchedulerRunning = true;
      }
      updateScheduler();
    });

    // Scheduler input changes
    document.getElementById('unfollowCount').addEventListener('change', async (e) => {
      settings.unfollowCount = parseInt(e.target.value) || 15;
      await sendMessage({ type: 'SAVE_SETTINGS', settings });
    });

    document.getElementById('intervalMinutes').addEventListener('change', async (e) => {
      settings.intervalMinutes = parseInt(e.target.value) || 15;
      await sendMessage({ type: 'SAVE_SETTINGS', settings });
    });

    // Load button
    document.getElementById('loadBtn').addEventListener('click', scanUsers);

    // Clear queue
    document.getElementById('clearQueueBtn').addEventListener('click', async () => {
      await sendMessage({ type: 'CLEAR_QUEUE' });
      queue = [];
      updateQueue();
      updateUserList();
    });

    // Non-followers filter
    document.getElementById('nonFollowersBtn').addEventListener('click', function() {
      filterNonFollowers = !filterNonFollowers;
      this.classList.toggle('active', filterNonFollowers);
      updateFilters();
      updateUserList();
    });

    // Queue all
    document.getElementById('queueAllBtn').addEventListener('click', async () => {
      const toQueue = filteredUsers.filter(u => !u.followsYou);
      if (toQueue.length > 0) {
        await sendMessage({ type: 'ADD_TO_QUEUE', users: toQueue });
        await loadQueue();
        updateQueue();
        updateUserList();
        updateScheduler();
      }
    });

    // Score slider
    document.getElementById('scoreSlider').addEventListener('input', function() {
      minScore = parseInt(this.value);
      const val = document.getElementById('scoreValue');
      val.textContent = minScore;
      val.className = 'score-value' + (minScore > 0 ? ' active' : '');
      updateFilters();
      updateUserList();
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', function() {
      searchQuery = this.value;
      updateFilters();
      updateUserList();
    });

    // User list clicks (delegation)
    document.getElementById('userListContainer').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const username = btn.dataset.username;
      const user = users.find(u => u.username === username);
      if (!user) return;

      if (action === 'unfollow') {
        btn.disabled = true;
        btn.textContent = '...';
        const result = await sendMessage({ type: 'MANUAL_UNFOLLOW', user });
        if (result && result.success) {
          users = users.filter(u => u.username !== username);
          await loadStats();
          updateStats();
          updateFilters();
          updateUserList();
        } else {
          btn.disabled = false;
          btn.textContent = 'Unfollow';
        }
      }

      if (action === 'queue') {
        const isInQueue = queue.some(u => u.username === username);
        if (isInQueue) {
          await sendMessage({ type: 'REMOVE_FROM_QUEUE', username });
        } else {
          await sendMessage({ type: 'ADD_TO_QUEUE', users: [user] });
        }
        await loadQueue();
        updateQueue();
        updateUserList();
        updateScheduler();
      }
    });
  }

  // ============================================================
  // SCAN USERS
  // ============================================================
  async function scanUsers() {
    if (isScanning) return;
    isScanning = true;

    const btn = document.getElementById('loadBtn');
    const hint = document.getElementById('loadHint');
    const errorEl = document.getElementById('loadError');

    btn.classList.add('scanning');
    btn.querySelector('.load-btn-content').innerHTML = `
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Scanning following list...
    `;
    hint.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
      const result = await sendMessage({ type: 'SCAN_USERS' });
      if (result && result.success) {
        users = result.users || [];
        btn.querySelector('.load-btn-content').innerHTML = `
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Rescan Users (${users.length} loaded)
        `;
        updateFilters();
        updateUserList();
      } else {
        errorEl.textContent = result?.reason || 'Scan failed. Make sure you are on your X following page.';
        errorEl.classList.remove('hidden');
        btn.querySelector('.load-btn-content').innerHTML = `
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Load Following List
        `;
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to scan. Ensure X tab is open.';
      errorEl.classList.remove('hidden');
      btn.querySelector('.load-btn-content').innerHTML = `
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Load Following List
      `;
    }

    btn.classList.remove('scanning');
    isScanning = false;
  }

  // ============================================================
  // BACKGROUND MESSAGE LISTENER
  // ============================================================
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'UNFOLLOW_PROGRESS' || message.type === 'BATCH_COMPLETE') {
        loadStats().then(updateStats);
        loadQueue().then(() => { updateQueue(); updateUserList(); });
      }
      if (message.type === 'SCAN_PROGRESS') {
        const btn = document.getElementById('loadBtn');
        btn.querySelector('.load-btn-content').innerHTML = `
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Scanning... (${message.scanned} found)
        `;
      }
    });
  }

  // ============================================================
  // SETTINGS PANEL INIT
  // ============================================================
  function initSettingsPanel() {
    document.getElementById('maxDaily').value = settings.maxDailyUnfollows || 100;
    document.getElementById('minDelay').value = settings.minDelay || 3000;
    document.getElementById('maxDelay').value = settings.maxDelay || 8000;
    if (settings.skipVerified) {
      document.getElementById('skipVerifiedToggle').classList.add('active');
    }
  }

  // Start
  document.addEventListener('DOMContentLoaded', () => {
    init().then(initSettingsPanel);
  });
})();
