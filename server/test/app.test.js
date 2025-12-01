const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createRequestHandler } = require('../app');

function createRequest({ method = 'POST', url = '/api/feedback', headers = {}, body = '' }) {
  const stream = new Readable({
    read() {
      this.push(body ? Buffer.from(body) : null);
      body = '';
    }
  });
  stream.method = method;
  stream.url = url;
  stream.headers = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return stream;
}

function createResponse() {
  const chunks = [];
  return {
    headers: {},
    statusCode: null,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      Object.entries(headers).forEach(([key, value]) => {
        this.headers[key.toLowerCase()] = value;
      });
    },
    end(chunk) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      this.body = Buffer.concat(chunks).toString('utf8');
      this.finished = true;
    }
  };
}

function buildHandler(overrides = {}) {
  const handler = createRequestHandler({
    config: { allowedOrigin: 'test-origin', ...overrides.config },
    tokenStore: overrides.tokenStore || {
      findByToken: (token) =>
        token === 'test-token' ? { id: 'school-1', label: 'School One' } : null
    },
    usageLogger: overrides.usageLogger || {
      log: async () => {}
    },
    openAIClient: overrides.openAIClient || {
      requestFeedback: async () => ({
        message: 'Stub feedback',
        usage: { total_tokens: 11 },
        status: 200
      })
    }
  });
  return handler;
}

test('rejects missing authorization header', async () => {
  const handler = buildHandler();
  const req = createRequest({
    body: JSON.stringify({ reflections: [{ response: 'hi' }] })
  });
  const res = createResponse();

  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.match(res.body, /Unauthorized/);
});

test('validates reflection payloads', async () => {
  const handler = buildHandler();
  const req = createRequest({
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({ reflections: [] })
  });
  const res = createResponse();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /Reflections array is required/);
});

test('returns AI feedback and logs usage', async () => {
  const logs = [];
  const handler = buildHandler({
    usageLogger: {
      log: async (entry) => {
        logs.push(entry);
      }
    },
    openAIClient: {
      requestFeedback: async () => ({
        message: 'Test feedback!',
        usage: { total_tokens: 99, prompt_tokens: 44, completion_tokens: 55 },
        status: 200
      })
    }
  });

  const req = createRequest({
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      reflections: [
        { question: 'Q1', response: 'Answer one' },
        { question: 'Q2', response: 'Answer two' }
      ],
      metadata: { questionSetId: 'demo' }
    })
  });
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.feedback, 'Test feedback!');
  assert.equal(payload.usage.total_tokens, 99);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].tokenId, 'school-1');
  assert.equal(logs[0].metadata.schoolId, 'school-1');
  assert.equal(logs[0].metadata.questionSetId, 'demo');
});

test('enforces maximum reflections count', async () => {
  const handler = buildHandler({
    config: { maxReflections: 1 }
  });
  const req = createRequest({
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      reflections: [
        { question: 'Q1', response: 'Answer one' },
        { question: 'Q2', response: 'Answer two' }
      ]
    })
  });
  const res = createResponse();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /Maximum allowed is 1/);
});

test('rejects responses shorter than configured minimum', async () => {
  const handler = buildHandler({
    config: { minResponseLength: 5 }
  });
  const req = createRequest({
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      reflections: [{ question: 'Q1', response: 'hey' }]
    })
  });
  const res = createResponse();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /at least 5 characters/);
});

test('rejects when total response length exceeds limit', async () => {
  const handler = buildHandler({
    config: { maxTotalResponseChars: 10, minResponseLength: 1 }
  });
  const req = createRequest({
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      reflections: [
        { question: 'Q1', response: '123456' },
        { question: 'Q2', response: '12345' }
      ]
    })
  });
  const res = createResponse();

  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /maximum total length of 10/);
});
