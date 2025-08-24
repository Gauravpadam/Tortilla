// X.com Data Storage Service
// Handles storage of intercepted X.com data to files

class XComDataStorage {
  constructor() {
    this.dataBuffer = [];
    this.maxBufferSize = 100;
    this.storageDirectory = 'xcom-data';
    this.fileCounter = 1;
    this.currentSession = Date.now();
    
    this.init();
  }

  async init() {
    console.log('X.com Data Storage Service initialized');
    
    // Create storage directory structure
    await this.ensureStorageStructure();
    
    // Setup periodic file writing
    this.setupPeriodicStorage();
  }

  async ensureStorageStructure() {
    try {
      // In browser extension context, we'll use chrome.storage and downloads API
      // to save files to the user's download directory
      const sessionInfo = {
        sessionId: this.currentSession,
        startTime: new Date().toISOString(),
        directory: this.storageDirectory
      };
      
      await chrome.storage.local.set({
        'xcom_session_info': sessionInfo
      });
      
      console.log('Storage structure initialized for session:', this.currentSession);
    } catch (error) {
      console.error('Error setting up storage structure:', error);
    }
  }

  async storeData(extractedData) {
    try {
      // Add to buffer
      this.dataBuffer.push({
        ...extractedData,
        bufferedAt: Date.now(),
        sessionId: this.currentSession
      });

      console.log(`Data buffered. Buffer size: ${this.dataBuffer.length}/${this.maxBufferSize}`);

      // Check if buffer is full or if significant time has passed
      if (this.dataBuffer.length >= this.maxBufferSize || this.shouldFlushBuffer()) {
        await this.flushBufferToFile();
      }

    } catch (error) {
      console.error('Error storing X.com data:', error);
    }
  }

  shouldFlushBuffer() {
    if (this.dataBuffer.length === 0) return false;
    
    const oldestItem = this.dataBuffer[0];
    const timeSinceOldest = Date.now() - oldestItem.bufferedAt;
    
    // Flush if oldest item is more than 5 minutes old
    return timeSinceOldest > 5 * 60 * 1000;
  }

  async flushBufferToFile() {
    if (this.dataBuffer.length === 0) return;

    try {
      const fileName = this.generateFileName();
      const fileContent = this.formatDataForFile(this.dataBuffer);
      
      // Save using chrome.downloads API
      await this.saveToFile(fileName, fileContent);
      
      console.log(`Flushed ${this.dataBuffer.length} items to file: ${fileName}`);
      
      // Clear buffer
      this.dataBuffer = [];
      this.fileCounter++;
      
    } catch (error) {
      console.error('Error flushing buffer to file:', error);
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
        timeRange: {
          start: new Date(Math.min(...dataBuffer.map(item => item.timestamp))).toISOString(),
          end: new Date(Math.max(...dataBuffer.map(item => item.timestamp))).toISOString()
        },
        version: '1.0.0'
      },
      data: dataBuffer.map(item => ({
        url: item.url,
        timestamp: item.timestamp,
        scrollPosition: item.scrollPosition,
        tweets: item.extractedData?.tweets || [],
        users: item.extractedData?.users || [],
        extractedAt: item.extractedData?.extractedAt,
        totalCount: item.extractedData?.totalCount || 0
      })),
      summary: {
        totalTweets: dataBuffer.reduce((sum, item) => sum + (item.extractedData?.totalCount || 0), 0),
        uniqueUsers: this.getUniqueUsers(dataBuffer),
        timelineSnapshots: dataBuffer.length
      }
    };

    return JSON.stringify(fileData, null, 2);
  }

  getUniqueUsers(dataBuffer) {
    const userIds = new Set();
    
    dataBuffer.forEach(item => {
      if (item.extractedData?.tweets) {
        item.extractedData.tweets.forEach(tweet => {
          if (tweet.user?.id) {
            userIds.add(tweet.user.id);
          }
        });
      }
    });
    
    return userIds.size;
  }

  async saveToFile(fileName, content) {
    try {
      // Create a blob with the content
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Use chrome.downloads API to save the file
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: `${this.storageDirectory}/${fileName}`,
        saveAs: false // Don't prompt user, save directly
      });
      
      console.log('File saved with download ID:', downloadId);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      // Update storage statistics
      await this.updateStorageStats(fileName, content.length);
      
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async updateStorageStats(fileName, fileSize) {
    try {
      const stats = await chrome.storage.local.get('xcom_storage_stats') || {};
      const currentStats = stats.xcom_storage_stats || {
        totalFiles: 0,
        totalSize: 0,
        lastSaved: null,
        files: []
      };
      
      currentStats.totalFiles++;
      currentStats.totalSize += fileSize;
      currentStats.lastSaved = new Date().toISOString();
      currentStats.files.push({
        name: fileName,
        size: fileSize,
        savedAt: new Date().toISOString()
      });
      
      // Keep only last 50 file records
      if (currentStats.files.length > 50) {
        currentStats.files = currentStats.files.slice(-50);
      }
      
      await chrome.storage.local.set({
        'xcom_storage_stats': currentStats
      });
      
    } catch (error) {
      console.error('Error updating storage stats:', error);
    }
  }

  setupPeriodicStorage() {
    // Flush buffer every 10 minutes
    setInterval(() => {
      if (this.dataBuffer.length > 0) {
        console.log('Periodic flush triggered');
        this.flushBufferToFile();
      }
    }, 10 * 60 * 1000);
    
    // Also flush on page unload
    window.addEventListener('beforeunload', () => {
      if (this.dataBuffer.length > 0) {
        // Synchronous flush for page unload
        this.flushBufferToFile();
      }
    });
  }

  async getStorageStats() {
    try {
      const stats = await chrome.storage.local.get(['xcom_storage_stats', 'xcom_session_info']);
      
      return {
        session: stats.xcom_session_info || {},
        storage: stats.xcom_storage_stats || {},
        currentBuffer: {
          size: this.dataBuffer.length,
          oldestItem: this.dataBuffer.length > 0 ? this.dataBuffer[0].timestamp : null
        }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  async exportCurrentBuffer() {
    if (this.dataBuffer.length === 0) {
      throw new Error('No data in buffer to export');
    }
    
    const fileName = `manual-export-${this.generateFileName()}`;
    const content = this.formatDataForFile(this.dataBuffer);
    
    await this.saveToFile(fileName, content);
    
    return {
      fileName,
      itemCount: this.dataBuffer.length,
      fileSize: content.length
    };
  }

  async clearAllData() {
    try {
      // Clear buffer
      this.dataBuffer = [];
      
      // Clear storage
      await chrome.storage.local.remove(['xcom_storage_stats', 'xcom_session_info']);
      
      // Reset counters
      this.fileCounter = 1;
      this.currentSession = Date.now();
      
      // Reinitialize
      await this.init();
      
      console.log('All X.com data cleared and service reinitialized');
      
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XComDataStorage;
} else if (typeof window !== 'undefined') {
  window.XComDataStorage = XComDataStorage;
}
