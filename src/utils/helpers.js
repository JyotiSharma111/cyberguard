/**
 * Shared utility functions with defensive guards on every operation.
 */

/** Map severity string → CSS color variable */
export function sevColor(sev) {
  const map = { critical: 'var(--re)', crit: 'var(--re)', high: 'var(--am)', medium: 'var(--bl)', low: 'var(--t3)', ok: 'var(--gr)' }
  return map[sev?.toLowerCase()] ?? 'var(--t3)'
}

/** Map score number → color variable */
export function scoreColor(n) {
  if (typeof n !== 'number' || isNaN(n)) return 'var(--t3)'
  if (n >= 80) return 'var(--gr)'
  if (n >= 60) return 'var(--am)'
  return 'var(--re)'
}

/** Map overall score → letter grade */
export function scoreGrade(n) {
  if (typeof n !== 'number' || isNaN(n)) return '?'
  if (n >= 900) return 'A'
  if (n >= 750) return 'B+'
  if (n >= 600) return 'C'
  if (n >= 400) return 'D'
  return 'F'
}

/** Map status string → chip style class suffix */
export function statusChip(status) {
  const map = { ok: 'ok', active: 'ok', contained: 'ok', warn: 'warn', reviewing: 'warn', crit: 'bad', critical: 'bad', bad: 'bad', open: 'bad', fixed: 'ok', resolved: 'ok' }
  return map[status?.toLowerCase()] ?? 'info'
}

/** Clamp a number to [min, max] */
export function clamp(val, min, max) {
  if (typeof val !== 'number' || isNaN(val)) return min
  return Math.min(max, Math.max(min, val))
}

/** Format a number as percentage string */
export function pct(n) {
  const v = clamp(typeof n === 'number' ? n : 0, 0, 100)
  return `${Math.round(v)}%`
}

/** Safe array guard — always returns an array */
export function safeArr(v) {
  return Array.isArray(v) ? v : []
}

/** Truncate string to maxLen with ellipsis */
export function trunc(str, maxLen = 60) {
  if (typeof str !== 'string') return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}
