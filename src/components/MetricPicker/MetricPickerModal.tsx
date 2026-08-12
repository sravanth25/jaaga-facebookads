import React, { useState } from 'react';
import { METRIC_CATALOG, getMetricByKey, PRESET_NAMED_VIEWS } from '../../lib/metrics';
import { Search, RotateCcw, Save, Check, X, ArrowUp, ArrowDown, MoveVertical } from 'lucide-react';

interface MetricPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: 'overview' | 'campaigns';
  selectedMetrics: string[];
  onApplyMetrics: (newMetrics: string[], viewName?: string) => void;
  onResetDefault: () => void;
}

export const MetricPickerModal: React.FC<MetricPickerModalProps> = ({
  isOpen,
  onClose,
  scope,
  selectedMetrics,
  onApplyMetrics,
  onResetDefault,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSelected, setCurrentSelected] = useState<string[]>(selectedMetrics);
  const [viewNameInput, setViewNameInput] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);

  if (!isOpen) return null;

  const groups: Array<'Performance' | 'Leads & Conversions' | 'Engagement & Video'> = [
    'Performance',
    'Leads & Conversions',
    'Engagement & Video',
  ];

  const handleToggleMetric = (key: string) => {
    if (currentSelected.includes(key)) {
      if (currentSelected.length <= 1) return; // Must keep at least one
      setCurrentSelected(currentSelected.filter((k) => k !== key));
    } else {
      setCurrentSelected([...currentSelected, key]);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentSelected.length - 1) return;

    const updated = [...currentSelected];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCurrentSelected(updated);
  };

  const handleSaveAndApply = () => {
    onApplyMetrics(currentSelected, viewNameInput.trim() || undefined);
    onClose();
  };

  const handleApplyPreset = (presetMetrics: string[]) => {
    setCurrentSelected(presetMetrics);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customize Columns & Metrics</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select and reorder metrics for {scope === 'overview' ? 'Overview KPI Cards' : 'Campaign Table Columns'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Preset Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preset Views */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Presets:</span>
            {PRESET_NAMED_VIEWS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset.metrics)}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body: Split between Available Metrics (left) & Chosen Display Order (right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: All Metrics Grouped */}
          <div className="md:col-span-7 p-4 space-y-5 overflow-y-auto max-h-[50vh]">
            {groups.map((group) => {
              const metrics = METRIC_CATALOG.filter(
                (m) =>
                  m.group === group &&
                  (m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.key.toLowerCase().includes(searchTerm.toLowerCase()))
              );

              if (metrics.length === 0) return null;

              return (
                <div key={group} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {metrics.map((metric) => {
                      const isSelected = currentSelected.includes(metric.key);
                      return (
                        <label
                          key={metric.key}
                          onClick={() => handleToggleMetric(metric.key)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container label click
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold leading-none mb-1">{metric.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {metric.tooltip}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Ordered Selection */}
          <div className="md:col-span-5 p-4 bg-slate-50/50 dark:bg-slate-800/20 overflow-y-auto max-h-[50vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Display Order ({currentSelected.length} Selected)
                </span>
                <span className="text-[11px] text-slate-400">Reorder items</span>
              </div>

              <div className="space-y-1.5">
                {currentSelected.map((key, idx) => {
                  const metric = getMetricByKey(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MoveVertical className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {idx + 1}. {metric.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentSelected.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMetric(key)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Named View input */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              {showSaveView ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="View name (e.g., Lead Focus)"
                    value={viewNameInput}
                    onChange={(e) => setViewNameInput(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs"
                  />
                  <button
                    onClick={() => setShowSaveView(false)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveView(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save as named view</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onResetDefault();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
