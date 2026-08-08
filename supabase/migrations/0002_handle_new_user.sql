-- Auto-create a profiles row whenever a new auth.users row is created, so the
-- app never has to remember to do this manually after sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (new.id, new.raw_user_meta_data->>'display_name', coalesce(new.raw_user_meta_data->>'locale', 'en'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
