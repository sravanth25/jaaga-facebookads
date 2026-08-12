import crypto from 'crypto';
import { upsertLead } from './supabaseService';

function parseCsvText(csvText: string): { headers: string[]; rows: string[][] } {
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
        i++; // skip escaped quote
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
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map((h) => h.trim());
  return { headers, rows: lines.slice(1) };
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

export async function syncSheetLeads(): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  message?: string;
}> {
  const csvUrl = process.env.LEADS_SHEET_CSV_URL;
  if (!csvUrl) {
    throw new Error('LEADS_SHEET_CSV_URL environment variable is not configured.');
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV from Google Sheet (HTTP ${response.status}: ${response.statusText}).`);
  }

  const csvText = await response.text();
  const { headers, rows } = parseCsvText(csvText);

  if (headers.length === 0 || rows.length === 0) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      message: 'Google Sheet CSV is empty or has no data rows.',
    };
  }

  // Create column index mapping (case & character insensitive)
  const colIndexMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const key = h.trim().toLowerCase().replace(/[\s_]+/g, '');
    colIndexMap[key] = idx;
  });

  const getCol = (row: string[], ...keys: string[]): string => {
    for (const k of keys) {
      const normK = k.trim().toLowerCase().replace(/[\s_]+/g, '');
      const idx = colIndexMap[normK];
      if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
        return row[idx].trim();
      }
    }
    return '';
  };

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
      skipped++;
      continue;
    }

    // Extract columns according to specification
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

    // Strip prefix rules:
    // id: remove leading "l:"
    const leadIdFromCol = stripPrefix(rawId, 'l:');
    // phone: remove leading "p:" then normalize
    const phone = normalizePhone(rawPhone);
    // campaign_id: remove leading "c:"
    const campaignId = stripPrefix(rawCampaignId, 'c:');
    // ad_id: remove leading "ag:"
    const adId = stripPrefix(rawAdId, 'ag:');
    // adset_id: remove leading "as:"
    const adsetId = stripPrefix(rawAdsetId, 'as:');
    // form_id: remove leading "f:"
    const formId = stripPrefix(rawFormId, 'f:');

    const email = rawEmail ? rawEmail.trim() : '';

    // Final dedupe key
    const finalLeadId = leadIdFromCol || generateStableLeadId(phone, email, rawCreatedTime);

    // Skip row if no identifier exists at all
    if (!fullName && !phone && !email && !leadIdFromCol) {
      skipped++;
      continue;
    }

    // Format created_time
    let createdTime = new Date().toISOString();
    if (rawCreatedTime) {
      const parsed = new Date(rawCreatedTime);
      if (!isNaN(parsed.getTime())) {
        createdTime = parsed.toISOString();
      } else {
        createdTime = rawCreatedTime;
      }
    }

    // field_data jsonb containing state, city, lead_status, Remarks, platform, is_organic
    const fieldData: Array<{ name: string; values: string[] }> = [];
    if (fullName) fieldData.push({ name: 'full_name', values: [fullName] });
    if (phone) fieldData.push({ name: 'phone', values: [phone] });
    if (email) fieldData.push({ name: 'email', values: [email] });
    if (state) fieldData.push({ name: 'state', values: [state] });
    if (city) fieldData.push({ name: 'city', values: [city] });
    if (leadStatus) fieldData.push({ name: 'lead_status', values: [leadStatus] });
    if (remarks) fieldData.push({ name: 'Remarks', values: [remarks] });
    if (platform) fieldData.push({ name: 'platform', values: [platform] });
    if (isOrganic) fieldData.push({ name: 'is_organic', values: [isOrganic] });

    try {
      const res = await upsertLead({
        id: finalLeadId,
        full_name: fullName || 'Anonymous',
        phone: phone || '—',
        email: email || '—',
        campaign_id: campaignId,
        campaign_name: campaignName,
        adset_id: adsetId,
        adset_name: adsetName,
        ad_id: adId,
        ad_name: adName,
        form_id: formId,
        form_name: formName,
        field_data: fieldData,
        created_time: createdTime,
        source: 'sheet',
      });

      if (res.status === 'imported') {
        imported++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Error upserting sheet lead ${finalLeadId}:`, err);
      skipped++;
    }
  }

  const total = imported + updated + skipped;
  return {
    imported,
    updated,
    skipped,
    total,
    message: `Sheet Sync Complete: ${imported} imported, ${updated} updated, ${skipped} skipped (Total: ${total}).`,
  };
}
