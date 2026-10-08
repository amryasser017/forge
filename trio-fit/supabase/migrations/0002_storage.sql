-- Private bucket for progress photos (Supabase only; skipped on plain Postgres). Files are served through signed URLs.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
  end if;
end $$;
