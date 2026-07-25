export type PlanId = 'starter' | 'growth' | 'pro'

export interface Feature {
  label: string
  included: boolean
  note?: string
}

export interface Plan {
  id: PlanId
  name: string
  price: number
  tagline: string
  badge?: string
  staffCap: string
  staffCapNum: number | null
  shootCreditsNum: number
  influencer: string
  accentColor: string
  features: Feature[]
}

export interface UserSubscription {
  planId: PlanId
  status: 'active' | 'cancelled' | 'past_due'
  currentPeriodEnd: string
  staffUsed: number
  influencerUsed: number
  shootCreditsRemaining: number
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    tagline: 'Perfect for new businesses ready to start selling.',
    staffCap: '3',
    staffCapNum: 3,
    shootCreditsNum: 0,
    influencer: 'None',
    accentColor: '#22c55e',
    features: [
      { label: 'Product & service listings (post-approval)', included: true },
      { label: '3 staff accounts', included: true },
      { label: 'Custom refund policy', included: true },
      { label: 'Submit terms of service', included: true },
      { label: 'Consumer reviews & ratings', included: true },
      { label: 'Age & demographic insights', included: true },
      { label: 'Location & geo-data', included: true },
      { label: 'Niche & interest category', included: true },
      { label: 'Influencer audience match report', included: false },
      { label: 'UGC channel post + vendor page mirror', included: true },
      { label: 'Matched influencer placement', included: false },
      { label: 'Shoot credits', included: false },
      { label: 'Business structure consulting', included: false, note: 'Coming soon' },
      { label: 'Marketing services', included: false, note: 'Coming soon' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 59,
    tagline: 'For businesses ready to grow with real tools.',
    badge: 'Most Popular',
    staffCap: '5',
    staffCapNum: 5,
    shootCreditsNum: 1,
    influencer: '1 Unranked/mo',
    accentColor: '#22c55e',
    features: [
      { label: 'Product & service listings (post-approval)', included: true },
      { label: '5 staff accounts', included: true },
      { label: 'Custom refund policy', included: true },
      { label: 'Submit terms of service', included: true },
      { label: 'Consumer reviews & ratings', included: true },
      { label: 'Age & demographic insights', included: true },
      { label: 'Location & geo-data', included: true },
      { label: 'Niche & interest category', included: true },
      { label: 'Influencer audience match report', included: true },
      { label: 'UGC channel post + vendor page mirror', included: true },
      { label: '1 Unranked influencer/mo', included: true, note: 'Launch: signup only' },
      { label: '1 shoot credit/mo', included: true },
      { label: 'Business structure consulting', included: true, note: 'Coming soon' },
      { label: 'Marketing services', included: true, note: 'Coming soon' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    tagline: 'For established businesses that want maximum impact.',
    badge: 'Best Value',
    staffCap: 'Unlimited',
    staffCapNum: null,
    shootCreditsNum: 2,
    influencer: '1 Silver or 2 Bronze/mo',
    accentColor: '#a78bfa',
    features: [
      { label: 'Product & service listings (post-approval)', included: true },
      { label: 'Unlimited staff accounts', included: true },
      { label: 'Custom refund policy', included: true },
      { label: 'Submit terms of service', included: true },
      { label: 'Consumer reviews & ratings', included: true },
      { label: 'Authority badge', included: true },
      { label: 'Age & demographic insights', included: true },
      { label: 'Location & geo-data', included: true },
      { label: 'Niche & interest category', included: true },
      { label: 'Priority influencer audience match report', included: true },
      { label: 'UGC channel post + vendor page mirror', included: true },
      { label: '1 Silver or 2 Bronze influencers/mo', included: true, note: 'Launch rate' },
      { label: '2 shoot credits/mo', included: true },
      { label: 'Priority business structure consulting', included: true, note: 'Coming soon' },
      { label: 'Priority marketing services', included: true, note: 'Coming soon' },
    ],
  },
]

export const PLAN_SECTIONS = [
  { heading: 'Store & selling', range: [0, 4] as [number, number] },
  { heading: 'Analytics', range: [5, 8] as [number, number] },
  { heading: 'Promotion', range: [9, 11] as [number, number] },
  { heading: 'Business services', range: [12, 13] as [number, number], comingSoon: true },
]

export const ALA_CARTE_ITEMS = [
  { label: 'Photoshoot booking', emoji: '📷' },
  { label: 'Influencer booking', emoji: '🤝' },
  { label: 'Event planning', emoji: '🎉' },
  { label: 'Ad campaign setup', emoji: '📢' },
  { label: 'Copywriting', emoji: '✍️' },
  { label: 'Branding & logo design', emoji: '🎨' },
  { label: 'Social media management', emoji: '📱' },
  { label: 'Marketing consulting', emoji: '💡' },
]