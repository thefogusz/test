import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(defineConfig({
  base: '/test/docs/',
  lang: 'th-TH',
  title: 'Foro Docs',
  description: 'เอกสาร product และ engineering แบบอัปเดตตามของจริงสำหรับ Foro',
  lastUpdated: true,
  themeConfig: {
    lastUpdatedText: 'อัปเดตล่าสุด',
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'หน้าแรก', link: '/' },
      { text: 'เริ่มต้นใช้งาน', link: '/getting-started' },
      { text: 'UX/UI README', link: '/ux-ui-readme' },
      { text: 'ฟีเจอร์', link: '/features/' },
      { text: 'บันทึกการเปลี่ยนแปลง', link: '/changelog/' },
      { text: 'สถานะ Docs', link: '/status/' },
      { text: 'สถาปัตยกรรม', link: '/architecture/overview' },
      { text: 'กระบวนการ', link: '/process/docs-governance' },
    ],
    sidebar: [
      {
        text: 'เริ่มจากตรงนี้',
        items: [
          { text: 'หน้าแรก', link: '/' },
          { text: 'เริ่มต้นใช้งาน', link: '/getting-started' },
          { text: 'UX/UI README', link: '/ux-ui-readme' },
          { text: 'บันทึกการเปลี่ยนแปลง', link: '/changelog/' },
          { text: 'ข้อเสนอร่างเอกสาร', link: '/drafts/' },
          { text: 'สถานะ Docs', link: '/status/' },
          { text: 'กติกาการอัปเดต Docs', link: '/process/docs-governance' },
        ],
      },
      {
        text: 'UX/UI',
        items: [
          { text: 'UX/UI README', link: '/ux-ui-readme' },
        ],
      },
      {
        text: 'เอกสารฟีเจอร์',
        items: [
          { text: 'สารบัญฟีเจอร์', link: '/features/' },
          { text: 'หน้าโฮมฟีด', link: '/features/home-feed' },
          { text: 'พื้นที่ทำคอนเทนต์', link: '/features/content-workspace' },
          { text: 'โครงแอปหลัก', link: '/features/app-shell' },
          { text: 'พื้นที่อ่าน', link: '/features/read-workspace' },
          { text: 'แหล่งข่าว', link: '/features/news-sources' },
          { text: 'พื้นที่ค้นหา Audience', link: '/features/audience-workspace' },
          { text: 'พื้นที่บุ๊กมาร์ก', link: '/features/bookmarks-workspace' },
          { text: 'หน้าแพ็กเกจ', link: '/features/pricing-workspace' },
        ],
      },
      {
        text: 'กระบวนการ',
        items: [
          { text: 'กติกาการอัปเดต Docs', link: '/process/docs-governance' },
          { text: 'Template เอกสารฟีเจอร์', link: '/process/feature-template' },
          { text: 'Template Decision Log', link: '/process/decision-template' },
        ],
      },
      {
        text: 'สถาปัตยกรรม',
        items: [
          { text: 'ภาพรวม', link: '/architecture/overview' },
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'ฟีดและการค้นหา', link: '/architecture/feed-search' },
          { text: 'AI Content Pipeline', link: '/architecture/ai-pipeline' },
          { text: 'Integrations', link: '/architecture/integrations' },
          { text: 'State และ Persistence', link: '/architecture/state' },
        ],
      },
      {
        text: 'ธุรกิจและการตัดสินใจ',
        items: [
          { text: 'API Integrations', link: '/api-integrations' },
          { text: 'Cost Analysis', link: '/cost-analysis' },
          { text: 'สารบัญ Decision Log', link: '/decisions/' },
        ],
      },
    ],
    footer: {
      message: 'Internal product and engineering documentation',
      copyright: 'Foro Platform',
    },
  },
  mermaid: {
    theme: 'dark',
    themeVariables: {
      fontSize: '20px',
    },
    flowchart: {
      nodeSpacing: 48,
      rankSpacing: 72,
      padding: 20,
      curve: 'basis',
      useMaxWidth: true,
      htmlLabels: true,
    },
  },
}));
