import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import FilterBar from './components/FilterBar';
import UserList from './components/UserList';
import SchedulerPanel from './components/SchedulerPanel';
import QueueStatus from './components/QueueStatus';
import LoadButton from './components/LoadButton';
import SettingsPanel from './components/SettingsPanel';
import { useSettings, useStats, useQueue, useUsers, useScheduler, sendMessage } from './hooks/useChrome';

export default function App() {
  const { settings, saveSettings, loading } = useSettings();
  const { stats, refreshStats } = useStats();
  const { queue, isProcessing, addToQueue, removeFromQueue, clearQueue } = useQueue();
  const { users, setUsers, scanning, scanProgress, error, scanUsers } = useUsers();
  const { isRunning, toggleScheduler } = useScheduler();

  const [showSettings, setShowSettings] = useState(false);
  const [filterNonFollowers, setFilterNonFollowers] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen for background messages
  useEffect(() => {
    const listener = (message) => {
      if (message.type === 'UNFOLLOW_PROGRESS' || message.type === 'BATCH_COMPLETE') {
        refreshStats();
      }
      if (message.type === 'SCHEDULER_STARTED') {
        // Scheduler state updated
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    if (filterNonFollowers && user.followsYou) return false;
    if (minScore > 0 && (user.wallchainScore === null || user.wallchainScore < minScore)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return user.username.toLowerCase().includes(q) || user.displayName.toLowerCase().includes(q);
    }
    return true;
  });

  // Handle manual unfollow
  const handleUnfollow = async (user) => {
    const result = await sendMessage({ type: 'MANUAL_UNFOLLOW', user });
    if (result.success) {
      setUsers(prev => prev.filter(u => u.username !== user.username));
      refreshStats();
    }
    return result;
  };

  // Add filtered users to queue
  const handleAddAllToQueue = async () => {
    const nonFollowers = filteredUsers.filter(u => !u.followsYou);
    if (nonFollowers.length > 0) {
      await addToQueue(nonFollowers);
    }
  };

  if (loading) {
    return (
      <div className="w-[420px] h-[600px] bg-primary-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="w-[420px] h-[600px] bg-primary-bg flex flex-col overflow-hidden relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header
        onSettingsClick={() => setShowSettings(!showSettings)}
        isRunning={isRunning}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 relative z-10">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsPanel
                settings={settings}
                onSave={saveSettings}
                onClose={() => setShowSettings(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Stats */}
              <StatsBar stats={stats} settings={settings} />

              {/* Queue Status */}
              {queue.length > 0 && (
                <QueueStatus
                  queue={queue}
                  isProcessing={isProcessing}
                  onClear={clearQueue}
                />
              )}

              {/* Scheduler Panel */}
              <SchedulerPanel
                isRunning={isRunning}
                onToggle={toggleScheduler}
                settings={settings}
                onSettingsChange={saveSettings}
                queueSize={queue.length}
              />

              {/* Load / Scan Button */}
              <LoadButton
                onScan={scanUsers}
                scanning={scanning}
                scanProgress={scanProgress}
                userCount={users.length}
                error={error}
              />

              {/* Filters */}
              {users.length > 0 && (
                <FilterBar
                  filterNonFollowers={filterNonFollowers}
                  setFilterNonFollowers={setFilterNonFollowers}
                  minScore={minScore}
                  setMinScore={setMinScore}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  totalUsers={users.length}
                  filteredCount={filteredUsers.length}
                  onAddAllToQueue={handleAddAllToQueue}
                />
              )}

              {/* User List */}
              {filteredUsers.length > 0 && (
                <UserList
                  users={filteredUsers}
                  onUnfollow={handleUnfollow}
                  onAddToQueue={(user) => addToQueue([user])}
                  onRemoveFromQueue={removeFromQueue}
                  queue={queue}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
