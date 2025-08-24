# 🚀 Quick Setup Guide - Content Verifier Extension

## ⚡ Immediate Setup (5 minutes)

### 1. Load Extension in Browser
1. Open Chrome/Edge and go to `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `dist/` folder from this project
5. Extension should appear in your extensions list

### 2. Test the Extension
1. **Open the test page**: `test-page.html` (double-click to open in browser)
2. **Look for the extension icon** in your browser toolbar
3. **Click the extension icon** to see the popup
4. **Watch for verification badges** to appear on the page
5. **Check the sidebar** that slides in from the right

## 🔧 What You Should See

### Extension Popup
- Status indicator showing "Ready to verify"
- Toggle switches for settings
- Verify Now button
- Current page URL display

### Content Script Behavior
- **Loading indicator**: "🔍 Verifying content..." appears
- **Verification badges**: Small colored badges near claims
- **Sidebar**: Slides in from right with verification results
- **Page badge**: Overall verification status at top-left

### Test Page Features
- 8 different types of claims (factual, misleading, false)
- 3 media items (images)
- Dynamic content loading after 3 seconds
- Structured data for testing

## 🚨 Troubleshooting

### Extension Not Loading?
- Check browser console for errors
- Verify all files are in `dist/` folder
- Try refreshing the extensions page

### No Badges Appearing?
- Check if content script is running (console logs)
- Verify page has claims (use test-page.html)
- Check CSS file loading

### API Errors?
- Extension works offline for testing
- Backend integration is optional for demo
- Check console for network errors

## 📱 Testing on Real Websites

### Good Test Sites
1. **News Sites**: CNN, BBC, Reuters
2. **Blogs**: Medium, WordPress sites
3. **Social Media**: Twitter threads, Facebook posts
4. **E-commerce**: Product descriptions

### What to Look For
- Claims being detected automatically
- Verification badges appearing
- Sidebar showing results
- Settings working in popup

## 🎯 Demo Mode Features

### Content Processing
- **Text Extraction**: Automatically finds main content
- **Claim Detection**: Identifies factual statements
- **Media Analysis**: Processes images and videos
- **Metadata Extraction**: Gets page information

### User Interface
- **Inline Badges**: Show verification status near claims
- **Sidebar Panel**: Comprehensive verification overview
- **Popup Controls**: Extension settings and status
- **Responsive Design**: Works on all screen sizes

### Smart Features
- **DOM Monitoring**: Detects dynamic content changes
- **SPA Support**: Works with single-page applications
- **Batch Processing**: Handles multiple verification requests
- **Error Handling**: Graceful fallbacks and user feedback

## 🔮 Next Steps

### For Development
1. Install Node.js and npm
2. Run `npm install` to get dependencies
3. Use `npm run dev` for development builds
4. Modify source files in `src/` directory

### For Production
1. Set up backend API endpoint
2. Configure API keys and authentication
3. Deploy verification service
4. Test on multiple websites

### For Customization
1. Modify claim detection patterns
2. Adjust UI styling in CSS files
3. Add new verification sources
4. Implement custom badge designs

## 📞 Need Help?

- Check browser console for error messages
- Review the README.md for detailed documentation
- Test with the provided test-page.html
- Verify extension permissions are correct

---

**🎉 You're all set! The extension should now be working and ready to verify content on any webpage.**
