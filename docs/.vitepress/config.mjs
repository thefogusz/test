import { defineConfig } from 'vitepress';

export default defineConfig({
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
      { text: 'หน้าหลัก', link: '/' },
      { text: 'เริ่มต้นใช้งาน', link: '/getting-started' },
      { text: 'ฟีเจอร์', link: '/features/' },
      { text: 'Changelog', link: '/changelog/' },
      { text: 'สถานะ Docs', link: '/status/' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Process', link: '/process/docs-governance' },
    ],
    sidebar: [
      {
        text: 'เริ่มจากตรงนี้',
        items: [
          { text: 'หน้าหลัก', link: '/' },
          { text: 'เริ่มต้นใช้งาน', link: '/getting-started' },
          { text: 'Changelog', link: '/changelog/' },
          { text: 'Draft Suggestions', link: '/drafts/' },
          { text: 'สถานะ Docs', link: '/status/' },
          { text: 'กติกาการอัปเดต Docs', link: '/process/docs-governance' },
        ],
      },
      {
        text: 'เอกสารฟีเจอร์',
        items: [
          { text: 'สารบัญฟีเจอร์', link: '/features/' },
          { text: 'Home Feed', link: '/features/home-feed' },
          { text: 'Content Workspace', link: '/features/content-workspace' },
          { text: 'App Shell', link: '/features/app-shell' },
          { text: 'Read Workspace', link: '/features/read-workspace' },
          { text: 'News Sources', link: '/features/news-sources' },
          { text: 'Audience Workspace', link: '/features/audience-workspace' },
          { text: 'Bookmarks Workspace', link: '/features/bookmarks-workspace' },
          { text: 'Pricing Workspace', link: '/features/pricing-workspace' },
        ],
      },
      {
        text: 'Process',
        items: [
          { text: 'Changelog', link: '/changelog/' },
          { text: 'Draft Suggestions', link: '/drafts/' },
          { text: 'กติกาการอัปเดต Docs', link: '/process/docs-governance' },
          { text: 'Template เอกสารฟีเจอร์', link: '/process/feature-template' },
          { text: 'Template Decision Log', link: '/process/decision-template' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'Feed and Search', link: '/architecture/feed-search' },
          { text: 'AI Content Pipeline', link: '/architecture/ai-pipeline' },
          { text: 'Integrations', link: '/architecture/integrations' },
          { text: 'State and Persistence', link: '/architecture/state' },
        ],
      },
      {
        text: 'Business และการตัดสินใจ',
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
});
