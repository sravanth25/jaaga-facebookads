import { METRIC_CATALOG } from '../src/lib/metrics';

export function generateSampleTimeSeries(sinceStr: string, untilStr: string) {
  const start = new Date(sinceStr);
  const end = new Date(untilStr);

  const points: Array<{ date: string; spend: number; leads: number; impressions: number; clicks: number }> = [];

  // Loop day by day
  const curr = new Date(start);
  let dayIdx = 0;
  while (curr <= end && points.length < 90) {
    const isoDate = curr.toISOString().split('T')[0];
    
    // Create subtle realistic variation
    const dayFactor = 1 + Math.sin(dayIdx * 0.8) * 0.25;
    const spend = Math.round(3500 * dayFactor);
    const leads = Math.max(2, Math.round(12 * dayFactor));
    const impressions = Math.round(28000 * dayFactor);
    const clicks = Math.round(720 * dayFactor);

    points.push({
      date: isoDate,
      spend,
      leads,
      impressions,
      clicks,
    });

    curr.setDate(curr.getDate() + 1);
    dayIdx++;
  }

  return points;
}

export function generateSampleOverview(sinceStr: string, untilStr: string, requestedMetrics: string[], warningMessage?: string) {
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

  const valueMap: Record<string, number> = {
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

export function generateSampleCampaigns(level: 'campaign' | 'adset' | 'ad' = 'campaign', parentId?: string) {
  if (level === 'campaign') {
    return [
      {
        id: 'camp_101',
        name: 'Q3 High-Intent Buyers - Real Estate',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 48500,
          impressions: 125000,
          reach: 82000,
          frequency: 1.52,
          clicks: 3400,
          link_clicks: 2800,
          ctr: 2.72,
          cpc: 14.26,
          cpm: 388,
          leads: 162,
          cost_per_lead: 299.38,
          results: 162,
          cost_per_result: 299.38,
          conversions: 45,
          cost_per_conversion: 1077.7,
          roas: 3.85,
          landing_page_views: 2350,
          post_engagement: 5800,
          video_views: 32000,
          thruplays: 12500,
        },
      },
      {
        id: 'camp_102',
        name: 'Luxury Villa LeadGen - Retargeting',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 35000,
          impressions: 88000,
          reach: 54000,
          frequency: 1.62,
          clicks: 2200,
          link_clicks: 1850,
          ctr: 2.50,
          cpc: 15.90,
          cpm: 397.7,
          leads: 110,
          cost_per_lead: 318.18,
          results: 110,
          cost_per_result: 318.18,
          conversions: 32,
          cost_per_conversion: 1093.75,
          roas: 3.20,
          landing_page_views: 1550,
          post_engagement: 3900,
          video_views: 22000,
          thruplays: 8900,
        },
      },
      {
        id: 'camp_103',
        name: 'Plot Investments - Lookalike 1%',
        level: 'campaign',
        status: 'ACTIVE',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 25000,
          impressions: 68000,
          reach: 46000,
          frequency: 1.47,
          clicks: 1650,
          link_clicks: 1350,
          ctr: 2.42,
          cpc: 15.15,
          cpm: 367.6,
          leads: 78,
          cost_per_lead: 320.51,
          results: 78,
          cost_per_result: 320.51,
          conversions: 21,
          cost_per_conversion: 1190.4,
          roas: 2.95,
          landing_page_views: 1100,
          post_engagement: 2800,
          video_views: 16000,
          thruplays: 6200,
        },
      },
      {
        id: 'camp_104',
        name: 'Commercial Spaces - Direct Leads',
        level: 'campaign',
        status: 'PAUSED',
        objective: 'OUTCOME_LEADS',
        insights: {
          spend: 16000,
          impressions: 44000,
          reach: 31000,
          frequency: 1.41,
          clicks: 1050,
          link_clicks: 880,
          ctr: 2.38,
          cpc: 15.23,
          cpm: 363.6,
          leads: 48,
          cost_per_lead: 333.33,
          results: 48,
          cost_per_result: 333.33,
          conversions: 14,
          cost_per_conversion: 1142.8,
          roas: 2.65,
          landing_page_views: 720,
          post_engagement: 1900,
          video_views: 10500,
          thruplays: 4100,
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
          spend: 28000,
          impressions: 72000,
          reach: 48000,
          frequency: 1.5,
          clicks: 2000,
          link_clicks: 1650,
          ctr: 2.77,
          cpc: 14.0,
          cpm: 388.8,
          leads: 95,
          cost_per_lead: 294.73,
          results: 95,
          cost_per_result: 294.73,
          conversions: 28,
          cost_per_conversion: 1000.0,
          roas: 4.1,
          landing_page_views: 1400,
          post_engagement: 3500,
          video_views: 19000,
          thruplays: 7500,
        },
      },
      {
        id: 'adset_202',
        campaign_id: parentId || 'camp_101',
        name: 'Custom Audience: Website Visitors (30d)',
        level: 'adset',
        status: 'ACTIVE',
        insights: {
          spend: 20500,
          impressions: 53000,
          reach: 34000,
          frequency: 1.55,
          clicks: 1400,
          link_clicks: 1150,
          ctr: 2.64,
          cpc: 14.64,
          cpm: 386.7,
          leads: 67,
          cost_per_lead: 305.97,
          results: 67,
          cost_per_result: 305.97,
          conversions: 17,
          cost_per_conversion: 1205.8,
          roas: 3.5,
          landing_page_views: 950,
          post_engagement: 2300,
          video_views: 13000,
          thruplays: 5000,
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
          spend: 18000,
          impressions: 46000,
          reach: 31000,
          frequency: 1.48,
          clicks: 1350,
          link_clicks: 1100,
          ctr: 2.93,
          cpc: 13.33,
          cpm: 391.3,
          leads: 63,
          cost_per_lead: 285.71,
          results: 63,
          cost_per_result: 285.71,
          conversions: 20,
          cost_per_conversion: 900.0,
          roas: 4.4,
          landing_page_views: 920,
          post_engagement: 2400,
          video_views: 14000,
          thruplays: 5800,
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
          spend: 10000,
          impressions: 26000,
          reach: 17000,
          frequency: 1.52,
          clicks: 650,
          link_clicks: 550,
          ctr: 2.50,
          cpc: 15.38,
          cpm: 384.6,
          leads: 32,
          cost_per_lead: 312.5,
          results: 32,
          cost_per_result: 312.5,
          conversions: 8,
          cost_per_conversion: 1250.0,
          roas: 3.6,
          landing_page_views: 480,
          post_engagement: 1100,
          video_views: 5000,
          thruplays: 1700,
        },
      },
    ];
  }

  return [];
}

export function generateSampleBreakdown(breakdown: string) {
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
