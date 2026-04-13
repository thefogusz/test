import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(defineConfig({
  base: '/test/docs/',
  lang: 'th-TH',
  title: 'Foro Docs',
  description: 'เอกสาร product และ engineering ของ Foro',
  lastUpdated: true,
  themeConfig: {
    lastUpdatedText: 'อัปเดตล่าสุด',
    search: {
      provider: 'local',
    },
    outline: false,
    nav: [
      { text: 'Overview', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Features', link: '/features/' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Process', link: '/process/docs-governance' },
      { text: 'Changelog', link: '/changelog/' },
      { text: 'Status', link: '/status/' },
    ],
    sidebar: false,
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
      useMaxWidth: false,
      htmlLabels: true,
    },
  },
}));
