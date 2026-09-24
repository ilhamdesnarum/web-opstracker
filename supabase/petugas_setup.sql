-- ==============================================================================
-- SKRIP SETUP TABEL PETUGAS DI SUPABASE
-- Digunakan untuk menyimpan data Master Teknisi / Petugas Lapangan & Status Piket
-- ==============================================================================

-- 1. Buat Tabel petugas
CREATE TABLE IF NOT EXISTS public.petugas (
    id BIGSERIAL PRIMARY KEY,
    chat_id VARCHAR(50),
    username VARCHAR(100),
    nama VARCHAR(150) NOT NULL,
    stasiun VARCHAR(100) DEFAULT '',
    jabatan VARCHAR(100) DEFAULT 'Teknisi',
    status VARCHAR(50) DEFAULT 'Active',
    akun_ikr VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index untuk performa pencarian & filter
CREATE INDEX IF NOT EXISTS idx_petugas_stasiun ON public.petugas(stasiun);
CREATE INDEX IF NOT EXISTS idx_petugas_username ON public.petugas(username);
CREATE INDEX IF NOT EXISTS idx_petugas_nama ON public.petugas(nama);

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.petugas ENABLE ROW LEVEL SECURITY;

-- Izinkan Read untuk Anon / Public (Web App & Mobile)
CREATE POLICY "Allow anon select petugas" 
ON public.petugas FOR SELECT 
TO anon, authenticated 
USING (true);

-- Izinkan Insert untuk Anon / Public
CREATE POLICY "Allow anon insert petugas" 
ON public.petugas FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Izinkan Update untuk Anon / Public
CREATE POLICY "Allow anon update petugas" 
ON public.petugas FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Izinkan Delete untuk Anon / Public
CREATE POLICY "Allow anon delete petugas" 
ON public.petugas FOR DELETE 
TO anon, authenticated 
USING (true);

-- 4. Enable Supabase Realtime untuk tabel petugas
ALTER PUBLICATION supabase_realtime ADD TABLE public.petugas;

-- 5. Trigger untuk otomatis update kolom updated_at saat data diedit
CREATE OR REPLACE FUNCTION update_petugas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_petugas_timestamp ON public.petugas;
CREATE TRIGGER trg_update_petugas_timestamp
BEFORE INSERT OR UPDATE ON public.petugas
FOR EACH ROW
EXECUTE FUNCTION update_petugas_updated_at();
