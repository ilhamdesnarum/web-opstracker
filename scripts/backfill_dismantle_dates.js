// =========================================================================
// BACKFILL TANGGAL DISMANTLE DARI STARLITE API KE SUPABASE
// =========================================================================

try {
  process.loadEnvFile();
} catch (e) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const PARTNER_TOKEN = process.env.STARLITE_PARTNER_TOKEN;
const PARTNER_COOKIE = process.env.STARLITE_PARTNER_COOKIE;

if (!PARTNER_TOKEN || !SUPABASE_KEY || !SUPABASE_URL) {
  console.error("❌ Credentials missing in env!");
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

async function runBackfill() {
  console.log("🚀 MEMULAI BACKFILL TANGGAL DISMANTLE DARI STARLITE API KE SUPABASE...");
  
  const headers = {
    "Authorization": PARTNER_TOKEN,
    "Cookie": PARTNER_COOKIE,
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0"
  };

  let totalUpdated = 0;

  for (const [stationName, partnerId] of Object.entries(PARTNER_STATION_IDS)) {
    let page = 1;
    let hasMore = true;
    let stationUpdates = [];

    while (hasMore) {
      const url = `https://api-mitra.starliteindonesia.com/mitra/customer/suspend?page=${page}&page_size=10&sort_order=DESC&status=dismantled&sales_partner_id=${partnerId}`;
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          console.error(`   ❌ [${stationName}] HTTP Error ${res.status} pada page ${page}`);
          break;
        }
        const json = await res.json();
        const list = json?.data || [];
        if (list.length === 0) {
          hasMore = false;
          break;
        }

        for (const c of list) {
          const idPelanggan = typeof c.customer_id === "string" ? c.customer_id : (c.customer_id ? c.customer_id.customer_id : "");
          if (!idPelanggan) continue;

          let tglDismantle = null;
          let reasonDismantle = null;

          if (c.submit_request_ikr_id) {
            const sub = c.submit_request_ikr_id;
            const rawDate = sub.updated_at || sub.created_at || sub.est_request_datetime;
            if (rawDate) tglDismantle = formatKeWIB(rawDate);
            reasonDismantle = sub.reason || (sub.notes && sub.notes !== "." ? sub.notes : "") || "";
          }
          if (!reasonDismantle && c.reason_detail) {
            reasonDismantle = c.reason_detail;
          }

          if (tglDismantle) {
            stationUpdates.push({
              id_pelanggan: idPelanggan,
              tanggal_dismantle: tglDismantle,
              reason_dismantle: reasonDismantle || null
            });
          }
        }

        if (list.length < 10) {
          hasMore = false;
        } else {
          page++;
          await new Promise(r => setTimeout(r, 40));
        }
      } catch (err) {
        console.error(`   ❌ Fetch error [${stationName}]: ${err.message}`);
        break;
      }
    }

    if (stationUpdates.length > 0) {
      console.log(`🏢 [${stationName}] Ditemukan ${stationUpdates.length} pelanggan dismantle. Mengupdate Supabase...`);
      for (const item of stationUpdates) {
        const patchUrl = `${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=eq.${encodeURIComponent(item.id_pelanggan)}`;
        try {
          const pRes = await fetch(patchUrl, {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({
              tanggal_dismantle: item.tanggal_dismantle,
              reason_dismantle: item.reason_dismantle
            })
          });
          if (pRes.ok) totalUpdated++;
        } catch (_patchErr) {}
      }
    } else {
      console.log(`🏢 [${stationName}] 0 pelanggan dismantle.`);
    }
  }

  console.log(`\n🎉 SELESAI! Berhasil meng-update tanggal dismantle untuk ${totalUpdated} pelanggan di Supabase.`);
}

runBackfill();
