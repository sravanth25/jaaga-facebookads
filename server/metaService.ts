/**
 * Service to interface with Meta Marketing API (v25.0) and Lead Ads API
 */

const BASE_URL = 'https://graph.facebook.com/v25.0';

// Simple in-memory cache to handle rate limits & speed up repeated requests
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export function getMetaConfig() {
  const token = process.env.META_ACCESS_TOKEN || '';
  const adAccountId = (process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
  const pageId = process.env.META_PAGE_ID || '';
  const verifyToken = process.env.META_LEADGEN_VERIFY_TOKEN || '';

  return {
    token,
    adAccountId: adAccountId ? `act_${adAccountId}` : '',
    pageId,
    verifyToken,
    hasToken: Boolean(token && adAccountId),
  };
}

async function metaFetch(endpoint: string, params: Record<string, string> = {}, useCache = true): Promise<any> {
  const { token } = getMetaConfig();
  if (!token) {
    throw new Error('META_ACCESS_TOKEN environment variable is not configured.');
  }

  const searchParams = new URLSearchParams({
    access_token: token,
    ...params,
  });

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}?${searchParams.toString()}`;

  if (useCache && requestCache.has(url)) {
    const cached = requestCache.get(url)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error) {
    const err = json.error || {};
    let message = err.message || `Meta API Error ${res.status}`;
    if (err.code === 200) {
      const adAcc = getMetaConfig().adAccountId;
      message = `Meta Permission Error (#200): Ad account owner has NOT granted 'ads_read' or 'ads_management' permission for ${adAcc || 'the requested account'}. Please assign this Ad Account as an asset to your System User in Meta Business Manager and grant 'ads_read' permission.`;
    } else if (err.code === 100) {
      const pageId = getMetaConfig().pageId;
      message = `Meta Page ID Error (#100): The requested field or endpoint 'leadgen_forms' is invalid for ID '${pageId}'. Please ensure META_PAGE_ID is set to a valid Facebook Page ID.`;
    } else if (err.code) {
      message = `[Meta Code ${err.code}] ${message}`;
    }
    throw new Error(message);
  }

  if (useCache) {
    requestCache.set(url, { data: json, timestamp: Date.now() });
  }

  return json;
}

export function parseActions(actions: Array<{ action_type: string; value: string | number }> | undefined, typeKey: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  if (typeKey === 'lead') {
    const leadAction = actions.find(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
    return leadAction ? parseFloat(String(leadAction.value)) : 0;
  }

  if (typeKey === 'conversions' || typeKey === 'purchase') {
    const purchaseAction = actions.find(a => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
    return purchaseAction ? parseFloat(String(purchaseAction.value)) : 0;
  }

  const found = actions.find(a => a.action_type === typeKey);
  return found ? parseFloat(String(found.value)) : 0;
}

export function parseCostPerAction(costs: Array<{ action_type: string; value: string | number }> | undefined, typeKey: string): number {
  if (!costs || !Array.isArray(costs)) return 0;

  if (typeKey === 'lead') {
    const leadCost = costs.find(c => c.action_type === 'lead' || c.action_type === 'onsite_conversion.lead_grouped');
    return leadCost ? parseFloat(String(leadCost.value)) : 0;
  }

  if (typeKey === 'conversions' || typeKey === 'purchase') {
    const purchaseCost = costs.find(c => c.action_type === 'purchase' || c.action_type === 'offsite_conversion.fb_pixel_purchase');
    return purchaseCost ? parseFloat(String(purchaseCost.value)) : 0;
  }

  const found = costs.find(c => c.action_type === typeKey);
  return found ? parseFloat(String(found.value)) : 0;
}

export function parseRoas(purchaseRoas: Array<{ action_type: string; value: string | number }> | undefined): number {
  if (!purchaseRoas || !Array.isArray(purchaseRoas)) return 0;
  const roasObj = purchaseRoas.find(r => r.action_type === 'omni_purchase' || r.action_type === 'purchase');
  return roasObj ? parseFloat(String(roasObj.value)) : 0;
}

/**
 * Fetch insights for account / campaign / adset / ad level
 */
export async function getInsights({
  level = 'account',
  since,
  until,
  datePreset,
  breakdowns,
  fields,
}: {
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  since?: string;
  until?: string;
  datePreset?: string;
  breakdowns?: string;
  fields?: string[];
}) {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) {
    throw new Error('META_AD_ACCOUNT_ID environment variable is not configured.');
  }

  const defaultFields = [
    'spend',
    'impressions',
    'reach',
    'frequency',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'actions',
    'action_values',
    'cost_per_action_type',
    'purchase_roas',
    'date_start',
    'date_stop',
  ];

  if (level === 'campaign') defaultFields.push('campaign_id', 'campaign_name');
  if (level === 'adset') defaultFields.push('campaign_id', 'adset_id', 'adset_name');
  if (level === 'ad') defaultFields.push('campaign_id', 'adset_id', 'ad_id', 'ad_name');

  const fieldsParam = fields && fields.length > 0 ? Array.from(new Set([...fields, ...defaultFields])).join(',') : defaultFields.join(',');

  const params: Record<string, string> = {
    fields: fieldsParam,
    level,
  };

  if (datePreset) {
    params.date_preset = datePreset;
  } else if (since && until) {
    params.time_range = JSON.stringify({ since, until });
  } else {
    params.date_preset = 'last_30d';
  }

  if (breakdowns) {
    params.breakdowns = breakdowns;
  }

  const endpoint = `/${adAccountId}/insights`;
  const res = await metaFetch(endpoint, params);
  return res.data || [];
}

/**
 * Fetch daily time series of spend & leads for charts
 */
export async function getTimeSeries({ since, until, datePreset }: { since?: string; until?: string; datePreset?: string }) {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) return [];

  const params: Record<string, string> = {
    fields: 'spend,impressions,clicks,actions',
    time_increment: '1',
  };

  if (datePreset) {
    params.date_preset = datePreset;
  } else if (since && until) {
    params.time_range = JSON.stringify({ since, until });
  } else {
    params.date_preset = 'last_30d';
  }

  const endpoint = `/${adAccountId}/insights`;
  const res = await metaFetch(endpoint, params);
  const rawList = res.data || [];

  return rawList.map((item: any) => {
    const spend = parseFloat(item.spend || '0');
    const impressions = parseInt(item.impressions || '0', 10);
    const clicks = parseInt(item.clicks || '0', 10);
    const leads = parseActions(item.actions, 'lead');

    return {
      date: item.date_start,
      spend,
      leads,
      impressions,
      clicks,
    };
  });
}

/**
 * Get campaigns list
 */
export async function getCampaigns() {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) return [];

  const params = {
    fields: 'name,status,objective,daily_budget,lifetime_budget,start_time',
    limit: '100',
  };

  const res = await metaFetch(`/${adAccountId}/campaigns`, params);
  return res.data || [];
}

/**
 * Get leadgen forms for a page
 */
export async function getLeadgenForms() {
  const { pageId } = getMetaConfig();
  if (!pageId) throw new Error('META_PAGE_ID environment variable is not configured.');

  const res = await metaFetch(`/${pageId}/leadgen_forms`, {
    fields: 'id,name,created_time,status,leads_count',
  });
  return res.data || [];
}

/**
 * Get leads from a form
 */
export async function getFormLeads(formId: string) {
  const res = await metaFetch(`/${formId}/leads`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
    limit: '500',
  }, false);
  return res.data || [];
}

/**
 * Get single lead details from leadgen_id
 */
export async function getLeadById(leadgenId: string) {
  const res = await metaFetch(`/${leadgenId}`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
  }, false);
  return res;
}

/**
 * Test account connection
 */
export async function testMetaConnection() {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) {
    throw new Error('META_AD_ACCOUNT_ID and META_ACCESS_TOKEN must be configured.');
  }

  const res = await metaFetch(`/${adAccountId}`, {
    fields: 'name,currency,account_status,business_name',
  }, false);

  return {
    success: true,
    accountName: res.name || 'Ad Account',
    currency: res.currency || 'INR',
    accountStatus: res.account_status,
    businessName: res.business_name || '',
  };
}
