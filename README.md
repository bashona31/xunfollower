# X Unfollower Pro 🚀

A premium Chrome Extension for X (Twitter) that helps you detect non-followers, filter users by Wallchain score, and automate safe unfollowing.

## Features

- **Non-Follower Detection** — Instantly see who doesn't follow you back
- **Wallchain Score Integration** — Read scores directly from DOM (requires Wallchain extension)
- **Smart Filters** — Filter by follow status, minimum score, and search
- **One-Click Unfollow** — Unfollow directly from the popup
- **Auto Scheduler** — Configure batch unfollows with chrome.alarms API
- **Queue System** — Queue-based processing with progress tracking
- **Safety Engine** — Random delays, daily limits, human-like behavior
- **Premium UI** — Glassmorphism, Framer Motion animations, dark theme
- **CSV Export** — Export user data and unfollow history
- **Skip Verified** — Option to protect verified accounts

## Tech Stack

- **React 18** — Popup UI
- **TailwindCSS 3** — Styling with custom premium theme
- **Framer Motion** — Smooth animations
- **Manifest V3** — Modern Chrome extension architecture
- **Chrome Storage API** — Persistent settings and data
- **chrome.alarms** — Background scheduling

## Project Structure

```
xunfollower/
├── manifest.json              # Chrome Extension Manifest V3
├── webpack.config.js          # Build configuration
├── tailwind.config.js         # Custom theme (premium colors)
├── postcss.config.js          # PostCSS with Tailwind
├── package.json               # Dependencies
├── .babelrc                   # React/JSX transpilation
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── background/
    │   └── index.js           # Service worker (scheduler, queue, safety)
    ├── content/
    │   └── index.js           # DOM scraper (users, scores, unfollow)
    └── popup/
        ├── index.jsx          # React entry point
        ├── App.jsx            # Main application
        ├── popup.html         # HTML template
        ├── styles.css         # Tailwind + custom styles
        ├── hooks/
        │   └── useChrome.js   # Chrome API hooks
        ├── utils/
        │   └── exportCSV.js   # CSV export utility
        └── components/
            ├── Header.jsx         # Logo, status, settings toggle
            ├── StatsBar.jsx       # Daily progress & counters
            ├── FilterBar.jsx      # Non-follower/score/search filters
            ├── UserList.jsx       # Animated user list
            ├── UserCard.jsx       # User card with actions
            ├── SchedulerPanel.jsx # Auto-mode controls
            ├── QueueStatus.jsx    # Queue progress indicator
            ├── LoadButton.jsx     # Scan trigger button
            └── SettingsPanel.jsx  # Full settings page
```

## Installation & Build

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd xunfollower

# Install dependencies
npm install

# Build for production
npm run build

# Development mode (watch)
npm run dev
```

### Load in Chrome

1. Run `npm run build` to generate the `dist/` folder
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. The extension icon appears in your toolbar

## Usage

### Quick Start

1. **Navigate to X** — Go to `x.com/[username]/following`
2. **Open Extension** — Click the X Unfollower Pro icon
3. **Load Users** — Click "Load Following List" to scan
4. **Filter** — Toggle "Non-Followers" to see who doesn't follow back
5. **Unfollow** — Click individual unfollow buttons, or queue all

### Auto Scheduler

1. Add users to the queue (click "Queue All" or individual + buttons)
2. Configure batch size and interval in the scheduler panel
3. Toggle the scheduler ON
4. The extension unfollows automatically in the background

### Safety Defaults

| Setting | Default | Recommended |
|---------|---------|-------------|
| Batch Size | 15 | 10-20 |
| Interval | 15 min | 15-30 min |
| Daily Limit | 100 | 50-100 |
| Min Delay | 3000ms | 3000-5000ms |
| Max Delay | 8000ms | 8000-15000ms |

## Architecture

### Message Flow

```
[Popup UI] ←→ [Background Service Worker] ←→ [Content Script]
     ↕                    ↕                         ↕
Chrome Storage      chrome.alarms              X.com DOM
```

### Safety System

- **Random Delays** — Each action has randomized timing (3-8s default)
- **Daily Limit** — Hard cap resets at midnight
- **Batch Processing** — Never floods API
- **Queue Management** — Orderly processing with status tracking
- **Whitelist** — Protect specific users from auto-unfollow

## Premium Design

### Color Palette

| Element | Color |
|---------|-------|
| Background | `#0B1120` |
| Cards | `#111827` |
| Accent | `#8B5CF6` |
| Hover | `#A78BFA` |
| Text | `#F3F4F6` |

### Effects

- Glassmorphism (backdrop-blur, semi-transparent cards)
- Neon glow borders
- Gradient text
- Framer Motion page transitions
- Animated progress indicators
- Shimmer button effects

## Icons

Placeholder icons are included. Replace with custom 16x16, 48x48, and 128x128 PNG icons.
Open `icons/generate-icons.html` in a browser to generate proper icons visually.

## License

MIT
