// Background Service Worker for X.com Data Interceptor
// Simplified version for X.com data handling

// X.com Data Storage Service (inline to avoid import issues)
class XComDataStorage {
  constructor() {
    this.dataBuffer = [];
    this.maxBufferSize = 5; // Save after 5 buffered entries for quick testing
    this.fileCounter = 1;
    this.currentSession = Date.now();
  }

  async storeData(extractedData) {
    try {
      console.log(`[DEBUG] 📦 Storing data. Buffer size before: ${this.dataBuffer.length}`);
      this.dataBuffer.push({
        ...extractedData,
        bufferedAt: Date.now(),
        sessionId: this.currentSession
      });
      console.log(`[DEBUG] 📦 Data stored. Buffer size after: ${this.dataBuffer.length}`);
      if (this.dataBuffer.length >= this.maxBufferSize) {
        console.log(`[DEBUG] 🌊 Buffer threshold reached (${this.maxBufferSize}). Flushing to file.`);
        await this.flushBufferToFile();
      }
    } catch (error) {
      console.error('Error storing X.com data:', error);
    }
  }

  async flushBufferToFile() {
    if (this.dataBuffer.length === 0) {
      console.log('%c[DEBUG] 📤 No data to export - buffer is empty.', 'color: #ffc107');
      return;
    }
    console.log(`%c[DEBUG] 💾 Flushing ${this.dataBuffer.length} items to file.`, 'color: #28a745');
    try {
      const fileName = this.generateFileName();
      const fileContent = this.formatDataForFile(this.dataBuffer);
      console.log(`[DEBUG] Generated file name: ${fileName}`);
      await this.saveToFile(fileName, fileContent);
      console.log('%c[DEBUG] ✅ Buffer flushed and file saved successfully.', 'color: #28a745');
      this.dataBuffer = [];
      this.fileCounter++;
    } catch (error) {
      console.error('%c[DEBUG] ❌ Error flushing buffer to file:', 'color: #dc3545', error);
    }
  }

  generateFileName() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `xcom-data-${dateStr}-${timeStr}-${this.fileCounter}.json`;
  }

  formatDataForFile(dataBuffer) {
    const fileData = {
      metadata: {
        sessionId: this.currentSession,
        exportedAt: new Date().toISOString(),
        totalItems: dataBuffer.length,
        version: '1.0.0'
      },
      data: dataBuffer.map(item => ({
        url: item.url,
        timestamp: item.timestamp,
        scrollPosition: item.scrollPosition,
        tweets: item.extractedData?.tweets || [],
        users: item.extractedData?.users || [],
        totalCount: item.extractedData?.totalCount || 0
      })),
      summary: {
        totalTweets: dataBuffer.reduce((sum, item) => sum + (item.extractedData?.totalCount || 0), 0),
        timelineSnapshots: dataBuffer.length
      }
    };

    return JSON.stringify(fileData, null, 2);
  }

  async saveToFile(fileName, content) {
    try {
      // Use a UTF-8 data URL to ensure compatibility in MV3 service worker context
      const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(content)}`;
      
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: `xcom-data/${fileName}`,
        saveAs: false
      });
      
      console.log('File saved with download ID:', downloadId);
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async getStorageStats() {
    return {
      currentBuffer: {
        size: this.dataBuffer.length,
        oldestItem: this.dataBuffer.length > 0 ? this.dataBuffer[0].timestamp : null
      }
    };
  }
}

class BackgroundServiceWorker {
  constructor() {
    this.xcomDataStorage = new XComDataStorage();
    this.init();
  }

  init() {
    this.setupMessageListeners();
    console.log('%c🚀 X.com Interceptor Background Service Initialized', 'color: #28a745; font-weight: bold;');
    console.log('Listening for messages...');
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log(`%c[DEBUG] 📨 Message received: ${request.type}`, 'color: #007bff', request.data || '');
      switch (request.type) {
        case 'XCOM_DATA_EXTRACTED':
          console.log('[DEBUG] Storing data received from content script.');
          this.xcomDataStorage.storeData(request.data);
          sendResponse({ success: true, message: 'Data received for buffering.' });
          break;
        case 'FORCE_EXPORT_DATA':
          console.log('[DEBUG] Force export message received. Flushing buffer.');
          this.xcomDataStorage.flushBufferToFile();
          sendResponse({ success: true, message: 'Flush command executed.' });
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
      
      return true;
    });
  }

  async handleXComDataExtracted(data, sendResponse) {
    try {
      console.log('Processing X.com data extraction:', {
        url: data.url,
        timestamp: data.timestamp,
        tweetCount: data.extractedData?.totalCount || 0
      });
      
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
      await this.xcomDataStorage.flushBufferToFile();
      sendResponse({ success: true, message: 'Data exported successfully' });
    } catch (error) {
      console.error('Error exporting X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async clearXComData(sendResponse) {
    try {
      this.xcomDataStorage.dataBuffer = [];
      sendResponse({ success: true, message: 'All X.com data cleared' });
    } catch (error) {
      console.error('Error clearing X.com data:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize the background service worker
console.log('🚀 Background script loading...');

try {
  const backgroundWorker = new BackgroundServiceWorker();
  console.log('✅ Background worker initialized successfully');
  globalThis.backgroundWorker = backgroundWorker;
} catch (error) {
  console.error('❌ Background worker initialization failed:', error);
}

// Add global test function for debugging
globalThis.testDownload = async function() {
  try {
    const testContent = JSON.stringify({
      test: true,
      timestamp: Date.now(),
      message: "Test download from X.com Data Interceptor"
    }, null, 2);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(testContent)}`;
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: `xcom-data/test-${Date.now()}.json`,
      saveAs: false
    });
    console.log('✅ Test download successful, ID:', downloadId);
    return downloadId;
  } catch (error) {
    console.error('❌ Test download failed:', error);
    throw error;
  }
};

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('X.com Data Interceptor Extension installed');
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('X.com Data Interceptor Extension started');
});
