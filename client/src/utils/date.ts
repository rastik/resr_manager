/**
 * Format a date string or timestamp to DD.MM.YYYY
 * Handles ISO strings with timestamps (e.g. 2024-09-18T22:00:00.000Z)
 * and plain dates (e.g. 2024-09-19) consistently.
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const str = String(dateStr).trim();
  if (!str) return '—';

  // If already in DD.MM.YYYY format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    return str;
  }

  // If ISO string with timezone or time (e.g. 2024-09-18T22:00:00.000Z)
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    }
  }

  // If standard YYYY-MM-DD
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }

  // Fallback to Date object parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  return str;
}

/**
 * Check if a lease end date has already passed (is before today).
 */
export function isLeaseExpired(endDate?: string | null): boolean {
  if (!endDate) return false;
  const str = String(endDate).trim();
  if (!str) return false;
  const cleanEnd = str.includes('T') ? str.split('T')[0] : str;
  let ymd = cleanEnd;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleanEnd)) {
    const [d, m, y] = cleanEnd.split('.');
    ymd = `${y}-${m}-${d}`;
  }
  const today = new Date().toISOString().split('T')[0];
  return ymd < today;
}

/**
 * Determine the effective status of a lease:
 * If the lease end date has passed today, status is 'expired' ('Neaktívna').
 */
export function getEffectiveLeaseStatus(lease?: { status?: string; endDate?: string | null } | null): 'active' | 'expired' | 'draft' {
  if (!lease) return 'draft';
  if (lease.status === 'draft') return 'draft';
  if (isLeaseExpired(lease.endDate)) {
    return 'expired';
  }
  return (lease.status as any) || 'active';
}
