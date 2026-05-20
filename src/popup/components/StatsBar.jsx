import React from 'react';
import { motion } from 'framer-motion';

export default function StatsBar({ stats, settings }) {
  const dailyProgress = (stats.todayUnfollowed / settings.maxDailyUnfollows) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-3 neon-border"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Daily Progress</span>
        <span className="text-[10px] text-primary-accent font-medium">
          {stats.todayUnfollowed}/{settings.maxDailyUnfollows}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-primary-bg rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(dailyProgress, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            dailyProgress >= 90 ? 'bg-red-500' :
            dailyProgress >= 60 ? 'bg-yellow-500' :
            'bg-gradient-to-r from-primary-accent to-primary-hover'
          }`}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatItem
          label="Today"
          value={stats.todayUnfollowed}
          icon="📊"
        />
        <StatItem
          label="Total"
          value={stats.totalUnfollowed}
          icon="🎯"
        />
        <StatItem
          label="Limit"
          value={settings.maxDailyUnfollows - stats.todayUnfollowed}
          icon="🛡️"
          sublabel="remaining"
        />
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, icon, sublabel }) {
  return (
    <div className="text-center">
      <div className="text-xs mb-0.5">{icon}</div>
      <div className="text-sm font-bold text-primary-text">{value}</div>
      <div className="text-[9px] text-gray-500">{sublabel || label}</div>
    </div>
  );
}
