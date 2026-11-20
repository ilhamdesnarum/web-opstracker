// =========================================================================
// SERVICE: SINKRONISASI RIWAYAT PENGGANTIAN ONT (REINSTALLATION & VISIT)
// =========================================================================
// Menarik data riwayat WO Penggantian ONT dari API Mitra:
// 1. task=reinstallation (Penggantian ONT langsung)
// 2. task=visit (Visit IKR yang melibatkan penggantian ONT / pergantian SN)
// Memproses riwayat per pelanggan ke format JSON array, dan menyimpannya ke
// kolom 'history_penggantian_ont' pada tabel 'data_pelanggan' di Supabase.
// =========================================================================

import { supabase } from '../supabaseClient.js';
import { logActivity } from './activityLogService.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc5MjA0MjM4MCwiZXhwIjoxODIzNTc4MzgwfQ.gwPy7CC5ct1I_vCp1-74DUrNgrAI8B9FsUR3EkPh_-c";

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

export function formatWibDateTime(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta'
    }).format(d).replace(/\./g, ':') + ' WIB';
  } catch {
    return String(isoString);
  }
}

/**
 * Fetch semua item untuk task tertentu secara aman dan terkontrol
 */
async function fetchAllTaskItems(baseUrl, headers, taskName, onProgress = null) {
  const firstUrl = `${baseUrl}?page=1&page_size=10&sort_order=DESC&task=${taskName}`;
  const firstRes = await fetch(firstUrl, { headers, signal: AbortSignal.timeout(25000) });
  if (!firstRes.ok) return [];

  const firstJson = await firstRes.json();
  const totalCount = Number(firstJson?.count || 0);
  const items = Array.isArray(firstJson?.data) ? [...firstJson.data] : [];
  const totalPages = Math.ceil(totalCount / 10) || 1;

  if (onProgress) onProgress(`Mengunduh task=${taskName} (${totalCount} tiket, ${totalPages} hal)...`);

  const remainingPages = [];
  for (let p = 2; p <= totalPages; p++) remainingPages.push(p);

  const CONCURRENCY = 4;
  for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
    const batch = remainingPages.slice(i, i + CONCURRENCY);
    const batchRes = await Promise.all(
      batch.map(async p => {
        try {
          const res = await fetch(`${baseUrl}?page=${p}&page_size=10&sort_order=DESC&task=${taskName}`, {
            headers,
            signal: AbortSignal.timeout(25000)
          });
          if (res.ok) return await res.json();
        } catch {}
        return null;
      })
    );
    batchRes.forEach(r => {
      if (r?.data && Array.isArray(r.data)) items.push(...r.data);
    });
  }

  return items;
}

/**
 * Tarik dan simpan seluruh riwayat Penggantian ONT (dari task=reinstallation dan task=visit) ke Supabase.
 * @param {Object} options
 * @param {string} [options.token]
 * @param {Function} [options.onProgress]
 * @param {Array} [options.pelangganList] - Data pelanggan lokal yang sedang di-cache di client (opsional)
 */
export async function syncOntReplacements({ token = null, onProgress = null, pelangganList = [] } = {}) {
  const baseUrl = getPartnerBaseUrl();
  const partnerToken = token || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STARLITE_PARTNER_TOKEN) || DEFAULT_PARTNER_TOKEN;
  const headers = {
    'Authorization': partnerToken.startsWith('Bearer ') ? partnerToken : `Bearer ${partnerToken}`,
    'Accept': 'application/json'
  };

  try {
    if (onProgress) onProgress('Menghubungi API Starlite...');

    // 1. Tarik task=reinstallation dan task=visit secara paralel
    const [reinstallationRaw, visitRaw] = await Promise.all([
      fetchAllTaskItems(baseUrl, headers, 'reinstallation', onProgress),
      fetchAllTaskItems(baseUrl, headers, 'visit', onProgress)
    ]);

    if (onProgress) onProgress(`Menganalisis pergantian ONT dari ${reinstallationRaw.length} WO reinstallation & ${visitRaw.length} WO visit...`);

    const customerHistoryMap = new Map();

    // A. Masukkan dari task=reinstallation
    reinstallationRaw.forEach(item => {
      const cust = item.customer_id || {};
      const cid = String(cust.customer_id || '').trim().toUpperCase();
      if (!cid) return;

      const visit = item.ikr_visit_id?.[0] || {};
      const ontItem = cust.ont_id?.[0] || {};
      const lead = item.ikr_lead_id || {};
      const ikr = item.ikr_id || {};

      const snBaru = visit.sn_ont || ontItem.serial_number || null;
      const snLama = visit.last_sn_ont || null;
      const statusIndo = item.status === 'done' ? 'Selesai' : (item.status === 'cancel' ? 'Batal' : item.status);
      const tglSelesai = visit.done_at || (item.status === 'done' ? item.updated_at : null);

      const histItem = {
        id_wo: item.id,
        tipe_tugas: 'Penggantian ONT',
        ticket_number: item.ticket_number || null,
        status: statusIndo,
        tanggal_wo: formatWibDateTime(item.created_at),
        tanggal_selesai: formatWibDateTime(tglSelesai),
        iso_tanggal_selesai: tglSelesai || item.created_at,
        brand_ont: visit.brand_ont || ontItem.brand || null,
        sn_ont_baru: snBaru,
        sn_ont_lama: snLama,
        teknisi: (ikr.name || lead.name || '').trim() || null,
        no_hp_teknisi: (ikr.phone_number || lead.phone_number || '').trim() || null,
        stasiun: cust.master_olt_id?.pop_id?.name || null,
        odp: cust.installation_info_id?.[0]?.device_id?.code || null,
        port_odp: cust.installation_info_id?.[0]?.port_number || null,
        catatan: item.notes || visit.notes_ont || null,
        foto_sign: visit.sign_photo_url || null
      };

      if (!customerHistoryMap.has(cid)) customerHistoryMap.set(cid, []);
      customerHistoryMap.get(cid).push(histItem);
    });

    // B. Masukkan dari task=visit yang valid terjadi pergantian ONT
    visitRaw.forEach(item => {
      const cust = item.customer_id || {};
      const cid = String(cust.customer_id || '').trim().toUpperCase();
      if (!cid) return;

      const visit = item.ikr_visit_id?.[0] || {};
      const ontItem = cust.ont_id?.[0] || {};

      let payloadObj = null;
      if (ontItem.payload) {
        try {
          payloadObj = typeof ontItem.payload === 'string' ? JSON.parse(ontItem.payload) : ontItem.payload;
        } catch {}
      }

      const snBaru = (visit.sn_ont || payloadObj?.new_serial_number || ontItem.serial_number || '').trim();
      const snLama = (visit.last_sn_ont || payloadObj?.old_serial_number || '').trim();

      const notesLower = String(item.notes || '').toLowerCase();
      const isNotesChangeOnt = notesLower.includes('change ont') || notesLower.includes('ganti ont') || notesLower.includes('tukar ont');

      const isRealChange = (snLama && snBaru && snLama.toUpperCase() !== snBaru.toUpperCase()) ||
        (payloadObj?.old_serial_number && payloadObj?.new_serial_number && payloadObj.old_serial_number.toUpperCase() !== payloadObj.new_serial_number.toUpperCase()) ||
        isNotesChangeOnt;

      if (!isRealChange) return;

      const statusIndo = item.status === 'done' ? 'Selesai' : (item.status === 'cancel' ? 'Batal' : item.status);
      const tglSelesai = visit.done_at || (item.status === 'done' ? item.updated_at : null);

      const histItem = {
        id_wo: item.id,
        tipe_tugas: 'Visit',
        ticket_number: item.ticket_number || null,
        status: statusIndo,
        tanggal_wo: formatWibDateTime(item.created_at),
        tanggal_selesai: formatWibDateTime(tglSelesai),
        iso_tanggal_selesai: tglSelesai || item.created_at,
        brand_ont: visit.brand_ont || ontItem.brand || null,
        sn_ont_baru: snBaru || null,
        sn_ont_lama: (snLama && snLama !== snBaru) ? snLama : (payloadObj?.old_serial_number || null),
        teknisi: (item.ikr_id?.name || item.ikr_lead_id?.name || '').trim() || null,
        no_hp_teknisi: (item.ikr_id?.phone_number || item.ikr_lead_id?.phone_number || '').trim() || null,
        stasiun: cust.master_olt_id?.pop_id?.name || null,
        odp: cust.installation_info_id?.[0]?.device_id?.code || null,
        port_odp: cust.installation_info_id?.[0]?.port_number || null,
        catatan: item.notes || visit.notes_ont || null,
        foto_sign: visit.sign_photo_url || null
      };

      if (!customerHistoryMap.has(cid)) customerHistoryMap.set(cid, []);
      const existing = customerHistoryMap.get(cid);
      if (!existing.some(e => e.id_wo === histItem.id_wo)) {
        existing.push(histItem);
      }
    });

    const uniqueCustIds = Array.from(customerHistoryMap.keys());
    if (onProgress) onProgress(`Memeriksa data ${uniqueCustIds.length} pelanggan di Supabase...`);

    // 2. Ambil data pelanggan terkini dari Supabase
    const supaMap = new Map();
    const IN_BATCH = 50;
    for (let i = 0; i < uniqueCustIds.length; i += IN_BATCH) {
      const batchCids = uniqueCustIds.slice(i, i + IN_BATCH);
      const inClause = '(' + batchCids.map(id => `"${id}"`).join(',') + ')';
      const { data: dbRows } = await supabase
        .from('data_pelanggan')
        .select('id_pelanggan, nama_pelanggan, sn_ont')
        .filter('id_pelanggan', 'in', inClause);

      if (dbRows && Array.isArray(dbRows)) {
        dbRows.forEach(r => supaMap.set(String(r.id_pelanggan || '').trim().toUpperCase(), r));
      }
    }

    // 3. Bangun payload pembaruan Supabase
    const updates = [];
    let snUpdatedCount = 0;

    customerHistoryMap.forEach((historyList, cid) => {
      const existing = supaMap.get(cid) || {};
      const currentSn = existing.sn_ont || '';

      historyList.forEach(h => {
        if (!h.sn_ont_lama && currentSn && h.sn_ont_baru && currentSn !== h.sn_ont_baru) {
          h.sn_ont_lama = currentSn;
        }
      });

      // Urutkan riwayat dari yang paling baru ke terlama
      historyList.sort((a, b) => new Date(b.iso_tanggal_selesai) - new Date(a.iso_tanggal_selesai));

      // Jika ada tiket Selesai terbaru dan SN baru valid, update kolom sn_ont bila sebelumnya beda
      const latestDone = historyList.find(h => h.status === 'Selesai' && h.sn_ont_baru);
      const latestNewSn = latestDone ? latestDone.sn_ont_baru : null;

      const shouldUpdateSn = Boolean(latestNewSn && latestNewSn !== currentSn);
      if (shouldUpdateSn) snUpdatedCount++;

      updates.push({
        id_pelanggan: cid,
        history_penggantian_ont: historyList,
        new_sn_ont: shouldUpdateSn ? latestNewSn : undefined
      });
    });

    if (onProgress) onProgress(`Menyimpan riwayat ${updates.length} pelanggan ke Supabase...`);

    // 4. Eksekusi pembaruan ke Supabase dalam batch
    const DB_BATCH = 25;
    for (let i = 0; i < updates.length; i += DB_BATCH) {
      const batch = updates.slice(i, i + DB_BATCH);
      await Promise.all(
        batch.map(item => {
          const payload = {
            history_penggantian_ont: item.history_penggantian_ont
          };
          if (item.new_sn_ont) {
            payload.sn_ont = item.new_sn_ont;
          }
          return supabase
            .from('data_pelanggan')
            .update(payload)
            .eq('id_pelanggan', item.id_pelanggan);
        })
      );
    }

    // 5. Catat aktivitas ke log
    try {
      await logActivity({
        module: 'Data Pelanggan',
        action: 'SYNC_ONT_REPLACEMENTS',
        description: `Sinkronisasi Lengkap Penggantian ONT: Memperbarui riwayat ${updates.length} pelanggan (${customerHistoryMap.size} pelanggan unik dari WO reinstallation & visit, ${snUpdatedCount} SN ONT diperbarui ke versi aktif).`,
        metadata: {
          totalCustomers: updates.length,
          snUpdatedCount: snUpdatedCount
        }
      });
    } catch (_logErr) {}

    return {
      success: true,
      totalCustomers: updates.length,
      snUpdatedCount,
      customerIds: uniqueCustIds
    };
  } catch (error) {
    console.error('[SYNC GANTI ONT ERROR]', error);
    throw error;
  }
}
