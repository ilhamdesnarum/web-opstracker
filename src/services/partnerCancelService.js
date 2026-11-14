// =========================================================================
// SERVICE: SINKRONISASI STATUS BATAL PARTNER (IKR_STATUS = CANCEL)
// =========================================================================
// Menarik data pelanggan yang dibatalkan/cancel dari API Starlite endpoint:
// /mitra/customer/new?ikr_status=cancel
// - Memperbarui status_partner: 'cancel' pada data_pelanggan di Supabase
// =========================================================================

import { supabase } from '../supabaseClient.js';
import { logActivity } from './activityLogService.js';

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

/**
 * Sinkronisasi data pelanggan batal/cancel dari API Partner Starlite
 * Menggunakan pagination paralel cepat (15 batch concurrent) untuk mengambil seluruh data (1.236+ data)
 */
export async function syncCanceledCustomersFast({
  pelangganList = [],
  forceFullScan = true,
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
    if (onProgress) onProgress('Menghubungi API Partner Starlite...');

    // 1. Ambil halaman pertama untuk mengetahui total count data batal
    const firstUrl = `${partnerBaseUrl}/customer/new?page=1&sort_order=DESC&ikr_status=cancel`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const firstRes = await fetch(firstUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!firstRes.ok) {
      throw new Error(`API Partner mengembalikan status ${firstRes.status}`);
    }

    const firstJson = await firstRes.json();
    const totalCount = firstJson?.count || 1236;
    const itemsFirstPage = firstJson?.data || [];
    
    // API Starlite mengembalikan 10 item per halaman
    const itemsPerPage = itemsFirstPage.length || 10;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const allCanceledIds = new Set();
    itemsFirstPage.forEach(item => {
      const rawId = item?.customer_id && typeof item?.customer_id === 'object'
        ? item.customer_id.customer_id
        : item?.customer_id;
      if (rawId) allCanceledIds.add(String(rawId).toUpperCase().trim());
    });

    if (onProgress) {
      onProgress(`Mengunduh ${totalCount} data batal (${totalPages} halaman)...`);
    }

    // 2. Tarik sisa halaman secara paralel dengan batch konkurensi 15 request
    const remainingPages = [];
    for (let p = 2; p <= totalPages; p++) {
      remainingPages.push(p);
    }

    const BATCH_SIZE = 15;
    for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(p =>
          fetch(`${partnerBaseUrl}/customer/new?page=${p}&sort_order=DESC&ikr_status=cancel`, {
            headers,
            signal: AbortSignal.timeout(15000)
          })
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      batchResults.forEach(j => {
        if (j?.data && Array.isArray(j.data)) {
          j.data.forEach(item => {
            const rawId = item?.customer_id && typeof item?.customer_id === 'object'
              ? item.customer_id.customer_id
              : item?.customer_id;
            if (rawId) allCanceledIds.add(String(rawId).toUpperCase().trim());
          });
        }
      });

      if (onProgress) {
        onProgress(`Tersinkron ${allCanceledIds.size} / ${totalCount} data batal...`);
      }
    }

    const uniqueCanceledIds = Array.from(allCanceledIds);

    // 3. Map status partner di database/memori saat ini
    const memoryStatusMap = new Map();
    (pelangganList || []).forEach(p => {
      const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (id) {
        memoryStatusMap.set(id, String(p.statusPartner || p.status_partner || '').toLowerCase());
      }
    });

    // 4. Identifikasi ID yang belum berstatus 'cancel' di memori/database
    const idsToUpdate = uniqueCanceledIds.filter(id => {
      const current = memoryStatusMap.get(id);
      return current !== 'cancel' && current !== 'dibatalkan';
    });

    // 5. Update Supabase data_pelanggan
    if (idsToUpdate.length > 0) {
      if (onProgress) onProgress(`Memperbarui ${idsToUpdate.length} pelanggan ke database Supabase...`);

      const CHUNK_SIZE = 100;
      for (let i = 0; i < idsToUpdate.length; i += CHUNK_SIZE) {
        const chunk = idsToUpdate.slice(i, i + CHUNK_SIZE);
        try {
          const { error } = await supabase
            .from('data_pelanggan')
            .update({ status_partner: 'cancel' })
            .in('id_pelanggan', chunk);

          if (error) {
            console.warn('[SYNC CANCEL SUPABASE CHUNK ERROR]:', error);
          }
        } catch (dbErr) {
          console.warn('[SYNC CANCEL DB EXCEPTION]:', dbErr);
        }
      }

      // Audit Trail Log ke activity_logs
      try {
        logActivity({
          module: 'Data Pelanggan',
          action: 'SYNC_PARTNER_CANCEL',
          description: `Sinkronisasi Web Partner: Memperbarui status ${idsToUpdate.length} pelanggan menjadi "cancel" (Batal)`,
          metadata: {
            totalFoundDiPartner: uniqueCanceledIds.length,
            totalDiupdateKeDb: idsToUpdate.length,
            sampleUpdatedIds: idsToUpdate.slice(0, 30),
            source: 'API Partner Starlite (/mitra/customer/new?ikr_status=cancel)'
          }
        });
      } catch (logErr) {
        console.warn('Gagal mencatat log sync cancel:', logErr);
      }
    }

    return {
      success: true,
      totalFound: uniqueCanceledIds.length,
      updatedCount: idsToUpdate.length,
      canceledIds: uniqueCanceledIds,
      updatedIds: idsToUpdate
    };
  } catch (err) {
    console.warn('[SYNC CANCEL CUSTOMERS ERROR]:', err);
    return { success: false, error: err.message, canceledIds: [] };
  }
}
