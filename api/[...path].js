import express from 'express';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONSTANTS & METRIC DEFINITIONS
// ============================================================================
const METRIC_CATALOG = [
  { key: 'spend', label: 'Amount Spent', group: 'Performance', tooltip: 'Total estimated amount of money spent on campaigns during the selected period.', format: 'currency', insightField: 'spend' },
  { key: 'impressions', label: 'Impressions', group: 'Performance', tooltip: 'The total number of times your ads were shown on screen.', format: 'number', insightField: 'impressions' },
  { key: 'reach', label: 'Reach', group: 'Performance', tooltip: 'The number of unique users who saw your ads at least once.', format: 'number', insightField: 'reach' },
  { key: 'frequency', label: 'Frequency', group: 'Performance', tooltip: 'Average number of times each person saw your ad (Impressions ÷ Reach).', format: 'ratio', insightField: 'frequency' },
  { key: 'clicks', label: 'All Clicks', group: 'Performance', tooltip: 'Total number of clicks on your ads including links, media, and reactions.', format: 'number', insightField: 'clicks' },
  { key: 'link_clicks', label: 'Link Clicks', group: 'Performance', tooltip: 'Number of clicks on links within the ad that lead to destinations.', format: 'number', insightField: 'actions:link_click' },
  { key: 'ctr', label: 'CTR (All)', group: 'Performance', tooltip: 'Percentage of times people saw your ad and performed a click (Clicks ÷ Impressions).', format: 'percent', insightField: 'ctr' },
  { key: 'cpc', label: 'CPC (All)', group: 'Performance', tooltip: 'Average cost for each click on your ad (Spend ÷ Clicks).', format: 'currency', insightField: 'cpc' },
  { key: 'cpm', label: 'CPM', group: 'Performance', tooltip: 'Average cost for 1,000 impressions of your ad.', format: 'currency', insightField: 'cpm' },
  { key: 'leads', label: 'Total Leads', group: 'Leads & Conversions', tooltip: 'Number of lead form submissions and lead conversions from Meta Lead Ads.', format: 'number', insightField: 'actions:lead' },
  { key: 'cost_per_lead', label: 'Cost per Lead (CPL)', group: 'Leads & Conversions', tooltip: 'Average amount spent per lead acquired (Spend ÷ Leads).', format: 'currency', insightField: 'cost_per_action_type:lead' },
  { key: 'results', label: 'Results', group: 'Leads & Conversions', tooltip: 'The number of times your ad achieved an outcome based on objective.', format: 'number', insightField: 'actions' },
  { key: 'cost_per_result', label: 'Cost per Result', group: 'Leads & Conversions', tooltip: 'Average cost per result achieved.', format: 'currency', insightField: 'cost_per_action_type' },
  { key: 'conversions', label: 'Purchases / Conversions', group: 'Leads & Conversions', tooltip: 'Total purchase and offsite conversion events attributed to ads.', format: 'number', insightField: 'actions:purchase' },
  { key: 'cost_per_conversion', label: 'Cost per Conversion', group: 'Leads & Conversions', tooltip: 'Average cost for each purchase or conversion event.', format: 'currency', insightField: 'cost_per_action_type:purchase' },
  { key: 'roas', label: 'Purchase ROAS', group: 'Leads & Conversions', tooltip: 'Return on Ad Spend from website/meta purchases (Purchase Value ÷ Spend).', format: 'ratio', insightField: 'purchase_roas' },
  { key: 'landing_page_views', label: 'Landing Page Views', group: 'Engagement & Video', tooltip: 'Number of times a user clicked an ad link and successfully loaded the landing page.', format: 'number', insightField: 'actions:landing_page_view' },
  { key: 'post_engagement', label: 'Post Engagement', group: 'Engagement & Video', tooltip: 'Total number of actions people take on your ads (likes, shares, comments, clicks).', format: 'number', insightField: 'actions:post_engagement' },
  { key: 'video_views', label: 'Video Views (3s+)', group: 'Engagement & Video', tooltip: 'Number of times your video was played for at least 3 seconds.', format: 'number', insightField: 'actions:video_view' },
  { key: 'thruplays', label: 'ThruPlays', group: 'Engagement & Video', tooltip: 'Number of times a video was played to completion or for at least 15 seconds.', format: 'number', insightField: 'actions:video_thruplay_watched_actions' },
];

const DEFAULT_OVERVIEW_METRICS = [
  'spend', 'leads', 'cost_per_lead', 'impressions', 'clicks', 'ctr', 'cpc', 'roas'
];

const DEFAULT_CAMPAIGN_METRICS = [
  'spend', 'leads', 'cost_per_lead', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm'
];

// ============================================================================
// DATE UTILITIES
// ============================================================================
function getDatePresetBounds(type, customSince, customUntil) {
  const now = new Date();
  const formatDateStr = (d) => d.toISOString().split('T')[0];
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

  const since = new Date(now);
  since.setDate(now.getDate() - 29);
  return { since: formatDateStr(since), until: todayStr };
}

function extractDateParams(req) {
  const rangeType = req.query.range || '30d';
  const since = req.query.since;
  const until = req.query.until;
  return getDatePresetBounds(rangeType, since, until);
}

// ============================================================================
// META GRAPH API SERVICES
// ============================================================================
const BASE_URL = 'https://graph.facebook.com/v25.0';
const requestCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function getMetaConfig() {
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

async function metaFetch(endpoint, params = {}, useCache = true) {
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
    const cached = requestCache.get(url);
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

function parseActions(actions, typeKey) {
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

function parseCostPerAction(costs, typeKey) {
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

function parseRoas(purchaseRoas) {
  if (!purchaseRoas || !Array.isArray(purchaseRoas)) return 0;
  const roasObj = purchaseRoas.find(r => r.action_type === 'omni_purchase' || r.action_type === 'purchase');
  return roasObj ? parseFloat(String(roasObj.value)) : 0;
}

async function getInsights({ level = 'account', since, until, datePreset, breakdowns, fields }) {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) {
    throw new Error('META_AD_ACCOUNT_ID environment variable is not configured.');
  }

  const defaultFields = [
    'spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm',
    'actions', 'action_values', 'cost_per_action_type', 'purchase_roas',
    'date_start', 'date_stop'
  ];

  if (level === 'campaign') defaultFields.push('campaign_id', 'campaign_name');
  if (level === 'adset') defaultFields.push('campaign_id', 'adset_id', 'adset_name');
  if (level === 'ad') defaultFields.push('campaign_id', 'adset_id', 'ad_id', 'ad_name');

  const fieldsParam = fields && fields.length > 0
    ? Array.from(new Set([...fields, ...defaultFields])).join(',')
    : defaultFields.join(',');

  const params = { fields: fieldsParam, level };

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

  const res = await metaFetch(`/${adAccountId}/insights`, params);
  return res.data || [];
}

async function getTimeSeries({ since, until, datePreset }) {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) return [];

  const params = {
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

  const res = await metaFetch(`/${adAccountId}/insights`, params);
  const rawList = res.data || [];

  return rawList.map((item) => {
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

async function getCampaigns() {
  const { adAccountId } = getMetaConfig();
  if (!adAccountId) return [];

  const params = {
    fields: 'name,status,objective,daily_budget,lifetime_budget,start_time',
    limit: '100',
  };

  const res = await metaFetch(`/${adAccountId}/campaigns`, params);
  return res.data || [];
}

async function getLeadgenForms() {
  const { pageId } = getMetaConfig();
  if (!pageId) throw new Error('META_PAGE_ID environment variable is not configured.');

  const res = await metaFetch(`/${pageId}/leadgen_forms`, {
    fields: 'id,name,created_time,status,leads_count',
  });
  return res.data || [];
}

async function getFormLeads(formId) {
  const res = await metaFetch(`/${formId}/leads`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
    limit: '500',
  }, false);
  return res.data || [];
}

async function getLeadById(leadgenId) {
  const res = await metaFetch(`/${leadgenId}`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
  }, false);
  return res;
}

async function testMetaConnection() {
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

// ============================================================================
// SAMPLE / DEMO DATA GENERATORS
// ============================================================================
function generateSampleTimeSeries(sinceStr, untilStr) {
  const start = new Date(sinceStr);
  const end = new Date(untilStr);
  const points = [];
  const curr = new Date(start);
  let dayIdx = 0;

  while (curr <= end && points.length < 90) {
    const isoDate = curr.toISOString().split('T')[0];
    const dayFactor = 1 + Math.sin(dayIdx * 0.8) * 0.25;
    const spend = Math.round(3500 * dayFactor);
    const leads = Math.max(2, Math.round(12 * dayFactor));
    const impressions = Math.round(28000 * dayFactor);
    const clicks = Math.round(720 * dayFactor);

    points.push({ date: isoDate, spend, leads, impressions, clicks });
    curr.setDate(curr.getDate() + 1);
    dayIdx++;
  }

  return points;
}

function generateSampleOverview(sinceStr, untilStr, requestedMetrics, warningMessage) {
  const timeSeries = generateSampleTimeSeries(sinceStr, untilStr);

  const totalSpend = timeSeries.reduce((acc, p) => acc + p.spend, 0);
  const totalLeads = timeSeries.reduce((acc, p) => acc + p.leads, 0);
  const totalImpressions = timeSeries.reduce((acc, p) => acc + p.impressions, 0);
  const totalClicks = timeSeries.reduce((acc, p) => acc + p.clicks, 0);

  const cpl = totalLeads ? totalSpend / totalLeads : 0;
  const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions ? (totalSpend / totalImpressions) * 1000 : 0;
  const reach = Math.round(totalImpressions * 0.68);
  const frequency = totalImpressions && reach ? parseFloat((totalImpressions / reach).toFixed(2)) : 1.47;

  const valueMap = {
    spend: totalSpend,
    leads: totalLeads,
    cost_per_lead: cpl,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr,
    cpc,
    cpm,
    reach,
    frequency,
    results: totalLeads,
    cost_per_result: cpl,
    conversions: Math.round(totalLeads * 0.35),
    cost_per_conversion: cpl * 2.85,
    roas: 3.42,
    link_clicks: Math.round(totalClicks * 0.82),
    landing_page_views: Math.round(totalClicks * 0.71),
    post_engagement: Math.round(totalClicks * 1.85),
    video_views: Math.round(totalImpressions * 0.32),
    thruplays: Math.round(totalImpressions * 0.12),
  };

  const kpis = requestedMetrics.map(key => {
    const def = METRIC_CATALOG.find(m => m.key === key);
    return {
      key,
      label: def?.label || key,
      value: valueMap[key] ?? 0,
      format: def?.format || 'number',
    };
  });

  const topCampaigns = [
    {
      id: 'camp_101',
      name: 'Q3 High-Intent Buyers - Real Estate',
      spend: Math.round(totalSpend * 0.38),
      leads: Math.round(totalLeads * 0.42),
      cost_per_lead: Math.round((totalSpend * 0.38) / (totalLeads * 0.42)),
    },
    {
      id: 'camp_102',
      name: 'Luxury Villa LeadGen - Retargeting',
      spend: Math.round(totalSpend * 0.28),
      leads: Math.round(totalLeads * 0.29),
      cost_per_lead: Math.round((totalSpend * 0.28) / (totalLeads * 0.29)),
    },
    {
      id: 'camp_103',
      name: 'Plot Investments - Lookalike 1%',
      spend: Math.round(totalSpend * 0.20),
      leads: Math.round(totalLeads * 0.18),
      cost_per_lead: Math.round((totalSpend * 0.20) / (totalLeads * 0.18)),
    },
    {
      id: 'camp_104',
      name: 'Commercial Spaces - Direct Leads',
      spend: Math.round(totalSpend * 0.14),
      leads: Math.round(totalLeads * 0.11),
      cost_per_lead: Math.round((totalSpend * 0.14) / (totalLeads * 0.11)),
    },
  ];

  return {
    kpis,
    timeSeries,
    topCampaigns,
    isSampleData: true,
    warning: warningMessage,
  };
}

function generateSampleCampaigns(level = 'campaign', parentId) {
  if (level === 'campaign') {
    return [
      {
        id: 'camp_101',
        name: 'Q3 High-Intent Buyers - Real Estate',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 48500, impressions: 125000, reach: 82000, frequency: 1.52,
          clicks: 3400, link_clicks: 2800, ctr: 2.72, cpc: 14.26, cpm: 388,
          leads: 162, cost_per_lead: 299.38, results: 162, cost_per_result: 299.38,
          conversions: 45, cost_per_conversion: 1077.7, roas: 3.85,
          landing_page_views: 2350, post_engagement: 5800, video_views: 32000, thruplays: 12500,
        },
      },
      {
        id: 'camp_102',
        name: 'Luxury Villa LeadGen - Retargeting',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 35000, impressions: 88000, reach: 54000, frequency: 1.62,
          clicks: 2200, link_clicks: 1850, ctr: 2.50, cpc: 15.90, cpm: 397.7,
          leads: 110, cost_per_lead: 318.18, results: 110, cost_per_result: 318.18,
          conversions: 32, cost_per_conversion: 1093.75, roas: 3.20,
          landing_page_views: 1550, post_engagement: 3900, video_views: 22000, thruplays: 8900,
        },
      },
      {
        id: 'camp_103',
        name: 'Plot Investments - Lookalike 1%',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 25000, impressions: 68000, reach: 46000, frequency: 1.47,
          clicks: 1650, link_clicks: 1350, ctr: 2.42, cpc: 15.15, cpm: 367.6,
          leads: 78, cost_per_lead: 320.51, results: 78, cost_per_result: 320.51,
          conversions: 21, cost_per_conversion: 1190.4, roas: 2.95,
          landing_page_views: 1100, post_engagement: 2800, video_views: 16000, thruplays: 6200,
        },
      },
      {
        id: 'camp_104',
        name: 'Commercial Spaces - Direct Leads',
        level: 'campaign',
        status: 'PAUSED',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 16000, impressions: 44000, reach: 31000, frequency: 1.41,
          clicks: 1050, link_clicks: 880, ctr: 2.38, cpc: 15.23, cpm: 363.6,
          leads: 48, cost_per_lead: 333.33, results: 48, cost_per_result: 333.33,
          conversions: 14, cost_per_conversion: 1142.8, roas: 2.65,
          landing_page_views: 720, post_engagement: 1900, video_views: 10500, thruplays: 4100,
        },
      },
    ];
  }

  if (level === 'adset') {
    return [
      {
        id: 'adset_201',
        campaign_id: parentId || 'camp_101',
        name: 'Interest: Property Investors (25-45)',
        level: 'adset',
        status: 'ACTIVE',
        insights: {
          spend: 28000, impressions: 72000, reach: 48000, frequency: 1.5,
          clicks: 2000, link_clicks: 1650, ctr: 2.77, cpc: 14.0, cpm: 388.8,
          leads: 95, cost_per_lead: 294.73, results: 95, cost_per_result: 294.73,
          conversions: 28, cost_per_conversion: 1000.0, roas: 4.1,
          landing_page_views: 1400, post_engagement: 3500, video_views: 19000, thruplays: 7500,
        },
      },
      {
        id: 'adset_202',
        campaign_id: parentId || 'camp_101',
        name: 'Custom Audience: Website Visitors (30d)',
        level: 'adset',
        status: 'ACTIVE',
        insights: {
          spend: 20500, impressions: 53000, reach: 34000, frequency: 1.55,
          clicks: 1400, link_clicks: 1150, ctr: 2.64, cpc: 14.64, cpm: 386.7,
          leads: 67, cost_per_lead: 305.97, results: 67, cost_per_result: 305.97,
          conversions: 17, cost_per_conversion: 1205.8, roas: 3.5,
          landing_page_views: 950, post_engagement: 2300, video_views: 13000, thruplays: 5000,
        },
      },
    ];
  }

  if (level === 'ad') {
    return [
      {
        id: 'ad_301',
        campaign_id: 'camp_101',
        adset_id: parentId || 'adset_201',
        name: 'Video Ad - Virtual Tour 4K Walkthrough',
        level: 'ad',
        status: 'ACTIVE',
        insights: {
          spend: 18000, impressions: 46000, reach: 31000, frequency: 1.48,
          clicks: 1350, link_clicks: 1100, ctr: 2.93, cpc: 13.33, cpm: 391.3,
          leads: 63, cost_per_lead: 285.71, results: 63, cost_per_result: 285.71,
          conversions: 20, cost_per_conversion: 900.0, roas: 4.4,
          landing_page_views: 920, post_engagement: 2400, video_views: 14000, thruplays: 5800,
        },
      },
      {
        id: 'ad_302',
        campaign_id: 'camp_101',
        adset_id: parentId || 'adset_201',
        name: 'Carousel Ad - Top 5 Premium Amenities',
        level: 'ad',
        status: 'ACTIVE',
        insights: {
          spend: 10000, impressions: 26000, reach: 17000, frequency: 1.52,
          clicks: 650, link_clicks: 550, ctr: 2.50, cpc: 15.38, cpm: 384.6,
          leads: 32, cost_per_lead: 312.5, results: 32, cost_per_result: 312.5,
          conversions: 8, cost_per_conversion: 1250.0, roas: 3.6,
          landing_page_views: 480, post_engagement: 1100, video_views: 5000, thruplays: 1700,
        },
      },
    ];
  }

  return [];
}

function generateSampleBreakdown(breakdown) {
  if (breakdown === 'publisher_platform') {
    return [
      { name: 'facebook', spend: 68500, leads: 228, impressions: 175000, clicks: 4680 },
      { name: 'instagram', spend: 43200, leads: 144, impressions: 118000, clicks: 3120 },
      { name: 'audience_network', spend: 8800, leads: 26, impressions: 24000, clicks: 490 },
      { name: 'messenger', spend: 4000, leads: 12, impressions: 11000, clicks: 210 },
    ];
  }
  if (breakdown === 'device_platform') {
    return [
      { name: 'mobile', spend: 98500, leads: 332, impressions: 254000, clicks: 6850 },
      { name: 'desktop', spend: 21000, leads: 66, impressions: 58000, clicks: 1380 },
      { name: 'tablet', spend: 5000, leads: 12, impressions: 16000, clicks: 270 },
    ];
  }
  if (breakdown === 'age,gender') {
    return [
      { name: '25-34 (male)', spend: 38000, leads: 128, impressions: 98000, clicks: 2600 },
      { name: '25-34 (female)', spend: 32000, leads: 108, impressions: 84000, clicks: 2200 },
      { name: '35-44 (male)', spend: 24000, leads: 82, impressions: 62000, clicks: 1650 },
      { name: '35-44 (female)', spend: 18000, leads: 60, impressions: 46000, clicks: 1200 },
      { name: '45-54 (male)', spend: 8500, leads: 22, impressions: 22000, clicks: 540 },
      { name: '18-24 (male)', spend: 4000, leads: 10, impressions: 16000, clicks: 310 },
    ];
  }
  if (breakdown === 'region') {
    return [
      { name: 'Maharashtra', spend: 42000, leads: 140, impressions: 110000, clicks: 2900 },
      { name: 'Karnataka', spend: 28000, leads: 94, impressions: 72000, clicks: 1950 },
      { name: 'Delhi NCR', spend: 24000, leads: 80, impressions: 62000, clicks: 1650 },
      { name: 'Tamil Nadu', spend: 14000, leads: 46, impressions: 38000, clicks: 980 },
      { name: 'Telangana', spend: 11000, leads: 36, impressions: 29000, clicks: 760 },
      { name: 'Gujarat', spend: 5500, leads: 14, impressions: 17000, clicks: 360 },
    ];
  }
  return [];
}

// ============================================================================
// SUPABASE CLIENT & IN-MEMORY FALLBACK STORE
// ============================================================================
const sampleInitialForms = [
  { id: 'form_801', name: 'Q3 Real Estate VIP Callback Form', page_id: 'page_1001' },
  { id: 'form_802', name: 'Luxury Villa Virtual Brochure Form', page_id: 'page_1001' },
  { id: 'form_803', name: 'Commercial Property Investment Form', page_id: 'page_1001' },
];

const sampleInitialLeads = [
  {
    id: 'lead_9001',
    full_name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@example.com',
    campaign_id: 'camp_101',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_801',
    created_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Rahul Sharma'] },
      { name: 'phone_number', values: ['+91 98765 43210'] },
      { name: 'email', values: ['rahul.sharma@example.com'] },
      { name: 'budget_range', values: ['₹1.5 Cr - ₹2.5 Cr'] },
      { name: 'preferred_location', values: ['Whitefield, Bangalore'] },
    ],
  },
  {
    id: 'lead_9002',
    full_name: 'Priya Verma',
    phone: '+91 98123 45678',
    email: 'priya.verma@example.com',
    campaign_id: 'camp_101',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_801',
    created_time: new Date(Date.now() - 3600000 * 5).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Priya Verma'] },
      { name: 'phone_number', values: ['+91 98123 45678'] },
      { name: 'email', values: ['priya.verma@example.com'] },
      { name: 'budget_range', values: ['₹2.5 Cr+'] },
      { name: 'preferred_location', values: ['Indiranagar, Bangalore'] },
    ],
  },
  {
    id: 'lead_9003',
    full_name: 'Amit Patel',
    phone: '+91 99887 76655',
    email: 'amit.patel@example.com',
    campaign_id: 'camp_102',
    adset_id: 'adset_202',
    ad_id: 'ad_302',
    form_id: 'form_802',
    created_time: new Date(Date.now() - 3600000 * 12).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Amit Patel'] },
      { name: 'phone_number', values: ['+91 99887 76655'] },
      { name: 'email', values: ['amit.patel@example.com'] },
      { name: 'villa_type', values: ['4 BHK Duplex Villa'] },
    ],
  },
  {
    id: 'lead_9004',
    full_name: 'Sneha Kulkarni',
    phone: '+91 97654 32109',
    email: 'sneha.k@example.com',
    campaign_id: 'camp_102',
    adset_id: 'adset_202',
    ad_id: 'ad_302',
    form_id: 'form_802',
    created_time: new Date(Date.now() - 3600000 * 24).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Sneha Kulkarni'] },
      { name: 'phone_number', values: ['+91 97654 32109'] },
      { name: 'email', values: ['sneha.k@example.com'] },
      { name: 'possession_timeline', values: ['Immediate / Ready to Move'] },
    ],
  },
  {
    id: 'lead_9005',
    full_name: 'Vikram Singh',
    phone: '+91 98989 12345',
    email: 'vikram.singh@example.com',
    campaign_id: 'camp_104',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_803',
    created_time: new Date(Date.now() - 3600000 * 36).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Vikram Singh'] },
      { name: 'phone_number', values: ['+91 98989 12345'] },
      { name: 'email', values: ['vikram.singh@example.com'] },
      { name: 'space_required', values: ['5,000 - 10,000 sq ft Office'] },
    ],
  },
];

const inMemoryStore = {
  leads: new Map(sampleInitialLeads.map(l => [l.id, l])),
  forms: new Map(sampleInitialForms.map(f => [f.id, f])),
  views: new Map(),
};

function getLazySupabase() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (url && key) {
      return createClient(url, key);
    }
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
  }
  return null;
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function parseFieldData(fieldData = []) {
  let full_name = '';
  let phone = '';
  let email = '';
  if (!Array.isArray(fieldData)) return { full_name, phone, email };

  for (const item of fieldData) {
    const nameLower = (item.name || '').toLowerCase();
    const val = item.values && item.values.length > 0 ? item.values[0] : '';

    if (nameLower.includes('full_name') || nameLower.includes('name') || nameLower === 'first_name') {
      if (!full_name) full_name = val;
    } else if (nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('contact')) {
      if (!phone) phone = val;
    } else if (nameLower.includes('email')) {
      if (!email) email = val;
    }
  }

  return { full_name, phone, email };
}

async function upsertLead(lead) {
  const parsed = parseFieldData(lead.field_data);
  const leadData = {
    ...lead,
    full_name: lead.full_name || parsed.full_name || 'Anonymous',
    phone: lead.phone || parsed.phone || '—',
    email: lead.email || parsed.email || '—',
    synced_at: new Date().toISOString(),
  };

  const db = getLazySupabase();
  if (db) {
    const { error } = await db.from('meta_leads').upsert({
      id: leadData.id,
      full_name: leadData.full_name,
      phone: leadData.phone,
      email: leadData.email,
      field_data: leadData.field_data,
      campaign_id: leadData.campaign_id,
      adset_id: leadData.adset_id,
      ad_id: leadData.ad_id,
      form_id: leadData.form_id,
      created_time: leadData.created_time,
      synced_at: leadData.synced_at,
    }, { onConflict: 'id' });

    if (error) {
      inMemoryStore.leads.set(leadData.id, leadData);
    }
  } else {
    inMemoryStore.leads.set(leadData.id, leadData);
  }
}

async function upsertForm(form) {
  const db = getLazySupabase();
  if (db) {
    const { error } = await db.from('meta_forms').upsert({
      id: form.id,
      name: form.name,
      page_id: form.page_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      inMemoryStore.forms.set(form.id, form);
    }
  } else {
    inMemoryStore.forms.set(form.id, form);
  }
}

async function queryLeads({ campaign, form, search, since, until }) {
  const db = getLazySupabase();
  if (db) {
    let q = db.from('meta_leads').select('*').order('created_time', { ascending: false });

    if (campaign) q = q.eq('campaign_id', campaign);
    if (form) q = q.eq('form_id', form);
    if (since) q = q.gte('created_time', `${since}T00:00:00Z`);
    if (until) q = q.lte('created_time', `${until}T23:59:59Z`);

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await q;
    if (!error && data) {
      return data;
    }
  }

  let items = Array.from(inMemoryStore.leads.values());

  if (campaign) items = items.filter(i => i.campaign_id === campaign);
  if (form) items = items.filter(i => i.form_id === form);
  if (since) items = items.filter(i => new Date(i.created_time) >= new Date(`${since}T00:00:00Z`));
  if (until) items = items.filter(i => new Date(i.created_time) <= new Date(`${until}T23:59:59Z`));

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(
      i =>
        (i.full_name && i.full_name.toLowerCase().includes(s)) ||
        (i.phone && i.phone.toLowerCase().includes(s)) ||
        (i.email && i.email.toLowerCase().includes(s))
    );
  }

  return items.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
}

async function queryForms() {
  const db = getLazySupabase();
  if (db) {
    const { data, error } = await db.from('meta_forms').select('*');
    if (!error && data && data.length > 0) {
      return data;
    }
  }

  return Array.from(inMemoryStore.forms.values());
}

async function getMetricView(scope) {
  const db = getLazySupabase();
  if (db) {
    const { data, error } = await db
      .from('meta_views')
      .select('*')
      .eq('scope', scope)
      .eq('is_default', true)
      .single();

    if (!error && data) {
      return data;
    }
  }

  return inMemoryStore.views.get(scope) || null;
}

async function saveMetricView(scope, name, metrics) {
  const view = {
    scope,
    name: name || 'Default',
    metrics,
    is_default: true,
  };

  const db = getLazySupabase();
  if (db) {
    const { data, error } = await db.from('meta_views').upsert({
      scope,
      name,
      metrics,
      is_default: true,
    }).select().single();

    if (!error && data) {
      return data;
    }
  }

  inMemoryStore.views.set(scope, view);
  return view;
}

// ============================================================================
// EXPRESS APP & ROUTE DEFINITIONS
// ============================================================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

// GET /overview
router.get('/overview', async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const metricsParam = req.query.metrics;
    const requestedMetrics = metricsParam ? metricsParam.split(',').filter(Boolean) : DEFAULT_OVERVIEW_METRICS;

    const { hasToken } = getMetaConfig();

    if (!hasToken) {
      const sample = generateSampleOverview(since, until, requestedMetrics, 'Meta API credentials (META_ACCESS_TOKEN and META_AD_ACCOUNT_ID) are missing. Displaying interactive preview data.');
      return res.json({ ...sample, since, until });
    }

    let warning;
    let accountData = {};
    let timeSeries = [];
    let topCampaigns = [];

    try {
      const insights = await getInsights({ level: 'account', since, until });
      accountData = insights[0] || {};
      timeSeries = await getTimeSeries({ since, until });

      const campaignInsights = await getInsights({ level: 'campaign', since, until });
      topCampaigns = campaignInsights
        .map((c) => {
          const cSpend = parseFloat(c.spend || '0');
          const cLeads = parseActions(c.actions, 'lead');
          const cCpl = cLeads ? cSpend / cLeads : 0;
          return {
            id: c.campaign_id,
            name: c.campaign_name || 'Campaign',
            spend: cSpend,
            leads: cLeads,
            cost_per_lead: cCpl,
          };
        })
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);
    } catch (err) {
      warning = err.message;
    }

    const spend = parseFloat(accountData.spend || '0');

    if (warning || (!spend && timeSeries.length === 0)) {
      const sample = generateSampleOverview(since, until, requestedMetrics, warning || 'Meta API returned 0 results for the selected period.');
      return res.json({ ...sample, since, until });
    }

    const impressions = parseInt(accountData.impressions || '0', 10);
    const reach = parseInt(accountData.reach || '0', 10);
    const clicks = parseInt(accountData.clicks || '0', 10);
    const frequency = parseFloat(accountData.frequency || '0') || (reach ? impressions / reach : 0);
    const ctr = parseFloat(accountData.ctr || '0') || (impressions ? (clicks / impressions) * 100 : 0);
    const cpc = parseFloat(accountData.cpc || '0') || (clicks ? spend / clicks : 0);
    const cpm = parseFloat(accountData.cpm || '0') || (impressions ? (spend / impressions) * 1000 : 0);

    const leads = parseActions(accountData.actions, 'lead');
    const costPerLead = parseCostPerAction(accountData.cost_per_action_type, 'lead') || (leads ? spend / leads : 0);
    const conversions = parseActions(accountData.actions, 'conversions');
    const costPerConversion = parseCostPerAction(accountData.cost_per_action_type, 'conversions') || (conversions ? spend / conversions : 0);
    const roas = parseRoas(accountData.purchase_roas);

    const linkClicks = parseActions(accountData.actions, 'link_click');
    const landingPageViews = parseActions(accountData.actions, 'landing_page_view');
    const postEngagement = parseActions(accountData.actions, 'post_engagement');
    const videoViews = parseActions(accountData.actions, 'video_view');
    const thruplays = parseActions(accountData.actions, 'video_thruplay_watched_actions');

    const valueMap = {
      spend, impressions, reach, frequency, clicks, link_clicks: linkClicks,
      ctr, cpc, cpm, leads, cost_per_lead: costPerLead,
      results: leads || conversions || clicks,
      cost_per_result: costPerLead || costPerConversion || cpc,
      conversions, cost_per_conversion: costPerConversion, roas,
      landing_page_views: landingPageViews, post_engagement: postEngagement,
      video_views: videoViews, thruplays,
    };

    const kpis = requestedMetrics.map(key => {
      const def = METRIC_CATALOG.find(m => m.key === key);
      return {
        key,
        label: def?.label || key,
        value: valueMap[key] ?? 0,
        format: def?.format || 'number',
      };
    });

    res.json({ kpis, timeSeries, topCampaigns, warning, since, until });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error loading overview' });
  }
});

// GET /campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const level = req.query.level || 'campaign';
    const parentId = req.query.parent_id;
    const { hasToken } = getMetaConfig();

    if (!hasToken) {
      const sampleItems = generateSampleCampaigns(level, parentId);
      return res.json({
        level,
        items: sampleItems,
        warning: 'Meta API credentials missing. Displaying interactive preview data.',
      });
    }

    let campaignsList = [];
    if (level === 'campaign') {
      try {
        campaignsList = await getCampaigns();
      } catch (e) {
        // Fall back to insights metadata
      }
    }

    const insights = await getInsights({ level, since, until });
    const campaignMap = new Map();
    campaignsList.forEach(c => campaignMap.set(c.id, c));

    let items = insights.map((item) => {
      const spend = parseFloat(item.spend || '0');
      const impressions = parseInt(item.impressions || '0', 10);
      const reach = parseInt(item.reach || '0', 10);
      const clicks = parseInt(item.clicks || '0', 10);
      const frequency = parseFloat(item.frequency || '0');
      const ctr = parseFloat(item.ctr || '0') || (impressions ? (clicks / impressions) * 100 : 0);
      const cpc = parseFloat(item.cpc || '0') || (clicks ? spend / clicks : 0);
      const cpm = parseFloat(item.cpm || '0') || (impressions ? (spend / impressions) * 1000 : 0);

      const leads = parseActions(item.actions, 'lead');
      const costPerLead = parseCostPerAction(item.cost_per_action_type, 'lead') || (leads ? spend / leads : 0);
      const conversions = parseActions(item.actions, 'conversions');
      const costPerConversion = parseCostPerAction(item.cost_per_action_type, 'conversions') || (conversions ? spend / conversions : 0);
      const roas = parseRoas(item.purchase_roas);

      const linkClicks = parseActions(item.actions, 'link_click');
      const landingPageViews = parseActions(item.actions, 'landing_page_view');
      const postEngagement = parseActions(item.actions, 'post_engagement');
      const videoViews = parseActions(item.actions, 'video_view');
      const thruplays = parseActions(item.actions, 'video_thruplay_watched_actions');

      const id = item[`${level}_id`] || item.campaign_id || 'unknown';
      const name = item[`${level}_name`] || item.campaign_name || 'Unnamed';
      const metaCampaign = campaignMap.get(id);

      return {
        id, name, level,
        status: metaCampaign?.status || 'ACTIVE',
        objective: metaCampaign?.objective || 'OUTCOME_LEADS',
        campaign_id: item.campaign_id,
        adset_id: item.adset_id,
        ad_id: item.ad_id,
        insights: {
          spend, impressions, reach, frequency, clicks, link_clicks: linkClicks,
          ctr, cpc, cpm, leads, cost_per_lead: costPerLead,
          results: leads || conversions || clicks,
          cost_per_result: costPerLead || costPerConversion || cpc,
          conversions, cost_per_conversion: costPerConversion, roas,
          landing_page_views: landingPageViews, post_engagement: postEngagement,
          video_views: videoViews, thruplays,
        },
      };
    });

    if (parentId) {
      if (level === 'adset') {
        items = items.filter(i => i.campaign_id === parentId);
      } else if (level === 'ad') {
        items = items.filter(i => i.adset_id === parentId);
      }
    }

    if (items.length === 0) {
      items = generateSampleCampaigns(level, parentId);
    }

    res.json({ level, items, since, until });
  } catch (err) {
    const sampleItems = generateSampleCampaigns(req.query.level || 'campaign', req.query.parent_id);
    res.json({
      level: req.query.level || 'campaign',
      items: sampleItems,
      warning: err.message || 'Error loading campaigns',
    });
  }
});

// GET /insights
router.get('/insights', async (req, res) => {
  try {
    const breakdown = req.query.breakdown || 'publisher_platform';
    const { since, until } = extractDateParams(req);
    const { hasToken } = getMetaConfig();

    if (!hasToken) {
      const sample = generateSampleBreakdown(breakdown);
      return res.json({ breakdown, items: sample });
    }

    const insights = await getInsights({
      level: 'account',
      since,
      until,
      breakdowns: breakdown,
    });

    let items = insights.map((item) => {
      let name = 'Other';
      if (breakdown === 'publisher_platform') name = item.publisher_platform || 'unknown';
      else if (breakdown === 'age') name = item.age || 'unknown';
      else if (breakdown === 'gender') name = item.gender || 'unknown';
      else if (breakdown === 'age,gender') name = `${item.age || ''} (${item.gender || ''})`;
      else if (breakdown === 'region') name = item.region || 'unknown';
      else if (breakdown === 'device_platform') name = item.device_platform || 'unknown';

      const spend = parseFloat(item.spend || '0');
      const leads = parseActions(item.actions, 'lead');
      const impressions = parseInt(item.impressions || '0', 10);
      const clicks = parseInt(item.clicks || '0', 10);

      return { name, spend, leads, impressions, clicks };
    });

    if (items.length === 0) {
      items = generateSampleBreakdown(breakdown);
    }

    res.json({ breakdown, items });
  } catch (err) {
    const sample = generateSampleBreakdown(req.query.breakdown || 'publisher_platform');
    res.json({ breakdown: req.query.breakdown || 'publisher_platform', items: sample, warning: err.message });
  }
});

// GET & POST /views
router.get('/views', async (req, res) => {
  try {
    const scope = req.query.scope || 'overview';
    const view = await getMetricView(scope);
    const defaultMetrics = scope === 'overview' ? DEFAULT_OVERVIEW_METRICS : DEFAULT_CAMPAIGN_METRICS;

    res.json({
      scope,
      name: view?.name || 'Default',
      metrics: view?.metrics || defaultMetrics,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error fetching views' });
  }
});

router.post('/views', async (req, res) => {
  try {
    const { scope, name, metrics } = req.body || {};
    if (!scope || !Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Scope and array of metrics are required.' });
    }

    const saved = await saveMetricView(scope, name || 'Custom View', metrics);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error saving view' });
  }
});

// GET /leads
router.get('/leads', async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign;
    const form = req.query.form;
    const search = req.query.search;

    const leads = await queryLeads({ campaign, form, search, since, until });
    res.json({ items: leads, count: leads.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error querying leads' });
  }
});

// GET /leads/export
router.get('/leads/export', async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign;
    const form = req.query.form;
    const search = req.query.search;

    const leads = await queryLeads({ campaign, form, search, since, until });

    const headers = ['Lead ID', 'Full Name', 'Phone', 'Email', 'Campaign ID', 'Form ID', 'Created Time'];
    const rows = leads.map(l => [
      `"${l.id}"`,
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${l.campaign_id || ''}"`,
      `"${l.form_id || ''}"`,
      `"${l.created_time || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=meta-leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error exporting leads' });
  }
});

// POST /leads/sync
router.post('/leads/sync', async (req, res) => {
  try {
    const { pageId } = getMetaConfig();
    if (!pageId) {
      const sampleForms = await queryForms();
      const sampleLeads = await queryLeads({});
      return res.json({
        success: true,
        formsSynced: sampleForms.length,
        leadsSynced: sampleLeads.length,
        message: `Synced ${sampleForms.length} sample forms and ${sampleLeads.length} leads for preview mode. Configure META_PAGE_ID to sync live Page forms.`,
      });
    }

    let forms = [];
    try {
      forms = await getLeadgenForms();
    } catch (e) {
      const sampleForms = await queryForms();
      const sampleLeads = await queryLeads({});
      return res.json({
        success: true,
        formsSynced: sampleForms.length,
        leadsSynced: sampleLeads.length,
        message: `Meta Page Notice: ${e.message}. Active sample leads remain available.`,
      });
    }

    let totalLeadsSynced = 0;

    for (const form of forms) {
      await upsertForm({ id: form.id, name: form.name, page_id: pageId });

      try {
        const formLeads = await getFormLeads(form.id);
        for (const lead of formLeads) {
          await upsertLead({
            id: lead.id,
            field_data: lead.field_data,
            campaign_id: lead.campaign_id,
            adset_id: lead.adset_id,
            ad_id: lead.ad_id,
            form_id: form.id,
            form_name: form.name,
            created_time: lead.created_time,
          });
          totalLeadsSynced++;
        }
      } catch (err) {
        // Individual form fetch failure
      }
    }

    res.json({
      success: true,
      formsSynced: forms.length,
      leadsSynced: totalLeadsSynced,
      message: `Successfully synced ${forms.length} forms and ${totalLeadsSynced} leads.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to sync leads from Meta.' });
  }
});

// GET /forms
router.get('/forms', async (req, res) => {
  try {
    const forms = await queryForms();
    res.json({ items: forms });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error fetching forms' });
  }
});

// GET /settings
router.get('/settings', (req, res) => {
  try {
    const config = getMetaConfig();
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    res.json({
      adAccountId: config.adAccountId || 'Not set',
      pageId: config.pageId || 'Not set',
      webhookUrl: `${appUrl}/api/meta/webhook`,
      verifyToken: config.verifyToken || 'Not set',
      hasToken: config.hasToken,
      hasSupabase: hasSupabaseConfig(),
      appUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error fetching settings' });
  }
});

// GET /test-connection
router.get('/test-connection', async (req, res) => {
  try {
    const result = await testMetaConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Meta connection test failed.',
    });
  }
});

// GET & POST /meta/webhook
router.get('/meta/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const { verifyToken } = getMetaConfig();

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    res.status(403).json({ error: 'Webhook verification token mismatch' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Webhook verification error' });
  }
});

router.post('/meta/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body && body.object === 'page' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen' && change.value?.leadgen_id) {
              const leadgenId = change.value.leadgen_id;
              const lead = await getLeadById(leadgenId);
              if (lead) {
                await upsertLead({
                  id: lead.id,
                  field_data: lead.field_data,
                  campaign_id: lead.campaign_id,
                  adset_id: lead.adset_id,
                  ad_id: lead.ad_id,
                  form_id: lead.form_id,
                  created_time: lead.created_time,
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error processing leadgen webhook:', err.message);
  }
});

// Mount router at both /api and / so all paths match regardless of URL rewriting
app.use('/api', router);
app.use('/', router);

// ============================================================================
// VERCEL SERVERLESS ENTRYPOINT WITH GLOBAL TRY-CATCH WRAPPER
// ============================================================================
export default async function handler(req, res) {
  try {
    return await app(req, res);
  } catch (err) {
    console.error('Vercel API Function Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  }
}
