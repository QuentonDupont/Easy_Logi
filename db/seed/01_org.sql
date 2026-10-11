-- 01_org.sql — a demo organisation so the console has a tenant to log into.
-- Fixed UUID so seed data below can reference it deterministically.
insert into public.organisations (id, name, country)
values ('00000000-0000-0000-0000-0000000000a1', 'Easy Logi Demo (Mbabane)', 'SZ')
on conflict (id) do nothing;

-- After creating an auth user (Supabase dashboard or magic link), link it to this org:
--   insert into public.users (id, org_id, email, role)
--   values ('<auth-user-uuid>', '00000000-0000-0000-0000-0000000000a1',
--           '<email>', 'ops_admin')
--   on conflict (id) do update set role = excluded.role, org_id = excluded.org_id;
-- See db/seed/README.md.
