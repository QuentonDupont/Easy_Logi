/**
 * Order status machine — the ONLY place order status may change (CLAUDE.md rule 3).
 *
 * Phase 0.5 reconciles the model with the spec (Module 3): the fitment engine ends at `matched`
 * (part approved), sourcing adds the `deposit_paid`/`balance_paid` money gates and `qc_pending`,
 * logistics adds `at_consolidation` -> sea `in_transit` -> `at_port_durban`|`at_port_maputo` ->
 * `in_transit_road` -> customs, and `fit_confirmed` becomes the post-delivery buyer confirmation
 * before `closed`. See docs/decisions.md (2026-10-13) for the reconciliation.
 *
 * Nothing here touches the database or the network: it is pure, so it is exhaustively
 * unit-testable and safe to call from both the browser and the server.
 */

/** Every status an order can hold. */
export const ORDER_STATUSES = [
  // --- fitment engine ---
  "requested",
  "fitment_in_progress",
  "matched", // part number matched & approved (fitment complete)
  // --- sourcing + supplier-comms engine ---
  "rfq_sent",
  "quoted",
  "po_issued",
  "deposit_paid",
  "in_production",
  "qc_pending",
  "qc_passed",
  "balance_paid",
  // --- logistics ---
  "at_consolidation",
  "in_transit", // sea freight
  "at_port_durban",
  "at_port_maputo",
  "in_transit_road",
  "customs_clearance",
  "cleared",
  "delivered",
  // --- post-delivery ---
  "fit_confirmed", // buyer confirms the delivered part actually fits
  "closed",
  // --- out-of-band states ---
  "on_hold",
  "disputed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Who may trigger a transition. */
export const ROLES = ["buyer", "importer", "ops_admin", "system"] as const;
export type Role = (typeof ROLES)[number];

/**
 * The linear "active" backbone: the states an order moves through while in flight.
 * Excludes the terminal states (closed, cancelled) and the out-of-band states
 * (on_hold, disputed). An order may be put on hold or disputed from any of these,
 * and resumed back to any of these.
 */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  "requested",
  "fitment_in_progress",
  "matched",
  "rfq_sent",
  "quoted",
  "po_issued",
  "deposit_paid",
  "in_production",
  "qc_pending",
  "qc_passed",
  "balance_paid",
  "at_consolidation",
  "in_transit",
  "at_port_durban",
  "at_port_maputo",
  "in_transit_road",
  "customs_clearance",
  "cleared",
  "delivered",
  "fit_confirmed",
];

/** Terminal states have no outgoing transitions. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ["closed", "cancelled"];

export interface Transition {
  from: OrderStatus;
  to: OrderStatus;
  /** Roles permitted to trigger this transition. */
  roles: readonly Role[];
  /**
   * True when this transition commits money, a PO, a part-number approval or a
   * customs submission — i.e. it must originate from a human action in the UI
   * (CLAUDE.md rule 2). `system` is never allowed on these.
   */
  requiresHuman?: boolean;
}

const HUMAN = ["importer", "ops_admin"] as const satisfies readonly Role[];
const HUMAN_AND_SYSTEM = ["importer", "ops_admin", "system"] as const satisfies readonly Role[];

/**
 * The backbone transitions, forward and the few legitimate backward steps.
 * `requiresHuman` marks the gates that commit money/approvals/customs.
 */
const BACKBONE: Transition[] = [
  // --- fitment engine ---
  { from: "requested", to: "fitment_in_progress", roles: HUMAN_AND_SYSTEM },
  // confirming the match approves a part number -> human only (rule 1 & 2)
  { from: "fitment_in_progress", to: "matched", roles: HUMAN, requiresHuman: true },
  { from: "fitment_in_progress", to: "requested", roles: HUMAN }, // reopen for more info
  // --- sourcing + supplier-comms ---
  { from: "matched", to: "rfq_sent", roles: HUMAN },
  { from: "rfq_sent", to: "quoted", roles: HUMAN_AND_SYSTEM }, // quotes arrive via system
  // issuing the PO commits money -> human only
  { from: "quoted", to: "po_issued", roles: HUMAN, requiresHuman: true },
  // deposit & balance are payments -> human only
  { from: "po_issued", to: "deposit_paid", roles: HUMAN, requiresHuman: true },
  { from: "deposit_paid", to: "in_production", roles: HUMAN_AND_SYSTEM },
  { from: "in_production", to: "qc_pending", roles: HUMAN_AND_SYSTEM },
  { from: "qc_pending", to: "qc_passed", roles: HUMAN }, // QC sign-off
  { from: "qc_passed", to: "balance_paid", roles: HUMAN, requiresHuman: true },
  // --- logistics ---
  { from: "balance_paid", to: "at_consolidation", roles: HUMAN_AND_SYSTEM },
  { from: "at_consolidation", to: "in_transit", roles: HUMAN_AND_SYSTEM }, // sea departs
  { from: "in_transit", to: "at_port_durban", roles: HUMAN_AND_SYSTEM },
  { from: "in_transit", to: "at_port_maputo", roles: HUMAN_AND_SYSTEM },
  { from: "at_port_durban", to: "in_transit_road", roles: HUMAN_AND_SYSTEM },
  { from: "at_port_maputo", to: "in_transit_road", roles: HUMAN_AND_SYSTEM },
  { from: "in_transit_road", to: "customs_clearance", roles: HUMAN_AND_SYSTEM },
  // customs submission -> human only
  { from: "customs_clearance", to: "cleared", roles: HUMAN, requiresHuman: true },
  { from: "cleared", to: "delivered", roles: HUMAN_AND_SYSTEM },
  // --- post-delivery ---
  // the buyer confirms the delivered part actually fits, then the order closes
  { from: "delivered", to: "fit_confirmed", roles: ["buyer", "importer", "ops_admin"] },
  { from: "fit_confirmed", to: "closed", roles: ["buyer", "importer", "ops_admin"] },
];

/**
 * Build the full transition table by expanding the out-of-band rules:
 *  - any active state -> on_hold | disputed | cancelled
 *  - on_hold    -> any active state (resume) | cancelled
 *  - disputed   -> any active state (resolve & resume) | closed (resolved) | cancelled
 */
function buildTransitions(): Transition[] {
  const all: Transition[] = [...BACKBONE];

  for (const from of ACTIVE_STATUSES) {
    all.push({ from, to: "on_hold", roles: HUMAN });
    all.push({ from, to: "disputed", roles: ["buyer", "importer", "ops_admin"] });
    all.push({ from, to: "cancelled", roles: HUMAN });
  }

  for (const to of ACTIVE_STATUSES) {
    all.push({ from: "on_hold", to, roles: HUMAN });
    all.push({ from: "disputed", to, roles: HUMAN });
  }
  all.push({ from: "on_hold", to: "cancelled", roles: HUMAN });
  all.push({ from: "disputed", to: "closed", roles: HUMAN });
  all.push({ from: "disputed", to: "cancelled", roles: HUMAN });

  return all;
}

export const TRANSITIONS: readonly Transition[] = buildTransitions();

/** Index: `${from}->${to}` -> Transition, for O(1) lookup. */
const TRANSITION_INDEX: ReadonlyMap<string, Transition> = new Map(
  TRANSITIONS.map((t) => [`${t.from}->${t.to}`, t]),
);

const key = (from: OrderStatus, to: OrderStatus) => `${from}->${to}`;

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** All statuses reachable from `from` in one step. */
export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

/** Is `from -> to` a defined transition, regardless of role? */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITION_INDEX.has(key(from, to));
}

/** Which roles may trigger `from -> to`. Empty if the transition is undefined. */
export function whoMayTrigger(from: OrderStatus, to: OrderStatus): readonly Role[] {
  return TRANSITION_INDEX.get(key(from, to))?.roles ?? [];
}

/** Does `from -> to` commit money / an approval / a customs submission? */
export function requiresHuman(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITION_INDEX.get(key(from, to))?.requiresHuman ?? false;
}

export type TransitionErrorCode = "ILLEGAL_TRANSITION" | "ROLE_NOT_PERMITTED";

export class TransitionError extends Error {
  readonly code: TransitionErrorCode;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly role: Role;

  constructor(code: TransitionErrorCode, from: OrderStatus, to: OrderStatus, role: Role) {
    super(
      code === "ILLEGAL_TRANSITION"
        ? `Illegal order status transition: ${from} -> ${to}`
        : `Role "${role}" may not trigger ${from} -> ${to}`,
    );
    this.name = "TransitionError";
    this.code = code;
    this.from = from;
    this.to = to;
    this.role = role;
  }
}

export interface TransitionResult {
  from: OrderStatus;
  to: OrderStatus;
  role: Role;
  requiresHuman: boolean;
}

/**
 * Validate and perform a status transition. Returns the new status on success,
 * or throws TransitionError. This is the single entry point callers must use;
 * never write `orders.status` directly (CLAUDE.md rule 3).
 */
export function transition(current: OrderStatus, to: OrderStatus, role: Role): TransitionResult {
  const t = TRANSITION_INDEX.get(key(current, to));
  if (!t) {
    throw new TransitionError("ILLEGAL_TRANSITION", current, to, role);
  }
  if (!t.roles.includes(role)) {
    throw new TransitionError("ROLE_NOT_PERMITTED", current, to, role);
  }
  return {
    from: current,
    to,
    role,
    requiresHuman: t.requiresHuman ?? false,
  };
}

/** Non-throwing variant: true iff `role` may move `current -> to`. */
export function assertCanTransition(current: OrderStatus, to: OrderStatus, role: Role): boolean {
  try {
    transition(current, to, role);
    return true;
  } catch {
    return false;
  }
}
