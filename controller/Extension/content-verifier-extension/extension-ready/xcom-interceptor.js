// X.com Data Interceptor for Content Verifier Extension
// Intercepts X.com's own API calls and processes the responses directly

class XComDataInterceptor {
  constructor() {
    this.interceptedData = [];
    this.processedTweets = new Set();
    this.isScrolling = false;
    this.lastScrollY = 0;
    this.apiCallCount = 0;
    this.dataBuffer = [];
    this.scrollEventCount = 0;
    this.scrollThreshold = 5; // Export every 5 scroll events
    
    // Target GraphQL endpoints to intercept
    this.targetEndpoints = [
      'HomeTimeline',
      'UserTweets', 
      'SearchTimeline',
      'ListLatestTweetsTimeline',
      'TweetDetail'
    ];
    
    this.init();
  }

  injectPageInterceptors() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('page-hooks.js');
      script.async = false;
      (document.documentElement || document.head || document.body).appendChild(script);
      console.log('%c[DEBUG] ✅ Page interceptors injected via page-hooks.js', 'color: #28a745');
    } catch (e) {
      console.warn('[DEBUG] ❌ Failed to inject page interceptors:', e);
    }
  }

  identifyOperation(url, data) {
    try {
      // 1) URL-based (common: /graphql/<hash>/HomeTimeline)
      const match = url && url.match(/\/graphql\/[^/]+\/([^/?#]+)/);
      if (match && match[1]) return match[1];

      // 2) Response-shape heuristics
      if (data && data.data) {
        if (data.data.home || data.data.homeTimeline || data.data.home_latest) return 'HomeTimeline';
      }

      // 3) Fallback unknown
      return 'Unknown';
    } catch (e) {
      console.warn('[DEBUG] Failed to identify operation:', e);
      return 'Unknown';
    }
  }

  init() {
    console.log('🔍 X.com Data Interceptor initialized on:', window.location.href);
    console.log('🔍 Domain check:', this.isXComDomain() ? 'X.com domain' : 'Other domain');
    
    // Run on any domain for testing, but focus on X.com functionality
    this.injectPageInterceptors();
    this.setupNetworkInterception();
    this.setupScrollListener();
    this.setupMessageListeners();
    this.injectResponseInterceptor();
    
    // Make interceptor globally available for debugging
    window.xcomInterceptor = this;
    
    // Create global functions without CSP violations
    this.createGlobalDebugFunctions();
    
    console.log('🔍 Interceptor attached to window.xcomInterceptor');
  }

  isXComDomain() {
    const hostname = window.location.hostname;
    return hostname === 'x.com' || hostname === 'twitter.com' || hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com');
  }

  setupNetworkInterception() {
    console.log('🌐 Setting up network interception for X.com API calls');
    
    // Intercept fetch requests - this captures X.com's own API calls
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = async function(...args) {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      // Check if this is a target GraphQL API call
      if (self.isTargetApiCall(url)) {
        console.log('🎯 Intercepted X.com API call:', url);
        self.apiCallCount++;
        
        try {
          // Let the original request proceed
          const response = await originalFetch.apply(this, args);
          
          // Clone the response to read it without consuming the original
          const clonedResponse = response.clone();
          
          // Process the intercepted response
          self.processInterceptedResponse(url, clonedResponse);
          
          // Return the original response so X.com continues to work normally
          return response;
        } catch (error) {
          console.error('❌ Error intercepting API call:', error);
          return originalFetch.apply(this, args);
        }
      }
      
      // For non-target URLs, just pass through
      return originalFetch.apply(this, args);
    };

    // Also intercept XMLHttpRequest for older API calls
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._interceptedUrl = url;
      this._interceptedMethod = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(data) {
      const xhr = this;
      
      if (xhr._interceptedUrl && self.isTargetApiCall(xhr._interceptedUrl)) {
        const originalOnReadyStateChange = xhr.onreadystatechange;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            console.log('🎯 Intercepted XHR API call:', xhr._interceptedUrl);
            self.apiCallCount++;
            
            try {
              self.processInterceptedResponse(xhr._interceptedUrl, xhr.responseText);
            } catch (error) {
              console.error('❌ Error processing XHR response:', error);
            }
          }
          
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(this, arguments);
          }
        };
      }
      
      return originalXHRSend.apply(this, arguments);
    };
  }

  isTargetApiCall(url) {
    if (!url) return false;
    const isGraphQL = url.includes('/api/graphql/');
    if (!isGraphQL) return false; // only GraphQL calls
    // Capture all GraphQL calls; we will filter inside processing
    console.log(`%c[DEBUG] GraphQL call detected: ${url}`, 'color: #17a2b8');
    return true;
  }

  async processInterceptedResponse(url, response) {
    try {
      let data;
      
      // Parse response data
      if (typeof response === 'string') {
        data = JSON.parse(response);
      } else {
        data = await response.json();
      }
      
      console.log('📊 Processing intercepted response from:', url);
      console.log('📋 Raw response data structure:', Object.keys(data));
      
      // Determine operation and extract only if HomeTimeline
      const operation = this.identifyOperation(url, data);
      if (operation !== 'HomeTimeline') {
        console.log(`%c[DEBUG] Skipping non-HomeTimeline operation: ${operation || 'Unknown'}`, 'color: #ffc107');
        return; // do not buffer non-HomeTimeline for now
      }

      // Extract meaningful data from the response
      const extractedData = this.extractDataFromResponse(data, url);
      
      if (extractedData && extractedData.tweets && extractedData.tweets.length > 0) {
        console.log(`✅ Extracted ${extractedData.tweets.length} tweets from intercepted response`);
        
        // Store the intercepted data
        const interceptedEntry = {
          url: url,
          timestamp: Date.now(),
          scrollPosition: window.scrollY,
          apiCallNumber: this.apiCallCount,
          extractedData: extractedData,
          rawDataSize: JSON.stringify(data).length,
          // Add raw timeline for backend forwarding
          rawTimeline: data
        };
        
        this.interceptedData.push(interceptedEntry);
        this.dataBuffer.push(interceptedEntry);
        
        // Send to background script for file storage
        this.sendDataToBackground(interceptedEntry);
        
        // Process tweets for content verification if needed
        this.processTweetsForVerification(extractedData.tweets);
      } else {
        console.log('ℹ️ No tweet data found in this response');
      }
      
    } catch (error) {
      console.error('❌ Error processing intercepted response:', error);
      console.error('Response that caused error:', response);
    }
  }

  extractDataFromResponse(apiResponse, url) {
    const tweets = [];
    const users = new Map();
    
    try {
      console.log('🔍 Analyzing response structure...');
      
      // Handle different GraphQL response structures
      let instructions = [];
      
      // Try different possible paths for timeline data
      if (apiResponse?.data?.home?.home_timeline_urt?.instructions) {
        instructions = apiResponse.data.home.home_timeline_urt.instructions;
        console.log('📱 Found HomeTimeline data');
      } else if (apiResponse?.data?.user?.result?.timeline_v2?.timeline?.instructions) {
        instructions = apiResponse.data.user.result.timeline_v2.timeline.instructions;
        console.log('👤 Found UserTweets data');
      } else if (apiResponse?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions) {
        instructions = apiResponse.data.search_by_raw_query.search_timeline.timeline.instructions;
        console.log('🔍 Found SearchTimeline data');
      } else if (apiResponse?.data?.threaded_conversation_with_injections_v2?.instructions) {
        instructions = apiResponse.data.threaded_conversation_with_injections_v2.instructions;
        console.log('💬 Found TweetDetail data');
      }
      
      // Process instructions to extract tweets
      instructions.forEach((instruction, index) => {
        console.log(`📋 Processing instruction ${index + 1}: ${instruction.type}`);
        
        if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
          instruction.entries.forEach((entry, entryIndex) => {
            const tweet = this.extractTweetFromEntry(entry);
            if (tweet && !this.processedTweets.has(tweet.id)) {
              tweets.push(tweet);
              this.processedTweets.add(tweet.id);
              
              // Store user info
              if (tweet.user) {
                users.set(tweet.user.id, tweet.user);
              }
            }
          });
        } else if (instruction.type === 'TimelineReplaceEntry' && instruction.entry) {
          const tweet = this.extractTweetFromEntry(instruction.entry);
          if (tweet && !this.processedTweets.has(tweet.id)) {
            tweets.push(tweet);
            this.processedTweets.add(tweet.id);
            
            if (tweet.user) {
              users.set(tweet.user.id, tweet.user);
            }
          }
        }
      });
      
      return {
        tweets,
        users: Array.from(users.values()),
        extractedAt: Date.now(),
        totalCount: tweets.length,
        source: url,
        responseType: this.determineResponseType(url)
      };
      
    } catch (error) {
      console.error('❌ Error extracting data from response:', error);
      return { tweets: [], users: [], extractedAt: Date.now(), totalCount: 0 };
    }
  }

  extractTweetFromEntry(entry) {
    try {
      // Handle different entry types
      if (entry.content?.entryType === 'TimelineTimelineItem') {
        return this.extractTweetFromTimelineItem(entry);
      } else if (entry.content?.entryType === 'TimelineTimelineCursor') {
        // Skip cursor entries
        return null;
      } else if (entry.content?.entryType === 'TimelineTimelineModule') {
        // Handle module entries (like "Who to follow")
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting tweet from entry:', error);
      return null;
    }
  }

  extractTweetFromTimelineItem(entry) {
    try {
      const itemContent = entry.content?.itemContent;
      if (!itemContent || itemContent.itemType !== 'TimelineTweet') {
        return null;
      }
      
      const tweetResults = itemContent.tweet_results?.result;
      if (!tweetResults) return null;
      
      // Handle different tweet result types
      let tweetData = tweetResults;
      if (tweetResults.__typename === 'TweetWithVisibilityResults') {
        tweetData = tweetResults.tweet;
      }
      
      const legacy = tweetData.legacy || tweetData;
      const userResults = tweetData.core?.user_results?.result;
      const user = userResults?.legacy || userResults;
      
      if (!legacy || !user) {
        console.log('⚠️ Missing legacy data or user data in tweet');
        return null;
      }
      
      // Extract comprehensive tweet data
      const tweet = {
        id: legacy.id_str || legacy.id,
        text: legacy.full_text || legacy.text,
        createdAt: legacy.created_at,
        user: {
          id: user.id_str || user.id,
          screenName: user.screen_name,
          name: user.name,
          verified: user.verified || false,
          followersCount: user.followers_count || 0,
          profileImageUrl: user.profile_image_url_https
        },
        metrics: {
          retweetCount: legacy.retweet_count || 0,
          favoriteCount: legacy.favorite_count || 0,
          replyCount: legacy.reply_count || 0,
          quoteCount: legacy.quote_count || 0,
          viewCount: tweetData.views?.count || 0
        },
        entities: legacy.entities || {},
        media: legacy.extended_entities?.media || [],
        urls: legacy.entities?.urls || [],
        hashtags: legacy.entities?.hashtags || [],
        mentions: legacy.entities?.user_mentions || [],
        lang: legacy.lang,
        source: legacy.source,
        inReplyToStatusId: legacy.in_reply_to_status_id_str,
        inReplyToUserId: legacy.in_reply_to_user_id_str,
        isRetweet: !!legacy.retweeted_status_result,
        isPossiblySensitive: legacy.possibly_sensitive || false
      };
      
      // Handle retweets
      if (legacy.retweeted_status_result) {
        const retweetData = legacy.retweeted_status_result.result;
        if (retweetData && retweetData.legacy) {
          tweet.retweetedTweet = {
            id: retweetData.legacy.id_str,
            text: retweetData.legacy.full_text,
            user: retweetData.core?.user_results?.result?.legacy
          };
        }
      }
      
      return tweet;
    } catch (error) {
      console.error('❌ Error extracting tweet from timeline item:', error);
      return null;
    }
  }

  determineResponseType(url) {
    if (url.includes('HomeTimeline')) return 'home_timeline';
    if (url.includes('UserTweets')) return 'user_tweets';
    if (url.includes('SearchTimeline')) return 'search_timeline';
    if (url.includes('TweetDetail')) return 'tweet_detail';
    return 'unknown';
  }

  processTweetsForVerification(tweets) {
    // Extract claims and content for verification
    const claims = [];
    
    tweets.forEach(tweet => {
      // Look for potential claims in tweet text
      const text = tweet.text;
      
      // Simple claim detection patterns
      const claimPatterns = [
        /(?:claim|says|stated|announced|reported|found|discovered|revealed|confirmed|proven)\s+(?:that\s+)?([^.!?]+[.!?])/gi,
        /([^.!?]+(?:is|are|was|were)\s+(?:true|false|fake|real|genuine|authentic|verified|confirmed)[^.!?]*[.!?])/gi,
        /(\d+%|\d+\s*percent).*?(?:increase|decrease|improvement|reduction|growth)/gi
      ];
      
      claimPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const claim = match[1] || match[0];
          if (claim.length > 10 && claim.length < 280) {
            claims.push({
              tweetId: tweet.id,
              userId: tweet.user.id,
              claim: claim.trim(),
              context: text,
              timestamp: tweet.createdAt,
              metrics: tweet.metrics
            });
          }
        }
      });
    });
    
    if (claims.length > 0) {
      console.log(`🔍 Found ${claims.length} potential claims for verification`);
      // Could send these to verification service
    }
  }

  setupScrollListener() {
    console.log('📜 Setting up scroll event monitoring');
    
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - this.lastScrollY;
      
      // Only process significant scroll movements
      if (Math.abs(scrollDelta) > 10) {
        this.scrollEventCount++;
        this.isScrolling = true;
        
        // Log scroll activity every 10 events
        if (this.scrollEventCount % 10 === 0) {
          console.log(`📜 Scroll activity: ${this.scrollEventCount} events, position: ${currentScrollY}px`);
        }
        
        // Check if we've reached the scroll threshold for data saving
        if (this.scrollEventCount % this.scrollThreshold === 0) {
          console.log(`🎯 Scroll threshold reached (${this.scrollEventCount} events) - triggering data save`);
          this.triggerDataSave();
        }
        
        // Detect significant scroll movements that might trigger API calls
        if (Math.abs(scrollDelta) > 200) {
          console.log(`📈 Significant scroll detected: ${Math.abs(scrollDelta)}px ${scrollDelta > 0 ? 'down' : 'up'}, may trigger API calls`);
        }
        
        this.lastScrollY = currentScrollY;
        
        // Clear existing timeout and set new one
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          console.log(`⏹️ Scroll stopped at position: ${window.scrollY}px`);
          this.isScrolling = false;
        }, 150);
      }
    }, { passive: true });
  }

  triggerDataSave() {
    // After reaching threshold, export whatever real data has been intercepted.
    console.log(`%c[DEBUG] 💾 Scroll threshold reached (${this.scrollEventCount}). Forcing export.`, 'color: #007bff');
    this.forceDataExport();
  }

  handleScrollStop() {
    const currentPosition = window.scrollY;
    console.log(`⏹️ Scroll stopped at position: ${currentPosition}px`);
    
    // Check if we have recent intercepted data
    if (this.interceptedData.length > 0) {
      const recentData = this.interceptedData.filter(item => 
        Date.now() - item.timestamp < 10000 // Data from last 10 seconds
      );
      
      if (recentData.length > 0) {
        console.log(`📊 Found ${recentData.length} recent API interceptions`);
        
        // Summarize recent data
        const totalTweets = recentData.reduce((sum, item) => 
          sum + (item.extractedData?.totalCount || 0), 0);
        
        if (totalTweets > 0) {
          console.log(`[DEBUG] [SUCCESS] Extracted ${totalTweets} tweets from recent API calls.`);
        }
      }
    }
  }

  sendDataToBackground(interceptedEntry) {
    console.log('[DEBUG] Intercepted API call:', interceptedEntry);
    // Send intercepted data to background script for file storage
    console.log('%c[DEBUG] 📤 Sending data to background script...', 'color: #007bff');
    chrome.runtime.sendMessage({
      type: 'XCOM_DATA_EXTRACTED',
      data: interceptedEntry
    }).then(() => {
      console.log('%c[DEBUG] 📤 Attempting to force export...', 'color: #007bff');
      chrome.runtime.sendMessage({ type: 'FORCE_EXPORT_DATA' })
        .then(() => console.log('%c[DEBUG] ✅ FORCE_EXPORT_DATA message sent to background.', 'color: #28a745'))
        .catch(err => console.error('%c[DEBUG] ❌ FAILED to send FORCE_EXPORT_DATA message:', 'color: #dc3545', err));
    }).catch(error => {
      console.error('[DEBUG] Error sending message to background:', error);
    });
  }

  setupMessageListeners() {
    console.log('📨 Setting up message listeners');
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Content script received message:', request);
      
      if (request.type === 'GET_INTERCEPTOR_STATS') {
        sendResponse(this.getStats());
      } else if (request.type === 'EXPORT_INTERCEPTED_DATA') {
        this.forceDataExport();
        sendResponse({ success: true });
      }
    });

    // Bridge for page-context intercepted messages
    window.addEventListener('message', (event) => {
      try {
        const data = event.data;
        if (!data || data.__xcom !== true) return;
        if (data.type === 'XCOM_INTERCEPTED_RESPONSE') {
          console.log('%c[DEBUG] 📥 Received intercepted response from page context', 'color: #17a2b8');
          this.processInterceptedResponse(data.url, data.bodyText);
        }
      } catch (e) {
        console.warn('[DEBUG] Failed handling page message:', e);
        console.log('📤 Export data request received');
        this.forceDataExport();
      }
    });
  }

  createGlobalDebugFunctions() {
    // Create debug functions directly on window without CSP violations
    const self = this;
    
    window.getInterceptorStats = function() {
      console.log('📊 Interceptor Stats:');
      console.log(`- Buffer size: ${self.dataBuffer.length} items`);
      console.log(`- API calls intercepted: ${self.apiCallCount}`);
      console.log(`- Processed tweets: ${self.processedTweets.size}`);
      console.log(`- Scroll events: ${self.scrollEventCount || 0}`);
      console.log(`- Scroll threshold: ${self.scrollThreshold} (saves data every ${self.scrollThreshold} scrolls)`);
      console.log(`- Next save in: ${self.scrollThreshold - (self.scrollEventCount % self.scrollThreshold)} scroll events`);
      console.log('- Extension is loaded and running');
      return {
        bufferSize: self.dataBuffer.length,
        apiCalls: self.apiCallCount,
        processedTweets: self.processedTweets.size,
        scrollEvents: self.scrollEventCount,
        scrollThreshold: self.scrollThreshold
      };
    };
    
    window.exportInterceptedData = function() {
      console.log('📤 Triggering data export...');
      self.forceDataExport();
      return 'Export triggered';
    };
    
    console.log('🔧 Debug functions created: getInterceptorStats(), exportInterceptedData()');
  }

  forceDataExport() {
    if (this.dataBuffer.length > 0) {
      console.log(`📤 Forcing export of ${this.dataBuffer.length} items`);
      
      // Send current buffer to background for immediate export
      chrome.runtime.sendMessage({
        type: 'EXPORT_XCOM_DATA'
      }).then(response => {
        if (response && response.success) {
          console.log('✅ Data export triggered successfully');
        }
      }).catch(error => {
        console.error('❌ Error triggering export:', error);
      });
    } else {
      console.log('📤 No data to export - buffer is empty');
    }
  }

  injectResponseInterceptor() {
    // Monitor DOM changes for new content
    const observer = new MutationObserver((mutations) => {
      let newTweetsDetected = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for new tweet elements
              const tweets = node.querySelectorAll('[data-testid="tweet"], [data-testid="tweetText"], article[data-testid="tweet"]');
              if (tweets.length > 0) {
                newTweetsDetected = true;
              }
            }
          });
        }
      });
      
      if (newTweetsDetected) {
        console.log('🆕 New tweets detected in DOM - API calls likely occurred');
      }
    });
    
    // Start observing
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      // Wait for body to be available
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
  }

}

// Initialize the interceptor
const xcomInterceptor = new XComDataInterceptor();

// Make it globally accessible for debugging
window.xcomInterceptor = xcomInterceptor;

// Log initialization
if (window.location.hostname.includes('x.com') || window.location.hostname.includes('twitter.com')) {
  console.log('🐦 X.com Data Interceptor loaded and ready for X.com');
} else {
  console.log('🧪 X.com Data Interceptor loaded in test mode');
}
