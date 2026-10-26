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

import {
  INDIVIDUAL_ORG_ID,
  STAFF_ORG_ID,
  DEMO_USER_ID,
  DEMO_USER_EMAIL,
  BUSINESS_USER_ID,
  INDIVIDUAL_USER_ID,
} from "./demo-logins";

export {
  INDIVIDUAL_ORG_ID,
  STAFF_ORG_ID,
  DEMO_USER_ID,
  DEMO_USER_EMAIL,
  BUSINESS_USER_ID,
  INDIVIDUAL_USER_ID,
  DEMO_LOGINS,
} from "./demo-logins";

export const DEMO_ORG_ID = "00000000-0000-0000-0000-0000000000a1";
const SECOND_ORG_ID = "00000000-0000-0000-0000-0000000000a2";

type Row = Record<string, unknown>;

interface MockStore {
  organisations: Row[];
  users: Row[];
  orders: Row[];
  order_status_changes: Row[];
  events: Row[];
  // --- fitment engine (Phase 1) ---
  vehicles: Row[];
  parts: Row[];
  fitments: Row[];
  requests: Row[];
  order_lines: Row[];
  agent_runs: Row[];
  part_crossrefs: Row[];
  // --- Phase 0.5 feature tables ---
  magic_link_tokens: Row[];
  ingestion_batches: Row[];
  ingestion_rows: Row[];
  quotes: Row[];
  // --- documents (b2b / individual) ---
  order_documents: Row[];
}

/** Typed shapes for the fitment-engine tables the pipeline reads (see lib/fitment). */
export type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year_range: string;
  engine: string;
};
export type PartRow = {
  id: string;
  part_number: string;
  brand: string;
  category: string;
  description: string;
};
export type FitmentRow = {
  id: string;
  vehicle_id: string;
  part_id: string;
  position: string | null;
  source: string;
  confidence: number;
};
export type AgentRunRow = {
  id: string;
  order_id: string | null;
  agent: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  tool_calls: number;
  outcome: string;
  error: string | null;
  created_at: string;
};

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
    // --- an individual's own orders (personal account) ---
    {
      id: "33333333-3333-3333-3333-333333333301",
      org_id: INDIVIDUAL_ORG_ID,
      reference: "EL-261020-PB01",
      status: "quoted",
      summary: "Front brake pads — VW Polo Vivo 2017 (my own car)",
      created_at: iso(6),
      updated_at: iso(1),
    },
    {
      id: "33333333-3333-3333-3333-333333333302",
      org_id: INDIVIDUAL_ORG_ID,
      reference: "EL-261012-PB02",
      status: "delivered",
      summary: "Headlamp (left) — Toyota Corolla 2014",
      created_at: iso(14),
      updated_at: iso(1),
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
      from_status: "matched",
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

  const { vehicles, parts, fitments } = fitmentCatalog();
  const ops = opsSeed();

  return {
    organisations: [
      { id: DEMO_ORG_ID, name: "Swazi Parts Co (Pty) Ltd", country: "SZ", account_type: "business" },
      { id: SECOND_ORG_ID, name: "Mbabane Motors (ZA)", country: "ZA", account_type: "business" },
      { id: INDIVIDUAL_ORG_ID, name: "Thandi Dlamini", country: "ZA", account_type: "individual" },
      { id: STAFF_ORG_ID, name: "Easy Logi (staff)", country: "SZ", account_type: "business" },
    ],
    users: [
      {
        id: DEMO_USER_ID,
        org_id: STAFF_ORG_ID,
        email: DEMO_USER_EMAIL,
        full_name: "Demo Ops Admin",
        role: "ops_admin",
      },
      {
        id: BUSINESS_USER_ID,
        org_id: DEMO_ORG_ID,
        email: "sipho@swaziparts.local",
        full_name: "Sipho Nkosi",
        role: "importer_admin",
      },
      {
        id: INDIVIDUAL_USER_ID,
        org_id: INDIVIDUAL_ORG_ID,
        email: "thandi@example.local",
        full_name: "Thandi Dlamini",
        role: "buyer",
      },
    ],
    orders,
    order_status_changes,
    events: ops.events,
    vehicles,
    parts,
    fitments,
    requests: [],
    order_lines: [],
    agent_runs: ops.agent_runs,
    part_crossrefs: [],
    magic_link_tokens: [],
    ingestion_batches: [],
    ingestion_rows: [],
    quotes: [],
    order_documents: [],
  };
}

/**
 * The launch catalogue for the fitment engine: vehicles, a sample of parts across categories
 * with illustrative part numbers, and the fitments that link them. Mirrors db/seed/*.sql, kept
 * small but broad enough that common buyer requests resolve to real candidate part numbers.
 * Part numbers are illustrative dev data only.
 */
function fitmentCatalog(): { vehicles: Row[]; parts: Row[]; fitments: Row[] } {
  const vehicles: VehicleRow[] = [
    { id: "veh-hilux-15", make: "Toyota", model: "Hilux", year_range: "2005-2015", engine: "2.5 D-4D" },
    { id: "veh-hilux-24", make: "Toyota", model: "Hilux", year_range: "2016-2024", engine: "2.8 GD-6" },
    { id: "veh-quantum", make: "Toyota", model: "Quantum", year_range: "2005-2024", engine: "2.5 D-4D" },
    { id: "veh-corolla", make: "Toyota", model: "Corolla", year_range: "2008-2019", engine: "1.6 Petrol" },
    { id: "veh-fortuner", make: "Toyota", model: "Fortuner", year_range: "2016-2024", engine: "2.8 GD-6" },
    { id: "veh-ranger", make: "Ford", model: "Ranger", year_range: "2011-2022", engine: "3.2 TDCi" },
    { id: "veh-polo-vivo", make: "Volkswagen", model: "Polo Vivo", year_range: "2010-2024", engine: "1.4 Petrol" },
    { id: "veh-polo", make: "Volkswagen", model: "Polo", year_range: "2010-2017", engine: "1.6 Petrol" },
    { id: "veh-np200", make: "Nissan", model: "NP200", year_range: "2008-2024", engine: "1.6 Petrol" },
    { id: "veh-np300", make: "Nissan", model: "NP300 Hardbody", year_range: "2008-2024", engine: "2.5 Diesel" },
    { id: "veh-dmax", make: "Isuzu", model: "D-Max", year_range: "2013-2024", engine: "2.5 Diesel" },
    { id: "veh-kb", make: "Isuzu", model: "KB", year_range: "2008-2016", engine: "2.5 Diesel" },
  ];

  const parts: PartRow[] = [
    { id: "p-brakepad-hilux-f", part_number: "04465-0K290", brand: "Toyota", category: "brakes", description: "Front brake pad set — Hilux" },
    { id: "p-brakepad-ranger-f", part_number: "AB31-2K021-AA", brand: "Ford", category: "brakes", description: "Front brake pad set — Ranger" },
    { id: "p-brakepad-polo-f", part_number: "6R0698151A", brand: "Volkswagen", category: "brakes", description: "Front brake pad set — Polo / Polo Vivo" },
    { id: "p-oilfilter-corolla", part_number: "90915-YZZE1", brand: "Toyota", category: "engine_consumables", description: "Oil filter — petrol" },
    { id: "p-oilfilter-dmax", part_number: "8-98140-266-0", brand: "Isuzu", category: "engine_consumables", description: "Oil filter — D-Max" },
    { id: "p-airfilter-hilux", part_number: "17801-0C010", brand: "Toyota", category: "engine_consumables", description: "Air filter element — Hilux" },
    { id: "p-airfilter-ranger", part_number: "AB39-9601-AA", brand: "Ford", category: "engine_consumables", description: "Air filter — Ranger" },
    { id: "p-airfilter-polo", part_number: "6Q0129620", brand: "Volkswagen", category: "engine_consumables", description: "Air filter — Polo / Polo Vivo" },
    { id: "p-airfilter-np200", part_number: "16546-ED000", brand: "Nissan", category: "engine_consumables", description: "Air filter — NP200" },
    { id: "p-cabinfilter-hilux", part_number: "87139-0K080", brand: "Toyota", category: "AC", description: "Cabin air filter — Hilux" },
    { id: "p-accompressor-hilux", part_number: "88310-0K240", brand: "Toyota", category: "AC", description: "AC compressor — Hilux 2.8" },
    { id: "p-alternator-dmax", part_number: "8-98092-427-0", brand: "Isuzu", category: "electrical", description: "Alternator — D-Max 2.5" },
    { id: "p-radiator-ranger", part_number: "AB39-8005-AA", brand: "Ford", category: "cooling", description: "Radiator — Ranger 3.2" },
    { id: "p-waterpump-corolla", part_number: "16100-0H040", brand: "Toyota", category: "cooling", description: "Water pump — Corolla 1.6" },
    { id: "p-clutch-polo-vivo", part_number: "03G141015X", brand: "Volkswagen", category: "transmission", description: "Clutch kit — Polo Vivo 1.4" },
    { id: "p-shock-hilux-f", part_number: "48510-0K620", brand: "Toyota", category: "suspension", description: "Front shock absorber — Hilux" },
  ];

  const f = (vehicle_id: string, part_id: string, position: string | null, confidence: number): FitmentRow => ({
    id: `fit-${vehicle_id}-${part_id}`,
    vehicle_id,
    part_id,
    position,
    source: "seed:sample",
    confidence,
  });

  const fitments: FitmentRow[] = [
    f("veh-hilux-24", "p-brakepad-hilux-f", "front", 0.95),
    f("veh-hilux-15", "p-brakepad-hilux-f", "front", 0.8),
    f("veh-ranger", "p-brakepad-ranger-f", "front", 0.94),
    f("veh-polo-vivo", "p-brakepad-polo-f", "front", 0.92),
    f("veh-polo", "p-brakepad-polo-f", "front", 0.9),
    f("veh-corolla", "p-oilfilter-corolla", null, 0.96),
    f("veh-dmax", "p-oilfilter-dmax", null, 0.92),
    f("veh-hilux-24", "p-airfilter-hilux", null, 0.9),
    f("veh-hilux-15", "p-airfilter-hilux", null, 0.88),
    f("veh-ranger", "p-airfilter-ranger", null, 0.93),
    f("veh-polo-vivo", "p-airfilter-polo", null, 0.9),
    f("veh-polo", "p-airfilter-polo", null, 0.9),
    f("veh-np200", "p-airfilter-np200", null, 0.9),
    f("veh-hilux-24", "p-cabinfilter-hilux", "cabin", 0.9),
    f("veh-hilux-24", "p-accompressor-hilux", null, 0.88),
    f("veh-dmax", "p-alternator-dmax", null, 0.9),
    f("veh-ranger", "p-radiator-ranger", null, 0.9),
    f("veh-corolla", "p-waterpump-corolla", null, 0.9),
    f("veh-polo-vivo", "p-clutch-polo-vivo", null, 0.9),
    f("veh-hilux-24", "p-shock-hilux-f", "front", 0.88),
  ];

  return { vehicles, parts, fitments };
}

/** Seed a little agent-run + event history so the Ops Health page shows signal out of the box. */
function opsSeed(): { agent_runs: Row[]; events: Row[] } {
  const order2 = "11111111-1111-1111-1111-111111111102";
  const order3 = "11111111-1111-1111-1111-111111111103";
  const run = (
    agent: string,
    tier: "haiku" | "sonnet",
    tokensIn: number,
    tokensOut: number,
    latencyMs: number,
    outcome: string,
    error: string | null,
    orderId: string | null,
    daysAgo: number,
  ): Row => ({
    id: crypto.randomUUID(),
    order_id: orderId,
    agent,
    model: `${tier === "haiku" ? "claude-haiku-5-5" : "claude-sonnet-5-5"} (offline)`,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    latency_ms: latencyMs,
    tool_calls: 0,
    outcome,
    error,
    created_at: iso(daysAgo),
  });

  const agent_runs: Row[] = [
    run("part-intent-extractor", "haiku", 120, 60, 4, "ok", null, order3, 1),
    run("fitment-ranker", "sonnet", 300, 90, 9, "ok", null, order3, 1),
    run("part-intent-extractor", "haiku", 100, 40, 3, "low_confidence", null, order2, 2),
    run("fitment-ranker", "sonnet", 280, 70, 12, "low_confidence", null, order2, 2),
    run("clarifier", "haiku", 90, 50, 3, "ok", null, order2, 2),
    run("part-label-reader", "sonnet", 200, 30, 6, "error", "offline model can't read an uploaded image", null, 3),
  ];

  const events: Row[] = [
    {
      id: crypto.randomUUID(),
      org_id: DEMO_ORG_ID,
      name: "order.created",
      order_id: order3,
      payload: { reference: "EL-261005-AA03" },
      dedupe_key: `order.created:${order3}`,
      processed_at: iso(7),
      created_at: iso(7),
    },
    {
      id: crypto.randomUUID(),
      org_id: DEMO_ORG_ID,
      name: "match.low_confidence",
      order_id: order2,
      payload: { reason: "Two Hilux generations matched" },
      dedupe_key: null,
      processed_at: null,
      created_at: iso(2),
    },
  ];

  return { agent_runs, events };
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

/** Row-visibility predicate emulating Postgres RLS (`can_access_org(org_id)`) for one session. */
type Scope = (table: keyof MockStore, row: Row) => boolean;

/**
 * Build the RLS stand-in for a signed-in user. Ops admins see everything (as `is_ops_admin()`
 * does in the real policies); business and individual users only see rows of their own
 * organisation. Reference tables (catalogue, vehicles…) stay readable by everyone signed in.
 * Returns null (no scoping) when there is no session or the user is staff.
 */
export function scopeForUser(userId: string | null): Scope | null {
  if (!userId) return null;
  const user = store().users.find((u) => u.id === userId);
  if (!user || user.role === "ops_admin") return null;
  const orgId = user.org_id;
  return (table, row) => {
    switch (table) {
      case "orders":
      case "events":
      case "requests":
      case "order_documents":
      case "magic_link_tokens":
        return row.org_id === orgId;
      case "order_status_changes":
      case "order_lines":
      case "quotes": {
        const order = store().orders.find((o) => o.id === row.order_id);
        return !!order && order.org_id === orgId;
      }
      case "organisations":
        return row.id === orgId;
      case "users":
        return row.org_id === orgId;
      default:
        return true;
    }
  };
}

/** Minimal PostgREST-style query builder over an in-memory table, awaitable via `then`. */
class MockQuery implements PromiseLike<QueryResult> {
  private filters: Filter[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "select" | "insert" = "select";
  private insertRows: Row[] = [];
  private cardinality: "many" | "maybeSingle" | "single" = "many";

  constructor(
    private readonly table: keyof MockStore,
    private readonly scope: Scope | null = null,
  ) {}

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
      // RLS `with check`: a scoped user may only insert rows into their own organisation.
      if (this.scope && this.insertRows.some((row) => !this.scope!(this.table, row))) {
        return { data: null, error: { message: "new row violates row-level security policy" } };
      }
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

    let rows = table.filter(
      (r) => (!this.scope || this.scope(this.table, r)) && this.filters.every((f) => r[f.col] === f.val),
    );
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

function changeOrderStatus(args: Record<string, unknown>, scope: Scope | null): QueryResult {
  const orderId = args.p_order_id as string;
  const to = args.p_to as string;
  const role = args.p_role as string;
  const note = (args.p_note as string | null) ?? null;

  const order = store().orders.find((o) => o.id === orderId);
  if (!order || (scope && !scope("orders", order))) {
    return { data: null, error: { message: "Order not found." } };
  }

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
      return new MockQuery(table, scopeForUser(session.getUserId()));
    },
    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn === "change_order_status") return changeOrderStatus(args, scopeForUser(session.getUserId()));
      return { data: null, error: { message: `Unknown RPC: ${fn}` } };
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

// ---------------------------------------------------------------------------
// Fitment-engine accessors (Phase 1). The pipeline (lib/fitment) reads the
// catalogue and logs agent runs through these, rather than the Supabase-shaped
// client, since retrieval is plain code over typed rows.
// ---------------------------------------------------------------------------

export interface FitmentData {
  vehicles: VehicleRow[];
  parts: PartRow[];
  fitments: FitmentRow[];
}

/** The read-only catalogue the deterministic retrieval step matches against. */
export function mockFitmentData(): FitmentData {
  const s = store();
  return {
    vehicles: s.vehicles as VehicleRow[],
    parts: s.parts as PartRow[],
    fitments: s.fitments as FitmentRow[],
  };
}

/** Record an `order.created`-style buyer request row. Returns its id. */
export function addRequest(input: { orgId: string; orderId: string | null; rawText: string }): string {
  const id = crypto.randomUUID();
  store().requests.push({
    id,
    org_id: input.orgId,
    order_id: input.orderId,
    raw_text: input.rawText,
    status: "classified",
    created_at: new Date().toISOString(),
  });
  return id;
}

/** Add a confirmed part to an order (the line the human approved in the UI). */
export function addOrderLine(input: {
  orderId: string;
  partId: string;
  partNumber: string;
  brand: string;
  description: string;
  qty: number;
}): void {
  store().order_lines.push({
    id: crypto.randomUUID(),
    order_id: input.orderId,
    part_id: input.partId,
    part_number: input.partNumber,
    brand: input.brand,
    description: input.description,
    qty: input.qty,
    created_at: new Date().toISOString(),
  });
}

/** Append agent-run log rows (one per agent that ran), optionally tied to an order. */
export function recordAgentRuns(
  orderId: string | null,
  runs: Array<Omit<AgentRunRow, "id" | "order_id" | "created_at">>,
): void {
  const now = new Date().toISOString();
  for (const r of runs) {
    store().agent_runs.push({ id: crypto.randomUUID(), order_id: orderId, created_at: now, ...r });
  }
}

/** Agent-run rows for one order, newest first (for the order detail page). */
export function listAgentRuns(orderId: string): AgentRunRow[] {
  return (store().agent_runs as AgentRunRow[])
    .filter((r) => r.order_id === orderId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type EventRow = {
  id: string;
  org_id: string;
  name: string;
  order_id: string | null;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  processed_at: string | null;
  created_at: string;
};

/** All agent-run rows, newest first (for the Ops Health page). */
export function listAllAgentRuns(): AgentRunRow[] {
  return [...(store().agent_runs as AgentRunRow[])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

/** All event rows (for the Ops Health page). */
export function listAllEvents(): EventRow[] {
  return store().events as EventRow[];
}

export type OrderRow = {
  id: string;
  org_id: string;
  reference: string;
  status: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

/** All orders, newest first (for the dashboard overview). */
export function listAllOrders(): OrderRow[] {
  return [...(store().orders as OrderRow[])].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** One order by id (for the public tracking + supplier-quote pages). */
export function getOrderById(id: string): OrderRow | undefined {
  return (store().orders as OrderRow[]).find((o) => o.id === id);
}

/** Record a supplier quote (from the public supplier-quote page). */
export function addQuote(input: {
  orgId: string;
  orderId: string;
  supplierName: string;
  currency: string;
  unitPriceMinor: number;
  leadTimeDays: number | null;
  moq: number | null;
}): void {
  store().quotes.push({
    id: crypto.randomUUID(),
    org_id: input.orgId,
    order_id: input.orderId,
    supplier_name: input.supplierName,
    currency: input.currency,
    unit_price_minor: input.unitPriceMinor,
    lead_time_days: input.leadTimeDays,
    moq: input.moq,
    created_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Magic-link tokens (Phase 0.5). Only the token HASH is stored; see lib/magic-link.ts
// and packages/shared/src/magicLink.ts. Single-use is enforced via used_at.
// ---------------------------------------------------------------------------

export type MagicLinkRow = {
  id: string;
  org_id: string;
  order_id: string;
  page_type: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
};

export function insertMagicLinkToken(input: {
  orgId: string;
  orderId: string;
  pageType: string;
  tokenHash: string;
  expiresAt: string;
  createdBy?: string | null;
}): void {
  store().magic_link_tokens.push({
    id: crypto.randomUUID(),
    org_id: input.orgId,
    order_id: input.orderId,
    page_type: input.pageType,
    token_hash: input.tokenHash,
    expires_at: input.expiresAt,
    used_at: null,
    created_by: input.createdBy ?? null,
    created_at: new Date().toISOString(),
  });
}

export function findMagicLinkToken(tokenHash: string): MagicLinkRow | undefined {
  return (store().magic_link_tokens as MagicLinkRow[]).find((r) => r.token_hash === tokenHash);
}

/** Mark a token used (single-use). Returns false if it was already used or not found. */
export function markMagicLinkTokenUsed(tokenHash: string): boolean {
  const row = (store().magic_link_tokens as MagicLinkRow[]).find((r) => r.token_hash === tokenHash);
  if (!row || row.used_at) return false;
  row.used_at = new Date().toISOString();
  return true;
}

// ---------------------------------------------------------------------------
// Catalogue writes + ingestion staging (Phase 0.5, item 6). The ingestion
// pipeline (lib/ingest) stages parsed rows here, then publishes approved rows
// into the parts / part_crossrefs / fitments catalogue with source + confidence.
// ---------------------------------------------------------------------------

function normNumber(s: string): string {
  return s.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** Insert a catalogue part (idempotent by brand + normalized number); returns the part id. */
export function addCatalogPart(input: {
  partNumber: string;
  brand: string;
  category: string;
  description: string;
}): string {
  const s = store();
  const existing = (s.parts as PartRow[]).find(
    (p) =>
      p.brand.toLowerCase() === input.brand.toLowerCase() &&
      normNumber(p.part_number) === normNumber(input.partNumber),
  );
  if (existing) return existing.id;
  const id = `ing-${crypto.randomUUID().slice(0, 8)}`;
  s.parts.push({
    id,
    part_number: input.partNumber,
    brand: input.brand,
    category: input.category,
    description: input.description,
  });
  return id;
}

export function addCatalogCrossref(input: {
  partId: string;
  crossrefBrand: string;
  crossrefNumber: string;
}): void {
  store().part_crossrefs.push({
    id: crypto.randomUUID(),
    part_id: input.partId,
    crossref_brand: input.crossrefBrand,
    crossref_number: input.crossrefNumber,
    created_at: new Date().toISOString(),
  });
}

export function addCatalogFitment(input: {
  vehicleId: string;
  partId: string;
  position: string | null;
  source: string;
  confidence: number;
}): void {
  store().fitments.push({
    id: `fit-${crypto.randomUUID().slice(0, 8)}`,
    vehicle_id: input.vehicleId,
    part_id: input.partId,
    position: input.position,
    source: input.source,
    confidence: input.confidence,
  });
}

/** Resolve a vehicle id from a make/model (case-insensitive contains); null if no match. */
export function resolveVehicleId(make: string, model: string): string | null {
  const m = make.toLowerCase().trim();
  const mo = model.toLowerCase().trim();
  const v = (store().vehicles as VehicleRow[]).find(
    (x) => x.make.toLowerCase().includes(m) && x.model.toLowerCase().includes(mo),
  );
  return v ? v.id : null;
}

export type IngestionBatchRow = {
  id: string;
  org_id: string;
  filename: string;
  status: string;
  row_count: number;
  created_at: string;
};

export function createIngestionBatch(input: { orgId: string; filename: string; rowCount: number }): string {
  const id = crypto.randomUUID();
  store().ingestion_batches.push({
    id,
    org_id: input.orgId,
    filename: input.filename,
    status: "staged",
    row_count: input.rowCount,
    created_at: new Date().toISOString(),
  });
  return id;
}

/** Save staged rows (opaque row objects produced by lib/ingest) under a batch. */
export function saveIngestionRows(batchId: string, rows: Array<Record<string, unknown>>): void {
  const now = new Date().toISOString();
  for (const r of rows) {
    store().ingestion_rows.push({ id: crypto.randomUUID(), batch_id: batchId, created_at: now, ...r });
  }
}

export function getIngestionBatch(batchId: string): IngestionBatchRow | undefined {
  return (store().ingestion_batches as IngestionBatchRow[]).find((b) => b.id === batchId);
}

export function listIngestionRows(batchId: string): Row[] {
  return store().ingestion_rows.filter((r) => r.batch_id === batchId);
}

export function updateIngestionRowStatus(rowId: string, status: string): void {
  const r = store().ingestion_rows.find((x) => x.id === rowId);
  if (r) r.status = status;
}

export function markIngestionBatchPublished(batchId: string): void {
  const b = store().ingestion_batches.find((x) => x.id === batchId);
  if (b) b.status = "published";
}

// ---------------------------------------------------------------------------
// Uploaded documents (b2b / individual). Order documents have order_id set; account documents
// (ID, proof of address, customs-number letter…) have order_id null and satisfy every order of
// that organisation. In mock mode the bytes are kept in memory (base64) so they can be
// downloaded again; the real backend stores them in Supabase Storage.
// ---------------------------------------------------------------------------

export type OrderDocumentRow = {
  id: string;
  org_id: string;
  order_id: string | null;
  doc_key: string;
  label: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: "received" | "passed" | "warned" | "failed";
  uploaded_by: string | null;
  created_at: string;
  data_base64: string;
};

export function addOrderDocument(
  input: Omit<OrderDocumentRow, "id" | "created_at" | "status">,
): OrderDocumentRow {
  const row: OrderDocumentRow = {
    ...input,
    id: crypto.randomUUID(),
    status: "received",
    created_at: new Date().toISOString(),
  };
  store().order_documents.push(row);
  return row;
}

/** Documents that count for an order: its own uploads plus the organisation's account documents. */
export function listDocumentsForOrder(orgId: string, orderId: string): OrderDocumentRow[] {
  return (store().order_documents as OrderDocumentRow[]).filter(
    (d) => d.org_id === orgId && (d.order_id === orderId || d.order_id === null),
  );
}

export function listAccountDocuments(orgId: string): OrderDocumentRow[] {
  return (store().order_documents as OrderDocumentRow[]).filter(
    (d) => d.org_id === orgId && d.order_id === null,
  );
}

export function getOrderDocument(id: string): OrderDocumentRow | undefined {
  return (store().order_documents as OrderDocumentRow[]).find((d) => d.id === id);
}

export type OrganisationRow = {
  id: string;
  name: string;
  country: string;
  account_type: "business" | "individual";
};

export function getOrganisation(id: string): OrganisationRow | undefined {
  return (store().organisations as OrganisationRow[]).find((o) => o.id === id);
}

/** Orders for one organisation (non-staff views use this instead of listAllOrders). */
export function listOrdersForOrg(orgId: string): OrderRow[] {
  return listAllOrders().filter((o) => o.org_id === orgId);
}
