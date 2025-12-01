# WISE AI Backend

A lightweight Node.js service that proxies the browser extension's reflection requests to OpenAI. It keeps the API key on the server, enforces per-school tokens, rate-limits clients, and records anonymized usage analytics in SQLite for administrators to review.

## Features
- `POST /api/feedback` endpoint validates submissions and forwards them to OpenAI's Chat Completions API.
- Multi-tenant Authorization via `Authorization: Bearer <token>`; issue unique secrets per school, class, or device.
- Configurable rate limiting (default 45 requests/min/token).
- Usage analytics stored in `SQLite` (`server/data/usage.sqlite`) with timestamps, hashed token IDs, question counts, and OpenAI token usage.
- `GET /health` endpoint for uptime checks.
- Written with zero external web frameworks so it runs anywhere Node 18+ is available.

## Setup
1. Install dependencies and copy the environment template:
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```
   Fill in:
   - `OPENAI_API_KEY`: real key that never leaves the server.
   - `TOKENS_FILE`: location of your `tokens.json` (defaults to `./tokens.json`).
   - `SQLITE_DB_PATH`, `CORS_ORIGIN`, rate-limit overrides, and validation bounds (`MAX_RESPONSE_LENGTH`, `MIN_RESPONSE_LENGTH`, `MAX_TOTAL_RESPONSE_CHARS`, `MAX_REFLECTIONS`) as needed.

2. Create `tokens.json` from the example and add one entry per school/device:
   ```json
   [
     { "id": "sunnyside-hs", "label": "Sunnyside High", "token": "paste-generated-secret" }
   ]
   ```
   Generate tokens with something like `openssl rand -hex 32`. This file is `.gitignored`; keep it safe.

3. Start the server:
   ```bash
   npm start
   ```
   The backend binds to `PORT` (default `4000`), initializes the SQLite database, and begins accepting requests.

## API Contract
`POST /api/feedback`
```json
{
  "reflections": [
    { "question": "What is the purpose of this task?", "response": "..." },
    { "question": "How did you arrive at your solution?", "response": "..." }
  ],
  "metadata": {
    "questionSetId": "wise-default-stepper",
    "studentId": "optional",
    "classId": "optional",
    "systemPrompt": "optional custom system message"
  }
}
```

Response:
```json
{
  "feedback": "Concise AI guidance...",
  "usage": {
    "total_tokens": 123,
    "prompt_tokens": 89,
    "completion_tokens": 34
  }
}
```

Errors follow `{ "error": "message" }` with HTTP codes `400` (validation), `401` (auth), `429` (rate limiting), or `502` (OpenAI failure).

## Logs & Analytics
- Every request inserts a row into `server/data/usage.sqlite` with hashed token identifiers—no raw student text is stored.
- Query data using any SQLite client, e.g.:
  ```bash
  sqlite3 data/usage.sqlite 'SELECT token_id, COUNT(*) AS calls FROM usage_logs GROUP BY token_id;'
  ```
- Because each school uses its own bearer token, admins can analyze adoption per campus or class.

## Testing
- Run the automated suite (uses Node's built-in test runner):
  ```bash
  npm test
  ```
- Tests cover authorization, validation, and the happy path with mocked OpenAI/usage logging.

## Extension Integration
- `config.js` now exposes `BACKEND_API_URL` and `EXTENSION_CLIENT_TOKEN`. Assign each deployment a token from `tokens.json`.
- `popup.js` submits the student's saved reflections to this backend instead of calling OpenAI directly, so the API key never ships with the extension bundle.

## Configuration notes
- Validation limits are configurable:
  - `MAX_RESPONSE_LENGTH`, `MIN_RESPONSE_LENGTH`: per-answer length bounds.
  - `MAX_TOTAL_RESPONSE_CHARS`: cap on combined answer length per request.
  - `MAX_REFLECTIONS`: maximum number of answers per request.
- Other knobs: rate limits (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`) and CORS origin (`CORS_ORIGIN`).
