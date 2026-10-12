/**
 * Local mock backend — lets the console run with no Supabase project, so the UI can be
 * clicked through end to end offline (login -> create order -> walk the status machine).
 *
 * Enabled only when NEXT_PUBLIC_USE_MOCK=1. It replaces the Supabase client with an
 * in-memory store that supports exactly the query shapes the console uses. The real status
 * machine (packages/shared) is still the only thing that decides transitions — this mock just
 * stands in for Postgres + Auth. Nothing here runs when the real backend is configured.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@easy-logi/shared";

export const MOCK_SESSION_COOKIE = "el_mock_session";

export const DEMO_ORG_ID = "00000000-0000-0000-0000-0000000000a1";
const SECOND_ORG_ID = "00000000-0000-0000-0000-0000000000a2";
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000011";
export const DEMO_USER_EMAIL = "demo@easylogi.local";

type Row = Record<string, unknown>;

interface MockStore {
  organisations: Row[];
  users: Row[];
  orders: Row[];
  order_status_changes: Row[];
  events: Row[];
}

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function seed(): MockStore {
  const orders: Row[] = [
    {
      id: "11111111-1111-1111-1111-111111111101",
      org_id: DEMO_ORG_ID,
      reference: "EL-261009-AA01",
      status: "requested",
      summary: "Front brake pads — Toyota Hilux 2018 (VIN provided)",
      created_at: iso(3),
      updated_at: iso(3),
    },
    {
      id: "11111111-1111-1111-1111-111111111102",
      org_id: DEMO_ORG_ID,
      reference: "EL-261008-AA02",
      status: "fitment_in_progress",
      summary: "Alternator — Isuzu KB 2.5 (licence disc photo)",
      created_at: iso(4),
      updated_at: iso(2),
    },
    {
      id: "11111111-1111-1111-1111-111111111103",
      org_id: DEMO_ORG_ID,
      reference: "EL-261005-AA03",
      status: "quoted",
      summary: "Clutch kit — VW Polo Vivo 1.4 (3 supplier quotes in)",
      created_at: iso(7),
      updated_at: iso(1),
    },
    {
      id: "11111111-1111-1111-1111-111111111104",
      org_id: DEMO_ORG_ID,
      reference: "EL-260928-AA04",
      status: "in_transit",
      summary: "Radiator — Ford Ranger 3.2 (consolidated with AA03)",
      created_at: iso(14),
      updated_at: iso(2),
    },
  ];

  const order_status_changes: Row[] = [
    {
      id: "22222222-2222-2222-2222-222222222201",
      order_id: "11111111-1111-1111-1111-111111111102",
      from_status: "requested",
      to_status: "fitment_in_progress",
      role: "ops_admin",
      note: "Decoding VIN + licence disc.",
      created_at: iso(2),
    },
    {
      id: "22222222-2222-2222-2222-222222222202",
      order_id: "11111111-1111-1111-1111-111111111103",
      from_status: "fit_confirmed",
      to_status: "rfq_sent",
      role: "ops_admin",
      note: "RFQ to 4 suppliers.",
      created_at: iso(5),
    },
    {
      id: "22222222-2222-2222-2222-222222222203",
      order_id: "11111111-1111-1111-1111-111111111103",
      from_status: "rfq_sent",
      to_status: "quoted",
      role: "system",
      note: "3 quotes received.",
      created_at: iso(1),
    },
  ];

  return {
    organisations: [
      { id: DEMO_ORG_ID, name: "Demo Importers (SZ)" },
      { id: SECOND_ORG_ID, name: "Mbabane Motors (ZA)" },
    ],
    users: [
      {
        id: DEMO_USER_ID,
        org_id: DEMO_ORG_ID,
        email: DEMO_USER_EMAIL,
        full_name: "Demo Ops Admin",
        role: "ops_admin",
      },
    ],
    orders,
    order_status_changes,
    events: [],
  };
}

/**
 * The store is a process-wide singleton kept on globalThis so it survives Next.js dev HMR
 * and is shared across server components, route handlers and server actions in the one dev
 * server process. It is in-memory only: restarting the dev server resets to the seed.
 */
const GLOBAL_KEY = "__easy_logi_mock_store__";
function store(): MockStore {
  const g = globalThis as unknown as Record<string, MockStore | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = seed();
  return g[GLOBAL_KEY]!;
}

type QueryResult = { data: unknown; error: { message: string } | null };

interface Filter {
  col: string;
  val: unknown;
}

/** Minimal PostgREST-style query builder over an in-memory table, awaitable via `then`. */
class MockQuery implements PromiseLike<QueryResult> {
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "select" | "insert" = "select";
  private insertRows: Row[] = [];
  private cardinality: "many" | "maybeSingle" | "single" = "many";

  constructor(private readonly table: keyof MockStore) {}

  select(_cols?: string): this {
    // Column projection is ignored: returning full rows is harmless for this console.
    return this;
  }

  insert(rows: Row | Row[]): this {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending ?? true };
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  maybeSingle(): this {
    this.cardinality = "maybeSingle";
    return this;
  }

  single(): this {
    this.cardinality = "single";
    return this;
  }

  private run(): QueryResult {
    const table = store()[this.table];

    if (this.mode === "insert") {
      const now = new Date().toISOString();
      const inserted = this.insertRows.map((row) => {
        const withDefaults: Row = {
          id: (row.id as string | undefined) ?? crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...row,
        };
        table.push(withDefaults);
        return withDefaults;
      });
      return this.shape(inserted);
    }

    let rows = table.filter((r) => this.filters.every((f) => r[f.col] === f.val));
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = String(a[col] ?? "");
        const bv = String(b[col] ?? "");
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return this.shape(rows);
  }

  private shape(rows: Row[]): QueryResult {
    if (this.cardinality === "many") return { data: rows, error: null };
    const first = rows[0] ?? null;
    if (this.cardinality === "single" && !first) {
      return { data: null, error: { message: "No rows found" } };
    }
    return { data: first, error: null };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    try {
      return Promise.resolve(this.run()).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

function changeOrderStatus(args: Record<string, unknown>): QueryResult {
  const orderId = args.p_order_id as string;
  const to = args.p_to as string;
  const role = args.p_role as string;
  const note = (args.p_note as string | null) ?? null;

  const order = store().orders.find((o) => o.id === orderId);
  if (!order) return { data: null, error: { message: "Order not found." } };

  const from = order.status as string;
  const now = new Date().toISOString();
  order.status = to;
  order.updated_at = now;

  store().order_status_changes.push({
    id: crypto.randomUUID(),
    order_id: orderId,
    from_status: from,
    to_status: to,
    role,
    note,
    created_at: now,
  });

  return { data: null, error: null };
}

export interface MockSession {
  getUserId(): string | null;
  clearSession?(): void;
}

/**
 * Build a stand-in for the Supabase client covering only what the console calls. Cast to the
 * real client type so callers are unchanged; the covered surface is exercised by the UI.
 */
export function createMockClient(session: MockSession): SupabaseClient<Database> {
  const client = {
    auth: {
      async getUser() {
        const id = session.getUserId();
        return { data: { user: id ? { id } : null }, error: null };
      },
      async signInWithOtp() {
        return { data: { user: null, session: null }, error: null };
      },
      async signOut() {
        session.clearSession?.();
        return { error: null };
      },
      async exchangeCodeForSession() {
        return { data: { user: null, session: null }, error: null };
      },
    },
    from(table: keyof MockStore) {
      return new MockQuery(table);
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn === "change_order_status") return changeOrderStatus(args);
      return { data: null, error: { message: `Unknown RPC: ${fn}` } };
    },
  };

  return client as unknown as SupabaseClient<Database>;
}
