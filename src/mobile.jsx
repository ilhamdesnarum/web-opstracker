import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import './index.css';

const DetailRow = ({ label, value, isLink, href }) => value ? (
  <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-28">{label}</span>
    {isLink ? (
      <a href={href} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 text-right flex-1 break-all">{value}</a>
    ) : (
      <span className="text-[11px] font-bold text-slate-800 text-right flex-1 break-all">{value}</span>
    )}
  </div>
) : null;

const EditableRow = ({ label, fieldKey, value, options, type = "text", onChangeOverride, isEditingPelanggan, editPelangganForm, setEditPelangganForm }) => {
  if (!isEditingPelanggan) {
    return <DetailRow label={label} value={value} />;
  }
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-28 pt-1.5">{label}</span>
      {options ? (
        <select
          className="flex-1 text-[11px] font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 focus:bg-white transition-colors"
          value={editPelangganForm[fieldKey] || ''}
          onChange={(e) => {
            if (onChangeOverride) onChangeOverride(e.target.value);
            else setEditPelangganForm({ ...editPelangganForm, [fieldKey]: e.target.value });
          }}
        >
          <option value="">- Pilih -</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          className="flex-1 text-[11px] font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-500 focus:bg-white transition-colors w-full"
          value={editPelangganForm[fieldKey] || ''}
          onChange={(e) => {
            if (onChangeOverride) onChangeOverride(e.target.value);
            else setEditPelangganForm({ ...editPelangganForm, [fieldKey]: e.target.value });
          }}
        />
      )}
    </div>
  );
};
import { createClient } from '@supabase/supabase-js';
import OkupansiMobileView from './components/OkupansiMobileView';
import OutstandingMobileView from './components/OutstandingMobileView';

// Konfigurasi Supabase
const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper untuk parse dokumen dari Supabase ke camelCase React
const parseSupabaseDocument = (fields) => {
  return {
    idPelanggan: fields.id_pelanggan || "",
    namaPelanggan: fields.nama_pelanggan || "",
    nomorHp: fields.nomor_hp || "",
    alamat: fields.alamat || fields.alamat_pelanggan || fields.alamat_pemasangan || "",
    stasiun: fields.stasiun || "",
    odpAktual: fields.odp || fields.odp_aktual || fields.kode_odp || "",
    portOdp: fields.port_odp || "",
    latitude: fields.latitude || "",
    longitude: fields.longitude || "",
    ikr: fields.status_ikr || fields.ikr || "Belum",
    aktivasi: fields.status_aktivasi || fields.aktivasi || "Belum",
    tanggalRegistrasi: fields.tgl_registrasi || fields.tanggal_registrasi || "",
    catatan: fields.catatan || "",
    issueKendala: fields.issue_kendala || "",
    tglAktivasi: fields.tgl_aktivasi || "",
    tglIkr: fields.tgl_ikr || "",
    timestampAktivasi: fields.timestamp_aktivasi || fields.tgl_aktivasi || "",
    tanggalKendala: fields.tanggal_kendala || "",
    petugasAktivasi: fields.petugas_aktivasi || "",
    petugasIkr: fields.petugas_ikr || "",
    reporterKendala: fields.reporter_kendala || "",
    kabelPrecon: fields.pemakaian_precon || fields.kabel_precon || fields.precon || "",
    snOnt: fields.sn_ont || fields.sn || "",
    fotoRumahPelanggan: fields.foto_rumah_pelanggan || "",
    fotoOntTerpasang: fields.foto_ont_terpasang || "",
    tanggalBerakhir: fields.tanggal_berakhir || "",
    telatBayarHari: (fields.telat_bayar_hari !== undefined && fields.telat_bayar_hari !== null && fields.telat_bayar_hari !== "") ? Number(fields.telat_bayar_hari) : null,
    namaSales: fields.nama_sales || fields.sales || ""
  };
};

// Helper untuk parse dokumen ODP dari Supabase ke camelCase React
const parseSupabaseOdpDocument = (fields) => {
  return {
    id: fields.id || null,
    label: fields.label || fields.Label || "",
    latitude: fields.latitude || fields.Latitude || "",
    longitude: fields.longitude || fields.Longitude || "",
    portTerpakai: fields.port_terpakai || fields['Port Terpakai'] || 0,
    tahapPembangunan: fields.tahap_pembangunan || fields['Tahap Pembangunan'] || "",
    kapasitas: fields.kapasitas || fields.Kapasitas || 8,
    kodeOdp: fields.kode_odp || fields['Kode ODP'] || "",
    kodeOdc: fields.kode_odc || fields['Kode ODC'] || "",
    stasiun: fields.stasiun || fields.Stasiun || ""
  };
};

// Helper untuk parse dokumen Log Visit dari Supabase ke camelCase React
const parseSupabaseVisitDocument = (fields) => {
  return {
    id: fields.id,
    timestamp: fields.timestamp || "",
    idPelanggan: fields.id_pelanggan || "",
    namaPelanggan: fields.nama_pelanggan || "",
    stasiun: fields.stasiun || "",
    keluhan: fields.keluhan || "",
    catatan: fields.catatan || "",
    status: fields.status_visit || fields.status || "OPEN",
    odpAktual: fields.odp || fields.odp_aktual || "",
    portOdp: fields.port || fields.port_odp || "",
    snOnt: fields.sn_ont || "",
    nomorHp: fields.nomor_hp || fields.kontak || "",
    latitude: fields.latitude || "",
    longitude: fields.longitude || "",
    penyebab: fields.penyebab || "",
    perbaikan: fields.perbaikan || "",
    tindakan: fields.perbaikan || fields.tindakan || "",
    material: fields.used_materials || fields.material || "",
    usedMaterials: fields.used_materials || fields.material || "",
    petugas: fields.petugas || "",
    evidence: fields.evidence || "",
    waktuClose: fields.waktu_close || ""
  };
};

// Helper untuk membersihkan duplikasi data visit
const deduplicateVisitData = (items) => {
  if (!items || !Array.isArray(items)) return [];
  const map = new Map();
  items.forEach(item => {
    if (!item) return;
    const itemIsDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status || item.status_visit || '').toUpperCase());
    const key = (item.id ? `id_${item.id}` : '') || `${item.idPelanggan || item.id_pelanggan}_${item.timestamp || ''}`;
    
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);
      const existingIsDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(existing.status || existing.status_visit || '').toUpperCase());
      if (itemIsDone && !existingIsDone) {
        map.set(key, { ...existing, ...item });
      } else {
        map.set(key, { ...item, ...existing });
      }
    }
  });

  // Secondary consolidation by idPelanggan + timestamp
  const secondMap = new Map();
  for (const item of map.values()) {
    const secKey = `${item.idPelanggan || item.id_pelanggan}_${item.timestamp || ''}`;
    if (!secondMap.has(secKey)) {
      secondMap.set(secKey, item);
    } else {
      const existing = secondMap.get(secKey);
      const existingIsDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(existing.status || existing.status_visit || '').toUpperCase());
      const itemIsDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status || item.status_visit || '').toUpperCase());
      
      if (!existing.id && item.id) {
        secondMap.set(secKey, { ...existing, ...item });
      } else if (itemIsDone && !existingIsDone) {
        secondMap.set(secKey, { ...existing, ...item });
      }
    }
  }
  return Array.from(secondMap.values());
};

// Helper untuk menghitung durasi penanganan gangguan (Time To Resolve / TTR)
const calculateTTR = (openTimeStr, closeTimeStr) => {
  if (!openTimeStr || !closeTimeStr) return null;

  const parseTime = (str) => {
    if (!str) return null;
    const s = String(str).trim();
    if (!s || s === '-') return null;

    const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10) - 1;
      const y = parseInt(dmyMatch[3], 10);
      const hh = parseInt(dmyMatch[4] || '0', 10);
      const mm = parseInt(dmyMatch[5] || '0', 10);
      const ss = parseInt(dmyMatch[6] || '0', 10);
      return new Date(y, m, d, hh, mm, ss).getTime();
    }

    const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10) - 1;
      const d = parseInt(ymdMatch[3], 10);
      const hh = parseInt(ymdMatch[4] || '0', 10);
      const mm = parseInt(ymdMatch[5] || '0', 10);
      const ss = parseInt(ymdMatch[6] || '0', 10);
      return new Date(y, m, d, hh, mm, ss).getTime();
    }

    const parsed = Date.parse(s);
    return isNaN(parsed) ? null : parsed;
  };

  const tOpen = parseTime(openTimeStr);
  const tClose = parseTime(closeTimeStr);

  if (!tOpen || !tClose || tClose < tOpen) return null;

  const diffMs = tClose - tOpen;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return `${diffDays}h ${remHours}j`;
  }
  if (diffHours > 0) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `${diffHours}j ${remMin}m` : `${diffHours} Jam`;
  }
  if (diffMin > 0) {
    return `${diffMin} Menit`;
  }
  return `${diffSec} Detik`;
};

// Helper untuk membaca cache persistent (localStorage / sessionStorage fallback)
const getCachedData = (key, maxAgeMs = 24 * 60 * 60 * 1000) => {
  try {
    const cached = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
};

// Helper untuk menyimpan cache persistent
const compressCacheItem = (data) => {
  if (!Array.isArray(data)) return data;
  return data.map(item => {
    if (typeof item !== 'object' || item === null) return item;
    const min = {};
    for (const k in item) {
      const val = item[k];
      if (val !== "" && val !== null && val !== undefined) {
        min[k] = val;
      }
    }
    return min;
  });
};

const setCachedData = (key, data) => {
  try {
    if (data === null) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return;
    }
    const compressed = compressCacheItem(data);
    const payload = { timestamp: Date.now(), data: compressed };
    const jsonStr = JSON.stringify(payload);
    try {
      localStorage.setItem(key, jsonStr);
    } catch (err) {
      try {
        sessionStorage.setItem(key, jsonStr);
      } catch (e) {}
    }
  } catch (e) { }
};

// Helper untuk format Text (Proper Case)
const toProperCase = (str) => {
  if (!str) return '';
  return String(str).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const APPS_SCRIPT_URL = import.meta.env.DEV 
  ? "/api/gas/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec"
  : "https://script.google.com/macros/s/AKfycbxha3aQ0CjaVWJi0_XfCn-T67xu_RKBCAQShKPw-Ex5nykS17v9Roc42LoGPd2m2LfQ/exec";

const api = {
  run: async (actionName, payloadData = {}) => {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: actionName, payload: payloadData })
      });
      if (!response.ok) return { success: false, error: `HTTP Error ${response.status}` };
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        return { success: false, error: "Respon server tidak valid." };
      }
      if (result.error || result.success === false) return { success: false, error: result.error || result.message || "Gagal memproses data." };
      return result;
    } catch (error) {
      console.warn(`[API - ${actionName}]:`, error.message || error);
      return { success: false, error: error.message || "Gagal menghubungi server." };
    }
  }
};

const GOOGLE_SHEET_VISIT_CSV_URL = "https://docs.google.com/spreadsheets/d/13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M/gviz/tq?tqx=out:csv&gid=263928205";

const fetchGoogleSheetVisitData = async () => {
  try {
    const response = await fetch(GOOGLE_SHEET_VISIT_CSV_URL);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const csvText = await response.text();

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    return rows.slice(1).map(cols => {
      const getVal = (idx) => cols[idx] ? String(cols[idx]).trim() : '';
      return {
        timestamp: getVal(0),
        idPelanggan: getVal(1),
        namaPelanggan: getVal(2),
        stasiun: getVal(3),
        keluhan: getVal(4),
        catatan: getVal(5),
        status: getVal(6) || 'OPEN',
        odpAktual: getVal(7),
        portOdp: getVal(8),
        snOnt: getVal(9),
        nomorHp: getVal(10),
        latitude: getVal(11),
        longitude: getVal(12),
        penyebab: getVal(13),
        perbaikan: getVal(14),
        tindakan: getVal(14),
        material: getVal(15),
        usedMaterials: getVal(15),
        petugas: getVal(16),
        evidence: getVal(17),
        waktuClose: getVal(18)
      };
    }).filter(v => v.idPelanggan || v.namaPelanggan || v.timestamp);
  } catch (err) {
    console.error('Failed to fetch Visit_Log from Google Sheet:', err);
    return [];
  }
};

// Komponen Helper Icon
const Icon = ({ name, size = 20, className = "" }) => {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) {
    const PascalName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const FallbackIcon = LucideIcons[PascalName];
    if (FallbackIcon) return <FallbackIcon size={size} className={className} />;
    return <LucideIcons.HelpCircle size={size} className={className} />;
  }
  return <LucideIcon size={size} className={className} />;
};

const standardizeDate = (dateStr) => {
  if (!dateStr) return '';
  let cleaned = String(dateStr).trim();
  cleaned = cleaned.split(/[T ]/)[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return cleaned;
};

const getCleanIssueText = (item, pelangganData = []) => {
  let issueText = item.issueKendala || item.issue_kendala || item.catatan || item.keluhan || '';
  if (!issueText || issueText.includes('GMT+') || issueText.includes('Waktu Indonesia')) {
    const matched = (pelangganData || []).find(p => String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase() === String(item.idPelanggan || '').trim().toUpperCase());
    if (matched) {
      issueText = matched.issueKendala || matched.issue_kendala || matched.catatan || matched.keluhan || '';
    }
  }
  return (issueText && !issueText.includes('GMT+')) ? issueText : (item.catatan || 'Tidak ada keterangan');
};

const getLocalDateStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getFinalPelangganStatus = (item) => {
  const rawAktivasi = String(item.aktivasi || item.statusAktivasi || '').trim().toLowerCase();
  const valAktivasi = rawAktivasi.toUpperCase();
  const valIkr = String(item.ikr || item.statusIkr || '').trim().toUpperCase();

  // 1. Dapatkan Global Status Str (mirip dengan App.jsx getGlobalStatusStr)
  let globalStat = "WAITING";
  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') globalStat = "AKTIF";
  else if (valAktivasi.includes('KENDALA') || valIkr.includes('KENDALA')) globalStat = "KENDALA";
  else if (valAktivasi === 'SUSPEND') globalStat = "SUSPEND";
  else if (valAktivasi === 'READY TO DISMANTLE') globalStat = "READY TO DISMANTLE";
  else if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') globalStat = "DISMANTLED";
  else if (valIkr === 'BELUM' && valAktivasi === 'BELUM') globalStat = "WAITING";
  else if (item.tahapPembangunan) globalStat = String(item.tahapPembangunan).toUpperCase();
  else globalStat = "DISMANTLED";

  // 2. Dapatkan Final Status (mirip dengan App.jsx logic filter)
  let finalStatus = 'WAITING';
  if (globalStat.includes('KENDALA')) finalStatus = 'KENDALA';
  else if (rawAktivasi === 'sudah' || rawAktivasi === 'aktif') finalStatus = 'AKTIF';
  else if (rawAktivasi === 'belum') finalStatus = 'WAITING';
  else if (rawAktivasi === 'ready to dismantle') finalStatus = 'READY TO DISMANTLE';
  else if (rawAktivasi === 'dismantled' || rawAktivasi === 'dismantle') finalStatus = 'DISMANTLED';
  else if (rawAktivasi === 'suspend') finalStatus = 'SUSPEND';
  else if (rawAktivasi === 'kendala') finalStatus = 'KENDALA';
  else finalStatus = globalStat;

  return finalStatus;
};

const MobileApp = () => {
  const [activeTab, setActiveTab] = useState('home'); // Bottom nav: home, tugas, profil
  const [activeModule, setActiveModule] = useState(null); // Modul spesifik: overview, pelanggan, dsb
  const [activeReportTab, setActiveReportTab] = useState('aktivasi'); // 'aktivasi' | 'ikr' | 'kendala'

  // Global Data State
  const [data, setData] = useState({
    pelangganData: [],
    visitData: [],
    teknisiData: [],
    odpData: [],
    stationData: [],
    dataRegistrasi: [],
    detailPoData: [],
    fastKpi: { totalAktif: 0, totalKendalaHariIni: 0 }
  });
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [listModal, setListModal] = useState({ isOpen: false, title: '', type: '', items: [] });
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [riwayatFilter, setRiwayatFilter] = useState('');
  const [isRiwayatDropdownOpen, setIsRiwayatDropdownOpen] = useState(false);
  const [settingStation, setSettingStation] = useState([]);
  const [isSettingStationDropdownOpen, setIsSettingStationDropdownOpen] = useState(false);
  const [settingName, setSettingName] = useState('Desnarum');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  const cropContainerRef = useRef(null);
  const [barsMounted, setBarsMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Overview states
  const [overviewDateFilter, setOverviewDateFilter] = useState('Hari Ini');
  const [isOverviewDateDropdownOpen, setIsOverviewDateDropdownOpen] = useState(false);
  const [isCustomRangeModalOpen, setIsCustomRangeModalOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [overviewStationFilter, setOverviewStationFilter] = useState('Semua Stasiun');
  const [isOverviewStationDropdownOpen, setIsOverviewStationDropdownOpen] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  // Pelanggan module states
  const [pelangganSearch, setPelangganSearch] = useState('');
  const [pelangganStatusFilter, setPelangganStatusFilter] = useState('SEMUA');
  const [pelangganPage, setPelangganPage] = useState(1);
  const [gangguanSearch, setGangguanSearch] = useState('');
  const [gangguanFilter, setGangguanFilter] = useState('SEMUA');
  const [gangguanPage, setGangguanPage] = useState(1);
  const [gangguanDateFilter, setGangguanDateFilter] = useState('Hari Ini');
  const [isGangguanDateFilterOpen, setIsGangguanDateFilterOpen] = useState(false);
  const [gangguanDateStart, setGangguanDateStart] = useState('');
  const [gangguanDateEnd, setGangguanDateEnd] = useState('');
  const [gangguanStationFilter, setGangguanStationFilter] = useState('Semua Stasiun');
  const [isGangguanStationFilterOpen, setIsGangguanStationFilterOpen] = useState(false);
  const [isPelangganFilterOpen, setIsPelangganFilterOpen] = useState(false);
  const [pelangganStationFilter, setPelangganStationFilter] = useState('Semua Stasiun');
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);
  const [selectedPoStation, setSelectedPoStation] = useState(null);
  const [isEditingPelanggan, setIsEditingPelanggan] = useState(false);
  const [editPelangganForm, setEditPelangganForm] = useState({});
  const [isSavingPelanggan, setIsSavingPelanggan] = useState(false);
  const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'success' });
  const PELANGGAN_PER_PAGE = 15;

  // New Ticket Modal States
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketSearch, setNewTicketSearch] = useState('');
  const [newTicketSelectedPelanggan, setNewTicketSelectedPelanggan] = useState(null);
  const [newTicketKeluhan, setNewTicketKeluhan] = useState('');
  const [newTicketCatatan, setNewTicketCatatan] = useState('');
  const [newTicketPetugas, setNewTicketPetugas] = useState('');
  const [newTicketPetugasSearch, setNewTicketPetugasSearch] = useState('');
  const [newTicketIsKeluhanOpen, setNewTicketIsKeluhanOpen] = useState(false);
  const [newTicketIsPetugasOpen, setNewTicketIsPetugasOpen] = useState(false);
  const [newTicketIsSaving, setNewTicketIsSaving] = useState(false);
  const [newTicketError, setNewTicketError] = useState('');

  // ODP Coverage module states
  const [coverageMapsLink, setCoverageMapsLink] = useState('');
  const [isParsingMapsLink, setIsParsingMapsLink] = useState(false);
  const [coverageLat, setCoverageLat] = useState('');
  const [coverageLon, setCoverageLon] = useState('');
  const [coverageCustomerQuery, setCoverageCustomerQuery] = useState('');
  const [selectedCoverageCustomer, setSelectedCoverageCustomer] = useState(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCoverageOdp, setSelectedCoverageOdp] = useState(null);

  // Map references for ODP Coverage Leaflet
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const lineLayerRef = useRef(null);

  // Pull to refresh states
  const [isPulling, setIsPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainRef = useRef(null);
  const touchStartY = useRef(0);

  // Load Profile from LocalStorage
  useEffect(() => {
    const savedName = localStorage.getItem('ops_mobile_name');
    if (savedName) setSettingName(savedName);

    const savedStation = localStorage.getItem('ops_mobile_station');
    if (savedStation) {
      try {
        setSettingStation(JSON.parse(savedStation));
      } catch (e) {
        setSettingStation([savedStation]);
      }
    }

    const savedPhoto = localStorage.getItem('ops_mobile_photo');
    if (savedPhoto) setProfilePhoto(savedPhoto);
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // Max 5MB
        showToast('Ukuran foto terlalu besar (Max 5MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropStart = (clientX, clientY) => {
    dragRef.current = { isDragging: true, startX: clientX, startY: clientY, lastX: cropOffset.x, lastY: cropOffset.y };
  };

  const handleCropMove = (clientX, clientY) => {
    if (!dragRef.current.isDragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setCropOffset({ x: dragRef.current.lastX + dx, y: dragRef.current.lastY + dy });
  };

  const handleCropEnd = () => {
    dragRef.current.isDragging = false;
  };

  const handleSaveCrop = () => {
    const imgEl = document.getElementById('crop-target-img');
    if (!imgEl || !cropContainerRef.current) return;

    const img = new Image();
    img.onload = () => {
      const size = 250;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const rect = imgEl.getBoundingClientRect();
      const containerRect = cropContainerRef.current.getBoundingClientRect();

      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const cropX = (containerRect.left - rect.left) * scaleX;
      const cropY = (containerRect.top - rect.top) * scaleY;
      const cropW = containerRect.width * scaleX;
      const cropH = containerRect.height * scaleY;

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, size, size);

      const resultBase64 = canvas.toDataURL('image/jpeg', 0.9);
      setProfilePhoto(resultBase64);
      setCropModalOpen(false);

      // Auto save after crop
      localStorage.setItem('ops_mobile_photo', resultBase64);
      showToast('Foto profil berhasil diperbarui!', 'success');

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    img.src = tempImage;
  };

  const handleSaveProfile = () => {
    localStorage.setItem('ops_mobile_name', settingName);
    localStorage.setItem('ops_mobile_station', JSON.stringify(settingStation));
    if (profilePhoto) {
      localStorage.setItem('ops_mobile_photo', profilePhoto);
    }
    showToast('Profil berhasil disimpan', 'success');
  };

  // Auto-close dropdowns on module change
  useEffect(() => {
    setIsOverviewDateDropdownOpen(false);
    setIsOverviewStationDropdownOpen(false);
    setIsPelangganFilterOpen(false);
    setIsGangguanDateFilterOpen(false);
    setIsGangguanStationFilterOpen(false);
  }, [activeModule]);

  // === PWA BULLETPROOF BACK BUTTON (POPSTATE ROUTING) ===
  useEffect(() => {
    // Clear hash on mount if any, to ensure clean state
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const handlePopState = () => {
      const hash = window.location.hash;

      if (!hash || hash === '' || hash === '#') {
        // User pressed back to root
        setListModal(prev => ({ ...prev, isOpen: false }));
        setActiveModule(null);
      } else if (hash.startsWith('#module-')) {
        // User pressed back to a module (e.g. closing a modal)
        setListModal(prev => ({ ...prev, isOpen: false }));
        setActiveModule(hash.replace('#module-', ''));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModule = (id) => {
    setActiveModule(id); // Instant UI feedback!
    window.history.pushState(null, '', `#module-${id}`); // Push history silently
  };

  const openListModal = (modalConfig) => {
    setListModal(modalConfig); // Instant UI feedback!
    if (modalConfig.isOpen) {
      window.history.pushState(null, '', `#modal-${Date.now()}`); // Push history silently
    }
  };

  const closeListModal = () => {
    window.history.back(); // Triggers popstate
  };
  // ==================================

  useEffect(() => {
    if (!isGlobalLoading) {
      setBarsMounted(false);
      const timer = setTimeout(() => setBarsMounted(true), 150);
      return () => clearTimeout(timer);
    }
  }, [isGlobalLoading, activeReportTab]);

  useEffect(() => {
    if (listModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [listModal.isOpen]);

  const openAktivasiModal = () => {
    if (isGlobalLoading) return;
    const items = (data.pelangganData || []).filter(p => {
      const isAktivasi = (p.aktivasi || '').toLowerCase() === 'sudah';
      const tglAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
      const d = new Date();
      const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return isAktivasi && tglAkt === todayStrLocal;
    });
    if (items.length > 0) {
      openListModal({ isOpen: true, title: 'Aktivasi Harian', type: 'aktivasi', items });
    }
  };

  const openRegistrasiModal = (stasiun) => {
    if (isGlobalLoading) return;
    const parts = todayStr.split('-');
    const targetDateIndo = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const targetDateIntl = todayStr;

    const items = (data.dataRegistrasi || []).filter(reg => {
      const valStr = String(reg.tanggal || '');
      const matchDate = valStr.includes(targetDateIndo) || valStr.includes(targetDateIntl);

      let st = String(reg.stasiun || '').toUpperCase().trim();
      const ALL_STATIONS_LOCAL = ['ALASTUA', 'BRUMBUNG', 'KALIBODRI', 'KALIWUNGU', 'KRADENAN', 'KRENGSENG', 'RANDUBLATUNG', 'SEMARANG TAWANG', 'SULUR', 'WADU', 'WELERI'];
      const matched = ALL_STATIONS_LOCAL.find(s => st.includes(s));
      if (matched) st = matched;

      const st1 = st.toLowerCase();
      const st2 = String(stasiun).toLowerCase().trim();
      const matchStation = st1 === st2 || st1.includes(st2) || st2.includes(st1);

      return matchDate && matchStation;
    });

    openListModal({ isOpen: true, title: `Pendaftar Baru - ${stasiun}`, type: 'registrasi', items });
  };

  const openPetugasModal = (petugasName, type) => {
    if (isGlobalLoading) return;
    const items = (data.pelangganData || []).filter(p => {
      const d = new Date();
      const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (type === 'aktivasi') {
        const isAktivasi = (p.aktivasi || '').toLowerCase() === 'sudah';
        const tglAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
        return isAktivasi && tglAkt === todayStrLocal && p.petugasAktivasi === petugasName;
      } else if (type === 'ikr') {
        const isIkr = (p.ikr || '').toLowerCase() === 'sudah';
        const tglIkr = standardizeDate(p.tglIkr);
        const tglAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
        return isIkr && (tglIkr === todayStrLocal || tglAkt === todayStrLocal) && p.petugasIkr === petugasName;
      } else if (type === 'kendala') {
        if (data.dataKendalaSheet && data.dataKendalaSheet.length > 0) {
          return false; // Ditangani terpisah di bawah
        }
        const isKendala = (p.ikr || '').toLowerCase() === 'kendala' || (p.aktivasi || '').toLowerCase() === 'kendala' || String(p.statusAktivasi || '').toLowerCase().includes('kendala') || String(p.statusIkr || '').toLowerCase().includes('kendala');
        const reporter = p.reporterKendala || p.petugasAktivasi || 'Unknown';
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        return isKendala && reporter === petugasName && tglKendala === todayStrLocal;
      }
      return false;
    });

    if (type === 'kendala' && data.dataKendalaSheet && data.dataKendalaSheet.length > 0) {
      const d = new Date();
      const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const sheetItems = data.dataKendalaSheet.filter(p => {
        const reporter = p.reporterKendala || 'Unknown';
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        return reporter === petugasName && tglKendala === todayStrLocal;
      });
      items.push(...sheetItems);
    }

    if (items.length > 0) {
      openListModal({ isOpen: true, title: `Report ${type.toUpperCase()} - @${String(petugasName).replace('@', '')}`, type: type, items });
    }
  };

  const openVisitModal = () => {
    if (isGlobalLoading) return;
    const raw = (data.visitData || []).filter(item => {
      const itemDate = standardizeDate(item.timestamp);
      const d = new Date();
      const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return itemDate === todayStrLocal;
    });
    const items = deduplicateVisitData(raw);
    if (items.length > 0) {
      openListModal({ isOpen: true, title: 'Daftar Tiket Visit / Gangguan', type: 'visit', items });
    }
  };

  const openKendalaModal = () => {
    if (isGlobalLoading) return;
    let items = [];
    if (data.dataKendalaSheet && data.dataKendalaSheet.length > 0) {
      items = data.dataKendalaSheet.filter(p => {
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        return tglKendala === todayStr;
      });
    } else {
      items = (data.pelangganData || []).filter(p => {
        const isKendala = (p.ikr || '').toLowerCase() === 'kendala' || (p.aktivasi || '').toLowerCase() === 'kendala' || String(p.statusAktivasi || '').toLowerCase().includes('kendala') || String(p.statusIkr || '').toLowerCase().includes('kendala');
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        return isKendala && tglKendala === todayStr;
      });
    }

    if (items.length > 0) {
      openListModal({ isOpen: true, title: 'Kendala Harian', type: 'kendala', items });
    }
  };

  const fetchAllSupabaseData = async (tableName, selectColumns = '*', orderCol = null, maxPages = 50) => {
    let allData = [];
    let start = 0;
    const limit = 1000;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < maxPages) {
      let query = supabase
        .from(tableName)
        .select(selectColumns);

      if (orderCol) {
        query = query.order(orderCol, { ascending: true, nullsFirst: false });
      }

      const { data, error } = await query.range(start, start + limit - 1);

      if (error) {
        // Fallback for cases where column might not exist or throws error
        if (orderCol && error.message.includes(orderCol)) {
          const fallback = await supabase.from(tableName).select(selectColumns).range(start, start + limit - 1);
          if (fallback.error) throw fallback.error;
          allData = [...allData, ...fallback.data];
          if (fallback.data.length < limit) hasMore = false;
          else start += limit;
          continue;
        }
        throw error;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
      }

      pageCount++;
      if (!data || data.length < limit) {
        hasMore = false;
      } else {
        start += limit;
      }
    }

    return allData;
  };

  const fetchData = async (force = false) => {
    try {
      if (force) {
        setIsGlobalLoading(true);
        setCachedData('otas_pelanggan_cache_v4', null);
        setCachedData('otas_cache_visit', null);
        setCachedData('otas_odp_cache_v4', null);
      }
      setGlobalError(null);

      const cachedPelanggan = getCachedData('otas_pelanggan_cache_v4');
      const cachedVisit = getCachedData('otas_cache_visit');
      const cachedOdp = getCachedData('otas_odp_cache_v4');

      let finalPelanggan = cachedPelanggan;
      let finalVisit = cachedVisit;
      let finalOdp = cachedOdp;

      const fetchPromises = [];

      // 1. Pelanggan Data
      if (!cachedPelanggan) {
        const pelangganCols = 'id_pelanggan,nama_pelanggan,nomor_hp,alamat,stasiun,odp,port_odp,latitude,longitude,status_ikr,status_aktivasi,tanggal_registrasi,tgl_ikr,tgl_aktivasi,tanggal_kendala,petugas_aktivasi,petugas_ikr,reporter_kendala,issue_kendala,catatan,kabel_precon,sn_ont,foto_rumah_pelanggan,foto_ont_terpasang,tanggal_berakhir,telat_bayar_hari,nama_sales';
        fetchPromises.push(
          fetchAllSupabaseData('data_pelanggan', pelangganCols, 'id_pelanggan')
            .then((sbData) => {
              finalPelanggan = (sbData || []).map(parseSupabaseDocument);
              setCachedData('otas_pelanggan_cache_v4', finalPelanggan);
            }).catch(e => {
              console.error("Gagal memuat data_pelanggan dari Supabase:", e);
            })
        );
      }

      // 2. ODP Data
      if (!cachedOdp) {
        const odpCols = 'id,label,latitude,longitude,port_terpakai,tahap_pembangunan,kapasitas,kode_odp,kode_odc,stasiun';
        fetchPromises.push(
          fetchAllSupabaseData('odp', odpCols, 'label')
            .then((sbData) => {
              finalOdp = (sbData || []).map(parseSupabaseOdpDocument);
              setCachedData('otas_odp_cache_v4', finalOdp);
            }).catch(e => {
              console.error("Gagal memuat odp dari Supabase:", e);
            })
        );
      }

      // 3. Log Visit Data dari Supabase
      if (!cachedVisit) {
        fetchPromises.push(
          fetchAllSupabaseData('log_visit', '*', 'id')
            .then((sbData) => {
              finalVisit = (sbData || []).map(parseSupabaseVisitDocument);
              finalVisit = deduplicateVisitData(finalVisit);
              setCachedData('otas_cache_visit', finalVisit);
            }).catch(e => {
              console.error("Gagal memuat log_visit dari Supabase:", e);
            })
        );
      }

      await Promise.all(fetchPromises);

      // Hydrate state langsung jika data Supabase sudah siap
      setData(prev => ({
        ...prev,
        pelangganData: finalPelanggan || prev.pelangganData,
        visitData: finalVisit || prev.visitData,
        odpData: finalOdp || prev.odpData,
      }));

      // 4. Auxiliary Data dari Google Apps Script (Fast Dashboard)
      api.run('getFastDashboardData')
        .then(fastResult => {
          if (fastResult && !fastResult.error) {
            setData(prev => ({
              ...prev,
              ...fastResult,
              pelangganData: finalPelanggan || prev.pelangganData,
              visitData: finalVisit || prev.visitData,
              odpData: finalOdp || prev.odpData,
              dataRegistrasi: fastResult?.dataRegistrasi?.length > 0 ? fastResult.dataRegistrasi : prev.dataRegistrasi,
              dataKendalaSheet: (fastResult?.dataKendalaSheet && fastResult.dataKendalaSheet.length > 0) ? fastResult.dataKendalaSheet : (fastResult?.pelangganData ? fastResult.pelangganData.filter(p => p.issueKendala && p.issueKendala.trim() !== "") : prev.dataKendalaSheet),
              petugasData: fastResult?.petugasData?.length > 0 ? fastResult.petugasData : prev.petugasData,
              stationData: fastResult?.stationData?.length > 0 ? fastResult.stationData : prev.stationData,
              detailPoData: fastResult?.detailPoData?.length > 0 ? fastResult.detailPoData : prev.detailPoData,
              fastKpi: fastResult?.fastKpi || prev.fastKpi
            }));
          }
        })
        .catch(err => {
          console.warn("Fast dashboard fetch failed:", err);
        })
        .finally(() => {
          setIsGlobalLoading(false);
          setIsSyncing(false);
        });

    } catch (err) {
      console.error("Mobile fetchData error:", err);
      setGlobalError(err.message || "Gagal sinkronisasi data.");
      setIsGlobalLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Supabase Real-Time Listener untuk data_pelanggan
    const pelangganChannel = supabase
      .channel('mobile-pelanggan-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_pelanggan'
        },
        (payload) => {
          setData(prev => {
            const newPelangganData = [...(prev.pelangganData || [])];

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const updatedItem = parseSupabaseDocument(payload.new);
              const idx = newPelangganData.findIndex(p => String(p.idPelanggan || '').trim().toUpperCase() === String(updatedItem.idPelanggan || '').trim().toUpperCase());

              if (idx !== -1) {
                newPelangganData[idx] = { ...newPelangganData[idx], ...updatedItem };
              } else {
                newPelangganData.unshift(updatedItem);
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id_pelanggan;
              const idx = newPelangganData.findIndex(p => String(p.idPelanggan || '').trim().toUpperCase() === String(deletedId || '').trim().toUpperCase());
              if (idx !== -1) {
                newPelangganData.splice(idx, 1);
              }
            }

            setCachedData('otas_pelanggan_cache_v4', newPelangganData);
            return {
              ...prev,
              pelangganData: newPelangganData
            };
          });
        }
      )
      .subscribe();

    // Setup Supabase Real-Time Listener untuk log_visit
    const visitChannel = supabase
      .channel('mobile-visit-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'log_visit'
        },
        (payload) => {
          setData(prev => {
            let newVisitData = [...(prev.visitData || [])];

            if (payload.eventType === 'INSERT') {
              const item = parseSupabaseVisitDocument(payload.new);
              const existingIdx = newVisitData.findIndex(v =>
                (v.id && item.id && v.id === item.id) ||
                (v.idPelanggan === item.idPelanggan && v.timestamp === item.timestamp) ||
                (!v.id && v.idPelanggan === item.idPelanggan)
              );
              if (existingIdx !== -1) {
                newVisitData[existingIdx] = { ...newVisitData[existingIdx], ...item };
              } else {
                newVisitData.unshift(item);
              }
            } else if (payload.eventType === 'UPDATE') {
              const item = parseSupabaseVisitDocument(payload.new);
              const idx = newVisitData.findIndex(v =>
                (v.id && item.id && v.id === item.id) ||
                (v.idPelanggan === item.idPelanggan && v.timestamp === item.timestamp) ||
                (v.idPelanggan === item.idPelanggan)
              );
              if (idx !== -1) {
                newVisitData[idx] = { ...newVisitData[idx], ...item };
              } else {
                newVisitData.unshift(item);
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              newVisitData = newVisitData.filter(v => v.id !== deletedId);
            }

            const cleanVisitData = deduplicateVisitData(newVisitData);
            setCachedData('otas_cache_visit', cleanVisitData);
            return {
              ...prev,
              visitData: cleanVisitData
            };
          });
        }
      )
      .subscribe();

    // Setup Supabase Real-Time Listener untuk odp
    const odpChannel = supabase
      .channel('mobile-odp-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'odp'
        },
        (payload) => {
          setData(prev => {
            let newOdpData = [...(prev.odpData || [])];
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const updatedOdp = parseSupabaseOdpDocument(payload.new);
              const idx = newOdpData.findIndex(o => String(o.label || o.kodeOdp || '').trim().toUpperCase() === String(updatedOdp.label || updatedOdp.kodeOdp || '').trim().toUpperCase());
              if (idx !== -1) {
                newOdpData[idx] = { ...newOdpData[idx], ...updatedOdp };
              } else {
                newOdpData.unshift(updatedOdp);
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedLabel = payload.old?.label || payload.old?.kode_odp;
              newOdpData = newOdpData.filter(o => String(o.label || o.kodeOdp || '').trim().toUpperCase() !== String(deletedLabel || '').trim().toUpperCase());
            }
            setCachedData('otas_odp_cache', newOdpData);
            return {
              ...prev,
              odpData: newOdpData
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pelangganChannel);
      supabase.removeChannel(visitChannel);
      supabase.removeChannel(odpChannel);
    };
  }, []);

  const { todayStr, todayDateString } = useMemo(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return {
      todayStr: `${yyyy}-${mm}-${dd}`,
      todayDateString: `${t.getDate()} ${months[t.getMonth()]} ${t.getFullYear()}`
    };
  }, []);

  const homeStats = useMemo(() => {
    // 1. Total Aktivasi HC dari pelangganData (mengikuti web)
    let totalAktivasi = 0;

    let aktivasiHarian = 0;
    let kendalaHarian = 0;
    let ikrHarian = 0;
    let visitHarian = 0;

    const ALL_STATIONS = ['ALASTUA', 'BRUMBUNG', 'KALIBODRI', 'KALIWUNGU', 'KRADENAN', 'KRENGSENG', 'RANDUBLATUNG', 'SEMARANG TAWANG', 'SULUR', 'WADU', 'WELERI'];
    const aktStasiunCounts = {};
    const petugasAktivasiCounts = {};
    const petugasIkrCounts = {};
    const reporterKendalaCounts = {};

    ALL_STATIONS.forEach(s => {
      aktStasiunCounts[s] = 0;
    });

    // 2. Aktivasi, Kendala, & IKR Harian dihitung real-time dari pelangganData (mengikuti web)
    (data.pelangganData || []).forEach(p => {
      const ikrStat = String(p.statusIkr || p.status_ikr || p.ikr || '').toUpperCase();
      // Untuk dashboard mobile (Total Aktivasi), user minta berdasarkan IKR
      const isAktivasi = ikrStat === 'SUDAH' || ikrStat.includes('DISMANTLE');

      // Untuk Aktivasi Harian, Desktop (App.jsx) menghitung berdasarkan status aktivasi
      const isAktivasiHarian = String(p.statusAktivasi || p.status_aktivasi || p.aktivasi || '').toLowerCase().includes('sudah');

      const isIkr = (p.ikr || '').toLowerCase() === 'sudah';
      const isKendala = (p.ikr || '').toLowerCase() === 'kendala' || (p.aktivasi || '').toLowerCase() === 'kendala' || String(p.statusAktivasi || '').toLowerCase().includes('kendala') || String(p.statusIkr || '').toLowerCase().includes('kendala');

      if (isAktivasi) {
        totalAktivasi++;
      }

      const st = (p.stasiun || '').toUpperCase();

      const tglAktivasi = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
      if (isAktivasiHarian && tglAktivasi === todayStr) {
        aktivasiHarian++;
        if (aktStasiunCounts[st] !== undefined) aktStasiunCounts[st]++;
        else if (st) {
          const matched = ALL_STATIONS.find(s => st.includes(s));
          if (matched) aktStasiunCounts[matched]++;
          else { aktStasiunCounts[st] = 1; ALL_STATIONS.push(st); }
        }

        const ptgs = p.petugasAktivasi || 'Unknown';
        if (!petugasAktivasiCounts[ptgs]) petugasAktivasiCounts[ptgs] = { user: ptgs, stasiun: p.stasiun || '-', value: 0 };
        petugasAktivasiCounts[ptgs].value++;
      }

      const tglIkr = standardizeDate(p.tglIkr);
      if (isIkr && (tglIkr === todayStr || tglAktivasi === todayStr)) {
        ikrHarian++;
        const ptgsIkr = p.petugasIkr || 'Unknown';
        if (!petugasIkrCounts[ptgsIkr]) petugasIkrCounts[ptgsIkr] = { user: ptgsIkr, stasiun: p.stasiun || '-', value: 0 };
        petugasIkrCounts[ptgsIkr].value++;
      }

      // Kendala dihitung dari dataKendalaSheet di bawah

    });

    // 2.5 Kendala Harian: Gunakan HANYA dari sheet BI6:BN jika ada, sesuai permintaan
    if (data.dataKendalaSheet && data.dataKendalaSheet.length > 0) {
      data.dataKendalaSheet.forEach(p => {
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        if (tglKendala === todayStr) {
          const ptgsKdl = p.reporterKendala || 'Unknown';
          if (String(ptgsKdl).toLowerCase() !== 'unknown') {
            kendalaHarian++;
            if (!reporterKendalaCounts[ptgsKdl]) reporterKendalaCounts[ptgsKdl] = { user: ptgsKdl, stasiun: p.stasiun || '-', value: 0 };
            reporterKendalaCounts[ptgsKdl].value++;
          }
        }
      });
    } else {
      // Fallback
      (data.pelangganData || []).forEach(p => {
        const isKendala = (p.ikr || '').toLowerCase() === 'kendala' || (p.aktivasi || '').toLowerCase() === 'kendala' || String(p.statusAktivasi || '').toLowerCase().includes('kendala') || String(p.statusIkr || '').toLowerCase().includes('kendala');
        const tglKendala = standardizeDate(p.tanggalKendala || p.timestampKendala || p.tglAktivasi || p.timestampAktivasi || p.tanggal || p.timestamp || p.waktuLapor);
        if (isKendala && tglKendala === todayStr) {
          const ptgsKdl = p.reporterKendala || p.petugasAktivasi || 'Unknown';
          if (String(ptgsKdl).toLowerCase() !== 'unknown') {
            kendalaHarian++;
            if (!reporterKendalaCounts[ptgsKdl]) reporterKendalaCounts[ptgsKdl] = { user: ptgsKdl, stasiun: p.stasiun || '-', value: 0 };
            reporterKendalaCounts[ptgsKdl].value++;
          }
        }
      });
    }

    (data.visitData || []).forEach(v => {
      if (standardizeDate(v.timestamp) === todayStr) visitHarian++;
    });

    // 3. Registrasi Harian dihitung dari dataRegistrasi (mengikuti web)
    const stasiunRegCounts = {};
    ALL_STATIONS.forEach(s => stasiunRegCounts[s] = 0);

    const parts = todayStr.split('-');
    const targetDateIndo = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const targetDateIntl = todayStr;

    (data.dataRegistrasi || []).forEach(reg => {
      const valStr = String(reg.tanggal || reg.tanggalRegistrasi || '');
      if (valStr.includes(targetDateIndo) || valStr.includes(targetDateIntl)) {
        let st = String(reg.stasiun || '').toUpperCase();
        const matched = ALL_STATIONS.find(s => st.includes(s));
        if (matched) st = matched;

        if (stasiunRegCounts[st] !== undefined) {
          stasiunRegCounts[st] += 1;
        } else {
          stasiunRegCounts[st] = 1;
        }
      }
    });

    const totalRegToday = Object.values(stasiunRegCounts).reduce((a, b) => a + b, 0);

    const CUSTOM_STATION_ORDER = ['WADU', 'RANDUBLATUNG', 'SULUR', 'KRADENAN', 'BRUMBUNG', 'ALASTUA', 'SEMARANG TAWANG', 'KALIWUNGU', 'KALIBODRI', 'WELERI', 'KRENGSENG'];

    const regArray = CUSTOM_STATION_ORDER.map(k => ({ nama: k, jumlah: stasiunRegCounts[k] || 0 }));
    const maxVal = Math.max(...regArray.map(r => r.jumlah), 1);

    const aktHarianArray = CUSTOM_STATION_ORDER.map(k => ({ nama: k, jumlah: aktStasiunCounts[k] || 0 }));
    const aktMaxVal = Math.max(...aktHarianArray.map(r => r.jumlah), 1);

    const leaderboardAktivasi = Object.values(petugasAktivasiCounts).sort((a, b) => b.value - a.value).slice(0, 10);
    const leadMaxAktivasi = Math.max(...leaderboardAktivasi.map(l => l.value), 1);

    const leaderboardIkr = Object.values(petugasIkrCounts).sort((a, b) => b.value - a.value).slice(0, 10);
    const leadMaxIkr = Math.max(...leaderboardIkr.map(l => l.value), 1);

    const leaderboardKendala = Object.values(reporterKendalaCounts).filter(u => String(u.user || '').toLowerCase() !== 'unknown').sort((a, b) => b.value - a.value).slice(0, 10);
    const leadMaxKendala = Math.max(...leaderboardKendala.map(l => l.value), 1);

    return { totalAktivasi, aktivasiHarian, kendalaHarian, visitHarian, totalRegToday, regArray, maxVal, aktHarianArray, aktMaxVal, ikrHarian, leaderboardAktivasi, leadMaxAktivasi, leaderboardIkr, leadMaxIkr, leaderboardKendala, leadMaxKendala };
  }, [data.pelangganData, data.visitData, data.dataRegistrasi, data.fastKpi, data.stationData, todayStr]);

  const discrepancyList = useMemo(() => {
    return (data.pelangganData || [])
      .map(row => {
        const tIkr = standardizeDate(row.tglIkr);
        const tAkt = standardizeDate(row.tglAktivasi || row.timestampAktivasi);

        const isIkrSelected = tIkr === todayStr;
        const isAktSelected = tAkt === todayStr;

        if (isIkrSelected && !isAktSelected) {
          return { ...row, discrepancyType: 'BELUM REPORT AKTIVASI' };
        } else if (isAktSelected && !isIkrSelected) {
          return { ...row, discrepancyType: 'AKTIVASI KENDALA KEMARIN' };
        }
        return null;
      })
      .filter(row => row !== null);
  }, [data.pelangganData, todayStr]);

  const overviewStats = useMemo(() => {
    let aktivasiSelesai = 0;
    let outstanding = 0;
    let waitingCount = 0;
    let suspendCount = 0;
    let readyDismantleCount = 0;
    let dismantledCount = 0;
    let kesulitanRendah = 0;
    let kesulitanSedang = 0;
    let kesulitanTinggi = 0;
    let petugasCounts = {};
    let rangeDays = 1;

    let startStr = '';
    let endStr = '';
    const t = new Date();
    let trenAktivasi = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    if (overviewDateFilter === 'Hari Ini') {
      startStr = endStr = getLocalDateStr(t);
      rangeDays = 1;
      trenAktivasi = [
        { label: 'Pagi', val: 0 },
        { label: 'Siang', val: 0 },
        { label: 'Sore', val: 0 },
        { label: 'Malam', val: 0 }
      ];
    } else if (overviewDateFilter === 'Minggu Ini') {
      const day = t.getDay();
      const diff = t.getDate() - day + (day === 0 ? -6 : 1);
      const firstDay = new Date(t.setDate(diff));
      startStr = getLocalDateStr(firstDay);
      endStr = getLocalDateStr(new Date(firstDay.valueOf() + 6 * 86400000));
      rangeDays = 7;
      trenAktivasi = [
        { label: 'Sen', val: 0 }, { label: 'Sel', val: 0 }, { label: 'Rab', val: 0 },
        { label: 'Kam', val: 0 }, { label: 'Jum', val: 0 }, { label: 'Sab', val: 0 }, { label: 'Min', val: 0 }
      ];
    } else if (overviewDateFilter === 'Bulan Ini') {
      startStr = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-01';
      endStr = getLocalDateStr(new Date(t.getFullYear(), t.getMonth() + 1, 0));
      rangeDays = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      trenAktivasi = [
        { label: 'W1', val: 0 }, { label: 'W2', val: 0 }, { label: 'W3', val: 0 },
        { label: 'W4', val: 0 }, { label: 'W5', val: 0 }
      ];
    } else if (overviewDateFilter === 'Semua Waktu') {
      startStr = '';
      endStr = '';
      rangeDays = 30; // fallback avg
      trenAktivasi = []; // will be populated dynamically
    } else if (overviewDateFilter.includes(' to ')) {
      // Spesifik Rentang Waktu ("2026-07-01 to 2026-07-15")
      const [start, end] = overviewDateFilter.split(' to ');
      startStr = start;
      endStr = end;

      const sDate = new Date(startStr);
      const eDate = new Date(endStr);
      const diffTime = Math.abs(eDate - sDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      rangeDays = diffDays;

      if (diffDays <= 1) {
        trenAktivasi = [
          { label: 'Pagi', val: 0 }, { label: 'Siang', val: 0 }, { label: 'Sore', val: 0 }, { label: 'Malam', val: 0 }
        ];
      } else if (diffDays <= 14) {
        trenAktivasi = [];
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(sDate.valueOf() + i * 86400000);
          trenAktivasi.push({ label: `${d.getDate()} ${monthNames[d.getMonth()] || ''}`, val: 0, sortKey: getLocalDateStr(d) });
        }
      } else if (diffDays <= 60) {
        const weeks = Math.ceil(diffDays / 7);
        trenAktivasi = Array.from({ length: weeks }, (_, i) => ({ label: `W${i + 1}`, val: 0 }));
      } else {
        trenAktivasi = [];
      }
    } else {
      // Fallback for "Agustus 2026" (if user already had it cached/selected previously)
      const monthNamesLocal = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const parts = overviewDateFilter.split(' ');
      if (parts.length === 2) {
        const mIndex = monthNamesLocal.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const y = parseInt(parts[1], 10);
        if (mIndex !== -1 && y) {
          startStr = `${y}-${String(mIndex + 1).padStart(2, '0')}-01`;
          endStr = getLocalDateStr(new Date(y, mIndex + 1, 0));
          rangeDays = new Date(y, mIndex + 1, 0).getDate();
          trenAktivasi = [
            { label: 'W1', val: 0 }, { label: 'W2', val: 0 }, { label: 'W3', val: 0 },
            { label: 'W4', val: 0 }, { label: 'W5', val: 0 }
          ];
        }
      }
    }
    let dynamicMonths = {};

    (data.pelangganData || []).forEach(p => {
      const pStasiun = String(p.stasiun || '').toLowerCase().trim();
      const stFilter = String(overviewStationFilter || '').toLowerCase().trim();
      const stMatch = stFilter === 'semua stasiun' || stFilter === '' || pStasiun === stFilter;

      if (!stMatch) return;

      const statusAktivasi = p.statusAktivasi || p.status_aktivasi;
      const statusIkr = p.statusIkr || p.status_ikr;
      const ikrStat = String(statusIkr || p.ikr || '').toUpperCase();
      const isAktif = ikrStat === 'SUDAH' || ikrStat.includes('DISMANTLE');
      const isWaiting = statusAktivasi === 'WAITING' || statusIkr === 'WAITING';

      const tAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);

      let inRange = true;
      if (startStr && endStr) {
        if (!tAkt) inRange = false;
        else inRange = tAkt >= startStr && tAkt <= endStr;
      }

      if (isAktif && inRange) {
        aktivasiSelesai++;

        if (tAkt) {
          const tDate = new Date(tAkt);

          if (overviewDateFilter === 'Hari Ini') {
            // Kita coba ambil jam dari timestamp jika ada
            const tsStr = p.timestampAktivasi || p.tglAktivasi || '';
            let hour = 12; // default if not found
            if (tsStr.includes('T')) {
              hour = parseInt(tsStr.split('T')[1].split(':')[0]);
            } else if (tsStr.includes(' ')) {
              hour = parseInt(tsStr.split(' ')[1].split(':')[0]);
            }
            if (hour >= 0 && hour < 12) trenAktivasi[0].val++;
            else if (hour >= 12 && hour < 15) trenAktivasi[1].val++;
            else if (hour >= 15 && hour < 19) trenAktivasi[2].val++;
            else trenAktivasi[3].val++;
          }
          else if (overviewDateFilter === 'Minggu Ini') {
            let dayIdx = tDate.getDay() - 1; // 0=Senin
            if (dayIdx === -1) dayIdx = 6; // Min=6
            if (trenAktivasi[dayIdx]) trenAktivasi[dayIdx].val++;
          }
          else if (overviewDateFilter === 'Bulan Ini' || overviewDateFilter.match(/^[A-Za-z]+ \d{4}$/)) {
            const dateNum = tDate.getDate();
            if (dateNum <= 7) trenAktivasi[0].val++;
            else if (dateNum <= 14) trenAktivasi[1].val++;
            else if (dateNum <= 21) trenAktivasi[2].val++;
            else if (dateNum <= 28) trenAktivasi[3].val++;
            else trenAktivasi[4].val++;
          }
          else if (overviewDateFilter === 'Semua Waktu' || overviewDateFilter.includes(' to ')) {
            if (overviewDateFilter.includes(' to ') && rangeDays <= 60) {
              const [start] = overviewDateFilter.split(' to ');
              const sDate = new Date(start);

              if (rangeDays <= 1) {
                const hour = tDate.getHours();
                if (hour >= 0 && hour < 12) trenAktivasi[0].val++;
                else if (hour >= 12 && hour < 15) trenAktivasi[1].val++;
                else if (hour >= 15 && hour < 19) trenAktivasi[2].val++;
                else trenAktivasi[3].val++;
              } else if (rangeDays <= 14) {
                const diffTime = tDate.getTime() - sDate.getTime();
                const diffDaysIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDaysIndex >= 0 && trenAktivasi[diffDaysIndex]) trenAktivasi[diffDaysIndex].val++;
              } else {
                const diffTime = tDate.getTime() - sDate.getTime();
                const diffDaysIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const weekIdx = Math.floor(diffDaysIndex / 7);
                if (weekIdx >= 0 && trenAktivasi[weekIdx]) trenAktivasi[weekIdx].val++;
              }
            } else {
              const mKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
              if (!dynamicMonths[mKey]) {
                dynamicMonths[mKey] = {
                  label: monthNames[tDate.getMonth()] + ' ' + String(tDate.getFullYear()).slice(-2),
                  val: 0,
                  sortKey: mKey
                };
              }
              dynamicMonths[mKey].val++;
            }
          }
        }

        const petugas = String(p.petugasAktivasi || p.user || '').trim();
        if (petugas) {
          if (!petugasCounts[petugas]) petugasCounts[petugas] = 0;
          petugasCounts[petugas]++;
        }

        // Hitung Kesulitan untuk item ini berdasarkan kabelPrecon
        let strPrecon = String(p.kabelPrecon || '0').toLowerCase();
        let totalMeters = 0;
        let nums = strPrecon.match(/\d+/g);
        if (nums) {
          let vals = nums.map(Number).filter(n => n >= 10);
          if (vals.length > 0) {
            totalMeters = vals.reduce((a, b) => a + b, 0);
          }
        }
        if (totalMeters <= 100) kesulitanRendah++;
        else if (totalMeters <= 150) kesulitanSedang++;
        else kesulitanTinggi++;
      }

      // MURNI LOGIKA UNTUK FILTER SECONDARY STATS (Real-time, Unaffected by Date Filter)
      const rawAktivasi = String(p.aktivasi || '').trim().toLowerCase();
      let finalStatus = getFinalPelangganStatus(p);


      if (finalStatus.includes('WAITING')) {
        waitingCount++;
        outstanding++;
      }
      if (finalStatus === 'SUSPEND') suspendCount++;
      if (finalStatus === 'READY TO DISMANTLE') readyDismantleCount++;
      if (finalStatus === 'DISMANTLED') dismantledCount++;
    });

    if (overviewDateFilter === 'Semua Waktu' || (overviewDateFilter.includes(' to ') && rangeDays > 60)) {
      trenAktivasi = Object.values(dynamicMonths).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      if (overviewDateFilter === 'Semua Waktu') rangeDays = 365;
    }

    const rataRata = aktivasiSelesai > 0 ? (aktivasiSelesai / rangeDays).toFixed(1) : '0';

    // Sort Leaderboard
    const sortedLeaderboard = Object.keys(petugasCounts).map(k => ({
      user: k.startsWith('@') ? k : '@' + k,
      count: petugasCounts[k]
    })).sort((a, b) => b.count - a.count);

    const colors = ['gold', 'silver', 'bronze', 'normal', 'normal'];
    sortedLeaderboard.forEach((item, idx) => {
      item.color = colors[idx] || 'normal';
      item.rank = idx + 1;
    });

    let averageScore = 0;
    let kesulitanLabel = "Belum ada progres";
    let kesulitanColor = "slate";
    let kesulitanIcon = "minus";

    const totalKesulitan = kesulitanRendah + kesulitanSedang + kesulitanTinggi;
    if (totalKesulitan > 0) {
      const totalScore = (kesulitanRendah * 1) + (kesulitanSedang * 2) + (kesulitanTinggi * 3);
      averageScore = totalScore / totalKesulitan;

      if (averageScore > 2.3) {
        kesulitanLabel = "Tinggi"; kesulitanColor = "rose"; kesulitanIcon = "alert-octagon";
      } else if (averageScore > 1.6) {
        kesulitanLabel = "Sedang"; kesulitanColor = "amber"; kesulitanIcon = "alert-triangle";
      } else {
        kesulitanLabel = "Rendah"; kesulitanColor = "emerald"; kesulitanIcon = "check-circle";
      }
    }

    let tingkatKesulitan = averageScore > 0 ? averageScore.toFixed(1) : '0';

    return {
      aktivasiSelesai,
      outstanding,
      waitingCount,
      suspendCount,
      readyDismantleCount,
      dismantledCount,
      rataRata,
      tingkatKesulitan,
      kesulitanLabel,
      kesulitanColor,
      kesulitanIcon,
      trenAktivasi,
      leaderboard: sortedLeaderboard
    };

  }, [data.pelangganData, overviewDateFilter, overviewStationFilter]);

  const gangguanStats = useMemo(() => {
    let total = 0;
    let selesai = 0;
    let aktif = 0;

    const d = new Date();
    const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    (data.visitData || []).forEach(v => {
      const vDate = standardizeDate(v.timestamp);
      let inDate = true;
      if (gangguanDateFilter === 'Hari Ini') inDate = vDate === todayStrLocal;
      else if (gangguanDateFilter === 'Bulan Ini') inDate = vDate.startsWith(currentMonthStr);
      else if (gangguanDateFilter === 'Rentang Waktu' && gangguanDateStart && gangguanDateEnd) inDate = vDate >= gangguanDateStart && vDate <= gangguanDateEnd;

      let inStation = true;
      if (gangguanStationFilter !== 'Semua Stasiun') {
        inStation = (v.stasiun || '').toLowerCase().trim() === gangguanStationFilter.toLowerCase();
      }

      if (inDate && inStation) {
        total++;
        if (['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes((v.status || '').toUpperCase())) {
          selesai++;
        } else {
          aktif++;
        }
      }
    });
    return { total, selesai, aktif };
  }, [data.visitData, gangguanDateFilter, gangguanDateStart, gangguanDateEnd, gangguanStationFilter]);

  const filteredGangguan = useMemo(() => {
    let filtered = data.visitData || [];

    const d = new Date();
    const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (gangguanDateFilter === 'Hari Ini') {
      filtered = filtered.filter(v => standardizeDate(v.timestamp) === todayStrLocal);
    } else if (gangguanDateFilter === 'Bulan Ini') {
      filtered = filtered.filter(v => standardizeDate(v.timestamp).startsWith(currentMonthStr));
    } else if (gangguanDateFilter === 'Rentang Waktu' && gangguanDateStart && gangguanDateEnd) {
      filtered = filtered.filter(v => { const vd = standardizeDate(v.timestamp); return vd >= gangguanDateStart && vd <= gangguanDateEnd; });
    }

    if (gangguanStationFilter !== 'Semua Stasiun') {
      filtered = filtered.filter(v => (v.stasiun || '').toLowerCase().trim() === gangguanStationFilter.toLowerCase());
    }

    if (gangguanFilter === 'SELESAI') {
      filtered = filtered.filter(v => ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes((v.status || '').toUpperCase()));
    } else if (gangguanFilter === 'AKTIF') {
      filtered = filtered.filter(v => !['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes((v.status || '').toUpperCase()));
    }

    if (gangguanSearch.trim()) {
      const q = gangguanSearch.toLowerCase();
      filtered = filtered.filter(v =>
        (v.idPelanggan || v.id_pelanggan || '').toLowerCase().includes(q) ||
        (v.namaPelanggan || v.nama_pelanggan || '').toLowerCase().includes(q) ||
        (v.keluhan || v.catatan || '').toLowerCase().includes(q) ||
        (v.stasiun || '').toLowerCase().includes(q) ||
        (v.petugas || v.teknisi || '').toLowerCase().includes(q)
      );
    }

    const parseMs = (tStr) => {
      if (!tStr) return 0;
      const str = String(tStr).trim();
      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10) - 1;
        const y = parseInt(dmyMatch[3], 10);
        const hh = parseInt(dmyMatch[4] || '0', 10);
        const mm = parseInt(dmyMatch[5] || '0', 10);
        const ss = parseInt(dmyMatch[6] || '0', 10);
        return new Date(y, m, d, hh, mm, ss).getTime();
      }
      const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (ymdMatch) {
        const y = parseInt(ymdMatch[1], 10);
        const m = parseInt(ymdMatch[2], 10) - 1;
        const d = parseInt(ymdMatch[3], 10);
        const hh = parseInt(ymdMatch[4] || '0', 10);
        const mm = parseInt(ymdMatch[5] || '0', 10);
        const ss = parseInt(ymdMatch[6] || '0', 10);
        return new Date(y, m, d, hh, mm, ss).getTime();
      }
      const parsed = Date.parse(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    return [...filtered].sort((a, b) => parseMs(b.timestamp) - parseMs(a.timestamp));
  }, [data.visitData, gangguanFilter, gangguanSearch, gangguanDateFilter, gangguanDateStart, gangguanDateEnd, gangguanStationFilter]);

  // STASIUN PERFORMANSI DINAMIS
  const performansiStationData = useMemo(() => {
    const rawStations = data.stationData || [];
    const d = new Date();
    const todayStrLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Hitung aktivasi selesai hari ini per stasiun
    const stationAktifTodayMap = {};
    (data.pelangganData || []).forEach(p => {
      const ikrStat = String(p.statusIkr || p.status_ikr || p.ikr || '').toUpperCase();
      const isAktif = ikrStat === 'SUDAH' || ikrStat.includes('DISMANTLE');
      const tAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
      if (isAktif && tAkt === todayStrLocal) {
        const st = String(p.stasiun || '').toLowerCase().trim();
        stationAktifTodayMap[st] = (stationAktifTodayMap[st] || 0) + 1;
      }
    });

    if (!rawStations || rawStations.length === 0) {
      return [];
    }

    return rawStations.map(item => {
      const rawSt = String(item.stasiun || '').trim();
      const stLower = rawSt.toLowerCase();

      const hpReguler = item.hpReguler !== undefined ? parseInt(item.hpReguler) : parseInt(item.hpTerbangun || 0);
      const hpPercepatan = item.hpPercepatan !== undefined ? parseInt(item.hpPercepatan) : parseInt(item.aktifHariIni || 0);
      const hpVal = hpReguler + hpPercepatan;

      const aktReguler = item.aktivasiReguler !== undefined ? parseInt(item.aktivasiReguler) : parseInt(item.totalAktivasiHc || 0);
      const aktPercepatan = item.aktivasiPercepatan !== undefined ? parseInt(item.aktivasiPercepatan) : parseInt(item.hcAktif || 0);

      const hcAktifReguler = item.hcAktifReguler !== undefined ? parseInt(item.hcAktifReguler) : parseInt(item.performaHc || 0);
      const hcAktifPercepatan = item.hcAktifPercepatan !== undefined ? parseInt(item.hcAktifPercepatan) : parseInt(item.tieringHc || 0);

      const totalHcVal = item.totalAktivasiHc !== undefined && item.hpPercepatan !== undefined
        ? parseInt(item.totalAktivasiHc)
        : (item.keterangan !== undefined ? parseInt(item.keterangan || 0) : (aktReguler + aktPercepatan));

      const hcAktifVal = hcAktifReguler + hcAktifPercepatan;

      const aktifToday = stationAktifTodayMap[stLower] !== undefined
        ? stationAktifTodayMap[stLower]
        : (item.hpPercepatan !== undefined ? parseInt(item.aktifHariIni || 0) : parseInt(item.performaAktivasi || 0));

      const perf = hpVal > 0 ? ((totalHcVal / hpVal) * 100).toFixed(2) : 0;

      return {
        rawStasiun: rawSt,
        stasiun: toProperCase(rawSt),
        hpReguler: hpReguler.toLocaleString('id-ID'),
        hpPercepatan: hpPercepatan.toLocaleString('id-ID'),
        hp: hpVal.toLocaleString('id-ID'),
        hpRaw: hpVal,
        aktReguler: aktReguler.toLocaleString('id-ID'),
        aktPercepatan: aktPercepatan.toLocaleString('id-ID'),
        total: totalHcVal.toLocaleString('id-ID'),
        hcAktifReguler: hcAktifReguler.toLocaleString('id-ID'),
        hcAktifPercepatan: hcAktifPercepatan.toLocaleString('id-ID'),
        hc: hcAktifVal.toLocaleString('id-ID'),
        aktif: aktifToday > 0 ? `+${aktifToday}` : '-',
        performa: Number(perf)
      };
    });
  }, [data.stationData, data.pelangganData]);

  // DETAIL PO DITERAPKAN PER STASIUN
  const detailPoList = useMemo(() => {
    if (!selectedPoStation) return [];
    const targetSt = String(selectedPoStation).toLowerCase().trim();
    return (data.detailPoData || []).filter(po => {
      const poSt = String(po.stasiun || '').toLowerCase().trim();
      return poSt === targetSt || poSt.includes(targetSt) || targetSt.includes(poSt);
    });
  }, [data.detailPoData, selectedPoStation]);

  // LOGIK & HELPER ODP COVERAGE
  const parseCoordsFromInput = (inputStr) => {
    if (!inputStr) return null;
    const str = String(inputStr).trim();

    const atMatch = str.match(/@([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
    }

    const paramMatch = str.match(/[?&](?:q|ll)=([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
    if (paramMatch) {
      return { lat: parseFloat(paramMatch[1]), lon: parseFloat(paramMatch[2]) };
    }

    const plainMatch = str.match(/([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/);
    if (plainMatch) {
      return { lat: parseFloat(plainMatch[1]), lon: parseFloat(plainMatch[2]) };
    }

    return null;
  };

  const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const coverageCustomerSuggestions = useMemo(() => {
    if (!coverageCustomerQuery.trim()) return [];
    const q = coverageCustomerQuery.toLowerCase().trim();
    return (data.pelangganData || []).filter(p => {
      const idStr = String(p.idPelanggan || p.id || '').toLowerCase();
      const nameStr = String(p.namaPelanggan || p.nama || '').toLowerCase();
      const addrStr = String(p.alamat || '').toLowerCase();
      return idStr.includes(q) || nameStr.includes(q) || addrStr.includes(q);
    }).slice(0, 6);
  }, [data.pelangganData, coverageCustomerQuery]);

  const nearestOdpList = useMemo(() => {
    const lat = parseFloat(coverageLat);
    const lon = parseFloat(coverageLon);
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return [];
    }

    const odpData = data.odpData || [];
    const computed = odpData.map(odp => {
      const oLat = parseFloat(odp.latitude || odp.lat || 0);
      const oLon = parseFloat(odp.longitude || odp.long || 0);
      const dist = (oLat !== 0 && oLon !== 0) ? haversineDistanceMeters(lat, lon, oLat, oLon) : 999999;
      const isFull = (parseInt(odp.portTerpakai || 0) >= parseInt(odp.kapasitas || 8));

      return {
        ...odp,
        distance: dist,
        isFull,
        routeEstimate: dist > 0 ? Math.round(dist * 1.25) : null
      };
    }).filter(o => o.distance < 10000);

    computed.sort((a, b) => a.distance - b.distance);
    return computed.slice(0, 10);
  }, [data.odpData, coverageLat, coverageLon]);

  const handleSelectCoverageCustomer = (cust) => {
    setSelectedCoverageCustomer(cust);
    setCoverageCustomerQuery(`${cust.idPelanggan || ''} - ${cust.namaPelanggan || cust.nama || ''}`.trim());
    setIsCustomerDropdownOpen(false);

    let coords = null;
    if (cust.latitude && cust.longitude) {
      const lat = parseFloat(cust.latitude);
      const lon = parseFloat(cust.longitude);
      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        coords = { lat, lon };
      }
    }

    if (!coords && (cust.mapsLink || cust.linkMaps || cust.alamat)) {
      coords = parseCoordsFromInput(cust.mapsLink || cust.linkMaps || cust.alamat);
    }

    if (coords) {
      setCoverageLat(coords.lat.toString());
      setCoverageLon(coords.lon.toString());
      showToast(`Koordinat ${cust.namaPelanggan || cust.idPelanggan} dimuat!`, 'success');
    } else {
      setCoverageLat('');
      setCoverageLon('');
      showToast(`Koordinat belum tersimpan untuk pelanggan ini`, 'error');
    }
  };

  const handleParseMapsLink = async () => {
    const inputStr = coverageMapsLink.trim();
    if (!inputStr) {
      showToast('Masukkan link Google Maps atau koordinat', 'error');
      return;
    }

    let coords = parseCoordsFromInput(inputStr);

    if (!coords && (inputStr.includes('goo.gl') || inputStr.includes('maps.app'))) {
      setIsParsingMapsLink(true);
      showToast('Mengekstrak lokasi dari link pendek...', 'info');
      try {
        const res = await api.run('expandMapsLink', { url: inputStr });
        if (res && res.success && res.url) {
          coords = parseCoordsFromInput(res.url);
        }
      } catch (err) {
        console.error("Gagal ekspansi link:", err);
      }
      setIsParsingMapsLink(false);
    }

    if (coords) {
      setCoverageLat(coords.lat.toString());
      setCoverageLon(coords.lon.toString());
      setSelectedCoverageCustomer(null);
      showToast('Koordinat berhasil diekstrak!', 'success');
    } else {
      showToast('Link Google Maps tidak valid / koordinat tidak terdeteksi', 'error');
    }
  };

  // --- LEAFLET MAP EFFECTS UNTUK ODP COVERAGE ---
  useEffect(() => {
    if (activeModule !== 'coverage') return;

    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true
      }).setView([-7.0051, 110.4381], 13); // Default Semarang center

      const googleStreets = window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });
      const googleHybrid = window.L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      googleStreets.addTo(mapInstance.current);

      window.L.control.layers({
        "Peta Jalan": googleStreets,
        "Satelit": googleHybrid
      }, null, { position: 'topright' }).addTo(mapInstance.current);

      markerLayerRef.current = window.L.layerGroup().addTo(mapInstance.current);
      userLayerRef.current = window.L.layerGroup().addTo(mapInstance.current);
      lineLayerRef.current = window.L.layerGroup().addTo(mapInstance.current);
    }
  }, [activeModule]);

  useEffect(() => {
    if (activeModule !== 'coverage' || !mapInstance.current) return;

    const lat = parseFloat(coverageLat);
    const lon = parseFloat(coverageLon);

    if (userLayerRef.current) userLayerRef.current.clearLayers();
    if (markerLayerRef.current) markerLayerRef.current.clearLayers();
    if (lineLayerRef.current) lineLayerRef.current.clearLayers();

    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const userIcon = window.L.divIcon({
        className: 'custom-user-marker',
        html: `<div style="width:16px;height:16px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(79,70,229,0.5);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      window.L.marker([lat, lon], { icon: userIcon }).addTo(userLayerRef.current);
      mapInstance.current.setView([lat, lon], 16);

      nearestOdpList.forEach(odp => {
        const oLat = parseFloat(odp.latitude || odp.lat || 0);
        const oLon = parseFloat(odp.longitude || odp.long || 0);

        if (oLat !== 0 && oLon !== 0) {
          const odpIcon = window.L.divIcon({
            className: 'custom-odp-marker',
            html: `<div style="width:12px;height:12px;background:${odp.isFull ? '#94a3b8' : '#10b981'};border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          window.L.marker([oLat, oLon], { icon: odpIcon }).addTo(markerLayerRef.current);

          // Jika ODP ini dipilih, gambar rute asli animasi
          const isSelected = selectedCoverageOdp && (selectedCoverageOdp.kodeOdp === odp.kodeOdp && selectedCoverageOdp.label === odp.label);
          if (isSelected) {
            fetch(`https://router.project-osrm.org/route/v1/driving/${lon},${lat};${oLon},${oLat}?overview=full&geometries=geojson`)
              .then(res => res.json())
              .then(data => {
                if (data && data.routes && data.routes[0]) {
                  const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]); // OSRM gives [lon, lat], Leaflet needs [lat, lon]
                  window.L.polyline(coords, {
                    color: '#6366f1',
                    weight: 3,
                    className: 'animated-route-line'
                  }).addTo(lineLayerRef.current);
                }
              })
              .catch(() => {
                // Fallback to straight line if API fails
                window.L.polyline([[lat, lon], [oLat, oLon]], {
                  color: '#6366f1',
                  weight: 3,
                  className: 'animated-route-line'
                }).addTo(lineLayerRef.current);
              });
          } else if (!selectedCoverageOdp) {
            // Opsional: gambar garis putus-putus tipis jika tidak ada yg dipilih
            window.L.polyline([[lat, lon], [oLat, oLon]], {
              color: odp.isFull ? '#cbd5e1' : '#a78bfa',
              weight: 2,
              dashArray: '4, 4',
              opacity: 0.4
            }).addTo(lineLayerRef.current);
          }
        }
      });
    }
  }, [activeModule, coverageLat, coverageLon, nearestOdpList, selectedCoverageOdp]);

  const riwayatAktivasiData = useMemo(() => {
    return (data.pelangganData || []).filter(p => {
      const isAktivasi = (p.aktivasi || '').toLowerCase() === 'sudah';
      const tglAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);
      return isAktivasi && tglAkt === todayStr;
    }).sort((a, b) => {
      const getComparableTime = (item) => {
        const str = String(item.timestampAktivasi || item.tglAktivasi || item.timestamp || '');
        const match = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
        if (match) return match[0];
        if (str.includes('T')) return str.split('T')[1]?.substring(0, 5) || '';
        return str;
      };
      return getComparableTime(b).localeCompare(getComparableTime(a));
    }).map(p => {
      let timeStr = '-';
      const tsStr = String(p.timestampAktivasi || p.tglAktivasi || p.timestamp || '');
      const timeMatch = tsStr.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

      if (timeMatch) {
        timeStr = `${timeMatch[0]} WIB`;
      } else if (tsStr.includes('T')) {
        const timePart = tsStr.split('T')[1]?.substring(0, 5);
        if (timePart) timeStr = `${timePart} WIB`;
      } else if (tsStr) {
        try {
          const d = new Date(tsStr);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
          }
        } catch (e) { }
      }

      return {
        nama: p.namaPelanggan || p.nama_pelanggan || 'Tanpa Nama',
        stasiun: p.stasiun || '-',
        alamat: p.alamat || '-',
        no: String(p.idPelanggan || p.id_pelanggan || '-').replace('# ', ''),
        odp: p.odp || p.odpAktual || p.kodeOdp || '-',
        port: p.port || p.portOdp || '-',
        dist: p.panjangKabel || p.panjang_kabel || p.precon || p.kabelPrecon || '-',
        sn: p.sn || p.serialNumber || p.snOnt || '-',
        time: timeStr,
        teknisi: '@' + String(p.petugasAktivasi || p.petugas_aktivasi || 'Unknown').replace('@', '')
      };
    });
  }, [data.pelangganData, todayStr]);

  const pelangganStats = useMemo(() => {
    const all = data.pelangganData || [];
    let aktif = 0, waiting = 0, suspend = 0, readyDismantle = 0, dismantled = 0, kendala = 0;
    all.forEach(p => {
      const st = getFinalPelangganStatus(p);
      if (st === 'AKTIF') aktif++;
      else if (st === 'KENDALA') kendala++;
      else if (st === 'SUSPEND') suspend++;
      else if (st === 'READY TO DISMANTLE') readyDismantle++;
      else if (st === 'DISMANTLED') dismantled++;
      else if (st === 'WAITING') waiting++;
    });
    return { total: all.length, aktif, waiting, suspend, readyDismantle, dismantled, kendala };
  }, [data.pelangganData]);

  const filteredPelangganData = useMemo(() => {
    const all = data.pelangganData || [];
    const q = pelangganSearch.toLowerCase().trim();
    return all.filter(p => {
      const st = getFinalPelangganStatus(p);

      const matchStatus = pelangganStatusFilter === 'SEMUA' || st === pelangganStatusFilter;
      const matchStation = pelangganStationFilter === 'Semua Stasiun' || String(p.stasiun || '').toLowerCase().trim() === pelangganStationFilter.toLowerCase().trim();
      if (!matchStatus || !matchStation) return false;
      if (!q) return true;
      const id = String(p.idPelanggan || p.id || '').toLowerCase();
      const nama = String(p.namaPelanggan || p.nama || '').toLowerCase();
      const alamat = String(p.alamat || '').toLowerCase();
      const station = String(p.stasiun || '').toLowerCase();
      return id.includes(q) || nama.includes(q) || alamat.includes(q) || station.includes(q);
    }).map(p => {
      let status = getFinalPelangganStatus(p);

      // Compute age in days for WAITING items
      let ageDays = -1;
      let ageHours = -1;
      if (status === 'WAITING') {
        const regDateRaw = p.tanggalRegistrasi || p.tglAktivasi;
        if (regDateRaw) {
          const std = standardizeDate(regDateRaw);
          if (std) {
            const regDate = new Date(std);
            if (!isNaN(regDate.getTime())) {
              const today = new Date();
              const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const regDateZero = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
              const diffMs = todayZero - regDateZero;
              ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

              const rawDate = new Date(regDateRaw);
              if (!isNaN(rawDate.getTime())) {
                const diffMsReal = today - rawDate;
                ageHours = Math.max(0, Math.floor(diffMsReal / (1000 * 60 * 60)));
              }
            }
          }
        }
      }
      return { ...p, _status: status, _ageDays: ageDays, _ageHours: ageHours };
    }).sort((a, b) => {
      // Sort WAITING by age descending (oldest first), others keep original order
      if (a._status === 'WAITING' && b._status === 'WAITING') return b._ageDays - a._ageDays;
      if (a._status === 'WAITING') return -1;
      if (b._status === 'WAITING') return 1;
      return 0;
    });
  }, [data.pelangganData, pelangganSearch, pelangganStatusFilter, pelangganStationFilter]);

  const keluhanOptions = [
    "Modem LOS / Nyala Merah", "No Internet / Tidak Ada Koneksi", "Koneksi Putus-Putus / Lambat",
    "Kabel Drop / Putus", "Perangkat Mati / Rusak", "Kendala Konfigurasi / Sistem",
    "Tindak Lanjut Visit Teknisi", "Keluhan Lainnya..."
  ];

  const filteredPelangganSuggestions = useMemo(() => {
    if (!newTicketSearch.trim() || newTicketSearch.length < 2) return [];
    const q = newTicketSearch.toLowerCase();
    return (data.pelangganData || []).filter(p =>
      String(p.idPelanggan || '').toLowerCase().includes(q) ||
      String(p.namaPelanggan || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [newTicketSearch, data.pelangganData]);

  const filteredPetugasList = useMemo(() => {
    if (!newTicketPetugasSearch.trim()) return data.teknisiData;
    const q = newTicketPetugasSearch.toLowerCase();
    return (data.teknisiData || []).filter(ptg =>
      String(ptg.nama || '').toLowerCase().includes(q) ||
      String(ptg.username || '').toLowerCase().includes(q)
    );
  }, [newTicketPetugasSearch, data.teknisiData]);

  const resetNewTicketModal = () => {
    setNewTicketSearch('');
    setNewTicketSelectedPelanggan(null);
    setNewTicketKeluhan('');
    setNewTicketCatatan('');
    setNewTicketPetugas('');
    setNewTicketPetugasSearch('');
    setNewTicketIsKeluhanOpen(false);
    setNewTicketIsPetugasOpen(false);
    setNewTicketIsSaving(false);
    setNewTicketError('');
  };

  const handleNewTicketSubmit = async () => {
    if (!newTicketSelectedPelanggan) { setNewTicketError('Pilih pelanggan terlebih dahulu!'); return; }
    if (!newTicketKeluhan) { setNewTicketError('Keluhan pelanggan wajib dipilih!'); return; }
    if (!newTicketCatatan.trim()) { setNewTicketError('Deskripsi / catatan wajib diisi!'); return; }

    setNewTicketIsSaving(true);
    setNewTicketError('');

    let usernamePetugas = newTicketPetugas;
    if (newTicketPetugas && data.teknisiData.length > 0) {
      const tk = data.teknisiData.find(t => t.nama === newTicketPetugas);
      if (tk && tk.username) {
        usernamePetugas = tk.username.startsWith('@') ? tk.username : '@' + tk.username;
      }
    }

    const p = newTicketSelectedPelanggan;
    const now = new Date();
    const localTimestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    const payload = {
      idPelanggan: p.idPelanggan || '',
      namaPelanggan: p.namaPelanggan || '',
      stasiun: p.stasiun || '',
      keluhan: newTicketKeluhan,
      catatan: newTicketCatatan,
      snOnt: p.snOnt || '',
      odpAktual: p.odpAktual || p.kodeOdp || '',
      portOdp: p.portOdp || '',
      nomorHp: p.nomorHp || '',
      latitude: p.latitude || '',
      longitude: p.longitude || '',
      petugas: usernamePetugas,
      status: 'OPEN',
      timestamp: localTimestamp
    };

    const finalize = () => {
      setData(prev => {
        const nextList = [payload, ...prev.visitData];
        setCachedData('otas_cache_visit', nextList);
        return { ...prev, visitData: nextList };
      });
      setNewTicketIsSaving(false);
      showToast('Tiket berhasil dibuat!');
      setTimeout(() => { setShowNewTicketModal(false); resetNewTicketModal(); }, 500);
    };

    try {
      await supabase.from('log_visit').insert({
        timestamp: localTimestamp,
        id_pelanggan: payload.idPelanggan,
        nama_pelanggan: payload.namaPelanggan,
        stasiun: payload.stasiun,
        keluhan: payload.keluhan,
        catatan: payload.catatan,
        status_visit: 'OPEN',
        odp: payload.odpAktual,
        port: payload.portOdp,
        sn_ont: payload.snOnt,
        nomor_hp: payload.nomorHp,
        latitude: payload.latitude,
        longitude: payload.longitude,
        petugas: payload.petugas
      });
      finalize();
    } catch (err) {
      console.warn("Gagal simpan ke Supabase, fallback:", err);
      finalize();
    }
  };

  // Lock body scroll when detail modal is open
  const showToast = (message, type = 'success') => {
    setToastConfig({ show: true, message, type });
    setTimeout(() => {
      setToastConfig(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleSavePelanggan = async () => {
    setIsSavingPelanggan(true);
    try {
      const { idPelanggan, ...updateData } = editPelangganForm;

      let finalAktivasi = updateData.aktivasi;
      let finalIkr = updateData.ikr;

      if (finalAktivasi === 'Waiting') {
        finalAktivasi = 'Belum';
        finalIkr = 'Belum';
      } else if (finalAktivasi === 'Aktif') {
        finalAktivasi = 'Sudah';
        finalIkr = 'Sudah';
      }

      const formatTgl = (tgl) => {
        if (!tgl) return '';
        if (tgl.includes('T')) {
          let f = tgl.replace('T', ' ');
          if (f.length === 16) f += ':00';
          return f;
        }
        return tgl;
      };

      const { error } = await supabase.from('data_pelanggan').update({
        nomor_hp: updateData.nomorHp,
        alamat: updateData.alamat,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        odp: updateData.odpAktual,
        port_odp: updateData.portOdp,
        sn_ont: updateData.snOnt,
        kabel_precon: updateData.kabelPrecon,
        status_aktivasi: finalAktivasi,
        status_ikr: finalIkr,
        tgl_aktivasi: formatTgl(updateData.tglAktivasi),
        tgl_ikr: formatTgl(updateData.tglIkr),
        petugas_aktivasi: updateData.petugasAktivasi,
        petugas_ikr: updateData.petugasIkr,
        catatan: updateData.catatan,
        issue_kendala: updateData.issueKendala
      }).eq('id_pelanggan', idPelanggan);

      const updated = { 
        ...selectedPelanggan, 
        ...updateData,
        aktivasi: finalAktivasi,
        ikr: finalIkr
      };

      // Teruskan ke Webhook / Google Script agar Google Sheets ikut terupdate sebagai salinan
      if (typeof api !== 'undefined' && api.run) {
        const payloadWebhook = {
          idPelanggan: idPelanggan,
          namaPelanggan: updated.namaPelanggan || updated.nama || '',
          stasiun: updated.stasiun || '',
          nomorHp: updated.nomorHp,
          alamat: updated.alamat,
          latitude: updated.latitude,
          longitude: updated.longitude,
          odpAktual: updated.odpAktual,
          portOdp: updated.portOdp,
          snOnt: updated.snOnt,
          kabelPrecon: updated.kabelPrecon,
          aktivasi: finalAktivasi,
          ikr: finalIkr,
          tglAktivasi: formatTgl(updateData.tglAktivasi),
          tglIkr: formatTgl(updateData.tglIkr),
          petugasAktivasi: updated.petugasAktivasi,
          petugasIkr: updated.petugasIkr,
          catatan: updated.catatan,
          issueKendala: updateData.issueKendala,
          reporterKendala: updated.reporterKendala || updated.reporter_kendala,
          tanggalKendala: updated.tanggalKendala || updated.tanggal_kendala
        };
        try {
          await api.run('updatePelangganData', payloadWebhook);
        } catch (webhookErr) {
          console.warn("Gagal sinkronisasi salinan ke webhook:", webhookErr);
        }
      }

      setSelectedPelanggan(updated);
      setIsEditingPelanggan(false);

      setData(prev => ({
        ...prev,
        pelangganData: prev.pelangganData.map(p => p.idPelanggan === idPelanggan ? updated : p)
      }));
      showToast('Data pelanggan berhasil diupdate!', 'success');
    } catch (err) {
      showToast('Gagal menyimpan data: ' + err.message, 'error');
    } finally {
      setIsSavingPelanggan(false);
    }
  };

  useEffect(() => {
    if (selectedPelanggan || selectedPoStation) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedPelanggan, selectedPoStation]);

  // Re-render icon lucide setelah mount
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeTab, activeModule, data]);

  const menuItems = [
    { id: 'overview', icon: 'layout-dashboard', label: 'Overview', color: 'blue' },
    { id: 'performansi', icon: 'bar-chart-2', label: 'Performansi', color: 'rose' },
    { id: 'okupansi', icon: 'server', label: 'Data Okupansi', color: 'teal' },
    { id: 'pelanggan', icon: 'users', label: 'Data Pelanggan', color: 'emerald' },
    { id: 'gangguan', icon: 'alert-triangle', label: 'Data Gangguan', color: 'amber' },
    { id: 'outstanding', icon: 'map-pin', label: 'Outstanding WO', color: 'purple' },
    { id: 'coverage', icon: 'map', label: 'ODP Coverage', color: 'indigo' }
  ];

  const getColorClasses = (color) => {
    const map = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300',
      amber: 'text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300',
      purple: 'text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300',
      rose: 'text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-300',
      teal: 'text-teal-600 bg-teal-50 border-teal-100 hover:border-teal-300',
    };
    return map[color] || map.blue;
  };

  const handleBack = () => {
    window.history.back(); // Native stack unwinding
  };

  const handleTouchStart = (e) => {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY > 0) {
      // Add resistance to the pull
      const resistantY = Math.min(deltaY * 0.4, 70);
      setPullY(resistantY);
    } else {
      setPullY(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullY > 55) {
      setIsRefreshing(true);
      setPullY(55); // Keep it loading at 55px

      // Call refresh hemat kuota (membaca dari cache lokal & re-sync realtime)
      await new Promise(r => setTimeout(r, 400));
      await fetchData(false); 

      setIsRefreshing(false);
      setPullY(0);
    } else {
      setPullY(0);
    }
  };

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const notificationTickets = useMemo(() => {
    const now = new Date();
    return (data.visitData || []).filter(v => {
      const status = (v.status || 'OPEN').toUpperCase();
      return !['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(status);
    }).map(v => {
      const ticketTime = new Date(v.timestamp);
      let diffHours = 0;
      let isSLAExceeded = false;
      if (!isNaN(ticketTime.getTime())) {
        diffHours = (now - ticketTime) / (1000 * 60 * 60);
        isSLAExceeded = diffHours > 4;
      }
      return { ...v, diffHours, isSLAExceeded };
    }).sort((a, b) => {
      if (a.isSLAExceeded !== b.isSLAExceeded) {
        return a.isSLAExceeded ? -1 : 1;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [data.visitData]);

  const slaCount = notificationTickets.filter(t => t.isSLAExceeded).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative max-w-md mx-auto w-full shadow-2xl overflow-hidden">

      {/* CROP MODAL */}
      {cropModalOpen && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col max-w-md mx-auto animate-fade-in">
          <div className="h-16 px-4 flex items-center justify-between text-white shrink-0 border-b border-white/10 relative z-20 bg-slate-900">
            <button onClick={() => { setCropModalOpen(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-2 -ml-2 text-white/70 hover:text-white">
              <Icon name="x" size={24} />
            </button>
            <span className="font-bold text-[15px]">Atur Foto</span>
            <button onClick={handleSaveCrop} className="p-2 -mr-2 text-blue-400 font-bold active:scale-95 transition-transform">
              Selesai
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
            onTouchStart={e => handleCropStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => handleCropMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleCropEnd}
            onMouseDown={e => handleCropStart(e.clientX, e.clientY)}
            onMouseMove={e => handleCropMove(e.clientX, e.clientY)}
            onMouseUp={handleCropEnd} onMouseLeave={handleCropEnd}
          >
            <div ref={cropContainerRef} className="w-[250px] h-[250px] rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] pointer-events-none absolute z-10 box-border border-2 border-white/30"></div>
            <img
              id="crop-target-img"
              src={tempImage}
              alt="Crop target"
              draggable="false"
              style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`, userSelect: 'none', WebkitUserDrag: 'none' }}
              className="max-w-full max-h-[70vh] object-contain origin-center transition-none pointer-events-none"
            />
          </div>

          <div className="p-6 shrink-0 bg-slate-900 relative z-20 space-y-4 pb-10">
            <div className="flex items-center gap-3">
              <Icon name="zoom-out" size={16} className="text-white/50" />
              <input
                type="range" min="0.5" max="3" step="0.01"
                value={cropZoom}
                onChange={e => setCropZoom(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <Icon name="zoom-in" size={16} className="text-white/50" />
            </div>
            <p className="text-center text-[10px] text-white/50">Geser gambar untuk menyesuaikan posisi</p>
          </div>
        </div>
      )}

      {/* HEADER (Berubah jika masuk modul) */}
      <header className="bg-white h-16 px-4 flex items-center justify-between shadow-sm z-30 shrink-0 border-b border-slate-200/60 relative">
        {!activeModule ? (
          <>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="OpsTracker Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
              <div>
                <h1 className="font-bold text-slate-800 text-[15px] leading-tight">OpsTracker</h1>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Desnarum</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors relative ${isNotificationOpen ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Icon name="bell" size={16} />
                {slaCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 border-2 border-white animate-pulse shadow-sm">
                    {notificationTickets.length}
                  </span>
                ) : notificationTickets.length > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 border-2 border-white shadow-sm">
                    {notificationTickets.length}
                  </span>
                ) : null}
              </button>

              {/* Dropdown Notifikasi */}
              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                  <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-dropdown">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800">Tiket Terbuka</h3>
                      {slaCount > 0 ? (
                        <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{slaCount} SLA Warning</span>
                      ) : notificationTickets.length > 0 ? (
                        <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{notificationTickets.length} Tiket Aktif</span>
                      ) : null}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notificationTickets.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notificationTickets.map((ticket, idx) => (
                            <div key={idx} className={`p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start ${ticket.isSLAExceeded ? 'bg-rose-50/50' : ''}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ticket.isSLAExceeded ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                <Icon name={ticket.isSLAExceeded ? "alert-triangle" : "file-text"} size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                  <p className="text-[11px] font-bold text-slate-800 truncate pr-2">
                                    {ticket.isSLAExceeded ? 'SLA Gangguan' : 'Tiket Aktif'}
                                  </p>
                                  {ticket.isSLAExceeded && (
                                    <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded shrink-0 leading-none flex items-center h-[14px]">
                                      &gt;4 Jam
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-snug mb-1">
                                  Tiket <span className="font-bold text-slate-700">{ticket.id_pelanggan || ticket.idPelanggan || '-'}</span> ({ticket.nama_pelanggan || ticket.namaPelanggan || 'Tanpa Nama'}) segera ditindak lanjuti.
                                </p>
                                <p className={`text-[9px] font-bold flex items-center gap-1 ${ticket.isSLAExceeded ? 'text-rose-500' : 'text-slate-400'}`}>
                                  <Icon name="clock" size={10} /> {standardizeDate(ticket.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center">
                          <Icon name="check-circle" size={32} className="text-emerald-400 mb-2 opacity-50" />
                          <p className="text-[11px] font-bold text-slate-500">Semua Terkendali</p>
                          <p className="text-[9px] text-slate-400 mt-1">Tidak ada tiket aktif saat ini</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-1.5 -ml-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
                <Icon name="chevron-left" size={24} />
              </button>
              <h1 className="text-[15px] font-bold text-slate-800 truncate">
                {menuItems.find(m => m.id === activeModule)?.label}
              </h1>
            </div>
          </>
        )}
      </header>

      {/* SCROLLABLE AREA WRAPPER */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-100">

        {/* PULL TO REFRESH INDICATOR */}
        <div
          className="absolute left-0 right-0 z-0 flex justify-center items-end overflow-hidden"
          style={{
            top: 0,
            height: `${Math.max(pullY, isRefreshing ? 60 : 0)}px`,
            transition: isPulling ? 'none' : 'height 0.3s ease-out'
          }}
        >
          <div className="mb-4 bg-white rounded-full shadow-md w-9 h-9 flex items-center justify-center border border-slate-200">
            <Icon
              name="refresh-cw"
              size={18}
              className={`text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: isPulling ? `rotate(${pullY * 3}deg)` : 'none' }}
            />
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <main
          ref={mainRef}
          onTouchStart={activeModule === 'outstanding' ? undefined : handleTouchStart}
          onTouchMove={activeModule === 'outstanding' ? undefined : handleTouchMove}
          onTouchEnd={activeModule === 'outstanding' ? undefined : handleTouchEnd}
          className={`flex-1 overflow-y-auto pb-[75px] relative z-10 animate-fade custom-scrollbar bg-slate-50 ${activeModule === 'outstanding' ? 'px-0 pt-0' : 'px-4 pt-5'
            }`}
          style={{ transform: `translateY(${activeModule === 'outstanding' ? 0 : Math.max(pullY, isRefreshing ? 60 : 0)}px)` }}
        >
          {/* VIEW HOMEPAGE */}
          {!activeModule && activeTab === 'home' && (
            <div className="space-y-6">

              {/* Banner ala OpsTracker */}
              <div className="bg-blue-600 bg-gradient-to-br from-blue-700 to-[#1e3a8a] rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-lg font-bold mb-1">Halo, Tim Leader!</h2>
                  <p className="text-blue-100 text-[11px]">Pantau Operasional Desnarum hari ini.</p>
                </div>
                <Icon name="activity" size={120} className="absolute -right-8 -bottom-8 text-white opacity-10" />
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Total Aktivasi HC</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    {isGlobalLoading ? (
                      <div className="h-5 w-10 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-xl font-black text-slate-800 leading-none">{homeStats.totalAktivasi}</span>
                    )}
                    <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Icon name="activity" size={12} />
                    </div>
                  </div>
                </div>

                <div onClick={openAktivasiModal} className={`bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between transition-all ${!isGlobalLoading && homeStats.aktivasiHarian > 0 ? 'cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 active:scale-95' : ''}`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Aktivasi Harian</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    {isGlobalLoading ? (
                      <div className="h-5 w-10 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-xl font-black text-slate-800 leading-none">{homeStats.aktivasiHarian}</span>
                    )}
                    <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                      <Icon name="check-circle" size={12} />
                    </div>
                  </div>
                </div>

                <div onClick={openKendalaModal} className={`bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between transition-all ${!isGlobalLoading && homeStats.kendalaHarian > 0 ? 'cursor-pointer hover:bg-rose-50 hover:border-rose-200 active:scale-95' : ''}`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Kendala Harian</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    {isGlobalLoading ? (
                      <div className="h-5 w-10 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-xl font-black text-slate-800 leading-none">{homeStats.kendalaHarian}</span>
                    )}
                    <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                      <Icon name="alert-triangle" size={12} />
                    </div>
                  </div>
                </div>

                <div onClick={openVisitModal} className={`bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between transition-all ${!isGlobalLoading && homeStats.visitHarian > 0 ? 'cursor-pointer hover:bg-purple-50 hover:border-purple-200 active:scale-95' : ''}`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Visit / Gangguan</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    {isGlobalLoading ? (
                      <div className="h-5 w-10 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                      <span className="text-xl font-black text-slate-800 leading-none">{homeStats.visitHarian}</span>
                    )}
                    <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                      <Icon name="headphones" size={12} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Registrasi Pelanggan Hari Ini */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon name="user-plus" size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-[13px] leading-tight mb-0.5">Registrasi Pelanggan Hari Ini</h3>
                      <p className="text-[9px] text-slate-400">Total pendaftaran (sales) baru pada {todayDateString}</p>
                    </div>
                  </div>
                  <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1">
                    Total: {isGlobalLoading ? <div className="w-4 h-2.5 bg-white/30 rounded animate-pulse"></div> : homeStats.totalRegToday}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {isGlobalLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="h-[42px] bg-slate-100 rounded-lg animate-pulse"></div>
                    ))
                  ) : (
                    homeStats.regArray.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => openRegistrasiModal(item.nama)}
                        className={`flex justify-between items-center border border-slate-100 rounded-lg p-2.5 transition-all ${item.jumlah > 0 ? 'bg-white cursor-pointer hover:bg-blue-50 hover:border-blue-200 active:scale-95 shadow-sm' : 'bg-slate-50/50 opacity-80'}`}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wide truncate mr-2 ${item.jumlah > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{item.nama}</span>
                        <span className={`text-[12px] font-black ${item.jumlah > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{item.jumlah}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Raihan Aktivasi Harian per Stasiun */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="train" size={18} className="text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-[13px]">Raihan Aktivasi Harian per Stasiun</h3>
                </div>
                <p className="text-[10px] text-slate-400 mb-5 ml-6">Progres aktivasi pada tanggal {todayDateString}</p>

                <div className="space-y-4">
                  {isGlobalLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-slate-200 rounded animate-pulse shrink-0"></div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full animate-pulse"></div>
                        <div className="h-3 w-4 bg-slate-200 rounded animate-pulse shrink-0"></div>
                      </div>
                    ))
                  ) : (
                    homeStats.aktHarianArray.map((item, idx) => {
                      const percentage = homeStats.aktMaxVal === 0 ? 0 : (item.jumlah / homeStats.aktMaxVal) * 100;

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest w-24 shrink-0 truncate">
                            {item.nama}
                          </span>

                          <div className="flex-1 h-2 bg-slate-100 rounded-full relative flex items-center mr-2">
                            {/* Fill */}
                            <div
                              className="absolute left-0 top-0 h-full bg-emerald-100 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                            {/* Icon Marker */}
                            <div
                              className="absolute w-5 h-5 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-sm z-10 -ml-2.5 transition-all"
                              style={{ left: `${percentage}%` }}
                            >
                              <Icon name="train" size={10} className="text-emerald-600" />
                            </div>
                          </div>

                          <span className={`text-[11px] font-black w-4 text-right shrink-0 ${item.jumlah > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.jumlah}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Report Petugas Lapangan */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 text-[15px] mb-0.5">Report Petugas Lapangan</h3>
                <p className="text-[10px] text-slate-400 mb-4">Data pekerjaan pada {todayDateString}</p>

                {/* Chips/Filters */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div onClick={() => setActiveReportTab('aktivasi')} className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 transition-colors cursor-pointer ${activeReportTab === 'aktivasi' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activeReportTab === 'aktivasi' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                    <span className={`text-[10px] font-bold ${activeReportTab === 'aktivasi' ? 'text-blue-700' : 'text-slate-600'}`}>Aktivasi</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-black ${activeReportTab === 'aktivasi' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{isGlobalLoading ? '-' : homeStats.aktivasiHarian}</span>
                  </div>
                  <div onClick={() => setActiveReportTab('ikr')} className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 transition-colors cursor-pointer ${activeReportTab === 'ikr' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activeReportTab === 'ikr' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className={`text-[10px] font-bold ${activeReportTab === 'ikr' ? 'text-emerald-700' : 'text-slate-600'}`}>IKR</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-black ${activeReportTab === 'ikr' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{isGlobalLoading ? '-' : homeStats.ikrHarian}</span>
                  </div>
                  <div onClick={() => setActiveReportTab('kendala')} className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 transition-colors cursor-pointer ${activeReportTab === 'kendala' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activeReportTab === 'kendala' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                    <span className={`text-[10px] font-bold ${activeReportTab === 'kendala' ? 'text-rose-700' : 'text-slate-600'}`}>Kendala</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ml-1 font-black ${activeReportTab === 'kendala' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{isGlobalLoading ? '-' : homeStats.kendalaHarian}</span>
                  </div>
                </div>

                {/* Sync Status */}
                {(() => {
                  if (isGlobalLoading) {
                    return (
                      <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 mb-5">
                        <Icon name="refresh-cw" size={10} className="text-slate-400 animate-spin" />
                        <span className="text-[9px] font-bold text-slate-500">Mensinkronisasi...</span>
                      </div>
                    );
                  }

                  const isSinkron = homeStats.aktivasiHarian === homeStats.ikrHarian;
                  const selisih = Math.abs(homeStats.aktivasiHarian - homeStats.ikrHarian);

                  if (isSinkron) {
                    return (
                      <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 mb-5">
                        <Icon name="check-circle" size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-bold text-emerald-600">Semua Data Laporan Sinkron</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      onClick={() => setShowDiscrepancyModal(true)}
                      className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mb-5 cursor-pointer hover:bg-amber-100 active:scale-95 transition-all"
                    >
                      <Icon name="alert-triangle" size={10} className="text-amber-500" />
                      <span className="text-[9px] font-bold text-amber-700">
                        Ada Selisih Data (Aktivasi {homeStats.aktivasiHarian} vs IKR {homeStats.ikrHarian})
                      </span>
                      <Icon name="chevron-right" size={10} className="text-amber-500 ml-1" />
                    </div>
                  );
                })()}

                {/* Bar Chart List */}
                <div className="space-y-1.5 border-r-2 border-slate-100 pr-2 relative">
                  {(() => {
                    if (isGlobalLoading) return (
                      <div className="space-y-3 mt-2">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="w-[85px] shrink-0 flex flex-col items-end gap-1.5">
                              <div className="h-2.5 w-16 bg-slate-200 rounded animate-pulse"></div>
                              <div className="h-2 w-10 bg-slate-100 rounded animate-pulse"></div>
                            </div>
                            <div className="flex-1">
                              <div className="h-3.5 w-full bg-slate-100 rounded-sm animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );

                    const currentLeaderboard = activeReportTab === 'aktivasi' ? homeStats.leaderboardAktivasi : activeReportTab === 'ikr' ? homeStats.leaderboardIkr : homeStats.leaderboardKendala;
                    const currentLeadMax = activeReportTab === 'aktivasi' ? homeStats.leadMaxAktivasi : activeReportTab === 'ikr' ? homeStats.leadMaxIkr : homeStats.leadMaxKendala;

                    if (currentLeaderboard.length === 0) return <div className="text-center text-[11px] text-slate-400 py-4">Belum ada data pekerjaan hari ini.</div>;

                    return currentLeaderboard.map((item, idx) => {
                      const percentage = currentLeadMax === 0 ? 0 : (item.value / currentLeadMax) * 100;
                      const barColor = activeReportTab === 'aktivasi' ? 'bg-blue-500' : activeReportTab === 'ikr' ? 'bg-emerald-500' : 'bg-rose-500';
                      const textColor = activeReportTab === 'aktivasi' ? 'text-blue-600' : activeReportTab === 'ikr' ? 'text-emerald-600' : 'text-rose-600';
                      const cleanUsername = String(item.user).replace('@', '');

                      return (
                        <div key={idx} onClick={() => openPetugasModal(item.user, activeReportTab)} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 py-1 px-1.5 -mx-1.5 rounded-lg transition-colors">
                          <div className="w-[85px] shrink-0 text-right">
                            <p className="text-[10px] font-bold text-slate-700 truncate">@{cleanUsername}</p>
                            <p className="text-[8px] text-slate-400 truncate">{item.stasiun}</p>
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <div className={`h-3.5 ${barColor} rounded-sm transition-all duration-1000 ease-out`} style={{ width: barsMounted ? `${percentage}%` : '0%' }}></div>
                            <span className={`text-[11px] font-black ${textColor} transition-opacity duration-700 delay-300 ${barsMounted ? 'opacity-100' : 'opacity-0'}`}>{item.value}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Riwayat Aktivasi */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-[14px]">Riwayat Aktivasi</h3>
                    <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded-sm ml-1 uppercase">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="relative">
                    <div onClick={() => setIsRiwayatDropdownOpen(!isRiwayatDropdownOpen)} className="flex items-center gap-1 border border-slate-200 rounded-md px-2 py-1 bg-slate-50 shrink-0 cursor-pointer hover:bg-slate-100">
                      <Icon name="filter" size={10} className="text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-500">{riwayatFilter || 'Semua Stasiun'}</span>
                      <Icon name="chevron-down" size={10} className="text-slate-400" />
                    </div>
                    {isRiwayatDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 shadow-lg rounded-md z-10 py-1">
                        <div onClick={() => { setRiwayatFilter(''); setIsRiwayatDropdownOpen(false); }} className={`px-3 py-1.5 text-[10px] cursor-pointer ${!riwayatFilter ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>Semua Stasiun</div>
                        {[...new Set(riwayatAktivasiData.map(item => item.stasiun))].filter(s => s && s !== '-').sort().map((stasiun, idx) => (
                          <div key={idx} onClick={() => { setRiwayatFilter(stasiun); setIsRiwayatDropdownOpen(false); }} className={`px-3 py-1.5 text-[10px] cursor-pointer ${riwayatFilter === stasiun ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {stasiun}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1 -mr-1">
                  {riwayatAktivasiData.filter(item => !riwayatFilter || item.stasiun === riwayatFilter).length === 0 ? (
                    <div className="text-center text-[11px] text-slate-400 py-8 border border-dashed border-slate-200 rounded-lg">Belum ada riwayat aktivasi {riwayatFilter ? `di ${riwayatFilter} ` : ''}hari ini.</div>
                  ) : riwayatAktivasiData.filter(item => !riwayatFilter || item.stasiun === riwayatFilter).map((item, idx) => (
                    <div key={idx} className="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full border border-emerald-500 bg-emerald-50 flex items-center justify-center">
                          <Icon name="check" size={10} className="text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <h4 className="text-[12px] font-bold text-slate-700">{item.nama}</h4>
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] px-1.5 py-0.5 rounded font-semibold">{item.stasiun}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-tight mb-2 pr-2">{item.alamat}</p>

                        {/* Flex wrap for tags */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                          <div className="flex items-center gap-1 text-[8px] text-slate-500 font-medium">
                            <Icon name="hash" size={8} className="text-slate-300" />
                            <span>{item.no.replace('# ', '')}</span>
                          </div>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                          <div className="flex items-center gap-1 text-[8px] text-slate-500 font-medium">
                            <Icon name="box" size={8} className="text-slate-300" />
                            <span>{item.odp}</span>
                          </div>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                          <div className="flex items-center gap-1 text-[8px] text-slate-500 font-medium">
                            <Icon name="git-merge" size={8} className="text-slate-300" />
                            <span>{item.port}</span>
                          </div>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                          <div className="flex items-center gap-1 text-[8px] text-slate-500 font-medium">
                            <Icon name="activity" size={8} className="text-slate-300" />
                            <span>{item.dist}</span>
                          </div>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                          <div className="flex items-center gap-1 text-[8px] text-slate-500 font-medium">
                            <Icon name="cpu" size={8} className="text-slate-300" />
                            <span>{item.sn}</span>
                          </div>
                        </div>

                        {/* Time and Technician */}
                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-slate-100">
                          <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                            <Icon name="clock" size={10} />
                            <span>{item.time}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-emerald-700">
                            <Icon name="user" size={8} className="text-emerald-500" />
                            <span>{item.teknisi}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* PERFORMANSI MODUL */}
          {activeModule === 'performansi' && (
            <div className="space-y-4 animate-slide-up">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon name="activity" size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-[13px] leading-tight">Rekap Aktivasi Homeconnect</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded-sm ml-1 uppercase border border-slate-200">
                    {(() => {
                      const d = new Date();
                      const m = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                      return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
                    })()}
                  </span>
                </div>

                <div className="space-y-3">
                  {performansiStationData.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Icon name="activity" size={32} className="text-slate-300 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-slate-500">Memuat data performansi stasiun...</p>
                    </div>
                  ) : (
                    performansiStationData.map((item, idx) => (
                      <div key={idx} className="border border-slate-100 bg-slate-50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">{idx + 1}.</span>
                            <h4 className="font-bold text-slate-700 text-[13px]">{item.stasiun}</h4>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${item.aktif !== '-' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {item.aktif !== '-' ? `${item.aktif} Hari Ini` : 'Tidak ada'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 mb-3 text-[11px]">
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">HP Reg / Perc</p>
                            <p className="font-extrabold text-slate-700">{item.hpReguler} <span className="text-slate-400 font-normal">/</span> {item.hpPercepatan}</p>
                            <p className="text-[9px] text-slate-400 font-bold">Total: {item.hp}</p>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <p className="text-[8px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Aktivasi Reg / Perc</p>
                            <p className="font-extrabold text-blue-600">{item.aktReguler} <span className="text-blue-300 font-normal">/</span> {item.aktPercepatan}</p>
                            <p className="text-[9px] text-blue-400 font-bold">Total: {item.total}</p>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">HC Aktif Reg / Perc</p>
                            <p className="font-extrabold text-slate-700">{item.hcAktifReguler} <span className="text-slate-400 font-normal">/</span> {item.hcAktifPercepatan}</p>
                            <p className="text-[9px] text-slate-400 font-bold">Total: {item.hc}</p>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
                            <div>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Performa HC vs HP</p>
                              <p className="font-extrabold text-slate-800">{item.performa}%</p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                              <div className={`h-full rounded-full ${item.performa >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(item.performa, 100)}%` }}></div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedPoStation(item.rawStasiun || item.stasiun)}
                          className="w-full bg-white text-blue-600 font-bold text-[10px] py-2 rounded-lg border border-slate-200 flex items-center justify-center gap-1 hover:bg-slate-50 active:scale-[0.99] transition-all shadow-sm"
                        >
                          Lihat Detail PO <Icon name="arrow-right" size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODAL DETAIL PO */}
          {selectedPoStation && createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setSelectedPoStation(null)}></div>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 animate-modal flex flex-col border border-slate-100 overflow-hidden max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center border border-white/30">
                      <Icon name="file-text" size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">Detail PO - {toProperCase(selectedPoStation)}</h3>
                      <p className="text-[9px] text-blue-100">Progress Release PO Stasiun</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPoStation(null)} className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white">
                    <Icon name="x" size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-3.5 overflow-y-auto space-y-3 custom-scrollbar flex-1 bg-slate-50">
                  {detailPoList.length === 0 ? (
                    <div className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm">
                      <Icon name="folder-minus" size={32} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum ada Rilis PO</p>
                      <p className="text-[10px] text-slate-400 mt-1">Data PO release untuk stasiun {toProperCase(selectedPoStation)} belum tersedia.</p>
                    </div>
                  ) : (
                    detailPoList.map((po, idx) => {
                      const isCleanSchema = po.hpReguler !== undefined && !isNaN(Number(po.hpReguler));

                      const noPo = po.noPoRelease || po.stasiun || '-';
                      const jenis = po.jenisPo || 'PO Release';
                      const tahap = po.hpByPo || po.tahapPembangunan || po.kategori || '-';
                      const isPercepatan = String(tahap).toLowerCase().includes('percepatan');

                      let hpReg = 0;
                      let hpPerc = 0;
                      let totHc = 0;
                      let hcAktif = 0;
                      let suspend = 0;
                      let ready = 0;
                      let dismantled = 0;

                      if (isCleanSchema) {
                        hpReg = Number(po.hpReguler || 0);
                        hpPerc = Number(po.hpPercepatan || 0);
                        totHc = Number(po.totalAktivasiHc || 0);
                        hcAktif = Number(po.hcAktif || 0);
                        suspend = Number(po.suspend || 0);
                        ready = Number(po.readyToDismantle || 0);
                        dismantled = Number(po.dismantled || 0);
                      } else {
                        // Legacy raw payload mapping with exact shifted column alignment
                        if (isPercepatan) {
                          hpReg = 0;
                          hpPerc = typeof po.hcAktif === 'number' ? po.hcAktif : 0;
                          totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                          hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                          ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                          dismantled = 0;
                        } else {
                          hpReg = typeof po.totalAktivasiHc === 'number' ? po.totalAktivasiHc : (typeof po.hpTerbangun === 'number' ? po.hpTerbangun : 0);
                          hpPerc = 0;
                          totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                          hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                          ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                          dismantled = 0;
                        }
                      }

                      if (hpReg === 0 && hpPerc === 0 && po.hpTerbangun > 0) {
                        hpReg = po.hpTerbangun;
                      }

                      const matchNum = String(tahap).match(/\d+/);
                      const extractedHp = matchNum ? parseInt(matchNum[0], 10) : 0;
                      if (hpReg === 0 && hpPerc === 0 && extractedHp > 0) {
                        if (isPercepatan) hpPerc = extractedHp;
                        else hpReg = extractedHp;
                      }

                      const totalHp = hpReg + hpPerc;
                      const perf = totalHp > 0 ? parseFloat(((totHc / totalHp) * 100).toFixed(2)) : (typeof po.performaHc === 'number' ? po.performaHc : 0);

                      return (
                        <div key={idx} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                          <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                            <div>
                              <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                {jenis}
                              </span>
                              <h4 className="font-black text-slate-800 text-xs mt-1">{noPo}</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-700">{perf}%</span>
                              <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(perf, 100)}%` }}></div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Tahap Pembangunan</p>
                              <p className="text-[11px] font-black text-slate-700 truncate" title={tahap}>{tahap}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">HP Terbangun</p>
                              <p className="text-[11px] font-black text-slate-800">{totalHp.toLocaleString('id-ID')}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Total Aktivasi</p>
                              <p className="text-[11px] font-black text-blue-600">{totHc.toLocaleString('id-ID')}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-medium text-slate-500 pt-0.5">
                            <span>Reg: <b className="text-slate-700 font-bold">{hpReg.toLocaleString('id-ID')}</b> | Perc: <b className="text-slate-700 font-bold">{hpPerc.toLocaleString('id-ID')}</b></span>
                            <span>HC Aktif: <b className="text-emerald-600 font-bold">{hcAktif.toLocaleString('id-ID')}</b> | Susp: <b className="text-orange-600">{suspend}</b> | Ready Dis: <b className="text-amber-600">{ready}</b> | Dis: <b className="text-rose-600">{dismantled}</b></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Summary */}
                {detailPoList.length > 0 && (
                  <div className="px-4 py-2.5 bg-white border-t border-slate-200 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                    <span>Total {detailPoList.length} Release PO</span>
                    <span className="text-[9px] text-slate-400 font-normal">Desnarum OpsTracker</span>
                  </div>
                )}
              </div>
            </div>, document.body
          )}

          {/* MODAL SELISIH LAPORAN */}
          {showDiscrepancyModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setShowDiscrepancyModal(false)}></div>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 animate-modal flex flex-col border border-slate-100 overflow-hidden max-h-[85vh]">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Icon name="alert-circle" size={20} className="text-rose-500" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 leading-tight">Selisih Laporan Petugas</h3>
                      <p className="text-[9px] text-slate-500 mt-0.5">Daftar pelanggan tidak sinkron pada {todayDateString}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDiscrepancyModal(false)} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
                    <Icon name="x" size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
                  {discrepancyList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {discrepancyList.map((cust, idx) => {
                        let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                        if (cust.discrepancyType === 'BELUM REPORT AKTIVASI') badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                        else if (cust.discrepancyType === 'AKTIVASI KENDALA KEMARIN') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";

                        return (
                          <div key={idx} className="p-3 bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{cust.namaPelanggan || 'Tanpa Nama'}</p>
                                <p className="text-[9px] font-mono text-slate-500 mt-0.5">{cust.idPelanggan || '-'}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap ${badgeStyle}`}>
                                {cust.discrepancyType}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-3 text-[10px] font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="flex flex-col gap-1 w-1/2 pr-2 border-r border-slate-200">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400">Petugas IKR</span>
                                {cust.petugasIkr ? <span className="flex items-center gap-1 font-bold text-slate-700"><Icon name="check" size={10} className="text-emerald-500" /> {cust.petugasIkr}</span> : <span className="text-slate-400">-</span>}
                              </div>
                              <div className="flex flex-col gap-1 w-1/2 pl-3">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400">Petugas Aktivasi</span>
                                {cust.petugasAktivasi ? <span className="flex items-center gap-1 font-bold text-slate-700"><Icon name="check" size={10} className="text-emerald-500" /> {cust.petugasAktivasi}</span> : <span className="text-slate-400">-</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <Icon name="check-circle" size={32} className="mx-auto text-emerald-400 mb-2 opacity-50" />
                      <p className="text-xs font-bold text-slate-500">Sinkron</p>
                      <p className="text-[10px] mt-1">Semua data laporan sinkron hari ini</p>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-white flex justify-end shrink-0">
                  <button onClick={() => setShowDiscrepancyModal(false)} className="px-5 py-2 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95 w-full">Tutup</button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* OVERVIEW HARIAN MODUL */}
          {activeModule === 'overview' && (
            <div className="space-y-4 animate-slide-up pb-6">

              {/* Filter Bar */}
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex-1 relative">
                  <div
                    onClick={() => { setIsOverviewDateDropdownOpen(!isOverviewDateDropdownOpen); setIsOverviewStationDropdownOpen(false); }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-600">
                      {(() => {
                        if (overviewDateFilter.includes(' to ')) {
                          const [s, e] = overviewDateFilter.split(' to ');
                          const ds = new Date(s); const de = new Date(e);
                          const m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                          return `${ds.getDate()} ${m[ds.getMonth()]} - ${de.getDate()} ${m[de.getMonth()]}`;
                        }
                        return overviewDateFilter;
                      })()}
                    </span>
                    <Icon name="calendar" size={12} className="text-slate-400" />
                  </div>
                  {isOverviewDateDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDateDropdownOpen(false)}></div>
                      <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-[250px] overflow-y-auto">
                        {['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua Waktu'].map(f => (
                          <div
                            key={f}
                            onClick={() => { setOverviewDateFilter(f); setIsOverviewDateDropdownOpen(false); }}
                            className={`px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors ${overviewDateFilter === f ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {f}
                          </div>
                        ))}
                        <div
                          className="relative px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors text-slate-600 hover:bg-slate-50 flex items-center justify-between"
                          onClick={() => {
                            setIsCustomRangeModalOpen(true);
                            setIsOverviewDateDropdownOpen(false);
                          }}
                        >
                          <span>Pilih Rentang Waktu...</span>
                          <Icon name="calendar" size={12} className="text-slate-400" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-1 relative">
                  <div
                    onClick={() => { setIsOverviewStationDropdownOpen(!isOverviewStationDropdownOpen); setIsOverviewDateDropdownOpen(false); }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-600 truncate">{overviewStationFilter}</span>
                    <Icon name="map-pin" size={12} className="text-slate-400 shrink-0" />
                  </div>
                  {isOverviewStationDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsOverviewStationDropdownOpen(false)}></div>
                      <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {['Semua Stasiun', 'Alastua', 'Brumbung', 'Kalibodri', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Randublatung', 'Semarang Tawang', 'Sulur', 'Wadu', 'Weleri'].map(st => (
                          <div
                            key={st}
                            onClick={() => { setOverviewStationFilter(st); setIsOverviewStationDropdownOpen(false); }}
                            className={`px-4 py-3 text-[11px] font-bold cursor-pointer transition-colors ${overviewStationFilter === st ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {st}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg w-10 h-10 flex items-center justify-center text-blue-600 shrink-0 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors">
                  <Icon name="filter" size={14} />
                </div>
              </div>

              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Icon name="check-circle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.aktivasiSelesai}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">AKTIVASI SELESAI</p>
                  </div>
                </div>

                <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Icon name="clock" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.outstanding}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">OUTSTANDING</p>
                  </div>
                </div>

                <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <Icon name="trending-up" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none">{overviewStats.rataRata}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">RATA-RATA/HARI</p>
                  </div>
                </div>

                <div className={`bg-white border border-${overviewStats.kesulitanColor}-100 rounded-xl p-3 shadow-sm flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-full bg-${overviewStats.kesulitanColor}-50 flex items-center justify-center text-${overviewStats.kesulitanColor}-500 shrink-0`}>
                    <Icon name={overviewStats.kesulitanIcon} size={16} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-slate-800 leading-none flex items-center gap-1">
                      {overviewStats.tingkatKesulitan}
                      <span className="text-[10px] font-bold opacity-70">({overviewStats.kesulitanLabel})</span>
                    </h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">TINGKAT KESULITAN</p>
                  </div>
                </div>
              </div>

              {/* Tren Aktivasi Chart */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[13px]">Tren Aktivasi</h3>
                    <p className="text-[9px] text-slate-400">Periode {(() => {
                      if (overviewDateFilter.includes(' to ')) {
                        const [s, e] = overviewDateFilter.split(' to ');
                        const ds = new Date(s); const de = new Date(e);
                        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                        return `${ds.getDate()} ${m[ds.getMonth()]} - ${de.getDate()} ${m[de.getMonth()]}`;
                      }
                      return overviewDateFilter;
                    })()}</p>
                  </div>
                </div>

                <div className="h-32 flex items-end justify-between gap-1.5 mt-6 relative">
                  {/* Horizontal Grid lines */}
                  <div className="absolute w-full h-full flex flex-col justify-between z-0 pb-1">
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
                    <div className="border-b border-slate-200 w-full h-0"></div>
                  </div>

                  {/* SVG, Dots and Bars */}
                  {(() => {
                    const maxVal = Math.max(...overviewStats.trenAktivasi.map(t => t.val), 1);
                    const n = overviewStats.trenAktivasi.length;
                    const points = overviewStats.trenAktivasi.map((pt, i) => {
                      const x = (i * (100 / n)) + (100 / (2 * n));
                      const h = (pt.val / maxVal) * 100;
                      const y = 100 - (h === 0 ? 0 : h);
                      return { x, y, val: pt.val, h, label: pt.label };
                    });

                    let pathD = "";
                    points.forEach((pt, i) => {
                      if (i === 0) {
                        pathD += `M ${pt.x},${pt.y} `;
                      } else {
                        const prev = points[i - 1];
                        const cp1x = prev.x + (pt.x - prev.x) / 2;
                        const cp1y = prev.y;
                        const cp2x = cp1x;
                        const cp2y = pt.y;
                        pathD += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y} `;
                      }
                    });

                    return (
                      <>
                        <svg className="absolute w-full h-full top-0 left-0 z-30 pointer-events-none drop-shadow-sm" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        </svg>

                        <div className="absolute w-full h-full top-0 left-0 z-40 pointer-events-none">
                          {points.map((pt, i) => {
                            const isActive = pt.val > 0 && pt.val === Math.max(...overviewStats.trenAktivasi.map(t => t.val));
                            return (
                              <div key={`dot-${i}`}>
                                {pt.val > 0 && (
                                  <span
                                    className="absolute text-[9px] font-bold text-blue-600 -translate-x-1/2 -translate-y-full drop-shadow-sm"
                                    style={{ left: `${pt.x}%`, top: `calc(${pt.y}% - 6px)` }}
                                  >
                                    {pt.val}
                                  </span>
                                )}
                                <div
                                  className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${isActive ? 'w-2.5 h-2.5 bg-blue-500 border-2 border-white shadow-sm' : 'w-1.5 h-1.5 bg-white border-[1.5px] border-blue-500'}`}
                                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
                        {points.map((pt, i) => (
                          <div key={i} className="w-full relative z-20 flex flex-col items-center justify-end h-full group">
                            <div className="w-full bg-blue-50 rounded-t-sm relative flex items-end" style={{ height: `${pt.h}%` }}>
                              <div className="w-full h-[2px] bg-blue-400 rounded-t-sm"></div>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between mt-2 px-1">
                  {overviewStats.trenAktivasi.map((t, i) => {
                    const isCrowded = overviewStats.trenAktivasi.length > 7;
                    const showLabel = !isCrowded || i % 2 === 0 || i === overviewStats.trenAktivasi.length - 1;
                    return (
                      <span key={i} className={`text-[8px] font-bold text-slate-400 w-full text-center ${showLabel ? '' : 'opacity-0 text-transparent'}`}>
                        {t.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Peringkat Petugas */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon name="award" size={16} className="text-amber-500" />
                    <h3 className="font-bold text-slate-800 text-[13px]">Peringkat Capaian Aktivasi Petugas</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded text-[8px] font-bold text-slate-600 px-2 py-1 shrink-0">
                    TOTAL: <span className="text-blue-600">{overviewStats.aktivasiSelesai}</span> AKTIVASI
                  </div>
                </div>

                <div className={`flex flex-col gap-2.5 ${showAllLeaderboard ? 'max-h-[680px] overflow-y-auto pr-1 custom-scrollbar' : ''}`}>
                  {overviewStats.leaderboard.length > 0 ? (showAllLeaderboard ? overviewStats.leaderboard : overviewStats.leaderboard.slice(0, 5)).map((item) => {
                    let bgCard = 'bg-white border-slate-100';
                    let bgCircle = 'bg-slate-100 text-slate-500';

                    if (item.color === 'gold') {
                      bgCard = 'bg-amber-50 border-amber-200/60 shadow-sm';
                      bgCircle = 'bg-amber-400 text-white shadow-inner';
                    } else if (item.color === 'silver') {
                      bgCard = 'bg-slate-50 border-slate-300/60';
                      bgCircle = 'bg-slate-400 text-white shadow-inner';
                    } else if (item.color === 'bronze') {
                      bgCard = 'bg-orange-50 border-orange-200/60';
                      bgCircle = 'bg-orange-500 text-white shadow-inner';
                    }

                    return (
                      <div key={item.rank} className={`flex items-center justify-between p-3 rounded-xl border ${bgCard}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black shrink-0 ${bgCircle}`}>
                            {item.rank}
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-slate-800">{item.user}</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Petugas Aktivasi</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-black text-emerald-600 leading-none">{item.count}</p>
                          <p className="text-[8px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Aktivasi</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-slate-400 text-xs py-4">Belum ada data di periode ini.</div>
                  )}

                  {overviewStats.leaderboard.length > 5 && (
                    <button
                      onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
                      className="w-full mt-1.5 py-2.5 rounded-lg bg-slate-50 text-blue-600 font-bold text-[11px] border border-slate-200 hover:bg-slate-100 transition-colors flex justify-center items-center gap-1.5"
                    >
                      {showAllLeaderboard ? 'Tutup Peringkat' : 'Lihat Semua Peringkat'} <Icon name={showAllLeaderboard ? "chevron-up" : "chevron-down"} size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {isCustomRangeModalOpen && (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
                <h3 className="font-bold text-slate-800 mb-4">Pilih Rentang Waktu</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Tanggal Mulai</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Tanggal Akhir</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                      onClick={() => setIsCustomRangeModalOpen(false)}
                    >
                      Batal
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-transform disabled:opacity-50"
                      disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                      onClick={() => {
                        setOverviewDateFilter(`${customStartDate} to ${customEndDate}`);
                        setIsCustomRangeModalOpen(false);
                      }}
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATA PELANGGAN MODUL */}
          {activeModule === 'pelanggan' && (
            <div className="space-y-4 animate-slide-up pb-6">

              {/* Search Bar + Station Filter */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                  <div className="relative">
                    <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari ID, Nama, Alamat..."
                      value={pelangganSearch}
                      onChange={(e) => { setPelangganSearch(e.target.value); setPelangganPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsPelangganFilterOpen(!isPelangganFilterOpen)}
                    className={`h-full bg-white border rounded-xl px-3 shadow-sm flex items-center gap-1.5 text-[10px] font-bold transition-colors ${pelangganStationFilter !== 'Semua Stasiun' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600'}`}
                  >
                    <Icon name="map-pin" size={13} />
                    <span>{pelangganStationFilter !== 'Semua Stasiun' ? pelangganStationFilter : 'Stasiun'}</span>
                  </button>
                  {isPelangganFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsPelangganFilterOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {['Semua Stasiun', 'Alastua', 'Brumbung', 'Kalibodri', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Randublatung', 'Semarang Tawang', 'Sulur', 'Wadu', 'Weleri'].map(s => (
                          <div
                            key={s}
                            onClick={() => { setPelangganStationFilter(s); setIsPelangganFilterOpen(false); setPelangganPage(1); }}
                            className={`px-4 py-3 text-[11px] font-bold cursor-pointer transition-colors ${pelangganStationFilter === s ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="flex flex-col gap-2.5">
                {/* Primary Stat - AKTIF */}
                <div
                  className={`bg-emerald-500 text-white rounded-xl p-4 shadow-sm shadow-emerald-500/20 flex items-center justify-between relative overflow-hidden cursor-pointer transition-opacity ${pelangganStatusFilter === 'AKTIF' ? 'ring-2 ring-white ring-offset-2 ring-offset-emerald-500' : ''}`}
                  onClick={() => { setPelangganStatusFilter(pelangganStatusFilter === 'AKTIF' ? 'SEMUA' : 'AKTIF'); setPelangganPage(1); }}
                >
                  <div className="absolute -right-4 -bottom-4 opacity-20">
                    <Icon name="check-circle" size={80} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-100 mb-1 tracking-widest uppercase">Pelanggan Aktif</p>
                    <h4 className="text-3xl font-black leading-none">{pelangganStats.aktif.toLocaleString('id-ID')}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center shrink-0 z-10 border border-emerald-300 shadow-inner">
                    <Icon name="check-circle" size={20} className="text-white" />
                  </div>
                </div>

                {/* Secondary Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'WAITING', value: pelangganStats.waiting, color: 'amber', icon: 'clock', key: 'WAITING' },
                    { label: 'SUSPEND', value: pelangganStats.suspend, color: 'orange', icon: 'pause-circle', key: 'SUSPEND' },
                    { label: 'READY DISM.', value: pelangganStats.readyDismantle, color: 'rose', icon: 'alert-circle', key: 'READY TO DISMANTLE' },
                    { label: 'DISMANTLED', value: pelangganStats.dismantled, color: 'slate', icon: 'x-circle', key: 'DISMANTLED' },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      onClick={() => { setPelangganStatusFilter(pelangganStatusFilter === stat.key ? 'SEMUA' : stat.key); setPelangganPage(1); }}
                      className={`bg-white border rounded-xl p-3 flex flex-col justify-center shadow-sm cursor-pointer active:scale-95 transition-all ${pelangganStatusFilter === stat.key ? `border-${stat.color}-400 bg-${stat.color}-50` : 'border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className={`w-7 h-7 rounded-lg bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-500 shrink-0`}>
                          <Icon name={stat.icon} size={14} />
                        </div>
                        <h4 className="text-[16px] font-black text-slate-800">{stat.value.toLocaleString('id-ID')}</h4>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Active Filter Badge */}
                {pelangganStatusFilter !== 'SEMUA' && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-[11px] font-bold text-blue-700">
                      Filter: {pelangganStatusFilter} — {filteredPelangganData.length} hasil
                    </span>
                    <button onClick={() => { setPelangganStatusFilter('SEMUA'); setPelangganPage(1); }} className="text-[10px] font-bold text-blue-500 hover:text-blue-700">
                      Hapus Filter ×
                    </button>
                  </div>
                )}
              </div>

              {/* Customer List */}
              <div className="space-y-3">
                {filteredPelangganData.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs bg-white rounded-xl border border-slate-200 border-dashed">
                    {pelangganSearch || pelangganStatusFilter !== 'SEMUA' ? `Tidak ada data yang cocok` : 'Belum ada data pelanggan'}
                  </div>
                ) : (
                  filteredPelangganData.slice((pelangganPage - 1) * PELANGGAN_PER_PAGE, pelangganPage * PELANGGAN_PER_PAGE).map((p, i) => {
                    const st = p._status;
                    const phone = String(p.nomorHp || p.hp || '').replace(/\D/g, '');

                    const statusConfig = {
                      'AKTIF': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
                      'WAITING': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' },
                      'SUSPEND': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
                      'KENDALA': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
                      'READY TO DISMANTLE': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-500' },
                      'DISMANTLED': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', accent: 'bg-slate-400' },
                    };
                    const sc = statusConfig[st] || statusConfig['WAITING'];
                    const showAccentBar = st !== 'AKTIF';

                    // Umur WO — only for WAITING, using precomputed _ageDays
                    const ageDays = p._ageDays;
                    let umurColor = '';
                    let umurBg = '';
                    if (st === 'WAITING' && ageDays >= 0) {
                      if (ageDays <= 3) { umurColor = 'text-emerald-700'; umurBg = 'bg-emerald-50 border-emerald-200'; }
                      else if (ageDays < 7) { umurColor = 'text-amber-700'; umurBg = 'bg-amber-50 border-amber-200'; }
                      else { umurColor = 'text-rose-700'; umurBg = 'bg-rose-50 border-rose-200'; }
                    }

                    return (
                      <div key={i} onClick={() => setSelectedPelanggan(p)} className={`bg-white border ${showAccentBar ? sc.border : 'border-slate-200'} rounded-xl p-3.5 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform`}>
                        {showAccentBar && <div className={`absolute top-0 left-0 w-1 h-full ${sc.accent}`}></div>}

                        <div className="flex justify-between items-start mb-2.5 pl-1">
                          <div className="flex gap-2 items-center flex-1 min-w-0">
                            <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">{p.idPelanggan || p.id || '-'}</span>
                            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 truncate">
                              <Icon name="map-pin" size={9} /> {p.stasiun || '-'}
                            </span>
                          </div>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${sc.bg} ${sc.text}`}>
                            {st === 'READY TO DISMANTLE' ? 'READY DISM.' : st}
                          </span>
                        </div>

                        <div className="mb-2.5 pl-1">
                          <h4 className="text-[13px] font-bold text-slate-800 truncate">{p.namaPelanggan || p.nama || '-'}</h4>
                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">{p.alamat || '-'}</p>
                        </div>

                        <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100 pl-1">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                              {phone && (
                                <a
                                  href={`https://wa.me/62${phone.replace(/^0+|^62/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"
                                >
                                  <Icon name="phone" size={11} /> {phone}
                                </a>
                              )}
                              {p.latitude && p.longitude && (
                                <a href={`https://maps.google.com/?q=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                  <Icon name="map-pin" size={11} /> Peta
                                </a>
                              )}
                              {st === 'WAITING' && ageDays >= 0 && (
                                <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${umurBg} ${umurColor}`}>
                                  <Icon name="clock" size={9} /> {ageDays === 0 ? (p._ageHours >= 0 ? `${p._ageHours} Jam` : '0 Jam') : `${ageDays} hari`}
                                </span>
                              )}
                            </div>

                            {(p.petugasAktivasi || p.user) && (
                              <span className="text-[9px] text-slate-400 font-medium truncate max-w-[100px] text-right">
                                {p.petugasAktivasi || p.user}
                              </span>
                            )}
                          </div>

                          {(st === 'KENDALA' && p.issueKendala && p.issueKendala !== p.alamat) && (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start gap-1.5 text-[9px] font-medium text-rose-900 bg-rose-50/90 border border-rose-200/80 px-2 py-1.5 rounded-md" title={p.issueKendala}>
                                <Icon name="alert-circle" size={10} className="text-rose-600 shrink-0 mt-0.5" />
                                <span className="whitespace-normal leading-relaxed font-bold italic"><span className="font-extrabold text-rose-800">KENDALA:</span> {p.issueKendala}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination */}
                {filteredPelangganData.length > PELANGGAN_PER_PAGE && (
                  <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
                    <button
                      disabled={pelangganPage === 1}
                      onClick={() => setPelangganPage(p => p - 1)}
                      className="text-[11px] font-bold text-blue-600 disabled:text-slate-300 flex items-center gap-1"
                    >
                      <Icon name="chevron-left" size={14} /> Sebelumnya
                    </button>
                    <span className="text-[10px] font-bold text-slate-500">
                      {pelangganPage} / {Math.ceil(filteredPelangganData.length / PELANGGAN_PER_PAGE)}
                      <span className="font-normal text-slate-400 ml-1">({filteredPelangganData.length} data)</span>
                    </span>
                    <button
                      disabled={pelangganPage >= Math.ceil(filteredPelangganData.length / PELANGGAN_PER_PAGE)}
                      onClick={() => setPelangganPage(p => p + 1)}
                      className="text-[11px] font-bold text-blue-600 disabled:text-slate-300 flex items-center gap-1"
                    >
                      Berikutnya <Icon name="chevron-right" size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* DATA GANGGUAN MODUL */}

          {activeModule === 'gangguan' && (
            <div className="space-y-4 animate-slide-up pb-6">

              {/* Search Bar & Input Button */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
                  <div className="relative">
                    <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari Tiket, Nama, Keluhan..."
                      value={gangguanSearch}
                      onChange={(e) => { setGangguanSearch(e.target.value); setGangguanPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <button onClick={() => setShowNewTicketModal(true)} className="bg-white text-slate-600 border border-slate-200 rounded-xl shadow-sm px-3 flex items-center justify-center gap-1.5 shrink-0 hover:bg-slate-50 active:scale-95 transition-all">
                  <Icon name="plus" size={16} />
                  <span className="text-[11px] font-bold">Input Tiket</span>
                </button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className={`bg-amber-500 rounded-xl p-4 flex items-center justify-between relative overflow-hidden col-span-2 cursor-pointer transition-all shadow-sm shadow-amber-500/20 ${gangguanFilter === 'SEMUA' ? 'border border-amber-300' : 'opacity-90 hover:opacity-100'}`}
                  onClick={() => { setGangguanFilter('SEMUA'); setGangguanPage(1); }}
                >
                  <div className="absolute right-0 top-0 w-24 h-24 bg-amber-400 rounded-full opacity-50 -translate-y-1/2 translate-x-1/4"></div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-amber-100 tracking-wider uppercase mb-1">Total Gangguan {gangguanDateFilter === 'Semua Waktu' ? 'Keseluruhan' : gangguanDateFilter}</p>
                    <h4 className="text-[28px] font-black text-white leading-none">{gangguanStats.total}</h4>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-400/50 flex items-center justify-center text-white shrink-0 relative z-10 border border-amber-400">
                    <Icon name="headset" size={24} />
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group cursor-pointer transition-all shadow-sm ${gangguanFilter === 'SELESAI' ? 'border border-emerald-400' : 'border border-slate-200 hover:border-emerald-200'}`}
                  onClick={() => { setGangguanFilter('SELESAI'); setGangguanPage(1); }}
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Icon name="check-circle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none mb-0.5">{gangguanStats.selesai}</h4>
                    <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">Visit Selesai</p>
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group cursor-pointer transition-all shadow-sm ${gangguanFilter === 'AKTIF' ? 'border border-rose-400' : 'border border-slate-200 hover:border-rose-200'}`}
                  onClick={() => { setGangguanFilter('AKTIF'); setGangguanPage(1); }}
                >
                  <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Icon name="alert-triangle" size={16} />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-black text-slate-800 leading-none mb-0.5">{gangguanStats.aktif}</h4>
                    <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">Tiket Aktif</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2 relative z-20">
                <div className="relative">
                  <button
                    onClick={() => { setIsGangguanDateFilterOpen(!isGangguanDateFilterOpen); setIsGangguanStationFilterOpen(false); }}
                    className={`w-full bg-slate-50 border border-dashed rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-sm mt-0.5 ${gangguanDateFilter !== 'Hari Ini' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-slate-300 text-slate-600'}`}
                  >
                    <Icon name="filter" size={14} />
                    <span className="text-[11px] font-bold">Waktu: {gangguanDateFilter === 'Rentang Waktu' ? 'Rentang' : gangguanDateFilter}</span>
                  </button>
                  {isGangguanDateFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsGangguanDateFilterOpen(false)}></div>
                      <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {['Hari Ini', 'Bulan Ini', 'Semua Waktu'].map(d => (
                          <div
                            key={d}
                            onClick={() => { setGangguanDateFilter(d); setIsGangguanDateFilterOpen(false); setGangguanPage(1); }}
                            className={`px-4 py-3 text-[11px] font-bold cursor-pointer text-center transition-colors ${gangguanDateFilter === d ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {d}
                          </div>
                        ))}
                        <div
                          onClick={() => { setGangguanDateFilter('Rentang Waktu'); setGangguanPage(1); }}
                          className={`px-4 py-3 text-[11px] font-bold cursor-pointer text-center border-t border-slate-100 transition-colors ${gangguanDateFilter === 'Rentang Waktu' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Pilih Rentang Waktu
                        </div>
                        {gangguanDateFilter === 'Rentang Waktu' && (
                          <div className="px-3 py-3 border-t border-slate-100 flex flex-col gap-2">
                            <input
                              type="date"
                              value={gangguanDateStart}
                              onChange={(e) => { setGangguanDateStart(e.target.value); setGangguanPage(1); }}
                              className="w-full text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 text-center"
                            />
                            <span className="text-[9px] text-slate-400 font-bold text-center w-full">S/D</span>
                            <input
                              type="date"
                              value={gangguanDateEnd}
                              onChange={(e) => { setGangguanDateEnd(e.target.value); setGangguanPage(1); }}
                              className="w-full text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 text-center"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => { setIsGangguanStationFilterOpen(!isGangguanStationFilterOpen); setIsGangguanDateFilterOpen(false); }}
                    className={`w-full bg-slate-50 border border-dashed rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors shadow-sm mt-0.5 ${gangguanStationFilter !== 'Semua Stasiun' ? 'border-blue-400 text-blue-600 bg-blue-50' : 'border-slate-300 text-slate-600'}`}
                  >
                    <Icon name="map-pin" size={14} />
                    <span className="text-[11px] font-bold truncate">Stasiun: {gangguanStationFilter === 'Semua Stasiun' ? 'Semua' : gangguanStationFilter}</span>
                  </button>
                  {isGangguanStationFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsGangguanStationFilterOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-1 w-full max-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                        {['Semua Stasiun', 'Alastua', 'Brumbung', 'Kalibodri', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Randublatung', 'Semarang Tawang', 'Sulur', 'Wadu', 'Weleri'].map(s => (
                          <div
                            key={s}
                            onClick={() => { setGangguanStationFilter(s); setIsGangguanStationFilterOpen(false); setGangguanPage(1); }}
                            className={`px-4 py-3 text-[11px] font-bold cursor-pointer text-center transition-colors ${gangguanStationFilter === s ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ticket List */}
              <div className="space-y-3">
                {filteredGangguan.slice((gangguanPage - 1) * 10, gangguanPage * 10).map((v, i) => {
                  const ticket = {
                    id: v.idPelanggan || v.id_pelanggan || '-',
                    time: String(v.timestamp || '').split('T')[0] || standardizeDate(v.timestamp),
                    timestampOpen: v.timestamp,
                    waktuClose: v.waktu_close || v.waktuClose || v.updated_at, // Use whatever is available
                    status: (v.status || 'OPEN').toUpperCase(),
                    name: v.namaPelanggan || v.nama_pelanggan || 'Tanpa Nama',
                    keluhan: v.keluhan || v.catatan || '-',
                    tindakan: v.tindakan || v.tindakan_perbaikan || '',
                    stasiun: v.stasiun || '-',
                    user: v.petugas || v.teknisi || '-'
                  };
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        const customer = data.pelangganData.find(p => p.idPelanggan === ticket.id || p.id_pelanggan === ticket.id);
                        if (customer) {
                          setSelectedPelanggan({ ...customer, _ticketStatus: ticket.status, fotoPerbaikan: v.fotoPerbaikan || '', waktu_close: v.waktu_close || v.waktuClose || '' });
                        } else {
                          showToast('Data pelanggan tidak ditemukan', 'error');
                        }
                      }}
                      className={`bg-white border ${ticket.status === 'OPEN' ? 'border-amber-200' : 'border-slate-200'} rounded-xl p-3.5 shadow-sm relative overflow-hidden pl-5 cursor-pointer active:scale-[0.98] transition-transform`}
                    >
                      <div className={`absolute top-0 left-0 w-1 h-full ${['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(ticket.status) ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                      <div className="flex justify-between items-start mb-2.5 pl-1">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{ticket.id}</span>
                          <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Icon name="clock" size={10} /> {ticket.time}</span>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded ${['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(ticket.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {ticket.status}
                        </span>
                      </div>

                      <div className="pl-1 mb-3">
                        <h4 className="text-[13px] font-black text-slate-800 leading-tight mb-2">{ticket.name}</h4>

                        <div className="space-y-1.5 w-full">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Keluhan:</span>
                            <span className="text-[10px] text-slate-700 font-medium leading-snug">"{ticket.keluhan}"</span>
                          </div>

                          {ticket.tindakan && (
                            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 flex flex-col relative">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] font-bold text-emerald-600/70 uppercase">Tindakan:</span>
                                {(() => {
                                  if (['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(ticket.status)) {
                                    const ttr = calculateTTR(ticket.timestampOpen, ticket.waktuClose);
                                    if (ttr) {
                                      return (
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-300/80 bg-emerald-100/90 text-emerald-800 flex items-center gap-1">
                                          <Icon name="clock" size={9} className="text-emerald-600" /> TTR: {ttr}
                                        </span>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </div>
                              <span className="text-[10px] text-emerald-800 font-medium leading-snug">"{ticket.tindakan}"</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 pl-1 mt-1">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                            <Icon name="map-pin" size={10} /> {ticket.stasiun}
                          </span>
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600">
                            <Icon name="user" size={10} /> {ticket.user}
                          </span>
                        </div>
                        <div className="flex gap-1.5 items-end">
                          <a
                            href={(v.latitude && v.longitude) ? `https://www.google.com/maps?q=${v.latitude},${v.longitude}` : '#'}
                            target="_blank" rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!v.latitude || !v.longitude) {
                                e.preventDefault();
                                showToast('Koordinat maps pelanggan tidak tersedia.', 'error');
                              }
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm transition-colors ${(!v.latitude || !v.longitude) ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                          >
                            <Icon name="map" size={14} />
                          </a>
                          <a
                            href={v.nomorHp ? `https://wa.me/62${String(v.nomorHp).replace(/^0+|^62/, '')}` : '#'}
                            target="_blank" rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!v.nomorHp) { e.preventDefault(); showToast('Nomor HP tidak tersedia', 'error'); }
                            }}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {(() => {
                  const totalPages = Math.ceil(filteredGangguan.length / 10);
                  if (totalPages <= 1) return null;

                  const startPage = Math.max(1, gangguanPage - 1);
                  const endPage = Math.min(totalPages, gangguanPage + 1);
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) pages.push(i);

                  return (
                    <div className="flex items-center justify-center gap-1.5 mt-5">
                      <button
                        onClick={() => setGangguanPage(prev => Math.max(1, prev - 1))}
                        disabled={gangguanPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-50"
                      >
                        <Icon name="chevron-left" size={14} />
                      </button>

                      {startPage > 1 && (
                        <>
                          <button onClick={() => setGangguanPage(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">1</button>
                          {startPage > 2 && <span className="text-slate-400 text-xs px-1">...</span>}
                        </>
                      )}

                      {pages.map(p => (
                        <button
                          key={p}
                          onClick={() => setGangguanPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${gangguanPage === p ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {p}
                        </button>
                      ))}

                      {endPage < totalPages && (
                        <>
                          {endPage < totalPages - 1 && <span className="text-slate-400 text-xs px-1">...</span>}
                          <button onClick={() => setGangguanPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">{totalPages}</button>
                        </>
                      )}

                      <button
                        onClick={() => setGangguanPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={gangguanPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-50"
                      >
                        <Icon name="chevron-right" size={14} />
                      </button>
                    </div>
                  );
                })()}
                {filteredGangguan.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400">Tidak ada data tiket ditemukan</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ODP COVERAGE MODUL */}
          {activeModule === 'coverage' && (
            <div className="space-y-4 animate-slide-up pb-6">

              {/* 1. CARI PELANGGAN BY ID / NAMA */}
              <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Icon name="search" size={12} className="text-indigo-600" /> Cek Lokasi Berdasarkan ID Pelanggan
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik ID Pelanggan atau Nama..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-[11px] outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    value={coverageCustomerQuery}
                    onChange={(e) => {
                      setCoverageCustomerQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                      if (!e.target.value.trim()) {
                        setSelectedCoverageCustomer(null);
                      }
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                  />
                  {coverageCustomerQuery && (
                    <button
                      onClick={() => {
                        setCoverageCustomerQuery('');
                        setSelectedCoverageCustomer(null);
                        setCoverageLat('');
                        setCoverageLon('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {isCustomerDropdownOpen && coverageCustomerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                    {coverageCustomerSuggestions.map((cust, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectCoverageCustomer(cust)}
                        className="p-3 border-b border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] font-black text-indigo-600">{cust.idPelanggan || '-'}</span>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{cust.stasiun || 'Umum'}</span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 leading-tight">{cust.namaPelanggan || cust.nama}</h5>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{cust.alamat || 'Alamat tidak terisi'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Information Card if Customer Selected */}
                {selectedCoverageCustomer && (
                  <div className="mt-3 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between text-[10px]">
                    <div>
                      <span className="font-bold text-indigo-900 block">{selectedCoverageCustomer.namaPelanggan || selectedCoverageCustomer.idPelanggan}</span>
                      <span className="text-slate-500">{selectedCoverageCustomer.alamat || 'Alamat tidak tersedia'}</span>
                      {selectedCoverageCustomer.odp && (
                        <span className="block mt-0.5 font-semibold text-indigo-700">ODP Terdaftar: {selectedCoverageCustomer.odp}</span>
                      )}
                    </div>
                    {coverageLat && coverageLon ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-1 rounded shrink-0 border border-emerald-200">
                        Map OK
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-2 py-1 rounded shrink-0 border border-amber-200">
                        No Coords
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. CEK VIA LINK MAPS / MANUAL */}
              <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Cek Berdasarkan Link Map</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste link Google Maps..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[11px] outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                    value={coverageMapsLink}
                    onChange={(e) => setCoverageMapsLink(e.target.value)}
                  />
                  <button
                    onClick={handleParseMapsLink}
                    disabled={isParsingMapsLink}
                    className="bg-indigo-600 text-white rounded-lg shadow-sm shadow-indigo-500/20 px-3 flex items-center justify-center shrink-0 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100"
                  >
                    {isParsingMapsLink ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="search" size={16} />}
                  </button>
                </div>

                <div className="relative flex items-center py-3">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="shrink-0 mx-3 text-[9px] text-slate-400 uppercase font-bold tracking-wider">Atau Manual</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Latitude"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-indigo-400"
                      value={coverageLat}
                      onChange={(e) => {
                        setCoverageLat(e.target.value);
                        setSelectedCoverageCustomer(null);
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Longitude"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-indigo-400"
                      value={coverageLon}
                      onChange={(e) => {
                        setCoverageLon(e.target.value);
                        setSelectedCoverageCustomer(null);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. PETA LOKASI DISPLAY */}
              <div className="bg-slate-100 rounded-xl h-56 border border-slate-200 overflow-hidden relative shadow-inner">
                {/* Overlay Info Layer (z-index tinggi) */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-[500] pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5 shadow-md pointer-events-auto max-w-[65%] truncate">
                    <Icon name="map-pin" size={12} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{selectedCoverageCustomer ? (selectedCoverageCustomer.namaPelanggan || selectedCoverageCustomer.idPelanggan) : 'Titik Target'}</span>
                  </div>
                  {coverageLat && coverageLon && (
                    <div className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-md flex items-center gap-1 pointer-events-auto">
                      <Icon name="check-circle" size={10} /> Peta Aktif
                    </div>
                  )}
                </div>

                {/* Wadah Leaflet Map Asli */}
                <div ref={mapRef} className="absolute inset-0 z-0"></div>

                {/* State Kosong Peta (jika blm ada koordinat) */}
                {(!coverageLat || !coverageLon) && (
                  <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px] flex flex-col justify-center items-center z-10 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2 text-indigo-600 shadow-sm border border-indigo-200">
                      <Icon name="map-pin" size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Menunggu Koordinat...</span>
                  </div>
                )}
              </div>

              {/* 4. REKOMENDASI ODP LIST DYNAMIC */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-[12px] font-black text-slate-800">Rekomendasi ODP Terdekat</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${nearestOdpList.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    {nearestOdpList.length} Ditemukan
                  </span>
                </div>

                {(!coverageLat || !coverageLon) ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm">
                    <Icon name="map" size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Lokasi belum diinput</p>
                    <p className="text-[10px] text-slate-400 mt-1">Ketik ID pelanggan atau masukkan koordinat di atas untuk melihat ODP terdekat.</p>
                  </div>
                ) : nearestOdpList.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm">
                    <Icon name="slash" size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Tidak ada ODP terdekat</p>
                    <p className="text-[10px] text-slate-400 mt-1">Tidak ditemukan ODP dalam jangkauan 10km dari titik ini.</p>
                  </div>
                ) : (
                  <div className="max-h-[430px] overflow-y-auto space-y-3 custom-scrollbar pr-1 pb-1">
                    {nearestOdpList.map((rec, i) => {
                      const isSelected = selectedCoverageOdp && (selectedCoverageOdp.kodeOdp === rec.kodeOdp && selectedCoverageOdp.label === rec.label);
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedCoverageOdp(rec)}
                          className={`bg-white border rounded-xl p-3.5 shadow-sm relative overflow-hidden transition-all cursor-pointer transform active:scale-[0.98] ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/30' : (i === 0 ? 'border-indigo-300' : 'border-slate-200')}`}
                        >
                          {i === 0 && !isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                          {isSelected && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>}

                          <div className="flex justify-between items-start mb-2 pl-1">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className={`text-[13px] font-black ${isSelected ? 'text-indigo-800' : (i === 0 ? 'text-indigo-700' : 'text-slate-800')}`}>{rec.kodeOdp || rec.label || 'ODP'}</h4>
                                {i === 0 && (
                                  <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Utama</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Icon name="map-pin" size={10} /> Stasiun: {toProperCase(rec.stasiun || 'Umum')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {rec.isFull ? (
                                <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-1 rounded border border-slate-200 uppercase">
                                  FULL ({rec.distance}m)
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-1 rounded border border-emerald-200 uppercase">
                                  RADIUS ({rec.distance}m)
                                </span>
                              )}
                              {rec.routeEstimate && (
                                <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-1 rounded border border-indigo-200 flex items-center gap-1">
                                  <Icon name="git-commit" size={8} /> JALUR: ±{rec.routeEstimate}m
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-500 px-1 pt-1 border-t border-slate-100 mt-2">
                            <span>Port: <b className={`${rec.isFull ? 'text-rose-600' : 'text-slate-700'}`}>{rec.portTerpakai || 0} / {rec.kapasitas || 8}</b></span>
                            <span>Tahap: <b>{rec.tahapPembangunan || '-'}</b></span>
                          </div>

                          <div className="pt-2.5 mt-2 border-t border-slate-100 pl-1 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (rec.latitude && rec.longitude) {
                                  navigator.clipboard.writeText(`${rec.latitude},${rec.longitude}`);
                                  showToast(`Koordinat ${rec.label} disalin!`, 'success');
                                } else {
                                  showToast('Koordinat ODP tidak valid', 'error');
                                }
                              }}
                              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-[10px] font-bold shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                              Copy Koordinat
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (rec.latitude && rec.longitude) {
                                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${rec.latitude},${rec.longitude}`, '_blank');
                                } else {
                                  showToast('Koordinat ODP tidak valid', 'error');
                                }
                              }}
                              className="flex-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg py-2 text-[10px] font-bold shadow-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-1"
                            >
                              <Icon name="navigation" size={12} /> Navigasi Map
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW PLACEHOLDER MODUL */}
          {activeModule && activeModule !== 'performansi' && activeModule !== 'overview' && activeModule !== 'pelanggan' && activeModule !== 'gangguan' && activeModule !== 'coverage' && activeModule !== 'okupansi' && activeModule !== 'outstanding' && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 animate-slide-up">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${getColorClasses(menuItems.find(m => m.id === activeModule)?.color).split(' ').slice(1).join(' ')}`}>
                <Icon name={menuItems.find(m => m.id === activeModule)?.icon} size={32} className={getColorClasses(menuItems.find(m => m.id === activeModule)?.color).split(' ')[0]} />
              </div>
              <p className="text-sm font-bold text-slate-600 capitalize">Modul {menuItems.find(m => m.id === activeModule)?.label}</p>
              <p className="text-[10px] text-center mt-2 px-6 max-w-xs leading-relaxed">
                Komponen mobile untuk modul ini siap dipasang dan dirancang.
              </p>
            </div>
          )}



          {/* VIEW OKUPANSI */}
          {activeModule === 'okupansi' && (
            <div className="flex-1 w-full relative animate-fade bg-slate-50 overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
              <OkupansiMobileView data={data} activeStation={overviewStationFilter} />
            </div>
          )}

          {/* VIEW OUTSTANDING WO */}
          {activeModule === 'outstanding' && (
            <div className="flex-1 w-full relative animate-fade bg-slate-50" style={{ height: 'calc(100vh - 60px)' }}>
              <OutstandingMobileView data={data} activeStation={overviewStationFilter} />
            </div>
          )}

          {/* VIEW MENU */}
          {!activeModule && activeTab === 'menu' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="grid" size={18} className="text-blue-600" />
                <h2 className="text-lg font-black text-slate-800">Menu Utama</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {menuItems.map((item, index) => {
                  const isWide = item.id !== 'overview' && item.id !== 'performansi'; // Mulai dari okupansi ke bawah jadi full width
                  return (
                    <button
                      key={item.id}
                      onClick={() => openModule(item.id)}
                      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-slate-300 active:scale-95 transition-all ${isWide ? 'col-span-2 flex-row text-left justify-start' : ''}`}
                    >
                      <div className={`p-2 rounded-lg ${getColorClasses(item.color).split(' ').slice(1).join(' ')} ${isWide ? 'mr-2' : 'mb-1'}`}>
                        <Icon name={item.icon} size={20} className={getColorClasses(item.color).split(' ')[0]} />
                      </div>
                      <span className={`text-[11px] font-bold text-slate-700 ${isWide ? '' : 'text-center'}`}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW SETTINGS - PROFIL PENGGUNA */}
          {!activeModule && activeTab === 'settings' && (
            <div className="flex flex-col bg-slate-50 animate-slide-up">

              {/* Header: Upload Foto Profile dengan Cover Banner */}
              <div className="bg-white pb-8 px-6 rounded-b-[2.5rem] shadow-sm relative shrink-0 flex flex-col items-center justify-center border-b border-slate-200 overflow-hidden">

                {/* Cover Graphic Banner */}
                <div
                  className="absolute top-0 left-0 right-0 h-32 bg-cover bg-center"
                  style={{ backgroundImage: 'url(/profile_cover_bg.png)' }}
                >
                  <div className="absolute inset-0 bg-indigo-900/40 mix-blend-multiply"></div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                {/* Avatar (Overlapping Cover) */}
                <div className="relative group cursor-pointer active:scale-95 transition-transform z-10 mt-14" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-slate-300 overflow-hidden relative">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="user" size={40} className="mb-2" />
                    )}
                    {/* Overlay Camera Icon */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="camera" size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                    <Icon name={profilePhoto ? "edit-2" : "plus"} size={14} className="text-white" />
                  </div>
                </div>

                <h2 className="text-lg font-black text-slate-800 mt-4 relative z-10">{settingName || 'Nama Belum Diatur'}</h2>
                <div className="flex items-center gap-1.5 mt-1.5 relative z-10 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 max-w-[80%]">
                  <Icon name="map-pin" size={12} className="text-blue-500 shrink-0" />
                  <p className="text-[11px] text-slate-600 font-bold truncate">{settingStation.length > 0 ? settingStation.join(' - ') : 'Semua Area Kerja'}</p>
                </div>
              </div>

              {/* Form Profil */}
              <div className="px-5 mt-6 flex-1 space-y-4">

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">

                  {/* Nama Field */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Icon name="user" size={12} /> Nama Lengkap
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan nama Anda"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                      value={settingName}
                      onChange={(e) => setSettingName(e.target.value)}
                    />
                  </div>

                  {/* Area Kerja Field */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Icon name="map-pin" size={12} /> Area Kerja (Bisa pilih lebih dari satu)
                    </label>
                    <button
                      onClick={() => setIsSettingStationDropdownOpen(!isSettingStationDropdownOpen)}
                      className={`w-full bg-slate-50 border rounded-xl px-3.5 py-3 text-[13px] font-bold outline-none transition-colors flex items-center justify-between shadow-sm ${isSettingStationDropdownOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-700'}`}
                    >
                      <span className="truncate pr-4">{settingStation.length > 0 ? settingStation.join(' - ') : 'Pilih Area Kerja...'}</span>
                      <Icon name={isSettingStationDropdownOpen ? "chevron-up" : "chevron-down"} size={16} className={`shrink-0 ${isSettingStationDropdownOpen ? 'text-blue-500' : 'text-slate-400'}`} />
                    </button>
                    {isSettingStationDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSettingStationDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 flex flex-col animate-slide-up">
                          <div className="overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
                            {['Alastua', 'Brumbung', 'Kalibodri', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Randublatung', 'Semarang Tawang', 'Sulur', 'Wadu', 'Weleri'].map(st => (
                              <label
                                key={st}
                                className={`px-3 py-2.5 text-[12px] rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${settingStation.includes(st) ? 'bg-blue-50 text-blue-600 font-black' : 'text-slate-600 hover:bg-slate-50 font-bold'}`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 flex-shrink-0"
                                  checked={settingStation.includes(st)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSettingStation([...settingStation, st]);
                                    } else {
                                      setSettingStation(settingStation.filter(s => s !== st));
                                    }
                                  }}
                                />
                                {st}
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info Device Tambahan */}
                  <div className="pt-2">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700">
                      <Icon name="info" size={16} className="shrink-0" />
                      <p className="text-[10px] leading-relaxed">
                        Pengaturan ini disimpan secara lokal di perangkat Anda.
                      </p>
                    </div>
                  </div>

                  <button
                    className="w-full bg-blue-600 text-white rounded-2xl py-3.5 text-[13px] font-black active:scale-95 transition-transform shadow-md shadow-blue-500/20 mt-4"
                    onClick={handleSaveProfile}
                  >
                    Simpan Profil
                  </button>

                </div>

                {/* PWA Install Button (Selalu Tampil) */}
                <div className="pt-2">
                  <button
                    onClick={async () => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                          setDeferredPrompt(null);
                        }
                      } else {
                        // Jika sudah diinstal atau browser tidak mendukung prompt otomatis
                        showToast('Gunakan opsi "Tambahkan ke Layar Utama" (Add to Home Screen) di menu pengaturan browser Anda (titik tiga di kanan atas) untuk menginstall.', 'info');
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Icon name="download" size={16} className="text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-[13px] font-black leading-tight">Install Aplikasi</h3>
                        <p className="text-[9px] text-blue-100 font-medium">Pasang di layar utama HP Anda</p>
                      </div>
                    </div>
                    <Icon name="chevron-right" size={16} className="opacity-70" />
                  </button>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
      {/* BOTTOM NAVIGATION (Hanya muncul jika tidak di dalam modul spesifik) */}
      <nav className={`bg-white border-t border-slate-200 px-8 py-2 fixed bottom-0 w-full max-w-md z-40 flex justify-between items-center transition-transform duration-300 ${activeModule ? 'translate-y-32' : 'translate-y-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]'}`}>

        {/* Kiri: Menu */}
        <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center gap-1 p-2 flex-1 ${activeTab === 'menu' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <Icon name="grid" size={20} className={activeTab === 'menu' ? 'fill-blue-50' : ''} />
          <span className="text-[9px] font-bold">Menu</span>
        </button>

        {/* Tengah: Beranda (Floating/Circular) */}
        <div className="flex-1 flex justify-center -mt-8 relative z-30">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-4 border-slate-50 shadow-lg transition-transform hover:scale-105 active:scale-95 ${activeTab === 'home' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-800 text-slate-300'}`}
          >
            <Icon name="home" size={24} className={activeTab === 'home' ? 'fill-blue-500/50' : ''} />
          </button>
        </div>

        {/* Kanan: Profil */}
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 flex-1 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <Icon name="user" size={20} className={activeTab === 'settings' ? 'fill-blue-50' : ''} />
          <span className="text-[9px] font-bold">Profil</span>
        </button>
      </nav>

      {/* MODAL LIST PELANGGAN */}
      {listModal.isOpen && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={closeListModal}></div>
          <div className="bg-white w-full max-w-sm max-h-[80vh] rounded-2xl shadow-2xl relative z-10 flex flex-col animate-modal overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-[15px]">{listModal.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Total: <span className="font-bold text-blue-600">{listModal.items.length}</span> data</p>
              </div>
              <button onClick={closeListModal} className="p-2 bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
              <div className="space-y-3">
                {listModal.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${listModal.type === 'kendala' ? 'bg-rose-50 text-rose-500' : listModal.type === 'aktivasi' ? 'bg-emerald-50 text-emerald-500' : listModal.type === 'visit' ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500'}`}>
                      <Icon name={listModal.type === 'kendala' ? 'alert-triangle' : listModal.type === 'aktivasi' ? 'check-circle' : listModal.type === 'visit' ? 'headphones' : 'user-plus'} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-slate-800 text-[12px] truncate">{item.namaPelanggan || item.nama_pelanggan || 'Tanpa Nama'}</h4>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 shrink-0 tracking-wide">{item.idPelanggan || item.id_pelanggan || '-'}</span>
                        </div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500 uppercase shrink-0 mt-0.5">{item.stasiun}</span>
                      </div>

                      {listModal.type === 'aktivasi' || listModal.type === 'kendala' ? (
                        <>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-1.5">
                            <Icon name="user" size={10} className={listModal.type === 'kendala' ? 'text-rose-400' : 'text-emerald-400'} />
                            <span>Oleh: <span className="font-semibold text-slate-700">{listModal.type === 'kendala' ? (item.reporterKendala || item.petugasAktivasi || item.petugas_aktivasi || '-') : (item.petugasAktivasi || item.petugas_aktivasi || '-')}</span></span>
                          </div>
                          {listModal.type === 'kendala' && (
                            <div className="mt-1.5 text-[9px] text-slate-600 bg-rose-50/80 p-2 rounded-lg border border-rose-100/80 leading-relaxed">
                              <span className="font-bold text-rose-700 block mb-0.5">Detail Kendala:</span>
                              {getCleanIssueText(item, data.pelangganData)}
                            </div>
                          )}
                        </>
                      ) : listModal.type === 'visit' ? (
                        <>
                          <div className="flex items-center justify-between text-[9px] mt-1.5">
                            <div className="flex items-center gap-1 text-slate-500">
                              <Icon name="headphones" size={10} className="text-purple-400" />
                              <span className="font-semibold text-slate-700 truncate max-w-[100px]">{item.petugas || item.teknisi || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const isClosed = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status).toUpperCase());
                                if (isClosed || !item.timestamp) return null;
                                const diffMs = new Date() - new Date(item.timestamp);
                                if (diffMs < 0 || isNaN(diffMs)) return null;
                                const hrs = Math.floor(diffMs / (1000 * 60 * 60));
                                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                const colorClass = hrs >= 4 ? 'text-rose-600 font-black' : hrs >= 2 ? 'text-orange-500 font-bold' : 'text-blue-500 font-medium';
                                return <span className={`text-[8px] flex items-center gap-0.5 ${colorClass}`}><Icon name="clock" size={8} /> {hrs}j {mins}m</span>;
                              })()}
                              <span className={`font-bold px-1.5 py-0.5 rounded text-[8px] ${['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status).toUpperCase()) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {item.status || 'OPEN'}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-col gap-0.5">
                            <p className="text-[9px] text-slate-600 leading-tight line-clamp-2"><span className="font-semibold text-slate-700">Keluhan:</span> {item.keluhan || '-'}</p>
                            {item.tindakan && (
                              <p className="text-[9px] text-emerald-600 leading-tight line-clamp-2"><span className="font-semibold text-emerald-700">Tindakan:</span> {item.tindakan}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-1.5">
                          <Icon name="clock" size={10} className="text-blue-400" />
                          <span>Tanggal: <span className="font-semibold text-slate-700">{standardizeDate(item.tanggal || item.tanggalRegistrasi)}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT TIKET BARU */}
      {showNewTicketModal && createPortal(
        <div className="fixed inset-0 z-[999] overflow-y-auto custom-scrollbar">
          <div className="min-h-screen px-4 py-10 flex items-center justify-center relative">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => !newTicketIsSaving && setShowNewTicketModal(false)}></div>
            <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col relative z-10 animate-modal shadow-2xl">

              {newTicketIsSaving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[99] flex flex-col items-center justify-center animate-fade rounded-2xl">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <h3 className="text-sm font-bold text-slate-800">Menyimpan Tiket...</h3>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Icon name="headset" size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-none">Input Tiket Baru</h2>
                    <p className="text-[10px] text-blue-100 mt-1 font-medium">Buat tiket visit / gangguan pelanggan</p>
                  </div>
                </div>
                <button onClick={() => !newTicketIsSaving && setShowNewTicketModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <Icon name="x" size={18} />
                </button>
              </div>

              <div className="p-4 flex-1 space-y-4">
                {newTicketError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 animate-fade">
                    <Icon name="alert-circle" size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium text-rose-700 leading-relaxed">{newTicketError}</p>
                  </div>
                )}

                {/* Pencarian Pelanggan */}
                {!newTicketSelectedPelanggan ? (
                  <div className="space-y-1.5 relative z-[100]">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cari Pelanggan <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik ID atau Nama Pelanggan..."
                        value={newTicketSearch}
                        onChange={(e) => setNewTicketSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors outline-none"
                      />
                    </div>
                    {newTicketSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-[70] max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredPelangganSuggestions.length > 0 ? (
                          filteredPelangganSuggestions.map((p, i) => (
                            <div
                              key={i}
                              onClick={() => { setNewTicketSelectedPelanggan(p); setNewTicketSearch(''); }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group"
                            >
                              <div className="min-w-0">
                                <h4 className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 truncate">{p.namaPelanggan || 'Tanpa Nama'}</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{p.idPelanggan} • {toProperCase(p.stasiun)}</p>
                              </div>
                              <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0">
                                <Icon name="check" size={12} className="text-slate-400 group-hover:text-blue-600" />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-[11px] text-slate-500">Tidak ada pelanggan ditemukan</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 relative">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                      {newTicketSelectedPelanggan.namaPelanggan?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{newTicketSelectedPelanggan.namaPelanggan}</h4>
                      <p className="text-[10px] text-slate-600 mt-0.5 truncate">{newTicketSelectedPelanggan.idPelanggan} • {toProperCase(newTicketSelectedPelanggan.stasiun)}</p>
                    </div>
                    <button onClick={() => setNewTicketSelectedPelanggan(null)} className="p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors shrink-0">
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                )}

                {/* Pilihan Keluhan */}
                <div className="space-y-1.5 relative z-[90]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Keluhan Utama <span className="text-rose-500">*</span></label>
                  {newTicketIsKeluhanOpen && <div className="fixed inset-0 z-10" onClick={() => setNewTicketIsKeluhanOpen(false)}></div>}
                  <div
                    onClick={() => setNewTicketIsKeluhanOpen(!newTicketIsKeluhanOpen)}
                    className={`w-full p-2.5 bg-slate-50 border ${newTicketIsKeluhanOpen ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'} rounded-xl text-xs font-medium flex justify-between items-center transition-colors cursor-pointer relative z-20`}
                  >
                    <span className={newTicketKeluhan ? 'text-slate-800' : 'text-slate-400'}>{newTicketKeluhan || '-- Pilih Keluhan --'}</span>
                    <Icon name={newTicketIsKeluhanOpen ? 'chevron-up' : 'chevron-down'} size={14} className="text-slate-400" />
                  </div>
                  {newTicketIsKeluhanOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-30 max-h-40 overflow-y-auto custom-scrollbar">
                      {keluhanOptions.map((opt, i) => (
                        <div
                          key={i}
                          onClick={() => { setNewTicketKeluhan(opt); setNewTicketIsKeluhanOpen(false); }}
                          className={`px-3 py-2.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${newTicketKeluhan === opt ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {opt}
                          {newTicketKeluhan === opt && <Icon name="check" size={14} className="text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deskripsi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detail Kendala <span className="text-rose-500">*</span></label>
                  <textarea
                    rows="3"
                    value={newTicketCatatan}
                    onChange={(e) => setNewTicketCatatan(e.target.value)}
                    placeholder="Tuliskan keluhan atau detail masalah secara spesifik..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors outline-none resize-y"
                  ></textarea>
                </div>

                {/* Tugaskan Teknisi */}
                <div className="space-y-1.5 relative z-[80]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tugaskan Teknisi <span className="text-slate-400 font-medium normal-case">(Opsional)</span></label>
                  {newTicketIsPetugasOpen && <div className="fixed inset-0 z-10" onClick={() => setNewTicketIsPetugasOpen(false)}></div>}
                  <div className="relative z-20">
                    <input
                      type="text"
                      value={newTicketIsPetugasOpen ? newTicketPetugasSearch : (newTicketPetugas || '')}
                      onChange={(e) => {
                        setNewTicketPetugasSearch(e.target.value);
                        if (!newTicketIsPetugasOpen) setNewTicketIsPetugasOpen(true);
                      }}
                      onFocus={() => {
                        setNewTicketPetugasSearch('');
                        setNewTicketIsPetugasOpen(true);
                      }}
                      placeholder="-- Ketik atau pilih nama teknisi --"
                      className={`w-full bg-slate-50 border ${newTicketIsPetugasOpen ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'} rounded-xl pl-3 pr-10 py-2.5 text-xs focus:bg-white focus:outline-none transition-colors outline-none cursor-text ${newTicketPetugas && !newTicketIsPetugasOpen ? 'font-bold text-slate-800' : 'text-slate-600'}`}
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 px-3 flex items-center cursor-pointer"
                      onClick={() => setNewTicketIsPetugasOpen(!newTicketIsPetugasOpen)}
                    >
                      <Icon name={newTicketIsPetugasOpen ? 'chevron-up' : 'chevron-down'} size={14} className="text-slate-400" />
                    </div>
                  </div>
                  {newTicketIsPetugasOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-[90] flex flex-col max-h-48 overflow-y-auto custom-scrollbar">
                      <div onClick={() => { setNewTicketPetugas(''); setNewTicketPetugasSearch(''); setNewTicketIsPetugasOpen(false); }} className={`px-3 py-2.5 text-[11px] cursor-pointer flex items-center justify-between ${!newTicketPetugas ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span>-- Kosongkan / Belum Ditugaskan --</span>
                        {!newTicketPetugas && <Icon name="check" size={14} className="text-blue-600" />}
                      </div>
                      {filteredPetugasList.map((ptg, i) => (
                        <div
                          key={i}
                          onClick={() => { setNewTicketPetugas(ptg.nama); setNewTicketPetugasSearch(''); setNewTicketIsPetugasOpen(false); }}
                          className={`px-3 py-2.5 text-[11px] cursor-pointer transition-colors flex items-center justify-between ${newTicketPetugas === ptg.nama ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{ptg.nama}</span>
                            <span className="text-[9px] opacity-70 font-medium">@{ptg.username?.replace('@', '')}</span>
                          </div>
                          {newTicketPetugas === ptg.nama && <Icon name="check" size={14} className="text-blue-600" />}
                        </div>
                      ))}
                      {filteredPetugasList.length === 0 && (
                        <div className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
                          Teknisi tidak ditemukan
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white shrink-0 rounded-b-2xl">
                <button
                  onClick={handleNewTicketSubmit}
                  disabled={!newTicketSelectedPelanggan || !newTicketKeluhan || !newTicketCatatan.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <Icon name="send" size={14} /> Buat Tiket
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DETAIL PELANGGAN MODAL */}
      {selectedPelanggan && createPortal((() => {
        const sp = selectedPelanggan;
        const st = sp._ticketStatus
          ? (['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(sp._ticketStatus) ? 'CLOSED VISIT' : 'OPEN VISIT')
          : (sp._status || getFinalPelangganStatus(sp));

        // Coba cari data tambahan (foto) dari Supabase atau fallback ke dataRegistrasi
        const regData = (data.dataRegistrasi || []).find(r => r.idPelanggan === sp.idPelanggan || r.idPelanggan === sp.id_pelanggan);
        const fotoRumah = sp.fotoRumahPelanggan || regData?.fotoRumahPelanggan || null;
        const fotoOnt = sp.fotoOntTerpasang || regData?.fotoOntTerpasang || null;
        const fotoPerbaikan = sp.fotoPerbaikan || null;

        const getDriveDirectUrl = (url) => {
          if (!url) return null;
          const match = url.match(/[-\w]{25,}/);
          if (match) return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1000`;
          return url;
        };

        const statusConfig = {
          'AKTIF': { bg: 'bg-emerald-100', text: 'text-emerald-700', headerBg: 'bg-emerald-500', icon: 'check-circle' },
          'WAITING': { bg: 'bg-amber-100', text: 'text-amber-700', headerBg: 'bg-amber-500', icon: 'clock' },
          'SUSPEND': { bg: 'bg-orange-100', text: 'text-orange-700', headerBg: 'bg-orange-500', icon: 'pause-circle' },
          'KENDALA': { bg: 'bg-rose-100', text: 'text-rose-700', headerBg: 'bg-rose-500', icon: 'alert-triangle' },
          'READY TO DISMANTLE': { bg: 'bg-red-100', text: 'text-red-700', headerBg: 'bg-red-500', icon: 'x-circle' },
          'DISMANTLED': { bg: 'bg-slate-100', text: 'text-slate-600', headerBg: 'bg-slate-500', icon: 'trash-2' },
          'OPEN VISIT': { bg: 'bg-rose-100', text: 'text-rose-700', headerBg: 'bg-rose-500', icon: 'headset' },
          'CLOSED VISIT': { bg: 'bg-emerald-100', text: 'text-emerald-700', headerBg: 'bg-emerald-500', icon: 'check-square' },
        };
        const sc = statusConfig[st] || statusConfig['WAITING'];
        const phone = String(sp.nomorHp || sp.hp || '').replace(/\D/g, '');
        const ageDays = sp._ageDays;

        return (
          <div
            className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-end justify-center"
            onTouchMove={(e) => e.preventDefault()}
          >
            <div className="absolute inset-0 w-full max-w-md mx-auto" onClick={() => setSelectedPelanggan(null)} />
            <div
              className="relative bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-slide-up"
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${sc.headerBg} rounded-t-3xl p-5 text-white relative overflow-hidden shrink-0`}>
                <Icon name={sc.icon || 'info'} size={120} className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-bold opacity-80 mb-1.5">{sp.idPelanggan || sp.id || '-'} · {sp.stasiun || '-'}</p>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full bg-white/20`}>{st === 'READY TO DISMANTLE' ? 'READY DISM.' : st}</span>
                        {ageDays >= 0 && st === 'WAITING' && (
                          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-white/20">
                            Umur WO: {ageDays === 0 ? (sp._ageHours >= 0 ? `${sp._ageHours} Jam` : '0 Jam') : `${ageDays} hari`}
                          </span>
                        )}
                      </div>
                      <h2 className="text-[18px] font-black leading-tight mb-2">{sp.namaPelanggan || sp.nama || 'Tanpa Nama'}</h2>
                    </div>
                    <button onClick={() => setSelectedPelanggan(null)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Icon name="x" size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body — Scrollable */}
              <div className="overflow-y-auto flex-1 p-5 custom-scrollbar space-y-1">
                {/* Contact Section */}
                <div className="text-[10px] font-black text-blue-700 bg-blue-50 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mb-2">
                  <Icon name="map-pin" size={13} /> Kontak & Lokasi
                </div>
                {!isEditingPelanggan ? (
                  <DetailRow label="No. HP" value={phone ? `+62${phone.replace(/^0+|^62/, '')}` : '-'} isLink={!!phone} href={phone ? `https://wa.me/62${phone.replace(/^0+|^62/, '')}` : '#'} />
                ) : (
                  <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="No. HP" fieldKey="nomorHp" value={sp.nomorHp || sp.hp || ''} />
                )}
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Alamat" fieldKey="alamat" value={sp.alamat || '-'} />
                {!isEditingPelanggan ? (
                  sp.latitude && sp.longitude && <DetailRow label="Koordinat" value={`${sp.latitude}, ${sp.longitude}`} />
                ) : (
                  <>
                    <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Latitude" fieldKey="latitude" value={sp.latitude || ''} />
                    <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Longitude" fieldKey="longitude" value={sp.longitude || ''} />
                  </>
                )}

                {/* Service Info */}
                <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mb-2 mt-4">
                  <Icon name="server" size={13} /> Info Layanan
                </div>
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="ODP / Kode ODP" fieldKey="odpAktual" value={sp.odpAktual || sp.odp || sp.kodeOdp || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Port ODP" fieldKey="portOdp" value={sp.portOdp || sp.port || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="SN ONT" fieldKey="snOnt" value={sp.snOnt || sp.sn || sp.serialNumber || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Kabel Precon" fieldKey="kabelPrecon" value={sp.kabelPrecon || sp.panjangKabel || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Nama Sales" fieldKey="namaSales" value={sp.namaSales || '-'} />

                {/* Status Info */}
                <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mb-2 mt-4">
                  <Icon name="activity" size={13} /> Status Layanan
                </div>
                <EditableRow
                  isEditingPelanggan={isEditingPelanggan}
                  editPelangganForm={editPelangganForm}
                  setEditPelangganForm={setEditPelangganForm}
                  label="Status Layanan"
                  fieldKey="aktivasi"
                  value={(() => {
                    let val = sp.aktivasi || sp.statusAktivasi || sp.ikr || sp.statusIkr || '-';
                    if (val.toLowerCase() === 'belum') return 'Waiting';
                    if (val.toLowerCase() === 'sudah') return 'Aktif';
                    return val;
                  })()}
                  options={['Waiting', 'Aktif', 'Suspend', 'Ready To Dismantle', 'Dismantled', 'Kendala']}
                  onChangeOverride={(val) => {
                    // Jika memilih Aktif, backend mungkin butuh 'Sudah' atau 'Aktif'. 
                    // Kita simpan sesuai pilihan, karena logika cek sudah mendukung dua-duanya.
                    setEditPelangganForm({ ...editPelangganForm, aktivasi: val, ikr: val })
                  }}
                />
                {!isEditingPelanggan && <DetailRow label="Tgl Registrasi" value={sp.tanggalRegistrasi || '-'} />}
                {!isEditingPelanggan ? <DetailRow label="Tgl Aktivasi" value={sp.tglAktivasi || '-'} /> : <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Tgl Aktivasi" fieldKey="tglAktivasi" value={sp.tglAktivasi || ''} type="datetime-local" />}
                {!isEditingPelanggan ? <DetailRow label="Tgl IKR" value={sp.tglIkr || '-'} /> : <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Tgl IKR" fieldKey="tglIkr" value={sp.tglIkr || ''} type="datetime-local" />}
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Petugas IKR" fieldKey="petugasIkr" value={sp.petugasIkr || sp.teknisiIkr || sp.teknisi || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Petugas Aktivasi" fieldKey="petugasAktivasi" value={sp.petugasAktivasi || sp.user || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Catatan / Patokan" fieldKey="catatan" value={sp.catatan || '-'} />
                <EditableRow isEditingPelanggan={isEditingPelanggan} editPelangganForm={editPelangganForm} setEditPelangganForm={setEditPelangganForm} label="Issue / Kendala" fieldKey="issueKendala" value={sp.issueKendala || '-'} />
                {/* Photos Section */}
                {!isEditingPelanggan && st === 'CLOSED VISIT' && (
                  <>
                    <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mb-2 mt-4">
                      <Icon name="check-circle" size={13} /> Foto Perbaikan
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-2">
                      <div className="flex flex-col gap-1.5">
                        {fotoPerbaikan ? (
                          <a href={fotoPerbaikan} target="_blank" rel="noreferrer" className="block border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-50 flex items-center justify-center relative group shadow-sm active:scale-95 transition-transform">
                            <img src={getDriveDirectUrl(fotoPerbaikan)} alt="Foto Perbaikan" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="text-[10px] text-slate-400 p-2 text-center font-medium w-full">Gagal memuat</div>'; }} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Icon name="external-link" size={16} className="text-white drop-shadow-md" />
                            </div>
                          </a>
                        ) : (
                          <div className="border border-dashed border-slate-300 rounded-xl aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-4">
                            <Icon name="image" size={24} className="mb-2 opacity-50" />
                            <span className="text-[10px] font-bold">Belum ada foto perbaikan</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {!isEditingPelanggan && st !== 'CLOSED VISIT' && (fotoRumah || fotoOnt) && (
                  <>
                    <div className="text-[10px] font-black text-rose-700 bg-rose-50 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mb-2 mt-4">
                      <Icon name="image" size={13} /> Foto IKR / Instalasi
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {fotoRumah && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">Foto Rumah</span>
                          <a href={fotoRumah} target="_blank" rel="noreferrer" className="block border border-slate-200 rounded-xl overflow-hidden aspect-square bg-slate-50 flex items-center justify-center relative group shadow-sm active:scale-95 transition-transform">
                            <img src={getDriveDirectUrl(fotoRumah)} alt="Foto Rumah" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="text-[10px] text-slate-400 p-2 text-center font-medium w-full">Gagal memuat</div>'; }} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Icon name="external-link" size={16} className="text-white drop-shadow-md" />
                            </div>
                          </a>
                        </div>
                      )}
                      {fotoOnt && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider">Foto ONT</span>
                          <a href={fotoOnt} target="_blank" rel="noreferrer" className="block border border-slate-200 rounded-xl overflow-hidden aspect-square bg-slate-50 flex items-center justify-center relative group shadow-sm active:scale-95 transition-transform">
                            <img src={getDriveDirectUrl(fotoOnt)} alt="Foto ONT" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="text-[10px] text-slate-400 p-2 text-center font-medium w-full">Gagal memuat</div>'; }} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Icon name="external-link" size={16} className="text-white drop-shadow-md" />
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 flex gap-2.5 shrink-0 bg-white relative z-20">
                {isEditingPelanggan ? (
                  <>
                    <button onClick={() => setIsEditingPelanggan(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold active:scale-95 transition-transform" disabled={isSavingPelanggan}>Batal</button>
                    <button onClick={handleSavePelanggan} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-2" disabled={isSavingPelanggan}>
                      {isSavingPelanggan ? (
                        <><Icon name="loader" size={13} className="animate-spin" /> Menyimpan...</>
                      ) : (
                        <><Icon name="save" size={13} /> Simpan Perubahan</>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => {
                      let initAktivasi = sp.aktivasi || sp.statusAktivasi || sp.ikr || sp.statusIkr || 'Waiting';
                      if (initAktivasi.toLowerCase() === 'belum') initAktivasi = 'Waiting';
                      else if (initAktivasi.toLowerCase() === 'sudah' || initAktivasi.toUpperCase() === 'AKTIF') initAktivasi = 'Aktif';
                      else if (initAktivasi.toUpperCase() === 'KENDALA') initAktivasi = 'Kendala';
                      else if (initAktivasi.toUpperCase() === 'SUSPEND') initAktivasi = 'Suspend';
                      else if (initAktivasi.toUpperCase() === 'DISMANTLED') initAktivasi = 'Dismantled';
                      else if (initAktivasi.toUpperCase() === 'READY TO DISMANTLE') initAktivasi = 'Ready To Dismantle';

                      setEditPelangganForm({
                        ...sp,
                        aktivasi: initAktivasi,
                        ikr: initAktivasi,
                        nomorHp: sp.nomorHp || sp.hp || '',
                        latitude: sp.latitude || '',
                        longitude: sp.longitude || '',
                        odpAktual: sp.odpAktual || sp.odp || sp.kodeOdp || '',
                        snOnt: sp.snOnt || sp.sn || sp.serialNumber || '',
                        kabelPrecon: sp.kabelPrecon || sp.panjangKabel || '',
                        tglAktivasi: sp.tglAktivasi || '',
                        tglIkr: sp.tglIkr || '',
                        petugasIkr: sp.petugasIkr || sp.teknisiIkr || sp.teknisi || ''
                      });
                      setIsEditingPelanggan(true);
                    }} className="px-3.5 py-2.5 bg-amber-500 text-white rounded-xl text-[11px] font-bold active:scale-95 transition-transform shrink-0 flex items-center justify-center">
                      <Icon name="edit-3" size={14} />
                    </button>
                    {phone && (
                      <a href={`https://wa.me/62${phone.replace(/^0+|^62/, '')}`} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                        <Icon name="phone" size={13} /> WhatsApp
                      </a>
                    )}
                    {sp.latitude && sp.longitude && (
                      <a href={`https://maps.google.com/?q=${sp.latitude},${sp.longitude}`} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                        <Icon name="map-pin" size={13} /> Peta
                      </a>
                    )}
                    <button onClick={() => setSelectedPelanggan(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold active:scale-95 transition-transform">
                      Tutup
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })(), document.body)}
      {/* Toast Notification */}
      {toastConfig.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up">
          <div className={`px-4 py-3 min-w-[250px] rounded-2xl shadow-xl flex items-center gap-3 ${toastConfig.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'}`}>
            <Icon name={toastConfig.type === 'error' ? 'alert-octagon' : 'check-circle'} size={18} className={toastConfig.type === 'error' ? 'text-rose-200' : 'text-emerald-400'} />
            <span className="text-xs font-bold">{toastConfig.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>
);
