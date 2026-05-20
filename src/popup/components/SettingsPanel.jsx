import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [local, setLocal] = useState({ ...settings });

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const updateField = (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-3">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        <h2 className="text-sm font-bold gradient-text">Settings</h2>
      </div>

      {/* Safety Settings */}
      <div className="glass-card p-3 space-y-3">
        <h3 className="text-[11px] font-medium text-primary-accent uppercase tracking-wider">
          Safety Limits
        </h3>

        <SettingRow label="Max Daily Unfollows" sublabel="Hard limit per day">
          <input
            type="number"
            min="10"
            max="500"
            value={local.maxDailyUnfollows}
            onChange={(e) => updateField('maxDailyUnfollows', parseInt(e.target.value) || 100)}
            className="premium-input w-20 text-xs text-right"
          />
        </SettingRow>

        <SettingRow label="Min Delay (ms)" sublabel="Minimum wait between actions">
          <input
            type="number"
            min="1000"
            max="30000"
            step="500"
            value={local.minDelay}
            onChange={(e) => updateField('minDelay', parseInt(e.target.value) || 3000)}
            className="premium-input w-20 text-xs text-right"
          />
        </SettingRow>

        <SettingRow label="Max Delay (ms)" sublabel="Maximum wait between actions">
          <input
            type="number"
            min="2000"
            max="60000"
            step="500"
            value={local.maxDelay}
            onChange={(e) => updateField('maxDelay', parseInt(e.target.value) || 8000)}
            className="premium-input w-20 text-xs text-right"
          />
        </SettingRow>
      </div>

      {/* Behavior Settings */}
      <div className="glass-card p-3 space-y-3">
        <h3 className="text-[11px] font-medium text-primary-accent uppercase tracking-wider">
          Behavior
        </h3>

        <SettingRow label="Skip Verified Users" sublabel="Don't unfollow verified accounts">
          <ToggleSwitch
            enabled={local.skipVerified}
            onChange={(val) => updateField('skipVerified', val)}
          />
        </SettingRow>
      </div>

      {/* Scheduler Settings */}
      <div className="glass-card p-3 space-y-3">
        <h3 className="text-[11px] font-medium text-primary-accent uppercase tracking-wider">
          Scheduler
        </h3>

        <SettingRow label="Batch Size" sublabel="Users per batch">
          <input
            type="number"
            min="1"
            max="50"
            value={local.unfollowCount}
            onChange={(e) => updateField('unfollowCount', parseInt(e.target.value) || 15)}
            className="premium-input w-20 text-xs text-right"
          />
        </SettingRow>

        <SettingRow label="Interval (minutes)" sublabel="Time between batches">
          <input
            type="number"
            min="5"
            max="120"
            value={local.intervalMinutes}
            onChange={(e) => updateField('intervalMinutes', parseInt(e.target.value) || 15)}
            className="premium-input w-20 text-xs text-right"
          />
        </SettingRow>
      </div>

      {/* Save button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-accent to-purple-600 text-white text-sm font-medium shadow-lg shadow-primary-accent/20"
      >
        Save Settings
      </motion.button>

      {/* Recommended note */}
      <p className="text-[9px] text-gray-500 text-center px-4">
        Recommended: 10-20 unfollows every 15 minutes, max 100/day for safe operation
      </p>
    </div>
  );
}

function SettingRow({ label, sublabel, children }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs text-primary-text">{label}</span>
        {sublabel && <p className="text-[9px] text-gray-500">{sublabel}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onChange(!enabled)}
      className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
        enabled ? 'bg-primary-accent shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 'bg-gray-700'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 17 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </motion.button>
  );
}
