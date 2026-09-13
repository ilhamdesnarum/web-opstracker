// =========================================================================
// SCRIPT SINKRONISASI NAMA SALES (SEMUA STATUS: SUSPEND, DISMANTLE, AKTIF)
// =========================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jtmferyskpbnacluyafs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw';

const PARTNER_TOKEN = process.env.STARLITE_PARTNER_TOKEN || 
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM';

const PARTNER_COOKIE = process.env.STARLITE_PARTNER_COOKIE || 
  '_ga=GA1.1.1000327763.1779010726; _gcl_au=1.1.1451051866.1779010727; _fbp=fb.1.1779010726946.118555004272738158; _tt_enable_cookie=1; _ttp=01KRTMTV531SKYMHFWWT9XR4DH_.tt.1; _ga_DFWC1L1VBM=GS2.1.s1782135322$o6$g0$t1782135322$j60$l0$h0; ttcsid=1782135322245::M649s3W_u5vulwz81TSP.5.1782135323124.0::1.-2031.0::0.0.0.0::0.0.0; ttcsid_D6N6GJRC77U5VG9U4DSG=1782135322245::WsZdqWnprfIDO3deWfQF.5.1782135323125.0; _ga_1ST28GMNXL=GS2.1.s1782207506$o7$g0$t1782207506$j60$l0$h0; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM';

const PARTNER_STATION_IDS = {
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

async function batchUpsertSales(salesUpdates) {
  if (!salesUpdates || salesUpdates.length === 0) return true;
  
  const CHUNK_SIZE = 50;
  for (let i = 0; i < salesUpdates.length; i += CHUNK_SIZE) {
    const chunk = salesUpdates.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(chunk)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`   ❌ Supabase Upsert Gagal (${res.status}):`, text);
      }
    } catch (err) {
      console.error(`   ❌ Supabase Error:`, err.message);
    }
  }
  return true;
}

function extractSalesName(customer) {
  if (customer.sales_id && typeof customer.sales_id === 'object' && customer.sales_id.name) {
    return String(customer.sales_id.name).trim();
  }
  if (customer.customer_id && typeof customer.customer_id === 'object' && customer.customer_id.sales_id) {
    const s = customer.customer_id.sales_id;
    if (typeof s === 'object' && s.name) return String(s.name).trim();
    if (typeof s === 'string' && s.trim()) return s.trim();
  }
  if (typeof customer.sales_id === 'string' && customer.sales_id.trim()) {
    return customer.sales_id.trim();
  }
  return 'Daftar Mandiri';
}

function extractCustomerId(customer) {
  if (customer.customer_id) {
    if (typeof customer.customer_id === 'string') return customer.customer_id.trim();
    if (customer.customer_id.customer_id) return String(customer.customer_id.customer_id).trim();
  }
  if (customer.id_pelanggan) return String(customer.id_pelanggan).trim();
  return '';
}

async function fetchPageWithRetry(url, headers, maxRetries = 3) {
  for (let r = 0; r <= maxRetries; r++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        console.error('   ❌ Token API expired!');
        return null;
      }
    } catch (err) {
      if (r === maxRetries) {
        // console.error(`   ⚠️ Fetch error ${url}: ${err.message}`);
        return null;
      }
    }
    await new Promise(res => setTimeout(res, 1000 * (r + 1)));
  }
  return null;
}

async function syncStatusForStation(stationName, partnerId, statusType, headers) {
  let page = 1;
  const pageSize = 10;
  const CONCURRENCY = 5;
  const updates = [];
  const seenIds = new Set();
  let done = false;

  while (!done) {
    const pageBatch = [];
    for (let c = 0; c < CONCURRENCY; c++) {
      pageBatch.push(page + c);
    }

    const batchPromises = pageBatch.map(p => {
      let url = '';
      if (statusType === 'active') {
        url = `https://api-mitra.starliteindonesia.com/mitra/customer/active?page=${p}&page_size=${pageSize}&sales_partner_id=${partnerId}`;
      } else {
        url = `https://api-mitra.starliteindonesia.com/mitra/customer/suspend?page=${p}&page_size=${pageSize}&status=${statusType}&sales_partner_id=${partnerId}`;
      }
      return fetchPageWithRetry(url, headers).then(res => ({ page: p, data: res?.data || [] }));
    });

    const batchResults = await Promise.all(batchPromises);

    // Urutkan berdasarkan nomor halaman
    batchResults.sort((a, b) => a.page - b.page);

    for (const res of batchResults) {
      if (res.data.length === 0) {
        done = true;
        break;
      }

      for (const item of res.data) {
        const id = extractCustomerId(item);
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const sales = extractSalesName(item);
        updates.push({
          id_pelanggan: id,
          nama_sales: sales
        });
      }

      if (res.data.length < pageSize) {
        done = true;
        break;
      }
    }

    // Batch upsert tiap 100 pelanggan
    if (updates.length >= 100) {
      await batchUpsertSales(updates.splice(0, updates.length));
    }

    page += CONCURRENCY;
  }

  if (updates.length > 0) {
    await batchUpsertSales(updates);
  }

  return seenIds.size;
}

async function main() {
  const t0 = Date.now();
  console.log('=================================================================');
  console.log('🚀 PENARIKAN DATA NAMA SALES (SUSPEND, DISMANTLE, AKTIF)');
  console.log('=================================================================');

  const headers = {
    Authorization: PARTNER_TOKEN,
    Cookie: PARTNER_COOKIE,
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  const allStations = Object.keys(PARTNER_STATION_IDS);
  const stations = process.env.SYNC_STATIONS ? process.env.SYNC_STATIONS.split(',').map(s => s.trim()) : allStations;
  const targetStatuses = ['suspend', 'ready-to-dismantle', 'dismantled', 'active'];

  let grandTotalUpdated = 0;

  for (let i = 0; i < stations.length; i += 2) {
    const batch = stations.slice(i, i + 2);
    await Promise.all(batch.map(async (st, bIdx) => {
      const pid = PARTNER_STATION_IDS[st];
      console.log(`\n🏢 [${i + bIdx + 1}/${stations.length}] Mulai Stasiun: ${st.toUpperCase()}`);
      for (const status of targetStatuses) {
        console.log(`   ⏳ [${st}] Menarik ${status.toUpperCase()}...`);
        const count = await syncStatusForStation(st, pid, status, headers);
        console.log(`   ✅ [${st}] ${status.toUpperCase()} selesai (${count} pelanggan)`);
        grandTotalUpdated += count;
      }
    }));
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n=================================================================');
  console.log(`🎉 SEMUA SELESAI DALAM ${elapsed} DETIK!`);
  console.log(`✅ Total Pelanggan Diperbarui Nama Sales: ${grandTotalUpdated}`);
  console.log('=================================================================');
}

main();
