// =========================================================================
// SERVICE: SINKRONISASI NAMA SALES DARI API PARTNER STARLITE
// =========================================================================
// Menarik data nama sales dari API Partner (Active & New) dan menyinkronkannya
// langsung ke Supabase tanpa mengubah koordinat, status IKR, atau status aktivasi.
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

/**
 * Ekstrak nama sales dari data pelanggan API Partner secara komprehensif
 */
export function extractSalesName(c) {
  if (!c) return null;
  let s = null;

  // 1. Cek sales_id di level root
  if (c.sales_id && typeof c.sales_id === 'object' && c.sales_id.name) {
    s = c.sales_id.name;
  } else if (typeof c.sales_id === 'string' && c.sales_id.trim()) {
    s = c.sales_id;
  }

  // 2. Cek di dalam customer_id jika berupa objek
  if (!s && c.customer_id && typeof c.customer_id === 'object') {
    if (c.customer_id.sales_id && typeof c.customer_id.sales_id === 'object' && c.customer_id.sales_id.name) {
      s = c.customer_id.sales_id.name;
    } else if (typeof c.customer_id.sales_id === 'string' && c.customer_id.sales_id.trim()) {
      s = c.customer_id.sales_id;
    } else if (c.customer_id.sales_visit_id && typeof c.customer_id.sales_visit_id === 'object') {
      const cvs = c.customer_id.sales_visit_id.sales_id;
      s = typeof cvs === 'object' ? cvs?.name : cvs;
    }
  }

  // 3. Cek di dalam sales_visit_id root
  if (!s && c.sales_visit_id && typeof c.sales_visit_id === 'object') {
    const vs = c.sales_visit_id.sales_id;
    s = typeof vs === 'object' ? vs?.name : vs;
  }

  if (!s) return null;
  const cleaned = String(s).trim();
  if (!cleaned) return null;
  if (cleaned === '-' || cleaned.toLowerCase() === 'daftar mandiri') {
    return '-'; // "-" means Daftar Mandiri via web
  }
  return cleaned;
}

/**
 * Ekstrak ID Pelanggan
 */
export function extractCustomerId(c) {
  if (!c) return '';
  if (c.customer_id) {
    if (typeof c.customer_id === 'string') return c.customer_id.trim();
    if (c.customer_id.customer_id) return String(c.customer_id.customer_id).trim();
  }
  if (c.id_pelanggan) return String(c.id_pelanggan).trim();
  if (c.id) return String(c.id).trim();
  return '';
}

/**
 * Pemicu sinkronisasi nama sales dari API Partner ke Supabase
 * @param {Object} options
 * @param {Array} options.pelangganList - Data pelanggan yang sedang ada di memori
 * @param {number} options.maxPages - Jumlah halaman API aktif yang ditarik paralel (default 6 halaman)
 * @param {Function} options.onProgress - Callback progress opsional
 */
export async function syncSalesFromPartnerApi({
  pelangganList = [],
  maxPages = 10,
  onProgress = null
} = {}) {
  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STARLITE_PARTNER_TOKEN)
    ? import.meta.env.VITE_STARLITE_PARTNER_TOKEN
    : DEFAULT_PARTNER_TOKEN;

  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const headers = {
    'Authorization': authHeader,
    'Accept': 'application/json'
  };

  const partnerSalesMap = new Map(); // idUpper -> salesName

  try {
    if (onProgress) onProgress('Menghubungkan ke API Partner Starlite...');

    // Fungsi helper dengan Retry (maksimal 3 kali) & Timeout 25 detik
    const fetchWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);
          
          // Tambahkan sedikit jeda acak agar server tidak kelebihan beban serentak
          await new Promise(res => setTimeout(res, Math.random() * 500));
          
          const res = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = await res.json();
            return json?.data || [];
          }
        } catch (_err) {
          // Abaikan error dan ulangi
        }
      }
      return [];
    };

    // 1. Tarik Pelanggan Aktif Terbaru (Paralel beberapa halaman)
    const activePages = Array.from({ length: maxPages }, (_, i) => i + 1);
    const activePromises = activePages.map((p) => {
      return fetchWithRetry(`https://api-mitra.starliteindonesia.com/mitra/customer/active?page=${p}&page_size=20&sort_order=DESC`);
    });

    // 2. Tarik Pelanggan Baru untuk 11 Stasiun (Paralel)
    // Gunakan page_size=50 agar registrasi baru hari ini tercover menyeluruh
    const newPromises = Object.entries(PARTNER_STATION_IDS).map(([_, partnerId]) => {
      return fetchWithRetry(`https://api-mitra.starliteindonesia.com/mitra/customer/new?page=1&page_size=50&sort_order=DESC&sales_partner_id=${partnerId}`);
    });

    const [activeBatches, newBatches] = await Promise.all([
      Promise.all(activePromises),
      Promise.all(newPromises)
    ]);

    // Gabungkan hasil dari active dan new
    const allFetched = [...activeBatches.flat(), ...newBatches.flat()];

    for (const item of allFetched) {
      const cid = extractCustomerId(item);
      if (!cid) continue;
      const sales = extractSalesName(item);
      if (sales) {
        partnerSalesMap.set(cid.toUpperCase(), sales);
      }
    }

    if (partnerSalesMap.size === 0) {
      return {
        success: true,
        updatedCount: 0,
        salesMap: {},
        message: 'Tidak ada data nama sales baru dari API Partner.'
      };
    }

    if (onProgress) onProgress(`Memeriksa ${partnerSalesMap.size} sales dari API Partner...`);

    // 3. Cocokkan dengan data pelanggan lokal
    const existingMap = new Map();
    (pelangganList || []).forEach(p => {
      const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (id) existingMap.set(id, p);
    });

    // Cek ID yang ada di partnerSalesMap tapi tidak ada di existingMap (misal data state lokal belum sync pelanggan baru)
    const missingIds = [];
    partnerSalesMap.forEach((_, idUpper) => {
      if (!existingMap.has(idUpper)) {
        missingIds.push(idUpper);
      }
    });

    // Ambil data pelanggan yang belum ada di memory langsung dari Supabase
    if (missingIds.length > 0) {
      try {
        for (let i = 0; i < missingIds.length; i += 50) {
          const chunk = missingIds.slice(i, i + 50);
          const formattedIn = chunk.map(id => `"${id}"`).join(',');
          const sRes = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=in.(${encodeURIComponent(formattedIn)})&select=id_pelanggan,nama_sales`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
          if (sRes.ok) {
            const foundRows = await sRes.json();
            (foundRows || []).forEach(row => {
              if (row && row.id_pelanggan) {
                const rId = String(row.id_pelanggan).trim().toUpperCase();
                existingMap.set(rId, {
                  idPelanggan: row.id_pelanggan,
                  namaSales: row.nama_sales
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('[SALES SYNC] Fallback cek Supabase error:', err);
      }
    }

    const updates = [];
    partnerSalesMap.forEach((salesName, idUpper) => {
      const existing = existingMap.get(idUpper);
      if (existing) {
        const curSales = String(existing.namaSales || existing.nama_sales || '').trim();
        // Update hanya jika ada perbedaan nama sales (ini juga akan mengupdate data yang dulunya 'Daftar Mandiri' menjadi '-')
        if (curSales !== salesName) {
          updates.push({
            id_pelanggan: existing.idPelanggan || existing.id_pelanggan || idUpper,
            nama_sales: salesName
          });
        }
      }
    });

    const salesMapObj = Object.fromEntries(partnerSalesMap);

    if (updates.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        totalChecked: partnerSalesMap.size,
        salesMap: salesMapObj,
        message: 'Semua nama sales sudah sesuai dan sinkron.'
      };
    }

    if (onProgress) onProgress(`Memperbarui ${updates.length} nama sales ke database...`);

    // 4. Batch Upsert ke Supabase menggunakan resolution=merge-duplicates (Sangat cepat & aman)
    const CHUNK_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
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
        successCount += chunk.length;
      } else {
        const errText = await res.text();
        console.warn('[SALES SYNC] Gagal update batch Supabase:', errText);
      }
    }

    return {
      success: true,
      updatedCount: successCount,
      totalChecked: partnerSalesMap.size,
      updatedList: updates,
      salesMap: salesMapObj,
      message: `${successCount} nama sales berhasil disinkronkan dari Web Partner.`
    };
  } catch (err) {
    console.error('[SALES SYNC ERROR]:', err);
    return {
      success: false,
      error: err.message,
      updatedCount: 0,
      salesMap: {},
      message: `Gagal sinkronisasi sales: ${err.message}`
    };
  }
}
