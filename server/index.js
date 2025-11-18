const fs = require('node:fs');
const path = require('node:path');
const {
  createServer
} = require('./app');
const {
  loadTokensFromFile,
  createTokenStore
} = require('./tokenStore');
const {
  createUsageLogger
} = require('./usageLogger');

loadEnvFile();

const PORT = Number(process.env.PORT || 4000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TOKENS_FILE =
  process.env.TOKENS_FILE || path.join(__dirname, 'tokens.json');
const SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'usage.sqlite');
const allowedOrigin = process.env.CORS_ORIGIN || '*';

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  process.exit(1);
}

let tokenRecords;
try {
  tokenRecords = loadTokensFromFile(TOKENS_FILE);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const tokenStore = createTokenStore(tokenRecords);
const usageLogger = createUsageLogger(SQLITE_DB_PATH);

const openAIClient = {
  async requestFeedback({ systemPrompt, userContent }) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'No feedback available.';
    return { message, usage: data.usage, status: response.status };
  }
};

const server = createServer({
  config: {
    allowedOrigin,
    systemPrompt: process.env.SYSTEM_PROMPT,
    maxResponseLength: Number(process.env.MAX_RESPONSE_LENGTH || 2000),
    rateLimitWindowMs: Number(
      process.env.RATE_LIMIT_WINDOW_MS || 60_000
    ),
    rateLimitMaxRequests: Number(
      process.env.RATE_LIMIT_MAX_REQUESTS || 45
    )
  },
  tokenStore,
  usageLogger,
  openAIClient
});

server.listen(PORT, () => {
  console.log(
    `WISE AI backend listening on port ${PORT} for ${tokenStore.count()} client token(s).`
  );
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    usageLogger.close();
    process.exit(0);
  });
});

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}
