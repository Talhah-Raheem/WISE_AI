const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function createUsageLogger(dbPath) {
  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      token_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      total_chars INTEGER NOT NULL,
      openai_status TEXT NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      total_tokens INTEGER,
      metadata_json TEXT,
      error_text TEXT
    )
  `);

  const insertStmt = db.prepare(`
    INSERT INTO usage_logs (
      timestamp,
      token_id,
      token_hash,
      question_count,
      total_chars,
      openai_status,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      metadata_json,
      error_text
    )
    VALUES (
      @timestamp,
      @token_id,
      @token_hash,
      @question_count,
      @total_chars,
      @openai_status,
      @prompt_tokens,
      @completion_tokens,
      @total_tokens,
      @metadata_json,
      @error_text
    )
  `);

  return {
    log(entry) {
      const metadataJson = JSON.stringify(entry.metadata || {});
      const usage = entry.usage || {};
      insertStmt.run({
        timestamp: entry.timestamp || new Date().toISOString(),
        token_id: entry.tokenId,
        token_hash: entry.tokenHash,
        question_count: entry.questionCount ?? entry.reflections?.length ?? 0,
        total_chars: entry.totalChars || 0,
        openai_status: String(entry.openaiStatus ?? ''),
        prompt_tokens: usage.prompt_tokens ?? null,
        completion_tokens: usage.completion_tokens ?? null,
        total_tokens: usage.total_tokens ?? null,
        metadata_json: metadataJson,
        error_text: entry.error || null
      });
      return Promise.resolve();
    },
    close() {
      db.close();
    }
  };
}

module.exports = {
  createUsageLogger
};
