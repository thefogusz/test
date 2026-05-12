const normalizeDiscoveryText = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}$%+.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = (items = []) => Array.from(new Set(items.filter(Boolean)));
const THAI_TEXT_PATTERN = /[\u0E00-\u0E7F]/u;

const globalQuery = (query) => `${query} lang:en -filter:replies`;
const viralQuery = (query, minFaves = 500) => `${query} lang:en min_faves:${minFaves} -filter:replies`;

export const CONTENT_DISCOVERY_TOPICS = [
  {
    key: 'ai_tools',
    priority: 38,
    triggers: ['ai tools', 'ai tool', 'ai app', 'ai apps', 'ai agent tools', 'agent tools', 'prompt tool', 'workflow automation', 'automation tool', 'no-code ai', 'เอไอทูล', 'เครื่องมือ ai', 'เครื่องมือเอไอ'],
    triggerPattern: /\b(?:ai tools?|ai apps?|ai agent tools?|agent tools?|prompt tools?|workflow automation|automation tools?|no[- ]?code ai|ai productivity)\b|เอไอทูล|เครื่องมือ\s*(?:ai|เอไอ)/iu,
    entityQuery: globalQuery('("AI tools" OR "AI tool" OR "AI app" OR "AI apps" OR "AI agent tools" OR "workflow automation") (launch OR review OR product OR demo OR "use case" OR productivity) -"looking to connect" -dropshipping -coupon'),
    viralQuery: viralQuery('("AI tools" OR "AI tool" OR "AI apps" OR "AI productivity" OR "AI workflow" OR "AI agent tools")', 1000),
    fallbackQueries: [
      globalQuery('("AI tools" OR "AI apps" OR "AI productivity" OR "AI workflow" OR "AI automation")'),
      globalQuery('("AI agent tools" OR "prompt tool" OR "automation tool" OR "no-code AI") (demo OR product OR workflow OR launch)'),
      viralQuery('("AI tool" OR "AI tools" OR "AI app" OR "AI workflow")', 500),
    ],
    hints: ['ai tools', 'ai tool', 'ai app', 'ai apps', 'ai agent tools', 'workflow automation', 'ai productivity', 'prompt tool', 'automation tool', 'no-code ai', 'demo', 'product'],
    exactTerms: ['ai tools', 'ai tool', 'ai app', 'ai apps', 'ai agent tools', 'workflow automation', 'ai productivity'],
    softNegativeHints: ['course', 'prompt pack', 'ebook', 'gumroad', 'telegram', 'dm', 'giveaway', 'looking to connect', 'dropshipping', 'coupon'],
    rssTopics: ['ai', 'tech', 'business'],
    rssSynonyms: ['ai tools', 'ai tool', 'ai apps', 'ai agent tools', 'workflow automation', 'ai productivity', 'automation tool'],
  },
  {
    key: 'ai_video',
    priority: 30,
    triggers: ['ai video', 'generative ai video', 'text to video', 'text-to-video', 'runway', 'sora', 'kling', 'luma'],
    triggerPattern: /\b(?:sora|runway|kling|luma|hailuo|gen[- ]?3|text[- ]to[- ]video|ai video|generative video)\b/i,
    entityQuery: globalQuery('("ai video" OR "generative video" OR "text-to-video" OR sora OR runway OR kling OR luma OR hailuo) (model OR prompt OR release OR demo OR generated)'),
    viralQuery: viralQuery('("ai video" OR sora OR runway OR kling OR luma) (insane OR crazy OR breakthrough OR demo OR "looks real" OR generated)', 1000),
    fallbackQueries: [
      globalQuery('("ai video" OR "generative video" OR "text to video" OR "ai film")'),
      globalQuery('(sora OR runway OR kling OR hailuo OR luma) (video OR model OR prompt OR demo)'),
      viralQuery('("ai generation" OR "generating video" OR "ai short film") (prompt OR tool OR demo)', 500),
    ],
    hints: ['sora', 'runway', 'kling', 'luma', 'ai video', 'generative video', 'text-to-video', 'ai film', 'demo'],
    exactTerms: ['ai video', 'generative video', 'text-to-video', 'sora', 'runway', 'kling', 'luma'],
    softNegativeHints: ['giveaway', 'prompt pack', 'course', 'telegram', 'dm'],
    rssTopics: ['ai', 'tech'],
    rssSynonyms: ['ai video', 'generative video', 'text-to-video', 'sora', 'runway', 'kling', 'luma'],
  },
  {
    key: 'ai',
    triggers: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'genai', 'generative ai', 'openai', 'chatgpt', 'claude', 'gemini', '\u0e40\u0e2d\u0e44\u0e2d', '\u0e1b\u0e31\u0e0d\u0e0d\u0e32\u0e1b\u0e23\u0e30\u0e14\u0e34\u0e29\u0e10\u0e4c'],
    triggerPattern: /\b(?:ai|artificial intelligence|machine learning|ml|llm|gpt|genai|generative ai|openai|chatgpt|claude|gemini|anthropic|deepmind|mistral)\b|\u0e40\u0e2d\u0e44\u0e2d|\u0e1b\u0e31\u0e0d\u0e0d\u0e32\u0e1b\u0e23\u0e30\u0e14\u0e34\u0e29\u0e10\u0e4c/iu,
    entityQuery: globalQuery('(openai OR anthropic OR claude OR gemini OR chatgpt OR "language model" OR llm OR "ai model" OR "generative ai")'),
    viralQuery: viralQuery('(ai OR "artificial intelligence" OR openai OR chatgpt OR claude OR gemini) (breakthrough OR update OR launch OR agent OR model OR future)', 1000),
    fallbackQueries: [
      globalQuery('(ai OR "artificial intelligence" OR "generative ai" OR genai OR llm)'),
      globalQuery('(openai OR anthropic OR claude OR gemini OR chatgpt OR copilot)'),
      viralQuery('("prompt engineering" OR "ai tool" OR "ai tools" OR "ai model" OR "ai agent")', 500),
    ],
    hints: ['openai', 'anthropic', 'claude', 'gemini', 'deepmind', 'mistral', 'chatgpt', 'copilot', 'ai model', 'foundation model', 'ai agent', 'prompt engineering', 'multimodal', 'inference'],
    exactTerms: ['ai', 'artificial intelligence', 'machine learning', 'generative ai', 'genai', 'llm', 'gpt'],
    softNegativeHints: ['giveaway', 'airdrop', 'follow', 'dm', 'telegram', 'whatsapp', 'casino'],
    rssTopics: ['ai', 'tech'],
    rssSynonyms: ['ai', 'artificial intelligence', 'generative ai', 'llm', 'openai', 'chatgpt', 'claude', 'gemini'],
  },
  {
    key: 'viral_video',
    priority: 8,
    triggers: ['viral', 'funny', 'meme', 'clip', 'video', '\u0e44\u0e27\u0e23\u0e31\u0e25', '\u0e2e\u0e32', '\u0e15\u0e25\u0e01', '\u0e02\u0e33', '\u0e04\u0e25\u0e34\u0e1b', '\u0e21\u0e35\u0e21'],
    triggerPattern: /\b(?:viral|funny|meme|clip|video|hilarious|comedy|internet culture)\b|\u0e44\u0e27\u0e23\u0e31\u0e25|\u0e04\u0e25\u0e34\u0e1b|\u0e21\u0e35\u0e21/iu,
    entityQuery: globalQuery('("viral video" OR "funny video" OR meme OR "internet culture" OR hilarious OR comedy OR "must watch")'),
    viralQuery: viralQuery('("viral video" OR "funny clip" OR meme OR hilarious OR comedy OR "internet culture")', 1000),
    fallbackQueries: [
      globalQuery('("viral video" OR "funny video" OR meme OR comedy OR hilarious)'),
      globalQuery('("viral clip" OR "funniest video" OR "must watch" OR "internet culture")'),
      viralQuery('(meme OR hilarious OR comedy OR funny OR viral)', 500),
    ],
    hints: ['viral video', 'funny video', 'hilarious', 'comedy', 'meme', 'internet culture', 'must watch', 'viral clip'],
    exactTerms: ['viral', 'funny', 'meme', 'clip', 'video', 'comedy', 'hilarious', 'internet culture'],
    softNegativeHints: ['fan cam', 'fancam', 'stream now', 'vote now'],
    rssTopics: ['entertainment', 'news'],
    rssSynonyms: ['viral', 'funny', 'meme', 'clip', 'video', 'internet culture'],
  },
  {
    key: 'gaming',
    triggers: ['gaming', 'game', 'games', 'videogame', 'video game', 'videogames', 'nintendo', 'playstation', 'xbox', 'steam', 'switch 2', '\u0e40\u0e01\u0e21', '\u0e27\u0e07\u0e01\u0e32\u0e23\u0e40\u0e01\u0e21'],
    triggerPattern: /\b(?:gaming|game|games|videogame|video game|videogames|nintendo|playstation|ps5|xbox|steam|switch 2|gta|pokemon|zelda|monster hunter)\b|\u0e40\u0e01\u0e21/iu,
    entityQuery: globalQuery('(Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")'),
    viralQuery: viralQuery('(gaming OR videogames OR Nintendo OR PlayStation OR Xbox OR Steam OR "Switch 2" OR GTA)', 500),
    fallbackQueries: [
      globalQuery('(game OR gaming OR videogame OR videogames OR "game industry")'),
      globalQuery('(Nintendo OR PlayStation OR Xbox OR Steam OR PS5 OR GTA OR Pokemon OR Zelda OR Mario OR "Monster Hunter" OR "Game Awards")'),
      viralQuery('(esports OR gamedev OR "game dev" OR studio OR trailer OR launch)', 500),
    ],
    hints: ['nintendo', 'switch', 'switch 2', 'playstation', 'ps5', 'xbox', 'steam', 'pc gaming', 'game awards', 'gta', 'minecraft', 'fortnite', 'monster hunter', 'pokemon', 'zelda', 'mario', 'gamedev'],
    exactTerms: ['gaming', 'games', 'videogames', 'game', 'game industry'],
    softNegativeHints: ['giveaway', 'gaming pc', 'rtx', 'steam deck', 'scrim'],
    rssTopics: ['gaming', 'tech'],
    rssSynonyms: ['gaming', 'game', 'videogames', 'nintendo', 'playstation', 'xbox', 'steam'],
  },
  {
    key: 'football',
    triggers: ['football', 'soccer', 'premier league', 'champions league', 'fifa', 'uefa', '\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25'],
    triggerPattern: /\b(?:football|soccer|premier league|champions league|fifa|uefa|arsenal|liverpool|real madrid|barcelona)\b|\u0e1f\u0e38\u0e15\u0e1a\u0e2d\u0e25/iu,
    entityQuery: globalQuery('(Premier League OR Champions League OR FIFA OR UEFA OR Arsenal OR Liverpool OR Real Madrid OR Barcelona)'),
    viralQuery: viralQuery('(football OR soccer OR Premier League OR Champions League OR FIFA OR UEFA) (goal OR transfer OR match OR highlights)', 500),
    fallbackQueries: [
      globalQuery('(football OR soccer OR "Premier League" OR "Champions League")'),
      globalQuery('(FIFA OR UEFA OR Arsenal OR Liverpool OR "Real Madrid" OR Barcelona)'),
      viralQuery('(football OR soccer) (goal OR transfer OR matchday OR highlights)', 500),
    ],
    hints: ['premier league', 'champions league', 'fifa', 'uefa', 'goal', 'matchday', 'transfer', 'liverpool', 'man utd', 'arsenal'],
    exactTerms: ['football', 'soccer', 'premier league', 'champions league'],
    softNegativeHints: ['betting', 'parlay', 'odds'],
    rssTopics: ['sports', 'news'],
    rssSynonyms: ['football', 'soccer', 'premier league', 'champions league', 'fifa', 'uefa'],
  },
  {
    key: 'basketball',
    triggers: ['basketball', 'nba', 'wnba', 'lakers', 'warriors', 'celtics', 'trade deadline'],
    triggerPattern: /\b(?:basketball|nba|wnba|lakers|warriors|celtics|knicks|mavericks|trade deadline|playoffs)\b/i,
    entityQuery: globalQuery('(NBA OR basketball OR WNBA OR Lakers OR Warriors OR Celtics OR Knicks OR Mavericks) (trade OR playoffs OR injury OR highlights OR analysis)'),
    viralQuery: viralQuery('(NBA OR basketball OR Lakers OR Warriors OR Celtics) (trade OR dunk OR highlights OR playoffs OR buzzer)', 500),
    fallbackQueries: [
      globalQuery('(NBA OR basketball OR WNBA OR "NBA trade" OR playoffs)'),
      globalQuery('(Lakers OR Warriors OR Celtics OR Knicks OR Mavericks) (trade OR injury OR highlights)'),
      viralQuery('(NBA OR basketball) (dunk OR highlights OR buzzer OR trade)', 500),
    ],
    hints: ['nba', 'basketball', 'wnba', 'lakers', 'warriors', 'celtics', 'playoffs', 'trade', 'dunk', 'highlights'],
    exactTerms: ['nba', 'basketball', 'wnba'],
    softNegativeHints: ['betting', 'parlay', 'odds'],
    rssTopics: ['sports', 'news'],
    rssSynonyms: ['nba', 'basketball', 'wnba', 'lakers', 'warriors', 'celtics'],
  },
  {
    key: 'crypto',
    triggers: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'web3', 'blockchain', 'etf', '\u0e04\u0e23\u0e34\u0e1b\u0e42\u0e15'],
    triggerPattern: /\b(?:crypto|bitcoin|btc|ethereum|eth|solana|web3|blockchain|defi|coinbase|binance|etf)\b|\u0e04\u0e23\u0e34\u0e1b\u0e42\u0e15/iu,
    entityQuery: globalQuery('(Bitcoin OR BTC OR Ethereum OR ETH OR Solana OR Binance OR Coinbase OR ETF OR blockchain OR web3)'),
    viralQuery: viralQuery('(crypto OR bitcoin OR btc OR ethereum OR eth OR solana OR ETF) (rally OR breakout OR inflows OR update OR launch)', 500),
    fallbackQueries: [
      globalQuery('(crypto OR bitcoin OR btc OR ethereum OR eth OR solana)'),
      globalQuery('(Solana OR Binance OR Coinbase OR ETF OR blockchain OR web3 OR defi)'),
      viralQuery('(bitcoin OR ethereum OR solana OR crypto) (breakout OR rally OR ETF OR inflows)', 500),
    ],
    hints: ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'binance', 'coinbase', 'etf', 'defi', 'web3', 'token', 'blockchain'],
    exactTerms: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'web3', 'blockchain'],
    softNegativeHints: ['airdrop', 'giveaway', 'telegram', 'whatsapp', 'presale', 'referral'],
    rssTopics: ['crypto', 'finance'],
    rssSynonyms: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'web3', 'blockchain'],
  },
  {
    key: 'business_startup',
    triggers: ['business', 'startup', 'startups', 'founder', 'funding', 'venture capital', 'vc', 'saas', 'entrepreneurship'],
    triggerPattern: /\b(?:business|startup|startups|founder|funding|venture capital|vc|saas|entrepreneurship|ipo|m&a)\b/i,
    entityQuery: globalQuery('(startup OR startups OR founder OR "venture capital" OR VC OR SaaS OR IPO) (funding OR launch OR growth OR acquisition OR market)'),
    viralQuery: viralQuery('(startup OR founder OR "venture capital" OR SaaS OR IPO) (funding OR acquisition OR growth OR breakout OR lessons)', 500),
    fallbackQueries: [
      globalQuery('(startup OR startups OR founder OR "venture capital" OR VC OR SaaS)'),
      globalQuery('(business OR entrepreneurship OR IPO OR acquisition OR "startup funding")'),
      viralQuery('(startup OR founder OR SaaS) (funding OR growth OR acquisition OR lessons)', 500),
    ],
    hints: ['startup', 'founder', 'venture capital', 'vc', 'saas', 'ipo', 'funding', 'acquisition', 'growth', 'business model'],
    exactTerms: ['business', 'startup', 'startups', 'founder', 'funding', 'venture capital', 'saas'],
    softNegativeHints: ['get rich quick', 'dropshipping', 'dm me'],
    rssTopics: ['business', 'tech'],
    rssSynonyms: ['startup', 'startups', 'founder', 'venture capital', 'vc', 'funding', 'saas', 'business'],
  },
  {
    key: 'marketing',
    triggers: ['marketing', 'brand', 'creator economy', 'social media', 'growth', 'advertising', 'seo', 'tiktok strategy'],
    triggerPattern: /\b(?:marketing|brand|creator economy|social media|growth marketing|advertising|seo|tiktok strategy|viral marketing)\b/i,
    entityQuery: globalQuery('(marketing OR brand OR "creator economy" OR "social media" OR advertising OR SEO OR "growth marketing") (strategy OR campaign OR trend OR case study)'),
    viralQuery: viralQuery('(marketing OR brand OR "creator economy" OR "social media") (strategy OR campaign OR viral OR growth OR case study)', 500),
    fallbackQueries: [
      globalQuery('(marketing OR brand OR advertising OR SEO OR "growth marketing")'),
      globalQuery('("creator economy" OR "social media" OR TikTok OR YouTube) (strategy OR trend OR campaign)'),
      viralQuery('(marketing OR brand OR campaign) (viral OR growth OR strategy OR case study)', 500),
    ],
    hints: ['marketing', 'brand', 'creator economy', 'social media', 'advertising', 'seo', 'growth marketing', 'campaign', 'case study'],
    exactTerms: ['marketing', 'brand', 'social media', 'advertising', 'seo'],
    softNegativeHints: ['course', 'ebook', 'dm me', 'agency pitch'],
    rssTopics: ['business', 'tech'],
    rssSynonyms: ['marketing', 'brand', 'advertising', 'social media', 'creator economy', 'seo'],
  },
  {
    key: 'finance_investing',
    priority: 5,
    triggers: ['finance', 'investing', 'stock', 'stocks', 'market', 'markets', 'equity', 'nasdaq', 's&p', 'dollar', 'fed', 'inflation'],
    triggerPattern: /\b(?:finance|investing|stock|stocks|market|markets|equity|nasdaq|s&p|spx|dollar|fed|inflation|economy|economics)\b/i,
    entityQuery: globalQuery('(markets OR stocks OR equities OR Nasdaq OR "S&P 500" OR Fed OR inflation OR economy) (analysis OR outlook OR earnings OR rally)'),
    viralQuery: viralQuery('(stocks OR markets OR Nasdaq OR "S&P 500" OR Fed OR inflation) (rally OR selloff OR breakout OR earnings OR outlook)', 500),
    fallbackQueries: [
      globalQuery('(markets OR stocks OR equities OR Nasdaq OR "S&P 500" OR Fed OR inflation)'),
      globalQuery('(finance OR investing OR economy OR earnings OR macro)'),
      viralQuery('(stocks OR markets OR Fed OR inflation) (rally OR selloff OR breakout OR outlook)', 500),
    ],
    hints: ['markets', 'stocks', 'equities', 'nasdaq', 's&p 500', 'fed', 'inflation', 'economy', 'earnings', 'macro', 'rally', 'selloff'],
    exactTerms: ['finance', 'investing', 'stock', 'stocks', 'market', 'markets', 'equity'],
    softNegativeHints: ['telegram', 'whatsapp', 'signal group', 'copy trade'],
    rssTopics: ['finance', 'business', 'news'],
    rssSynonyms: ['finance', 'investing', 'stock', 'stocks', 'markets', 'nasdaq', 'fed', 'inflation'],
  },
  {
    key: 'kpop',
    triggers: ['kpop', 'k-pop', 'k pop', 'idol', 'comeback', 'bts', 'blackpink', 'newjeans', 'seventeen'],
    triggerPattern: /\b(?:k[- ]?pop|idol|comeback|bts|blackpink|newjeans|seventeen|stray kids|aespa)\b/i,
    entityQuery: globalQuery('("K-pop" OR kpop OR idol OR BTS OR BLACKPINK OR NewJeans OR SEVENTEEN OR aespa) (comeback OR release OR tour OR chart OR performance)'),
    viralQuery: viralQuery('("K-pop" OR kpop OR BTS OR BLACKPINK OR NewJeans OR SEVENTEEN) (comeback OR performance OR tour OR chart OR viral)', 1000),
    fallbackQueries: [
      globalQuery('("K-pop" OR kpop OR idol OR comeback OR performance)'),
      globalQuery('(BTS OR BLACKPINK OR NewJeans OR SEVENTEEN OR aespa OR "Stray Kids")'),
      viralQuery('("K-pop" OR kpop OR idol) (comeback OR performance OR fan reaction OR chart)', 500),
    ],
    hints: ['k-pop', 'kpop', 'idol', 'comeback', 'bts', 'blackpink', 'newjeans', 'seventeen', 'aespa', 'tour', 'chart'],
    exactTerms: ['kpop', 'k-pop', 'idol', 'comeback'],
    softNegativeHints: ['vote now', 'stream now', 'fancam spam'],
    rssTopics: ['entertainment', 'lifestyle'],
    rssSynonyms: ['k-pop', 'kpop', 'idol', 'comeback', 'bts', 'blackpink', 'newjeans'],
  },
  {
    key: 'fashion',
    triggers: ['fashion', 'fashion week', 'style', 'runway', 'luxury', 'streetwear', 'designer'],
    triggerPattern: /\b(?:fashion|fashion week|style|runway|luxury|streetwear|designer|couture|sneakers)\b/i,
    entityQuery: globalQuery('("fashion week" OR fashion OR runway OR luxury OR streetwear OR designer OR couture) (collection OR trend OR show OR style)'),
    viralQuery: viralQuery('("fashion week" OR fashion OR runway OR luxury OR streetwear) (trend OR look OR show OR collection OR viral)', 500),
    fallbackQueries: [
      globalQuery('("fashion week" OR fashion OR runway OR luxury OR streetwear)'),
      globalQuery('(designer OR couture OR style OR sneakers OR collection)'),
      viralQuery('(fashion OR runway OR streetwear OR luxury) (trend OR look OR viral OR show)', 500),
    ],
    hints: ['fashion week', 'fashion', 'runway', 'luxury', 'streetwear', 'designer', 'couture', 'style', 'collection'],
    exactTerms: ['fashion', 'fashion week', 'style', 'runway', 'luxury', 'streetwear'],
    softNegativeHints: ['discount code', 'shop now'],
    rssTopics: ['lifestyle', 'entertainment'],
    rssSynonyms: ['fashion', 'fashion week', 'style', 'runway', 'luxury', 'streetwear'],
  },
  {
    key: 'climate',
    triggers: ['climate', 'climate change', 'environment', 'global warming', 'clean energy', 'renewable', 'carbon'],
    triggerPattern: /\b(?:climate|climate change|environment|global warming|clean energy|renewable|carbon|emissions|extreme weather)\b/i,
    entityQuery: globalQuery('(climate OR "climate change" OR environment OR "clean energy" OR renewable OR carbon OR emissions) (study OR policy OR impact OR extreme weather)'),
    viralQuery: viralQuery('(climate OR "climate change" OR "clean energy" OR emissions OR "extreme weather") (study OR warning OR breakthrough OR policy OR impact)', 500),
    fallbackQueries: [
      globalQuery('(climate OR "climate change" OR environment OR global warming OR emissions)'),
      globalQuery('("clean energy" OR renewable OR carbon OR "extreme weather" OR sustainability)'),
      viralQuery('(climate OR emissions OR "extreme weather") (study OR warning OR impact OR policy)', 500),
    ],
    hints: ['climate change', 'climate', 'environment', 'global warming', 'clean energy', 'renewable', 'carbon', 'emissions', 'extreme weather'],
    exactTerms: ['climate', 'climate change', 'environment', 'global warming'],
    softNegativeHints: ['conspiracy', 'hoax'],
    rssTopics: ['environment', 'science', 'news'],
    rssSynonyms: ['climate', 'climate change', 'environment', 'global warming', 'clean energy', 'emissions'],
  },
  {
    key: 'health',
    triggers: ['health', 'medicine', 'medical', 'wellness', 'fitness', 'nutrition', 'public health', '\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e'],
    triggerPattern: /\b(?:health|medicine|medical|wellness|fitness|nutrition|public health|vaccine|disease|research)\b|\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e/iu,
    entityQuery: globalQuery('(health OR medicine OR medical OR "public health" OR wellness OR fitness OR nutrition) (research OR study OR guideline OR breakthrough)'),
    viralQuery: viralQuery('(health OR medicine OR "public health" OR nutrition OR fitness) (study OR research OR breakthrough OR warning OR guideline)', 500),
    fallbackQueries: [
      globalQuery('(health OR medicine OR medical OR "public health" OR wellness OR nutrition)'),
      globalQuery('(fitness OR vaccine OR disease OR research OR study OR guideline)'),
      viralQuery('(health OR medicine OR nutrition OR fitness) (study OR research OR breakthrough OR warning)', 500),
    ],
    hints: ['health', 'medicine', 'medical', 'public health', 'wellness', 'fitness', 'nutrition', 'research', 'study', 'guideline'],
    exactTerms: ['health', 'medicine', 'medical', 'wellness', 'fitness', 'nutrition'],
    softNegativeHints: ['miracle cure', 'detox', 'whatsapp', 'telegram'],
    rssTopics: ['health', 'science'],
    rssSynonyms: ['health', 'medicine', 'medical', 'wellness', 'fitness', 'nutrition', 'public health'],
  },
  {
    key: 'science_space',
    priority: 15,
    triggers: ['science', 'space', 'nasa', 'spacex', 'astronomy', 'physics', 'research', 'discovery'],
    triggerPattern: /\b(?:science|space|nasa|spacex|astronomy|physics|research|discovery|moon|mars|rocket|telescope)\b/i,
    entityQuery: globalQuery('(science OR space OR NASA OR SpaceX OR astronomy OR physics OR research OR discovery) (mission OR study OR launch OR breakthrough)'),
    viralQuery: viralQuery('(space OR NASA OR SpaceX OR astronomy OR science) (discovery OR launch OR mission OR breakthrough OR image)', 500),
    fallbackQueries: [
      globalQuery('(science OR space OR NASA OR SpaceX OR astronomy OR physics)'),
      globalQuery('(research OR discovery OR mission OR launch OR telescope OR Mars OR moon)'),
      viralQuery('(space OR NASA OR science OR discovery) (breakthrough OR mission OR launch OR image)', 500),
    ],
    hints: ['science', 'space', 'nasa', 'spacex', 'astronomy', 'physics', 'research', 'discovery', 'mission', 'launch'],
    exactTerms: ['science', 'space', 'nasa', 'spacex', 'astronomy', 'research', 'discovery'],
    softNegativeHints: ['flat earth', 'conspiracy'],
    rssTopics: ['science', 'tech', 'news'],
    rssSynonyms: ['science', 'space', 'nasa', 'spacex', 'astronomy', 'research', 'discovery'],
  },
  {
    key: 'travel',
    triggers: ['travel', 'tourism', 'trip', 'hotel', 'airline', 'aviation', 'japan travel', '\u0e17\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e27'],
    triggerPattern: /\b(?:travel|tourism|trip|hotel|airline|aviation|japan travel|destination|flight)\b|\u0e17\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e27/iu,
    entityQuery: globalQuery('(travel OR tourism OR trip OR hotel OR airline OR aviation OR destination OR "Japan travel") (guide OR trend OR deal OR warning OR opening)'),
    viralQuery: viralQuery('(travel OR tourism OR hotel OR airline OR "Japan travel" OR destination) (trend OR guide OR viral OR opening OR warning)', 500),
    fallbackQueries: [
      globalQuery('(travel OR tourism OR trip OR hotel OR airline OR aviation)'),
      globalQuery('("Japan travel" OR destination OR flight OR hospitality OR guide)'),
      viralQuery('(travel OR tourism OR destination OR hotel) (trend OR guide OR viral OR opening)', 500),
    ],
    hints: ['travel', 'tourism', 'trip', 'hotel', 'airline', 'aviation', 'destination', 'japan travel', 'guide'],
    exactTerms: ['travel', 'tourism', 'trip', 'hotel', 'airline', 'japan travel'],
    softNegativeHints: ['affiliate', 'coupon code'],
    rssTopics: ['travel', 'lifestyle'],
    rssSynonyms: ['travel', 'tourism', 'trip', 'hotel', 'airline', 'aviation', 'destination'],
  },
  {
    key: 'food',
    triggers: ['food', 'restaurant', 'restaurants', 'cooking', 'recipe', 'chef', 'dining', 'michelin'],
    triggerPattern: /\b(?:food|restaurant|restaurants|cooking|recipe|chef|dining|michelin|coffee)\b/i,
    entityQuery: globalQuery('(food OR restaurant OR restaurants OR cooking OR recipe OR chef OR dining OR Michelin) (trend OR opening OR review OR viral)'),
    viralQuery: viralQuery('(food OR restaurant OR chef OR dining OR recipe) (trend OR viral OR opening OR review OR Michelin)', 500),
    fallbackQueries: [
      globalQuery('(food OR restaurant OR restaurants OR cooking OR recipe OR chef)'),
      globalQuery('(dining OR Michelin OR coffee OR "food trend" OR "restaurant opening")'),
      viralQuery('(food OR restaurant OR chef OR recipe) (trend OR viral OR opening OR review)', 500),
    ],
    hints: ['food', 'restaurant', 'restaurants', 'cooking', 'recipe', 'chef', 'dining', 'michelin', 'food trend'],
    exactTerms: ['food', 'restaurant', 'restaurants', 'cooking', 'recipe', 'chef'],
    softNegativeHints: ['discount code', 'delivery promo'],
    rssTopics: ['food', 'lifestyle'],
    rssSynonyms: ['food', 'restaurant', 'restaurants', 'cooking', 'recipe', 'chef', 'dining'],
  },
  {
    key: 'entertainment',
    triggers: ['entertainment', 'movie', 'movies', 'film', 'streaming', 'netflix', 'music', 'celebrity', 'hollywood'],
    triggerPattern: /\b(?:entertainment|movie|movies|film|streaming|netflix|music|celebrity|hollywood|box office)\b/i,
    entityQuery: globalQuery('(entertainment OR movie OR film OR streaming OR Netflix OR music OR celebrity OR Hollywood) (release OR trailer OR review OR chart)'),
    viralQuery: viralQuery('(movie OR film OR streaming OR Netflix OR music OR celebrity) (trailer OR release OR viral OR chart OR box office)', 500),
    fallbackQueries: [
      globalQuery('(entertainment OR movie OR movies OR film OR streaming OR Netflix)'),
      globalQuery('(music OR celebrity OR Hollywood OR trailer OR "box office")'),
      viralQuery('(movie OR film OR streaming OR music OR celebrity) (trailer OR release OR viral OR chart)', 500),
    ],
    hints: ['entertainment', 'movie', 'film', 'streaming', 'netflix', 'music', 'celebrity', 'hollywood', 'box office', 'trailer'],
    exactTerms: ['entertainment', 'movie', 'movies', 'film', 'streaming', 'music'],
    softNegativeHints: ['stan spam', 'vote now'],
    rssTopics: ['entertainment', 'news'],
    rssSynonyms: ['entertainment', 'movie', 'film', 'streaming', 'netflix', 'music', 'celebrity'],
  },
  {
    key: 'education',
    triggers: ['education', 'learning', 'school', 'college', 'university', 'student', 'edtech'],
    triggerPattern: /\b(?:education|learning|school|college|university|student|edtech|online learning|teacher)\b/i,
    entityQuery: globalQuery('(education OR learning OR school OR college OR university OR student OR edtech) (trend OR research OR policy OR tool)'),
    viralQuery: viralQuery('(education OR learning OR school OR university OR edtech) (trend OR research OR policy OR tool OR debate)', 500),
    fallbackQueries: [
      globalQuery('(education OR learning OR school OR college OR university OR student)'),
      globalQuery('(edtech OR "online learning" OR teacher OR classroom OR policy)'),
      viralQuery('(education OR learning OR edtech OR school) (trend OR research OR policy OR debate)', 500),
    ],
    hints: ['education', 'learning', 'school', 'college', 'university', 'student', 'edtech', 'online learning', 'teacher'],
    exactTerms: ['education', 'learning', 'school', 'college', 'university', 'edtech'],
    softNegativeHints: ['essay mill', 'assignment help'],
    rssTopics: ['education', 'tech', 'news'],
    rssSynonyms: ['education', 'learning', 'school', 'college', 'university', 'student', 'edtech'],
  },
  {
    key: 'real_estate',
    triggers: ['real estate', 'housing', 'property', 'mortgage', 'rent', 'home prices'],
    triggerPattern: /\b(?:real estate|housing|property|mortgage|rent|home prices|commercial real estate)\b/i,
    entityQuery: globalQuery('("real estate" OR housing OR property OR mortgage OR rent OR "home prices") (market OR trend OR rates OR affordability)'),
    viralQuery: viralQuery('("real estate" OR housing OR property OR mortgage OR "home prices") (market OR trend OR rates OR crash OR affordability)', 500),
    fallbackQueries: [
      globalQuery('("real estate" OR housing OR property OR mortgage OR rent)'),
      globalQuery('("home prices" OR "commercial real estate" OR affordability OR rates)'),
      viralQuery('("real estate" OR housing OR mortgage OR "home prices") (trend OR rates OR affordability)', 500),
    ],
    hints: ['real estate', 'housing', 'property', 'mortgage', 'rent', 'home prices', 'commercial real estate', 'affordability'],
    exactTerms: ['real estate', 'housing', 'property', 'mortgage', 'rent'],
    softNegativeHints: ['lead gen', 'call me'],
    rssTopics: ['realestate', 'business'],
    rssSynonyms: ['real estate', 'housing', 'property', 'mortgage', 'rent', 'home prices'],
  },
  {
    key: 'auto_ev',
    triggers: ['auto', 'automotive', 'cars', 'car', 'ev', 'electric vehicle', 'tesla', 'byd', 'vehicle'],
    triggerPattern: /\b(?:auto|automotive|cars|car|ev|electric vehicle|tesla|byd|vehicle|charging|battery)\b/i,
    entityQuery: globalQuery('(auto OR automotive OR cars OR EV OR "electric vehicle" OR Tesla OR BYD OR battery) (market OR launch OR review OR sales)'),
    viralQuery: viralQuery('(EV OR "electric vehicle" OR Tesla OR BYD OR automotive OR cars) (launch OR sales OR review OR charging OR battery)', 500),
    fallbackQueries: [
      globalQuery('(auto OR automotive OR cars OR EV OR "electric vehicle" OR Tesla OR BYD)'),
      globalQuery('(vehicle OR charging OR battery OR car market OR auto sales)'),
      viralQuery('(EV OR Tesla OR BYD OR automotive) (launch OR sales OR review OR battery)', 500),
    ],
    hints: ['auto', 'automotive', 'cars', 'ev', 'electric vehicle', 'tesla', 'byd', 'vehicle', 'charging', 'battery'],
    exactTerms: ['auto', 'automotive', 'cars', 'car', 'ev', 'electric vehicle'],
    softNegativeHints: ['dealer promo', 'lease deal'],
    rssTopics: ['auto', 'tech', 'business'],
    rssSynonyms: ['auto', 'automotive', 'cars', 'ev', 'electric vehicle', 'tesla', 'byd'],
  },
];

export const topicMatchesQuery = (query = '', topic = {}) => {
  const normalized = normalizeDiscoveryText(query);
  if (!normalized) return false;

  if (topic.triggerPattern?.test(String(query || '')) || topic.triggerPattern?.test(normalized)) {
    return true;
  }

  return (topic.triggers || []).some((trigger) => {
    if (THAI_TEXT_PATTERN.test(trigger)) {
      return String(query || '').toLowerCase().includes(String(trigger || '').toLowerCase());
    }

    const normalizedTrigger = normalizeDiscoveryText(trigger);
    return normalizedTrigger && normalized.includes(normalizedTrigger);
  });
};

const getTopicMatchScore = (query = '', topic = {}) => {
  const normalized = normalizeDiscoveryText(query);
  if (!normalized || !topicMatchesQuery(query, topic)) return -1;

  const triggerScore = (topic.triggers || []).reduce((score, trigger) => {
    if (THAI_TEXT_PATTERN.test(trigger)) {
      return String(query || '').toLowerCase().includes(String(trigger || '').toLowerCase())
        ? Math.max(score, String(trigger || '').length)
        : score;
    }

    const normalizedTrigger = normalizeDiscoveryText(trigger);
    if (!normalizedTrigger || !normalized.includes(normalizedTrigger)) return score;
    return Math.max(score, normalizedTrigger.length);
  }, 0);

  return (topic.priority ?? 20) * 100 + triggerScore;
};

export const getContentDiscoveryTopic = (query = '') =>
  CONTENT_DISCOVERY_TOPICS
    .map((topic, index) => ({ topic, index, score: getTopicMatchScore(query, topic) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.topic || null;

export const getContentTopicHints = (query = '') => {
  const topic = getContentDiscoveryTopic(query);
  if (!topic) return [];

  return unique([
    ...(topic.exactTerms || []),
    ...(topic.hints || []),
  ]);
};

export const getContentQueryBlueprint = (query = '') => {
  const topic = getContentDiscoveryTopic(query);
  if (!topic) return null;

  return {
    key: topic.key,
    entityQuery: topic.entityQuery,
    viralQuery: topic.viralQuery,
    engagementQuery: topic.viralQuery,
  };
};

export const getContentFallbackQueries = (query = '') => {
  const topic = getContentDiscoveryTopic(query);
  return topic ? [...(topic.fallbackQueries || [])] : [];
};
