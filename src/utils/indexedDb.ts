import { openDB } from 'idb';

const FORO_INDEXED_DB_NAME = 'foro-app-cache';
const FORO_INDEXED_DB_VERSION = 1;
const FORO_OBJECT_STORE = 'state';

const getForoDb = () =>
  openDB(FORO_INDEXED_DB_NAME, FORO_INDEXED_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(FORO_OBJECT_STORE)) {
        db.createObjectStore(FORO_OBJECT_STORE);
      }
    },
  });

export const getIndexedDbValue = async <T>(key: string) => {
  const db = await getForoDb();
  return (await db.get(FORO_OBJECT_STORE, key)) as T | undefined;
};

export const setIndexedDbValue = async (key: string, value: unknown) => {
  const db = await getForoDb();
  await db.put(FORO_OBJECT_STORE, value, key);
};

export const deleteIndexedDbValue = async (key: string) => {
  const db = await getForoDb();
  await db.delete(FORO_OBJECT_STORE, key);
};

export const clearForoIndexedDbStorage = async () => {
  const db = await getForoDb();
  await db.clear(FORO_OBJECT_STORE);
};
