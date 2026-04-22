import { canonicalizePostListMember } from '../../utils/rssSourceResolver';

const DEFAULT_POST_LIST_COLOR = 'var(--accent-secondary)';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const SHARE_LIST_COLOR_PATTERN =
  /^(var\(--[a-z-]+\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/;
const X_HANDLE_PATTERN = /^[a-zA-Z0-9_]{1,50}$/;
const RSS_MEMBER_PATTERN = /^rss:[a-z0-9_-]{1,80}$/;

const normalizeHandle = (value: string) =>
  String(value || '').trim().replace(/^@/, '').toLowerCase();

const isSupportedShareMember = (value: string) =>
  X_HANDLE_PATTERN.test(value) || RSS_MEMBER_PATTERN.test(value);

const bytesToBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlToBytes = (value: string) => {
  const normalized = String(value || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  const base64 = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const compressString = async (value: string) => {
  const stream = new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const decompressString = async (bytes: Uint8Array) => {
  const copy = Uint8Array.from(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return textDecoder.decode(buffer);
};

const sanitizeShareListPayload = (payload: {
  name?: string;
  members?: string[];
  color?: string;
}) => {
  const safeName = String(payload?.name || '').slice(0, 60).trim() || 'Imported List';
  const safeColor = SHARE_LIST_COLOR_PATTERN.test(String(payload?.color || ''))
    ? String(payload?.color)
    : DEFAULT_POST_LIST_COLOR;
  const safeMembers = Array.from(
    new Set(
      (Array.isArray(payload?.members) ? payload.members : [])
        .filter((member) => typeof member === 'string')
        .map((member) => canonicalizePostListMember(member))
        .filter((member) => isSupportedShareMember(member)),
    ),
  );

  return {
    name: safeName,
    color: safeColor,
    members: safeMembers,
  };
};

export const encodeShareListPayload = async (list: {
  name?: string;
  members?: string[];
  color?: string;
}) => {
  const compactPayload = {
    n: String(list?.name || '').slice(0, 60).trim() || 'List',
    m: Array.isArray(list?.members)
      ? list.members.map((member) => canonicalizePostListMember(member)).filter(Boolean)
      : [],
    ...(list?.color && list.color !== DEFAULT_POST_LIST_COLOR ? { c: list.color } : {}),
  };

  const json = JSON.stringify(compactPayload);
  if (typeof CompressionStream === 'function') {
    const compressed = await compressString(json);
    return `z.${bytesToBase64Url(compressed)}`;
  }

  return bytesToBase64Url(textEncoder.encode(json));
};

export const decodeShareListPayload = async (value: string) => {
  const normalized = String(value || '').trim();
  const raw =
    normalized.startsWith('z.') && typeof DecompressionStream === 'function'
      ? JSON.parse(await decompressString(base64UrlToBytes(normalized.slice(2))))
      : JSON.parse(textDecoder.decode(base64UrlToBytes(normalized)));

  return sanitizeShareListPayload({
    name: raw?.n ?? raw?.name,
    members: raw?.m ?? raw?.members,
    color: raw?.c ?? raw?.color,
  });
};

export {
  DEFAULT_POST_LIST_COLOR,
  normalizeHandle,
  sanitizeShareListPayload,
};
