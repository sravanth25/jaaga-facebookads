import crypto from 'crypto';
import { batchUpsertLeads } from './supabaseService';
import { MetaLead } from '../src/types';

export function parseCsvText(csvText: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      lines.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    lines.push(currentRow);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  // Filter out trailing empty headers
  const headers = lines[0].map((h) => h.trim());
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  // Filter out empty rows
  const rows = lines.slice(1).filter((r) => r.some((c) => c && c.trim() !== ''));
  return { headers, rows };
}

function stripPrefix(val: string | undefined | null, prefix: string): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.toLowerCase().startsWith(prefix.toLowerCase())) {
    return str.substring(prefix.length).trim();
  }
  return str;
}

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim();
  if (str.toLowerCase().startsWith('p:')) {
    str = str.substring(2).trim();
  }
  let cleaned = str.replace(/\D/g, '');
  if (/^0\d{10}$/.test(cleaned)) {
    cleaned = cleaned.substring(1);
  }
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export function generateStableLeadId(phone: string, email: string, dateStr: string): string {
  const normPhone = (phone || '').trim().toLowerCase();
  const normEmail = (email || '').trim().toLowerCase();
  const normDate = (dateStr || '').trim().toLowerCase();
  const key = `${normPhone}|${normEmail}|${normDate}`;
  const hashHex = crypto.createHash('sha256').update(key).digest('hex').substring(0, 24);
  return `sheet_${hashHex}`;
}

export function getCsvUrls(): string[] {
  const urls: string[] = [];
  const urlsStr = process.env.LEADS_SHEET_CSV_URLS;
  if (urlsStr) {
    const list = urlsStr.split(',').map((u) => u.trim()).filter(Boolean);
    urls.push(...list);
  }
  const singleUrl = process.env.LEADS_SHEET_CSV_URL;
  if (singleUrl && singleUrl.trim()) {
    const trimmed = singleUrl.trim();
    if (!urls.includes(trimmed)) {
      urls.push(trimmed);
    }
  }
  return urls;
}

export async function syncSheetLeads(): Promise<{
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  perSheet: Array<{ url: string; count: number }>;
  message?: string;
  error?: string;
}> {
  const csvUrls = getCsvUrls();
  if (csvUrls.length === 0) {
    throw new Error('LEADS_SHEET_CSV_URLS or LEADS_SHEET_CSV_URL environment variable is not configured.');
  }

  const leadsMap = new Map<string, MetaLead>();
  let skipped = 0;
  const perSheet: Array<{ url: string; count: number }> = [];

  for (const url of csvUrls) {
    let sheetCount = 0;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch CSV from URL ${url} (HTTP ${response.status})`);
        perSheet.push({ url, count: 0 });
        continue;
      }

      const csvText = await response.text();
      const { headers, rows } = parseCsvText(csvText);

      if (headers.length === 0 || rows.length === 0) {
        perSheet.push({ url, count: 0 });
        continue;
      }

      const colIndexMap: Record<string, number> = {};
      headers.forEach((h, idx) => {
        if (h) {
          const key = h.toLowerCase().replace(/[\s_]+/g, '');
          colIndexMap[key] = idx;
        }
      });

      const getCol = (row: string[], ...keys: string[]): string => {
        for (const k of keys) {
          const normK = k.toLowerCase().replace(/[\s_]+/g, '');
          const idx = colIndexMap[normK];
          if (idx !== undefined && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
            return row[idx].trim();
          }
        }
        return '';
      };

      for (const row of rows) {
        if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
          skipped++;
          continue;
        }

        const rawId = getCol(row, 'id');
        const rawCreatedTime = getCol(row, 'created_time', 'createdtime', 'date', 'timestamp');
        const rawAdId = getCol(row, 'ad_id', 'adid');
        const adName = getCol(row, 'ad_name', 'adname');
        const rawAdsetId = getCol(row, 'adset_id', 'adsetid');
        const adsetName = getCol(row, 'adset_name', 'adsetname');
        const rawCampaignId = getCol(row, 'campaign_id', 'campaignid');
        const campaignName = getCol(row, 'campaign_name', 'campaignname');
        const rawFormId = getCol(row, 'form_id', 'formid');
        const formName = getCol(row, 'form_name', 'formname');
        const isOrganic = getCol(row, 'is_organic', 'isorganic');
        const platform = getCol(row, 'platform');
        const fullName = getCol(row, 'full_name', 'fullname', 'name');
        const rawPhone = getCol(row, 'phone', 'phonenumber', 'mobile', 'contact');
        const rawEmail = getCol(row, 'email', 'e-mail');
        const state = getCol(row, 'state');
        const city = getCol(row, 'city');
        const leadStatus = getCol(row, 'lead_status', 'leadstatus', 'status');
        const remarks = getCol(row, 'remarks');

        const cleanId = stripPrefix(rawId, 'l:');
        const phone = normalizePhone(rawPhone);
        const campaignId = stripPrefix(rawCampaignId, 'c:');
        const adId = stripPrefix(rawAdId, 'ag:');
        const adsetId = stripPrefix(rawAdsetId, 'as:');
        const formId = stripPrefix(rawFormId, 'f:');
        const email = rawEmail ? rawEmail.trim() : '';

        const finalLeadId = cleanId || generateStableLeadId(phone, email, rawCreatedTime);

        if (!fullName && !phone && !email && !cleanId) {
          skipped++;
          continue;
        }

        let createdTime = new Date().toISOString();
        if (rawCreatedTime) {
          const parsed = new Date(rawCreatedTime);
          if (!isNaN(parsed.getTime())) {
            createdTime = parsed.toISOString();
          }
        }

        const fieldData: Array<{ name: string; values: string[] }> = [];
        if (fullName) fieldData.push({ name: 'full_name', values: [fullName] });
        if (phone) fieldData.push({ name: 'phone', values: [phone] });
        if (email) fieldData.push({ name: 'email', values: [email] });
        if (campaignName) fieldData.push({ name: 'campaign_name', values: [campaignName] });
        if (adsetName) fieldData.push({ name: 'adset_name', values: [adsetName] });
        if (adName) fieldData.push({ name: 'ad_name', values: [adName] });
        if (formName) fieldData.push({ name: 'form_name', values: [formName] });
        if (state) fieldData.push({ name: 'state', values: [state] });
        if (city) fieldData.push({ name: 'city', values: [city] });
        if (leadStatus) fieldData.push({ name: 'lead_status', values: [leadStatus] });
        if (remarks) fieldData.push({ name: 'Remarks', values: [remarks] });
        if (platform) fieldData.push({ name: 'platform', values: [platform] });
        if (isOrganic) fieldData.push({ name: 'is_organic', values: [isOrganic] });
        fieldData.push({ name: 'source', values: ['sheet'] });

        const leadObj: MetaLead = {
          id: finalLeadId,
          full_name: fullName || 'Anonymous',
          phone: phone || '—',
          email: email || '—',
          campaign_id: campaignId || undefined,
          campaign_name: campaignName || undefined,
          adset_id: adsetId || undefined,
          adset_name: adsetName || undefined,
          ad_id: adId || undefined,
          ad_name: adName || undefined,
          form_id: formId || undefined,
          form_name: formName || undefined,
          field_data: fieldData,
          created_time: createdTime,
          source: 'sheet',
          synced_at: new Date().toISOString(),
        };

        leadsMap.set(finalLeadId, leadObj);
        sheetCount++;
      }

      perSheet.push({ url, count: sheetCount });
    } catch (err) {
      console.error(`Error processing sheet URL ${url}:`, err);
      perSheet.push({ url, count: 0 });
    }
  }

  const allLeads = Array.from(leadsMap.values());
  const total = allLeads.length;

  const { imported } = await batchUpsertLeads(allLeads);

  return {
    total,
    imported,
    skipped,
    errors: 0,
    perSheet,
  };
}
