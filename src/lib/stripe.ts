import { loadStripe, type Stripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';

let stripePromise: Promise<Stripe | null> | null = null;

export const hasStripePublishableKey = Boolean(STRIPE_PUBLISHABLE_KEY);

export const getStripeClient = () => {
  if (!hasStripePublishableKey) {
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }

  return stripePromise;
};
