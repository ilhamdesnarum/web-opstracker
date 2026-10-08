-- ==============================================================================
-- SETUP STORAGE BUCKET & RLS POLICY UNTUK kmz-master DI SUPABASE
-- Bucket: kmz-master
-- Dashboard URL: https://supabase.com/dashboard/project/jtmferyskpbnacluyafs/storage/files/buckets/kmz-master
-- ==============================================================================

-- 1. Pastikan bucket 'kmz-master' berstatus PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kmz-master', 'kmz-master', true, 104857600) -- 100 MB
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- 2. Kebijakan RLS: SELECT (Bisa dilihat & didownload oleh siapapun)
DROP POLICY IF EXISTS "Allow anon select kmz-master" ON storage.objects;
CREATE POLICY "Allow anon select kmz-master"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'kmz-master');

-- 3. Kebijakan RLS: INSERT (Bisa upload file master KML/KMZ baru)
DROP POLICY IF EXISTS "Allow anon insert kmz-master" ON storage.objects;
CREATE POLICY "Allow anon insert kmz-master"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'kmz-master');

-- 4. Kebijakan RLS: UPDATE (Bisa timpa / perbarui file master yang sudah ada)
DROP POLICY IF EXISTS "Allow anon update kmz-master" ON storage.objects;
CREATE POLICY "Allow anon update kmz-master"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'kmz-master')
WITH CHECK (bucket_id = 'kmz-master');

-- 5. Kebijakan RLS: DELETE (Bisa hapus file master jika diperlukan)
DROP POLICY IF EXISTS "Allow anon delete kmz-master" ON storage.objects;
CREATE POLICY "Allow anon delete kmz-master"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'kmz-master');
