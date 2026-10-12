// Product catalog — the single source of truth for what buyers can purchase.
// create-checkout resolves prices HERE (server-side, never from the client),
// and the payments webhook reads the same map to know what each purchase grants.
// Prices are USD major units (Wix rejects anything under 0.50).
export const PRODUCTS = {
  "premium-monthly": {
    name: "Premium Monthly — Unlimited Readings",
    price: "9.99",
    credits: 0,
    subscription: true,
  },
  "credits-10": { name: "10 Reading Credits", price: "8.99", credits: 10 },
  "credits-5": { name: "5 Reading Credits", price: "4.99", credits: 5 },
  "single-reading": { name: "Single Reading", price: "1.99", credits: 1 },
};