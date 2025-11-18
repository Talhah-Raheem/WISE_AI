const fs = require('node:fs');
const path = require('node:path');

function loadTokensFromFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Token file not found at ${resolved}. Create one based on tokens.example.json.`
    );
  }

  const content = fs.readFileSync(resolved, 'utf8').trim();
  if (!content) {
    throw new Error('Token file is empty.');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse tokens file: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Tokens file must contain an array of entries.');
  }

  return parsed;
}

function createTokenStore(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('At least one token must be configured.');
  }

  const tokenMap = new Map();

  records.forEach((record, index) => {
    const token = record?.token;
    const id = record?.id || `token-${index + 1}`;
    const label = record?.label || id;

    if (!token || typeof token !== 'string') {
      throw new Error(`Token missing or invalid for record index ${index}.`);
    }

    if (tokenMap.has(token)) {
      throw new Error(`Duplicate token detected for id ${id}.`);
    }

    tokenMap.set(token, { id, label });
  });

  return {
    findByToken: (token) => tokenMap.get(token) || null,
    count: () => tokenMap.size
  };
}

module.exports = {
  loadTokensFromFile,
  createTokenStore
};
