/**
 * Demo users for the local mock backend — one per side of the platform. Kept dependency-free so
 * the (client) login page can import it without pulling in the mock store.
 */
export const INDIVIDUAL_ORG_ID = "00000000-0000-0000-0000-0000000000b1";
/** Easy Logi's own organisation — staff live here, never inside a customer's account. */
export const STAFF_ORG_ID = "00000000-0000-0000-0000-0000000000e1";
/** Easy Logi staff (ops admin). */
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000011";
export const DEMO_USER_EMAIL = "demo@easylogi.local";
/** A business account user (importer admin at Swazi Parts Co). */
export const BUSINESS_USER_ID = "00000000-0000-0000-0000-000000000021";
/** An individual buying for themselves. */
export const INDIVIDUAL_USER_ID = "00000000-0000-0000-0000-000000000031";

export const DEMO_LOGINS = [
  { userId: BUSINESS_USER_ID, kind: "business", name: "Sipho Nkosi", org: "Swazi Parts Co (Pty) Ltd", email: "sipho@swaziparts.local" },
  { userId: INDIVIDUAL_USER_ID, kind: "individual", name: "Thandi Dlamini", org: "Personal account", email: "thandi@example.local" },
  { userId: DEMO_USER_ID, kind: "staff", name: "Demo Ops Admin", org: "Easy Logi", email: DEMO_USER_EMAIL },
] as const;
