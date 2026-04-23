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

test('reduced motion disables shared animation utilities and mobile overlays', () => {
  const source = readSource('src/index.css');

  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.animate-fade-in,[\s\S]*\.animate-spin[\s\S]*animation: none !important/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.right-sidebar\.mobile-visible,[\s\S]*\.mobile-backdrop[\s\S]*animation: none !important/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.status-toast[\s\S]*transition: none !important/);
});
