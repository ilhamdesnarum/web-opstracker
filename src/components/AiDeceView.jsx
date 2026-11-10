import React, { useEffect } from 'react';

function AiDeceView() {
  const DESKTOP_WIDTH = 1200; // Lebar standar desktop

  useEffect(() => {
    // Aktifkan native pinch-to-zoom saat masuk ke halaman ini
    const metaViewport = document.querySelector('meta[name="viewport"]');
    let originalViewport = '';

    if (metaViewport) {
      originalViewport = metaViewport.getAttribute('content');
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }

    return () => {
      // Kembalikan ke pengaturan awal saat keluar
      if (metaViewport && originalViewport) {
        metaViewport.setAttribute('content', originalViewport);
      }
    };
  }, []);

  return (
    <div 
      className="w-full h-full bg-slate-50 flex flex-col relative animate-fade" 
    >
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <div 
          className="w-full h-full absolute inset-0 overflow-auto custom-scrollbar"
        >
          {/* Iframe minWidth 1200px agar di mobile bisa di-pan, tapi di desktop full width 100% */}
          <iframe
            src="https://ai-network-monitoring.starliteindonesia.com/app/customer-lookup"
            className="border-0 bg-white block"
            style={{
              width: '100%',
              minWidth: '1200px',
              height: '100%',
              minHeight: '100vh'
            }}
            title="AI.DECE Portal"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}

export default AiDeceView;