// Verification Service for Content Verifier Extension
// Handles communication with backend API and verification processing

class VerificationService {
  constructor() {
    this.apiEndpoint = 'http://localhost:3000/api/verify';
    this.apiKey = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.batchSize = 5;
    this.requestQueue = [];
    this.isProcessing = false;
    
    this.init();
  }

  async init() {
    try {
      // Load configuration from storage
      const config = await chrome.storage.local.get(['apiEndpoint', 'apiKey']);
      if (config.apiEndpoint) {
        this.apiEndpoint = config.apiEndpoint;
      }
      if (config.apiKey) {
        this.apiKey = config.apiKey;
      }
      
      console.log('Verification service initialized with endpoint:', this.apiEndpoint);
    } catch (error) {
      console.error('Failed to initialize verification service:', error);
    }
  }

  /**
   * Submit content for verification
   * @param {Object} content - Processed content object
   * @returns {Promise<Object>} Verification results
   */
  async submitForVerification(content) {
    try {
      console.log('Submitting content for verification:', {
        url: content.url,
        claimsCount: content.claims?.length || 0,
        chunksCount: content.chunks?.length || 0
      });

      // Add to request queue
      this.requestQueue.push({
        id: Date.now() + Math.random(),
        content,
        timestamp: Date.now(),
        status: 'queued'
      });

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processRequestQueue();
      }

      return { success: true, message: 'Content queued for verification' };
    } catch (error) {
      console.error('Failed to submit content for verification:', error);
      throw error;
    }
  }

  /**
   * Process the request queue in batches
   */
  async processRequestQueue() {
    if (this.requestQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const batch = this.requestQueue.splice(0, this.batchSize);

    try {
      console.log(`Processing batch of ${batch.length} verification requests`);
      
      // Process batch in parallel
      const promises = batch.map(request => this.processSingleRequest(request));
      const results = await Promise.allSettled(promises);

      // Update request statuses
      results.forEach((result, index) => {
        const request = batch[index];
        if (result.status === 'fulfilled') {
          request.status = 'completed';
          request.result = result.value;
        } else {
          request.status = 'failed';
          request.error = result.reason.message;
        }
      });

      // Notify content scripts of completion
      this.notifyContentScripts(batch);

    } catch (error) {
      console.error('Error processing verification batch:', error);
      
      // Mark all requests as failed
      batch.forEach(request => {
        request.status = 'failed';
        request.error = error.message;
      });
    }

    // Continue processing queue
    setTimeout(() => this.processRequestQueue(), 1000);
  }

  /**
   * Process a single verification request
   * @param {Object} request - Verification request object
   * @returns {Promise<Object>} Verification result
   */
  async processSingleRequest(request) {
    try {
      const payload = this.prepareVerificationPayload(request.content);
      
      const response = await this.sendVerificationRequest(payload);
      
      // Process and validate response
      const processedResult = this.processVerificationResponse(response, request.content);
      
      // Store result in storage
      await this.storeVerificationResult(request.content.url, processedResult);
      
      return processedResult;
    } catch (error) {
      console.error('Failed to process verification request:', error);
      throw error;
    }
  }

  /**
   * Prepare payload for verification API
   * @param {Object} content - Processed content
   * @returns {Object} API payload
   */
  prepareVerificationPayload(content) {
    return {
      type: 'CONTENT_VERIFICATION',
      timestamp: Date.now(),
      data: {
        url: content.url,
        title: content.title,
        domain: content.domain,
        language: content.language,
        readability: content.readability,
        claims: content.claims.map(claim => ({
          id: claim.id,
          text: claim.text,
          type: claim.type,
          confidence: claim.confidence,
          context: claim.context
        })),
        chunks: content.chunks.map(chunk => ({
          id: chunk.id,
          text: chunk.text,
          start: chunk.start,
          end: chunk.end
        })),
        media: content.media.map(media => ({
          type: media.type,
          src: media.src,
          domain: media.domain,
          isExternal: media.isExternal
        })),
        metadata: content.metadata
      }
    };
  }

  /**
   * Send verification request to backend API
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async sendVerificationRequest(payload) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Content-Verifier-Extension/1.0.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const requestOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    };

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`Sending verification request (attempt ${attempt}/${this.retryAttempts})`);
        
        const response = await fetch(this.apiEndpoint, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Verification API response received:', result);
        
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Verification request attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Verification request failed after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Process and validate verification response
   * @param {Object} response - Raw API response
   * @param {Object} originalContent - Original content that was verified
   * @returns {Object} Processed verification result
   */
  processVerificationResponse(response, originalContent) {
    try {
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      // Extract verification results
      const result = {
        url: originalContent.url,
        timestamp: Date.now(),
        status: 'completed',
        pageVerdict: this.determinePageVerdict(response),
        riskScore: this.calculateRiskScore(response),
        claims: this.processClaimVerifications(response.claims || [], originalContent.claims),
        media: this.processMediaVerifications(response.media || [], originalContent.media),
        domain: this.processDomainVerification(response.domain || {}, originalContent.domain),
        overall: {
          confidence: response.confidence || 0.5,
          explanation: response.explanation || 'No explanation provided',
          sources: response.sources || [],
          lastUpdated: response.lastUpdated || Date.now()
        }
      };

      console.log('Processed verification result:', result);
      return result;
    } catch (error) {
      console.error('Error processing verification response:', error);
      throw error;
    }
  }

  /**
   * Determine overall page verdict
   * @param {Object} response - API response
   * @returns {string} Page verdict
   */
  determinePageVerdict(response) {
    if (!response.claims || response.claims.length === 0) {
      return 'UNKNOWN';
    }

    const claimVerdicts = response.claims.map(claim => claim.verdict);
    const trueCount = claimVerdicts.filter(v => v === 'TRUE').length;
    const falseCount = claimVerdicts.filter(v => v === 'FALSE').length;
    const totalCount = claimVerdicts.length;

    if (falseCount / totalCount > 0.7) {
      return 'MISLEADING';
    } else if (trueCount / totalCount > 0.7) {
      return 'VERIFIED';
    } else if (falseCount > 0) {
      return 'MIXED';
    } else {
      return 'UNVERIFIED';
    }
  }

  /**
   * Calculate overall risk score
   * @param {Object} response - API response
   * @returns {number} Risk score (0-10)
   */
  calculateRiskScore(response) {
    let riskScore = 5; // Base risk score
    
    if (response.claims) {
      const falseClaims = response.claims.filter(claim => claim.verdict === 'FALSE').length;
      const totalClaims = response.claims.length;
      
      if (totalClaims > 0) {
        const falseRatio = falseClaims / totalClaims;
        riskScore += falseRatio * 5; // Add up to 5 points for false claims
      }
    }

    if (response.domain && response.domain.riskFactors) {
      response.domain.riskFactors.forEach(factor => {
        if (factor.severity === 'HIGH') riskScore += 2;
        else if (factor.severity === 'MEDIUM') riskScore += 1;
        else if (factor.severity === 'LOW') riskScore += 0.5;
      });
    }

    return Math.min(10, Math.max(0, Math.round(riskScore * 10) / 10));
  }

  /**
   * Process individual claim verifications
   * @param {Array} apiClaims - Claims from API response
   * @param {Array} originalClaims - Original extracted claims
   * @returns {Array} Processed claim verifications
   */
  processClaimVerifications(apiClaims, originalClaims) {
    return originalClaims.map(originalClaim => {
      const apiClaim = apiClaims.find(ac => ac.id === originalClaim.id);
      
      if (apiClaim) {
        return {
          ...originalClaim,
          verdict: apiClaim.verdict || 'UNKNOWN',
          confidence: apiClaim.confidence || 0.5,
          explanation: apiClaim.explanation || 'No explanation available',
          sources: apiClaim.sources || [],
          factCheckers: apiClaim.factCheckers || [],
          lastVerified: apiClaim.lastVerified || Date.now()
        };
      } else {
        return {
          ...originalClaim,
          verdict: 'UNVERIFIED',
          confidence: 0.3,
          explanation: 'Claim not processed by verification service',
          sources: [],
          factCheckers: [],
          lastVerified: Date.now()
        };
      }
    });
  }

  /**
   * Process media verifications
   * @param {Array} apiMedia - Media from API response
   * @param {Array} originalMedia - Original extracted media
   * @returns {Array} Processed media verifications
   */
  processMediaVerifications(apiMedia, originalMedia) {
    return originalMedia.map(originalItem => {
      const apiItem = apiMedia.find(am => am.src === originalItem.src);
      
      if (apiItem) {
        return {
          ...originalItem,
          authenticity: apiItem.authenticity || 'UNKNOWN',
          manipulation: apiItem.manipulation || false,
          confidence: apiItem.confidence || 0.5,
          explanation: apiItem.explanation || 'No explanation available'
        };
      } else {
        return {
          ...originalItem,
          authenticity: 'UNVERIFIED',
          manipulation: false,
          confidence: 0.3,
          explanation: 'Media not processed by verification service'
        };
      }
    });
  }

  /**
   * Process domain verification
   * @param {Object} apiDomain - Domain from API response
   * @param {string} originalDomain - Original domain
   * @returns {Object} Processed domain verification
   */
  processDomainVerification(apiDomain, originalDomain) {
    return {
      domain: originalDomain,
      age: apiDomain.age || 'UNKNOWN',
      reputation: apiDomain.reputation || 'UNKNOWN',
      riskFactors: apiDomain.riskFactors || [],
      verification: apiDomain.verification || 'UNVERIFIED',
      lastChecked: apiDomain.lastChecked || Date.now()
    };
  }

  /**
   * Store verification result in extension storage
   * @param {string} url - URL of verified content
   * @param {Object} result - Verification result
   */
  async storeVerificationResult(url, result) {
    try {
      await chrome.storage.local.set({
        [url]: {
          ...result,
          storedAt: Date.now()
        }
      });
      console.log('Verification result stored for:', url);
    } catch (error) {
      console.error('Failed to store verification result:', error);
    }
  }

  /**
   * Notify content scripts of verification completion
   * @param {Array} batch - Batch of completed requests
   */
  async notifyContentScripts(batch) {
    for (const request of batch) {
      if (request.status === 'completed' && request.result) {
        try {
          // Get all tabs for this URL
          const tabs = await chrome.tabs.query({ url: request.content.url });
          
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'VERIFICATION_COMPLETE',
              data: request.result
            }).catch(error => {
              console.warn(`Failed to notify tab ${tab.id}:`, error);
            });
          });
        } catch (error) {
          console.error('Failed to notify content scripts:', error);
        }
      }
    }
  }

  /**
   * Submit user report
   * @param {Object} reportData - User report data
   * @returns {Promise<Object>} Report submission result
   */
  async submitUserReport(reportData) {
    try {
      const payload = {
        type: 'USER_REPORT',
        timestamp: Date.now(),
        data: reportData
      };

      const response = await fetch(`${this.apiEndpoint}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Content-Verifier-Extension/1.0.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('User report submitted successfully:', result);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to submit user report:', error);
      throw error;
    }
  }

  /**
   * Get verification status for a URL
   * @param {string} url - URL to check
   * @returns {Promise<Object>} Verification status
   */
  async getVerificationStatus(url) {
    try {
      const result = await chrome.storage.local.get(url);
      return result[url] || null;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      return null;
    }
  }

  /**
   * Update API configuration
   * @param {string} endpoint - New API endpoint
   * @param {string} apiKey - New API key
   */
  async updateConfig(endpoint, apiKey) {
    this.apiEndpoint = endpoint;
    this.apiKey = apiKey;
    
    try {
      await chrome.storage.local.set({ apiEndpoint: endpoint, apiKey });
      console.log('API configuration updated');
    } catch (error) {
      console.error('Failed to update API configuration:', error);
    }
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      apiEndpoint: this.apiEndpoint,
      hasApiKey: !!this.apiKey
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VerificationService;
} else if (typeof window !== 'undefined') {
  window.VerificationService = VerificationService;
}
