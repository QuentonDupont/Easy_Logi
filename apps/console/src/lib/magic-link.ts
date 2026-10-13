/**
 * Server-side magic-link service: the pure token crypto (@easy-logi/shared/magicLink) wired to
 * persistence (the mock store here; the magic_link_tokens table later). Only the token hash is
 * stored, and redemption is single-use. Import only from server code.
 */
import {
  issueToken,
  verifyToken,
  hashToken,
  type MagicLinkPageType,
} from "@easy-logi/shared/magicLink";
import {
  insertMagicLinkToken,
  findMagicLinkToken,
  markMagicLinkTokenUsed,
} from "@/lib/mock/backend";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  // Dev fallback for the mock; set MAGIC_LINK_SECRET in any real environment.
  return process.env.MAGIC_LINK_SECRET || "dev-insecure-magic-link-secret-change-me";
}

export interface IssuedMagicLink {
  token: string;
  expiresAt: string;
}

export function issueMagicLink(input: {
  orgId: string;
  orderId: string;
  pageType: MagicLinkPageType;
  ttlSeconds?: number;
  createdBy?: string | null;
}): IssuedMagicLink {
  const issued = issueToken({
    orderId: input.orderId,
    pageType: input.pageType,
    ttlSeconds: input.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    secret: secret(),
  });
  insertMagicLinkToken({
    orgId: input.orgId,
    orderId: input.orderId,
    pageType: input.pageType,
    tokenHash: issued.tokenHash,
    expiresAt: issued.expiresAt,
    createdBy: input.createdBy ?? null,
  });
  return { token: issued.token, expiresAt: issued.expiresAt };
}

export type RedeemResult =
  | { ok: true; orderId: string; pageType: MagicLinkPageType }
  | { ok: false; reason: string };

/**
 * Verify a token (signature, expiry, optional scope), then burn it (single-use). The stored row's
 * scope must also match the signed payload as defence-in-depth.
 *
 * Always pass the known `scope` (the orderId + pageType of the page being opened): without it only
 * the signature and expiry are enforced, so a token minted for a different order/page would verify.
 */
export function redeemMagicLink(
  token: string,
  scope?: { orderId?: string; pageType?: MagicLinkPageType },
): RedeemResult {
  const v = verifyToken(token, { secret: secret(), orderId: scope?.orderId, pageType: scope?.pageType });
  if (!v.ok) return { ok: false, reason: v.reason };

  const row = findMagicLinkToken(v.tokenHash);
  if (!row) return { ok: false, reason: "unknown" };
  if (row.used_at) return { ok: false, reason: "already_used" };
  if (row.order_id !== v.payload.oid || row.page_type !== v.payload.pt) {
    return { ok: false, reason: "scope_mismatch" };
  }

  if (!markMagicLinkTokenUsed(v.tokenHash)) return { ok: false, reason: "already_used" };
  return { ok: true, orderId: v.payload.oid, pageType: v.payload.pt };
}

/**
 * Verify a token WITHOUT consuming it — for read-only pages a holder may open repeatedly (order
 * tracking). Checks signature, expiry, scope and that the row still exists; never marks it used.
 */
export function verifyMagicLink(
  token: string,
  scope?: { orderId?: string; pageType?: MagicLinkPageType },
): RedeemResult {
  const v = verifyToken(token, { secret: secret(), orderId: scope?.orderId, pageType: scope?.pageType });
  if (!v.ok) return { ok: false, reason: v.reason };
  const row = findMagicLinkToken(v.tokenHash);
  if (!row) return { ok: false, reason: "unknown" };
  if (row.order_id !== v.payload.oid || row.page_type !== v.payload.pt) {
    return { ok: false, reason: "scope_mismatch" };
  }
  return { ok: true, orderId: v.payload.oid, pageType: v.payload.pt };
}

/** Whether a token has already been consumed (for one-time pages like supplier quotes). */
export function isMagicLinkUsed(token: string): boolean {
  const row = findMagicLinkToken(hashToken(token));
  return Boolean(row?.used_at);
}
