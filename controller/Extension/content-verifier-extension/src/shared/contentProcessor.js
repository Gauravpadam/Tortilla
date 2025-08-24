// Content Processor Module
// Handles content cleaning, chunking, and data structure management

class ContentProcessor {
  constructor() {
    this.chunkSize = 1000; // Characters per chunk
    this.overlapSize = 200; // Overlap between chunks
    this.minChunkSize = 200; // Minimum chunk size
  }

  /**
   * Process raw content into structured, clean data
   * @param {Object} rawContent - Raw content from webpage
   * @returns {Object} Processed content with claims and metadata
   */
  processContent(rawContent) {
    try {
      console.log('Processing content:', {
        url: rawContent.url,
        textLength: rawContent.text?.length || 0
      });

      const processedContent = {
        url: rawContent.url,
        title: rawContent.title,
        timestamp: rawContent.timestamp || Date.now(),
        metadata: this.cleanMetadata(rawContent.metadata),
        text: this.cleanText(rawContent.text),
        chunks: [],
        claims: [],
        media: this.processMedia(rawContent.media),
        domain: this.extractDomain(rawContent.url),
        language: this.detectLanguage(rawContent.text),
        readability: this.calculateReadability(rawContent.text)
      };

      // Generate content chunks
      processedContent.chunks = this.createChunks(processedContent.text);
      
      // Extract and process claims
      processedContent.claims = this.extractClaims(processedContent.text);
      
      // Assign chunks to claims
      this.assignChunksToClaims(processedContent.claims, processedContent.chunks);

      console.log('Content processing complete:', {
        chunks: processedContent.chunks.length,
        claims: processedContent.claims.length,
        media: processedContent.media.length
      });

      return processedContent;
    } catch (error) {
      console.error('Error processing content:', error);
      throw error;
    }
  }

  /**
   * Clean and normalize text content
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters but keep punctuation
      .replace(/[^\w\s.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>]/g, '')
      // Normalize line breaks
      .replace(/\n+/g, ' ')
      // Remove HTML entities
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      // Remove URLs (will be extracted separately)
      .replace(/https?:\/\/[^\s]+/g, ' ')
      // Final cleanup
      .trim()
      .substring(0, 50000); // Limit to 50k characters
  }

  /**
   * Clean metadata object
   * @param {Object} metadata - Raw metadata
   * @returns {Object} Cleaned metadata
   */
  cleanMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const cleaned = {};
    const allowedKeys = [
      'description', 'keywords', 'author', 'og:title', 'og:description',
      'twitter:title', 'twitter:description', 'article:author',
      'article:published_time', 'article:modified_time'
    ];

    Object.entries(metadata).forEach(([key, value]) => {
      if (allowedKeys.includes(key) && value && typeof value === 'string') {
        cleaned[key] = value.trim().substring(0, 500);
      }
    });

    return cleaned;
  }

  /**
   * Process media content
   * @param {Array} media - Raw media array
   * @returns {Array} Processed media array
   */
  processMedia(media) {
    if (!Array.isArray(media)) {
      return [];
    }

    return media
      .filter(item => item && item.src)
      .map(item => ({
        type: item.type || 'unknown',
        src: item.src,
        alt: item.alt || '',
        title: item.title || '',
        width: item.width || 0,
        height: item.height || 0,
        domain: this.extractDomain(item.src),
        isExternal: this.isExternalDomain(item.src)
      }))
      .slice(0, 20); // Limit to 20 media items
  }

  /**
   * Create content chunks for processing
   * @param {string} text - Clean text content
   * @returns {Array} Array of text chunks
   */
  createChunks(text) {
    if (!text || text.length < this.minChunkSize) {
      return text ? [{ id: 0, text, start: 0, end: text.length }] : [];
    }

    const chunks = [];
    let chunkId = 0;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      
      // Try to break at sentence boundary
      const chunkText = this.findSentenceBoundary(text, start, end);
      const actualEnd = start + chunkText.length;

      chunks.push({
        id: chunkId++,
        text: chunkText,
        start,
        end: actualEnd,
        length: chunkText.length
      });

      // Move start position with overlap
      start = Math.max(actualEnd - this.overlapSize, start + 1);
      
      // Prevent infinite loop
      if (start >= text.length) break;
    }

    return chunks;
  }

  /**
   * Find sentence boundary for clean chunking
   * @param {string} text - Full text
   * @param {number} start - Start position
   * @param {number} end - End position
   * @returns {string} Text up to sentence boundary
   */
  findSentenceBoundary(text, start, end) {
    const chunkText = text.substring(start, end);
    
    // Look for sentence endings in the last 100 characters
    const searchText = chunkText.substring(Math.max(0, chunkText.length - 100));
    const sentenceEnd = searchText.search(/[.!?]\s/);
    
    if (sentenceEnd !== -1) {
      const actualEnd = start + chunkText.length - 100 + sentenceEnd + 1;
      return text.substring(start, actualEnd);
    }
    
    return chunkText;
  }

  /**
   * Extract claims from text content
   * @param {string} text - Clean text content
   * @returns {Array} Array of extracted claims
   */
  extractClaims(text) {
    if (!text || text.length < 100) {
      return [];
    }

    const claims = [];
    const claimPatterns = [
      // Factual statements
      {
        pattern: /(?:claim|says|stated|announced|reported|found|discovered|revealed|confirmed|proven)\s+(?:that\s+)?([^.!?]+[.!?])/gi,
        type: 'factual',
        confidence: 0.8
      },
      // Definitive statements
      {
        pattern: /([^.!?]+(?:is|are|was|were)\s+(?:true|false|fake|real|genuine|authentic|verified|confirmed)[^.!?]*[.!?])/gi,
        type: 'definitive',
        confidence: 0.9
      },
      // Attribution statements
      {
        pattern: /([^.!?]+(?:according\s+to|per|as\s+reported\s+by|sources\s+say|experts\s+believe)[^.!?]*[.!?])/gi,
        type: 'attributed',
        confidence: 0.7
      },
      // Statistical statements
      {
        pattern: /([^.!?]+(?:percent|percentage|%\s+of|million|billion|thousand)[^.!?]*[.!?])/gi,
        type: 'statistical',
        confidence: 0.8
      },
      // Temporal statements
      {
        pattern: /([^.!?]+(?:yesterday|today|tomorrow|last\s+week|next\s+month|in\s+\d{4})[^.!?]*[.!?])/gi,
        type: 'temporal',
        confidence: 0.7
      }
    ];

    claimPatterns.forEach(({ pattern, type, confidence }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const claimText = match[1] || match[0];
        if (this.isValidClaim(claimText)) {
          claims.push({
            id: claims.length,
            text: claimText.trim(),
            type,
            confidence: this.assessClaimConfidence(claimText, confidence),
            context: this.getClaimContext(claimText, text),
            start: match.index,
            end: match.index + claimText.length
          });
        }
      }
    });

    // Sort by confidence and limit to top claims
    return claims
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15);
  }

  /**
   * Validate if extracted text is a valid claim
   * @param {string} text - Claim text
   * @returns {boolean} Whether text is a valid claim
   */
  isValidClaim(text) {
    if (!text || text.length < 20 || text.length > 500) {
      return false;
    }

    // Must contain meaningful content
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 5) {
      return false;
    }

    // Must not be just punctuation or numbers
    const alphaContent = text.replace(/[^a-zA-Z]/g, '');
    if (alphaContent.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * Assess confidence level of a claim
   * @param {string} claim - Claim text
   * @param {number} baseConfidence - Base confidence for claim type
   * @returns {number} Confidence score (0-1)
   */
  assessClaimConfidence(claim, baseConfidence) {
    let confidence = baseConfidence;

    // Boost confidence for specific details
    if (/\d+/.test(claim)) confidence += 0.1;
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(claim)) confidence += 0.1; // Names
    if (/https?:\/\/|www\./.test(claim)) confidence += 0.1; // URLs
    if (/[A-Z]{2,}/.test(claim)) confidence += 0.05; // Acronyms

    // Reduce confidence for vague language
    if (/some|many|few|several|various|certain/.test(claim.toLowerCase())) confidence -= 0.1;
    if (/might|could|may|possibly|perhaps/.test(claim.toLowerCase())) confidence -= 0.2;
    if (/always|never|everyone|nobody/.test(claim.toLowerCase())) confidence -= 0.15;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get context around a claim
   * @param {string} claim - Claim text
   * @param {string} fullText - Full text content
   * @returns {string} Context text
   */
  getClaimContext(claim, fullText) {
    const index = fullText.indexOf(claim);
    if (index === -1) return '';

    const start = Math.max(0, index - 150);
    const end = Math.min(fullText.length, index + claim.length + 150);
    return fullText.substring(start, end);
  }

  /**
   * Assign chunks to claims for processing
   * @param {Array} claims - Array of claims
   * @param {Array} chunks - Array of chunks
   */
  assignChunksToClaims(claims, chunks) {
    claims.forEach(claim => {
      claim.chunks = chunks.filter(chunk => 
        chunk.start <= claim.end && chunk.end >= claim.start
      ).map(chunk => chunk.id);
    });
  }

  /**
   * Extract domain from URL
   * @param {string} url - URL string
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return '';
    }
  }

  /**
   * Check if domain is external
   * @param {string} url - URL string
   * @returns {boolean} Whether domain is external
   */
  isExternalDomain(url) {
    try {
      const urlObj = new URL(url);
      const currentDomain = window.location.hostname;
      return urlObj.hostname !== currentDomain;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect language of text content
   * @param {string} text - Text content
   * @returns {string} Language code
   */
  detectLanguage(text) {
    // Simple language detection based on common words
    const languages = {
      'en': ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'],
      'es': ['el', 'la', 'los', 'las', 'y', 'o', 'pero', 'en', 'con', 'por'],
      'fr': ['le', 'la', 'les', 'et', 'ou', 'mais', 'dans', 'avec', 'pour', 'de'],
      'de': ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'mit', 'für', 'von']
    };

    const words = text.toLowerCase().split(/\s+/);
    const scores = {};

    Object.entries(languages).forEach(([lang, commonWords]) => {
      scores[lang] = commonWords.filter(word => words.includes(word)).length;
    });

    const detectedLang = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    return scores[detectedLang] > 0 ? detectedLang : 'en';
  }

  /**
   * Calculate readability score
   * @param {string} text - Text content
   * @returns {Object} Readability metrics
   */
  calculateReadability(text) {
    if (!text) return { score: 0, level: 'unknown' };

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countSyllables(text);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    let level = 'unknown';
    if (fleschScore >= 90) level = 'very_easy';
    else if (fleschScore >= 80) level = 'easy';
    else if (fleschScore >= 70) level = 'fairly_easy';
    else if (fleschScore >= 60) level = 'standard';
    else if (fleschScore >= 50) level = 'fairly_difficult';
    else if (fleschScore >= 30) level = 'difficult';
    else if (fleschScore >= 0) level = 'very_difficult';

    return {
      score: Math.round(fleschScore),
      level,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
    };
  }

  /**
   * Count syllables in text
   * @param {string} text - Text content
   * @returns {number} Syllable count
   */
  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;

    words.forEach(word => {
      word = word.replace(/[^a-z]/g, '');
      if (word.length <= 3) {
        count += 1;
      } else {
        count += word.replace(/[^aeiouy]+/g, '').length;
        if (word.endsWith('e')) count -= 1;
        if (count === 0) count = 1;
      }
    });

    return count;
  }

  /**
   * Create data structure schema for verification
   * @returns {Object} Data structure schema
   */
  getDataSchema() {
    return {
      content: {
        url: 'string',
        title: 'string',
        timestamp: 'number',
        text: 'string',
        chunks: 'array',
        claims: 'array',
        media: 'array',
        metadata: 'object'
      },
      claim: {
        id: 'number',
        text: 'string',
        type: 'string',
        confidence: 'number',
        context: 'string',
        start: 'number',
        end: 'number',
        chunks: 'array'
      },
      chunk: {
        id: 'number',
        text: 'string',
        start: 'number',
        end: 'number',
        length: 'number'
      },
      media: {
        type: 'string',
        src: 'string',
        alt: 'string',
        title: 'string',
        domain: 'string',
        isExternal: 'boolean'
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentProcessor;
} else if (typeof window !== 'undefined') {
  window.ContentProcessor = ContentProcessor;
}
