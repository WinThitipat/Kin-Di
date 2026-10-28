-- =============================================================================
-- กินดิ! — KIN DI Database Schema & Row-Level Security Migration
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. ENUMS & TYPES
do $$ begin
  create type recipe_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type recipe_difficulty as enum ('easy', 'medium', 'hard');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type allergen_status as enum ('free', 'contains', 'may_contain', 'unknown');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cross_contact_risk_level as enum ('low', 'possible', 'unknown');
exception
  when duplicate_object then null;
end $$;

-- 2. INGREDIENTS TABLE
create table if not exists public.ingredients (
  id text primary key,
  name_th text not null,
  name_en text not null,
  category text not null check (category in ('meat', 'seafood', 'egg_dairy', 'vegetable', 'carb', 'condiment', 'nut_seed', 'other')),
  allergens text[] not null default '{}',
  dietary_compatible text[] not null default '{}',
  composition_known boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. RECIPES TABLE
create table if not exists public.recipes (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text not null,
  category text not null check (category in ('thai', 'international', 'rice', 'noodles', 'healthy', 'street_food')),
  meal_types text[] not null default '{}',
  cooking_time integer not null check (cooking_time > 0),
  estimated_cost integer not null check (estimated_cost >= 0),
  difficulty recipe_difficulty not null default 'easy',
  image_url text,
  external_recipe_url text,
  external_source_name text,
  status recipe_status not null default 'pending',
  dietary_tags text[] not null default '{}',
  instructions text[] not null default '{}',
  safety_metadata_complete boolean not null default true,
  cross_contact_risk cross_contact_risk_level not null default 'low',
  submitted_by text,
  moderation_notes text, -- Private moderation field (excluded from public queries)
  created_at timestamptz not null default now()
);

-- 4. RECIPE INGREDIENTS (Normalized Join Table)
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null references public.recipes(id) on delete cascade,
  ingredient_id text not null references public.ingredients(id) on delete restrict,
  quantity text not null,
  role text not null default 'main' check (role in ('main', 'sauce', 'stock', 'dressing', 'condiment', 'garnish')),
  is_optional boolean not null default false,
  composition_verified boolean not null default true,
  unique (recipe_id, ingredient_id, role)
);

-- 5. RECIPE ALLERGEN ASSESSMENTS (Fail-Closed Safety Assessment Table)
create table if not exists public.recipe_allergen_assessments (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null references public.recipes(id) on delete cascade,
  allergen text not null,
  status allergen_status not null default 'unknown',
  cross_contact_risk cross_contact_risk_level not null default 'unknown',
  notes text,
  unique (recipe_id, allergen)
);

-- 6. INDEXES FOR PERFORMANCE
create index if not exists idx_recipes_status on public.recipes(status);
create index if not exists idx_recipes_category on public.recipes(category);
create index if not exists idx_recipes_estimated_cost on public.recipes(estimated_cost);
create index if not exists idx_recipes_cooking_time on public.recipes(cooking_time);
create index if not exists idx_recipe_ingredients_recipe_id on public.recipe_ingredients(recipe_id);
create index if not exists idx_recipe_ingredients_ingredient_id on public.recipe_ingredients(ingredient_id);
create index if not exists idx_recipe_allergen_assessments_recipe_id on public.recipe_allergen_assessments(recipe_id);

-- 7. ROW LEVEL SECURITY (RLS)
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_allergen_assessments enable row level security;

-- Public read access ONLY for approved recipes and their related records
create policy "Public can read ingredients"
  on public.ingredients for select
  using (true);

create policy "Public can read approved recipes only"
  on public.recipes for select
  using (status = 'approved');

create policy "Public can read recipe_ingredients of approved recipes"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.status = 'approved'
    )
  );

create policy "Public can read allergen assessments of approved recipes"
  on public.recipe_allergen_assessments for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_allergen_assessments.recipe_id
        and r.status = 'approved'
    )
  );

-- Community submissions: anyone can insert a pending recipe (moderation required)
create policy "Community can submit pending recipes"
  on public.recipes for insert
  with check (status = 'pending');
