Top Burger Website V5.4 — Order Tracking & Customer Cancel

Changes:
- Follow orders using customer phone number only.
- Show recent orders for the entered phone.
- Tracking reflects the linked POS order status after branch acceptance.
- Customer cancellation is allowed while PENDING or after acceptance while POS status is NEW.
- Cancellation is blocked server-side from PREPARING onward.
- Delivery flow: received -> preparing -> ready -> out with driver -> delivered.
- Pickup flow: received -> preparing -> ready for pickup -> delivered to customer.
- Website does not expose delivery address in the phone-only tracking response.
- Run supabase-v5-4-phone-tracking-cancel.sql once before testing.
- PWA cache/app/style versions updated to V5.4.0.
