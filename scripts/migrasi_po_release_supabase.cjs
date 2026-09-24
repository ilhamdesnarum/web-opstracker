// ==============================================================================
// SCRIPT MIGRASI DATA PO RELEASE DARI GOOGLE SHEET KE SUPABASE (po_release)
// ==============================================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_SHEET_DASHBOARD_CSV_URL = "https://docs.google.com/spreadsheets/d/13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M/gviz/tq?tqx=out:csv&sheet=Dashboard";

function parseCsvLines(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) rows.push(currentRow);
  }
  return rows;
}

function parseNumber(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parsePercentage(val) {
  if (!val) return 0;
  if (typeof val === 'number') return parseFloat(val.toFixed(2));
  const cleaned = String(val).replace('%', '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

async function migratePoRelease() {
  console.log("⏳ Mengunduh data sheet Dashboard dari Google Sheets...");
  const res = await fetch(GOOGLE_SHEET_DASHBOARD_CSV_URL);
  if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  const csvText = await res.text();

  const rows = parseCsvLines(csvText);
  console.log(`📊 Total baris CSV terbaca: ${rows.length}`);

  // Cari baris header PO Release (biasanya di sekitar baris 15-16 yang berisi "No Po Release")
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (rowStr.includes('no po release') || (rowStr.includes('stasiun') && rowStr.includes('jenis po'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("❌ Header tabel 'No Po Release' tidak ditemukan di sheet.");
  }

  console.log(`📌 Header PO Release ditemukan pada baris ke-${headerIndex + 1}`);

  const payload = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const stasiun = String(r[1] || '').trim();
    const noPoRelease = String(r[2] || '').trim();

    if (!stasiun || !noPoRelease) continue;
    if (stasiun.toLowerCase() === 'total' || stasiun.toLowerCase() === 'stasiun') continue;

    const jenisPo = String(r[3] || 'Direct').trim();
    const tahapPembangunan = String(r[4] || '').trim();
    const segmen = String(r[5] || (tahapPembangunan.toLowerCase().includes('percepatan') ? 'Percepatan' : 'Reguler')).trim();

    const hpReg = parseNumber(r[6]);
    const hpPerc = parseNumber(r[7]);
    const totalAktivasi = parseNumber(r[8]);
    const hcAktif = parseNumber(r[9]);
    const suspend = parseNumber(r[10]);
    const readyToDismantle = parseNumber(r[11]);
    const dismantled = parseNumber(r[12]);
    const performa = parsePercentage(r[13]);

    payload.push({
      stasiun: stasiun,
      no_po_release: noPoRelease,
      jenis_po: jenisPo,
      tahap_pembangunan: tahapPembangunan,
      segmen: segmen,
      hp_reguler: hpReg,
      hp_percepatan: hpPerc,
      total_aktivasi_hc: totalAktivasi,
      hc_aktif: hcAktif,
      suspend: suspend,
      ready_to_dismantle: readyToDismantle,
      dismantled: dismantled,
      performa_hc: performa
    });
  }

  console.log(`✨ Berhasil memparsing ${payload.length} data PO Release.`);
  console.log("Contoh item pertama:", payload[0]);
  console.log("Contoh item terakhir:", payload[payload.length - 1]);

  console.log("🚀 Menyimpan data ke tabel 'po_release' di Supabase...");

  // Cek koneksi ke tabel po_release
  const { data: testCheck, error: testError } = await supabase.from('po_release').select('id').limit(1);
  if (testError) {
    if (testError.code === 'PGRST205') {
      console.error("\n❌ Tabel 'po_release' belum dibuat di Supabase!");
      console.error("👉 Silakan buka Supabase SQL Editor dan jalankan skrip di file: supabase/po_release_setup.sql terlebih dahulu.");
      return;
    }
    console.error("❌ Error cek tabel:", testError.message);
    return;
  }

  // Bersihkan data lama jika ada atau upsert
  console.log("🧹 Mengosongkan data lama di tabel po_release...");
  await supabase.from('po_release').delete().gte('id', 0);

  // Batch insert
  const { data: inserted, error: insertError } = await supabase.from('po_release').insert(payload);
  if (insertError) {
    console.error("❌ Gagal mengunggah ke Supabase:", insertError.message);
    return;
  }

  console.log(`🎉 BERHASIL! ${payload.length} PO Release telah tersimpan di Supabase.`);
}

migratePoRelease().catch(console.error);
