import { z } from "zod";
import { ORDER_STATUSES, ROLES } from "./statusMachine";

/**
 * Zod schemas for the core domain objects touched in Phase 0. These are the contract
 * between the database, the API and the UI. AI outputs that change data get their own
 * schemas inside each agent folder (CLAUDE.md rule 4); these are the human/data-plane shapes.
 */

export const uuid = z.string().uuid();
export const timestamp = z.string().datetime();

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const roleSchema = z.enum(ROLES);

/** Supported markets at launch. */
export const COUNTRIES = ["SZ", "ZA"] as const; // Eswatini, South Africa
export const countrySchema = z.enum(COUNTRIES);

export const CURRENCIES = ["SZL", "ZAR", "USD", "CNY", "THB"] as const;
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;

export const organisationSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  country: countrySchema,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Organisation = z.infer<typeof organisationSchema>;

export const userRoleSchema = z.enum(["ops_admin", "importer_admin", "importer_member"]);

export const userSchema = z.object({
  id: uuid,
  orgId: uuid,
  email: z.string().email(),
  fullName: z.string().min(1).nullable(),
  role: userRoleSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type User = z.infer<typeof userSchema>;

export const buyerSchema = z.object({
  id: uuid,
  orgId: uuid,
  name: z.string().min(1),
  phone: z.string().min(1).nullable(),
  whatsapp: z.string().min(1).nullable(),
  country: countrySchema,
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Buyer = z.infer<typeof buyerSchema>;

export const vehicleSchema = z.object({
  id: uuid,
  make: z.string().min(1),
  model: z.string().min(1),
  /** e.g. "2005-2015" */
  yearRange: z.string().min(1).nullable(),
  engine: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Vehicle = z.infer<typeof vehicleSchema>;

export const orderSchema = z.object({
  id: uuid,
  orgId: uuid,
  buyerId: uuid.nullable(),
  reference: z.string().min(1),
  status: orderStatusSchema,
  summary: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export type Order = z.infer<typeof orderSchema>;

/** Payload accepted by the "create order" action. */
export const createOrderInputSchema = z.object({
  orgId: uuid,
  buyerId: uuid.nullable().optional(),
  summary: z.string().max(2000).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

/** Payload accepted by the "change status" action (validated again by the status machine). */
export const changeStatusInputSchema = z.object({
  orderId: uuid,
  to: orderStatusSchema,
  role: roleSchema,
  note: z.string().max(2000).optional(),
});
export type ChangeStatusInput = z.infer<typeof changeStatusInputSchema>;

/**
 * Parse `data` with `schema`, allowing exactly one retry hook before falling back to a
 * human queue (CLAUDE.md rule 4). The retry transform is where an agent re-asks the model;
 * in the data plane it is usually absent and an invalid payload simply fails.
 */
export function parseOrQueue<T>(
  schema: z.ZodType<T>,
  data: unknown,
  onRetry?: (issues: z.ZodIssue[]) => unknown,
): { ok: true; value: T } | { ok: false; issues: z.ZodIssue[] } {
  const first = schema.safeParse(data);
  if (first.success) return { ok: true, value: first.data };
  if (onRetry) {
    const retried = schema.safeParse(onRetry(first.error.issues));
    if (retried.success) return { ok: true, value: retried.data };
    return { ok: false, issues: retried.error.issues };
  }
  return { ok: false, issues: first.error.issues };
}
