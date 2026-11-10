/**
 * Supply-side temperature efficiency in %, (supply − intake) / (extract − intake).
 * Null when an input is missing or the intake/extract difference is too small to be meaningful.
 */
export function computeEfficiency(
  intake: number | null,
  supply: number | null,
  extract: number | null,
  unit?: string,
): number | null {
  if (intake === null || supply === null || extract === null) return null;
  const span = extract - intake;
  const minSpan = unit === '°F' ? 1.8 : 1;
  if (Math.abs(span) < minSpan) return null;
  const pct = ((supply - intake) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
