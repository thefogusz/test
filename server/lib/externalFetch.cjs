const dns = require('node:dns');
const net = require('node:net');
const { Agent } = require('undici');

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createInvalidUrlError = (label) => createHttpError(`Invalid ${label}`, 400);

const normalizeHostname = (hostname) =>
  String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/%.*$/, '')
    .replace(/\.$/, '');

const parseIpv4Address = (value) => {
  const parts = String(value || '').split('.');
  if (parts.length !== 4) return null;
  if (parts.some((part) => !/^\d+$/.test(part))) return null;

  const bytes = parts.map((part) => Number(part));
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return null;
  }

  return bytes;
};

const isBlockedIpv4Address = (value) => {
  const bytes = parseIpv4Address(value);
  if (!bytes) return false;
  const [first, second, third] = bytes;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
};

const parseIpv4MappedIpv6Address = (value) => {
  const normalized = normalizeHostname(value);
  if (!normalized.startsWith('::ffff:')) return null;

  const tail = normalized.slice('::ffff:'.length);
  if (tail.includes('.')) return tail;

  const parts = tail.split(':');
  if (parts.length !== 2) return null;

  const high = Number.parseInt(parts[0], 16);
  const low = Number.parseInt(parts[1], 16);
  if (
    !Number.isInteger(high) ||
    !Number.isInteger(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return null;
  }

  return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
};

const isBlockedIpv6Address = (value) => {
  const normalized = normalizeHostname(value);
  const mappedIpv4 = parseIpv4MappedIpv6Address(normalized);
  if (mappedIpv4) return isBlockedIpv4Address(mappedIpv4);

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  );
};

const isBlockedExternalHostname = (hostname) => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;

  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) return isBlockedIpv4Address(normalized);
  if (ipVersion === 6) return isBlockedIpv6Address(normalized);

  return false;
};

const normalizeExternalUrl = (value, label = 'url') => {
  const normalized = String(value || '').trim();

  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
    if (isBlockedExternalHostname(parsed.hostname)) {
      throw new Error('Blocked host');
    }

    return parsed.toString();
  } catch {
    throw createInvalidUrlError(label);
  }
};

const resolveHostname = async (hostname, dnsLookup) => {
  const lookup = dnsLookup || dns.promises.lookup;
  const result = await lookup(hostname, { all: true, verbatim: true });
  return Array.isArray(result) ? result : [result];
};

const getPublicHostnameRecords = async (hostname, label, dnsLookup) => {
  const normalized = normalizeHostname(hostname);
  if (!normalized || isBlockedExternalHostname(normalized)) {
    throw createInvalidUrlError(label);
  }

  const ipVersion = net.isIP(normalized);
  if (ipVersion) return [{ address: normalized, family: ipVersion }];

  let records;
  try {
    records = await resolveHostname(normalized, dnsLookup);
  } catch {
    throw createHttpError('Failed to resolve upstream host', 502);
  }

  if (!records.length || records.some((record) => isBlockedExternalHostname(record.address))) {
    throw createInvalidUrlError(label);
  }

  return records;
};

const assertResolvedHostnameIsPublic = async (url, label, dnsLookup) => {
  const parsed = new URL(url);
  await getPublicHostnameRecords(parsed.hostname, label, dnsLookup);
};

const createSafeFetchDispatcher = ({ label, dnsLookup }) =>
  new Agent({
    connect: {
      lookup(hostname, options, callback) {
        getPublicHostnameRecords(hostname, label, dnsLookup)
          .then((records) => {
            const record =
              records.find((candidate) => candidate.family === 4) ||
              records.find((candidate) => candidate.family === 6) ||
              records[0];
            callback(null, record.address, record.family);
          })
          .catch((error) => callback(error));
      },
    },
  });

const unwrapFetchError = (error) => {
  if (Number.isInteger(error?.cause?.statusCode)) {
    return error.cause;
  }

  return error;
};

const createFetchDispatcher = (fetchOptions, label, dnsLookup) => {
  if (fetchOptions.dispatcher) {
    return {
      dispatcher: fetchOptions.dispatcher,
      cleanup: async () => {},
    };
  }

  const dispatcher = createSafeFetchDispatcher({ label, dnsLookup });
  return {
    dispatcher,
    cleanup: async () => {
      await dispatcher.close().catch(() => {});
    },
  };
};

const fetchWithSafeLookup = async ({
  currentUrl,
  fetcher,
  fetchOptions,
  label,
  dnsLookup,
}) => {
  const { dispatcher, cleanup } = createFetchDispatcher(fetchOptions, label, dnsLookup);

  try {
    const response = await fetcher(currentUrl, {
      ...fetchOptions,
      dispatcher,
      redirect: 'manual',
    });

    return {
      response,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw unwrapFetchError(error);
  }
};

const cancelResponseBody = async (response) => {
  if (response.body?.cancel) {
    await response.body.cancel().catch(() => {});
  }
};

const fetchExternalUrl = async (
  value,
  {
    fetcher = fetch,
    dnsLookup,
    label = 'url',
    maxRedirects = 5,
    fetchOptions = {},
  } = {},
) => {
  let currentUrl = normalizeExternalUrl(value, label);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertResolvedHostnameIsPublic(currentUrl, label, dnsLookup);

    const { response, cleanup } = await fetchWithSafeLookup({
      currentUrl,
      fetcher,
      fetchOptions,
      label,
      dnsLookup,
    });

    const location = response.headers?.get?.('location');
    if (REDIRECT_STATUS_CODES.has(response.status) && location) {
      await cancelResponseBody(response);
      await cleanup();
      currentUrl = normalizeExternalUrl(new URL(location, currentUrl).toString(), label);
      continue;
    }

    return {
      response,
      url: currentUrl,
      cleanup,
    };
  }

  throw createHttpError('Too many upstream redirects', 502);
};

const readUpstreamTextWithLimit = async (upstreamResponse, maxBytes) => {
  const contentLength = Number(upstreamResponse.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createHttpError('Upstream response too large', 413);
  }

  const body = upstreamResponse.body;
  if (!body || typeof body.getReader !== 'function') {
    const responseText = await upstreamResponse.text();
    if (Buffer.byteLength(responseText, 'utf8') > maxBytes) {
      throw createHttpError('Upstream response too large', 413);
    }

    return responseText;
  }

  const reader = body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = Buffer.from(value);
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => {});
        throw createHttpError('Upstream response too large', 413);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock?.();
  }

  return Buffer.concat(chunks, totalBytes).toString('utf8');
};

module.exports = {
  fetchExternalUrl,
  isBlockedExternalHostname,
  normalizeExternalUrl,
  readUpstreamTextWithLimit,
};
