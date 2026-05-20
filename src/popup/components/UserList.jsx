import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserCard from './UserCard';

export default function UserList({ users, onUnfollow, onAddToQueue, onRemoveFromQueue, queue }) {
  const queueUsernames = new Set(queue.map(u => u.username));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          Users ({users.length})
        </span>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        <AnimatePresence>
          {users.slice(0, 100).map((user, index) => (
            <motion.div
              key={user.username}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10, height: 0 }}
              transition={{ delay: index * 0.02, duration: 0.2 }}
            >
              <UserCard
                user={user}
                onUnfollow={onUnfollow}
                onAddToQueue={onAddToQueue}
                onRemoveFromQueue={onRemoveFromQueue}
                isInQueue={queueUsernames.has(user.username)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {users.length > 100 && (
          <div className="text-center py-2 text-[10px] text-gray-500">
            Showing first 100 of {users.length} users
          </div>
        )}
      </div>
    </motion.div>
  );
}
