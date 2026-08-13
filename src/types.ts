export type DateRangeType = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  type: DateRangeType;
  since?: string; // YYYY-MM-DD
  until?: string; // YYYY-MM-DD
}

export type MetricGroup = 'Performance' | 'Leads & Conversions' | 'Engagement & Video';

export interface MetricDefinition {
  key: string;
  label: string;
  group: MetricGroup;
  tooltip: string;
  format: 'currency' | 'number' | 'percent' | 'ratio';
  insightField?: string;
}

export interface MetricView {
  id?: string;
  scope: 'overview' | 'campaigns';
  name: string;
  metrics: string[];
  is_default?: boolean;
}

export interface MetaLead {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  field_data?: Array<{ name: string; values: string[] }>;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  form_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  form_name?: string;
  sheet_name?: string;
  created_time: string;
  synced_at?: string;
  source?: string;
}

export interface MetaForm {
  id: string;
  name: string;
  page_id?: string;
  lead_count?: number;
  updated_at?: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  insights?: Record<string, number | string>;
  adsets?: MetaAdSet[];
}

export interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: Record<string, number | string>;
  ads?: MetaAd[];
}

export interface MetaAd {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status: string;
  insights?: Record<string, number | string>;
}

export interface OverviewKPI {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  deltaPercent?: number;
  format: 'currency' | 'number' | 'percent' | 'ratio';
}

export interface TimeSeriesPoint {
  date: string;
  spend: number;
  leads: number;
  impressions?: number;
  clicks?: number;
  [key: string]: string | number | undefined;
}

export interface BreakdownData {
  dimension: string; // publisher_platform, age, gender, region, device_platform
  items: Array<{
    name: string;
    spend: number;
    leads: number;
    impressions: number;
    clicks: number;
  }>;
}

export interface ConnectionSettings {
  adAccountId: string;
  pageId: string;
  webhookUrl: string;
  verifyToken: string;
  hasToken: boolean;
  hasSupabase: boolean;
  appUrl: string;
}

export interface TestConnectionResult {
  success: boolean;
  accountName?: string;
  currency?: string;
  accountStatus?: number | string;
  businessName?: string;
  error?: string;
}
