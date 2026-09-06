-- Top Burger Website V1: public READ ONLY menu access
-- No public inserts/updates/deletes are granted.
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.branch_products enable row level security;
grant usage on schema public to anon;
grant select on public.branches, public.categories, public.products, public.branch_products to anon;
drop policy if exists website_public_branches_read on public.branches;
create policy website_public_branches_read on public.branches for select to anon using (true);
drop policy if exists website_public_categories_read on public.categories;
create policy website_public_categories_read on public.categories for select to anon using (active=true and website_visible=true);
drop policy if exists website_public_products_read on public.products;
create policy website_public_products_read on public.products for select to anon using (active=true and website_visible=true);
drop policy if exists website_public_branch_products_read on public.branch_products;
create policy website_public_branch_products_read on public.branch_products for select to anon using (true);
notify pgrst, 'reload schema';
