/**
 * Format currency in Indian Rupees (INR)
 * e.g., 123456 -> ₹1,23,456 or ₹1,23,456.00
 */
export function formatINR(val: number, compact = false, showDecimals = true): string {
  if (isNaN(val) || val === null || val === undefined) return '₹0';

  if (compact && Math.abs(val) >= 1000) {
    return '₹' + formatCompactNumber(val);
  }

  // Format using Indian numbering system
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? (val % 1 !== 0 ? 2 : 0) : 0,
    minimumFractionDigits: 0,
  });

  return formatter.format(val);
}

/**
 * Format numbers in compact format (1.2K, 3.4M, 1.5Cr)
 */
export function formatCompactNumber(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  const absVal = Math.abs(val);

  if (absVal >= 10000000) {
    return (val / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  }
  if (absVal >= 100000) {
    return (val / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  }
  if (absVal >= 1000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return val.toLocaleString('en-IN');
}

/**
 * Standard number formatting with commas
 */
export function formatNumber(val: number, decimals = 0): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}

/**
 * Format percentages (e.g., 2.34%)
 */
export function formatPercent(val: number, decimals = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0%';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Format ratios (e.g., 1.45x)
 */
export function formatRatio(val: number, decimals = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00x';
  return `${val.toFixed(decimals)}x`;
}

/**
 * Format value based on metric type
 */
export function formatMetricValue(
  value: number,
  format: 'currency' | 'number' | 'percent' | 'ratio',
  compact = false
): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  switch (format) {
    case 'currency':
      return formatINR(value, compact);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'number':
    default:
      return compact ? formatCompactNumber(value) : formatNumber(value);
  }
}

/**
 * Format date for table display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Get date range bounds based on DateRange selection
 */
export function getDatePresetBounds(type: string, customSince?: string, customUntil?: string): { since: string; until: string } {
  const now = new Date();
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  const todayStr = formatDateStr(now);

  if (type === 'today') {
    return { since: todayStr, until: todayStr };
  }
  if (type === '7d') {
    const since = new Date(now);
    since.setDate(now.getDate() - 6);
    return { since: formatDateStr(since), until: todayStr };
  }
  if (type === '30d') {
    const since = new Date(now);
    since.setDate(now.getDate() - 29);
    return { since: formatDateStr(since), until: todayStr };
  }
  if (type === 'this_month') {
    const since = new Date(now.getFullYear(), now.getMonth(), 1);
    return { since: formatDateStr(since), until: todayStr };
  }
  if (type === 'last_month') {
    const since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const until = new Date(now.getFullYear(), now.getMonth(), 0);
    return { since: formatDateStr(since), until: formatDateStr(until) };
  }
  if (type === 'custom' && customSince && customUntil) {
    return { since: customSince, until: customUntil };
  }

  // Default to 30d
  const since = new Date(now);
  since.setDate(now.getDate() - 29);
  return { since: formatDateStr(since), until: todayStr };
}
