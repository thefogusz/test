import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'en-US',
  title: 'Foro Docs',
  description: 'Living product and engineering docs for Foro.',
  themeConfig: {
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Features', link: '/features/' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Process', link: '/process/docs-governance' },
    ],
    sidebar: [
      {
        text: 'Start Here',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Docs Governance', link: '/process/docs-governance' },
        ],
      },
      {
        text: 'Feature Docs',
        items: [
          { text: 'Feature Index', link: '/features/' },
          { text: 'Home Feed', link: '/features/home-feed' },
          { text: 'Content Workspace', link: '/features/content-workspace' },
          { text: 'News Sources', link: '/features/news-sources' },
          { text: 'Audience Workspace', link: '/features/audience-workspace' },
        ],
      },
      {
        text: 'Process',
        items: [
          { text: 'Docs Governance', link: '/process/docs-governance' },
          { text: 'Feature Doc Template', link: '/process/feature-template' },
          { text: 'Decision Log Template', link: '/process/decision-template' },
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
        text: 'Business and Operations',
        items: [
          { text: 'API Integrations', link: '/api-integrations' },
          { text: 'Cost Analysis', link: '/cost-analysis' },
          { text: 'Decision Index', link: '/decisions/' },
        ],
      },
    ],
    footer: {
      message: 'Internal product and engineering documentation',
      copyright: 'Foro Platform',
    },
  },
});
