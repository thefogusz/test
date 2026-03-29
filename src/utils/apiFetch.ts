interface ApiFetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * apiFetch — A thin wrapper around fetch() that automatically attaches
 * the internal API token to all requests going through /api/*.
 *
 * The token is read from import.meta.env.VITE_INTERNAL_API_SECRET which
 * is the ONE AND ONLY VITE_ variable allowed — it is NOT a secret key,
 * just a simple shared token to prevent anonymous abuse of the proxy.
 * Real API keys (XAI, Twitter, Tavily) are NOT prefixed with VITE_.
 */

export const INTERNAL_TOKEN = import.meta.env.VITE_INTERNAL_API_SECRET ?? '';

const DEFAULT_TIMEOUT_MS = 90000; // 90 seconds

export const apiFetch = (url: RequestInfo | URL, options: ApiFetchOptions = {}) => {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers = {
    ...(fetchOptions.headers || {}),
    ...(INTERNAL_TOKEN ? { 'x-internal-token': INTERNAL_TOKEN } : {}),
  };

  return fetch(url, { 
    ...fetchOptions, 
    headers,
    signal: fetchOptions.signal || controller.signal 
  }).finally(() => clearTimeout(id));
};
