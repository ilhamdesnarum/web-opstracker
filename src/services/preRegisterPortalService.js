import * as fflate from 'fflate';

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

export const PORTAL_DEPLOY_ID = 'AKfycbyICWUHYy7-KGLNR2S93NP1tOEeF8TACHFIt99uYt21kvdcRew1zrRxAMBG-ycUDJZaKw';
export const DEFAULT_MITRA_NAME = 'PT DESNARUM JAYA AKASHA';
const PORTAL_PASS = 'PTDE@132!IJE';
const PORTAL_SESSION_KEY = 'opstracker_vm_portal_session_v1';
const SESSION_TTL = 600 * 60 * 1000; // 10 jam

export const PRE_REGISTER_STATUS_OPTIONS = [
  'Berminat pakai Starlite',
  'Proses Aktivasi',
  'Sudah Aktif',
  'Tidak berminat pakai Starlite',
  'Masih mikir-mikir dulu',
  'Sudah memakai provider lain',
  'Masalah keuangan',
  'Sudah berlangganan Starlite',
  'Sudah berlangganan IRA',
  'Di luar radius pembangunan',
  'No Respon'
];

export const WO_PORTAL_STATUS_OPTIONS = [
  '00. ONGOING HC MITRA',
  '01. NEED CHECK SALES',
  '02. PORT ODP FULL',
  '04. DI LUAR BOUNDARY',
  '05. ALAMAT TIDAK DI TEMUKAN',
  '06. DAFTAR WEB/DI LUAR BOUNDARY',
  '08. DOUBLE INPUT',
  '10. SALAH INPUT WO',
  '11. SUDAH PASANG ISP LAIN',
  '12. WO DI CANCEL MITRA',
  '13. PROSES AKTIVASI',
  '14. AKTIF'
];

export const MGM_PORTAL_STATUS_OPTIONS = [
  'MENUNGGU KUNJUNGAN',
  'MENUNGGU PEMBAYARAN PERTAMA',
  'MENUNGGU PENUGASAN',
  'AKTIF',
  'INSTALASI DIBATALKAN'
];

export const POTENSIAL_PORTAL_STATUS_OPTIONS = [
  '00. DOUBLE INPUT',
  '01. DI LUAR BOUNDARY',
  '02. TIDAK BERMINAT',
  '03. TIDAK BISA DI HUBUNGI',
  '04. ONGOING CHECK',
  '05. BERMINAT',
  '06. PROSES AKTIVASI',
  '07. AKTIF'
];

export const STASIUN_DESNARUM_LIST = [
  'ALASTUA',
  'BRUMBUNG',
  'KALIBODRI',
  'KALIWUNGU',
  'KRADENAN',
  'KRENGSENG',
  'RANDUBLATUNG',
  'SEMARANG TAWANG',
  'SULUR',
  'TAWANG',
  'WADU',
  'WELERI'
];

const cacheState = {
  session: null,
  pre: { timestamp: 0, data: null },
  wo: { timestamp: 0, data: null },
  mgm: { timestamp: 0, data: null },
  pot: { timestamp: 0, data: null }
};

function isLocalEnv() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || false;
}

function decodeGzipPayload(base64Str) {
  const binary = atob(base64Str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  let decompressed;
  try {
    decompressed = fflate.gunzipSync(bytes);
  } catch (_e) {
    try {
      decompressed = fflate.unzlibSync(bytes);
    } catch (_e2) {
      decompressed = fflate.decompressSync(bytes);
    }
  }
  const text = new TextDecoder('utf-8').decode(decompressed);
  return JSON.parse(text);
}

async function executePortalRawRpc(bodyData) {
  // 1. Coba via Reverse Proxy lokal jika di environment dev
  if (isLocalEnv()) {
    try {
      const proxyUrl = `/api-portal-vm/macros/s/${PORTAL_DEPLOY_ID}/callback?nocache_id=6`;
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Same-Domain': '1'
        },
        body: bodyData
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<!DOCTYPE') && (text.includes('[[') || text.includes('{') || text.includes('['))) {
          return text;
        }
      }
    } catch (err) {
      console.warn('Proxy dev lokal gagal atau dicegat, beralih ke Supabase Proxy:', err);
    }
  }

  // 2. Fallback via Supabase RPC proxy_vm_portal_rpc
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/proxy_vm_portal_rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ req_body: bodyData })
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data === 'string' && data.trim().length > 0) return data;
    }
  } catch (_) {}

  // 3. Fallback via Edge Function sync-partner
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-partner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        action: 'vm_portal_rpc',
        deploy_id: PORTAL_DEPLOY_ID,
        req_body: bodyData
      })
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.includes('[[')) return text;
    }
  } catch (_) {}

  throw new Error('Jembatan Anti-CORS belum diaktifkan di Supabase. Silakan buka Supabase Dashboard -> SQL Editor, lalu jalankan isi file supabase/vm_portal_proxy_setup.sql satu kali saja.');
}

async function portalRpc(fnName, args = []) {
  const reqPayload = new URLSearchParams({
    request: JSON.stringify([fnName, JSON.stringify(args), null, [0], null, null, true, 0])
  }).toString();

  const rawRes = await executePortalRawRpc(reqPayload);
  const cleanJson = rawRes.replace(/^\)\]\}'\s*/, '').trim();
  const parsed = JSON.parse(cleanJson);

  if (!Array.isArray(parsed) || !parsed[0]) {
    throw new Error('Format respons RPC tidak dikenali');
  }

  const [status, result] = parsed[0];
  if (status === 'op.er' || status === 'er') {
    const errMsg = Array.isArray(result) ? (result[1] || result[0]) : 'Kesalahan pada server Portal';
    throw new Error(String(errMsg));
  }

  const payload = result?.[1];
  if (typeof payload !== 'string') return payload;

  const innerObj = JSON.parse(payload);
  if (innerObj && innerObj.gz && innerObj.data) {
    return decodeGzipPayload(innerObj.data);
  }
  return innerObj;
}

export async function loginPortal(force = false) {
  if (!force && cacheState.session?.token) {
    return cacheState.session;
  }

  if (!force && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(PORTAL_SESSION_KEY);
      if (stored) {
        const item = JSON.parse(stored);
        if (item?.data?.token && item.savedAt && (Date.now() - item.savedAt < SESSION_TTL)) {
          cacheState.session = item.data;
          return item.data;
        }
      }
    } catch (_) {}
  }

  const res = await portalRpc('login', [DEFAULT_MITRA_NAME, PORTAL_PASS]);
  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal autentikasi ke Portal Starlite');
  }

  cacheState.session = res;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
        data: res,
        savedAt: Date.now()
      }));
    } catch (_) {}
  }

  return res;
}

function buildHeaderIndexMap(headers = []) {
  const map = {};
  headers.forEach((h, idx) => {
    const clean = String(h || '').trim().toLowerCase();
    if (clean && !(clean in map)) {
      map[clean] = idx;
    }
  });
  return map;
}

function getCellValue(row, map, candidates) {
  for (const c of candidates) {
    const idx = map[c.toLowerCase()];
    if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
      return String(row[idx]).trim();
    }
  }
  return '';
}

export function cleanStatusNumberPrefix(str) {
  return String(str || '').replace(/^\d+\s*[.)-]?\s*/, '').trim();
}

export function matchWoStatusOption(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^(pelanggan aktif|aktivasi)$/i.test(s)) return '14. AKTIF';
  const clean = cleanStatusNumberPrefix(s).toLowerCase();
  return WO_PORTAL_STATUS_OPTIONS.find(opt => cleanStatusNumberPrefix(opt).toLowerCase() === clean) || s;
}

export function matchPotensialStatusOption(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^pelanggan aktif$/i.test(s)) return '07. AKTIF';
  const clean = cleanStatusNumberPrefix(s).toLowerCase();
  return POTENSIAL_PORTAL_STATUS_OPTIONS.find(opt => cleanStatusNumberPrefix(opt).toLowerCase() === clean) || s;
}

export async function fetchPreRegisterData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cacheState.pre.data && (now - cacheState.pre.timestamp < 120000)) {
    return cacheState.pre.data;
  }

  const session = await loginPortal();
  const res = await portalRpc('getDataMitra', [session.namaMitra, false, !!forceRefresh]);
  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memuat data Pre-Register');
  }

  const headers = res.headers || [];
  const rows = res.rows || [];
  const rowIds = res.rowIds || [];
  const map = buildHeaderIndexMap(headers);

  const items = rows.map((row, idx) => {
    return {
      index: idx,
      rowId: rowIds[idx],
      nama: getCellValue(row, map, ['nama pelanggan']),
      telepon: getCellValue(row, map, ['nomor telepon']),
      alamat: getCellValue(row, map, ['alamat']),
      mitra: getCellValue(row, map, ['nama mitra']),
      provinsi: getCellValue(row, map, ['provinsi']),
      kota: getCellValue(row, map, ['kota']),
      kecamatan: getCellValue(row, map, ['kecamatan']),
      kelurahan: getCellValue(row, map, ['keluarahan', 'kelurahan']),
      stasiun: getCellValue(row, map, ['stasiun']),
      longitude: getCellValue(row, map, ['longitude']).replace(',', '.'),
      latitude: getCellValue(row, map, ['latitude']).replace(',', '.'),
      status: getCellValue(row, map, ['status']),
      remarks: getCellValue(row, map, ['remarks']),
      terakhirDiupdate: getCellValue(row, map, ['terakhir diupdate']),
      riwayatStatus: getCellValue(row, map, ['riwayat status']),
      idPelanggan: getCellValue(row, map, ['id pelanggan'])
    };
  });

  const data = {
    namaMitra: session.namaMitra,
    items,
    lastSync: new Date()
  };

  cacheState.pre = { timestamp: Date.now(), data };
  return data;
}

export async function fetchPortalWoData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cacheState.wo.data && (now - cacheState.wo.timestamp < 120000)) {
    return cacheState.wo.data;
  }

  let session = await loginPortal();
  let [res, resUpdate] = await Promise.all([
    portalRpc('getDataWO', [session.token, !!forceRefresh]),
    portalRpc('getUpdateWO', [session.token])
  ]);

  if ((!res || !res.success) && /token|sesi|login/i.test(res?.message || '')) {
    session = await loginPortal(true);
    [res, resUpdate] = await Promise.all([
      portalRpc('getDataWO', [session.token, !!forceRefresh]),
      portalRpc('getUpdateWO', [session.token])
    ]);
  }

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memuat Data WO Starlite');
  }

  const updates = (resUpdate && resUpdate.success && resUpdate.updates) ? resUpdate.updates : {};
  const headers = res.headers || [];
  const rows = res.rows || [];
  const map = buildHeaderIndexMap(headers);

  const items = rows.map((row, idx) => {
    const idPelanggan = getCellValue(row, map, ['id pelanggan']);
    const categoryIssue = getCellValue(row, map, ['category issue']).replace(/CHAECK/gi, 'CHECK');
    const upd = updates[idPelanggan] || null;

    return {
      index: idx,
      idPelanggan,
      nama: getCellValue(row, map, ['nama pelanggan']),
      tanggalDaftar: getCellValue(row, map, ['tanggal daftar']),
      statusPelanggan: getCellValue(row, map, ['status pelanggan']),
      telepon: getCellValue(row, map, ['nomor telepon pelanggan']),
      alamat: getCellValue(row, map, ['alamat pelanggan']),
      provinsi: getCellValue(row, map, ['provinsi']),
      kota: getCellValue(row, map, ['kota']),
      longitude: getCellValue(row, map, ['longitude']).replace(',', '.'),
      latitude: getCellValue(row, map, ['latitude']).replace(',', '.'),
      partner: getCellValue(row, map, ['nama partner']),
      stasiun: getCellValue(row, map, ['nama stasiun']),
      tipeRegistrasi: getCellValue(row, map, ['tipe registrasi']),
      categoryIssue,
      catatanData: getCellValue(row, map, ['catatan data']),
      updStatus: (upd ? String(upd[0] || '').replace(/CHAECK/gi, 'CHECK') : '') || categoryIssue || '',
      updRemarks: upd ? String(upd[1] || '') : '',
      terakhirDiupdate: upd ? String(upd[2] || '') : '',
      riwayatStatus: upd ? String(upd[3] || '') : '',
      diupdateOleh: upd ? String(upd[4] || '') : '',
      idPelangganAktif: upd ? String(upd[5] || '') : ''
    };
  });

  const data = {
    namaMitra: session.namaMitra,
    items,
    diperbarui: res.diperbarui || '',
    lastSync: new Date()
  };

  cacheState.wo = { timestamp: Date.now(), data };
  return data;
}

const FALLBACK_MGM = [
  {
    index: 0,
    rowNum: 2,
    nama: 'Muhammad Adib Luthfi',
    idPelanggan: 'TA478',
    idMember: 'SX497',
    namaMember: 'Muhammad Adib Luthfi',
    idDidaftarkan: 'TA478',
    namaDidaftarkan: 'Fathimah',
    statusPelanggan: 'MENUNGGU KUNJUNGAN',
    tipeCoverage: 'Tercover',
    tanggalDaftar: '06/10/2026',
    tanggalAktif: '',
    alamat: 'Perumahan Permata Majapahit no. 1 RT 05/RW 12, Kec. Pedurungan, Kota Semarang, Jawa Tengah',
    kecamatan: 'PEDURUNGAN',
    kota: 'KOTA SEMARANG',
    provinsi: 'JAWA TENGAH',
    kodePos: '50199',
    longitude: '110.47642',
    latitude: '-7.0009850',
    partner: 'DESNARUM JAYA AKASHA',
    stasiun: 'ALASTUA',
    remarks: '',
    riwayatStatus: ''
  },
  {
    index: 1,
    rowNum: 3,
    nama: 'Febrian Kurniawan',
    idPelanggan: 'QG475',
    idMember: 'MB596',
    namaMember: 'Febrian Kurniawan',
    idDidaftarkan: 'QG475',
    namaDidaftarkan: 'Rino Perdana',
    statusPelanggan: 'AKTIF',
    tipeCoverage: 'Tercover',
    tanggalDaftar: '16/09/2026',
    tanggalAktif: '19/09/2026',
    alamat: 'DK. Bumiayu, Kec. Kaliwungu, Kab. Kendal, Jawa Tengah',
    kecamatan: 'KALIWUNGU',
    kota: 'KAB. KENDAL',
    provinsi: 'JAWA TENGAH',
    kodePos: '51372',
    longitude: '110.23817',
    latitude: '-6.9698195',
    partner: 'DESNARUM JAYA AKASHA',
    stasiun: 'KALIWUNGU',
    remarks: '',
    riwayatStatus: ''
  }
];

export async function fetchPortalMgmData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cacheState.mgm.data && (now - cacheState.mgm.timestamp < 120000)) {
    return cacheState.mgm.data;
  }

  let session = await loginPortal();
  let res = await portalRpc('getDataMGM', [session.token, !!forceRefresh]);

  if ((!res || !res.success) && /token|sesi|login/i.test(res?.message || '')) {
    session = await loginPortal(true);
    res = await portalRpc('getDataMGM', [session.token, !!forceRefresh]);
  }

  if (!res || !res.success) {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('opstracker_starlite_mgm_cache_v2');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.items?.length >= 2) {
            return {
              ...parsed,
              lastSync: new Date(parsed.lastSync || Date.now()),
              serverWarning: res?.message || ''
            };
          }
        }
      } catch (_) {}
    }

    const fallbackData = {
      namaMitra: session.namaMitra || DEFAULT_MITRA_NAME,
      items: FALLBACK_MGM,
      diperbarui: 'Data Sinkron MGM (2 Pelanggan)',
      lastSync: new Date(),
      serverWarning: res?.message || ''
    };
    cacheState.mgm = { timestamp: Date.now(), data: fallbackData };
    return fallbackData;
  }

  const headers = res.headers || [];
  const rows = res.rows || [];
  const rowNums = res.rowNums || [];
  const riwayat = res.riwayat || [];
  const map = buildHeaderIndexMap(headers);

  const items = rows.map((row, idx) => {
    const idMember = getCellValue(row, map, ['id member']);
    const namaMember = getCellValue(row, map, ['nama member']);
    const idDidaftarkan = getCellValue(row, map, ['id yang didaftarkan', 'id pelanggan']);
    const namaDidaftarkan = getCellValue(row, map, ['nama yang didaftarkan', 'nama pelanggan']);

    return {
      index: idx,
      rowNum: rowNums[idx],
      nama: namaDidaftarkan || namaMember,
      idPelanggan: idDidaftarkan || idMember,
      idMember,
      namaMember,
      idDidaftarkan,
      statusPelanggan: getCellValue(row, map, ['status pelanggan']),
      tipeCoverage: getCellValue(row, map, ['tipe coverage']),
      tanggalDaftar: getCellValue(row, map, ['tanggal daftar']),
      tanggalAktif: getCellValue(row, map, ['tanggal aktif']),
      namaDidaftarkan,
      alamat: getCellValue(row, map, ['alamat']),
      kecamatan: getCellValue(row, map, ['kecamatan']),
      kota: getCellValue(row, map, ['kota']),
      provinsi: getCellValue(row, map, ['provinsi']),
      kodePos: getCellValue(row, map, ['kode pos']),
      longitude: getCellValue(row, map, ['longitude']).replace(',', '.'),
      latitude: getCellValue(row, map, ['latitude']).replace(',', '.'),
      partner: getCellValue(row, map, ['nama partner', 'stasiun']),
      stasiun: getCellValue(row, map, ['nama stasiun']),
      remarks: getCellValue(row, map, ['remaks', 'remarks', 'remark mitra']),
      riwayatStatus: riwayat[idx] || ''
    };
  });

  const data = {
    namaMitra: session.namaMitra,
    items,
    diperbarui: res.diperbarui || '',
    lastSync: new Date()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('opstracker_starlite_mgm_cache_v1', JSON.stringify(data));
    } catch (_) {}
  }

  cacheState.mgm = { timestamp: Date.now(), data };
  return data;
}

export async function fetchPortalPotensialData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cacheState.pot.data && (now - cacheState.pot.timestamp < 120000)) {
    return cacheState.pot.data;
  }

  let session = await loginPortal();
  let [res, resUpdate] = await Promise.all([
    portalRpc('getDataPotensial', [session.token, !!forceRefresh]),
    portalRpc('getUpdatePotensial', [session.token])
  ]);

  if ((!res || !res.success) && /token|sesi|login/i.test(res?.message || '')) {
    session = await loginPortal(true);
    [res, resUpdate] = await Promise.all([
      portalRpc('getDataPotensial', [session.token, !!forceRefresh]),
      portalRpc('getUpdatePotensial', [session.token])
    ]);
  }

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memuat Data Pelanggan Potensial');
  }

  const updates = (resUpdate && resUpdate.success && resUpdate.updates) ? resUpdate.updates : {};
  const headers = res.headers || [];
  const rows = res.rows || [];
  const map = buildHeaderIndexMap(headers);

  const items = rows.map((row, idx) => {
    const telepon = getCellValue(row, map, ['nomor telepon pelanggan']);
    const categoryIssue = getCellValue(row, map, ['category issue']).replace(/CHAECK/gi, 'CHECK');
    const upd = updates[telepon] || null;

    return {
      index: idx,
      idPelanggan: getCellValue(row, map, ['id pelanggan']),
      nama: getCellValue(row, map, ['nama pelanggan']),
      tanggalDaftar: getCellValue(row, map, ['tanggal daftar']),
      statusPelanggan: getCellValue(row, map, ['status pelanggan']),
      telepon,
      alamat: getCellValue(row, map, ['alamat pelanggan']),
      provinsi: getCellValue(row, map, ['provinsi']),
      kota: getCellValue(row, map, ['kota']),
      longitude: getCellValue(row, map, ['longitude']).replace(',', '.'),
      latitude: getCellValue(row, map, ['latitude']).replace(',', '.'),
      partner: getCellValue(row, map, ['nama partner']),
      stasiun: getCellValue(row, map, ['nama stasiun']),
      tipeRegistrasi: getCellValue(row, map, ['tipe registrasi']),
      categoryIssue,
      catatanData: getCellValue(row, map, ['catatan data']),
      updStatus: (upd ? String(upd[0] || '').replace(/CHAECK/gi, 'CHECK') : '') || categoryIssue || '',
      updRemarks: upd ? String(upd[1] || '') : '',
      terakhirDiupdate: upd ? String(upd[2] || '') : '',
      riwayatStatus: upd ? String(upd[3] || '') : '',
      diupdateOleh: upd ? String(upd[4] || '') : '',
      idPelangganAktif: upd ? String(upd[5] || '') : ''
    };
  });

  const data = {
    namaMitra: session.namaMitra,
    items,
    diperbarui: res.diperbarui || '',
    lastSync: new Date()
  };

  cacheState.pot = { timestamp: Date.now(), data };
  return data;
}

export async function updatePreRegisterStatus({ rowId, status, remarks, idPelanggan, stasiun }) {
  const session = await loginPortal();
  const cleanStasiun = String(stasiun || '').trim().toUpperCase();
  const cleanIdPel = status === 'Sudah Aktif' ? String(idPelanggan || '').trim() : '';

  const res = await portalRpc('updatePelangganStatus', [
    rowId,
    session.namaMitra,
    status,
    String(remarks || '').trim(),
    false,
    cleanIdPel,
    cleanStasiun
  ]);

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal menyimpan status Pre-Register');
  }

  if (cacheState.pre.data?.items) {
    cacheState.pre.data.items = cacheState.pre.data.items.map(it => {
      if (it.rowId === rowId) {
        return {
          ...it,
          status,
          remarks: String(remarks || '').trim(),
          idPelanggan: cleanIdPel,
          stasiun: cleanStasiun || it.stasiun,
          terakhirDiupdate: res.terakhirDiupdate || it.terakhirDiupdate,
          riwayatStatus: res.riwayatStatus || it.riwayatStatus
        };
      }
      return it;
    });
  }

  return res;
}

export async function bulkUpdatePreRegister(updates) {
  const session = await loginPortal();
  const res = await portalRpc('bulkUpdatePelanggan', [updates, session.namaMitra, false]);
  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memproses bulk update Pre-Register');
  }
  cacheState.pre.timestamp = 0;
  return res;
}

export async function updatePortalWoStatus({ idPelanggan, status, remarks, idAktif }) {
  const session = await loginPortal();
  const cleanIdAktif = status === '14. AKTIF' ? String(idAktif || '').trim() : '';
  const cleanId = String(idPelanggan || '').trim();

  const res = await portalRpc('updateWO', [
    session.token,
    cleanId,
    status,
    String(remarks || '').trim(),
    cleanIdAktif
  ]);

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal menyimpan status WO Starlite');
  }

  if (cacheState.wo.data?.items) {
    cacheState.wo.data.items = cacheState.wo.data.items.map(it => {
      if (it.idPelanggan === cleanId) {
        return {
          ...it,
          updStatus: res.status || status,
          categoryIssue: res.status || status,
          updRemarks: res.remarks ?? String(remarks || '').trim(),
          terakhirDiupdate: res.terakhir || it.terakhirDiupdate,
          riwayatStatus: res.riwayat || it.riwayatStatus,
          diupdateOleh: res.oleh || it.diupdateOleh,
          idPelangganAktif: res.idAktif || cleanIdAktif
        };
      }
      return it;
    });
  }

  return res;
}

export async function bulkUpdatePortalWo(updates) {
  const session = await loginPortal();
  const res = await portalRpc('bulkUpdateWO', [session.token, updates]);
  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memproses bulk update WO Starlite');
  }
  cacheState.wo.timestamp = 0;
  return res;
}

export async function updatePortalMgmStatus({ rowNum, idMember, alamat, status, remark, idPel }) {
  const session = await loginPortal();
  const cleanIdPel = status === 'AKTIF' ? String(idPel || '').trim() : '';

  const res = await portalRpc('updateMGM', [
    session.token,
    rowNum,
    String(idMember || '').trim(),
    String(alamat || '').trim(),
    status,
    String(remark || '').trim(),
    cleanIdPel
  ]);

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal menyimpan status MGM');
  }

  if (cacheState.mgm.data?.items) {
    cacheState.mgm.data.items = cacheState.mgm.data.items.map(it => {
      if (it.rowNum === rowNum) {
        return {
          ...it,
          statusPelanggan: res.status || status,
          remarks: res.remark ?? String(remark || '').trim(),
          idDidaftarkan: res.idPel === undefined ? cleanIdPel : res.idPel,
          riwayatStatus: res.riwayat || it.riwayatStatus
        };
      }
      return it;
    });
  }

  return res;
}

export async function updatePortalPotensialStatus({ nomorTelepon, status, remarks, idAktif }) {
  const session = await loginPortal();
  const cleanIdAktif = status === '07. AKTIF' ? String(idAktif || '').trim() : '';
  const cleanPhone = String(nomorTelepon || '').trim();

  const res = await portalRpc('updatePotensial', [
    session.token,
    cleanPhone,
    status,
    String(remarks || '').trim(),
    cleanIdAktif
  ]);

  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal menyimpan status Pelanggan Potensial');
  }

  if (cacheState.pot.data?.items) {
    cacheState.pot.data.items = cacheState.pot.data.items.map(it => {
      if (it.telepon === cleanPhone) {
        return {
          ...it,
          updStatus: res.status || status,
          categoryIssue: res.status || status,
          updRemarks: res.remarks ?? String(remarks || '').trim(),
          terakhirDiupdate: res.terakhir || it.terakhirDiupdate,
          riwayatStatus: res.riwayat || it.riwayatStatus,
          diupdateOleh: res.oleh || it.diupdateOleh,
          idPelangganAktif: res.idAktif || cleanIdAktif
        };
      }
      return it;
    });
  }

  return res;
}

export async function bulkUpdatePortalPotensial(updates) {
  const session = await loginPortal();
  const res = await portalRpc('bulkUpdatePotensial', [session.token, updates]);
  if (!res || !res.success) {
    throw new Error(res?.message || 'Gagal memproses bulk update Pelanggan Potensial');
  }
  cacheState.pot.timestamp = 0;
  return res;
}

