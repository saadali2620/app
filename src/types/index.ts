export interface Collection {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  collection_id: string | null;
  price: number;
  compare_at_price: number | null;
  description: string | null;
  details: string | null;
  image_url: string;
  image_url_2: string | null;
  badge: string | null;
  in_stock: boolean;
  sort_order: number;
  created_at: string;
  collection?: Collection | null;
}

export interface ProductSize {
  id: string;
  product_id: string;
  size: string;
  in_stock: boolean;
  sort_order: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  size: string;
  quantity: number;
}
