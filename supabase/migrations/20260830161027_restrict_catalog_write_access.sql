/*
# Restrict write access on catalog tables (read-only storefront)

1. Security changes
- Revoke INSERT, UPDATE, DELETE privileges from anon and authenticated roles on collections, products, and product_sizes.
- Keep SELECT available so the storefront can read the catalog.
- This is a public read-only catalog with no user accounts; only admin (service role) should write.

2. Notes
- RLS policies remain unchanged (SELECT-only policies already in place).
- The service role bypasses RLS and retains full access for admin operations.
*/

REVOKE INSERT, UPDATE, DELETE ON collections FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON products FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON product_sizes FROM anon, authenticated;
