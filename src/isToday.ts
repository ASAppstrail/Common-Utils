const pad = (n: number) => String(n).padStart(2, '0');

const toLocalYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns true if the given Salesforce value is today's date.
 *
 * Supports:
 *  - Date:     "2026-09-30"
 *  - DateTime: "2026-09-30T14:25:30.000+0000"
 *
 * Returns false for empty or invalid values.
 */
export function isToday(value?: string | null): boolean {
  if (!value) return false;

  const trimmed = value.trim();
  const todayYMD = toLocalYMD(new Date());

  // Date field: compare the strings directly (no time zone conversion)
  if (DATE_ONLY.test(trimmed)) {
    return trimmed === todayYMD;
  }

  // DateTime field: turn "+0000" into "+00:00" so every JS engine can parse it,
  // then compare using the device's local date
  const date = new Date(trimmed.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  if (Number.isNaN(date.getTime())) return false;

  return toLocalYMD(date) === todayYMD;
}