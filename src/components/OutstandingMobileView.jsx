import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Icon = ({ name, size = 20, className = "" }) => {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) {
    const PascalName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const FallbackIcon = LucideIcons[PascalName];
    if (FallbackIcon) return <FallbackIcon size={size} className={className} />;
    return null;
  }
  return <LucideIcon size={size} className={className} />;
};

// SVG house icon – small & lightweight like Google Earth style
const createHouseIcon = (fillColor) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="24" height="24">
    <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="${fillColor}" stroke="#333" stroke-width=".7" stroke-linejoin="round"/>
  </svg>`;
  return L.divIcon({
    className: 'custom-house-icon',
    html: svg,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22]
  });
};

// Status color mapping per user request
const STATUS_CONFIG = {
  'WAITING': { color: '#ffff00', label: 'Waiting', btnActive: 'bg-yellow-100 text-yellow-800 border-yellow-300', btnDot: 'bg-yellow-400' },
  'AKTIF': { color: '#55ffff', label: 'Aktif', btnActive: 'bg-cyan-100 text-cyan-800 border-cyan-300', btnDot: 'bg-cyan-400' },
  'SUSPEND': { color: '#aa5500', label: 'Suspend', btnActive: 'bg-orange-100 text-orange-900 border-orange-400', btnDot: 'bg-orange-700' },
  'READY TO DISMANTLE': { color: '#ffaa00', label: 'Ready to Dismantle', btnActive: 'bg-amber-100 text-amber-800 border-amber-400', btnDot: 'bg-amber-500' },
  'DISMANTLED': { color: '#475569', label: 'Dismantled', btnActive: 'bg-slate-200 text-slate-800 border-slate-400', btnDot: 'bg-slate-600' },
};

// Pre-build leaflet icons
const houseIcons = {};
Object.entries(STATUS_CONFIG).forEach(([key, cfg]) => {
  houseIcons[key] = createHouseIcon(cfg.color);
});

// ODP marker icon – hollow blue triangle with black outer border and shadow
const getOdpIcon = (isFull) => L.divIcon({
  className: 'custom-odp-icon',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
    <filter id="odp-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <g filter="url(#odp-shadow)">
      <!-- Outer black border -->
      <polygon points="12,4 21,20 3,20" fill="none" stroke="#000" stroke-width="4.5" stroke-linejoin="round"/>
      <!-- Inner line -->
      <polygon points="12,4 21,20 3,20" fill="none" stroke="${isFull ? '#ffaa00' : '#0066ff'}" stroke-width="2.5" stroke-linejoin="round"/>
    </g>
  </svg>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
  popupAnchor: [0, -16]
});

const STATIONS = ['Alastua', 'Brumbung', 'Kalibodri', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Randublatung', 'Semarang Tawang', 'Sulur', 'Wadu', 'Weleri'];

// Auto-fit map to markers
const MapBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [markers, map]);
  return null;
};

export default function OutstandingMobileView({ data }) {
  const [selectedStation, setSelectedStation] = useState('');
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [showOdp, setShowOdp] = useState(false);
  const [activeOdpLine, setActiveOdpLine] = useState(null);
  const [filters, setFilters] = useState({
    'WAITING': true,
    'AKTIF': false,
    'SUSPEND': false,
    'READY TO DISMANTLE': false,
    'DISMANTLED': false
  });

  const getStatus = (p) => {
    const valAktivasi = String(p.aktivasi || p.statusAktivasi || p.status_aktivasi || '').trim().toUpperCase();
    const valIkr = String(p.ikr || p.statusIkr || p.status_ikr || '').trim().toUpperCase();

    if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH' || valAktivasi === 'SUD') return 'AKTIF';
    if (valAktivasi === 'SUSPEND') return 'SUSPEND';
    if (valAktivasi === 'READY TO DISMANTLE') return 'READY TO DISMANTLE';
    if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') return 'DISMANTLED';
    
    // Strict logic for WAITING as requested
    if ((valIkr === 'BELUM' || valIkr === 'PROSES') && (valAktivasi === 'BELUM' || valAktivasi === 'PROSES' || !valAktivasi)) return 'WAITING';
    if (!valAktivasi && !valIkr) return 'UNKNOWN'; // Prevent empty rows from being mapped as WAITING
    
    if (valIkr === 'BELUM' && valAktivasi === 'BELUM') return 'WAITING';
    if (valAktivasi === 'BELUM' || valAktivasi === 'PROSES') return 'WAITING';

    return 'UNKNOWN';
  };

  // Prepare customer markers
  const stationData = useMemo(() => {
    if (!data?.pelangganData || !selectedStation) return [];
    return data.pelangganData
      .filter(c => {
        if (String(c.stasiun || '').toLowerCase().trim() !== selectedStation.toLowerCase().trim()) return false;
        const lat = parseFloat(c.latitude);
        const lng = parseFloat(c.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map(c => ({
        ...c,
        lat: parseFloat(c.latitude),
        lng: parseFloat(c.longitude),
        finalStatus: getStatus(c)
      }))
      .filter(c => STATUS_CONFIG[c.finalStatus]); // Only keep valid mapped statuses
  }, [data, selectedStation]);

  // Count per status for badge
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.keys(STATUS_CONFIG).forEach(k => counts[k] = 0);
    stationData.forEach(m => { counts[m.finalStatus] = (counts[m.finalStatus] || 0) + 1; });
    return counts;
  }, [stationData]);

  // Apply visibility filter
  const filteredMarkers = useMemo(() => {
    return stationData.filter(m => filters[m.finalStatus]);
  }, [stationData, filters]);

  // ODP data filtered by station
  const odpMarkers = useMemo(() => {
    if (!data?.odpData || !selectedStation || !showOdp) return [];
    return data.odpData
      .filter(odp => {
        if (String(odp.stasiun || '').toLowerCase().trim() !== selectedStation.toLowerCase().trim()) return false;
        const lat = parseFloat(String(odp.latitude || '').replace(',', '.'));
        const lng = parseFloat(String(odp.longitude || '').replace(',', '.'));
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map(odp => ({
        lat: parseFloat(String(odp.latitude || '').replace(',', '.')),
        lng: parseFloat(String(odp.longitude || '').replace(',', '.')),
        label: odp.kodeOdp || odp.label || 'ODP',
        kapasitas: Number(odp.kapasitas || odp.Kapasitas) || 0,
        terpakai: Number(odp.portTerpakai || odp['Port Terpakai'] || odp.port_terpakai) || 0,
      }));
  }, [data, selectedStation, showOdp]);

  // Calculate lines between active ODP and associated customers
  const odpLines = useMemo(() => {
    if (!activeOdpLine) return [];
    const targetOdp = odpMarkers.find(o => o.label === activeOdpLine);
    if (!targetOdp) return [];

    // Find customers whose ODP matches
    const relatedCustomers = filteredMarkers.filter(c => {
      const cOdp = String(c.odpAktual || c.kodeOdp || '').trim().toLowerCase();
      return cOdp === activeOdpLine.trim().toLowerCase();
    });

    return relatedCustomers.map(c => [
      [targetOdp.lat, targetOdp.lng],
      [c.lat, c.lng]
    ]);
  }, [activeOdpLine, odpMarkers, filteredMarkers]);

  const toggleFilter = (status) => {
    setFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">

      <style>{`
        .animated-purple-line {
          stroke-dasharray: 5, 8;
          animation: dash-flow 1s linear infinite;
        }
        @keyframes dash-flow {
          0% { stroke-dashoffset: 26; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* MAP (full height behind everything) */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer
          center={[-7.0, 110.4]}
          zoom={12}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution='&copy; Google Maps'
            maxZoom={20}
          />
          {filteredMarkers.length > 0 && <MapBounds markers={filteredMarkers} />}

          {/* Animated Purple Lines connecting ODP to Customers */}
          {odpLines.map((positions, i) => (
            <Polyline
              key={`line-${i}`}
              positions={positions}
              color="#9333ea"
              weight={2.5}
              dashArray="8, 8"
              pathOptions={{ className: 'animated-route-line' }}
            />
          ))}

          {/* ODP Markers */}
          {odpMarkers.map((odp, i) => {
            const isFull = odp.kapasitas > 0 && odp.terpakai >= odp.kapasitas;
            return (
            <Marker
              key={`odp-${i}`}
              position={[odp.lat, odp.lng]}
              icon={getOdpIcon(isFull)}
              eventHandlers={{
                click: () => setActiveOdpLine(odp.label),
                popupclose: () => setActiveOdpLine(null)
              }}
            >
              <Popup closeButton={false} autoPan={false} className="custom-mini-popup">
                <div className="min-w-[100px]">
                  <h4 className="font-bold text-[10px] text-blue-700 leading-none mb-0.5 tracking-tighter">{odp.label}</h4>
                  <p className="text-[9px] text-slate-500 mb-1">Kap: <b>{odp.terpakai}</b> / {odp.kapasitas}</p>
                  <div className="w-full bg-slate-200 rounded-full h-1">
                    <div className="h-1 rounded-full" style={{ width: `${odp.kapasitas > 0 ? Math.min((odp.terpakai / odp.kapasitas) * 100, 100) : 0}%`, backgroundColor: isFull ? '#ef4444' : '#3b82f6' }}></div>
                  </div>
                </div>
              </Popup>
            </Marker>
            );
          })}

          {/* Customer Markers */}
          {filteredMarkers.map((c, i) => (
            <Marker key={`cust-${c.idPelanggan}-${i}`} position={[c.lat, c.lng]} icon={houseIcons[c.finalStatus] || houseIcons['WAITING']}>
              <Popup closeButton={false} autoPan={false} className="custom-mini-popup">
                <div className="flex flex-col gap-1 min-w-[150px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-bold text-slate-500 font-mono">{c.idPelanggan}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-wider border ${STATUS_CONFIG[c.finalStatus]?.btnActive}`}>
                      {STATUS_CONFIG[c.finalStatus]?.label}
                    </span>
                  </div>
                  <h4 className="font-black text-[11px] text-slate-800 leading-none mb-1 tracking-tighter">{c.namaPelanggan}</h4>
                  <div className="flex items-start gap-1 text-[9px] text-slate-500 mb-0.5 leading-tight">
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[1px] shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="line-clamp-2">{c.alamat || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
                    <span>ODP: {c.odpAktual || c.kodeOdp || '-'}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* FLOATING CONTROLS */}
      <div className="absolute top-3 left-3 right-3 z-[999] flex flex-col gap-2 pointer-events-none">

        {/* Station Selector – z tertinggi */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg pointer-events-auto border border-white/80 relative z-[1001]">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer"
            onClick={() => setIsStationOpen(!isStationOpen)}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon name="map-pin" size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stasiun</p>
                <p className="text-[13px] font-black text-slate-800 -mt-0.5">{selectedStation || 'Pilih Stasiun...'}</p>
              </div>
            </div>
            <Icon name={isStationOpen ? 'chevron-up' : 'chevron-down'} size={18} className="text-slate-400" />
          </div>

          {isStationOpen && (
            <>
              <div className="fixed inset-0 z-[1000]" onClick={() => setIsStationOpen(false)}></div>
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-[1002] overflow-hidden max-h-[50vh] overflow-y-auto">
                {STATIONS.map(st => (
                  <div
                    key={st}
                    onClick={() => { setSelectedStation(st); setIsStationOpen(false); }}
                    className={`px-4 py-3 text-[12px] font-bold cursor-pointer transition-colors ${selectedStation === st ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {st}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Status Filter Chips — tampil setelah stasiun dipilih, sembunyi saat dropdown terbuka */}
        {selectedStation && !isStationOpen && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg pointer-events-auto border border-white/80 p-3 relative z-[999]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-slate-700">Filter Status</h3>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                {filteredMarkers.length} / {stationData.length} titik
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wide transition-all border ${filters[key]
                    ? cfg.btnActive
                    : 'bg-white text-slate-400 border-slate-200 opacity-60'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filters[key] ? cfg.btnDot : 'bg-slate-300'}`}></span>
                  {cfg.label}
                  <span className="ml-0.5 opacity-70">({statusCounts[key]})</span>
                </button>
              ))}
            </div>
            {/* ODP Toggle */}
            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                  <Icon name="box" size={10} className="text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-600">Tampilkan ODP</span>
                {showOdp && <span className="text-[9px] text-blue-500 font-bold">({odpMarkers.length})</span>}
              </div>
              <button
                onClick={() => setShowOdp(!showOdp)}
                className={`w-9 h-5 rounded-full transition-all relative ${showOdp ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${showOdp ? 'right-[3px]' : 'left-[3px]'}`}></div>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
