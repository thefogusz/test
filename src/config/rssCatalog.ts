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
    { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว AI, startup, เปิดตัวผลิตภัณฑ์ใหม่', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'verge-ai', name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', siteUrl: 'https://theverge.com', description: 'เทคโนโลยี AI สำหรับผู้บริโภค อ่านง่าย', frequency: '~8 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'mit-tech-review', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', siteUrl: 'https://technologyreview.com', description: 'วิเคราะห์เชิงลึก AI, science, นโยบาย', frequency: '~3 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'openai-blog', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com', description: 'ประกาศและอัปเดตจาก OpenAI โดยตรง', frequency: '~2 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'hn-ai', name: 'Hacker News (AI)', url: 'https://hnrss.org/frontpage?q=AI&points=50', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์ยอดนิยมจาก developer community', frequency: '~10 ลิงก์/วัน', lang: 'en', type: 'community', topic: 'ai' },
    { id: 'reddit-artificial', name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', siteUrl: 'https://reddit.com/r/artificial', description: 'Community discussion เรื่อง AI', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'ai' },
  ],
  tech: [
    { id: 'techcrunch', name: 'TechCrunch', url: 'https://feeds.feedburner.com/TechCrunch', siteUrl: 'https://techcrunch.com', description: 'ข่าว startup, tech, venture capital', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', siteUrl: 'https://theverge.com', description: 'เทคโนโลยี, gadget, วัฒนธรรมดิจิทัล', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', siteUrl: 'https://arstechnica.com', description: 'เทคโนโลยีเชิงลึก, วิทยาศาสตร์', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss', siteUrl: 'https://wired.com', description: 'เทคโนโลยี, วิทยาศาสตร์, วัฒนธรรม', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'hn-frontpage', name: 'Hacker News', url: 'https://hnrss.org/frontpage?points=100', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์ยอดนิยม 100+ upvotes จาก developer community', frequency: '~15 ลิงก์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'producthunt', name: 'Product Hunt', url: 'https://www.producthunt.com/feed', siteUrl: 'https://producthunt.com', description: 'ผลิตภัณฑ์ใหม่ทุกวัน, startup launches', frequency: '~10 โพสต์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'blognone', name: 'Blognone', url: 'https://www.blognone.com/feed', siteUrl: 'https://blognone.com', description: 'ข่าว tech อันดับ 1 ของไทย', frequency: '~10 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
    { id: 'techsauce', name: 'Techsauce', url: 'https://techsauce.co/feed', siteUrl: 'https://techsauce.co', description: 'Startup, tech ecosystem ไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
    { id: 'beartai', name: 'Beartai', url: 'https://www.beartai.com/feed', siteUrl: 'https://beartai.com', description: 'Tech, gadget, รีวิวภาษาไทย', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
  ],
  gaming: [
    { id: 'ign', name: 'IGN', url: 'https://feeds.feedburner.com/ign/all', siteUrl: 'https://ign.com', description: 'รีวิวเกม, ข่าวเกม, trailer ใหม่', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'kotaku', name: 'Kotaku', url: 'https://kotaku.com/rss', siteUrl: 'https://kotaku.com', description: 'วัฒนธรรมเกม, วิเคราะห์, ข่าววงใน', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'ars-gaming', name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', siteUrl: 'https://arstechnica.com', description: 'รีวิวเกมเชิงลึก, วิเคราะห์อุตสาหกรรม', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'reddit-gaming', name: 'Reddit r/gaming', url: 'https://www.reddit.com/r/gaming/top/.rss?t=day', siteUrl: 'https://reddit.com/r/gaming', description: 'โพสต์ยอดนิยมจาก community เกม', frequency: '~25 โพสต์/วัน', lang: 'en', type: 'community', topic: 'gaming' },
    { id: 'compgamer', name: 'COMPGAMER', url: 'https://www.compgamer.com/feed/', siteUrl: 'https://compgamer.com', description: 'ข่าวเกมภาษาไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'gaming' },
  ],
  crypto: [
    { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', siteUrl: 'https://coindesk.com', description: 'ข่าว crypto, blockchain, DeFi', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', siteUrl: 'https://theblock.co', description: 'วิเคราะห์ตลาด crypto เชิงลึก', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'reddit-crypto', name: 'Reddit r/cryptocurrency', url: 'https://www.reddit.com/r/cryptocurrency/top/.rss?t=day', siteUrl: 'https://reddit.com/r/cryptocurrency', description: 'Community discussion เรื่อง crypto', frequency: '~30 โพสต์/วัน', lang: 'en', type: 'community', topic: 'crypto' },
  ],
  business: [
    { id: 'reuters-biz', name: 'Reuters Business', url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best', siteUrl: 'https://reuters.com', description: 'ข่าวธุรกิจโลก, การค้าระหว่างประเทศ', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'hbr', name: 'Harvard Business Review', url: 'https://hbr.org/resources/images/article_assets/hbr_rss/RSS_HBR.xml', siteUrl: 'https://hbr.org', description: 'บทความธุรกิจ, กลยุทธ์, การจัดการ', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'brandinside', name: 'Brand Inside', url: 'https://brandinside.asia/feed/', siteUrl: 'https://brandinside.asia', description: 'ธุรกิจ, การตลาด, เศรษฐกิจไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
    { id: 'prachachat', name: 'ประชาชาติธุรกิจ', url: 'https://www.prachachat.net/feed', siteUrl: 'https://prachachat.net', description: 'ข่าวธุรกิจ, เศรษฐกิจ, การเงินไทย', frequency: '~20 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
  ],
  finance: [
    { id: 'bloomberg', name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', siteUrl: 'https://bloomberg.com', description: 'ข่าวตลาดเงิน, หุ้น, เศรษฐกิจโลก', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', siteUrl: 'https://finance.yahoo.com', description: 'ข่าวการเงิน, หุ้น, การลงทุน', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'reddit-investing', name: 'Reddit r/investing', url: 'https://www.reddit.com/r/investing/top/.rss?t=day', siteUrl: 'https://reddit.com/r/investing', description: 'Community discussion เรื่องการลงทุน', frequency: '~15 โพสต์/วัน', lang: 'en', type: 'community', topic: 'finance' },
  ],
  science: [
    { id: 'nature', name: 'Nature News', url: 'https://www.nature.com/nature.rss', siteUrl: 'https://nature.com', description: 'วิทยาศาสตร์ระดับโลก, งานวิจัยใหม่', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'newscientist', name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', siteUrl: 'https://newscientist.com', description: 'วิทยาศาสตร์ที่อ่านเข้าใจง่าย', frequency: '~8 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'reddit-science', name: 'Reddit r/science', url: 'https://www.reddit.com/r/science/top/.rss?t=day', siteUrl: 'https://reddit.com/r/science', description: 'Community discussion เรื่องวิทยาศาสตร์', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'science' },
  ],
  news: [
    { id: 'thestandard', name: 'The Standard', url: 'https://thestandard.co/feed/', siteUrl: 'https://thestandard.co', description: 'ข่าวเชิงลึก, สังคม, ไลฟ์สไตล์', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'thematter', name: 'The Matter', url: 'https://thematter.co/feed', siteUrl: 'https://thematter.co', description: 'สังคม, การเมือง, วัฒนธรรม', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'matichon', name: 'มติชน', url: 'https://www.matichon.co.th/feed', siteUrl: 'https://matichon.co.th', description: 'ข่าวทั่วไป, การเมือง, สังคม', frequency: '~30 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'workpoint', name: 'Workpoint News', url: 'https://workpointnews.com/feed/', siteUrl: 'https://workpointnews.com', description: 'ข่าวทั่วไป, เศรษฐกิจ, บันเทิง', frequency: '~20 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'bbc', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', siteUrl: 'https://bbc.com/news', description: 'ข่าวโลกจาก BBC', frequency: '~50 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'reuters', name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=general-news', siteUrl: 'https://reuters.com', description: 'ข่าวโลก, การเมืองระหว่างประเทศ', frequency: '~40 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
  ],
};

export const TOPIC_LABELS: Record<string, { label: string; icon: string; count: number }> = {
  ai: { label: 'AI', icon: '🤖', count: RSS_CATALOG.ai?.length || 0 },
  tech: { label: 'เทค', icon: '💻', count: RSS_CATALOG.tech?.length || 0 },
  gaming: { label: 'เกม', icon: '🎮', count: RSS_CATALOG.gaming?.length || 0 },
  crypto: { label: 'คริปโต', icon: '₿', count: RSS_CATALOG.crypto?.length || 0 },
  business: { label: 'ธุรกิจ', icon: '💼', count: RSS_CATALOG.business?.length || 0 },
  finance: { label: 'การเงิน', icon: '💰', count: RSS_CATALOG.finance?.length || 0 },
  science: { label: 'วิทยาศาสตร์', icon: '🔬', count: RSS_CATALOG.science?.length || 0 },
  news: { label: 'ข่าวทั่วไป', icon: '📰', count: RSS_CATALOG.news?.length || 0 },
};
