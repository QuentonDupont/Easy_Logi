import { type Money, type Currency, fromMinor, roundHalfAwayFromZero, MoneyError } from "./money";

/**
 * An FX rate as it is stored in `rates_rules`: how many units of `to` you get for one unit
 * of `from`. Rates are NEVER hard-coded in code (CLAUDE.md rule 5) — callers must pass a rate
 * that was read from `rates_rules`, carrying its source + effective date.
 */
export interface FxRate {
  from: Currency;
  to: Currency;
  /** Units of `to` per 1 unit of `from`. */
  rate: number;
  source: string;
  effectiveDate: string; // ISO date
}

export function convert(amount: Money, target: Currency, fx: FxRate): Money {
  if (amount.currency !== fx.from) {
    throw new MoneyError(
      `FX rate is ${fx.from}->${fx.to} but amount is ${amount.currency}`,
    );
  }
  if (fx.to !== target) {
    throw new MoneyError(`FX rate target ${fx.to} does not match requested ${target}`);
  }
  if (!(fx.rate > 0) || !Number.isFinite(fx.rate)) {
    throw new MoneyError("FX rate must be a positive finite number");
  }
  if (amount.currency === target) return amount;
  return fromMinor(roundHalfAwayFromZero(amount.minor * fx.rate), target);
}
