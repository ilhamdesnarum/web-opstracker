// =========================================================================
// SERVICE: BAST PARTNER STARLITE (Aktivasi Web Partner Hari Ini)
// =========================================================================
// Menarik data BAST (pelanggan aktif baru hari ini) langsung dari API Partner
// untuk dikomparasikan dengan Report Petugas Lapangan di OpsTracker.
// =========================================================================

import { toProperCase, standardizeDate } from '../utils.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

export function getTodayWibDateString() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch (_e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// In-memory cache to prevent spamming the partner server
let bastMemoryCache = {
  date: null,
  timestamp: 0,
  data: []
};

/**
 * Fetch BAST customers activated on web partner today
 * @param {string} targetDate - Date in YYYY-MM-DD format (defaults to WIB today)
 * @param {boolean} forceRefresh - If true, bypasses the in-memory cache
 */
export async function fetchPartnerBastToday(targetDate, forceRefresh = false) {
  const todayWib = getTodayWibDateString();
  const dateToFetch = targetDate || todayWib;

  // Hanya fetch live dari Partner API jika tanggal yang diminta adalah HARI INI
  const isTargetToday = dateToFetch === todayWib;

  const now = Date.now();
  // Gunakan cache jika masih valid (< 60 detik) dan tanggal sama
  if (!forceRefresh && bastMemoryCache.date === dateToFetch && (now - bastMemoryCache.timestamp < 60000) && bastMemoryCache.data.length > 0) {
    return {
      success: true,
      count: bastMemoryCache.data.length,
      data: bastMemoryCache.data,
      isLive: true,
      lastSync: new Date(bastMemoryCache.timestamp)
    };
  }

  // Jika bukan hari ini, kembalikan kosong / tandai bukan live API
  if (!isTargetToday) {
    return {
      success: true,
      count: 0,
      data: [],
      isLive: false,
      message: 'Live Partner API hanya menyediakan BAST hari ini'
    };
  }

  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STARLITE_PARTNER_TOKEN)
    ? import.meta.env.VITE_STARLITE_PARTNER_TOKEN
    : DEFAULT_PARTNER_TOKEN;

  try {
    // Ambil halaman 1 sampai 4 secara paralel (maksimal 40 data terbaru)
    const pages = [1, 2, 3, 4];
    const fetchPromises = pages.map(async (page) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(`https://api-mitra.starliteindonesia.com/mitra/customer/active?page=${page}&page_size=10&sort_order=DESC`, {
          headers: {
            'Authorization': token,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data || [];
      } catch (_err) {
        clearTimeout(timeoutId);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allCustomers = results.flat();

    const uniqueMap = new Map();

    for (const c of allCustomers) {
      if (!c) continue;
      const rawId = c.customer_id && typeof c.customer_id === 'object' ? c.customer_id.customer_id : (c.customer_id || c.id);
      const idPelanggan = String(rawId || '').trim();
      if (!idPelanggan || uniqueMap.has(idPelanggan)) continue;

      const updated = String(c.updated_at || '');
      const billing = String(c.billing_date || '');
      const ikr = c.submit_request_ikr_id;
      const ikrUpdated = String(ikr?.updated_at || '');
      const pppoe = String(c.pppoe?.start_date || '');

      const isToday = updated.includes(dateToFetch) || billing.includes(dateToFetch) || ikrUpdated.includes(dateToFetch) || pppoe.includes(dateToFetch);

      if (isToday) {
        const rawStation = c.customer_id?.sales_partner_id?.name || c.sales_partner_id?.name || '';
        const station = cleanStationName(rawStation);
        const nama = c.name || c.customer_id?.name || 'Tanpa Nama';
        const bestTimeStr = updated || ikrUpdated || billing || '';
        
        let jam = "00:00";
        const timeMatch = bestTimeStr.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (timeMatch) jam = timeMatch[0];
        else if (bestTimeStr.includes('T')) jam = bestTimeStr.split('T')[1].substring(0, 5);

        uniqueMap.set(idPelanggan, {
          idPelanggan,
          namaPelanggan: nama,
          stasiun: station,
          jam,
          rawTimestamp: bestTimeStr,
          rawPartnerData: c
        });
      }
    }

    const items = Array.from(uniqueMap.values());

    // Update memory cache
    bastMemoryCache = {
      date: dateToFetch,
      timestamp: Date.now(),
      data: items
    };

    return {
      success: true,
      count: items.length,
      data: items,
      isLive: true,
      lastSync: new Date()
    };
  } catch (err) {
    console.warn("⚠️ Gagal mengambil live BAST Partner API:", err);
    return {
      success: false,
      count: 0,
      data: [],
      error: err?.message || 'Gagal memuat'
    };
  }
}

/**
 * Komparasikan data BAST Web Partner dengan Laporan Petugas Lapangan
 */
export function compareBastWithFieldReports(bastList, pelangganData, targetDate) {
  const normalizedTargetDate = targetDate || getTodayWibDateString();

  // 1. Ambil seluruh aktivasi lapangan pada tanggal tersebut
  const fieldActivations = (pelangganData || []).filter(p => {
    const tAkt = standardizeDate(p.tglAktivasi);
    const isAktif = String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').toLowerCase().includes('sudah') ||
                    String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').toLowerCase() === 'aktif';
    return tAkt === normalizedTargetDate && isAktif;
  });

  const fieldMap = new Map();
  fieldActivations.forEach(p => {
    const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
    if (id) fieldMap.set(id, p);
  });

  const bastMap = new Map();
  (bastList || []).forEach(b => {
    const id = String(b.idPelanggan || '').trim().toUpperCase();
    if (id) bastMap.set(id, b);
  });

  // Pelanggan di BAST Web Partner yang belum ada laporan petugas
  const bastOnly = [];
  (bastList || []).forEach(b => {
    const id = String(b.idPelanggan || '').trim().toUpperCase();
    if (!fieldMap.has(id)) {
      bastOnly.push(b);
    }
  });

  // Pelanggan di Laporan Lapangan yang belum aktif / belum BAST di Web Partner
  const fieldOnly = [];
  fieldActivations.forEach(p => {
    const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
    if (!bastMap.has(id)) {
      fieldOnly.push(p);
    }
  });

  // Pelanggan yang sinkron (ada di BAST dan ada di Laporan Lapangan)
  const matched = [];
  (bastList || []).forEach(b => {
    const id = String(b.idPelanggan || '').trim().toUpperCase();
    if (fieldMap.has(id)) {
      matched.push({
        bast: b,
        field: fieldMap.get(id)
      });
    }
  });

  return {
    totalBast: bastList ? bastList.length : 0,
    totalField: fieldActivations.length,
    selisih: (bastList ? bastList.length : 0) - fieldActivations.length,
    matched,
    bastOnly,
    fieldOnly
  };
}
