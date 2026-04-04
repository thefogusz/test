const fs = require('fs');
const path = require('path');
const { DEFAULT_STATE_FILE } = require('./appStateStore.cjs');

const loadEnvFile = (rootDir) => {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};

const resolveStateStorageMode = (value) =>
  value === 'memory' ? 'memory' : 'file';

const loadServerConfig = (rootDir) => {
  loadEnvFile(rootDir);

  return {
    rootDir,
    port: parsePositiveInteger(process.env.PORT, 8000),
    upstreamTimeoutMs: parsePositiveInteger(process.env.UPSTREAM_TIMEOUT_MS, 120000),
    apiLogThresholdMs: parsePositiveInteger(process.env.API_LOG_THRESHOLD_MS, 250),
    twitterApiKey: process.env.TWITTER_API_KEY || '',
    xaiApiKey: process.env.XAI_API_KEY || '',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    internalApiSecret: process.env.INTERNAL_API_SECRET || '',
    stateStorageMode: resolveStateStorageMode(process.env.APP_STATE_STORAGE),
    stateStorageFile: process.env.APP_STATE_FILE
      ? path.resolve(rootDir, process.env.APP_STATE_FILE)
      : DEFAULT_STATE_FILE,
  };
};

module.exports = {
  loadServerConfig,
};
