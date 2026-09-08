Top Burger Website V5.3 final integration
Delivery fees are calculated server-side from the selected active delivery zone.
Pickup has zero delivery fee and remains order_type=pickup when accepted into POS.
Run supabase-v5-3-delivery-fees-pickup.sql, then supabase-v10-4-6-website-pickup-promo-stability.sql.
The second patch releases promo usage when a pending website order is rejected or customer-cancelled.
