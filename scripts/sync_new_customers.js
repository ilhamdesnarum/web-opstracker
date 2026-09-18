// =========================================================================
// SCRIPT SINKRONISASI PELANGGAN BARU -> SUPABASE (NODE.JS / GITHUB ACTIONS)
// =========================================================================
// Menarik data seluruh Pelanggan Baru dari Partner API Starlite:
// - waiting-for-installation
// - process-installation
// - process-activate-internet
// - cancel
// =========================================================================
// PROTEKSI MUTLAK:
// 1. Pelanggan yang SUDAH ADA di Supabase TIDAK AKAN diubah status_ikr /
//    status_aktivasi / kendalanya (Aman dari tertimpa kembali ke Belum).
// 2. Koordinat (Latitude & Longitude) diekstrak secara akurat dari
//    c.customer_id.latitude & c.customer_id.longitude atau fallback.
// 3. Tanggal registrasi, kontak, ODP, dan alamat diperbarui otomatis.
// =========================================================================

try {
  process.loadEnvFile();
} catch (e) {
  // .env file is optional (e.g. running in CI/GitHub Actions with env vars)
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jtmferyskpbnacluyafs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const PARTNER_TOKEN = process.env.STARLITE_PARTNER_TOKEN;
const PARTNER_COOKIE = process.env.STARLITE_PARTNER_COOKIE;

if (!PARTNER_TOKEN || !SUPABASE_KEY) {
  console.error("❌ ERROR: STARLITE_PARTNER_TOKEN atau SUPABASE_KEY tidak ditemukan di environment variables!");
  process.exit(1);
}

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

function formatKeWIB(isoString) {
  if (!isoString) return "";
  return isoString.substring(0, 19).replace("T", " ");
}

function extractCoordinates(c) {
  let lat = "";
  let lng = "";

  // 1. Cek di level customer_id jika berupa object (prioritas utama endpoint /new)
  if (c.customer_id && typeof c.customer_id === 'object') {
    if (c.customer_id.latitude !== undefined && c.customer_id.latitude !== null && c.customer_id.latitude !== "") {
      lat = String(c.customer_id.latitude).trim().replace(",", ".");
    }
    if (c.customer_id.longitude !== undefined && c.customer_id.longitude !== null && c.customer_id.longitude !== "") {
      lng = String(c.customer_id.longitude).trim().replace(",", ".");
    }
    if (!lat && c.customer_id.lat) lat = String(c.customer_id.lat).trim().replace(",", ".");
    if (!lng && (c.customer_id.lng || c.customer_id.long)) lng = String(c.customer_id.lng || c.customer_id.long).trim().replace(",", ".");
  }

  // 2. Cek di root object
  if (!lat && c.latitude !== undefined && c.latitude !== null && c.latitude !== "") {
    lat = String(c.latitude).trim().replace(",", ".");
  }
  if (!lng && c.longitude !== undefined && c.longitude !== null && c.longitude !== "") {
    lng = String(c.longitude).trim().replace(",", ".");
  }
  if (!lat && c.lat !== undefined && c.lat !== null && c.lat !== "") {
    lat = String(c.lat).trim().replace(",", ".");
  }
  if (!lng && (c.lng !== undefined || c.long !== undefined)) {
    lng = String(c.lng || c.long).trim().replace(",", ".");
  }

  // 3. Cek di sales_visit_id jika ada
  if ((!lat || !lng) && c.sales_visit_id && typeof c.sales_visit_id === 'object') {
    if (!lat && (c.sales_visit_id.latitude || c.sales_visit_id.lat)) {
      lat = String(c.sales_visit_id.latitude || c.sales_visit_id.lat).trim().replace(",", ".");
    }
    if (!lng && (c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long)) {
      lng = String(c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long).trim().replace(",", ".");
    }
  }

  // 4. Cek di installation_info_id jika ada
  if ((!lat || !lng) && c.installation_info_id) {
    const instList = Array.isArray(c.installation_info_id) ? c.installation_info_id : [c.installation_info_id];
    for (const inst of instList) {
      if (!inst) continue;
      if (!lat && (inst.latitude || inst.lat)) {
        lat = String(inst.latitude || inst.lat).trim().replace(",", ".");
      }
      if (!lng && (inst.longitude || inst.lng || inst.long)) {
        lng = String(inst.longitude || inst.lng || inst.long).trim().replace(",", ".");
      }
      if (lat && lng) break;
    }
  }

  return { lat, lng };
}

function extractRegDate(c) {
  if (c.registration_date) return formatKeWIB(c.registration_date);
  if (c.visit_date) return formatKeWIB(c.visit_date);
  if (c.sales_visit_id && c.sales_visit_id.visit_date) return formatKeWIB(c.sales_visit_id.visit_date);
  if (c.customer_id && typeof c.customer_id === 'object' && c.customer_id.registration_date) return formatKeWIB(c.customer_id.registration_date);
  if (c.created_at) return formatKeWIB(c.created_at);
  return "";
}

function extractOdpInfo(c) {
  let odp = "";
  let portOdp = "";

  if (c.installation_info_id) {
    const instList = Array.isArray(c.installation_info_id) ? c.installation_info_id : [c.installation_info_id];
    if (instList.length > 0 && instList[0]) {
      const inst = instList[0];
      portOdp = (inst.port_number !== undefined && inst.port_number !== null) ? String(inst.port_number) : (inst.port ? String(inst.port) : "");
      if (inst.device_id) {
        odp = inst.device_id.code || inst.device_id.name || "";
      }
    }
  }

  if (!odp) {
    odp = c.odp || c.odp_name || c.odp_code || c.fat || c.fat_code || c.fat_name || (c.customer_id && typeof c.customer_id === 'object' ? (c.customer_id.odp || c.customer_id.fat_code || c.customer_id.fat_name) : "") || "";
  }
  if (!portOdp) {
    portOdp = c.port_odp || c.port || c.fat_port || c.odp_port || (c.customer_id && typeof c.customer_id === 'object' ? (c.customer_id.port_odp || c.customer_id.port) : "") || "";
  }

  return { odp, portOdp };
}

function extractSalesName(c) {
  if (c.sales_id && typeof c.sales_id === 'object' && c.sales_id.name) {
    return String(c.sales_id.name).trim();
  }
  if (c.customer_id && typeof c.customer_id === 'object' && c.customer_id.sales_id) {
    const s = c.customer_id.sales_id;
    if (typeof s === 'object' && s.name) return String(s.name).trim();
    if (typeof s === 'string' && s.trim()) return s.trim();
  }
  if (typeof c.sales_id === 'string' && c.sales_id.trim()) {
    return c.sales_id.trim();
  }
  return "Daftar Mandiri";
}

async function checkExistingInSupabase(customerIds) {
  const map = new Map();
  if (!customerIds || customerIds.length === 0) return map;

  const cleanIds = customerIds.map(id => String(id).trim().replace(/['"(),]/g, '')).filter(Boolean);
  if (cleanIds.length === 0) return map;

  for (let i = 0; i < cleanIds.length; i += 50) {
    const chunk = cleanIds.slice(i, i + 50);
    const url = `${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=in.(${chunk.join(',')})&select=id_pelanggan,status_ikr,status_aktivasi,issue_kendala,latitude,longitude,tanggal_registrasi,nama_sales`;
    try {
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        signal: AbortSignal.timeout(20000)
      });
      if (res.ok) {
        const found = await res.json();
        for (const f of found) {
          if (f && f.id_pelanggan) {
            map.set(f.id_pelanggan.trim(), f);
            map.set(f.id_pelanggan.trim().toUpperCase(), f);
          }
        }
      }
    } catch (e) {
      console.error('   ⚠️ Error query Supabase chunk:', e.message);
    }
  }

  return map;
}

async function upsertToSupabase(rows) {
  if (!rows || rows.length === 0) return true;
  const url = `${SUPABASE_URL}/rest/v1/data_pelanggan`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`   ❌ Supabase Upsert Error (${res.status}):`, txt);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`   ❌ Supabase Network Error:`, err.message);
    return false;
  }
}

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec";

async function writeNewCustomerToSheet(row) {
  try {
    const payload = {
      stasiun: row.stasiun,
      idPelanggan: row.id_pelanggan,
      namaPelanggan: row.nama_pelanggan,
      alamat: row.alamat,
      nomorHp: row.nomor_hp,
      odpAktual: row.odp,
      portOdp: row.port_odp,
      latitude: row.latitude,
      longitude: row.longitude,
      namaSales: row.nama_sales,
      aktivasi: "Belum",
      catatan: row.catatan || ""
    };

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'insertPelangganBaru', payload: payload }),
      signal: AbortSignal.timeout(30000)
    });

    const txt = await res.text();
    let json = {};
    try { json = JSON.parse(txt); } catch (_) {}

    if (res.ok && !json.error) {
      console.log(`   📄 [Dual-Write Sheet] Sukses tulis ${row.id_pelanggan} ke spreadsheet ${row.stasiun}`);
      return true;
    } else {
      console.warn(`   ⚠️ [Dual-Write Sheet] Respon ${row.id_pelanggan}: ${json.error || txt || res.statusText}`);
      return false;
    }
  } catch (err) {
    console.warn(`   ⚠️ [Dual-Write Sheet] Gagal kirim ${row.id_pelanggan} ke Apps Script: ${err.message}`);
    return false;
  }
}

async function main() {
  const t0 = Date.now();
  console.log("=================================================================");
  console.log("🚀 SINKRONISASI OTOMATIS PELANGGAN BARU (STARLITE -> SUPABASE)");
  console.log("=================================================================");

  // Tentukan target stasiun
  const inputStation = process.env.SYNC_STATIONS || 'ALL';
  let targetStations = Object.keys(PARTNER_STATION_IDS);
  if (inputStation !== 'ALL' && PARTNER_STATION_IDS[inputStation]) {
    targetStations = [inputStation];
  }
  console.log(`📍 Stasiun Target: ${targetStations.join(', ')}`);

  // Status pelanggan baru di API Partner (tanpa status cancel)
  const newStatuses = [
    "waiting-for-installation",
    "process-installation",
    "process-activate-internet"
  ];

  let totalNewInserted = 0;
  let totalExistingUpdated = 0;
  const pageSize = 10;

  for (const stationName of targetStations) {
    const partnerId = PARTNER_STATION_IDS[stationName];
    console.log(`\n🏢 Memproses Stasiun: [${stationName}]...`);

    const rawCustomers = [];
    const seenCustIds = new Set();

    for (const ikrStatus of newStatuses) {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 50) {
        const url = `https://api-mitra.starliteindonesia.com/mitra/customer/new?page=${page}&page_size=${pageSize}&sort_order=DESC&ikr_status=${ikrStatus}&sales_partner_id=${partnerId}`;
        try {
          const res = await fetch(url, {
            headers: {
              'Authorization': PARTNER_TOKEN,
              'Cookie': PARTNER_COOKIE
            },
            signal: AbortSignal.timeout(15000)
          });

          if (!res.ok) {
            hasMore = false;
            break;
          }

          const json = await res.json();
          const items = json.data || [];

          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            const rawId = item.customer_id && typeof item.customer_id === 'string'
              ? item.customer_id
              : (item.customer_id ? item.customer_id.customer_id : "");
            const idPelanggan = String(rawId || "").trim();
            if (!idPelanggan) continue;

            const idUpper = idPelanggan.toUpperCase();
            if (seenCustIds.has(idUpper)) continue;
            seenCustIds.add(idUpper);

            rawCustomers.push({
              item: item,
              idPelanggan: idPelanggan,
              ikrStatus: ikrStatus
            });
          }

          if (items.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (err) {
          console.error(`   ⚠️ Peringatan stasiun ${stationName} (${ikrStatus}) hal ${page}:`, err.message);
          hasMore = false;
        }
      }
    }

    if (rawCustomers.length === 0) {
      console.log(`   ✔️ Tidak ada pelanggan baru di stasiun ${stationName}.`);
      continue;
    }

    // Periksa status data di Supabase untuk semua customer yang ditemukan di stasiun ini
    const customerIdsToLookup = rawCustomers.map(r => r.idPelanggan);
    const existingSupabaseMap = await checkExistingInSupabase(customerIdsToLookup);

    const rowsNew = [];
    const rowsExistingNoStatus = [];

    for (const { item, idPelanggan, ikrStatus } of rawCustomers) {
      const nama = item.name || (item.customer_id ? item.customer_id.name : "") || "";
      const telepon = item.phone_number || (item.customer_id ? item.customer_id.phone_number : "") || "";
      const alamat = item.address || (item.customer_id ? item.customer_id.address : "") || "";
      const catatan = item.notes || "";
      const { lat, lng } = extractCoordinates(item);
      const tglRegistrasi = extractRegDate(item);
      const { odp, portOdp } = extractOdpInfo(item);
      const namaSales = extractSalesName(item);

      const existingData = existingSupabaseMap.get(idPelanggan) || existingSupabaseMap.get(idPelanggan.toUpperCase());

      if (existingData) {
        // [!] SUDAH ADA DI SUPABASE (PELANGGAN LAMA):
        // 1. JANGAN SERTAKAN status_ikr & status_aktivasi agar status kendala aman.
        // 2. JANGAN PERNAH perbarui latitude & longitude (sudah diatur presisi saat aktivasi).
        // 3. JANGAN timpa nama_sales (pelanggan lama sudah disinkronkan manual).
        const currentSales = existingData.nama_sales ? String(existingData.nama_sales).trim() : "";
        let newSales = currentSales;
        if (!currentSales || currentSales === "-" || currentSales === "Daftar Mandiri") {
          if (namaSales && namaSales !== "Daftar Mandiri" && namaSales !== "-") {
            newSales = namaSales;
          }
        }

        const payloadExisting = {
          id_pelanggan: idPelanggan,
          nama_pelanggan: nama,
          nomor_hp: telepon,
          alamat: alamat,
          catatan: catatan,
          stasiun: stationName,
          tanggal_registrasi: tglRegistrasi || existingData.tanggal_registrasi || null,
          odp: odp || existingData.odp || existingData.kode_odp || existingData.odp_aktual || null,
          port_odp: portOdp || existingData.port_odp || null,
          nama_sales: newSales || null,
          updated_at: new Date().toISOString()
        };

        rowsExistingNoStatus.push(payloadExisting);
      } else {
        // [!] DATA BARU MURNI:
        // Status awal untuk pendaftaran baru adalah Belum
        const initialStatus = "Belum";
        const payloadNew = {
          id_pelanggan: idPelanggan,
          nama_pelanggan: nama,
          nomor_hp: telepon,
          alamat: alamat,
          catatan: catatan,
          nama_sales: namaSales,
          status_ikr: initialStatus,
          status_aktivasi: initialStatus,
          latitude: lat || "",
          longitude: lng || "",
          stasiun: stationName,
          odp: odp,
          port_odp: portOdp,
          tanggal_registrasi: tglRegistrasi,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        rowsNew.push(payloadNew);
      }
    }

    // Push ke Supabase & Dual-Write ke Google Spreadsheet per stasiun
    if (rowsNew.length > 0) {
      console.log(`   ✨ Menambahkan ${rowsNew.length} pelanggan baru ke Supabase...`);
      await upsertToSupabase(rowsNew);
      totalNewInserted += rowsNew.length;

      console.log(`   📄 Melakukan dual-write ${rowsNew.length} pelanggan baru ke Google Spreadsheet...`);
      for (const newCust of rowsNew) {
        await writeNewCustomerToSheet(newCust);
      }
    }

    if (rowsExistingNoStatus.length > 0) {
      console.log(`   🔄 Memperbarui info/koordinat ${rowsExistingNoStatus.length} pelanggan existing (status aman)...`);
      await upsertToSupabase(rowsExistingNoStatus);
      totalExistingUpdated += rowsExistingNoStatus.length;
    }
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n=================================================================");
  console.log(`🎉 SINKRONISASI SELESAI DALAM ${durationSec} DETIK!`);
  console.log(`➕ Pelanggan Baru Ditambahkan: ${totalNewInserted}`);
  console.log(`🔄 Pelanggan Existing Diperbarui: ${totalExistingUpdated}`);
  console.log("=================================================================");
}

main();
