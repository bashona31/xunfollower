import React from 'react';
import { motion } from 'framer-motion';

export default function LoadButton({ onScan, scanning, scanProgress, userCount, error }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <motion.button
        whileHover={{ scale: scanning ? 1 : 1.01 }}
        whileTap={{ scale: scanning ? 1 : 0.99 }}
        onClick={onScan}
        disabled={scanning}
        className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-300 relative overflow-hidden ${
          scanning
            ? 'bg-primary-accent/10 text-primary-accent border border-primary-accent/20 cursor-wait'
            : 'bg-gradient-to-r from-primary-accent to-purple-600 text-white shadow-lg shadow-primary-accent/20 hover:shadow-primary-accent/40'
        }`}
      >
        {/* Shimmer effect */}
        {!scanning && (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          />
        )}

        <span className="relative z-10 flex items-center justify-center gap-2">
          {scanning ? (
            <>
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </motion.svg>
              {scanProgress
                ? `Scanning... (${scanProgress.scanned} found)`
                : 'Scanning following list...'
              }
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {userCount > 0 ? `Rescan Users (${userCount} loaded)` : 'Load Following List'}
            </>
          )}
        </span>
      </motion.button>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-[10px] text-red-400 text-center px-2"
        >
          {error}
        </motion.p>
      )}

      {/* Hint */}
      {!scanning && userCount === 0 && !error && (
        <p className="mt-1.5 text-[9px] text-gray-500 text-center">
          Open your X following page first, then click to scan
        </p>
      )}
    </motion.div>
  );
}
