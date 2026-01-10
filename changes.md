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

### 2026-01-08 - Question Refinement (Phase 2)
**Branch**: `security/pre-pilot-hardening`
**Status**: Completed

**Changes**:
- [x] Updated 4 reflection questions to focus on AI usage ethics
- [x] Questions now emphasize honest use, learning engagement, and metacognition

**Files Modified**:
- `popup.js` - Updated questions array (lines 78-83)

**Old Questions (Generic)**:
1. What is the purpose of this task?
2. How did you arrive at your solution?
3. What would you do differently?
4. What did you learn from this process?

**New Questions (AI-Focused)**:
1. Describe how you used AI, and whether it was honest and fair
2. Did AI help you learn, or did it do the work for you?
3. How did AI impact your experience with this assignment?
4. What did you learn from working with AI on this task?

**Rationale**:
Based on mentor feedback (context.txt lines 207-211), questions should promote student-led reflection on AI usage ethics rather than generic task reflection. New questions encourage critical thinking about honest use, engagement, wellbeing, and learning.

**Testing**:
- [ ] Extension loads successfully
- [ ] All 4 questions display correctly
- [ ] Character validation still works (10-1000 chars)
- [ ] Reflection submission works end-to-end
- [ ] AI feedback references new question content

---

<!-- Future entries go here with timestamp -->
