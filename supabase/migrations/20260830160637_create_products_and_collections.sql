/*
# Create products, collections, and product variants tables

1. New Tables
- `collections` — seasonal drops/batches (e.g. "BATCH 011 / MUTED")
  - id (uuid, pk), name (text), slug (text unique), tagline (text), description (text),
    created_at (timestamptz), sort_order (int)
- `products` — individual items in the catalog
  - id (uuid, pk), name (text), slug (text unique), collection_id (uuid fk -> collections),
    price (numeric), compare_at_price (numeric, nullable for sale items),
    description (text), details (text), image_url (text), image_url_2 (text nullable),
    badge (text nullable, e.g. "Sale", "Sold Out", "Special Edition"),
    in_stock (boolean default true), sort_order (int), created_at (timestamptz)
- `product_sizes` — available sizes per product
  - id (uuid, pk), product_id (uuid fk -> products), size (text), in_stock (boolean)

2. Security
- Enable RLS on all tables.
- This is a no-auth storefront (public catalog), so allow anon + authenticated SELECT on all.
- No writes from the frontend (admin-managed), so only SELECT policies are created.

3. Notes
- Single-tenant public catalog: anyone can browse. No user accounts needed.
- Prices stored in PKR to match the original brand's currency.
*/

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_collections" ON collections;
CREATE POLICY "anon_read_collections" ON collections FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL,
  compare_at_price numeric(10,2),
  description text,
  details text,
  image_url text NOT NULL,
  image_url_2 text,
  badge text,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  in_stock boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_product_sizes" ON product_sizes;
CREATE POLICY "anon_read_product_sizes" ON product_sizes FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_products_collection_id ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
