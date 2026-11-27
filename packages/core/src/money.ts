/**
 * Money helpers. Amounts are integer centavos (1 peso = 100 centavos) so no
 * monetary value is ever held as a binary float between calculations.
 */

/** Integer centavos. */
export type Centavos = number;

/**
 * Converts a peso amount (as typed or seeded, e.g. 150000 or 250000.5) to
 * integer centavos, rounding half away from zero to the nearest centavo.
 * Throws on NaN, infinities and negative amounts.
 */
export function toCentavos(pesos: number): Centavos {
  if (!Number.isFinite(pesos)) throw new RangeError(`Not a finite amount: ${pesos}`);
  if (pesos < 0) throw new RangeError(`Amount cannot be negative: ${pesos}`);
  // Round the scaled value to 15 significant digits first, which removes the
  // binary representation error (1.005 * 100 = 100.49999…), then to the centavo.
  return Math.round(Number((pesos * 100).toPrecision(15)));
}

/** Converts integer centavos back to pesos, for display maths only. */
export function fromCentavos(centavos: Centavos): number {
  if (!Number.isInteger(centavos)) throw new RangeError(`Centavos must be an integer: ${centavos}`);
  return centavos / 100;
}

export type FormatPesoOptions = {
  /** Fraction digits to show: 0 (default) or 2. */
  decimals?: 0 | 2;
};

const formatters = {
  0: new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  2: new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
} as const;

/**
 * Formats centavos as pesos with a ₱ sign and thousands separators, e.g.
 * `formatPeso(15000000)` → "₱150,000" and `formatPeso(770667, { decimals: 2 })`
 * → "₱7,706.67". Whole-peso output rounds half away from zero.
 */
export function formatPeso(centavos: Centavos, options: FormatPesoOptions = {}): string {
  const decimals = options.decimals ?? 0;
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const value = decimals === 0 ? Math.round(abs / 100) : abs / 100;
  return `${sign}₱${formatters[decimals].format(value)}`;
}
