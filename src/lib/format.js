/** Format a number to n significant figures, or an em dash if missing. */
export function fmt(v, sig = 3) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1e4) return Math.round(v).toLocaleString();
  return Number(v.toPrecision(sig)).toLocaleString();
}
