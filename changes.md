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
**Status**: In Progress

**Changes**:
- [ ] CORS restricted to chrome-extension://*
- [ ] Token removed from config.js
- [ ] Token loading from chrome.storage.sync implemented
- [ ] Security headers added to server responses
- [ ] Token installation script created

**Files Modified**:
- `server/.env`
- `config.js`
- `popup.js`
- `server/app.js`

**Files Created**:
- `install-token.js`
- `changes.md`

**Testing**:
- [ ] Backend tests pass
- [ ] Extension loads successfully
- [ ] Reflection submission works end-to-end
- [ ] CORS blocks external requests

---

<!-- Future entries go here with timestamp -->
