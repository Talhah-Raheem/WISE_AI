# WISE AI Reflect - Development Changelog

## Roadmap Overview

### Phase 1: Security Hardening (Current)
- Lock down CORS to Chrome extensions only
- Remove hardcoded tokens from source
- Add security headers
- Create token distribution system

### Phase 2: Question Refinement
- Update 4 core WISE questions based on mentor feedback
- Make questions more reflective about AI usage ethics

### Phase 3: Google Classroom Integration
- Auto-trigger reflections on assignment submission
- Link reflections to specific assignments
- Server-side data storage

### Phase 4: Teacher Portal
- Web dashboard for viewing student reflections
- Question customization interface
- Student/classroom management
- Analytics view

---

## Change Log

### 2026-01-06 - Security Hardening Branch Created
**Branch**: `security/pre-pilot-hardening`
**Status**: Completed

**Changes**:
- [x] CORS restricted to chrome-extension://*
- [x] Token removed from config.js
- [x] Token loading from chrome.storage.sync implemented
- [x] Security headers added to server responses
- [x] Token installation script created

**Files Modified**:
- `server/.env` - Changed CORS_ORIGIN from `*` to `chrome-extension://*`
- `config.js` - Removed hardcoded EXTENSION_CLIENT_TOKEN constant
- `popup.js` - Added getClientToken() function and updated handleAI() to load token from chrome.storage.sync
- `server/app.js` - Added security headers to sendJson() and handleCors() functions

**Files Created**:
- `install-token.js` - Helper script for distributing tokens to pilot classrooms
- `changes.md` - This changelog file

**Testing**:
- [x] Backend tests pass (6/6 tests passing)
- [ ] Extension loads successfully (requires manual testing)
- [ ] Reflection submission works end-to-end (requires manual testing with token installed)
- [ ] CORS blocks external requests (requires manual testing)

**Security Improvements**:
1. **CORS Protection**: Only Chrome extensions can call the API (prevents website-based attacks)
2. **Token Security**: Token no longer hardcoded in source code (prevents extraction from extension bundle)
3. **Defense-in-Depth Headers**: Added X-Frame-Options, X-Content-Type-Options, CSP, etc.

**Manual Testing Required**:
To test the extension after these changes:
1. Load the extension in Chrome
2. Open DevTools (F12) on the extension popup
3. Install token: `chrome.storage.sync.set({ clientToken: 'fecc8b6a0444a09b8f95c719624e33757a41784e4ff77cc1e18d7798f831de6a' }, () => console.log('Token set'))`
4. Close and reopen extension
5. Submit a reflection to test end-to-end flow

---

<!-- Future entries go here with timestamp -->
