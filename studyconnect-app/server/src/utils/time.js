export function nowIso() {
  return new Date().toISOString();
}

export function withinLastDays(isoDate, days) {
  const date = new Date(isoDate).getTime();
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return date >= limit;
}
