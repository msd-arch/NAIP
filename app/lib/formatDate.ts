/** Real dates in this project's data come in two raw shapes -- hazards.py's
    own detector output uses bare YYYYMMDD ("20260829"), while some newer
    real files (forecast_alerts.json) already use ISO YYYY-MM-DD. Neither is
    immediately readable as a date at a glance. This normalizes both to a
    single real, unambiguous YYYY/MM/DD display format, used everywhere a
    raw date string from the data would otherwise be shown as-is. */
export function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw.replaceAll("-", "/");
  }
  return raw;
}

/** Same real fix, applied inside a longer sentence (e.g. a Historical
    Events card's window text, "2021-11-01 to 2021-11-15 (15 real
    dates...)") rather than a standalone date field -- finds every embedded
    YYYY-MM-DD run and slashes it, leaving the surrounding real text
    untouched. */
export function formatDatesInText(text: string): string {
  return text.replace(/\d{4}-\d{2}-\d{2}/g, (m) => m.replaceAll("-", "/"));
}
