import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toProperCase, getGlobalStatusStr } from '../utils';
import MasterKmlModal from './MasterKmlModal';

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

// Helper hitung jarak garis lurus (Haversine formula dalam meter)
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Helper normalisasi nama ODP untuk pencocokan toleran
const cleanOdpStr = (str) => {
  if (!str) return '';
  let clean = String(str)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    .trim()
    .toUpperCase();
  clean = clean.replace(/_\s*(\d{1,2})\s*(_L\d+|_P\d+|_|$)/gi, (match, num, suffix) => {
    return '_' + num.padStart(3, '0') + suffix;
  });
  return clean;
};

// Komponen Checkbox Khusus Hierarki Folder (Mendukung state Indeterminate seperti Google Earth)
function FolderCheckbox({ state, onChange }) {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = state === 'partial';
    }
  }, [state]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={state === 'all'}
      onChange={onChange}
      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer shrink-0 accent-blue-600"
    />
  );
}

// Helper penentu ikon representatif per folder berdasarkan nama atau fitur
const getFolderIconInfo = (folder) => {
  const name = (folder.name || '').toLowerCase();
  if (name.includes('tiang') || name.includes('pole')) {
    return { icon: 'map-pin', color: 'text-amber-500', bg: 'bg-amber-50', label: 'Tiang' };
  }
  if (name.includes('odp')) {
    return { icon: 'box', color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'ODP' };
  }
  if (name.includes('odc')) {
    return { icon: 'database', color: 'text-blue-600', bg: 'bg-blue-50', label: 'ODC' };
  }
  if (name.includes('closure') || name.includes('joint') || name.includes('cj')) {
    return { icon: 'disc', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Closure' };
  }
  if (name.includes('line') || name.includes('kabel') || name.includes('cable') || name.includes('feeder') || name.includes('distribusi') || folder.hasLine) {
    return { icon: 'git-commit', color: 'text-rose-500', bg: 'bg-rose-50', label: 'Kabel/Jalur' };
  }
  if (name.includes('boundary') || name.includes('area') || name.includes('cluster') || name.includes('polygon') || folder.hasPolygon) {
    return { icon: 'square', color: 'text-teal-600', bg: 'bg-teal-50', label: 'Area/Batas' };
  }
  return { icon: folder.childIds?.length > 0 ? 'folder' : 'layers', color: 'text-blue-500', bg: 'bg-blue-50', label: 'Folder' };
};

export default function CustomerMapView({ data }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clusterGroupRef = useRef(null);
  const odpLayerRef = useRef(null);
  const dropcoreLineRef = useRef(null);
  const kmlLayerRef = useRef(null);

  // Status visualisasi: Default KOSONG (hemat memori & anti-lag)
  const [isLoaded, setIsLoaded] = useState(false);
  const [renderedCount, setRenderedCount] = useState(0);
  const [renderedStats, setRenderedStats] = useState({ aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 });
  const [activeKmlInfo, setActiveKmlInfo] = useState(null); // { fileName, count }
  const kmlFolderLayersMapRef = useRef(new Map());
  const [kmlFolders, setKmlFolders] = useState([]);
  const [hiddenFolderIds, setHiddenFolderIds] = useState(new Set());
  const [collapsedFolderIds, setCollapsedFolderIds] = useState(new Set());
  const [showKmlFolderPanel, setShowKmlFolderPanel] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');

  // State Filter
  const [filterStation, setFilterStation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSales, setFilterSales] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOdpLayer, setShowOdpLayer] = useState(false);
  const [showMasterKmlModal, setShowMasterKmlModal] = useState(false);

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

      let sales = (p.namaSales || p.nama_sales || p.sales || '').trim();
      if (sales === '-' || sales === 'Daftar Mandiri') sales = 'Daftar Mandiri';
      else if (!sales) sales = '-';
      const salesLabel = sales;
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

  // Map lookup data ODP untuk pencarian cepat (O(1)) saat render titik pelanggan
  const odpLookupMap = useMemo(() => {
    const map = new Map();
    (data?.odpData || []).forEach(o => {
      const keys = [
        o.kodeOdp,
        o.kode_odp,
        o.label,
        o.namaOdp
      ].filter(Boolean);

      keys.forEach(k => {
        const clean = cleanOdpStr(k);
        if (clean && !map.has(clean)) {
          map.set(clean, o);
        }
        const superClean = String(k).replace(/[_\.\-\s]/g, '').toUpperCase();
        if (superClean && !map.has(superClean)) {
          map.set(superClean, o);
        }
      });
    });
    return map;
  }, [data?.odpData]);

  // Handler interaksi global dari popup Leaflet
  useEffect(() => {
    window.focusOdpFromCustomerMap = (cLat, cLng, oLat, oLng, odpName) => {
      if (!mapInstance.current || !oLat || !oLng) return;

      // Nyalakan checkbox / layer ODP jika belum aktif
      setShowOdpLayer(true);

      // Gambar garis pandu dropcore (dashed line hijau) dari rumah pelanggan ke ODP
      if (dropcoreLineRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(dropcoreLineRef.current);
        dropcoreLineRef.current = null;
      }

      if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng) && window.L) {
        dropcoreLineRef.current = window.L.polyline([[cLat, cLng], [oLat, oLng]], {
          color: '#16a34a',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.9
        }).addTo(mapInstance.current);
      }

      // Fokuskan peta ke posisi ODP
      mapInstance.current.flyTo([oLat, oLng], 18, { duration: 1 });
    };

    return () => {
      delete window.focusOdpFromCustomerMap;
    };
  }, []);


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
    if (!filterStation) return;
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

      // Konten Popup Bersih & Rapi dengan Icon Supabase Storage & Detail ODP
      const idPel = p.idPelanggan || p.id_pelanggan || '-';
      const nama = p.namaPelanggan || p.nama_pelanggan || 'Tanpa Nama';
      const stasiun = toProperCase(p.stasiun || '-');
      let sales = (p.namaSales || p.nama_sales || p.sales || '').trim();
      if (sales === '-' || sales === 'Daftar Mandiri') sales = 'Daftar Mandiri';
      else if (!sales) sales = '-';
      const alamat = p.alamat || '-';
      const waLink = p.nomorHp ? `https://wa.me/62${String(p.nomorHp).replace(/^0+|^62/, '')}` : null;
      const gmapsLink = `https://maps.google.com/?q=${lat},${lng}`;

      // Ambil data ODP pelanggan
      const rawOdp = String(p.odpAktual || p.odp || p.kodeOdp || p.kode_odp || '').trim();
      const portOdp = String(p.portOdp || p.port_odp || '').trim();
      const precon = String(p.kabelPrecon || p.kabel_precon || '').trim();

      // Cari ODP induk di master odpData
      let matchedOdp = null;
      let distMeters = null;
      let oLat = null;
      let oLng = null;

      if (rawOdp) {
        matchedOdp = odpLookupMap.get(cleanOdpStr(rawOdp)) || 
                     odpLookupMap.get(rawOdp.toUpperCase()) ||
                     odpLookupMap.get(rawOdp.replace(/[_\.\-\s]/g, '').toUpperCase()) ||
                     null;

        if (matchedOdp) {
          const latParsed = parseFloat(String(matchedOdp.latitude || '').trim().replace(',', '.'));
          const lngParsed = parseFloat(String(matchedOdp.longitude || '').trim().replace(',', '.'));
          if (!isNaN(latParsed) && !isNaN(lngParsed) && latParsed !== 0 && lngParsed !== 0) {
            oLat = latParsed;
            oLng = lngParsed;
            distMeters = calculateDistanceMeters(lat, lng, oLat, oLng);
          }
        }
      }

      const odcKode = matchedOdp?.kodeOdc || matchedOdp?.kode_odc || p.odc || '';

      const popupHtml = `
        <div style="font-family: inherit; min-width: 240px; max-width: 300px; padding: 2px;">
          <!-- Header Status & Pelanggan -->
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

          <!-- Alamat -->
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.35; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #f1f5f9;">
            <div style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 600; margin-bottom: 1px;">Alamat</div>
            <div>${alamat}</div>
          </div>

          <!-- Detail ODP -->
          ${rawOdp ? `
            <div style="font-size: 11px; margin-bottom: 6px; line-height: 1.35; background: #f0fdf4; padding: 6px 8px; border-radius: 6px; border: 1px solid #bbf7d0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <div style="display: flex; align-items: center; gap: 4px; color: #166534; font-weight: 700; font-size: 9.5px; text-transform: uppercase;">
                  <svg style="width: 12px; height: 12px; color: #16a34a; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
                    <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
                    <line x1="6" x2="6.01" y1="6" y2="6"/>
                    <line x1="6" x2="6.01" y1="18" y2="18"/>
                  </svg>
                  <span>ODP</span>
                </div>
                ${portOdp ? `
                  <span style="background: #16a34a; color: #ffffff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px;">
                    PORT ${portOdp}
                  </span>
                ` : `
                  <span style="background: #dcfce7; color: #15803d; font-size: 8.5px; font-weight: 600; padding: 1px 4px; border-radius: 4px; border: 1px solid #86efac;">
                    Port -
                  </span>
                `}
              </div>

              <div style="font-weight: 700; font-size: 11px; color: #15803d; font-family: monospace; word-break: break-all;">
                ${rawOdp}
              </div>

              ${(odcKode || precon || distMeters !== null) ? `
                <div style="display: flex; flex-wrap: wrap; gap: 3px 8px; font-size: 9.5px; color: #166534; margin-top: 3px; border-top: 1px dashed #bbf7d0; padding-top: 3px;">
                  ${odcKode ? `<span>ODC: <strong>${odcKode}</strong></span>` : ''}
                  ${precon ? `<span>Precon: <strong>${precon}</strong></span>` : ''}
                  ${distMeters !== null ? `<span>Jarak: <strong>~${distMeters} m</strong></span>` : ''}
                </div>
              ` : ''}

              ${(oLat && oLng) ? `
                <button onclick="window.focusOdpFromCustomerMap(${lat}, ${lng}, ${oLat}, ${oLng}, '${rawOdp}')" style="margin-top: 5px; width: 100%; border: 1px solid #86efac; background: #ffffff; color: #15803d; border-radius: 4px; padding: 3px 6px; font-size: 9.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Tampilkan ODP dan garis tarikan ke ODP">
                  <span>📍 Sorot ODP di Peta</span>
                </button>
              ` : ''}
            </div>
          ` : `
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px; background: #f8fafc; padding: 5px 8px; border-radius: 6px; border: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; color: #64748b;">ODP:</span>
              <span style="color: #94a3b8; font-style: italic;">Belum Terpasang / Belum Ada Data</span>
            </div>
          `}

          <!-- Stasiun & Sales -->
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 8px;">
            <div>Stasiun: <strong style="color: #334155;">${stasiun}</strong></div>
            <div>Sales: <strong style="color: #334155;">${sales}</strong></div>
          </div>

          <!-- Tombol Aksi -->
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

      marker.bindPopup(popupHtml, { maxWidth: 310 });
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
    if (dropcoreLineRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(dropcoreLineRef.current);
      dropcoreLineRef.current = null;
    }
    if (kmlFolderLayersMapRef.current && mapInstance.current) {
      kmlFolderLayersMapRef.current.forEach(group => {
        if (mapInstance.current.hasLayer(group)) {
          mapInstance.current.removeLayer(group);
        }
        group.clearLayers();
      });
      kmlFolderLayersMapRef.current.clear();
    }
    if (mapInstance.current) {
      mapInstance.current.setView([-6.98, 110.42], 10);
    }
    setIsLoaded(false);
    setRenderedCount(0);
    setRenderedStats({ aktif: 0, kendala: 0, waiting: 0, suspend: 0, dismantle: 0 });
    setActiveKmlInfo(null);
    setKmlFolders([]);
    setHiddenFolderIds(new Set());
    setShowKmlFolderPanel(false);
  };

  // Helper: Ambil ID folder beserta seluruh anak-anaknya secara rekursif
  const getDescendantFolderIds = (folderId, folders) => {
    const result = [folderId];
    const foldersMap = new Map(folders.map(f => [f.id, f]));
    const queue = [folderId];

    while (queue.length > 0) {
      const curId = queue.shift();
      const folder = foldersMap.get(curId);
      if (folder && Array.isArray(folder.childIds)) {
        folder.childIds.forEach(childId => {
          result.push(childId);
          queue.push(childId);
        });
      }
    }
    return result;
  };

  // Handler: Gambar layer KML / KMZ ke atas Leaflet Map dengan pemisahan per Folder
  const handlePlotKmlToMap = ({ fileName, geojson, folders = [] }) => {
    if (!mapInstance.current || !window.L) return;

    // Bersihkan semua layer KML sebelumnya dari map
    if (kmlFolderLayersMapRef.current) {
      kmlFolderLayersMapRef.current.forEach(group => {
        if (mapInstance.current.hasLayer(group)) {
          mapInstance.current.removeLayer(group);
        }
        group.clearLayers();
      });
      kmlFolderLayersMapRef.current.clear();
    }

    try {
      // Inisialisasi featureGroup untuk setiap folder
      const layersMap = new Map();
      folders.forEach(f => {
        layersMap.set(f.id, window.L.featureGroup());
      });
      const fallbackGroup = window.L.featureGroup();
      layersMap.set('fallback', fallbackGroup);

      const allBounds = [];

      // Render setiap fitur ke dalam group foldernya masing-masing
      geojson.features.forEach(feature => {
        const folderId = feature.properties?._folderId || 'fallback';
        const targetGroup = layersMap.get(folderId) || fallbackGroup;

        const singleLayer = window.L.geoJSON(feature, {
          style: (feat) => {
            const props = feat.properties || {};
            const fillColor = props.fill || '#3b82f6';
            const strokeColor = props.stroke || props.fill || '#1d4ed8';
            const fillOpacity = props['fill-opacity'] !== undefined ? Number(props['fill-opacity']) : 0.25;
            const strokeWidth = props['stroke-width'] !== undefined ? Number(props['stroke-width']) : 2.5;

            return {
              color: strokeColor,
              weight: strokeWidth,
              opacity: 0.85,
              fillColor: fillColor,
              fillOpacity: fillOpacity
            };
          },
          pointToLayer: (feat, latlng) => {
            const props = feat.properties || {};
            let iconUrl = props.icon;

            if (iconUrl) {
              if (typeof iconUrl === 'string' && iconUrl.startsWith('http://maps.google.com/')) {
                iconUrl = iconUrl.replace('http://maps.google.com/', 'https://maps.google.com/');
              }

              const scale = Number(props['icon-scale']) || 1;
              const size = Math.round(18 * Math.max(0.6, Math.min(scale, 1.8)));
              const iconColor = props['icon-color'];
              const cacheKey = `kml_${iconUrl}_${size}_${iconColor || ''}`;

              const isGoogleShape = typeof iconUrl === 'string' && iconUrl.includes('/shapes/');
              const isPushpin = typeof iconUrl === 'string' && iconUrl.includes('pushpin');
              const iconAnchor = isPushpin ? [Math.round(size / 3), size] : [size / 2, size / 2];
              const popupAnchor = isPushpin ? [0, -size] : [0, -size / 2];

              if (!leafletIconCache.has(cacheKey)) {
                if (isGoogleShape && iconColor) {
                  leafletIconCache.set(
                    cacheKey,
                    window.L.divIcon({
                      className: '',
                      html: `<div style="width:${size}px;height:${size}px;background-color:${iconColor};-webkit-mask:url('${iconUrl}') no-repeat center / contain;mask:url('${iconUrl}') no-repeat center / contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"></div>`,
                      iconSize: [size, size],
                      iconAnchor: iconAnchor,
                      popupAnchor: popupAnchor
                    })
                  );
                } else {
                  leafletIconCache.set(
                    cacheKey,
                    window.L.icon({
                      iconUrl: iconUrl,
                      iconSize: [size, size],
                      iconAnchor: iconAnchor,
                      popupAnchor: popupAnchor,
                      className: 'kml-native-icon'
                    })
                  );
                }
              }

              return window.L.marker(latlng, {
                icon: leafletIconCache.get(cacheKey),
                title: props.name || ''
              });
            }

            return window.L.circleMarker(latlng, {
              radius: 5,
              fillColor: props.fill || '#2563eb',
              color: '#ffffff',
              weight: 1.5,
              opacity: 1,
              fillOpacity: 0.85
            });
          },
          onEachFeature: (feat, layer) => {
            const props = feat.properties || {};
            const name = props.name || props.Name || 'Fitur KML';
            const desc = props.description || '';
            const folderPath = props._folderPath || '';

            layer.bindPopup(`
              <div style="font-family: 'Inter', sans-serif; font-size: 11px; max-width: 270px; line-height: 1.4;">
                <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                  ${name}
                </div>
                ${folderPath ? `<div style="font-size: 9.5px; color: #3b82f6; margin-bottom: 4px;">📁 ${folderPath}</div>` : ''}
                ${desc ? `<div style="color: #475569; font-size: 10.5px; max-height: 140px; overflow-y: auto; word-break: break-word;">${desc}</div>` : ''}
              </div>
            `);
          }
        });

        targetGroup.addLayer(singleLayer);
      });

      // Tambahkan semua group folder ke peta & kumpulkan bounds
      layersMap.forEach(group => {
        if (group.getLayers().length > 0) {
          group.addTo(mapInstance.current);
          const b = group.getBounds();
          if (b && b.isValid()) {
            allBounds.push(b);
          }
        }
      });

      kmlFolderLayersMapRef.current = layersMap;

      // Auto fit kamera peta ke seluruh area KML
      if (allBounds.length > 0) {
        let unitedBounds = allBounds[0];
        for (let i = 1; i < allBounds.length; i++) {
          unitedBounds = unitedBounds.extend(allBounds[i]);
        }
        mapInstance.current.fitBounds(unitedBounds, { padding: [40, 40], maxZoom: 16 });
      }

      setActiveKmlInfo({
        fileName,
        count: geojson.features.length
      });
      setKmlFolders(folders);
      setHiddenFolderIds(new Set());
      setCollapsedFolderIds(new Set());
      // Buka panel struktur folder otomatis agar user langsung melihat daftar lapisannya
      setShowKmlFolderPanel(true);
    } catch (e) {
      console.error('Gagal mem-plot GeoJSON KML ke Leaflet:', e);
    }
  };

  // Handler: Hapus layer KML sepenuhnya dari peta
  const handleRemoveKmlLayer = () => {
    if (kmlFolderLayersMapRef.current && mapInstance.current) {
      kmlFolderLayersMapRef.current.forEach(group => {
        if (mapInstance.current.hasLayer(group)) {
          mapInstance.current.removeLayer(group);
        }
        group.clearLayers();
      });
      kmlFolderLayersMapRef.current.clear();
    }
    setActiveKmlInfo(null);
    setKmlFolders([]);
    setHiddenFolderIds(new Set());
    setCollapsedFolderIds(new Set());
    setShowKmlFolderPanel(false);
  };

  // Hitung status checkbox untuk setiap folder: 'all' (semua terlihat), 'none' (semua tersembunyi), 'partial' (sebagian)
  const getFolderCheckState = (folderId) => {
    const targetIds = getDescendantFolderIds(folderId, kmlFolders);
    const activeLeafIds = targetIds.filter(id => {
      const f = kmlFolders.find(x => x.id === id);
      return f && f.selfCount > 0;
    });

    const idsToCheck = activeLeafIds.length > 0 ? activeLeafIds : targetIds;
    const hiddenCount = idsToCheck.filter(id => hiddenFolderIds.has(id)).length;

    if (hiddenCount === 0) return 'all';
    if (hiddenCount === idsToCheck.length) return 'none';
    return 'partial';
  };

  // Handler: Toggle Hide/Unhide Folder spesifik beserta semua turunannya
  const handleToggleFolder = (folderId) => {
    if (!mapInstance.current || !kmlFolderLayersMapRef.current) return;

    const currentState = getFolderCheckState(folderId);
    const targetIds = getDescendantFolderIds(folderId, kmlFolders);

    setHiddenFolderIds(prev => {
      const next = new Set(prev);
      if (currentState === 'all' || currentState === 'partial') {
        // HIDE semua item di bawah folder ini
        targetIds.forEach(id => {
          next.add(id);
          const group = kmlFolderLayersMapRef.current?.get(id);
          if (group && mapInstance.current.hasLayer(group)) {
            mapInstance.current.removeLayer(group);
          }
        });
      } else {
        // UNHIDE / SHOW semua item di bawah folder ini
        targetIds.forEach(id => {
          next.delete(id);
          const group = kmlFolderLayersMapRef.current?.get(id);
          if (group && !mapInstance.current.hasLayer(group)) {
            group.addTo(mapInstance.current);
          }
        });
      }
      return next;
    });
  };

  // Handler: Centang Semua Folder (Show All)
  const handleShowAllFolders = () => {
    if (!mapInstance.current || !kmlFolderLayersMapRef.current) return;
    setHiddenFolderIds(new Set());
    kmlFolderLayersMapRef.current.forEach(group => {
      if (!mapInstance.current.hasLayer(group)) {
        group.addTo(mapInstance.current);
      }
    });
  };

  // Handler: Hapus Semua Centang Folder (Hide All)
  const handleHideAllFolders = () => {
    if (!mapInstance.current || !kmlFolderLayersMapRef.current) return;
    setHiddenFolderIds(new Set(kmlFolders.map(f => f.id)));
    kmlFolderLayersMapRef.current.forEach(group => {
      if (mapInstance.current.hasLayer(group)) {
        mapInstance.current.removeLayer(group);
      }
    });
  };

  // Handler: Buka/Tutup Subfolder (Expand/Collapse)
  const handleToggleCollapse = (folderId) => {
    setCollapsedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleExpandAll = () => setCollapsedFolderIds(new Set());
  const handleCollapseAll = () => {
    const parentIds = kmlFolders.filter(f => f.childIds?.length > 0).map(f => f.id);
    setCollapsedFolderIds(new Set(parentIds));
  };

  // Handler: Zoom & Fokuskan Kamera Peta ke batas area suatu folder
  const handleFocusFolder = (folderId) => {
    if (!mapInstance.current || !kmlFolderLayersMapRef.current || !window.L) return;
    const targetIds = getDescendantFolderIds(folderId, kmlFolders);
    let unitedBounds = null;

    targetIds.forEach(id => {
      const group = kmlFolderLayersMapRef.current?.get(id);
      if (group && group.getLayers().length > 0) {
        const b = group.getBounds();
        if (b && b.isValid()) {
          if (!unitedBounds) unitedBounds = window.L.latLngBounds(b.getSouthWest(), b.getNorthEast());
          else unitedBounds.extend(b);
        }
      }
    });

    if (unitedBounds && unitedBounds.isValid()) {
      mapInstance.current.fitBounds(unitedBounds, { padding: [50, 50], maxZoom: 18 });
    }
  };

  // Daftar folder yang ditampilkan pada Tree (mendukung collapse & search)
  const visibleFolderTree = useMemo(() => {
    if (folderSearchQuery.trim()) {
      const q = folderSearchQuery.toLowerCase().trim();
      return kmlFolders.filter(f => f.totalCount > 0 && (f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)));
    }

    const result = [];
    const hiddenDescendantIds = new Set();

    kmlFolders.forEach(folder => {
      if (folder.totalCount === 0 && folder.childIds.length === 0) return;
      if (hiddenDescendantIds.has(folder.id)) return;

      result.push(folder);

      if (collapsedFolderIds.has(folder.id)) {
        const descendants = getDescendantFolderIds(folder.id, kmlFolders);
        descendants.forEach(dId => {
          if (dId !== folder.id) hiddenDescendantIds.add(dId);
        });
      }
    });

    return result;
  }, [kmlFolders, folderSearchQuery, collapsedFolderIds]);

  // Hitung jumlah fitur KML yang saat ini sedang aktif / tampil
  const activeKmlFeatureCount = useMemo(() => {
    if (!kmlFolders.length) return 0;
    return kmlFolders.reduce((sum, f) => {
      if (!hiddenFolderIds.has(f.id)) {
        return sum + (f.selfCount || 0);
      }
      return sum;
    }, 0);
  }, [kmlFolders, hiddenFolderIds]);


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

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Tombol Pop-up Master KML */}
            <button
              onClick={() => setShowMasterKmlModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Kelola data & update file Master KML / KMZ"
            >
              <Icon name="layers" size={14} />
              <span>Master KML</span>
            </button>

            {/* Indikator Status Data Tampil dengan Icon Asli Supabase */}
            {isLoaded && renderedCount > 0 && (
              <>
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
              </>
            )}
          </div>
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
                const val = e.target.value;
                setFilterStation(val);
                setFilterSales(''); // Mengerucutkan: reset sales saat stasiun berubah
                if (!val) {
                  handleClearMap();
                }
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
              <option value="">-- Pilih Stasiun Dahulu --</option>
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
            {!filterStation ? (
              <button
                type="button"
                disabled
                title="Pilih Stasiun terlebih dahulu"
                className="flex-1 py-2 px-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80 select-none"
              >
                <Icon name="navigation" size={13} className="text-slate-400" />
                <span>Pilih Stasiun Dahulu</span>
              </button>
            ) : (
              <button
                onClick={handleLoadData}
                disabled={matchingData.length === 0}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer"
              >
                <Icon name="eye" size={14} />
                <span>Tampilkan di Peta ({matchingData.length.toLocaleString('id-ID')})</span>
              </button>
            )}

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
              {!filterStation ? (
                <>Silakan pilih stasiun pada filter di atas (total {totalWithCoords.toLocaleString('id-ID')} pelanggan berkoordinat).</>
              ) : (
                <>Estimasi data terpilih: <strong className="text-slate-800">{matchingData.length.toLocaleString('id-ID')}</strong> dari total {totalWithCoords.toLocaleString('id-ID')} pelanggan berkoordinat.</>
              )}
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

            {/* Tombol Buka Panel Folder KML (Google Earth Places Style) */}
            {activeKmlInfo && (
              <button
                onClick={() => setShowKmlFolderPanel(prev => !prev)}
                className={`flex items-center gap-2 select-none px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  showKmlFolderPanel
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                    : 'bg-blue-50 border-blue-200 text-blue-700 font-semibold hover:bg-blue-100'
                }`}
                title="Buka / tutup panel struktur folder KML seperti Google Earth"
              >
                <Icon name="folder" size={13} className={showKmlFolderPanel ? "text-white" : "text-blue-600"} />
                <span className="text-xs">
                  Folder KML ({kmlFolders.length - hiddenFolderIds.size}/{kmlFolders.length})
                </span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* AREA PETA LEAFLET */}
      <div className="flex-1 relative mx-3 mb-3 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
        <div ref={mapRef} className="w-full h-full" />

        {/* WIDGET FLOATING LAYER KML AKTIF */}
        {activeKmlInfo && (
          <div className="absolute top-3 left-14 z-[450] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-blue-200 flex items-center gap-3 animate-fade max-w-[calc(100%-80px)]">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <Icon name="map" size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-blue-600">
                  Layer KML Aktif
                </span>
              </div>
              <div className="text-xs font-black text-slate-800 truncate max-w-[180px] sm:max-w-[260px]" title={activeKmlInfo.fileName}>
                {activeKmlInfo.fileName}
              </div>
            </div>

            {/* Tombol Buka Panel Folder KML */}
            {kmlFolders.length > 0 && (
              <button
                onClick={() => setShowKmlFolderPanel(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                  showKmlFolderPanel
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/30'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                }`}
                title="Buka / tutup panel struktur layer folder KML seperti Google Earth"
              >
                <Icon name="folder" size={14} />
                <span>Folder Layer ({kmlFolders.filter(f => f.selfCount > 0 && !hiddenFolderIds.has(f.id)).length}/{kmlFolders.filter(f => f.selfCount > 0).length || kmlFolders.length})</span>
              </button>
            )}

            {/* Tombol Tutup / Hapus Layer KML */}
            <button
              onClick={handleRemoveKmlLayer}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer shrink-0"
              title="Tutup & Hapus Layer KML dari Peta"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        )}

        {/* PANEL FOLDER KML (GOOGLE EARTH PLACES STYLE DRAWER) */}
        {activeKmlInfo && showKmlFolderPanel && (
          <div className="absolute top-3 right-3 bottom-3 z-[600] w-84 sm:w-96 max-w-[calc(100%-24px)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200 flex flex-col overflow-hidden animate-modal">
            {/* Header Panel */}
            <div className="p-3.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                  <Icon name="folder" size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-800 truncate">Tempat & Lapisan KML</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md">
                      Google Earth
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5" title={activeKmlInfo.fileName}>
                    {activeKmlInfo.fileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKmlFolderPanel(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                title="Tutup Panel Layer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Search & Quick Controls */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/60 space-y-2 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  placeholder="Cari folder (Tiang, ODP, Line, dll)..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Icon name="search" size={13} />
                </div>
                {folderSearchQuery && (
                  <button 
                    onClick={() => setFolderSearchQuery('')} 
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Icon name="x" size={12} />
                  </button>
                )}
              </div>

              {/* Status Ringkasan & Tombol Aksi */}
              <div className="flex items-center justify-between gap-1 text-[10.5px]">
                <div className="text-slate-600 font-semibold truncate">
                  <span className="text-blue-600 font-bold">{activeKmlFeatureCount}</span> / {activeKmlInfo.count} fitur aktif
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleShowAllFolders}
                    className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-all cursor-pointer text-[10px]"
                    title="Centang semua folder"
                  >
                    Semua
                  </button>
                  <button
                    onClick={handleHideAllFolders}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold transition-all cursor-pointer text-[10px]"
                    title="Hapus centang semua folder"
                  >
                    Kosongkan
                  </button>
                  <button
                    onClick={handleExpandAll}
                    className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                    title="Buka semua folder (Expand All)"
                  >
                    <Icon name="maximize-2" size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Tree View Folder List (Hierarki Folders seperti Google Earth) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
              {visibleFolderTree.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ditemukan folder yang cocok.
                </div>
              ) : (
                visibleFolderTree.map(folder => {
                  const checkState = getFolderCheckState(folder.id);
                  const isCollapsed = collapsedFolderIds.has(folder.id);
                  const hasChildren = folder.childIds?.length > 0;
                  const indent = Math.min(folder.level, 5) * 14;
                  const iconInfo = getFolderIconInfo(folder);

                  return (
                    <div
                      key={folder.id}
                      className={`group flex items-center justify-between p-1.5 rounded-xl transition-all select-none hover:bg-blue-50/60 ${
                        checkState !== 'none' ? 'text-slate-800' : 'text-slate-400 opacity-60 bg-slate-50/40'
                      }`}
                      style={{ paddingLeft: `${indent + 6}px` }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {/* Tombol Chevron Expand/Collapse */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCollapse(folder.id)}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                            title={isCollapsed ? 'Buka folder' : 'Tutup folder'}
                          >
                            <Icon name={isCollapsed ? "chevron-right" : "chevron-down"} size={13} />
                          </button>
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}

                        {/* Checkbox Foldering Google Earth */}
                        <FolderCheckbox
                          state={checkState}
                          onChange={() => handleToggleFolder(folder.id)}
                        />

                        {/* Icon Folder / Tipe Layer */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${iconInfo.bg} ${iconInfo.color}`}>
                          <Icon name={hasChildren ? (isCollapsed ? "folder" : "folder-open") : iconInfo.icon} size={12} />
                        </div>

                        {/* Nama Folder */}
                        <span 
                          onClick={() => handleToggleFolder(folder.id)}
                          className="font-semibold text-xs truncate cursor-pointer hover:text-blue-600 transition-colors" 
                          title={`${folder.path} (${folder.totalCount} item)`}
                        >
                          {folder.name}
                        </span>
                      </div>

                      {/* Info Jumlah & Tombol Fokus Zoom */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          {folder.totalCount}
                        </span>

                        {/* Tombol Zoom / Fokus ke Bounds Folder */}
                        <button
                          type="button"
                          onClick={() => handleFocusFolder(folder.id)}
                          className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Fokuskan & zoom peta ke area folder ini"
                        >
                          <Icon name="crosshair" size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Panel */}
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] shrink-0">
              <span className="text-slate-400 text-[10px] ml-1">
                Tip: Centang/hapus centang untuk show/hide
              </span>
              <button
                onClick={() => setShowKmlFolderPanel(false)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY EMPTY STATE (KETIKA BELUM ADA DATA DITAMPILKAN & TIDAK ADA KML AKTIF) */}
        {!isLoaded && !activeKmlInfo && (
          <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-6 max-w-md text-center pointer-events-auto animate-fade">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <Icon name="map-pin" size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">
                {!filterStation ? 'Pilih Stasiun untuk Memulai' : 'Peta Pelanggan Siap Dimuat'}
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {!filterStation ? (
                  <>
                    Silakan <strong>pilih Stasiun</strong> pada panel filter di atas untuk menampilkan titik sebaran pelanggan pada area operasional yang diinginkan.
                  </>
                ) : (
                  <>
                    Stasiun <strong>{filterStation}</strong> terpilih ({matchingData.length.toLocaleString('id-ID')} pelanggan). Klik tombol di bawah untuk memuat titik pelanggan di peta.
                  </>
                )}
              </p>

              {filterStation ? (
                <button
                  onClick={handleLoadData}
                  disabled={matchingData.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="eye" size={14} />
                  <span>Tampilkan di Peta ({matchingData.length.toLocaleString('id-ID')} Pelanggan)</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
                  <Icon name="navigation" size={13} className="text-blue-500" />
                  <span>Pilih Stasiun pada filter di atas untuk memuat peta</span>
                </div>
              )}
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

      {/* MODAL MASTER KML */}
      <MasterKmlModal 
        isOpen={showMasterKmlModal} 
        onClose={() => setShowMasterKmlModal(false)} 
        onPlotToMap={handlePlotKmlToMap}
      />

    </div>
  );
}
