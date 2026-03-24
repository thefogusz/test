/**
 * apiFetch — A thin wrapper around fetch() that automatically attaches
 * the internal API token to all requests going through /api/*.
 *
 * The token is read from import.meta.env.VITE_INTERNAL_API_SECRET which
 * is the ONE AND ONLY VITE_ variable allowed — it is NOT a secret key,
 * just a simple shared token to prevent anonymous abuse of the proxy.
 * Real API keys (XAI, Twitter, Tavily) are NOT prefixed with VITE_.
 */

const INTERNAL_TOKEN = import.meta.env.VITE_INTERNAL_API_SECRET ?? '';

export const apiFetch = (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
    ...(INTERNAL_TOKEN ? { 'x-internal-token': INTERNAL_TOKEN } : {}),
  };

  return fetch(url, { ...options, headers });
};
