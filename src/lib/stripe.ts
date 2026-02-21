import Stripe from "stripe";

// Server-side only Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
