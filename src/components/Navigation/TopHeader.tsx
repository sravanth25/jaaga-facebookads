import React, { useState } from 'react';
import { DateRange, DateRangeType } from '../../types';
import { Calendar, RefreshCw, SlidersHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';

interface TopHeaderProps {
  title: string;
  dateRange: DateRange;
  onDateRangeChange: (newRange: DateRange) => void;
  onOpenMetricPicker: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  hasToken?: boolean;
  hasSupabase?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  dateRange,
  onDateRangeChange,
  onOpenMetricPicker,
  onRefresh,
  isRefreshing = false,
  hasToken = false,
  hasSupabase = false,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSince, setCustomSince] = useState(dateRange.since || '');
  const [customUntil, setCustomUntil] = useState(dateRange.until || '');

  const presets: { type: DateRangeType; label: string }[] = [
    { type: 'today', label: 'Today' },
    { type: '7d', label: '7 Days' },
    { type: '30d', label: '30 Days' },
    { type: 'this_month', label: 'This Month' },
    { type: 'last_month', label: 'Last Month' },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSince && customUntil) {
      onDateRangeChange({
        type: 'custom',
        since: customSince,
        until: customUntil,
      });
      setShowCustomModal(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-6 py-3.5 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <div className="hidden sm:flex items-center gap-2 text-xs">
          {hasToken ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Meta Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" /> Meta Token Required
            </span>
          )}
          {hasSupabase && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Supabase Active
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Metric Picker Button */}
        <button
          onClick={onOpenMetricPicker}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Customize Columns & Metrics"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Customize Metrics</span>
        </button>

        {/* Global Date Range Selector */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          {presets.map((p) => (
            <button
              key={p.type}
              onClick={() => onDateRangeChange({ type: p.type })}
              className={`rounded-md px-2.5 py-1 transition-all ${
                dateRange.type === p.type
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustomModal(true)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
              dateRange.type === 'custom'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>Custom</span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              Select Custom Date Range
            </h3>
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Start Date (Since)
                </label>
                <input
                  type="date"
                  required
                  value={customSince}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  End Date (Until)
                </label>
                <input
                  type="date"
                  required
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
