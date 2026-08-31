-- =========================================================================
-- SETUP PENJADWALAN OTOMATIS SUPABASE CRON (SUSPEND & PARTNER SYNC)
-- =========================================================================
-- Jalankan query ini di: Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Aktifkan Extension pg_cron dan pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Hapus job lama jika ada (Aman)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-starlite-suspend-job') THEN
        PERFORM cron.unschedule('sync-starlite-suspend-job');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-starlite-partner-job') THEN
        PERFORM cron.unschedule('sync-starlite-partner-job');
    END IF;
END $$;

-- 3. JADWAL OTOMATIS: Tarik Data Suspend & Dismantle (Tiap 30 Menit)
-- Mengupdate pelanggan yang baru saja suspend, telat bayar, atau dismantle
SELECT cron.schedule(
    'sync-starlite-suspend-job',
    '*/30 * * * *', -- Setiap 30 menit
    $$
    SELECT net.http_post(
        url := 'https://jtmferyskpbnacluyafs.supabase.co/functions/v1/sync-partner',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw'
        ),
        body := jsonb_build_object(
            'statuses', jsonb_build_array('suspend', 'dismantle', 'ready-to-dismantle')
        )
    );
    $$
);

-- =========================================================================
-- CARA CEK LOG RESPONSE TERAKHIR:
-- =========================================================================
-- SELECT id, status_code, content, error_msg, created FROM net._http_response ORDER BY created DESC LIMIT 5;
