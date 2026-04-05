const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createAppStateStore } = require('../lib/appStateStore.cjs');

test('file state store does not expose failed writes and recovers for later writes', async () => {
  const filePath = path.join(os.tmpdir(), 'foro-state-store-recovery.json');
  const persistedFiles = new Map();
  let shouldFailOnce = true;

  const fsModule = {
    promises: {
      readFile: async (targetPath, encoding) => {
        assert.equal(targetPath, filePath);
        assert.equal(encoding, 'utf8');

        if (!persistedFiles.has(targetPath)) {
          const error = new Error('Missing persisted file');
          error.code = 'ENOENT';
          throw error;
        }

        return persistedFiles.get(targetPath);
      },
      mkdir: async () => {},
      writeFile: async (targetPath, contents, encoding) => {
        assert.equal(targetPath, filePath);
        assert.equal(encoding, 'utf8');

        if (shouldFailOnce) {
          shouldFailOnce = false;
          const error = new Error('disk full');
          error.code = 'EIO';
          throw error;
        }

        persistedFiles.set(targetPath, contents);
      },
    },
  };

  const store = createAppStateStore({
    mode: 'file',
    filePath,
    fsModule,
  });

  await assert.rejects(store.set('feed', 'latest', { id: 1 }), /disk full/);
  assert.equal(await store.get('feed', 'latest'), undefined);

  await store.set('feed', 'latest', { id: 2 });
  assert.deepEqual(await store.get('feed', 'latest'), { id: 2 });
  assert.deepEqual(JSON.parse(persistedFiles.get(filePath)), {
    feed: {
      latest: { id: 2 },
    },
  });
});

test('file state store prunes empty namespaces after delete', async (t) => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'foro-state-store-'));
  const filePath = path.join(tempDir, 'app-state.json');

  t.after(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const store = createAppStateStore({
    mode: 'file',
    filePath,
  });

  await store.set('drafts', 'alpha', { ok: true });
  await store.delete('drafts', 'alpha');

  assert.equal(await store.get('drafts', 'alpha'), undefined);
  assert.deepEqual(
    JSON.parse(await fs.promises.readFile(filePath, 'utf8')),
    {},
  );
});
