import React from 'react';
import { motion } from 'framer-motion';

export default function SchedulerPanel({ isRunning, onToggle, settings, onSettingsChange, queueSize }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card p-3 neon-border"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
            isRunning ? 'bg-green-500/20' : 'bg-gray-500/20'
          }`}>
            <svg className={`w-3.5 h-3.5 ${isRunning ? 'text-green-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-medium text-primary-text">Auto Scheduler</span>
            <p className="text-[9px] text-gray-500">{queueSize} users in queue</p>
          </div>
        </div>

        {/* Toggle switch */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
            isRunning ? 'bg-primary-accent shadow-[0_0_10px_rgba(139,92,246,0.4)]' : 'bg-gray-700'
          }`}
        >
          <motion.div
            animate={{ x: isRunning ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
          />
        </motion.button>
      </div>

      {/* Scheduler settings */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
            Unfollow Count
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={settings.unfollowCount}
            onChange={(e) => onSettingsChange({ unfollowCount: parseInt(e.target.value) || 10 })}
            className="premium-input w-full text-xs py-1.5"
          />
        </div>
        <div>
          <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">
            Every (min)
          </label>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.intervalMinutes}
            onChange={(e) => onSettingsChange({ intervalMinutes: parseInt(e.target.value) || 15 })}
            className="premium-input w-full text-xs py-1.5"
          />
        </div>
      </div>

      {/* Status message */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 pt-2 border-t border-white/5"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-green-400"
            />
            <span className="text-[10px] text-green-400">
              Running: {settings.unfollowCount} users every {settings.intervalMinutes} min
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
