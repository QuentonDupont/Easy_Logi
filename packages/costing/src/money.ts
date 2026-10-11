import { CURRENCIES, type Currency } from "@easy-logi/shared";

export type { Currency };

/**
 * Money is stored as an integer number of minor units (e.g. cents) to avoid floating
 * point drift. All public costing results are Money, never bare floats.
 */
export interface Money {
  /** Integer minor units (cents). */
  readonly minor: number;
  readonly currency: Currency;
}

export class MoneyError extends Error {}

function assertCurrency(c: string): asserts c is Currency {
  if (!(CURRENCIES as readonly string[]).includes(c)) {
    throw new MoneyError(`Unknown currency: ${c}`);
  }
}

/** Round half away from zero to the nearest integer (banker-free, deterministic). */
export function roundHalfAwayFromZero(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

/** Build Money from a major-unit decimal (e.g. 100.5 ZAR -> 10050 cents). */
export function fromMajor(amount: number, currency: Currency): Money {
  assertCurrency(currency);
  if (!Number.isFinite(amount)) throw new MoneyError("Amount must be finite");
  return { minor: roundHalfAwayFromZero(amount * 100), currency };
}

/** Build Money directly from integer minor units. */
export function fromMinor(minor: number, currency: Currency): Money {
  assertCurrency(currency);
  if (!Number.isInteger(minor)) throw new MoneyError("Minor units must be an integer");
  return { minor, currency };
}

export function toMajor(m: Money): number {
  return m.minor / 100;
}

export const zero = (currency: Currency): Money => fromMinor(0, currency);

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function sum(items: Money[], currency: Currency): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

/** Multiply money by a plain (rate) factor, rounding to the nearest minor unit. */
export function scale(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) throw new MoneyError("Factor must be finite");
  return { minor: roundHalfAwayFromZero(m.minor * factor), currency: m.currency };
}

export function format(m: Money): string {
  const sign = m.minor < 0 ? "-" : "";
  const abs = Math.abs(m.minor);
  const major = Math.floor(abs / 100);
  const cents = (abs % 100).toString().padStart(2, "0");
  return `${sign}${m.currency} ${major}.${cents}`;
}
