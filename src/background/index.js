/**
 * X Unfollower Pro - Background Service Worker
 * Handles: Alarm scheduler, Queue management, Safety system, Chrome Storage
 */

// ============================================================
// CONSTANTS & DEFAULTS
// ============================================================
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
  },
  queue: [],
  whitelist: [],
  history: []
};

const ALARM_NAME = 'xunfollower-scheduler';
const DAILY_RESET_ALARM = 'xunfollower-daily-reset';

// ============================================================
// STORAGE HELPERS
// ============================================================
async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(data) {
  return chrome.storage.local.set(data);
}

async function getSettings() {
  const { settings } = await getStorage('settings');
  return settings || DEFAULTS.settings;
}

async function getStats() {
  const { stats } = await getStorage('stats');
  const currentStats = stats || DEFAULTS.stats;

  // Reset daily counter if new day
  const today = new Date().toDateString();
  if (currentStats.lastResetDate !== today) {
    currentStats.todayUnfollowed = 0;
    currentStats.lastResetDate = today;
    await setStorage({ stats: currentStats });
  }

  return currentStats;
}

async function getQueue() {
  const { queue } = await getStorage('queue');
  return queue || [];
}

async function getWhitelist() {
  const { whitelist } = await getStorage('whitelist');
  return whitelist || [];
}

// ============================================================
// RANDOM DELAY SYSTEM (Human-like behavior)
// ============================================================
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// QUEUE MANAGER
// ============================================================
class QueueManager {
  constructor() {
    this.isProcessing = false;
    this.currentBatch = [];
  }

  async addToQueue(users) {
    const queue = await getQueue();
    const whitelist = await getWhitelist();
    const settings = await getSettings();

    const filtered = users.filter(user => {
      // Skip whitelisted users
      if (whitelist.includes(user.username)) return false;
      // Skip verified if setting enabled
      if (settings.skipVerified && user.isVerified) return false;
      // Skip already in queue
      if (queue.some(q => q.username === user.username)) return false;
      return true;
    });

    const newQueue = [...queue, ...filtered];
    await setStorage({ queue: newQueue });
    return newQueue.length;
  }

  async removeFromQueue(username) {
    const queue = await getQueue();
    const newQueue = queue.filter(u => u.username !== username);
    await setStorage({ queue: newQueue });
    return newQueue;
  }

  async clearQueue() {
    await setStorage({ queue: [] });
  }

  async processBatch() {
    if (this.isProcessing) return { success: false, reason: 'Already processing' };

    const settings = await getSettings();
    const stats = await getStats();
    const queue = await getQueue();

    // Safety: Check daily limit
    if (stats.todayUnfollowed >= settings.maxDailyUnfollows) {
      await stopScheduler();
      return { success: false, reason: 'Daily limit reached' };
    }

    // Calculate how many we can unfollow this batch
    const remaining = settings.maxDailyUnfollows - stats.todayUnfollowed;
    const batchSize = Math.min(settings.unfollowCount, remaining, queue.length);

    if (batchSize === 0) {
      return { success: false, reason: 'No users in queue' };
    }

    this.isProcessing = true;
    this.currentBatch = queue.slice(0, batchSize);
    const results = [];

    for (let i = 0; i < this.currentBatch.length; i++) {
      const user = this.currentBatch[i];

      // Random delay between actions
      const delay = getRandomDelay(settings.minDelay, settings.maxDelay);
      await sleep(delay);

      // Send unfollow command to content script
      const result = await executeUnfollow(user);
      results.push({ user: user.username, success: result.success });

      if (result.success) {
        // Update stats
        stats.todayUnfollowed++;
        stats.totalUnfollowed++;

        // Remove from queue
        const currentQueue = await getQueue();
        const updatedQueue = currentQueue.filter(u => u.username !== user.username);
        await setStorage({ queue: updatedQueue });

        // Add to history
        const { history } = await getStorage('history');
        const updatedHistory = [...(history || []), {
          username: user.username,
          displayName: user.displayName,
          unfollowedAt: Date.now(),
          wallchainScore: user.wallchainScore
        }];
        // Keep last 500 history items
        await setStorage({ history: updatedHistory.slice(-500) });
      }

      // Broadcast progress
      broadcastMessage({
        type: 'UNFOLLOW_PROGRESS',
        current: i + 1,
        total: this.currentBatch.length,
        user: user.username,
        success: result.success
      });
    }

    // Save updated stats
    await setStorage({ stats });
    this.isProcessing = false;
    this.currentBatch = [];

    broadcastMessage({ type: 'BATCH_COMPLETE', results });
    return { success: true, results };
  }
}

const queueManager = new QueueManager();

// ============================================================
// UNFOLLOW EXECUTION
// ============================================================
async function executeUnfollow(user) {
  try {
    // Get active X tab
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });

    if (tabs.length === 0) {
      return { success: false, reason: 'No X tab found' };
    }

    const tab = tabs[0];

    // Send unfollow command to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_UNFOLLOW',
      user: user
    });

    return response || { success: false, reason: 'No response from content script' };
  } catch (error) {
    console.error('Unfollow error:', error);
    return { success: false, reason: error.message };
  }
}

// ============================================================
// SCHEDULER (chrome.alarms)
// ============================================================
async function startScheduler() {
  const settings = await getSettings();

  // Create recurring alarm
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 0.1, // Start almost immediately
    periodInMinutes: settings.intervalMinutes
  });

  await setStorage({
    settings: { ...settings, autoMode: true },
    stats: { ...(await getStats()), sessionStarted: Date.now() }
  });

  broadcastMessage({ type: 'SCHEDULER_STARTED' });
  console.log(`[X Unfollower Pro] Scheduler started: ${settings.unfollowCount} users every ${settings.intervalMinutes} minutes`);
}

async function stopScheduler() {
  chrome.alarms.clear(ALARM_NAME);

  const settings = await getSettings();
  await setStorage({ settings: { ...settings, autoMode: false } });

  broadcastMessage({ type: 'SCHEDULER_STOPPED' });
  console.log('[X Unfollower Pro] Scheduler stopped');
}

// ============================================================
// ALARM HANDLER
// ============================================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[X Unfollower Pro] Alarm triggered - processing batch');
    await queueManager.processBatch();
  }

  if (alarm.name === DAILY_RESET_ALARM) {
    const stats = await getStats();
    stats.todayUnfollowed = 0;
    stats.lastResetDate = new Date().toDateString();
    await setStorage({ stats });
    console.log('[X Unfollower Pro] Daily stats reset');
  }
});

// Set up daily reset alarm
chrome.alarms.create(DAILY_RESET_ALARM, {
  periodInMinutes: 1440 // 24 hours
});

// ============================================================
// MESSAGE HANDLER
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('Message handler error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_SETTINGS':
      return await getSettings();

    case 'SAVE_SETTINGS':
      await setStorage({ settings: { ...(await getSettings()), ...message.settings } });
      return { success: true };

    case 'GET_STATS':
      return await getStats();

    case 'GET_QUEUE':
      return await getQueue();

    case 'ADD_TO_QUEUE':
      const queueSize = await queueManager.addToQueue(message.users);
      return { success: true, queueSize };

    case 'REMOVE_FROM_QUEUE':
      await queueManager.removeFromQueue(message.username);
      return { success: true };

    case 'CLEAR_QUEUE':
      await queueManager.clearQueue();
      return { success: true };

    case 'START_SCHEDULER':
      await startScheduler();
      return { success: true };

    case 'STOP_SCHEDULER':
      await stopScheduler();
      return { success: true };

    case 'MANUAL_UNFOLLOW':
      const result = await executeUnfollow(message.user);
      if (result.success) {
        const stats = await getStats();
        stats.todayUnfollowed++;
        stats.totalUnfollowed++;
        await setStorage({ stats });
        await queueManager.removeFromQueue(message.user.username);
      }
      return result;

    case 'PROCESS_BATCH':
      return await queueManager.processBatch();

    case 'GET_HISTORY':
      const { history } = await getStorage('history');
      return history || [];

    case 'ADD_WHITELIST':
      const whitelist = await getWhitelist();
      if (!whitelist.includes(message.username)) {
        whitelist.push(message.username);
        await setStorage({ whitelist });
      }
      return { success: true };

    case 'REMOVE_WHITELIST':
      const wl = await getWhitelist();
      await setStorage({ whitelist: wl.filter(u => u !== message.username) });
      return { success: true };

    case 'GET_WHITELIST':
      return await getWhitelist();

    case 'EXPORT_CSV':
      const { history: exportHistory } = await getStorage('history');
      return exportHistory || [];

    case 'SCAN_USERS':
      return await scanUsersFromTab();

    case 'GET_PROCESSING_STATUS':
      return {
        isProcessing: queueManager.isProcessing,
        currentBatch: queueManager.currentBatch
      };

    default:
      return { success: false, reason: 'Unknown message type' };
  }
}

// ============================================================
// SCAN USERS FROM ACTIVE TAB
// ============================================================
async function scanUsersFromTab() {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'], active: true });

    if (tabs.length === 0) {
      return { success: false, reason: 'No active X tab found. Please open x.com' };
    }

    const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_FOLLOWING_LIST' });
    return response || { success: false, reason: 'No response from content script' };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

// ============================================================
// BROADCAST HELPER
// ============================================================
function broadcastMessage(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might be closed - ignore error
  });
}

// ============================================================
// INSTALL HANDLER
// ============================================================
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await setStorage({
      settings: DEFAULTS.settings,
      stats: DEFAULTS.stats,
      queue: [],
      whitelist: [],
      history: []
    });
    console.log('[X Unfollower Pro] Extension installed - defaults set');
  }
});

console.log('[X Unfollower Pro] Background service worker loaded');
