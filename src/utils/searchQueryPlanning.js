const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeQueryText = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}$%+.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const THAI_SCRIPT_PATTERN = /[\u0E00-\u0E7F]/u;

const EXPLICIT_THAI_LOCAL_SCOPE_PATTERN =
  /(?:\u0e43\u0e19\s*)?\u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28\u0e44\u0e17\u0e22|\u0e43\u0e19\u0e44\u0e17\u0e22|\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e44\u0e17\u0e22|\u0e02\u0e48\u0e32\u0e27\u0e44\u0e17\u0e22|\u0e04\u0e19\u0e44\u0e17\u0e22|\u0e0a\u0e32\u0e27\u0e44\u0e17\u0e22|\u0e04\u0e23\u0e35\u0e40\u0e2d\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e44\u0e17\u0e22|\u0e15\u0e25\u0e32\u0e14\u0e44\u0e17\u0e22|\u0e15\u0e25\u0e32\u0e14\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22|\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22|\u0e40\u0e07\u0e34\u0e19\u0e1a\u0e32\u0e17|\u0e01\u0e32\u0e23\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e44\u0e17\u0e22|\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08\u0e44\u0e17\u0e22|\u0e1c\u0e39\u0e49\u0e1a\u0e23\u0e34\u0e42\u0e20\u0e04\u0e44\u0e17\u0e22|\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25\u0e44\u0e17\u0e22|\u0e40\u0e1e\u0e25\u0e07\u0e44\u0e17\u0e22|\u0e0b\u0e35\u0e23\u0e35\u0e2a\u0e4c\u0e44\u0e17\u0e22|\u0e01\u0e23\u0e38\u0e07\u0e40\u0e17\u0e1e/u;

const EXPLICIT_ENGLISH_LOCAL_SCOPE_PATTERN =
  /\b(?:in\s+thailand|thailand|bangkok|thailand-based|local\s+thai|thai\s+(?:people|person|market|markets|creator|creators|account|accounts|startup|startups|politics|business|businesses|consumer|consumers|audience|audiences|brand|brands|company|companies|community|communities))\b/i;

export const hasThaiSearchText = (query = '') => THAI_SCRIPT_PATTERN.test(String(query || ''));

export const isExplicitlyLocalSearchQuery = (query = '') => {
  const text = String(query || '');
  return EXPLICIT_THAI_LOCAL_SCOPE_PATTERN.test(text) || EXPLICIT_ENGLISH_LOCAL_SCOPE_PATTERN.test(text);
};

export const getLocalFallbackQueries = (query = '') => {
  if (!isExplicitlyLocalSearchQuery(query)) return [];

  const normalized = normalizeQueryText(query);
  const original = String(query || '');

  if (
    /\b(creator|creators|influencer|influencers|youtuber|tiktok)\b/i.test(original) ||
    /\u0e04\u0e23\u0e35\u0e40\u0e2d\u0e40\u0e15\u0e2d\u0e23\u0e4c|\u0e2d\u0e34\u0e19\u0e1f\u0e25\u0e39|\u0e22\u0e39\u0e17\u0e39\u0e1a/iu.test(original)
  ) {
    return [
      '("\u0e04\u0e23\u0e35\u0e40\u0e2d\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e04\u0e19\u0e44\u0e17\u0e22" OR "\u0e04\u0e23\u0e35\u0e40\u0e2d\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e44\u0e17\u0e22" OR "Thai creator" OR "Thai creators" OR "X Creator Thailand") -filter:replies',
      '("\u0e04\u0e23\u0e35\u0e40\u0e2d\u0e40\u0e15\u0e2d\u0e23\u0e4c" OR creator OR influencer) ("\u0e04\u0e19\u0e44\u0e17\u0e22" OR "\u0e0a\u0e32\u0e27\u0e44\u0e17\u0e22" OR Thailand) -filter:replies',
      '(creator OR creators OR influencer OR influencers OR YouTuber OR TikTok) (Thai OR Thailand OR "\u0e04\u0e19\u0e44\u0e17\u0e22") min_faves:5 -filter:replies',
    ];
  }

  if (
    normalized.includes('set50') ||
    normalized.includes('set index') ||
    /\u0e15\u0e25\u0e32\u0e14\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22|\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22|\u0e40\u0e07\u0e34\u0e19\u0e1a\u0e32\u0e17/iu.test(original)
  ) {
    return [
      '("\u0e15\u0e25\u0e32\u0e14\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22" OR "\u0e2b\u0e38\u0e49\u0e19\u0e44\u0e17\u0e22" OR SET OR SET50) -filter:replies',
      '("Thai stock market" OR "Thailand stocks" OR "SET index" OR SET50) lang:en -filter:replies',
    ];
  }

  return [];
};

const PRICE_CONTEXT_PATTERN =
  /price|prices|trend|trends|outlook|forecast|chart|breakout|rally|market|futures|commodity|technical analysis|\u0e23\u0e32\u0e04\u0e32|\u0e41\u0e19\u0e27\u0e42\u0e19\u0e49\u0e21|\u0e15\u0e25\u0e32\u0e14|\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c/iu;

const MARKET_ASSET_BLUEPRINTS = [
  {
    key: 'silver',
    triggers: [/\bsilver\b/i, /\bxag\b/i, /\bslv\b/i, /\u0e42\u0e25\u0e2b\u0e30\u0e40\u0e07\u0e34\u0e19/iu],
    entityQuery:
      '("silver price" OR XAG OR "silver futures" OR "silver market" OR "silver chart") lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(silver OR XAG OR "silver price" OR "silver squeeze" OR "silver futures" OR "gold silver ratio") (price OR breakout OR chart OR forecast OR rally OR demand) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("silver price" OR XAG OR "silver futures") lang:en min_faves:5 -filter:replies',
      '(silver OR XAG) (chart OR breakout OR forecast OR demand OR rally) lang:en min_faves:25 -filter:replies',
      '("gold silver ratio" OR "precious metals" OR "silver market") lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'silver price',
      'xag',
      'silver futures',
      'silver market',
      'silver chart',
      'silver squeeze',
      'precious metals',
      'gold silver ratio',
      'breakout',
      'forecast',
      'demand',
    ],
  },
  {
    key: 'gold',
    triggers: [/\bgold\b/i, /\bxau\b/i, /\bgld\b/i, /\u0e17\u0e2d\u0e07(?:\u0e04\u0e33)?/iu],
    entityQuery:
      '("gold price" OR XAU OR "gold futures" OR "gold market" OR "gold chart") lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(gold OR XAU OR "gold price" OR "gold futures") (price OR breakout OR chart OR forecast OR rally OR demand) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("gold price" OR XAU OR "gold futures") lang:en min_faves:5 -filter:replies',
      '(gold OR XAU) (chart OR breakout OR forecast OR demand OR rally) lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'gold price',
      'xau',
      'gold futures',
      'gold market',
      'gold chart',
      'precious metals',
      'breakout',
      'forecast',
      'demand',
    ],
  },
  {
    key: 'bitcoin',
    triggers: [/\bbitcoin\b/i, /\bbtc\b/i],
    entityQuery:
      '("bitcoin price" OR BTC OR "bitcoin market" OR "BTC chart" OR "spot bitcoin ETF") lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(bitcoin OR BTC OR "bitcoin price" OR "spot bitcoin ETF") (price OR breakout OR chart OR rally OR inflows OR forecast) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("bitcoin price" OR BTC OR "BTC chart") lang:en min_faves:5 -filter:replies',
      '(bitcoin OR BTC) (breakout OR rally OR forecast OR ETF OR inflows) lang:en min_faves:25 -filter:replies',
      '("spot bitcoin ETF" OR "bitcoin market" OR "crypto market") lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'bitcoin price',
      'btc',
      'bitcoin market',
      'btc chart',
      'spot bitcoin etf',
      'crypto market',
      'breakout',
      'rally',
      'inflows',
      'forecast',
    ],
  },
  {
    key: 'ethereum',
    triggers: [/\bethereum\b/i, /\beth\b/i],
    entityQuery:
      '("ethereum price" OR ETH OR "ethereum market" OR "ETH chart" OR "spot ethereum ETF") lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(ethereum OR ETH OR "ethereum price" OR "spot ethereum ETF") (price OR breakout OR chart OR rally OR inflows OR forecast) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("ethereum price" OR ETH OR "ETH chart") lang:en min_faves:5 -filter:replies',
      '(ethereum OR ETH) (breakout OR rally OR forecast OR ETF OR inflows) lang:en min_faves:25 -filter:replies',
      '("spot ethereum ETF" OR "ethereum market" OR "crypto market") lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'ethereum price',
      'eth',
      'ethereum market',
      'eth chart',
      'spot ethereum etf',
      'crypto market',
      'breakout',
      'rally',
      'inflows',
      'forecast',
    ],
  },
  {
    key: 'oil',
    triggers: [/\boil\b/i, /\bcrude\b/i, /\bbrent\b/i, /\bwti\b/i],
    entityQuery:
      '("oil price" OR "crude oil" OR Brent OR WTI OR "oil futures" OR "energy market") lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(oil OR "crude oil" OR Brent OR WTI OR "oil price") (price OR breakout OR chart OR rally OR forecast OR supply) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("oil price" OR "crude oil" OR Brent OR WTI) lang:en min_faves:5 -filter:replies',
      '(oil OR "crude oil" OR Brent OR WTI) (chart OR breakout OR forecast OR supply OR rally) lang:en min_faves:25 -filter:replies',
      '("energy market" OR "oil futures" OR OPEC) lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'oil price',
      'crude oil',
      'brent',
      'wti',
      'oil futures',
      'energy market',
      'opec',
      'breakout',
      'forecast',
      'supply',
    ],
  },
  {
    key: 'stocks',
    triggers: [
      /\bstock\b/i,
      /\bstocks\b/i,
      /\bequity\b/i,
      /\bequities\b/i,
      /\bnasdaq\b/i,
      /\bspx\b/i,
      /\bs&p(?:\s*500)?\b/i,
      /\bnvda\b/i,
      /\btesla\b/i,
      /\btsla\b/i,
    ],
    entityQuery:
      '("stock market" OR stocks OR equities OR Nasdaq OR "S&P 500" OR NVDA OR TSLA) lang:en min_faves:5 -filter:replies',
    viralQuery:
      '(stocks OR equities OR Nasdaq OR "S&P 500" OR NVDA OR TSLA) (price OR earnings OR breakout OR rally OR selloff OR forecast) lang:en min_faves:100 -filter:replies',
    fallbackQueries: [
      '("stock market" OR stocks OR equities OR Nasdaq OR "S&P 500") lang:en min_faves:5 -filter:replies',
      '(stocks OR equities OR Nasdaq OR NVDA OR TSLA) (earnings OR breakout OR forecast OR rally OR selloff) lang:en min_faves:25 -filter:replies',
      '(Fed OR inflation OR earnings OR "market breadth") lang:en min_faves:25 -filter:replies',
    ],
    hints: [
      'stock market',
      'stocks',
      'equities',
      'nasdaq',
      's&p 500',
      'nvda',
      'tsla',
      'earnings',
      'breakout',
      'forecast',
      'rally',
      'selloff',
    ],
  },
];

const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));

const findMarketAssetBlueprint = (query = '') => {
  const normalized = normalizeQueryText(query);
  if (!normalized) return null;

  return MARKET_ASSET_BLUEPRINTS.find((asset) =>
    asset.triggers.some((pattern) => pattern.test(normalized) || pattern.test(query)),
  ) || null;
};

export const isMarketPriceSearchIntent = (query = '') => {
  const normalized = normalizeQueryText(query);
  if (!normalized) return false;
  if (!PRICE_CONTEXT_PATTERN.test(normalized) && !PRICE_CONTEXT_PATTERN.test(query)) return false;

  return Boolean(findMarketAssetBlueprint(query));
};

export const getMarketTopicHints = (query = '') => {
  const asset = findMarketAssetBlueprint(query);
  if (!asset || !isMarketPriceSearchIntent(query)) return [];

  return unique([
    ...asset.hints,
    'price',
    'trend',
    'market',
    'futures',
    'chart',
    'technical analysis',
  ]);
};

export const getMarketQueryBlueprint = (query = '') => {
  const asset = findMarketAssetBlueprint(query);
  if (!asset || !isMarketPriceSearchIntent(query)) return null;

  return {
    key: asset.key,
    entityQuery: asset.entityQuery,
    viralQuery: asset.viralQuery,
    engagementQuery: asset.viralQuery,
  };
};

export const getMarketFallbackQueries = (query = '') => {
  const asset = findMarketAssetBlueprint(query);
  if (!asset || !isMarketPriceSearchIntent(query)) return [];

  return [...asset.fallbackQueries];
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

export const buildTopEngagementBackfillQuery = (query = '', options = {}) => {
  const {
    daysBack = 14,
    minFaves = 100,
    now = new Date(),
  } = options;
  const cleaned = String(query || '')
    .replace(/\bsince:\S+/gi, ' ')
    .replace(/\buntil:\S+/gi, ' ')
    .replace(/\bmin_faves:\d+\b/gi, ' ')
    .replace(/(^|\s)-filter:replies\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const sinceDate = formatDate(new Date(new Date(now).getTime() - Math.max(1, daysBack) * DAY_MS));
  const withLanguage = /\blang:[a-z]{2,3}\b/i.test(cleaned) ? cleaned : `${cleaned} lang:en`;

  return `${withLanguage} since:${sinceDate} min_faves:${Math.max(1, minFaves)} -filter:replies`
    .replace(/\s+/g, ' ')
    .trim();
};
