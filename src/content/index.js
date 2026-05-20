/**
 * X Unfollower Pro - Content Script
 * Handles: DOM scraping, Wallchain score reading, unfollow execution
 * Runs on: x.com / twitter.com
 */

// ============================================================
// SELECTORS (X/Twitter DOM structure)
// ============================================================
const SELECTORS = {
  // User cells in following/followers lists
  userCell: '[data-testid="UserCell"]',
  userCellLink: '[data-testid="UserCell"] a[role="link"]',
  userName: '[data-testid="UserCell"] [dir="ltr"] span',
  displayName: '[data-testid="UserCell"] [data-testid="UserName"]',

  // Follow state indicators
  followingButton: '[data-testid="placementTracking"] [role="button"]',
  unfollowButton: '[data-testid="confirmationSheetConfirm"]',

  // User profile elements
  profileFollowButton: '[data-testid$="-unfollow"]',
  profileFollowingIndicator: '[data-testid$="-follow"]',

  // Verified badge
  verifiedBadge: 'svg[data-testid="icon-verified"]',

  // Timeline/list scroll container
  scrollContainer: '[data-testid="primaryColumn"]',

  // Wallchain score (custom attribute from Wallchain extension)
  wallchainScore: '[data-wallchain-score]',
  wallchainScoreAlt: '.wallchain-score',
  wallchainScoreAttr: 'data-wallchain-score'
};

// ============================================================
// DOM SCRAPING ENGINE
// ============================================================
class DOMScraper {
  constructor() {
    this.scannedUsers = new Map();
    this.isScanning = false;
    this.scrollAttempts = 0;
    this.maxScrollAttempts = 50;
  }

  /**
   * Extract user data from a UserCell element
   */
  extractUserFromCell(cell) {
    try {
      // Get username (@handle)
      const links = cell.querySelectorAll('a[role="link"]');
      let username = '';
      let profileUrl = '';

      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && href.split('/').length === 2) {
          username = href.replace('/', '');
          profileUrl = `https://x.com${href}`;
          break;
        }
      }

      if (!username) return null;

      // Get display name
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

      // Get avatar
      const avatarImg = cell.querySelector('img[src*="profile_images"]');
      const avatar = avatarImg ? avatarImg.src : '';

      // Check verified status
      const isVerified = cell.querySelector(SELECTORS.verifiedBadge) !== null ||
                         cell.querySelector('[aria-label="Verified account"]') !== null;

      // Get follow status (does this user follow you back?)
      const followsYou = this.checkFollowsBack(cell);

      // Get Wallchain score
      const wallchainScore = this.getWallchainScore(cell, username);

      // Get bio
      const bioEl = cell.querySelector('[data-testid="UserCell"] > div > div:last-child');
      const bio = bioEl ? bioEl.textContent?.trim().substring(0, 100) : '';

      return {
        username,
        displayName,
        profileUrl,
        avatar,
        isVerified,
        followsYou,
        wallchainScore,
        bio,
        scannedAt: Date.now()
      };
    } catch (error) {
      console.error('[X Unfollower Pro] Error extracting user:', error);
      return null;
    }
  }

  /**
   * Check if user follows back (looks for "Follows you" indicator)
   */
  checkFollowsBack(cell) {
    const text = cell.textContent || '';
    return text.includes('Follows you') || text.includes('follows you');
  }

  /**
   * Read Wallchain score from DOM
   * The Wallchain extension injects score data into the page
   */
  getWallchainScore(cell, username) {
    // Method 1: Check data attribute on the cell
    const scoreEl = cell.querySelector(SELECTORS.wallchainScore);
    if (scoreEl) {
      const score = parseInt(scoreEl.getAttribute(SELECTORS.wallchainScoreAttr), 10);
      if (!isNaN(score)) return score;
    }

    // Method 2: Check for Wallchain class-based injection
    const wallchainEl = cell.querySelector(SELECTORS.wallchainScoreAlt);
    if (wallchainEl) {
      const text = wallchainEl.textContent;
      const match = text.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Method 3: Check any element with wallchain in class name
    const allElements = cell.querySelectorAll('[class*="wallchain"], [class*="Wallchain"]');
    for (const el of allElements) {
      const text = el.textContent;
      const match = text.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Method 4: Look for wallchain data in global window object
    try {
      const globalScores = window.__wallchain_scores || window.wallchainData;
      if (globalScores && globalScores[username]) {
        return globalScores[username];
      }
    } catch (e) {
      // Security restrictions
    }

    // Method 5: Check for score tooltip or hover elements
    const tooltips = cell.querySelectorAll('[title*="score"], [aria-label*="score"]');
    for (const tooltip of tooltips) {
      const text = tooltip.getAttribute('title') || tooltip.getAttribute('aria-label');
      const match = text.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    return null; // Score not available
  }

  /**
   * Scan all visible user cells on the page
   */
  scanVisibleUsers() {
    const cells = document.querySelectorAll(SELECTORS.userCell);
    const users = [];

    cells.forEach(cell => {
      const user = this.extractUserFromCell(cell);
      if (user && !this.scannedUsers.has(user.username)) {
        this.scannedUsers.set(user.username, user);
        users.push(user);
      }
    });

    return users;
  }

  /**
   * Auto-scroll to load more users
   */
  async autoScroll() {
    return new Promise((resolve) => {
      const scrollContainer = document.querySelector(SELECTORS.scrollContainer) || document.documentElement;

      const previousHeight = scrollContainer.scrollHeight;
      window.scrollBy(0, window.innerHeight * 0.8);

      // Wait for new content to load
      setTimeout(() => {
        const newHeight = scrollContainer.scrollHeight;
        const hasMore = newHeight > previousHeight;
        resolve(hasMore);
      }, 1500);
    });
  }

  /**
   * Full scan: scroll through entire following list
   */
  async fullScan(progressCallback) {
    if (this.isScanning) {
      return { success: false, reason: 'Scan already in progress' };
    }

    this.isScanning = true;
    this.scannedUsers.clear();
    this.scrollAttempts = 0;

    let noNewUsersCount = 0;
    const maxNoNewUsers = 5;

    while (this.scrollAttempts < this.maxScrollAttempts && noNewUsersCount < maxNoNewUsers) {
      const prevSize = this.scannedUsers.size;

      // Scan visible users
      this.scanVisibleUsers();

      // Report progress
      if (progressCallback) {
        progressCallback({
          scanned: this.scannedUsers.size,
          scrollAttempts: this.scrollAttempts
        });
      }

      // Check if we found new users
      if (this.scannedUsers.size === prevSize) {
        noNewUsersCount++;
      } else {
        noNewUsersCount = 0;
      }

      // Scroll for more
      const hasMore = await this.autoScroll();
      if (!hasMore && noNewUsersCount >= 3) break;

      this.scrollAttempts++;

      // Random delay to appear natural
      await this.randomSleep(800, 1500);
    }

    this.isScanning = false;

    const users = Array.from(this.scannedUsers.values());
    return {
      success: true,
      users,
      total: users.length,
      nonFollowers: users.filter(u => !u.followsYou).length
    };
  }

  /**
   * Quick scan: just grab visible users without scrolling
   */
  quickScan() {
    this.scanVisibleUsers();
    const users = Array.from(this.scannedUsers.values());
    return {
      success: true,
      users,
      total: users.length,
      nonFollowers: users.filter(u => !u.followsYou).length
    };
  }

  randomSleep(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ============================================================
// UNFOLLOW ENGINE
// ============================================================
class UnfollowEngine {
  /**
   * Execute unfollow for a specific user
   * Uses DOM interaction to trigger the native X unfollow flow
   */
  async executeUnfollow(user) {
    try {
      // Find the user cell
      const cells = document.querySelectorAll(SELECTORS.userCell);
      let targetCell = null;

      for (const cell of cells) {
        const links = cell.querySelectorAll('a[role="link"]');
        for (const link of links) {
          if (link.getAttribute('href') === `/${user.username}`) {
            targetCell = cell;
            break;
          }
        }
        if (targetCell) break;
      }

      if (!targetCell) {
        // Try navigating to user's profile approach
        return await this.unfollowViaProfile(user.username);
      }

      // Find the Following/Unfollow button in the cell
      const followBtn = targetCell.querySelector('[role="button"][data-testid$="-unfollow"]') ||
                        targetCell.querySelector('[role="button"]');

      if (!followBtn) {
        return { success: false, reason: 'Unfollow button not found' };
      }

      // Click the Following button to open confirmation
      followBtn.click();

      // Wait for confirmation dialog
      await this.sleep(500);

      // Click confirm unfollow
      const confirmBtn = document.querySelector(SELECTORS.unfollowButton) ||
                         document.querySelector('[data-testid="confirmationSheetConfirm"]');

      if (confirmBtn) {
        confirmBtn.click();
        await this.sleep(300);
        return { success: true, username: user.username };
      }

      return { success: false, reason: 'Confirmation button not found' };
    } catch (error) {
      console.error('[X Unfollower Pro] Unfollow error:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Alternative: Unfollow via X API using existing session cookies
   */
  async unfollowViaAPI(username) {
    try {
      // Get user ID first
      const userId = await this.getUserId(username);
      if (!userId) return { success: false, reason: 'Could not get user ID' };

      // Get auth tokens from cookies/meta tags
      const csrfToken = this.getCsrfToken();
      const authToken = this.getAuthToken();

      if (!csrfToken) {
        return { success: false, reason: 'Auth token not found - ensure you are logged in' };
      }

      // Call X API to unfollow
      const response = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Csrf-Token': csrfToken,
          'Authorization': authToken || 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'X-Twitter-Auth-Type': 'OAuth2Session',
          'X-Twitter-Active-User': 'yes'
        },
        credentials: 'include',
        body: `user_id=${userId}`
      });

      if (response.ok) {
        return { success: true, username };
      } else {
        const error = await response.text();
        return { success: false, reason: `API error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  /**
   * Get CSRF token from cookies or meta tag
   */
  getCsrfToken() {
    // Try cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') return value;
    }

    // Try meta tag
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');

    return null;
  }

  /**
   * Get auth bearer token
   */
  getAuthToken() {
    // X uses a fixed bearer token for client-side API calls
    return 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  }

  /**
   * Get user ID from username via X API
   */
  async getUserId(username) {
    try {
      const csrfToken = this.getCsrfToken();
      const variables = JSON.stringify({
        screen_name: username,
        withSafetyModeUserFields: true
      });
      const features = JSON.stringify({
        hidden_profile_subscriptions_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true
      });

      const url = `https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;

      const response = await fetch(url, {
        headers: {
          'X-Csrf-Token': csrfToken,
          'Authorization': this.getAuthToken(),
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

  /**
   * Unfollow via profile page DOM interaction
   */
  async unfollowViaProfile(username) {
    // Fallback: use API method
    return await this.unfollowViaAPI(username);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// INITIALIZE
// ============================================================
const scraper = new DOMScraper();
const unfollowEngine = new UnfollowEngine();

// ============================================================
// MESSAGE LISTENER (from background/popup)
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleContentMessage(message).then(sendResponse).catch(err => {
    sendResponse({ success: false, reason: err.message });
  });
  return true; // Keep channel open for async
});

async function handleContentMessage(message) {
  switch (message.type) {
    case 'SCAN_FOLLOWING_LIST':
      // Full scan with scrolling
      const fullResult = await scraper.fullScan((progress) => {
        chrome.runtime.sendMessage({
          type: 'SCAN_PROGRESS',
          ...progress
        }).catch(() => {});
      });
      return fullResult;

    case 'QUICK_SCAN':
      return scraper.quickScan();

    case 'EXECUTE_UNFOLLOW':
      return await unfollowEngine.executeUnfollow(message.user);

    case 'GET_WALLCHAIN_SCORES':
      // Re-scan to get latest Wallchain scores
      const users = scraper.scanVisibleUsers();
      const scores = {};
      users.forEach(u => {
        if (u.wallchainScore !== null) {
          scores[u.username] = u.wallchainScore;
        }
      });
      return { success: true, scores };

    case 'CHECK_PAGE':
      // Check if we're on the following page
      const url = window.location.href;
      const isFollowingPage = url.includes('/following');
      const isFollowersPage = url.includes('/followers');
      return {
        success: true,
        url,
        isFollowingPage,
        isFollowersPage,
        isXPage: url.includes('x.com') || url.includes('twitter.com')
      };

    case 'PING':
      return { success: true, alive: true };

    default:
      return { success: false, reason: 'Unknown message type' };
  }
}

// ============================================================
// AUTO-DETECT PAGE CHANGES (SPA navigation)
// ============================================================
let lastUrl = window.location.href;

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Reset scanner on page change
    scraper.scannedUsers.clear();
    scraper.isScanning = false;

    // Notify background of page change
    chrome.runtime.sendMessage({
      type: 'PAGE_CHANGED',
      url: lastUrl,
      isFollowingPage: lastUrl.includes('/following')
    }).catch(() => {});
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });

console.log('[X Unfollower Pro] Content script loaded on:', window.location.href);
