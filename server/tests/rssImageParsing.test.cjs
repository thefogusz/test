const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..', '..');
const rssServicePath = path.join(projectRoot, 'src', 'services', 'RssService.ts');

const loadRssService = (apiFetch) => {
  const source = require('node:fs').readFileSync(rssServicePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: rssServicePath,
  }).outputText;

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    contentType: 'text/html',
  });
  const previousDocument = global.document;
  const previousDomParser = global.DOMParser;
  const previousXmlSerializer = global.XMLSerializer;
  global.document = dom.window.document;
  global.DOMParser = dom.window.DOMParser;
  global.XMLSerializer = dom.window.XMLSerializer;

  const serviceModule = new Module(rssServicePath, module);
  serviceModule.filename = rssServicePath;
  serviceModule.paths = Module._nodeModulePaths(path.dirname(rssServicePath));

  const originalLoad = Module._load;
  Module._load = (request, parent, isMain) => {
    if (parent === serviceModule && request === '../utils/apiFetch') {
      return { apiFetch };
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    serviceModule._compile(compiled, rssServicePath);
    return {
      exports: serviceModule.exports,
      cleanup: () => {
        global.document = previousDocument;
        global.DOMParser = previousDomParser;
        global.XMLSerializer = previousXmlSerializer;
      },
    };
  } finally {
    Module._load = originalLoad;
  }
};

test('RSS parser decodes XML-escaped media URLs before rendering feed cards', async (t) => {
  const guardianImageUrl =
    'https://i.guim.co.uk/img/media/story.jpg?width=140&quality=85&auto=format&fit=max&s=abc123';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
        <item>
          <title>Budget update</title>
          <link>https://www.theguardian.com/world/2026/may/12/budget-update</link>
          <guid>guardian-budget-update</guid>
          <pubDate>${new Date().toUTCString()}</pubDate>
          <description>New public finance measures were announced.</description>
          <media:content url="https://i.guim.co.uk/img/media/story.jpg?width=140&amp;quality=85&amp;auto=format&amp;fit=max&amp;s=abc123" type="image/jpeg" />
        </item>
      </channel>
    </rss>`;
  const apiFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => xml,
  });
  const loaded = loadRssService(apiFetch);
  t.after(loaded.cleanup);

  const posts = await loaded.exports.fetchRssFeed({
    id: 'guardian-world',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    siteUrl: 'https://www.theguardian.com/world',
    lang: 'en',
    topic: 'news',
  }, 1);

  assert.equal(posts.length, 1);
  assert.equal(posts[0].primaryImageUrl, guardianImageUrl);
  assert.deepEqual(posts[0].imageUrls, [guardianImageUrl]);
  assert.doesNotMatch(posts[0].primaryImageUrl, /&amp;/);
});
