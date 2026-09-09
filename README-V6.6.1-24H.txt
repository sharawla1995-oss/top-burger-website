Top Burger Website V6.6.1
- Adds explicit customer-facing "مفتوح 24 ساعة" status for a scheduled 24-hour day.
- 24-hour schedule uses the existing V10.4.18 convention open_time = close_time; no extra SQL migration is required.
- Existing manual stop, temporary pause, weekly schedule, checkout and server-side guard remain unchanged.
