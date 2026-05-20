# X Unfollower Pro v2

Premium floating dashboard Chrome Extension for X (Twitter).  
Injected directly into the X.com page as a centered modal overlay — no Chrome popup.

## Install (No build needed)

1. Download/clone this repo
2. Chrome → `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** → select this folder
5. Go to **x.com** → click the extension icon → modal opens!

## How It Works

- Click the extension icon on any X.com page
- A premium floating modal opens centered on screen
- Scan your following list, filter non-followers, unfollow with one click
- ESC or click outside to close

## Features

- Floating modal injected into X.com (not a Chrome popup)
- Glassmorphism dark premium UI
- Non-follower detection
- Wallchain score integration
- Smart filters (score, verified, search)
- One-click unfollow
- Auto scheduler with chrome.alarms
- Queue system with safety limits
- Infinite scroll user list
- Random delay safety engine

## Files

```
manifest.json   - Manifest V3 (no popup, icon click triggers modal)
background.js   - Service worker (icon click, scheduler, queue)
content.js      - Injected script (modal UI, scanner, unfollow engine)
modal.css       - Premium dark theme modal styles
icons/          - Extension icons
```

## Safety Defaults

| Setting | Default |
|---------|---------|
| Batch Size | 15 |
| Interval | 15 min |
| Daily Limit | 100 |
| Min Delay | 3s |
| Max Delay | 8s |
