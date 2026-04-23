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
