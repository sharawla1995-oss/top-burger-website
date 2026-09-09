Top Burger Website V6.6.1
- Reads weekly branch opening hours.
- Automatically shows branches closed outside configured hours.
- Re-checks schedule before checkout and before submit.
- Server-side SQL trigger remains authoritative.

V6.6.1:
- Displays "مفتوح 24 ساعة" when the active scheduled day uses the 24-hour option (open_time = close_time).
- No database migration is required beyond the V10.4.18 weekly-hours SQL already installed.
