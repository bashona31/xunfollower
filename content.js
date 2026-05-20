/**
 * X Unfollower Pro - Content Script
 * DOM scraping, Wallchain score, unfollow execution
 */
(function() {
  'use strict';

  const scannedUsers = new Map();
  let isScanning = false;

  function extractUserFromCell(cell) {
    try {
      const links = cell.querySelectorAll('a[role="link"]');
      let username = '';
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && href.split('/').length === 2) {
          username = href.replace('/', '');
          break;
        }
      }
      if (!username) return null;

      let displayName = username;
      const nameEl = cell.querySelector('[data-testid="UserName"]');
      if (nameEl) {
        const spans = nameEl.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent && !span.textContent.startsWith('@') && span.textContent.trim()) {
            displayName = span.textContent.trim();
            break;
          }
        }
      }

      const avatarImg = cell.querySelector('img[src*="profile_images"]');
      const avatar = avatarImg ? avatarImg.src : '';
      const isVerified = !!(cell.querySelector('[data-testid="icon-verified"]') || cell.querySelector('[aria-label="Verified account"]'));
      const followsYou = (cell.textContent || '').includes('Follows you');
      const wallchainScore = getWallchainScore(cell, username);

      return { username, displayName, avatar, isVerified, followsYou, wallchainScore, scannedAt: Date.now() };
    } catch (e) {
      return null;
    }
  }

  function getWallchainScore(cell, username) {
    const scoreEl = cell.querySelector('[data-wallchain-score]');
    if (scoreEl) { const s = parseInt(scoreEl.getAttribute('data-wallchain-score'), 10); if (!isNaN(s)) return s; }
    const wcEl = cell.querySelector('.wallchain-score');
    if (wcEl) { const m = wcEl.textContent.match(/(\d+)/); if (m) return parseInt(m[1], 10); }
    const allWc = cell.querySelectorAll('[class*="wallchain"], [class*="Wallchain"]');
    for (const el of allWc) { const m = el.textContent.match(/(\d+)/); if (m) return parseInt(m[1], 10); }
    try { const g = window.__wallchain_scores || window.wallchainData; if (g && g[username]) return g[username]; } catch(e) {}
    return null;
  }

  function scanVisibleUsers() {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    cells.forEach(cell => {
      const user = extractUserFromCell(cell);
      if (user && !scannedUsers.has(user.username)) scannedUsers.set(user.username, user);
    });
  }

  async function autoScroll() {
    return new Promise(resolve => {
      const prev = document.documentElement.scrollHeight;
      window.scrollBy(0, window.innerHeight * 0.8);
      setTimeout(() => resolve(document.documentElement.scrollHeight > prev), 1500);
    });
  }

  async function fullScan() {
    if (isScanning) return { success: false, reason: 'Already scanning' };
    isScanning = true;
    scannedUsers.clear();
    let noNew = 0;
    for (let i = 0; i < 50 && noNew < 5; i++) {
      const prev = scannedUsers.size;
      scanVisibleUsers();
      chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', scanned: scannedUsers.size }).catch(() => {});
      if (scannedUsers.size === prev) noNew++; else noNew = 0;
      const hasMore = await autoScroll();
      if (!hasMore && noNew >= 3) break;
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    }
    isScanning = false;
    const users = Array.from(scannedUsers.values());
    return { success: true, users, total: users.length, nonFollowers: users.filter(u => !u.followsYou).length };
  }

  async function executeUnfollow(user) {
    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) return { success: false, reason: 'Not logged in' };
      const userId = await getUserId(user.username, csrfToken);
      if (!userId) return { success: false, reason: 'Could not get user ID' };

      const resp = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Csrf-Token': csrfToken,
          'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'X-Twitter-Auth-Type': 'OAuth2Session',
          'X-Twitter-Active-User': 'yes'
        },
        credentials: 'include',
        body: 'user_id=' + userId
      });
      return resp.ok ? { success: true, username: user.username } : { success: false, reason: 'API error ' + resp.status };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (const c of cookies) { const [n, v] = c.trim().split('='); if (n === 'ct0') return v; }
    return null;
  }

  async function getUserId(username, csrfToken) {
    try {
      const variables = JSON.stringify({ screen_name: username, withSafetyModeUserFields: true });
      const features = JSON.stringify({ hidden_profile_subscriptions_enabled: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true });
      const url = 'https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables=' + encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);
      const resp = await fetch(url, { headers: { 'X-Csrf-Token': csrfToken, 'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'X-Twitter-Auth-Type': 'OAuth2Session', 'Content-Type': 'application/json' }, credentials: 'include' });
      if (resp.ok) { const d = await resp.json(); return d?.data?.user?.result?.rest_id; }
    } catch (e) {}
    return null;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      switch (message.type) {
        case 'SCAN_FOLLOWING_LIST': return await fullScan();
        case 'EXECUTE_UNFOLLOW': return await executeUnfollow(message.user);
        case 'PING': return { success: true };
        default: return { success: false, reason: 'Unknown' };
      }
    })().then(sendResponse).catch(e => sendResponse({ success: false, reason: e.message }));
    return true;
  });

  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) { lastUrl = window.location.href; scannedUsers.clear(); isScanning = false; }
  }).observe(document.body, { childList: true, subtree: true });
})();
