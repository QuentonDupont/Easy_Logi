import { ACTIVE_STATUSES, type AccountTypeEnum, type OrderStatus } from "@easy-logi/shared";
import { statusDocs, type UploadRequirement } from "./requirements";

/**
 * The order backbone for gating: every active status, then `closed` as the end of the line.
 * Out-of-band states (on_hold, disputed) and `cancelled` sit outside it.
 */
const BACKBONE: readonly OrderStatus[] = [...ACTIVE_STATUSES, "closed"];

const pos = (s: OrderStatus) => BACKBONE.indexOf(s);

/**
 * The backbone status an order is really "at". For an order on hold or in dispute this is the
 * status it was paused from (`resumeFrom`), so resuming can't skip that status's documents. If
 * the paused-from status is unknown we assume the start of the backbone (fail closed).
 */
export function effectiveStatus(current: OrderStatus, resumeFrom?: OrderStatus | null): OrderStatus {
  if (pos(current) >= 0) return current;
  if (resumeFrom && pos(resumeFrom) >= 0) return resumeFrom;
  return "requested";
}

/**
 * Where an on-hold / disputed order was paused from: walk the status history newest-first and take
 * the first change that LEFT a backbone status (handles chains like quoted → on_hold → disputed).
 */
export function resumeFromHistory(
  historyNewestFirst: ReadonlyArray<{ from_status: string; to_status: string }>,
): OrderStatus | null {
  const row = historyNewestFirst.find((h) => pos(h.from_status as OrderStatus) >= 0);
  return row ? (row.from_status as OrderStatus) : null;
}

/**
 * A forward move along the backbone (from the effective status). Forward moves are document-gated —
 * including resuming a paused order to a later status and closing early. Putting an order on hold,
 * disputing, cancelling, reopening or resuming to the same status never is.
 */
export function isForwardMove(from: OrderStatus, to: OrderStatus, resumeFrom?: OrderStatus | null): boolean {
  const i = pos(effectiveStatus(from, resumeFrom));
  const j = pos(to);
  return j >= 0 && j > i;
}

export interface ChecklistItem extends UploadRequirement {
  present: boolean;
}

/** One status's upload checklist, with which documents are already on file. */
export function checklist(
  status: OrderStatus,
  accountType: AccountTypeEnum,
  uploadedKeys: ReadonlySet<string>,
): ChecklistItem[] {
  return statusDocs(status, accountType).uploads.map((u) => ({ ...u, present: uploadedKeys.has(u.key) }));
}

/**
 * Every REQUIRED upload a move needs: the required documents of each backbone status from the
 * effective status up to (not including) the target, de-duplicated by key. For a normal one-step
 * move that is just the current status's documents.
 */
export function requiredForMove(
  from: OrderStatus,
  to: OrderStatus,
  accountType: AccountTypeEnum,
  resumeFrom?: OrderStatus | null,
): UploadRequirement[] {
  if (!isForwardMove(from, to, resumeFrom)) return [];
  const i = pos(effectiveStatus(from, resumeFrom));
  const j = pos(to);
  const seen = new Map<string, UploadRequirement>();
  for (const s of BACKBONE.slice(i, j)) {
    if (s === "closed") continue;
    for (const u of statusDocs(s, accountType).uploads) if (u.required && !seen.has(u.key)) seen.set(u.key, u);
  }
  return [...seen.values()];
}

/** Required documents for leaving `status` that are not on file yet. */
export function missingRequired(
  status: OrderStatus,
  accountType: AccountTypeEnum,
  uploadedKeys: ReadonlySet<string>,
): UploadRequirement[] {
  return statusDocs(status, accountType).uploads.filter((u) => u.required && !uploadedKeys.has(u.key));
}

export interface GateResult {
  allowed: boolean;
  gated: boolean;
  missing: UploadRequirement[];
  overridden: boolean;
}

/**
 * Decide whether an order may move from → to on documents alone (the status machine separately
 * decides whether the move itself is legal). Hard gate: a forward move needs every required
 * document between the effective status and the target. Only ops may override, with a reason.
 */
export function gateTransition(input: {
  from: OrderStatus;
  to: OrderStatus;
  accountType: AccountTypeEnum;
  uploadedKeys: ReadonlySet<string>;
  isOps: boolean;
  overrideReason?: string;
  /** For an on-hold / disputed order: the backbone status it was paused from. */
  resumeFrom?: OrderStatus | null;
}): GateResult {
  const gated = isForwardMove(input.from, input.to, input.resumeFrom);
  if (!gated) return { allowed: true, gated, missing: [], overridden: false };

  const missing = requiredForMove(input.from, input.to, input.accountType, input.resumeFrom).filter(
    (u) => !input.uploadedKeys.has(u.key),
  );
  if (missing.length === 0) return { allowed: true, gated, missing, overridden: false };

  const reason = input.overrideReason?.trim() ?? "";
  if (input.isOps && reason.length >= 5) return { allowed: true, gated, missing, overridden: true };
  return { allowed: false, gated, missing, overridden: false };
}

/** A specific, fixable message for a blocked move. */
export function blockedMessage(missing: UploadRequirement[]): string {
  return `Can't move on yet — still missing: ${missing.map((m) => m.label).join("; ")}.`;
}
