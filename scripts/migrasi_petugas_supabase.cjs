// ==============================================================================
// SCRIPT MIGRASI DATA PETUGAS / TEKNISI DARI GOOGLE SHEET KE SUPABASE (petugas)
// ==============================================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_SHEET_TEKNISI_CSV_URL = "https://docs.google.com/spreadsheets/d/13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M/gviz/tq?tqx=out:csv&sheet=List_Teknisi";

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

async function migratePetugas() {
  console.log("==============================================================");
  console.log("🚀 MEMULAI MIGRASI DATA PETUGAS KE SUPABASE");
  console.log("==============================================================");

  // 1. Cek apakah tabel petugas sudah ada di Supabase
  console.log("\n🔍 Memeriksa ketersediaan tabel 'petugas' di Supabase...");
  const { error: checkError } = await supabase.from('petugas').select('id').limit(1);

  if (checkError) {
    console.error("❌ Tabel 'petugas' belum ditemukan di Supabase!");
    console.error("👉 Silakan jalankan query di file: supabase/petugas_setup.sql");
    console.error("   di Supabase SQL Editor Anda terlebih dahulu.");
    process.exit(1);
  }
  console.log("✅ Tabel 'petugas' siap digunakan di Supabase.");

  // 2. Unduh CSV dari Google Sheet
  console.log("\n⏳ Mengunduh data sheet List_Teknisi dari Google Sheets...");
  const res = await fetch(GOOGLE_SHEET_TEKNISI_CSV_URL);
  if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  const csvText = await res.text();

  const rows = parseCsvLines(csvText);
  console.log(`📊 Total baris CSV terbaca: ${rows.length}`);

  if (rows.length < 2) {
    throw new Error("❌ Data sheet kosong atau tidak memiliki baris data.");
  }

  // 3. Parsing data petugas
  const petugasList = [];
  // Baris 0 adalah header: "CHAT ID","USERNAME","NAMA","STASIUN","JABATAN","STATUS","AKUN IKR"
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const chatId = String(r[0] || '').trim();
    let username = String(r[1] || '').trim();
    const nama = String(r[2] || '').trim();
    const stasiun = String(r[3] || '').trim();
    const jabatan = String(r[4] || 'Teknisi').trim();
    const status = String(r[5] || 'Active').trim();
    const akunIkr = String(r[6] || '').trim();

    // Validasi: baris harus memiliki minimal nama
    if (!nama || nama.toLowerCase() === 'nama' || nama === '-') continue;

    // Standarisasi username
    if (username && username !== '-' && !username.startsWith('@')) {
      username = '@' + username;
    }

    petugasList.push({
      chat_id: chatId || null,
      username: (username && username !== '-') ? username : null,
      nama: nama,
      stasiun: (stasiun && stasiun !== '-') ? stasiun : '',
      jabatan: (jabatan && jabatan !== '-') ? jabatan : 'Teknisi',
      status: status || 'Active',
      akun_ikr: akunIkr || null
    });
  }

  console.log(`✨ Terverifikasi ${petugasList.length} data petugas yang siap dimigrasi.`);

  // 4. Hapus data lama di tabel petugas jika ada (opsional fresh sync)
  console.log("\n🧹 Membersihkan tabel petugas di Supabase untuk fresh import...");
  const { error: delErr } = await supabase.from('petugas').delete().neq('id', 0);
  if (delErr) {
    console.warn("⚠️ Peringatan saat reset data:", delErr.message);
  }

  // 5. Masukkan data dalam batch
  console.log("\n📤 Mengunggah data petugas ke Supabase...");
  const BATCH_SIZE = 50;
  let insertedTotal = 0;

  for (let i = 0; i < petugasList.length; i += BATCH_SIZE) {
    const batch = petugasList.slice(i, i + BATCH_SIZE);
    const { data, error: insertError } = await supabase
      .from('petugas')
      .insert(batch)
      .select('id');

    if (insertError) {
      console.error(`❌ Gagal insert batch ${i} - ${i + batch.length}:`, insertError.message);
    } else {
      insertedTotal += (data ? data.length : batch.length);
      console.log(`   ✅ Berhasil mengunggah ${insertedTotal}/${petugasList.length} petugas...`);
    }
  }

  console.log("\n==============================================================");
  console.log(`🎉 MIGRASI SELESAI! ${insertedTotal} data petugas berhasil disimpan di Supabase.`);
  console.log("==============================================================");
}

migratePetugas().catch(err => {
  console.error("\n❌ Terjadi kesalahan fatal saat migrasi:", err);
  process.exit(1);
});
