import React from 'react';
import { motion } from 'framer-motion';

export default function QueueStatus({ queue, isProcessing, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
            isProcessing ? 'bg-yellow-500/20' : 'bg-primary-accent/20'
          }`}>
            {isProcessing ? (
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </motion.svg>
            ) : (
              <svg className="w-3 h-3 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            )}
          </div>
          <div>
            <span className="text-[11px] font-medium text-primary-text">
              Queue: {queue.length} users
            </span>
            {isProcessing && (
              <span className="text-[9px] text-yellow-400 ml-2">Processing...</span>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClear}
          className="text-[10px] text-gray-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
        >
          Clear
        </motion.button>
      </div>

      {/* Progress bar when processing */}
      {isProcessing && (
        <div className="mt-2 w-full h-1 bg-primary-bg rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1/3 h-full bg-gradient-to-r from-transparent via-primary-accent to-transparent rounded-full"
          />
        </div>
      )}
    </motion.div>
  );
}
