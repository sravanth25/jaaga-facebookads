/**
 * Sample data service - deprecated and cleared.
 * All data is now fetched live from Meta Marketing API (Graph API v25.0).
 */

export function generateSampleTimeSeries() {
  return [];
}

export function generateSampleOverview(sinceStr: string, untilStr: string, requestedMetrics: string[], warningMessage?: string) {
  return {
    kpis: requestedMetrics.map(key => ({ key, label: key, value: 0, format: 'number' })),
    timeSeries: [],
    topCampaigns: [],
    warning: warningMessage,
  };
}

export function generateSampleCampaigns() {
  return [];
}

export function generateSampleBreakdown() {
  return [];
}
