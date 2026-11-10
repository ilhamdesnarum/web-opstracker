import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { supabase } from '../supabaseClient';
import { fetchLiveCoverageBoundaries } from '../services/coverageService.js';
import staticBoundaries from '../data/coverageBoundaries.json';
import { toProperCase } from '../utils';

// Helper hitung selisih waktu
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now - d) / 1000));
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
};

// Format jam recorded_at ke format lokal WIB
const formatTimeWib = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
};

// Klasifikasi status keaktifan teknisi
const getActivityState = (dateStr) => {
  if (!dateStr) return { status: 'offline', label: 'Offline', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', isLive: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { status: 'offline', label: 'Offline', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', isLive: false };
  const diffMin = Math.floor((new Date() - d) / (1000 * 60));
  if (diffMin <= 15) return { status: 'online', label: 'Online', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', isLive: true };
  if (diffMin <= 60) return { status: 'idle', label: 'Standby', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', isLive: false };
  return { status: 'offline', label: 'Offline', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', isLive: false };
};

export default function PantauTimModal({
  isOpen = false,
  onClose,
  initialStation = 'Semua',
  teknisiList = []
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const coverageLayerRef = useRef(null);
  const teknisiLayerRef = useRef(null);
  const markersMapRef = useRef(new Map());

  // State Data
  const [locations, setLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [coverageData, setCoverageData] = useState(staticBoundaries || []);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(false);

  // Filter & Toggle
  const [selectedStation, setSelectedStation] = useState(initialStation || 'Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoverage, setShowCoverage] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTechId, setSelectedTechId] = useState(null);

  // Map Petugas Detail untuk enrichment kontak HP dan info tambahan
  const petugasDetailsMap = useMemo(() => {
    const map = new Map();
    (teknisiList || []).forEach(t => {
      if (t.id) map.set(t.id, t);
      const nameKey = String(t.full_name || t.nama || '').trim().toLowerCase();
      if (nameKey) map.set(nameKey, t);
      const nickKey = String(t.nick_name || '').trim().toLowerCase();
      if (nickKey) map.set(nickKey, t);
    });
    return map;
  }, [teknisiList]);

  // 1. Fetch Polygon Coverage
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const loadCoverage = async () => {
      setIsLoadingCoverage(true);
      try {
        const res = await fetchLiveCoverageBoundaries(false);
        if (isMounted && res && res.data && res.data.length > 0) {
          setCoverageData(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat live coverage boundaries:', err);
      } finally {
        if (isMounted) setIsLoadingCoverage(false);
      }
    };
    loadCoverage();
    return () => { isMounted = false; };
  }, [isOpen]);

  // 2. Fetch Lokasi Teknisi Terbaru dari tabel teknisi_locations
  const fetchTeknisiLocations = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('teknisi_locations')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching teknisi_locations:', error);
        return;
      }

      // Ambil ping terbaru per petugas_id (atau nama_petugas jika petugas_id kosong)
      // serta pertahankan riwayat baterai terakhir jika ping terbaru bernilai null
      const latestPerPetugas = new Map();
      const lastKnownBattery = new Map();

      (data || []).forEach(row => {
        const key = row.petugas_id || row.nama_petugas;
        if (!key) return;

        // Catat riwayat level baterai valid terakhir
        if (!lastKnownBattery.has(key) && row.battery_level !== null && row.battery_level !== undefined && row.battery_level >= 0) {
          lastKnownBattery.set(key, {
            battery_level: row.battery_level,
            is_charging: row.is_charging
          });
        }

        const lat = parseFloat(String(row.latitude || '').replace(',', '.'));
        const lng = parseFloat(String(row.longitude || '').replace(',', '.'));
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

        if (!latestPerPetugas.has(key)) {
          latestPerPetugas.set(key, { ...row, latitude: lat, longitude: lng });
        }
      });

      // Jika ping posisi terbaru belum memiliki data baterai (misal kirim dari browser), gunakan baterai terakhir yang valid
      latestPerPetugas.forEach((item, key) => {
        if ((item.battery_level === null || item.battery_level === undefined) && lastKnownBattery.has(key)) {
          const bat = lastKnownBattery.get(key);
          item.battery_level = bat.battery_level;
          item.is_charging = bat.is_charging;
        }
      });

      const uniqueList = Array.from(latestPerPetugas.values());
      setLocations(uniqueList);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Fetch locations error:', err);
    } finally {
      if (!isSilent) setIsLoadingLocations(false);
    }
  }, []);

  // Mount fetch & Realtime Subscription
  useEffect(() => {
    if (!isOpen) return;

    fetchTeknisiLocations(false);

    let channel = null;
    try {
      channel = supabase
        .channel('pantau-tim-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teknisi_locations' },
          (payload) => {
            if (payload && payload.new) {
              const row = payload.new;
              const lat = parseFloat(String(row.latitude || '').replace(',', '.'));
              const lng = parseFloat(String(row.longitude || '').replace(',', '.'));
              if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                setLocations(prev => {
                  const key = row.petugas_id || row.nama_petugas;
                  const existing = prev.find(p => (p.petugas_id || p.nama_petugas) === key);
                  const battery = (row.battery_level !== null && row.battery_level !== undefined)
                    ? row.battery_level
                    : (existing ? existing.battery_level : null);
                  const isCharging = (row.is_charging !== null && row.is_charging !== undefined)
                    ? row.is_charging
                    : (existing ? existing.is_charging : null);

                  const filtered = prev.filter(p => (p.petugas_id || p.nama_petugas) !== key);
                  return [{ ...row, latitude: lat, longitude: lng, battery_level: battery, is_charging: isCharging }, ...filtered];
                });
                setLastFetchTime(new Date());
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    const pollInterval = setInterval(() => {
      fetchTeknisiLocations(true);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [isOpen, fetchTeknisiLocations]);

  // Daftar Stasiun unik dari data yang ada
  const stationOptions = useMemo(() => {
    const set = new Set();
    locations.forEach(l => {
      if (l.stasiun) set.add(toProperCase(l.stasiun));
    });
    return ['Semua', ...Array.from(set).sort()];
  }, [locations]);

  // Filter list teknisi
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const stFilter = selectedStation.toLowerCase().trim();

    return locations.filter(item => {
      if (stFilter !== 'semua') {
        const itemSt = (item.stasiun || '').toLowerCase().trim();
        if (itemSt !== stFilter && !itemSt.includes(stFilter)) return false;
      }
      if (q) {
        const name = (item.nama_petugas || '').toLowerCase();
        const nick = (item.nick_name || '').toLowerCase();
        const st = (item.stasiun || '').toLowerCase();
        const role = (item.role || '').toLowerCase();
        if (!name.includes(q) && !nick.includes(q) && !st.includes(q) && !role.includes(q)) return false;
      }
      return true;
    });
  }, [locations, selectedStation, searchQuery]);

  // Ringkasan Keaktifan
  const summaryStats = useMemo(() => {
    let online = 0;
    let idle = 0;
    let offline = 0;
    filteredLocations.forEach(loc => {
      const act = getActivityState(loc.recorded_at || loc.created_at);
      if (act.status === 'online') online++;
      else if (act.status === 'idle') idle++;
      else offline++;
    });
    return { online, idle, offline, total: filteredLocations.length };
  }, [filteredLocations]);

  // Keyboard navigation: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 3. Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!isOpen || !mapRef.current || mapInstance.current) return;

    if (!window.L) {
      console.warn('Leaflet (window.L) belum siap di browser.');
      return;
    }

    const map = window.L.map(mapRef.current, {
      preferCanvas: true,
      zoomControl: false
    }).setView([-6.98, 110.42], 12);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

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

    googleStreets.addTo(map);

    window.L.control.layers({
      "Peta Jalan": googleStreets,
      "Satelit / Hybrid": googleHybrid,
      "OpenStreetMap": osmLayer
    }, null, { position: 'topright' }).addTo(map);

    mapInstance.current = map;

    coverageLayerRef.current = window.L.layerGroup().addTo(map);
    teknisiLayerRef.current = window.L.layerGroup().addTo(map);

    // Invalidate size beberapa kali di awal untuk memastikan peta me-render seluruh tiles
    const tInit1 = setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 100);
    const tInit2 = setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 350);

    // Pantau perubahan ukuran kontainer (misal: saat panel daftar tim dibuka/ditutup atau jendela resize)
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      clearTimeout(tInit1);
      clearTimeout(tInit2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isOpen]);

  // Efek invalidate size responsif saat panel daftar tim ditutup atau dibuka
  useEffect(() => {
    if (!mapInstance.current) return;
    const t1 = setTimeout(() => mapInstance.current?.invalidateSize(), 50);
    const t2 = setTimeout(() => mapInstance.current?.invalidateSize(), 200);
    const t3 = setTimeout(() => mapInstance.current?.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isSidebarOpen]);

  // 4. Render Polygon Coverage
  useEffect(() => {
    if (!mapInstance.current || !coverageLayerRef.current || !window.L) return;

    coverageLayerRef.current.clearLayers();

    if (!showCoverage) return;

    (coverageData || []).forEach(feat => {
      if (!feat.coordinates || feat.coordinates.length < 3) return;

      const polygon = window.L.polygon(feat.coordinates, {
        color: '#0284c7',
        weight: 1.8,
        fillColor: '#38bdf8',
        fillOpacity: 0.16,
        dashArray: '4, 4'
      });

      polygon.bindTooltip(
        `<div style="font-family:'Inter',sans-serif; font-size:11px; font-weight:700; color:#0f172a;">${feat.name}</div>`,
        { sticky: true, opacity: 0.9 }
      );

      polygon.bindPopup(`
        <div style="font-family:'Inter',sans-serif; padding:4px; min-width:180px;">
          <div style="font-size:9.5px; font-weight:700; color:#0284c7; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">
            Area Coverage
          </div>
          <strong style="font-size:12px; color:#0f172a; display:block; margin-bottom:2px;">${feat.name}</strong>
          ${feat.description ? `<p style="font-size:10px; color:#64748b; margin-bottom:4px; line-height:1.35;">${feat.description}</p>` : ''}
          <div style="display:flex; align-items:center; justify-content:space-between; gap:4px; margin-top:4px; pt-1; border-top:1px solid #f1f5f9;">
            <span style="font-size:9px; color:#0369a1; background:#e0f2fe; padding:2px 6px; border-radius:4px; font-weight:600;">
              ${feat.coordinates.length} Titik Koordinat
            </span>
            <span style="font-size:9px; color:#15803d; background:#dcfce7; padding:2px 6px; border-radius:4px; font-weight:700;">
              Aktif
            </span>
          </div>
        </div>
      `);

      polygon.on('mouseover', () => {
        polygon.setStyle({ fillOpacity: 0.35, weight: 2.5, color: '#0369a1' });
      });
      polygon.on('mouseout', () => {
        polygon.setStyle({ fillOpacity: 0.16, weight: 1.8, color: '#0284c7' });
      });

      coverageLayerRef.current.addLayer(polygon);
    });
  }, [showCoverage, coverageData]);

  // 5. Render Marker Posisi Teknisi
  useEffect(() => {
    if (!mapInstance.current || !teknisiLayerRef.current || !window.L) return;

    teknisiLayerRef.current.clearLayers();
    markersMapRef.current.clear();

    const bounds = [];

    filteredLocations.forEach(tech => {
      const lat = tech.latitude;
      const lng = tech.longitude;
      if (!lat || !lng) return;

      bounds.push([lat, lng]);

      const act = getActivityState(tech.recorded_at || tech.created_at);
      const isOnline = act.status === 'online';
      const isIdle = act.status === 'idle';

      const borderColor = isOnline ? '#10b981' : isIdle ? '#f59e0b' : '#64748b';
      const bgColor = isOnline ? '#059669' : isIdle ? '#d97706' : '#475569';
      const pulseHtml = isOnline ? `<div class="teknisi-pulse-ring" style="background-color: ${borderColor};"></div>` : '';

      const displayName = tech.nick_name || tech.nama_petugas || 'Teknisi';
      const initials = String(displayName).substring(0, 2).toUpperCase();

      const markerHtml = `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${pulseHtml}
          <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bgColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px; position: relative; z-index: 2;">
            ${initials}
          </div>
          <span style="position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: ${borderColor}; border: 1.5px solid #ffffff; z-index: 3;"></span>
          <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 2px; white-space: nowrap; background: #0f172a; color: #ffffff; font-size: 9.5px; font-weight: 700; padding: 1.5px 6px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.25); pointer-events: none; z-index: 10; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
            ${displayName}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'teknisi-leaflet-div-icon',
        html: markerHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22]
      });

      const marker = window.L.marker([lat, lng], {
        icon: customIcon,
        title: `${tech.nama_petugas || displayName} (${tech.stasiun || '-'})`
      });

      const pDetail = petugasDetailsMap.get(tech.petugas_id) ||
        petugasDetailsMap.get(String(tech.nama_petugas || '').toLowerCase()) ||
        petugasDetailsMap.get(String(tech.nick_name || '').toLowerCase()) || {};

      const phoneRaw = tech.kontak_hp || pDetail.kontak_hp || '';
      const cleanPhone = String(phoneRaw).replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/62${cleanPhone.replace(/^0+|^62/, '')}` : null;
      const gmapsLink = `https://maps.google.com/?q=${lat},${lng}`;

      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:240px; max-width:280px; padding:2px;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                ${tech.nama_petugas || displayName}
              </div>
              <div style="font-size: 10.5px; font-weight: 600; color: #64748b; margin-top: 2px;">
                ${tech.role || 'Teknisi FTTH'} • <strong style="color: #334155;">${tech.stasiun || '-'}</strong>
              </div>
            </div>
            <span style="font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 6px; background: ${isOnline ? '#dcfce7' : isIdle ? '#fef3c7' : '#f1f5f9'}; color: ${isOnline ? '#15803d' : isIdle ? '#b45309' : '#475569'}; border: 1px solid ${borderColor}40; white-space: nowrap;">
              ${act.label}
            </span>
          </div>

          <!-- Metrik Info GPS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: #f8fafc; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Update Terakhir</div>
              <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-top: 1px;">
                ${getTimeAgo(tech.recorded_at || tech.created_at)}
              </div>
              <div style="font-size: 8.5px; color: #94a3b8;">
                ${formatTimeWib(tech.recorded_at || tech.created_at)}
              </div>
            </div>

            <div style="background: #f8fafc; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: 700;">Akurasi GPS</div>
              <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-top: 1px;">
                ±${tech.accuracy ? Math.round(tech.accuracy) : '-'} Meter
              </div>
              <div style="font-size: 8.5px; color: #64748b;">
                Sinyal: ${tech.accuracy && tech.accuracy <= 25 ? 'Sangat Kuat' : tech.accuracy && tech.accuracy <= 100 ? 'Sedang' : 'Standar'}
              </div>
            </div>
          </div>

          <!-- Koordinat -->
          <div style="font-size: 9.5px; color: #64748b; font-family: monospace; background: #f1f5f9; padding: 4px 6px; border-radius: 6px; margin-bottom: 8px; text-align: center;">
            ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </div>

          <!-- Tombol Aksi -->
          <div style="display: flex; gap: 6px;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noreferrer" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #10b981; color: white; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: 700;">
                WhatsApp
              </a>
            ` : ''}
            <a href="${gmapsLink}" target="_blank" rel="noreferrer" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: 700;">
              Google Maps
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('click', () => {
        setSelectedTechId(tech.petugas_id || tech.nama_petugas);
      });

      teknisiLayerRef.current.addLayer(marker);
      markersMapRef.current.set(tech.petugas_id || tech.nama_petugas, marker);
    });

    if (bounds.length > 0 && mapInstance.current) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredLocations, petugasDetailsMap]);

  // Handler klik pada list teknisi: FlyTo dan Buka Popup
  const handleFocusTeknisi = (tech) => {
    if (!mapInstance.current || !tech.latitude || !tech.longitude) return;
    setSelectedTechId(tech.petugas_id || tech.nama_petugas);

    mapInstance.current.flyTo([tech.latitude, tech.longitude], 17, {
      duration: 1.2
    });

    const marker = markersMapRef.current.get(tech.petugas_id || tech.nama_petugas);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 600);
    }
  };

  // Handler fit all
  const handleFitAll = () => {
    if (!mapInstance.current || filteredLocations.length === 0) return;
    const bounds = filteredLocations
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude, l.longitude]);
    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 select-none font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 animate-fade"
        onClick={onClose}
      />

      {/* Main Modal Box: Clean Light House Style */}
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-7xl h-[92vh] relative z-10 flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER: CLEAN LIGHT HOUSE STYLE */}
        {/* ========================================================= */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">

          {/* Judul & Info Kiri */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="radar" size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Pantau Posisi Tim & Teknisi
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                  {summaryStats.total} Petugas Terpantau
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Monitoring posisi GPS terkini tim lapangan dan visualisasi polygon area coverage
              </p>
            </div>
          </div>

          {/* Quick Toolbar Kanan */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Stasiun */}
            <div className="relative">
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="pl-3 pr-7 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500"
              >
                {stationOptions.map(st => (
                  <option key={st} value={st}>
                    {st === 'Semua' ? 'Semua Stasiun' : st}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Polygon Coverage */}
            <button
              type="button"
              onClick={() => setShowCoverage(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-colors cursor-pointer ${showCoverage
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              title="Aktifkan atau nonaktifkan polygon coverage"
            >
              <Icon name="layers" size={14} className={showCoverage ? "text-blue-600" : "text-slate-400"} />
              <span className="hidden sm:inline">Coverage Polygon</span>
            </button>

            {/* Tombol Fit Peta */}
            <button
              onClick={handleFitAll}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pusatkan peta ke semua posisi petugas"
            >
              <Icon name="maximize-2" size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Fit Peta</span>
            </button>

            {/* Tombol Refresh Lokasi */}
            <button
              onClick={() => fetchTeknisiLocations(false)}
              disabled={isLoadingLocations}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Perbarui koordinat lokasi terbaru"
            >
              <Icon name="refresh-cw" size={15} className={isLoadingLocations ? "animate-spin text-blue-600" : ""} />
            </button>

            {/* Toggle Sidebar Daftar Tim */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className={`p-2 rounded-xl border shadow-2xs transition-colors cursor-pointer ${isSidebarOpen
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              title={isSidebarOpen ? "Sembunyikan panel daftar tim" : "Tampilkan panel daftar tim"}
            >
              <Icon name="users" size={15} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-0.5"
              title="Tutup Modal"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

        </div>

        {/* ========================================================= */}
        {/* MODAL BODY (MAP & SIDEBAR LIST) */}
        {/* ========================================================= */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* AREA PETA LEAFLET */}
          <div className="flex-1 h-full w-full relative">
            <div ref={mapRef} className="w-full h-full" />

            {/* Floating Legend Box (Kiri Bawah Peta) */}
            <div className="absolute bottom-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
              <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-md pointer-events-auto flex flex-col gap-2 text-xs text-slate-700">
                <span className="font-bold text-[10.5px] uppercase text-slate-400 tracking-wider">
                  Legenda Status
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">Online (&le;15 mnt): {summaryStats.online}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-semibold text-slate-800">Standby (15-60 mnt): {summaryStats.idle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span className="font-semibold text-slate-600">Offline: {summaryStats.offline}</span>
                </div>
                {showCoverage && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="w-3.5 h-2 rounded border border-sky-500 bg-sky-200"></span>
                    <span className="font-semibold text-sky-800">Area Coverage ({coverageData.length})</span>
                  </div>
                )}
              </div>

              {/* Timestamp status */}
              {lastFetchTime && (
                <div className="bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg shadow-sm border border-slate-800 w-fit">
                  Pembaruan: {lastFetchTime.toLocaleTimeString('id-ID')} WIB
                </div>
              )}
            </div>

            {/* Loading Indicator Overlay */}
            {(isLoadingLocations || isLoadingCoverage) && (
              <div className="absolute top-4 left-4 z-[400] bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 text-xs font-bold text-slate-700 pointer-events-none">
                <Icon name="refresh-cw" size={14} className="animate-spin text-blue-600" />
                <span>Memuat data lokasi & coverage...</span>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SIDEBAR DAFTAR TIM / PETUGAS */}
          {/* ========================================================= */}
          {isSidebarOpen && (
            <div className="w-80 sm:w-88 h-full bg-slate-50/60 border-l border-slate-200 flex flex-col shrink-0 shadow-sm z-10 transition-all">

              {/* Header Sidebar & Pencarian */}
              <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Icon name="users" size={15} className="text-blue-600" />
                    <span>Daftar Tim Lapangan</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                    {filteredLocations.length} Petugas
                  </span>
                </div>

                <div className="relative">
                  <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, nick, atau stasiun..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable List Card Petugas */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {filteredLocations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <Icon name="user-x" size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Tidak ada data posisi tim</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {locations.length === 0
                        ? 'Tabel teknisi_locations belum memiliki catatan koordinat.'
                        : 'Sesuaikan filter stasiun atau kata kunci pencarian.'}
                    </p>
                  </div>
                ) : (
                  filteredLocations.map((tech) => {
                    const techKey = tech.petugas_id || tech.nama_petugas;
                    const isSelected = selectedTechId === techKey;
                    const act = getActivityState(tech.recorded_at || tech.created_at);
                    const displayName = tech.nick_name || tech.nama_petugas || 'Teknisi';
                    const initials = String(displayName).substring(0, 2).toUpperCase();

                    const pDetail = petugasDetailsMap.get(tech.petugas_id) ||
                      petugasDetailsMap.get(String(tech.nama_petugas || '').toLowerCase()) || {};
                    const phoneRaw = tech.kontak_hp || pDetail.kontak_hp || '';
                    const cleanPhone = String(phoneRaw).replace(/\D/g, '');
                    const waLink = cleanPhone ? `https://wa.me/62${cleanPhone.replace(/^0+|^62/, '')}` : null;

                    return (
                      <div
                        key={tech.id || techKey}
                        onClick={() => handleFocusTeknisi(tech)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${isSelected
                            ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {/* Avatar & Info Utama */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 truncate" title={tech.nama_petugas}>
                                {tech.nama_petugas || displayName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                {tech.role || 'Teknisi FTTH'} • <strong className="text-slate-700 font-semibold">{tech.stasiun || '-'}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Badge Status Online */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${act.badgeClass}`}>
                            {act.label}
                          </span>
                        </div>

                        {/* Baris Bawah: Waktu Update, Akurasi, Tombol WhatsApp & Lihat */}
                        <div className="flex items-center justify-between text-[11px] pt-2.5 mt-2.5 border-t border-slate-100 text-slate-500">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600 truncate">
                              <Icon name="clock" size={11} className="text-slate-400 shrink-0" />
                              <span>{getTimeAgo(tech.recorded_at || tech.created_at)}</span>
                            </span>
                            {tech.accuracy && (
                              <span className="text-slate-400 font-medium text-[10px] shrink-0">
                                (±{Math.round(tech.accuracy)}m)
                              </span>
                            )}
                          </div>

                          {/* Tombol Aksi Cepat */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition-colors flex items-center gap-1 text-[10.5px]"
                                title="Chat WhatsApp Petugas"
                              >
                                <Icon name="phone" size={11} />
                                <span>WA</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleFocusTeknisi(tech)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer text-[10.5px]"
                              title="Sorot lokasi di peta"
                            >
                              <Icon name="navigation" size={11} />
                              <span>Lihat</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Sidebar Ringkasan */}
              <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Total: <strong className="text-slate-800">{filteredLocations.length}</strong> Teknisi</span>
                <span className="text-[11px] text-slate-400">Peta Realtime</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}