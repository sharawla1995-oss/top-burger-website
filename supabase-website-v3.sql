-- Top Burger Website V3: public read-only menu options/extras
-- Safe for the public website: SELECT only. No INSERT/UPDATE/DELETE grants.

alter table public.product_variants enable row level security;
alter table public.modifiers enable row level security;
alter table public.product_modifiers enable row level security;

grant select on public.product_variants, public.modifiers, public.product_modifiers to anon;

drop policy if exists website_public_product_variants_read on public.product_variants;
create policy website_public_product_variants_read
on public.product_variants
for select to anon
using (active = true);

drop policy if exists website_public_modifiers_read on public.modifiers;
create policy website_public_modifiers_read
on public.modifiers
for select to anon
using (active = true);

drop policy if exists website_public_product_modifiers_read on public.product_modifiers;
create policy website_public_product_modifiers_read
on public.product_modifiers
for select to anon
using (true);

notify pgrst, 'reload schema';
