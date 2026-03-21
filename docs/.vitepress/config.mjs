import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'th-TH',
  title: 'Foro Docs',
  description: 'เอกสารสถาปัตยกรรมและการทำงานของระบบ Foro',
  themeConfig: {
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'หน้าหลัก', link: '/' },
      { text: 'Architecture', link: '/architecture/overview' },
    ],
    sidebar: [
      {
        text: 'เริ่มต้น',
        items: [
          { text: 'อ่านเริ่มจากตรงนี้', link: '/getting-started' },
          { text: 'ภาพรวมระบบ', link: '/architecture/overview' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'Feed และ Search', link: '/architecture/feed-search' },
          { text: 'AI Content Pipeline', link: '/architecture/ai-pipeline' },
          { text: 'Proxy และ External APIs', link: '/architecture/integrations' },
          { text: 'State และ Persistence', link: '/architecture/state' },
          { text: 'ภาพรวม', link: '/architecture/overview' },
        ],
      },
    ],
    footer: {
      message: 'Internal engineering documentation',
      copyright: 'Foro Platform',
    },
  },
});
