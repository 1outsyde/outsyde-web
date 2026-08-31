export interface VendorProduct {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;             // cents — divide by 100 to display
  compareAtPrice: number | null;
  imageUrl: string | null;
  images: string[];
  category: string | null;
  tags: string[] | null;
  isActive: boolean;
  isFeatured: boolean;
  status: 'draft' | 'live' | 'archived';
  stripeProductId: string | null;
  stripePriceId: string | null;
  createdAt: string;
}
