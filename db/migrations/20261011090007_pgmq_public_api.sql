-- 20261011090007_pgmq_public_api.sql
-- Expose the pgmq queue to supabase-js. `.rpc()` can only call functions in the exposed
-- (public) schema, and the pgmq schema is not exposed, so these SECURITY DEFINER wrappers
-- forward to pgmq.send / read / delete / archive.
--
-- Access: service_role ONLY. The queue worker runs with the service role key; no browser or
-- user session may drive the queue. Supabase's default privileges grant EXECUTE on new public
-- functions to anon and authenticated, so those are revoked explicitly along with PUBLIC.

-- Enqueue a message; returns the new message id.
create or replace function public.queue_send(queue_name text, msg jsonb)
returns bigint
language sql
security definer
set search_path = public, pgmq, extensions
as $$
  select pgmq.send(queue_name, msg);
$$;

-- Read up to qty messages, hiding them from other consumers for vt seconds.
create or replace function public.queue_read(queue_name text, vt integer, qty integer)
returns table (msg_id bigint, read_ct integer, message jsonb)
language sql
security definer
set search_path = public, pgmq, extensions
as $$
  select r.msg_id, r.read_ct, r.message
  from pgmq.read(queue_name, vt, qty) as r;
$$;

-- Permanently delete a processed message; returns true if it existed.
create or replace function public.queue_delete(queue_name text, msg_id bigint)
returns boolean
language sql
security definer
set search_path = public, pgmq, extensions
as $$
  select pgmq.delete(queue_name, msg_id);
$$;

-- Move a message to the queue's archive table; returns true if it existed.
create or replace function public.queue_archive(queue_name text, msg_id bigint)
returns boolean
language sql
security definer
set search_path = public, pgmq, extensions
as $$
  select pgmq.archive(queue_name, msg_id);
$$;

comment on function public.queue_send(text, jsonb) is
  'Service-role only. Wraps pgmq.send: enqueues msg on queue_name and returns the new message id.';
comment on function public.queue_read(text, integer, integer) is
  'Service-role only. Wraps pgmq.read: reads up to qty messages from queue_name with a visibility timeout of vt seconds.';
comment on function public.queue_delete(text, bigint) is
  'Service-role only. Wraps pgmq.delete: permanently removes message msg_id from queue_name; returns true if it existed.';
comment on function public.queue_archive(text, bigint) is
  'Service-role only. Wraps pgmq.archive: moves message msg_id from queue_name to its archive; returns true if it existed.';

revoke execute on function public.queue_send(text, jsonb) from public, anon, authenticated;
revoke execute on function public.queue_read(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.queue_delete(text, bigint) from public, anon, authenticated;
revoke execute on function public.queue_archive(text, bigint) from public, anon, authenticated;

grant execute on function public.queue_send(text, jsonb) to service_role;
grant execute on function public.queue_read(text, integer, integer) to service_role;
grant execute on function public.queue_delete(text, bigint) to service_role;
grant execute on function public.queue_archive(text, bigint) to service_role;
