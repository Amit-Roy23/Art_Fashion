/**
 * BMS Weight Management System
 * All weights in DB are stored as INTEGER MILLIGRAMS (mg).
 * Display weights in Grams (g) formatted with exactly 3 decimal places (e.g. 12.345 g).
 */

/**
 * Converts milligrams (integer) to grams (float)
 */
export function mgToGrams(mg: number | null | undefined): number {
  if (mg === null || mg === undefined || isNaN(mg)) return 0;
  return mg / 1000;
}

/**
 * Converts grams (float/string) to milligrams (integer rounded)
 */
export function gramsToMg(grams: number | string | null | undefined): number {
  if (grams === null || grams === undefined || grams === "") return 0;
  const num = typeof grams === "string" ? parseFloat(grams) : grams;
  if (isNaN(num)) return 0;
  return Math.round(num * 1000);
}

/**
 * Formats milligrams into readable grams string with unit: e.g. "12.345 g"
 */
export function formatWeight(
  mg: number | null | undefined,
  includeUnit: boolean = true
): string {
  if (mg === null || mg === undefined || isNaN(mg)) {
    return includeUnit ? "0.000 g" : "0.000";
  }
  const grams = mg / 1000;
  const formatted = grams.toFixed(3);
  return includeUnit ? `${formatted} g` : formatted;
}

/**
 * Computes weight difference in milligrams and percentage
 * differenceMg = actualMg - baselineMg
 * A negative diff means a weight loss; a positive diff means weight gain.
 */
export function computeWeightDiff(
  baselineMg: number | null | undefined,
  actualMg: number | null | undefined
): {
  diffMg: number;
  diffPercent: number;
  isLoss: boolean;
  isGain: boolean;
  formattedDiff: string;
} {
  const base = baselineMg || 0;
  const act = actualMg || 0;
  const diffMg = act - base;
  const diffPercent = base > 0 ? (Math.abs(diffMg) / base) * 100 : 0;

  const sign = diffMg > 0 ? "+" : diffMg < 0 ? "-" : "";
  const absGrams = (Math.abs(diffMg) / 1000).toFixed(3);

  return {
    diffMg,
    diffPercent: Number(diffPercent.toFixed(2)),
    isLoss: diffMg < 0,
    isGain: diffMg > 0,
    formattedDiff: `${sign}${absGrams} g (${diffPercent.toFixed(2)}%)`,
  };
}

/**
 * Checks if a weight variance exceeds the allowed tolerance (default 0.5%).
 * Accepts either:
 * - isOverTolerance(diffPercent, tolerancePercent)
 * - isOverTolerance(baselineMg, actualMg, tolerancePercent)
 */
export function isOverTolerance(
  first: number,
  second?: number,
  third?: number
): boolean {
  if (third !== undefined) {
    // Called as (baselineMg, actualMg, tolerancePercent)
    const diff = computeWeightDiff(first, second);
    return diff.diffPercent > third;
  }
  // Called as (diffPercent, tolerancePercent)
  const diffPercent = first;
  const tolerancePercent = second ?? 0.5;
  return Math.abs(diffPercent) > tolerancePercent;
}
