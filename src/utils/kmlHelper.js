import * as fflate from 'fflate';
import { kml as toGeoJSONKml } from '@tmcw/togeojson';

/**
 * Parsing file KML atau KMZ (Blob/ArrayBuffer) menjadi GeoJSON FeatureCollection
 * Mendukung struktur hierarki Folder (Google Earth Places), ekstraksi aset internal KMZ,
 * dan tagging setiap fitur dengan Folder ID induknya untuk kontrol per-layer hide/unhide.
 * 
 * @param {Blob|ArrayBuffer} fileData - Data binary file dari Supabase Storage
 * @param {string} fileName - Nama file (misal: 'ST. Kalibodri Filemaster.kml' atau 'coverage.kmz')
 * @returns {Promise<{ geojson: Object, folders: Array<Object> }>}
 */
export async function parseKmlOrKmz(fileData, fileName = '') {
  const isKmz = String(fileName).toLowerCase().endsWith('.kmz');
  let kmlText = '';

  if (isKmz) {
    // Unzip file KMZ untuk mengambil isi doc.kml serta asset gambar jika ada
    const arrayBuffer = fileData instanceof ArrayBuffer ? fileData : await fileData.arrayBuffer();
    const unzipped = fflate.unzipSync(new Uint8Array(arrayBuffer));
    
    // Simpan data URL untuk asset gambar internal (.png, .jpg, dll)
    const assetMap = new Map();
    for (const [filePath, fileBytes] of Object.entries(unzipped)) {
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.svg')) {
        let mime = 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
        else if (lower.endsWith('.gif')) mime = 'image/gif';

        let binary = '';
        const len = fileBytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(fileBytes[i]);
        }
        const b64 = btoa(binary);
        const dataUrl = `data:${mime};base64,${b64}`;
        assetMap.set(filePath, dataUrl);
        const baseName = filePath.split('/').pop();
        if (baseName) assetMap.set(baseName, dataUrl);
      }
    }

    // Cari entry dengan ekstensi .kml
    const kmlEntryKey = Object.keys(unzipped).find(k => k.toLowerCase().endsWith('.kml'));
    if (!kmlEntryKey) {
      throw new Error('Tidak ditemukan file KML di dalam arsip KMZ ini.');
    }
    kmlText = new TextDecoder('utf-8').decode(unzipped[kmlEntryKey]);

    // Ganti relative link icon di KML text dengan data URL gambar yang diekstrak
    if (assetMap.size > 0) {
      assetMap.forEach((dataUrl, path) => {
        kmlText = kmlText.split(path).join(dataUrl);
      });
    }
  } else {
    // File KML langsung
    kmlText = fileData instanceof Blob ? await fileData.text() : new TextDecoder('utf-8').decode(fileData);
  }

  // Parse text KML ke XML Document DOM
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');

  // Cek apakah ada parsererror
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Format KML tidak valid: ' + parserError.textContent);
  }

  // --- EKSTRAKSI FOLDER HIERARKI & TAGGING PLACEMARK SEPERTI GOOGLE EARTH ---
  let idCounter = 0;
  const flatFolders = [];

  function traverse(folderNode, parentId = null, level = 0, path = []) {
    const nameEl = Array.from(folderNode.childNodes).find(n => n.nodeName === 'name' || n.localName === 'name');
    let name = nameEl ? nameEl.textContent.trim() : (folderNode.nodeName === 'Document' || folderNode.localName === 'Document' ? (fileName || 'Dokumen KML') : 'Folder');
    const folderId = 'f_' + (++idCounter);
    const curPath = [...path, name];

    const childFolderNodes = Array.from(folderNode.childNodes).filter(n => 
      n.nodeName === 'Folder' || n.localName === 'Folder' || n.nodeName === 'Document' || n.localName === 'Document'
    );
    const childPlacemarkNodes = Array.from(folderNode.childNodes).filter(n => 
      n.nodeName === 'Placemark' || n.localName === 'Placemark'
    );

    let hasPoint = false;
    let hasLine = false;
    let hasPolygon = false;

    // Tag setiap placemark dengan folderId & folderPath
    childPlacemarkNodes.forEach(pm => {
      // Deteksi tipe geometri
      const pms = pm.getElementsByTagName ? pm : null;
      if (pms) {
        if (pms.getElementsByTagName('Point').length > 0 || pms.getElementsByTagNameNS?.('*', 'Point')?.length > 0) hasPoint = true;
        if (pms.getElementsByTagName('LineString').length > 0 || pms.getElementsByTagNameNS?.('*', 'LineString')?.length > 0) hasLine = true;
        if (pms.getElementsByTagName('Polygon').length > 0 || pms.getElementsByTagNameNS?.('*', 'Polygon')?.length > 0) hasPolygon = true;
      }

      let ext = Array.from(pm.childNodes).find(n => n.nodeName === 'ExtendedData' || n.localName === 'ExtendedData');
      if (!ext) {
        ext = xmlDoc.createElement('ExtendedData');
        pm.appendChild(ext);
      }
      const d1 = xmlDoc.createElement('Data');
      d1.setAttribute('name', '_folderId');
      const v1 = xmlDoc.createElement('value');
      v1.textContent = folderId;
      d1.appendChild(v1);
      ext.appendChild(d1);

      const d2 = xmlDoc.createElement('Data');
      d2.setAttribute('name', '_folderPath');
      const v2 = xmlDoc.createElement('value');
      v2.textContent = curPath.join(' / ');
      d2.appendChild(v2);
      ext.appendChild(d2);
    });

    const totalPlacemarks = folderNode.getElementsByTagName ? 
      (folderNode.getElementsByTagName('Placemark').length || folderNode.getElementsByTagNameNS?.('*', 'Placemark')?.length || childPlacemarkNodes.length) : childPlacemarkNodes.length;

    const folderObj = {
      id: folderId,
      name,
      parentId,
      level,
      path: curPath.join(' / '),
      selfCount: childPlacemarkNodes.length,
      totalCount: totalPlacemarks,
      childIds: [],
      hasPoint,
      hasLine,
      hasPolygon
    };

    flatFolders.push(folderObj);

    childFolderNodes.forEach(cf => {
      const childObj = traverse(cf, folderId, level + 1, curPath);
      folderObj.childIds.push(childObj.id);
      if (childObj.hasPoint) folderObj.hasPoint = true;
      if (childObj.hasLine) folderObj.hasLine = true;
      if (childObj.hasPolygon) folderObj.hasPolygon = true;
    });

    return folderObj;
  }

  const rootElement = xmlDoc.getElementsByTagName('Document')[0] 
    || xmlDoc.getElementsByTagName('Folder')[0]
    || xmlDoc.getElementsByTagName('kml')[0] 
    || xmlDoc.documentElement;

  traverse(rootElement);

  // Konversi KML DOM ke GeoJSON menggunakan toGeoJSON
  const geojson = toGeoJSONKml(xmlDoc);

  if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    throw new Error('File KML tidak berisi geometri (polygon/polyline/titik) yang dapat ditampilkan.');
  }

  return {
    geojson,
    folders: flatFolders
  };
}
