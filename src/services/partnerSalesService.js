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
 * Ekstrak nama teknisi IKR Partner dari data API Partner secara komprehensif
 */
export function extractIkrPartnerName(c) {
  if (!c) return null;
  let name = null;

  // 1. Cek submit_request_ikr_id.ikr_id.name (WO instalasi)
  if (c.submit_request_ikr_id && typeof c.submit_request_ikr_id === 'object') {
    const ikrObj = c.submit_request_ikr_id.ikr_id;
    if (ikrObj && typeof ikrObj === 'object' && ikrObj.name) {
      name = ikrObj.name;
    } else if (typeof ikrObj === 'string' && ikrObj.trim()) {
      name = ikrObj;
    }
  }

  // 2. Cek customer_id.submit_request_ikr_id
  if (!name && c.customer_id && typeof c.customer_id === 'object') {
    const sub = c.customer_id.submit_request_ikr_id;
    if (sub && typeof sub === 'object') {
      const ikrObj = sub.ikr_id;
      if (ikrObj && typeof ikrObj === 'object' && ikrObj.name) {
        name = ikrObj.name;
      } else if (typeof ikrObj === 'string' && ikrObj.trim()) {
        name = ikrObj;
      }
    }
  }

  // 3. Cek request_ikr_id.ikr_name
  if (!name && c.request_ikr_id && typeof c.request_ikr_id === 'object') {
    const raw = c.request_ikr_id.ikr_name;
    if (Array.isArray(raw) && raw.length > 0) {
      name = raw[0];
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) name = parsed[0];
        else name = raw;
      } catch (_e) {
        name = raw;
      }
    }
  }

  // 4. Cek customer_id.request_ikr_id
  if (!name && c.customer_id && typeof c.customer_id === 'object' && c.customer_id.request_ikr_id) {
    const raw = c.customer_id.request_ikr_id.ikr_name;
    if (Array.isArray(raw) && raw.length > 0) {
      name = raw[0];
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) name = parsed[0];
        else name = raw;
      } catch (_e) {
        name = raw;
      }
    }
  }

  // 5. Cek ikr_id langsung
  if (!name && c.ikr_id) {
    if (typeof c.ikr_id === 'object' && c.ikr_id.name) name = c.ikr_id.name;
    else if (typeof c.ikr_id === 'string' && c.ikr_id.trim()) name = c.ikr_id;
  }

  if (!name) return null;
  const clean = String(name).trim();
  if (!clean || clean === '-' || clean.toLowerCase() === 'null') return null;
  return clean;
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
  const partnerIkrMap = new Map();   // idUpper -> ikrPartnerName

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

    const partnerBaseUrl = (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    ))
      ? '/api-mitra/mitra'
      : 'https://api-mitra.starliteindonesia.com/mitra';

    // 1. Tarik Pelanggan Aktif Terbaru (Paralel beberapa halaman)
    const activePages = Array.from({ length: maxPages }, (_, i) => i + 1);
    const activePromises = activePages.map((p) => {
      return fetchWithRetry(`${partnerBaseUrl}/customer/active?page=${p}&page_size=20&sort_order=DESC`);
    });

    // 2. Tarik Pelanggan Baru untuk 11 Stasiun (Paralel)
    // Gunakan page_size=50 agar registrasi baru hari ini tercover menyeluruh
    const newPromises = Object.entries(PARTNER_STATION_IDS).map(([_, partnerId]) => {
      return fetchWithRetry(`${partnerBaseUrl}/customer/new?page=1&page_size=50&sort_order=DESC&sales_partner_id=${partnerId}`);
    });

    // 3. Tarik Fasum Aktif Terbaru
    const fasumPromises = [1, 2].map(p => {
      return fetchWithRetry(`${partnerBaseUrl}/fasum/active?page=${p}&page_size=20&sort_order=DESC`);
    });

    const [activeBatches, newBatches, fasumBatches] = await Promise.all([
      Promise.all(activePromises),
      Promise.all(newPromises),
      Promise.all(fasumPromises)
    ]);

    // Gabungkan hasil dari active, new, dan fasum
    const allFetched = [...activeBatches.flat(), ...newBatches.flat(), ...fasumBatches.flat()];

    for (const item of allFetched) {
      const cid = extractCustomerId(item);
      if (!cid) continue;
      const cidUpper = cid.toUpperCase();
      const sales = extractSalesName(item);
      if (sales) {
        partnerSalesMap.set(cidUpper, sales);
      }
      const ikr = extractIkrPartnerName(item);
      if (ikr) {
        partnerIkrMap.set(cidUpper, ikr);
      }
    }

    if (partnerSalesMap.size === 0 && partnerIkrMap.size === 0) {
      return {
        success: true,
        updatedCount: 0,
        salesMap: {},
        ikrMap: {},
        message: 'Tidak ada data nama sales atau IKR partner baru dari API Partner.'
      };
    }

    if (onProgress) onProgress(`Memeriksa ${partnerSalesMap.size} sales & ${partnerIkrMap.size} IKR Partner dari API Partner...`);

    // 3. Cocokkan dengan data pelanggan lokal
    const existingMap = new Map();
    (pelangganList || []).forEach(p => {
      const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (id) existingMap.set(id, p);
    });

    // Cek ID yang ada di partnerSalesMap / partnerIkrMap tapi tidak ada di existingMap (misal data state lokal belum sync pelanggan baru)
    const allPartnerIds = new Set([...partnerSalesMap.keys(), ...partnerIkrMap.keys()]);
    const missingIds = [];
    allPartnerIds.forEach((idUpper) => {
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
          let sRes = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=in.(${encodeURIComponent(formattedIn)})&select=id_pelanggan,nama_sales,ikr_partner`, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
          if (!sRes.ok) {
            // Fallback jika kolom ikr_partner belum ada di Supabase
            sRes = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=in.(${encodeURIComponent(formattedIn)})&select=id_pelanggan,nama_sales`, {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              }
            });
          }
          if (sRes.ok) {
            const foundRows = await sRes.json();
            (foundRows || []).forEach(row => {
              if (row && row.id_pelanggan) {
                const rId = String(row.id_pelanggan).trim().toUpperCase();
                existingMap.set(rId, {
                  idPelanggan: row.id_pelanggan,
                  namaSales: row.nama_sales,
                  ikrPartner: row.ikr_partner
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('[SALES/IKR SYNC] Fallback cek Supabase error:', err);
      }
    }

    const updates = [];
    allPartnerIds.forEach((idUpper) => {
      const existing = existingMap.get(idUpper);
      if (existing) {
        const curSales = String(existing.namaSales || existing.nama_sales || '').trim();
        const curIkr = String(existing.ikrPartner || existing.ikr_partner || '').trim();
        const targetSales = partnerSalesMap.get(idUpper);
        const targetIkr = partnerIkrMap.get(idUpper);

        const updateObj = {
          id_pelanggan: existing.idPelanggan || existing.id_pelanggan || idUpper
        };
        let shouldUpdate = false;

        if (targetSales && curSales !== targetSales) {
          updateObj.nama_sales = targetSales;
          shouldUpdate = true;
        }

        if (targetIkr && curIkr !== targetIkr) {
          updateObj.ikr_partner = targetIkr;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          updates.push(updateObj);
        }
      }
    });

    const salesMapObj = Object.fromEntries(partnerSalesMap);
    const ikrMapObj = Object.fromEntries(partnerIkrMap);

    if (updates.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        totalChecked: allPartnerIds.size,
        salesMap: salesMapObj,
        ikrMap: ikrMapObj,
        message: 'Semua nama sales & IKR partner sudah sesuai dan sinkron.'
      };
    }

    if (onProgress) onProgress(`Memperbarui ${updates.length} sales & IKR partner ke database...`);

    // 4. Batch Upsert ke Supabase menggunakan resolution=merge-duplicates (Sangat cepat & aman)
    const CHUNK_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      let res = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
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
        console.warn('[SALES/IKR SYNC] Gagal update batch Supabase:', errText);
        // Fallback jika kolom ikr_partner belum ditambahkan di database
        if (errText.includes('ikr_partner') || errText.includes('PGRST204')) {
          const fallbackChunk = chunk.map(item => {
            const copy = { ...item };
            delete copy.ikr_partner;
            return copy;
          }).filter(item => Object.keys(item).length > 1);

          if (fallbackChunk.length > 0) {
            const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify(fallbackChunk)
            });
            if (fallbackRes.ok) successCount += fallbackChunk.length;
          }
        }
      }
    }

    return {
      success: true,
      updatedCount: successCount,
      totalChecked: allPartnerIds.size,
      updatedList: updates,
      salesMap: salesMapObj,
      ikrMap: ikrMapObj,
      message: `${successCount} data sales & IKR partner berhasil disinkronkan dari Web Partner.`
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

/**
 * Panggil Supabase Edge Function 'sync-partner' untuk menarik data pelanggan baru
 * dan mengupdate status suspend/dismantle dari Web Partner ke database Supabase
 * Endpoint: https://jtmferyskpbnacluyafs.supabase.co/functions/v1/sync-partner
 */
export async function syncPartnerEdgeFunction(options = {}) {
  const station = options.station || 'ALL';
  const url = `${SUPABASE_URL}/functions/v1/sync-partner`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        station: station
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText}`, totalBaru: 0, totalUpdate: 0 };
    }

    const data = await res.json();
    return {
      success: data.status === 'success',
      totalBaru: data.data?.total_baru || 0,
      totalUpdate: data.data?.total_update || 0,
      summary: data.data?.summary || [],
      message: data.message || 'Sinkronisasi Edge Partner selesai.'
    };
  } catch (err) {
    console.error('[EDGE SYNC ERROR]:', err);
    return { success: false, error: err.message, totalBaru: 0, totalUpdate: 0 };
  }
}

