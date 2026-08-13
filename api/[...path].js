import express from 'express';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONSTANTS & METRIC DEFINITIONS
// ============================================================================
const METRIC_CATALOG = [
  { key: 'spend', label: 'Amount Spent', group: 'Performance', tooltip: 'Total estimated amount of money spent on campaigns during the selected period.', format: 'currency' },
  { key: 'impressions', label: 'Impressions', group: 'Performance', tooltip: 'The total number of times your ads were shown on screen.', format: 'number' },
  { key: 'reach', label: 'Reach', group: 'Performance', tooltip: 'The number of unique users who saw your ads at least once.', format: 'number' },
  { key: 'frequency', label: 'Frequency', group: 'Performance', tooltip: 'Average number of times each person saw your ad (Impressions ÷ Reach).', format: 'ratio' },
  { key: 'clicks', label: 'All Clicks', group: 'Performance', tooltip: 'Total number of clicks on your ads including links, media, and reactions.', format: 'number' },
  { key: 'link_clicks', label: 'Link Clicks', group: 'Performance', tooltip: 'Number of clicks on links within the ad that lead to destinations.', format: 'number' },
  { key: 'ctr', label: 'CTR (All)', group: 'Performance', tooltip: 'Percentage of times people saw your ad and performed a click (Clicks ÷ Impressions).', format: 'percent' },
  { key: 'cpc', label: 'CPC (All)', group: 'Performance', tooltip: 'Average cost for each click on your ad (Spend ÷ Clicks).', format: 'currency' },
  { key: 'cpm', label: 'CPM', group: 'Performance', tooltip: 'Average cost for 1,000 impressions of your ad.', format: 'currency' },
  { key: 'leads', label: 'Total Leads', group: 'Leads & Conversions', tooltip: 'Number of lead form submissions and lead conversions from Meta Lead Ads.', format: 'number' },
  { key: 'cost_per_lead', label: 'Cost per Lead (CPL)', group: 'Leads & Conversions', tooltip: 'Average amount spent per lead acquired (Spend ÷ Leads).', format: 'currency' },
  { key: 'results', label: 'Results', group: 'Leads & Conversions', tooltip: 'The number of times your ad achieved an outcome based on objective.', format: 'number' },
  { key: 'cost_per_result', label: 'Cost per Result', group: 'Leads & Conversions', tooltip: 'Average cost per result achieved.', format: 'currency' },
  { key: 'conversions', label: 'Purchases / Conversions', group: 'Leads & Conversions', tooltip: 'Total purchase and offsite conversion events attributed to ads.', format: 'number' },
  { key: 'cost_per_conversion', label: 'Cost per Conversion', group: 'Leads & Conversions', tooltip: 'Average cost for each purchase or conversion event.', format: 'currency' },
  { key: 'roas', label: 'Purchase ROAS', group: 'Leads & Conversions', tooltip: 'Return on Ad Spend from website/meta purchases (Purchase Value ÷ Spend).', format: 'ratio' },
  { key: 'landing_page_views', label: 'Landing Page Views', group: 'Engagement & Video', tooltip: 'Number of times a user clicked an ad link and successfully loaded the landing page.', format: 'number' },
  { key: 'post_engagement', label: 'Post Engagement', group: 'Engagement & Video', tooltip: 'Total number of actions people take on your ads (likes, shares, comments, clicks).', format: 'number' },
  { key: 'video_views', label: 'Video Views (3s+)', group: 'Engagement & Video', tooltip: 'Number of times your video was played for at least 3 seconds.', format: 'number' },
  { key: 'thruplays', label: 'ThruPlays', group: 'Engagement & Video', tooltip: 'Number of times a video was played to completion or for at least 15 seconds.', format: 'number' },
];

const DEFAULT_OVERVIEW_METRICS = [
  'spend', 'leads', 'cost_per_lead', 'impressions', 'clicks', 'ctr', 'cpc', 'roas'
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
// IN-MEMORY STORE & SUPABASE CLIENT
// ============================================================================
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

const inMemoryStore = {
  leads: new Map(),
  forms: new Map(),
  views: new Map(),
};

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

  const db = getSupabase();
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
  const db = getSupabase();
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

async function queryLeads({ campaign, form, sheet, search, since, until }) {
  const db = getSupabase();

  if (db) {
    let q = db.from('meta_leads').select('*').order('created_time', { ascending: false });

    if (campaign) q = q.eq('campaign_id', campaign);
    if (form) q = q.eq('form_id', form);
    if (sheet) q = q.eq('sheet_name', sheet);
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
  if (sheet) items = items.filter(i => i.sheet_name === sheet);
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

async function querySheets() {
  const set = new Set();

  const parseEntries = (str) => {
    if (!str) return [];
    return str.split(',').map((item) => {
      const trimmed = item.trim();
      const pipeIdx = trimmed.indexOf('|');
      if (pipeIdx !== -1) {
        return trimmed.slice(0, pipeIdx).trim();
      }
      return '';
    }).filter(Boolean);
  };

  parseEntries(process.env.LEADS_SHEET_CSV_URLS).forEach((lbl) => set.add(lbl));
  parseEntries(process.env.LEADS_SHEET_CSV_URL).forEach((lbl) => set.add(lbl));

  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from('meta_leads').select('sheet_name').not('sheet_name', 'is', null);
    if (!error && data) {
      data.forEach((row) => {
        if (row.sheet_name && row.sheet_name.trim()) {
          set.add(row.sheet_name.trim());
        }
      });
      return Array.from(set).sort();
    }
  }

  Array.from(inMemoryStore.leads.values()).forEach((l) => {
    if (l.sheet_name && l.sheet_name.trim()) {
      set.add(l.sheet_name.trim());
    }
  });

  return Array.from(set).sort();
}

async function queryForms() {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from('meta_forms').select('*');
    if (!error && data && data.length > 0) {
      return data;
    }
  }

  return Array.from(inMemoryStore.forms.values());
}

async function getMetricView(scope) {
  const db = getSupabase();
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

  const db = getSupabase();
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
    let total = 0;
    for (const a of actions) {
      if (a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped') {
        total += parseFloat(String(a.value || '0'));
      }
    }
    return total;
  }

  if (typeKey === 'conversions' || typeKey === 'purchase') {
    let total = 0;
    for (const a of actions) {
      if (a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase') {
        total += parseFloat(String(a.value || '0'));
      }
    }
    return total;
  }

  const found = actions.find(a => a.action_type === typeKey);
  return found ? parseFloat(String(found.value || '0')) : 0;
}

function parseCostPerAction(costs, typeKey) {
  if (!costs || !Array.isArray(costs)) return 0;

  if (typeKey === 'lead') {
    const leadCost = costs.find(c => c.action_type === 'lead' || c.action_type === 'onsite_conversion.lead_grouped');
    return leadCost ? parseFloat(String(leadCost.value || '0')) : 0;
  }

  if (typeKey === 'conversions' || typeKey === 'purchase') {
    const purchaseCost = costs.find(c => c.action_type === 'purchase' || c.action_type === 'offsite_conversion.fb_pixel_purchase');
    return purchaseCost ? parseFloat(String(purchaseCost.value || '0')) : 0;
  }

  const found = costs.find(c => c.action_type === typeKey);
  return found ? parseFloat(String(found.value || '0')) : 0;
}

function parseRoas(purchaseRoas) {
  if (!purchaseRoas || !Array.isArray(purchaseRoas)) return 0;
  const roasObj = purchaseRoas.find(r => r.action_type === 'omni_purchase' || r.action_type === 'purchase');
  return roasObj ? parseFloat(String(roasObj.value || '0')) : 0;
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
  const res = await metaFetch(`/${adAccountId}/campaigns`, {
    fields: 'name,status,objective,daily_budget,lifetime_budget',
    limit: '250',
  });
  return res.data || [];
}

async function getLeadgenForms() {
  const { pageId } = getMetaConfig();
  if (!pageId) {
    throw new Error('META_PAGE_ID environment variable is not configured.');
  }
  const res = await metaFetch(`/${pageId}/leadgen_forms`, {
    fields: 'id,name,created_time,status,leads_count',
  });
  return res.data || [];
}

async function getFormLeads(formId) {
  const res = await metaFetch(`/${formId}/leads`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
    limit: '500',
  });
  return res.data || [];
}

async function getLeadById(leadId) {
  const res = await metaFetch(`/${leadId}`, {
    fields: 'id,field_data,created_time,ad_id,adset_id,campaign_id,form_id',
  });
  return res;
}

async function testMetaConnection() {
  const { token, adAccountId } = getMetaConfig();
  if (!token || !adAccountId) {
    return {
      success: false,
      error: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables are required.',
    };
  }

  const res = await metaFetch(`/${adAccountId}`, {
    fields: 'name,currency,account_status,business_name',
  }, false);

  return {
    success: true,
    accountName: res.name || 'Ad Account',
    currency: res.currency || 'USD',
    accountStatus: res.account_status,
    businessName: res.business_name || 'N/A',
  };
}

// ============================================================================
// EXPRESS APP & ROUTING
// ============================================================================
const router = express.Router();

router.use((req, res, next) => {
  if (!req.url || req.url === '/' || req.url === '') {
    if (req.query && req.query.path) {
      const segments = Array.isArray(req.query.path)
        ? req.query.path
        : [req.query.path];
      req.url = '/' + segments.join('/');
    }
  }
  next();
});

// GET /overview
router.get(['/overview', '/api/overview'], async (req, res) => {
  const { since, until } = extractDateParams(req);
  const metricsParam = req.query.metrics;
  const requestedMetrics = metricsParam ? metricsParam.split(',').filter(Boolean) : DEFAULT_OVERVIEW_METRICS;

  const defaultKpis = requestedMetrics.map((key) => {
    const def = METRIC_CATALOG.find((m) => m.key === key);
    return {
      key,
      label: def?.label || key,
      value: 0,
      format: def?.format || 'number',
    };
  });

  const { hasToken } = getMetaConfig();
  if (!hasToken) {
    return res.json({
      kpis: defaultKpis,
      timeSeries: [],
      topCampaigns: [],
      warning: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables are required.',
      since,
      until,
    });
  }

  try {
    const insights = await getInsights({ level: 'account', since, until });
    const accountData = insights[0] || {};

    let timeSeries = [];
    try {
      timeSeries = await getTimeSeries({ since, until });
    } catch (e) {
      // Ignore isolated time series errors
    }

    let campaignInsights = [];
    try {
      campaignInsights = await getInsights({ level: 'campaign', since, until });
    } catch (e) {
      // Ignore isolated top campaign errors
    }

    const topCampaigns = campaignInsights
      .map((c) => {
        const cSpend = parseFloat(c.spend || '0');
        const cLeads = parseActions(c.actions, 'lead');
        const cCpl = cLeads ? cSpend / cLeads : 0;
        return {
          id: c.campaign_id, // Real numeric Meta campaign ID (15-17 digits)
          name: c.campaign_name || `Campaign ${c.campaign_id}`,
          spend: cSpend,
          leads: cLeads,
          cost_per_lead: cCpl,
        };
      })
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5);

    const spend = parseFloat(accountData.spend || '0');
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
      spend,
      impressions,
      reach,
      frequency,
      clicks,
      link_clicks: linkClicks,
      ctr,
      cpc,
      cpm,
      leads,
      cost_per_lead: costPerLead,
      results: leads || conversions || clicks,
      cost_per_result: costPerLead || costPerConversion || cpc,
      conversions,
      cost_per_conversion: costPerConversion,
      roas,
      landing_page_views: landingPageViews,
      post_engagement: postEngagement,
      video_views: videoViews,
      thruplays,
    };

    const kpis = requestedMetrics.map((key) => {
      const def = METRIC_CATALOG.find((m) => m.key === key);
      return {
        key,
        label: def?.label || key,
        value: valueMap[key] ?? 0,
        format: def?.format || 'number',
      };
    });

    res.json({
      kpis,
      timeSeries,
      topCampaigns,
      since,
      until,
    });
  } catch (err) {
    res.json({
      kpis: defaultKpis,
      timeSeries: [],
      topCampaigns: [],
      warning: err.message || 'Failed to fetch overview metrics from Meta Graph API.',
      since,
      until,
    });
  }
});

// GET /campaigns
router.get(['/campaigns', '/api/campaigns'], async (req, res) => {
  const { since, until } = extractDateParams(req);
  const level = req.query.level || 'campaign';
  const parentId = req.query.parent_id;
  const { hasToken } = getMetaConfig();

  if (!hasToken) {
    return res.json({
      level,
      items: [],
      warning: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables are required.',
      since,
      until,
    });
  }

  try {
    if (level === 'campaign') {
      let campaignsList = [];
      try {
        campaignsList = await getCampaigns();
      } catch (e) {
        // Continue with insights if campaigns list is blocked
      }

      const campaignMap = new Map();
      campaignsList.forEach((c) => campaignMap.set(c.id, c));

      const insights = await getInsights({ level: 'campaign', since, until });
      const insightsMap = new Map();
      insights.forEach((item) => {
        if (item.campaign_id) {
          insightsMap.set(item.campaign_id, item);
        }
      });

      const allCampaignIds = Array.from(new Set([...campaignMap.keys(), ...insightsMap.keys()]));

      const items = allCampaignIds.map((id) => {
        const cMeta = campaignMap.get(id);
        const item = insightsMap.get(id) || {};

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

        return {
          id, // Real numeric Meta campaign ID (15-17 digits)
          name: cMeta?.name || item.campaign_name || `Campaign ${id}`,
          level: 'campaign',
          status: cMeta?.status || 'ACTIVE',
          objective: cMeta?.objective || 'OUTCOME_LEADS',
          daily_budget: cMeta?.daily_budget,
          lifetime_budget: cMeta?.lifetime_budget,
          campaign_id: id,
          insights: {
            spend,
            impressions,
            reach,
            frequency,
            clicks,
            ctr,
            cpc,
            cpm,
            leads,
            cost_per_lead: costPerLead,
            results: leads || conversions || clicks,
            cost_per_result: costPerLead || costPerConversion || cpc,
            conversions,
            cost_per_conversion: costPerConversion,
            roas,
          },
        };
      });

      return res.json({
        level: 'campaign',
        items,
        since,
        until,
      });
    }

    const insights = await getInsights({ level, since, until });
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

      const id = item[`${level}_id`] || item.campaign_id || 'unknown';
      const name = item[`${level}_name`] || item.campaign_name || 'Unnamed';

      return {
        id,
        name,
        level,
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        campaign_id: item.campaign_id,
        adset_id: item.adset_id,
        ad_id: item.ad_id,
        insights: {
          spend,
          impressions,
          reach,
          frequency,
          clicks,
          ctr,
          cpc,
          cpm,
          leads,
          cost_per_lead: costPerLead,
          results: leads || conversions || clicks,
          cost_per_result: costPerLead || costPerConversion || cpc,
          conversions,
          cost_per_conversion: costPerConversion,
          roas,
        },
      };
    });

    if (parentId) {
      if (level === 'adset') {
        items = items.filter((i) => i.campaign_id === parentId);
      } else if (level === 'ad') {
        items = items.filter((i) => i.adset_id === parentId);
      }
    }

    res.json({
      level,
      items,
      since,
      until,
    });
  } catch (err) {
    res.json({
      level,
      items: [],
      warning: err.message || 'Failed to fetch campaigns from Meta API.',
      since,
      until,
    });
  }
});

// GET /insights
router.get(['/insights', '/api/insights'], async (req, res) => {
  const breakdown = req.query.breakdown || 'publisher_platform';
  const { since, until } = extractDateParams(req);
  const { hasToken } = getMetaConfig();

  if (!hasToken) {
    return res.json({
      breakdown,
      items: [],
      warning: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables are required.',
    });
  }

  try {
    const insights = await getInsights({ level: 'account', since, until, breakdowns: breakdown });

    const items = insights.map((item) => {
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

    res.json({ breakdown, items });
  } catch (err) {
    res.json({
      breakdown,
      items: [],
      warning: err.message || 'Failed to fetch breakdown insights from Meta API.',
    });
  }
});

// GET & POST /views
router.get(['/views', '/api/views'], async (req, res) => {
  try {
    const scope = req.query.scope || 'overview';
    const view = await getMetricView(scope);
    res.json({
      scope,
      name: view?.name || 'Default',
      metrics: view?.metrics || DEFAULT_OVERVIEW_METRICS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error fetching views' });
  }
});

router.post(['/views', '/api/views'], async (req, res) => {
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
router.get(['/leads', '/api/leads'], async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign;
    const form = req.query.form;
    const sheet = req.query.sheet;
    const search = req.query.search;

    const leads = await queryLeads({ campaign, form, sheet, search, since, until });
    const sheets = await querySheets();
    res.json({ items: leads, count: leads.length, sheets });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error querying leads' });
  }
});

// GET /leads/export
router.get(['/leads/export', '/api/leads/export'], async (req, res) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign;
    const form = req.query.form;
    const sheet = req.query.sheet;
    const search = req.query.search;

    const leads = await queryLeads({ campaign, form, sheet, search, since, until });

    const headers = ['Lead ID', 'Full Name', 'Phone', 'Email', 'Campaign ID', 'Form ID', 'Created Time'];
    const rows = leads.map((l) => [
      `"${l.id}"`,
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${l.campaign_id || ''}"`,
      `"${l.form_id || ''}"`,
      `"${l.created_time || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=meta-leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error exporting leads' });
  }
});

// POST /leads/sync & sync-cron
const handleSyncLeads = async (req, res) => {
  try {
    const { pageId } = getMetaConfig();
    if (!pageId) {
      return res.status(400).json({ error: 'META_PAGE_ID environment variable is required to sync leadgen forms and leads.' });
    }

    const forms = await getLeadgenForms();
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
        console.error(`Error syncing leads for form ${form.id}:`, err.message);
      }
    }

    res.json({
      success: true,
      formsSynced: forms.length,
      leadsSynced: totalLeadsSynced,
      message: `Successfully synced ${forms.length} forms and ${totalLeadsSynced} leads from Meta Page.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to sync leads from Meta API.' });
  }
};

router.post('/leads/sync', handleSyncLeads);
router.post('/api/leads/sync', handleSyncLeads);
router.post('/leads/sync-cron', handleSyncLeads);
router.post('/api/leads/sync-cron', handleSyncLeads);
router.get('/leads/sync-cron', handleSyncLeads);
router.get('/api/leads/sync-cron', handleSyncLeads);

// GET & POST /leads/sync-sheet
const handleSheetSync = async (req, res) => {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = req.query.secret;

  if (expectedSecret && providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid secret.' });
  }

  try {
    const csvEntries = [];
    if (process.env.LEADS_SHEET_PUBHTML_URL) {
      try {
        const pubhtmlUrl = process.env.LEADS_SHEET_PUBHTML_URL.trim();
        if (pubhtmlUrl) {
          const response = await fetch(pubhtmlUrl);
          if (response.ok) {
            const htmlText = await response.text();

            let baseUrl = pubhtmlUrl.split('?')[0].trim();
            if (baseUrl.endsWith('/pubhtml')) {
              baseUrl = baseUrl.slice(0, -'/pubhtml'.length) + '/pub';
            } else {
              baseUrl = baseUrl.replace(/\/pubhtml\b/, '/pub');
            }

            const regex = /name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]*?gid=(\d+)"/g;
            const seenGids = new Set();

            let match;
            while ((match = regex.exec(htmlText)) !== null) {
              const tabName = match[1].trim();
              const gid = match[2].trim();
              if (gid && !seenGids.has(gid)) {
                seenGids.add(gid);
                const csvUrl = `${baseUrl}?gid=${gid}&single=true&output=csv`;
                csvEntries.push({ label: tabName, url: csvUrl });
              }
            }

            if (csvEntries.length === 0) {
              const altRegex = /name:\s*["']([^"']+)["'][\s\S]*?gid=(\d+)/g;
              let altMatch;
              while ((altMatch = altRegex.exec(htmlText)) !== null) {
                const tabName = altMatch[1].trim();
                const gid = altMatch[2].trim();
                if (gid && !seenGids.has(gid)) {
                  seenGids.add(gid);
                  const csvUrl = `${baseUrl}?gid=${gid}&single=true&output=csv`;
                  csvEntries.push({ label: tabName, url: csvUrl });
                }
              }
            }
          } else {
            console.warn(`LEADS_SHEET_PUBHTML_URL returned HTTP ${response.status}`);
          }
        }
      } catch (err) {
        console.error('Error auto-discovering tabs from LEADS_SHEET_PUBHTML_URL:', err);
      }
    }

    if (csvEntries.length === 0) {
      const rawItems = [];
      if (process.env.LEADS_SHEET_CSV_URLS) {
        rawItems.push(...process.env.LEADS_SHEET_CSV_URLS.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (process.env.LEADS_SHEET_CSV_URL) {
        rawItems.push(...process.env.LEADS_SHEET_CSV_URL.split(',').map((s) => s.trim()).filter(Boolean));
      }

      const seenUrls = new Set();
      for (const item of rawItems) {
        let label = '';
        let url = item;
        const pipeIdx = item.indexOf('|');
        if (pipeIdx !== -1) {
          label = item.slice(0, pipeIdx).trim();
          url = item.slice(pipeIdx + 1).trim();
        } else {
          url = item.trim();
        }
        if (!url) continue;

        if (!label) {
          const match = url.match(/[?&]gid=([0-9a-zA-Z_-]+)/) || url.match(/gid=([0-9a-zA-Z_-]+)/);
          if (match && match[1]) {
            label = `gid ${match[1]}`;
          } else {
            label = `gid unknown`;
          }
        }

        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          csvEntries.push({ label, url });
        }
      }
    }

    if (csvEntries.length === 0) {
      return res.status(400).json({ error: 'LEADS_SHEET_PUBHTML_URL, LEADS_SHEET_CSV_URLS or LEADS_SHEET_CSV_URL environment variable is not configured.' });
    }

    const parseCsvText = (text) => {
      const lines = [];
      let currentRow = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          currentRow.push(currentCell.trim());
          lines.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }

      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        lines.push(currentRow);
      }

      if (lines.length === 0) return { headers: [], rows: [] };

      const headers = lines[0].map((h) => h.trim());
      while (headers.length > 0 && headers[headers.length - 1] === '') {
        headers.pop();
      }

      const rows = lines.slice(1).filter((r) => r.some((c) => c && c.trim() !== ''));
      return { headers, rows };
    };

    const cleanPrefix = (val, prefixRegex) => {
      if (!val) return '';
      let str = String(val).trim();
      return str.replace(prefixRegex, '').trim();
    };

    const normalizePhone = (raw) => {
      if (!raw) return '';
      let str = String(raw).trim();
      str = str.replace(/^p\s*:\s*/i, '').trim();
      let cleaned = str.replace(/\D/g, '');
      if (!cleaned) return '';
      if (/^0\d{10}$/.test(cleaned)) cleaned = cleaned.substring(1);
      if (/^\d{10}$/.test(cleaned)) cleaned = '91' + cleaned;
      return cleaned;
    };

    const crypto = await import('crypto');
    const generateHashId = (sheetName, phone, fullName, dateStr) => {
      const normSheet = (sheetName || '').trim().toLowerCase();
      const normPhone = (phone || '').trim().toLowerCase();
      const normName = (fullName || '').trim().toLowerCase();
      const normDate = (dateStr || '').trim().toLowerCase();
      const key = `${normSheet}|${normPhone}|${normName}|${normDate}`;
      const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 24);
      return `sheet_${hash}`;
    };

    const FIELD_ALIASES = {
      id: ['id', 'lead_id', 'leadid'],
      full_name: ['full_name', 'full name', 'fullname', 'name'],
      phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'contact'],
      email: ['email', 'e-mail'],
      campaign_id: ['campaign_id', 'campaignid'],
      campaign_name: ['campaign_name', 'campaignname', 'campaign'],
      form_id: ['form_id', 'formid'],
      form_name: ['form_name', 'formname', 'form'],
      created_time: ['created_time', 'createdtime', 'created', 'date', 'submission date', 'timestamp'],
      ad_id: ['ad_id', 'adid'],
      ad_name: ['ad_name', 'adname', 'ad'],
      adset_id: ['adset_id', 'adsetid'],
      adset_name: ['adset_name', 'adsetname', 'adset'],
      state: ['state'],
      city: ['city'],
      lead_status: ['lead_status', 'leadstatus', 'status'],
      remarks: ['remarks', 'notes', 'remark'],
      platform: ['platform'],
      is_organic: ['is_organic', 'isorganic'],
    };

    const findColIndices = (headers, aliases) => {
      const normAliases = aliases.map((a) => a.trim().toLowerCase());
      const indices = [];
      headers.forEach((h, idx) => {
        const normH = h.trim().toLowerCase();
        if (normAliases.includes(normH)) {
          indices.push(idx);
        }
      });
      return indices;
    };

    const getColValue = (row, indices) => {
      for (const idx of indices) {
        if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
          const v = String(row[idx]).trim();
          if (v) return v;
        }
      }
      return '';
    };

    const leadsMap = new Map();
    let skipped = 0;
    const perSheet = [];

    for (const entry of csvEntries) {
      let sheetCount = 0;
      const sheetLabel = entry.label;

      try {
        const response = await fetch(entry.url);
        if (!response.ok) {
          console.warn(`Failed to fetch CSV from URL ${entry.url} (HTTP ${response.status})`);
          perSheet.push({ sheet_name: sheetLabel, count: 0 });
          continue;
        }

        // Decode UTF-8 cleanly
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        let csvText = decoder.decode(buffer);
        if (csvText.startsWith('\uFEFF')) {
          csvText = csvText.slice(1);
        }

        const { headers, rows } = parseCsvText(csvText);

        if (headers.length === 0 || rows.length === 0) {
          perSheet.push({ sheet_name: sheetLabel, count: 0 });
          continue;
        }

        const colIndices = {
          id: findColIndices(headers, FIELD_ALIASES.id),
          full_name: findColIndices(headers, FIELD_ALIASES.full_name),
          phone: findColIndices(headers, FIELD_ALIASES.phone),
          email: findColIndices(headers, FIELD_ALIASES.email),
          campaign_id: findColIndices(headers, FIELD_ALIASES.campaign_id),
          campaign_name: findColIndices(headers, FIELD_ALIASES.campaign_name),
          form_id: findColIndices(headers, FIELD_ALIASES.form_id),
          form_name: findColIndices(headers, FIELD_ALIASES.form_name),
          created_time: findColIndices(headers, FIELD_ALIASES.created_time),
          ad_id: findColIndices(headers, FIELD_ALIASES.ad_id),
          ad_name: findColIndices(headers, FIELD_ALIASES.ad_name),
          adset_id: findColIndices(headers, FIELD_ALIASES.adset_id),
          adset_name: findColIndices(headers, FIELD_ALIASES.adset_name),
          state: findColIndices(headers, FIELD_ALIASES.state),
          city: findColIndices(headers, FIELD_ALIASES.city),
          lead_status: findColIndices(headers, FIELD_ALIASES.lead_status),
          remarks: findColIndices(headers, FIELD_ALIASES.remarks),
          platform: findColIndices(headers, FIELD_ALIASES.platform),
          is_organic: findColIndices(headers, FIELD_ALIASES.is_organic),
        };

        for (const row of rows) {
          if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
            skipped++;
            continue;
          }

          const rawId = getColValue(row, colIndices.id);
          const rawFullName = getColValue(row, colIndices.full_name);
          const rawPhone = getColValue(row, colIndices.phone);
          const rawEmail = getColValue(row, colIndices.email);
          const rawCampaignId = getColValue(row, colIndices.campaign_id);
          const campaignName = getColValue(row, colIndices.campaign_name);
          const rawFormId = getColValue(row, colIndices.form_id);
          const formName = getColValue(row, colIndices.form_name);
          const rawCreatedTime = getColValue(row, colIndices.created_time);
          const rawAdId = getColValue(row, colIndices.ad_id);
          const adName = getColValue(row, colIndices.ad_name);
          const rawAdsetId = getColValue(row, colIndices.adset_id);
          const adsetName = getColValue(row, colIndices.adset_name);
          const state = getColValue(row, colIndices.state);
          const city = getColValue(row, colIndices.city);
          const leadStatus = getColValue(row, colIndices.lead_status);
          const remarks = getColValue(row, colIndices.remarks);
          const platform = getColValue(row, colIndices.platform);
          const isOrganic = getColValue(row, colIndices.is_organic);

          // Clean prefixes
          const cleanLeadId = cleanPrefix(rawId, /^l\s*:\s*/i);
          const phone = normalizePhone(rawPhone);
          const fullName = rawFullName.trim();
          const email = rawEmail.trim();
          const campaignId = cleanPrefix(rawCampaignId, /^c\s*:\s*/i);
          const formId = cleanPrefix(rawFormId, /^f\s*:\s*/i);
          const adId = cleanPrefix(rawAdId, /^ag\s*:\s*/i);
          const adsetId = cleanPrefix(rawAdsetId, /^as\s*:\s*/i);

          // SKIP any row with neither a phone NOR a name. Do NOT create "Anonymous" rows.
          if (!fullName && !phone) {
            skipped++;
            continue;
          }

          let createdTime = new Date().toISOString();
          if (rawCreatedTime) {
            const parsed = new Date(rawCreatedTime);
            if (!isNaN(parsed.getTime())) createdTime = parsed.toISOString();
          }

          const finalLeadId = cleanLeadId || generateHashId(sheetLabel, phone, fullName, rawCreatedTime || createdTime);

          const fieldData = [];
          if (fullName) fieldData.push({ name: 'full_name', values: [fullName] });
          if (phone) fieldData.push({ name: 'phone', values: [phone] });
          if (email) fieldData.push({ name: 'email', values: [email] });
          if (campaignName) fieldData.push({ name: 'campaign_name', values: [campaignName] });
          if (adsetName) fieldData.push({ name: 'adset_name', values: [adsetName] });
          if (adName) fieldData.push({ name: 'ad_name', values: [adName] });
          if (formName) fieldData.push({ name: 'form_name', values: [formName] });
          if (state) fieldData.push({ name: 'state', values: [state] });
          if (city) fieldData.push({ name: 'city', values: [city] });
          if (leadStatus) fieldData.push({ name: 'lead_status', values: [leadStatus] });
          if (remarks) fieldData.push({ name: 'Remarks', values: [remarks] });
          if (platform) fieldData.push({ name: 'platform', values: [platform] });
          if (isOrganic) fieldData.push({ name: 'is_organic', values: [isOrganic] });
          if (sheetLabel) fieldData.push({ name: 'sheet_name', values: [sheetLabel] });
          fieldData.push({ name: 'source', values: ['sheet'] });

          leadsMap.set(finalLeadId, {
            id: finalLeadId,
            full_name: fullName,
            phone: phone,
            email: email,
            campaign_id: campaignId || null,
            campaign_name: campaignName || null,
            adset_id: adsetId || null,
            adset_name: adsetName || null,
            ad_id: adId || null,
            ad_name: adName || null,
            form_id: formId || null,
            form_name: formName || null,
            sheet_name: sheetLabel,
            field_data: fieldData,
            created_time: createdTime,
            source: 'sheet',
            synced_at: new Date().toISOString(),
          });
          sheetCount++;
        }

        perSheet.push({ sheet_name: sheetLabel, count: sheetCount });
      } catch (err) {
        console.error(`Error processing sheet URL ${entry.url}:`, err);
        perSheet.push({ sheet_name: sheetLabel, count: 0 });
      }
    }

    const leadsToUpsert = Array.from(leadsMap.values());
    const total = leadsToUpsert.length;

    const db = getSupabase();
    let imported = 0;

    if (db && leadsToUpsert.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < leadsToUpsert.length; i += BATCH_SIZE) {
        const batch = leadsToUpsert.slice(i, i + BATCH_SIZE);
        const payload = batch.map((l) => ({
          id: l.id,
          full_name: l.full_name || '',
          phone: l.phone || '',
          email: l.email || '',
          field_data: l.field_data || [],
          campaign_id: l.campaign_id || null,
          campaign_name: l.campaign_name || null,
          adset_id: l.adset_id || null,
          ad_id: l.ad_id || null,
          form_id: l.form_id || null,
          sheet_name: l.sheet_name || null,
          created_time: l.created_time || new Date().toISOString(),
          synced_at: l.synced_at || new Date().toISOString(),
        }));

        const { data, error } = await db
          .from('meta_leads')
          .upsert(payload, { onConflict: 'id' })
          .select('id');

        if (error) {
          console.error('Supabase batch upsert error:', error);
          throw new Error(`Supabase Upsert Error: ${error.message} (${error.code || ''}) ${error.details || ''}`);
        } else {
          imported += data ? data.length : batch.length;
        }
      }
    } else if (!db) {
      for (const l of leadsToUpsert) {
        inMemoryStore.leads.set(l.id, l);
        imported++;
      }
    }

    return res.json({
      total,
      imported,
      skipped,
      errors: 0,
      perSheet,
    });
  } catch (err) {
    console.error('Sheet Sync Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to sync leads from Google Sheet.',
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 1,
    });
  }
};

router.get(['/leads/sync-sheet', '/api/leads/sync-sheet'], handleSheetSync);
router.post(['/leads/sync-sheet', '/api/leads/sync-sheet'], handleSheetSync);

// GET /forms
router.get(['/forms', '/api/forms'], async (req, res) => {
  try {
    const { pageId } = getMetaConfig();
    if (!pageId) {
      return res.status(400).json({ error: 'META_PAGE_ID environment variable is not configured.' });
    }

    const forms = await getLeadgenForms();
    for (const form of forms) {
      await upsertForm({ id: form.id, name: form.name, page_id: pageId });
    }

    res.json({ items: forms });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch leadgen forms from Meta Page.' });
  }
});

// GET /settings
router.get(['/settings', '/api/settings'], (req, res) => {
  try {
    const config = getMetaConfig();
    const rawHost = req.headers?.host || process.env.VERCEL_URL || 'localhost:3000';
    const cleanHost = rawHost.replace(/^https?:\/\//, '');

    let appUrl = `https://${cleanHost}`;
    if (process.env.APP_URL) {
      let customUrl = process.env.APP_URL.trim().replace(/\/$/, '');
      if (!customUrl.startsWith('http://') && !customUrl.startsWith('https://')) {
        customUrl = `https://${customUrl}`;
      }
      appUrl = customUrl;
    }

    let webhookUrl = `${appUrl}/api/meta/webhook`;
    if (webhookUrl.startsWith('http://')) {
      webhookUrl = webhookUrl.replace('http://', 'https://');
    }

    res.json({
      adAccountId: config.adAccountId || 'Not set',
      pageId: config.pageId || 'Not set',
      webhookUrl,
      verifyToken: config.verifyToken || 'Not set',
      hasToken: !!process.env.META_ACCESS_TOKEN,
      hasSupabase: !!process.env.SUPABASE_URL,
      cronSecret: process.env.CRON_SECRET || '',
      hasSheetUrl: !!(process.env.LEADS_SHEET_PUBHTML_URL || process.env.LEADS_SHEET_CSV_URLS || process.env.LEADS_SHEET_CSV_URL),
      appUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error fetching settings' });
  }
});

// GET /test-connection
router.get(['/test-connection', '/api/test-connection'], async (req, res) => {
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
const handleWebhookGet = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.META_LEADGEN_VERIFY_TOKEN || getMetaConfig().verifyToken;

    if (mode === 'subscribe' && token && token === verifyToken) {
      console.log('Webhook verification successful.');
      return res.status(200).send(String(challenge || ''));
    }

    res.status(403).send('Forbidden');
  } catch (err) {
    res.status(500).send('Error');
  }
};

router.get('/meta/webhook', handleWebhookGet);
router.get('/api/meta/webhook', handleWebhookGet);

const handleWebhookPost = async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body && body.object === 'page' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen' && change.value?.leadgen_id) {
              const leadgenId = change.value.leadgen_id;
              console.log(`Webhook leadgen event for ID: ${leadgenId}`);

              const lead = await getLeadById(leadgenId);
              if (lead) {
                await upsertLead({
                  id: lead.id || leadgenId,
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
    console.error('Webhook processing error:', err.message);
  }
};

router.post('/meta/webhook', handleWebhookPost);
router.post('/api/meta/webhook', handleWebhookPost);

export default function handler(req, res) {
  return router(req, res, (err) => {
    if (err) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      res.status(404).json({ error: 'Route Not Found' });
    }
  });
}
