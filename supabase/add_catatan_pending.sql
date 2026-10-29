-- ==============================================================================
-- MIGRASI DATABASE SUPABASE: Penambahan Kolom catatan_pending
-- ==============================================================================
-- Tujuan: 
-- 1. Menampung catatan update status PENDING secara terpisah dari issue_kendala
-- 2. Memindahkan isi issue_kendala ke catatan_pending untuk pelanggan PENDING
--    sehingga data menjadi bersih dan lurus (tidak lagi bercampur dengan kendala).
-- ==============================================================================

-- 1. Tambahkan kolom catatan_pending jika belum ada di tabel data_pelanggan
ALTER TABLE data_pelanggan 
ADD COLUMN IF NOT EXISTS catatan_pending TEXT;

-- 2. Migrasikan data pelanggan yang berstatus Pending dari issue_kendala ke catatan_pending
--    dan bersihkan (kosongkan) kolom issue_kendala agar tidak lagi berstatus kendala
UPDATE data_pelanggan
SET 
  catatan_pending = issue_kendala,
  issue_kendala = NULL
WHERE 
  (status_aktivasi ILIKE '%pending%' OR status_ikr ILIKE '%pending%')
  AND issue_kendala IS NOT NULL 
  AND issue_kendala != '';

-- 3. Verifikasi hasil migrasi
SELECT 
  id_pelanggan, 
  nama_pelanggan, 
  status_aktivasi, 
  catatan_pending, 
  issue_kendala
FROM data_pelanggan
WHERE status_aktivasi ILIKE '%pending%' OR status_ikr ILIKE '%pending%'
LIMIT 20;
