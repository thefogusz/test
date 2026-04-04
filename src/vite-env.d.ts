/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PERSISTENCE_DRIVER?: 'browser' | 'backend';
  readonly VITE_APP_STATE_NAMESPACE?: string;
  readonly VITE_INTERNAL_API_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
