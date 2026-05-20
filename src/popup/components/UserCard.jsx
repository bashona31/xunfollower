import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function UserCard({ user, onUnfollow, onAddToQueue, onRemoveFromQueue, isInQueue }) {
  const [unfollowing, setUnfollowing] = useState(false);
  const [unfollowed, setUnfollowed] = useState(false);

  const handleUnfollow = async () => {
    setUnfollowing(true);
    const result = await onUnfollow(user);
    if (result?.success) {
      setUnfollowed(true);
    }
    setUnfollowing(false);
  };

  if (unfollowed) return null;

  return (
    <div className="glass-card p-2.5 flex items-center gap-2.5 group hover:border-primary-accent/20 transition-all duration-200">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-accent/30 to-purple-600/30 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary-accent">
              {user.displayName?.charAt(0) || '?'}
            </div>
          )}
        </div>
        {/* Follow status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary-card ${
          user.followsYou ? 'bg-green-400' : 'bg-red-400'
        }`} />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-primary-text truncate">
            {user.displayName}
          </span>
          {user.isVerified && (
            <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 truncate">@{user.username}</span>
          {user.wallchainScore !== null && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              user.wallchainScore >= 70 ? 'bg-green-500/10 text-green-400' :
              user.wallchainScore >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              WC: {user.wallchainScore}
            </span>
          )}
          {!user.followsYou && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
              Not following
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Queue toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => isInQueue ? onRemoveFromQueue(user.username) : onAddToQueue(user)}
          className={`p-1.5 rounded-md transition-all text-[10px] ${
            isInQueue
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'bg-white/5 text-gray-400 hover:text-primary-accent hover:bg-primary-accent/10'
          }`}
          title={isInQueue ? 'Remove from queue' : 'Add to queue'}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isInQueue ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            )}
          </svg>
        </motion.button>

        {/* Unfollow button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUnfollow}
          disabled={unfollowing}
          className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
            unfollowing
              ? 'bg-gray-500/20 text-gray-400 cursor-wait'
              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40'
          }`}
        >
          {unfollowing ? (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ...
            </motion.span>
          ) : 'Unfollow'}
        </motion.button>
      </div>
    </div>
  );
}
