// =========================================================================
// SERVICE: OSP TICKET PARTNER STARLITE (Monitoring Gangguan Massal / Gamas)
// =========================================================================
// Menarik data tiket gangguan massal (OSP Ticket) langsung dari Partner API
// Starlite untuk dashboard pemantauan live, SLA 12 jam, topology, dan detail visit.
// =========================================================================

import { toProperCase, formatDateDisplay } from '../utils.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc5MjA0MjM4MCwiZXhwIjoxODIzNTc4MzgwfQ.gwPy7CC5ct1I_vCp1-74DUrNgrAI8B9FsUR3EkPh_-c";

export function getPartnerToken() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STARLITE_PARTNER_TOKEN) {
    return import.meta.env.VITE_STARLITE_PARTNER_TOKEN;
  }
  return DEFAULT_PARTNER_TOKEN;
}

export function cleanStationName(raw) {
  if (!raw) return 'Tanpa Stasiun';
  let s = String(raw).trim();
  if (s.includes('ST-')) {
    s = s.split('ST-')[1].trim();
  }
  let proper = toProperCase(s);
  if (proper.toLowerCase() === 'tawang') proper = 'Semarang Tawang';
  return proper;
}

export function formatDateTimeWib(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year}, ${hours}:${minutes}`;
  } catch (_e) {
    return String(dateInput);
  }
}

export function calculateDuration(startTime, endTime) {
  if (!startTime) return { text: '-', hours: 0, isBreached: false };
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { text: '-', hours: 0, isBreached: false };
  }

  const diffMs = end - start;
  if (diffMs < 0) return { text: '0m', hours: 0, isBreached: false };

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const remMinutes = totalMinutes % 60;

  let text = '';
  if (days > 0) {
    text = `${days} hari ${remHours} jam ${remMinutes} menit`;
  } else if (remHours > 0) {
    text = `${remHours} jam ${remMinutes} menit`;
  } else {
    text = `${remMinutes} menit`;
  }

  // SLA adalah 12 Jam
  const isBreached = totalHours >= 12;

  return { text, hours: totalHours, isBreached };
}

export function mapTicketStatus(item) {
  const st = String(item.status || '').toLowerCase();
  const lastSt = String(item.last_status || '').toLowerCase();
  const v = item.osp_ticket_visit_id && item.osp_ticket_visit_id[0];
  const vSt = String(v?.status || '').toLowerCase();
  const vLast = String(v?.last_status || '').toLowerCase();
  const hasValidateAt = v?.validate_at != null && v?.validate_at !== '';

  if (st === 'cancel' || st === 'canceled' || st === 'batal') return 'Batal';
  if (st === 'validated' || hasValidateAt) return 'Selesai';
  if (
    st === 'waiting_validation' ||
    vSt === 'waiting_validation' ||
    st === 'done' ||
    vSt === 'finish' ||
    vLast === 'finish'
  ) {
    return 'Menunggu Validasi';
  }
  if (st === 'process' || st === 'in_progress' || vSt === 'process' || vLast === 'check_olt_odc') return 'Diproses IKR';
  if (st === 'assigned') return 'Ditugaskan ke IKR';
  if (st === 'unassigned' || st === 'pending' || !item.ikr_id) return 'Menunggu Ditugaskan';

  return toProperCase(st);
}

export function parseAffectedCustomers(notes) {
  if (!notes) return [];
  const lines = String(notes).split('\n');
  const list = [];
  lines.forEach(line => {
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 2) {
        list.push({
          id: parts[0] || '-',
          name: parts[1] || '-',
          sn: parts[2] ? parts[2].replace(/^SN:\s*/i, '') : '-',
          rx: parts[3] ? parts[3].replace(/^RX:\s*/i, '') : '-'
        });
      }
    }
  });
  return list;
}

export function normalizeTicket(item) {
  const statusLabel = mapTicketStatus(item);
  const visit = item.osp_ticket_visit_id && item.osp_ticket_visit_id.length > 0 ? item.osp_ticket_visit_id[0] : null;
  const finishTime = visit?.done_at || (statusLabel === 'Selesai' ? item.updated_at : null);
  const duration = calculateDuration(item.created_at, finishTime);
  const affectedCustomers = parseAffectedCustomers(item.notes);

  // Penugasan Badge
  let penugasanBadge = 'Belum Ditugaskan';
  let penugasanColor = 'bg-amber-50 text-amber-700 border-amber-200';
  if (
    statusLabel === 'Selesai' ||
    statusLabel === 'Menunggu Validasi' ||
    visit?.status === 'finish' ||
    visit?.last_status === 'finish'
  ) {
    penugasanBadge = 'Selesai WO';
    penugasanColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  } else if (statusLabel === 'Batal') {
    penugasanBadge = 'Batal';
    penugasanColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (item.ikr_id || statusLabel === 'Ditugaskan ke IKR' || statusLabel === 'Diproses IKR') {
    penugasanBadge = 'Penugasan';
    penugasanColor = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  const stationName = item.pop_id?.name || cleanStationName(item.master_olt_id?.name || item.ikr_partner_id?.name || '-');
  const stationCode = item.pop_id?.code || '';

  // Safely extract PIC NOC / Helpdesk email or name
  let picNoc = '-';
  if (item.assign_by_user) {
    if (typeof item.assign_by_user === 'object' && item.assign_by_user !== null) {
      picNoc = item.assign_by_user.email || item.assign_by_user.name || item.assign_by_user.id || '-';
    } else {
      picNoc = String(item.assign_by_user);
    }
  }

  // Safely extract Canceled By
  let canceledByUser = '-';
  if (item.canceled_by_user) {
    if (typeof item.canceled_by_user === 'object' && item.canceled_by_user !== null) {
      canceledByUser = item.canceled_by_user.email || item.canceled_by_user.name || item.canceled_by_user.id || '-';
    } else {
      canceledByUser = String(item.canceled_by_user);
    }
  }

  return {
    id: item.id,
    ticketNumber: item.ticket_number,
    status: statusLabel,
    rawStatus: item.status,
    lastStatus: item.last_status,
    notes: item.notes || 'Tidak ada catatan',
    customerImpacted: Number(item.customer_impacted || 0),
    affectedCustomers,
    priority: item.priority || 'low',
    task: item.task || 'visit',
    card: item.card,
    picNoc,
    canceledByUser,
    
    // Station & POP
    stationName,
    stationCode,
    partnerName: item.ikr_partner_id?.name || '-',
    province: item.master_olt_id?.province_id?.name || 'JAWA TENGAH',
    city: item.master_olt_id?.city_id?.name || '-',

    // OLT Info
    oltName: item.master_olt_id?.name || '-',
    oltBrand: item.master_olt_id?.brand_olt_id?.name || '-',
    ipOlt: item.master_olt_id?.ip_olt || '-',
    vlanInet: item.master_olt_id?.vlan_inet || '-',
    vlanMgnt: item.master_olt_id?.vlan_mgnt || '-',

    // IKR Personnel
    penugasanBadge,
    penugasanColor,
    leadName: item.ikr_lead_id?.name || '-',
    leadPhone: item.ikr_lead_id?.phone_number || '',
    leadEmail: item.ikr_lead_id?.email || '',
    teknisiName: item.ikr_id?.name || item.ikr_lead_id?.name || '-',
    teknisiPhone: item.ikr_id?.phone_number || item.ikr_lead_id?.phone_number || '',

    // SLA & Timing
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    startTimeFormatted: formatDateTimeWib(item.created_at),
    finishTimeFormatted: finishTime ? formatDateTimeWib(finishTime) : '-',
    durationText: duration.text,
    durationHours: duration.hours,
    isSlaBreached: duration.isBreached,

    // Visit Details
    visit,
    hasVisit: !!visit,
    checkDamage: visit?.check_damage || null,
    action: visit?.action || null,
    checkOltOdc: visit?.check_olt_odc || null,
    latitude: visit?.latitude || null,
    longitude: visit?.longitude || null,

    // Logs Timeline
    logs: Array.isArray(item.osp_ticket_log_id) ? item.osp_ticket_log_id : [],
    raw: item
  };
}

// In-memory cache for OSP tickets
let ospTicketsCache = {
  timestamp: 0,
  data: [],
  count: 0
};

/**
 * Dapatkan base URL untuk API OSP Ticket Partner
 * Menggunakan local proxy Vite `/api-mitra` saat berjalan di browser/localhost
 * untuk mencegah CORS preflight block dan 502 Bad Gateway sementara dari server Starlite.
 */
function getOspTicketApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.');
    if (isLocalhost || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) {
      return '/api-mitra/mitra/osp-ticket';
    }
  }
  return 'https://api-mitra.starliteindonesia.com/mitra/osp-ticket';
}

/**
 * Fetch dengan retry aman dan fallback untuk mengatasi server hiccup / 502 Bad Gateway
 */
async function fetchOspPage(url, token, retries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': token,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          continue;
        }
        throw new Error(`Partner API returned status ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Jika proxy gagal atau tidak tersedia, coba direct URL sebagai fallback terakhir
  if (url.startsWith('/api-mitra')) {
    const fallbackDirect = url.replace('/api-mitra', 'https://api-mitra.starliteindonesia.com');
    try {
      const res = await fetch(fallbackDirect, {
        headers: {
          'Authorization': token,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_e) {
      // Abaikan dan gunakan lastError
    }
  }

  throw lastError || new Error("Gagal menghubungi server Partner API");
}

/**
 * Fetch all OSP Tickets from Partner API
 * @param {boolean} forceRefresh - Ignore cache if true
 */
export async function fetchAllOspTickets(forceRefresh = false) {
  const now = Date.now();
  // 5 seconds cache to prevent duplicate rapid requests while staying fresh
  if (!forceRefresh && (now - ospTicketsCache.timestamp < 5000) && ospTicketsCache.data.length > 0) {
    return {
      success: true,
      count: ospTicketsCache.count,
      data: ospTicketsCache.data,
      isLive: true,
      lastSync: new Date(ospTicketsCache.timestamp)
    };
  }

  const token = getPartnerToken();
  const baseUrl = getOspTicketApiBaseUrl();

  try {
    // 1. Fetch Page 1
    const json1 = await fetchOspPage(`${baseUrl}?page=1&pageSize=10`, token, 2);
    const totalCount = json1.count || 0;
    let allRawItems = Array.isArray(json1.data) ? [...json1.data] : [];

    // 2. If more pages exist, fetch remaining pages in parallel
    const pageSize = 10;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages > 1) {
      const remainingPageNumbers = [];
      for (let p = 2; p <= totalPages; p++) {
        remainingPageNumbers.push(p);
      }

      const pagePromises = remainingPageNumbers.map(async (pageNum) => {
        try {
          const j = await fetchOspPage(`${baseUrl}?page=${pageNum}&pageSize=10`, token, 1);
          return Array.isArray(j?.data) ? j.data : [];
        } catch (_err) {
          return [];
        }
      });

      const pagesResults = await Promise.all(pagePromises);
      pagesResults.forEach(items => {
        allRawItems = allRawItems.concat(items);
      });
    }

    // Normalize and sort by created_at DESC
    const normalized = allRawItems.map(normalizeTicket).sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });

    // Save to cache
    ospTicketsCache = {
      timestamp: Date.now(),
      data: normalized,
      count: totalCount || normalized.length
    };

    return {
      success: true,
      count: totalCount || normalized.length,
      data: normalized,
      isLive: true,
      lastSync: new Date(ospTicketsCache.timestamp)
    };
  } catch (error) {
    console.error("Gagal menarik data OSP Ticket Partner:", error);
    // If cache exists, fallback to cache even if stale
    if (ospTicketsCache.data.length > 0) {
      return {
        success: true,
        count: ospTicketsCache.count,
        data: ospTicketsCache.data,
        isLive: false,
        lastSync: new Date(ospTicketsCache.timestamp),
        warning: `Menggunakan data cache: ${error.message}`
      };
    }
    return {
      success: false,
      count: 0,
      data: [],
      error: error.message
    };
  }
}

