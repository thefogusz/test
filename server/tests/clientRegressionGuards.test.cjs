const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const allowedGrokModelSlugs = new Set([
  'grok-4.3',
  'grok-4.20-multi-agent-0309',
]);
const grokModelSlugPattern = /\bgrok-(?:\d[a-z0-9._-]*|build-[a-z0-9._-]+|code-[a-z0-9._-]+|imagine-[a-z0-9._-]+)(?!\\)/gi;
const textFilePattern = /\.(?:cjs|mjs|js|jsx|ts|tsx|json|md|html|txt|css)$/i;
const ignoredDirectories = new Set(['.git', 'dist', 'build', 'node_modules', 'coverage']);

const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

const collectTextFiles = (directory) => {
  const absoluteDirectory = path.join(projectRoot, directory);
  const files = [];

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(path.relative(projectRoot, absolutePath)));
    } else if (entry.isFile() && textFilePattern.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
};

test('xAI model config uses supported Grok profiles and avoids retired model parameters', () => {
  const source = readSource('src/config/aiModels.ts');

  assert.match(source, /GROK_43_MODEL\s*=\s*'grok-4\.3'/);
  assert.match(source, /GROK_420_MULTI_AGENT_MODEL\s*=\s*'grok-4\.20-multi-agent-0309'/);
  assert.match(source, /MODEL_NEWS_FAST\s*=\s*GROK_43_MODEL/);
  assert.match(source, /MODEL_REASONING_FAST\s*=\s*GROK_43_MODEL/);
  assert.match(source, /MODEL_WRITER_FAST\s*=\s*GROK_43_MODEL/);
  assert.match(source, /MODEL_WRITER\s*=\s*GROK_43_MODEL/);
  assert.match(source, /MODEL_MULTI_AGENT\s*=\s*GROK_420_MULTI_AGENT_MODEL/);
  assert.match(source, /MODEL_NEWS_FAST_PROVIDER_OPTIONS[\s\S]*reasoningEffort:\s*'none'/);
  assert.match(source, /MODEL_REASONING_FAST_PROVIDER_OPTIONS[\s\S]*reasoningEffort:\s*'low'/);
  assert.match(source, /MODEL_WRITER_FAST_PROVIDER_OPTIONS\s*=\s*MODEL_NEWS_FAST_PROVIDER_OPTIONS/);

  const serviceSource = readSource('src/services/GrokService.ts');
  assert.match(serviceSource, /GROK_REASONING_EFFORT_HEADER/);
  assert.match(serviceSource, /payload\.reasoning_effort\s*=\s*reasoningEffort/);
  assert.match(serviceSource, /payload\.reasoning\s*=\s*\{\s*\.\.\.\(payload\.reasoning \|\| \{\}\),\s*effort:\s*reasoningEffort\s*\}/);
  assert.doesNotMatch(serviceSource, /presencePenalty|frequencyPenalty/);
  assert.match(serviceSource, /headers:\s*NEWS_FAST_HEADERS/);
  assert.match(serviceSource, /headers:\s*REASONING_FAST_HEADERS/);
  assert.match(serviceSource, /FAST_WRITER_DRAFT_FORMAT_SET\s*=\s*new Set\(\['สคริปต์วิดีโอสั้น'\]\)/);
  assert.match(serviceSource, /draftModel\s*=\s*useFastWriterDraft\s*\?\s*MODEL_WRITER_FAST\s*:\s*MODEL_WRITER/);
});

test('project only references current supported Grok model slugs', () => {
  const filesToScan = [
    ...collectTextFiles('src'),
    ...collectTextFiles('server'),
    ...collectTextFiles('public'),
  ];
  const unsupportedReferences = [];

  for (const file of filesToScan) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(grokModelSlugPattern)) {
      const slug = match[0];
      if (!allowedGrokModelSlugs.has(slug)) {
        unsupportedReferences.push(`${path.relative(projectRoot, file)} -> ${slug}`);
      }
    }
  }

  assert.deepEqual(unsupportedReferences, []);
});

test('deserializePostLists sanitizes persisted lists during hydrate', () => {
  const source = readSource('src/utils/appPersistence.ts');

  assert.match(
    source,
    /deserializePostLists\s*=\s*\(saved\)\s*=>\s*sanitizePostLists\(safeParse\(saved,\s*\[\]\)\)/,
  );
});

test('status message patterns preserve Thai loading and warning keywords', () => {
  const source = readSource('src/utils/statusMessagePatterns.ts');

  assert.match(source, /กำลัง/);
  assert.match(source, /ไม่พบ/);
  assert.match(source, /ไม่รองรับ/);
  assert.doesNotMatch(source, /Ã|à¸|à¹/);
});

test('watchlist duplicate message stays readable in Thai', () => {
  const source = readSource('src/utils/watchlistMessages.ts');

  assert.match(source, /อยู่ใน Watchlist แล้ว/);
  assert.doesNotMatch(source, /Ã|à¸|à¹/);
});

test('home canvas honors reduced motion without starting interactive animation', () => {
  const source = readSource('src/components/HomeCanvas.tsx');

  assert.match(source, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(source, /function renderStatic\(\)/);
  assert.match(source, /function startAnimation\(\)/);
  assert.match(source, /motionQuery\.matches[\s\S]*renderStatic\(\)[\s\S]*startAnimation\(\)/);
  assert.match(source, /removeInteractionListeners\(\)/);
});

test('feed card media preview has a visible fallback when remote image loading fails', () => {
  const source = readSource('src/components/FeedCard.tsx');

  assert.match(source, /previewImageFailed/);
  assert.match(source, /handlePreviewImageError/);
  assert.match(source, /<img[\s\S]*className="feed-card-media-image"[\s\S]*onError=\{handlePreviewImageError\}/);
  assert.match(source, /feed-card-media-fallback/);
});

test('feed card does not construct article host labels inline during render', () => {
  const source = readSource('src/components/FeedCard.tsx');

  assert.match(source, /const getArticleHostLabel = \(url\) =>/);
  assert.match(source, /catch\s*\{\s*return '';\s*\}/);
  assert.match(source, /const articleHostLabel = getArticleHostLabel\(tweet\.url\);/);
  assert.doesNotMatch(source, /new URL\(tweet\.url\)\.hostname/);
});

test('home feed first sync windows merged X and RSS candidates together', () => {
  const source = readSource('src/hooks/useHomeFeedWorkspace.ts');

  assert.match(
    source,
    /const mergedDisplayBatch = \[\.\.\.xDisplayBatch, \.\.\.newRssPosts\]\.sort\(/,
  );
  assert.match(source, /const postsToStage = mergedDisplayBatch\.slice\(0, MAX_INITIAL_DISPLAY\);/);
  assert.match(source, /const overflowDisplayBatch = mergedDisplayBatch\.slice\(MAX_INITIAL_DISPLAY\);/);
  assert.match(
    source,
    /\[\.\.\.overflowDisplayBatch, \.\.\.nextTwitterPending\]\.sort\(\s*\(\s*a,\s*b\s*\)\s*=>\s*new Date\(b\.created_at\)\.getTime\(\) - new Date\(a\.created_at\)\.getTime\(\),\s*\)/,
  );
  assert.match(source, /nextBatch = workingPendingFeed\.slice\(0, MAX_SYNC\);/);
  assert.doesNotMatch(source, /prev\.filter\(\(post\) => isXFeedPost\(post\)\)/);
});

test('home feed sort controls survive X and RSS merge limits', () => {
  const hookSource = readSource('src/hooks/useHomeFeedWorkspace.ts');
  const appUtilsSource = readSource('src/utils/appUtils.ts');

  assert.match(appUtilsSource, /export const sortFeedByActiveFilters = \(feed = \[\], activeFilters[\s\S]*= \{\}\) =>/);
  assert.match(appUtilsSource, /sortByViews \? toNumber\(left\?\.view_count\) : 0/);
  assert.match(appUtilsSource, /sortByEngagement \? getEngagementTotal\(left\) : 0/);
  assert.match(appUtilsSource, /return getCreatedAtTime\(right\) - getCreatedAtTime\(left\);/);
  assert.match(
    hookSource,
    /const nextFeed = \[[\s\S]*\.\.\.xVisibleFeedCandidates,[\s\S]*\.\.\.rssVisibleFeedCandidates\.slice\(0, homeFeedCardLimit\),[\s\S]*\];[\s\S]*return sortFeedByActiveFilters\(nextFeed, activeFilters\);/,
  );
  assert.match(
    hookSource,
    /if \(!isFiltered\) return;[\s\S]*setFeed\(\(prevFeed\) => sortFeedByActiveFilters\(prevFeed, activeFilters\)\);/,
  );
  assert.match(hookSource, /setFeed\(sortFeedByActiveFilters\(filteredResult, activeFilters\)\);/);
});

test('audience manual username search gives feedback for existing and failed lookups', () => {
  const hookSource = readSource('src/hooks/useAudienceSearch.ts');
  const componentSource = readSource('src/components/AudienceWorkspace.tsx');
  const twitterSource = readSource('src/services/TwitterService.ts');

  assert.match(hookSource, /const \[manualSearchError, setManualSearchError\] = useState\(''\);/);
  assert.match(hookSource, /manualSearchLoading: manualSearchMutation\.isPending/);
  assert.match(hookSource, /setManualPreview\(null\);/);
  assert.match(hookSource, /ไม่พบบัญชี @\$\{normalizedUsername\}/);
  assert.match(componentSource, /manualSearchLoading \? <RefreshCw size=\{15\} className="animate-spin" \/>/);
  assert.match(componentSource, /manualSearchError && !manualSearchLoading/);
  assert.match(componentSource, /manualPreview && \(/);
  assert.doesNotMatch(componentSource, /manualPreview && !isManualPreviewAdded/);
  assert.match(componentSource, /อยู่ใน Watchlist แล้ว/);
  assert.match(twitterSource, /encodeURIComponent\(handle\)/);
});

test('home feed latest sync does not send until timestamp to X search', () => {
  const source = readSource('src/hooks/useHomeFeedWorkspace.ts');
  const initialSyncCall = source.match(
    /return fetchWatchlistFeed\(\s*targetAccounts,\s*'',\s*'Latest',\s*\{[\s\S]*?preferPerHandleLatest: true,[\s\S]*?\}\s*\);/,
  );
  const fallbackSyncCall = source.match(
    /const fallbackLatestResult = await fetchWatchlistFeed\(\s*activeListMembers\.twitterHandles,\s*'',\s*'Latest',\s*\{[\s\S]*?preferPerHandleLatest: true,[\s\S]*?\}\s*,?\s*\);/,
  );

  assert.ok(initialSyncCall, 'initial Latest sync call should be present');
  assert.ok(fallbackSyncCall, 'fallback Latest sync call should be present');
  assert.doesNotMatch(initialSyncCall[0], /untilTime:\s*syncStartedAt/);
  assert.doesNotMatch(fallbackSyncCall[0], /untilTime:\s*syncStartedAt/);
});

test('reduced motion disables shared animation utilities and mobile overlays', () => {
  const source = readSource('src/index.css');

  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.animate-fade-in,[\s\S]*\.animate-spin[\s\S]*animation: none !important/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.right-sidebar\.mobile-visible,[\s\S]*\.mobile-backdrop[\s\S]*animation: none !important/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.status-toast[\s\S]*transition: none !important/);
});

test('icon-only controls keep accessible labels across UX-critical surfaces', () => {
  const contentSource = readSource('src/components/ContentWorkspace.tsx');
  const feedCardSource = readSource('src/components/FeedCard.tsx');
  const homeSource = readSource('src/components/HomeView.tsx');
  const listModalSource = readSource('src/components/ListModal.tsx');

  assert.match(contentSource, /aria-label=\{isLatestMode \? '[^']+' : '[^']+'\}/);
  assert.match(contentSource, /aria-pressed=\{isLatestMode\}/);
  assert.match(contentSource, /aria-label="ล้างคำค้นหา"/);
  assert.match(contentSource, /aria-label=\{isSearching \? '[^']+' : 'ค้นหา'\}/);
  assert.match(contentSource, /aria-label="คัดลอกสรุป"/);

  assert.match(feedCardSource, /aria-label=\{bookmarked \? '[^']+' : '[^']+'\}/);
  assert.match(feedCardSource, /aria-label=\{isArticleCard \? '[^']+' : '[^']+'\}/);
  assert.match(feedCardSource, /aria-label="ปิดตัวอย่างรูป"/);
  assert.match(feedCardSource, /aria-label="รูปก่อนหน้า"/);
  assert.match(feedCardSource, /aria-label="รูปถัดไป"/);

  assert.match(homeSource, /aria-label="คัดลอกผลลัพธ์"/);
  assert.match(listModalSource, /role="dialog"/);
  assert.match(listModalSource, /aria-modal="true"/);
});

test('mobile bottom navigation keeps all primary workspaces reachable', () => {
  const sidebarSource = readSource('src/components/Sidebar.tsx');
  const cssSource = readSource('src/index.css');
  const audienceNavItem = sidebarSource.match(/view:\s*'audience'[\s\S]*?(?=\n\s*\{\s*view:)/);
  const bookmarksNavItem = sidebarSource.match(/view:\s*'bookmarks'[\s\S]*?(?=\n\s*\{\s*view:)/);

  assert.ok(audienceNavItem, 'audience nav item should exist');
  assert.ok(bookmarksNavItem, 'bookmarks nav item should exist');
  assert.doesNotMatch(audienceNavItem[0], /hideOnMobile:\s*true/);
  assert.doesNotMatch(bookmarksNavItem[0], /hideOnMobile:\s*true/);
  assert.match(sidebarSource, /view:\s*'audience'[\s\S]*mobileLabel:\s*'ติดตาม'/);
  assert.match(sidebarSource, /view:\s*'bookmarks'[\s\S]*mobileLabel:\s*'บันทึก'/);
  assert.doesNotMatch(cssSource, /\.nav-item\s*\{[\s\S]*?width:\s*25% !important/);
  assert.match(cssSource, /\.nav-item\s*\{[\s\S]*?width:\s*16\.66% !important/);
});

test('read archive cards receive Thai summaries after background translation finishes', () => {
  const source = readSource('src/hooks/useHomeFeedWorkspace.ts');

  assert.match(source, /mergeTranslatedReadArchivePosts/);
  assert.doesNotMatch(
    source,
    /const existingIds = new Set\(prev\.map\(\(post\) => post\.id\)\);[\s\S]*?const newItems = summarizedChunk\.filter\(\(post\) => !existingIds\.has\(post\.id\)\);[\s\S]*?if \(newItems\.length > 0\) return \[\.\.\.newItems, \.\.\.prev\];[\s\S]*?return prev;/,
    'readArchive must update existing staged cards, not only insert missing translated posts',
  );
});

test('external URLs are normalized through a shared http-only helper', () => {
  const urlSafetySource = readSource('src/utils/urlSafety.ts');
  const rssSource = readSource('src/services/RssService.ts');
  const feedCardSource = readSource('src/components/FeedCard.tsx');
  const createContentSource = readSource('src/components/CreateContent.tsx');

  assert.match(urlSafetySource, /export const normalizeSafeExternalUrl = /);
  assert.match(urlSafetySource, /parsed\.protocol !== 'http:' && parsed\.protocol !== 'https:'/);
  assert.match(urlSafetySource, /startsWith\('\/\/'\)/);
  assert.match(rssSource, /normalizeSafeExternalUrl/);
  assert.match(feedCardSource, /normalizeSafeExternalUrl/);
  assert.match(createContentSource, /normalizeSafeExternalUrl/);
  assert.match(createContentSource, /const safeUrl = normalizeSafeExternalUrl\(url\)/);
  assert.match(createContentSource, /if \(!safeUrl\) return false/);
});

test('search summary updates are guarded against stale searches', () => {
  const source = readSource('src/hooks/useSearchWorkspace.ts');

  assert.match(source, /searchRunIdRef/);
  assert.match(source, /createSearchRunId/);
  assert.match(source, /summaryRunId/);
  assert.match(source, /isSearchRunCurrent/);
  assert.match(source, /if \(!isSearchRunCurrent\(summaryRunId\)\) return/);
});
