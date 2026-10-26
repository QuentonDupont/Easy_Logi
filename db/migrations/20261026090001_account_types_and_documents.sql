-- Business vs individual accounts + uploaded order/account documents.
--
-- * organisations.account_type: 'business' (importer / workshop / fleet) or 'individual' (a person
--   buying for themselves). An individual is a one-person organisation, so every existing
--   can_access_org(org_id) RLS policy keeps working unchanged.
-- * user_role gains 'buyer' — the role individuals sign in with. It maps to the status machine's
--   existing `buyer` role (fit confirmation, disputes); Easy Logi ops move sourcing/shipping steps.
-- * order_documents: files uploaded against an order (order_id set) or against the account
--   (order_id null, e.g. ID / customs-number letter reused across orders). Bytes live in Supabase
--   Storage (storage_path); this table holds metadata + cross-check status.
--
-- Not applied in mock mode (the console mirrors this in its in-memory store).

alter type public.user_role add value if not exists 'buyer';

create type public.account_type as enum ('business', 'individual');

alter table public.organisations
  add column account_type public.account_type not null default 'business';

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade, -- null = account-level document
  doc_key text not null,           -- requirement key, e.g. 'proof_of_payment_deposit'
  label text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  storage_path text not null,
  status text not null default 'received'
    check (status in ('received', 'passed', 'warned', 'failed')),
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_documents_order_idx on public.order_documents (order_id);
create index order_documents_org_key_idx on public.order_documents (org_id, doc_key);

create trigger order_documents_set_updated_at
  before update on public.order_documents
  for each row execute function public.set_updated_at();

alter table public.order_documents enable row level security;

create policy order_documents_select on public.order_documents
  for select to authenticated using (public.can_access_org(org_id));
-- A customer may only add a fresh ('received') document as themselves, and an order-level
-- document must belong to an order of the same organisation. Only ops may insert a
-- pre-checked status.
create policy order_documents_insert on public.order_documents
  for insert to authenticated with check (
    public.can_access_org(org_id)
    and uploaded_by = auth.uid()
    and (status = 'received' or public.is_ops_admin())
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = order_documents.order_id and o.org_id = order_documents.org_id
      )
    )
  );
-- Only ops may change a document's cross-check status or delete it.
create policy order_documents_update on public.order_documents
  for update to authenticated using (public.is_ops_admin()) with check (public.is_ops_admin());
create policy order_documents_delete on public.order_documents
  for delete to authenticated using (public.is_ops_admin());

-- ---------------------------------------------------------------------------
-- Storage: private bucket for the file bytes. Objects are stored at
-- '<org_id>/<order_id or "account">/<uuid>-<filename>', so the first path segment is the
-- owning organisation and the same can_access_org check applies to the bytes.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-documents', 'order-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy order_documents_objects_select on storage.objects
  for select to authenticated using (
    bucket_id = 'order-documents'
    and public.can_access_org(((storage.foldername(name))[1])::uuid)
  );
create policy order_documents_objects_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'order-documents'
    and public.can_access_org(((storage.foldername(name))[1])::uuid)
  );
-- Uploaded files are never overwritten by customers; ops may replace or remove them.
create policy order_documents_objects_update on storage.objects
  for update to authenticated using (bucket_id = 'order-documents' and public.is_ops_admin())
  with check (bucket_id = 'order-documents' and public.is_ops_admin());
create policy order_documents_objects_delete on storage.objects
  for delete to authenticated using (bucket_id = 'order-documents' and public.is_ops_admin());
