// =========================================================================
// SERVICE: SINKRONISASI CEPAT PELANGGAN BARU (API PARTNER -> SUPABASE)
// =========================================================================
// Hanya menarik pelanggan baru (endpoint /mitra/customer/new), TANPA update status
// lama (suspend/dismantle) agar proses selesai dalam hitungan detik.
// - 11 Stasiun dijalankan secara paralel
// - Maksimal 3 halaman per stasiun (30 data)
// - Sort: DESC (terbaru lebih dulu)
// - Early Exit: Begitu menemukan data yang sudah ada di database, langsung
//   stop paging stasiun tersebut.
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

function formatKeWIB(isoString) {
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
  } catch (_e) {
    return String(isoString).substring(0, 19).replace("T", " ");
  }
}

function extractCoordinates(c) {
  let lat = "";
  let lng = "";

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

  if ((!lat || !lng) && c.sales_visit_id && typeof c.sales_visit_id === 'object') {
    if (!lat && (c.sales_visit_id.latitude || c.sales_visit_id.lat)) {
      lat = String(c.sales_visit_id.latitude || c.sales_visit_id.lat).trim().replace(",", ".");
    }
    if (!lng && (c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long)) {
      lng = String(c.sales_visit_id.longitude || c.sales_visit_id.lng || c.sales_visit_id.long).trim().replace(",", ".");
    }
  }

  if ((!lat || !lng) && c.installation_info_id) {
    const instList = Array.isArray(c.installation_info_id) ? c.installation_info_id : [c.installation_info_id];
    for (const inst of instList) {
      if (!inst) continue;
      if (!lat && (inst.latitude || inst.lat)) lat = String(inst.latitude || inst.lat).trim().replace(",", ".");
      if (!lng && (inst.longitude || inst.lng || inst.long)) lng = String(inst.longitude || inst.lng || inst.long).trim().replace(",", ".");
      if (lat && lng) break;
    }
  }

  return { lat, lng };
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

function extractRegDate(c) {
  if (c.registration_date) return formatKeWIB(c.registration_date);
  if (c.request_ikr_id && c.request_ikr_id.registration_date) return formatKeWIB(c.request_ikr_id.registration_date);
  if (c.visit_date) return formatKeWIB(c.visit_date);
  if (c.sales_visit_id && c.sales_visit_id.visit_date) return formatKeWIB(c.sales_visit_id.visit_date);
  if (c.customer_id && typeof c.customer_id === 'object' && c.customer_id.registration_date) return formatKeWIB(c.customer_id.registration_date);
  if (c.created_ats) return formatKeWIB(c.created_ats);
  if (c.created_at) return formatKeWIB(c.created_at);
  return "";
}

function extractSnOnt(c) {
  if (c.ont_id && Array.isArray(c.ont_id) && c.ont_id.length > 0) {
    return c.ont_id[0].sn || c.ont_id[0].serial_number || "";
  }
  return c.sn_ont || c.sn || "";
}

function extractActiveDates(c) {
  let tglAktivasi = "";
  if (c.billing_id && Array.isArray(c.billing_id) && c.billing_id.length > 0) {
    const paidB = c.billing_id.find(x => x.payment_date);
    if (paidB) tglAktivasi = formatKeWIB(paidB.payment_date);
  }
  if (!tglAktivasi && c.request_ikr_id && c.request_ikr_id.updated_at) {
    tglAktivasi = formatKeWIB(c.request_ikr_id.updated_at);
  }
  if (!tglAktivasi && c.created_ats) {
    tglAktivasi = formatKeWIB(c.created_ats);
  }

  let tanggalBerakhir = "";
  if (c.user_ppoe_id && c.user_ppoe_id.yinet_info) {
    try {
      const yinet = typeof c.user_ppoe_id.yinet_info === "string" ? JSON.parse(c.user_ppoe_id.yinet_info) : c.user_ppoe_id.yinet_info;
      if (yinet?.expired_date) tanggalBerakhir = formatKeWIB(yinet.expired_date);
    } catch (_e) {}
  }
  if (!tanggalBerakhir && c.billing_id && Array.isArray(c.billing_id) && c.billing_id.length > 0) {
    const b = c.billing_id.find(x => x.expire_date || x.due_date);
    if (b) tanggalBerakhir = formatKeWIB(b.expire_date || b.due_date);
  }

  const telatBayarHari = (c.count_late_payment_days !== undefined && c.count_late_payment_days !== null && c.count_late_payment_days !== "")
    ? Number(c.count_late_payment_days)
    : null;

  return { tglAktivasi, tanggalBerakhir, telatBayarHari };
}

function extractSalesName(c) {
  if (!c) return "Daftar Mandiri";
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

  if (!s) return "Daftar Mandiri";
  const cleaned = String(s).trim();
  if (cleaned.toLowerCase() === 'daftar mandiri' || cleaned === '-' || cleaned === '') return "Daftar Mandiri";
  return cleaned;
}

/**
 * Sinkronisasi Cepat Pelanggan Baru & Pelanggan Baru yang Sudah Aktif dari API Partner Starlite
 * - Pintu 1: /mitra/customer/new (pendaftaran baru)
 * - Pintu 2: /mitra/customer/active (pelanggan baru yang langsung aktif dan pindah dari /customer/new)
 * @param {Object} options
 * @param {Array} options.pelangganList - Data pelanggan yang sudah ada di memori
 * @param {number} options.maxPagesPerStation - Batas halaman per stasiun untuk /customer/new (default 3)
 * @param {number} options.maxActivePagesPerStation - Batas halaman per stasiun untuk /customer/active (default 2)
 * @param {Function} options.onProgress - Callback teks status
 */
export async function syncNewCustomersFast({
  pelangganList = [],
  maxPagesPerStation = 3,
  maxActivePagesPerStation = 2,
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

  const partnerBaseUrl = (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  ))
    ? '/api-mitra/mitra'
    : 'https://api-mitra.starliteindonesia.com/mitra';

  // Himpunan ID pelanggan yang sudah ada di memori/database (lookup O(1))
  const existingSet = new Set(
    (pelangganList || []).map(p => String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase())
  );

  // Map status awal pelanggan untuk mendeteksi update dari 'Belum' menjadi 'Sudah'
  const existingStatusMap = new Map();
  (pelangganList || []).forEach(p => {
    const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
    if (id) {
      existingStatusMap.set(id, {
        status_aktivasi: String(p.status_aktivasi || p.aktivasi || '').trim().toUpperCase(),
        status_ikr: String(p.status_ikr || p.ikr || '').trim().toUpperCase()
      });
    }
  });

  const newCustomersToInsert = [];
  const customersToUpdateStatus = [];
  let newActiveCount = 0;
  const pageSize = 10;

  try {
    if (onProgress) onProgress('Memeriksa pendaftaran pelanggan baru & aktivasi terbaru di 11 stasiun...');

    // Jalankan 11 stasiun secara paralel untuk efisiensi waktu maksimal
    const stationTasks = Object.entries(PARTNER_STATION_IDS).map(async ([stationName, partnerId]) => {
      // ── SCAN 1: PELANGGAN BARU (/customer/new) ──
      let newPage = 1;
      let stopNewPaging = false;

      while (newPage <= maxPagesPerStation && !stopNewPaging) {
        const url = `${partnerBaseUrl}/customer/new?page=${newPage}&page_size=${pageSize}&sort_order=DESC&sales_partner_id=${partnerId}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          const res = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) {
            stopNewPaging = true;
            break;
          }

          const json = await res.json();
          const items = json?.data || [];
          if (items.length === 0) {
            stopNewPaging = true;
            break;
          }

          let encounteredExistingOnThisPage = false;

          for (const item of items) {
            const rawId = item.customer_id && typeof item.customer_id === 'string'
              ? item.customer_id
              : (item.customer_id ? item.customer_id.customer_id : '');
            const idPelanggan = String(rawId || '').trim();
            if (!idPelanggan) continue;

            const idUpper = idPelanggan.toUpperCase();

            if (existingSet.has(idUpper)) {
              encounteredExistingOnThisPage = true;
            } else {
              const nama = item.name || (item.customer_id ? item.customer_id.name : "");
              const telepon = item.phone_number || (item.customer_id ? item.customer_id.phone_number : "");
              const alamat = item.address || (item.customer_id ? item.customer_id.address : "");
              const patokan = item.notes || "";
              const { lat, lng } = extractCoordinates(item);
              const { odp, portOdp } = extractOdpInfo(item);
              const tglRegistrasi = extractRegDate(item);
              const namaSales = extractSalesName(item);

              const newRow = {
                id_pelanggan: idPelanggan,
                nama_pelanggan: nama,
                nomor_hp: telepon,
                alamat: alamat,
                catatan: patokan,
                stasiun: stationName,
                status_ikr: 'Belum',
                status_aktivasi: 'Belum',
                odp: odp,
                port_odp: portOdp,
                nama_sales: namaSales,
                tanggal_registrasi: tglRegistrasi,
                ...(lat ? { latitude: lat } : {}),
                ...(lng ? { longitude: lng } : {}),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              newCustomersToInsert.push(newRow);
              existingSet.add(idUpper);
            }
          }

          if (encounteredExistingOnThisPage || items.length < pageSize) {
            stopNewPaging = true;
          } else {
            newPage++;
          }
        } catch (_err) {
          stopNewPaging = true;
          break;
        }
      }

      // ── SCAN 2: PELANGGAN BARU YANG SUDAH AKTIF (/customer/active) ──
      // Menjangkau pelanggan yang baru saja dipasang dan langsung aktif (sehingga sudah keluar dari /customer/new)
      let activePage = 1;
      let stopActivePaging = false;

      while (activePage <= maxActivePagesPerStation && !stopActivePaging) {
        const urlActive = `${partnerBaseUrl}/customer/active?page=${activePage}&page_size=${pageSize}&sales_partner_id=${partnerId}`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          const res = await fetch(urlActive, { headers, signal: controller.signal });
          clearTimeout(timeoutId);

          if (!res.ok) {
            stopActivePaging = true;
            break;
          }

          const json = await res.json();
          const items = json?.data || [];
          if (items.length === 0) {
            stopActivePaging = true;
            break;
          }

          let allOnPageAlreadyActive = true;

          for (const item of items) {
            const rawId = item.customer_id && typeof item.customer_id === 'string'
              ? item.customer_id
              : (item.customer_id ? item.customer_id.customer_id : '');
            const idPelanggan = String(rawId || '').trim();
            if (!idPelanggan) continue;

            const idUpper = idPelanggan.toUpperCase();

            if (!existingSet.has(idUpper)) {
              // KASUS UTAMA: Pelanggan baru yang langsung aktif dan tidak sempat ditarik di /customer/new!
              allOnPageAlreadyActive = false;
              const nama = item.name || (item.customer_id ? item.customer_id.name : "");
              const telepon = item.phone_number || (item.customer_id ? item.customer_id.phone_number : "");
              const alamat = item.address || (item.customer_id ? item.customer_id.address : "");
              const patokan = item.notes || "";
              const { lat, lng } = extractCoordinates(item);
              const { odp, portOdp } = extractOdpInfo(item);
              const tglRegistrasi = extractRegDate(item);
              const namaSales = extractSalesName(item);
              const { tglAktivasi, tanggalBerakhir, telatBayarHari } = extractActiveDates(item);
              const snOnt = extractSnOnt(item);

              const newRow = {
                id_pelanggan: idPelanggan,
                nama_pelanggan: nama,
                nomor_hp: telepon,
                alamat: alamat,
                catatan: patokan,
                stasiun: stationName,
                status_ikr: 'Sudah',
                status_aktivasi: 'Sudah',
                odp: odp,
                port_odp: portOdp,
                nama_sales: namaSales,
                tanggal_registrasi: tglRegistrasi,
                tgl_ikr: tglAktivasi || tglRegistrasi || null,
                tgl_aktivasi: tglAktivasi || tglRegistrasi || null,
                tanggal_berakhir: tanggalBerakhir || null,
                telat_bayar_hari: telatBayarHari,
                sn_ont: snOnt,
                ...(lat ? { latitude: lat } : {}),
                ...(lng ? { longitude: lng } : {}),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              newCustomersToInsert.push(newRow);
              existingSet.add(idUpper);
              newActiveCount++;
            } else {
              // Jika sudah ada di database, periksa apakah sebelumnya masih berstatus 'Belum'
              const prevStatus = existingStatusMap.get(idUpper);
              const isAlreadyAktif = prevStatus && (
                prevStatus.status_aktivasi === 'AKTIF' ||
                prevStatus.status_aktivasi === 'SUDAH' ||
                prevStatus.status_aktivasi === 'SUSPEND' ||
                prevStatus.status_aktivasi.includes('DISMANTLE')
              );

              if (!isAlreadyAktif) {
                allOnPageAlreadyActive = false;
                const { tglAktivasi, tanggalBerakhir, telatBayarHari } = extractActiveDates(item);
                const snOnt = extractSnOnt(item);

                customersToUpdateStatus.push({
                  id_pelanggan: idPelanggan,
                  status_ikr: 'Sudah',
                  status_aktivasi: 'Sudah',
                  tgl_aktivasi: tglAktivasi,
                  tanggal_berakhir: tanggalBerakhir,
                  telat_bayar_hari: telatBayarHari,
                  sn_ont: snOnt
                });
                existingStatusMap.set(idUpper, { status_aktivasi: 'SUDAH', status_ikr: 'SUDAH' });
              }
            }
          }

          // EARLY EXIT AKTIF: Jika seluruh pelanggan di halaman ini sudah tercatat dan berstatus aktif,
          // halaman berikutnya pasti adalah pelanggan lama yang sudah pernah disinkronkan.
          if (allOnPageAlreadyActive || items.length < pageSize) {
            stopActivePaging = true;
          } else {
            activePage++;
          }
        } catch (_errActive) {
          stopActivePaging = true;
          break;
        }
      }
    });

    await Promise.all(stationTasks);

    // 1. Simpan seluruh pelanggan baru ke database Supabase
    if (newCustomersToInsert.length > 0) {
      if (onProgress) onProgress(`Menyimpan ${newCustomersToInsert.length} pelanggan baru ke Supabase...`);

      const CHUNK_SIZE = 50;
      for (let i = 0; i < newCustomersToInsert.length; i += CHUNK_SIZE) {
        const chunk = newCustomersToInsert.slice(i, i + CHUNK_SIZE);
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(chunk)
          });
        } catch (saveErr) {
          console.warn('[FAST NEW SYNC] Gagal simpan batch new:', saveErr);
        }
      }
    }

    // 2. Perbarui pelanggan lama yang statusnya berubah menjadi aktif
    if (customersToUpdateStatus.length > 0) {
      if (onProgress) onProgress(`Memperbarui status ${customersToUpdateStatus.length} pelanggan yang baru aktif...`);

      for (const u of customersToUpdateStatus) {
        try {
          const patchPayload = {
            status_ikr: 'Sudah',
            status_aktivasi: 'Sudah',
            updated_at: new Date().toISOString()
          };
          if (u.tgl_aktivasi) {
            patchPayload.tgl_aktivasi = u.tgl_aktivasi;
            patchPayload.tgl_ikr = u.tgl_aktivasi;
          }
          if (u.tanggal_berakhir) patchPayload.tanggal_berakhir = u.tanggal_berakhir;
          if (u.telat_bayar_hari !== null && u.telat_bayar_hari !== undefined) patchPayload.telat_bayar_hari = u.telat_bayar_hari;
          if (u.sn_ont) patchPayload.sn_ont = u.sn_ont;

          await fetch(`${SUPABASE_URL}/rest/v1/data_pelanggan?id_pelanggan=eq.${encodeURIComponent(u.id_pelanggan)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(patchPayload)
          });
        } catch (patchErr) {
          console.warn('[FAST SYNC] Gagal patch status aktif:', u.id_pelanggan, patchErr);
        }
      }
    }

    return {
      success: true,
      newCount: newCustomersToInsert.length,
      newActiveCount: newActiveCount,
      updatedActiveCount: customersToUpdateStatus.length,
      newCustomers: newCustomersToInsert,
      updatedActiveCustomers: customersToUpdateStatus,
      message: (newCustomersToInsert.length > 0 || customersToUpdateStatus.length > 0)
        ? `${newCustomersToInsert.length} pelanggan baru berhasil ditarik${newActiveCount > 0 ? ` (${newActiveCount} sudah aktif)` : ''}${customersToUpdateStatus.length > 0 ? ` & ${customersToUpdateStatus.length} status aktivasi diperbarui.` : '.'}`
        : 'Tidak ada pelanggan baru (seluruh data pendaftaran & aktivasi sudah up-to-date).'
    };
  } catch (err) {
    console.error('[FAST NEW SYNC ERROR]:', err);
    return {
      success: false,
      newCount: 0,
      newActiveCount: 0,
      updatedActiveCount: 0,
      newCustomers: [],
      updatedActiveCustomers: [],
      error: err.message
    };
  }
}

