-- ==============================================================================
-- SKRIP SETUP TABEL PO_RELEASE DI SUPABASE
-- Digunakan untuk menyimpan data Detail PO Release dan Rekap Aktivasi Homeconnect
-- ==============================================================================

-- 1. Buat Tabel po_release
CREATE TABLE IF NOT EXISTS public.po_release (
    id BIGSERIAL PRIMARY KEY,
    stasiun VARCHAR(100) NOT NULL,
    no_po_release VARCHAR(150) NOT NULL,
    jenis_po VARCHAR(50) DEFAULT 'Direct',           -- 'Direct', 'Handover', dll
    tahap_pembangunan VARCHAR(100),                  -- e.g. 'Reguler 512', 'Percepatan 1632'
    segmen VARCHAR(50) DEFAULT 'Reguler',            -- 'Reguler' atau 'Percepatan'
    hp_reguler INTEGER DEFAULT 0,
    hp_percepatan INTEGER DEFAULT 0,
    hp_terbangun INTEGER GENERATED ALWAYS AS (hp_reguler + hp_percepatan) STORED,
    total_aktivasi_hc INTEGER DEFAULT 0,
    hc_aktif INTEGER DEFAULT 0,
    suspend INTEGER DEFAULT 0,
    ready_to_dismantle INTEGER DEFAULT 0,
    dismantled INTEGER DEFAULT 0,
    performa_hc NUMERIC(5, 2) DEFAULT 0,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_po_release_no UNIQUE (no_po_release, stasiun)
);

-- 2. Buat Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_po_release_stasiun ON public.po_release(stasiun);

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.po_release ENABLE ROW LEVEL SECURITY;

-- Izinkan Read untuk Anon / Public (Web App)
CREATE POLICY "Allow anon select po_release" 
ON public.po_release FOR SELECT 
TO anon, authenticated 
USING (true);

-- Izinkan Insert untuk Anon / Public (Web App)
CREATE POLICY "Allow anon insert po_release" 
ON public.po_release FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Izinkan Update untuk Anon / Public (Web App)
CREATE POLICY "Allow anon update po_release" 
ON public.po_release FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Izinkan Delete untuk Anon / Public (Web App)
CREATE POLICY "Allow anon delete po_release" 
ON public.po_release FOR DELETE 
TO anon, authenticated 
USING (true);

-- 4. Enable Supabase Realtime untuk tabel po_release
-- (Agar perubahan langsung muncul di layar semua user tanpa reload)
ALTER PUBLICATION supabase_realtime ADD TABLE public.po_release;

-- 5. Trigger untuk otomatis update kolom updated_at saat data diedit
CREATE OR REPLACE FUNCTION update_po_release_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Otomatis hitung performa_hc jika ada perubahan
    IF (NEW.hp_reguler + NEW.hp_percepatan) > 0 THEN
        NEW.performa_hc = ROUND(((NEW.total_aktivasi_hc::numeric / (NEW.hp_reguler + NEW.hp_percepatan)::numeric) * 100), 2);
    ELSE
        NEW.performa_hc = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_po_release_timestamp ON public.po_release;
CREATE TRIGGER trg_update_po_release_timestamp
BEFORE INSERT OR UPDATE ON public.po_release
FOR EACH ROW
EXECUTE FUNCTION update_po_release_updated_at();
