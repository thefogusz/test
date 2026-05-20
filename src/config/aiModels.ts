const GROK_43_MODEL = 'grok-4.3';

export const MODEL_NEWS_FAST = GROK_43_MODEL;
export const MODEL_REASONING_FAST = GROK_43_MODEL;
export const MODEL_WRITER = GROK_43_MODEL;
export const MODEL_MULTI_AGENT = GROK_43_MODEL;

export const GROK_REASONING_EFFORT_HEADER = 'x-foro-grok-reasoning-effort';

export const MODEL_NEWS_FAST_PROVIDER_OPTIONS = {
  xai: {
    reasoningEffort: 'none',
  },
};

export const MODEL_REASONING_FAST_PROVIDER_OPTIONS = {
  xai: {
    reasoningEffort: 'low',
  },
};

export const MODEL_WRITER_PROVIDER_OPTIONS = MODEL_REASONING_FAST_PROVIDER_OPTIONS;
export const MODEL_MULTI_AGENT_PROVIDER_OPTIONS = MODEL_REASONING_FAST_PROVIDER_OPTIONS;

export const getGrokRequestHeaders = (providerOptions = MODEL_NEWS_FAST_PROVIDER_OPTIONS) => {
  const reasoningEffort = providerOptions?.xai?.reasoningEffort;
  return reasoningEffort
    ? { [GROK_REASONING_EFFORT_HEADER]: reasoningEffort }
    : {};
};
