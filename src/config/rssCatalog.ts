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
    { id: 'google-research-blog', name: 'Google Research Blog', url: 'https://research.google/blog/rss/', siteUrl: 'https://research.google/blog', description: 'งานวิจัย, โมเดล, และอัปเดตทางเทคนิคจาก Google Research', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'microsoft-research', name: 'Microsoft Research Blog', url: 'https://www.microsoft.com/en-us/research/feed/', siteUrl: 'https://www.microsoft.com/en-us/research/blog', description: 'งานวิจัย, benchmark, และผลงานล่าสุดจาก Microsoft Research', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว AI, startup, และการเปิดตัวผลิตภัณฑ์ใหม่', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'mit-tech-review', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', siteUrl: 'https://technologyreview.com', description: 'วิเคราะห์ AI เชิงลึก, ผลกระทบต่อสังคมและนโยบาย', frequency: '~3 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'openai-blog', name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com', description: 'ประกาศและอัปเดตโมเดลโดยตรงจาก OpenAI', frequency: '~2 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'anthropic-blog', name: 'Anthropic Blog', url: 'https://www.anthropic.com/blog/rss.xml', siteUrl: 'https://www.anthropic.com/blog', description: 'งานวิจัยความปลอดภัย AI และรายละเอียดรุ่นต่างๆ ของ Claude', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'venturebeat-ai', name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', siteUrl: 'https://venturebeat.com/category/ai', description: 'ข่าวเจาะลึกบริษัท AI และแวดวง startup', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'google-ai', name: 'Google AI', url: 'https://blog.google/technology/ai/rss/', siteUrl: 'https://blog.google/technology/ai', description: 'การเปิดตัวฟีเจอร์ Gemini และผลิตภัณฑ์ฝั่ง AI ของ Google', frequency: '~3-5 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'google-deepmind', name: 'Google DeepMind', url: 'https://blog.google/technology/google-deepmind/rss/', siteUrl: 'https://deepmind.google', description: 'แถลงการงานวิจัยและโมเดลระดับแนวหน้าจาก DeepMind', frequency: '~2-4 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'aws-ml-blog', name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', siteUrl: 'https://aws.amazon.com/blogs/machine-learning', description: 'เทคนิคบน AWS, โครงสร้างพื้นฐานและการประเมินผล AI', frequency: '~3-5 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'github-ai-ml', name: 'GitHub AI & ML', url: 'https://github.blog/ai-and-ml/feed/', siteUrl: 'https://github.blog/ai-and-ml', description: 'อัปเดตเครื่องมืออย่าง Copilot และการพัฒนาด้วย AI', frequency: '~2-4 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'huggingface-blog', name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', siteUrl: 'https://huggingface.co/blog', description: 'open-source AI, การตั้งค่าโมเดลใหม่ๆ และวงการรวมศูนย์ AI', frequency: '~2-4 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'nvidia-blog', name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', siteUrl: 'https://blogs.nvidia.com', description: 'อัปเดตแวดวง GPU, หุ่นยนต์ AI, และประมวลผลเซิร์ฟเวอร์', frequency: '~3-5 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'ai' },
    { id: 'hn-ai', name: 'Hacker News (AI)', url: 'https://hnrss.org/frontpage?q=AI&points=50', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์ข่าวและเครื่องมือยอดนิยมจากคอมมิวนิตีของ developer', frequency: '~10 โพสต์/วัน', lang: 'en', type: 'community', topic: 'ai' },
    { id: 'reddit-artificial', name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', siteUrl: 'https://reddit.com/r/artificial', description: 'การพูดคุยและถกเถียงเรื่อง AI ทั่วไป', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'ai' },
  ],
  tech: [
    { id: 'engadget', name: 'Engadget', url: 'https://www.engadget.com/rss.xml', siteUrl: 'https://www.engadget.com', description: 'ข่าวไลฟ์สไตล์ไอที, แก็ดเจ็ต และเทคโนโลยีผู้บริโภค', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: '9to5google', name: '9to5Google', url: 'https://9to5google.com/guides/google/feed/', siteUrl: 'https://9to5google.com', description: 'เจาะกลุ่มข่าว Android มือถือรุ่นใหม่ และระบบนิเวศน์ทางฝั่ง Google', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'android-authority', name: 'Android Authority', url: 'https://www.androidauthority.com/feed/', siteUrl: 'https://www.androidauthority.com', description: 'ข่าวสารฝั่งอุปกรณ์แอนดรอยด์, ฮาร์ดแวร์มือถือ, และระบบนิเวศน์แอพ', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'techradar', name: 'TechRadar', url: 'https://www.techradar.com/rss', siteUrl: 'https://www.techradar.com', description: 'รีวิว เจาะตลาดแก็ดเจ็ตทั่วไป และคู่มือสำหรับการซื้อสินค้า', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'zdnet', name: 'ZDNET', url: 'https://www.zdnet.com/news/rss.xml', siteUrl: 'https://www.zdnet.com', description: 'ข่าวสารเน้นกลุ่มบริษัทไอที คลาวด์ซีเคียวริตี้และ workplace IT', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', siteUrl: 'https://www.bleepingcomputer.com', description: 'เหตุการณ์มัลแวร์ข้ามพรมแดน ช่องโหว่ และอันตรายของระบบ', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', siteUrl: 'https://techcrunch.com', description: 'ข่าว startup, tech, venture capital', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', siteUrl: 'https://theverge.com', description: 'เทคโนโลยี, gadget, วัฒนธรรมดิจิทัล', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', siteUrl: 'https://arstechnica.com', description: 'เรื่องเทคโนโลยีเจาะลึกเฉพาะทางและงานด้านวิทยาศาสตร์', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'wired', name: 'Wired', url: 'https://www.wired.com/feed/rss', siteUrl: 'https://wired.com', description: 'สรุปแวดวงเทคโนโลยีผสมผสานไปกับวัฒนธรรมด้านอื่นๆ ของมนุษย์', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: '9to5mac', name: '9to5Mac', url: 'https://9to5mac.com/guides/apple/feed/', siteUrl: 'https://9to5mac.com', description: 'เจาะติดระบบนิเวศน์ของ Apple ทั้งข่าวเจาะจง iPhone, Mac และ iOS ทั่วไป', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'macrumors', name: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All', siteUrl: 'https://www.macrumors.com', description: 'รวมข่าวหลุดต่างๆ สินค้า Apple และข่าวเจาะลึกผลิตภัณฑ์ใหม่', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'tech' },
    { id: 'hn-frontpage', name: 'Hacker News', url: 'https://hnrss.org/frontpage?points=100', siteUrl: 'https://news.ycombinator.com', description: 'ลิงก์ยอดนิยมจาก developer community', frequency: '~15 ลิงก์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'producthunt', name: 'Product Hunt', url: 'https://www.producthunt.com/feed', siteUrl: 'https://producthunt.com', description: 'ผลิตภัณฑ์ใหม่และ startup launches', frequency: '~10 โพสต์/วัน', lang: 'en', type: 'community', topic: 'tech' },
    { id: 'techsauce', name: 'Techsauce', url: 'https://techsauce.co/feed', siteUrl: 'https://techsauce.co', description: 'Startup และระบบนิเวศน์ทางไอทีในไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
    { id: 'beartai', name: 'Beartai', url: 'https://www.beartai.com/feed', siteUrl: 'https://beartai.com', description: 'Tech, gadget, รีวิวภาษาไทย', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'tech' },
  ],
  developer: [
    { id: 'cloudflare-blog', name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', siteUrl: 'https://blog.cloudflare.com', description: 'อัปเดตเครือข่ายความปลอดภัยสำหรับนักพัฒนาเซิร์ฟเวอร์โดยตรงจากแบรนด์', frequency: '~4 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'docker-blog', name: 'Docker Blog', url: 'https://www.docker.com/blog/feed/', siteUrl: 'https://www.docker.com/blog', description: 'แพลตฟอร์มการพัฒนาคอนเทนเนอร์บนฐานโลกการปรับปรุงจาก Docker', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'github-engineering', name: 'GitHub Engineering', url: 'https://github.blog/engineering/feed/', siteUrl: 'https://github.blog/engineering', description: 'บทความเจาะโครงสร้างทางเทคโนโลยีเจาะลึกและเครื่องมือนักพัฒนาจาก GitHub', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'infoq', name: 'InfoQ', url: 'https://feed.infoq.com/', siteUrl: 'https://www.infoq.com', description: 'นวัตกรรมทางสถาปัตยกรรมระบบ โครงสร้างซอฟต์แวร์และการส่งเสริมซอฟต์แวร์', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'stack-overflow-blog', name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/', siteUrl: 'https://stackoverflow.blog', description: 'อัปเดตวัฒนธรรมการเขียนโค้ดและระบบนิเวศน์แวดล้อม', frequency: '~4 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'developer' },
    { id: 'the-new-stack', name: 'The New Stack', url: 'https://thenewstack.io/feed/', siteUrl: 'https://thenewstack.io', description: 'รวมความรู้เชิงวิศวกรรมฝั่งคลาวด์ สถาปัตยกรรมโครงสร้างและการพัฒนา AI', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'developer' },
  ],
  security: [
    { id: 'dark-reading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', siteUrl: 'https://www.darkreading.com', description: 'ความปลอดภัยภัยคุกคาม และเหตุการณ์สืบเนื่องระดับบริษัทยักษ์ใหญ่', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'security' },
    { id: 'securityweek', name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/', siteUrl: 'https://www.securityweek.com', description: 'ข่าวสารช่องโหว่ มัลแวร์ การเจาะระบบ นโยบายความปลอดภัยไซเบอร์', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'security' },
    { id: 'the-record', name: 'The Record', url: 'https://therecord.media/feed', siteUrl: 'https://therecord.media', description: 'รายงานระดับชาติมุ่งเน้นข้อมูลอุบัติการณ์ช่องโหว่ความมั่นคง', frequency: '~3 บทความ/วัน', lang: 'en', type: 'news', topic: 'security' },
    { id: 'schneier-on-security', name: 'Schneier on Security', url: 'https://www.schneier.com/feed/atom/', siteUrl: 'https://www.schneier.com', description: 'บทวิเคราะห์เรื่องซีเคียวริตี้ การเข้ารหัสและนโยบายทางกฎหมาย', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'security' },
    { id: 'krebs-on-security', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', siteUrl: 'https://krebsonsecurity.com', description: 'บล็อกสืบสวนหาภัยคุกคามทางไซเบอร์เจาะลึก', frequency: '~2-3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'security' },
  ],
  gaming: [
    { id: 'eurogamer', name: 'Eurogamer', url: 'https://www.eurogamer.net/feed', siteUrl: 'https://www.eurogamer.net', description: 'ข่าวเกมทางฝั่งโซนยุโรป รีวิว และพรีวิวเกมล่วงหน้า', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'polygon', name: 'Polygon', url: 'https://www.polygon.com/rss/index.xml', siteUrl: 'https://www.polygon.com', description: 'เรื่องเล่าวิดีโอเกม รีวิว และแง่มุมความเป็นมาในอุตสาหกรรม', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'pc-gamer', name: 'PC Gamer', url: 'https://www.pcgamer.com/rss/', siteUrl: 'https://www.pcgamer.com', description: 'เกาะติดเกม PC, ลิงก์สู่ฮาร์ดแวร์ค่ายใหญ่ และอุตสาหกรรมพีซีเจาะลึก', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'gamespot', name: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/', siteUrl: 'https://www.gamespot.com', description: 'แหล่งข่าวฝั่งรีวิว ตัวอย่าง Trailer อัปเดตแพตช์คอนโซลและ PC ใหม่', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'ign', name: 'IGN', url: 'https://feeds.feedburner.com/ign/all', siteUrl: 'https://ign.com', description: 'รีวิวเกม, ข่าวเกม, trailer ใหม่ ครอบจักรวาล', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'kotaku', name: 'Kotaku', url: 'https://kotaku.com/rss', siteUrl: 'https://kotaku.com', description: 'วัฒนธรรมเกม, วิเคราะห์, ข่าววงในดราม่า', frequency: '~12 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'ars-gaming', name: 'Ars Technica Gaming', url: 'https://feeds.arstechnica.com/arstechnica/gaming', siteUrl: 'https://arstechnica.com', description: 'รีวิวเกมและอุตสาหกรรมแบบเน้นสาระเชิงลึกจากผู้เชี่ยวชาญ', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'gaming' },
    { id: 'reddit-gaming', name: 'Reddit r/gaming', url: 'https://www.reddit.com/r/gaming/top/.rss?t=day', siteUrl: 'https://reddit.com/r/gaming', description: 'ภาพรวมไฮไลต์และโพสต์ยอดนิยมจาก community ทั่วไป', frequency: '~25 โพสต์/วัน', lang: 'en', type: 'community', topic: 'gaming' },
    { id: 'compgamer', name: 'COMPGAMER', url: 'https://www.compgamer.com/feed/', siteUrl: 'https://compgamer.com', description: 'ข่าวเกมภาษาไทย อัปเดตก่อนใคร', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'gaming' },
  ],
  crypto: [
    { id: 'cointelegraph', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', siteUrl: 'https://cointelegraph.com', description: 'ตลาดข่าวความเคลื่อนไหววงการ Crypto นโยบายระดับชาติ และระบบนิเวศครอบคลุม', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'decrypt', name: 'Decrypt', url: 'https://decrypt.co/feed', siteUrl: 'https://decrypt.co', description: 'นวัตกรรม Web3 ข่าวเหรียญคริปโต และนโยบายบล็อกเชนครอบจักรวาล', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'coindesk', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', siteUrl: 'https://coindesk.com', description: 'รวบรวมข่าวสารบล็อกเชนและ DeFi ทันควัน', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'theblock', name: 'The Block', url: 'https://www.theblock.co/rss.xml', siteUrl: 'https://theblock.co', description: 'การวิเคราะห์เชิงลึกรวมถึงข้อมูลตลาดเหรียญดิจิทัล', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'crypto' },
    { id: 'reddit-crypto', name: 'Reddit r/cryptocurrency', url: 'https://www.reddit.com/r/cryptocurrency/top/.rss?t=day', siteUrl: 'https://reddit.com/r/cryptocurrency', description: 'พื้นที่ถกเถียงแลกเปลี่ยนและแชร์เหรียญจากสังคม', frequency: '~30 โพสต์/วัน', lang: 'en', type: 'community', topic: 'crypto' },
  ],
  business: [
    { id: 'fortune', name: 'Fortune', url: 'https://fortune.com/feed/', siteUrl: 'https://fortune.com', description: 'อัปเดตผู้นำแวดวงธุรกิจทั่วโก องค์กรยักษ์ใหญ่ และเศรษฐศาสตร์การเงินระดับโลก', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'fast-company', name: 'Fast Company', url: 'https://www.fastcompany.com/rss', siteUrl: 'https://www.fastcompany.com', description: 'รวมความรู้ธุรกิจนวัตกรรม องค์กรล้ำหน้าในอุตสาหกรรม การทำงานในอนาคต', frequency: '~15 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'inc', name: 'Inc.', url: 'https://www.inc.com/rss/homepage.xml', siteUrl: 'https://www.inc.com', description: 'กลุ่มธุรกิจ SME การสร้างแบรนด์สำหรับผู้เริ่มต้น และกลยุทธ์เติบโตในทุกมิติ', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'economist', name: 'The Economist', url: 'https://www.economist.com/latest/rss.xml', siteUrl: 'https://www.economist.com', description: 'วิเคราะห์ข่าวเชิงทรรศนะเรื่องการเมือง เศรษฐกิจ สังคมระดับมหภาคโลก', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'hbr', name: 'Harvard Business Review', url: 'https://hbr.org/stories.rss', siteUrl: 'https://hbr.org', description: 'สถาบันแนวทางแห่งการเป็นผู้นำ และข้อมูลเจาะลึกกลยุทธ์บริษัท', frequency: '~5 บทความ/วัน', lang: 'en', type: 'news', topic: 'business' },
    { id: 'brandinside', name: 'Brand Inside', url: 'https://brandinside.asia/feed/', siteUrl: 'https://brandinside.asia', description: 'ธุรกิจ, การตลาด เล่าข่าวเศรษฐกิจฉบับเข้าใจง่ายในไทย', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
    { id: 'prachachat', name: 'ประชาชาติธุรกิจ', url: 'https://www.prachachat.net/feed', siteUrl: 'https://prachachat.net', description: 'นโยบายธุรกิจ ข่าวเศรษฐกิจ ความเคลื่อนไหวการเงินไทยครอบคลุม', frequency: '~20 บทความ/วัน', lang: 'th', type: 'news', topic: 'business' },
  ],
  finance: [
    { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', siteUrl: 'https://www.cnbc.com', description: 'พาดหัวตลาดหุ้น ความเคลื่อนไหวมหภาคระดับโลก และวงการการเงินธุรกิจ', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', siteUrl: 'https://www.marketwatch.com', description: 'กลยุทธ์จัดพอร์ตลงทุน แวดวงตลาดหลักทรัพย์ และเนื้อหาฝั่งกระเป๋าตังคุณ', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'seeking-alpha', name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed.xml', siteUrl: 'https://seekingalpha.com', description: 'อัปเดตบรรยากาศตลาดและอารมณ์ความรู้สึกนักลงทุน รวมถึงฟีดแบ็กรายได้', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'bloomberg', name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', siteUrl: 'https://bloomberg.com', description: 'ตลาดการเงินระดับชาติ อัปเดตหุ้นกู้ และสถานการณ์โลกความเร็วสูง', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', siteUrl: 'https://finance.yahoo.com', description: 'สารพันข่าวสารการเงิน, สรุปย่อตลาด, วิเคราะห์การลงทุน', frequency: '~25 บทความ/วัน', lang: 'en', type: 'news', topic: 'finance' },
    { id: 'reddit-investing', name: 'Reddit r/investing', url: 'https://www.reddit.com/r/investing/top/.rss?t=day', siteUrl: 'https://reddit.com/r/investing', description: 'พื้นที่ถกเถียงการสร้างตัว โอกาสการวางเงิน และแชร์ทริคลงทุน', frequency: '~15 โพสต์/วัน', lang: 'en', type: 'community', topic: 'finance' },
  ],
  science: [
    { id: 'nasa-breaking-news', name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', siteUrl: 'https://www.nasa.gov/news', description: 'ประกาศข่าวสารทางการจากนาซา ภารกิจอวกาศ และการส่งจรวดลำใหม่', frequency: '~5 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'science' },
    { id: 'quanta-magazine', name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', siteUrl: 'https://www.quantamagazine.org', description: 'วิทยาศาสตร์แนวดิ่งครอบคลุมการค้นพบใหม่ การทดลอง ฟิสิกส์ และ AI ขนานร่วม', frequency: '~3 บทความ/สัปดาห์', lang: 'en', type: 'news', topic: 'science' },
    { id: 'science-news', name: 'Science News', url: 'https://www.sciencenews.org/feed', siteUrl: 'https://www.sciencenews.org', description: 'สรุปรวมข่าวด้านวิทยาศาสตร์รายวัน เนื้อหาครอบคลุมทุกสาขา', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'live-science', name: 'Live Science', url: 'https://www.livescience.com/feeds/all', siteUrl: 'https://www.livescience.com', description: 'วิทยาศาสตร์ภูมิอากาศ อวกาศ ชีววิทยา และความก้าวหน้าที่อ่านง่าย', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'nature', name: 'Nature News', url: 'https://www.nature.com/nature.rss', siteUrl: 'https://nature.com', description: 'บันทึกบทความวิทยาศาสตร์ระดับแนวหน้าและเปเปอร์เอกสารตีพิมพ์ระดับโลก', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'newscientist', name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', siteUrl: 'https://newscientist.com', description: 'วิทยาศาสตร์ที่เน้นเรื่องรอบตัวอ่านเข้าใจง่ายแม้ไม่ใช่ผู้เชี่ยวชาญ', frequency: '~8 บทความ/วัน', lang: 'en', type: 'news', topic: 'science' },
    { id: 'reddit-science', name: 'Reddit r/science', url: 'https://www.reddit.com/r/science/top/.rss?t=day', siteUrl: 'https://reddit.com/r/science', description: 'เว็บบอร์ดตอบและถามด้านวิทยาศาสตร์ ครอบคลุมเรื่องสุดเด่นประจำวัน', frequency: '~20 โพสต์/วัน', lang: 'en', type: 'community', topic: 'science' },
  ],
  news: [
    { id: 'npr-news', name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', siteUrl: 'https://www.npr.org', description: 'ข่าวระดับภูมิภาคในประเทศสหรัฐฯ และมุมมองนานาชาติจากสำนักข่าว NPR', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'al-jazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', siteUrl: 'https://www.aljazeera.com', description: 'พาดหัวด่วนสถานการณ์ร้อนในตะวันออกกลางและรายงานข่าวนานาชาติ', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'guardian-world', name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', siteUrl: 'https://www.theguardian.com/world', description: 'นโยบายประเทศ เหตุการณ์โลก และวิเคราะห์บริบทมุมมองทางการเมืองภูมิภาคใหญ่', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'abc-news', name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories', siteUrl: 'https://abcnews.go.com', description: 'อัปเดตเรื่องเด่นรอบวัน พาดหัวข่าว และเนื้อหาสาระของสำนักข่าว ABC', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'cbs-news', name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main', siteUrl: 'https://www.cbsnews.com', description: 'รวบรวมข่าวสารรอบประเทศและเหตุการณ์รอบพรมแดนจากมุมมองสถาบัน CBS', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'time', name: 'TIME', url: 'https://time.com/feed/', siteUrl: 'https://time.com', description: 'วิเคราะห์เหตุการณ์บ้านเมือง, ข่าวไวฟังก์ชั่นจัดเต็มและผู้นำระดับโลกจากแมกกาซีน TIME', frequency: '~20 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'bangkok-post', name: 'Bangkok Post', url: 'https://www.bangkokpost.com/rss/data/topstories.xml', siteUrl: 'https://www.bangkokpost.com', description: 'หนังสือพิมพ์วิเคราะห์สาระครอบคลุมภูมิภาคไทยในฉบับภาษาอังกฤษ', frequency: '~10 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'thestandard', name: 'The Standard', url: 'https://thestandard.co/feed/', siteUrl: 'https://thestandard.co', description: 'ข่าวเชิงลึก, สังคม, ไลฟ์สไตล์, ทันกระแสรอบวัน', frequency: '~8 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'thematter', name: 'The Matter', url: 'https://thematter.co/feed', siteUrl: 'https://thematter.co', description: 'สังคม, การเมือง, วัฒนธรรม เจาะประเด็นแรงที่สังคมกำลังให้ความสนใจ', frequency: '~5 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'matichon', name: 'มติชน', url: 'https://www.matichon.co.th/feed', siteUrl: 'https://matichon.co.th', description: 'ข่าวทั่วไป, การเมือง, สังคม, อาชญากรรมครอบคลุมทั่วประเทศ', frequency: '~30 บทความ/วัน', lang: 'th', type: 'news', topic: 'news' },
    { id: 'bbc', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', siteUrl: 'https://bbc.com/news', description: 'พาดหัวข่าวต่างประเทศ เรื่องระดับสากลรายงานแบบเรียลไทม์จากศูนย์กลางลอนดอน', frequency: '~50 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'reuters', name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', siteUrl: 'https://reuters.com', description: 'เครือข่ายเนื้อหาสาระและพาดหัวรายวันทรงอิทธิพลจากสำนักข่าว Reuters', frequency: '~50 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'ap-news', name: 'AP News', url: 'https://feeds.apnews.com/rss/apf-topnews', siteUrl: 'https://apnews.com', description: 'ความเคลื่อนไหวด่วนรอบวัน ศูนย์กลางกระจายข่าว AP ทั่วโลก', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
    { id: 'ft-world', name: 'Financial Times', url: 'https://www.ft.com/?format=rss', siteUrl: 'https://www.ft.com', description: 'ข่าวสารองค์กรระดับโลก การรวมธุรกิจ และภูมิรัฐศาสตร์จากมุมมองการเงิน', frequency: '~30 บทความ/วัน', lang: 'en', type: 'news', topic: 'news' },
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
