import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const MASTER_PARTNER_ID = "1b228fd2d2f880e382595938b2ccdd913b17acab6ca74e5cc178717e57ed1524c7294159984c7870b26c45e9c9bc9d5a";
const DEFAULT_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ODA4N2Q5LTQ3MjItNDMxMi05OTAzLTg0YzJhYTViYmU0NiIsIm5hbWUiOiJBREkgUFJBU0VUWU8iLCJwaG9uZV9udW1iZXIiOiI2MjgxMjM0NTY5NSIsImVtYWlsIjoic3VwcG9ydEByYW5ldC5pZCIsInBhcnRuZXJfbWFzdGVyX2lkIjpbImZjN2E0YTFkLWY2ZDMtNGQxNi05MDBkLTFhYTk3MTU0OGFkMSJdLCJwYXJ0bmVyX25hbWUiOlsiREVTTkFSVU0gSkFZQSBBS0FTSEEiXSwibGFzdF9wYXNzd29yZF91cGRhdGUiOm51bGwsImlhdCI6MTc5MjA0MjM4MCwiZXhwIjoxODIzNTc4MzgwfQ.gwPy7CC5ct1I_vCp1-74DUrNgrAI8B9FsUR3EkPh_-c";

function parseLocationToLeafletCoords(locStr) {
  if (!locStr || typeof locStr !== 'string') return [];
  try {
    const trimmed = locStr.trim().replace(/^\(+/, '').replace(/\)+$/, '');
    if (!trimmed) return [];
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
    return [];
  }
}

async function syncFromApi() {
  console.log('🌐 Menghubungi API Partner Starlite Indonesia...');
  const url = `https://api-mitra.starliteindonesia.com/app/coverage/kml?master_partner_id=${MASTER_PARTNER_ID}`;
  
  const res = await fetch(url, {
    headers: {
      'Authorization': DEFAULT_TOKEN,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const rawList = Array.isArray(json?.data) ? json.data : [];

  const features = rawList
    .map((item, idx) => {
      const coords = parseLocationToLeafletCoords(item.location);
      if (coords.length < 3) return null;
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

  return features;
}

function parseFromLocalKml() {
  let kmlPath = path.join(projectRoot, 'Coverage Desnarum.kml');
  if (!fs.existsSync(kmlPath)) {
    const files = fs.readdirSync(projectRoot);
    const found = files.find(f => f.toLowerCase().endsWith('.kml'));
    if (found) {
      kmlPath = path.join(projectRoot, found);
    } else {
      throw new Error('Tidak ditemukan file .kml di root proyek!');
    }
  }

  console.log(`📂 Membaca file KML lokal: ${path.basename(kmlPath)}...`);
  const kmlText = fs.readFileSync(kmlPath, 'utf8');

  const placemarkRegex = /<Placemark>[\s\S]*?<\/Placemark>/gi;
  const matches = kmlText.match(placemarkRegex) || [];
  console.log(`🔍 Ditemukan ${matches.length} placemark di file KML.`);

  const features = [];
  matches.forEach((pm, idx) => {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/i);
    const name = nameMatch ? nameMatch[1].trim() : `Polygon ${idx + 1}`;

    const descMatch = pm.match(/<description>(.*?)<\/description>/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (coordMatch) {
      const rawCoords = coordMatch[1].trim().split(/\s+/);
      const latLngs = [];
      rawCoords.forEach(c => {
        const parts = c.split(',').map(n => parseFloat(n));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          latLngs.push([parts[1], parts[0]]);
        }
      });

      if (latLngs.length > 0) {
        features.push({
          id: idx + 1,
          name: name.replace(/&amp;/g, '&'),
          description: description.replace(/&amp;/g, '&'),
          coordinates: latLngs
        });
      }
    }
  });

  return features;
}

async function main() {
  const forceLocal = process.argv.includes('--local') || process.argv.includes('--kml');
  let features = [];
  let sourceName = '';

  if (!forceLocal) {
    try {
      features = await syncFromApi();
      sourceName = 'API Partner Starlite Indonesia (Live)';
      console.log(`✅ Berhasil menarik ${features.length} area boundary dari API Partner!`);
    } catch (apiErr) {
      console.warn(`⚠️ Gagal sinkron ke API Partner (${apiErr.message}). Beralih ke KML lokal...`);
    }
  }

  if (features.length === 0) {
    try {
      features = parseFromLocalKml();
      sourceName = 'File KML Lokal';
      console.log(`✅ Berhasil mengekstrak ${features.length} area boundary dari file KML!`);
    } catch (kmlErr) {
      console.error(`❌ Gagal membaca dari KML lokal: ${kmlErr.message}`);
      process.exit(1);
    }
  }

  const outputDir = path.join(projectRoot, 'src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'coverageBoundaries.json');
  fs.writeFileSync(outputPath, JSON.stringify(features, null, 2), 'utf8');

  console.log(`💾 Sumber: ${sourceName}`);
  console.log(`💾 Tersimpan di: src/data/coverageBoundaries.json (${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB)`);
  console.log('🚀 Selesai! Peta Coverage GIS siap digunakan.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
