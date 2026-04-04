const fs = require('fs');
const path = require('path');

const DEFAULT_STATE_FILE = path.join(process.cwd(), '.data', 'app-state.json');

const cloneState = (value) => JSON.parse(JSON.stringify(value));

const ensureNamespace = (state, namespace) => {
  if (!state[namespace] || typeof state[namespace] !== 'object') {
    state[namespace] = {};
  }

  return state[namespace];
};

const createMemoryStateStore = () => {
  const state = {};

  return {
    async get(namespace, key) {
      return state[namespace]?.[key];
    },
    async set(namespace, key, value) {
      ensureNamespace(state, namespace)[key] = value;
    },
    async delete(namespace, key) {
      if (!state[namespace]) return;
      delete state[namespace][key];
      if (Object.keys(state[namespace]).length === 0) {
        delete state[namespace];
      }
    },
  };
};

const createFileStateStore = (filePath = DEFAULT_STATE_FILE) => {
  let cachedState = null;
  let writeQueue = Promise.resolve();

  const loadState = async () => {
    if (cachedState) return cachedState;

    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      cachedState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('[state-store] Failed to read persisted state file:', error);
      }
      cachedState = {};
    }

    return cachedState;
  };

  const persistState = async (nextState) => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(nextState, null, 2), 'utf8');
  };

  const mutateState = async (mutator) => {
    writeQueue = writeQueue.then(async () => {
      const currentState = cloneState(await loadState());
      mutator(currentState);
      cachedState = currentState;
      await persistState(currentState);
    });

    return writeQueue;
  };

  return {
    async get(namespace, key) {
      const state = await loadState();
      return state[namespace]?.[key];
    },
    async set(namespace, key, value) {
      await mutateState((state) => {
        ensureNamespace(state, namespace)[key] = value;
      });
    },
    async delete(namespace, key) {
      await mutateState((state) => {
        if (!state[namespace]) return;
        delete state[namespace][key];
        if (Object.keys(state[namespace]).length === 0) {
          delete state[namespace];
        }
      });
    },
  };
};

const createAppStateStore = ({
  mode = 'file',
  filePath = DEFAULT_STATE_FILE,
} = {}) => {
  if (mode === 'memory') {
    return createMemoryStateStore();
  }

  return createFileStateStore(filePath);
};

module.exports = {
  DEFAULT_STATE_FILE,
  createAppStateStore,
};
