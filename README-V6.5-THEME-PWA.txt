Top Burger Website V6.5
- UI layer remains based on V5.4 order logic/RPCs.
- Adds Light / Dark / Auto theme selector; preference is stored locally.
- Restores PWA install prompt on supported Android browsers and iOS Safari guidance.
- Service Worker install does not swallow cache.addAll failures.
- No new Supabase SQL is required for V6.5.
- Legacy v1/v3/v4 SQL files are intentionally excluded. Do not restore or execute them.
- Current SQL files are retained only as version/reference scripts; do not rerun them on an already-upgraded database unless explicitly instructed.
