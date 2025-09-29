export type ProductStatus = 'pending' | 'approved' | 'rejected';

export interface Product {
  id: string;
  shop_owner_id: string;
  title: string;
  description?: string;
  category?: string;
  brand?: string;
  mrp: number;
  selling_price: number;
  discount_percentage?: number;
  stock_quantity?: number;
  sku?: string;
  tags?: string[];
  images?: string[];
  sizes?: string[];
  status: ProductStatus;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Optional rating fields for products with review data
  average_rating?: number;
  review_count?: number;
}

export interface CreateProductData {
  title: string;
  description?: string;
  category?: string;
  brand?: string;
  mrp: number;
  selling_price: number;
  discount_percentage?: number;
  stock_quantity?: number;
  sku?: string;
  tags?: string[];
  images?: string[];
  sizes?: string[];
}