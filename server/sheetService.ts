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

  const headers = lines[0].map((h) => h.trim());
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  const rows = lines.slice(1).filter((r) => r.some((c) => c && c.trim() !== ''));
  return { headers, rows };
}

export function cleanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim();
  str = str.replace(/^p\s*:\s*/i, '').trim();
  let cleaned = str.replace(/\D/g, '');
  if (!cleaned) return '';
  if (/^0\d{10}$/.test(cleaned)) {
    cleaned = cleaned.substring(1);
  }
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export function cleanPrefix(raw: string, prefixRegex: RegExp): string {
  if (!raw) return '';
  let str = String(raw).trim();
  return str.replace(prefixRegex, '').trim();
}

export function generateStableLeadId(sheetName: string, phone: string, fullName: string, dateStr: string): string {
  const normSheet = (sheetName || '').trim().toLowerCase();
  const normPhone = (phone || '').trim().toLowerCase();
  const normName = (fullName || '').trim().toLowerCase();
  const normDate = (dateStr || '').trim().toLowerCase();
  const key = `${normSheet}|${normPhone}|${normName}|${normDate}`;
  const hashHex = crypto.createHash('sha256').update(key).digest('hex').substring(0, 24);
  return `sheet_${hashHex}`;
}

export interface CsvSheetEntry {
  label: string;
  url: string;
}

export async function getCsvEntries(): Promise<CsvSheetEntry[]> {
  if (process.env.LEADS_SHEET_PUBHTML_URL) {
    try {
      const pubhtmlUrl = process.env.LEADS_SHEET_PUBHTML_URL.trim();
      if (pubhtmlUrl) {
        const response = await fetch(pubhtmlUrl);
        if (response.ok) {
          const htmlText = await response.text();

          // Build base URL: replace /pubhtml with /pub
          let baseUrl = pubhtmlUrl.split('?')[0].trim();
          if (baseUrl.endsWith('/pubhtml')) {
            baseUrl = baseUrl.slice(0, -'/pubhtml'.length) + '/pub';
          } else {
            baseUrl = baseUrl.replace(/\/pubhtml\b/, '/pub');
          }

          const regex = /name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]*?gid=(\d+)"/g;
          const entries: CsvSheetEntry[] = [];
          const seenGids = new Set<string>();

          let match: RegExpExecArray | null;
          while ((match = regex.exec(htmlText)) !== null) {
            const tabName = match[1].trim();
            const gid = match[2].trim();
            if (gid && !seenGids.has(gid)) {
              seenGids.add(gid);
              const csvUrl = `${baseUrl}?gid=${gid}&single=true&output=csv`;
              entries.push({ label: tabName, url: csvUrl });
            }
          }

          if (entries.length === 0) {
            // Secondary match if regex pattern spacing/quotes differ
            const altRegex = /name:\s*["']([^"']+)["'][\s\S]*?gid=(\d+)/g;
            let altMatch: RegExpExecArray | null;
            while ((altMatch = altRegex.exec(htmlText)) !== null) {
              const tabName = altMatch[1].trim();
              const gid = altMatch[2].trim();
              if (gid && !seenGids.has(gid)) {
                seenGids.add(gid);
                const csvUrl = `${baseUrl}?gid=${gid}&single=true&output=csv`;
                entries.push({ label: tabName, url: csvUrl });
              }
            }
          }

          if (entries.length > 0) {
            return entries;
          }
        } else {
          console.warn(`LEADS_SHEET_PUBHTML_URL returned HTTP ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Error auto-discovering tabs from LEADS_SHEET_PUBHTML_URL:', err);
    }
  }

  // Fallback to LEADS_SHEET_CSV_URLS or LEADS_SHEET_CSV_URL if LEADS_SHEET_PUBHTML_URL isn't set or yielded no tabs
  const rawItems: string[] = [];

  if (process.env.LEADS_SHEET_CSV_URLS) {
    const list = process.env.LEADS_SHEET_CSV_URLS.split(',').map((s) => s.trim()).filter(Boolean);
    rawItems.push(...list);
  }

  if (process.env.LEADS_SHEET_CSV_URL) {
    const list = process.env.LEADS_SHEET_CSV_URL.split(',').map((s) => s.trim()).filter(Boolean);
    rawItems.push(...list);
  }

  const entries: CsvSheetEntry[] = [];
  const seenUrls = new Set<string>();

  for (const item of rawItems) {
    let label = '';
    let url = item;

    const pipeIdx = item.indexOf('|');
    if (pipeIdx !== -1) {
      label = item.slice(0, pipeIdx).trim();
      url = item.slice(pipeIdx + 1).trim();
    } else {
      url = item.trim();
    }

    if (!url) continue;

    if (!label) {
      const match = url.match(/[?&]gid=([0-9a-zA-Z_-]+)/) || url.match(/gid=([0-9a-zA-Z_-]+)/);
      if (match && match[1]) {
        label = `gid ${match[1]}`;
      } else {
        label = `gid unknown`;
      }
    }

    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      entries.push({ label, url });
    }
  }

  return entries;
}

const FIELD_ALIASES = {
  id: ['id', 'lead_id', 'leadid'],
  full_name: ['full_name', 'full name', 'fullname', 'name'],
  phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'contact'],
  email: ['email', 'e-mail'],
  campaign_id: ['campaign_id', 'campaignid'],
  campaign_name: ['campaign_name', 'campaignname', 'campaign'],
  form_id: ['form_id', 'formid'],
  form_name: ['form_name', 'formname', 'form'],
  created_time: ['created_time', 'createdtime', 'created', 'date', 'submission date', 'timestamp'],
  ad_id: ['ad_id', 'adid'],
  ad_name: ['ad_name', 'adname', 'ad'],
  adset_id: ['adset_id', 'adsetid'],
  adset_name: ['adset_name', 'adsetname', 'adset'],
  state: ['state'],
  city: ['city'],
  lead_status: ['lead_status', 'leadstatus', 'status'],
  remarks: ['remarks', 'notes', 'remark'],
  platform: ['platform'],
  is_organic: ['is_organic', 'isorganic'],
};

function findColIndices(headers: string[], aliases: string[]): number[] {
  const normAliases = aliases.map((a) => a.trim().toLowerCase());
  const indices: number[] = [];
  headers.forEach((h, idx) => {
    const normH = h.trim().toLowerCase();
    if (normAliases.includes(normH)) {
      indices.push(idx);
    }
  });
  return indices;
}

function getColValue(row: string[], indices: number[]): string {
  for (const idx of indices) {
    if (idx >= 0 && idx < row.length && row[idx] !== undefined && row[idx] !== null) {
      const v = String(row[idx]).trim();
      if (v) return v;
    }
  }
  return '';
}

export async function syncSheetLeads(): Promise<{
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  perSheet: Array<{ sheet_name: string; count: number }>;
  message?: string;
  error?: string;
}> {
  const entries = await getCsvEntries();
  if (entries.length === 0) {
    throw new Error('LEADS_SHEET_PUBHTML_URL, LEADS_SHEET_CSV_URLS or LEADS_SHEET_CSV_URL environment variable is not configured.');
  }

  const leadsMap = new Map<string, MetaLead>();
  let skipped = 0;
  const perSheet: Array<{ sheet_name: string; count: number }> = [];

  for (const entry of entries) {
    let sheetCount = 0;
    const sheetLabel = entry.label;

    try {
      const response = await fetch(entry.url);
      if (!response.ok) {
        console.warn(`Failed to fetch CSV from URL ${entry.url} (HTTP ${response.status})`);
        perSheet.push({ sheet_name: sheetLabel, count: 0 });
        continue;
      }

      // Decode fetched body as UTF-8 cleanly
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      let csvText = decoder.decode(buffer);
      if (csvText.startsWith('\uFEFF')) {
        csvText = csvText.slice(1);
      }

      const { headers, rows } = parseCsvText(csvText);

      if (headers.length === 0 || rows.length === 0) {
        perSheet.push({ sheet_name: sheetLabel, count: 0 });
        continue;
      }

      // Map columns by header name (lowercased, trimmed)
      const colIndices = {
        id: findColIndices(headers, FIELD_ALIASES.id),
        full_name: findColIndices(headers, FIELD_ALIASES.full_name),
        phone: findColIndices(headers, FIELD_ALIASES.phone),
        email: findColIndices(headers, FIELD_ALIASES.email),
        campaign_id: findColIndices(headers, FIELD_ALIASES.campaign_id),
        campaign_name: findColIndices(headers, FIELD_ALIASES.campaign_name),
        form_id: findColIndices(headers, FIELD_ALIASES.form_id),
        form_name: findColIndices(headers, FIELD_ALIASES.form_name),
        created_time: findColIndices(headers, FIELD_ALIASES.created_time),
        ad_id: findColIndices(headers, FIELD_ALIASES.ad_id),
        ad_name: findColIndices(headers, FIELD_ALIASES.ad_name),
        adset_id: findColIndices(headers, FIELD_ALIASES.adset_id),
        adset_name: findColIndices(headers, FIELD_ALIASES.adset_name),
        state: findColIndices(headers, FIELD_ALIASES.state),
        city: findColIndices(headers, FIELD_ALIASES.city),
        lead_status: findColIndices(headers, FIELD_ALIASES.lead_status),
        remarks: findColIndices(headers, FIELD_ALIASES.remarks),
        platform: findColIndices(headers, FIELD_ALIASES.platform),
        is_organic: findColIndices(headers, FIELD_ALIASES.is_organic),
      };

      for (const row of rows) {
        if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
          skipped++;
          continue;
        }

        const rawId = getColValue(row, colIndices.id);
        const rawFullName = getColValue(row, colIndices.full_name);
        const rawPhone = getColValue(row, colIndices.phone);
        const rawEmail = getColValue(row, colIndices.email);
        const rawCampaignId = getColValue(row, colIndices.campaign_id);
        const campaignName = getColValue(row, colIndices.campaign_name);
        const rawFormId = getColValue(row, colIndices.form_id);
        const formName = getColValue(row, colIndices.form_name);
        const rawCreatedTime = getColValue(row, colIndices.created_time);
        const rawAdId = getColValue(row, colIndices.ad_id);
        const adName = getColValue(row, colIndices.ad_name);
        const rawAdsetId = getColValue(row, colIndices.adset_id);
        const adsetName = getColValue(row, colIndices.adset_name);
        const state = getColValue(row, colIndices.state);
        const city = getColValue(row, colIndices.city);
        const leadStatus = getColValue(row, colIndices.lead_status);
        const remarks = getColValue(row, colIndices.remarks);
        const platform = getColValue(row, colIndices.platform);
        const isOrganic = getColValue(row, colIndices.is_organic);

        // Clean prefixes
        const cleanLeadId = cleanPrefix(rawId, /^l\s*:\s*/i);
        const phone = cleanPhone(rawPhone);
        const fullName = rawFullName.trim();
        const email = rawEmail.trim();
        const campaignId = cleanPrefix(rawCampaignId, /^c\s*:\s*/i);
        const formId = cleanPrefix(rawFormId, /^f\s*:\s*/i);
        const adId = cleanPrefix(rawAdId, /^ag\s*:\s*/i);
        const adsetId = cleanPrefix(rawAdsetId, /^as\s*:\s*/i);

        // SKIP any row with neither a phone NOR a name. Do NOT create "Anonymous" rows.
        if (!fullName && !phone) {
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

        // id: use the id column if present; ELSE generate stable hash of sheet_name+phone+full_name+created_time
        const finalLeadId = cleanLeadId || generateStableLeadId(sheetLabel, phone, fullName, rawCreatedTime || createdTime);

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
        if (sheetLabel) fieldData.push({ name: 'sheet_name', values: [sheetLabel] });
        fieldData.push({ name: 'source', values: ['sheet'] });

        const leadObj: MetaLead = {
          id: finalLeadId,
          full_name: fullName,
          phone: phone,
          email: email,
          campaign_id: campaignId || undefined,
          campaign_name: campaignName || undefined,
          adset_id: adsetId || undefined,
          adset_name: adsetName || undefined,
          ad_id: adId || undefined,
          ad_name: adName || undefined,
          form_id: formId || undefined,
          form_name: formName || undefined,
          sheet_name: sheetLabel,
          field_data: fieldData,
          created_time: createdTime,
          source: 'sheet',
          synced_at: new Date().toISOString(),
        };

        leadsMap.set(finalLeadId, leadObj);
        sheetCount++;
      }

      perSheet.push({ sheet_name: sheetLabel, count: sheetCount });
    } catch (err) {
      console.error(`Error processing sheet URL ${entry.url}:`, err);
      perSheet.push({ sheet_name: sheetLabel, count: 0 });
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
