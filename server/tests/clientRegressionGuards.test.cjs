const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

const readSource = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

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
