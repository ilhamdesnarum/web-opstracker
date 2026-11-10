// =========================================================================
// SERVICE: STARLITE LIVE COVERAGE API
// =========================================================================
// Menarik data Polygon Boundary Area Coverage secara langsung & adaptif
// dari API Partner Starlite Indonesia, dengan fallback ke static JSON lokal.
// =========================================================================

import staticBoundaries from '../data/coverageBoundaries.json';

const MASTER_PARTNER_ID = "1b228fd2d2f880e382595938b2ccdd913b17acab6ca74e5cc178717e57ed1524c7294159984c7870b26c45e9c9bc9d5a";

const DEFAULT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc5MjA0MjM4MCwiZXhwIjoxODIzNTc4MzgwfQ.gwPy7CC5ct1I_vCp1-74DUrNgrAI8B9FsUR3EkPh_-c";

/**
 * Dapatkan token yang valid dari env atau default
 */
export function getPartnerToken() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STARLITE_PARTNER_TOKEN) {
    return import.meta.env.VITE_STARLITE_PARTNER_TOKEN;
  }
  return DEFAULT_TOKEN;
}

/**
 * Dapatkan base URL API Partner dengan proxy lokal Vite saat dev/browser
 */
export function getCoverageApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.');
    if (isLocalhost || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) {
      return '/api-mitra/app/coverage/kml';
    }
  }
  return 'https://api-mitra.starliteindonesia.com/app/coverage/kml';
}

/**
 * Parsing string format lokasi ((lng,lat),(lng,lat)...) ke array koordinat [lat, lng] untuk Leaflet
 */
export function parseLocationToLeafletCoords(locStr) {
  if (!locStr || typeof locStr !== 'string') return [];
  
  try {
    // Bersihkan kurung pembuka dan penutup terluar: ((...))
    const trimmed = locStr.trim().replace(/^\(+/, '').replace(/\)+$/, '');
    if (!trimmed) return [];

    // Pisahkan tiap pasangan (lng, lat)
    const pairs = trimmed.split('),(');
    const coords = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].replace(/[()]/g, '').trim();
      const parts = pair.split(',');
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0].trim());
        const lat = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          coords.push([lat, lng]);
        }
      }
    }

    return coords;
  } catch (err) {
    console.warn("Gagal parse koordinat coverage:", err);
    return [];
  }
}

// In-memory cache
let coverageCache = {
  timestamp: 0,
  data: []
};

/**
 * Tarik data Boundary Coverage langsung dari API Partner Starlite
 * @param {boolean} forceRefresh - Abaikan cache jika true
 * @returns {Promise<{ success: boolean, isLive: boolean, count: number, data: Array, lastSync?: Date, error?: string }>}
 */
export async function fetchLiveCoverageBoundaries(forceRefresh = false) {
  const now = Date.now();

  // Cache 5 menit di memory
  if (!forceRefresh && (now - coverageCache.timestamp < 300000) && coverageCache.data.length > 0) {
    return {
      success: true,
      isLive: true,
      count: coverageCache.data.length,
      data: coverageCache.data,
      lastSync: new Date(coverageCache.timestamp)
    };
  }

  // Cek localStorage cache jika ada
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('starlite_live_coverage_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp && (now - parsed.timestamp < 3600000) && Array.isArray(parsed.data) && parsed.data.length > 0) {
          coverageCache = parsed;
          return {
            success: true,
            isLive: true,
            count: parsed.data.length,
            data: parsed.data,
            lastSync: new Date(parsed.timestamp)
          };
        }
      }
    } catch (_e) {}
  }

  const token = getPartnerToken();
  const baseUrl = getCoverageApiBaseUrl();
  const url = `${baseUrl}?master_partner_id=${MASTER_PARTNER_ID}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        'Authorization': token,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Partner API returned status ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const rawList = Array.isArray(json?.data) ? json.data : [];

    // Transformasi data ke struktur Leaflet Polygon yang seragam
    const parsedFeatures = rawList
      .map((item, idx) => {
        const coords = parseLocationToLeafletCoords(item.location);
        if (coords.length < 3) return null; // Polygon butuh min 3 titik

        return {
          id: item.id || `live_cov_${idx + 1}`,
          name: item.name || `Coverage Area ${idx + 1}`,
          description: `Partner: ${item.name || '-'} | Status: ${item.status ? 'Aktif' : 'Nonaktif'}`,
          status: item.status,
          coordinates: coords,
          isLive: true
        };
      })
      .filter(Boolean);

    if (parsedFeatures.length === 0) {
      throw new Error("API Partner tidak mengembalikan koordinat area yang valid");
    }

    // Update in-memory & localStorage cache
    coverageCache = {
      timestamp: Date.now(),
      data: parsedFeatures
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('starlite_live_coverage_cache', JSON.stringify(coverageCache));
      } catch (_e) {}
    }

    return {
      success: true,
      isLive: true,
      count: parsedFeatures.length,
      data: parsedFeatures,
      lastSync: new Date(coverageCache.timestamp)
    };
  } catch (error) {
    console.warn("⚠️ Gagal menarik live coverage dari API Partner, menggunakan fallback static:", error.message);

    // Fallback 1: Gunakan cache lama jika pernah tersimpan
    if (coverageCache.data.length > 0) {
      return {
        success: true,
        isLive: true,
        count: coverageCache.data.length,
        data: coverageCache.data,
        lastSync: new Date(coverageCache.timestamp),
        warning: `Menggunakan cache: ${error.message}`
      };
    }

    // Fallback 2: Gunakan staticBoundaries dari coverageBoundaries.json
    return {
      success: true,
      isLive: false,
      count: staticBoundaries.length,
      data: staticBoundaries,
      warning: `Offline fallback: ${error.message}`
    };
  }
}
