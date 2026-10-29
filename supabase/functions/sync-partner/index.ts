// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

// =========================================================================
// 1. KREDENSIAL API MITRA STARLITE
// =========================================================================
const DEFAULT_PARTNER_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";
const DEFAULT_PARTNER_COOKIE = "_ga=GA1.1.1000327763.1779010726; _gcl_au=1.1.1451051866.1779010727; _fbp=fb.1.1779010726946.118555004272738158; _tt_enable_cookie=1; _ttp=01KRTMTV531SKYMHFWWT9XR4DH_.tt.1; _ga_DFWC1L1VBM=GS2.1.s1782135322$o6$g0$t1782135322$j60$l0$h0; ttcsid=1782135322245::M649s3W_u5vulwz81TSP.5.1782135323124.0::1.-2031.0::0.0.0.0::0.0.0; ttcsid_D6N6GJRC77U5VG9U4DSG=1782135322245::WsZdqWnprfIDO3deWfQF.5.1782135323125.0; _ga_1ST28GMNXL=GS2.1.s1782207506$o7$g0$t1782207506$j60$l0$h0; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc4NTkzNjM1NCwiZXhwIjoxODE3NDcyMzU0fQ.AIeceSlBn_Xe4CRtLZ8IIUqWwn2T3fZOjc-Ybq_gKsM";

// =========================================================================
// 2. MAPPING ID STASIUN PARTNER STARLITE (API MITRA)
// =========================================================================
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

// =========================================================================
// 3. HELPER EKSTRAKSI DATA DARI API MITRA
// =========================================================================
function formatKeWIB(isoString: string): string {
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
  } catch (_) {
    return String(isoString).substring(0, 19).replace("T", " ");
  }
}

function extractCoordinates(c: any): { lat: string; lng: string } {
  let lat = "";
  let lng = "";

  if (c.customer_id && typeof c.customer_id === 'object') {
    if (c.customer_id.latitude != null && c.customer_id.latitude !== "") {
      lat = String(c.customer_id.latitude).trim().replace(",", ".");
    }
    if (c.customer_id.longitude != null && c.customer_id.longitude !== "") {
      lng = String(c.customer_id.longitude).trim().replace(",", ".");
    }
    if (!lat && c.customer_id.lat) lat = String(c.customer_id.lat).trim().replace(",", ".");
    if (!lng && (c.customer_id.lng || c.customer_id.long)) lng = String(c.customer_id.lng || c.customer_id.long).trim().replace(",", ".");
  }

  if (!lat && c.latitude != null && c.latitude !== "") lat = String(c.latitude).trim().replace(",", ".");
  if (!lng && c.longitude != null && c.longitude !== "") lng = String(c.longitude).trim().replace(",", ".");
  if (!lat && c.lat != null && c.lat !== "") lat = String(c.lat).trim().replace(",", ".");
  if (!lng && (c.lng != null || c.long != null)) lng = String(c.lng || c.long).trim().replace(",", ".");

  if ((!lat || !lng) && c.sales_visit_id && typeof c.sales_visit_id === 'object') {
    if (!lat && (c.sales_visit_id.latitude || c.sales_visit_id.lat)) {
      lat = String(c.sales_visit_id.latitude || c.sales_visit_id.lat).trim().replace(",", ".");
    }
    if (!lng && (c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long)) {
      lng = String(c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long).trim().replace(",", ".");
    }
  }

  return { lat, lng };
}

function extractRegDate(c: any): string {
  if (c.registration_date) return formatKeWIB(c.registration_date);
  if (c.request_ikr_id && c.request_ikr_id.registration_date) return formatKeWIB(c.request_ikr_id.registration_date);
  if (c.visit_date) return formatKeWIB(c.visit_date);
  if (c.sales_visit_id && c.sales_visit_id.visit_date) return formatKeWIB(c.sales_visit_id.visit_date);
  if (c.customer_id && typeof c.customer_id === 'object' && c.customer_id.registration_date) return formatKeWIB(c.customer_id.registration_date);
  if (c.created_at) return formatKeWIB(c.created_at);
  if (c.created_ats) return formatKeWIB(c.created_ats);
  return "";
}

function extractOdpInfo(c: any): { odp: string; portOdp: string } {
  let odp = "";
  let portOdp = "";

  if (c.installation_info_id) {
    const instList = Array.isArray(c.installation_info_id) ? c.installation_info_id : [c.installation_info_id];
    if (instList.length > 0 && instList[0]) {
      const inst = instList[0];
      portOdp = (inst.port_number != null) ? String(inst.port_number) : (inst.port ? String(inst.port) : "");
      if (inst.device_id) {
        odp = inst.device_id.code || inst.device_id.name || "";
      }
    }
  }

  if (!odp) {
    odp = c.odp || c.odp_name || c.odp_code || c.fat || c.fat_code || c.fat_name ||
      (c.customer_id && typeof c.customer_id === 'object' ? (c.customer_id.odp || c.customer_id.fat_code || c.customer_id.fat_name) : "") || "";
  }
  if (!portOdp) {
    portOdp = c.port_odp || c.port || c.fat_port || c.odp_port ||
      (c.customer_id && typeof c.customer_id === 'object' ? (c.customer_id.port_odp || c.customer_id.port) : "") || "";
  }

  return { odp, portOdp };
}

function extractSnOnt(c: any): string {
  if (c.ont_id) {
    const list = Array.isArray(c.ont_id) ? c.ont_id : [c.ont_id];
    if (list.length > 0 && list[0] && list[0].serial_number) {
      return String(list[0].serial_number).trim();
    }
  }
  if (c.sn_ont || c.sn || c.serial_number) {
    return String(c.sn_ont || c.sn || c.serial_number).trim();
  }
  return "";
}

function extractPreconLength(c: any): string {
  if (c.installation_info_id) {
    const list = Array.isArray(c.installation_info_id) ? c.installation_info_id : [c.installation_info_id];
    if (list.length > 0 && list[0] && list[0].precon_cable_length != null) {
      return String(list[0].precon_cable_length).trim();
    }
  }
  return "";
}

function extractSalesName(c: any): string {
  if (!c) return "-";
  let s = null;

  if (c.sales_id && typeof c.sales_id === 'object' && c.sales_id.name) {
    s = c.sales_id.name;
  } else if (typeof c.sales_id === 'string' && c.sales_id.trim()) {
    s = c.sales_id;
  }

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

  if (!s && c.sales_visit_id && typeof c.sales_visit_id === 'object') {
    const vs = c.sales_visit_id.sales_id;
    s = typeof vs === 'object' ? vs?.name : vs;
  }

  if (!s) return "-";
  const cleaned = String(s).trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'daftar mandiri') {
    return "-";
  }
  return cleaned;
}

function extractIkrPartnerName(c: any): string | null {
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

function resolveStationName(input: string): string {
  if (!input) return "";
  const clean = input.trim();
  for (const st of Object.keys(PARTNER_STATION_IDS)) {
    if (clean.toLowerCase().includes(st.toLowerCase()) || st.toLowerCase().includes(clean.toLowerCase())) {
      return st;
    }
  }
  return clean;
}

// =========================================================================
// 4. LOGIKA UTAMA SINKRONISASI STASIUN (100% PURE SUPABASE)
// =========================================================================
async function syncStationCustomers(
  supabase: any,
  stationName: string,
  partnerToken: string,
  partnerCookie: string,
  maxPages: number = 3,
  searchQuery?: string | null
) {
  const partnerId = PARTNER_STATION_IDS[stationName];
  if (!partnerId) {
    throw new Error(`ID Stasiun Partner untuk '${stationName}' tidak terdaftar!`);
  }

  const dbStationName = stationName === "Tawang" ? "Semarang Tawang" : stationName;
  const rawCustomers: any[] = [];
  const seenCustIds = new Set<string>();
  const pageSize = 10;
  let apiMitraError: string | null = null;

  // Helper untuk menambahkan item pelanggan ke antrean
  const addCustomerItem = (item: any, source: string) => {
    const rawId = (item.customer_id && typeof item.customer_id === 'string')
      ? item.customer_id
      : (item.customer_id?.customer_id || item.id_pelanggan || "");
    const idPelanggan = String(rawId || "").trim();
    if (!idPelanggan) return;

    const idUpper = idPelanggan.toUpperCase();
    if (seenCustIds.has(idUpper)) return;
    seenCustIds.add(idUpper);

    rawCustomers.push({ item, idPelanggan, source });
  };

  // Helper fetch API Mitra
  const fetchEndpoint = async (ep: string, page: number, queryParam?: string) => {
    let url = `https://api-mitra.starliteindonesia.com/mitra/customer/${ep}?sales_partner_id=${partnerId}`;
    if (queryParam) {
      // PENTING: Jangan kirim page/page_size saat search agar server Starlite tidak overload (turun dari 70 detik jadi ~7 detik)
      url += `&search=${encodeURIComponent(queryParam)}`;
    } else {
      url += `&page=${page}&page_size=${pageSize}&sort_order=DESC`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': partnerToken,
        'Cookie': partnerCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText || 'Error Gateway/Server'})`);
    }

    const text = await res.text();
    const json = JSON.parse(text);
    return json?.data || [];
  };

  // 1. JIKA ADA ID PENCARIAN SPESIFIK (Misal input Web App "TO669")
  // Prioritaskan pencarian langsung agar respon sangat cepat dan terhindar dari overload 502 API Mitra
  if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim() !== '') {
    const qClean = searchQuery.trim().toUpperCase();
    // Cek 'new' terlebih dahulu (~2 detik), jika tidak ada baru cek 'active' (~7 detik)
    for (const ep of ['new', 'active']) {
      try {
        const searchItems = await fetchEndpoint(ep, 1, qClean);
        if (searchItems && searchItems.length > 0) {
          for (const item of searchItems) {
            addCustomerItem(item, ep);
          }
        }
        if (seenCustIds.has(qClean)) break; // Jika sudah ditemukan, langsung selesai
      } catch (sErr: any) {
        apiMitraError = sErr.name === 'TimeoutError' ? "Koneksi ke API Mitra timeout (20 detik)" : sErr.message;
        console.warn(`[${stationName}][${ep}] Search '${qClean}' warning:`, apiMitraError);
      }
    }
  } else {
    // 2. PENARIKAN MASSAL (Tanpa ID pencarian spesifik / cron ALL)
    // A. Endpoint /new (Pendaftar Baru)
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      try {
        const items = await fetchEndpoint('new', page);
        if (!items || items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of items) {
          addCustomerItem(item, 'new');
        }

        if (items.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (err: any) {
        apiMitraError = err.name === 'TimeoutError' ? "Koneksi ke API Mitra timeout (15 detik)" : err.message;
        console.warn(`[${stationName}][new] Warning fetch page ${page}:`, apiMitraError);
        hasMore = false;
        break;
      }
    }

    // B. Endpoint /active (Hanya ambil halaman 1 non-blocking untuk mengurangi beban query server Mitra)
    try {
      const activeItems = await fetchEndpoint('active', 1);
      if (activeItems && activeItems.length > 0) {
        for (const item of activeItems) {
          addCustomerItem(item, 'active');
        }
      }
    } catch (actErr: any) {
      console.warn(`[${stationName}][active] Warning fetch page 1 (non-blocking):`, actErr.message);
      if (rawCustomers.length === 0) {
        apiMitraError = actErr.name === 'TimeoutError' ? "Koneksi ke API Mitra timeout (15 detik)" : actErr.message;
      }
    }
  }

  if (rawCustomers.length === 0) {
    if (apiMitraError) {
      return {
        station: stationName,
        baru: 0,
        update: 0,
        status: "error",
        message: `API Mitra Starlite sedang gangguan: ${apiMitraError}. Silakan coba beberapa saat lagi.`
      };
    }
    const notFoundMsg = searchQuery
      ? `Pelanggan '${searchQuery}' tidak ditemukan di API Mitra (${stationName}).`
      : "Tidak ada pelanggan baru / aktif di API Mitra.";
    return { station: stationName, baru: 0, update: 0, message: notFoundMsg };
  }

  // 3. Cek keberadaan pelanggan di Supabase (PROTEKSI MUTLAK agar status IKR/aktivasi aman)
  const customerIds = rawCustomers.map(r => r.idPelanggan);
  const existingMap = new Map<string, any>();

  for (let i = 0; i < customerIds.length; i += 50) {
    const chunk = customerIds.slice(i, i + 50);
    const { data: found, error } = await supabase
      .from('data_pelanggan')
      .select('id_pelanggan, status_ikr, status_aktivasi, nama_sales, ikr_partner, tanggal_registrasi, odp, port_odp, sn_ont, kabel_precon, latitude, longitude')
      .in('id_pelanggan', chunk);

    if (error) throw error;
    if (found) {
      found.forEach((f: any) => {
        if (f.id_pelanggan) {
          const trimmed = String(f.id_pelanggan).trim().toUpperCase();
          existingMap.set(trimmed, f);
        }
      });
    }
  }

  const rowsNew: any[] = [];
  const rowsExisting: any[] = [];
  const nowIso = new Date().toISOString();

  for (const { item, idPelanggan } of rawCustomers) {
    const idUpper = idPelanggan.toUpperCase();
    const nama = item.name || (item.customer_id ? item.customer_id.name : "") || "";
    const telepon = item.phone_number || (item.customer_id ? item.customer_id.phone_number : "") || "";
    const alamat = item.address || (item.customer_id ? item.customer_id.address : "") || "";
    const catatan = item.notes || "";
    const { lat, lng } = extractCoordinates(item);
    const tglRegistrasi = extractRegDate(item);
    const { odp, portOdp } = extractOdpInfo(item);
    const namaSales = extractSalesName(item);
    const ikrPartner = extractIkrPartnerName(item);
    const snOnt = extractSnOnt(item);
    const precon = extractPreconLength(item);

    const existingData = existingMap.get(idUpper);

    if (existingData) {
      // PELANGGAN LAMA: Hanya lengkapi data teknis, sales & IKR jika di Supabase masih kosong / strip
      rowsExisting.push({
        id_pelanggan: idPelanggan,
        stasiun: dbStationName,
        nama_sales: (namaSales && namaSales !== "-") ? namaSales : (existingData.nama_sales || "-"),
        ikr_partner: (ikrPartner && ikrPartner !== "-") ? ikrPartner : (existingData.ikr_partner || null),
        tanggal_registrasi: (!existingData.tanggal_registrasi && tglRegistrasi) ? tglRegistrasi : (existingData.tanggal_registrasi || null),
        odp: (!existingData.odp || existingData.odp === "-") && odp ? odp : (existingData.odp || null),
        port_odp: (!existingData.port_odp || existingData.port_odp === "-") && portOdp ? portOdp : (existingData.port_odp || null),
        sn_ont: (!existingData.sn_ont || existingData.sn_ont === "-") && snOnt ? snOnt : (existingData.sn_ont || null),
        kabel_precon: (!existingData.kabel_precon || existingData.kabel_precon === "-") && precon ? precon : (existingData.kabel_precon || null),
        latitude: (!existingData.latitude && lat) ? lat : (existingData.latitude || null),
        longitude: (!existingData.longitude && lng) ? lng : (existingData.longitude || null),
        updated_at: nowIso
      });
    } else {
      // PELANGGAN BARU (baik dari /new maupun /active yang belum dilaporkan):
      // Status awal tetap 'Belum' agar teknisi dapat mengirimkan laporan IKR/Aktivasi
      rowsNew.push({
        id_pelanggan: idPelanggan,
        nama_pelanggan: nama,
        nomor_hp: telepon,
        alamat: alamat,
        catatan: catatan,
        nama_sales: namaSales,
        ikr_partner: ikrPartner || null,
        status_ikr: "Belum",
        status_aktivasi: "Belum",
        latitude: lat || "",
        longitude: lng || "",
        stasiun: dbStationName,
        odp: odp,
        port_odp: portOdp,
        sn_ont: snOnt,
        kabel_precon: precon,
        tanggal_registrasi: tglRegistrasi,
        created_at: nowIso,
        updated_at: nowIso
      });
    }
  }

  // 4. Simpan Langsung ke Supabase (100% Direct Upsert)
  if (rowsNew.length > 0) {
    const { error: insErr } = await supabase
      .from('data_pelanggan')
      .upsert(rowsNew, { onConflict: 'id_pelanggan', ignoreDuplicates: true });
    if (insErr) throw new Error(`Supabase Insert Pelanggan Baru gagal: ${insErr.message}`);
  }

  if (rowsExisting.length > 0) {
    const { error: updErr } = await supabase
      .from('data_pelanggan')
      .upsert(rowsExisting, { onConflict: 'id_pelanggan' });
    if (updErr) throw new Error(`Supabase Update Pelanggan Existing gagal: ${updErr.message}`);
  }

  return {
    station: stationName,
    baru: rowsNew.length,
    update: rowsExisting.length,
    message: `Sukses: ${rowsNew.length} pelanggan baru/aktif ditambahkan & ${rowsExisting.length} info sales/teknis diperbarui.`
  };
}

// =========================================================================
// 5. HTTP SERVER (SUPABASE EDGE FUNCTION: sync-partner)
// =========================================================================
serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (_) {
        body = {};
      }
    } else {
      const url = new URL(req.url);
      body.station = url.searchParams.get("station");
      body.search = url.searchParams.get("search");
    }

    const stationParam = body.station;
    const searchParam = body.search ? String(body.search).trim() : null;

    if (!stationParam) {
      throw new Error("Parameter 'station' wajib diisi (misal: 'Kaliwungu' atau 'ALL')!");
    }

    // Ambil Token dari Environment Secrets (atau fallback ke token default di atas)
    const partnerToken = Deno.env.get('STARLITE_PARTNER_TOKEN') || DEFAULT_PARTNER_TOKEN;
    const partnerCookie = Deno.env.get('STARLITE_PARTNER_COOKIE') || DEFAULT_PARTNER_COOKIE;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "https://jtmferyskpbnacluyafs.supabase.co";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!; // Bypass RLS jika service role aktif
    const supabase = createClient(supabaseUrl, supabaseKey);

    // KASUS 1: Auto-Running Cron untuk SEMUA Stasiun (station = "ALL")
    if (stationParam.toUpperCase() === "ALL") {
      const allStations = Object.keys(PARTNER_STATION_IDS);
      const summary: any[] = [];
      let grandTotalBaru = 0;
      let grandTotalUpdate = 0;

      for (const st of allStations) {
        try {
          const res = await syncStationCustomers(supabase, st, partnerToken, partnerCookie, 3, searchParam);
          summary.push(res);
          grandTotalBaru += res.baru || 0;
          grandTotalUpdate += res.update || 0;
        } catch (e: any) {
          summary.push({ station: st, status: "error", error: e.message });
        }
      }

      return new Response(JSON.stringify({
        status: "success",
        message: `Sinkronisasi Web Partner (ALL) selesai: ${grandTotalBaru} baru & ${grandTotalUpdate} diperbarui.`,
        data: {
          total_baru: grandTotalBaru,
          total_update: grandTotalUpdate,
          summary
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // KASUS 2: Dipanggil dari Tombol Web App untuk Stasiun Tertentu (misal: "Kaliwungu")
    const resolvedStation = resolveStationName(stationParam);
    const result = await syncStationCustomers(supabase, resolvedStation, partnerToken, partnerCookie, 3, searchParam);

    return new Response(JSON.stringify({
      status: result.status === "error" ? "error" : "success",
      message: result.message,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      status: "error",
      message: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
