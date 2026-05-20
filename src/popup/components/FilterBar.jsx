import React from 'react';
import { motion } from 'framer-motion';

export default function FilterBar({
  filterNonFollowers,
  setFilterNonFollowers,
  minScore,
  setMinScore,
  searchQuery,
  setSearchQuery,
  totalUsers,
  filteredCount,
  onAddAllToQueue
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-3 space-y-2.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">Filters</span>
        <span className="text-[10px] text-gray-500">
          Showing {filteredCount} of {totalUsers}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="premium-input w-full pl-8 py-1.5 text-xs"
        />
      </div>

      {/* Filter toggles */}
      <div className="flex items-center gap-2">
        {/* Non-followers toggle */}
        <button
          onClick={() => setFilterNonFollowers(!filterNonFollowers)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
            filterNonFollowers
              ? 'bg-primary-accent/20 text-primary-accent border border-primary-accent/30'
              : 'bg-primary-bg/40 text-gray-400 border border-white/5 hover:border-white/10'
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Non-Followers
        </button>

        {/* Add all to queue button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddAllToQueue}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-primary-accent/10 text-primary-accent border border-primary-accent/20 hover:bg-primary-accent/20 transition-all"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Queue All
        </motion.button>
      </div>

      {/* Score filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 whitespace-nowrap">Min Score:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={minScore}
          onChange={(e) => setMinScore(parseInt(e.target.value))}
          className="flex-1 h-1 bg-primary-bg rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-accent
                     [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(139,92,246,0.5)]"
        />
        <span className={`text-[11px] font-mono min-w-[28px] text-right ${
          minScore > 0 ? 'text-primary-accent' : 'text-gray-500'
        }`}>
          {minScore}
        </span>
      </div>
    </motion.div>
  );
}
