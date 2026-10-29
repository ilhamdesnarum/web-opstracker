// =========================================================================
// SCRIPT SINKRONISASI NAMA IKR PARTNER & SALES DARI API STARLITE KE SUPABASE
// =========================================================================

try {
  process.loadEnvFile();
} catch (e) {
  // .env file is optional
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jtmferyskpbnacluyafs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const PARTNER_TOKEN = process.env.STARLITE_PARTNER_TOKEN;

if (!PARTNER_TOKEN || !SUPABASE_KEY) {
  console.error("❌ ERROR: STARLITE_PARTNER_TOKEN atau SUPABASE_KEY tidak ditemukan!");
  process.exit(1);
}

const authHeader = PARTNER_TOKEN.startsWith('Bearer ') ? PARTNER_TOKEN : `Bearer ${PARTNER_TOKEN}`;
const headers = {
  'Authorization': authHeader,
  'Accept': 'application/json'
};

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

function extractCustomerId(c) {
  if (!c) return '';
  if (c.customer_id) {
    if (typeof c.customer_id === 'string') return c.customer_id.trim();
    if (c.customer_id.customer_id) return String(c.customer_id.customer_id).trim();
  }
  if (c.id_pelanggan) return String(c.id_pelanggan).trim();
  if (c.id) return String(c.id).trim();
  return '';
}

function extractSalesName(c) {
  if (!c) return null;
  let s = null;
  if (c.sales_id && typeof c.sales_id === 'object' && c.sales_id.name) s = c.sales_id.name;
  else if (typeof c.sales_id === 'string' && c.sales_id.trim()) s = c.sales_id;
  if (!s && c.customer_id && typeof c.customer_id === 'object') {
    if (c.customer_id.sales_id && typeof c.customer_id.sales_id === 'object' && c.customer_id.sales_id.name) s = c.customer_id.sales_id.name;
    else if (typeof c.customer_id.sales_id === 'string' && c.customer_id.sales_id.trim()) s = c.customer_id.sales_id;
  }
  if (!s) return null;
  const cleaned = String(s).trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'daftar mandiri') return null;
  return cleaned;
}

function extractIkrPartnerName(c) {
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

async function batchUpsert(updates) {
  if (!updates || updates.length === 0) return true;
  const CHUNK_SIZE = 50;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?on_conflict=id_pelanggan`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(30000)
        });
        if (res.ok) {
          success = true;
          break;
        } else {
          const text = await res.text();
          console.error(`   ❌ Supabase Upsert Gagal (attempt ${attempt}, ${res.status}):`, text);
        }
      } catch (err) {
        console.error(`   ⚠️ Supabase Upsert Error (attempt ${attempt}):`, err.message);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return true;
}

async function fetchPage(url, retries = 3) {
  for (let r = 0; r <= retries; r++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
      if (res.ok) {
        const j = await res.json();
        return j?.data || [];
      }
      if (res.status === 401) {
        console.error('❌ Token Partner API expired!');
        return [];
      }
    } catch (e) {
      if (r === retries) return [];
      await new Promise(res => setTimeout(res, 500));
    }
  }
  return [];
}

async function syncStation(stationName, partnerId) {
  console.log(`\n📡 Mengambil data untuk Stasiun: ${stationName}...`);
  let page = 1;
  const maxPages = parseInt(process.env.MAX_PAGES || '9999', 10);
  const updatesIkr = [];
  const updatesSales = [];
  const seenIds = new Set();
  let totalIkrFound = 0;

  while (page <= maxPages) {
    const url = `https://api-mitra.starliteindonesia.com/mitra/customer/active?page=${page}&sort_order=DESC&sales_partner_id=${partnerId}`;
    const items = await fetchPage(url);
    if (!items || items.length === 0) break;

    for (const item of items) {
      const cid = extractCustomerId(item);
      if (!cid || seenIds.has(cid.toUpperCase())) continue;
      seenIds.add(cid.toUpperCase());

      const ikr = extractIkrPartnerName(item);
      const sales = extractSalesName(item);

      if (ikr) {
        updatesIkr.push({ id_pelanggan: cid, ikr_partner: ikr });
        totalIkrFound++;
      }
      if (sales) {
        updatesSales.push({ id_pelanggan: cid, nama_sales: sales });
      }
    }

    if (page % 5 === 0 || items.length < 10) {
      console.log(`   📄 Hal ${page}: ${seenIds.size} pelanggan diperiksa, ${totalIkrFound} IKR ditemukan...`);
    }

    // Flush ke Supabase tiap 50 data agar aman jika terjadi interupsi jaringan
    if (updatesIkr.length >= 50) {
      const chunk = updatesIkr.splice(0, updatesIkr.length);
      await batchUpsert(chunk);
    }
    if (updatesSales.length >= 50) {
      const chunk = updatesSales.splice(0, updatesSales.length);
      await batchUpsert(chunk);
    }

    if (items.length < 10) break;
    page++;
  }

  // Flush sisa antrean
  if (updatesIkr.length > 0) {
    console.log(`   💾 Upsert sisa ${updatesIkr.length} data IKR Partner ke Supabase...`);
    await batchUpsert(updatesIkr);
  }
  if (updatesSales.length > 0) {
    await batchUpsert(updatesSales);
  }
  if (totalIkrFound === 0) {
    console.log(`   ℹ️ Tidak ada data IKR untuk stasiun ini.`);
  }

  return { total: seenIds.size, ikrCount: totalIkrFound };
}

async function main() {
  console.log("=================================================================");
  console.log("🚀 SINKRONISASI NAMA IKR PARTNER & SALES KE SUPABASE");
  console.log("=================================================================");
  const t0 = Date.now();
  let grandTotal = 0;
  let grandIkr = 0;

  for (const [stasiun, pid] of Object.entries(PARTNER_STATION_IDS)) {
    const { total, ikrCount } = await syncStation(stasiun, pid);
    grandTotal += total;
    grandIkr += ikrCount;
  }

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n=================================================================");
  console.log(`🎉 SELESAI dalam ${duration}s!`);
  console.log(`Total Pelanggan Diperiksa: ${grandTotal}`);
  console.log(`Total IKR Partner Terisi : ${grandIkr}`);
  console.log("=================================================================");
}

if (process.argv[1] && process.argv[1].includes('sync_ikr_partner')) {
  main();
}
