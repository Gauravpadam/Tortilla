// Content Script for Content Verifier Extension
// Monitors DOM changes, extracts content, and displays verification results

class ContentVerifier {
  constructor() {
    this.currentUrl = window.location.href;
    this.extractedContent = null;
    this.verificationResults = null;
    this.isProcessing = false;
    this.observer = null;
    this.badges = new Map();
    this.sidebar = null;
    
    this.init();
  }

  init() {
    console.log('Content Verifier initialized for:', this.currentUrl);
    
    this.setupMessageListeners();
    this.setupDOMObserver();
    this.extractInitialContent();
    this.createSidebar();
    
    // Listen for page navigation (SPA support)
    this.setupNavigationListener();
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      
      switch (message.type) {
        case 'VERIFICATION_QUEUED':
          this.showProcessingIndicator();
          break;
        case 'VERIFICATION_COMPLETE':
          this.handleVerificationComplete(message.data);
          break;
        case 'VERIFICATION_FAILED':
          this.handleVerificationFailed(message.data);
          break;
        case 'NETWORK_REQUEST':
          this.handleNetworkRequest(message.data);
          break;
        case 'PAGE_LOADED':
          this.handlePageLoaded(message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    });
  }

  setupDOMObserver() {
    // Monitor DOM changes for dynamic content
    this.observer = new MutationObserver((mutations) => {
      let hasContentChanges = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new content was added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const textContent = node.textContent || '';
              if (textContent.length > 100) { // Significant content change
                hasContentChanges = true;
              }
            }
          });
        }
      });

      if (hasContentChanges) {
        console.log('DOM changes detected, re-extracting content');
        this.debouncedExtractContent();
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  setupNavigationListener() {
    // Handle SPA navigation
    let currentUrl = window.location.href;
    
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('URL changed, reinitializing:', currentUrl);
        this.handlePageNavigation();
      }
    }, 1000);

    // Listen for popstate events
    window.addEventListener('popstate', () => {
      this.handlePageNavigation();
    });
  }

  handlePageNavigation() {
    this.currentUrl = window.location.href;
    this.clearVerificationResults();
    this.extractInitialContent();
  }

  async extractInitialContent() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Extracting initial content from page');

    try {
      const content = this.extractPageContent();
      this.extractedContent = content;

      // Send to background for verification
      chrome.runtime.sendMessage({
        type: 'CONTENT_EXTRACTED',
        data: content
      });

    } catch (error) {
      console.error('Error extracting content:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  debouncedExtractContent() {
    if (this.extractTimeout) {
      clearTimeout(this.extractTimeout);
    }
    
    this.extractTimeout = setTimeout(() => {
      this.extractInitialContent();
    }, 2000); // Wait 2 seconds after last change
  }

  extractPageContent() {
    const content = {
      url: this.currentUrl,
      title: document.title,
      text: '',
      metadata: {},
      timestamp: Date.now()
    };

    // Extract main content (prioritize article content)
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content'
    ];

    let mainContent = null;
    for (const selector of selectors) {
      mainContent = document.querySelector(selector);
      if (mainContent) break;
    }

    if (!mainContent) {
      mainContent = document.body;
    }

    // Extract text content
    content.text = this.cleanTextContent(mainContent.textContent || '');
    
    // Extract metadata
    content.metadata = this.extractMetadata();
    
    // Extract images and media
    content.media = this.extractMedia(mainContent);
    
    // Extract claims and statements
    content.claims = this.extractClaims(mainContent);

    console.log('Extracted content:', {
      url: content.url,
      textLength: content.text.length,
      claimsCount: content.claims.length,
      mediaCount: content.media.length
    });

    return content;
  }

  cleanTextContent(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10k characters
  }

  extractMetadata() {
    const metadata = {};
    
    // Extract meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Extract structured data
    const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
    structuredData.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data) {
          metadata.structuredData = metadata.structuredData || [];
          metadata.structuredData.push(data);
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    return metadata;
  }

  extractMedia(container) {
    const media = [];
    
    // Extract images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.alt) {
        media.push({
          type: 'image',
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height
        });
      }
    });

    // Extract videos
    const videos = container.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
    videos.forEach(video => {
      media.push({
        type: 'video',
        src: video.src || video.currentSrc,
        title: video.title || ''
      });
    });

    return media;
  }

  extractClaims(container) {
    const claims = [];
    const text = container.textContent || '';
    
    // Simple claim detection patterns
    const claimPatterns = [
      /(?:claim|says|stated|announced|reported|found|discovered|revealed|confirmed|proven)\s+(?:that\s+)?([^.!?]+[.!?])/gi,
      /([^.!?]+(?:is|are|was|were)\s+(?:true|false|fake|real|genuine|authentic|verified|confirmed)[^.!?]*[.!?])/gi,
      /([^.!?]+(?:according\s+to|per|as\s+reported\s+by|sources\s+say)[^.!?]*[.!?])/gi
    ];

    claimPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const claim = match[1] || match[0];
        if (claim.length > 20 && claim.length < 500) {
          claims.push({
            text: claim.trim(),
            context: this.getClaimContext(claim, text),
            confidence: this.assessClaimConfidence(claim)
          });
        }
      }
    });

    return claims.slice(0, 10); // Limit to 10 claims
  }

  getClaimContext(claim, fullText) {
    const index = fullText.indexOf(claim);
    const start = Math.max(0, index - 100);
    const end = Math.min(fullText.length, index + claim.length + 100);
    return fullText.substring(start, end);
  }

  assessClaimConfidence(claim) {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for claims with specific details
    if (/\d+/.test(claim)) confidence += 0.1;
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(claim)) confidence += 0.1; // Names
    if (/https?:\/\/|www\./.test(claim)) confidence += 0.1; // URLs
    
    // Reduce confidence for vague language
    if (/some|many|few|several|various|certain/.test(claim.toLowerCase())) confidence -= 0.1;
    if (/might|could|may|possibly|perhaps/.test(claim.toLowerCase())) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  handleVerificationComplete(data) {
    this.verificationResults = data;
    this.displayVerificationResults();
    this.updateSidebar();
  }

  handleVerificationFailed(data) {
    console.error('Verification failed:', data);
    this.showErrorIndicator();
  }

  handleNetworkRequest(data) {
    console.log('Network request detected:', data);
    // Could trigger re-verification for dynamic content
  }

  handlePageLoaded(data) {
    console.log('Page loaded:', data);
    // Page has finished loading, content is stable
  }

  displayVerificationResults() {
    if (!this.verificationResults) return;

    // Clear existing badges
    this.clearBadges();

    // Display verification badges for claims
    this.verificationResults.claims?.forEach((claim, index) => {
      this.displayClaimBadge(claim, index);
    });

    // Display overall page verification
    this.displayPageVerification();
  }

  displayClaimBadge(claim, index) {
    const badge = document.createElement('div');
    badge.className = 'content-verifier-badge';
    badge.innerHTML = `
      <div class="badge-header">
        <span class="verdict ${claim.verdict.toLowerCase()}">${claim.verdict}</span>
        <span class="confidence">${Math.round(claim.confidence * 100)}%</span>
      </div>
      <div class="badge-content">
        <div class="claim-text">${claim.text.substring(0, 100)}${claim.text.length > 100 ? '...' : ''}</div>
        <div class="explanation">${claim.explanation || 'No explanation available'}</div>
      </div>
    `;

    // Find the claim in the page and position badge nearby
    const claimElement = this.findClaimElement(claim.text);
    if (claimElement) {
      claimElement.style.position = 'relative';
      claimElement.appendChild(badge);
      this.badges.set(index, badge);
    }
  }

  displayPageVerification() {
    const pageBadge = document.createElement('div');
    pageBadge.className = 'content-verifier-page-badge';
    pageBadge.innerHTML = `
      <div class="page-verdict ${this.verificationResults.pageVerdict.toLowerCase()}">
        ${this.verificationResults.pageVerdict}
      </div>
      <div class="risk-score">Risk: ${this.verificationResults.riskScore}/10</div>
    `;

    // Position at top of page
    document.body.insertBefore(pageBadge, document.body.firstChild);
    this.badges.set('page', pageBadge);
  }

  findClaimElement(claimText) {
    // Simple text search for claim in page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(claimText.substring(0, 50))) {
        return node.parentElement;
      }
    }

    return null;
  }

  clearBadges() {
    this.badges.forEach(badge => {
      if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    });
    this.badges.clear();
  }

  clearVerificationResults() {
    this.clearBadges();
    this.verificationResults = null;
  }

  showProcessingIndicator() {
    // Show loading indicator
    const indicator = document.createElement('div');
    indicator.className = 'content-verifier-loading';
    indicator.innerHTML = '🔍 Verifying content...';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #007bff;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(indicator);
    this.badges.set('loading', indicator);
  }

  showErrorIndicator() {
    const errorIndicator = document.createElement('div');
    errorIndicator.className = 'content-verifier-error';
    errorIndicator.innerHTML = '❌ Verification failed';
    errorIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(errorIndicator);
    this.badges.set('error', errorIndicator);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (errorIndicator.parentNode) {
        errorIndicator.parentNode.removeChild(errorIndicator);
        this.badges.delete('error');
      }
    }, 5000);
  }

  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'content-verifier-sidebar';
    this.sidebar.innerHTML = `
      <div class="sidebar-header">
        <h3>🔍 Content Verifier</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="sidebar-content">
        <div class="status">Ready to verify content</div>
        <div class="results"></div>
        <div class="actions">
          <button class="report-btn">Report Content</button>
        </div>
      </div>
    `;

    // Add event listeners
    this.sidebar.querySelector('.close-btn').addEventListener('click', () => {
      this.toggleSidebar();
    });

    this.sidebar.querySelector('.report-btn').addEventListener('click', () => {
      this.reportContent();
    });

    // Position sidebar
    this.sidebar.style.cssText = `
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      border-left: 1px solid #ddd;
      z-index: 10001;
      transition: right 0.3s ease;
      font-family: Arial, sans-serif;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    `;

    document.body.appendChild(this.sidebar);
    
    // Show sidebar by default
    setTimeout(() => this.toggleSidebar(), 1000);
  }

  toggleSidebar() {
    const isOpen = this.sidebar.style.right === '0px';
    this.sidebar.style.right = isOpen ? '-400px' : '0px';
  }

  updateSidebar() {
    if (!this.verificationResults) return;

    const resultsContainer = this.sidebar.querySelector('.results');
    const statusContainer = this.sidebar.querySelector('.status');

    statusContainer.innerHTML = `
      <div class="page-summary">
        <h4>Page Verification</h4>
        <div class="verdict ${this.verificationResults.pageVerdict.toLowerCase()}">
          ${this.verificationResults.pageVerdict}
        </div>
        <div class="risk-score">Risk Score: ${this.verificationResults.riskScore}/10</div>
      </div>
    `;

    if (this.verificationResults.claims) {
      const claimsHtml = this.verificationResults.claims.map(claim => `
        <div class="claim-item">
          <div class="claim-verdict ${claim.verdict.toLowerCase()}">${claim.verdict}</div>
          <div class="claim-text">${claim.text}</div>
          <div class="claim-explanation">${claim.explanation || 'No explanation available'}</div>
          <div class="claim-confidence">Confidence: ${Math.round(claim.confidence * 100)}%</div>
        </div>
      `).join('');

      resultsContainer.innerHTML = `
        <h4>Claim Verifications</h4>
        <div class="claims-list">${claimsHtml}</div>
      `;
    }
  }

  async reportContent() {
    const reportData = {
      url: this.currentUrl,
      timestamp: Date.now(),
      reason: 'User reported content',
      content: this.extractedContent
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'USER_REPORT',
        data: reportData
      });

      if (response.success) {
        alert('Content reported successfully. Thank you for your feedback!');
      } else {
        alert('Failed to report content. Please try again.');
      }
    } catch (error) {
      console.error('Error reporting content:', error);
      alert('Error reporting content. Please try again.');
    }
  }
}

// Initialize content verifier when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentVerifier();
  });
} else {
  new ContentVerifier();
}
