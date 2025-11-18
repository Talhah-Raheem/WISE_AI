# WISE Reflect

WISE Reflect is a Chrome extension that guides students through the WISE reflection framework and delivers AI-generated feedback. The extension stores answers locally, walks students through each question step-by-step, and requests feedback from a secure backend proxy so OpenAI API keys stay on the server.

## What is in this repo?
- `manifest.json`, `popup.html`, `popup.js`, `icon.png`: the Chrome extension UI/logic.
- `config.js`: extension configuration (backend URL + issued client token). This file stays out of git history by default so you can point different builds to different backends.
- `server/`: lightweight Node.js backend that accepts reflection payloads, authenticates via per-school tokens, forwards requests to OpenAI, and records anonymized usage stats in SQLite. See `server/README.md` for all backend details.

## Using the extension
1. Set `BACKEND_API_URL` and `EXTENSION_CLIENT_TOKEN` inside `config.js` to match your deployed backend.
2. Load the extension in Chrome via **chrome://extensions** → enable Developer Mode → **Load unpacked** → select this repository folder.
3. Open the extension popup, answer the reflection prompts, and hit **Get AI Feedback**. The extension saves entries to `chrome.storage.local` so you can navigate between questions.

## Running the backend locally
1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `OPENAI_API_KEY`
   - `TOKENS_FILE` (point to a JSON array of issued tokens)
   - optional values like `SQLITE_DB_PATH`, `CORS_ORIGIN`, rate limits.
3. Create `tokens.json` (follow `tokens.example.json`) and hand each school/device a unique token.
4. `npm start` to boot the proxy on the configured `PORT`.
5. `npm test` to run the Node test suite that validates authorization, payload handling, and logging behavior.

## Typical deployment flow
1. Deploy the backend (Render, Fly, school infrastructure, etc.) and secure it with issued tokens + HTTPS.
2. For each school/class, distribute a Chrome extension build whose `config.js` references that backend URL and embeds their token.
3. Use the SQLite logs (or replicate them to your analytics stack) to monitor adoption, token consumption, and error rates.

## Roadmap ideas
- Teacher dashboards that summarize common reflection themes.
- Admin tooling to rotate tokens and export usage.
- Additional prompt templates and persona toggles for different subjects.
