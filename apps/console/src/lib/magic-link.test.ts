import { describe, it, expect, beforeAll } from "vitest";
import { issueMagicLink, redeemMagicLink } from "./magic-link";

beforeAll(() => {
  process.env.MAGIC_LINK_SECRET = "test-secret-for-mock";
});

const ORG = "00000000-0000-0000-0000-0000000000a1";

describe("magic-link service (mock-backed, single-use)", () => {
  it("issues, redeems once, then rejects reuse", () => {
    const { token } = issueMagicLink({ orgId: ORG, orderId: "order-1", pageType: "tracking" });
    const first = redeemMagicLink(token, { orderId: "order-1", pageType: "tracking" });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.orderId).toBe("order-1");
      expect(first.pageType).toBe("tracking");
    }
    const second = redeemMagicLink(token, { orderId: "order-1", pageType: "tracking" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already_used");
  });

  it("rejects redemption for the wrong page type", () => {
    const { token } = issueMagicLink({ orgId: ORG, orderId: "order-2", pageType: "buyer_quote" });
    const r = redeemMagicLink(token, { orderId: "order-2", pageType: "clearing_pack" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_page");
  });

  it("rejects a token that was never issued", () => {
    const r = redeemMagicLink("bogus.token", {});
    expect(r.ok).toBe(false);
  });
});
