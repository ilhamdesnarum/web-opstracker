// ==========================================================
// SCRIPT MIGRASI DATA VISIT KE SUPABASE (log_visit)
// Menarik seluruh data dari Google Sheet dan memasukkannya ke Supabase
// ==========================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_SHEET_VISIT_CSV_URL = "https://docs.google.com/spreadsheets/d/13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M/gviz/tq?tqx=out:csv&gid=263928205";

async function migrate() {
  console.log("⏳ Mengunduh data dari Google Sheet Visit_Log...");
  const response = await fetch(GOOGLE_SHEET_VISIT_CSV_URL);
  if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
  const csvText = await response.text();

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

  if (rows.length < 2) {
    console.log("❌ Tidak ada data yang ditemukan di sheet.");
    return;
  }

  console.log(`📊 Ditemukan ${rows.length - 1} baris data di sheet.`);

  const payload = rows.slice(1).map(cols => {
    const getVal = (idx) => cols[idx] ? String(cols[idx]).trim() : '';
    return {
      timestamp: getVal(0),
      id_pelanggan: getVal(1),
      nama_pelanggan: getVal(2),
      stasiun: getVal(3),
      keluhan: getVal(4),
      catatan: getVal(5),
      status_visit: getVal(6) || 'OPEN',
      odp: getVal(7),
      port: getVal(8),
      sn_ont: getVal(9),
      nomor_hp: getVal(10),
      latitude: getVal(11),
      longitude: getVal(12),
      penyebab: getVal(13),
      perbaikan: getVal(14),
      used_materials: getVal(15),
      petugas: getVal(16),
      evidence: getVal(17),
      waktu_close: getVal(18)
    };
  }).filter(v => v.id_pelanggan || v.nama_pelanggan || v.timestamp);

  console.log("🧹 Membersihkan data lama di tabel log_visit Supabase...");
  const { error: delError } = await supabase.from('log_visit').delete().gte('id', 0);
  if (delError) {
    console.warn("Peringatan saat membersihkan data lama:", delError.message);
  } else {
    console.log("✨ Tabel log_visit berhasil dibersihkan.");
  }

  console.log(`🚀 Mengunggah ${payload.length} tiket baru ke tabel log_visit di Supabase...`);

  // Batch insert per 100 rows
  const BATCH_SIZE = 100;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('log_visit').insert(batch);
    if (error) {
      console.error(`❌ Gagal upload batch ${i + 1} - ${i + batch.length}:`, error.message);
      return;
    }
    console.log(`✅ Berhasil upload batch ${i + 1} - ${i + batch.length}`);
  }

  console.log("🎉 SEMUA DATA VISIT BERHASIL DIMIGRASIKAN KE SUPABASE!");
}

migrate().catch(console.error);
