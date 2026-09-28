-- À coller UNE FOIS dans Supabase > SQL Editor > Run.
-- 1) Changez 'CHANGE-MOI' par le mot de passe à donner à vos amis.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  password_hash text not null
);
create table if not exists public.trees (
  name text primary key,
  data jsonb not null,
  token_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.trees enable row level security;
drop policy if exists "lecture publique" on public.trees;
create policy "lecture publique" on public.trees for select to anon using (true);
revoke all on public.settings from anon, authenticated;
revoke all on public.trees from anon, authenticated;
grant select (name, data, updated_at) on public.trees to anon; -- token_hash reste invisible

insert into public.settings (id, password_hash)
values (1, extensions.crypt('CHANGE-MOI', extensions.gen_salt('bf')))
on conflict (id) do nothing;
-- Pour changer le mot de passe plus tard :
-- update public.settings set password_hash = extensions.crypt('nouveau', extensions.gen_salt('bf')) where id = 1;

-- Vérifie le mot de passe commun et le droit sur le nom d'arbre : 'new' ou 'mine'.
create or replace function public.unlock_tree(p_password text, p_name text, p_token text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare t public.trees;
begin
  if not exists (select 1 from settings where id = 1 and password_hash = crypt(p_password, password_hash)) then
    raise exception 'Mot de passe incorrect.';
  end if;
  if char_length(trim(p_name)) not between 2 and 40 then
    raise exception 'Le nom de l''arbre doit faire de 2 à 40 caractères.';
  end if;
  select * into t from trees where name = p_name;
  if not found then return 'new'; end if;
  if t.token_hash = crypt(p_token, t.token_hash) then return 'mine'; end if;
  raise exception 'Ce nom d''arbre est déjà pris.';
end $$;

-- Crée ou met à jour SON arbre (mot de passe commun + clé propre à l'arbre).
create or replace function public.save_tree(p_password text, p_name text, p_token text, p_data jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare status text;
begin
  status := unlock_tree(p_password, p_name, p_token);
  if length(p_data::text) > 3000000 then
    raise exception 'Arbre trop lourd (photos trop grosses ?).';
  end if;
  if status = 'new' then
    insert into trees (name, data, token_hash) values (p_name, p_data, crypt(p_token, gen_salt('bf')));
  else
    update trees set data = p_data, updated_at = now() where name = p_name;
  end if;
end $$;

grant execute on function public.unlock_tree(text, text, text) to anon;
grant execute on function public.save_tree(text, text, text, jsonb) to anon;
