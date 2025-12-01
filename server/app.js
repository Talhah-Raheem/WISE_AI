const http = require('node:http');
const { parse } = require('node:url');
const crypto = require('node:crypto');

function createServer(deps) {
  const handler = createRequestHandler(deps);
  return http.createServer(handler);
}

function createRequestHandler({
  config = {},
  tokenStore,
  usageLogger,
  openAIClient
}) {
  if (!tokenStore || typeof tokenStore.findByToken !== 'function') {
    throw new Error('tokenStore with findByToken(token) is required.');
  }

  if (!usageLogger || typeof usageLogger.log !== 'function') {
    throw new Error('usageLogger with log(entry) is required.');
  }

  if (!openAIClient || typeof openAIClient.requestFeedback !== 'function') {
    throw new Error('openAIClient with requestFeedback() is required.');
  }

  const cfg = {
    allowedOrigin: '*',
    maxBodySize: 1_000_000,
    maxResponseLength: 2000,
    minResponseLength: 10,
    maxReflections: 10,
    maxTotalResponseChars: 4000,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 45,
    systemPrompt:
      'You are a supportive reflection coach helping students analyze their work using the WISE framework. Provide concise, actionable feedback that encourages deeper thinking.',
    ...config
  };

  const rateLimiter = new Map();

  return async function requestHandler(req, res) {
    try {
      handleCors(res, cfg.allowedOrigin);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      const { pathname } = parse(req.url || '');

      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(res, 200, { status: 'ok' }, cfg.allowedOrigin);
      }

      if (req.method === 'POST' && pathname === '/api/feedback') {
        return await handleFeedback(req, res);
      }

      sendJson(res, 404, { error: 'Not found' }, cfg.allowedOrigin);
    } catch (error) {
      console.error('Unexpected server error', error);
      sendJson(res, 500, { error: 'Internal server error' }, cfg.allowedOrigin);
    }
  };

  async function handleFeedback(req, res) {
    const authHeader = req.headers['authorization'] || '';
    const token = extractToken(authHeader);
    const tokenMeta = token ? tokenStore.findByToken(token) : null;

    if (!tokenMeta) {
      return sendJson(res, 401, { error: 'Unauthorized' }, cfg.allowedOrigin);
    }

    if (isRateLimited(token)) {
      return sendJson(
        res,
        429,
        { error: 'Too many requests. Please slow down.' },
        cfg.allowedOrigin
      );
    }

    let payload;
    try {
      payload = await readJsonBody(req, cfg.maxBodySize);
    } catch (error) {
      return sendJson(
        res,
        error.statusCode || 400,
        { error: error.message },
        cfg.allowedOrigin
      );
    }

    const { reflections, metadata = {} } = payload || {};
    const combinedMetadata = {
      ...metadata,
      schoolId: tokenMeta.id,
      schoolLabel: tokenMeta.label
    };

    if (!Array.isArray(reflections) || reflections.length === 0) {
      return sendJson(
        res,
        400,
        { error: 'Reflections array is required.' },
        cfg.allowedOrigin
      );
    }

    if (reflections.length > cfg.maxReflections) {
      return sendJson(
        res,
        400,
        {
          error: `Too many reflections. Maximum allowed is ${cfg.maxReflections}.`
        },
        cfg.allowedOrigin
      );
    }

    let normalized;
    try {
      normalized = reflections.map((entry, index) =>
        normalizeReflection({
          entry,
          index,
          minLength: cfg.minResponseLength,
          maxLength: cfg.maxResponseLength
        })
      );
    } catch (error) {
      return sendJson(
        res,
        error.statusCode || 400,
        { error: error.message },
        cfg.allowedOrigin
      );
    }

    const totalChars = normalized.reduce(
      (sum, entry) => sum + entry.response.length,
      0
    );

    if (totalChars > cfg.maxTotalResponseChars) {
      return sendJson(
        res,
        400,
        {
          error: `Responses exceed the maximum total length of ${cfg.maxTotalResponseChars} characters.`
        },
        cfg.allowedOrigin
      );
    }

    const systemPrompt = metadata.systemPrompt || cfg.systemPrompt;
    const userContent = buildUserContent(normalized);

    let openAiData;
    try {
      openAiData = await openAIClient.requestFeedback({
        systemPrompt,
        userContent
      });
    } catch (error) {
      console.error('OpenAI request failed:', error.message);
      await usageLogger.log({
        tokenId: tokenMeta.id,
        tokenHash: hashToken(token),
        metadata: combinedMetadata,
        reflections: normalized,
        openaiStatus: 'failed',
        error: error.message,
        totalChars
      });

      return sendJson(
        res,
        502,
        { error: 'Failed to fetch AI feedback.' },
        cfg.allowedOrigin
      );
    }

    await usageLogger.log({
      tokenId: tokenMeta.id,
      tokenHash: hashToken(token),
      metadata: combinedMetadata,
      reflections: normalized,
      openaiStatus: openAiData.status || 200,
      usage: openAiData.usage,
      totalChars
    });

    return sendJson(
      res,
      200,
      {
        feedback: openAiData.message,
        usage: openAiData.usage
      },
      cfg.allowedOrigin
    );
  }

  function isRateLimited(token) {
    const now = Date.now();
    const entry =
      rateLimiter.get(token) || {
        count: 0,
        reset: now + cfg.rateLimitWindowMs
      };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + cfg.rateLimitWindowMs;
    }

    entry.count += 1;
    rateLimiter.set(token, entry);
    return entry.count > cfg.rateLimitMaxRequests;
  }
}

function normalizeReflection({ entry, index, minLength, maxLength }) {
  const question =
    typeof entry?.question === 'string'
      ? entry.question.trim()
      : `Question ${index + 1}`;
  const response =
    typeof entry?.response === 'string' ? entry.response.trim() : '';

  if (!response) {
    throw new HttpError(400, `Reflection ${index + 1} is empty.`);
  }

  if (response.length < minLength) {
    throw new HttpError(
      400,
      `Reflection ${index + 1} must be at least ${minLength} characters.`
    );
  }

  if (response.length > maxLength) {
    throw new HttpError(
      400,
      `Reflection ${index + 1} exceeds ${maxLength} characters.`
    );
  }

  return { question, response };
}

function buildUserContent(reflections) {
  const parts = reflections.map(
    (entry, index) => `${index + 1}. ${entry.question}\n${entry.response}`
  );
  return parts.join('\n\n');
}

async function readJsonBody(req, maxBodySize) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of req) {
    totalLength += chunk.length;
    if (totalLength > maxBodySize) {
      throw new HttpError(413, 'Payload too large.');
    }
    chunks.push(chunk);
  }

  try {
    const raw = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(raw || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON payload.');
  }
}

function extractToken(header) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.trim().split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

function sendJson(res, statusCode, payload, allowedOrigin) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  });
  res.end(JSON.stringify(payload));
}

function handleCors(res, allowedOrigin) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = {
  createServer,
  createRequestHandler,
  normalizeReflection,
  buildUserContent,
  readJsonBody,
  extractToken,
  hashToken,
  HttpError
};
