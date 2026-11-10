// =========================================================================
// SERVICE: SINKRONISASI PELANGGAN WO DISMANTLE (PERANGKAT SEDANG DIAMBIL)
// =========================================================================
// Menarik data pelanggan dari API Starlite endpoint /mitra/customer/suspend
// dengan status=dismantling (Perangkat Sedang Diambil yang sudah ada WO IKR)
// - 11 Stasiun dijalankan secara paralel
// - Mengambil data WO: nomor tiket, status penugasan, dan teknisi IKR
// - Mengupdate status_aktivasi: 'Dismantling' dan reason_dismantle di Supabase
// =========================================================================

const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

export const PARTNER_STATION_IDS = {
  "Wadu": "22e3ea03b120584cc7f5f1fc72571f12",
  "Randublatung": "a3371976f338ec30d563cf5ff1bb5ad0",
  "Sulur": "2573f4a2019695eae43dc3ab424fbfcd",
  "Kradenan": "35f1e173a7ed98c3d1fce9353e1e9d91",
  "Brumbung": "a03dd0e8d8f2e878e58c684fbaa64483",
  "Alastua": "e4029158beceeec4420c71ced1ebca9b",
  "Tawang": "972f9a002e04a16e6c423df80e80969c",
  "Kaliwungu": "035f51aa3d54e5e284dd202a04b932c4",
  "Kalibodri": "d027f79d3c452111efc3949dec89a18f",
  "Weleri": "f94232b09359b914871ee59b276711f9",
  "Krengseng": "6e574c1aea5332ef76ef425d07739588"
};

function formatKeWIB(isoString) {
  if (!isoString) return "";
  try {
    const str = String(isoString).trim();
    if (str.endsWith("Z") || str.includes("+") || (str.includes("T") && !str.includes(" "))) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const wibTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const y = wibTime.getUTCFullYear();
        const m = String(wibTime.getUTCMonth() + 1).padStart(2, "0");
        const day = String(wibTime.getUTCDate()).padStart(2, "0");
        const h = String(wibTime.getUTCHours()).padStart(2, "0");
        const min = String(wibTime.getUTCMinutes()).padStart(2, "0");
        const s = String(wibTime.getUTCSeconds()).padStart(2, "0");
        return `${y}-${m}-${day} ${h}:${min}:${s}`;
      }
    }
    return str.substring(0, 19).replace("T", " ");
  } catch (_e) {
    return String(isoString).substring(0, 19).replace("T", " ");
  }
}

/**
 * Sinkronisasi cepat seluruh pelanggan yang sudah ada WO Dismantle (status=dismantling)
 * @param {Object} options
 * @param {Array} options.pelangganList - Data pelanggan terkini
 * @param {Function} options.onProgress - Callback progress pesan
 * @param {string} options.token - Token partner (opsional)
 * @returns {Promise<{success: boolean, count: number, updatedCount: number}>}
 */
export async function syncDismantlingFast({
  pelangganList = [],
  onProgress = null,
  token = null
} = {}) {
  const partnerBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/api-mitra/mitra'
    : 'https://api-mitra.starliteindonesia.com/mitra';

  const partnerToken = token || DEFAULT_PARTNER_TOKEN;
  const headers = {
    'Authorization': partnerToken.startsWith('Bearer ') ? partnerToken : `Bearer ${partnerToken}`,
    'Accept': 'application/json'
  };

  const dismantlingCustomers = [];
  const pageSize = 10;
  const maxPagesPerStation = 15; // Maks 150 data per stasiun (total saat ini ~223 di seluruh stasiun)

  try {
    if (onProgress) onProgress('Memeriksa WO Dismantle (Perangkat Sedang Diambil) di 11 stasiun...');

    const stationTasks = Object.entries(PARTNER_STATION_IDS).map(async ([stationName, partnerId]) => {
      let page = 1;
      let hasMore = true;

      while (page <= maxPagesPerStation && hasMore) {
        const url = `${partnerBaseUrl}/customer/suspend?page=${page}&page_size=${pageSize}&sort_order=DESC&status=dismantling&sales_partner_id=${partnerId}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          const res = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) {
            console.warn(`[FAST DISMANTLE] ${stationName} hal ${page} HTTP ${res.status}`);
            hasMore = false;
            break;
          }

          const json = await res.json();
          const items = json?.data || [];
          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            const rawId = item.customer_id && typeof item.customer_id === 'string'
              ? item.customer_id
              : (item.customer_id ? item.customer_id.customer_id : '');
            const idPelanggan = String(rawId || '').trim();
            if (!idPelanggan) continue;

            const sub = item.submit_request_ikr_id;
            const techName = sub?.ikr_id?.name || sub?.ikr_lead_id?.name || '';
            const ticket = sub?.ticket_number || '';
            const woStatus = sub?.status || 'assigned';
            const woDate = sub?.created_at ? formatKeWIB(sub.created_at) : '';

            // Format wo_dismantle terstruktur khusus (tidak mencemari reason_dismantle)
            let woStr = '[WO DISMANTLE]';
            if (techName) woStr += ` Teknisi: ${techName}`;
            if (ticket) woStr += ` | Tiket: ${ticket}`;
            if (woStatus && woStatus !== 'assigned') woStr += ` (${woStatus})`;

            let expDate = null;
            if (item.user_ppoe_id?.yinet_info) {
              try {
                const y = typeof item.user_ppoe_id.yinet_info === 'string' ? JSON.parse(item.user_ppoe_id.yinet_info) : item.user_ppoe_id.yinet_info;
                if (y?.expired_date) expDate = formatKeWIB(y.expired_date);
              } catch (_e) {}
            }
            if (!expDate && item.ont_id?.[0]?.payload) {
              try {
                const p = typeof item.ont_id[0].payload === 'string' ? JSON.parse(item.ont_id[0].payload) : item.ont_id[0].payload;
                if (p?.expired_date) expDate = formatKeWIB(p.expired_date);
              } catch (_e) {}
            }

            const lateDays = (item.count_late_payment_days !== undefined && item.count_late_payment_days !== null && item.count_late_payment_days !== '')
              ? Number(item.count_late_payment_days)
              : null;

            dismantlingCustomers.push({
              id_pelanggan: idPelanggan,
              status_aktivasi: 'Ready To Dismantle',
              wo_dismantle: woStr,
              telat_bayar_hari: lateDays,
              tanggal_berakhir: expDate,
              stasiun: stationName,
              wo_teknisi: techName,
              wo_ticket: ticket,
              wo_date: woDate
            });
          }

          if (items.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (_err) {
          hasMore = false;
          break;
        }
      }
    });

    await Promise.all(stationTasks);

    if (dismantlingCustomers.length === 0) {
      return { success: true, count: 0, updatedCount: 0 };
    }

    if (onProgress) onProgress(`Menyimpan status ${dismantlingCustomers.length} pelanggan WO Dismantle ke Supabase...`);

    // Dedup by id_pelanggan
    const uniqueMap = new Map();
    dismantlingCustomers.forEach(c => uniqueMap.set(c.id_pelanggan.toUpperCase(), c));
    const dedupedList = Array.from(uniqueMap.values());

    // Siapkan batch payload untuk Supabase
    // Simpan ke kolom khusus wo_dismantle agar tidak menimpa reason_dismantle
    const nowIso = new Date().toISOString();
    const rowsToUpsert = dedupedList.map(c => ({
      id_pelanggan: c.id_pelanggan,
      status_aktivasi: 'Ready To Dismantle',
      wo_dismantle: c.wo_dismantle || null,
      telat_bayar_hari: (c.telat_bayar_hari !== null && c.telat_bayar_hari !== undefined) ? Number(c.telat_bayar_hari) : null,
      tanggal_berakhir: c.tanggal_berakhir || null,
      updated_at: nowIso
    }));

    const CHUNK_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(chunk)
        });
        if (res.ok) {
          updatedCount += chunk.length;
        } else {
          // Fallback jika kolom wo_dismantle belum dibuat di database oleh user
          const fallbackChunk = chunk.map(row => {
            const { wo_dismantle, ...rest } = row;
            return {
              ...rest,
              reason_dismantle: wo_dismantle
            };
          });
          const fbRes = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(fallbackChunk)
          });
          if (fbRes.ok) updatedCount += chunk.length;
        }
      } catch (err) {
        console.warn('[FAST DISMANTLE SYNC] Gagal upsert batch:', err);
      }
    }

    return {
      success: true,
      count: dedupedList.length,
      updatedCount,
      dismantlingList: dedupedList
    };

  } catch (err) {
    console.error('[FAST DISMANTLE SYNC ERROR]:', err);
    return { success: false, count: 0, updatedCount: 0, error: err.message };
  }
}
