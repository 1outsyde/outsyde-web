import type { VendorProduct } from './vendor-product';

const OUTSYDE_API_URL = process.env.OUTSYDE_API_URL
  ?? 'https://outsyde-backend.onrender.com';

const LOTUS_BUSINESS_ID = '8523e3c5-fc07-461b-9452-087d2b4aada6';

export async function getLotusProducts(): Promise<VendorProduct[]> {
  try {
    const res = await fetch(
      `${OUTSYDE_API_URL}/api/businesses/${LOTUS_BUSINESS_ID}/products`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      console.error('[getLotusProducts] backend returned', res.status);
      return [];
    }
    const data = await res.json() as { products?: VendorProduct[] } | VendorProduct[];
    const products = Array.isArray(data) ? data : (data as { products?: VendorProduct[] }).products ?? [];
    return products;
  } catch (err) {
    console.error('[getLotusProducts] fetch failed:', err);
    return [];
  }
}

// Derive a display group from the category field (used for blend-group headers).
// Returns the category as-is if set, otherwise "Other".
export function getProductGroup(product: VendorProduct): string {
  return product.category?.trim() || 'Other';
}

// Derive the format label from the product name.
// Products whose name includes "Tea" are "tea" format; "Herb" → "herbs"; else "other".
export function getProductFormat(product: VendorProduct): 'tea' | 'herbs' | 'other' {
  const n = product.name.toLowerCase();
  if (n.includes('tea')) return 'tea';
  if (n.includes('herb') || n.includes('loose')) return 'herbs';
  return 'other';
}
