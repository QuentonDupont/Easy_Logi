import { z } from "zod";

/**
 * Event names. Agents are triggered by an event row (via pgmq) and emit an event row;
 * services/workflows decides what runs next (CLAUDE.md "Agent rules"). Phase 0 only needs
 * the plumbing and the lifecycle events; agent trigger events are listed here for Phase 1+
 * so the registry is in one place. Keep names in `<subject>.<verb>` form.
 */
export const EVENT_NAMES = [
  // --- lifecycle (Phase 0) ---
  "order.created",
  "order.status_changed",
  // --- fitment engine (Phase 1) ---
  "message.received",
  "request.created",
  "request.photo_added",
  "candidates.retrieved",
  "match.low_confidence",
  // --- sourcing + supplier-comms (Phase 2) ---
  "rfq.created",
  "supplier_message.unlinked",
  "supplier_message.linked",
  "supplier_message.quote",
  "event.needs_reply",
  // --- customs / docs (Phase 3) ---
  "order_line.awarded",
  "document.uploaded",
  // --- QC / claims (Phase 4) ---
  "qc_photos.received",
  "claim.opened",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const eventNameSchema = z.enum(EVENT_NAMES);

/**
 * The envelope every event row carries. `payload` is event-specific and validated by the
 * consumer against its own zod schema — never trusted blindly.
 */
export const eventEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  name: eventNameSchema,
  orgId: z.string().uuid(),
  /** The order this event concerns, when applicable. */
  orderId: z.string().uuid().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
  /** Idempotency key so duplicate deliveries collapse to one effect. */
  dedupeKey: z.string().min(1).max(200).optional(),
  createdAt: z.string().datetime().optional(),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/** Build a well-formed event envelope (does not persist it). */
export function makeEvent(input: {
  name: EventName;
  orgId: string;
  orderId?: string | null;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
}): EventEnvelope {
  return eventEnvelopeSchema.parse({
    name: input.name,
    orgId: input.orgId,
    orderId: input.orderId ?? null,
    payload: input.payload ?? {},
    dedupeKey: input.dedupeKey,
  });
}
