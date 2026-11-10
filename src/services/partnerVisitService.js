// =========================================================================
// SERVICE: PARTNER VISIT SERVICE (Sinkronisasi Tiket Visit dari Web Mitra)
// =========================================================================
// Menarik data tiket visit (Work Order Visit) langsung dari API Partner
// untuk memicu input tiket baru secara cepat ke dalam OpsTracker.
// =========================================================================

import { toProperCase } from '../utils.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc5MjA0MjM4MCwiZXhwIjoxODIzNTc4MzgwfQ.gwPy7CC5ct1I_vCp1-74DUrNgrAI8B9FsUR3EkPh_-c";

export function getTodayWibDateString() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch (_e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export function formatWibTime(dateInput) {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).format(d).replace('.', ':') + ' WIB';
  } catch (_e) {
    return String(dateInput);
  }
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

export function getPartnerBaseUrl() {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.');
    if (isLocalhost || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) {
      return '/api-mitra/mitra/work-order';
    }
  }
  return 'https://api-mitra.starliteindonesia.com/mitra/work-order';
}

export function mapPartnerStatus(statusRaw, visitObj = null) {
  const st = String(statusRaw || '').toLowerCase();
  const vSt = String(visitObj?.status || '').toLowerCase();

  if (st === 'done' || vSt === 'finish') {
    return {
      label: 'Selesai',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isDone: true,
      isOpen: false,
      isCanceled: false
    };
  }

  if (st === 'cancel' || st === 'canceled' || st === 'batal') {
    return {
      label: 'Batal',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      isDone: false,
      isOpen: false,
      isCanceled: true
    };
  }

  if (st === 'pending') {
    return {
      label: 'Penugasan ke IKR Lead',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-300 font-bold',
      isDone: false,
      isOpen: true,
      isCanceled: false
    };
  }

  if (st === 'assigned') {
    return {
      label: 'Ditugaskan ke IKR',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      isDone: false,
      isOpen: true,
      isCanceled: false
    };
  }

  if (st === 'on-progress' || st === 'process') {
    return {
      label: 'Sedang Berlangsung',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      isDone: false,
      isOpen: true,
      isCanceled: false
    };
  }

  return {
    label: toProperCase(st || 'Pending'),
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    isDone: false,
    isOpen: true,
    isCanceled: false
  };
}

/**
 * Fetch semua tiket visit dari API Partner untuk tanggal tertentu
 * @param {string} targetDate - Format YYYY-MM-DD (default hari ini)
 */
export async function fetchPartnerVisits(targetDate = null) {
  const date = targetDate || getTodayWibDateString();
  const baseUrl = getPartnerBaseUrl();
  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STARLITE_PARTNER_TOKEN)
    ? import.meta.env.VITE_STARLITE_PARTNER_TOKEN
    : DEFAULT_PARTNER_TOKEN;

  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  const url = `${baseUrl}?page=1&page_size=50&sort_order=DESC&task=visit&date_start=${date}&date_end=${date}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API Partner returned status ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const rawList = Array.isArray(json?.data) ? json.data : [];

    const normalizedList = rawList.map(item => {
      const visit = Array.isArray(item.ikr_visit_id) && item.ikr_visit_id.length > 0 ? item.ikr_visit_id[0] : null;
      const statusInfo = mapPartnerStatus(item.status, visit);

      // Customer info
      const cust = item.customer_id || {};
      const customerId = cust.customer_id || cust.id || '';
      const customerName = cust.name || 'Tanpa Nama';
      const customerPhone = cust.phone_number || '';
      const customerAddress = cust.address || '';

      // Station
      const stationRaw = cust.sales_partner_id?.name || cust.master_olt_id?.pop_id?.name || '';
      const stationName = cleanStationName(stationRaw);

      // Technical info
      const odpDevice = cust.installation_info_id?.[0]?.device_id?.code || '';
      const portNumber = cust.installation_info_id?.[0]?.port_number || '';
      const brandOnt = cust.ont_id?.[0]?.brand || '';
      const snOnt = cust.ont_id?.[0]?.serial_number || '';
      const pppoeUser = cust.user_ppoe_id?.username || '';

      // Problem & notes
      const reqVisit = Array.isArray(item.request_visit_id) && item.request_visit_id.length > 0 ? item.request_visit_id[0] : {};
      const problemCategory = reqVisit.problem_category || '';
      const subProblemCategory = reqVisit.sub_problem_category || '';
      const problemDescription = reqVisit.problem_description || '';
      const notes = item.notes || '';
      const actionDesc = reqVisit.action?.description || reqVisit.conclusion_detail || '';

      // Personnel
      const leadName = item.ikr_lead_id?.name || '';
      const leadPhone = item.ikr_lead_id?.phone_number || '';
      const teknisiName = item.ikr_id?.name || '';
      const teknisiPhone = item.ikr_id?.phone_number || '';

      return {
        id: item.id,
        ticketNumber: item.ticket_number || item.id,
        status: item.status,
        statusLabel: statusInfo.label,
        badgeColor: statusInfo.badgeColor,
        isDone: statusInfo.isDone,
        isOpen: statusInfo.isOpen,
        isCanceled: statusInfo.isCanceled,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        stationName,
        odp: odpDevice,
        port: portNumber,
        brandOnt,
        snOnt,
        pppoeUser,
        problemCategory,
        subProblemCategory,
        problemDescription,
        notes,
        actionDesc,
        leadName,
        leadPhone,
        teknisiName,
        teknisiPhone,
        createdAt: item.created_at,
        timeFormatted: formatWibTime(item.created_at),
        doneAt: visit?.done_at || null,
        raw: item
      };
    });

    return {
      success: true,
      count: normalizedList.length,
      openCount: normalizedList.filter(t => t.isOpen).length,
      doneCount: normalizedList.filter(t => t.isDone).length,
      data: normalizedList,
      targetDate: date,
      lastSync: new Date()
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      data: [],
      targetDate: date,
      lastSync: new Date()
    };
  }
}

/**
 * Fetch tiket visit yang berstatus OPEN / belum selesai langsung dari API Partner.
 * Memeriksa daftar work order visit terbaru (tanpa filter tanggal) untuk mendeteksi
 * tiket gangguan yang membutuhkan penanganan lapangan atau sedang diproses.
 */
export async function fetchOpenPartnerVisits() {
  const baseUrl = getPartnerBaseUrl();
  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STARLITE_PARTNER_TOKEN)
    ? import.meta.env.VITE_STARLITE_PARTNER_TOKEN
    : DEFAULT_PARTNER_TOKEN;

  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const url = `${baseUrl}?page=1&page_size=50&sort_order=DESC&task=visit`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API Partner returned status ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const rawList = Array.isArray(json?.data) ? json.data : [];

    const openList = rawList.filter(item => {
      const st = String(item.status || '').toLowerCase();
      const visit = Array.isArray(item.ikr_visit_id) && item.ikr_visit_id.length > 0 ? item.ikr_visit_id[0] : null;
      const vSt = String(visit?.status || '').toLowerCase();
      const isDone = st === 'done' || vSt === 'finish';
      const isCanceled = st === 'cancel' || st === 'canceled' || st === 'batal';
      return !isDone && !isCanceled;
    });

    return {
      success: true,
      count: openList.length,
      data: openList,
      lastSync: new Date()
    };
  } catch (err) {
    return {
      success: false,
      count: 0,
      data: [],
      error: err.message
    };
  }
}
