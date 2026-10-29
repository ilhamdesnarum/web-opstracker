// ==============================================================================
// SCRIPT SINKRONISASI & BACKFILL TANGGAL KENDALA DARI GOOGLE SHEET KE SUPABASE
// ==============================================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_SHEET_MASTER_CSV_URL = "https://docs.google.com/spreadsheets/d/13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M/gviz/tq?tqx=out:csv&sheet=Master_Database";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(cell.trim()); cell = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(x => x !== '')) rows.push(row);
      row = []; cell = '';
    } else { cell += c; }
  }
  if (cell || row.length > 0) { row.push(cell.trim()); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}

// Format date string dari Google Sheets ke format ISO UTC dengan timezone Asia/Jakarta (+07:00)
function parseSheetDateToIso(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s.toLowerCase().includes('belum') || s.toLowerCase().includes('tidak') || s === '-') return null;

  // Format DD/MM/YYYY HH:mm atau DD/MM/YYYY HH:mm:ss
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = parseInt(dmyMatch[4] || 0, 10);
    const min = parseInt(dmyMatch[5] || 0, 10);
    const sec = parseInt(dmyMatch[6] || 0, 10);
    // Asumsi waktu di sheet adalah WIB (UTC+7)
    const utcDate = new Date(Date.UTC(year, month, day, hour - 7, min, sec));
    return utcDate.toISOString();
  }

  // Format YYYY-MM-DD HH:mm:ss
  const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = parseInt(ymdMatch[4] || 0, 10);
    const min = parseInt(ymdMatch[5] || 0, 10);
    const sec = parseInt(ymdMatch[6] || 0, 10);
    const utcDate = new Date(Date.UTC(year, month, day, hour - 7, min, sec));
    return utcDate.toISOString();
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

async function runBackfill() {
  console.log("==========================================================================");
  console.log("🚀 MEMULAI BACKFILL TANGGAL KENDALA DARI GOOGLE SHEET KE SUPABASE");
  console.log("==========================================================================");

  console.log("⏳ Mengunduh sheet Master_Database dari Google Sheets...");
  const res = await fetch(GOOGLE_SHEET_MASTER_CSV_URL);
  if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  const csvText = await res.text();

  const rows = parseCsv(csvText);
  console.log(`📊 Total baris CSV terbaca: ${rows.length}`);
  if (rows.length < 2) throw new Error("CSV sheet kosong.");

  const headers = rows[0];
  const idxId = headers.indexOf('ID PELANGGAN');
  const idxNama = headers.indexOf('NAMA PELANGGAN');
  const idxStasiun = headers.indexOf('STASIUN');
  const idxTglKendala = headers.indexOf('TANGGAL KENDALA');
  const idxIssue = headers.indexOf('ISSUE/KENDALA');
  const idxReporter = headers.indexOf('REPORTER KENDALA');

  console.log(`📌 Posisi Kolom:`);
  console.log(`   - ID PELANGGAN: Kolom ${idxId}`);
  console.log(`   - TANGGAL KENDALA: Kolom ${idxTglKendala}`);
  console.log(`   - ISSUE/KENDALA: Kolom ${idxIssue}`);
  console.log(`   - REPORTER KENDALA: Kolom ${idxReporter}`);

  // Kumpulkan semua data kendala dari sheet
  const kendalaToSync = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const id = String(r[idxId] || '').trim();
    if (!id) continue;

    const rawTgl = String(r[idxTglKendala] || '').trim();
    const issue = String(r[idxIssue] || '').trim();
    const reporter = String(r[idxReporter] || '').trim();

    // Jika memiliki tanggal kendala atau issue
    if (rawTgl || issue || reporter) {
      const isoDate = parseSheetDateToIso(rawTgl);
      kendalaToSync.set(id, {
        id,
        nama: r[idxNama],
        stasiun: r[idxStasiun],
        rawTgl,
        isoDate,
        issue: issue || null,
        reporter: reporter || null
      });
    }
  }

  console.log(`\n📋 Ditemukan ${kendalaToSync.size} pelanggan dengan info kendala di Google Sheet.`);
  const withValidDate = Array.from(kendalaToSync.values()).filter(x => x.isoDate);
  console.log(`   - Dengan Tanggal Kendala valid: ${withValidDate.length}`);

  // Ambil data pelanggan terkait dari Supabase
  const allIds = Array.from(kendalaToSync.keys());
  console.log(`\n🔍 Memeriksa status saat ini di Supabase untuk ${allIds.length} pelanggan...`);

  let toUpdateList = [];
  const BATCH_QUERY_SIZE = 100;

  for (let i = 0; i < allIds.length; i += BATCH_QUERY_SIZE) {
    const chunkIds = allIds.slice(i, i + BATCH_QUERY_SIZE);
    const { data, error } = await supabase
      .from('data_pelanggan')
      .select('id_pelanggan, nama_pelanggan, tanggal_kendala, issue_kendala, reporter_kendala, status_ikr, status_aktivasi')
      .in('id_pelanggan', chunkIds);

    if (error) {
      console.error(`❌ Gagal query batch ke Supabase:`, error.message);
      continue;
    }

    const sbMap = new Map((data || []).map(x => [x.id_pelanggan, x]));

    for (const id of chunkIds) {
      const sheetData = kendalaToSync.get(id);
      const sbData = sbMap.get(id);

      if (!sbData) continue; // Pelanggan tidak ada di Supabase

      const updatePayload = {};
      let needsUpdate = false;

      // 1. Update tanggal_kendala jika di Supabase kosong dan di Sheet ada tanggal valid
      if (sheetData.isoDate && (!sbData.tanggal_kendala || sbData.tanggal_kendala.trim() === '')) {
        updatePayload.tanggal_kendala = sheetData.isoDate;
        needsUpdate = true;
      }

      // 2. Update issue_kendala jika di Supabase kosong dan di Sheet ada
      if (sheetData.issue && (!sbData.issue_kendala || sbData.issue_kendala.trim() === '')) {
        updatePayload.issue_kendala = sheetData.issue;
        needsUpdate = true;
      }

      // 3. Update reporter_kendala jika di Supabase kosong dan di Sheet ada
      if (sheetData.reporter && (!sbData.reporter_kendala || sbData.reporter_kendala.trim() === '')) {
        updatePayload.reporter_kendala = sheetData.reporter;
        needsUpdate = true;
      }

      if (needsUpdate) {
        toUpdateList.push({ id, nama: sbData.nama_pelanggan, payload: updatePayload });
      }
    }
  }

  console.log(`\n⚡ Total pelanggan yang perlu di-update di Supabase: ${toUpdateList.length}`);
  if (toUpdateList.length > 0) {
    console.log("Sampel update pertama (5 entri):", JSON.stringify(toUpdateList.slice(0, 5), null, 2));
  }

  // Eksekusi update per record ke Supabase
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toUpdateList.length; i++) {
    const item = toUpdateList[i];
    try {
      const { error } = await supabase
        .from('data_pelanggan')
        .update(item.payload)
        .eq('id_pelanggan', item.id);

      if (error) {
        failCount++;
        console.error(`❌ [${item.id}] Gagal update:`, error.message);
      } else {
        successCount++;
      }
    } catch (err) {
      failCount++;
      console.error(`❌ [${item.id}] Exception:`, err.message);
    }

    if ((i + 1) % 50 === 0 || i === toUpdateList.length - 1) {
      console.log(`   ⏳ Progres: ${i + 1} / ${toUpdateList.length} (Sukses: ${successCount}, Gagal: ${failCount})`);
    }
  }

  console.log("\n==========================================================================");
  console.log(`🎉 BACKFILL SELESAI:`);
  console.log(`   - Berhasil di-update: ${successCount}`);
  console.log(`   - Gagal di-update   : ${failCount}`);
  console.log("==========================================================================");
}

runBackfill().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
