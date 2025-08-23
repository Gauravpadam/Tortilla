# Content Verifier Extension

A browser extension that automatically verifies claims and content on webpages using AI and fact-checking APIs. Built for the hackathon project to make the web more trustworthy.

## 🎯 Project Overview

This extension implements the sequence diagram architecture for content verification:

1. **Content Extraction**: Monitors webpages and extracts text, claims, and media
2. **AI Processing**: Sends content to backend for verification using multiple knowledge sources
3. **Result Display**: Shows verification badges, risk scores, and explanations inline
4. **User Reporting**: Allows users to report suspicious content

## 🏗️ Architecture

```
User → Browser Content Script → Background Service Worker → Agent Backend → Verification Hub → Knowledge Sources
                ↓
        Inline Badges + Sidebar ← UI Renderer ← Verdict Fuser
```

## 📋 Weekly Milestones

### Week 1: Foundation ✅
- [x] Extension boilerplate setup
- [x] Basic content script implementation
- [x] DOM extraction and monitoring
- [x] Background service worker
- [x] Popup interface

### Week 2: Data Pipeline ✅
- [x] Content cleaning functions
- [x] Chunking algorithm
- [x] Data structure schema
- [x] Claim extraction patterns
- [x] Media processing

### Week 3: Integration ✅
- [x] Agent API connection
- [x] Batch processing
- [x] API response handling
- [x] Verification service
- [x] Result processing

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Chrome/Edge browser
- Backend API endpoint (optional for testing)

### 1. Install Dependencies
```bash
cd content-verifier-extension
npm install
```

### 2. Build Extension
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### 3. Load Extension in Browser
1. Open Chrome/Edge and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder from the build output

### 4. Configure API Endpoint (Optional)
1. Click the extension icon
2. Go to settings
3. Update the API endpoint URL
4. Add API key if required

## 🧪 Testing

### Test on 3 Websites
The extension is designed to work on various website types:

1. **News Sites**: CNN, BBC, Reuters
2. **Blog Platforms**: Medium, WordPress sites
3. **Social Media**: Twitter, Facebook posts
4. **E-commerce**: Product descriptions and reviews

### Test Scenarios
- Load a webpage with claims
- Check if verification badges appear
- Verify sidebar functionality
- Test user reporting feature

## 🔧 Configuration

### Extension Settings
- **Auto-verify**: Automatically verify content on page load
- **Show Badges**: Display inline verification badges
- **Show Sidebar**: Enable verification results sidebar
- **API Endpoint**: Backend verification service URL

### Content Processing
- **Chunk Size**: 1000 characters per text chunk
- **Overlap**: 200 characters between chunks
- **Max Claims**: 15 claims per page
- **Max Media**: 20 media items per page

## 📁 Project Structure

```
content-verifier-extension/
├── manifest.json              # Extension manifest
├── package.json              # Dependencies and scripts
├── webpack.config.js         # Build configuration
├── src/
│   ├── extension/            # Extension components
│   │   ├── background.js     # Service worker
│   │   ├── content.js        # Content script
│   │   ├── popup.js          # Popup logic
│   │   ├── popup.html        # Popup interface
│   │   └── content.css       # Content styles
│   ├── backend/              # Backend integration
│   │   └── verificationService.js
│   └── shared/               # Shared utilities
│       └── contentProcessor.js
├── icons/                    # Extension icons
└── dist/                     # Build output
```

## 🔌 API Integration

### Backend API Endpoints
- `POST /api/verify` - Submit content for verification
- `POST /api/verify/report` - Submit user reports

### Request Format
```json
{
  "type": "CONTENT_VERIFICATION",
  "timestamp": 1234567890,
  "data": {
    "url": "https://example.com",
    "title": "Page Title",
    "claims": [...],
    "chunks": [...],
    "media": [...]
  }
}
```

### Response Format
```json
{
  "claims": [
    {
      "id": 0,
      "verdict": "TRUE",
      "confidence": 0.95,
      "explanation": "Verified by multiple sources",
      "sources": [...]
    }
  ],
  "domain": {
    "reputation": "TRUSTED",
    "riskFactors": []
  },
  "confidence": 0.85
}
```

## 🎨 Features

### Content Verification
- **Automatic Detection**: Identifies claims and statements
- **Pattern Recognition**: Uses regex patterns for claim extraction
- **Confidence Scoring**: Assesses claim reliability
- **Context Analysis**: Provides surrounding context

### User Interface
- **Inline Badges**: Verification results displayed near claims
- **Sidebar Panel**: Comprehensive verification overview
- **Risk Scoring**: 0-10 scale for overall page trustworthiness
- **Responsive Design**: Works on desktop and mobile

### Media Verification
- **Image Analysis**: Checks for manipulation and authenticity
- **Domain Verification**: Validates media source credibility
- **External Link Detection**: Identifies cross-domain content

## 🚨 Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check browser console for errors
   - Verify manifest.json syntax
   - Ensure all files are in correct locations

2. **Content not being extracted**
   - Check content script permissions
   - Verify DOM selectors in content.js
   - Check for JavaScript errors

3. **API communication failing**
   - Verify API endpoint URL
   - Check CORS settings on backend
   - Verify network connectivity

4. **Badges not displaying**
   - Check CSS file loading
   - Verify DOM manipulation code
   - Check z-index conflicts

### Debug Mode
Enable debug logging in the browser console:
```javascript
// In content script console
localStorage.setItem('debug', 'true');
```

## 🔮 Future Enhancements

### Phase 2 Features
- **Real-time Verification**: Live content monitoring
- **Fact-checking Integration**: Connect to Snopes, PolitiFact APIs
- **Machine Learning**: Improve claim detection accuracy
- **Community Features**: User ratings and comments

### Phase 3 Features
- **Multi-language Support**: International content verification
- **Advanced Media Analysis**: Deep fake detection
- **Browser Sync**: Cross-device verification history
- **API Marketplace**: Multiple verification providers

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit pull request with description

### Code Standards
- Use ES6+ features
- Follow consistent naming conventions
- Add JSDoc comments for functions
- Include error handling
- Write unit tests for new features

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Browser Extension APIs documentation
- Webpack and build tool ecosystem
- Content verification research community
- Hackathon organizers and mentors

## 📞 Support

For questions or issues:
- Create GitHub issue
- Check troubleshooting section
- Review browser console logs
- Test on different websites

---

**Built with ❤️ for the hackathon project**
