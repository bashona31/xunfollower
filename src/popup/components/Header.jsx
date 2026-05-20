import React from 'react';
import { motion } from 'framer-motion';

export default function Header({ onSettingsClick, isRunning }) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="px-4 py-3 flex items-center justify-between border-b border-white/5 relative z-10"
    >
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="relative">
          <motion.div
            animate={isRunning ? { rotate: [0, 360] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-accent to-purple-600 flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </motion.div>
          {isRunning && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-primary-bg"
            />
          )}
        </div>

        <div>
          <h1 className="text-sm font-bold gradient-text">X Unfollower Pro</h1>
          <p className="text-[10px] text-gray-500">Premium Unfollow Manager</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status indicator */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
          isRunning
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          {isRunning ? 'Active' : 'Idle'}
        </div>

        {/* Settings button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSettingsClick}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </motion.button>
      </div>
    </motion.header>
  );
}
