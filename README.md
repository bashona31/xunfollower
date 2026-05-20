# X Unfollower Pro

Premium Chrome Extension for X (Twitter) - Detect non-followers, filter by Wallchain score, and automate safe unfollowing.

## Features

- Non-Follower Detection
- Wallchain Score Integration (reads from DOM)
- Smart Filters (score, follow status, search)
- One-Click Unfollow
- Auto Scheduler (chrome.alarms)
- Queue System with safety limits
- Random delay safety engine
- Premium dark glassmorphism UI
- Skip Verified option
- CSV Export ready

## Installation (No Build Required)

1. Download/clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `xunfollower` folder (the one containing `manifest.json`)
6. Done! The extension icon will appear in your toolbar

## Usage

1. Go to `x.com/YourUsername/following`
2. Click the X Unfollower Pro extension icon
3. Click **Load Following List** to scan users
4. Use filters to find non-followers
5. Click **Unfollow** on individual users, or **Queue All** + enable scheduler

## Project Structure

```
xunfollower/
├── manifest.json    # Chrome Extension Manifest V3
├── background.js    # Service worker (scheduler, queue, safety)
├── content.js       # DOM scraper (users, scores, unfollow)
├── popup.html       # Popup UI
├── popup.css        # Premium dark theme styles
├── popup.js         # Popup logic (no framework needed)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Safety Defaults

| Setting | Default |
|---------|---------|
| Batch Size | 15 |
| Interval | 15 min |
| Daily Limit | 100 |
| Min Delay | 3000ms |
| Max Delay | 8000ms |

## License

MIT
