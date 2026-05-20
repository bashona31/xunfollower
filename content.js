/**
 * X Unfollower Pro - Content Script
 * Handles: DOM scraping, Wallchain score reading, unfollow execution
 * Runs on: x.com / twitter.com
 */

(function() {
  'use strict';

  // ============================================================
  // DOM SCRAPING ENGINE
  // ============================================================
  const scannedUsers = new Map();
  let isScanning = false;

  function extractUserFromCell(cell) {
    try {
      const links = cell.querySelectorAll('a[role="link"]');
      let username = '';
      let profileUrl = '';

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && href.split('/').length === 2) {
          username = href.replace('/', '');
          profileUrl = 'https://x.com' + href;
          break;
        }
      }

      if (!username) return null;

      const nameEl = cell.querySelector('[data-testid="UserName"]');
      let displayName = username;
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

      const isVerified = cell.querySelector('[data-testid="icon-verified"]') !== null ||
                         cell.querySelector('[aria-label="Verified account"]') !== null;

      const text = cell.textContent || '';
      const followsYou = text.includes('Follows you') || text.includes('follows you');

      const wallchainScore = getWallchainScore(cell, username);

      return {
        username,
        displayName,
        profileUrl,
        avatar,
        isVerified,
        followsYou,
        wallchainScore,
        scannedAt: Date.now()
      };
    } catch (error) {
      console.error('[X Unfollower Pro] Error extracting user:', error);
      return null;
    }
  }

  function getWallchainScore(cell, username) {
    // Method 1: data attribute
    const scoreEl = cell.querySelector('[data-wallchain-score]');
    if (scoreEl) {
      const score = parseInt(scoreEl.getAttribute('data-wallchain-score'), 10);
      if (!isNaN(score)) return score;
    }

    // Method 2: class-based
    const wallchainEl = cell.querySelector('.wallchain-score');
    if (wallchainEl) {
      const match = wallchainEl.textContent.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Method 3: any wallchain class
    const allElements = cell.querySelectorAll('[class*="wallchain"], [class*="Wallchain"]');
    for (const el of allElements) {
      const match = el.textContent.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Method 4: global window object
    try {
      const globalScores = window.__wallchain_scores || window.wallchainData;
      if (globalScores && globalScores[username]) {
        return globalScores[username];
      }
    } catch (e) {}

    return null;
  }

  function scanVisibleUsers() {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    const users = [];

    cells.forEach(cell => {
      const user = extractUserFromCell(cell);
      if (user && !scannedUsers.has(user.username)) {
        scannedUsers.set(user.username, user);
        users.push(user);
      }
    });

    return users;
  }

  async function autoScroll() {
    return new Promise((resolve) => {
      const previousHeight = document.documentElement.scrollHeight;
      window.scrollBy(0, window.innerHeight * 0.8);
      setTimeout(() => {
        const newHeight = document.documentElement.scrollHeight;
        resolve(newHeight > previousHeight);
      }, 1500);
    });
  }

  async function fullScan(progressCallback) {
    if (isScanning) return { success: false, reason: 'Scan already in progress' };

    isScanning = true;
    scannedUsers.clear();

    let scrollAttempts = 0;
    const maxScrollAttempts = 50;
    let noNewUsersCount = 0;
    const maxNoNewUsers = 5;

    while (scrollAttempts < maxScrollAttempts && noNewUsersCount < maxNoNewUsers) {
      const prevSize = scannedUsers.size;
      scanVisibleUsers();

      if (progressCallback) {
        progressCallback({ scanned: scannedUsers.size, scrollAttempts });
      }

      if (scannedUsers.size === prevSize) {
        noNewUsersCount++;
      } else {
        noNewUsersCount = 0;
      }

      const hasMore = await autoScroll();
      if (!hasMore && noNewUsersCount >= 3) break;

      scrollAttempts++;

      // Random delay
      const delay = Math.floor(Math.random() * 700) + 800;
      await new Promise(r => setTimeout(r, delay));
    }

    isScanning = false;

    const users = Array.from(scannedUsers.values());
    return {
      success: true,
      users,
      total: users.length,
      nonFollowers: users.filter(u => !u.followsYou).length
    };
  }

  // ============================================================
  // UNFOLLOW ENGINE
  // ============================================================
  async function executeUnfollow(user) {
    try {
      // Try API method using existing session
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        return { success: false, reason: 'Not logged in or csrf token not found' };
      }

      // Get user ID
      const userId = await getUserId(user.username, csrfToken);
      if (!userId) {
        return { success: false, reason: 'Could not get user ID for ' + user.username };
      }

      // Call unfollow API
      const response = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
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

      if (response.ok) {
        return { success: true, username: user.username };
      } else {
        return { success: false, reason: 'API error: ' + response.status };
      }
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') return value;
    }
    return null;
  }

  async function getUserId(username, csrfToken) {
    try {
      const variables = JSON.stringify({ screen_name: username, withSafetyModeUserFields: true });
      const features = JSON.stringify({
        hidden_profile_subscriptions_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true
      });

      const url = 'https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables=' +
        encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);

      const response = await fetch(url, {
        headers: {
          'X-Csrf-Token': csrfToken,
          'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'X-Twitter-Auth-Type': 'OAuth2Session',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data?.data?.user?.result?.rest_id;
      }
    } catch (error) {
      console.error('[X Unfollower Pro] getUserId error:', error);
    }
    return null;
  }

  // ============================================================
  // MESSAGE LISTENER
  // ============================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch(err => {
      sendResponse({ success: false, reason: err.message });
    });
    return true;
  });

  async function handleMessage(message) {
    switch (message.type) {
      case 'SCAN_FOLLOWING_LIST':
        return await fullScan((progress) => {
          chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', ...progress }).catch(() => {});
        });

      case 'QUICK_SCAN':
        scanVisibleUsers();
        const users = Array.from(scannedUsers.values());
        return { success: true, users, total: users.length };

      case 'EXECUTE_UNFOLLOW':
        return await executeUnfollow(message.user);

      case 'CHECK_PAGE':
        const url = window.location.href;
        return {
          success: true,
          url,
          isFollowingPage: url.includes('/following'),
          isFollowersPage: url.includes('/followers'),
          isXPage: url.includes('x.com') || url.includes('twitter.com')
        };

      case 'PING':
        return { success: true, alive: true };

      default:
        return { success: false, reason: 'Unknown message type' };
    }
  }

  // ============================================================
  // URL CHANGE DETECTION (SPA)
  // ============================================================
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      scannedUsers.clear();
      isScanning = false;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[X Unfollower Pro] Content script loaded on:', window.location.href);
})();
