const GROK_43_MODEL = 'grok-4.3';
const GROK_420_MULTI_AGENT_MODEL = 'grok-4.20-multi-agent-0309';

export const MODEL_NEWS_FAST = GROK_43_MODEL;
export const MODEL_REASONING_FAST = GROK_43_MODEL;
export const MODEL_WRITER_FAST = GROK_43_MODEL;
export const MODEL_WRITER = GROK_43_MODEL;
export const MODEL_MULTI_AGENT = GROK_420_MULTI_AGENT_MODEL;

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

export const MODEL_WRITER_FAST_PROVIDER_OPTIONS = MODEL_NEWS_FAST_PROVIDER_OPTIONS;
export const MODEL_WRITER_PROVIDER_OPTIONS = MODEL_REASONING_FAST_PROVIDER_OPTIONS;
export const MODEL_MULTI_AGENT_PROVIDER_OPTIONS = {};

export const getGrokRequestHeaders = (providerOptions = MODEL_NEWS_FAST_PROVIDER_OPTIONS) => {
  const reasoningEffort = providerOptions?.xai?.reasoningEffort;
  return reasoningEffort
    ? { [GROK_REASONING_EFFORT_HEADER]: reasoningEffort }
    : {};
};
