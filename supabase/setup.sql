-- Configuration du serveur (peut etre relancee sans risque).
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  password_hash text not null
);
create table if not exists public.trees (
  name text primary key,
  data jsonb not null,
  token_hash text,
  updated_at timestamptz not null default now()
);
alter table public.trees alter column token_hash drop not null;

alter table public.settings enable row level security;
alter table public.trees enable row level security;
drop policy if exists "lecture publique" on public.trees;
create policy "lecture publique" on public.trees for select to anon using (true);
revoke all on public.settings from anon, authenticated;
revoke all on public.trees from anon, authenticated;
grant select (name, data, updated_at) on public.trees to anon;

insert into public.settings (id, password_hash)
values (1, extensions.crypt('CHANGE-MOI', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- Verifie le mot de passe du groupe. Renvoie 'mine' si l'arbre existe, 'new' sinon.
create or replace function public.unlock_tree(p_password text, p_name text, p_token text)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from settings where id = 1 and password_hash = crypt(p_password, password_hash)) then
    raise exception 'Mot de passe incorrect.';
  end if;
  if char_length(trim(p_name)) not between 2 and 40 then
    raise exception 'Le nom de l arbre doit faire de 2 a 40 caracteres.';
  end if;
  if exists (select 1 from trees where name = p_name) then return 'mine'; end if;
  return 'new';
end $$;

-- Cree ou met a jour un arbre : le mot de passe du groupe suffit.
create or replace function public.save_tree(p_password text, p_name text, p_token text, p_data jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform unlock_tree(p_password, p_name, p_token);
  if length(p_data::text) > 3000000 then
    raise exception 'Arbre trop lourd (photos trop grosses ?).';
  end if;
  insert into trees (name, data) values (p_name, p_data)
  on conflict (name) do update set data = excluded.data, updated_at = now();
end $$;

grant execute on function public.unlock_tree(text, text, text) to anon;
grant execute on function public.save_tree(text, text, text, jsonb) to anon;
