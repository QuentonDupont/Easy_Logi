/**
 * Magic-link token service (pure crypto — no persistence, no network).
 *
 * A token is a signed, self-describing, expiring credential scoped to exactly one order and one
 * page type (buyer quote, tracking, supplier quote, clearing pack). The raw token is given out in
 * a URL; only its SHA-256 hash is ever stored, so a leaked database cannot mint links. Single-use
 * is enforced by the caller (mark the stored row used on redemption) — this module provides issue
 * + stateless verification (signature, expiry, scope).
 *
 * Server-only: imports `node:crypto`. Import it as `@easy-logi/shared/magicLink`, never from the
 * package barrel, so it never reaches a browser bundle.
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MAGIC_LINK_PAGE_TYPES = [
  "buyer_quote",
  "tracking",
  "supplier_quote",
  "clearing_pack",
] as const;
export type MagicLinkPageType = (typeof MAGIC_LINK_PAGE_TYPES)[number];

interface TokenPayload {
  v: 1;
  /** order id the token is scoped to */
  oid: string;
  /** page type the token is scoped to */
  pt: MagicLinkPageType;
  /** expiry, epoch seconds */
  exp: number;
  /** random nonce so two tokens for the same scope differ */
  n: string;
}

export interface IssuedToken {
  /** The raw token to put in the URL. Never store this — store `tokenHash`. */
  token: string;
  /** SHA-256 hex of the token; the value to persist and look up by. */
  tokenHash: string;
  /** ISO expiry, for the stored row. */
  expiresAt: string;
  pageType: MagicLinkPageType;
  orderId: string;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload; tokenHash: string }
  | { ok: false; reason: VerifyFailure; tokenHash: string };

export type VerifyFailure =
  | "malformed"
  | "bad_signature"
  | "unsupported_version"
  | "expired"
  | "wrong_order"
  | "wrong_page";

function b64url(data: string | Buffer): string {
  return Buffer.from(data).toString("base64url");
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** SHA-256 hex of the raw token — the only form that is ever stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssueOptions {
  orderId: string;
  pageType: MagicLinkPageType;
  ttlSeconds: number;
  secret: string;
  /** injectable clock (ms) for tests */
  now?: number;
}

export function issueToken(opts: IssueOptions): IssuedToken {
  if (!opts.secret) throw new Error("magicLink: a signing secret is required");
  const nowMs = opts.now ?? Date.now();
  const exp = Math.floor(nowMs / 1000) + Math.max(1, Math.floor(opts.ttlSeconds));
  const payload: TokenPayload = {
    v: 1,
    oid: opts.orderId,
    pt: opts.pageType,
    exp,
    n: randomBytes(12).toString("hex"),
  };
  const body = b64url(JSON.stringify(payload));
  const token = `${body}.${sign(opts.secret, body)}`;
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(exp * 1000).toISOString(),
    pageType: opts.pageType,
    orderId: opts.orderId,
  };
}

export interface VerifyOptions {
  secret: string;
  /** when given, the token's scope must match */
  orderId?: string;
  pageType?: MagicLinkPageType;
  now?: number;
}

/** Stateless verification: signature, version, expiry, and (optionally) scope. */
export function verifyToken(token: string, opts: VerifyOptions): VerifyResult {
  const tokenHash = hashToken(token);
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed", tokenHash };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(opts.secret, body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "bad_signature", tokenHash };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed", tokenHash };
  }
  if (payload.v !== 1) return { ok: false, reason: "unsupported_version", tokenHash };

  const nowSec = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp < nowSec) {
    return { ok: false, reason: "expired", tokenHash };
  }
  if (opts.orderId && payload.oid !== opts.orderId) return { ok: false, reason: "wrong_order", tokenHash };
  if (opts.pageType && payload.pt !== opts.pageType) return { ok: false, reason: "wrong_page", tokenHash };

  return { ok: true, payload, tokenHash };
}
