import React from 'react';
import { OverviewKPI, TimeSeriesPoint } from '../../types';
import { formatMetricValue, formatINR, formatNumber } from '../../lib/formatters';
import { METRIC_CATALOG } from '../../lib/metrics';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, AlertTriangle, Megaphone, ArrowUpRight } from 'lucide-react';

interface OverviewSectionProps {
  kpis: OverviewKPI[];
  timeSeries: TimeSeriesPoint[];
  topCampaigns: Array<{ id: string; name: string; spend: number; leads: number; cost_per_lead: number }>;
  isLoading: boolean;
  warning?: string;
  onNavigateToCampaigns: () => void;
  onNavigateToLeads: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  kpis,
  timeSeries,
  topCampaigns,
  isLoading,
  warning,
  onNavigateToCampaigns,
  onNavigateToLeads,
}) => {
  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Warning banner if credentials or permissions issue */}
      {warning && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/50 p-5 text-amber-950 dark:text-amber-100 text-xs shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              {warning.includes('Permission Error') || warning.includes('permission')
                ? 'Meta API Permission Requirement'
                : 'Meta API Configuration Guidance'}
            </h4>
            <p className="leading-relaxed font-medium">{warning}</p>

            {warning.includes('permission') || warning.includes('200') ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-[11px] space-y-1.5 text-amber-900 dark:text-amber-200">
                <div className="font-bold">How to grant permission in Meta Business Manager:</div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Go to <strong>Business Settings</strong> &gt; <strong>System Users</strong> (or Users) in Meta Business Suite.</li>
                  <li>Select your System User and click <strong>Assign Assets</strong>.</li>
                  <li>Select <strong>Ad Accounts</strong> &gt; choose your target Ad Account &gt; enable <strong>View Performance (ads_read)</strong> or Full Control.</li>
                  <li>Click <strong>Save Changes</strong> and re-generate your token with <code className="font-mono bg-amber-200/60 dark:bg-amber-800/60 px-1 py-0.5 rounded">ads_read</code> permission.</li>
                </ol>
              </div>
            ) : (
              <p className="text-[11px] opacity-80">
                Set <code className="bg-amber-200/60 dark:bg-amber-800/60 px-1 py-0.5 rounded font-mono">META_ACCESS_TOKEN</code>, <code className="bg-amber-200/60 dark:bg-amber-800/60 px-1 py-0.5 rounded font-mono">META_AD_ACCOUNT_ID</code>, and <code className="bg-amber-200/60 dark:bg-amber-800/60 px-1 py-0.5 rounded font-mono">META_PAGE_ID</code> in Environment Variables to stream live campaign insights and leads.
              </p>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))
          : kpis.map((kpi) => {
              const def = METRIC_CATALOG.find((m) => m.key === kpi.key);
              const formattedVal = formatMetricValue(kpi.value, kpi.format || 'number');

              return (
                <div
                  key={kpi.key}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate" title={def?.tooltip}>
                      {kpi.label}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {def?.group === 'Leads & Conversions' ? 'Leads' : 'Perf'}
                    </span>
                  </div>

                  <div className="mt-2 mb-1">
                    <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {formattedVal}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="truncate">{def?.tooltip.slice(0, 32)}...</span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Main Combo Chart: Spend (Bars) vs Leads (Line) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Performance Over Time: Spend vs. Leads</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily advertising expenditure (INR) contrasted with total lead conversions
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-[#0866FF]" />
              <span className="text-slate-600 dark:text-slate-300">Ad Spend (₹)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#0B6B3A]" />
              <span className="text-slate-600 dark:text-slate-300">Leads Generated</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-72 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : timeSeries.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Megaphone className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500">No time series data available for this range.</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `₹${formatNumber(v)}`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}`}
                  tick={{ fontSize: 11, fill: '#0B6B3A' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-slate-900/95 p-3 text-xs text-white shadow-xl border border-slate-700 space-y-1.5">
                          <div className="font-semibold text-slate-300">{label}</div>
                          <div className="text-blue-400">Ad Spend: {formatINR(data.spend)}</div>
                          <div className="text-emerald-400 font-bold">Leads: {formatNumber(data.leads)}</div>
                          {data.impressions && <div className="text-slate-400">Impressions: {formatNumber(data.impressions)}</div>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name="Ad Spend (₹)" fill="#0866FF" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#0B6B3A"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0B6B3A', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Campaigns Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Campaigns by Leads</h3>
            <p className="text-xs text-slate-500">Highest volume lead generation performance</p>
          </div>
          <button
            onClick={onNavigateToCampaigns}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>View All Campaigns</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Campaign Name</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Total Spend</th>
                <th className="px-4 py-3 text-right">Cost / Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-400">
                    No top campaigns data recorded yet.
                  </td>
                </tr>
              ) : (
                topCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatNumber(c.leads)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(c.spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatINR(c.cost_per_lead)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
