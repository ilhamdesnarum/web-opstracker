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
  if (valAktivasi === 'READY TO DISMANTLE') return "READY TO DISMANTLE";
  if (valAktivasi === 'SUSPEND') return "SUSPEND";

  // Status KENDALA mutlak hanya jika status aktivasi/ikr diset KENDALA
  if (valAktivasi === 'KENDALA' || valIkr === 'KENDALA' || valAktivasi.includes('KENDALA') || valIkr.includes('KENDALA')) return "KENDALA";

  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') return "AKTIF";
  
  if (valIkr === 'BELUM' || valAktivasi === 'BELUM' || valAktivasi === 'WAITING' || valAktivasi === '') return "WAITING";
  if (item.tahapPembangunan) return String(item.tahapPembangunan).toUpperCase();
  return "WAITING";
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
      const cLabel = String(o.label || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
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

