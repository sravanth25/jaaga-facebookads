import React, { useState } from 'react';
import { MetaLead, MetaForm, MetaCampaign } from '../../types';
import { formatDate } from '../../lib/formatters';
import {
  Search,
  Download,
  RefreshCw,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Megaphone,
  ChevronRight,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';

interface LeadsSectionProps {
  leads: MetaLead[];
  forms: MetaForm[];
  campaigns: MetaCampaign[];
  sheets?: string[];
  isLoading: boolean;
  isSyncing: boolean;
  onSyncLeads: () => void;
  onSearchChange: (search: string) => void;
  onCampaignFilterChange: (campaignId: string) => void;
  onFormFilterChange: (formId: string) => void;
  onSheetFilterChange?: (sheet: string) => void;
  selectedCampaign: string;
  selectedForm: string;
  selectedSheet?: string;
  searchQuery: string;
}

export const LeadsSection: React.FC<LeadsSectionProps> = ({
  leads,
  forms,
  campaigns,
  sheets = [],
  isLoading,
  isSyncing,
  onSyncLeads,
  onSearchChange,
  onCampaignFilterChange,
  onFormFilterChange,
  onSheetFilterChange,
  selectedCampaign,
  selectedForm,
  selectedSheet = '',
  searchQuery,
}) => {
  const [activeLeadDrawer, setActiveLeadDrawer] = useState<MetaLead | null>(null);
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [sheetSyncMessage, setSheetSyncMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedCampaign) params.set('campaign', selectedCampaign);
    if (selectedForm) params.set('form', selectedForm);
    if (selectedSheet) params.set('sheet', selectedSheet);
    if (searchQuery) params.set('search', searchQuery);

    window.open(`/api/leads/export?${params.toString()}`, '_blank');
  };

  const handleSyncSheet = async () => {
    setIsSheetSyncing(true);
    setSheetSyncMessage(null);
    try {
      let secretParam = '';
      try {
        const sRes = await fetch('/api/settings');
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.cronSecret) {
            secretParam = `?secret=${encodeURIComponent(sData.cronSecret)}`;
          }
        }
      } catch (e) {
        // Ignore
      }

      const res = await fetch(`/api/leads/sync-sheet${secretParam}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setSheetSyncMessage({
          type: 'error',
          text: data.error || 'Failed to sync leads from Google Sheet.',
        });
      } else {
        let perSheetSummary = '';
        if (data.perSheet && Array.isArray(data.perSheet) && data.perSheet.length > 0) {
          perSheetSummary = ' [' + data.perSheet.map((s: any) => `${s.sheet_name}: ${s.count}`).join(', ') + ']';
        }
        setSheetSyncMessage({
          type: 'success',
          text: `Sheet Sync Result: ${data.imported ?? 0} imported, ${data.skipped ?? 0} skipped (Total: ${data.total ?? 0}).${perSheetSummary}`,
        });
        if (onSyncLeads) {
          onSyncLeads();
        }
      }
    } catch (err: any) {
      setSheetSyncMessage({
        type: 'error',
        text: err.message || 'Error syncing leads from Google Sheet.',
      });
    } finally {
      setIsSheetSyncing(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Toolbar: Search, Filters, Sync & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campaign Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCampaign}
              onChange={(e) => onCampaignFilterChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Form Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedForm}
              onChange={(e) => onFormFilterChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Forms</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sheet Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedSheet}
              onChange={(e) => onSheetFilterChange && onSheetFilterChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none max-w-[150px] truncate"
            >
              <option value="">Select Sheet</option>
              {sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Meta Leads Button */}
          <button
            onClick={onSyncLeads}
            disabled={isSyncing || isSheetSyncing}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Leads'}</span>
          </button>

          {/* Sync from Sheet Button */}
          <button
            onClick={handleSyncSheet}
            disabled={isSheetSyncing || isSyncing}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className={`h-3.5 w-3.5 ${isSheetSyncing ? 'animate-spin' : ''}`} />
            <span>{isSheetSyncing ? 'Syncing Sheet...' : 'Sync from Sheet'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sync Message Banner */}
      {sheetSyncMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium ${
            sheetSyncMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span>{sheetSyncMessage.text}</span>
          <button
            onClick={() => setSheetSyncMessage(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Leads Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="px-4 py-3.5">Full Name</th>
                <th className="px-4 py-3.5">Phone Number</th>
                <th className="px-4 py-3.5">Email Address</th>
                <th className="px-4 py-3.5">Campaign ID / Name</th>
                <th className="px-4 py-3.5">Form ID / Name</th>
                <th className="px-4 py-3.5">Submission Date</th>
                <th className="px-4 py-3.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-medium">No leads captured yet or matching filter.</p>
                      <button
                        onClick={onSyncLeads}
                        className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                      >
                        Click "Sync Leads" to backfill from Meta Lead Ads
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setActiveLeadDrawer(lead)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{lead.full_name || 'Anonymous'}</span>
                        {lead.source === 'sheet' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                            {lead.sheet_name || 'Sheet'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {lead.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {lead.email || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-[160px] truncate">
                      {lead.campaign_name || lead.campaign_id || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 max-w-[160px] truncate">
                      {lead.form_name || lead.form_id || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(lead.created_time)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Field Data Detail Drawer */}
      {activeLeadDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeLeadDrawer.full_name || 'Lead Details'}
                  </h3>
                  <p className="text-xs text-slate-500">Lead ID: {activeLeadDrawer.id}</p>
                </div>
                <button
                  onClick={() => setActiveLeadDrawer(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Basic Meta Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Phone</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {activeLeadDrawer.phone || '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {activeLeadDrawer.email || '—'}
                    </span>
                  </div>
                </div>

                {/* All Form Answers */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Form Answers (field_data)
                  </h4>
                  {activeLeadDrawer.field_data && activeLeadDrawer.field_data.length > 0 ? (
                    <div className="space-y-2">
                      {activeLeadDrawer.field_data.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                        >
                          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-0.5">
                            {item.name}
                          </div>
                          <div className="text-xs font-medium text-slate-900 dark:text-white">
                            {item.values ? item.values.join(', ') : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No field data present for this lead.</p>
                  )}
                </div>

                {/* Additional Metadata */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Campaign ID:</span>
                    <span className="font-mono">{activeLeadDrawer.campaign_id || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Form ID:</span>
                    <span className="font-mono">{activeLeadDrawer.form_id || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Submitted At:</span>
                    <span>{formatDate(activeLeadDrawer.created_time)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <button
                onClick={() => setActiveLeadDrawer(null)}
                className="w-full rounded-lg bg-slate-900 dark:bg-slate-700 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
