type NormalizeSafeExternalUrlOptions = {
  allowProtocolRelative?: boolean;
};

export const normalizeSafeExternalUrl = (
  value = '',
  { allowProtocolRelative = true }: NormalizeSafeExternalUrlOptions = {},
) => {
  const source = String(value || '').trim();
  if (!source) return '';

  const candidate =
    allowProtocolRelative && source.startsWith('//') ? `https:${source}` : source;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

export const isSafeExternalUrl = (value = '') => Boolean(normalizeSafeExternalUrl(value));
