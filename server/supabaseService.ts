import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MetaLead, MetaForm, MetricView } from '../src/types';

let supabaseClient: SupabaseClient | null = null;

// In-memory fallback database when Supabase credentials are not yet set
const sampleInitialForms: MetaForm[] = [
  { id: 'form_801', name: 'Q3 Real Estate VIP Callback Form', page_id: 'page_1001' },
  { id: 'form_802', name: 'Luxury Villa Virtual Brochure Form', page_id: 'page_1001' },
  { id: 'form_803', name: 'Commercial Property Investment Form', page_id: 'page_1001' },
];

const sampleInitialLeads: MetaLead[] = [
  {
    id: 'lead_9001',
    full_name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul.sharma@example.com',
    campaign_id: 'camp_101',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_801',
    created_time: new Date(Date.now() - 3600000 * 2).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Rahul Sharma'] },
      { name: 'phone_number', values: ['+91 98765 43210'] },
      { name: 'email', values: ['rahul.sharma@example.com'] },
      { name: 'budget_range', values: ['₹1.5 Cr - ₹2.5 Cr'] },
      { name: 'preferred_location', values: ['Whitefield, Bangalore'] },
    ],
  },
  {
    id: 'lead_9002',
    full_name: 'Priya Verma',
    phone: '+91 98123 45678',
    email: 'priya.verma@example.com',
    campaign_id: 'camp_101',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_801',
    created_time: new Date(Date.now() - 3600000 * 5).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Priya Verma'] },
      { name: 'phone_number', values: ['+91 98123 45678'] },
      { name: 'email', values: ['priya.verma@example.com'] },
      { name: 'budget_range', values: ['₹2.5 Cr+'] },
      { name: 'preferred_location', values: ['Indiranagar, Bangalore'] },
    ],
  },
  {
    id: 'lead_9003',
    full_name: 'Amit Patel',
    phone: '+91 99887 76655',
    email: 'amit.patel@example.com',
    campaign_id: 'camp_102',
    adset_id: 'adset_202',
    ad_id: 'ad_302',
    form_id: 'form_802',
    created_time: new Date(Date.now() - 3600000 * 12).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Amit Patel'] },
      { name: 'phone_number', values: ['+91 99887 76655'] },
      { name: 'email', values: ['amit.patel@example.com'] },
      { name: 'villa_type', values: ['4 BHK Duplex Villa'] },
    ],
  },
  {
    id: 'lead_9004',
    full_name: 'Sneha Kulkarni',
    phone: '+91 97654 32109',
    email: 'sneha.k@example.com',
    campaign_id: 'camp_102',
    adset_id: 'adset_202',
    ad_id: 'ad_302',
    form_id: 'form_802',
    created_time: new Date(Date.now() - 3600000 * 24).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Sneha Kulkarni'] },
      { name: 'phone_number', values: ['+91 97654 32109'] },
      { name: 'email', values: ['sneha.k@example.com'] },
      { name: 'possession_timeline', values: ['Immediate / Ready to Move'] },
    ],
  },
  {
    id: 'lead_9005',
    full_name: 'Vikram Singh',
    phone: '+91 98989 12345',
    email: 'vikram.singh@example.com',
    campaign_id: 'camp_104',
    adset_id: 'adset_201',
    ad_id: 'ad_301',
    form_id: 'form_803',
    created_time: new Date(Date.now() - 3600000 * 36).toISOString(),
    field_data: [
      { name: 'full_name', values: ['Vikram Singh'] },
      { name: 'phone_number', values: ['+91 98989 12345'] },
      { name: 'email', values: ['vikram.singh@example.com'] },
      { name: 'space_required', values: ['5,000 - 10,000 sq ft Office'] },
    ],
  },
];

const inMemoryStore = {
  leads: new Map<string, MetaLead>(sampleInitialLeads.map(l => [l.id, l])),
  forms: new Map<string, MetaForm>(sampleInitialForms.map(f => [f.id, f])),
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
 * Upsert lead into Supabase or fallback store
 */
export async function upsertLead(lead: MetaLead): Promise<void> {
  const parsed = parseFieldData(lead.field_data as any);
  const leadData: MetaLead = {
    ...lead,
    full_name: lead.full_name || parsed.full_name || 'Anonymous',
    phone: lead.phone || parsed.phone || '—',
    email: lead.email || parsed.email || '—',
    synced_at: new Date().toISOString(),
  };

  const db = getSupabase();
  if (db) {
    const { error } = await db.from('meta_leads').upsert({
      id: leadData.id,
      full_name: leadData.full_name,
      phone: leadData.phone,
      email: leadData.email,
      field_data: leadData.field_data,
      campaign_id: leadData.campaign_id,
      adset_id: leadData.adset_id,
      ad_id: leadData.ad_id,
      form_id: leadData.form_id,
      created_time: leadData.created_time,
      synced_at: leadData.synced_at,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert lead error:', error);
      // Fallback to memory
      inMemoryStore.leads.set(leadData.id, leadData);
    }
  } else {
    inMemoryStore.leads.set(leadData.id, leadData);
  }
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
