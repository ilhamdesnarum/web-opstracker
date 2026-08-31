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
  const { issue, reporter } = extractKendalaData(item);

  const valAktivasi = String(item.aktivasi || '').trim().toUpperCase();
  const valIkr = String(item.ikr || '').trim().toUpperCase();
  
  if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') return "DISMANTLED";
  if (valAktivasi === 'READY TO DISMANTLE') return "READY TO DISMANTLE";
  if (valAktivasi === 'SUSPEND') return "SUSPEND";

  if (valAktivasi === 'KENDALA' || valIkr === 'KENDALA') return "KENDALA";

  if ((issue && String(issue).trim() !== "") || (reporter && String(reporter).trim() !== "")) {
    return "KENDALA";
  }

  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') return "AKTIF";
  
  if (valIkr === 'BELUM' && valAktivasi === 'BELUM') return "WAITING";
  if (item.tahapPembangunan) return String(item.tahapPembangunan).toUpperCase();
  return "UNKNOWN";
};
