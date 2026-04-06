export interface RssSource {
  id: string;
  name: string;
  url: string;
  siteUrl: string;
  description: string;
  frequency: string;
  lang: 'en' | 'th';
  type: 'news' | 'community';
  topic: string;
}

export const RSS_CATALOG: Record<string, RssSource[]> = {
  ai: [
    { id: 'google-research-blog', name: 'Google Research Blog', url: 'https://research.google/blog/rss/', siteUrl: 'https://research.google/blog', description: 'งานวิจัย, โมเดล, และ technical updates จาก Google Research', frequency: '~2-3 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'microsoft-research', name: 'Microsoft Research Blog', url: 'https://www.microsoft.com/en-us/research/feed/', siteUrl: 'https://www.microsoft.com/en-us/research/blog', description: 'งานวิจัย, benchmark, และ technical work จาก Microsoft Research', frequency: '~2-3 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว AI, startup, และผลิตภัณฑ์ใหม่', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'mit-tech-review', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', siteUrl: 'https://technologyreview.com', description: 'วิเคราะห์ AI เชิงลึก, science, policy', frequency: '~3 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'openai-blog', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com', description: 'ประกาศและอัปเดตจาก OpenAI โดยตรง', frequency: '~2 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'anthropic-blog', name: 'Anthropic Blog', url: 'https://www.anthropic.com/blog/rss.xml', siteUrl: 'https://www.anthropic.com/blog', description: 'งานวิจัย, safety, และ Claude updates จาก Anthropic', frequency: '~2-3 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'venturebeat-ai', name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', siteUrl: 'https://venturebeat.com/category/ai', description: 'ข่าว AI, enterprise, และ startup ด้าน AI', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'google-ai', name: 'Google AI', url: 'https://blog.google/technology/ai/rss/', siteUrl: 'https://blog.google/technology/ai', description: 'อัปเดต Gemini, Google AI และผลิตภัณฑ์ฝั่ง AI', frequency: '~3-5 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'google-deepmind', name: 'Google DeepMind', url: 'https://blog.google/technology/google-deepmind/rss/', siteUrl: 'https://deepmind.google', description: 'งานวิจัย โมเดล และประกาศจาก Google DeepMind', frequency: '~2-4 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'aws-ml-blog', name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', siteUrl: 'https://aws.amazon.com/blogs/machine-learning', description: 'use case, infra, eval และ production AI บน AWS', frequency: '~3-5 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'github-ai-ml', name: 'GitHub AI & ML', url: 'https://github.blog/ai-and-ml/feed/', siteUrl: 'https://github.blog/ai-and-ml', description: 'AI tooling, Copilot, agents และ developer workflow', frequency: '~2-4 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'huggingface-blog', name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', siteUrl: 'https://huggingface.co/blog', description: 'open-source AI, model release, eval และ deployment', frequency: '~2-4 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'nvidia-blog', name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', siteUrl: 'https://blogs.nvidia.com', description: 'GPU, physical AI, robotics และ enterprise AI', frequency: '~3-5 โพสต์/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'hn-ai', name: 'Hacker News (AI)', url: 'https://hnrss.org/frontpage?q=AI&points=50', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์เด่นจาก developer community', frequency: '~10 ลิงก์/วัน', lang: 'en', type: 'community', topic: 'ai' },
    { id: 'reddit-artificial', name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', siteUrl: 'https://reddit.com/r/artificial', description: 'Community discussion เรื่อง AI', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'ai' },
  ],
  tech: [
    { id: 'engadget', name: 'Engadget', url: 'https://www.engadget.com/rss.xml', siteUrl: 'https://www.engadget.com', description: 'Consumer tech, gadgets, and platform updates', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: '9to5google', name: '9to5Google', url: 'https://9to5google.com/guides/google/feed/', siteUrl: 'https://9to5google.com', description: 'Google ecosystem, Android, and device news', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'android-authority', name: 'Android Authority', url: 'https://www.androidauthority.com/feed/', siteUrl: 'https://www.androidauthority.com', description: 'Android, mobile hardware, and app ecosystem news', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'techradar', name: 'TechRadar', url: 'https://www.techradar.com/rss', siteUrl: 'https://www.techradar.com', description: 'Broad consumer tech coverage, reviews, and buying guides', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'zdnet', name: 'ZDNET', url: 'https://www.zdnet.com/news/rss.xml', siteUrl: 'https://www.zdnet.com', description: 'Enterprise tech, cloud, security, and workplace IT coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', siteUrl: 'https://www.bleepingcomputer.com', description: 'Security incidents, malware, and platform vulnerability coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว startup, tech, venture capital', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', siteUrl: 'https://theverge.com', description: 'เทคโนโลยี, gadget, วัฒนธรรมดิจิทัล', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', siteUrl: 'https://arstechnica.com', description: 'เทคโนโลยีเชิงลึก, วิทยาศาสตร์', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss', siteUrl: 'https://wired.com', description: 'เทคโนโลยี, วิทยาศาสตร์, วัฒนธรรม', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: '9to5mac', name: '9to5Mac', url: 'https://9to5mac.com/guides/apple/feed/', siteUrl: 'https://9to5mac.com', description: 'Apple ecosystem, iPhone, Mac, and iOS news', frequency: '~15 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'macrumors', name: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All', siteUrl: 'https://www.macrumors.com', description: 'Apple rumours, releases, and hardware coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'hn-frontpage', name: 'Hacker News', url: 'https://hnrss.org/frontpage?points=100', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์ยอดนิยมจาก developer community', frequency: '~15 ลิงก์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'producthunt', name: 'Product Hunt', url: 'https://www.producthunt.com/feed', siteUrl: 'https://producthunt.com', description: 'ผลิตภัณฑ์ใหม่และ startup launches', frequency: '~10 โพสต์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'techsauce', name: 'Techsauce', url: 'https://techsauce.co/feed', siteUrl: 'https://techsauce.co', description: 'Startup และ tech ecosystem ไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
    { id: 'beartai', name: 'Beartai', url: 'https://www.beartai.com/feed', siteUrl: 'https://beartai.com', description: 'Tech, gadget, รีวิวภาษาไทย', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
  ],
  developer: [
    { id: 'cloudflare-blog', name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', siteUrl: 'https://blog.cloudflare.com', description: 'Infra, networking, security, and developer platform updates', frequency: '~4 posts/week', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'docker-blog', name: 'Docker Blog', url: 'https://www.docker.com/blog/feed/', siteUrl: 'https://www.docker.com/blog', description: 'Containers, dev environments, and platform updates from Docker', frequency: '~2-3 posts/week', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'github-engineering', name: 'GitHub Engineering', url: 'https://github.blog/engineering/feed/', siteUrl: 'https://github.blog/engineering', description: 'Engineering deep dives, infrastructure, and developer tooling from GitHub', frequency: '~2-3 posts/week', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'infoq', name: 'InfoQ', url: 'https://feed.infoq.com/', siteUrl: 'https://www.infoq.com', description: 'Architecture, engineering, platform, and software delivery coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'stack-overflow-blog', name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', siteUrl: 'https://stackoverflow.blog', description: 'Developer culture, tooling, and ecosystem updates', frequency: '~4 posts/week', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'the-new-stack', name: 'The New Stack', url: 'https://thenewstack.io/feed/', siteUrl: 'https://thenewstack.io', description: 'Cloud native, AI engineering, and platform infrastructure coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'developer' },
  ],
  security: [
    { id: 'dark-reading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', siteUrl: 'https://www.darkreading.com', description: 'Enterprise security, threats, and incident coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'security' },
    { id: 'securityweek', name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/', siteUrl: 'https://www.securityweek.com', description: 'Cybersecurity news, policy, and vulnerability coverage', frequency: '~5 posts/day', lang: 'en', type: 'news', topic: 'security' },
    { id: 'the-record', name: 'The Record', url: 'https://therecord.media/feed', siteUrl: 'https://therecord.media', description: 'Cybersecurity reporting focused on incidents and national security', frequency: '~3 posts/day', lang: 'en', type: 'news', topic: 'security' },
    { id: 'schneier-on-security', name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/', siteUrl: 'https://www.schneier.com', description: 'Security analysis, cryptography, and policy commentary', frequency: '~2-3 posts/week', lang: 'en', type: 'news', topic: 'security' },
    { id: 'krebs-on-security', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', siteUrl: 'https://krebsonsecurity.com', description: 'Investigative cybersecurity reporting and threat analysis', frequency: '~2-3 posts/week', lang: 'en', type: 'news', topic: 'security' },
  ],
  gaming: [
    { id: 'eurogamer', name: 'Eurogamer', url: 'https://www.eurogamer.net/feed', siteUrl: 'https://www.eurogamer.net', description: 'European gaming news, reviews, and release coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'polygon', name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', siteUrl: 'https://www.polygon.com', description: 'Gaming culture, reviews, and industry coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'pc-gamer', name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', siteUrl: 'https://www.pcgamer.com', description: 'PC gaming news, hardware tie-ins, and game coverage', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'gamespot', name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/', siteUrl: 'https://www.gamespot.com', description: 'Console and PC gaming news, reviews, and trailers', frequency: '~15 posts/day', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'ign', name: 'IGN', url: 'https://feeds.feedburner.com/ign/all', siteUrl: 'https://ign.com', description: 'รีวิวเกม, ข่าวเกม, trailer ใหม่', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'kotaku', name: 'Kotaku', url: 'https://kotaku.com/rss', siteUrl: 'https://kotaku.com', description: 'วัฒนธรรมเกม, วิเคราะห์, ข่าววงใน', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'ars-gaming', name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', siteUrl: 'https://arstechnica.com', description: 'รีวิวเกมเชิงลึกและอุตสาหกรรมเกม', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'reddit-gaming', name: 'Reddit r/gaming', url: 'https://www.reddit.com/r/gaming/top/.rss?t=day', siteUrl: 'https://reddit.com/r/gaming', description: 'โพสต์ยอดนิยมจาก community เกม', frequency: '~25 โพสต์/วัน', lang: 'en', type: 'community', topic: 'gaming' },
    { id: 'compgamer', name: 'COMPGAMER', url: 'https://www.compgamer.com/feed/', siteUrl: 'https://compgamer.com', description: 'ข่าวเกมภาษาไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'gaming' },
  ],
  crypto: [
    { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', siteUrl: 'https://cointelegraph.com', description: 'Crypto markets, policy, and ecosystem coverage', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed', siteUrl: 'https://decrypt.co', description: 'Crypto, Web3, and product-facing blockchain coverage', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', siteUrl: 'https://coindesk.com', description: 'ข่าว crypto, blockchain, DeFi', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', siteUrl: 'https://theblock.co', description: 'วิเคราะห์ตลาด crypto เชิงลึก', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'reddit-crypto', name: 'Reddit r/cryptocurrency', url: 'https://www.reddit.com/r/cryptocurrency/top/.rss?t=day', siteUrl: 'https://reddit.com/r/cryptocurrency', description: 'Community discussion เรื่อง crypto', frequency: '~30 โพสต์/วัน', lang: 'en', type: 'community', topic: 'crypto' },
  ],
  business: [
    { id: 'fortune', name: 'Fortune', url: 'https://fortune.com/feed/', siteUrl: 'https://fortune.com', description: 'Global business, leadership, and company coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'business' },
    { id: 'fast-company', name: 'Fast Company', url: 'https://www.fastcompany.com/rss', siteUrl: 'https://www.fastcompany.com', description: 'Innovation, startups, design, and modern workplace coverage', frequency: '~15 posts/day', lang: 'en', type: 'news', topic: 'business' },
    { id: 'inc', name: 'Inc.', url: 'https://www.inc.com/rss/homepage.xml', siteUrl: 'https://www.inc.com', description: 'Startup operators, SMB growth, and entrepreneurship coverage', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'business' },
    { id: 'economist', name: 'The Economist', url: 'https://www.economist.com/latest/rss.xml', siteUrl: 'https://www.economist.com', description: 'Global business, politics, and economics analysis', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'business' },
    { id: 'hbr', name: 'Harvard Business Review', url: 'https://hbr.org/stories.rss', siteUrl: 'https://hbr.org', description: 'Leadership, strategy, and management insights', frequency: '~5 posts/day', lang: 'en', type: 'news', topic: 'business' },
    { id: 'brandinside', name: 'Brand Inside', url: 'https://brandinside.asia/feed/', siteUrl: 'https://brandinside.asia', description: 'ธุรกิจ, การตลาด, เศรษฐกิจไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
    { id: 'prachachat', name: 'ประชาชาติธุรกิจ', url: 'https://www.prachachat.net/feed', siteUrl: 'https://prachachat.net', description: 'ข่าวธุรกิจ, เศรษฐกิจ, การเงินไทย', frequency: '~20 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
  ],
  finance: [
    { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', siteUrl: 'https://www.cnbc.com', description: 'Markets, macro news, and business headlines', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', siteUrl: 'https://www.marketwatch.com', description: 'Markets, personal finance, and investing coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'seeking-alpha', name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed.xml', siteUrl: 'https://seekingalpha.com', description: 'Investor commentary, earnings reactions, and market sentiment', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'bloomberg', name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', siteUrl: 'https://bloomberg.com', description: 'ข่าวตลาดเงิน, หุ้น, เศรษฐกิจโลก', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', siteUrl: 'https://finance.yahoo.com', description: 'ข่าวการเงิน, หุ้น, การลงทุน', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'reddit-investing', name: 'Reddit r/investing', url: 'https://www.reddit.com/r/investing/top/.rss?t=day', siteUrl: 'https://reddit.com/r/investing', description: 'Community discussion เรื่องการลงทุน', frequency: '~15 โพสต์/วัน', lang: 'en', type: 'community', topic: 'finance' },
  ],
  science: [
    { id: 'nasa-breaking-news', name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', siteUrl: 'https://www.nasa.gov/news', description: 'Official NASA announcements, launches, and mission updates', frequency: '~5 posts/week', lang: 'en', type: 'news', topic: 'science' },
    { id: 'quanta-magazine', name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', siteUrl: 'https://www.quantamagazine.org', description: 'Deep science explainers across physics, math, and AI-adjacent topics', frequency: '~3 posts/week', lang: 'en', type: 'news', topic: 'science' },
    { id: 'science-news', name: 'Science News', url: 'https://www.sciencenews.org/feed', siteUrl: 'https://www.sciencenews.org', description: 'General science coverage with strong daily news cadence', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'science' },
    { id: 'live-science', name: 'Live Science', url: 'https://www.livescience.com/feeds/all', siteUrl: 'https://www.livescience.com', description: 'Space, biology, climate, and accessible science news', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'science' },
    { id: 'nature', name: 'Nature News', url: 'https://www.nature.com/nature.rss', siteUrl: 'https://nature.com', description: 'วิทยาศาสตร์ระดับโลกและงานวิจัยใหม่', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'newscientist', name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', siteUrl: 'https://newscientist.com', description: 'วิทยาศาสตร์ที่อ่านเข้าใจง่าย', frequency: '~8 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'reddit-science', name: 'Reddit r/science', url: 'https://www.reddit.com/r/science/top/.rss?t=day', siteUrl: 'https://reddit.com/r/science', description: 'Community discussion เรื่องวิทยาศาสตร์', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'science' },
  ],
  news: [
    { id: 'npr-news', name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', siteUrl: 'https://www.npr.org', description: 'US and global news from NPR', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'al-jazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', siteUrl: 'https://www.aljazeera.com', description: 'Global breaking news with strong international coverage', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'guardian-world', name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', siteUrl: 'https://www.theguardian.com/world', description: 'World affairs and international news coverage', frequency: '~30 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'abc-news', name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories', siteUrl: 'https://abcnews.go.com', description: 'Top stories from ABC News', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'cbs-news', name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main', siteUrl: 'https://www.cbsnews.com', description: 'US headlines and international coverage from CBS News', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'time', name: 'TIME', url: 'https://time.com/feed/', siteUrl: 'https://time.com', description: 'News, politics, and analysis from TIME', frequency: '~20 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'bangkok-post', name: 'Bangkok Post', url: 'https://www.bangkokpost.com/rss/data/topstories.xml', siteUrl: 'https://www.bangkokpost.com', description: 'English-language Thailand and regional news coverage', frequency: '~10 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'thestandard', name: 'The Standard', url: 'https://thestandard.co/feed/', siteUrl: 'https://thestandard.co', description: 'ข่าวเชิงลึก, สังคม, ไลฟ์สไตล์', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'thematter', name: 'The Matter', url: 'https://thematter.co/feed', siteUrl: 'https://thematter.co', description: 'สังคม, การเมือง, วัฒนธรรม', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'matichon', name: 'มติชน', url: 'https://www.matichon.co.th/feed', siteUrl: 'https://matichon.co.th', description: 'ข่าวทั่วไป, การเมือง, สังคม', frequency: '~30 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'bbc', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', siteUrl: 'https://bbc.com/news', description: 'ข่าวโลกจาก BBC', frequency: '~50 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'reuters', name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', siteUrl: 'https://reuters.com', description: 'ข่าวโลกจาก Reuters สำนักข่าวระดับโลก', frequency: '~50 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'ap-news', name: 'AP News', url: 'https://feeds.apnews.com/rss/apf-topnews', siteUrl: 'https://apnews.com', description: 'Associated Press top stories — breaking news worldwide', frequency: '~30 posts/day', lang: 'en', type: 'news', topic: 'news' },
    { id: 'ft-world', name: 'Financial Times', url: 'https://www.ft.com/?format=rss', siteUrl: 'https://www.ft.com', description: 'Global business, finance, and politics coverage', frequency: '~30 posts/day', lang: 'en', type: 'news', topic: 'news' },
  ],
};

export const TOPIC_LABELS: Record<string, { label: string; icon: string; count: number }> = {
  ai: { label: 'AI', icon: '🤖', count: RSS_CATALOG.ai?.length || 0 },
  tech: { label: 'เทค', icon: '💻', count: RSS_CATALOG.tech?.length || 0 },
  developer: { label: 'นักพัฒนา', icon: '🧑‍💻', count: RSS_CATALOG.developer?.length || 0 },
  security: { label: 'ไซเบอร์', icon: '🛡️', count: RSS_CATALOG.security?.length || 0 },
  gaming: { label: 'เกม', icon: '🎮', count: RSS_CATALOG.gaming?.length || 0 },
  crypto: { label: 'คริปโต', icon: '₿', count: RSS_CATALOG.crypto?.length || 0 },
  business: { label: 'ธุรกิจ', icon: '💼', count: RSS_CATALOG.business?.length || 0 },
  finance: { label: 'การเงิน', icon: '💰', count: RSS_CATALOG.finance?.length || 0 },
  science: { label: 'วิทยาศาสตร์', icon: '🔬', count: RSS_CATALOG.science?.length || 0 },
  news: { label: 'ข่าวทั่วไป', icon: '📰', count: RSS_CATALOG.news?.length || 0 },
};
