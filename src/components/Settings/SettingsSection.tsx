import React, { useState, useEffect } from 'react';
import { ConnectionSettings, TestConnectionResult } from '../../types';
import {
  Key,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Webhook,
  Activity,
  FileCode,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface SettingsSectionProps {
  settings: ConnectionSettings | null;
  isLoading: boolean;
  onTestConnection: () => Promise<TestConnectionResult>;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  isLoading,
  onTestConnection,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleCopyWebhookUrl = () => {
    if (settings?.webhookUrl) {
      navigator.clipboard.writeText(settings.webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-6 sm:space-y-8 max-w-5xl mx-auto w-full">
      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Marketing API Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Meta Marketing API</h3>
            </div>
            {settings?.hasToken ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Token Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-400">
                <XCircle className="h-3.5 w-3.5" /> Missing Token
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Ad Account ID:</span>
              <span className="font-mono font-bold">{settings?.adAccountId || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Page ID:</span>
              <span className="font-mono font-bold">{settings?.pageId || '—'}</span>
            </div>
          </div>
        </div>

        {/* Supabase Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Supabase Persistence</h3>
            </div>
            {settings?.hasSupabase ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/80 dark:text-amber-400">
                <XCircle className="h-3.5 w-3.5" /> Memory Fallback
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {settings?.hasSupabase
              ? 'Lead submissions and custom view presets are persisted directly in Supabase Postgres.'
              : 'Add SUPABASE_URL and SUPABASE_SERVICE_KEY to enable durable cloud lead storage.'}
          </p>
        </div>
      </div>

      {/* Connection Test Box */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Test Graph API Connection</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hits Graph API <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">GET /{'{META_AD_ACCOUNT_ID}'}?fields=name,currency,account_status</code> to verify credentials.
            </p>
          </div>

          <button
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {isTesting ? <Activity className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-4 rounded-xl text-xs border ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
            }`}
          >
            {testResult.success ? (
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Connection Successful!
                </div>
                <div>Ad Account Name: <strong className="font-mono">{testResult.accountName}</strong></div>
                <div>Currency: <strong className="font-mono">{testResult.currency}</strong></div>
                {testResult.businessName && <div>Business: <strong>{testResult.businessName}</strong></div>}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sm text-rose-600">
                  <XCircle className="h-4 w-4" /> Connection Failed
                </div>
                <div className="font-mono whitespace-pre-wrap">{testResult.error}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Webhook Configuration Box */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Time Leadgen Webhook</h3>
        </div>
        <p className="text-xs text-slate-500">
          Paste these details into your Meta App Dashboard &gt; Webhooks &gt; Page &gt; Leadgen:
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Callback URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={settings?.webhookUrl || ''}
                className="flex-1 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-800 dark:text-slate-200 select-all"
              />
              <button
                onClick={handleCopyWebhookUrl}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
              Verify Token (<code className="font-mono">META_LEADGEN_VERIFY_TOKEN</code>)
            </label>
            <input
              type="text"
              readOnly
              value={settings?.verifyToken || 'Not set'}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Step-by-Step Setup Guide */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-600" />
          <span>Meta setup checklist</span>
        </h3>

        <ol className="space-y-4 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
          <li className="pl-1">
            <strong className="text-slate-900 dark:text-white">Generate System User Token:</strong> Meta Business Settings &gt; System Users &gt; Generate Token with permissions <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">ads_read</code> + <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">leads_retrieval</code> (+ <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">pages_read_engagement</code>). Set as <code className="font-mono text-blue-600">META_ACCESS_TOKEN</code>.
          </li>
          <li className="pl-1">
            <strong className="text-slate-900 dark:text-white">Assign Assets:</strong> Assign your target Ad Account and Page to the System User.
          </li>
          <li className="pl-1">
            <strong className="text-slate-900 dark:text-white">Subscribe Page Webhook:</strong> App Dashboard &gt; Webhooks &gt; Page &gt; subscribe field <code className="font-mono">leadgen</code> with Callback URL and Verify Token above.
          </li>
          <li className="pl-1">
            <strong className="text-slate-900 dark:text-white">Run Supabase SQL:</strong> Execute <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">schema-meta-ads.sql</code> in your Supabase SQL Editor.
          </li>
        </ol>
      </div>
    </div>
  );
};
