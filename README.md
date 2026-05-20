# X Unfollower Pro

Premium Chrome Extension for X (Twitter). Detect non-followers, filter by Wallchain score, automate safe unfollowing.

## Install (No build needed!)

1. Download ZIP from this repo
2. Extract the ZIP
3. Chrome → `chrome://extensions/`
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the extracted folder (where manifest.json is)

## Features

- Non-Follower Detection
- Wallchain Score Integration
- Smart Filters (score, follow status, search)
- One-Click Unfollow
- Auto Scheduler (chrome.alarms)
- Queue System with safety limits
- Random delay safety engine
- Premium dark UI

## Files

```
manifest.json   - Extension manifest (Manifest V3)
background.js   - Service worker (scheduler, queue, safety)
content.js      - DOM scraper (users, scores, unfollow)
popup.html      - Popup UI structure
popup.css       - Premium dark theme
popup.js        - Popup logic
icons/          - Extension icons (16, 48, 128px)
```
