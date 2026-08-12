import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MetaLead, MetaForm, MetricView } from '../src/types';

let supabaseClient: SupabaseClient | null = null;

// In-memory store when Supabase credentials are not set
const inMemoryStore = {
  leads: new Map<string, MetaLead>(),
  forms: new Map<string, MetaForm>(),
  views: new Map<string, MetricView>(),
};

export function getSupabase(): SupabaseClient | null {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

/**
 * Extract name, phone, email from field_data array
 */
export function parseFieldData(fieldData: Array<{ name: string; values: string[] }> = []) {
  let full_name = '';
  let phone = '';
  let email = '';

  if (!Array.isArray(fieldData)) return { full_name, phone, email };

  for (const item of fieldData) {
    const nameLower = (item.name || '').toLowerCase();
    const val = item.values && item.values.length > 0 ? item.values[0] : '';

    if (nameLower.includes('full_name') || nameLower.includes('name') || nameLower === 'first_name') {
      if (!full_name) full_name = val;
    } else if (nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('contact')) {
      if (!phone) phone = val;
    } else if (nameLower.includes('email')) {
      if (!email) email = val;
    }
  }

  return { full_name, phone, email };
}

/**
 * Batch upsert leads into Supabase or fallback store in chunks of 500
 */
export async function batchUpsertLeads(leads: MetaLead[]): Promise<{ imported: number }> {
  if (leads.length === 0) return { imported: 0 };
  const db = getSupabase();
  let imported = 0;

  if (db) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const payload = batch.map((l) => ({
        id: l.id,
        full_name: l.full_name || 'Anonymous',
        phone: l.phone || '—',
        email: l.email || '—',
        field_data: l.field_data || [],
        campaign_id: l.campaign_id || null,
        adset_id: l.adset_id || null,
        ad_id: l.ad_id || null,
        form_id: l.form_id || null,
        created_time: l.created_time || new Date().toISOString(),
        synced_at: l.synced_at || new Date().toISOString(),
      }));

      const { data, error } = await db
        .from('meta_leads')
        .upsert(payload, { onConflict: 'id' })
        .select('id');

      if (error) {
        console.error('Supabase batch upsert error:', error);
        throw new Error(`Supabase Upsert Error: ${error.message} (${error.code || ''}) ${error.details || ''}`);
      } else {
        imported += data ? data.length : batch.length;
      }
    }
  } else {
    for (const l of leads) {
      inMemoryStore.leads.set(l.id, l);
      imported++;
    }
  }

  return { imported };
}

/**
 * Upsert lead into Supabase or fallback store
 */
export async function upsertLead(lead: MetaLead): Promise<{ status: 'imported' | 'updated' }> {
  const parsed = parseFieldData(lead.field_data as any);
  const leadData: MetaLead = {
    ...lead,
    full_name: lead.full_name || parsed.full_name || 'Anonymous',
    phone: lead.phone || parsed.phone || '—',
    email: lead.email || parsed.email || '—',
    source: lead.source || 'meta',
    synced_at: new Date().toISOString(),
  };

  const db = getSupabase();
  let status: 'imported' | 'updated' = 'imported';

  if (db) {
    const { data: existing } = await db.from('meta_leads').select('id').eq('id', leadData.id).single();
    if (existing) {
      status = 'updated';
    }

    const { error } = await db.from('meta_leads').upsert({
      id: leadData.id,
      full_name: leadData.full_name,
      phone: leadData.phone,
      email: leadData.email,
      field_data: leadData.field_data,
      campaign_id: leadData.campaign_id,
      campaign_name: leadData.campaign_name,
      adset_id: leadData.adset_id,
      adset_name: leadData.adset_name,
      ad_id: leadData.ad_id,
      ad_name: leadData.ad_name,
      form_id: leadData.form_id,
      form_name: leadData.form_name,
      created_time: leadData.created_time,
      source: leadData.source,
      synced_at: leadData.synced_at,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert lead error:', error);
      inMemoryStore.leads.set(leadData.id, leadData);
    }
  } else {
    if (inMemoryStore.leads.has(leadData.id)) {
      status = 'updated';
    }
    inMemoryStore.leads.set(leadData.id, leadData);
  }

  return { status };
}

/**
 * Upsert lead form
 */
export async function upsertForm(form: MetaForm): Promise<void> {
  const db = getSupabase();
  if (db) {
    const { error } = await db.from('meta_forms').upsert({
      id: form.id,
      name: form.name,
      page_id: form.page_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert form error:', error);
      inMemoryStore.forms.set(form.id, form);
    }
  } else {
    inMemoryStore.forms.set(form.id, form);
  }
}

/**
 * Get leads with search, filter & pagination
 */
export async function queryLeads({
  campaign,
  form,
  search,
  since,
  until,
}: {
  campaign?: string;
  form?: string;
  search?: string;
  since?: string;
  until?: string;
}): Promise<MetaLead[]> {
  const db = getSupabase();

  if (db) {
    let q = db.from('meta_leads').select('*').order('created_time', { ascending: false });

    if (campaign) q = q.eq('campaign_id', campaign);
    if (form) q = q.eq('form_id', form);
    if (since) q = q.gte('created_time', `${since}T00:00:00Z`);
    if (until) q = q.lte('created_time', `${until}T23:59:59Z`);

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await q;
    if (!error && data) {
      return data as MetaLead[];
    }
    console.error('Supabase lead query error:', error);
  }

  // Fallback memory search
  let items = Array.from(inMemoryStore.leads.values());

  if (campaign) items = items.filter(i => i.campaign_id === campaign);
  if (form) items = items.filter(i => i.form_id === form);
  if (since) items = items.filter(i => new Date(i.created_time) >= new Date(`${since}T00:00:00Z`));
  if (until) items = items.filter(i => new Date(i.created_time) <= new Date(`${until}T23:59:59Z`));

  if (search) {
    const s = search.toLowerCase();
    items = items.filter(
      i =>
        (i.full_name && i.full_name.toLowerCase().includes(s)) ||
        (i.phone && i.phone.toLowerCase().includes(s)) ||
        (i.email && i.email.toLowerCase().includes(s))
    );
  }

  return items.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
}

/**
 * Get lead forms list with counts
 */
export async function queryForms(): Promise<MetaForm[]> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from('meta_forms').select('*');
    if (!error && data && data.length > 0) {
      return data as MetaForm[];
    }
  }

  return Array.from(inMemoryStore.forms.values());
}

/**
 * Get saved views for scope
 */
export async function getMetricView(scope: 'overview' | 'campaigns'): Promise<MetricView | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from('meta_views')
      .select('*')
      .eq('scope', scope)
      .eq('is_default', true)
      .single();

    if (!error && data) {
      return data as MetricView;
    }
  }

  return inMemoryStore.views.get(scope) || null;
}

/**
 * Save metric view
 */
export async function saveMetricView(scope: 'overview' | 'campaigns', name: string, metrics: string[]): Promise<MetricView> {
  const view: MetricView = {
    scope,
    name: name || 'Default',
    metrics,
    is_default: true,
  };

  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from('meta_views').upsert({
      scope,
      name,
      metrics,
      is_default: true,
    }).select().single();

    if (!error && data) {
      return data as MetricView;
    }
  }

  inMemoryStore.views.set(scope, view);
  return view;
}
