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
  // --- fitment engine (Phase 1) ---
  vehicles: Row[];
  parts: Row[];
  fitments: Row[];
  requests: Row[];
  order_lines: Row[];
  agent_runs: Row[];
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

  const { vehicles, parts, fitments } = fitmentCatalog();

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
    vehicles,
    parts,
    fitments,
    requests: [],
    order_lines: [],
    agent_runs: [],
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
