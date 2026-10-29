-- ==============================================================================
-- MIGRASI DATABASE SUPABASE: Penambahan Kolom wo_dismantle
-- ==============================================================================
-- Tujuan:
-- 1. Menyediakan kolom khusus 'wo_dismantle' untuk menampung data penugasan WO
--    Dismantle (informasi teknisi & tiket dismantle) agar terpisah dan tidak
--    bercampur/menimpa kolom 'reason_dismantle'.
-- 2. Memindahkan isi info WO dari reason_dismantle ke kolom wo_dismantle.
-- 3. Mengembalikan/membersihkan kolom 'reason_dismantle' agar murni hanya berisi
--    alasan pembongkaran pelanggan.
-- ==============================================================================

-- 1. Tambahkan kolom wo_dismantle pada tabel data_pelanggan jika belum ada
ALTER TABLE data_pelanggan 
ADD COLUMN IF NOT EXISTS wo_dismantle TEXT;

-- 2. Migrasikan data info WO dari reason_dismantle ke kolom wo_dismantle
--    dan bersihkan reason_dismantle yang selama ini tertimpa teks [WO DISMANTLE]
UPDATE data_pelanggan
SET 
  wo_dismantle = reason_dismantle,
  reason_dismantle = NULL
WHERE 
  reason_dismantle ILIKE '%[WO DISMANTLE]%';

-- 3. Verifikasi hasil migrasi
SELECT 
  id_pelanggan, 
  nama_pelanggan, 
  status_aktivasi, 
  wo_dismantle, 
  reason_dismantle
FROM data_pelanggan
WHERE wo_dismantle IS NOT NULL OR status_aktivasi ILIKE '%dismantl%'
LIMIT 20;
