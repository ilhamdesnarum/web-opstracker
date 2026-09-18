// =========================================================================
// SCRIPT SINKRONISASI DATA DUE DATE & SUSPEND / DISMANTLE -> SUPABASE
// =========================================================================
// Urutan presisi: Ready To Dismantle -> Dismantling -> Dismantled -> Suspend
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
      signal: AbortSignal.timeout(20000)
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

async function main() {
  const t0 = Date.now();
  console.log("=================================================================");
  console.log("⚡ MEMULAI SINKRONISASI CEPAT DUE DATE & SUSPEND -> SUPABASE");
  console.log("=================================================================");

  // Urutan penarikan:
  // 1. Ready To Dismantle (General pool)
  // 2. Dismantling
  // 3. Dismantled (Khusus status dismantled)
  // 4. Suspend (Prioritas tertinggi: Pelanggan yang aktif suspend)
  const statusConfigs = [
    { key: "ready-to-dismantle", query: "dismantle_status=ready-to-dismantle", dbStatus: "Ready To Dismantle" },
    { key: "dismantling", query: "status=dismantling", dbStatus: "Ready To Dismantle" },
    { key: "dismantled", query: "status=dismantled", dbStatus: "Dismantled" },
    { key: "suspend", query: "status=suspend", dbStatus: "Suspend" }
  ];

  const targetStations = Object.keys(PARTNER_STATION_IDS);

  let grandTotalFetched = 0;
  let grandTotalUpserted = 0;

  const headers = {
    "Authorization": PARTNER_TOKEN,
    "Cookie": PARTNER_COOKIE,
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  let stationIndex = 1;
  for (const stationName of targetStations) {
    const partnerId = PARTNER_STATION_IDS[stationName];
    if (!partnerId) continue;

    console.log(`\n🏢 [${stationIndex}/${targetStations.length}] Memproses Stasiun: ${stationName.toUpperCase()}`);
    const stationRows = [];

    for (const cfg of statusConfigs) {
      let page = 1;
      const pageSize = 10;
      let hasMore = true;
      let statusCount = 0;
      let consecutiveErrors = 0;

      while (hasMore) {
        const urlList = `https://api-mitra.starliteindonesia.com/mitra/customer/suspend?page=${page}&page_size=${pageSize}&sort_order=DESC&${cfg.query}&sales_partner_id=${partnerId}`;

        let response = null;
        let retry = 0;
        let lastErr = "";

        while (retry <= 3) {
          try {
            response = await fetch(urlList, { 
              headers,
              signal: AbortSignal.timeout(20000)
            });
            if (response && response.ok) break;
            lastErr = `HTTP ${response ? response.status : 'No Response'}`;
            retry++;
            if (retry <= 3) await new Promise(r => setTimeout(r, 1000));
          } catch (fetchErr) {
            lastErr = fetchErr.message;
            retry++;
            if (retry <= 3) await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (!response || !response.ok) {
          consecutiveErrors++;
          console.log(`   ↳ [${cfg.key}] Halaman ${page} (${lastErr}), skip ke halaman berikutnya...`);
          if (consecutiveErrors >= 3) {
            console.log(`   🚨 Terlalu banyak error beruntun (3x). Menghentikan kategori ini.`);
            break;
          }
          page++;
          continue;
        }
        
        consecutiveErrors = 0;

        try {
          const json = await response.json();
          const customers = json?.data || [];
          if (!customers || customers.length === 0) {
            hasMore = false;
            break;
          }

          for (const customer of customers) {
            if (!customer) continue;

            const idPelanggan = customer.customer_id && typeof customer.customer_id === "string" ? customer.customer_id : (customer.customer_id ? customer.customer_id.customer_id : "");
            if (!idPelanggan) continue;

            const nama = customer.name || (customer.customer_id ? customer.customer_id.name : "");
            const telepon = customer.phone_number || (customer.customer_id ? customer.customer_id.phone_number : "");
            const alamat = customer.address || (customer.customer_id ? customer.customer_id.address : "");
            const patokan = customer.notes || "";

            let odp = "";
            let portOdp = "";
            if (customer.installation_info_id) {
              const instArr = Array.isArray(customer.installation_info_id) ? customer.installation_info_id : [customer.installation_info_id];
              if (instArr.length > 0 && instArr[0]) {
                const inst = instArr[0];
                portOdp = (inst.port_number !== undefined && inst.port_number !== null) ? String(inst.port_number) : (inst.port ? String(inst.port) : "");
                if (inst.device_id) {
                  odp = inst.device_id.code || inst.device_id.name || "";
                }
              }
            }
            if (!odp) odp = customer.odp || customer.odp_name || customer.odp_code || customer.fat || customer.fat_code || customer.fat_name || (customer.customer_id && typeof customer.customer_id === "object" ? (customer.customer_id.odp || customer.customer_id.fat_code || customer.customer_id.fat_name) : "") || "";
            if (!portOdp) portOdp = customer.port_odp || customer.port || customer.fat_port || customer.odp_port || (customer.customer_id && typeof customer.customer_id === "object" ? (customer.customer_id.port_odp || customer.customer_id.port) : "") || "";

            let tglRegistrasi = "";
            if (customer.visit_date) tglRegistrasi = formatKeWIB(customer.visit_date);
            else if (customer.registration_date) tglRegistrasi = formatKeWIB(customer.registration_date);

            let tanggalBerakhir = "";
            const telatBayarHari = (customer.count_late_payment_days !== undefined && customer.count_late_payment_days !== null && customer.count_late_payment_days !== "") ? Number(customer.count_late_payment_days) : null;

            if (customer.user_ppoe_id && customer.user_ppoe_id.yinet_info) {
              try {
                const yinet = typeof customer.user_ppoe_id.yinet_info === "string" ? JSON.parse(customer.user_ppoe_id.yinet_info) : customer.user_ppoe_id.yinet_info;
                if (yinet?.expired_date) tanggalBerakhir = formatKeWIB(yinet.expired_date);
              } catch (_e) {}
            }
            if (!tanggalBerakhir && customer.ont_id && customer.ont_id.length > 0 && customer.ont_id[0].payload) {
              try {
                const payloadOnt = typeof customer.ont_id[0].payload === "string" ? JSON.parse(customer.ont_id[0].payload) : customer.ont_id[0].payload;
                if (payloadOnt?.expired_date) tanggalBerakhir = formatKeWIB(payloadOnt.expired_date);
              } catch (_e) {}
            }

            let tglDismantle = null;
            let reasonDismantle = null;
            if (cfg.key === "dismantled" || cfg.dbStatus === "Dismantled" || customer.status === "dismantled") {
              if (customer.submit_request_ikr_id) {
                const sub = customer.submit_request_ikr_id;
                const rawDate = sub.updated_at || sub.created_at || sub.est_request_datetime;
                if (rawDate) tglDismantle = formatKeWIB(rawDate);
                reasonDismantle = sub.reason || (sub.notes && sub.notes !== "." ? sub.notes : "") || "";
              }
              if (!reasonDismantle && customer.reason_detail) {
                reasonDismantle = customer.reason_detail;
              }
            }

            const rowPayload = {
              id_pelanggan: idPelanggan,
              nama_pelanggan: nama,
              nomor_hp: telepon,
              alamat: alamat,
              catatan: patokan,
              status_ikr: "Sudah",
              status_aktivasi: cfg.dbStatus,
              tanggal_registrasi: tglRegistrasi,
              tanggal_berakhir: tanggalBerakhir || null,
              telat_bayar_hari: telatBayarHari,
              stasiun: stationName,
              odp: odp,
              port_odp: portOdp,
              updated_at: new Date().toISOString()
            };

            if (tglDismantle) {
              rowPayload.tanggal_dismantle = tglDismantle;
            }
            if (reasonDismantle) {
              rowPayload.reason_dismantle = reasonDismantle;
            }

            stationRows.push(rowPayload);
            statusCount++;
            grandTotalFetched++;
          }

          console.log(`   ↳ [${cfg.key}] Hal ${page}: ${customers.length} data`);

          if (customers.length < pageSize) {
            hasMore = false;
          } else {
            page++;
            await new Promise(r => setTimeout(r, 30));
          }
        } catch (jsonErr) {
          hasMore = false;
        }
      }
    }

    if (stationRows.length > 0) {
      const uniqueMap = new Map();
      for (const row of stationRows) {
        uniqueMap.set(row.id_pelanggan, row);
      }
      const dedupedRows = Array.from(uniqueMap.values());

      const CHUNK_SIZE = 400;
      let upsertedCount = 0;

      for (let i = 0; i < dedupedRows.length; i += CHUNK_SIZE) {
        const chunk = dedupedRows.slice(i, i + CHUNK_SIZE);
        const ok = await upsertToSupabase(chunk);
        if (ok) {
          upsertedCount += chunk.length;
          grandTotalUpserted += chunk.length;
        }
      }
      console.log(`   💾 Tersimpan ke Supabase: ${upsertedCount} baris.`);
    }

    stationIndex++;
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("\n=================================================================");
  console.log(`🎉 SINKRONISASI DUE DATE SELESAI DALAM ${durationSec} DETIK!`);
  console.log(`📊 Total Data Ditarik          : ${grandTotalFetched}`);
  console.log(`💾 Total Diperbarui di Supabase : ${grandTotalUpserted}`);
  console.log("=================================================================");
}

main().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
