// Popup JavaScript for Content Verifier Extension
// Handles user interface and settings management

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = {};
    this.init();
  }

  async init() {
    console.log('Popup manager initializing...');
    
    await this.loadSettings();
    await this.getCurrentTab();
    this.setupEventListeners();
    this.updateUI();
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'autoVerify',
        'showBadges',
        'showSidebar',
        'apiEndpoint'
      ]);
      
      this.settings = {
        autoVerify: result.autoVerify !== undefined ? result.autoVerify : true,
        showBadges: result.showBadges !== undefined ? result.showBadges : true,
        showSidebar: result.showSidebar !== undefined ? result.showSidebar : true,
        apiEndpoint: result.apiEndpoint || 'http://localhost:3000/api/verify'
      };
      
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {
        autoVerify: true,
        showBadges: true,
        showSidebar: true,
        apiEndpoint: 'http://localhost:3000/api/verify'
      };
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log('Current tab:', tab);
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  setupEventListeners() {
    // Toggle switches
    document.getElementById('autoVerifyToggle').addEventListener('click', () => {
      this.toggleSetting('autoVerify');
    });

    document.getElementById('showBadgesToggle').addEventListener('click', () => {
      this.toggleSetting('showBadges');
    });

    document.getElementById('showSidebarToggle').addEventListener('click', () => {
      this.toggleSetting('showSidebar');
    });

    // Action buttons
    document.getElementById('verifyBtn').addEventListener('click', () => {
      this.triggerVerification();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshData();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearData();
    });
  }

  async toggleSetting(settingName) {
    this.settings[settingName] = !this.settings[settingName];
    
    try {
      await chrome.storage.local.set({ [settingName]: this.settings[settingName] });
      console.log(`Setting ${settingName} updated to:`, this.settings[settingName]);
      
      // Update UI
      this.updateToggleUI(settingName);
      
      // Notify content script of setting change
      if (this.currentTab) {
        chrome.tabs.sendMessage(this.currentTab.id, {
          type: 'SETTING_CHANGED',
          data: { [settingName]: this.settings[settingName] }
        }).catch(error => {
          console.warn('Failed to notify content script:', error);
        });
      }
    } catch (error) {
      console.error(`Failed to update setting ${settingName}:`, error);
    }
  }

  updateToggleUI(settingName) {
    const toggle = document.getElementById(`${settingName}Toggle`);
    if (toggle) {
      if (this.settings[settingName]) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    }
  }

  async triggerVerification() {
    if (!this.currentTab) {
      console.error('No current tab available');
      return;
    }

    try {
      // Update UI to show processing
      this.updateStatus('processing', 'Verifying content...');
      
      // Send message to content script to trigger verification
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'TRIGGER_VERIFICATION'
      });
      
      console.log('Verification triggered:', response);
    } catch (error) {
      console.error('Failed to trigger verification:', error);
      this.updateStatus('error', 'Failed to verify content');
    }
  }

  async refreshData() {
    try {
      await this.loadSettings();
      await this.getCurrentTab();
      this.updateUI();
      console.log('Data refreshed');
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  async clearData() {
    if (confirm('Are you sure you want to clear all extension data? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        await this.loadSettings();
        this.updateUI();
        console.log('Data cleared');
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  }

  updateStatus(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (statusDot && statusText) {
      // Remove all status classes
      statusDot.classList.remove('active', 'processing', 'error');
      
      // Add new status class
      statusDot.classList.add(status);
      statusText.textContent = text;
    }
  }

  async updateUI() {
    // Update toggle switches
    this.updateToggleUI('autoVerify');
    this.updateToggleUI('showBadges');
    this.updateToggleUI('showSidebar');
    
    // Update current page
    if (this.currentTab) {
      const currentPageElement = document.getElementById('currentPage');
      if (currentPageElement) {
        currentPageElement.textContent = this.currentTab.url || 'No page loaded';
      }
    }
    
    // Update stats
    await this.updateStats();
  }

  async updateStats() {
    if (!this.currentTab) return;
    
    try {
      // Get verification status for current page
      const response = await chrome.runtime.sendMessage({
        type: 'GET_VERIFICATION_STATUS',
        url: this.currentTab.url
      });
      
      if (response.success && response.data) {
        const data = response.data;
        
        // Update claims count
        const claimsCountElement = document.getElementById('claimsCount');
        if (claimsCountElement) {
          claimsCountElement.textContent = data.claimsCount || 0;
        }
        
        // Update verification count
        const verificationCountElement = document.getElementById('verificationCount');
        if (verificationCountElement) {
          verificationCountElement.textContent = data.verifiedCount || 0;
        }
        
        // Update status
        if (data.status === 'completed') {
          this.updateStatus('active', 'Verification complete');
        } else if (data.status === 'processing') {
          this.updateStatus('processing', 'Verifying content...');
        } else if (data.status === 'failed') {
          this.updateStatus('error', 'Verification failed');
        } else {
          this.updateStatus('active', 'Ready to verify');
        }
      } else {
        // No verification data available
        this.updateStatus('active', 'Ready to verify');
        
        const claimsCountElement = document.getElementById('claimsCount');
        if (claimsCountElement) {
          claimsCountElement.textContent = '0';
        }
        
        const verificationCountElement = document.getElementById('verificationCount');
        if (verificationCountElement) {
          verificationCountElement.textContent = '0';
        }
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      this.updateStatus('error', 'Failed to load stats');
    }
  }

  startPeriodicUpdates() {
    // Update UI every 5 seconds
    setInterval(() => {
      this.updateStats();
    }, 5000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message);
  
  // Handle any messages that need popup updates
  if (message.type === 'VERIFICATION_UPDATE') {
    // Could trigger UI updates
    console.log('Verification update received:', message.data);
  }
});
