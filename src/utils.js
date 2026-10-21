// --- Kontrol Animasi Chart: Aktif HANYA saat pertama kali web dibuka (initial load), 
// setelah 2.5 detik otomatis dinonaktifkan agar ganti halaman / filter 100% instan dan bebas lag ---
let isInitialWebLoad = true;
if (typeof window !== 'undefined') {
  setTimeout(() => {
    isInitialWebLoad = false;
  }, 2500);
}

export const isInitialChartAnimationActive = () => isInitialWebLoad;

// --- Helper Function: Format ke Proper Case (Tiap awal kata kapital) ---
export const toProperCase = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

// --- Helper Function: Pencari Data Kendala Secara Global ---
export const extractKendalaData = (item) => {
  let issue = item.issueKendala || '';
  let reporter = item.reporterKendala || '';
  let date = item.tanggalKendala || '';

  for (const key in item) {
    const lk = String(key).toLowerCase();
    if (lk.includes('issue') && !issue) issue = item[key];
    if (lk.includes('reporter') && !reporter) reporter = item[key];
    if (lk.includes('tanggal') && lk.includes('kendala') && !date) date = item[key];
  }
  return { issue, reporter, date };
};

// --- Helper Function: Pencari Status Pelanggan Global ---
export const getGlobalStatusStr = (item) => {
  const valAktivasi = String(item.aktivasi || item.statusAktivasi || '').trim().toUpperCase();
  const valIkr = String(item.ikr || item.statusIkr || '').trim().toUpperCase();
  
  if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') return "DISMANTLED";
  if (valAktivasi === 'READY TO DISMANTLE' || valAktivasi === 'DISMANTLING') return "READY TO DISMANTLE";
  if (valAktivasi === 'SUSPEND') return "SUSPEND";

  // Status KENDALA mutlak hanya jika status aktivasi/ikr diset KENDALA
  if (valAktivasi === 'KENDALA' || valIkr === 'KENDALA' || valAktivasi.includes('KENDALA') || valIkr.includes('KENDALA')) return "KENDALA";

  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') return "AKTIF";
  
  if (valIkr === 'BELUM' || valAktivasi === 'BELUM' || valAktivasi === 'WAITING' || valAktivasi === '') return "WAITING";
  if (item.tahapPembangunan) return String(item.tahapPembangunan).toUpperCase();
  return "WAITING";
};

// --- Helper Function: Deteksi Informasi WO Dismantle (Perangkat Sedang Diambil) ---
export const getWoDismantleInfo = (item) => {
  if (!item) return null;
  const rawAkt = String(item.aktivasi || item.statusAktivasi || item.status_aktivasi || '').trim().toUpperCase();
  const r = String(item.reasonDismantle || item.reason_dismantle || '').trim();

  const hasWo = rawAkt === 'DISMANTLING' || r.includes('[WO DISMANTLE]') || r.includes('WO:');
  if (!hasWo) return null;

  let teknisi = '';
  const techMatch = r.match(/Teknisi:\s*([^|()]+)/i);
  if (techMatch && techMatch[1]) {
    teknisi = techMatch[1].trim();
  }

  let ticket = '';
  const ticketMatch = r.match(/Tiket:\s*([^|()]+)/i);
  if (ticketMatch && ticketMatch[1]) {
    ticket = ticketMatch[1].trim();
  }

  return {
    hasWo: true,
    teknisi: teknisi || item.petugasAktivasi || item.petugasIkr || 'Teknisi IKR',
    ticket: ticket,
    rawReason: r
  };
};

// --- Helper Function: Tentukan apakah PO masuk ke Segmen Percepatan atau Reguler ---
export const isPoPercepatan = (po) => {
  if (!po) return false;
  const seg = String(po.segmen || '').toLowerCase();
  const tahap = String(po.tahapPembangunan || po.tahap_pembangunan || '').toLowerCase();
  const jenis = String(po.jenisPo || po.jenis_po || '').toLowerCase();

  if (seg === 'percepatan' || tahap.includes('percepatan') || jenis === 'percepatan') return true;
  if (Number(po.hpPercepatan || po.hp_percepatan || 0) > 0 && Number(po.hpReguler || po.hp_reguler || 0) === 0) return true;
  return false;
};

// --- Helper Function: Tentukan apakah pelanggan masuk ke Segmen Percepatan atau Reguler ---
export const isPercepatanCustomer = (pelanggan, odpData = []) => {
  if (!pelanggan) return false;

  const tahapPel = String(pelanggan.tahapPembangunan || pelanggan.tahap_pembangunan || '').toLowerCase().trim();
  if (tahapPel.includes('percepatan')) return true;
  if (tahapPel.includes('reguler') || tahapPel.includes('tahap') || tahapPel.includes('512') || tahapPel.includes('kopin') || tahapPel.includes('cynet') || tahapPel.includes('duit') || tahapPel.includes('handover')) return false;

  const rawOdp = String(pelanggan.odpAktual || pelanggan.odp || pelanggan.kodeOdp || pelanggan.label || '').toUpperCase().trim();
  if (rawOdp.includes('PERCEPATAN')) return true;
  if (rawOdp.includes('REGULER')) return false;

  // Cek ODP Data jika tersedia
  if (odpData && odpData.length > 0) {
    const cleanRaw = rawOdp.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const matched = odpData.find(o => {
      const cLabel = String(o.label || o.nama_odp || o.namaOdp || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cKode = String(o.kodeOdp || o.kode_odp || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return (cLabel && cLabel === cleanRaw) || (cKode && cKode === cleanRaw);
    });

    if (matched) {
      const tahap = String(matched.tahapPembangunan || matched.tahap_pembangunan || '').toLowerCase();
      if (tahap.includes('percepatan')) return true;
      if (tahap.includes('reguler') || tahap.includes('tahap') || tahap.includes('512')) return false;
    }
  }

  // Pola spesifik stasiun
  const st = String(pelanggan.stasiun || '').toLowerCase().trim();
  if (st === 'alastua') return true; // Seluruh PO Alastua adalah Percepatan
  if (st === 'sulur' || st === 'weleri') return false; // Seluruh PO Sulur & Weleri adalah Reguler

  if (rawOdp.startsWith('W2_') || rawOdp.startsWith('W3_') || rawOdp.startsWith('W4_ATA')) return true;
  if (rawOdp.startsWith('W1_') || rawOdp.startsWith('W5_KLN')) return false;

  return false;
};

// --- Helper Function: Hitung TTR (Time To Resolve) ---
export const calculateTTR = (openTimeStr, closeTimeStr) => {
  if (!openTimeStr || !closeTimeStr) return null;

  const parseTime = (str) => {
    if (!str) return null;
    const s = String(str).trim();
    if (!s || s === '-') return null;

    const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10) - 1;
      const y = parseInt(dmyMatch[3], 10);
      const hh = parseInt(dmyMatch[4] || '0', 10);
      const mm = parseInt(dmyMatch[5] || '0', 10);
      const ss = parseInt(dmyMatch[6] || '0', 10);
      return new Date(y, m, d, hh, mm, ss).getTime();
    }

    const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10) - 1;
      const d = parseInt(ymdMatch[3], 10);
      const hh = parseInt(ymdMatch[4] || '0', 10);
      const mm = parseInt(ymdMatch[5] || '0', 10);
      const ss = parseInt(ymdMatch[6] || '0', 10);
      return new Date(y, m, d, hh, mm, ss).getTime();
    }

    const parsed = Date.parse(s);
    return isNaN(parsed) ? null : parsed;
  };

  const tOpen = parseTime(openTimeStr);
  const tClose = parseTime(closeTimeStr);

  if (!tOpen || !tClose || tClose < tOpen) return null;

  const diffMs = tClose - tOpen;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return `${diffDays}h ${remHours}j`;
  }
  if (diffHours > 0) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `${diffHours}j ${remMin}m` : `${diffHours} Jam`;
  }
  if (diffMin > 0) {
    return `${diffMin} Menit`;
  }
  return `${diffSec} Detik`;
};

// --- Helper Function: Ambil Tanggal Dismantle Pelanggan (WIB YYYY-MM-DD) ---
export const getCustomerDismantleDate = (item) => {
  if (!item) return '';
  const customDate = item.tanggalDismantle || item.tanggal_dismantle || item.tglDismantle || item.tgl_dismantle;
  if (customDate) {
    let cleaned = String(customDate).trim().split(/[T ]/)[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
    const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    return cleaned;
  }
  // Hanya kembalikan tanggal jika tanggal_dismantle memang ada di database.
  // JANGAN fallback ke updated_at/created_at agar data dismantle lama yang tanggalnya kosong tidak muncul di hari ini.
  return '';
};

// --- Helper Function: Standardize date to YYYY-MM-DD ---
export const standardizeDate = (dateStr) => {
  if (!dateStr) return '';
  let str = String(dateStr).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';

  // 1. Check ISO timestamp with timezone (T and Z or + offset)
  if (str.includes('T') && (str.endsWith('Z') || str.includes('+') || str.includes('-0') || str.includes('+0'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
      } catch (_e) {}
    }
  }

  // 2. Extract date part: split on comma, T, or space, and remove trailing punctuation
  let datePart = str.split(',')[0].trim().split(/[T ]/)[0].trim().replace(/[,;]+$/, '');

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy4 = datePart.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy4) {
    const day = dmy4[1].padStart(2, '0');
    const month = dmy4[2].padStart(2, '0');
    const year = dmy4[3];
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YY or DD-MM-YY or DD.MM.YY (2-digit year, e.g. 13-10-26 -> 2026-10-13)
  const dmy2 = datePart.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmy2) {
    const day = dmy2[1].padStart(2, '0');
    const month = dmy2[2].padStart(2, '0');
    const year = `20${dmy2[3]}`;
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd4 = datePart.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymd4) {
    const year = ymd4[1];
    const month = ymd4[2].padStart(2, '0');
    const day = ymd4[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback: try Date parsing
  try {
    const d = new Date(datePart);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
    }
  } catch (_e) {}

  return datePart;
};

// --- Helper Function: Format standardized date to DD-MM-YYYY ---
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const std = standardizeDate(dateStr);
  if (!std) return '';
  const parts = std.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return std;
};

// --- Helper Function: Konfigurasi Tombol & Tugas WO (Visit, Aktivasi, Dismantle) berdasarkan Status Pelanggan ---
export const getWoActionProps = (itemOrStatus) => {
  const s = typeof itemOrStatus === 'object' && itemOrStatus !== null
    ? getGlobalStatusStr(itemOrStatus)
    : String(itemOrStatus || '').toUpperCase().trim();

  if (s.includes('READY TO DISMANTLE') || s.includes('DISMANTL') || s.includes('SUSPEND')) {
    return {
      task: 'dismantle',
      icon: 'package-minus',
      title: 'Kirim WO Dismantle / Penarikan',
      btnClass: 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700'
    };
  }
  if (s.includes('WAITING') || s.includes('KENDALA') || s.includes('BELUM')) {
    return {
      task: 'aktivasi',
      icon: 'zap',
      title: 'Kirim WO Aktivasi / IKR',
      btnClass: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
    };
  }
  // Default: AKTIF / SUDAH / Gangguan
  return {
    task: 'visit',
    icon: 'wrench',
    title: 'Kirim WO Visit / Gangguan',
    btnClass: 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
  };
};
