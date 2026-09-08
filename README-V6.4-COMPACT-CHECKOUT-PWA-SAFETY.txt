Top Burger Website V6.4
- Compact checkout: customer fields, delivery, promo, payment and totals use less vertical space.
- No business-logic or Supabase behavior changes.
- Service Worker install no longer swallows cache.addAll failures; a broken app-shell cache now fails install visibly and preserves the previous working worker.
- Legacy SQL files supabase-website-v1.sql, supabase-website-v3.sql and supabase-website-v4-orders.sql were intentionally removed from this package. DO NOT run those old migrations on the current database.
- Current SQL already applied for this project: supabase-v5-3-delivery-fees-pickup.sql, supabase-v10-4-6-website-pickup-promo-stability.sql, supabase-v5-4-phone-tracking-cancel.sql. Do not rerun unless specifically needed.
- If the GitHub repository still contains the three legacy SQL files, delete them from the repository to avoid accidental execution.
