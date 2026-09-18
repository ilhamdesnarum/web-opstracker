// =========================================================================
// SCRIPT UPDATE KOORDINAT PELANGGAN BARU LANGSUNG KE SUPABASE (NODE.JS)
// =========================================================================
// Menarik data dari endpoint /mitra/customer/new untuk seluruh stasiun,
// mengekstrak latitude & longitude dari c.customer_id,
// lalu meng-update Supabase tanpa menimpa status IKR / Aktivasi / Kendala.
// =========================================================================

try {
  process.loadEnvFile();
} catch (e) {
  // .env file is optional
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
  "Kaliwungu": "035f51aa3d54e5e284dd202a04b932c4",
  "Kalibodri": "d027f79d3c452111efc3949dec89a18f",
  "Tawang": "972f9a002e04a16e6c423df80e80969c",
  "Alastua": "e4029158beceeec4420c71ced1ebca9b",
  "Brumbung": "a03dd0e8d8f2e878e58c684fbaa64483",
  "Wadu": "22e3ea03b120584cc7f5f1fc72571f12",
  "Randublatung": "a3371976f338ec30d563cf5ff1bb5ad0",
  "Sulur": "2573f4a2019695eae43dc3ab424fbfcd",
  "Kradenan": "35f1e173a7ed98c3d1fce9353e1e9d91",
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

  // 1. Cek di level customer_id jika berupa object
  if (c.customer_id && typeof c.customer_id === 'object') {
    if (c.customer_id.latitude !== undefined && c.customer_id.latitude !== null && c.customer_id.latitude !== "") {
      lat = String(c.customer_id.latitude).trim().replace(",", ".");
    }
    if (c.customer_id.longitude !== undefined && c.customer_id.longitude !== null && c.customer_id.longitude !== "") {
      lng = String(c.customer_id.longitude).trim().replace(",", ".");
    }
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
    if (!lat && c.sales_visit_id.latitude) {
      lat = String(c.sales_visit_id.latitude).trim().replace(",", ".");
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

async function updateCustomerInSupabase(idPelanggan, payload) {
  const url = `${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=eq.${encodeURIComponent(idPelanggan)}`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ Gagal update Supabase ${idPelanggan} (${res.status}): ${txt}`);
      return false;
    }
    const updated = await res.json();
    return updated.length > 0;
  } catch (err) {
    console.error(`❌ Error koneksi Supabase ${idPelanggan}:`, err.message);
    return false;
  }
}

async function main() {
  console.log("🚀 MEMULAI PROSES PENARIKAN & UPDATE KOORDINAT PELANGGAN BARU KE SUPABASE...");

  // Ambil daftar pelanggan yang berstatus IKR/Aktivasi Belum atau koordinatnya masih kosong di Supabase
  console.log("📥 Mengambil daftar pelanggan di Supabase yang belum memiliki koordinat...");
  let emptyCoordsCustomers = [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?or=(latitude.eq.,latitude.is.null,latitude.eq.-)&select=id_pelanggan,nama_pelanggan,stasiun,status_ikr,status_aktivasi,latitude,longitude,tanggal_registrasi&limit=1000`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    emptyCoordsCustomers = await res.json();
    console.log(`ℹ️ Ditemukan ${emptyCoordsCustomers.length} pelanggan dengan koordinat kosong di Supabase.`);
  } catch (err) {
    console.error("Gagal query Supabase:", err.message);
    return;
  }

  const emptyCoordsMap = new Map();
  for (const c of emptyCoordsCustomers) {
    if (c.id_pelanggan) {
      emptyCoordsMap.set(c.id_pelanggan.trim().toUpperCase(), c);
    }
  }

  const statuses = [
    "waiting-for-installation",
    "process-installation",
    "process-activate-internet",
    "cancel",
    "" // endpoint new tanpa filter ikr_status
  ];

  let totalUpdated = 0;
  let totalFoundCoords = 0;

  for (const [stationName, partnerId] of Object.entries(PARTNER_STATION_IDS)) {
    console.log(`\n======================================================`);
    console.log(`📍 Memeriksa Stasiun: ${stationName}...`);
    console.log(`======================================================`);

    for (const ikrStatus of statuses) {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 50) {
        let url = `https://api-mitra.starliteindonesia.com/mitra/customer/new?page=${page}&page_size=10&sort_order=DESC&sales_partner_id=${partnerId}`;
        if (ikrStatus) {
          url += `&ikr_status=${ikrStatus}`;
        }

        try {
          const res = await fetch(url, {
            headers: {
              'Authorization': PARTNER_TOKEN,
              'Cookie': PARTNER_COOKIE
            },
            signal: AbortSignal.timeout(8000)
          });

          if (!res.ok) {
            // Jika error atau status tidak didukung, lanjut status berikutnya
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
            const { lat, lng } = extractCoordinates(item);
            const regDate = extractRegDate(item);

            if (lat && lng) {
              totalFoundCoords++;
              // Periksa apakah ada di Supabase yang perlu diupdate koordinatnya
              if (emptyCoordsMap.has(idUpper)) {
                const existing = emptyCoordsMap.get(idUpper);
                const patchPayload = {
                  latitude: lat,
                  longitude: lng
                };
                if (!existing.tanggal_registrasi && regDate) {
                  patchPayload.tanggal_registrasi = regDate;
                }

                console.log(`✨ [${stationName}] Update koordinat untuk ${idPelanggan} (${existing.nama_pelanggan}): lat=${lat}, lng=${lng}`);
                const ok = await updateCustomerInSupabase(idPelanggan, patchPayload);
                if (ok) {
                  totalUpdated++;
                  // Hapus dari map agar tidak diupdate berulang
                  emptyCoordsMap.delete(idUpper);
                }
              }
            }
          }

          // Cek pagination
          if (items.length < 10) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (err) {
          console.error(`Error pada ${stationName} (${ikrStatus}) hal ${page}:`, err.message);
          hasMore = false;
        }
      }
    }
  }

  console.log("\n======================================================");
  console.log(`🎉 SELESAI! Berhasil mengupdate ${totalUpdated} pelanggan baru dengan koordinat valid ke Supabase.`);
  console.log(`Total koordinat yang ditemukan dari API: ${totalFoundCoords}`);
  console.log(`Sisa pelanggan di Supabase yang masih kosong: ${emptyCoordsMap.size}`);
  console.log("======================================================");
}

main();
