import { MetricDefinition } from '../types';

export const METRIC_CATALOG: MetricDefinition[] = [
  // Performance Group
  {
    key: 'spend',
    label: 'Amount Spent',
    group: 'Performance',
    tooltip: 'Total estimated amount of money spent on campaigns during the selected period.',
    format: 'currency',
    insightField: 'spend',
  },
  {
    key: 'impressions',
    label: 'Impressions',
    group: 'Performance',
    tooltip: 'The total number of times your ads were shown on screen.',
    format: 'number',
    insightField: 'impressions',
  },
  {
    key: 'reach',
    label: 'Reach',
    group: 'Performance',
    tooltip: 'The number of unique users who saw your ads at least once.',
    format: 'number',
    insightField: 'reach',
  },
  {
    key: 'frequency',
    label: 'Frequency',
    group: 'Performance',
    tooltip: 'Average number of times each person saw your ad (Impressions ÷ Reach).',
    format: 'ratio',
    insightField: 'frequency',
  },
  {
    key: 'clicks',
    label: 'All Clicks',
    group: 'Performance',
    tooltip: 'Total number of clicks on your ads including links, media, and reactions.',
    format: 'number',
    insightField: 'clicks',
  },
  {
    key: 'link_clicks',
    label: 'Link Clicks',
    group: 'Performance',
    tooltip: 'Number of clicks on links within the ad that lead to destinations.',
    format: 'number',
    insightField: 'actions:link_click',
  },
  {
    key: 'ctr',
    label: 'CTR (All)',
    group: 'Performance',
    tooltip: 'Percentage of times people saw your ad and performed a click (Clicks ÷ Impressions).',
    format: 'percent',
    insightField: 'ctr',
  },
  {
    key: 'cpc',
    label: 'CPC (All)',
    group: 'Performance',
    tooltip: 'Average cost for each click on your ad (Spend ÷ Clicks).',
    format: 'currency',
    insightField: 'cpc',
  },
  {
    key: 'cpm',
    label: 'CPM',
    group: 'Performance',
    tooltip: 'Average cost for 1,000 impressions of your ad.',
    format: 'currency',
    insightField: 'cpm',
  },

  // Leads & Conversions Group
  {
    key: 'leads',
    label: 'Total Leads',
    group: 'Leads & Conversions',
    tooltip: 'Number of lead form submissions and lead conversions from Meta Lead Ads.',
    format: 'number',
    insightField: 'actions:lead',
  },
  {
    key: 'cost_per_lead',
    label: 'Cost per Lead (CPL)',
    group: 'Leads & Conversions',
    tooltip: 'Average amount spent per lead acquired (Spend ÷ Leads).',
    format: 'currency',
    insightField: 'cost_per_action_type:lead',
  },
  {
    key: 'results',
    label: 'Results',
    group: 'Leads & Conversions',
    tooltip: 'The number of times your ad achieved an outcome based on objective.',
    format: 'number',
    insightField: 'actions',
  },
  {
    key: 'cost_per_result',
    label: 'Cost per Result',
    group: 'Leads & Conversions',
    tooltip: 'Average cost per result achieved.',
    format: 'currency',
    insightField: 'cost_per_action_type',
  },
  {
    key: 'conversions',
    label: 'Purchases / Conversions',
    group: 'Leads & Conversions',
    tooltip: 'Total purchase and offsite conversion events attributed to ads.',
    format: 'number',
    insightField: 'actions:purchase',
  },
  {
    key: 'cost_per_conversion',
    label: 'Cost per Conversion',
    group: 'Leads & Conversions',
    tooltip: 'Average cost for each purchase or conversion event.',
    format: 'currency',
    insightField: 'cost_per_action_type:purchase',
  },
  {
    key: 'roas',
    label: 'Purchase ROAS',
    group: 'Leads & Conversions',
    tooltip: 'Return on Ad Spend from website/meta purchases (Purchase Value ÷ Spend).',
    format: 'ratio',
    insightField: 'purchase_roas',
  },

  // Engagement & Video Group
  {
    key: 'landing_page_views',
    label: 'Landing Page Views',
    group: 'Engagement & Video',
    tooltip: 'Number of times a user clicked an ad link and successfully loaded the landing page.',
    format: 'number',
    insightField: 'actions:landing_page_view',
  },
  {
    key: 'post_engagement',
    label: 'Post Engagement',
    group: 'Engagement & Video',
    tooltip: 'Total number of actions people take on your ads (likes, shares, comments, clicks).',
    format: 'number',
    insightField: 'actions:post_engagement',
  },
  {
    key: 'video_views',
    label: 'Video Views (3s+)',
    group: 'Engagement & Video',
    tooltip: 'Number of times your video was played for at least 3 seconds.',
    format: 'number',
    insightField: 'actions:video_view',
  },
  {
    key: 'thruplays',
    label: 'ThruPlays',
    group: 'Engagement & Video',
    tooltip: 'Number of times a video was played to completion or for at least 15 seconds.',
    format: 'number',
    insightField: 'actions:video_thruplay_watched_actions',
  },
];

export const DEFAULT_OVERVIEW_METRICS = [
  'spend',
  'leads',
  'cost_per_lead',
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'roas',
];

export const DEFAULT_CAMPAIGN_METRICS = [
  'spend',
  'leads',
  'cost_per_lead',
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'cpm',
];

export const PRESET_NAMED_VIEWS = [
  {
    name: 'Lead Focus',
    scope: 'overview' as const,
    metrics: ['leads', 'cost_per_lead', 'spend', 'impressions', 'clicks', 'ctr'],
  },
  {
    name: 'Cost & Efficiency',
    scope: 'overview' as const,
    metrics: ['spend', 'cost_per_lead', 'cpc', 'cpm', 'ctr', 'roas'],
  },
  {
    name: 'Full Performance',
    scope: 'campaigns' as const,
    metrics: [
      'spend',
      'leads',
      'cost_per_lead',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'reach',
      'frequency',
      'roas',
    ],
  },
];

export function getMetricByKey(key: string): MetricDefinition {
  return (
    METRIC_CATALOG.find((m) => m.key === key) || {
      key,
      label: key,
      group: 'Performance',
      tooltip: key,
      format: 'number',
    }
  );
}
