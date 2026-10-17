// Single source of truth for the /for-business page.
// Verified 2026-10-17 against outsyde-backend 7476678, OutsydeCapture c870655 and live Neon.
// Customer facing copy: real punctuation only, no dashes.

export type Cell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "value"; text: string; soon?: boolean }
  | { kind: "soon" };

export interface FeatureRow {
  name: string;
  desc?: string;
  /** Starter, Growth, Pro */
  cells: [Cell, Cell, Cell];
}

export interface FeatureGroup {
  title: string;
  rows: FeatureRow[];
}

export interface Plan {
  name: string;
  price: number;
  best: string;
  highlights: string[];
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: "Starter",
    price: 29,
    best: "Best for businesses getting set up to sell and book online.",
    highlights: [
      "Products, services and online booking",
      "Deposits and payouts to your bank",
      "Up to 3 staff accounts",
      "Sales and bookings overview",
    ],
  },
  {
    name: "Growth",
    price: 59,
    featured: true,
    best: "Best for businesses ready to build a brand and grow with data.",
    highlights: [
      "Everything in Starter",
      "Your own complimentary website",
      "Authority badge on your profile",
      "Charts, booking health and customer insights",
      "Up to 8 staff accounts",
    ],
  },
  {
    name: "Pro",
    price: 99,
    best: "Best for established businesses that want every advantage.",
    highlights: [
      "Everything in Growth",
      "Unlimited staff accounts",
      "Peak times, revenue forecast and year over year growth",
      "Priority support",
    ],
  },
];

const Y: Cell = { kind: "yes" };
const N: Cell = { kind: "no" };
const v = (text: string, soon = false): Cell => ({ kind: "value", text, soon });

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Sell and take bookings",
    rows: [
      { name: "List your products and services", cells: [Y, Y, Y] },
      { name: "Online booking", desc: "Customers book and pay through the Outsyde app and website.", cells: [Y, Y, Y] },
      { name: "Deposits on bookings", desc: "Collect a deposit up front so no shows cost you less.", cells: [Y, Y, Y] },
      { name: "Product checkout and order tracking", cells: [Y, Y, Y] },
      { name: "Payouts to your bank through Stripe", cells: [Y, Y, Y] },
      { name: "Customer reviews and ratings", cells: [Y, Y, Y] },
      { name: "Loyalty rewards program for your customers", desc: "Customers earn reward points on every purchase, which keeps them coming back.", cells: [Y, Y, Y] },
      { name: "Staff accounts", cells: [v("Up to 3"), v("Up to 8"), v("Unlimited")] },
    ],
  },
  {
    title: "Brand and visibility",
    rows: [
      { name: "Authority badge", desc: "A verified badge on your profile that builds trust.", cells: [N, Y, Y] },
      { name: "Complimentary website", desc: "Your own branded site, connected to your Outsyde store and bookings.", cells: [N, Y, Y] },
    ],
  },
  {
    title: "Business insights",
    rows: [
      { name: "Revenue, orders, bookings and rating overview", cells: [Y, Y, Y] },
      { name: "Performance charts and trends", desc: "Daily, weekly and monthly views.", cells: [N, Y, Y] },
      { name: "Booking health", desc: "Conversion rate, cancellation rate and how full your calendar is.", cells: [N, Y, Y] },
      { name: "Audience demographics", desc: "Learn who your customers are.", cells: [N, Y, Y] },
      { name: "Revenue by service", desc: "See which services earn you the most.", cells: [N, Y, Y] },
      { name: "Customer locations", desc: "See where your customers come from.", cells: [N, Y, Y] },
      { name: "Photographer match", desc: "Photographers whose audience lines up with yours.", cells: [N, Y, Y] },
      { name: "Peak booking times", desc: "Know your busiest days and hours.", cells: [N, N, Y] },
      { name: "Revenue forecast", desc: "Plan ahead with a look at what is coming.", cells: [N, N, Y] },
      { name: "Year over year growth", desc: "Compare this year with last year.", cells: [N, N, Y] },
    ],
  },
  {
    title: "Marketing and growth",
    rows: [
      { name: "Influencer placements", desc: "Creators promote your business to their followers.", cells: [N, v("1 per month", true), v("Up to 2 per month", true)] },
      { name: "Shoot credits", desc: "Professional photo shoots with Outsyde photographers.", cells: [N, v("1 per month", true), v("2 per month", true)] },
      { name: "Discount on extra services", desc: "Savings on add on marketing services you buy from Outsyde.", cells: [N, v("10% off", true), v("20% off", true)] },
      { name: "Marketing tips", desc: "Personalized advice to help you get more customers.", cells: [N, N, { kind: "soon" }] },
    ],
  },
  {
    title: "Support",
    rows: [
      { name: "Support", cells: [v("Email"), v("Priority email"), v("Priority support")] },
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  { q: "Can I change my plan later?", a: "Yes. You can move between Starter, Growth and Pro at any time from your account on goutsyde.com." },
  { q: "What happens if I cancel?", a: "Your plan stays active until the end of your current billing period. After that, your listings are paused, and they come back as soon as you start a plan again." },
  { q: "Do the fees change by plan?", a: "No. Every plan has the same fees. Your customer pays a small service fee on top of your price and earns reward points through the Outsyde loyalty rewards program. Outsyde keeps 2% of the sale, and you receive 98%." },
  { q: "How do I get paid?", a: "Payments go to your bank account through Stripe. You connect Stripe during setup, and your products and services go live once that is done." },
  { q: "Do I need to be approved?", a: "Yes. Every business is reviewed by our team before it goes live, which keeps the marketplace trustworthy for customers." },
  { q: "What does “Coming soon” mean?", a: "Those features are part of the plan and are being built now. You will get them on your plan as soon as they launch, with no extra charge for the plan itself." },
];

export const APPLY_HREF = "/business-signup";
