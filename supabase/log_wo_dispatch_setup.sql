-- ==============================================================================
-- SKRIP SETUP TABEL LOG_WO_DISPATCH DI SUPABASE
-- Digunakan untuk monitoring penugasan harian WO Teknisi (Aktivasi, Dismantle, Visit)
-- tanpa mengotori kolom definitif / permanen di tabel master data_pelanggan.
-- ==============================================================================

-- 1. Buat Tabel log_wo_dispatch
CREATE TABLE IF NOT EXISTS public.log_wo_dispatch (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tanggal & Jenis Penugasan
    tanggal_wo DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe_wo VARCHAR(30) NOT NULL, -- 'AKTIVASI', 'DISMANTLE', 'VISIT'
    
    -- Identitas & Lokasi Pelanggan
    id_pelanggan VARCHAR(50) NOT NULL,
    nama_pelanggan VARCHAR(150),
    stasiun VARCHAR(100),
    alamat TEXT,
    nomor_hp VARCHAR(50),
    odp VARCHAR(100),
    port VARCHAR(30),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    sn_ont VARCHAR(100),
    
    -- Informasi Teknisi & Status WO
    petugas VARCHAR(100) NOT NULL, -- Nama atau username teknisi
    petugas_username VARCHAR(100), -- Username telegram teknisi (@username)
    status_wo VARCHAR(50) NOT NULL DEFAULT 'DISPATCHED', -- 'DISPATCHED', 'ON PROGRESS', 'DONE', 'KENDALA', 'CANCELLED'
    
    -- Catatan & Pelaporan Lapangan
    catatan TEXT,               -- Instruksi penugasan dari admin/dispatcher
    catatan_kendala TEXT,       -- Catatan jika ada kendala di lapangan
    alasan_dismantle VARCHAR(150), -- Khusus penugasan dismantle
    tindakan TEXT,              -- Perbaikan / tindakan yang dilakukan teknisi
    material TEXT,              -- Material yang digunakan (precon, dropcore, ont, dll)
    foto_evidence TEXT,         -- Link foto dokumentasi / bukti lapangan
    waktu_close TIMESTAMPTZ     -- Waktu saat tiket dinyatakan selesai
);

-- 2. Index untuk performa query monitoring harian & lookup pelanggan
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_tanggal ON public.log_wo_dispatch(tanggal_wo);
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_pelanggan ON public.log_wo_dispatch(id_pelanggan);
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_petugas ON public.log_wo_dispatch(petugas);
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_status ON public.log_wo_dispatch(status_wo);
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_stasiun ON public.log_wo_dispatch(stasiun);
CREATE INDEX IF NOT EXISTS idx_log_wo_dispatch_tipe ON public.log_wo_dispatch(tipe_wo);

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.log_wo_dispatch ENABLE ROW LEVEL SECURITY;

-- Izinkan Read untuk Anon / Authenticated (Web OpsTracker & Mobile)
CREATE POLICY "Allow anon select log_wo_dispatch" 
ON public.log_wo_dispatch FOR SELECT 
TO anon, authenticated 
USING (true);

-- Izinkan Insert untuk Anon / Authenticated (Saat kirim WO via tombol aksi cepat)
CREATE POLICY "Allow anon insert log_wo_dispatch" 
ON public.log_wo_dispatch FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Izinkan Update untuk Anon / Authenticated (Saat update status / closing WO)
CREATE POLICY "Allow anon update log_wo_dispatch" 
ON public.log_wo_dispatch FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Izinkan Delete untuk Anon / Authenticated (Jika tiket penugasan dibatalkan/dihapus)
CREATE POLICY "Allow anon delete log_wo_dispatch" 
ON public.log_wo_dispatch FOR DELETE 
TO anon, authenticated 
USING (true);

-- 4. Enable Supabase Realtime (Otomatis sinkron ke layar admin jika ada update status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.log_wo_dispatch;

-- 5. Trigger otomatis update updated_at saat baris diedit
CREATE OR REPLACE FUNCTION update_log_wo_dispatch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_wo_dispatch_updated_at ON public.log_wo_dispatch;
CREATE TRIGGER trigger_log_wo_dispatch_updated_at
BEFORE UPDATE ON public.log_wo_dispatch
FOR EACH ROW
EXECUTE FUNCTION update_log_wo_dispatch_updated_at();

-- ==============================================================================
-- SELESAI
-- Jalankan skrip ini di SQL Editor dashboard Supabase project Anda.
-- ==============================================================================
