TOP BURGER WEBSITE V3 — POS LINKED MENU

What changed:
- Reads product_variants from the POS (Single / Double / Triple / any future option).
- Reads modifiers linked to each product.
- Customer selects size/variant and extras before adding to cart.
- Cart shows variant + extras + notes and calculates the correct price.
- Category/product order still follows website_sort_order.
- Checkout is intentionally not yet writing orders to the POS; that is the next phase.

Deployment:
1) Run supabase-website-v3.sql ONCE in Supabase SQL Editor.
2) Upload index.html, styles.css, app.js to the top-burger-website GitHub repo root, replacing old files.
3) Do not upload the SQL file to the public repo if you prefer to keep deployment files clean (it contains no secrets).
