# Top Chicken Beta — deployment and acceptance checkpoint (2026-10-09)

## Scope and safety
- Repository: sharawla1995-oss/top-burger-website
- Branch ONLY: codex/top-chicken-multitenant-beta-staging
- Beta Supabase project: xihcxydjnzemflhedzor
- Beta business: 5358328c-9724-49aa-affc-1bce8be90f92 (Top Chicken)
- Beta branch: 22 (TOP CHICKEN 20)
- No changes to GitHub main, Top Burger Production, POS production devices SH-0005/SH-0006, or Beta POS device SH-0007.
- Do not turn on website ordering until a verified end-to-end acceptance test.

## Verified source and data
- Top Chicken Beta has 42 products (IDs 84–125); all 42 image_url values are HTTPS URLs (SQL inspection only, not browser image rendering).
- Previously checked: 9 visible active categories, 1 visible active branch, 1 enabled website payment method, 0 delivery zones.
- branch_website_settings.orders_open=false is intentional.
- Website branch checkout settings fail closed when missing/stale; branch-hours fetch errors now surface.
- Initial bootstrap errors display a retry action on the branch selector and menu.
- Payment and delivery-zone bootstrap fetch errors are not silently converted into empty configuration.

## Deployment attempt
- Vercel team: top-burger (team_f0TT1nSiGsvaBF5bJCU2lwt2).
- Attempted a staging deployment from this isolated branch using Vercel API POST /v13/deployments.
- Result: HTTP 403 forbidden: "You don't have permission to create a project."
- NO new staging URL was created or verified. DO NOT use the Top Burger main deployment as a substitute.
- Requires authorized project creation / deployment rights on the correct Vercel team, or another explicitly authorized isolated preview host.

## Acceptance steps once a staging URL exists
1. Verify the URL loads the Top Chicken brand, branch 22, nine categories, 42 product images, and responsive mobile view.
2. Verify browsing while orders_open=false; checkout must be blocked.
3. Verify delivery is blocked/unavailable with no delivery zones; do not create fictitious zones.
4. Verify payment options correspond to Beta branch settings; verify refresh/retry failure behavior.
5. In a controlled Beta-only test window, with explicit approval, enable orders only for Top Chicken Beta, place a pickup test order and confirm it appears on SH-0008; verify price/variant/modifiers and receipt; then disable orders again.
6. Only after the test succeeds, decide separately whether to enable customer ordering. Never touch Top Burger Production.

## Important architecture caveat
This branch is still a Top Chicken-specific staging adaptation with hardcoded Beta URL and business header. It is NOT yet a fully tenant-dynamic shared Website Engine; generic tenant routing/configuration, cross-tenant security tests and deployment design still require implementation and verification.
