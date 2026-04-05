interface ApiFetchOptions extends RequestInit {
  timeout?: number;
  abortSignal?: AbortSignal;
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

const mergeAbortSignals = (
  primarySignal: AbortSignal,
  secondarySignal?: AbortSignal,
) => {
  if (!secondarySignal) return primarySignal;
  if (secondarySignal.aborted) return secondarySignal;

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();

  primarySignal.addEventListener('abort', forwardAbort, { once: true });
  secondarySignal.addEventListener('abort', forwardAbort, { once: true });

  return controller.signal;
};

export const apiFetch = (url: RequestInfo | URL, options: ApiFetchOptions = {}) => {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    abortSignal,
    signal: requestSignal,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers = {
    ...(fetchOptions.headers || {}),
    ...(INTERNAL_TOKEN ? { 'x-internal-token': INTERNAL_TOKEN } : {}),
  };

  return fetch(url, { 
    ...fetchOptions, 
    headers,
    signal: mergeAbortSignals(controller.signal, requestSignal || abortSignal),
  }).finally(() => clearTimeout(id));
};
