// Background Service Worker for Content Verifier Extension
// Handles communication, network monitoring, and verification requests

// Try to import X.com data storage service (use absolute URL for MV3)
try {
  const storageUrl = chrome.runtime.getURL('src/backend/xcom-data-storage.js');
  importScripts(storageUrl);
} catch (error) {
  console.warn('Could not load xcom-data-storage.js:', error);
}

class BackgroundServiceWorker {
  constructor() {
    this.verificationQueue = [];
    this.isProcessing = false;
    this.apiEndpoint = '';
    
    // Initialize XComDataStorage if available
    try {
      this.xcomDataStorage = typeof XComDataStorage !== 'undefined' ? new XComDataStorage() : null;
    } catch (error) {
      console.warn('XComDataStorage not available:', error);
      this.xcomDataStorage = null;
    }
    this.init();
  }

  async postToIngestBackend(timelineJson) {
    try {
      const resp = await fetch('http://127.0.0.1:8000/api/analysis/ingest-scroll?debug=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json_blob: timelineJson })
      });
      // Best-effort; log but do not throw on non-OK to avoid spamming console
      if (!resp.ok) {
        console.warn('Ingest backend returned non-OK:', resp.status, resp.statusText);
        return;
      }
      const result = await resp.json();
      console.log('Ingest backend result:', { count: result?.count, sample: result?.debug?.sample_articles });
    } catch (err) {
      console.warn('Error posting to ingest backend:', err);
    }
  }

  init() {
    this.setupMessageListeners();
    this.setupNetworkListeners();
    this.setupStorageListeners();
    console.log('Content Verifier Background Service Worker initialized');
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Background received message:', request);
      // Only keep the channel open if we will respond asynchronously
      let keepChannelOpen = false;

      switch (request.type) {
        case 'CONTENT_EXTRACTED':
          this.handleContentExtraction(request.data, sender.tab?.id);
          keepChannelOpen = false; // no sendResponse expected
          break;
        case 'VERIFICATION_REQUEST':
          this.handleVerificationRequest(request.data, sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'USER_REPORT':
          this.handleUserReport(request.data, sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'GET_VERIFICATION_STATUS':
          this.getVerificationStatus(request.url, sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'XCOM_DATA_EXTRACTED':
          this.handleXComDataExtracted(request.data, sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'GET_XCOM_STATS':
          this.getXComStats(sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'EXPORT_XCOM_DATA':
          this.exportXComData(sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        case 'CLEAR_XCOM_DATA':
          this.clearXComData(sendResponse);
          keepChannelOpen = true; // will respond async
          break;
        default:
          console.warn('Unknown message type:', request.type);
          keepChannelOpen = false;
      }

      return keepChannelOpen;
    });
  }

  setupNetworkListeners() {
    // Monitor XHR/fetch requests for content changes
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (details.type === 'xmlhttprequest' || details.type === 'main_frame') {
          this.notifyContentScript(details.tabId, {
            type: 'NETWORK_REQUEST',
            data: {
              url: details.url,
              method: details.method,
              timestamp: Date.now()
            }
          });
        }
      },
      { urls: ['<all_urls>'] }
    );

    // Monitor response bodies for content extraction
    chrome.webRequest.onResponseStarted.addListener(
      (details) => {
        if (details.type === 'main_frame') {
          this.notifyContentScript(details.tabId, {
            type: 'PAGE_LOADED',
            data: {
              url: details.url,
              timestamp: Date.now()
            }
          });
        }
      },
      { urls: ['<all_urls>'] }
    );
  }

  setupStorageListeners() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.apiEndpoint) {
        this.apiEndpoint = changes.apiEndpoint.newValue;
        console.log('API endpoint updated:', this.apiEndpoint);
      }
    });
  }

  async handleContentExtraction(contentData, tabId) {
    try {
      console.log('Processing extracted content for tab:', tabId);
      // Skip verification if API endpoint is not configured
      if (!this.apiEndpoint) {
        console.log('Verification disabled: no API endpoint configured');
        return;
      }
      
      // Add to verification queue
      this.verificationQueue.push({
        tabId,
        content: contentData,
        timestamp: Date.now(),
        status: 'pending'
      });

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processVerificationQueue();
      }

      // Notify content script that content is queued
      this.notifyContentScript(tabId, {
        type: 'VERIFICATION_QUEUED',
        data: { status: 'queued' }
      });

    } catch (error) {
      console.error('Error handling content extraction:', error);
      this.notifyContentScript(tabId, {
        type: 'ERROR',
        data: { message: 'Failed to process content' }
      });
    }
  }

  async processVerificationQueue() {
    if (this.verificationQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    // If API endpoint is not configured, drain queue without processing
    if (!this.apiEndpoint) {
      console.log('Skipping verification processing: no API endpoint configured');
      this.verificationQueue = [];
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const batch = this.verificationQueue.splice(0, 5); // Process 5 at a time

    try {
      console.log(`Processing batch of ${batch.length} verification requests`);
      
      // Send batch to backend for processing
      const response = await this.sendToBackend({
        type: 'BATCH_VERIFICATION',
        data: {
          requests: batch.map(item => ({
            url: item.content.url,
            content: item.content.text,
            metadata: item.content.metadata
          }))
        }
      });

      // Update status for each item in batch
      batch.forEach((item, index) => {
        if (response.results && response.results[index]) {
          item.status = 'completed';
          item.result = response.results[index];
          
          // Notify content script of completion
          this.notifyContentScript(item.tabId, {
            type: 'VERIFICATION_COMPLETE',
            data: response.results[index]
          });
        }
      });

    } catch (error) {
      console.error('Error processing verification batch:', error);
      
      // Mark all items as failed
      batch.forEach(item => {
        item.status = 'failed';
        this.notifyContentScript(item.tabId, {
          type: 'VERIFICATION_FAILED',
          data: { error: error.message }
        });
      });
    }

    // Continue processing queue
    setTimeout(() => this.processVerificationQueue(), 1000);
  }

  async handleVerificationRequest(data, sendResponse) {
    try {
      if (!this.apiEndpoint) {
        sendResponse({ success: false, error: 'API endpoint not configured' });
        return;
      }
      const response = await this.sendToBackend({
        type: 'SINGLE_VERIFICATION',
        data: data
      });
      
      sendResponse({ success: true, data: response });
    } catch (error) {
      console.error('Verification request failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleUserReport(data, sendResponse) {
    try {
      const response = await this.sendToBackend({
        type: 'USER_REPORT',
        data: data
      });
      
      sendResponse({ success: true, data: response });
    } catch (error) {
      console.error('User report failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getVerificationStatus(url, sendResponse) {
    try {
      const stored = await chrome.storage.local.get(url);
      sendResponse({ success: true, data: stored[url] || null });
    } catch (error) {
      console.error('Failed to get verification status:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async sendToBackend(payload) {
    try {
      if (!this.apiEndpoint) {
        throw new Error('API endpoint not configured');
      }
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend communication failed:', error);
      throw error;
    }
  }

  async handleXComDataExtracted(data, sendResponse) {
    try {
      console.log('Processing X.com data extraction:', {
        url: data.url,
        timestamp: data.timestamp,
        tweetCount: data.extractedData?.totalCount || 0
      });
      
      // Store the data using X.com data storage service if available
      if (this.xcomDataStorage) {
        await this.xcomDataStorage.storeData(data);
        const stats = await this.xcomDataStorage.getStorageStats();
        sendResponse({ 
          success: true, 
          message: 'X.com data stored successfully',
          stats: stats
        });
      } else {
        sendResponse({ 
          success: true, 
          message: 'X.com data received (storage service not available)',
          stats: null
        });
      }

      // Fallback path: also forward raw timeline JSON to backend ingest endpoint.
      // This ensures ingest works even if the page bridge misses messages.
      try {
        if (data && data.rawTimeline) {
          await this.postToIngestBackend(data.rawTimeline);
        }
      } catch (e) {
        console.warn('Failed to forward raw timeline to ingest backend:', e);
      }
      
    } catch (error) {
      console.error('Error handling X.com data:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getXComStats(sendResponse) {
    try {
      if (this.xcomDataStorage) {
        const stats = await this.xcomDataStorage.getStorageStats();
        sendResponse({ success: true, data: stats });
      } else {
        sendResponse({ success: false, error: 'XCom storage service not available' });
      }
    } catch (error) {
      console.error('Error getting X.com stats:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async exportXComData(sendResponse) {
    try {
      if (this.xcomDataStorage) {
        const result = await this.xcomDataStorage.exportCurrentBuffer();
        sendResponse({ success: true, data: result });
      } else {
        sendResponse({ success: false, error: 'XCom storage service not available' });
      }
    } catch (error) {
      console.error('Error exporting X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async clearXComData(sendResponse) {
    try {
      if (this.xcomDataStorage) {
        await this.xcomDataStorage.clearAllData();
        sendResponse({ success: true, message: 'All X.com data cleared' });
      } else {
        sendResponse({ success: false, error: 'XCom storage service not available' });
      }
    } catch (error) {
      console.error('Error clearing X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  notifyContentScript(tabId, message) {
    try {
      if (typeof tabId !== 'number' || tabId < 0) {
        console.warn('Skipping sendMessage: invalid tabId', tabId, message?.type);
        return;
      }
      chrome.tabs.sendMessage(tabId, message).catch(error => {
        console.warn(`Failed to send message to tab ${tabId}:`, error);
      });
    } catch (error) {
      console.error('Error notifying content script:', error);
    }
  }
}

// Initialize the background service worker
const backgroundWorker = new BackgroundServiceWorker();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Content Verifier Extension installed');
    
    // Set default configuration
    chrome.storage.local.set({
      apiEndpoint: '',
      autoVerify: true,
      showBadges: true,
      showSidebar: true
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Content Verifier Extension started');
});
