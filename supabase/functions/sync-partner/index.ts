import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// 1. DAFTAR ID STASIUN PARTNER
const PARTNER_STATION_IDS: Record<string, string> = {
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

const BATCH_STATIONS: Record<number, string[]> = {
  1: ["Wadu", "Randublatung", "Sulur", "Kradenan"],
  2: ["Brumbung", "Alastua", "Tawang", "Kaliwungu"],
  3: ["Kalibodri", "Weleri", "Krengseng"]
};

// 2. KREDENSIAL API PARTNER & SUPABASE
const PARTNER_TOKEN = Deno.env.get("STARLITE_PARTNER_TOKEN") || 
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

const PARTNER_COOKIE = Deno.env.get("STARLITE_PARTNER_COOKIE") || 
  "_ga=GA1.1.1000327763.1779010726; _gcl_au=1.1.1451051866.1779010727; _fbp=fb.1.1779010726946.118555004272738158; _tt_enable_cookie=1; _ttp=01KRTMTV531SKYMHFWWT9XR4DH_.tt.1; _ga_DFWC1L1VBM=GS2.1.s1782135322$o6$g0$t1782135322$j60$l0$h0; ttcsid=1782135322245::M649s3W_u5vulwz81TSP.5.1782135323124.0::1.-2031.0::0.0.0.0::0.0.0; ttcsid_D6N6GJRC77U5VG9U4DSG=1782135322245::WsZdqWnprfIDO3deWfQF.5.1782135323125.0; _ga_1ST28GMNXL=GS2.1.s1782207506$o7$g0$t1782207506$j60$l0$h0; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
  Deno.env.get("SUPABASE_ANON_KEY") || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

function formatKeWIB(isoString?: string | null): string {
  if (!isoString) return "";
  return isoString.substring(0, 19).replace("T", " ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    let statusesToFetch = ["suspend", "dismantle", "ready-to-dismantle"];
    let targetStations: string[] = Object.keys(PARTNER_STATION_IDS);

    if (req.method === "POST") {
      try {
        const rawText = await req.text();
        if (rawText && rawText.trim()) {
          const body = JSON.parse(rawText);
          if (body.statuses && Array.isArray(body.statuses)) statusesToFetch = body.statuses;
          if (body.stations && Array.isArray(body.stations)) targetStations = body.stations;
          if (body.batch && BATCH_STATIONS[Number(body.batch)]) targetStations = BATCH_STATIONS[Number(body.batch)];
        }
      } catch (_e) {
        // Fallback default
      }
    } else {
      const url = new URL(req.url);
      const statusParam = url.searchParams.get("status");
      const stationParam = url.searchParams.get("station");
      const batchParam = url.searchParams.get("batch");
      if (statusParam) statusesToFetch = statusParam.split(",");
      if (stationParam) targetStations = stationParam.split(",");
      if (batchParam && BATCH_STATIONS[Number(batchParam)]) targetStations = BATCH_STATIONS[Number(batchParam)];
    }

    console.log(`🚀 [Edge Function] Mulai Sync Partner: Status=[${statusesToFetch.join(",")}], Stasiun=[${targetStations.join(",")}]`);

    let totalFetched = 0;
    let totalUpserted = 0;
    const summaryPerStation: Record<string, number> = {};

    const headers = {
      "Authorization": PARTNER_TOKEN,
      "Cookie": PARTNER_COOKIE,
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };

    for (const stationName of targetStations) {
      const partnerId = PARTNER_STATION_IDS[stationName];
      if (!partnerId) continue;

      let stationCount = 0;
      const allStationRows: any[] = [];

      for (const currentStatus of statusesToFetch) {
        let page = 1;
        const pageSize = 30;
        const maxPages = 100;
        let hasMore = true;

        while (hasMore && page <= maxPages) {
          let urlList = "";
          if (currentStatus === "new") {
            urlList = `https://partner.starliteindonesia.com/api/mitra/customer/new?page=${page}&page_size=${pageSize}&sort_order=DESC&sales_partner_id=${partnerId}`;
          } else if (currentStatus.startsWith("new-")) {
            const ikrStatus = currentStatus.replace("new-", "");
            urlList = `https://partner.starliteindonesia.com/api/mitra/customer/new?page=${page}&page_size=${pageSize}&sort_order=DESC&ikr_status=${ikrStatus}&sales_partner_id=${partnerId}`;
          } else if (currentStatus === "active") {
            urlList = `https://partner.starliteindonesia.com/api/mitra/customer/active?page=${page}&page_size=${pageSize}&sort_order=DESC&sales_partner_id=${partnerId}`;
          } else {
            const apiPath = (currentStatus === "dismantle" || currentStatus === "dismantled" || currentStatus === "ready-to-dismantle") ? "suspend" : currentStatus;
            const apiStatusParam = (currentStatus === "dismantle") ? "dismantled" : currentStatus;
            urlList = `https://partner.starliteindonesia.com/api/mitra/customer/${apiPath}?page=${page}&page_size=${pageSize}&sort_order=DESC&status=${apiStatusParam}&sales_partner_id=${partnerId}`;
          }

          let response: Response | null = null;
          let retryCount = 0;

          while (retryCount <= 2) {
            try {
              response = await fetch(urlList, { headers });
              if (response && response.ok) break;
              retryCount++;
              if (retryCount <= 2) await new Promise((r) => setTimeout(r, 400));
            } catch (_err) {
              retryCount++;
              if (retryCount <= 2) await new Promise((r) => setTimeout(r, 400));
            }
          }

          if (!response || !response.ok) {
            console.warn(`⚠️ [${stationName}][${currentStatus}] Gagal HTTP ${response ? response.status : 'Error'} Hal ${page}`);
            break;
          }

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
              const lat = customer.latitude ? String(customer.latitude).replace(",", ".") : "";
              const lng = customer.longitude ? String(customer.longitude).replace(",", ".") : "";

              // Ekstrak ODP & Port ODP
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

              // Ekstrak Tanggal Berakhir & Telat Bayar
              let tanggalBerakhir = "";
              const telatBayarHari = (customer.count_late_payment_days !== undefined && customer.count_late_payment_days !== null && customer.count_late_payment_days !== "") ? Number(customer.count_late_payment_days) : null;

              if (customer.user_ppoe_id && customer.user_ppoe_id.yinet_info) {
                try {
                  const yinet = typeof customer.user_ppoe_id.yinet_info === "string" ? JSON.parse(customer.user_ppoe_id.yinet_info) : customer.user_ppoe_id.yinet_info;
                  if (yinet && yinet.expired_date) tanggalBerakhir = formatKeWIB(yinet.expired_date);
                } catch (_e) {}
              }
              if (!tanggalBerakhir && customer.ont_id && customer.ont_id.length > 0 && customer.ont_id[0].payload) {
                try {
                  const payloadOnt = typeof customer.ont_id[0].payload === "string" ? JSON.parse(customer.ont_id[0].payload) : customer.ont_id[0].payload;
                  if (payloadOnt && payloadOnt.expired_date) tanggalBerakhir = formatKeWIB(payloadOnt.expired_date);
                } catch (_e) {}
              }

              let tStatus = "Sudah";
              let tIkr = "Sudah";
              if (currentStatus === "suspend") tStatus = "Suspend";
              else if (currentStatus === "dismantle") tStatus = "Dismantled";
              else if (currentStatus === "ready-to-dismantle") tStatus = "Ready To Dismantle";
              else if (currentStatus === "new-cancel") {
                tStatus = "Kendala";
                tIkr = "Kendala";
              } else if (currentStatus.startsWith("new")) {
                tStatus = "Belum";
                tIkr = "Belum";
              }

              const rowPayload: Record<string, any> = {
                id_pelanggan: idPelanggan,
                nama_pelanggan: nama,
                nomor_hp: telepon,
                alamat: alamat,
                catatan: patokan,
                // [!] Latitude & Longitude sengaja TIDAK ditarik agar tidak menimpa data koordinat akurat dari Reporting Bot
                status_ikr: tIkr,
                status_aktivasi: tStatus,
                tanggal_registrasi: tglRegistrasi,
                tanggal_berakhir: tanggalBerakhir || null,
                telat_bayar_hari: telatBayarHari,
                stasiun: stationName,
                odp: odp,
                port_odp: portOdp,
                updated_at: new Date().toISOString()
              };

              allStationRows.push(rowPayload);
              stationCount++;
              totalFetched++;
            }

            if (customers.length < pageSize) {
              hasMore = false;
            } else {
              page++;
              await new Promise((r) => setTimeout(r, 30));
            }
          } catch (jsonErr: any) {
            console.error(`JSON parse error ${stationName} ${currentStatus}:`, jsonErr?.message || jsonErr);
            hasMore = false;
          }
        }
      }

      // UPSERT BATCH KE SUPABASE PER STASIUN (Chunk 300 rows)
      if (allStationRows.length > 0) {
        const uniqueMap = new Map();
        for (const row of allStationRows) {
          uniqueMap.set(row.id_pelanggan, row);
        }
        const dedupedRows = Array.from(uniqueMap.values());

        const CHUNK_SIZE = 300;
        for (let i = 0; i < dedupedRows.length; i += CHUNK_SIZE) {
          const chunk = dedupedRows.slice(i, i + CHUNK_SIZE);
          try {
            const upsertRes = await supabase
              .from("data_pelanggan")
              .upsert(chunk, { onConflict: "id_pelanggan" });

            if (upsertRes && upsertRes.error) {
              console.error(`❌ Gagal upsert chunk di ${stationName}:`, upsertRes.error.message);
            } else {
              totalUpserted += chunk.length;
            }
          } catch (upsertErr: any) {
            console.error(`❌ Error upsert di ${stationName}:`, upsertErr?.message || upsertErr);
          }
        }
      }

      summaryPerStation[stationName] = stationCount;
      console.log(`✅ [${stationName}] Berhasil sync ${stationCount} data.`);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Sync selesai dalam ${durationSeconds} detik. Total Diperbarui: ${totalUpserted}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sinkronisasi Partner berhasil diselesaikan.",
        total_fetched: totalFetched,
        total_upserted: totalUpserted,
        duration_seconds: parseFloat(durationSeconds),
        summary_per_station: summaryPerStation
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "Internal Server Error";
    console.error("❌ Fatal Error in Edge Function:", errorMsg);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
