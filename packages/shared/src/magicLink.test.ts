import { describe, it, expect } from "vitest";
import { issueToken, verifyToken, hashToken } from "./magicLink";

const SECRET = "test-secret-key";
const ORDER = "11111111-1111-1111-1111-111111111101";

describe("magicLink", () => {
  it("issues a token that verifies within its scope and ttl", () => {
    const issued = issueToken({ orderId: ORDER, pageType: "tracking", ttlSeconds: 3600, secret: SECRET });
    expect(issued.token).toContain(".");
    expect(issued.tokenHash).toBe(hashToken(issued.token));
    const r = verifyToken(issued.token, { secret: SECRET, orderId: ORDER, pageType: "tracking" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.oid).toBe(ORDER);
      expect(r.payload.pt).toBe("tracking");
      expect(r.tokenHash).toBe(issued.tokenHash);
    }
  });

  it("stores only a hash — the raw token is not recoverable from tokenHash", () => {
    const issued = issueToken({ orderId: ORDER, pageType: "tracking", ttlSeconds: 60, secret: SECRET });
    expect(issued.tokenHash).not.toContain(issued.token);
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects an expired token", () => {
    const past = Date.now() - 10_000;
    const issued = issueToken({ orderId: ORDER, pageType: "tracking", ttlSeconds: 1, secret: SECRET, now: past });
    const r = verifyToken(issued.token, { secret: SECRET, now: Date.now() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("rejects a tampered body or signature", () => {
    const issued = issueToken({ orderId: ORDER, pageType: "tracking", ttlSeconds: 60, secret: SECRET });
    const [body, sig] = issued.token.split(".");
    expect(verifyToken(`${body}.${sig}x`, { secret: SECRET }).ok).toBe(false);
    expect(verifyToken(`${body}X.${sig}`, { secret: SECRET }).ok).toBe(false);
    const other = verifyToken(issued.token, { secret: "different-secret" });
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.reason).toBe("bad_signature");
  });

  it("rejects a token used for the wrong order or page", () => {
    const issued = issueToken({ orderId: ORDER, pageType: "buyer_quote", ttlSeconds: 60, secret: SECRET });
    const wrongOrder = verifyToken(issued.token, { secret: SECRET, orderId: "00000000-0000-0000-0000-000000000000" });
    expect(wrongOrder.ok).toBe(false);
    if (!wrongOrder.ok) expect(wrongOrder.reason).toBe("wrong_order");
    const wrongPage = verifyToken(issued.token, { secret: SECRET, pageType: "clearing_pack" });
    expect(wrongPage.ok).toBe(false);
    if (!wrongPage.ok) expect(wrongPage.reason).toBe("wrong_page");
  });

  it("rejects a malformed token", () => {
    expect(verifyToken("not-a-token", { secret: SECRET }).ok).toBe(false);
    expect(verifyToken("", { secret: SECRET }).ok).toBe(false);
    expect(verifyToken(".sig", { secret: SECRET }).ok).toBe(false);
  });
});
