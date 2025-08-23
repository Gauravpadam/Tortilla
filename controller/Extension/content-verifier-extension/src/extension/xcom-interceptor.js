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

  init() {
    console.log('🔍 X.com Data Interceptor initialized');
    
    // Run on any domain for testing, but focus on X.com functionality
    this.setupNetworkInterception();
    this.setupScrollListener();
    this.setupMessageListeners();
    this.injectResponseInterceptor();
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
    
    // Check for GraphQL API endpoints
    if (url.includes('/api/graphql/')) {
      // Check if URL contains any of our target endpoints
      return this.targetEndpoints.some(endpoint => 
        url.includes(endpoint) || 
        url.includes('DXmgQYmIft1oLP6vMkJixw') || // HomeTimeline hash
        url.includes('V7H0Ap3_Hh2FyS75OCDO3Q') || // UserTweets hash
        url.includes('nK1dw4oV3k4w5TdtcAdSww')    // SearchTimeline hash
      );
    }
    
    // Also check for other Twitter/X API endpoints
    return url.includes('/api/1.1/') || url.includes('/api/2/');
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
          rawDataSize: JSON.stringify(data).length
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
    let scrollTimer = null;
    let scrollCount = 0;
    
    window.addEventListener('scroll', () => {
      this.isScrolling = true;
      scrollCount++;
      
      // Clear the previous timer
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      // Set a timer to detect when scrolling stops
      scrollTimer = setTimeout(() => {
        this.isScrolling = false;
        this.handleScrollStop();
      }, 300);
      
      this.handleScroll();
      
      // Log scroll activity periodically
      if (scrollCount % 10 === 0) {
        console.log(`📜 Scroll activity: ${scrollCount} events, position: ${window.scrollY}px`);
      }
    }, { passive: true });
  }

  handleScroll() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - this.lastScrollY;
    
    // Detect significant downward scrolls that might trigger API calls
    if (scrollDelta > 200) {
      console.log(`📈 Significant scroll detected: ${scrollDelta}px down, may trigger API calls`);
      this.lastScrollY = currentScrollY;
      
      // Check if we're near the bottom of the page
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = (currentScrollY + windowHeight) / documentHeight;
      
      if (scrollPercentage > 0.8) {
        console.log('🔄 Near bottom of page - expecting new content to load');
      }
    }
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
          console.log(`✨ Total tweets intercepted recently: ${totalTweets}`);
        }
      }
    }
  }

  sendDataToBackground(interceptedEntry) {
    // Send intercepted data to background script for file storage
    chrome.runtime.sendMessage({
      type: 'XCOM_DATA_EXTRACTED',
      data: interceptedEntry
    }).then(response => {
      if (response && response.success) {
        console.log('✅ Data sent to background for storage');
      }
    }).catch(error => {
      console.error('❌ Error sending data to background:', error);
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_XCOM_DATA':
          sendResponse({
            success: true,
            data: {
              totalApiCalls: this.apiCallCount,
              interceptedDataCount: this.interceptedData.length,
              recentData: this.interceptedData.slice(-5),
              currentUrl: window.location.href,
              scrollPosition: window.scrollY,
              processedTweetsCount: this.processedTweets.size,
              bufferSize: this.dataBuffer.length
            }
          });
          break;
        case 'CLEAR_XCOM_DATA':
          this.interceptedData = [];
          this.dataBuffer = [];
          this.processedTweets.clear();
          this.apiCallCount = 0;
          sendResponse({ success: true, message: 'All data cleared' });
          break;
        case 'EXPORT_BUFFER':
          sendResponse({
            success: true,
            data: this.dataBuffer,
            count: this.dataBuffer.length
          });
          break;
        default:
          break;
      }
      return true; // Keep message channel open
    });
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

  // Public methods for debugging
  getStats() {
    return {
      totalApiCalls: this.apiData.length,
      uniqueUrls: this.fetchedUrls.size,
      currentScrollPosition: window.scrollY,
      isScrolling: this.isScrolling,
      lastDataTimestamp: this.apiData.length > 0 ? this.apiData[this.apiData.length - 1].timestamp : null
    };
  }

  exportData() {
    return {
      apiData: this.apiData,
      stats: this.getStats(),
      exportedAt: Date.now()
    };
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

// Add debugging methods
window.getInterceptorStats = () => {
  return {
    apiCallCount: xcomInterceptor.apiCallCount,
    interceptedDataCount: xcomInterceptor.interceptedData.length,
    processedTweetsCount: xcomInterceptor.processedTweets.size,
    bufferSize: xcomInterceptor.dataBuffer.length,
    lastInterception: xcomInterceptor.interceptedData.length > 0 ? 
      xcomInterceptor.interceptedData[xcomInterceptor.interceptedData.length - 1].timestamp : null
  };
};

window.exportInterceptedData = () => {
  return {
    stats: window.getInterceptorStats(),
    data: xcomInterceptor.interceptedData,
    exportedAt: Date.now()
  };
};

console.log('🔧 Debug methods available: getInterceptorStats(), exportInterceptedData()');
