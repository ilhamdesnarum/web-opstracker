-- ==============================================================================
-- SKRIP SETUP TABEL PLOTTING TIM & CLUSTERS DI SUPABASE
-- Digunakan untuk menyimpan konfigurasi stasiun, team leader, tim teknisi, dan anggota
-- ==============================================================================

-- 1. Buat Tabel starlite_team_config
CREATE TABLE IF NOT EXISTS public.starlite_team_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current_clusters',
    clusters JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'admin'
);

-- 2. Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_starlite_team_config_id ON public.starlite_team_config(id);

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.starlite_team_config ENABLE ROW LEVEL SECURITY;

-- Izinkan Select untuk Anon & Authenticated
DROP POLICY IF EXISTS "Allow anon select starlite_team_config" ON public.starlite_team_config;
CREATE POLICY "Allow anon select starlite_team_config" 
ON public.starlite_team_config FOR SELECT 
TO anon, authenticated 
USING (true);

-- Izinkan Insert untuk Anon & Authenticated
DROP POLICY IF EXISTS "Allow anon insert starlite_team_config" ON public.starlite_team_config;
CREATE POLICY "Allow anon insert starlite_team_config" 
ON public.starlite_team_config FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Izinkan Update untuk Anon & Authenticated
DROP POLICY IF EXISTS "Allow anon update starlite_team_config" ON public.starlite_team_config;
CREATE POLICY "Allow anon update starlite_team_config" 
ON public.starlite_team_config FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 4. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.starlite_team_config;
