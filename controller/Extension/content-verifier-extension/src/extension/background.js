// Background Service Worker for Content Verifier Extension
// Handles communication, network monitoring, and verification requests

// Import X.com data storage service
importScripts('src/backend/xcom-data-storage.js');

class BackgroundServiceWorker {
  constructor() {
    this.verificationQueue = [];
    this.isProcessing = false;
    this.apiEndpoint = 'http://localhost:3000/api/verify'; // Will be configurable
    this.xcomDataStorage = new XComDataStorage();
    this.init();
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
      
      switch (request.type) {
        case 'CONTENT_EXTRACTED':
          this.handleContentExtraction(request.data, sender.tab.id);
          break;
        case 'VERIFICATION_REQUEST':
          this.handleVerificationRequest(request.data, sendResponse);
          break;
        case 'USER_REPORT':
          this.handleUserReport(request.data, sendResponse);
          break;
        case 'GET_VERIFICATION_STATUS':
          this.getVerificationStatus(request.url, sendResponse);
          break;
        case 'XCOM_DATA_EXTRACTED':
          this.handleXComDataExtracted(request.data, sendResponse);
          break;
        case 'GET_XCOM_STATS':
          this.getXComStats(sendResponse);
          break;
        case 'EXPORT_XCOM_DATA':
          this.exportXComData(sendResponse);
          break;
        case 'CLEAR_XCOM_DATA':
          this.clearXComData(sendResponse);
          break;
        default:
          console.warn('Unknown message type:', request.type);
      }
      
      return true; // Keep message channel open for async response
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
      
      // Store the data using X.com data storage service
      await this.xcomDataStorage.storeData(data);
      
      sendResponse({ 
        success: true, 
        message: 'X.com data stored successfully',
        stats: await this.xcomDataStorage.getStorageStats()
      });
      
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
      const stats = await this.xcomDataStorage.getStorageStats();
      sendResponse({ success: true, data: stats });
    } catch (error) {
      console.error('Error getting X.com stats:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async exportXComData(sendResponse) {
    try {
      const result = await this.xcomDataStorage.exportCurrentBuffer();
      sendResponse({ success: true, data: result });
    } catch (error) {
      console.error('Error exporting X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async clearXComData(sendResponse) {
    try {
      await this.xcomDataStorage.clearAllData();
      sendResponse({ success: true, message: 'All X.com data cleared' });
    } catch (error) {
      console.error('Error clearing X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  notifyContentScript(tabId, message) {
    try {
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
      apiEndpoint: 'http://localhost:3000/api/verify',
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
