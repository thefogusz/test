/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_PERSISTENCE_DRIVER?: 'browser' | 'backend';
  readonly VITE_APP_STATE_NAMESPACE?: string;
  readonly VITE_INTERNAL_API_SECRET?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    'stripe-buy-button': {
      'buy-button-id': string;
      'publishable-key': string;
    };
  }
}
