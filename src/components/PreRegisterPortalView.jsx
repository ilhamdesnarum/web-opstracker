import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import XLSX from 'xlsx-js-style';
import * as fflate from 'fflate';
import Icon from './Icon';
import coverageBoundaries from '../data/coverageBoundaries.json';
import { fetchLiveCoverageBoundaries } from '../services/coverageService.js';
import {
  fetchPreRegisterData,
  fetchPortalWoData,
  fetchPortalMgmData,
  fetchPortalPotensialData,
  updatePreRegisterStatus,
  bulkUpdatePreRegister,
  updatePortalWoStatus,
  bulkUpdatePortalWo,
  updatePortalMgmStatus,
  updatePortalPotensialStatus,
  bulkUpdatePortalPotensial,
  PRE_REGISTER_STATUS_OPTIONS,
  WO_PORTAL_STATUS_OPTIONS,
  MGM_PORTAL_STATUS_OPTIONS,
  POTENSIAL_PORTAL_STATUS_OPTIONS,
  STASIUN_DESNARUM_LIST,
  cleanStatusNumberPrefix,
  matchWoStatusOption,
  matchPotensialStatusOption
} from '../services/preRegisterPortalService';

function normalizePhoneForMatch(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('62')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length >= 8 ? digits : '';
}

function formatWaNumber(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62') && digits.length >= 8) digits = '62' + digits;
  return digits;
}

function parseValidCoords(latRaw, lngRaw) {
  if (!latRaw || !lngRaw) return null;
  let lat = parseFloat(String(latRaw).replace(',', '.').trim());
  const lng = parseFloat(String(lngRaw).replace(',', '.').trim());
  if (isNaN(lat) || isNaN(lng)) return null;
  // Normalisasi otomatis jika penginput lupa tanda minus pada Latitude wilayah Pulau Jawa (sekitar 6..8.5 LS)
  if (lat > 5.5 && lat < 9.0 && lng >= 105.0 && lng <= 116.5) {
    lat = -Math.abs(lat);
  }
  if (lat < -11.5 || lat > 6.5 || lng < 94.5 || lng > 141.5) return null;
  return { lat, lng };
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistanceLabel(meters) {
  if (meters === null || meters === undefined || !isFinite(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

// Ray-casting Point-in-Polygon (format titik poligon: [lat, lng])
function isPointInPolygon(lat, lng, polyCoords) {
  if (!polyCoords || polyCoords.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polyCoords.length - 1; i < polyCoords.length; j = i++) {
    const yi = polyCoords[i][0];
    const xi = polyCoords[i][1];
    const yj = polyCoords[j][0];
    const xj = polyCoords[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Analisis cepat 1 titik pelanggan terhadap seluruh Poligon Boundary & ODP
function analyzePointCoverage(coords, indexedBoundaries, indexedOdps) {
  if (!coords) {
    return {
      hasCoords: false,
      coords: null,
      inBoundary: false,
      boundaryName: '',
      nearestOdp: null,
      nearestAvailableOdp: null,
      category: 'NO_COORDS',
      badgeLabel: 'Tanpa Koordinat',
      badgeBg: 'bg-slate-100 text-slate-600 border-slate-300',
      dotColor: 'bg-slate-400',
      subText: 'Koordinat lokasi belum tersedia',
      recommendedPreStatus: '',
      recommendedWoStatus: '',
      recommendedPotStatus: '',
      recommendedStasiun: '',
      recommendedRemarks: ''
    };
  }

  const { lat, lng } = coords;

  // 1. Cek apakah masuk dalam salah satu poligon Area Boundary Pembangunan
  let inBoundary = false;
  let boundaryName = '';
  for (let i = 0; i < indexedBoundaries.length; i++) {
    const b = indexedBoundaries[i];
    if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) continue;
    if (isPointInPolygon(lat, lng, b.coordinates)) {
      inBoundary = true;
      boundaryName = b.name || 'Boundary Starlite';
      break;
    }
  }

  // 2. Cari ODP terdekat & ODP tersedia (port belum penuh) terdekat
  let nearestOdp = null;
  let minDist = Infinity;
  let nearestAvailableOdp = null;
  let minAvailDist = Infinity;

  for (let i = 0; i < indexedOdps.length; i++) {
    const odp = indexedOdps[i];
    // Filter kasar derajat (~6km) agar perhitungan super cepat jika ribuan ODP
    const dLat = Math.abs(lat - odp.lat);
    const dLng = Math.abs(lng - odp.lng);
    if (dLat > 0.08 && dLng > 0.08 && minDist < 8000) continue;

    const dist = calculateDistanceMeters(lat, lng, odp.lat, odp.lng);
    if (dist < minDist) {
      minDist = dist;
      nearestOdp = { ...odp, distance: Math.round(dist) };
    }
    if (!odp.isFull && dist < minAvailDist) {
      minAvailDist = dist;
      nearestAvailableOdp = { ...odp, distance: Math.round(dist) };
    }
  }

  const nearestDist = nearestOdp ? nearestOdp.distance : Infinity;
  const availDist = nearestAvailableOdp ? nearestAvailableOdp.distance : Infinity;
  const distStr = nearestOdp ? formatDistanceLabel(nearestDist) : 'Tidak ada ODP';

  // Kategori 1: Tercover ODP Tersedia <= 250m
  if (nearestAvailableOdp && availDist <= 250) {
    const odpCode = nearestAvailableOdp.kodeOdp || 'ODP';
    const stas = (nearestAvailableOdp.stasiun || '').toUpperCase();
    return {
      hasCoords: true,
      coords,
      inBoundary,
      boundaryName,
      nearestOdp,
      nearestAvailableOdp,
      category: 'TERCOVER_ODP',
      badgeLabel: `Tercover ODP (${availDist}m)`,
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dotColor: 'bg-emerald-500',
      subText: `${odpCode} (Sisa ${nearestAvailableOdp.available}/${nearestAvailableOdp.cap}) • ${stas || '-'}`,
      recommendedPreStatus: 'Berminat',
      recommendedWoStatus: '13. PROSES AKTIVASI',
      recommendedPotStatus: '05. BERMINAT',
      recommendedStasiun: stas,
      recommendedRemarks: `Tercover ODP ${odpCode} (jarak ${availDist}m, sisa ${nearestAvailableOdp.available}/${nearestAvailableOdp.cap} port${inBoundary ? ', dalam area boundary' : ''})`
    };
  }

  // Kategori 2: ODP Terdekat <= 250m tetapi FULL
  if (nearestOdp && nearestDist <= 250 && nearestOdp.isFull) {
    const odpCode = nearestOdp.kodeOdp || 'ODP';
    const stas = (nearestOdp.stasiun || '').toUpperCase();
    return {
      hasCoords: true,
      coords,
      inBoundary,
      boundaryName,
      nearestOdp,
      nearestAvailableOdp,
      category: 'ODP_FULL',
      badgeLabel: `ODP Penuh (${nearestDist}m)`,
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
      dotColor: 'bg-amber-500',
      subText: `${odpCode} FULL (${nearestOdp.used}/${nearestOdp.cap}) • ${stas || '-'}`,
      recommendedPreStatus: 'ODP Full',
      recommendedWoStatus: '02. KENDALA JARINGAN (ODP FULL / TIDAK ADA COVERAGE / TIANG)',
      recommendedPotStatus: '02. DI LUAR JANGKAUAN (TIDAK ADA COVERAGE / ODP FULL)',
      recommendedStasiun: stas,
      recommendedRemarks: `ODP terdekat ${odpCode} (jarak ${nearestDist}m) penuh (${nearestOdp.used}/${nearestOdp.cap} port)`
    };
  }

  // Kategori 3: ODP Tersedia dalam Radius Menengah (251m - 500m)
  if (nearestAvailableOdp && availDist <= 500) {
    const odpCode = nearestAvailableOdp.kodeOdp || 'ODP';
    const stas = (nearestAvailableOdp.stasiun || '').toUpperCase();
    const isNearEnough = availDist <= 300 && inBoundary;
    return {
      hasCoords: true,
      coords,
      inBoundary,
      boundaryName,
      nearestOdp,
      nearestAvailableOdp,
      category: 'ODP_MEDIUM',
      badgeLabel: `ODP ${availDist}m (${inBoundary ? 'Dalam Area' : 'Luar Area'})`,
      badgeBg: 'bg-sky-50 text-sky-800 border-sky-300',
      dotColor: 'bg-sky-500',
      subText: `${odpCode} (Sisa ${nearestAvailableOdp.available}/${nearestAvailableOdp.cap}) • ${stas || '-'}`,
      recommendedPreStatus: isNearEnough ? 'Berminat' : 'Di luar radius pembangunan',
      recommendedWoStatus: isNearEnough ? '13. PROSES AKTIVASI' : '02. KENDALA JARINGAN (ODP FULL / TIDAK ADA COVERAGE / TIANG)',
      recommendedPotStatus: isNearEnough ? '05. BERMINAT' : '02. DI LUAR JANGKAUAN (TIDAK ADA COVERAGE / ODP FULL)',
      recommendedStasiun: stas,
      recommendedRemarks: isNearEnough
        ? `Masuk boundary pembangunan, jarak ke ODP ${odpCode} sekitar ${availDist}m (sisa ${nearestAvailableOdp.available} port)`
        : `Jarak tarikan ke ODP terdekat ${odpCode} terlalu jauh (${availDist}m${inBoundary ? ', dalam boundary' : ', luar boundary'})`
    };
  }

  // Kategori 4: Masuk Poligon Boundary Pembangunan, tetapi ODP Terdekat > 500m
  if (inBoundary) {
    const odpCode = nearestOdp?.kodeOdp || 'ODP';
    const stas = (nearestOdp?.stasiun || '').toUpperCase();
    return {
      hasCoords: true,
      coords,
      inBoundary: true,
      boundaryName,
      nearestOdp,
      nearestAvailableOdp,
      category: 'IN_BOUNDARY_NO_ODP',
      badgeLabel: `Dalam Area (ODP ${distStr})`,
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-300',
      dotColor: 'bg-purple-500',
      subText: `${odpCode} (${distStr}) • ${stas || '-'}`,
      recommendedPreStatus: 'Di luar radius pembangunan',
      recommendedWoStatus: '02. KENDALA JARINGAN (ODP FULL / TIDAK ADA COVERAGE / TIANG)',
      recommendedPotStatus: '02. DI LUAR JANGKAUAN (TIDAK ADA COVERAGE / ODP FULL)',
      recommendedStasiun: stas,
      recommendedRemarks: `Masuk poligon boundary namun belum ada ODP dekat (ODP terdekat ${odpCode} berjarak ${distStr})`
    };
  }

  // Kategori 5: Di Luar Boundary & ODP Terdekat > 500m (Di Luar Radius Pembangunan)
  const odpCode = nearestOdp?.kodeOdp || '';
  const stas = (nearestOdp?.stasiun || '').toUpperCase();
  return {
    hasCoords: true,
    coords,
    inBoundary: false,
    boundaryName: '',
    nearestOdp,
    nearestAvailableOdp,
    category: 'OUT_OF_RADIUS',
    badgeLabel: `Di Luar Radius (${distStr})`,
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
    dotColor: 'bg-rose-500',
    subText: nearestOdp
      ? `${odpCode} (${distStr}) • ${stas || '-'}`
      : 'Di luar radius pembangunan & coverage ODP',
    recommendedPreStatus: 'Di luar radius pembangunan',
    recommendedWoStatus: '02. KENDALA JARINGAN (ODP FULL / TIDAK ADA COVERAGE / TIANG)',
    recommendedPotStatus: '02. DI LUAR JANGKAUAN (TIDAK ADA COVERAGE / ODP FULL)',
    recommendedStasiun: stas,
    recommendedRemarks: nearestOdp
      ? `Di luar radius pembangunan & area coverage (jarak ke ODP terdekat ${odpCode} ${distStr})`
      : 'Di luar radius pembangunan & area coverage Starlite'
  };
}

function CoverageMapPopupModal({
  modalData,
  odpData = [],
  activeSubTab,
  onClose,
  onQuickUpdateFromMap
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const customerLayerRef = useRef(null);
  const odpLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);

  const [radius, setRadius] = useState(500);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [boundaries, setBoundaries] = useState(coverageBoundaries || []);
  const [selectedOdp, setSelectedOdp] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);

  const { item, coords, matchedCustomer } = modalData || {};
  const primaryStatus = getRowPrimaryStatus(activeSubTab, item || {});
  const portalBadge = getStatusBadgeStyle(primaryStatus);
  const opsInfo = getOpsTrackerStatusInfo(matchedCustomer);

  // Ambil boundary terbaru secara halus
  useEffect(() => {
    let mounted = true;
    fetchLiveCoverageBoundaries(false)
      .then(res => {
        if (mounted && res?.data?.length) setBoundaries(res.data);
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  // Daftar ODP terdekat dalam radius
  const nearbyOdps = useMemo(() => {
    if (!coords) return [];
    const list = [];
    (odpData || []).forEach(odp => {
      const oLat = parseFloat(String(odp.latitude || '').trim().replace(',', '.'));
      const oLng = parseFloat(String(odp.longitude || '').trim().replace(',', '.'));
      if (isNaN(oLat) || isNaN(oLng)) return;
      const dist = calculateDistanceMeters(coords.lat, coords.lng, oLat, oLng);
      if (dist <= radius) {
        const cap = Number(odp.kapasitas) || 8;
        const used = Number(odp.portTerpakai) || 0;
        const isFull = cap > 0 && used >= cap;
        list.push({
          ...odp,
          lat: oLat,
          lng: oLng,
          distance: Math.round(dist),
          cap,
          used,
          available: Math.max(0, cap - used),
          isFull
        });
      }
    });
    list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [coords, odpData, radius]);

  // Pilih otomatis ODP terdekat pertama yang tersedia (atau ODP terdekat)
  useEffect(() => {
    if (nearbyOdps.length > 0) {
      const firstAvailable = nearbyOdps.find(o => !o.isFull) || nearbyOdps[0];
      setSelectedOdp(firstAvailable);
    } else {
      setSelectedOdp(null);
      setRouteDistance(null);
    }
  }, [nearbyOdps]);

  // Inisialisasi peta Leaflet saat pop-up dibuka
  useEffect(() => {
    if (!window.L || !mapContainerRef.current || !coords) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = window.L.map(mapContainerRef.current, { preferCanvas: true }).setView(
      [coords.lat, coords.lng],
      17
    );
    mapInstanceRef.current = map;

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

    googleStreets.addTo(map);
    window.L.control.layers(
      {
        'Peta Jalan': googleStreets,
        'Satelit / Hybrid': googleHybrid
      },
      null,
      { position: 'topright' }
    ).addTo(map);

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords]);

  // Gambar poligon Area Coverage Boundary
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }
    if (!showBoundaries) return;

    const group = window.L.layerGroup().addTo(map);
    boundaryLayerRef.current = group;

    (boundaries || []).forEach(feat => {
      if (!feat.coordinates || !feat.coordinates.length) return;
      const poly = window.L.polygon(feat.coordinates, {
        color: '#0284c7',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.16,
        dashArray: '5, 5'
      });
      poly.bindTooltip(
        `<div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:bold;color:#0f172a;">Boundary: ${feat.name || 'Coverage Starlite'}</div>`,
        { sticky: true, opacity: 0.9 }
      );
      group.addLayer(poly);
    });
  }, [boundaries, showBoundaries]);

  // Gambar Pin Lokasi Pelanggan & Lingkaran Radius
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L || !coords) return;

    if (customerLayerRef.current) {
      map.removeLayer(customerLayerRef.current);
    }
    const group = window.L.layerGroup().addTo(map);
    customerLayerRef.current = group;

    const pinHtml = `
      <div style="position: relative;">
        <div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); position: absolute; top: -8px; left: -8px; z-index: 2;"></div>
        <div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; position: absolute; top: -16px; left: -16px; z-index: 1; opacity: 0.35;"></div>
      </div>
    `;
    const pinIcon = window.L.divIcon({ html: pinHtml, className: '', iconSize: [0, 0] });

    window.L.marker([coords.lat, coords.lng], { icon: pinIcon, zIndexOffset: 1000 })
      .bindPopup(
        `<div style="font-family:'Inter',sans-serif;font-size:12px;"><strong>${item?.nama || item?.namaMember || 'Lokasi Pelanggan'}</strong><br/><span style="font-size:11px;color:#475569;">${item?.alamat || ''}</span></div>`
      )
      .addTo(group)
      .openPopup();

    window.L.circle([coords.lat, coords.lng], {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      radius,
      weight: 1.5,
      dashArray: '5, 5'
    }).addTo(group);
  }, [coords, radius, item]);

  // Gambar titik-titik ODP dalam radius
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (odpLayerRef.current) {
      map.removeLayer(odpLayerRef.current);
    }
    const group = window.L.layerGroup().addTo(map);
    odpLayerRef.current = group;

    nearbyOdps.forEach(odp => {
      const isSelected = selectedOdp && (selectedOdp.kodeOdp || selectedOdp.label) === (odp.kodeOdp || odp.label);
      const size = isSelected ? 18 : 14;
      const borderColor = isSelected ? '#fde047' : '#ffffff';
      const bgColor = odp.isFull ? '#ef4444' : '#10b981';
      const title = odp.kodeOdp || odp.label || 'ODP';

      const markerHtml = `<div style="background-color:${bgColor};width:${size}px;height:${size}px;border-radius:50%;border:${isSelected ? 3 : 2}px solid ${borderColor};box-shadow:0 2px 5px rgba(0,0,0,0.45);cursor:pointer;"></div>`;
      const icon = window.L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = window.L.marker([odp.lat, odp.lng], { icon }).bindPopup(`
        <div style="font-family:'Inter',sans-serif;padding:2px;min-width:145px;">
          <strong style="font-size:12px;color:#1e293b;display:block;">${title}</strong>
          <span style="font-size:10px;color:#64748b;">Stasiun: ${odp.stasiun || '-'} • Jarak: ${odp.distance}m</span><br/>
          <div style="margin-top:5px;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background-color:${bgColor};display:inline-block;">
            ${odp.isFull ? 'FULL' : 'TERSEDIA'} (${odp.used}/${odp.cap} Port)
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedOdp(odp);
      });

      group.addLayer(marker);
    });
  }, [nearbyOdps, selectedOdp]);

  // Gambar garis rute dari pelanggan ke ODP terpilih
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (!coords || !selectedOdp) {
      setRouteDistance(null);
      return;
    }

    let cancelled = false;
    const startPt = [coords.lat, coords.lng];
    const endPt = [selectedOdp.lat, selectedOdp.lng];

    const drawLine = (latlngs) => {
      if (cancelled || !mapInstanceRef.current) return;
      if (routeLayerRef.current) mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = window.L.polyline(latlngs, {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8'
      }).addTo(mapInstanceRef.current);
    };

    const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${coords.lng},${coords.lat};${selectedOdp.lng},${selectedOdp.lat}?geometries=geojson`;
    fetch(osrmUrl)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res?.routes?.length) {
          const routeCoords = res.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          drawLine(routeCoords);
          setRouteDistance(Math.round(res.routes[0].distance));
        } else {
          drawLine([startPt, endPt]);
          setRouteDistance(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          drawLine([startPt, endPt]);
          setRouteDistance(null);
        }
      });

    return () => { cancelled = true; };
  }, [coords, selectedOdp]);

  if (!modalData || !coords) return null;

  const nearestAvailableOdp = nearbyOdps.find(o => !o.isFull);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/70 animate-fade" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 animate-modal flex flex-col max-h-[92vh] overflow-hidden">
        {/* HEADER POP-UP PETA */}
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#1e3a8a] to-[#172554] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-white/10 border border-white/15 shrink-0">
              <Icon name="map" size={18} className="text-sky-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold truncate">
                  Cek Lokasi & ODP Coverage: {item.nama || item.namaMember || '-'}
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${portalBadge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${portalBadge.dot}`}></span>
                  <span>Portal: {portalBadge.label}</span>
                </span>
                {opsInfo && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${opsInfo.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${opsInfo.dot}`}></span>
                    <span>OpsTracker: {matchedCustomer?.idPelanggan} ({opsInfo.label})</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-200 truncate mt-0.5">
                {item.alamat || '-'} ({coords.lat}, {coords.lng})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer"
            aria-label="Tutup peta"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* ISI UTAMA: PETA KIRI & PANEL ODP KANAN */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* AREA PETA LEAFLET */}
          <div className="relative flex-1 min-h-[300px] sm:min-h-[420px] lg:min-h-[480px] bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Toolbar Kontrol Cepat di Atas Peta */}
            <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-xs">
              <span className="font-bold text-slate-600 mr-1">Radius:</span>
              {[250, 500, 1000].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${radius === r
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {r}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowBoundaries(v => !v)}
                className={`ml-1 px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${showBoundaries
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
              >
                Boundary {showBoundaries ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* PANEL KANAN: REKOMENDASI ODP & TOMBOL TINDAK LANJUT CEPAT */}
          <div className="w-full lg:w-[370px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/70 flex flex-col max-h-[46vh] lg:max-h-none">
            {/* Ringkasan Jangkauan */}
            <div className="p-3.5 bg-white border-b border-slate-200/80 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">
                  ODP Terdekat (Radius {radius}m)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${nearbyOdps.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                  {nearbyOdps.length} ODP Ditemukan
                </span>
              </div>

              {nearbyOdps.length === 0 ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Icon name="alert-triangle" size={14} className="text-rose-600 shrink-0" />
                    <span>Tidak Ada ODP dalam Radius {radius}m</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Titik pelanggan kemungkinan berada di luar jangkauan ODP atau di luar radius pembangunan.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Klik salah satu ODP di bawah untuk melihat jalur tarikan kabel di peta.
                </p>
              )}
            </div>

            {/* Daftar ODP Terdekat */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {nearbyOdps.map((odp, i) => {
                const odpKey = odp.kodeOdp || odp.label || i;
                const isSel = selectedOdp && (selectedOdp.kodeOdp || selectedOdp.label) === (odp.kodeOdp || odp.label);
                return (
                  <button
                    key={odpKey}
                    type="button"
                    onClick={() => {
                      setSelectedOdp(odp);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([odp.lat, odp.lng], 18, { duration: 0.7 });
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${isSel
                      ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/15 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-extrabold text-xs text-slate-800">
                          {odp.kodeOdp || odp.label || 'ODP'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Stasiun: <strong className="text-slate-700">{odp.stasiun || '-'}</strong>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${odp.isFull
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                        {odp.isFull ? 'FULL' : 'TERSEDIA'} ({odp.used}/{odp.cap})
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-700">
                        Jarak Lurus: {odp.distance} m
                      </span>
                      {isSel && routeDistance !== null && (
                        <span className="font-bold text-purple-700">
                          Rute Jalan: ~{routeDistance} m
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Panel Kanan: Aksi Cepat Tindak Lanjut Tanpa Keluar Halaman */}
            <div className="p-3.5 bg-white border-t border-slate-200 space-y-2 shrink-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tindak Lanjut Langsung ke Portal
              </div>

              {activeSubTab === 'pre' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQuickUpdateFromMap(item, {
                      status: 'Di luar radius pembangunan',
                      stasiun: selectedOdp?.stasiun ? selectedOdp.stasiun.toUpperCase() : (item.stasiun || ''),
                      remarks: nearbyOdps.length === 0
                        ? `Di luar jangkauan ODP (tidak ada ODP dalam radius ${radius}m)`
                        : `Jarak ke ODP terdekat (${nearbyOdps[0]?.kodeOdp || 'ODP'}) sekitar ${routeDistance || nearbyOdps[0]?.distance}m`
                    })}
                    className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer text-center"
                  >
                    Set: Di Luar Radius
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickUpdateFromMap(item, {
                      status: nearestAvailableOdp ? 'Berminat' : 'ODP Full',
                      stasiun: (nearestAvailableOdp?.stasiun || selectedOdp?.stasiun || item.stasiun || '').toUpperCase(),
                      remarks: nearestAvailableOdp
                        ? `Tercover ODP ${nearestAvailableOdp.kodeOdp || nearestAvailableOdp.label} (Jarak ${nearestAvailableOdp.distance}m, sisa ${nearestAvailableOdp.available} port)`
                        : `ODP terdekat penuh (${selectedOdp?.kodeOdp || 'ODP Full'})`
                    })}
                    className="px-2.5 py-2 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer text-center"
                  >
                    {nearestAvailableOdp ? 'Set: Tercover / Berminat' : 'Set: ODP Full'}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[38px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <Icon name="external-link" size={13} />
                  <span>G-Maps</span>
                </a>

                <button
                  type="button"
                  onClick={() => onQuickUpdateFromMap(item, null)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[38px] rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-xs transition-all cursor-pointer"
                >
                  <Icon name="edit-3" size={13} />
                  <span>Update Status Pelanggan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function getStatusBadgeStyle(statusText) {
  const s = String(statusText || '').trim().toLowerCase();
  if (!s || s === 'belum diupdate') {
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-400',
      label: 'Belum Diupdate'
    };
  }
  if (
    s.includes('sudah aktif') ||
    s.includes('14. aktif') ||
    s.includes('07. aktif') ||
    s === 'aktif' ||
    s.includes('pelanggan aktif')
  ) {
    return {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
      label: statusText
    };
  }
  if (
    s.includes('berminat') && !s.includes('tidak berminat') ||
    s.includes('proses aktivasi') ||
    s.includes('ongoing') ||
    s.includes('menunggu') ||
    s.includes('need check')
  ) {
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
      label: statusText
    };
  }
  if (
    s.includes('tidak berminat') ||
    s.includes('di luar') ||
    s.includes('cancel') ||
    s.includes('dibatalkan') ||
    s.includes('full') ||
    s.includes('tidak ditemukan') ||
    s.includes('masalah') ||
    s.includes('isp lain') ||
    s.includes('provider lain') ||
    s.includes('double') ||
    s.includes('salah input')
  ) {
    return {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      label: statusText
    };
  }
  return {
    bg: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
    label: statusText
  };
}

function isRowActiveStatus(subTab, item) {
  if (subTab === 'pre') {
    const s = String(item.status || '').trim().toLowerCase();
    return s === 'sudah aktif' || s === 'sudah berlangganan starlite';
  }
  if (subTab === 'wo') {
    const s = String(item.updStatus || item.statusPelanggan || '').trim().toLowerCase();
    return s.includes('14. aktif') || s === 'aktif' || s === 'aktivasi';
  }
  if (subTab === 'mgm') {
    const s = String(item.statusPelanggan || '').trim().toLowerCase();
    return s === 'aktif';
  }
  if (subTab === 'pot') {
    const s = String(item.updStatus || item.statusPelanggan || '').trim().toLowerCase();
    return s.includes('07. aktif') || s === 'aktif';
  }
  return false;
}

function isRowUpdated(subTab, item) {
  if (subTab === 'pre') return Boolean(String(item.status || '').trim());
  if (subTab === 'wo') return Boolean(String(item.updStatus || '').trim());
  if (subTab === 'mgm') return Boolean(String(item.statusPelanggan || '').trim() || String(item.remarks || '').trim());
  if (subTab === 'pot') return Boolean(String(item.updStatus || '').trim());
  return false;
}

function getRowPrimaryStatus(subTab, item) {
  if (subTab === 'pre') return item.status || '';
  if (subTab === 'wo') return item.updStatus || '';
  if (subTab === 'mgm') return item.statusPelanggan || '';
  if (subTab === 'pot') return item.updStatus || '';
  return '';
}

function getOpsTrackerStatusInfo(customer) {
  if (!customer) return null;
  const valAktivasi = String(customer.aktivasi || customer.statusAktivasi || '').trim().toUpperCase();
  const valIkr = String(customer.ikr || customer.statusIkr || '').trim().toUpperCase();

  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') {
    const tgl = customer.tglAktivasi ? String(customer.tglAktivasi).split('T')[0].split(' ')[0] : '';
    return {
      code: 'AKTIF',
      category: 'AKTIF',
      label: 'AKTIF',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
      subText: tgl ? `Tgl Aktif: ${tgl}` : 'Sudah Aktif di OpsTracker'
    };
  }
  if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') {
    return {
      code: 'DISMANTLED',
      category: 'DISMANTLED',
      label: 'DISMANTLED',
      bg: 'bg-purple-50 text-purple-800 border-purple-300',
      dot: 'bg-purple-500',
      subText: customer.reasonDismantle || 'Berhenti berlangganan (Dismantled)'
    };
  }
  if (valAktivasi === 'READY TO DISMANTLE' || valAktivasi === 'DISMANTLING') {
    return {
      code: 'READY_DISMANTLE',
      category: 'DISMANTLED',
      label: 'READY TO DISMANTLE',
      bg: 'bg-purple-50 text-purple-800 border-purple-300',
      dot: 'bg-purple-500',
      subText: 'Dalam antrian dismantle'
    };
  }
  if (valAktivasi === 'SUSPEND') {
    return {
      code: 'SUSPEND',
      category: 'DISMANTLED',
      label: 'SUSPEND',
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
      subText: 'Status Suspend / Isolir'
    };
  }
  if (valAktivasi === 'KENDALA' || valIkr === 'KENDALA' || valAktivasi.includes('KENDALA') || valIkr.includes('KENDALA')) {
    return {
      code: 'KENDALA',
      category: 'KENDALA',
      label: 'TERKENDALA',
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      subText: customer.issueKendala || customer.catatan || 'Terkendala instalasi di lapangan'
    };
  }
  if (valAktivasi === 'PENDING' || valIkr === 'PENDING') {
    return {
      code: 'PENDING',
      category: 'PROSES',
      label: 'PENDING / RESCHEDULE',
      bg: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
      subText: customer.catatanPending || customer.catatan || 'Menunggu jadwal ulang instalasi'
    };
  }
  if (valIkr === 'SUDAH') {
    return {
      code: 'SUDAH_IKR',
      category: 'PROSES',
      label: 'SUDAH IKR (BELUM AKTIF)',
      bg: 'bg-sky-50 text-sky-800 border-sky-300',
      dot: 'bg-sky-500',
      subText: 'Sudah penarikan kabel IKR, menunggu aktivasi'
    };
  }
  return {
    code: 'WAITING',
    category: 'PROSES',
    label: 'WAITING / ANTRIAN',
    bg: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
    subText: 'Terdaftar di antrian instalasi OpsTracker'
  };
}

function PreRegisterPortalView({ pelangganData = [], odpData = [], onGoToCoverage }) {
  const SUB_TABS = [
    { id: 'pre', label: 'Pre-Register IRA', shortLabel: 'Pre-Register', icon: 'user-plus', desc: 'Data pre-register pelanggan potensial IRA dalam boundary operasional PT DESNARUM JAYA AKASHA' },
    { id: 'wo', label: 'Data Work Order', shortLabel: 'Data WO', icon: 'clipboard-list', desc: 'Work Order pemasangan beserta tindak lanjut kunjungan dan kendala mitra' },
    { id: 'mgm', label: 'Data MGM', shortLabel: 'Data MGM', icon: 'users', desc: 'Program referral Member Get Member pelanggan ke jaringan mitra' },
    { id: 'pot', label: 'Data Potensial', shortLabel: 'Potensial', icon: 'sparkles', desc: 'Daftar calon pelanggan potensial untuk difollow-up oleh tim operasional' }
  ];

  const [activeSubTab, setActiveSubTab] = useState('pre');
  const [densityMode, setDensityMode] = useState('card'); // 'card' | 'table'

  // State data ke-4 tab
  const [tabState, setTabState] = useState({
    pre: { items: [], loading: true, error: null, lastSync: null, namaMitra: 'PT DESNARUM JAYA AKASHA' },
    wo: { items: [], loading: false, error: null, lastSync: null, diperbarui: '' },
    mgm: { items: [], loading: false, error: null, lastSync: null, diperbarui: '' },
    pot: { items: [], loading: false, error: null, lastSync: null, diperbarui: '' }
  });

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [kpiFilter, setKpiFilter] = useState('ALL'); // 'ALL' | 'UNUPDATED' | 'UPDATED' | 'ACTIVE' | 'MATCHED'
  const [opsSubFilter, setOpsSubFilter] = useState('ALL'); // 'ALL' | 'AKTIF' | 'NEED_SYNC' | 'KENDALA' | 'PROSES' | 'DISMANTLED'
  const [coverageFilter, setCoverageFilter] = useState('ALL'); // 'ALL' | 'TERCOVER_ODP' | 'ODP_MEDIUM' | 'ODP_FULL' | 'IN_BOUNDARY_NO_ODP' | 'OUT_OF_RADIUS' | 'NO_COORDS'
  const [statusFilter, setStatusFilter] = useState('');
  const [kotaFilter, setKotaFilter] = useState('');
  const [stasiunFilter, setStasiunFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = densityMode === 'table' ? 25 : 10;

  // Poligon Boundary Area Pembangunan untuk Auto-Cek seluruh baris
  const [liveBoundaries, setLiveBoundaries] = useState(coverageBoundaries || []);
  useEffect(() => {
    let mounted = true;
    fetchLiveCoverageBoundaries(false)
      .then(res => {
        if (mounted && res?.data?.length) setLiveBoundaries(res.data);
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  // Pre-index Poligon Boundary beserta Bounding Box agar pengecekan 1.000+ titik berlangsung < 10ms
  const indexedBoundaries = useMemo(() => {
    const list = [];
    (liveBoundaries || []).forEach(feat => {
      const coords = feat?.coordinates;
      if (!Array.isArray(coords) || coords.length < 3) return;
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;
      for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        if (!pt || pt.length < 2) continue;
        const lat = Number(pt[0]);
        const lng = Number(pt[1]);
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      if (isFinite(minLat)) {
        list.push({
          name: feat.name || 'Boundary Starlite',
          coordinates: coords,
          minLat,
          maxLat,
          minLng,
          maxLng
        });
      }
    });
    return list;
  }, [liveBoundaries]);

  // Pre-index seluruh titik ODP dari odpData
  const indexedOdps = useMemo(() => {
    const list = [];
    (odpData || []).forEach(odp => {
      if (!odp) return;
      const oLat = parseFloat(String(odp.latitude || '').trim().replace(',', '.'));
      const oLng = parseFloat(String(odp.longitude || '').trim().replace(',', '.'));
      if (isNaN(oLat) || isNaN(oLng)) return;
      const cap = Number(odp.kapasitas) || 8;
      const used = Number(odp.portTerpakai) || 0;
      const isFull = cap > 0 && used >= cap;
      list.push({
        kodeOdp: odp.kodeOdp || odp.label || 'ODP',
        stasiun: odp.stasiun || '',
        lat: oLat,
        lng: oLng,
        cap,
        used,
        available: Math.max(0, cap - used),
        isFull
      });
    });
    return list;
  }, [odpData]);

  // Expanded history per item
  const [expandedHistoryMap, setExpandedHistoryMap] = useState({});

  // Modal Edit Satuan
  const [editModalData, setEditModalData] = useState(null);
  const [editForm, setEditForm] = useState({
    status: '',
    stasiun: '',
    idPelanggan: '',
    remarks: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal Rincian Distribusi Status
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Modal Pop-Up Peta & Cek ODP Coverage
  const [mapModalData, setMapModalData] = useState(null);

  // Modal Bulk Upload Excel
  const bulkInputRef = useRef(null);
  const [bulkModal, setBulkModal] = useState({
    open: false,
    parsing: false,
    running: false,
    progress: 0,
    totalRead: 0,
    readyItems: [],
    skipEmpty: 0,
    skipSame: 0,
    duplicates: 0,
    errors: [],
    resultMsg: '',
    fatalError: ''
  });

  // Toast notifikasi
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Indeks pencarian cepat ke database OpsTracker (pelangganData) berdasarkan Nomor HP & ID Pelanggan
  const opsTrackerLookup = useMemo(() => {
    const byPhone = new Map();
    const byId = new Map();

    (pelangganData || []).forEach(p => {
      if (!p) return;
      const id = String(p.idPelanggan || '').trim().toUpperCase();
      if (id) byId.set(id, p);

      const normPhone = normalizePhoneForMatch(p.nomorHp);
      if (normPhone) {
        const existing = byPhone.get(normPhone);
        const isCurrentActive = ['sudah', 'aktif'].includes(String(p.aktivasi || '').trim().toLowerCase());
        const isExistingActive = existing && ['sudah', 'aktif'].includes(String(existing.aktivasi || '').trim().toLowerCase());
        if (!existing || (isCurrentActive && !isExistingActive)) {
          byPhone.set(normPhone, p);
        }
      }
    });

    return { byPhone, byId };
  }, [pelangganData]);

  // Fungsi pencocokan pintar baris portal dengan database OpsTracker
  const findOpsTrackerMatch = useCallback((item) => {
    if (!item) return null;
    const candidateIds = [item.idPelanggan, item.idPelangganAktif, item.idDidaftarkan].filter(Boolean);
    for (const cid of candidateIds) {
      const clean = String(cid).trim().toUpperCase();
      if (opsTrackerLookup.byId.has(clean)) {
        return opsTrackerLookup.byId.get(clean);
      }
    }
    const normPhone = normalizePhoneForMatch(item.telepon);
    if (normPhone && opsTrackerLookup.byPhone.has(normPhone)) {
      return opsTrackerLookup.byPhone.get(normPhone);
    }
    return null;
  }, [opsTrackerLookup]);

  // Load data per sub-tab
  const loadSubTabData = useCallback(async (tabKey, forceRefresh = false) => {
    setTabState(prev => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], loading: true, error: null }
    }));

    try {
      let res = null;
      if (tabKey === 'pre') res = await fetchPreRegisterData(forceRefresh);
      else if (tabKey === 'wo') res = await fetchPortalWoData(forceRefresh);
      else if (tabKey === 'mgm') res = await fetchPortalMgmData(forceRefresh);
      else if (tabKey === 'pot') res = await fetchPortalPotensialData(forceRefresh);

      setTabState(prev => ({
        ...prev,
        [tabKey]: {
          ...prev[tabKey],
          items: res?.items || [],
          loading: false,
          error: null,
          serverWarning: res?.serverWarning || '',
          lastSync: res?.lastSync || new Date(),
          diperbarui: res?.diperbarui || '',
          namaMitra: res?.namaMitra || prev[tabKey].namaMitra
        }
      }));

      if (forceRefresh) {
        showToast(`Data ${SUB_TABS.find(t => t.id === tabKey)?.shortLabel || ''} berhasil diperbarui langsung dari sheet.`, 'success');
      }
    } catch (err) {
      console.error('[PreRegisterPortal] Load tab error:', err);
      const errMsg = (err && typeof err === 'object' && err.message) ? err.message : (typeof err === 'string' ? err : 'Gagal memuat data dari Portal Starlite');
      setTabState(prev => ({
        ...prev,
        [tabKey]: {
          ...prev[tabKey],
          loading: false,
          error: errMsg
        }
      }));
    }
  }, [showToast]);

  // Muat tab Pre-Register di awal, lalu preload tab lainnya secara halus di background
  useEffect(() => {
    loadSubTabData('pre', false).then(() => {
      fetchPortalWoData(false).then(res => {
        setTabState(prev => ({
          ...prev,
          wo: { ...prev.wo, items: res.items || [], lastSync: res.lastSync, diperbarui: res.diperbarui || '' }
        }));
      }).catch(() => { });
      fetchPortalMgmData(false).then(res => {
        setTabState(prev => ({
          ...prev,
          mgm: { ...prev.mgm, items: res.items || [], lastSync: res.lastSync, diperbarui: res.diperbarui || '', serverWarning: res.serverWarning || '' }
        }));
      }).catch(() => { });
      fetchPortalPotensialData(false).then(res => {
        setTabState(prev => ({
          ...prev,
          pot: { ...prev.pot, items: res.items || [], lastSync: res.lastSync, diperbarui: res.diperbarui || '' }
        }));
      }).catch(() => { });
    });
  }, [loadSubTabData]);

  // Saat berpindah sub-tab, jika datanya belum pernah dimuat, panggil loadSubTabData
  const handleSelectSubTab = (tabKey) => {
    setActiveSubTab(tabKey);
    setSearchQuery('');
    setKpiFilter('ALL');
    setOpsSubFilter('ALL');
    setCoverageFilter('ALL');
    setStatusFilter('');
    setKotaFilter('');
    setStasiunFilter('');
    setCurrentPage(1);
    const current = tabState[tabKey];
    if (!current.lastSync && !current.loading) {
      loadSubTabData(tabKey, false);
    }
  };

  // Reset halaman ke 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kpiFilter, opsSubFilter, coverageFilter, statusFilter, kotaFilter, stasiunFilter, densityMode]);

  // Keyboard Escape handler untuk semua modal di komponen ini
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mapModalData) setMapModalData(null);
        if (editModalData && !isSavingEdit) setEditModalData(null);
        if (isBreakdownOpen) setIsBreakdownOpen(false);
        if (bulkModal.open && !bulkModal.running) setBulkModal(prev => ({ ...prev, open: false }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapModalData, editModalData, isSavingEdit, isBreakdownOpen, bulkModal.open, bulkModal.running]);

  // Buka Pop-Up Peta Lokasi & ODP Coverage langsung di halaman ini
  const handleOpenMapModal = useCallback((item, coords) => {
    if (!coords) return;
    const matchedCustomer = findOpsTrackerMatch(item);
    setMapModalData({ item, coords, matchedCustomer });
  }, [findOpsTrackerMatch]);

  // Buka Modal Update langsung dari dalam Pop-Up Peta (bisa disertai preset status/remarks hasil cek ODP)
  const handleQuickUpdateFromMap = (item, preset = null) => {
    setMapModalData(null);
    handleOpenEditModal(item, false);
    if (preset) {
      setEditForm(prev => ({
        ...prev,
        status: preset.status || prev.status,
        stasiun: preset.stasiun || prev.stasiun,
        remarks: preset.remarks || prev.remarks
      }));
    }
  };

  const currentTabInfo = SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0];
  const currentTabData = tabState[activeSubTab];
  const rawItems = currentTabData.items || [];

  // Kunci unik setiap baris untuk cache analisis coverage
  const getItemUniqueId = useCallback((item) => {
    if (!item) return '';
    return `${activeSubTab}_${item.rowId || item.idPelanggan || item.rowNum || item.telepon || item.index || ''}`;
  }, [activeSubTab]);

  // Auto-Cek Coverage & ODP Terdekat untuk seluruh baris pada tab aktif
  const coverageAnalysisMap = useMemo(() => {
    const map = new Map();
    rawItems.forEach(item => {
      const uid = getItemUniqueId(item);
      const matched = findOpsTrackerMatch(item);
      const coords =
        parseValidCoords(item.latitude, item.longitude) ||
        parseValidCoords(matched?.latitude, matched?.longitude);
      const analysis = analyzePointCoverage(coords, indexedBoundaries, indexedOdps);
      map.set(uid, analysis);
    });
    return map;
  }, [rawItems, getItemUniqueId, findOpsTrackerMatch, indexedBoundaries, indexedOdps]);

  const getItemCoverage = useCallback((item) => {
    const uid = getItemUniqueId(item);
    return coverageAnalysisMap.get(uid) || analyzePointCoverage(null, [], []);
  }, [coverageAnalysisMap, getItemUniqueId]);

  // Statistik KPI untuk tab aktif
  const kpiStats = useMemo(() => {
    let total = rawItems.length;
    let updated = 0;
    let unupdated = 0;
    let active = 0;
    let matchedOps = 0;
    let matchedOpsAktif = 0;
    let matchedOpsNeedSync = 0;
    let matchedOpsKendala = 0;
    let matchedOpsProses = 0;
    let matchedOpsDismantled = 0;
    const statusCounts = {};

    rawItems.forEach(item => {
      const isUpd = isRowUpdated(activeSubTab, item);
      if (isUpd) updated++;
      else unupdated++;

      const isPortalActive = isRowActiveStatus(activeSubTab, item);
      if (isPortalActive) active++;

      const matched = findOpsTrackerMatch(item);
      if (matched) {
        matchedOps++;
        const opsInfo = getOpsTrackerStatusInfo(matched);
        if (opsInfo?.category === 'AKTIF') {
          matchedOpsAktif++;
          if (!isPortalActive) matchedOpsNeedSync++;
        } else if (opsInfo?.category === 'KENDALA') {
          matchedOpsKendala++;
        } else if (opsInfo?.category === 'DISMANTLED') {
          matchedOpsDismantled++;
        } else {
          matchedOpsProses++;
        }
      }

      const stLabel = getRowPrimaryStatus(activeSubTab, item) || 'Belum Diupdate';
      statusCounts[stLabel] = (statusCounts[stLabel] || 0) + 1;
    });

    const pctUpdated = total > 0 ? Math.round((updated / total) * 100) : 0;
    const pctActive = total > 0 ? ((active / total) * 100).toFixed(1).replace('.', ',') : '0';

    return {
      total,
      updated,
      unupdated,
      active,
      matchedOps,
      matchedOpsAktif,
      matchedOpsNeedSync,
      matchedOpsKendala,
      matchedOpsProses,
      matchedOpsDismantled,
      pctUpdated,
      pctActive,
      statusCounts
    };
  }, [rawItems, activeSubTab, findOpsTrackerMatch]);

  // Helper: Dapatkan stasiun efektif (dari data portal, match OpsTracker, atau rekomendasi ODP/Boundary)
  const getEffectiveItemStation = useCallback((item) => {
    if (!item) return '';
    const normalize = (s) => {
      if (!s) return '';
      const upper = String(s).trim().toUpperCase();
      if (upper === 'TAWANG') return 'SEMARANG TAWANG';
      return upper;
    };

    const direct = normalize(item.stasiun);
    if (direct) return direct;

    const matched = findOpsTrackerMatch(item);
    const matchedStas = normalize(matched?.stasiun);
    if (matchedStas) return matchedStas;

    const cov = getItemCoverage(item);
    const recStas = normalize(cov?.recommendedStasiun || cov?.nearestOdp?.stasiun);
    if (recStas) return recStas;

    return '';
  }, [findOpsTrackerMatch, getItemCoverage]);

  // Opsi dropdown filter dinamis berdasarkan data tab aktif
  const filterOptions = useMemo(() => {
    const kotas = new Set();
    const stasiuns = new Set();
    const statuses = new Set();

    rawItems.forEach(item => {
      if (item.kota) kotas.add(String(item.kota).trim().toUpperCase());
      const stas = getEffectiveItemStation(item);
      if (stas) stasiuns.add(stas);
      const st = getRowPrimaryStatus(activeSubTab, item);
      if (st) statuses.add(st);
    });

    return {
      kotas: Array.from(kotas).sort(),
      stasiuns: Array.from(stasiuns).sort(),
      statuses: Array.from(statuses).sort()
    };
  }, [rawItems, activeSubTab, getEffectiveItemStation]);

  // Baris setelah filter KPI, OpsTracker, Status, Kota, Stasiun, & Pencarian (sebelum filter kategori coverage)
  const baseFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return rawItems.filter(item => {
      if (kpiFilter === 'UNUPDATED' && isRowUpdated(activeSubTab, item)) return false;
      if (kpiFilter === 'UPDATED' && !isRowUpdated(activeSubTab, item)) return false;
      if (kpiFilter === 'ACTIVE' && !isRowActiveStatus(activeSubTab, item)) return false;

      const matched = findOpsTrackerMatch(item);
      if (kpiFilter === 'MATCHED' && !matched) return false;

      if (opsSubFilter !== 'ALL') {
        if (!matched) return false;
        const opsInfo = getOpsTrackerStatusInfo(matched);
        if (opsSubFilter === 'AKTIF' && opsInfo?.category !== 'AKTIF') return false;
        if (opsSubFilter === 'NEED_SYNC' && (opsInfo?.category !== 'AKTIF' || isRowActiveStatus(activeSubTab, item))) return false;
        if (opsSubFilter === 'KENDALA' && opsInfo?.category !== 'KENDALA') return false;
        if (opsSubFilter === 'PROSES' && opsInfo?.category !== 'PROSES') return false;
        if (opsSubFilter === 'DISMANTLED' && opsInfo?.category !== 'DISMANTLED') return false;
      }

      if (statusFilter) {
        const st = getRowPrimaryStatus(activeSubTab, item);
        if (statusFilter === '__BELUM__' && st) return false;
        if (statusFilter !== '__BELUM__' && st !== statusFilter) return false;
      }

      if (kotaFilter && String(item.kota || '').toUpperCase() !== kotaFilter) return false;
      if (stasiunFilter) {
        const effectiveStas = getEffectiveItemStation(item);
        if (effectiveStas !== stasiunFilter) return false;
      }

      if (q) {
        const cov = getItemCoverage(item);
        const hay = [
          item.nama,
          item.namaMember,
          item.namaDidaftarkan,
          item.telepon,
          item.alamat,
          item.kota,
          item.kecamatan,
          item.kelurahan,
          item.stasiun,
          getEffectiveItemStation(item),
          item.idPelanggan,
          item.idPelangganAktif,
          item.idMember,
          item.idDidaftarkan,
          item.status,
          item.updStatus,
          item.statusPelanggan,
          item.remarks,
          item.updRemarks,
          matched?.idPelanggan,
          matched?.namaPelanggan,
          matched?.stasiun,
          cov?.nearestOdp?.kodeOdp,
          cov?.nearestOdp?.stasiun,
          cov?.badgeLabel
        ].filter(Boolean).join(' ').toLowerCase();

        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [rawItems, activeSubTab, searchQuery, kpiFilter, opsSubFilter, statusFilter, kotaFilter, stasiunFilter, findOpsTrackerMatch, getItemCoverage, getEffectiveItemStation]);

  // Statistik Hasil Auto-Cek Coverage & ODP pada baris yang sedang tampil (baseFilteredItems)
  const coverageStats = useMemo(() => {
    const counts = {
      ALL: baseFilteredItems.length,
      TERCOVER_ODP: 0,
      ODP_MEDIUM: 0,
      ODP_FULL: 0,
      IN_BOUNDARY_NO_ODP: 0,
      OUT_OF_RADIUS: 0,
      NO_COORDS: 0,
      unupdatedOutAndFull: 0,
      unupdatedTercover: 0,
      unupdatedTotalWithRec: 0
    };

    baseFilteredItems.forEach(item => {
      const cov = getItemCoverage(item);
      const cat = cov.category || 'NO_COORDS';
      if (counts[cat] !== undefined) counts[cat]++;

      if (!isRowUpdated(activeSubTab, item)) {
        if (cat === 'OUT_OF_RADIUS' || cat === 'IN_BOUNDARY_NO_ODP' || cat === 'ODP_FULL') {
          counts.unupdatedOutAndFull++;
        }
        if (cat === 'TERCOVER_ODP') {
          counts.unupdatedTercover++;
        }
        if (cov.recommendedPreStatus || cov.recommendedWoStatus || cov.recommendedPotStatus) {
          counts.unupdatedTotalWithRec++;
        }
      }
    });

    return counts;
  }, [baseFilteredItems, getItemCoverage, activeSubTab]);

  // Data akhir setelah filter Kategori Auto-Cek Coverage
  const filteredItems = useMemo(() => {
    if (coverageFilter === 'ALL') return baseFilteredItems;
    return baseFilteredItems.filter(item => {
      const cov = getItemCoverage(item);
      return cov.category === coverageFilter;
    });
  }, [baseFilteredItems, coverageFilter, getItemCoverage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    searchQuery ||
    kpiFilter !== 'ALL' ||
    opsSubFilter !== 'ALL' ||
    coverageFilter !== 'ALL' ||
    statusFilter ||
    kotaFilter ||
    stasiunFilter
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setKpiFilter('ALL');
    setOpsSubFilter('ALL');
    setCoverageFilter('ALL');
    setStatusFilter('');
    setKotaFilter('');
    setStasiunFilter('');
    setCurrentPage(1);
  };

  // Helper penentu nilai isian otomatis dari pelanggan OpsTracker
  const buildAutoFillValues = useCallback((item, mp, prevForm) => {
    const opsInfo = getOpsTrackerStatusInfo(mp);
    const isOpsActive = opsInfo?.category === 'AKTIF';
    const isOpsKendala = opsInfo?.category === 'KENDALA';

    let targetStatus = prevForm.status;
    if (activeSubTab === 'pre') {
      if (isOpsActive) targetStatus = 'Sudah Aktif';
      else if (!isOpsKendala) targetStatus = 'Proses Aktivasi';
    } else if (activeSubTab === 'wo') {
      if (isOpsActive) targetStatus = '14. AKTIF';
      else if (!isOpsKendala) targetStatus = '13. PROSES AKTIVASI';
    } else if (activeSubTab === 'mgm') {
      if (isOpsActive) targetStatus = 'AKTIF';
      else if (!isOpsKendala) targetStatus = 'MENUNGGU KUNJUNGAN';
    } else if (activeSubTab === 'pot') {
      if (isOpsActive) targetStatus = '07. AKTIF';
      else if (!isOpsKendala) targetStatus = '06. PROSES AKTIVASI';
    }

    let defaultRemark = prevForm.remarks;
    if (!defaultRemark) {
      if (isOpsActive) {
        defaultRemark = `Sudah aktif di OpsTracker (ID: ${mp.idPelanggan}${mp.tglAktivasi ? `, Tgl: ${String(mp.tglAktivasi).split(' ')[0]}` : ''})`;
      } else if (isOpsKendala) {
        defaultRemark = mp.issueKendala || mp.catatan || `Terkendala di OpsTracker (ID: ${mp.idPelanggan})`;
      } else {
        defaultRemark = `Terdaftar di OpsTracker (${opsInfo?.label || 'Proses'}, ID: ${mp.idPelanggan})`;
      }
    }

    return {
      status: targetStatus,
      idPelanggan: mp.idPelanggan || prevForm.idPelanggan,
      stasiun: (mp.stasiun || prevForm.stasiun || '').toUpperCase(),
      remarks: defaultRemark
    };
  }, [activeSubTab]);

  // Helper penentu nilai isian otomatis dari hasil Auto-Cek Coverage & ODP Terdekat
  const buildAutoFillFromCoverage = useCallback((item, cov, prevForm) => {
    if (!cov || !cov.hasCoords) return prevForm;

    let targetStatus = prevForm.status;
    if (activeSubTab === 'pre') targetStatus = cov.recommendedPreStatus || prevForm.status;
    else if (activeSubTab === 'wo') targetStatus = cov.recommendedWoStatus || prevForm.status;
    else if (activeSubTab === 'pot') targetStatus = cov.recommendedPotStatus || prevForm.status;

    return {
      status: targetStatus,
      idPelanggan: prevForm.idPelanggan,
      stasiun: cov.recommendedStasiun || prevForm.stasiun || (item.stasiun || '').toUpperCase(),
      remarks: cov.recommendedRemarks || prevForm.remarks
    };
  }, [activeSubTab]);

  // Buka Modal Edit Status Satuan (autoFillMode: false | true/'ops' | 'odp')
  const handleOpenEditModal = (item, autoFillMode = false) => {
    const matchedCustomer = findOpsTrackerMatch(item);
    const cov = getItemCoverage(item);
    setEditError('');

    let initialForm = {
      status: '',
      stasiun: '',
      idPelanggan: '',
      remarks: ''
    };

    if (activeSubTab === 'pre') {
      initialForm = {
        status: item.status || '',
        stasiun: item.stasiun || (matchedCustomer?.stasiun ? matchedCustomer.stasiun.toUpperCase() : cov?.recommendedStasiun || ''),
        idPelanggan: item.idPelanggan || (matchedCustomer?.idPelanggan || ''),
        remarks: item.remarks || ''
      };
    } else if (activeSubTab === 'wo') {
      initialForm = {
        status: matchWoStatusOption(item.updStatus) || '',
        stasiun: item.stasiun || '',
        idPelanggan: item.idPelangganAktif || item.idPelanggan || (matchedCustomer?.idPelanggan || ''),
        remarks: item.updRemarks || ''
      };
    } else if (activeSubTab === 'mgm') {
      initialForm = {
        status: item.statusPelanggan || '',
        stasiun: item.stasiun || '',
        idPelanggan: item.idDidaftarkan || (matchedCustomer?.idPelanggan || ''),
        remarks: item.remarks || ''
      };
    } else if (activeSubTab === 'pot') {
      initialForm = {
        status: matchPotensialStatusOption(item.updStatus) || '',
        stasiun: item.stasiun || '',
        idPelanggan: item.idPelangganAktif || item.idPelanggan || (matchedCustomer?.idPelanggan || ''),
        remarks: item.updRemarks || ''
      };
    }

    if ((autoFillMode === true || autoFillMode === 'ops') && matchedCustomer) {
      initialForm = buildAutoFillValues(item, matchedCustomer, initialForm);
    } else if (autoFillMode === 'odp' && cov?.hasCoords) {
      initialForm = buildAutoFillFromCoverage(item, cov, initialForm);
    }

    setEditForm(initialForm);
    setEditModalData({ item, matchedCustomer, coverageInfo: cov });
  };

  // Isi otomatis form modal dari data OpsTracker yang cocok
  const handleAutoFillFromOpsTracker = () => {
    if (!editModalData?.matchedCustomer) return;
    setEditForm(prev => buildAutoFillValues(editModalData.item, editModalData.matchedCustomer, prev));
  };

  // Isi otomatis form modal dari hasil Auto-Cek ODP Terdekat
  const handleAutoFillFromOdp = () => {
    if (!editModalData?.coverageInfo?.hasCoords) return;
    setEditForm(prev => buildAutoFillFromCoverage(editModalData.item, editModalData.coverageInfo, prev));
  };

  // Simpan perubahan status satuan ke server Starlite
  const handleSaveEditModal = async (e) => {
    e.preventDefault();
    if (!editModalData || isSavingEdit) return;

    const { item } = editModalData;
    const { status, stasiun, idPelanggan, remarks } = editForm;

    if (!status) {
      setEditError('Silakan pilih status terlebih dahulu.');
      return;
    }

    const requiresCustomerId =
      (activeSubTab === 'pre' && status === 'Sudah Aktif') ||
      (activeSubTab === 'wo' && status === '14. AKTIF') ||
      (activeSubTab === 'mgm' && status === 'AKTIF') ||
      (activeSubTab === 'pot' && status === '07. AKTIF');

    if (requiresCustomerId && !String(idPelanggan || '').trim()) {
      setEditError('ID Pelanggan wajib diisi apabila status yang dipilih adalah Aktif.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      if (activeSubTab === 'pre') {
        const res = await updatePreRegisterStatus({
          rowId: item.rowId,
          status,
          remarks,
          idPelanggan,
          stasiun
        });
        setTabState(prev => ({
          ...prev,
          pre: {
            ...prev.pre,
            items: prev.pre.items.map(r => r.rowId === item.rowId ? {
              ...r,
              status,
              remarks: String(remarks || '').trim(),
              idPelanggan: status === 'Sudah Aktif' ? String(idPelanggan || '').trim() : '',
              stasiun: String(stasiun || '').trim().toUpperCase() || r.stasiun,
              terakhirDiupdate: res.terakhirDiupdate || r.terakhirDiupdate,
              riwayatStatus: res.riwayatStatus || r.riwayatStatus
            } : r)
          }
        }));
      } else if (activeSubTab === 'wo') {
        const res = await updatePortalWoStatus({
          idPelanggan: item.idPelanggan,
          status,
          remarks,
          idAktif: idPelanggan
        });
        setTabState(prev => ({
          ...prev,
          wo: {
            ...prev.wo,
            items: prev.wo.items.map(r => r.idPelanggan === item.idPelanggan ? {
              ...r,
              updStatus: res.status || status,
              categoryIssue: res.status || status,
              updRemarks: res.remarks ?? String(remarks || '').trim(),
              terakhirDiupdate: res.terakhir || r.terakhirDiupdate,
              riwayatStatus: res.riwayat || r.riwayatStatus,
              diupdateOleh: res.oleh || r.diupdateOleh,
              idPelangganAktif: res.idAktif || (status === '14. AKTIF' ? String(idPelanggan || '').trim() : '')
            } : r)
          }
        }));
      } else if (activeSubTab === 'mgm') {
        const res = await updatePortalMgmStatus({
          rowNum: item.rowNum,
          idMember: item.idMember,
          alamat: item.alamat,
          status,
          remark: remarks,
          idPel: idPelanggan
        });
        setTabState(prev => ({
          ...prev,
          mgm: {
            ...prev.mgm,
            items: prev.mgm.items.map(r => r.rowNum === item.rowNum ? {
              ...r,
              statusPelanggan: res.status || status,
              remarks: res.remark ?? String(remarks || '').trim(),
              idDidaftarkan: res.idPel !== undefined ? res.idPel : (status === 'AKTIF' ? String(idPelanggan || '').trim() : r.idDidaftarkan),
              riwayatStatus: res.riwayat || r.riwayatStatus
            } : r)
          }
        }));
      } else if (activeSubTab === 'pot') {
        const res = await updatePortalPotensialStatus({
          nomorTelepon: item.telepon,
          status,
          remarks,
          idAktif: idPelanggan
        });
        setTabState(prev => ({
          ...prev,
          pot: {
            ...prev.pot,
            items: prev.pot.items.map(r => r.telepon === item.telepon ? {
              ...r,
              updStatus: res.status || status,
              categoryIssue: res.status || status,
              updRemarks: res.remarks ?? String(remarks || '').trim(),
              terakhirDiupdate: res.terakhir || r.terakhirDiupdate,
              riwayatStatus: res.riwayat || r.riwayatStatus,
              diupdateOleh: res.oleh || r.diupdateOleh,
              idPelangganAktif: res.idAktif || (status === '07. AKTIF' ? String(idPelanggan || '').trim() : '')
            } : r)
          }
        }));
      }

      setEditModalData(null);
      showToast(`Status pelanggan ${item.nama || item.namaMember || ''} berhasil disimpan ke server Starlite.`, 'success');
    } catch (err) {
      setEditError(err.message || 'Gagal menyimpan perubahan ke server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Export data terfilter ke Excel (.xlsx) lengkap dengan hasil Auto-Cek Coverage & ODP
  const handleExportExcel = () => {
    if (!filteredItems.length) {
      showToast('Tidak ada data untuk diunduh.', 'error');
      return;
    }

    let rowsData = [];
    if (activeSubTab === 'pre') {
      rowsData = filteredItems.map((r, idx) => {
        const cov = getItemCoverage(r);
        const matched = findOpsTrackerMatch(r);
        const opsInfo = getOpsTrackerStatusInfo(matched);
        return {
          'No': idx + 1,
          'Nama Pelanggan': r.nama,
          'Nomor Telepon': r.telepon,
          'Alamat': r.alamat,
          'Kota': r.kota,
          'Kecamatan': r.kecamatan,
          'Kelurahan': r.kelurahan,
          'Stasiun': r.stasiun || cov?.recommendedStasiun || '',
          'Latitude': r.latitude,
          'Longitude': r.longitude,
          'Status di OpsTracker': matched ? `${matched.idPelanggan} (${opsInfo?.label || '-'})` : 'Belum Terdaftar',
          'Hasil Auto-Cek Coverage': cov?.badgeLabel || '-',
          'ODP Terdekat': cov?.nearestOdp?.kodeOdp || '-',
          'Jarak ODP (m)': cov?.nearestOdp?.distance ?? '-',
          'Rekomendasi Status': cov?.recommendedPreStatus || '-',
          'Status Portal': r.status || 'Belum Diupdate',
          'ID Pelanggan': r.idPelanggan,
          'Remarks': r.remarks,
          'Terakhir Diupdate': r.terakhirDiupdate
        };
      });
    } else if (activeSubTab === 'wo' || activeSubTab === 'pot') {
      rowsData = filteredItems.map((r, idx) => {
        const cov = getItemCoverage(r);
        return {
          'No': idx + 1,
          'ID Pelanggan': r.idPelanggan,
          'Nama Pelanggan': r.nama,
          'Nomor Telepon': r.telepon,
          'Tanggal Daftar': r.tanggalDaftar,
          'Status Pelanggan': r.statusPelanggan,
          'Hasil Auto-Cek Coverage': cov?.badgeLabel || '-',
          'ODP Terdekat': cov?.nearestOdp?.kodeOdp || '-',
          'Jarak ODP (m)': cov?.nearestOdp?.distance ?? '-',
          'Status Updatean': r.updStatus || 'Belum Diupdate',
          'ID Pelanggan Aktif': r.idPelangganAktif,
          'Remarks': r.updRemarks,
          'Kota': r.kota,
          'Stasiun': r.stasiun,
          'Alamat': r.alamat,
          'Latitude': r.latitude,
          'Longitude': r.longitude,
          'Terakhir Diupdate': r.terakhirDiupdate
        };
      });
    } else if (activeSubTab === 'mgm') {
      rowsData = filteredItems.map((r, idx) => ({
        'No': idx + 1,
        'ID Member': r.idMember,
        'Nama Member': r.namaMember,
        'ID yang Didaftarkan': r.idDidaftarkan,
        'Nama yang Didaftarkan': r.namaDidaftarkan,
        'Status Pelanggan': r.statusPelanggan,
        'Tipe Coverage': r.tipeCoverage,
        'Tanggal Daftar': r.tanggalDaftar,
        'Kota': r.kota,
        'Kecamatan': r.kecamatan,
        'Stasiun': r.stasiun,
        'Alamat': r.alamat,
        'Remarks': r.remarks
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rowsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentTabInfo.shortLabel);
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Data_${currentTabInfo.shortLabel.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
    showToast(`File Excel ${currentTabInfo.shortLabel} berhasil diunduh.`, 'success');
  };

  // Export data terfilter ke Google Earth (.kmz) dikelompokkan per Folder Stasiun & warna status coverage
  const handleExportKmz = () => {
    if (!filteredItems.length) {
      showToast('Tidak ada data untuk diekspor ke KMZ.', 'error');
      return;
    }

    const escapeXml = (val) => {
      if (val === null || val === undefined) return '';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const validItems = [];
    filteredItems.forEach((r) => {
      const matched = findOpsTrackerMatch(r);
      const coords = parseValidCoords(r.latitude, r.longitude) || parseValidCoords(matched?.latitude, matched?.longitude);
      if (coords) {
        validItems.push({ item: r, matched, coords });
      }
    });

    if (!validItems.length) {
      showToast('Tidak ada pelanggan dengan koordinat GPS valid pada daftar saat ini.', 'error');
      return;
    }

    // Kelompokkan berdasarkan Stasiun Efektif agar rapi di panel Folder Google Earth
    const stationGroups = new Map();
    validItems.forEach((entry) => {
      const stas = getEffectiveItemStation(entry.item) || 'TANPA STASIUN';
      if (!stationGroups.has(stas)) {
        stationGroups.set(stas, []);
      }
      stationGroups.get(stas).push(entry);
    });

    const sortedStations = Array.from(stationGroups.keys()).sort();
    const docTitle = `Starlite ${currentTabInfo.label} (${validItems.length} Pelanggan)`;

    const getStyleIdForCategory = (cat) => {
      switch (cat) {
        case 'TERCOVER_ODP':
          return 'style-tercover';
        case 'ODP_MEDIUM':
          return 'style-medium';
        case 'ODP_FULL':
          return 'style-full';
        case 'IN_BOUNDARY_NO_ODP':
        case 'IN_BOUNDARY_FAR':
          return 'style-boundary';
        case 'OUT_OF_RADIUS':
          return 'style-out';
        default:
          return 'style-default';
      }
    };

    let foldersXml = '';
    const globalCatCounts = {
      TERCOVER_ODP: 0,
      ODP_MEDIUM: 0,
      ODP_FULL: 0,
      IN_BOUNDARY_NO_ODP: 0,
      OUT_OF_RADIUS: 0,
      OTHER: 0
    };

    sortedStations.forEach((stasName) => {
      const entries = stationGroups.get(stasName) || [];
      let placemarksXml = '';
      const stasCatCounts = {
        TERCOVER_ODP: 0,
        ODP_MEDIUM: 0,
        ODP_FULL: 0,
        IN_BOUNDARY_NO_ODP: 0,
        OUT_OF_RADIUS: 0
      };

      entries.forEach(({ item: r, matched, coords }) => {
        const cov = getItemCoverage(r);
        const cat = cov?.category || 'OTHER';
        if (globalCatCounts[cat] !== undefined) globalCatCounts[cat]++;
        else globalCatCounts.OTHER++;
        if (stasCatCounts[cat] !== undefined) stasCatCounts[cat]++;

        const opsInfo = getOpsTrackerStatusInfo(matched);
        const primaryStatus = getRowPrimaryStatus(activeSubTab, r) || 'Belum Diupdate';
        const custName = r.nama || r.namaMember || '(Tanpa Nama)';
        const phone = r.telepon || matched?.nomorHp || '-';
        const odpCode = cov?.nearestOdp?.kodeOdp || '-';
        const odpDist = cov?.nearestOdp?.distance != null ? `${cov.nearestOdp.distance}m` : '-';
        const odpCap = cov?.nearestOdp ? `Sisa ${cov.nearestOdp.available}/${cov.nearestOdp.cap}` : '-';
        const covLabel = cov?.badgeLabel || '-';
        const recStatus = cov?.recommendedPreStatus || '-';
        const opsStatusLabel = matched ? `${matched.idPelanggan} (${opsInfo?.label || '-'})` : 'Belum Terdaftar';
        const remarks = r.remarks || r.updRemarks || '-';
        const idPortal = r.idPelanggan || r.idMember || '-';
        const styleId = getStyleIdForCategory(cov?.category);

        const descHtml = `<![CDATA[
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#1e293b;min-width:260px;max-width:360px;">
            <div style="font-weight:bold;font-size:14px;color:#1d4ed8;margin-bottom:4px;">${escapeXml(custName)}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;">Stasiun: <b>${escapeXml(stasName)}</b> | Kota: <b>${escapeXml(r.kota || '-')}</b></div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;" border="1" cellpadding="4" cellspacing="0" bordercolor="#cbd5e1">
              <tr><td style="background:#f8fafc;font-weight:bold;width:38%;">ID Portal</td><td>${escapeXml(idPortal)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Telepon / WA</td><td>${escapeXml(phone)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Alamat</td><td>${escapeXml(r.alamat || '-')}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Kelurahan / Kec.</td><td>${escapeXml([r.kelurahan, r.kecamatan].filter(Boolean).join(', ') || '-')}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Auto-Cek ODP</td><td><b>${escapeXml(covLabel)}</b></td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">ODP Terdekat</td><td>${escapeXml(odpCode)} (${escapeXml(odpDist)} | ${escapeXml(odpCap)})</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Saran Status</td><td>${escapeXml(recStatus)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Status Portal</td><td>${escapeXml(primaryStatus)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Status OpsTracker</td><td>${escapeXml(opsStatusLabel)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Remarks</td><td>${escapeXml(remarks)}</td></tr>
              <tr><td style="background:#f8fafc;font-weight:bold;">Koordinat</td><td>${coords.lat}, ${coords.lng}</td></tr>
            </table>
            <div style="margin-top:8px;">
              <a href="https://www.google.com/maps?q=${coords.lat},${coords.lng}" target="_blank" style="color:#2563eb;font-weight:bold;text-decoration:none;">Buka di Google Maps</a>
            </div>
          </div>
        ]]>`;

        placemarksXml += `
      <Placemark>
        <name>${escapeXml(custName)}</name>
        <styleUrl>#${styleId}</styleUrl>
        <description>${descHtml}</description>
        <ExtendedData>
          <Data name="ID_Portal"><value>${escapeXml(idPortal)}</value></Data>
          <Data name="Nama_Pelanggan"><value>${escapeXml(custName)}</value></Data>
          <Data name="Telepon"><value>${escapeXml(phone)}</value></Data>
          <Data name="Kota"><value>${escapeXml(r.kota || '')}</value></Data>
          <Data name="Kecamatan"><value>${escapeXml(r.kecamatan || '')}</value></Data>
          <Data name="Kelurahan"><value>${escapeXml(r.kelurahan || '')}</value></Data>
          <Data name="Stasiun"><value>${escapeXml(stasName)}</value></Data>
          <Data name="Alamat"><value>${escapeXml(r.alamat || '')}</value></Data>
          <Data name="Auto_Cek_Coverage"><value>${escapeXml(covLabel)}</value></Data>
          <Data name="ODP_Terdekat"><value>${escapeXml(odpCode)}</value></Data>
          <Data name="Jarak_ODP"><value>${escapeXml(odpDist)}</value></Data>
          <Data name="Kapasitas_ODP"><value>${escapeXml(odpCap)}</value></Data>
          <Data name="Status_Portal"><value>${escapeXml(primaryStatus)}</value></Data>
          <Data name="Status_OpsTracker"><value>${escapeXml(opsStatusLabel)}</value></Data>
          <Data name="Remarks"><value>${escapeXml(remarks)}</value></Data>
          <Data name="Latitude"><value>${coords.lat}</value></Data>
          <Data name="Longitude"><value>${coords.lng}</value></Data>
        </ExtendedData>
        <Point>
          <coordinates>${coords.lng},${coords.lat},0</coordinates>
        </Point>
      </Placemark>`;
      });

      const stasSummaryParts = [];
      if (stasCatCounts.TERCOVER_ODP > 0) stasSummaryParts.push(`Hijau: ${stasCatCounts.TERCOVER_ODP}`);
      if (stasCatCounts.ODP_MEDIUM > 0) stasSummaryParts.push(`Biru: ${stasCatCounts.ODP_MEDIUM}`);
      if (stasCatCounts.ODP_FULL > 0) stasSummaryParts.push(`Kuning: ${stasCatCounts.ODP_FULL}`);
      if (stasCatCounts.IN_BOUNDARY_NO_ODP > 0) stasSummaryParts.push(`Ungu: ${stasCatCounts.IN_BOUNDARY_NO_ODP}`);
      if (stasCatCounts.OUT_OF_RADIUS > 0) stasSummaryParts.push(`Merah: ${stasCatCounts.OUT_OF_RADIUS}`);
      const stasSnippetText = stasSummaryParts.join(' | ');

      foldersXml += `
    <Folder>
      <name>${escapeXml(`${stasName} (${entries.length})`)}</name>
      <Snippet maxLines="1">${escapeXml(stasSnippetText)}</Snippet>
      <open>0</open>${placemarksXml}
    </Folder>`;
    });

    const rootSnippetText =
      'Pin Hijau: Tercover ODP | Pin Biru: ODP>250m | Pin Kuning: ODP Penuh | Pin Ungu: Tercover ODP > 500m | Pin Merah: Di Luar Radius Pembangunan';

    const rootDescriptionHtml = `<![CDATA[
      <div style="font-family:Arial,sans-serif;font-size:12px;color:#1e293b;min-width:340px;max-width:460px;">
        <div style="font-weight:bold;font-size:14px;color:#1e3a8a;margin-bottom:4px;">${escapeXml(docTitle)}</div>
        <div style="font-size:11px;color:#475569;margin-bottom:10px;">Pin Hijau: Tercover ODP | Pin Biru: ODP&gt;250m | Pin Kuning: ODP Penuh | Pin Ungu: Tercover ODP &gt; 500m | Pin Merah: Di Luar Radius Pembangunan</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;" border="1" cellpadding="5" cellspacing="0" bordercolor="#cbd5e1">
          <tr style="background:#f1f5f9;font-weight:bold;">
            <td style="width:28%;">Warna Pin</td>
            <td>Keterangan Status Coverage ODP</td>
            <td style="width:18%;text-align:right;">Jumlah</td>
          </tr>
          <tr>
            <td><b style="color:#15803d;">Pin Hijau</b></td>
            <td>Tercover ODP</td>
            <td style="text-align:right;font-weight:bold;">${globalCatCounts.TERCOVER_ODP}</td>
          </tr>
          <tr>
            <td><b style="color:#1d4ed8;">Pin Biru</b></td>
            <td>ODP&gt;250m</td>
            <td style="text-align:right;font-weight:bold;">${globalCatCounts.ODP_MEDIUM}</td>
          </tr>
          <tr>
            <td><b style="color:#b45309;">Pin Kuning</b></td>
            <td>ODP Penuh</td>
            <td style="text-align:right;font-weight:bold;">${globalCatCounts.ODP_FULL}</td>
          </tr>
          <tr>
            <td><b style="color:#7e22ce;">Pin Ungu</b></td>
            <td>Tercover ODP &gt; 500m</td>
            <td style="text-align:right;font-weight:bold;">${globalCatCounts.IN_BOUNDARY_NO_ODP}</td>
          </tr>
          <tr>
            <td><b style="color:#be123c;">Pin Merah</b></td>
            <td>Di Luar Radius Pembangunan</td>
            <td style="text-align:right;font-weight:bold;">${globalCatCounts.OUT_OF_RADIUS}</td>
          </tr>
        </table>
      </div>
    ]]>`;

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docTitle)}</name>
    <Snippet maxLines="3">${escapeXml(rootSnippetText)}</Snippet>
    <description>${rootDescriptionHtml}</description>
    <open>1</open>
    <Style id="style-tercover">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Style id="style-medium">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Style id="style-full">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Style id="style-boundary">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/purple-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Style id="style-out">
      <IconStyle>
        <scale>1.05</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Style id="style-default">
      <IconStyle>
        <scale>1.05</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>${foldersXml}
  </Document>
</kml>`;

    try {
      const kmlBytes = fflate.strToU8(kmlContent);
      const kmzBytes = fflate.zipSync({ 'doc.kml': [kmlBytes, { level: 6 }] });
      const blob = new Blob([kmzBytes], { type: 'application/vnd.google-earth.kmz' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const stasSuffix = stasiunFilter ? `_${stasiunFilter.replace(/\s+/g, '_')}` : '';
      const fileName = `Data_${currentTabInfo.shortLabel.replace(/\s+/g, '_')}${stasSuffix}_${dateStr}.kmz`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`File KMZ berhasil diunduh (${validItems.length} titik koordinat pelanggan).`, 'success');
    } catch (err) {
      showToast(`Gagal membuat file KMZ: ${err.message}`, 'error');
    }
  };

  // Unduh Template Update Excel (.xlsx) sesuai struktur asli Portal Starlite (bisa kosong/existing atau terisi otomatis dari Auto-Cek ODP)
  const handleDownloadTemplate = (autoFillWithOdp = false) => {
    if (!filteredItems.length) {
      showToast('Tidak ada data untuk dijadikan template update.', 'error');
      return;
    }

    let templateRows = [];
    let guideRows = [];

    if (activeSubTab === 'pre') {
      templateRows = filteredItems.map(r => {
        const isUpd = isRowUpdated('pre', r);
        const matched = findOpsTrackerMatch(r);
        const opsInfo = getOpsTrackerStatusInfo(matched);
        const cov = getItemCoverage(r);

        let st = r.status || '';
        let rm = r.remarks || '';
        let idp = String(r.idPelanggan || '');
        let stas = r.stasiun || '';

        if (autoFillWithOdp && !isUpd) {
          if (opsInfo?.category === 'AKTIF' && matched?.idPelanggan) {
            st = 'Sudah Aktif';
            idp = String(matched.idPelanggan);
            stas = (matched.stasiun || cov?.recommendedStasiun || stas || '').toUpperCase();
            rm = `Sudah aktif di OpsTracker (ID: ${matched.idPelanggan})`;
          } else if (cov?.hasCoords && cov.recommendedPreStatus) {
            st = cov.recommendedPreStatus;
            stas = (cov.recommendedStasiun || stas || '').toUpperCase();
            rm = cov.recommendedRemarks || rm;
          }
        }

        return {
          'Nama Pelanggan': r.nama || '',
          'Nomor Telepon': String(r.telepon || ''),
          'Status': st,
          'Remarks': rm,
          'ID Pelanggan': idp,
          'Stasiun': stas
        };
      });
      guideRows = [
        ['PETUNJUK PENGISIAN TEMPLATE PRE-REGISTER'],
        ['1. Jangan ubah kolom Nama Pelanggan dan Nomor Telepon (dipakai untuk mencocokkan data).'],
        ['2. Isi kolom Status, Remarks, ID Pelanggan, dan Stasiun pada sheet Update.'],
        ['3. ID Pelanggan wajib diisi apabila Status bernilai "Sudah Aktif".'],
        [''],
        ['PILIHAN STATUS YANG VALID:'],
        ...PRE_REGISTER_STATUS_OPTIONS.map(o => [o])
      ];
    } else if (activeSubTab === 'wo') {
      templateRows = filteredItems.map(r => {
        const isUpd = isRowUpdated('wo', r);
        const cov = getItemCoverage(r);
        let st = cleanStatusNumberPrefix(r.updStatus || '');
        let rm = r.updRemarks || '';
        if (autoFillWithOdp && !isUpd && cov?.hasCoords && cov.recommendedWoStatus) {
          st = cleanStatusNumberPrefix(cov.recommendedWoStatus);
          rm = cov.recommendedRemarks || rm;
        }
        return {
          'ID Pelanggan': String(r.idPelanggan || ''),
          'Nama Pelanggan': r.nama || '',
          'Nama Partner': r.partner || 'PT DESNARUM JAYA AKASHA',
          'Status Category': st,
          'ID Pelanggan Aktif': String(r.idPelangganAktif || ''),
          'Remarks': rm
        };
      });
      guideRows = [
        ['PETUNJUK PENGISIAN TEMPLATE WO STARLITE'],
        ['1. Jangan ubah kolom ID Pelanggan.'],
        ['2. Isi kolom Status Category, ID Pelanggan Aktif (jika status AKTIF), dan Remarks.'],
        [''],
        ['PILIHAN STATUS CATEGORY:'],
        ...WO_PORTAL_STATUS_OPTIONS.map(o => [o])
      ];
    } else if (activeSubTab === 'pot') {
      templateRows = filteredItems.map(r => {
        const isUpd = isRowUpdated('pot', r);
        const cov = getItemCoverage(r);
        let st = cleanStatusNumberPrefix(r.updStatus || '');
        let rm = r.updRemarks || '';
        if (autoFillWithOdp && !isUpd && cov?.hasCoords && cov.recommendedPotStatus) {
          st = cleanStatusNumberPrefix(cov.recommendedPotStatus);
          rm = cov.recommendedRemarks || rm;
        }
        return {
          'Nomor Telepon': String(r.telepon || ''),
          'Nama Pelanggan': r.nama || '',
          'Nama Partner': r.partner || 'PT DESNARUM JAYA AKASHA',
          'Status Category': st,
          'ID Pelanggan Aktif': String(r.idPelangganAktif || ''),
          'Remarks': rm
        };
      });
      guideRows = [
        ['PETUNJUK PENGISIAN TEMPLATE PELANGGAN POTENSIAL'],
        ['1. Jangan ubah kolom Nomor Telepon.'],
        ['2. Isi kolom Status Category, ID Pelanggan Aktif (jika status AKTIF), dan Remarks.'],
        [''],
        ['PILIHAN STATUS CATEGORY:'],
        ...POTENSIAL_PORTAL_STATUS_OPTIONS.map(o => [o])
      ];
    } else {
      showToast('Untuk Data MGM (2 baris), silakan gunakan tombol Update langsung pada kartu.', 'info');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsUpdate = XLSX.utils.json_to_sheet(templateRows);
    const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
    XLSX.utils.book_append_sheet(wb, wsUpdate, 'Update');
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');
    const suffix = autoFillWithOdp ? '_AUTOFILL_ODP' : '';
    XLSX.writeFile(wb, `template_update_${activeSubTab}${suffix}_PT_DESNARUM_JAYA_AKASHA.xlsx`);
    showToast(
      autoFillWithOdp
        ? 'Template Excel dengan isian otomatis hasil Auto-Cek ODP berhasil diunduh.'
        : 'Template Update Excel berhasil diunduh.',
      'success'
    );
  };

  // Siapkan Bulk Update langsung di browser berdasarkan hasil Auto-Cek ODP (tanpa perlu bolak-balik Excel)
  // mode: 'OUT_AND_FULL' (hanya yang Di Luar Radius & ODP Full) | 'ALL_AUTO' (semua yang belum diupdate sesuai rekomendasi ODP & OpsTracker)
  const handlePrepareAutoBulkUpdate = (mode = 'OUT_AND_FULL') => {
    const makePreKey = (n, t) => `${String(n || '').trim().replace(/\s+/g, ' ').toUpperCase()}_${String(t || '').trim()}`;
    const readyItems = [];
    let skipAlreadyUpdated = 0;

    filteredItems.forEach((item, idx) => {
      if (isRowUpdated(activeSubTab, item)) {
        skipAlreadyUpdated++;
        return;
      }

      const matched = findOpsTrackerMatch(item);
      const opsInfo = getOpsTrackerStatusInfo(matched);
      const cov = getItemCoverage(item);

      if (activeSubTab === 'pre') {
        const key = makePreKey(item.nama, item.telepon);
        if (mode === 'OUT_AND_FULL') {
          if (
            cov?.category === 'OUT_OF_RADIUS' ||
            cov?.category === 'IN_BOUNDARY_NO_ODP' ||
            cov?.category === 'ODP_FULL' ||
            (cov?.category === 'ODP_MEDIUM' && cov?.recommendedPreStatus === 'Di luar radius pembangunan')
          ) {
            readyItems.push({
              key,
              status: cov.recommendedPreStatus,
              remarks: cov.recommendedRemarks,
              idPelanggan: '',
              stasiun: (cov.recommendedStasiun || item.stasiun || '').toUpperCase(),
              baris: idx + 1,
              nama: item.nama || '-'
            });
          }
        } else {
          // ALL_AUTO: Prioritaskan jika sudah AKTIF di OpsTracker, lalu hasil Auto-Cek ODP
          if (opsInfo?.category === 'AKTIF' && matched?.idPelanggan) {
            readyItems.push({
              key,
              status: 'Sudah Aktif',
              remarks: `Sudah aktif di OpsTracker (ID: ${matched.idPelanggan})`,
              idPelanggan: String(matched.idPelanggan),
              stasiun: (matched.stasiun || cov?.recommendedStasiun || item.stasiun || '').toUpperCase(),
              baris: idx + 1,
              nama: item.nama || '-'
            });
          } else if (cov?.hasCoords && cov.recommendedPreStatus) {
            readyItems.push({
              key,
              status: cov.recommendedPreStatus,
              remarks: cov.recommendedRemarks,
              idPelanggan: '',
              stasiun: (cov.recommendedStasiun || item.stasiun || '').toUpperCase(),
              baris: idx + 1,
              nama: item.nama || '-'
            });
          }
        }
      } else if (activeSubTab === 'wo' || activeSubTab === 'pot') {
        const isWo = activeSubTab === 'wo';
        const k = String(isWo ? item.idPelanggan : item.telepon).trim();
        if (!k || !cov?.hasCoords) return;
        const recStatus = isWo ? cov.recommendedWoStatus : cov.recommendedPotStatus;
        if (!recStatus) return;

        if (mode === 'OUT_AND_FULL') {
          if (cov.category === 'OUT_OF_RADIUS' || cov.category === 'IN_BOUNDARY_NO_ODP' || cov.category === 'ODP_FULL') {
            readyItems.push({
              id: k,
              status: recStatus,
              remarks: cov.recommendedRemarks,
              idAktif: '',
              baris: idx + 1,
              nama: item.nama || k
            });
          }
        } else {
          readyItems.push({
            id: k,
            status: recStatus,
            remarks: cov.recommendedRemarks,
            idAktif: '',
            baris: idx + 1,
            nama: item.nama || k
          });
        }
      }
    });

    if (readyItems.length === 0) {
      showToast('Tidak ada baris belum diupdate yang memenuhi kriteria Auto-Update pada tampilan ini.', 'info');
      return;
    }

    setBulkModal({
      open: true,
      parsing: false,
      running: false,
      progress: 0,
      totalRead: filteredItems.length,
      readyItems,
      skipEmpty: 0,
      skipSame: skipAlreadyUpdated,
      duplicates: 0,
      errors: [],
      resultMsg: '',
      fatalError: ''
    });
  };

  // Proses pembacaan file Excel untuk Bulk Update
  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBulkModal({
      open: true,
      parsing: true,
      running: false,
      progress: 0,
      totalRead: 0,
      readyItems: [],
      skipEmpty: 0,
      skipSame: 0,
      duplicates: 0,
      errors: [],
      resultMsg: '',
      fatalError: ''
    });

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

      if (!rows.length) {
        setBulkModal(prev => ({ ...prev, parsing: false, fatalError: 'File Excel kosong.' }));
        return;
      }

      const head = rows[0].map(h => String(h || '').trim().toLowerCase());
      const cellStr = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 });
        return String(val).trim();
      };

      const errors = [];
      const byKey = {};
      let totalRead = 0;
      let skipEmpty = 0;
      let skipSame = 0;
      let duplicates = 0;

      if (activeSubTab === 'pre') {
        const cNama = head.indexOf('nama pelanggan');
        const cTelp = head.indexOf('nomor telepon');
        const cSt = head.indexOf('status');
        const cRm = head.indexOf('remarks');
        const cId = head.indexOf('id pelanggan');
        const cStas = head.indexOf('stasiun');

        if (cNama === -1 || cTelp === -1) {
          setBulkModal(prev => ({
            ...prev,
            parsing: false,
            fatalError: 'Header "Nama Pelanggan" dan "Nomor Telepon" tidak ditemukan. Gunakan file dari tombol Template Update.'
          }));
          return;
        }

        const makePreKey = (n, t) => `${String(n || '').trim().replace(/\s+/g, ' ').toUpperCase()}_${String(t || '').trim()}`;
        const existingMap = {};
        rawItems.forEach(item => {
          const k = makePreKey(item.nama, item.telepon);
          if (!(k in existingMap)) existingMap[k] = item;
        });

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const nama = cellStr(row[cNama]);
          const telp = cellStr(row[cTelp]);
          if (!nama && !telp) continue;
          totalRead++;

          const exSt = cSt !== -1 ? cellStr(row[cSt]) : '';
          const exRm = cRm !== -1 ? cellStr(row[cRm]) : '';
          const exId = cId !== -1 ? cellStr(row[cId]) : '';
          const exStas = cStas !== -1 ? cellStr(row[cStas]).toUpperCase() : '';

          if (!exSt && !exRm && !exId && !exStas) {
            skipEmpty++;
            continue;
          }

          const k = makePreKey(nama, telp);
          const cur = existingMap[k];
          if (!cur) {
            errors.push({ baris: r + 1, nama, message: 'Pelanggan tidak ditemukan (nama/nomor telepon tidak cocok).' });
            continue;
          }

          let status = cur.status || '';
          let remarks = cur.remarks || '';
          let idp = cur.idPelanggan || '';
          if (exSt) {
            const cleanTarget = exSt.replace(/^\d+\.\s*/, '').toLowerCase();
            const matchedOpt = PRE_REGISTER_STATUS_OPTIONS.find(o => o.toLowerCase() === cleanTarget);
            if (!matchedOpt) {
              errors.push({ baris: r + 1, nama, message: `Status tidak valid: "${exSt}"` });
              continue;
            }
            status = matchedOpt;
          }
          if (exRm) remarks = exRm;
          if (exId) idp = exId;
          const curStas = String(cur.stasiun || '').trim().toUpperCase();
          const stas = exStas || curStas;

          if (status !== 'Sudah Aktif') {
            if (exId) {
              errors.push({ baris: r + 1, nama, message: 'ID Pelanggan hanya untuk status "Sudah Aktif".' });
              continue;
            }
            idp = '';
          } else if (!idp) {
            errors.push({ baris: r + 1, nama, message: 'ID Pelanggan wajib diisi apabila Status "Sudah Aktif".' });
            continue;
          }

          if (status === (cur.status || '') && remarks === (cur.remarks || '') && idp === (cur.idPelanggan || '') && stas === curStas) {
            skipSame++;
            continue;
          }

          if (k in byKey) duplicates++;
          byKey[k] = { key: k, status, remarks, idPelanggan: idp, stasiun: exStas, baris: r + 1, nama };
        }
      } else if (activeSubTab === 'wo' || activeSubTab === 'pot') {
        const isWo = activeSubTab === 'wo';
        const cKey = head.indexOf(isWo ? 'id pelanggan' : 'nomor telepon');
        const cSt = head.indexOf('status category') !== -1 ? head.indexOf('status category') : head.indexOf('status');
        const cRm = head.indexOf('remarks') !== -1 ? head.indexOf('remarks') : head.indexOf('remark');
        const cIdp = head.indexOf('id pelanggan aktif');

        if (cKey === -1 || cSt === -1) {
          setBulkModal(prev => ({
            ...prev,
            parsing: false,
            fatalError: 'Header kunci atau Status Category tidak ditemukan. Gunakan file dari tombol Template Update.'
          }));
          return;
        }

        const existingMap = {};
        rawItems.forEach(item => {
          const k = String(isWo ? item.idPelanggan : item.telepon).trim();
          if (k && !(k in existingMap)) existingMap[k] = item;
        });

        const validOptions = isWo ? WO_PORTAL_STATUS_OPTIONS : POTENSIAL_PORTAL_STATUS_OPTIONS;
        const activeOptionCode = isWo ? '14. AKTIF' : '07. AKTIF';

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const k = cellStr(row[cKey]);
          if (!k) continue;
          totalRead++;

          const exSt = cellStr(row[cSt]);
          const exRm = cRm !== -1 ? cellStr(row[cRm]) : '';
          const exId = cIdp !== -1 ? cellStr(row[cIdp]) : '';

          if (!exSt && !exRm && !exId) {
            skipEmpty++;
            continue;
          }

          const cur = existingMap[k];
          if (!cur) {
            errors.push({ baris: r + 1, nama: k, message: 'Data tidak ditemukan pada akun mitra ini.' });
            continue;
          }

          let status = cur.updStatus || '';
          let remark = cur.updRemarks || '';
          if (exSt) {
            const matchedOpt = validOptions.find(o => cleanStatusNumberPrefix(o).toLowerCase() === cleanStatusNumberPrefix(exSt).toLowerCase());
            if (!matchedOpt) {
              errors.push({ baris: r + 1, nama: k, message: `Status Category tidak valid: "${exSt}"` });
              continue;
            }
            status = matchedOpt;
          }
          if (exRm) remark = exRm;
          if (!status) {
            errors.push({ baris: r + 1, nama: k, message: 'Status Category wajib diisi.' });
            continue;
          }

          let idp = exId || cur.idPelangganAktif || '';
          if (status === activeOptionCode) {
            if (!idp) {
              errors.push({ baris: r + 1, nama: k, message: 'ID Pelanggan Aktif wajib diisi untuk status AKTIF.' });
              continue;
            }
          } else {
            if (exId) {
              errors.push({ baris: r + 1, nama: k, message: `ID Pelanggan Aktif hanya untuk status ${activeOptionCode}.` });
              continue;
            }
            idp = '';
          }

          if (status === (cur.updStatus || '') && remark === (cur.updRemarks || '') && idp === (cur.idPelangganAktif || '')) {
            skipSame++;
            continue;
          }

          if (k in byKey) duplicates++;
          byKey[k] = { id: k, status, remarks: remark, idAktif: idp, baris: r + 1, nama: cur.nama || k };
        }
      }

      setBulkModal(prev => ({
        ...prev,
        parsing: false,
        totalRead,
        readyItems: Object.values(byKey),
        skipEmpty,
        skipSame,
        duplicates,
        errors
      }));
    } catch (err) {
      setBulkModal(prev => ({
        ...prev,
        parsing: false,
        fatalError: 'Gagal membaca file Excel: ' + (err.message || err)
      }));
    }
  };

  // Eksekusi pengiriman Bulk Update ke server Starlite
  const handleRunBulkUpdate = async () => {
    if (bulkModal.running || !bulkModal.readyItems.length) return;
    setBulkModal(prev => ({ ...prev, running: true, progress: 5, fatalError: '', resultMsg: '' }));

    try {
      const items = bulkModal.readyItems;
      const batchSize = activeSubTab === 'pre' ? 1000 : 400;
      let totalUpdated = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        if (activeSubTab === 'pre') {
          const payload = batch.map(p => ({
            key: p.key,
            status: p.status,
            remarks: p.remarks,
            idPelanggan: p.idPelanggan,
            stasiun: p.stasiun || ''
          }));
          const res = await bulkUpdatePreRegister(payload);
          totalUpdated += (res.updated?.length || batch.length);
        } else if (activeSubTab === 'wo') {
          const payload = batch.map(p => ({
            id: p.id,
            status: p.status,
            remarks: p.remarks,
            idAktif: p.idAktif
          }));
          const res = await bulkUpdatePortalWo(payload);
          totalUpdated += (res.updated?.length || batch.length);
        } else if (activeSubTab === 'pot') {
          const payload = batch.map(p => ({
            id: p.id,
            status: p.status,
            remarks: p.remarks,
            idAktif: p.idAktif
          }));
          const res = await bulkUpdatePortalPotensial(payload);
          totalUpdated += (res.updated?.length || batch.length);
        }

        const pct = Math.round(((i + batch.length) / items.length) * 100);
        setBulkModal(prev => ({ ...prev, progress: pct }));
      }

      setBulkModal(prev => ({
        ...prev,
        running: false,
        progress: 100,
        readyItems: [],
        resultMsg: `Berhasil memperbarui ${totalUpdated} data pelanggan ke server Starlite.`
      }));

      await loadSubTabData(activeSubTab, true);
    } catch (err) {
      setBulkModal(prev => ({
        ...prev,
        running: false,
        fatalError: err.message || 'Gagal menjalankan bulk update.'
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-fade">
      {/* NOTIFIKASI TOAST (Selalu di depan backdrop & modal) */}
      {toast && ReactDOM.createPortal(
        <div className={`fixed top-5 right-5 z-[10001] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold transition-all ${toast.type === 'error'
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : toast.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
          <Icon
            name={toast.type === 'error' ? 'alert-circle' : toast.type === 'info' ? 'info' : 'check-circle-2'}
            size={17}
            className={toast.type === 'error' ? 'text-rose-600 shrink-0' : toast.type === 'info' ? 'text-blue-600 shrink-0' : 'text-emerald-600 shrink-0'}
          />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 p-1 rounded-lg hover:bg-black/5 text-current"
            aria-label="Tutup notifikasi"
          >
            <Icon name="x" size={14} />
          </button>
        </div>,
        document.body
      )}

      {/* BANNER HEADER & SUB-TAB NAVIGATION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>PT DESNARUM JAYA AKASHA</span>
              </span>
              {currentTabData.lastSync && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>
                    Sinkron: {currentTabData.lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              {currentTabInfo.label}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {currentTabInfo.desc}
            </p>
          </div>

          {/* TOMBOL AKSI UTAMA */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadSubTabData(activeSubTab, true)}
              disabled={currentTabData.loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
              title="Perbarui data terbaru langsung dari portal"
            >
              <Icon name="refresh-cw" size={14} className={currentTabData.loading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
              <span>Muat Ulang Data</span>
            </button>

            <button
              type="button"
              onClick={handleExportKmz}
              disabled={currentTabData.loading || !filteredItems.length}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Unduh titik koordinat pelanggan saat ini dalam format Google Earth (.kmz)"
            >
              <Icon name="map-pin" size={14} />
              <span>Export KMZ</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={currentTabData.loading || !filteredItems.length}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Unduh data saat ini dalam format Excel (.xlsx)"
            >
              <Icon name="file-spreadsheet" size={14} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* 4 SUB-TABS */}
        <div className="flex items-center gap-2 pt-3.5 overflow-x-auto custom-scrollbar">
          {SUB_TABS.map(tab => {
            const isAct = activeSubTab === tab.id;
            const count = tabState[tab.id]?.items?.length || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer border ${isAct
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <Icon name={tab.icon} size={15} className={isAct ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isAct ? 'bg-blue-500 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}>
                    {count.toLocaleString('id-ID')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KARTU KPI INTERAKTIF (KLIK UNTUK FILTER) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Pelanggan */}
        <button
          type="button"
          onClick={() => { setKpiFilter('ALL'); setOpsSubFilter('ALL'); }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${kpiFilter === 'ALL' && opsSubFilter === 'ALL'
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pelanggan</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                {kpiStats.total.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="users" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Seluruh data pada tab {currentTabInfo.shortLabel}
          </p>
        </button>

        {/* 2. Belum Diupdate */}
        <button
          type="button"
          onClick={() => { setKpiFilter(kpiFilter === 'UNUPDATED' ? 'ALL' : 'UNUPDATED'); setOpsSubFilter('ALL'); }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${kpiFilter === 'UNUPDATED'
            ? 'border-amber-500 ring-2 ring-amber-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Belum Diupdate</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {kpiStats.unupdated.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Icon name="clock" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Menunggu update di Portal
          </p>
        </button>

        {/* 3. Status Terupdate */}
        <div
          onClick={() => { setKpiFilter(kpiFilter === 'UPDATED' ? 'ALL' : 'UPDATED'); setOpsSubFilter('ALL'); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setKpiFilter(kpiFilter === 'UPDATED' ? 'ALL' : 'UPDATED'); setOpsSubFilter('ALL'); } }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${kpiFilter === 'UPDATED'
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status Terupdate</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {kpiStats.updated.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Icon name="check-circle-2" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-emerald-700 font-bold">
              {kpiStats.pctUpdated}% selesai diupdate
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBreakdownOpen(true);
              }}
              className="text-[11px] font-bold text-blue-600 hover:underline px-1.5 py-0.5 rounded bg-blue-50"
            >
              Rincian
            </button>
          </div>
        </div>

        {/* 4. Pelanggan Aktif */}
        <button
          type="button"
          onClick={() => { setKpiFilter(kpiFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE'); setOpsSubFilter('ALL'); }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${kpiFilter === 'ACTIVE'
            ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aktif di Portal</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                {kpiStats.active.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Icon name="user-check" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {kpiStats.pctActive}% konversi dari total
          </p>
        </button>

        {/* 5. Cocok dengan Database OpsTracker */}
        <button
          type="button"
          onClick={() => {
            if (kpiFilter === 'MATCHED') {
              setKpiFilter('ALL');
              setOpsSubFilter('ALL');
            } else {
              setKpiFilter('MATCHED');
            }
          }}
          className={`col-span-2 sm:col-span-1 text-left bg-gradient-to-br from-[#1e3a8a] to-[#172554] text-white p-4 rounded-2xl border transition-all cursor-pointer ${kpiFilter === 'MATCHED' || opsSubFilter !== 'ALL'
            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
            : 'border-blue-800 hover:border-blue-600 shadow-xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Cocok di OpsTracker</p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {kpiStats.matchedOps.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 shrink-0">
              <Icon name="Zap" size={20} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold">
            <span className="text-emerald-300">{kpiStats.matchedOpsAktif} Aktif</span>
            {kpiStats.matchedOpsKendala > 0 && (
              <span className="text-rose-300">• {kpiStats.matchedOpsKendala} Kendala</span>
            )}
            {(kpiStats.matchedOpsProses + kpiStats.matchedOpsDismantled) > 0 && (
              <span className="text-blue-200">• {kpiStats.matchedOpsProses + kpiStats.matchedOpsDismantled} Lainnya</span>
            )}
          </div>
        </button>
      </div>

      {/* BAR FILTER & PENCARIAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Input Pencarian */}
          <div className="relative flex-1 min-w-[200px] w-full xl:w-auto">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pelanggan, nomor telepon, alamat, kelurahan, atau ID..."
              className="w-full pl-9 pr-8 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                aria-label="Bersihkan pencarian"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* Grup Filter Dropdown & Toggle Tampilan */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-2.5 w-full xl:w-auto">
            {/* Filter Status Portal */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter berdasarkan status portal"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[200px]"
            >
              <option value="">Semua Status Portal</option>
              <option value="__BELUM__">Belum Diupdate di Portal</option>
              {filterOptions.statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Filter Kota */}
            <select
              value={kotaFilter}
              onChange={(e) => setKotaFilter(e.target.value)}
              aria-label="Filter berdasarkan kota"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[170px]"
            >
              <option value="">Semua Kota ({filterOptions.kotas.length})</option>
              {filterOptions.kotas.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            {/* Filter Stasiun */}
            {filterOptions.stasiuns.length > 0 && (
              <select
                value={stasiunFilter}
                onChange={(e) => setStasiunFilter(e.target.value)}
                aria-label="Filter berdasarkan stasiun"
                className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[190px]"
              >
                <option value="">Semua Stasiun ({filterOptions.stasiuns.length})</option>
                {filterOptions.stasiuns.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {/* Toggle Mode Kartu vs Tabel */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0 sm:ml-auto">
              <button
                type="button"
                onClick={() => setDensityMode('card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${densityMode === 'card' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Icon name="layout-grid" size={13} />
                <span>Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setDensityMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${densityMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Icon name="list" size={13} />
                <span>Tabel</span>
              </button>
            </div>
          </div>
        </div>

        {/* SUB-FILTER RINCIAN STATUS DI OPSTRACKER (Muncul saat filter Cocok di OpsTracker aktif atau setiap saat jika ada data cocok) */}
        {kpiStats.matchedOps > 0 && (kpiFilter === 'MATCHED' || opsSubFilter !== 'ALL') && (
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <Icon name="zap" size={14} className="text-indigo-600 shrink-0" />
                <span>Filter Berdasarkan Status Pelanggan di Database OpsTracker:</span>
              </div>
              {kpiStats.matchedOpsNeedSync > 0 && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full">
                  Ada {kpiStats.matchedOpsNeedSync} pelanggan yang sudah AKTIF di OpsTracker namun belum diupdate Aktif di Portal
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter('ALL'); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <span>Semua Cocok ({kpiStats.matchedOps})</span>
              </button>

              <button
                type="button"
                onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter(opsSubFilter === 'AKTIF' ? 'ALL' : 'AKTIF'); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'AKTIF'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${opsSubFilter === 'AKTIF' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                <span>Sudah Aktif di OpsTracker ({kpiStats.matchedOpsAktif})</span>
              </button>

              {kpiStats.matchedOpsNeedSync > 0 && (
                <button
                  type="button"
                  onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter(opsSubFilter === 'NEED_SYNC' ? 'ALL' : 'NEED_SYNC'); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'NEED_SYNC'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                >
                  <Icon name="alert-circle" size={13} className={opsSubFilter === 'NEED_SYNC' ? 'text-white' : 'text-amber-600'} />
                  <span>Aktif di OpsTracker tapi Belum Update di Portal ({kpiStats.matchedOpsNeedSync})</span>
                </button>
              )}

              {kpiStats.matchedOpsKendala > 0 && (
                <button
                  type="button"
                  onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter(opsSubFilter === 'KENDALA' ? 'ALL' : 'KENDALA'); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'KENDALA'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opsSubFilter === 'KENDALA' ? 'bg-white' : 'bg-rose-500'}`}></span>
                  <span>Terkendala di OpsTracker ({kpiStats.matchedOpsKendala})</span>
                </button>
              )}

              {kpiStats.matchedOpsProses > 0 && (
                <button
                  type="button"
                  onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter(opsSubFilter === 'PROSES' ? 'ALL' : 'PROSES'); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'PROSES'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opsSubFilter === 'PROSES' ? 'bg-white' : 'bg-blue-500'}`}></span>
                  <span>Antrian / Proses IKR ({kpiStats.matchedOpsProses})</span>
                </button>
              )}

              {kpiStats.matchedOpsDismantled > 0 && (
                <button
                  type="button"
                  onClick={() => { setKpiFilter('MATCHED'); setOpsSubFilter(opsSubFilter === 'DISMANTLED' ? 'ALL' : 'DISMANTLED'); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${opsSubFilter === 'DISMANTLED'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opsSubFilter === 'DISMANTLED' ? 'bg-white' : 'bg-purple-500'}`}></span>
                  <span>Dismantled / Suspend ({kpiStats.matchedOpsDismantled})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PANEL AUTO-CEK COVERAGE AREA PEMBANGUNAN & ODP TERDEKAT (UNTUK SEMUA BARIS TANPA BUKA PETA SATU-SATU) */}
        {rawItems.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-800">
                  <Icon name="compass" size={15} className="text-blue-600 shrink-0" />
                  <span>Auto-Cek Area Boundary Pembangunan & ODP Terdekat ({baseFilteredItems.length.toLocaleString('id-ID')} Pelanggan):</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Otomatis menghitung posisi setiap pelanggan terhadap poligon Area Pembangunan dan jarak ke titik ODP terdekat tanpa harus membuka peta satu per satu.
                </p>
              </div>

              {/* Tombol Percepatan Pengisian Massal Berdasarkan Hasil Auto-Cek ODP */}
              {activeSubTab !== 'mgm' && (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all cursor-pointer"
                    title="Unduh file Excel Template Update yang sudah otomatis diisi Status, Stasiun, dan Remarks sesuai hasil Auto-Cek ODP"
                  >
                    <Icon name="file-spreadsheet" size={13} className="text-emerald-600" />
                    <span>Unduh Template Terisi ODP</span>
                  </button>

                  {coverageStats.unupdatedOutAndFull > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePrepareAutoBulkUpdate('OUT_AND_FULL')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition-all cursor-pointer"
                      title="Siapkan pengiriman massal untuk pelanggan belum diupdate yang berada Di Luar Radius Pembangunan atau ODP Penuh"
                    >
                      <Icon name="zap" size={13} />
                      <span>Auto-Update Luar Radius & ODP Full ({coverageStats.unupdatedOutAndFull})</span>
                    </button>
                  )}

                  {coverageStats.unupdatedTotalWithRec > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePrepareAutoBulkUpdate('ALL_AUTO')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer"
                      title="Siapkan pengiriman massal untuk seluruh pelanggan belum diupdate sesuai rekomendasi ODP & OpsTracker"
                    >
                      <Icon name="check-circle-2" size={13} />
                      <span>Auto-Update Semua Rekomendasi ({coverageStats.unupdatedTotalWithRec})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Barisan Tombol Filter Kategori Hasil Auto-Cek ODP */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setCoverageFilter('ALL')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                <span>Semua ({coverageStats.ALL})</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverageFilter(coverageFilter === 'TERCOVER_ODP' ? 'ALL' : 'TERCOVER_ODP')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'TERCOVER_ODP'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${coverageFilter === 'TERCOVER_ODP' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                <span>Tercover ODP &le; 250m ({coverageStats.TERCOVER_ODP})</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverageFilter(coverageFilter === 'ODP_MEDIUM' ? 'ALL' : 'ODP_MEDIUM')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'ODP_MEDIUM'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${coverageFilter === 'ODP_MEDIUM' ? 'bg-white' : 'bg-sky-500'}`}></span>
                <span>ODP 251-500m ({coverageStats.ODP_MEDIUM})</span>
              </button>

              {coverageStats.ODP_FULL > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverageFilter(coverageFilter === 'ODP_FULL' ? 'ALL' : 'ODP_FULL')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'ODP_FULL'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${coverageFilter === 'ODP_FULL' ? 'bg-white' : 'bg-amber-500'}`}></span>
                  <span>ODP Penuh &le; 250m ({coverageStats.ODP_FULL})</span>
                </button>
              )}

              {coverageStats.IN_BOUNDARY_NO_ODP > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverageFilter(coverageFilter === 'IN_BOUNDARY_NO_ODP' ? 'ALL' : 'IN_BOUNDARY_NO_ODP')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'IN_BOUNDARY_NO_ODP'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${coverageFilter === 'IN_BOUNDARY_NO_ODP' ? 'bg-white' : 'bg-purple-500'}`}></span>
                  <span>Dalam Boundary / ODP &gt; 500m ({coverageStats.IN_BOUNDARY_NO_ODP})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCoverageFilter(coverageFilter === 'OUT_OF_RADIUS' ? 'ALL' : 'OUT_OF_RADIUS')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'OUT_OF_RADIUS'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${coverageFilter === 'OUT_OF_RADIUS' ? 'bg-white' : 'bg-rose-500'}`}></span>
                <span>Di Luar Radius &gt; 500m ({coverageStats.OUT_OF_RADIUS})</span>
              </button>

              {coverageStats.NO_COORDS > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverageFilter(coverageFilter === 'NO_COORDS' ? 'ALL' : 'NO_COORDS')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${coverageFilter === 'NO_COORDS'
                    ? 'bg-slate-600 text-white border-slate-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <span>Tanpa Koordinat ({coverageStats.NO_COORDS})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Info jumlah hasil & tombol Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredItems.length.toLocaleString('id-ID')}</strong> dari{' '}
              <strong className="text-slate-800">{rawItems.length.toLocaleString('id-ID')}</strong> pelanggan
            </span>
            {kpiFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span>Filter KPI: {kpiFilter}</span>
                <button type="button" onClick={() => { setKpiFilter('ALL'); setOpsSubFilter('ALL'); }} className="hover:text-blue-900" aria-label="Hapus filter KPI">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {opsSubFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>Status OpsTracker: {opsSubFilter}</span>
                <button type="button" onClick={() => setOpsSubFilter('ALL')} className="hover:text-indigo-900" aria-label="Hapus sub-filter OpsTracker">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {coverageFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span>Filter Coverage: {coverageFilter}</span>
                <button type="button" onClick={() => setCoverageFilter('ALL')} className="hover:text-emerald-950" aria-label="Hapus filter coverage">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <Icon name="rotate-ccw" size={13} />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* KONTEN DAFTAR PELANGGAN */}
      {currentTabData.loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-48 bg-slate-200 rounded"></div>
                <div className="h-6 w-28 bg-slate-200 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-3 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
                <div className="h-3 w-full bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : currentTabData.error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Icon name="alert-triangle" size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Gagal Memuat Data Portal</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">{currentTabData.error}</p>
          <button
            type="button"
            onClick={() => loadSubTabData(activeSubTab, true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            <Icon name="refresh-cw" size={14} />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Icon name="inbox" size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak Ada Data yang Cocok</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Tidak ditemukan pelanggan yang sesuai dengan kata kunci atau filter yang dipilih.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <Icon name="rotate-ccw" size={14} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      ) : densityMode === 'card' ? (
        /* TAMPILAN KARTU NYAMAN */
        <div className="space-y-3">
          {paginatedItems.map((item) => {
            const itemKey = `${activeSubTab}_${item.rowId || item.idPelanggan || item.rowNum || item.index}`;
            const primaryStatus = getRowPrimaryStatus(activeSubTab, item);
            const badge = getStatusBadgeStyle(primaryStatus);
            const matchedCustomer = findOpsTrackerMatch(item);
            const effectivePhone = item.telepon || matchedCustomer?.nomorHp || '';
            const waNumber = formatWaNumber(effectivePhone);
            const coords = parseValidCoords(item.latitude, item.longitude) || parseValidCoords(matchedCustomer?.latitude, matchedCustomer?.longitude);
            const opsInfo = getOpsTrackerStatusInfo(matchedCustomer);
            const covInfo = getItemCoverage(item);
            const isUpd = isRowUpdated(activeSubTab, item);
            const isNeedSyncToPortal = Boolean(opsInfo?.category === 'AKTIF' && !isRowActiveStatus(activeSubTab, item));
            const isHistOpen = Boolean(expandedHistoryMap[itemKey]);
            const effectiveStasiun = getEffectiveItemStation(item);

            return (
              <div
                key={itemKey}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs p-4 sm:p-5 transition-all space-y-3.5"
              >
                {/* Baris Atas Kartu */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                        {activeSubTab === 'mgm'
                          ? (item.namaMember || item.nama || '(Tanpa Nama)')
                          : (item.nama || item.namaMember || '(Tanpa Nama)')}
                      </h3>
                      {activeSubTab === 'mgm' ? (
                        <>
                          {item.idMember && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              ID Member: {item.idMember}
                            </span>
                          )}
                          {item.idDidaftarkan && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              ID Didaftarkan: {item.idDidaftarkan} ({item.namaDidaftarkan || '-'})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {(item.idPelanggan || item.idMember) && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              ID Portal: {item.idPelanggan || item.idMember}
                            </span>
                          )}
                          {item.idPelangganAktif && item.idPelangganAktif !== item.idPelanggan && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ID Aktif: {item.idPelangganAktif}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Nomor Telepon, WhatsApp, & Lokasi */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
                        >
                          <Icon name="phone" size={13} className="text-emerald-600" />
                          <span>{effectivePhone}</span>
                        </a>
                      )}
                      {item.kota && (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                          <Icon name="map-pin" size={13} className="text-slate-400" />
                          <span>{[item.kelurahan, item.kecamatan, item.kota].filter(Boolean).join(', ')}</span>
                        </span>
                      )}
                      {effectiveStasiun && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                          <Icon name="radio" size={12} />
                          <span>Stasiun: {effectiveStasiun}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Portal Badge & Tombol Update */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Status di Portal
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {!isUpd && covInfo?.hasCoords && activeSubTab !== 'mgm' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item, 'odp')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                        title="Buka form update yang langsung terisi otomatis berdasarkan hasil Auto-Cek ODP Terdekat"
                      >
                        <Icon name="compass" size={13} />
                        <span>Isi Sesuai ODP</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer"
                    >
                      <Icon name="edit-3" size={13} />
                      <span>Update</span>
                    </button>
                  </div>
                </div>

                {/* Banner Hasil Auto-Cek Coverage Area & ODP Terdekat */}
                {covInfo?.hasCoords && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                        <Icon name="compass" size={13} className="text-blue-600 shrink-0" />
                        <span>Auto-Cek Coverage:</span>
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${covInfo.badgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${covInfo.dotColor}`}></span>
                        <span>{covInfo.badgeLabel}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${covInfo.inBoundary
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {covInfo.inBoundary ? 'Masuk Poligon Boundary' : 'Luar Poligon Boundary'}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {covInfo.subText}
                      </span>
                    </div>

                    {covInfo.recommendedPreStatus && activeSubTab === 'pre' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-500">
                          Saran Status: <strong className="text-slate-800">{covInfo.recommendedPreStatus}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Banner Auto-Match dengan Database OpsTracker (Lengkap dengan Status Aktual di OpsTracker) */}
                {matchedCustomer && opsInfo && (
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs ${isNeedSyncToPortal
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-indigo-50/70 border-indigo-200'
                    }`}>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-extrabold text-slate-800">
                          <Icon name="database" size={14} className="text-indigo-600 shrink-0" />
                          <span>Data di OpsTracker:</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-white text-indigo-800 border border-indigo-200">
                          ID: {matchedCustomer.idPelanggan}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${opsInfo.bg}`}>
                          <span className={`w-2 h-2 rounded-full ${opsInfo.dot}`}></span>
                          <span>Status OpsTracker: {opsInfo.label}</span>
                        </span>
                        {isNeedSyncToPortal && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Icon name="alert-circle" size={12} className="text-amber-700" />
                            <span>Status Portal Belum Diupdate Aktif</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                        <span>Nama: <strong className="text-slate-800">{matchedCustomer.namaPelanggan || '-'}</strong></span>
                        <span>Stasiun: <strong className="text-slate-800">{matchedCustomer.stasiun || '-'}</strong></span>
                        {matchedCustomer.odpAktual && (
                          <span>ODP: <strong className="font-mono text-slate-800">{matchedCustomer.odpAktual}</strong></span>
                        )}
                        <span className="text-slate-700 font-medium">({opsInfo.subText})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs shrink-0 self-start sm:self-center cursor-pointer"
                      title="Buka form update dengan status, ID Pelanggan, dan Stasiun yang langsung terisi dari OpsTracker"
                    >
                      <Icon name="zap" size={13} />
                      <span>Sesuaikan ke Portal</span>
                    </button>
                  </div>
                )}

                {/* Grid Informasi Detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Alamat Lengkap</span>
                    <p className="text-slate-700 font-medium mt-0.5 leading-relaxed">
                      {item.alamat || '-'}
                    </p>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {activeSubTab === 'mgm' ? 'Pelanggan yang Didaftarkan' : 'Catatan / Remarks Mitra'}
                    </span>
                    <p className="text-slate-700 font-medium mt-0.5">
                      {activeSubTab === 'mgm'
                        ? `${item.namaDidaftarkan || '-'} (${item.idDidaftarkan || 'Belum ada ID'})`
                        : (item.remarks || item.updRemarks || item.catatanData || '-')}
                    </p>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Koordinat & Peta</span>
                    {coords ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenMapModal(item, coords)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition-all cursor-pointer"
                          title="Buka pop-up peta interaktif & cek ODP terdekat langsung di halaman ini"
                        >
                          <Icon name="map" size={12} />
                          <span>Pop-Up Peta & ODP</span>
                        </button>
                        <a
                          href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
                        >
                          <Icon name="external-link" size={12} />
                          <span>Google Maps</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic mt-0.5 block">Koordinat belum tersedia</span>
                    )}
                  </div>
                </div>

                {/* Footer Kartu: Info Update Terakhir & Riwayat */}
                {(item.terakhirDiupdate || item.riwayatStatus || item.tanggalDaftar) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex flex-wrap items-center gap-3">
                      {item.tanggalDaftar && (
                        <span>Tanggal Daftar: <strong className="text-slate-700">{item.tanggalDaftar}</strong></span>
                      )}
                      {item.terakhirDiupdate && (
                        <span>Terakhir Diupdate: <strong className="text-slate-700">{item.terakhirDiupdate}</strong></span>
                      )}
                    </div>

                    {item.riwayatStatus && (
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryMap(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                        className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-blue-600 cursor-pointer"
                      >
                        <Icon name="history" size={12} />
                        <span>{isHistOpen ? 'Sembunyikan Riwayat' : 'Lihat Riwayat Update'}</span>
                      </button>
                    )}
                  </div>
                )}

                {isHistOpen && item.riwayatStatus && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1 font-mono whitespace-pre-line">
                    {item.riwayatStatus}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TAMPILAN TABEL PADAT (PAS 100% LEBAR LAYAR TANPA HORIZONTAL SCROLL & TANPA TERPOTONG) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="w-full">
            <table className="w-full text-left border-collapse text-xs" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '3.5%' }} />
                <col style={{ width: '15.5%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pl-2.5 pr-1">No</th>
                  <th className="py-3 px-2">Pelanggan & WA</th>
                  <th className="py-3 px-2">Lokasi & Alamat</th>
                  <th className="py-3 px-2">Auto-Cek Area & ODP</th>
                  <th className="py-3 px-2">Status OpsTracker</th>
                  <th className="py-3 px-2">Status Portal</th>
                  <th className="py-3 pl-1.5 pr-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const primaryStatus = getRowPrimaryStatus(activeSubTab, item);
                  const badge = getStatusBadgeStyle(primaryStatus);
                  const matchedCustomer = findOpsTrackerMatch(item);
                  const effectivePhone = item.telepon || matchedCustomer?.nomorHp || '';
                  const waNumber = formatWaNumber(effectivePhone);
                  const coords = parseValidCoords(item.latitude, item.longitude) || parseValidCoords(matchedCustomer?.latitude, matchedCustomer?.longitude);
                  const opsInfo = getOpsTrackerStatusInfo(matchedCustomer);
                  const covInfo = getItemCoverage(item);
                  const isUpd = isRowUpdated(activeSubTab, item);
                  const isNeedSyncToPortal = Boolean(opsInfo?.category === 'AKTIF' && !isRowActiveStatus(activeSubTab, item));
                  const effectiveStasiun = getEffectiveItemStation(item);
                  const remarkText = item.remarks || item.updRemarks || '';

                  return (
                    <tr key={idx} className={`transition-colors align-middle ${isNeedSyncToPortal ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
                      {/* 1. NO */}
                      <td className="py-2.5 pl-2.5 pr-1 font-mono text-[11px] text-slate-400">
                        {rowNumber}
                      </td>

                      {/* 2. PELANGGAN & TELEPON/WA */}
                      <td className="py-2.5 px-2 min-w-0">
                        {activeSubTab === 'mgm' ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 leading-snug truncate" title={item.namaMember}>
                              {item.namaMember || '-'} <span className="font-mono text-[10px] text-slate-500">({item.idMember || '-'})</span>
                            </div>
                            <div className="text-[11px] text-blue-700 font-semibold truncate" title={item.namaDidaftarkan}>
                              Ref: {item.namaDidaftarkan || '-'} <span className="font-mono font-bold">({item.idDidaftarkan || '-'})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-slate-800 leading-snug truncate" title={item.nama || item.namaMember}>
                              {item.nama || item.namaMember || '-'}
                            </div>
                            {(item.idPelanggan || item.idPelangganAktif || item.idMember) && (
                              <div className="text-[10px] font-mono text-slate-500 truncate">
                                ID: {item.idPelangganAktif || item.idPelanggan || item.idMember}
                              </div>
                            )}
                          </div>
                        )}
                        {waNumber ? (
                          <a
                            href={`https://wa.me/${waNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 font-bold text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1 max-w-full"
                          >
                            <Icon name="phone" size={11} className="shrink-0" />
                            <span className="truncate">{effectivePhone}</span>
                          </a>
                        ) : effectivePhone ? (
                          <div className="mt-0.5 text-[11px] text-slate-500 truncate">{effectivePhone}</div>
                        ) : null}
                      </td>

                      {/* 3. LOKASI (KOTA • STASIUN) & ALAMAT */}
                      <td className="py-2.5 px-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 text-[11px] leading-tight">
                          <span className="font-bold text-slate-700">{item.kota || '-'}</span>
                          {effectiveStasiun && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-extrabold text-blue-600">{effectiveStasiun}</span>
                            </>
                          )}
                        </div>
                        <p
                          className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 break-words leading-snug"
                          title={item.alamat || '-'}
                        >
                          {item.alamat || '-'}
                        </p>
                      </td>

                      {/* 4. AUTO-CEK AREA & ODP TERDEKAT */}
                      <td className="py-2.5 px-2 min-w-0">
                        {covInfo?.hasCoords ? (
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold border max-w-full ${covInfo.badgeBg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${covInfo.dotColor}`}></span>
                                <span className="truncate">{covInfo.badgeLabel}</span>
                              </span>
                              {covInfo.inBoundary && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200">
                                  Boundary
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium line-clamp-2 break-words leading-tight" title={covInfo.subText}>
                              {covInfo.subText}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tanpa koordinat</span>
                        )}
                      </td>

                      {/* 5. STATUS DI OPSTRACKER */}
                      <td className="py-2.5 px-2 min-w-0">
                        {matchedCustomer && opsInfo ? (
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                {matchedCustomer.idPelanggan}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border max-w-full ${opsInfo.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opsInfo.dot}`}></span>
                                <span className="truncate">{opsInfo.label}</span>
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate" title={opsInfo.subText}>
                              {opsInfo.subText}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum terdaftar</span>
                        )}
                      </td>

                      {/* 6. STATUS DI PORTAL STARLITE & REMARKS */}
                      <td className="py-2.5 px-2 min-w-0">
                        <div className="space-y-0.5 min-w-0">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border max-w-full ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`}></span>
                            <span className="truncate" title={badge.label}>{badge.label}</span>
                          </span>
                          {isNeedSyncToPortal && (
                            <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                              <Icon name="alert-circle" size={10} className="text-amber-600 shrink-0" />
                              <span className="truncate">Perlu update Aktif</span>
                            </div>
                          )}
                          {remarkText && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 break-words leading-tight" title={remarkText}>
                              {remarkText}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 7. AKSI */}
                      <td className="py-2.5 pl-1 pr-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {coords && (
                            <button
                              type="button"
                              onClick={() => handleOpenMapModal(item, coords)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer shrink-0"
                              title="Buka Pop-Up Peta & Cek ODP Coverage langsung di halaman ini"
                            >
                              <Icon name="map" size={12} />
                            </button>
                          )}
                          {isNeedSyncToPortal ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item, true)}
                              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shrink-0"
                              title="Isi otomatis status Aktif & ID Pelanggan dari OpsTracker"
                            >
                              <Icon name="zap" size={10} />
                              <span>Sinkron</span>
                            </button>
                          ) : (!isUpd && covInfo?.hasCoords && activeSubTab !== 'mgm' && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item, 'odp')}
                              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 cursor-pointer shrink-0"
                              title={`Isi otomatis: ${covInfo.recommendedPreStatus || covInfo.badgeLabel}`}
                            >
                              <Icon name="compass" size={10} className="text-emerald-600" />
                              <span>Isi ODP</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 cursor-pointer shrink-0"
                          >
                            <Icon name="edit-3" size={10} />
                            <span>Update</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINASI */}
      {!currentTabData.loading && filteredItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <span className="text-xs text-slate-500">
            Halaman <strong className="text-slate-800">{currentPage}</strong> dari <strong className="text-slate-800">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <span>Selanjutnya</span>
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL UPDATE STATUS PELANGGAN (WRITE LANGSUNG KE SERVER STARLITE) */}
      {editModalData && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/70 animate-fade" onClick={() => !isSavingEdit && setEditModalData(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#1e3a8a] to-[#172554] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10">
                  <Icon name="edit-3" size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Update Status {currentTabInfo.shortLabel}</h3>
                  <p className="text-[11px] text-blue-200">Tersimpan langsung ke database pusat</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditModalData(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
                aria-label="Tutup modal"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Info Pelanggan */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-sm font-extrabold text-slate-800">
                  {editModalData.item.nama || editModalData.item.namaMember || '-'}
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                  {editModalData.item.telepon && <span>Telp: <strong>{editModalData.item.telepon}</strong></span>}
                  {editModalData.item.kota && <span>Kota: <strong>{editModalData.item.kota}</strong></span>}
                  {editModalData.item.idPelanggan && <span>ID: <strong>{editModalData.item.idPelanggan}</strong></span>}
                </div>
                {editModalData.item.alamat && (
                  <p className="text-xs text-slate-500 pt-1">{editModalData.item.alamat}</p>
                )}
              </div>

              {/* Tombol Auto-Fill Pintar dari Hasil Auto-Cek Coverage & ODP Terdekat */}
              {editModalData.coverageInfo?.hasCoords && activeSubTab !== 'mgm' && (
                <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs text-slate-800 space-y-1">
                    <div className="font-bold flex flex-wrap items-center gap-1.5">
                      <Icon name="compass" size={14} className="text-blue-600 shrink-0" />
                      <span>Hasil Auto-Cek ODP:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${editModalData.coverageInfo.badgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${editModalData.coverageInfo.dotColor}`}></span>
                        <span>{editModalData.coverageInfo.badgeLabel}</span>
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {editModalData.coverageInfo.subText}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillFromOdp}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shrink-0 cursor-pointer"
                  >
                    Isi Sesuai ODP
                  </button>
                </div>
              )}

              {/* Tombol Auto-Fill Pintar jika cocok dengan OpsTracker */}
              {editModalData.matchedCustomer && (() => {
                const modalOpsInfo = getOpsTrackerStatusInfo(editModalData.matchedCustomer);
                return (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs text-indigo-900 space-y-1">
                      <div className="font-bold flex flex-wrap items-center gap-1.5">
                        <Icon name="database" size={14} className="text-indigo-600 shrink-0" />
                        <span>Data di OpsTracker:</span>
                        <span className="px-1.5 py-0.5 rounded font-mono font-extrabold bg-white text-indigo-800 border border-indigo-200">
                          {editModalData.matchedCustomer.idPelanggan}
                        </span>
                        {modalOpsInfo && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${modalOpsInfo.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${modalOpsInfo.dot}`}></span>
                            <span>{modalOpsInfo.label}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-slate-600">
                        Stasiun: <strong className="text-slate-800">{editModalData.matchedCustomer.stasiun || '-'}</strong>
                        {modalOpsInfo?.subText && <span> • {modalOpsInfo.subText}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillFromOpsTracker}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 cursor-pointer"
                    >
                      Isi Otomatis
                    </button>
                  </div>
                );
              })()}

              {/* Pilihan Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Status Pelanggan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Pilih Status --</option>
                  {activeSubTab === 'pre' && PRE_REGISTER_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt === 'Proses Aktivasi' || opt === 'Sudah Aktif' ? `   ↳ ${opt}` : opt}
                    </option>
                  ))}
                  {activeSubTab === 'wo' && WO_PORTAL_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{cleanStatusNumberPrefix(opt)}</option>
                  ))}
                  {activeSubTab === 'mgm' && MGM_PORTAL_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {activeSubTab === 'pot' && POTENSIAL_PORTAL_STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{cleanStatusNumberPrefix(opt)}</option>
                  ))}
                </select>
              </div>

              {/* Input Stasiun (Khusus Pre-Register) */}
              {activeSubTab === 'pre' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Stasiun
                  </label>
                  <input
                    type="text"
                    list="stasiun-portal-options"
                    value={editForm.stasiun}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stasiun: e.target.value.toUpperCase() }))}
                    placeholder="Ketik atau pilih stasiun (misal: KRADENAN)..."
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                  <datalist id="stasiun-portal-options">
                    {STASIUN_DESNARUM_LIST.map(st => (
                      <option key={st} value={st} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* Input ID Pelanggan (Muncul saat Status Aktif dipilih) */}
              {((activeSubTab === 'pre' && editForm.status === 'Sudah Aktif') ||
                (activeSubTab === 'wo' && editForm.status === '14. AKTIF') ||
                (activeSubTab === 'mgm' && editForm.status === 'AKTIF') ||
                (activeSubTab === 'pot' && editForm.status === '07. AKTIF')) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      ID Pelanggan Aktif <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.idPelanggan}
                      onChange={(e) => setEditForm(prev => ({ ...prev, idPelanggan: e.target.value }))}
                      placeholder="Masukkan ID Pelanggan..."
                      className="w-full px-3.5 py-2.5 min-h-[42px] bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                )}

              {/* Input Remarks */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Remarks / Catatan Tindak Lanjut
                </label>
                <textarea
                  rows={3}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Tulis keterangan hasil kontak atau kendala di lapangan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none resize-y"
                />
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <Icon name="alert-circle" size={15} className="text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditModalData(null)}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <>
                      <Icon name="loader-2" size={14} className="animate-spin" />
                      <span>Menyimpan ke Server...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL RINCIAN DISTRIBUSI STATUS */}
      {isBreakdownOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/70 animate-fade" onClick={() => setIsBreakdownOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Rincian Distribusi Status</h3>
                <p className="text-xs text-slate-500">
                  {currentTabInfo.label} ({kpiStats.total.toLocaleString('id-ID')} pelanggan)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Tutup rincian"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="p-5 space-y-2.5 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {Object.entries(kpiStats.statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([stName, count]) => {
                  const pct = kpiStats.total > 0 ? Math.round((count / kpiStats.total) * 100) : 0;
                  return (
                    <button
                      key={stName}
                      type="button"
                      onClick={() => {
                        setStatusFilter(stName === 'Belum Diupdate' ? '__BELUM__' : stName);
                        setIsBreakdownOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{stName}</span>
                        <span className="text-blue-600">{count.toLocaleString('id-ID')} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL UNGGAH UPDATE MASSAL (BULK EXCEL / AUTO-UPDATE ODP) */}
      {bulkModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/70 animate-fade" onClick={() => !bulkModal.running && setBulkModal(prev => ({ ...prev, open: false }))}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-[96vw] max-w-5xl relative z-10 animate-modal flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Icon name="upload" size={18} className="text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  Unggah Update Massal ({currentTabInfo.shortLabel})
                </h3>
              </div>
              <button
                type="button"
                disabled={bulkModal.running}
                onClick={() => setBulkModal(prev => ({ ...prev, open: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                aria-label="Tutup modal bulk"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm flex-1 min-h-0">
              {bulkModal.parsing ? (
                <div className="py-8 text-center space-y-2">
                  <Icon name="loader-2" size={24} className="animate-spin text-blue-600 mx-auto" />
                  <p className="font-semibold text-slate-700">Membaca dan memvalidasi file Excel...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 block">Baris Terbaca</span>
                      <strong className="text-lg font-extrabold text-slate-800">{bulkModal.totalRead}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs text-emerald-700 block">Siap Diupdate</span>
                      <strong className="text-lg font-extrabold text-emerald-800">{bulkModal.readyItems.length}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-500 block">Dilewati (Sama/Kosong)</span>
                      <strong className="text-lg font-extrabold text-slate-700">{bulkModal.skipEmpty + bulkModal.skipSame}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-xs text-rose-700 block">Baris Error</span>
                      <strong className="text-lg font-extrabold text-rose-800">{bulkModal.errors.length}</strong>
                    </div>
                  </div>

                  {bulkModal.running && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-blue-700">
                        <span>Mengirim pembaruan ke server...</span>
                        <span>{bulkModal.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${bulkModal.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {bulkModal.resultMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                      <Icon name="check-circle-2" size={16} className="text-emerald-600 shrink-0" />
                      <span>{bulkModal.resultMsg}</span>
                    </div>
                  )}

                  {bulkModal.fatalError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
                      <Icon name="alert-circle" size={16} className="text-rose-600 shrink-0" />
                      <span>{bulkModal.fatalError}</span>
                    </div>
                  )}

                  {bulkModal.readyItems.length > 0 && !bulkModal.running && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                          Pratinjau Data yang Siap Diupdate ({bulkModal.readyItems.length} pelanggan):
                        </p>
                        <span className="text-[11px] text-slate-500">
                          Gulir ke bawah untuk memeriksa seluruh daftar
                        </span>
                      </div>
                      <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-xl custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                            <tr>
                              <th className="py-2.5 px-3 w-12">No</th>
                              <th className="py-2.5 px-3.5 min-w-[180px]">Pelanggan</th>
                              <th className="py-2.5 px-3.5 min-w-[190px]">Status Baru</th>
                              <th className="py-2.5 px-3 min-w-[115px]">Stasiun</th>
                              <th className="py-2.5 px-3.5 min-w-[280px]">Remarks / Keterangan Lengkap</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkModal.readyItems.map((it, i) => (
                              <tr key={i} className="hover:bg-slate-50/90 align-top">
                                <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-800 whitespace-normal leading-snug">
                                  {it.nama}
                                  {it.idPelanggan && (
                                    <span className="block text-[11px] font-mono text-emerald-700 mt-0.5">
                                      ID Aktif: {it.idPelanggan}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3.5 font-bold text-blue-700 whitespace-normal leading-snug">
                                  {it.status}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-slate-700 whitespace-nowrap">
                                  {it.stasiun || '-'}
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-600 whitespace-normal leading-relaxed">
                                  {it.remarks || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {bulkModal.errors.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-rose-700">
                        Daftar Baris Tidak Valid ({bulkModal.errors.length} baris dilewati):
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                            <tr>
                              <th className="py-2 px-3 w-16">Baris</th>
                              <th className="py-2 px-3.5 min-w-[180px]">Pelanggan</th>
                              <th className="py-2 px-3.5">Keterangan Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkModal.errors.map((er, i) => (
                              <tr key={i} className="align-top">
                                <td className="py-2 px-3 font-mono">{er.baris}</td>
                                <td className="py-2 px-3.5 font-semibold whitespace-normal">{er.nama}</td>
                                <td className="py-2 px-3.5 text-rose-600 whitespace-normal">{er.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={bulkModal.running}
                onClick={() => setBulkModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              {bulkModal.readyItems.length > 0 && (
                <button
                  type="button"
                  disabled={bulkModal.running}
                  onClick={handleRunBulkUpdate}
                  className="inline-flex items-center gap-1.5 px-5 py-2 min-h-[40px] rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <Icon name="check" size={14} />
                  <span>Proses {bulkModal.readyItems.length} Update</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* POP-UP PETA INTERAKTIF & CEK ODP COVERAGE */}
      {mapModalData && (
        <CoverageMapPopupModal
          modalData={mapModalData}
          odpData={odpData}
          activeSubTab={activeSubTab}
          onClose={() => setMapModalData(null)}
          onQuickUpdateFromMap={handleQuickUpdateFromMap}
        />
      )}
    </div>
  );
}

export default PreRegisterPortalView;

