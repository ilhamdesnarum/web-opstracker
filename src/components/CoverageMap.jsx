import React, { useState, useEffect, useRef } from 'react';
import { toProperCase } from '../utils';

// --- Komponen Icon Anti-Crash ---
const Icon = ({ name, size = 20, className = "" }) => {
  const containerRef = useRef(null);
  useEffect(() => { 
    if (window.lucide && containerRef.current) {
      containerRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px;"></i>`;
      window.lucide.createIcons({ root: containerRef.current }); 
    }
  }, [name, size, className]);
  return <span ref={containerRef} style={{ display: 'contents' }} />;
};

const CoverageMap = ({ data, targetCoords }) => {
  const mapRef = useRef(null); 
  const mapInstance = useRef(null);
  const markerLayerRef = useRef(null); 
  const userLayerRef = useRef(null);   
  const lineLayerRef = useRef(null);   

  const [gmapsLink, setGmapsLink] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [searchRadius, setSearchRadius] = useState(300); 
  const [errorMsg, setErrorMsg] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedOdp, setSelectedOdp] = useState(null);
  const [realRouteDistance, setRealRouteDistance] = useState(null); 

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  useEffect(() => {
    if (window.L && mapRef.current && !mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current).setView([-6.957, 110.252], 13); 
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
      }).addTo(mapInstance.current);
      setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 250);
    }
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L || !data || !data.odpData) return;
    if (markerLayerRef.current) mapInstance.current.removeLayer(markerLayerRef.current);
    markerLayerRef.current = window.L.layerGroup().addTo(mapInstance.current);

    data.odpData.forEach(odp => {
      if (odp.latitude && odp.longitude) {
        const lat = parseFloat(String(odp.latitude).trim().replace(',', '.'));
        const lng = parseFloat(String(odp.longitude).trim().replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lng)) {
           const cap = Number(odp.kapasitas) || 0;
           const used = Number(odp.portTerpakai) || 0;
           const isFull = cap > 0 && used >= cap;
           const displayTitle = odp.kodeOdp || odp.label || 'ODP';
           
           const markerHtml = `<div style="background-color: ${isFull ? '#ef4444' : '#10b981'}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`;
           const customIcon = window.L.divIcon({ html: markerHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });

           const marker = window.L.marker([lat, lng], { icon: customIcon })
             .bindPopup(`
               <div style="font-family: 'Inter', sans-serif; padding: 2px;">
                 <strong style="font-size:12px; color:#1e293b;">${displayTitle}</strong><br/>
                 <span style="font-size:10px; color:#64748b;">Stasiun: ${toProperCase(odp.stasiun || '')}</span><br/>
                 <div style="margin-top: 6px; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; background-color: ${isFull ? '#ef4444' : '#10b981'}; display: inline-block;">
                   ${isFull ? 'FULL' : 'TERSEDIA'} (${used}/${cap})
                 </div>
               </div>
             `);
           markerLayerRef.current.addLayer(marker);
        }
      }
    });
  }, [data]);

  const executeCoverageCalculation = (tLat, tLng, radius) => {
    setErrorMsg('');
    setSelectedOdp(null);
    setRealRouteDistance(null);
    setUserLocation({ lat: tLat, lng: tLng });

    const results = [];
    (data.odpData || []).forEach(odp => {
      const oLat = parseFloat(String(odp.latitude).trim().replace(',', '.'));
      const oLng = parseFloat(String(odp.longitude).trim().replace(',', '.'));

      if (!isNaN(oLat) && !isNaN(oLng)) {
        const dist = calculateDistance(tLat, tLng, oLat, oLng);
        if (dist <= radius) {
          const cap = Number(odp.kapasitas) || 0;
          const used = Number(odp.portTerpakai) || 0;
          const isFull = cap > 0 && used >= cap;
          results.push({
            ...odp,
            distance: Math.round(dist),
            isFull: isFull,
            available: Math.max(0, cap - used)
          });
        }
      }
    });

    results.sort((a, b) => a.distance - b.distance);
    setRecommendations(results);

    if (mapInstance.current) {
      mapInstance.current.flyTo([tLat, tLng], 17, { duration: 1.5 });
    }
  };

  useEffect(() => {
    if (targetCoords && targetCoords.lat && targetCoords.lng) {
      const parsedLat = parseFloat(String(targetCoords.lat).replace(',', '.'));
      const parsedLng = parseFloat(String(targetCoords.lng).replace(',', '.'));
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setManualLat(parsedLat.toString());
        setManualLng(parsedLng.toString());
        executeCoverageCalculation(parsedLat, parsedLng, searchRadius);
      }
    }
  }, [targetCoords]);

  const handleCekCoverage = () => {
    let tLat = parseFloat(String(manualLat).replace(',', '.'));
    let tLng = parseFloat(String(manualLng).replace(',', '.'));
    if (!isNaN(tLat) && !isNaN(tLng)) {
      executeCoverageCalculation(tLat, tLng, searchRadius);
    } else {
      setErrorMsg('Kordinat tidak valid.');
    }
  };

  useEffect(() => {
    if (!mapInstance.current || !window.L || !userLocation) return;
    if (userLayerRef.current) mapInstance.current.removeLayer(userLayerRef.current);
    userLayerRef.current = window.L.layerGroup().addTo(mapInstance.current);

    const userMarkerHtml = `
      <div style="position: relative;">
        <div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); position: absolute; top: -8px; left: -8px; z-index: 2;"></div>
        <div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; position: absolute; top: -15px; left: -15px; z-index: 1; opacity: 0.4; animation: pulse 2s infinite;"></div>
      </div>
    `;
    const userIcon = window.L.divIcon({ html: userMarkerHtml, className: '', iconSize: [0, 0] });

    window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup("<b>Lokasi Pelanggan</b>")
      .addTo(userLayerRef.current)
      .openPopup();

    window.L.circle([userLocation.lat, userLocation.lng], {
      color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, radius: searchRadius, weight: 1, dashArray: '5, 5'
    }).addTo(userLayerRef.current);
  }, [userLocation, searchRadius]);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 page-enter pb-2">
      <style>{`
        .animated-polyline { animation: dash-animation 1s linear infinite; }
        @keyframes dash-animation { to { stroke-dashoffset: -20; } }
      `}</style>
      
      <div className="w-full lg:w-[400px] flex flex-col gap-5 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <h2 className="font-black text-slate-800 flex items-center text-lg mb-6">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mr-3">
              <Icon name="map-pin" className="text-rose-500" size={18} />
            </div>
            Cek Coverage
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Lat" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
              <input type="text" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Lng" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" />
            </div>
            <button onClick={handleCekCoverage} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Icon name="search" size={18} /> Periksa Area
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="font-black text-xs text-slate-400 uppercase tracking-widest">ODP Terdekat</span>
            <select value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))} className="text-[10px] bg-white border border-slate-200 font-black px-2 py-1 rounded-lg">
              <option value={150}>150m</option>
              <option value={300}>300m</option>
              <option value={500}>500m</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-black text-sm text-slate-800">{rec.kodeOdp || rec.label}</h3>
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${rec.isFull ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                         {rec.distance}m
                       </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Port {rec.available}/{rec.kapasitas} | {toProperCase(rec.stasiun)}</div>
                  </div>
                ))}
              </div>
            ) : <div className="h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">Belum ada hasil</div>}
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-200 rounded-2xl border border-slate-200 shadow-inner relative overflow-hidden z-0">
        <div ref={mapRef} className="absolute inset-0"></div>
      </div>
    </div>
  );
};

export default CoverageMap;
