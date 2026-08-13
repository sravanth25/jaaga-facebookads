import React, { useState, useEffect, useCallback } from 'react';
import { NavTab, Sidebar } from './components/Navigation/Sidebar';
import { TopHeader } from './components/Navigation/TopHeader';
import { OverviewSection } from './components/Overview/OverviewSection';
import { CampaignsSection } from './components/Campaigns/CampaignsSection';
import { LeadsSection } from './components/Leads/LeadsSection';
import { AnalyticsSection } from './components/Analytics/AnalyticsSection';
import { SettingsSection } from './components/Settings/SettingsSection';
import { MetricPickerModal } from './components/MetricPicker/MetricPickerModal';
import { DateRange, OverviewKPI, TimeSeriesPoint, MetaCampaign, MetaLead, MetaForm, ConnectionSettings } from './types';
import { DEFAULT_OVERVIEW_METRICS, DEFAULT_CAMPAIGN_METRICS } from './lib/metrics';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange>({ type: '30d' });

  // Customizable metrics selections
  const [overviewMetrics, setOverviewMetrics] = useState<string[]>(DEFAULT_OVERVIEW_METRICS);
  const [campaignMetrics, setCampaignMetrics] = useState<string[]>(DEFAULT_CAMPAIGN_METRICS);

  // Metric Picker Modal state
  const [isMetricPickerOpen, setIsMetricPickerOpen] = useState(false);
  const [pickerScope, setPickerScope] = useState<'overview' | 'campaigns'>('overview');

  // Overview Data
  const [kpis, setKpis] = useState<OverviewKPI[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [topCampaigns, setTopCampaigns] = useState<any[]>([]);
  const [overviewWarning, setOverviewWarning] = useState<string | undefined>(undefined);

  // Campaigns Data
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);

  // Leads Data
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadCampaign, setSelectedLeadCampaign] = useState('');
  const [selectedLeadForm, setSelectedLeadForm] = useState('');
  const [selectedLeadSheet, setSelectedLeadSheet] = useState('');

  // Settings Data
  const [settings, setSettings] = useState<ConnectionSettings | null>(null);

  // Loading & Sync States
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignsWarning, setCampaignsWarning] = useState<string | undefined>(undefined);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper to construct query string from dateRange
  const buildDateQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set('range', dateRange.type);
    if (dateRange.since && dateRange.until) {
      params.set('since', dateRange.since);
      params.set('until', dateRange.until);
    }
    return params.toString();
  }, [dateRange]);

  // Load Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }, []);

  // Load Saved Views
  const fetchSavedViews = useCallback(async () => {
    try {
      const [resO, resC] = await Promise.all([
        fetch('/api/views?scope=overview'),
        fetch('/api/views?scope=campaigns'),
      ]);
      if (resO.ok) {
        const dataO = await resO.json();
        if (dataO.metrics && Array.isArray(dataO.metrics)) {
          setOverviewMetrics(dataO.metrics);
        }
      }
      if (resC.ok) {
        const dataC = await resC.json();
        if (dataC.metrics && Array.isArray(dataC.metrics)) {
          setCampaignMetrics(dataC.metrics);
        }
      }
    } catch (e) {
      console.warn('Failed to load views:', e);
    }
  }, []);

  // Load Overview
  const fetchOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    setOverviewWarning(undefined);
    try {
      const dateQ = buildDateQuery();
      const metricsQ = overviewMetrics.join(',');
      const res = await fetch(`/api/overview?${dateQ}&metrics=${metricsQ}`);
      const data = await res.json();

      setKpis(data.kpis || []);
      setTimeSeries(data.timeSeries || []);
      setTopCampaigns(data.topCampaigns || []);
      if (data.warning) setOverviewWarning(data.warning);
      if (!res.ok && !data.warning) setOverviewWarning(data.error || 'Failed to load overview data');
    } catch (err: any) {
      console.warn('Overview notice:', err);
      setOverviewWarning(err.message);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [buildDateQuery, overviewMetrics]);

  // Load Campaigns
  const fetchCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    setCampaignsWarning(undefined);
    try {
      const dateQ = buildDateQuery();
      const metricsQ = campaignMetrics.join(',');
      const res = await fetch(`/api/campaigns?${dateQ}&metrics=${metricsQ}`);
      const data = await res.json();

      setCampaigns(data.items || []);
      if (data.warning) setCampaignsWarning(data.warning);
    } catch (err: any) {
      console.error('Campaigns error:', err);
      setCampaignsWarning(err.message);
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [buildDateQuery, campaignMetrics]);

  // Load Leads
  const fetchLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const dateQ = buildDateQuery();
      const params = new URLSearchParams(dateQ);
      if (leadSearch) params.set('search', leadSearch);
      if (selectedLeadCampaign) params.set('campaign', selectedLeadCampaign);
      if (selectedLeadForm) params.set('form', selectedLeadForm);
      if (selectedLeadSheet) params.set('sheet', selectedLeadSheet);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to query leads');
      setLeads(data.items || []);
      if (data.sheets && Array.isArray(data.sheets)) {
        setAvailableSheets(data.sheets);
      }
    } catch (err: any) {
      console.error('Leads error:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  }, [buildDateQuery, leadSearch, selectedLeadCampaign, selectedLeadForm, selectedLeadSheet]);

  // Load Forms
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.items || []);
      }
    } catch (e) {
      console.warn('Failed to fetch forms:', e);
    }
  }, []);

  // Fetch drilldown items for adsets/ads
  const fetchDrilldown = useCallback(async (level: 'adset' | 'ad', parentId: string) => {
    const dateQ = buildDateQuery();
    const metricsQ = campaignMetrics.join(',');
    const res = await fetch(`/api/campaigns?${dateQ}&metrics=${metricsQ}&level=${level}&parent_id=${parentId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed to fetch ${level}`);
    return data.items || [];
  }, [buildDateQuery, campaignMetrics]);

  // Fetch breakdown charts data for Analytics
  const fetchBreakdown = useCallback(async (breakdown: string) => {
    const dateQ = buildDateQuery();
    const res = await fetch(`/api/insights?${dateQ}&breakdown=${breakdown}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch breakdown');
    return data.items || [];
  }, [buildDateQuery]);

  // Initial mount load
  useEffect(() => {
    fetchSettings();
    fetchSavedViews();
    fetchForms();
  }, [fetchSettings, fetchSavedViews, fetchForms]);

  // Reload data when activeTab, dateRange, or custom metrics change
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else if (activeTab === 'leads') {
      fetchLeads();
    }
  }, [activeTab, dateRange, overviewMetrics, campaignMetrics, fetchOverview, fetchCampaigns, fetchLeads]);

  // Trigger global refresh
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchSettings(),
      fetchOverview(),
      fetchCampaigns(),
      fetchLeads(),
      fetchForms(),
    ]);
    setIsRefreshing(false);
    showToast('Dashboard data refreshed successfully');
  };

  // Sync leads backfill
  const handleSyncLeads = async () => {
    setIsSyncingLeads(true);
    try {
      const res = await fetch('/api/leads/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync leads');

      showToast(data.message || `Synced ${data.leadsSynced} leads successfully!`);
      fetchLeads();
      fetchForms();
    } catch (err: any) {
      showToast(err.message || 'Error syncing leads', 'error');
    } finally {
      setIsSyncingLeads(false);
    }
  };

  // Apply customized metrics
  const handleApplyMetrics = async (newMetrics: string[], viewName?: string) => {
    if (pickerScope === 'overview') {
      setOverviewMetrics(newMetrics);
    } else {
      setCampaignMetrics(newMetrics);
    }

    try {
      await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: pickerScope,
          name: viewName || 'Custom View',
          metrics: newMetrics,
        }),
      });
      showToast(`Saved customized metrics for ${pickerScope}`);
    } catch (e) {
      console.warn('Failed to save view preset:', e);
    }
  };

  const handleResetMetrics = () => {
    if (pickerScope === 'overview') {
      setOverviewMetrics(DEFAULT_OVERVIEW_METRICS);
    } else {
      setCampaignMetrics(DEFAULT_CAMPAIGN_METRICS);
    }
    showToast(`Reset ${pickerScope} metrics to default`);
  };

  const handleOpenPickerForCurrentTab = () => {
    setPickerScope(activeTab === 'campaigns' ? 'campaigns' : 'overview');
    setIsMetricPickerOpen(true);
  };

  const handleTestConnection = async () => {
    const res = await fetch('/api/test-connection');
    return await res.json();
  };

  return (
    <div className={`min-h-screen flex font-sans ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-700 text-xs animate-bounce">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto">
        <TopHeader
          title={
            activeTab === 'overview'
              ? 'Overview & Results'
              : activeTab === 'campaigns'
              ? 'Campaign Performance'
              : activeTab === 'leads'
              ? 'Captured Lead Ads'
              : activeTab === 'analytics'
              ? 'Breakdowns & Analytics'
              : 'Dashboard Settings'
          }
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onOpenMetricPicker={handleOpenPickerForCurrentTab}
          onRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
          hasToken={settings?.hasToken}
          hasSupabase={settings?.hasSupabase}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 pb-12">
          {activeTab === 'overview' && (
            <OverviewSection
              kpis={kpis}
              timeSeries={timeSeries}
              topCampaigns={topCampaigns}
              isLoading={isLoadingOverview}
              warning={overviewWarning}
              onNavigateToCampaigns={() => setActiveTab('campaigns')}
              onNavigateToLeads={() => setActiveTab('leads')}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsSection
              selectedMetrics={campaignMetrics}
              items={campaigns}
              isLoading={isLoadingCampaigns}
              warning={campaignsWarning}
              onOpenMetricPicker={handleOpenPickerForCurrentTab}
              onFetchDrilldown={fetchDrilldown}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsSection
              leads={leads}
              forms={forms}
              campaigns={campaigns}
              sheets={availableSheets}
              isLoading={isLoadingLeads}
              isSyncing={isSyncingLeads}
              onSyncLeads={handleSyncLeads}
              onSearchChange={setLeadSearch}
              onCampaignFilterChange={setSelectedLeadCampaign}
              onFormFilterChange={setSelectedLeadForm}
              onSheetFilterChange={setSelectedLeadSheet}
              selectedCampaign={selectedLeadCampaign}
              selectedForm={selectedLeadForm}
              selectedSheet={selectedLeadSheet}
              searchQuery={leadSearch}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsSection
              dateRange={dateRange}
              onFetchBreakdown={fetchBreakdown}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsSection
              settings={settings}
              isLoading={!settings}
              onTestConnection={handleTestConnection}
            />
          )}
        </main>
      </div>

      {/* Metric Customization Modal */}
      <MetricPickerModal
        isOpen={isMetricPickerOpen}
        onClose={() => setIsMetricPickerOpen(false)}
        scope={pickerScope}
        selectedMetrics={pickerScope === 'overview' ? overviewMetrics : campaignMetrics}
        onApplyMetrics={handleApplyMetrics}
        onResetDefault={handleResetMetrics}
      />
    </div>
  );
}
