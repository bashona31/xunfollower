import { useState, useEffect, useCallback } from 'react';

/**
 * Send message to background script
 */
export function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Hook: Settings management
 */
export function useSettings() {
  const [settings, setSettings] = useState({
    unfollowCount: 15,
    intervalMinutes: 15,
    maxDailyUnfollows: 100,
    minDelay: 3000,
    maxDelay: 8000,
    skipVerified: false,
    autoMode: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await sendMessage({ type: 'GET_SETTINGS' });
      if (result) setSettings(result);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  const saveSettings = async (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await sendMessage({ type: 'SAVE_SETTINGS', settings: updated });
  };

  return { settings, saveSettings, loading };
}

/**
 * Hook: Stats management
 */
export function useStats() {
  const [stats, setStats] = useState({
    totalUnfollowed: 0,
    todayUnfollowed: 0,
    lastResetDate: '',
    sessionStarted: null
  });

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const result = await sendMessage({ type: 'GET_STATS' });
      if (result) setStats(result);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  return { stats, refreshStats: loadStats };
}

/**
 * Hook: Queue management
 */
export function useQueue() {
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
    checkProcessing();
    const interval = setInterval(() => {
      loadQueue();
      checkProcessing();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const result = await sendMessage({ type: 'GET_QUEUE' });
      if (Array.isArray(result)) setQueue(result);
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  };

  const checkProcessing = async () => {
    try {
      const result = await sendMessage({ type: 'GET_PROCESSING_STATUS' });
      if (result) setIsProcessing(result.isProcessing);
    } catch (err) {}
  };

  const addToQueue = async (users) => {
    const result = await sendMessage({ type: 'ADD_TO_QUEUE', users });
    await loadQueue();
    return result;
  };

  const removeFromQueue = async (username) => {
    await sendMessage({ type: 'REMOVE_FROM_QUEUE', username });
    await loadQueue();
  };

  const clearQueue = async () => {
    await sendMessage({ type: 'CLEAR_QUEUE' });
    setQueue([]);
  };

  return { queue, isProcessing, addToQueue, removeFromQueue, clearQueue, refreshQueue: loadQueue };
}

/**
 * Hook: Users management (scanned users)
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for scan progress messages
    const listener = (message) => {
      if (message.type === 'SCAN_PROGRESS') {
        setScanProgress(message);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const scanUsers = async () => {
    setScanning(true);
    setError(null);
    setScanProgress(null);

    try {
      const result = await sendMessage({ type: 'SCAN_USERS' });
      if (result.success) {
        setUsers(result.users);
      } else {
        setError(result.reason || 'Scan failed. Make sure you are on your X following page.');
      }
    } catch (err) {
      setError(err.message || 'Failed to scan. Ensure X tab is open.');
    }

    setScanning(false);
    setScanProgress(null);
  };

  return { users, setUsers, scanning, scanProgress, error, scanUsers };
}

/**
 * Hook: Scheduler control
 */
export function useScheduler() {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    checkScheduler();
  }, []);

  const checkScheduler = async () => {
    try {
      const settings = await sendMessage({ type: 'GET_SETTINGS' });
      setIsRunning(settings?.autoMode || false);
    } catch (err) {}
  };

  const startScheduler = async () => {
    await sendMessage({ type: 'START_SCHEDULER' });
    setIsRunning(true);
  };

  const stopScheduler = async () => {
    await sendMessage({ type: 'STOP_SCHEDULER' });
    setIsRunning(false);
  };

  const toggleScheduler = async () => {
    if (isRunning) {
      await stopScheduler();
    } else {
      await startScheduler();
    }
  };

  return { isRunning, startScheduler, stopScheduler, toggleScheduler };
}
