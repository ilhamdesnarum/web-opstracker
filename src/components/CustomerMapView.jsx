import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toProperCase, getGlobalStatusStr } from '../utils';

// Komponen Icon Vektor Lucide
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

// --- ICON DARI SUPABASE STORAGE (PUBLIC BUCKET: kmz-viewer/icons/) ---
const ICON_BASE_URL = 'https://jtmferyskpbnacluyafs.supabase.co/storage/v1/object/public/kmz-viewer/icons/';

const STATUS_ICONS = {
  AKTIF: {
    iconUrl: `${ICON_BASE_URL}c_active.png`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#10b981',
    label: 'Aktif'
  },
  KENDALA: {
    iconUrl: `${ICON_BASE_URL}c_kendala.png`,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    color: '#f43f5e',
    label: 'Kendala'
  },
  WAITING: {
    iconUrl: `${ICON_BASE_URL}c_waiting.png`,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#f59e0b',
    label: 'Waiting'
  },
  SUSPEND: {
    iconUrl: `${ICON_BASE_URL}c_readytodismantle.png`,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
    label: 'Suspend'
  },
  'READY TO DISMANTLE': {
    iconUrl: `${ICON_BASE_URL}c_readytodismantle.png`,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
    label: 'Ready to Dismantle'
  },
  DISMANTLE: {
    iconUrl: `${ICON_BASE_URL}c_dismantled.png`,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    color: '#64748b',
    label: 'Dismantle'
  },
  DISMANTLED: {
    iconUrl: `${ICON_BASE_URL}c_dismantled.png`,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    color: '#64748b',
    label: 'Dismantled'
  }
};

// --- ICON ODP: SUPABASE FULL (OREN) & VECTOR IDLE (BIRU) ---
const ODP_FULL_ICON_URL = `${ICON_BASE_URL}iconODPFull.png`; // Icon oren dari Supabase untuk ODP Full
const ODP_IDLE_ICON_URL = '/iconODPIdle.svg'; // Icon biru vektor untuk ODP Idle / Tersedia

// Cache Singleton Leaflet Icons agar hemat memory
const leafletIconCache = new Map();

const getCustomerLeafletIcon = (statusKey) => {
  if (!window.L) return null;
  const conf = STATUS_ICONS[statusKey] || (statusKey.includes('DISMANTLE') ? STATUS_ICONS.DISMANTLED : STATUS_ICONS.WAITING);
  if (!leafletIconCache.has(conf.iconUrl)) {
    leafletIconCache.set(
      conf.iconUrl,
      window.L.icon({
        iconUrl: conf.iconUrl,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        className: 'customer-map-icon'
      })
    );
  }
  return leafletIconCache.get(conf.iconUrl);
};

const getOdpLeafletIcon = (isFull = false) => {
  if (!window.L) return null;
  const key = isFull ? 'odp_full' : 'odp_idle';
  const url = isFull ? ODP_FULL_ICON_URL : ODP_IDLE_ICON_URL;
  if (!leafletIconCache.has(key)) {
    leafletIconCache.set(
      key,
      window.L.icon({
        iconUrl: url,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
        className: 'odp-map-icon'
      })
    );
  }
  return leafletIconCache.get(key);
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
  const { stationOptions, totalWithCoords } = useMemo(() => {
    const stCount = new Map();
    let withCoords = 0;

    (data?.pelangganData || []).forEach(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      withCoords++;

      const st = toProperCase(p.stasiun || 'Tanpa Stasiun');
      stCount.set(st, (stCount.get(st) || 0) + 1);
    });

    const stations = Array.from(stCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      stationOptions: stations,
      totalWithCoords: withCoords
    };
  }, [data?.pelangganData]);

  // Filter Sales Mengerucut: Hanya menampilkan sales yang memiliki pelanggan di stasiun terpilih
  const salesOptions = useMemo(() => {
    const slCount = new Map();
    const stFilter = filterStation.toLowerCase().trim();

    (data?.pelangganData || []).forEach(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      // Saring berdasarkan stasiun yang sedang dipilih
      if (stFilter) {
        const pSt = (p.stasiun || '').toLowerCase().trim();
        if (pSt !== stFilter && !pSt.includes(stFilter)) return;
      }

      const sales = (p.namaSales || p.nama_sales || p.sales || '').trim();
      const salesLabel = sales || 'Daftar Mandiri';
      slCount.set(salesLabel, (slCount.get(salesLabel) || 0) + 1);
    });

    return Array.from(slCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'Daftar Mandiri') return 1;
        if (b.name === 'Daftar Mandiri') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [data?.pelangganData, filterStation]);

  // Saring ODP agar hanya mengikuti Stasiun yang dipilih (mencegah lag / beban memori)
  const filteredOdpList = useMemo(() => {
    if (!filterStation) return [];
    const stFilter = filterStation.toLowerCase().trim();

    return (data?.odpData || []).filter(odp => {
      const lat = parseFloat(String(odp.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(odp.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;

      const odpSt = (odp.stasiun || '').toLowerCase().trim();
      return odpSt === stFilter || odpSt.includes(stFilter) || stFilter.includes(odpSt);
    });
  }, [data?.odpData, filterStation]);

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
        if (slFilter === 'daftar mandiri') {
          if (pSales && pSales !== '-' && pSales !== 'daftar mandiri') return false;
        } else {
          if (pSales !== slFilter) return false;
        }
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
      }).setView([-6.98, 110.42], 10);

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

    // Gunakan FeatureGroup langsung tanpa clusterisasi (Helicopter / Scatter View murni)
    const groupLayer = window.L.featureGroup();

    const stats = { aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 };
    const bounds = [];

    items.forEach(p => {
      const lat = parseFloat(String(p.latitude || '').trim().replace(',', '.'));
      const lng = parseFloat(String(p.longitude || '').trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const statusKey = getGlobalStatusStr(p);
      const conf = STATUS_ICONS[statusKey] || (statusKey.includes('DISMANTLE') ? STATUS_ICONS.DISMANTLED : STATUS_ICONS.WAITING);

      if (statusKey === 'AKTIF') stats.aktif++;
      else if (statusKey === 'KENDALA') stats.kendala++;
      else if (statusKey === 'WAITING') stats.waiting++;
      else if (statusKey === 'SUSPEND') stats.suspend++;
      else if (statusKey.includes('DISMANTLE')) stats.dismantle++;

      const icon = getCustomerLeafletIcon(statusKey);
      const marker = window.L.marker([lat, lng], {
        icon: icon,
        title: `${p.namaPelanggan || p.nama_pelanggan || ''} (${conf.label})`
      });

      // Konten Popup Bersih & Rapi dengan Icon Supabase Storage
      const idPel = p.idPelanggan || p.id_pelanggan || '-';
      const nama = p.namaPelanggan || p.nama_pelanggan || 'Tanpa Nama';
      const stasiun = toProperCase(p.stasiun || '-');
      const sales = p.namaSales || p.nama_sales || p.sales || 'Daftar Mandiri';
      const alamat = p.alamat || '-';
      const waLink = p.nomorHp ? `https://wa.me/62${String(p.nomorHp).replace(/^0+|^62/, '')}` : null;
      const gmapsLink = `https://maps.google.com/?q=${lat},${lng}`;

      const popupHtml = `
        <div style="font-family: inherit; min-width: 230px; max-width: 290px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${conf.iconUrl}" style="width: 24px; height: 24px; object-fit: contain;" alt="${conf.label}" />
              <div>
                <div style="font-weight: 700; font-size: 13px; color: #1e293b; line-height: 1.2;">${nama}</div>
                <div style="font-family: monospace; font-size: 11px; font-weight: 600; color: #64748b;">${idPel}</div>
              </div>
            </div>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2.5px 7px; border-radius: 6px; background: ${conf.color}18; color: ${conf.color}; border: 1px solid ${conf.color}40; white-space: nowrap;">
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

  // Toggle Layer ODP Mengikuti Filter Stasiun & Status Kapasitas (Full = Oren, Idle = Biru)
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;

    // Bersihkan layer ODP sebelumnya saat filter stasiun atau toggle berubah
    if (odpLayerRef.current) {
      mapInstance.current.removeLayer(odpLayerRef.current);
      odpLayerRef.current = null;
    }

    if (showOdpLayer && filterStation && filteredOdpList.length > 0) {
      const odpGroup = window.L.featureGroup();

      filteredOdpList.forEach(odp => {
        const lat = parseFloat(String(odp.latitude || '').trim().replace(',', '.'));
        const lng = parseFloat(String(odp.longitude || '').trim().replace(',', '.'));
        if (isNaN(lat) || isNaN(lng)) return;

        const cap = Number(odp.kapasitas || odp.totalPort || 8) || 8;
        const used = Number(odp.portTerpakai ?? odp.port_terpakai ?? odp['Port Terpakai'] ?? 0) || 0;
        const statusStr = String(odp.status || '').toUpperCase();
        const isFull = statusStr === 'FULL' || (cap > 0 && used >= cap);

        const iconUrl = isFull ? ODP_FULL_ICON_URL : ODP_IDLE_ICON_URL;
        const statusColor = isFull ? '#ea580c' : '#0000ff';
        const statusBg = isFull ? '#fff7ed' : '#eff6ff';
        const statusBorder = isFull ? '#fdba74' : '#bfdbfe';
        const statusText = isFull ? 'PORT FULL' : 'TERSEDIA / IDLE';

        const odpMarker = window.L.marker([lat, lng], {
          icon: getOdpLeafletIcon(isFull)
        });

        odpMarker.bindPopup(`
          <div style="font-size: 11px; padding: 4px; min-width: 175px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <img src="${iconUrl}" style="width: 20px; height: 20px; object-fit: contain;" alt="ODP" />
                <strong style="color: #0f172a; font-size: 12px;">${odp.namaOdp || odp.idOdp || odp.label || '-'}</strong>
              </div>
              <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; white-space: nowrap;">
                ${statusText}
              </span>
            </div>
            <div style="color: #475569; margin-bottom: 2px;">Stasiun: <strong>${toProperCase(odp.stasiun || '-')}</strong></div>
            <div style="color: #475569;">Port Terpakai: <strong style="color: ${isFull ? '#ea580c' : '#0000ff'};">${used} / ${cap} Port</strong></div>
          </div>
        `);

        odpGroup.addLayer(odpMarker);
      });

      odpLayerRef.current = odpGroup;
      odpGroup.addTo(mapInstance.current);
    }
  }, [showOdpLayer, filterStation, filteredOdpList]);

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden">
      
      {/* STYLE CSS HOVER ICON AGAR SMOOTH DAN GPU-ACCELERATED */}
      <style>{`
        .customer-map-icon {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.22));
          cursor: pointer;
        }
        .customer-map-icon:hover {
          transform: scale(1.45);
          z-index: 9999 !important;
        }
        .odp-map-icon {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
          cursor: pointer;
        }
        .odp-map-icon:hover {
          transform: scale(1.45);
          z-index: 9999 !important;
        }
      `}</style>

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

          {/* Indikator Status Data Tampil dengan Icon Asli Supabase */}
          {isLoaded && renderedCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <Icon name="users" size={12} className="text-slate-500" />
                Tampil: <strong>{renderedCount.toLocaleString('id-ID')}</strong>
              </span>
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                <img src={STATUS_ICONS.AKTIF.iconUrl} className="w-3.5 h-3.5 object-contain" alt="" />
                Aktif: {renderedStats.aktif.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 inline-flex items-center gap-1.5">
                <img src={STATUS_ICONS.KENDALA.iconUrl} className="w-3.5 h-3.5 object-contain" alt="" />
                Kendala: {renderedStats.kendala.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                <img src={STATUS_ICONS.WAITING.iconUrl} className="w-3.5 h-3.5 object-contain" alt="" />
                Waiting: {renderedStats.waiting.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 inline-flex items-center gap-1.5">
                <img src={STATUS_ICONS.SUSPEND.iconUrl} className="w-3.5 h-3.5 object-contain" alt="" />
                Suspend: {renderedStats.suspend.toLocaleString('id-ID')}
              </span>
              <span className="text-[10.5px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1.5">
                <img src={STATUS_ICONS.DISMANTLED.iconUrl} className="w-3.5 h-3.5 object-contain" alt="" />
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
              onChange={(e) => {
                setFilterStation(e.target.value);
                setFilterSales(''); // Mengerucutkan: reset sales saat stasiun berubah
              }}
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

          {/* Dropdown Sales (Mengerucut berdasarkan Stasiun Terpilih) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="user" size={13} />
            </div>
            <select
              value={filterSales}
              onChange={(e) => setFilterSales(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">
                {filterStation ? `Semua Sales (${filterStation})` : 'Semua Sales'} ({salesOptions.reduce((a, c) => a + c.count, 0)})
              </option>
              {salesOptions.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </option>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2.5 mt-2 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <Icon name="info" size={13} className="text-blue-500" />
            <span>
              Estimasi data terpilih: <strong className="text-slate-800">{matchingData.length.toLocaleString('id-ID')}</strong> dari total {totalWithCoords.toLocaleString('id-ID')} pelanggan berkoordinat.
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Legend ODP Aktif */}
            {showOdpLayer && filterStation && (
              <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#0000ff' }}>
                  <img src={ODP_IDLE_ICON_URL} className="w-3.5 h-3.5 object-contain" alt="" />
                  Idle/Tersedia
                </span>
                <span className="inline-flex items-center gap-1 text-orange-700 font-semibold">
                  <img src={ODP_FULL_ICON_URL} className="w-3.5 h-3.5 object-contain" alt="" />
                  Full
                </span>
              </div>
            )}

            <label className={`flex items-center gap-2 select-none px-2.5 py-1 rounded-lg border transition-all ${
              !filterStation
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                : showOdpLayer
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold cursor-pointer'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'
            }`}>
              <input
                type="checkbox"
                disabled={!filterStation}
                checked={showOdpLayer && !!filterStation}
                onChange={(e) => setShowOdpLayer(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="text-xs font-medium flex items-center gap-1.5">
                <img src={ODP_IDLE_ICON_URL} className="w-3.5 h-3.5 object-contain" alt="" />
                {filterStation ? (
                  <>Titik ODP ({filteredOdpList.length})</>
                ) : (
                  <span title="Pilih stasiun di filter atas terlebih dahulu">Titik ODP (Pilih Stasiun Dahulu)</span>
                )}
              </span>
            </label>
          </div>
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
