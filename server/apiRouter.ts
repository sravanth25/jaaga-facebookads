import { Router, Request, Response } from 'express';
import {
  getMetaConfig,
  getInsights,
  getTimeSeries,
  getCampaigns,
  getLeadgenForms,
  getFormLeads,
  getLeadById,
  testMetaConnection,
  parseActions,
  parseCostPerAction,
  parseRoas,
} from './metaService';
import {
  queryLeads,
  queryForms,
  upsertLead,
  upsertForm,
  getMetricView,
  saveMetricView,
  hasSupabaseConfig,
} from './supabaseService';
import { getDatePresetBounds } from '../src/lib/formatters';
import { METRIC_CATALOG, DEFAULT_OVERVIEW_METRICS } from '../src/lib/metrics';

export const apiRouter = Router();

// Helper to handle date range query params
function extractDateParams(req: Request) {
  const rangeType = (req.query.range as string) || '30d';
  const since = req.query.since as string;
  const until = req.query.until as string;
  return getDatePresetBounds(rangeType, since, until);
}

// -------------------------------------------------------------
// GET /api/overview
// -------------------------------------------------------------
apiRouter.get('/overview', async (req: Request, res: Response) => {
  const { since, until } = extractDateParams(req);
  const metricsParam = req.query.metrics as string;
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
    // 1. Fetch account level insights from Meta Graph API
    const insights = await getInsights({
      level: 'account',
      since,
      until,
    });
    const accountData = insights[0] || {};

    // 2. Fetch daily time series
    let timeSeries: any[] = [];
    try {
      timeSeries = await getTimeSeries({ since, until });
    } catch (e) {
      // Time series can fail independently if permission is limited
    }

    // 3. Fetch campaign insights for top campaigns by leads
    let campaignInsights: any[] = [];
    try {
      campaignInsights = await getInsights({
        level: 'campaign',
        since,
        until,
      });
    } catch (e) {
      // Top campaigns can fail independently
    }

    const topCampaigns = campaignInsights
      .map((c: any) => {
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
      .sort((a: any, b: any) => b.leads - a.leads)
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

    const valueMap: Record<string, number> = {
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
  } catch (err: any) {
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

// -------------------------------------------------------------
// GET /api/campaigns (and drilldown to adsets/ads)
// -------------------------------------------------------------
apiRouter.get('/campaigns', async (req: Request, res: Response) => {
  const { since, until } = extractDateParams(req);
  const level = ((req.query.level as string) || 'campaign') as 'campaign' | 'adset' | 'ad';
  const parentId = req.query.parent_id as string;
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
      // 1. Get raw campaigns list (name, status, objective, daily_budget, lifetime_budget)
      let campaignsList: any[] = [];
      try {
        campaignsList = await getCampaigns();
      } catch (e) {
        // Continue with insights if raw campaign list endpoint is restricted
      }

      const campaignMap = new Map<string, any>();
      campaignsList.forEach((c: any) => campaignMap.set(c.id, c));

      // 2. Get Insights at campaign level
      const insights = await getInsights({
        level: 'campaign',
        since,
        until,
      });

      const insightsMap = new Map<string, any>();
      insights.forEach((item: any) => {
        if (item.campaign_id) {
          insightsMap.set(item.campaign_id, item);
        }
      });

      // Combine all unique campaign IDs from campaigns list & insights
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

    // Handle adset or ad drilldowns
    const insights = await getInsights({ level, since, until });

    let items = insights.map((item: any) => {
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
        items = items.filter((i: any) => i.campaign_id === parentId);
      } else if (level === 'ad') {
        items = items.filter((i: any) => i.adset_id === parentId);
      }
    }

    res.json({
      level,
      items,
      since,
      until,
    });
  } catch (err: any) {
    res.json({
      level,
      items: [],
      warning: err.message || 'Failed to fetch campaign insights from Meta API.',
      since,
      until,
    });
  }
});

// -------------------------------------------------------------
// GET /api/insights (Breakdowns for Analytics view)
// -------------------------------------------------------------
apiRouter.get('/insights', async (req: Request, res: Response) => {
  const breakdown = (req.query.breakdown as string) || 'publisher_platform';
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
    const insights = await getInsights({
      level: 'account',
      since,
      until,
      breakdowns: breakdown,
    });

    const items = insights.map((item: any) => {
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

      return {
        name,
        spend,
        leads,
        impressions,
        clicks,
      };
    });

    res.json({ breakdown, items });
  } catch (err: any) {
    res.json({
      breakdown,
      items: [],
      warning: err.message || 'Failed to fetch breakdown insights from Meta API.',
    });
  }
});

// -------------------------------------------------------------
// GET & POST /api/views (Custom metrics views)
// -------------------------------------------------------------
apiRouter.get('/views', async (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as 'overview' | 'campaigns') || 'overview';
    const view = await getMetricView(scope);
    const defaultMetrics = scope === 'overview' ? DEFAULT_OVERVIEW_METRICS : [];

    res.json({
      scope,
      name: view?.name || 'Default',
      metrics: view?.metrics || defaultMetrics,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching views' });
  }
});

apiRouter.post('/views', async (req: Request, res: Response) => {
  try {
    const { scope, name, metrics } = req.body;
    if (!scope || !Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Scope and array of metrics are required.' });
    }

    const saved = await saveMetricView(scope, name || 'Custom View', metrics);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error saving view' });
  }
});

// -------------------------------------------------------------
// GET /api/leads
// -------------------------------------------------------------
apiRouter.get('/leads', async (req: Request, res: Response) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign as string;
    const form = req.query.form as string;
    const search = req.query.search as string;

    const leads = await queryLeads({
      campaign,
      form,
      search,
      since,
      until,
    });

    res.json({ items: leads, count: leads.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error querying leads' });
  }
});

// -------------------------------------------------------------
// GET /api/leads/export (CSV export)
// -------------------------------------------------------------
apiRouter.get('/leads/export', async (req: Request, res: Response) => {
  try {
    const { since, until } = extractDateParams(req);
    const campaign = req.query.campaign as string;
    const form = req.query.form as string;
    const search = req.query.search as string;

    const leads = await queryLeads({
      campaign,
      form,
      search,
      since,
      until,
    });

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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error exporting leads' });
  }
});

// -------------------------------------------------------------
// POST /api/leads/sync & POST/GET /api/leads/sync-cron
// -------------------------------------------------------------
const handleLeadSync = async (req: Request, res: Response) => {
  try {
    const { pageId } = getMetaConfig();
    if (!pageId) {
      return res.status(400).json({ error: 'META_PAGE_ID environment variable is required to sync leadgen forms and leads.' });
    }

    // 1. Fetch lead forms via GET /{META_PAGE_ID}/leadgen_forms
    const forms = await getLeadgenForms();
    let totalLeadsSynced = 0;

    for (const form of forms) {
      await upsertForm({
        id: form.id,
        name: form.name,
        page_id: pageId,
      });

      // 2. Fetch leads for each form via GET /{form_id}/leads
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
      } catch (err: any) {
        console.error(`Error syncing leads for form ${form.id}:`, err.message);
      }
    }

    res.json({
      success: true,
      formsSynced: forms.length,
      leadsSynced: totalLeadsSynced,
      message: `Successfully synced ${forms.length} forms and ${totalLeadsSynced} leads from Meta Page.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to sync leads from Meta API.' });
  }
};

apiRouter.post('/leads/sync', handleLeadSync);
apiRouter.post('/leads/sync-cron', handleLeadSync);
apiRouter.get('/leads/sync-cron', handleLeadSync);

// -------------------------------------------------------------
// GET /api/forms
// -------------------------------------------------------------
apiRouter.get('/forms', async (req: Request, res: Response) => {
  const { pageId } = getMetaConfig();
  if (!pageId) {
    return res.json({ items: [], warning: 'META_PAGE_ID environment variable is not configured.' });
  }

  try {
    // Fetch lead forms directly via GET /{META_PAGE_ID}/leadgen_forms
    const forms = await getLeadgenForms();
    for (const form of forms) {
      await upsertForm({
        id: form.id,
        name: form.name,
        page_id: pageId,
      });
    }

    res.json({ items: forms });
  } catch (err: any) {
    res.json({ items: [], warning: err.message || 'Failed to fetch leadgen forms from Meta Page.' });
  }
});

// -------------------------------------------------------------
// GET /api/settings
// -------------------------------------------------------------
apiRouter.get('/settings', (req: Request, res: Response) => {
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
    appUrl,
  });
});

// -------------------------------------------------------------
// GET /api/test-connection
// -------------------------------------------------------------
apiRouter.get('/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await testMetaConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Meta connection test failed.',
    });
  }
});

// -------------------------------------------------------------
// GET & POST /api/meta/webhook (Leadgen Webhook)
// -------------------------------------------------------------
apiRouter.get('/meta/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_LEADGEN_VERIFY_TOKEN || getMetaConfig().verifyToken;

  if (mode === 'subscribe' && token && token === verifyToken) {
    console.log('Webhook verification successful.');
    return res.status(200).send(String(challenge || ''));
  }

  res.status(403).send('Forbidden');
});

apiRouter.post('/meta/webhook', async (req: Request, res: Response) => {
  // Respond 200 fast as required by Meta Webhooks
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body && body.object === 'page' && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen' && change.value?.leadgen_id) {
              const leadgenId = change.value.leadgen_id;
              console.log(`Received leadgen webhook event for lead ID: ${leadgenId}`);

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
  } catch (err: any) {
    console.error('Error processing leadgen webhook:', err.message);
  }
});
