import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toProperCase, getGlobalStatusStr } from '../utils';

// Komponen Icon Vektor Lucide (Selaras dengan tema UI Starlite)
const Icon = ({ name, size = 16, className = "" }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (window.lucide && containerRef.current) {
      containerRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px;"></i>`;
      window.lucide.createIcons({ root: containerRef.current });
    }
  }, [name, size, className]);
  return <span ref={containerRef} style={{ display: 'contents' }} />;
};

const STATUS_COLORS = {
  AKTIF: {
    bg: '#10b981',
    border: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Aktif'
  },
  KENDALA: {
    bg: '#f43f5e',
    border: '#e11d48',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    label: 'Kendala'
  },
  WAITING: {
    bg: '#f59e0b',
    border: '#d97706',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Waiting'
  },
  SUSPEND: {
    bg: '#f97316',
    border: '#ea580c',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    label: 'Suspend'
  },
  DISMANTLE: {
    bg: '#64748b',
    border: '#475569',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    label: 'Dismantle'
  },
  DISMANTLED: {
    bg: '#64748b',
    border: '#475569',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    label: 'Dismantled'
  }
};

export default function CustomerMapView({ data }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clusterGroupRef = useRef(null);
  const odpLayerRef = useRef(null);

  // Status visualisasi: Default KOSONG (hemat memori & anti-lag)
  const [isLoaded, setIsLoaded] = useState(false);
  const [renderedCount, setRenderedCount] = useState(0);
  const [renderedStats, setRenderedStats] = useState({ aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 });

  // State Filter
  const [filterStation, setFilterStation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSales, setFilterSales] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOdpLayer, setShowOdpLayer] = useState(false);

  // Ambil daftar stasiun yang ada beserta hitungan pelanggan berkoordinat
  const { stationOptions, salesOptions, totalWithCoords } = useMemo(() => {
    const stCount = new Map();
    const slSet = new Set();
    let withCoords = 0;

    (data?.pelangganData || []).forEach(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      withCoords++;

      const st = toProperCase(p.stasiun || 'Tanpa Stasiun');
      stCount.set(st, (stCount.get(st) || 0) + 1);

      const sales = (p.namaSales || p.nama_sales || p.sales || '').trim();
      if (sales) slSet.add(sales);
    });

    const stations = Array.from(stCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const salesList = Array.from(slSet).sort((a, b) => a.localeCompare(b));

    return {
      stationOptions: stations,
      salesOptions: salesList,
      totalWithCoords: withCoords
    };
  }, [data?.pelangganData]);

  // Hitung jumlah data yang cocok secara realtime sebelum tombol "Tampilkan di Peta" ditekan
  const matchingData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const stFilter = filterStation.toLowerCase().trim();
    const stusFilter = filterStatus.toUpperCase().trim();
    const slFilter = filterSales.toLowerCase().trim();

    return (data?.pelangganData || []).filter(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;

      // Filter Stasiun
      if (stFilter) {
        const pSt = (p.stasiun || '').toLowerCase().trim();
        if (pSt !== stFilter && !pSt.includes(stFilter)) return false;
      }

      // Filter Status
      if (stusFilter) {
        const pStatus = getGlobalStatusStr(p);
        if (stusFilter === 'DISMANTLE') {
          if (!pStatus.includes('DISMANTLE')) return false;
        } else if (pStatus !== stusFilter) {
          return false;
        }
      }

      // Filter Sales
      if (slFilter) {
        const pSales = (p.namaSales || p.nama_sales || p.sales || '').toLowerCase().trim();
        if (pSales !== slFilter) return false;
      }

      // Filter Pencarian (ID Pelanggan, Nama, Alamat)
      if (q) {
        const idPel = String(p.idPelanggan || p.id_pelanggan || '').toLowerCase();
        const nama = String(p.namaPelanggan || p.nama_pelanggan || '').toLowerCase();
        const alamat = String(p.alamat || '').toLowerCase();
        if (!idPel.includes(q) && !nama.includes(q) && !alamat.includes(q)) return false;
      }

      return true;
    });
  }, [data?.pelangganData, filterStation, filterStatus, filterSales, searchQuery]);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (window.L && mapRef.current && !mapInstance.current) {
      const initialMap = window.L.map(mapRef.current, {
        preferCanvas: true,
        zoomControl: true
      }).setView([-6.98, 110.42], 10); // Center default Jawa Tengah / Semarang

      const googleStreets = window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      const googleHybrid = window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      const osmLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });

      googleStreets.addTo(initialMap);

      window.L.control.layers({
        "Peta Jalan (Google)": googleStreets,
        "Satelit / Hybrid": googleHybrid,
        "OpenStreetMap": osmLayer
      }, null, { position: 'topright' }).addTo(initialMap);

      mapInstance.current = initialMap;

      setTimeout(() => {
        if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Fungsi Eksekusi: Muat & Tampilkan Data Terpilih di Peta
  const handleLoadData = () => {
    if (!mapInstance.current || !window.L) return;

    // Bersihkan layer sebelumnya
    if (clusterGroupRef.current) {
      mapInstance.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current.clearLayers();
    }

    const items = matchingData;
    if (items.length === 0) {
      setIsLoaded(true);
      setRenderedCount(0);
      setRenderedStats({ aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 });
      return;
    }

    // Inisialisasi MarkerClusterGroup jika tersedia di window, fallback ke FeatureGroup
    let groupLayer;
    if (typeof window.L.markerClusterGroup === 'function') {
      groupLayer = window.L.markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 16,
        chunkedLoading: true
      });
    } else {
      groupLayer = window.L.featureGroup();
    }

    const stats = { aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 };
    const bounds = [];

    items.forEach(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const statusKey = getGlobalStatusStr(p);
      const conf = STATUS_COLORS[statusKey] || (statusKey.includes('DISMANTLE') ? STATUS_COLORS.DISMANTLE : STATUS_COLORS.WAITING);

      if (statusKey === 'AKTIF') stats.aktif++;
      else if (statusKey === 'KENDALA') stats.kendala++;
      else if (statusKey === 'WAITING') stats.waiting++;
      else if (statusKey === 'SUSPEND') stats.suspend++;
      else if (statusKey.includes('DISMANTLE')) stats.dismantle++;

      const marker = window.L.circleMarker([lat, lng], {
        radius: 6.5,
        fillColor: conf.bg,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.95
      });

      // Konten Popup Bersih & Rapi
      const idPel = p.idPelanggan || p.id_pelanggan || '-';
      const nama = p.namaPelanggan || p.nama_pelanggan || 'Tanpa Nama';
      const stasiun = toProperCase(p.stasiun || '-');
      const sales = p.namaSales || p.nama_sales || p.sales || 'Daftar Mandiri';
      const alamat = p.alamat || '-';
      const waLink = p.nomorHp ? `https://wa.me/62${String(p.nomorHp).replace(/^0+|^62/, '')}` : null;
      const gmapsLink = `https://maps.google.com/?q=${lat},${lng}`;

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; max-width: 280px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <div>
              <div style="font-weight: 700; font-size: 13px; color: #1e293b; line-height: 1.3;">${nama}</div>
              <div style="font-family: monospace; font-size: 11px; font-weight: 600; color: #64748b;">${idPel}</div>
            </div>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${conf.bg}15; color: ${conf.border}; border: 1px solid ${conf.border}40; white-space: nowrap;">
              ${conf.label}
            </span>
          </div>

          <div style="font-size: 11px; color: #475569; margin-bottom: 8px; line-height: 1.35; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #f1f5f9;">
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 600; margin-bottom: 1px;">Alamat</div>
            <div>${alamat}</div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 10px;">
            <div>Stasiun: <strong style="color: #334155;">${stasiun}</strong></div>
            <div>Sales: <strong style="color: #334155;">${sales}</strong></div>
          </div>

          <div style="display: flex; gap: 6px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noreferrer" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 8px; background: #10b981; color: white; border-radius: 6px; text-decoration: none; font-size: 10.5px; font-weight: 600;">
                WhatsApp
              </a>
            ` : ''}
            <a href="${gmapsLink}" target="_blank" rel="noreferrer" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 8px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-size: 10.5px; font-weight: 600;">
              Google Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      groupLayer.addLayer(marker);
    });

    groupLayer.addTo(mapInstance.current);
    clusterGroupRef.current = groupLayer;

    // Auto-fit kamera peta ke sebaran titik yang dimuat
    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    setIsLoaded(true);
    setRenderedCount(items.length);
    setRenderedStats(stats);
  };

  // Fungsi Bersihkan Peta (Bebaskan Memory & Kembalikan ke State Kosong)
  const handleClearMap = () => {
    if (clusterGroupRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current.clearLayers();
      clusterGroupRef.current = null;
    }
    if (mapInstance.current) {
      mapInstance.current.setView([-6.98, 110.42], 10);
    }
    setIsLoaded(false);
    setRenderedCount(0);
    setRenderedStats({ aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 });
  };

  // Toggle Layer ODP
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;

    if (showOdpLayer) {
      if (!odpLayerRef.current) {
        const odpGroup = window.L.featureGroup();
        (data?.odpData || []).forEach(odp => {
          const lat = parseFloat(String(odp.latitude || '').trim().replace(',', '.'));
          const lng = parseFloat(String(odp.longitude || '').trim().replace(',', '.'));
          if (isNaN(lat) || isNaN(lng)) return;

          const odpMarker = window.L.circleMarker([lat, lng], {
            radius: 4,
            fillColor: '#6366f1',
            color: '#ffffff',
            weight: 1,
            fillOpacity: 0.9
          });

          odpMarker.bindPopup(`
            <div style="font-size: 11px;">
              <strong style="color: #4f46e5;">ODP: ${odp.namaOdp || odp.idOdp || odp.label || '-'}</strong><br/>
              Stasiun: ${toProperCase(odp.stasiun || '-')}<br/>
              Kapasitas: ${odp.kapasitas || odp.totalPort || '-'} Port
            </div>
          `);

          odpGroup.addLayer(odpMarker);
        });
        odpLayerRef.current = odpGroup;
      }
      odpLayerRef.current.addTo(mapInstance.current);
    } else {
      if (odpLayerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(odpLayerRef.current);
      }
    }
  }, [showOdpLayer, data?.odpData]);

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden">
      
      {/* PANEL KONTROL & FILTER ATAS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 m-3 mb-2 shrink-0 z-20">
        
        {/* Baris 1: Header & KPI Mini saat Data Dimuat */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon name="map-pin" size={16} />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Visualisasi Sebaran Pelanggan</h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-9">Pilih kriteria filter di bawah lalu klik &quot;Tampilkan di Peta&quot; untuk memuat data secara presisi.</p>
          </div>

          {/* Indikator Status Data Tampil */}
          {isLoaded && renderedCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <Icon name="users" size={12} className="text-slate-500" />
                Tampil: <strong>{renderedCount.toLocaleString('id-ID')}</strong>
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Aktif: {renderedStats.aktif.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Kendala: {renderedStats.kendala.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Waiting: {renderedStats.waiting.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                Suspend: {renderedStats.suspend.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Dismantle: {renderedStats.dismantle.toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>

        {/* Baris 2: Kontrol Filter & Tombol Eksekusi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-3 items-center">
          
          {/* Dropdown Stasiun */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="navigation" size={13} />
            </div>
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Semua Stasiun ({stationOptions.reduce((a, c) => a + c.count, 0)})</option>
              {stationOptions.map(st => (
                <option key={st.name} value={st.name}>
                  {st.name} ({st.count})
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Status */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="activity" size={13} />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="KENDALA">Kendala</option>
              <option value="WAITING">Waiting</option>
              <option value="SUSPEND">Suspend</option>
              <option value="DISMANTLE">Dismantle / Dismantled</option>
            </select>
          </div>

          {/* Dropdown Sales */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="user" size={13} />
            </div>
            <select
              value={filterSales}
              onChange={(e) => setFilterSales(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Semua Sales</option>
              {salesOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Pencarian ID / Nama / Alamat */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={13} />
            </div>
            <input
              type="text"
              placeholder="Cari ID / Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Tombol Aksi: Tampilkan di Peta & Bersihkan */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <button
              onClick={handleLoadData}
              disabled={matchingData.length === 0}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
            >
              <Icon name="eye" size={14} />
              <span>Tampilkan di Peta ({matchingData.length})</span>
            </button>

            {isLoaded && (
              <button
                onClick={handleClearMap}
                title="Bersihkan layer marker dari memori"
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Icon name="trash-2" size={14} />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

        </div>

        {/* Baris 3: Status Ringan & Toggle ODP */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2.5 mt-2 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <Icon name="info" size={13} className="text-blue-500" />
            <span>
              Estimasi data terpilih: <strong className="text-slate-800">{matchingData.length.toLocaleString('id-ID')}</strong> dari total {totalWithCoords.toLocaleString('id-ID')} pelanggan berkoordinat.
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOdpLayer}
              onChange={(e) => setShowOdpLayer(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Icon name="layers" size={12} className="text-indigo-500" />
              Tampilkan Titik ODP
            </span>
          </label>
        </div>

      </div>

      {/* AREA PETA LEAFLET */}
      <div className="flex-1 relative mx-3 mb-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div ref={mapRef} className="w-full h-full" />

        {/* OVERLAY EMPTY STATE (KETIKA BELUM ADA DATA DITAMPILKAN) */}
        {!isLoaded && (
          <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-6 max-w-md text-center pointer-events-auto animate-fade">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <Icon name="map-pin" size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">Peta Pelanggan Siap Dimuat</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Tentukan kriteria Stasiun, Status, atau Sales pada panel di atas, lalu klik tombol <strong>&quot;Tampilkan di Peta&quot;</strong> untuk merender titik pelanggan secara ringan dan anti-lag.
              </p>
              <button
                onClick={handleLoadData}
                disabled={matchingData.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Icon name="eye" size={14} />
                <span>Tampilkan di Peta ({matchingData.length.toLocaleString('id-ID')} Pelanggan)</span>
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY HASIL NOL (KETIKA FILTER TIDAK MENEMUKAN DATA) */}
        {isLoaded && renderedCount === 0 && (
          <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-6 max-w-sm text-center pointer-events-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
                <Icon name="alert-triangle" size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Tidak Ditemukan Data</h3>
              <p className="text-xs text-slate-500 mb-3">
                Tidak ada data pelanggan yang sesuai dengan kombinasi filter yang Anda pilih saat ini.
              </p>
              <button
                onClick={handleClearMap}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Icon name="refresh-cw" size={12} />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
