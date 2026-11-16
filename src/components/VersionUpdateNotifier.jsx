import React, { useState, useEffect, useCallback } from 'react';

/**
 * Hook untuk memonitor perubahan versi build aplikasi saat tab masih terbuka.
 */
export function useAutoUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState(null);

  const checkVersion = useCallback(async () => {
    try {
      // Ambil build time saat aplikasi ini dikompilasi
      const currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;
      if (!currentBuildTime) return;

      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data && data.buildTime && Number(data.buildTime) > currentBuildTime) {
        console.log('[AUTO-UPDATE] Versi baru terdeteksi di server:', data);
        setHasUpdate(true);
        setNewVersionInfo(data);
      }
    } catch {
      // Ignore network glitches silently
    }
  }, []);

  useEffect(() => {
    // Jangan polling saat development lokal vite
    if (import.meta.env.DEV) return;

    // 1. Cek pertama kali setelah 8 detik aplikasi terbuka
    const initialTimer = setTimeout(checkVersion, 8000);

    // 2. Cek berkala setiap 2 menit
    const intervalTimer = setInterval(checkVersion, 2 * 60 * 1000);

    // 3. Cek seketika saat user kembali membuka tab / memfokuskan jendela
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', checkVersion);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion]);

  const reloadApp = useCallback(() => {
    try {
      // Bersihkan cache data pelanggan lokal lama agar mengambil data 100% fresh
      const keysToClear = [
        'otas_pelanggan_cache_v13',
        'otas_pelanggan_cache_v14',
        'otas_pelanggan_cache_v9',
        'otas_pelanggan_cache_v10'
      ];
      keysToClear.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
    } catch {}
    window.location.reload();
  }, []);

  return { hasUpdate, newVersionInfo, reloadApp };
}

/**
 * Komponen Banner / Toast Notifikasi Pembaruan Versi Baru
 */
export function VersionUpdateNotifier({ isMobile = false }) {
  const { hasUpdate, reloadApp } = useAutoUpdate();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!hasUpdate || isDismissed) return null;

  if (isMobile) {
    return (
      <aside aria-label="Notifikasi Pembaruan" className="fixed top-2 inset-x-2 z-[9999] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-3 rounded-2xl shadow-2xl border border-blue-400/40 animate-in slide-in-from-top-3 duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">Versi Baru Tersedia! 🚀</p>
              <p className="text-[10.5px] text-blue-100 leading-tight">Sentuh untuk memuat pembaruan.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={reloadApp}
              className="bg-white text-blue-700 hover:bg-blue-50 active:scale-95 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition-all"
            >
              Perbarui
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-blue-200 hover:text-white p-1 rounded-lg text-sm leading-none ml-0.5"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Notifikasi Pembaruan" className="fixed bottom-5 right-5 z-[9999] max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400 shrink-0 mt-0.5">
          <svg className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Update Sistem Baru
            </span>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white text-xs px-1 rounded transition-colors"
              title="Tutup sementara"
            >
              ✕
            </button>
          </div>
          <p className="text-sm font-bold text-white mt-1">Versi baru OpsTracker dirilis!</p>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Perbarui sekarang untuk mendapatkan fitur terbaru dan sinkronisasi data yang diperbaiki.
          </p>
          <div className="flex items-center gap-2 mt-3 pt-1">
            <button
              onClick={reloadApp}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Perbarui Sekarang</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 transition-colors"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default VersionUpdateNotifier;
