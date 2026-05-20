/**
 * X Unfollower Pro v2 - Background Service Worker
 * Handles: Icon click → toggle modal, scheduler, queue, storage
 */

const DEFAULTS = {
  settings: {
    unfollowCount: 15,
    intervalMinutes: 15,
    maxDailyUnfollows: 100,
    minDelay: 3000,
    maxDelay: 8000,
    skipVerified: false,
    autoMode: false
  },
  stats: {
    totalUnfollowed: 0,
    todayUnfollowed: 0,
    lastResetDate: new Date().toDateString(),
    sessionStarted: null
  }
};

const ALARM_NAME = 'xunfollower-scheduler';
let isProcessing = false;

// ============================================================
// ICON CLICK → TOGGLE MODAL
// ============================================================
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
    // Not on X - open X in new tab
    chrome.tabs.create({ url: 'https://x.com' });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MODAL' });
  } catch(e) {
    // Content script might not be injected yet, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['modal.css']
      });
      // Retry toggle
      setTimeout(async () => {
        try { await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MODAL' }); } catch(e2) {}
      }, 500);
    } catch(e2) {
      console.error('[X Unfollower Pro] Cannot inject:', e2);
    }
  }
});


// ============================================================
// STORAGE HELPERS
// ============================================================
async function getStorage(keys) { return chrome.storage.local.get(keys); }
async function setStorage(data) { return chrome.storage.local.set(data); }

async function getSettings() {
  const { settings } = await getStorage('settings');
  return settings || DEFAULTS.settings;
}

async function getStats() {
  const { stats } = await getStorage('stats');
  const s = stats || DEFAULTS.stats;
  const today = new Date().toDateString();
  if (s.lastResetDate !== today) {
    s.todayUnfollowed = 0;
    s.lastResetDate = today;
    await setStorage({ stats: s });
  }
  return s;
}

async function getQueue() {
  const { queue } = await getStorage('queue');
  return queue || [];
}

async function getWhitelist() {
  const { whitelist } = await getStorage('whitelist');
  return whitelist || [];
}

function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// QUEUE MANAGEMENT
// ============================================================
async function addToQueue(users) {
  const queue = await getQueue();
  const whitelist = await getWhitelist();
  const settings = await getSettings();
  const filtered = users.filter(user => {
    if (whitelist.includes(user.username)) return false;
    if (settings.skipVerified && user.isVerified) return false;
    if (queue.some(q => q.username === user.username)) return false;
    return true;
  });
  const newQueue = [...queue, ...filtered];
  await setStorage({ queue: newQueue });
  return newQueue.length;
}

async function removeFromQueue(username) {
  const queue = await getQueue();
  await setStorage({ queue: queue.filter(u => u.username !== username) });
}

// ============================================================
// UNFOLLOW EXECUTION (via content script)
// ============================================================
async function executeUnfollow(user) {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
    if (tabs.length === 0) return { success: false, reason: 'No X tab found' };
    const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'EXECUTE_UNFOLLOW', user });
    return response || { success: false, reason: 'No response' };
  } catch(e) {
    return { success: false, reason: e.message };
  }
}


// ============================================================
// BATCH PROCESSOR
// ============================================================
async function processBatch() {
  if (isProcessing) return { success: false, reason: 'Already processing' };
  const settings = await getSettings();
  const stats = await getStats();
  const queue = await getQueue();

  if (stats.todayUnfollowed >= settings.maxDailyUnfollows) {
    await stopScheduler();
    return { success: false, reason: 'Daily limit reached' };
  }

  const remaining = settings.maxDailyUnfollows - stats.todayUnfollowed;
  const batchSize = Math.min(settings.unfollowCount, remaining, queue.length);
  if (batchSize === 0) return { success: false, reason: 'No users in queue' };

  isProcessing = true;
  const batch = queue.slice(0, batchSize);
  const results = [];

  for (let i = 0; i < batch.length; i++) {
    const user = batch[i];
    await sleep(getRandomDelay(settings.minDelay, settings.maxDelay));
    const result = await executeUnfollow(user);
    results.push({ user: user.username, success: result.success });

    if (result.success) {
      stats.todayUnfollowed++;
      stats.totalUnfollowed++;
      const cur = await getQueue();
      await setStorage({ queue: cur.filter(u => u.username !== user.username) });
      const { history } = await getStorage('history');
      const h = [...(history || []), { username: user.username, displayName: user.displayName, unfollowedAt: Date.now() }];
      await setStorage({ history: h.slice(-500) });
    }

    broadcast({ type: 'UNFOLLOW_PROGRESS', current: i + 1, total: batch.length, user: user.username, success: result.success });
  }

  await setStorage({ stats });
  isProcessing = false;
  broadcast({ type: 'BATCH_COMPLETE', results });
  return { success: true, results };
}

// ============================================================
// SCHEDULER
// ============================================================
async function startScheduler() {
  const settings = await getSettings();
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 0.1, periodInMinutes: settings.intervalMinutes });
  await setStorage({ settings: { ...settings, autoMode: true } });
}

async function stopScheduler() {
  chrome.alarms.clear(ALARM_NAME);
  const settings = await getSettings();
  await setStorage({ settings: { ...settings, autoMode: false } });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) await processBatch();
});

// ============================================================
// BROADCAST TO CONTENT SCRIPTS
// ============================================================
function broadcast(msg) {
  chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] }, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  });
}

// ============================================================
// MESSAGE HANDLER
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_SETTINGS': return await getSettings();
      case 'SAVE_SETTINGS': await setStorage({ settings: { ...(await getSettings()), ...message.settings } }); return { success: true };
      case 'GET_STATS': return await getStats();
      case 'GET_QUEUE': return await getQueue();
      case 'ADD_TO_QUEUE': const qs = await addToQueue(message.users); return { success: true, queueSize: qs };
      case 'REMOVE_FROM_QUEUE': await removeFromQueue(message.username); return { success: true };
      case 'CLEAR_QUEUE': await setStorage({ queue: [] }); return { success: true };
      case 'START_SCHEDULER': await startScheduler(); return { success: true };
      case 'STOP_SCHEDULER': await stopScheduler(); return { success: true };
      case 'MANUAL_UNFOLLOW':
        const r = await executeUnfollow(message.user);
        if (r.success) { const s = await getStats(); s.todayUnfollowed++; s.totalUnfollowed++; await setStorage({ stats: s }); await removeFromQueue(message.user.username); }
        return r;
      case 'PROCESS_BATCH': return await processBatch();
      case 'GET_PROCESSING_STATUS': return { isProcessing };
      default: return { success: false, reason: 'Unknown' };
    }
  })().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
  return true;
});

// ============================================================
// INSTALL HANDLER
// ============================================================
chrome.runtime.onInstalled.addListener(async () => {
  await setStorage({ settings: DEFAULTS.settings, stats: DEFAULTS.stats, queue: [], whitelist: [], history: [] });
});
