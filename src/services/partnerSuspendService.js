function cleanDbDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m1 = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return null;
}

// =========================================================================
// SERVICE: SINKRONISASI PELANGGAN ISOLIR & FOLLOW-UP VENDOR MANAGEMENT
// =========================================================================
// - Menarik status Isolir terkini dari API Partner Starlite:
//   /mitra/customer/suspend?status=suspend
// - Menarik catatan follow-up/reminder dari Website Vendor Management:
//   https://vendormanagement-ije.github.io/Dashboard-Isolir/form.html
//   (Google Apps Script API: action 'fu_list')
// - REKONSILIASI LENGKAP:
//   1. Update pelanggan Isolir + update catatan reminder terbaru dari Vendor Management
//   2. Reaktivasi pelanggan lunas kembali ke Aktif + bersihkan catatan reminder lama
// =========================================================================

import { supabase } from '../supabaseClient.js';
import { logActivity } from './activityLogService.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

const VENDOR_MANAGEMENT_API = "https://script.google.com/macros/s/AKfycbz-DqYj9vS-bT6jbe71Dvp7Zs-NcMIlQUb5UthJGSoY26QzhxTaYUYqMd5JdU-ZKuQ0ow/exec";
const VENDOR_MANAGEMENT_TOKEN = "6e15041a0c6b498d8ead1ed765a484a0d07b8d6d";

const FU_STATUS_LABELS = {
  norespon: 'Tidak Merespon',
  lanjut: 'Bersedia Lanjut / Lunas',
  janji: 'Janji Bayar',
  tidak: 'Tidak Bersedia Lanjut',
  pending: 'Pending Follow Up'
};

function formatWibDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr).slice(0, 19).replace('T', ' ');
    const wib = new Date(d.getTime() + 7 * 3600 * 1000);
    const y = wib.getUTCFullYear();
    const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wib.getUTCDate()).padStart(2, '0');
    const h = String(wib.getUTCHours()).padStart(2, '0');
    const min = String(wib.getUTCMinutes()).padStart(2, '0');
    const sec = String(wib.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${sec}`;
  } catch (_e) {
    return String(isoStr).slice(0, 19).replace('T', ' ');
  }
}

function formatFuNote(rec) {
  const statusLabel = FU_STATUS_LABELS[rec.status] || (rec.status ? String(rec.status).toUpperCase() : 'Follow Up');
  const remark = (rec.remark || '').trim();
  const alasan = (rec.alasan || '').trim();

  let note = `[${statusLabel}]`;
  if (alasan) note += ` Alasan: ${alasan}`;
  if (remark) note += (alasan ? ` • ` : ` `) + remark;
  return note.trim();
}

/**
 * Tarik data follow-up dari Website Vendor Management Starlite
 */
export async function fetchVendorManagementFollowUps(token = null) {
  const t = token || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VENDOR_MANAGEMENT_TOKEN) || VENDOR_MANAGEMENT_TOKEN;
  try {
    const res = await fetch(VENDOR_MANAGEMENT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'fu_list', t }),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      console.warn('[VENDOR MANAGEMENT] HTTP Error:', res.status);
      return new Map();
    }

    const json = await res.json();
    const recs = Array.isArray(json?.recs) ? json.recs : [];

    // Ambil follow-up terbaru per kode ID pelanggan
    const latestFuMap = new Map();
    recs.forEach(r => {
      const code = String(r.code || '').trim().toUpperCase();
      if (!code) return;
      const existing = latestFuMap.get(code);
      if (!existing || new Date(r.ts) > new Date(existing.ts)) {
        latestFuMap.set(code, r);
      }
    });

    return latestFuMap;
  } catch (err) {
    console.warn('[VENDOR MANAGEMENT] Gagal memuat follow-up:', err.message);
    return new Map();
  }
}

/**
 * Sinkronisasi cepat seluruh pelanggan Isolir (Suspend) & catatan follow up Vendor Management
 * @param {Object} options
 * @param {Array} options.pelangganList - Data pelanggan lokal terkini
 * @param {Function} options.onProgress - Callback info progres
 * @param {string} options.token - Token partner (opsional)
 * @returns {Promise<{success: boolean, count: number, updatedCount: number, reactivatedCount: number, followUpUpdatedCount: number, suspendList: Array, reactivatedList: Array}>}
 */
export async function syncSuspendCustomersFast({
  pelangganList = [],
  onProgress = null,
  token = null
} = {}) {
  const partnerBaseUrl = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  )
    ? '/api-mitra/mitra'
    : 'https://api-mitra.starliteindonesia.com/mitra';

  const partnerToken = token || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STARLITE_PARTNER_TOKEN) || DEFAULT_PARTNER_TOKEN;
  const headers = {
    'Authorization': partnerToken.startsWith('Bearer ') ? partnerToken : `Bearer ${partnerToken}`,
    'Accept': 'application/json'
  };

  try {
    if (onProgress) onProgress('Menghubungi API Starlite & Vendor Management...');

    // 1. Tarik halaman pertama Starlite API dan data Vendor Management secara paralel
    const firstUrl = `${partnerBaseUrl}/customer/suspend?page=1&page_size=10&sort_order=DESC&status=suspend`;
    const [firstRes, fuMap] = await Promise.all([
      fetch(firstUrl, { headers, signal: AbortSignal.timeout(25000) }),
      fetchVendorManagementFollowUps()
    ]);

    if (!firstRes.ok) {
      throw new Error(`API Partner mengembalikan status HTTP ${firstRes.status}`);
    }

    const firstJson = await firstRes.json();
    const totalCount = Number(firstJson?.count || 0);
    const itemsFirstPage = Array.isArray(firstJson?.data) ? firstJson.data : [];

    const itemsPerPage = itemsFirstPage.length || 10;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const partnerSuspendList = [...itemsFirstPage];

    if (onProgress) {
      onProgress(`Mengunduh ${totalCount} pelanggan Isolir (${totalPages} halaman) & ${fuMap.size} catatan follow-up...`);
    }

    // 2. Tarik sisa halaman Starlite API secara terkontrol (concurrency: 3) dengan auto-retry
    const remainingPages = [];
    for (let p = 2; p <= totalPages; p++) {
      remainingPages.push(p);
    }

    const CONCURRENCY = 3;
    const fetchPageWithRetry = async (pageNumber, maxRetries = 1) => {
      const pageUrl = `${partnerBaseUrl}/customer/suspend?page=${pageNumber}&page_size=10&sort_order=DESC&status=suspend`;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(pageUrl, {
            headers,
            signal: AbortSignal.timeout(25000)
          });
          if (res.ok) {
            return await res.json();
          }
        } catch (err) {
          if (attempt === maxRetries) {
            console.warn(`[SYNC ISOLIR] Gagal memuat hal ${pageNumber}:`, err.message);
            return null;
          }
          // Delay sebentar sebelum retry
          await new Promise(r => setTimeout(r, 600));
        }
      }
      return null;
    };

    for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
      const batch = remainingPages.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(p => fetchPageWithRetry(p)));

      batchResults.forEach(j => {
        if (j?.data && Array.isArray(j.data)) {
          partnerSuspendList.push(...j.data);
        }
      });
    }

    // 3. Bangun Map data isolir dari API Starlite
    const activeIsolirMap = new Map();
    partnerSuspendList.forEach(item => {
      const rawId = item?.customer_id && typeof item?.customer_id === 'object'
        ? item.customer_id.customer_id
        : item?.customer_id;
      const idUpper = String(rawId || '').trim().toUpperCase();
      if (!idUpper) return;

      const lateDays = (item.count_late_payment_days !== undefined && item.count_late_payment_days !== null && item.count_late_payment_days !== '')
        ? Number(item.count_late_payment_days)
        : null;

      activeIsolirMap.set(idUpper, {
        idPelanggan: String(rawId).trim(),
        lateDays: lateDays
      });
    });

    if (onProgress) onProgress(`Memproses sinkronisasi status & catatan reminder terhadap database...`);

    // 4. Rekonsiliasi Dua Arah terhadap pelangganList
    const customersToSuspend = [];
    const customersToReactivate = [];
    let followUpCount = 0;

    // Map ID pelanggan lokal
    const localPelangganMap = new Map();
    pelangganList.forEach(p => {
      const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (id) localPelangganMap.set(id, p);
    });

    // A. Pelanggan yang aktif Isolir di Starlite -> set status Suspend & telat bayar hari
    // + sinkronkan catatan follow-up dari Vendor Management jika ada
    activeIsolirMap.forEach((apiData, idUpper) => {
      const local = localPelangganMap.get(idUpper);
      if (local) {
        const curAktivasi = String(local.statusAktivasi || local.status_aktivasi || local.aktivasi || '').trim().toUpperCase();
        const curLate = local.telatBayarHari !== undefined && local.telatBayarHari !== null ? Number(local.telatBayarHari) : null;

        const updatePayload = {
          id_pelanggan: local.idPelanggan || local.id_pelanggan,
          status_aktivasi: 'Suspend',
          telat_bayar_hari: apiData.lateDays
        };

        let hasChange = (curAktivasi !== 'SUSPEND' || curLate !== apiData.lateDays);

        // Cek apakah ada catatan follow-up di Vendor Management untuk pelanggan ini
        const fu = fuMap.get(idUpper);
        if (fu) {
          const newNote = formatFuNote(fu);
          const newRep = fu.pic || '';
          const newDate = formatWibDate(fu.ts);

          const curNote = String(local.catatanSuspend || local.catatan_suspend || '').trim();
          const curRep = String(local.reporterSuspend || local.reporter_suspend || '').trim();

          // Jika catatan atau reporter berbeda, perbarui
          if (curNote !== newNote || curRep !== newRep) {
            updatePayload.catatan_suspend = newNote;
            updatePayload.reporter_suspend = newRep;
            updatePayload.tanggal_suspend = newDate;
            hasChange = true;
            followUpCount++;
          } else {
            // Sertakan data lama agar state lokal tetap lengkap
            updatePayload.catatan_suspend = curNote;
            updatePayload.reporter_suspend = curRep;
            updatePayload.tanggal_suspend = local.tanggalSuspend || local.tanggal_suspend || newDate;
          }
        } else {
          // Jika belum ada di Vendor Management:
          // Bersihkan jika reporter_suspend keliru menyimpan nama sales/stasiun
          const curNote = String(local.catatanSuspend || local.catatan_suspend || '').trim();
          const curRep = String(local.reporterSuspend || local.reporter_suspend || '').trim();
          const salesName = String(local.namaSales || local.nama_sales || '').trim();
          const isSalesName = curRep && (
            curRep.toLowerCase() === salesName.toLowerCase() ||
            curRep.toLowerCase() === `cs ${salesName.toLowerCase()}` ||
            curRep.toLowerCase().startsWith('cs ') ||
            curRep.toLowerCase().startsWith('desa ') ||
            curRep.toLowerCase().startsWith('bumdes ')
          );

          if (isSalesName) {
            updatePayload.reporter_suspend = null;
            hasChange = true;
          } else if (curRep) {
            updatePayload.reporter_suspend = curRep;
          }

          if (curNote) {
            updatePayload.catatan_suspend = curNote;
            updatePayload.tanggal_suspend = local.tanggalSuspend || local.tanggal_suspend;
          }
        }

        if (hasChange) {
          customersToSuspend.push(updatePayload);
        }
      }
    });

    // B. Pelanggan yang di OpsTracker tercatat SUSPEND, tapi di Starlite SUDAH TIDAK ISOLIR (sudah bayar lunas)
    // Sesuai permintaan user: history reminder (catatan_suspend, reporter_suspend, tanggal_suspend) dihapus
    // agar data bersih & lurus kembali.
    pelangganList.forEach(p => {
      const idUpper = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (!idUpper) return;

      const curAktivasi = String(p.statusAktivasi || p.status_aktivasi || p.aktivasi || '').trim().toUpperCase();
      const isDismantle = curAktivasi.includes('DISMANTLE') || Boolean(p.woDismantle);

      // Hanya reaktivasi jika statusnya SUSPEND dan BUKAN dalam tahap Dismantle
      if (curAktivasi === 'SUSPEND' && !isDismantle && !activeIsolirMap.has(idUpper)) {
        customersToReactivate.push({
          id_pelanggan: p.idPelanggan || p.id_pelanggan,
          status_aktivasi: 'Sudah',
          status_ikr: 'Sudah',
          telat_bayar_hari: 0,
          catatan_suspend: null,
          reporter_suspend: null,
          tanggal_suspend: null
        });
      }
    });

    // 5. Simpan pembaruan ke database Supabase
    if (customersToSuspend.length > 0) {
      const DB_BATCH = 50;
      for (let i = 0; i < customersToSuspend.length; i += DB_BATCH) {
        const batch = customersToSuspend.slice(i, i + DB_BATCH);
        await Promise.all(
          batch.map(item => {
            const updateFields = {
              status_aktivasi: item.status_aktivasi,
              telat_bayar_hari: item.telat_bayar_hari
            };
            if (item.catatan_suspend !== undefined) updateFields.catatan_suspend = item.catatan_suspend;
            if (item.reporter_suspend !== undefined) updateFields.reporter_suspend = item.reporter_suspend;
            if (item.tanggal_suspend !== undefined) updateFields.tanggal_suspend = cleanDbDate(item.tanggal_suspend);

            return supabase.from('data_pelanggan').update(updateFields).eq('id_pelanggan', item.id_pelanggan);
          })
        );
      }
    }

    if (customersToReactivate.length > 0) {
      const DB_BATCH = 50;
      for (let i = 0; i < customersToReactivate.length; i += DB_BATCH) {
        const batch = customersToReactivate.slice(i, i + DB_BATCH);
        await Promise.all(
          batch.map(item =>
            supabase.from('data_pelanggan').update({
              status_aktivasi: item.status_aktivasi,
              status_ikr: item.status_ikr,
              telat_bayar_hari: item.telat_bayar_hari,
              catatan_suspend: item.catatan_suspend,
              reporter_suspend: item.reporter_suspend,
              tanggal_suspend: cleanDbDate(item.tanggal_suspend)
            }).eq('id_pelanggan', item.id_pelanggan)
          )
        );
      }
    }

    // 6. Log aktivitas
    try {
      if (customersToSuspend.length > 0 || customersToReactivate.length > 0) {
        await logActivity({
          module: 'Data Pelanggan',
          action: 'SYNC_PARTNER_SUSPEND',
          description: `Sinkronisasi Web Partner: Memperbarui ${customersToSuspend.length} pelanggan Isolir (${followUpCount} catatan reminder dari Vendor Management), dan ${customersToReactivate.length} pelanggan kembali Aktif (lunas).`,
          metadata: {
            totalIsolirPartner: activeIsolirMap.size,
            diupdateSuspend: customersToSuspend.length,
            catatanFollowUpDiupdate: followUpCount,
            diaktifkanKembali: customersToReactivate.length,
            sampleReaktivasi: customersToReactivate.slice(0, 5).map(c => c.id_pelanggan)
          }
        });
      }
    } catch (errLog) {
      console.warn('Gagal log sync isolir:', errLog);
    }

    return {
      success: true,
      count: activeIsolirMap.size,
      updatedCount: customersToSuspend.length,
      reactivatedCount: customersToReactivate.length,
      followUpUpdatedCount: followUpCount,
      totalFollowUpsVendor: fuMap.size,
      suspendList: customersToSuspend,
      reactivatedList: customersToReactivate
    };
  } catch (err) {
    console.error('[SYNC SUSPEND ERROR]:', err);
    return {
      success: false,
      count: 0,
      updatedCount: 0,
      reactivatedCount: 0,
      followUpUpdatedCount: 0,
      error: err.message
    };
  }
}
