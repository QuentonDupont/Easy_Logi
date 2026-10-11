import { MoneyError } from "./money";

/**
 * Allocate an integer `total` across buckets in proportion to `weights`, using the
 * largest-remainder method so the parts sum EXACTLY to `total` (no lost or invented cents).
 *
 * Used to split a shared cost (consolidated freight, a duty line, clearing fees) across the
 * order lines in a shipment, either by value share or by volume share.
 */
export function allocateProportional(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total)) throw new MoneyError("total must be an integer (minor units)");
  if (weights.length === 0) throw new MoneyError("weights must not be empty");
  if (weights.some((w) => w < 0 || !Number.isFinite(w))) {
    throw new MoneyError("weights must be non-negative and finite");
  }

  const weightTotal = weights.reduce((a, b) => a + b, 0);

  // Degenerate: all weights zero -> split as evenly as possible by largest remainder on 1s.
  const effective = weightTotal === 0 ? weights.map(() => 1) : weights;
  const effTotal = effective.reduce((a, b) => a + b, 0);

  const exact = effective.map((w) => (total * w) / effTotal);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((a, b) => a + b, 0);

  // Distribute the leftover units to the buckets with the largest fractional parts.
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floors];
  let k = 0;
  while (remainder > 0) {
    const idx = order[k % order.length]!.i;
    result[idx] = result[idx]! + 1;
    remainder--;
    k++;
  }
  // Handle the rare negative-remainder case (total < sum of floors is impossible for
  // non-negative inputs, but guard anyway).
  while (remainder < 0) {
    const idx = order[order.length - 1 - (k % order.length)]!.i;
    if (result[idx]! > 0) {
      result[idx] = result[idx]! - 1;
      remainder++;
    }
    k++;
  }

  return result;
}
