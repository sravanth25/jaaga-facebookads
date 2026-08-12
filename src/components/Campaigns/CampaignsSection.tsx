import React, { useState } from 'react';
import { MetaCampaign, MetaAdSet, MetaAd } from '../../types';
import { formatMetricValue } from '../../lib/formatters';
import { getMetricByKey } from '../../lib/metrics';
import { Search, ChevronRight, ChevronDown, Layers, Megaphone, SlidersHorizontal } from 'lucide-react';

interface CampaignsSectionProps {
  selectedMetrics: string[];
  items: MetaCampaign[];
  isLoading: boolean;
  warning?: string;
  onOpenMetricPicker: () => void;
  onFetchDrilldown: (level: 'adset' | 'ad', parentId: string) => Promise<any[]>;
}

export const CampaignsSection: React.FC<CampaignsSectionProps> = ({
  selectedMetrics,
  items,
  isLoading,
  warning,
  onOpenMetricPicker,
  onFetchDrilldown,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Track expanded campaign IDs & adset IDs
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [campaignAdSets, setCampaignAdSets] = useState<Record<string, MetaAdSet[]>>({});
  const [loadingAdSets, setLoadingAdSets] = useState<Record<string, boolean>>({});

  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});
  const [adSetAds, setAdSetAds] = useState<Record<string, MetaAd[]>>({});
  const [loadingAds, setLoadingAds] = useState<Record<string, boolean>>({});

  const handleToggleCampaign = async (campaignId: string) => {
    const isExpanded = !!expandedCampaigns[campaignId];
    setExpandedCampaigns((prev) => ({ ...prev, [campaignId]: !isExpanded }));

    if (!isExpanded && !campaignAdSets[campaignId]) {
      setLoadingAdSets((prev) => ({ ...prev, [campaignId]: true }));
      try {
        const adsets = await onFetchDrilldown('adset', campaignId);
        setCampaignAdSets((prev) => ({ ...prev, [campaignId]: adsets }));
      } catch (err) {
        console.error('Error fetching ad sets:', err);
      } finally {
        setLoadingAdSets((prev) => ({ ...prev, [campaignId]: false }));
      }
    }
  };

  const handleToggleAdSet = async (adsetId: string) => {
    const isExpanded = !!expandedAdSets[adsetId];
    setExpandedAdSets((prev) => ({ ...prev, [adsetId]: !isExpanded }));

    if (!isExpanded && !adSetAds[adsetId]) {
      setLoadingAds((prev) => ({ ...prev, [adsetId]: true }));
      try {
        const ads = await onFetchDrilldown('ad', adsetId);
        setAdSetAds((prev) => ({ ...prev, [adsetId]: ads }));
      } catch (err) {
        console.error('Error fetching ads:', err);
      } finally {
        setLoadingAds((prev) => ({ ...prev, [adsetId]: false }));
      }
    }
  };

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortOrder('desc');
    }
  };

  // Filter & sort campaigns
  const filtered = items.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const valA = (a.insights && a.insights[sortField] !== undefined) ? Number(a.insights[sortField]) : 0;
    const valB = (b.insights && b.insights[sortField] !== undefined) ? Number(b.insights[sortField]) : 0;
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Warning banner if permission or API issue */}
      {warning && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 p-4 text-amber-950 dark:text-amber-100 text-xs shadow-xs">
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              {warning.includes('Permission Error') || warning.includes('permission')
                ? 'Meta API Permission Needed for Campaigns'
                : 'Campaign Data Notice'}
            </h4>
            <p className="leading-relaxed font-medium">{warning}</p>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMetricPicker}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span>Customize Columns</span>
          </button>
        </div>
      </div>

      {/* Main Campaign Hierarchy Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="px-4 py-3.5 w-10"></th>
                <th className="px-4 py-3.5 min-w-[220px]">Name & Status</th>
                {selectedMetrics.map((key) => {
                  const metric = getMetricByKey(key);
                  const isSorted = sortField === key;
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className="inline-flex items-center gap-1 justify-end">
                        <span>{metric.label}</span>
                        {isSorted && (
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={selectedMetrics.length + 2} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={selectedMetrics.length + 2} className="text-center py-12 text-slate-400">
                    No campaigns found matching filter.
                  </td>
                </tr>
              ) : (
                sorted.map((campaign) => {
                  const isExpanded = !!expandedCampaigns[campaign.id];
                  const adsets = campaignAdSets[campaign.id] || [];
                  const isLoadingAdsets = !!loadingAdSets[campaign.id];

                  return (
                    <React.Fragment key={campaign.id}>
                      {/* Campaign Level Row */}
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-medium">
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleCampaign(campaign.id)}
                            className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                {campaign.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                                    campaign.status === 'ACTIVE'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {campaign.status}
                                </span>
                                {campaign.objective && (
                                  <span className="text-[10px] text-slate-400">{campaign.objective}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Metric Columns */}
                        {selectedMetrics.map((key) => {
                          const metricDef = getMetricByKey(key);
                          const rawVal = campaign.insights ? Number(campaign.insights[key] || 0) : 0;
                          const formatted = formatMetricValue(rawVal, metricDef.format);
                          const isLeadMetric = key === 'leads' || key === 'cost_per_lead';

                          return (
                            <td
                              key={key}
                              className={`px-4 py-3 text-right tabular-nums font-semibold ${
                                isLeadMetric ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded AdSets Level */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={selectedMetrics.length + 2} className="p-0 bg-slate-50/60 dark:bg-slate-900/60">
                            {isLoadingAdsets ? (
                              <div className="p-4 text-xs text-slate-400 flex items-center gap-2">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                <span>Loading Ad Sets...</span>
                              </div>
                            ) : adsets.length === 0 ? (
                              <div className="p-4 text-xs text-slate-400 pl-12">
                                No ad sets returned for this campaign.
                              </div>
                            ) : (
                              <div className="pl-8 border-l-2 border-blue-500 my-1 space-y-0.5">
                                {adsets.map((adset) => {
                                  const isAdsetExpanded = !!expandedAdSets[adset.id];
                                  const ads = adSetAds[adset.id] || [];
                                  const isLoadingAds = !!loadingAds[adset.id];

                                  return (
                                    <React.Fragment key={adset.id}>
                                      {/* AdSet Row */}
                                      <div className="flex items-center text-xs py-2 px-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-md">
                                        <button
                                          onClick={() => handleToggleAdSet(adset.id)}
                                          className="p-1 mr-2 text-slate-400 hover:text-slate-600"
                                        >
                                          {isAdsetExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <div className="flex items-center gap-2 min-w-[220px]">
                                          <Layers className="h-3.5 w-3.5 text-amber-500" />
                                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {adset.name}
                                          </span>
                                        </div>

                                        <div className="ml-auto flex items-center gap-4">
                                          {selectedMetrics.map((key) => {
                                            const metricDef = getMetricByKey(key);
                                            const rawVal = adset.insights ? Number(adset.insights[key] || 0) : 0;
                                            return (
                                              <span
                                                key={key}
                                                className="w-24 text-right tabular-nums text-slate-600 dark:text-slate-400 font-medium"
                                              >
                                                {formatMetricValue(rawVal, metricDef.format)}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Expanded Ads Level */}
                                      {isAdsetExpanded && (
                                        <div className="pl-8 border-l border-amber-400 ml-4 my-1 space-y-1">
                                          {isLoadingAds ? (
                                            <div className="p-2 text-[11px] text-slate-400">Loading Ads...</div>
                                          ) : ads.length === 0 ? (
                                            <div className="p-2 text-[11px] text-slate-400">No ads found.</div>
                                          ) : (
                                            ads.map((ad) => (
                                              <div
                                                key={ad.id}
                                                className="flex items-center text-[11px] py-1.5 px-3 bg-white/80 dark:bg-slate-800/80 rounded border border-slate-100 dark:border-slate-800"
                                              >
                                                <span className="font-medium text-slate-700 dark:text-slate-300 min-w-[200px]">
                                                  Ad: {ad.name}
                                                </span>
                                                <div className="ml-auto flex items-center gap-4">
                                                  {selectedMetrics.map((key) => {
                                                    const metricDef = getMetricByKey(key);
                                                    const rawVal = ad.insights ? Number(ad.insights[key] || 0) : 0;
                                                    return (
                                                      <span
                                                        key={key}
                                                        className="w-24 text-right tabular-nums text-slate-500"
                                                      >
                                                        {formatMetricValue(rawVal, metricDef.format)}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
