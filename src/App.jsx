
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import XLSX from 'xlsx-js-style';
import * as fflate from 'fflate';
import { createClient } from '@supabase/supabase-js';

// Konfigurasi Supabase
const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

import * as LucideIcons from 'lucide-react';

import AiDeceView from './components/AiDeceView';
import ActivationCalendarTable from './components/ActivationCalendarTable';

import {
  BarChart, Bar, LineChart, Line, CartesianGrid, Legend,
  XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell
} from 'recharts';

// Custom Icon component that uses global lucide CDN
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
    telatBayarHari: fields.telat_bayar_hari !== undefined && fields.telat_bayar_hari !== null ? Number(fields.telat_bayar_hari) : null
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

// Helper untuk menyimpan cache persistent
const setCachedData = (key, data) => {
  try {
    if (data === null) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return;
    }
    const compressed = compressCacheItem(data);
    const payload = {
      timestamp: Date.now(),
      data: compressed
    };
    const jsonStr = JSON.stringify(payload);
    try {
      localStorage.setItem(key, jsonStr);
    } catch (err) {
      try {
        sessionStorage.setItem(key, jsonStr);
      } catch (e) { }
    }
  } catch (e) {
    // Cache hanya sebagai fallback
  }
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

      if (!response.ok) {
        return { success: false, error: `HTTP Error ${response.status}` };
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        return { success: false, error: "Respon server tidak valid." };
      }

      if (result.error || result.success === false) {
        return { success: false, error: result.error || result.message || "Gagal memproses data." };
      }
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

  const ymdMatch = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return cleaned;
};

const toProperCase = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

const extractKendalaData = (item) => {
  let issue = item.issueKendala || '';
  let reporter = item.reporterKendala || '';
  let date = item.tanggalKendala || item.tglAktivasi || item.timestampAktivasi || item.tanggalRegistrasi || '';

  for (const key in item) {
    const lk = String(key).toLowerCase();
    if (lk.includes('issue') && !issue) issue = item[key];
    if (lk.includes('reporter') && !reporter) reporter = item[key];
    if (lk.includes('tanggal') && lk.includes('kendala') && !date) date = item[key];
  }
  return { issue, reporter, date };
};

// --- Helper Function: Pencari Status Pelanggan Global ---
const getGlobalStatusStr = (item) => {
  const { issue, reporter } = extractKendalaData(item);
  const valAktivasi = String(item.aktivasi || item.statusAktivasi || '').trim().toUpperCase();
  const valIkr = String(item.ikr || item.statusIkr || '').trim().toUpperCase();

  if (valAktivasi === 'AKTIF' || valAktivasi === 'SUDAH') return "AKTIF";

  if (valAktivasi === 'SUSPEND') return "SUSPEND";
  if (valAktivasi === 'READY TO DISMANTLE') return "READY TO DISMANTLE";
  if (valAktivasi === 'DISMANTLED' || valAktivasi === 'DISMANTLE') return "DISMANTLED";

  if (valAktivasi.includes('KENDALA') || valIkr.includes('KENDALA')) {
    return "KENDALA";
  }

  if (issue && String(issue).trim() !== "" && String(issue).trim().toLowerCase() !== String(item.alamat || '').trim().toLowerCase()) {
    return "KENDALA";
  }

  if (valIkr === 'SUDAH') return "SUDAH IKR";
  if (valIkr === 'BELUM' || valIkr === '') return "WAITING";
  return "WAITING";
};



// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Crash Error:", error, errorInfo);
  }
  componentDidMount() {
    if (window.lucide) window.lucide.createIcons();
  }
  componentDidUpdate() {
    if (window.lucide) window.lucide.createIcons();
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-xl border border-rose-100 max-w-lg text-center animate-modal duration-300">
            <div className="text-rose-500 mb-4 flex justify-center"><i data-lucide="alert-triangle" style={{ width: 48, height: 48 }}></i></div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan Render</h1>
            <p className="text-sm text-slate-600 mb-4">Aplikasi tidak bisa menampilkan data.</p>
            <div className="text-xs text-rose-500 bg-rose-50 p-3 rounded-lg text-left overflow-auto max-h-32 mb-6 font-mono border border-rose-200">
              {this.state.error?.toString()}
            </div>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors">
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


// --- SUB-KOMPONEN: MODAL FORM CERDAS ---
function OfficerFormModal({ type, data, unassignedList, stations, onClose, onSave }) {
  const [showHints, setShowHints] = useState(false);
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [isJabatanOpen, setIsJabatanOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false); // State baru untuk dropdown Status

  // --- STATE UNTUK ANIMASI LOADING & ERROR SINKRONISASI ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState({
    id: data?.id || null,
    nama: data?.nama || '',
    username: data?.username || '',
    stasiun: data?.stasiun || stations[0],
    jabatan: data?.jabatan || 'Teknisi',
    status: data?.status || 'Masuk' // Default backend pakai 'Masuk'
  });

  // Tampilkan semua jika tidak ada pencarian, filter jika mengetik
  const filteredSuggestions = useMemo(() => {
    if (!form.nama) return unassignedList;
    return unassignedList.filter(u => u.nama.toLowerCase().includes(form.nama.toLowerCase()));
  }, [form.nama, unassignedList]);

  // Dropdown Custom yang diselaraskan dengan style Data Pelanggan
  const CustomSelect = ({ label, value, options, onSelect, isOpen, setIsOpen, disabled }) => (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-10'}`}>
      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">{label} <span className="text-rose-500">*</span></label>
      {isOpen && <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)}></div>}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-2.5 bg-white border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300'} rounded-lg text-sm font-medium text-slate-700 flex justify-between items-center transition-all shadow-sm relative z-[106] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span>{value}</span>
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[110] animate-dropdown">
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {options.map(opt => (
              <div
                key={opt}
                onClick={() => { onSelect(opt); setIsOpen(false); }}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm transition-all flex items-center justify-between ${value === opt ? 'text-blue-700 font-bold bg-blue-50/50' : 'text-slate-600 font-medium'}`}
              >
                <span>{opt}</span>
                {value === opt && <Icon name="check" size={14} className="text-blue-600" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const handleSaveSubmit = () => {
    onSave(form);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => !isSaving && onClose()}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 animate-modal flex flex-col border border-slate-100">

        {isSaving && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade rounded-2xl">
            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4 shadow-md"></div>
            <h3 className="text-base font-bold text-slate-800">
              {type === 'add' ? 'Menyimpan Petugas Baru...' : 'Menyimpan Perubahan...'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-2 animate-pulse">
              <Icon name="refresh-cw" size={12} className="animate-spin" />
              Mensinkronisasi data dengan server
            </p>
          </div>
        )}

        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white rounded-t-2xl shrink-0 relative z-20">
          <h2 className="text-[20px] font-bold text-slate-800 flex items-center tracking-tight">
            <Icon name={type === 'add' ? "user-plus" : "edit"} size={22} className="mr-2.5 text-blue-600" />
            {type === 'add' ? 'Tambah Petugas Baru' : 'Edit Data Petugas'}
          </h2>
          <button onClick={onClose} disabled={isSaving} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-5 flex-1 bg-slate-50/30 overflow-visible relative z-[30]">

          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 mb-4 animate-fade">
              <Icon name="alert-circle" size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed text-rose-700">{saveError}</p>
            </div>
          )}

          {type === 'add' && !saveError && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 mb-2">
              <Icon name="info" size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Lengkapi form di bawah ini untuk menambahkan data penempatan petugas baru ke dalam sistem.
              </p>
            </div>
          )}

          {type === 'add' ? (
            <div className={`relative ${showHints ? 'z-[9999]' : 'z-20'}`}>
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>

              {showHints && <div className="fixed inset-0 z-[60]" onClick={() => setShowHints(false)}></div>}

              <div className="relative z-[70]">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={form.nama}
                  onChange={e => {
                    setForm({ ...form, nama: e.target.value, id: null, username: '' });
                    setShowHints(true);
                  }}
                  onFocus={() => setShowHints(true)}
                  disabled={isSaving}
                  className={`w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Pilih atau ketik nama teknisi..."
                />
              </div>

              {showHints && !isSaving && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-[80] animate-dropdown py-1">
                  <div className="max-h-56 overflow-y-auto custom-scrollbar">
                    {filteredSuggestions.length > 0 ? filteredSuggestions.map(u => (
                      <div
                        key={u.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setForm({ ...form, id: u.id || 'terdaftar', nama: u.nama, username: u.username || '' });
                          setShowHints(false);
                        }}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col group transition-all"
                      >
                        <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600">{u.nama}</span>
                        {/* Hilangkan @ di username */}
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {u.username ? u.username : 'ID Terdaftar'} (Belum ada penempatan)
                        </span>
                      </div>
                    )) : <div className="p-4 text-center text-slate-400 text-xs italic">Data antrean tidak ditemukan.</div>}
                  </div>
                </div>
              )}

              {/* Notifikasi Badge Validasi Cerdas - Hilangkan @ */}
              {form.id && !showHints && (
                <div className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-max animate-fade">
                  <Icon name="check-circle" size={14} className="shrink-0" />
                  <span>{form.username ? `Terhubung dengan Telegram: ${form.username}` : 'Data telah terhubung dengan Bot Telegram'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10">
              <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Nama Petugas</label>
              <div className="p-2.5 bg-slate-100 rounded-lg font-bold text-slate-700 text-sm border border-slate-200 opacity-80">{form.nama}</div>
            </div>
          )}

          {/* Tiga Kolom: Jabatan, Stasiun, dan Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <CustomSelect label="Jabatan" value={form.jabatan} options={["Teknisi", "Team Leader", "Partnership"]} onSelect={(v) => setForm({ ...form, jabatan: v })} isOpen={isJabatanOpen} setIsOpen={setIsJabatanOpen} disabled={isSaving} />
            <CustomSelect label="Stasiun" value={form.stasiun} options={stations} onSelect={(v) => setForm({ ...form, stasiun: v })} isOpen={isStationOpen} setIsOpen={setIsStationOpen} disabled={isSaving} />

            {/* Dropdown Status Piket Ditambahkan */}
            <CustomSelect
              label="Status Piket"
              value={String(form.status).toLowerCase().includes('masuk') ? 'On Duty' : 'Libur'}
              options={["On Duty", "Libur"]}
              onSelect={(v) => setForm({ ...form, status: v === 'On Duty' ? 'Masuk' : 'Libur' })}
              isOpen={isStatusOpen}
              setIsOpen={setIsStatusOpen}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white rounded-b-2xl shrink-0 z-10 relative">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors disabled:opacity-50">Batal</button>
          <button
            disabled={!form.nama.trim() || isSaving}
            onClick={handleSaveSubmit}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2 ${form.nama.trim() && !isSaving ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-slate-300 cursor-not-allowed text-slate-50'}`}
          >
            <Icon name={type === 'add' ? "save" : "check"} size={16} />
            {type === 'add' ? 'Simpan Petugas Baru' : 'Simpan Perubahan'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

// --- CARD UNTUK BAGAN ---
function OfficerCardBagan({ person, isLeader = false, isPlaceholder = false }) {
  const isMasuk = !isPlaceholder && String(person.status).toLowerCase().includes('masuk');
  return (
    <div className={`relative flex flex-col items-center p-6 rounded-[2rem] border-2 w-52 transition-all overflow-hidden ${isPlaceholder ? 'bg-white/40 border-dashed border-slate-200 opacity-60' : 'bg-white shadow-sm hover:shadow-2xl border-slate-100'}`}>

      {/* Mengembalikan desain garis lengkung biru asli */}
      {isLeader && !isPlaceholder && <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>}

      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-4 border-4 shadow-inner ${isPlaceholder ? 'bg-slate-50 text-slate-200 border-slate-100' : isMasuk ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
        {person.nama ? person.nama.charAt(0).toUpperCase() : '?'}
      </div>
      <h4 className={`font-bold text-sm truncate w-full text-center leading-none mb-1.5 ${isPlaceholder ? 'text-slate-300' : 'text-slate-800'}`}>{person.nama}</h4>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{person.jabatan}</p>

      {!isPlaceholder && (
        <div className={`mt-4 px-3.5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-2 ${isMasuk ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isMasuk ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          {isMasuk ? 'On Duty' : 'Off'}
        </div>
      )}
    </div>
  );
}

// --- KOMPONEN VIEW UTAMA ---
function OfficerManagementView({ teknisiList, onRefresh, onRefreshSilent }) {
  // Untuk dropdown Form (tetap urut abjad agar mudah dicari)
  const allStations = ["Alastua", "Brumbung", "Kalibodri", "Kaliwungu", "Kradenan", "Krengseng", "Randublatung", "Semarang Tawang", "Sulur", "Wadu", "Weleri"].sort();

  // URUTAN SPESIFIK UNTUK GRID 2 KOLOM (Berpasangan Kiri - Kanan)
  const orderedStations = [
    "Alastua", "Brumbung",
    "Kaliwungu", "Kalibodri",
    "Weleri", "Krengseng",
    "Wadu", "Randublatung",
    "Sulur", "Kradenan",
    "Semarang Tawang"
  ];

  const [viewMode, setViewMode] = useState('tabel');
  const [selectedStation, setSelectedStation] = useState(allStations[0]);
  const [modal, setModal] = useState({ isOpen: false, type: '', data: null });

  // STATE LOKAL UNTUK MENCEGAH FULL REFRESH HALAMAN
  const [localTeknisiList, setLocalTeknisiList] = useState(teknisiList || []);
  const [syncToast, setSyncToast] = useState({ show: false, type: '', message: '' });

  // STATE BARU UNTUK MODAL HAPUS PETUGAS
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Sync state lokal jika ada pembaruan data dari props luar
  useEffect(() => {
    setLocalTeknisiList(teknisiList || []);
  }, [teknisiList]);

  // Menggunakan data dari LOKAL state agar UI langsung terupdate
  const assigned = localTeknisiList.filter(t => t.stasiun && t.stasiun !== "");
  const botQueue = localTeknisiList.filter(t => !t.stasiun || t.stasiun === "");
  const totalHadir = assigned.filter(t => String(t.status).toLowerCase().includes('masuk')).length;

  const handleSave = (finalData) => {
    const isEditing = modal.type === 'edit';
    setModal({ isOpen: false });

    // Simpan data sebelumnya untuk revert jika terjadi error
    const prevTeknisiList = [...localTeknisiList];

    // SUNTIK DATA KE MEMORI LOKAL (Instant UI Update Tanpa Loading Server)
    setLocalTeknisiList(prev => {
      const existsIdx = prev.findIndex(t => t.id === finalData.id || t.username === finalData.username || t.nama === finalData.nama);

      if (existsIdx !== -1) {
        // Jika sudah ada, update datanya di layar
        const updated = [...prev];
        updated[existsIdx] = { ...updated[existsIdx], ...finalData };
        return updated;
      } else {
        // Jika baru, tambahkan ke dalam layar
        return [{ ...finalData, id: finalData.id || 'UID_' + new Date().getTime() }, ...prev];
      }
    });

    // Jalankan sinkronisasi di latar belakang!
    setSyncToast({
      show: true,
      type: 'syncing',
      message: isEditing ? 'Menyimpan perubahan petugas di latar belakang...' : 'Menambahkan petugas baru di latar belakang...'
    });

    api.run('updatePetugasData', finalData)
      .then((res) => {
        setSyncToast({
          show: true,
          type: 'success',
          message: isEditing ? 'Perubahan petugas berhasil disimpan!' : 'Petugas baru berhasil ditambahkan!'
        });
        setTimeout(() => setSyncToast(prev => prev.type === 'success' ? { ...prev, show: false } : prev), 3000);

        // Silent refresh untuk update data utama di background
        if (onRefreshSilent) onRefreshSilent();
      })
      .catch((err) => {
        console.error("Gagal menyimpan data petugas:", err);
        setSyncToast({
          show: true,
          type: 'error',
          message: isEditing ? 'Gagal menyimpan perubahan petugas.' : 'Gagal menambahkan petugas baru.'
        });

        // Revert data lokal jika gagal
        setLocalTeknisiList(prevTeknisiList);
      });
  };

  // FUNGSI KONFIRMASI HAPUS
  const confirmDelete = () => {
    if (deleteTarget) {
      const target = { ...deleteTarget, stasiun: "" };
      const prevTeknisiList = [...localTeknisiList];

      // Hapus/Unassign dari UI sementara
      setLocalTeknisiList(prev => prev.filter(t => t.id !== target.id));
      setDeleteTarget(null);

      // Jalankan sinkronisasi di latar belakang!
      setSyncToast({ show: true, type: 'syncing', message: 'Menghapus penempatan petugas di latar belakang...' });

      api.run('updatePetugasData', target)
        .then((res) => {
          setSyncToast({ show: true, type: 'success', message: 'Penempatan petugas berhasil dihapus!' });
          setTimeout(() => setSyncToast(prev => prev.type === 'success' ? { ...prev, show: false } : prev), 3000);

          // Silent refresh untuk update data utama di background
          if (onRefreshSilent) onRefreshSilent();
        })
        .catch((err) => {
          console.error("Gagal menghapus penempatan petugas:", err);
          setSyncToast({ show: true, type: 'error', message: 'Gagal menghapus penempatan petugas di server.' });

          // Revert data lokal jika gagal
          setLocalTeknisiList(prevTeknisiList);
        });
    }
  };

  return (
    <div className="h-full flex flex-col font-sans page-enter relative">

      {/* TOAST POP-UP STATUS SINKRONISASI LENGKAP & PREMIUM */}
      {syncToast.show && ReactDOM.createPortal(
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] bg-white border rounded-full shadow-2xl px-5 py-3 flex items-center gap-3 animate-dropdown transition-all ${syncToast.type === 'syncing' ? 'border-blue-200' :
          syncToast.type === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${syncToast.type === 'syncing' ? 'bg-blue-500' :
            syncToast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
            <Icon name={
              syncToast.type === 'syncing' ? "refresh-cw" :
                syncToast.type === 'success' ? "check" : "alert-circle"
            } className={`text-white ${syncToast.type === 'syncing' ? 'animate-spin' : ''}`} size={14} />
          </div>
          <span className="text-sm font-bold text-slate-700">{syncToast.message}</span>
        </div>,
        document.body
      )}

      {/* POPUP KONFIRMASI HAPUS CUSTOM */}
      {deleteTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 animate-fade" onClick={() => setDeleteTarget(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl p-0 relative z-10 max-w-sm w-full animate-modal overflow-hidden border border-slate-100 text-center">

            <div className="bg-rose-600 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                <Icon name="trash-2" size={100} className="text-white" />
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 relative z-10 backdrop-blur-sm border border-white/30">
                <Icon name="trash-2" size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white relative z-10 tracking-wide">Hapus Petugas</h3>
            </div>

            <div className="p-7">
              <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
                Hapus <b className="text-slate-800">{deleteTarget.nama}</b> dari daftar petugas di stasiun ini?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/30 transition-all active:scale-95">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HEADER UI */}
      <div className="mb-4 sm:mb-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="p-2.5 sm:p-3.5 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
            <Icon name="users" size={20} className="sm:w-[26px] sm:h-[26px]" />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-lg sm:text-[22px] font-bold text-slate-800 tracking-tight mb-0.5">Data Petugas Lapangan</h2>
            <p className="text-[11px] sm:text-[13px] font-medium text-slate-500">Status Piket dan Penempatan Petugas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 flex-col sm:flex-row w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3 bg-white p-1.5 sm:p-2 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto shrink-0 justify-center">
            <div className="flex flex-col items-center px-3 sm:px-4 border-r border-slate-100">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</span>
              <span className="text-base sm:text-xl font-bold text-slate-700 leading-none">{assigned.length}</span>
            </div>
            <div className="flex flex-col items-center px-3 sm:px-4 border-r border-slate-100">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">On Duty</span>
              <span className="text-base sm:text-xl font-bold text-emerald-600 leading-none">{totalHadir}</span>
            </div>
            <div className="flex flex-col items-center px-3 sm:px-4">
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Libur</span>
              <span className="text-base sm:text-xl font-bold text-rose-600 leading-none">{assigned.length - totalHadir}</span>
            </div>
          </div>
          <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0 border border-slate-300/30 w-full sm:w-auto justify-center">
            <button onClick={() => setViewMode('tabel')} className={`flex-1 sm:flex-none px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${viewMode === 'tabel' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}><Icon name="list" size={14} /> Tabel</button>
            <button onClick={() => setViewMode('bagan')} className={`flex-1 sm:flex-none px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${viewMode === 'bagan' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}><Icon name="network" size={14} /> Struktur</button>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4 sm:mb-6 relative z-20 shrink-0">
        <button onClick={() => setModal({ isOpen: true, type: 'add' })} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-6 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95">
          <Icon name="plus" size={16} className="sm:w-[18px] sm:h-[18px]" /> Tambah Petugas
        </button>
      </div>

      {viewMode === 'tabel' && (
        <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar pr-1 sm:pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
            {orderedStations.map(st => {
              const members = assigned.filter(t => t.stasiun === st && t.nama).sort((a, b) => (a.jabatan || '').includes('Leader') ? -1 : 1);

              return (
                <div key={st} className="bg-white rounded-xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden w-full flex flex-col">

                  <div className="bg-slate-50 px-3 py-2.5 sm:px-5 sm:py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-xs sm:text-[15px]">
                      <Icon name="map-pin" size={14} className="text-blue-500 sm:w-[18px] sm:h-[18px]" />Stasiun {st}
                    </h3>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg border border-slate-200 shadow-sm">
                      On Duty: <span className="text-emerald-600">{members.filter(m => String(m.status).toLowerCase().includes('masuk')).length}</span> / {members.length}
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-[9px] sm:text-xs uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="hidden sm:table-cell px-4 py-3.5 w-10 text-center">No</th>
                          <th className="px-1.5 py-2 sm:px-4 sm:py-3.5 w-full">Nama Petugas</th>
                          <th className="hidden sm:table-cell px-4 py-3.5 w-24 text-center">Jabatan</th>
                          <th className="px-1.5 py-2 sm:px-4 sm:py-3.5 w-[65px] sm:w-28 text-center">Status</th>
                          <th className="px-1.5 py-2 sm:px-4 sm:py-3.5 w-10 sm:w-16 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((p, idx) => (
                          <tr key={`${p.id || 'p'}-${idx}`} className="hover:bg-slate-50/70 transition-colors group">
                            <td className="hidden sm:table-cell px-4 py-3 text-center font-mono text-slate-400 font-semibold text-sm border-b border-slate-100">{idx + 1}</td>

                            <td className="px-1.5 py-2 sm:px-4 sm:py-3 border-b border-slate-100 w-full max-w-[140px] sm:max-w-none">
                              <div className="flex items-center gap-1.5 sm:gap-3">
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[9px] sm:text-xs shrink-0 ${String(p.status).toLowerCase().includes('masuk') ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {p.nama ? p.nama.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 text-[10px] sm:text-sm truncate leading-tight" title={p.nama}>{p.nama}</div>
                                  <div className="text-[8px] sm:text-xs text-slate-500 font-mono truncate mt-0.5 flex items-center gap-1" title={p.username || ''}>
                                    <span>{p.username || '-'}</span>
                                    {/* JABATAN MUNCUL DI BAWAH NAMA PADA MOBILE */}
                                    <span className={`sm:hidden text-[7px] font-bold px-1 py-0.5 rounded border whitespace-nowrap ${p.jabatan?.includes('Leader') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                      p.jabatan?.includes('Partnership') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-slate-50 text-slate-500'
                                      }`}>
                                      {p.jabatan?.replace('Team ', '')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="hidden sm:table-cell px-4 py-3 border-b border-slate-100 text-center w-24">
                              <span className={`text-[11px] font-bold px-2 py-1 rounded border whitespace-nowrap ${p.jabatan?.includes('Leader') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                p.jabatan?.includes('Partnership') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                  'bg-slate-50 text-slate-500'
                                }`}>
                                {p.jabatan?.replace('Team ', '')}
                              </span>
                            </td>

                            <td className="px-1.5 py-2 sm:px-4 sm:py-3 text-center border-b border-slate-100 w-[65px] sm:w-28">
                              <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${String(p.status).toLowerCase().includes('masuk') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                                <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 ${String(p.status).toLowerCase().includes('masuk') ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                {String(p.status).toLowerCase().includes('masuk') ? 'On Duty' : 'Libur'}
                              </span>
                            </td>

                            <td className="px-1.5 py-2 sm:px-4 sm:py-3 text-center border-b border-slate-100 w-10 sm:w-16">
                              <div className="flex flex-col sm:flex-row justify-center gap-1 sm:gap-2 opacity-100 sm:opacity-40 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setModal({ isOpen: true, type: 'edit', data: p })} className="p-1 sm:p-1.5 bg-blue-50 text-blue-600 rounded flex-1 sm:flex-none sm:rounded-lg hover:bg-blue-100 transition-all flex justify-center"><Icon name="edit" size={12} className="sm:w-[14px] sm:h-[14px]" /></button>
                                <button onClick={() => setDeleteTarget(p)} className="p-1 sm:p-1.5 bg-rose-50 text-rose-600 rounded flex-1 sm:flex-none sm:rounded-lg hover:bg-rose-100 transition-all flex justify-center"><Icon name="trash-2" size={12} className="sm:w-[14px] sm:h-[14px]" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {members.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-4 sm:py-8 text-slate-400 italic text-[10px] sm:text-xs border-b border-slate-100">
                              Belum ada tim terdaftar di stasiun ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAMPILAN STRUKTUR BAGAN */}
      {viewMode === 'bagan' && (
        <div className="flex-1 flex flex-col overflow-hidden page-enter">

          <div className="flex gap-2.5 overflow-x-auto pb-4 pt-2 px-2 -ml-2 shrink-0 no-scrollbar">
            {orderedStations.map(st => <button key={st} onClick={() => setSelectedStation(st)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedStation === st ? 'bg-slate-800 text-white shadow-md transform scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{st}</button>)}
          </div>

          <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-10 overflow-auto flex justify-center items-start shadow-inner relative">
            <div className="org-tree w-max min-w-full pb-10">
              <ul><li>
                <div className="flex justify-center gap-8">
                  {(() => {
                    const leaders = assigned.filter(t => t.stasiun === selectedStation && t.jabatan.includes('Leader'));
                    if (leaders.length > 0) return leaders.map((tl, i) => <OfficerCardBagan key={`${tl.id || 'ldr'}-${i}`} person={tl} isLeader={true} />);
                    return <OfficerCardBagan isPlaceholder={true} person={{ nama: 'TL Belum Ada', jabatan: 'Team Leader' }} isLeader={true} />;
                  })()}
                </div>
                <ul>
                  {(() => {
                    const techs = assigned.filter(t => t.stasiun === selectedStation && !t.jabatan.includes('Leader'));
                    const nodes = techs.map((tech, i) => <li key={`${tech.id || 'tch'}-${i}`}><OfficerCardBagan person={tech} /></li>);
                    while (nodes.length < 2) nodes.push(<li key={`p-${nodes.length}`}><OfficerCardBagan isPlaceholder={true} person={{ nama: 'Petugas Kosong', jabatan: 'Teknisi' }} /></li>);
                    return nodes;
                  })()}
                </ul>
              </li></ul>
            </div>
          </div>
        </div>
      )}

      {/* PEMANGGILAN MODAL */}
      {modal.isOpen && (
        <OfficerFormModal type={modal.type} data={modal.data} unassignedList={botQueue} stations={allStations} onClose={() => setModal({ isOpen: false })} onSave={handleSave} />
      )}
    </div>
  );
}


// --- FUNGSI UTAMA APP ---
function App({ onLogout }) {
  // Self-healing: Unregister any service workers to prevent cache issues
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister().then(success => {
            if (success) {
              console.log('Unregistered old Service Worker to prevent caching bugs.');
              window.location.reload();
            }
          });
        }
      });
    }
  }, []);

  const tabToPath = {
    'dashboard': '/dashboard',
    'overview': '/overview',
    'database': '/data-pelanggan',
    'okupansi': '/data-okupansi',
    'gangguan': '/data-gangguan',
    'gamas': '/monitoring-gamaas',
    'team': '/data-petugas',
    'coverage': '/odp-coverage',
    'aidece': '/customer-lookup'
  };

  const pathToTab = Object.fromEntries(Object.entries(tabToPath).map(([k, v]) => [v, k]));

  // Mengambil tab awal dari URL browser saat refresh
  const getInitialTab = () => {
    const path = window.location.pathname;
    return pathToTab[path] || 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab());

  // Setter kustom untuk mengubah State dan URL sekaligus
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const newPath = tabToPath[tab] || '/dashboard';
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab }, '', newPath);
    }
  };

  // Mendengarkan tombol Back/Forward browser
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setActiveTabState(pathToTab[path] || 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);

    // Saat komponen dimount, paksa sinkronisasi URL awal jika berada di root ('/')
    if (window.location.pathname === '/') {
      window.history.replaceState({ tab: activeTab }, '', tabToPath[activeTab]);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const [initialDatabaseStatusFilter, setInitialDatabaseStatusFilter] = useState('');
  const [initialDatabaseStationFilter, setInitialDatabaseStationFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Menghubungkan ke Server...');
  const [showForceClose, setShowForceClose] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [data, setData] = useState({
    dailyProgress: [], petugasData: [], odpData: [],
    recentHistory: [], stationData: [], pelangganData: [], visitData: []
  });

  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());

  const [coverageTarget, setCoverageTarget] = useState(null);

  const handleGoToCoverage = (lat, lng) => {
    setCoverageTarget({ lat, lng });
    setActiveTab('coverage');
  };

  const handleGoToHistory = (idPelanggan) => {
    sessionStorage.setItem('otas_history_search', idPelanggan);
    setActiveTab('gangguan');
  };

  // ========================================================
  // FUNGSI BARU: UPDATE LOKAL (TANPA LOADING 15 DETIK)
  // ========================================================
  const handleLocalPelangganUpdate = (updatedItemsArray) => {
    setData(prevData => {
      const newPelangganData = [...prevData.pelangganData];
      updatedItemsArray.forEach(updatedItem => {
        const idx = newPelangganData.findIndex(p => String(p.idPelanggan) === String(updatedItem.idPelanggan));
        if (idx !== -1) {
          // Jika ID ditemukan (Mode Edit/Update Massal), timpa data lamanya
          newPelangganData[idx] = { ...newPelangganData[idx], ...updatedItem };
        } else {
          // Jika ID TIDAK ditemukan (Mode Tambah Pelanggan Baru), sisipkan di baris paling atas
          newPelangganData.unshift(updatedItem);
        }
      });
      return { ...prevData, pelangganData: newPelangganData };
    });
  };

  // ========================================================
  // FUNGSI BARU: HAPUS LOKAL (TANPA LOADING)
  // ========================================================
  const handleLocalPelangganDelete = (deletedIdsArray) => {
    setData(prevData => {
      // 1. Seragamkan ID yang dihapus jadi huruf besar semua & tanpa spasi
      const normalizedDeletedIds = deletedIdsArray.map(id => String(id).trim().toUpperCase());

      // 2. Saring data: Buang data yang ID-nya cocok dengan daftar hapus
      const newPelangganData = prevData.pelangganData.filter(p => {
        const currentId = String(p.idPelanggan).trim().toUpperCase();
        return !normalizedDeletedIds.includes(currentId);
      });

      return { ...prevData, pelangganData: newPelangganData };
    });
  };

  // PERBAIKAN: Fungsi penanganan aksi visit lokal (Add, Resolve, Delete) dengan sinkronisasi ke Supabase
  const handleLocalVisitAction = async (actionType, payload) => {
    const now = new Date();
    const localTimestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    setData(prevData => {
      const newVisitData = [...(prevData.visitData || [])];

      if (actionType === 'add') {
        newVisitData.unshift({
          ...payload,
          status: payload.status || 'OPEN',
          timestamp: payload.timestamp || localTimestamp,
          tindakan: payload.tindakan || '',
          material: payload.material || ''
        });
      } else if (actionType === 'resolve') {
        const idx = newVisitData.findIndex(v =>
          (v.id && payload.id && v.id === payload.id) ||
          (v.timestamp && payload.timestamp && v.timestamp === payload.timestamp && String(v.idPelanggan) === String(payload.idPelanggan)) ||
          (String(v.idPelanggan) === String(payload.idPelanggan) && v.status === 'OPEN')
        );
        if (idx !== -1) {
          newVisitData[idx] = {
            ...newVisitData[idx],
            status: 'DONE',
            tindakan: payload.tindakan || payload.perbaikan || '',
            material: payload.material || payload.usedMaterials || '',
            penyebab: payload.penyebab || newVisitData[idx].penyebab || '',
            petugas: payload.petugas || newVisitData[idx].petugas || '',
            waktuClose: localTimestamp
          };
        }
      } else if (actionType === 'delete') {
        return {
          ...prevData,
          visitData: newVisitData.filter(v =>
            !(
              (v.id && payload.id && v.id === payload.id) ||
              (v.timestamp && payload.timestamp && v.timestamp === payload.timestamp && String(v.idPelanggan) === String(payload.idPelanggan)) ||
              (String(v.idPelanggan) === String(payload.idPelanggan))
            )
          )
        };
      }

      setCachedData('otas_visit_cache', newVisitData);
      return { ...prevData, visitData: newVisitData };
    });

    // Supabase direct database mutation
    try {
      if (actionType === 'add') {
        await supabase.from('log_visit').insert({
          timestamp: payload.timestamp || localTimestamp,
          id_pelanggan: payload.idPelanggan || '',
          nama_pelanggan: payload.namaPelanggan || '',
          stasiun: payload.stasiun || '',
          keluhan: payload.keluhan || '',
          catatan: payload.catatan || '',
          status_visit: payload.status || 'OPEN',
          odp: payload.odpAktual || payload.odp || '',
          port: payload.portOdp || payload.port || '',
          sn_ont: payload.snOnt || '',
          nomor_hp: payload.nomorHp || '',
          latitude: payload.latitude || '',
          longitude: payload.longitude || '',
          penyebab: payload.penyebab || '',
          perbaikan: payload.tindakan || payload.perbaikan || '',
          used_materials: payload.material || payload.usedMaterials || '',
          petugas: payload.petugas || '',
          evidence: payload.evidence || ''
        });
      } else if (actionType === 'resolve') {
        let q = supabase.from('log_visit').update({
          status_visit: 'DONE',
          perbaikan: payload.tindakan || payload.perbaikan || '',
          used_materials: payload.material || payload.usedMaterials || '',
          penyebab: payload.penyebab || '',
          petugas: payload.petugas || '',
          waktu_close: localTimestamp
        });
        if (payload.id) {
          q = q.eq('id', payload.id);
        } else if (payload.idPelanggan) {
          q = q.eq('id_pelanggan', payload.idPelanggan);
          if (payload.timestamp) {
            q = q.eq('timestamp', payload.timestamp);
          }
        }
        await q;
      } else if (actionType === 'delete') {
        let q = supabase.from('log_visit').delete();
        if (payload.id) {
          q = q.eq('id', payload.id);
        } else if (payload.idPelanggan) {
          q = q.eq('id_pelanggan', payload.idPelanggan);
          if (payload.timestamp) {
            q = q.eq('timestamp', payload.timestamp);
          }
        }
        await q;
      }
    } catch (dbErr) {
      console.warn("Supabase visit sync error:", dbErr);
    }
  };

  // ========================================================
  // ========================================================
  // PERBAIKAN: LOGIKA BACKGROUND FETCHING DENGAN SUPABASE
  // ========================================================
  const fetchAllSupabaseData = async (tableName, selectColumns = '*', orderCol = null, maxPages = 50) => {
    let allData = [];
    let start = 0;
    const limit = 1000; // Limit default PostgREST adalah 1000
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

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
      }

      pageCount++;
      // Jika data yang didapat kurang dari 1000, berarti sudah di halaman terakhir
      if (!data || data.length < limit) {
        hasMore = false;
      } else {
        start += limit;
      }
    }

    return allData;
  };

  const fetchData = async (force = false) => {
    const isForce = force === true;
    setFetchError(null);
    setShowForceClose(false);
    setLoadingMessage('Menghubungkan ke Database...');

    try {
      if (isForce) {
        setCachedData('otas_pelanggan_cache_v3', null);
        setCachedData('otas_odp_cache_v3', null);
        setCachedData('otas_station_cache', null);
        setCachedData('otas_detail_po_cache', null);
        setCachedData('otas_visit_cache', null);
      }

      // 1. Cek Data Lokal (Supabase & GAS Cache)
      let parsedPelanggan = getCachedData('otas_pelanggan_cache_v3');
      let parsedOdp = getCachedData('otas_odp_cache_v3');
      let cachedStation = getCachedData('otas_station_cache');
      let cachedDetailPo = getCachedData('otas_detail_po_cache');
      let cachedVisit = getCachedData('otas_visit_cache');

      const hasCache = parsedPelanggan && parsedOdp && cachedVisit;

      // Jika data sudah ada (dari state atau cache), jangan munculkan layar loading penuh
      if (!hasCache && data.pelangganData.length === 0) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
        setIsBackgroundSyncing(true);
      }

      // Hydrate state langsung jika cache lokal tersedia
      if (parsedPelanggan || parsedOdp || cachedStation || cachedVisit) {
        setData(prev => ({
          ...prev,
          pelangganData: parsedPelanggan || prev.pelangganData,
          odpData: parsedOdp || prev.odpData,
          stationData: cachedStation?.length > 0 ? cachedStation : prev.stationData,
          detailPoData: cachedDetailPo?.length > 0 ? cachedDetailPo : prev.detailPoData,
          visitData: cachedVisit?.length > 0 ? cachedVisit : prev.visitData
        }));
      }

      if (!parsedPelanggan || !parsedOdp || !cachedVisit) {
        // Ambil data langsung dari tabel Supabase
        const pelangganColumns = 'id_pelanggan,nama_pelanggan,nomor_hp,alamat,stasiun,odp,port_odp,latitude,longitude,status_ikr,status_aktivasi,tanggal_registrasi,tgl_ikr,tgl_aktivasi,tanggal_kendala,petugas_aktivasi,petugas_ikr,reporter_kendala,issue_kendala,catatan,kabel_precon,sn_ont,foto_rumah_pelanggan,foto_ont_terpasang,tanggal_berakhir,telat_bayar_hari';
        const odpColumns = 'id,label,latitude,longitude,port_terpakai,tahap_pembangunan,kapasitas,kode_odp,kode_odc,stasiun';

        const [supabasePelanggan, supabaseOdp, supabaseVisit] = await Promise.all([
          parsedPelanggan ? Promise.resolve(null) : fetchAllSupabaseData('data_pelanggan', pelangganColumns, 'id_pelanggan'),
          parsedOdp ? Promise.resolve(null) : fetchAllSupabaseData('odp', odpColumns, 'label'),
          cachedVisit ? Promise.resolve(null) : fetchAllSupabaseData('log_visit', '*', 'id')
        ]);

        if (supabasePelanggan) {
          parsedPelanggan = supabasePelanggan.map(parseSupabaseDocument);
          setCachedData('otas_pelanggan_cache_v3', parsedPelanggan);
        }
        if (supabaseOdp) {
          const rawParsed = supabaseOdp.map(parseSupabaseOdpDocument);
          const uniq = new Map();
          rawParsed.forEach(o => {
            const k = cleanOdpStr(o.kodeOdp || o.label);
            if (k && !uniq.has(k)) uniq.set(k, o);
          });
          parsedOdp = Array.from(uniq.values());
          setCachedData('otas_odp_cache_v3', parsedOdp);
        }
        if (supabaseVisit) {
          cachedVisit = supabaseVisit.map(parseSupabaseVisitDocument);
          setCachedData('otas_visit_cache', cachedVisit);
        }

        setData(prev => ({
          ...prev,
          pelangganData: parsedPelanggan || prev.pelangganData,
          odpData: parsedOdp || prev.odpData,
          visitData: cachedVisit || prev.visitData
        }));
      }

      // 2. Ambil data tambahan dashboard/petugas dari GAS secara bersamaan di latar belakang
      api.run('getFastDashboardData')
        .then(fastResult => {
          if (fastResult && !fastResult.error) {
            if (fastResult.stationData?.length > 0) setCachedData('otas_station_cache', fastResult.stationData);
            if (fastResult.detailPoData?.length > 0) setCachedData('otas_detail_po_cache', fastResult.detailPoData);

            setData(prev => ({
              ...prev,
              ...fastResult,
              visitData: cachedVisit || prev.visitData,
              dataKendalaSheet: (fastResult.dataKendalaSheet && fastResult.dataKendalaSheet.length > 0) ? fastResult.dataKendalaSheet : (fastResult.pelangganData || []).filter(p => p.issueKendala && p.issueKendala.trim() !== ""),
              pelangganData: parsedPelanggan || prev.pelangganData,
              odpData: parsedOdp || prev.odpData
            }));
            setLastSyncedTime(new Date());
          }
        })
        .catch(err => {
          console.warn("Gagal load auxiliary data:", err);
        })
        .finally(() => {
          setIsLoading(false);
          setIsBackgroundSyncing(false);
        });

    } catch (err) {
      console.error(err);
      setFetchError(err.message || "Terjadi kesalahan saat menghubungi Supabase.");
      setIsLoading(false);
      setIsBackgroundSyncing(false);
    }
  };

  // --- SINKRONISASI SENYAP DI LATAR BELAKANG (REAL-TIME TANPA LOADING SCREEN) ---
  const fetchDataSilent = async () => {
    try {
      const fastResult = await api.run('getFastDashboardData').catch(() => null);

      setData(prev => ({
        ...prev,
        dataRegistrasi: fastResult?.dataRegistrasi?.length > 0 ? fastResult.dataRegistrasi : prev.dataRegistrasi,
        dataKendalaSheet: (fastResult?.dataKendalaSheet && fastResult.dataKendalaSheet.length > 0) ? fastResult.dataKendalaSheet : (fastResult?.pelangganData ? fastResult.pelangganData.filter(p => p.issueKendala && p.issueKendala.trim() !== "") : prev.dataKendalaSheet),
        petugasData: fastResult?.petugasData?.length > 0 ? fastResult.petugasData : prev.petugasData,
        stationData: fastResult?.stationData?.length > 0 ? fastResult.stationData : prev.stationData,
        detailPoData: fastResult?.detailPoData?.length > 0 ? fastResult.detailPoData : prev.detailPoData,
        fastKpi: fastResult?.fastKpi || prev.fastKpi
      }));
      setLastSyncedTime(new Date());
    } catch (err) {
      console.error("Silent background sync failed:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Supabase Real-Time Listener untuk data_pelanggan
    const pelangganChannel = supabase
      .channel('schema-pelanggan-changes')
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
              const idx = newPelangganData.findIndex(p => String(p.idPelanggan).trim().toUpperCase() === String(updatedItem.idPelanggan).trim().toUpperCase());

              if (idx !== -1) {
                newPelangganData[idx] = { ...newPelangganData[idx], ...updatedItem };
              } else {
                newPelangganData.unshift(updatedItem);
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id_pelanggan;
              const idx = newPelangganData.findIndex(p => String(p.idPelanggan).trim().toUpperCase() === String(deletedId).trim().toUpperCase());
              if (idx !== -1) {
                newPelangganData.splice(idx, 1);
              }
            }

            setCachedData('otas_pelanggan_cache_v3', newPelangganData);
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
      .channel('schema-visit-changes')
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
            setCachedData('otas_visit_cache', cleanVisitData);
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
      .channel('schema-odp-changes')
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
            setCachedData('otas_odp_cache_v3', newOdpData);
            return {
              ...prev,
              odpData: newOdpData
            };
          });
        }
      )
      .subscribe();

    // Setup interval sinkronisasi otomatis setiap 30 detik untuk sisa data non-pelanggan (seperti KPI/stok stasiun)
    const interval = setInterval(() => {
      fetchDataSilent();
    }, 30000);

    return () => {
      supabase.removeChannel(pelangganChannel);
      supabase.removeChannel(visitChannel);
      supabase.removeChannel(odpChannel);
      clearInterval(interval);
    };
  }, []);

  return (
    // PERBAIKAN: Menggunakan "fixed inset-0" agar wadah menancap kaku ke 4 sisi layar HP!
    // Ini akan menghilangkan ruang putih kosong di bagian bawah HP selamanya.
    <div className="fixed inset-0 flex overflow-hidden bg-slate-50 text-slate-800 w-full h-full">

      {/* TOP SLIM PROGRESS BAR SAAT MEMUAT / MENYINKRON DATA */}
      {(isLoading || isBackgroundSyncing) && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 animate-pulse shadow-sm"></div>
      )}

      {/* OVERLAY HITAM UNTUK HP */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[50] lg:hidden animate-fade"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR: Memanjang penuh dari atas ke bawah (inset-y-0) */}
      <aside className={`bg-[#1e3a8a] text-white transition-all duration-300 flex flex-col z-[60] shadow-2xl fixed inset-y-0 left-0 lg:relative ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="p-4 flex items-center justify-between h-16 lg:h-20 border-b border-blue-800/50 shrink-0">
          <div className={`flex items-center ${!isSidebarOpen && 'lg:hidden'}`}>
            <Icon name="activity" className="text-cyan-400 mr-3 shrink-0" size={28} />
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-extrabold text-xl tracking-tight leading-none">STARLITE</span>
              <span className="text-[9px] font-bold text-blue-300 tracking-[0.2em] mt-1">BY DESNARUM</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-blue-800 rounded-lg transition-colors hidden lg:block">
            <Icon name="menu" size={20} />
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-blue-800 rounded-lg transition-colors lg:hidden">
            <Icon name="x" size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-3 overflow-y-auto custom-scrollbar">
          <div className={`text-xs font-bold text-blue-400/50 uppercase tracking-wider mb-2 px-3 ${!isSidebarOpen && 'lg:hidden'}`}>Menu Utama</div>

          {[
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
            { id: 'overview', icon: 'line-chart', label: 'Overview' },
            { id: 'database', icon: 'database', label: 'Data Pelanggan' }, // Icon diganti 'database'
            { id: 'okupansi', icon: 'server', label: 'Data Okupansi' },
            { id: 'gangguan', icon: 'headset', label: 'Data Gangguan' },
            { id: 'gamas', icon: 'activity', label: 'Monitoring Gamas' },
            { id: 'team', icon: 'users', label: 'Data Petugas' }, // ID diganti 'team', Icon 'users'
            { id: 'coverage', icon: 'map', label: 'ODP Coverage' },
            { id: 'aidece', icon: 'globe', label: 'AI.DECE Portal' },

          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setInitialDatabaseStatusFilter('');
                setInitialDatabaseStationFilter('');
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${activeTab === item.id ? 'sidebar-active' : 'hover:bg-blue-800/50 text-blue-100'}`}
              title={item.label}
            >
              <Icon name={item.icon} className="shrink-0" />
              <span className={`ml-3 font-semibold text-sm whitespace-nowrap ${!isSidebarOpen && 'lg:hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Tombol Logout */}
        <div className="px-3 pb-2 pt-2 border-t border-blue-800/50 w-full shrink-0">
          <button onClick={onLogout} className="w-full flex items-center p-3 text-blue-100 hover:bg-blue-800/50 rounded-lg transition-all" title="Keluar">
            <Icon name="log-out" className="shrink-0" />
            <span className={`ml-3 font-semibold text-sm whitespace-nowrap ${!isSidebarOpen && 'lg:hidden'}`}>Keluar</span>
          </button>
        </div>

        {/* Teks Copyright di bawah */}
        <div className="p-4 pb-8 lg:pb-4 text-[10px] text-blue-300/50 border-t border-blue-800/50 text-center whitespace-nowrap shrink-0">
          {isSidebarOpen ? '© 2026 Starlite by Desnarum' : 'v2.0'}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative w-full min-w-0">

        {activeTab !== 'aidece' ? (
          <header className="bg-white h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 border-b border-slate-200/60 shadow-sm relative">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 pr-2">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0">
                <Icon name="menu" size={22} />
              </button>
              <h1 className="text-xs sm:text-base lg:text-lg font-bold text-slate-800 truncate">
                {activeTab === 'dashboard' && 'Overview Aktivasi Harian'}
                {activeTab === 'overview' && 'Analisis Tren & Pipeline'}
                {activeTab === 'database' && 'Database & Manajemen Pelanggan'}
                {activeTab === 'okupansi' && 'Data Okupansi ODC & ODP'}
                {activeTab === 'gangguan' && 'Data Gangguan & Tiket Visit'}
                {activeTab === 'gamas' && 'Monitoring Gangguan Massal'}
                {activeTab === 'team' && 'Manajemen Data Petugas'}
                {activeTab === 'coverage' && 'Cek Coverage ODP'}
                {activeTab === 'aidece' && 'Customer Lookup'}
              </h1>
            </div>

            <div className="flex items-center shrink-0">
              {/* Live Auto-Sync Indicator */}
              <div className="hidden sm:flex items-center gap-2 mr-3 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-inner text-xs font-bold text-slate-600 transition-all select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-500">Auto-Sync</span>
                <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200/50 px-1.5 py-0.5 rounded-lg shadow-sm" title="Terakhir diperbarui otomatis">
                  {lastSyncedTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* PERBAIKAN 2: SATU TOMBOL PINTAR SAJA (Berganti warna saat sinkron di latar belakang) */}
              <button
                onClick={() => fetchData(true)}
                disabled={isLoading || isBackgroundSyncing}
                className={`flex items-center text-[10px] sm:text-[13px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold transition-all shadow-sm whitespace-nowrap border ${isBackgroundSyncing
                  ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-wait'
                  : 'bg-blue-50 text-blue-600 border-transparent hover:bg-blue-100'
                  }`}
              >
                <span className={`flex items-center justify-center sm:mr-2 ${(isLoading || isBackgroundSyncing) ? 'animate-spin' : ''}`}>
                  <Icon name="refresh-cw" size={13} className="sm:hidden" />
                  <span className="hidden sm:inline-flex"><Icon name="refresh-cw" size={14} /></span>
                </span>
                <span className="hidden sm:inline">
                  {isBackgroundSyncing ? 'Background Sync...' : 'Sinkronkan Data'}
                </span>
                <span className="sm:hidden">
                  {isBackgroundSyncing ? 'Syncing...' : 'Sinkron'}
                </span>
              </button>
            </div>
          </header>
        ) : (
          <div className="lg:hidden absolute top-4 left-4 z-[60]">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[#1e3a8a] text-white shadow-xl rounded-xl border border-blue-700/50 flex items-center justify-center">
              <Icon name="menu" size={24} />
            </button>
          </div>
        )}

        {/* WADAH UTAMA KONTEN */}
        <div className={`flex-1 overflow-auto w-full ${activeTab === 'aidece' ? 'p-0' : 'p-2.5 sm:p-4 md:p-6 pb-6 sm:pb-8'}`}>
          {fetchError && !isLoading && (
            <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start shadow-sm animate-in slide-in-from-top-4">
              <Icon name="alert-circle" className="mr-3 shrink-0 mt-0.5 text-rose-500" size={20} />
              <div>
                <h3 className="font-bold text-sm">Proses Sinkronisasi Terganggu</h3>
                <p className="text-xs mt-1 leading-relaxed">{fetchError}</p>
              </div>
            </div>
          )}

          <div className="h-full w-full">
            {activeTab === 'dashboard' && <DashboardView data={data} isSyncing={isLoading} />}
            {activeTab === 'overview' && <OverviewView data={data} onGoToDatabase={(statusFilter, stationFilter = '') => { setInitialDatabaseStatusFilter(statusFilter); setInitialDatabaseStationFilter(stationFilter); setActiveTab('database'); }} />}
            {activeTab === 'database' && <DatabaseView pelangganData={data.pelangganData} visitData={data.visitData} petugasList={data.teknisiData} odpData={data.odpData} isLoading={isLoading || (isBackgroundSyncing && (!data.pelangganData || data.pelangganData.length === 0))} onRefresh={() => fetchData(true)} onGoToCoverage={handleGoToCoverage} onGoToHistory={handleGoToHistory} onLocalPelangganUpdate={handleLocalPelangganUpdate} onLocalVisitUpdate={handleLocalVisitAction} onLocalPelangganDelete={handleLocalPelangganDelete} initialStatusFilter={initialDatabaseStatusFilter} initialStationFilter={initialDatabaseStationFilter} />}
            {activeTab === 'okupansi' && <OkupansiView data={data} setData={setData} />}
            {activeTab === 'gangguan' && <DataGangguanView visitData={data.visitData} pelangganData={data.pelangganData} petugasList={data.teknisiData} onRefresh={() => fetchData(true)} onLocalVisitUpdate={handleLocalVisitAction} />}
            {activeTab === 'gamas' && <MonitoringGamasView />}
            {activeTab === 'team' && <OfficerManagementView teknisiList={data.teknisiData} onRefresh={() => fetchData(true)} onRefreshSilent={fetchDataSilent} />}
            {activeTab === 'coverage' && <CoverageGISView data={data} targetCoords={coverageTarget} />}
            {activeTab === 'aidece' && <AiDeceView />}

          </div>
        </div>
      </main>
    </div>
  );
}

// --- CUSTOM YAXIS TICK & TOOLTIP UNTUK GRAFIK PETUGAS ---
const CustomYAxisTick = ({ x, y, payload }) => {
  if (!payload || !payload.value) return null;
  const [name, station] = payload.value.split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={-4} textAnchor="end" fill="#334155" fontSize={11} fontWeight="600">{name}</text>
      <text x={-10} y={10} textAnchor="end" fill="#94a3b8" fontSize={9}>{toProperCase(station)}</text>
    </g>
  );
};

const CustomTooltipPetugas = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0 && label) {
    const [name, station] = label.split('|');
    return (
      <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100">
        <p className="font-bold text-slate-800 text-sm">{name}</p>
        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">{toProperCase(station)}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs font-bold" style={{ color: entry.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip Khusus Grafik Garis Overview
const CustomTrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;

    let displayLabel = label;
    // Format cantik untuk sumbu harian jika formatnya adalah YYYY-MM-DD
    const parts = String(label).split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      displayLabel = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 min-w-[200px]">
        <p className="font-bold text-slate-800 text-sm mb-1 border-b border-slate-50 pb-2">{displayLabel}</p>
        {data.dateRange && <p className="text-[11px] text-slate-500 mb-2 mt-1 font-medium">{data.dateRange}</p>}
        <div className="space-y-1.5 mt-2">
          {payload.find(p => p.dataKey === 'aktivasi') && (
            <p className="text-xs font-bold text-blue-600 flex justify-between gap-6"><span>Total Aktivasi Selesai</span> <span>{data.aktivasi === null ? '-' : data.aktivasi}</span></p>
          )}
          {payload.find(p => p.dataKey === 'average') && (
            <p className="text-xs font-bold text-slate-500 flex justify-between gap-6"><span>Average</span> <span>{Number(data.average).toFixed(1)}</span></p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ==========================================
// KOMPONEN HELPER: PETA MINI ODP (RAW LEAFLET)
// ==========================================
function MiniOdpMap({ targetOdp, allOdps = [], customers = [] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  React.useLayoutEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (!mapInstance.current) {
      const tLat = parseFloat(String(targetOdp.latitude || '').replace(',', '.'));
      const tLng = parseFloat(String(targetOdp.longitude || '').replace(',', '.'));
      const center = (!isNaN(tLat) && !isNaN(tLng)) ? [tLat, tLng] : [-6.957, 110.252];

      mapInstance.current = window.L.map(mapRef.current).setView(center, 18);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>', maxZoom: 20
      }).addTo(mapInstance.current);

      const markerLayer = window.L.layerGroup().addTo(mapInstance.current);

      // --- 1. RENDER KABEL DROP WIRE DENGAN ANIMASI ---
      if (!isNaN(tLat) && !isNaN(tLng)) {
        customers.forEach(cust => {
          const cLat = parseFloat(String(cust.rawItem.latitude || '').replace(',', '.'));
          const cLng = parseFloat(String(cust.rawItem.longitude || '').replace(',', '.'));

          if (!isNaN(cLat) && !isNaN(cLng)) {
            const dropWire = window.L.polyline([[tLat, tLng], [cLat, cLng]], {
              color: cust.mapColorHex,
              weight: 2.5,
              opacity: 0.8,
              lineCap: 'round',
              className: 'animated-dropwire' // Kelas untuk animasi
            });
            markerLayer.addLayer(dropWire);
          }
        });
      }

      // --- 2. RENDER TITIK RUMAH PELANGGAN ---
      customers.forEach(cust => {
        const lat = parseFloat(String(cust.rawItem.latitude || '').replace(',', '.'));
        const lng = parseFloat(String(cust.rawItem.longitude || '').replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lng)) {
          const markerHtml = `
            <div style="background-color: ${cust.mapColorHex}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; position: relative;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
          `;

          const customIcon = window.L.divIcon({ html: markerHtml, className: '', iconSize: [22, 22], iconAnchor: [11, 11] });

          const marker = window.L.marker([lat, lng], { icon: customIcon, zIndexOffset: 500 })
            .bindPopup(`
              <div style="font-family: 'Inter', sans-serif; text-align: center; min-width: 130px;">
                <strong style="font-size:12px; color:#1e293b;">${cust.nama}</strong><br/>
                <span style="font-size:10px; color:#64748b; font-family: monospace;">ID: ${cust.idPelanggan}</span><br/>
                <div style="font-size:10px; color:#64748b; margin-top:2px;">Port ODP: <b>${cust.rawPort}</b></div>
                <div style="margin-top: 6px; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: ${cust.mapColorHex}; display: inline-block;">${cust.statusLabel}</div>
              </div>
            `);

          markerLayer.addLayer(marker);
        }
      });

      // --- 3. RENDER TITIK ODP ---
      allOdps.forEach(titik => {
        const lat = parseFloat(String(titik.latitude || '').replace(',', '.'));
        const lng = parseFloat(String(titik.longitude || '').replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lng)) {
          const targetName = String(targetOdp.label || targetOdp.kodeOdp || '').trim().toLowerCase();
          const titikName = String(titik.kodeOdp || titik.label || '').trim().toLowerCase();
          const isTarget = (targetName === titikName) && targetName !== '';

          const cap = Number(titik.kapasitas) || 0;
          const used = Number(titik.portTerpakai || titik.terpakai) || 0;
          const isFull = cap > 0 && used >= cap;

          let markerHtml = '';
          let iconSizeArr = [14, 14];
          let iconAnchorArr = [7, 7];

          if (isTarget) {
            markerHtml = `
              <div style="position: relative;">
                <div class="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-50" style="top: -12px; left: -12px;"></div>
                <div class="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-indigo-700 border-[3px] border-white shadow-lg text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                </div>
              </div>
            `;
            iconSizeArr = [24, 24];
            iconAnchorArr = [12, 12];
          } else {
            const bgColor = isFull ? 'bg-rose-500' : 'bg-emerald-500';
            markerHtml = `<div class="${bgColor} w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"></div>`;
          }

          const zIndex = isTarget ? 1000 : 1;
          const customIcon = window.L.divIcon({ html: markerHtml, className: '', iconSize: iconSizeArr, iconAnchor: iconAnchorArr });

          const marker = window.L.marker([lat, lng], { icon: customIcon, zIndexOffset: zIndex })
            .bindPopup(`
              <div style="font-family: 'Inter', sans-serif; text-align: center; min-width: 120px;">
                <strong style="font-size:12px; color:${isTarget ? '#4338ca' : '#1e293b'};">${titik.label || titik.kodeOdp}</strong><br/>
                <div style="font-size:10px; color:#64748b; margin-top:4px; padding-top:4px; border-top:1px solid #e2e8f0;">
                  Kap: <b>${cap}</b> | Pakai: <b>${used}</b>
                </div>
                ${isTarget ? `<div style="margin-top: 4px; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; color: white; background-color: #4338ca; display: inline-block;">TITIK ODP</div>` : ''}
              </div>
            `, { autoPan: false }); // Disable autoPan to avoid animation glitches on unmount

          markerLayer.addLayer(marker);
          if (isTarget) marker.openPopup();
        }
      });

      const timer = setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 250);
    }

    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.off();
          mapInstance.current.remove();
        } catch (err) {
          console.warn("Leaflet map cleanup error", err);
        }
        mapInstance.current = null;
      }
      if (mapRef.current) {
        mapRef.current._leaflet_id = null;
      }
    };
  }, [targetOdp, allOdps, customers]);

  return (
    <>
      <style>{`
        path.animated-dropwire {
          stroke-dasharray: 10, 10 !important;
          animation: dropwire-flow 1.5s linear infinite forwards !important;
        }
        @keyframes dropwire-flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full z-0"></div>
    </>
  );
}


// Helper pembersih karakter tersembunyi / unicode pada nama ODP
export const cleanOdpStr = (str) => String(str || '').replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim().toUpperCase();

// ==========================================
// MODALS & POP-UPS
// ==========================================
function OdpDetailModal({ odp, pelangganData, allOdps = [], onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const [showOdpMap, setShowOdpMap] = useState(false);

  const realCustomers = useMemo(() => {
    if (!pelangganData || !odp) return [];
    const targetOdpClean = cleanOdpStr(odp.originalLabel || odp.label || odp.kodeOdp || odp.kode_odp);
    const targetStasiun = String(odp.stasiun || '').trim().toLowerCase();

    const customersInOdp = pelangganData.filter(item => {
      const custOdp = cleanOdpStr(item.odpAktual || item.odp || item.kodeOdp);
      const custStasiun = String(item.stasiun || '').trim().toLowerCase();

      const isStasiunMatch = !targetStasiun || !custStasiun || custStasiun === targetStasiun ||
        (targetStasiun === 'semarang tawang' && custStasiun === 'tawang') ||
        (targetStasiun === 'tawang' && custStasiun === 'semarang tawang');

      const isOdpMatch = targetOdpClean !== '' && custOdp === targetOdpClean;

      return isStasiunMatch && isOdpMatch;
    });

    let mapped = customersInOdp.map(item => {
      // 1. LEBURKAN SEMUA TEKS UNTUK PENCARIAN
      const allTextInRow = Object.values(item).map(v => String(v).toUpperCase()).join(' | ');

      // 2. TENTUKAN NAMA STATUSNYA TERLEBIH DAHULU
      let finalLabel = 'UNKNOWN';

      if (allTextInRow.includes('READY TO DISMANTLE') || allTextInRow.includes('READY')) {
        finalLabel = 'READY TO DISMANTLE';
      } else if (allTextInRow.includes('DISMANTLE')) {
        finalLabel = 'DISMANTLE';
      } else if (allTextInRow.includes('AKTIF') || allTextInRow.includes('DONE')) {
        finalLabel = 'AKTIF';
      } else if (allTextInRow.includes('WAITING')) {
        finalLabel = 'WAITING';
      } else if (allTextInRow.includes('KENDALA')) {
        finalLabel = 'KENDALA';
      } else {
        // Fallback jika kosong/berbeda: Minta bantuan fungsi bawaan
        if (typeof getGlobalStatusStr === 'function') {
          finalLabel = String(getGlobalStatusStr(item)).toUpperCase();
        }
      }

      // 3. BARU KITA BERIKAN WARNA BERDASARKAN HASIL AKHIR STATUS (ANTI BOCOR)
      let statusColor = 'bg-slate-100 text-slate-500 border-slate-200';
      let mapColorHex = '#94a3b8'; // Abu-abu default

      if (finalLabel.includes('READY TO DISMANTLE') || finalLabel.includes('READY')) {
        finalLabel = 'READY TO DISMANTLE';
        statusColor = 'bg-orange-100 text-orange-700 border-orange-200';
        mapColorHex = '#f97316'; // Oren
      } else if (finalLabel.includes('DISMANTLE')) {
        finalLabel = 'DISMANTLE';
        statusColor = 'bg-slate-100 text-slate-500 border-slate-200';
        mapColorHex = '#94a3b8'; // Abu-abu
      } else if (finalLabel.includes('AKTIF') || finalLabel === 'DONE') {
        finalLabel = 'AKTIF';
        statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        mapColorHex = '#3b82f6'; // Biru (Untuk Peta & Kabel)
      } else if (finalLabel.includes('WAITING')) {
        finalLabel = 'WAITING';
        statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
        mapColorHex = '#eab308'; // Kuning
      } else if (finalLabel.includes('KENDALA')) {
        finalLabel = 'KENDALA';
        statusColor = 'bg-rose-100 text-rose-700 border-rose-200';
        mapColorHex = '#ef4444'; // Merah
      } else {
        // Jika ada status aneh lainnya
        statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
        mapColorHex = '#94a3b8';
      }

      let portNum = parseInt(item.portOdp || item.PortOdp || 0, 10);
      if (isNaN(portNum)) portNum = 999;

      return {
        rawPort: item.portOdp || item.PortOdp || '-',
        portNum: portNum,
        idPelanggan: item.idPelanggan || item.IdPelanggan || '-',
        nama: item.namaPelanggan || item.NamaPelanggan || 'Tanpa Nama',
        sn: item.snOnt || item.SnOnt || '-',
        statusLabel: finalLabel,
        statusColor: statusColor,
        mapColorHex: mapColorHex,
        rawItem: item
      };
    });

    mapped.sort((a, b) => a.portNum - b.portNum);
    return mapped;
  }, [pelangganData, odp]);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 animate-fade" onClick={onClose}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-modal flex flex-col max-h-[90vh] overflow-hidden">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <Icon name="users" size={20} className="mr-2 text-emerald-600" />
              List Pelanggan ODP
            </h2>

            <div className="mt-2">
              <button
                onClick={() => setShowOdpMap(!showOdpMap)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition-all border ${showOdpMap ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-inner' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-sm'}`}
                title="Klik untuk melihat sebaran titik di Peta"
              >
                <span className="text-xs font-mono font-bold tracking-tight">{odp.kodeOdp || odp.label}</span>
                <Icon name={showOdpMap ? "list" : "map-pin"} size={12} className={showOdpMap ? "text-blue-500" : "text-rose-500"} />
                <span className="font-sans text-[9px] font-bold uppercase tracking-wider ml-0.5 opacity-80">
                  {showOdpMap ? 'Tutup Peta' : 'Lihat Peta'}
                </span>
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-0 flex-1 flex flex-col min-h-0 bg-slate-50/30">

          {showOdpMap && (
            <div className="w-full h-64 sm:h-80 bg-slate-100 border-b border-slate-200 relative shrink-0 animate-fade z-0">
              {odp.latitude && odp.longitude ? (
                <MiniOdpMap targetOdp={odp} allOdps={allOdps} customers={realCustomers} />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                  <Icon name="map" size={40} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">Titik koordinat ODP belum diatur di database</p>
                </div>
              )}
            </div>
          )}

          <div className="overflow-auto custom-scrollbar flex-1 bg-white relative z-10 w-full">
            {realCustomers.length > 0 ? (
              <table className="w-full text-[10px] sm:text-sm text-left">
                <thead className="bg-slate-50/90 text-slate-500 font-bold sticky top-0 border-b border-slate-200 text-[9px] sm:text-xs uppercase tracking-wider z-20 backdrop-blur-sm">
                  <tr>
                    <th className="px-2 py-2 sm:px-6 sm:py-4 text-center w-10 sm:w-20">PORT</th>
                    <th className="px-2 py-2 sm:px-6 sm:py-4">ID PELANGGAN</th>
                    <th className="px-2 py-2 sm:px-6 sm:py-4">NAMA PELANGGAN</th>
                    <th className="px-2 py-2 sm:px-6 sm:py-4">SN ONT</th>
                    <th className="px-2 py-2 sm:px-6 sm:py-4">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {realCustomers.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-2 py-2 sm:px-6 sm:py-4 text-center font-black text-slate-700 bg-slate-50/30 group-hover:bg-white">{cust.rawPort}</td>
                      <td className="px-2 py-2 sm:px-6 sm:py-4 font-mono text-[9px] sm:text-[13px] text-slate-600 font-medium break-all sm:break-normal">{cust.idPelanggan}</td>
                      <td className="px-2 py-2 sm:px-6 sm:py-4 font-bold text-slate-800 break-words">{cust.nama}</td>
                      <td className="px-2 py-2 sm:px-6 sm:py-4 font-mono text-[9px] sm:text-[13px] text-slate-500 break-all sm:break-normal">{cust.sn}</td>
                      <td className="px-2 py-2 sm:px-6 sm:py-4">
                        <span className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border ${cust.statusColor}`}>
                          {cust.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 bg-white h-full min-h-[300px]">
                <Icon name="inbox" size={48} className="mb-3 opacity-20" />
                <p className="font-medium text-slate-600">Tidak ada data pelanggan</p>
                <p className="text-xs mt-1">Belum ada pelanggan yang direport pada ODP ini di database.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white shrink-0 relative z-20">
          <div className="text-xs text-slate-500 font-medium">
            <span className="text-emerald-600 font-bold text-sm">{realCustomers.length}</span> dari <span className="font-bold">{odp.kapasitas}</span> Port Terpakai
          </div>
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95">Tutup</button>
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ==========================================
// HALAMAN BARU: DATA OKUPANSI
// ==========================================
export function OkupansiView({ data, setData }) {
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedOdc, setSelectedOdc] = useState(null);
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const [searchOdc, setSearchOdc] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [parsedExcelData, setParsedExcelData] = useState([]);
  const [inputTahap, setInputTahap] = useState('');
  const [isNewTahap, setIsNewTahap] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const [syncToast, setSyncToast] = useState({ show: false, type: '', message: '' });
  const [conflictModalData, setConflictModalData] = useState(null);

  // State baru untuk kontrol modal Detail Pelanggan ODP
  const [selectedOdpDetail, setSelectedOdpDetail] = useState(null);

  // State untuk modal Kelola ODP
  const [showManageOdpModal, setShowManageOdpModal] = useState(false);
  const [manageStationFilter, setManageStationFilter] = useState('');
  const [manageTahapFilter, setManageTahapFilter] = useState('');
  const [manageSearch, setManageSearch] = useState('');
  const [managePage, setManagePage] = useState(1);
  const [manageSortKey, setManageSortKey] = useState('kodeOdp'); // 'kodeOdp' | 'kodeOdc' | 'port'
  const [manageSortOrder, setManageSortOrder] = useState('asc'); // 'asc' | 'desc'

  const handleManageSort = (key) => {
    if (manageSortKey === key) {
      setManageSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setManageSortKey(key);
      setManageSortOrder(key === 'port' ? 'desc' : 'asc');
    }
    setManagePage(1);
  };
  const [editingOdp, setEditingOdp] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingOdp, setDeletingOdp] = useState(null);
  const [isDeletingOdp, setIsDeletingOdp] = useState(false);
  const [isSyncingPorts, setIsSyncingPorts] = useState(false);

  // Peta dinamis jumlah pelanggan per ODP (dibersihkan dari karakter tersembunyi)
  const customerCountByOdp = useMemo(() => {
    const map = {};
    (data?.pelangganData || []).forEach(p => {
      const k = cleanOdpStr(p.odpAktual || p.odp || p.kodeOdp);
      if (k) {
        map[k] = (map[k] || 0) + 1;
      }
    });
    return map;
  }, [data?.pelangganData]);

  // Handler sinkronisasi port terpakai massal ke database Supabase
  const handleSyncPortsFromPelanggan = async () => {
    setIsSyncingPorts(true);
    try {
      const allOdps = data?.odpData || [];
      const toUpdate = [];

      allOdps.forEach(o => {
        const k = cleanOdpStr(o.kodeOdp || o.label || o.kode_odp);
        const actualCount = customerCountByOdp[k] || 0;
        const currentCount = Number(o.portTerpakai ?? o.port_terpakai) || 0;
        if (actualCount !== currentCount && o.id) {
          toUpdate.push({ id: o.id, port_terpakai: actualCount });
        }
      });

      // Update ke database Supabase dalam chunk
      if (toUpdate.length > 0) {
        const chunkSize = 15;
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
          const chunk = toUpdate.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(item =>
              supabase
                .from('odp')
                .update({ port_terpakai: item.port_terpakai })
                .eq('id', item.id)
            )
          );
        }
      }

      // Update state lokal secara instan
      if (typeof setData === 'function') {
        setData(prev => {
          const updated = (prev.odpData || []).map(o => {
            const k = cleanOdpStr(o.kodeOdp || o.label || o.kode_odp);
            const actualCount = customerCountByOdp[k] || 0;
            return {
              ...o,
              portTerpakai: actualCount,
              port_terpakai: actualCount
            };
          });
          setCachedData('otas_odp_cache_v3', updated);
          return { ...prev, odpData: updated };
        });
      }

      setSyncToast({
        show: true,
        type: 'success',
        message: `Sinkronisasi selesai! ${toUpdate.length} ODP berhasil diperbarui dengan data pelanggan riil.`
      });
      setTimeout(() => setSyncToast(prev => prev.type === 'success' ? { ...prev, show: false } : prev), 4000);
    } catch (err) {
      console.error('Error syncing ports:', err);
      setSyncToast({
        show: true,
        type: 'error',
        message: 'Gagal menyinkronkan port: ' + err.message
      });
      setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 5000);
    } finally {
      setIsSyncingPorts(false);
    }
  };

  // State untuk lipat/buka (collapse/expand) grup Tahap Pembangunan
  const [collapsedTahap, setCollapsedTahap] = useState({});

  const toggleTahap = (tahapName) => {
    setCollapsedTahap(prev => ({
      ...prev,
      [tahapName]: !prev[tahapName]
    }));
  };

  const handleUploadPayload = async (payloadToSend) => {
    if (!payloadToSend || payloadToSend.length === 0) return;
    setIsUploading(true);
    try {
      const res = await api.run('uploadMassalOdp', payloadToSend);
      if (!res || res.success === false || res.error) {
        throw new Error(res?.error || res?.message || 'Gagal mengupload data.');
      }
      setIsUploadSuccess(true);
      setSyncToast({
        show: true,
        type: 'success',
        message: res.message || `Berhasil mengunggah ${payloadToSend.length} data ODP!`
      });
      setTimeout(() => {
        setIsUploadSuccess(false);
        setParsedExcelData([]);
        setInputTahap('');
        setIsNewTahap(false);
        setShowBulkModal(false);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Upload ODP error:", error);
      setSyncToast({ show: true, type: 'error', message: 'Gagal mengupload data: ' + error.message });
      setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  // Daftar seluruh tahap pembangunan unik
  // Daftar seluruh tahap pembangunan unik (hanya menampilkan tahap milik stasiun yang dipilih)
  const allTahapList = useMemo(() => {
    let list = data?.odpData || [];
    if (manageStationFilter) {
      const target = manageStationFilter.trim().toLowerCase();
      list = list.filter(o => {
        const st = String(o.stasiun || '').trim().toLowerCase();
        return st === target || 
          (target === 'semarang tawang' && st === 'tawang') || 
          (target === 'tawang' && st === 'semarang tawang');
      });
    }
    const tahap = list.map(o => o.tahapPembangunan || o.tahap_pembangunan || o.Tahap || '').filter(Boolean);
    return [...new Set(tahap)].sort();
  }, [data?.odpData, manageStationFilter]);

  // Otomatis reset manageTahapFilter jika stasiun berganti dan tahap aktif tidak ada di stasiun baru
  useEffect(() => {
    if (manageTahapFilter && manageStationFilter) {
      const existsInStation = (data?.odpData || []).some(o =>
        String(o.stasiun || '').trim().toLowerCase() === manageStationFilter.trim().toLowerCase() &&
        String(o.tahapPembangunan || o.tahap_pembangunan || o.Tahap || '').trim().toLowerCase() === manageTahapFilter.trim().toLowerCase()
      );
      if (!existsInStation) {
        setManageTahapFilter('');
      }
    }
  }, [manageStationFilter, manageTahapFilter, data?.odpData]);

  // Data ODP terfilter untuk modal Kelola ODP
  const filteredManageOdps = useMemo(() => {
    let list = data?.odpData || [];
    if (manageStationFilter) {
      const target = manageStationFilter.trim().toLowerCase();
      list = list.filter(o => {
        const st = String(o.stasiun || '').trim().toLowerCase();
        return st === target || 
          (target === 'semarang tawang' && st === 'tawang') || 
          (target === 'tawang' && st === 'semarang tawang');
      });
    }
    if (manageTahapFilter) {
      list = list.filter(o => String(o.tahapPembangunan || o.tahap_pembangunan || o.Tahap || '').trim().toLowerCase() === manageTahapFilter.trim().toLowerCase());
    }
    if (manageSearch.trim()) {
      const q = manageSearch.trim().toLowerCase();
      list = list.filter(o =>
        String(o.kodeOdp || o.kode_odp || '').toLowerCase().includes(q) ||
        String(o.label || '').toLowerCase().includes(q) ||
        String(o.kodeOdc || o.kode_odc || '').toLowerCase().includes(q) ||
        String(o.stasiun || '').toLowerCase().includes(q) ||
        String(o.tahapPembangunan || o.tahap_pembangunan || o.Tahap || '').toLowerCase().includes(q)
      );
    }
    if (manageSortKey) {
      list = [...list].sort((a, b) => {
        let comp = 0;
        if (manageSortKey === 'kodeOdp') {
          const valA = String(a.kodeOdp || a.label || a.kode_odp || '');
          const valB = String(b.kodeOdp || b.label || b.kode_odp || '');
          comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        } else if (manageSortKey === 'kodeOdc') {
          const valA = String(a.kodeOdc || a.kode_odc || '');
          const valB = String(b.kodeOdc || b.kode_odc || '');
          comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        } else if (manageSortKey === 'port') {
          const aTerpakai = Number(a.portTerpakai ?? a.port_terpakai) || 0;
          const bTerpakai = Number(b.portTerpakai ?? b.port_terpakai) || 0;
          const aKap = Number(a.kapasitas) || 8;
          const bKap = Number(b.kapasitas) || 8;
          const aPct = aKap > 0 ? (aTerpakai / aKap) : 0;
          const bPct = bKap > 0 ? (bTerpakai / bKap) : 0;
          comp = (aPct - bPct) || (aTerpakai - bTerpakai);
        }
        return manageSortOrder === 'desc' ? -comp : comp;
      });
    }
    return list;
  }, [data?.odpData, manageStationFilter, manageTahapFilter, manageSearch, manageSortKey, manageSortOrder]);

  const MANAGE_ITEMS_PER_PAGE = 12;
  const totalManagePages = Math.max(1, Math.ceil(filteredManageOdps.length / MANAGE_ITEMS_PER_PAGE));
  const paginatedManageOdps = useMemo(() => {
    const start = (managePage - 1) * MANAGE_ITEMS_PER_PAGE;
    return filteredManageOdps.slice(start, start + MANAGE_ITEMS_PER_PAGE);
  }, [filteredManageOdps, managePage]);

  const handleOpenManageModal = () => {
    setManageStationFilter(selectedStation || '');
    setManageTahapFilter('');
    setManageSearch('');
    setManageSortKey('kodeOdp');
    setManageSortOrder('asc');
    setManagePage(1);
    setShowManageOdpModal(true);
  };

  const handleOpenEdit = (odp) => {
    setEditingOdp({
      id: odp.id,
      label: odp.label || odp.kodeOdp || '',
      kode_odp: odp.kodeOdp || odp.kode_odp || odp.label || '',
      kode_odc: odp.kodeOdc || odp.kode_odc || '',
      tahap_pembangunan: odp.tahapPembangunan || odp.tahap_pembangunan || '',
      kapasitas: Number(odp.kapasitas) || 8,
      port_terpakai: Number(odp.portTerpakai ?? odp.port_terpakai) || 0,
      latitude: odp.latitude || '',
      longitude: odp.longitude || '',
      stasiun: odp.stasiun || selectedStation || ''
    });
  };

  const handleSaveEditOdp = async (e) => {
    e?.preventDefault();
    if (!editingOdp || !editingOdp.id) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        label: editingOdp.label.trim(),
        kode_odp: editingOdp.kode_odp.trim(),
        kode_odc: editingOdp.kode_odc.trim(),
        tahap_pembangunan: editingOdp.tahap_pembangunan.trim(),
        kapasitas: Number(editingOdp.kapasitas) || 8,
        latitude: String(editingOdp.latitude || '').trim(),
        longitude: String(editingOdp.longitude || '').trim(),
        stasiun: toProperCase(editingOdp.stasiun.trim())
      };

      const { error } = await supabase
        .from('odp')
        .update(payload)
        .eq('id', editingOdp.id);

      if (error) throw error;

      if (typeof setData === 'function') {
        setData(prev => {
          const updated = (prev.odpData || []).map(o => o.id === editingOdp.id ? {
            ...o,
            ...payload,
            kodeOdp: payload.kode_odp,
            kodeOdc: payload.kode_odc,
            tahapPembangunan: payload.tahap_pembangunan
          } : o);
          setCachedData('otas_odp_cache_v3', updated);
          return { ...prev, odpData: updated };
        });
      }

      setSyncToast({ show: true, type: 'success', message: `ODP ${payload.kode_odp} berhasil diperbarui!` });
      setTimeout(() => setSyncToast(prev => prev.type === 'success' ? { ...prev, show: false } : prev), 3500);
      setEditingOdp(null);
    } catch (err) {
      console.error("Gagal update ODP:", err);
      setSyncToast({ show: true, type: 'error', message: 'Gagal update ODP: ' + err.message });
      setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 4000);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteOdp = async () => {
    if (!deletingOdp || !deletingOdp.id) return;
    setIsDeletingOdp(true);
    try {
      const { error } = await supabase
        .from('odp')
        .delete()
        .eq('id', deletingOdp.id);

      if (error) throw error;

      if (typeof setData === 'function') {
        setData(prev => {
          const filtered = (prev.odpData || []).filter(o => o.id !== deletingOdp.id);
          setCachedData('otas_odp_cache_v3', filtered);
          return { ...prev, odpData: filtered };
        });
      }

      setSyncToast({ show: true, type: 'success', message: `ODP ${deletingOdp.kodeOdp || deletingOdp.label} berhasil dihapus!` });
      setTimeout(() => setSyncToast(prev => prev.type === 'success' ? { ...prev, show: false } : prev), 3500);
      setDeletingOdp(null);
    } catch (err) {
      console.error("Gagal hapus ODP:", err);
      setSyncToast({ show: true, type: 'error', message: 'Gagal menghapus ODP: ' + err.message });
      setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 4000);
    } finally {
      setIsDeletingOdp(false);
    }
  };

  // 1. Dapatkan daftar Stasiun Unik
  const uniqueStations = useMemo(() => {
    let rawStations = [];
    if (data && data.stationData && data.stationData.length > 0) {
      rawStations = data.stationData.map(s => s.stasiun).filter(Boolean);
    } else if (data && data.pelangganData && data.pelangganData.length > 0) {
      rawStations = data.pelangganData.map(p => p.stasiun).filter(Boolean);
    }

    if (rawStations.length === 0) {
      rawStations = ['Alastua', 'Kaliwungu', 'Kradenan', 'Krengseng', 'Wadu']; // Fallback stasiun bawaan
    }

    const properStations = rawStations.map(st => toProperCase(st));
    const finalUnique = [...new Set(properStations)].sort();
    return finalUnique;
  }, [data]);

  // Set default station to the first one available
  useEffect(() => {
    if (uniqueStations.length > 0 && !selectedStation) {
      setSelectedStation(uniqueStations[0]);
    }
  }, [uniqueStations]);

  // 2. OLAH DATA ODP DARI DATABASE MENGGUNAKAN GROUPING ODC
  const okupansiData = useMemo(() => {
    if (!selectedStation) return { odcs: [], kpi: {} };

    // Ambil data asli murni dari Apps Script (Database)
    let stationOdps = (data.odpData || []).filter(odp => {
      const odpSt = String(odp.stasiun || '').toLowerCase().trim();
      const selSt = String(selectedStation).toLowerCase().trim();
      return odpSt === selSt ||
        (selSt === 'semarang tawang' && odpSt === 'tawang') ||
        (selSt === 'tawang' && odpSt === 'semarang tawang');
    });

    const odcMap = {};
    let totalOdcKapasitas = 0;
    let totalOdcTerpakai = 0;

    // Deduplikasi ODP stasiun agar tidak pernah ada ODP ganda yang menambah kapasitas ODC
    const seenOdpCodes = new Set();
    const uniqueStationOdps = [];
    stationOdps.forEach(odp => {
      const k = cleanOdpStr(odp.kodeOdp || odp.label || odp['Kode ODP'] || odp.kode_odp);
      if (k && !seenOdpCodes.has(k)) {
        seenOdpCodes.add(k);
        uniqueStationOdps.push(odp);
      }
    });

    // 2. Mapping & Grouping berdasarkan Kode ODC
    uniqueStationOdps.forEach(odp => {
      const odcCode = odp.kodeOdc || odp['Kode ODC'] || odp.KodeOdc || 'TANPA-ODC';
      const odpLabel = odp.kodeOdp || odp['Kode ODP'] || odp.label || odp.Label || 'ODP-UNKNOWN';
      const kapasitas = Number(odp.kapasitas || odp.Kapasitas) || 0;
      const odpCleanKey = cleanOdpStr(odpLabel || odp.kodeOdp || odp.label);
      const countFromCust = customerCountByOdp[odpCleanKey];
      const terpakai = countFromCust !== undefined ? countFromCust : (Number(odp.portTerpakai || odp['Port Terpakai'] || odp.port_terpakai) || 0);

      // Short Label ODC
      let shortOdcLabel = odcCode;
      const odcMatch = odcCode.match(/\d+$/);
      if (odcMatch) {
        shortOdcLabel = "ODC " + odcMatch[0];
      }

      if (!odcMap[odcCode]) {
        odcMap[odcCode] = {
          label: odcCode,
          shortLabel: shortOdcLabel,
          kapasitas: 0,
          terpakai: 0,
          tersisa: 0,
          percent: 0,
          odps: []
        };
      }

      const tersisa = Math.max(0, kapasitas - terpakai);
      const percent = kapasitas > 0 ? (terpakai / kapasitas) * 100 : 0;

      // Short Label ODP
      let shortOdpLabel = odpLabel;
      const odpMatch = odpLabel.match(/L\d+$/i);
      if (odpMatch) {
        shortOdpLabel = odpMatch[0].toUpperCase();
      } else {
        const odpParts = odpLabel.split('_');
        if (odpParts.length > 1) {
          shortOdpLabel = odpParts[odpParts.length - 1];
        }
      }

      // --- PERBAIKAN: MEMASUKKAN LATITUDE & LONGITUDE KE DATA ODP ---
      odcMap[odcCode].odps.push({
        label: odpLabel,
        originalLabel: odp.label, // SIMPAN NAMA ODP LAMA!
        stasiun: odp.stasiun,     // SIMPAN STASIUN!
        kodeOdp: odp.kodeOdp,
        shortLabel: shortOdpLabel,
        tahapPembangunan: odp.tahapPembangunan || odp.tahap_pembangunan || odp['Tahap Pembangunan'] || 'Tanpa Tahap',
        kapasitas: kapasitas,
        terpakai: terpakai,
        tersisa: tersisa,
        percent: percent,
        latitude: odp.latitude || '',   // <--- KABEL TERSAMBUNG!
        longitude: odp.longitude || '', // <--- KABEL TERSAMBUNG!
        raw: odp
      });

      odcMap[odcCode].kapasitas += kapasitas;
      odcMap[odcCode].terpakai += terpakai;
    });

    // 3. Finalisasi Data dan Pengurutan (Sorting)
    const odcs = Object.values(odcMap).map(odc => {
      odc.tersisa = Math.max(0, odc.kapasitas - odc.terpakai);
      odc.percent = odc.kapasitas > 0 ? (odc.terpakai / odc.kapasitas) * 100 : 0;

      odc.odps.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));

      totalOdcKapasitas += odc.kapasitas;
      totalOdcTerpakai += odc.terpakai;

      return odc;
    });

    odcs.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));

    const kpi = {
      totalOdc: odcs.length,
      totalOdp: uniqueStationOdps.length,
      totalKapasitas: totalOdcKapasitas,
      totalTerpakai: totalOdcTerpakai,
      occupancyRate: totalOdcKapasitas > 0 ? ((totalOdcTerpakai / totalOdcKapasitas) * 100).toFixed(1) : 0
    };

    const existingTahapList = [...new Set(uniqueStationOdps.map(o => o.tahapPembangunan || o.tahap_pembangunan || o.Tahap || '').filter(t => String(t).trim() !== ''))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return { odcs, kpi, existingTahapList };
  }, [selectedStation, data.odpData]);

  // Set ODC default saat data stasiun baru diload
  useEffect(() => {
    setSearchOdc('');
    if (okupansiData.odcs.length > 0) {
      setSelectedOdc(okupansiData.odcs[0]);
    } else {
      setSelectedOdc(null);
    }
  }, [okupansiData]);

  // Fitur Pencarian ODC
  const filteredOdcs = useMemo(() => {
    return okupansiData.odcs.filter(odc =>
      odc.label.toLowerCase().includes(searchOdc.toLowerCase())
    );
  }, [okupansiData.odcs, searchOdc]);

  // Pengelompokan ODC berdasarkan Tahap Pembangunan
  const groupedOdcs = useMemo(() => {
    const groups = {};
    filteredOdcs.forEach(odc => {
      let tahap = 'Tanpa Tahap Pembangunan';
      if (odc.odps && odc.odps.length > 0) {
        const firstOdp = odc.odps[0];
        const raw = firstOdp.raw || firstOdp;
        tahap = firstOdp.tahapPembangunan || raw.tahapPembangunan || raw.tahap_pembangunan || raw['Tahap Pembangunan'] || 'Tanpa Tahap Pembangunan';
      }
      if (!groups[tahap]) groups[tahap] = [];
      groups[tahap].push(odc);
    });

    return Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(key => ({
      tahap: key,
      odcs: groups[key]
    }));
  }, [filteredOdcs]);

  // Helper untuk persentase bar + Badge Status
  const renderProgressBar = (terpakai, kapasitas) => {
    const percent = kapasitas > 0 ? (terpakai / kapasitas) * 100 : 0;
    let colorClass = "bg-emerald-500";
    let badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    let statusText = "AMAN";

    if (percent >= 100) {
      colorClass = "bg-rose-500";
      badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
      statusText = "PENUH";
    } else if (percent >= 75) {
      colorClass = "bg-amber-500";
      badgeClass = "bg-amber-100 text-amber-700 border-amber-200";
      statusText = "WASPADA";
    }

    return (
      <div className="flex flex-col gap-1 w-full max-w-[140px]">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>{statusText}</span>
          <span className="text-[10px] font-bold text-slate-500">{percent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
          <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
        </div>
      </div>
    );
  };

  // Custom Tooltip untuk Chart Stacked
  const CustomOkupansiTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const total = data.kapasitas;
      const percent = total > 0 ? ((data.terpakai / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 min-w-[160px]">
          <p className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2 mb-2">{data.label}</p>
          <div className="space-y-1 text-xs font-semibold">
            <p className="flex justify-between text-slate-500"><span>Kapasitas:</span> <span>{data.kapasitas} Port</span></p>
            <p className="flex justify-between text-blue-600"><span>Terpakai:</span> <span>{data.terpakai} Port</span></p>
            <p className="flex justify-between text-emerald-600"><span>Tersisa:</span> <span>{data.tersisa} Port</span></p>
            <div className="pt-2 mt-2 border-t border-slate-50 flex justify-between items-center">
              <span className="text-slate-400">Okupansi</span>
              <span className={`px-2 py-0.5 rounded text-[10px] text-white ${percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}>{percent}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 page-enter pb-8">

      {/* HEADER & FILTER */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-[#1e3a8a] text-white rounded-lg shrink-0 shadow-md">
            <Icon name="server" size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">Manajemen Kapasitas & Okupansi</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-0">Pantau ketersediaan port ODC dan ODP prioritas penuh</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto mt-1 sm:mt-0">
          <span className="text-sm font-bold text-slate-500 hidden sm:block">Pilih Stasiun:</span>
          <div className="relative flex-1 sm:flex-none sm:w-64 z-[60]">
            {isStationDropdownOpen && (
              <div className="fixed inset-0 z-[55]" onClick={() => setIsStationDropdownOpen(false)}></div>
            )}
            <div
              onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
              className={`w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white border ${isStationDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-xl text-xs sm:text-sm font-bold text-slate-700 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-50 relative z-[56] shadow-sm select-none`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <Icon name="map-pin" size={14} className="text-blue-500 shrink-0 sm:w-4 sm:h-4" />
                <span className="truncate">{selectedStation || 'Memuat...'}</span>
              </div>
              <Icon name={isStationDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 sm:w-4 sm:h-4" />
            </div>

            {isStationDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full bg-white border border-slate-100 shadow-2xl rounded-xl py-1.5 z-[60] animate-dropdown overflow-y-auto max-h-64">
                {uniqueStations.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelectedStation(st); setIsStationDropdownOpen(false); }}
                    className={`px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm cursor-pointer transition-colors flex items-center ${selectedStation === st ? 'bg-blue-50/50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                  >
                    {st}
                    {selectedStation === st && <Icon name="check" size={14} className="ml-auto text-blue-600 sm:w-4 sm:h-4" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleOpenManageModal}
            className="w-auto shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#1e3a8a] text-white rounded-xl shadow-md hover:bg-[#172554] font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Icon name="sliders" size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Kelola ODP</span>
          </button>
        </div>
      </div>
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white py-2.5 px-2 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center justify-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total ODC</p>
          <p className="text-lg sm:text-2xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalOdc || 0}</p>
        </div>
        <div className="bg-white py-2.5 px-2 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center justify-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total ODP</p>
          <p className="text-lg sm:text-2xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalOdp || 0}</p>
        </div>
        <div className="bg-white py-2.5 px-2 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center justify-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Kapasitas (Port)</p>
          <p className="text-lg sm:text-2xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalKapasitas || 0}</p>
        </div>
        <div className="bg-white py-2.5 px-2 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center text-center justify-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total Terpakai</p>
          <p className="text-lg sm:text-2xl font-black text-blue-600 leading-none">{okupansiData.kpi.totalTerpakai || 0}</p>
        </div>
        <div className={`py-2.5 px-2 sm:p-4 rounded-xl shadow-sm border flex flex-col items-center text-center justify-center col-span-2 md:col-span-1 ${Number(okupansiData.kpi.occupancyRate) >= 100 ? 'bg-rose-50 border-rose-200 text-rose-700' : Number(okupansiData.kpi.occupancyRate) >= 75 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <p className="text-[9px] sm:text-[10px] font-bold opacity-70 uppercase tracking-wider mb-0.5 sm:mb-1">Okupansi Keseluruhan</p>
          <p className="text-xl sm:text-2xl font-black leading-none">{okupansiData.kpi.occupancyRate || 0}%</p>
        </div>
      </div>

      {/* SECTION 1: GRAFIK & TABEL ODC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Grafik ODC */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center">
              <Icon name="bar-chart-2" size={18} className="mr-2 text-blue-500" />
              Grafik Kapasitas ODC
            </h3>
            <div className="flex gap-4 text-[10px] font-bold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Terpakai</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#a7f3d0]"></div> Tersisa</div>
            </div>
          </div>

          <div className={`flex-1 w-full min-h-[260px] sm:min-h-[350px] overflow-x-auto custom-scrollbar flex ${filteredOdcs.length < 6 ? 'justify-center' : 'justify-start'}`}>
            {filteredOdcs.length > 0 ? (
              <div style={{
                width: filteredOdcs.length < 6 ? `${filteredOdcs.length * 80}px` : '100%',
                minWidth: filteredOdcs.length >= 6 ? `${filteredOdcs.length * 60}px` : 'auto',
                minHeight: '100%',
                height: '100%'
              }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={260} debounce={50}>
                  <BarChart data={filteredOdcs} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={<CustomOkupansiTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="terpakai" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} maxBarSize={50} />
                    <Bar dataKey="tersisa" stackId="a" fill="#a7f3d0" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm w-full">Tidak ada data grafik</div>
            )}
          </div>
        </div>

        {/* Tabel ODC */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-[#1e3a8a] text-white flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center">
              <Icon name="database" size={16} className="mr-2 text-cyan-400" />
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider leading-tight">ODC {selectedStation}</h3>
                <span className="text-[9px] text-blue-200">Diurutkan berdasar penomoran</span>
              </div>
            </div>

            <div className="relative w-full sm:w-40 text-slate-700 shrink-0">
              <Icon name="search" size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ODC..."
                value={searchOdc}
                onChange={(e) => setSearchOdc(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 bg-white/90 border-none rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="overflow-auto flex-1 max-h-[320px] sm:max-h-[400px] custom-scrollbar">
            <table className="w-full text-[10px] sm:text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="pl-3 pr-1 py-2 sm:px-4 sm:py-3">LABEL ODC</th>
                  <th className="px-1 py-2 sm:px-4 sm:py-3 text-center">KAP.</th>
                  <th className="px-1 py-2 sm:px-4 sm:py-3 text-center">PAKAI</th>
                  <th className="px-1 py-2 sm:px-4 sm:py-3">STATUS & OKUPANSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedOdcs.length > 0 ? (
                  groupedOdcs.map((group, groupIdx) => {
                    const isCollapsed = !!collapsedTahap[group.tahap];
                    return (
                      <React.Fragment key={groupIdx}>
                        <tr
                          onClick={() => toggleTahap(group.tahap)}
                          className="bg-slate-100/90 hover:bg-slate-200/80 cursor-pointer font-bold text-slate-700 border-y border-slate-200/80 transition-colors select-none"
                        >
                          <td colSpan="4" className="pl-3 pr-1 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Icon name={isCollapsed ? "chevron-right" : "chevron-down"} size={14} className="text-slate-500 shrink-0 transition-transform" />
                                <Icon name="tag" size={12} className="text-blue-600 shrink-0 hidden sm:block" />
                                <span className="font-extrabold break-words">{group.tahap}</span>
                                <span className="text-[8px] sm:text-[10px] font-semibold text-slate-500 bg-white px-1 sm:px-1.5 py-0.5 rounded-full border border-slate-200 shadow-xs shrink-0">
                                  {group.odcs.length} ODC
                                </span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal hidden sm:inline shrink-0 pl-1">
                                {isCollapsed ? 'Klik untuk buka' : 'Klik untuk tutup'}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && group.odcs.map((odc, i) => (
                          <tr
                            key={`${groupIdx}-${i}`}
                            onClick={() => setSelectedOdc(odc)}
                            className={`cursor-pointer transition-colors ${selectedOdc?.label === odc.label ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                          >
                            <td className="pl-3 pr-1 py-2 sm:px-4 sm:py-3 font-bold text-slate-800 break-words">
                              <div className="flex items-center gap-1 sm:gap-2">
                                {selectedOdc?.label === odc.label && <div className="w-1.5 h-3 sm:h-4 bg-blue-500 rounded-full shrink-0"></div>}
                                <span className="break-all text-[9px] sm:text-xs leading-tight">{odc.label}</span>
                              </div>
                            </td>
                            <td className="px-1 py-2 sm:px-4 sm:py-3 text-center font-medium">{odc.kapasitas}</td>
                            <td className="px-1 py-2 sm:px-4 sm:py-3 text-center font-bold text-blue-600">{odc.terpakai}</td>
                            <td className="px-1 py-2 sm:px-4 sm:py-3">
                              <div className="w-full min-w-[70px]">
                                {renderProgressBar(odc.terpakai, odc.kapasitas)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-slate-400">Pencarian "{searchOdc}" tidak ditemukan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SECTION 2: GRAFIK & TABEL ODP */}
      {selectedOdc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 animate-in slide-in-from-bottom-4 duration-500">

          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 flex flex-col overflow-hidden order-2 lg:order-1 self-start w-full">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center">
                <Icon name="layers" size={16} className="mr-2 text-emerald-300" />
                <h3 className="font-bold text-sm uppercase tracking-wider leading-tight">{selectedOdc.label}</h3>
              </div>
              <span className="text-[10px] bg-emerald-900/30 px-2 py-1 rounded border border-emerald-600/50">
                Total: {selectedOdc.odps.length} ODP
              </span>
            </div>

            <div className="overflow-auto w-full max-h-[320px] sm:max-h-[400px] custom-scrollbar">
              <table className="w-full text-[10px] sm:text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold shadow-sm">
                  <tr>
                    <th className="pl-3 pr-1 py-2 sm:px-4 sm:py-3">LABEL ODP</th>
                    <th className="px-1 py-2 sm:px-4 sm:py-3 text-center">KAP.</th>
                    <th className="px-1 py-2 sm:px-4 sm:py-3 text-center">PAKAI</th>
                    <th className="px-1 py-2 sm:px-4 sm:py-3">STATUS & OKUPANSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOdc.odps.map((odp, i) => (
                    <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="pl-3 pr-1 py-2 sm:px-4 sm:py-3 font-bold text-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 break-words">
                        <span className="break-all text-[9px] sm:text-xs leading-tight">{odp.kodeOdp || odp.label}</span>
                        {odp.tahapPembangunan && odp.tahapPembangunan !== 'Tanpa Tahap' && (
                          <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 sm:px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {odp.tahapPembangunan}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-2 sm:px-4 sm:py-3 text-center font-medium">{odp.kapasitas}</td>
                      <td className="px-1 py-2 sm:px-4 sm:py-3 text-center font-bold text-blue-600">{odp.terpakai}</td>
                      <td className="px-1 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center justify-between gap-1 sm:gap-4 w-full min-w-[70px]">
                          <div className="flex-1">
                            {renderProgressBar(odp.terpakai, odp.kapasitas)}
                          </div>
                          <button
                            onClick={() => setSelectedOdpDetail(odp)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer group shrink-0"
                            title="Lihat List Pelanggan"
                          >
                            <Icon name="chevron-right" size={16} className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                    <td className="pl-3 pr-1 py-2 sm:px-4 sm:py-3 text-[9px] sm:text-xs">
                      <span className="sm:hidden">TOTAL</span>
                      <span className="hidden sm:inline">TOTAL KESELURUHAN</span>
                    </td>
                    <td className="px-1 py-2 sm:px-4 sm:py-3 text-center">{selectedOdc.kapasitas}</td>
                    <td className="px-1 py-2 sm:px-4 sm:py-3 text-center text-blue-700">{selectedOdc.terpakai}</td>
                    <td className="px-1 py-2 sm:px-4 sm:py-3">
                      {renderProgressBar(selectedOdc.terpakai, selectedOdc.kapasitas)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 flex flex-col overflow-hidden order-1 lg:order-2 h-full">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center">
                <Icon name="bar-chart" size={16} className="mr-2 text-emerald-300" />
                <h3 className="font-bold text-sm uppercase tracking-wider leading-tight">
                  Kapasitas ODP ({selectedOdc.shortLabel})
                </h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-bold">
                <div className="flex items-center gap-1.5 bg-emerald-800/60 px-2 py-1 rounded border border-emerald-600/50">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-400"></div> Terpakai
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-800/60 px-2 py-1 rounded border border-emerald-600/50">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#a7f3d0]"></div> Tersisa
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
              <div className={`flex-1 min-h-[200px] lg:min-h-0 w-full overflow-x-auto custom-scrollbar flex ${selectedOdc.odps.length < 6 ? 'justify-center' : 'justify-start'}`}>
                <div style={{
                  width: selectedOdc.odps.length < 6 ? `${selectedOdc.odps.length * 70}px` : '100%',
                  minWidth: selectedOdc.odps.length >= 6 ? `${selectedOdc.odps.length * 50}px` : 'auto',
                  minHeight: '100%',
                  height: '100%'
                }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={10} debounce={50}>
                    <BarChart data={selectedOdc.odps} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={5} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip content={<CustomOkupansiTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="terpakai" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} maxBarSize={50} />
                      <Bar dataKey="tersisa" stackId="a" fill="#a7f3d0" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Render Modal Detail Pelanggan ODP dengan Mengirim Semua Data ODP Stasiun */}
      {selectedOdpDetail && (
        <OdpDetailModal
          odp={selectedOdpDetail}
          pelangganData={data.pelangganData}
          // KABEL BARU: Kita kirimkan semua ODP yang ada di stasiun terpilih ke dalam Modal
          allOdps={(data.odpData || []).filter(o => {
            const odpSt = String(o.stasiun || '').toLowerCase().trim();
            const selSt = String(selectedStation).toLowerCase().trim();
            return odpSt === selSt ||
              (selSt === 'semarang tawang' && odpSt === 'tawang') ||
              (selSt === 'tawang' && odpSt === 'semarang tawang');
          })}
          onClose={() => setSelectedOdpDetail(null)}
        />
      )}

      {/* MODAL UPLOAD MASSAL ODP */}
      {showBulkModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isUploading && !isUploadSuccess && setShowBulkModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col relative z-10 animate-modal max-h-[90vh] overflow-hidden">

            {/* OVERLAY SUKSES */}
            {isUploadSuccess && (
              <div className="absolute inset-0 bg-emerald-600 z-[100] flex flex-col items-center justify-center animate-fade text-white">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 animate-bounce">
                  <Icon name="check" size={40} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-black mb-1">Berhasil Disimpan!</h3>
                <p className="text-emerald-100 font-medium">Data {parsedExcelData.length} ODP telah ditambahkan.</p>
              </div>
            )}

            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <Icon name="upload-cloud" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">Upload Data ODP</h2>
                  <p className="text-xs text-slate-500 font-medium">Membaca data dari Excel/Spreadsheet Template Summary Aset ODP</p>
                </div>
              </div>
              <button onClick={() => !isUploading && setShowBulkModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              {!parsedExcelData || parsedExcelData.length === 0 ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <Icon name="file-spreadsheet" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">Pilih File Excel (SUMMARY ODP)</h3>
                  <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">Upload file berformat .xlsx yang berisi tabel "SUMMARY ODP ASSET". Data akan otomatis terdeteksi.</p>
                  <button className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all">Browse File</button>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const dataBuffer = evt.target.result;
                          const wb = XLSX.read(dataBuffer, { type: 'array' });
                          const wsname = wb.SheetNames[0];
                          const ws = wb.Sheets[wsname];
                          // header: 1 returns 2D array
                          const data = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

                          let stationName = selectedStation;
                          // Coba cari nama stasiun secara dinamis di 10 baris pertama
                          for (let i = 0; i < 10 && i < data.length; i++) {
                            const row = data[i];
                            if (!row) continue;
                            for (let c = 0; c < row.length; c++) {
                              if (String(row[c]).toLowerCase().includes('nama stasiun')) {
                                // Ambil nilai pertama di sebelah kanan yang BUKAN titik dua (:) atau kosong
                                for (let k = c + 1; k < row.length; k++) {
                                  let val = String(row[k] || '').trim();
                                  if (val && val !== ':') {
                                    stationName = val;
                                    break;
                                  }
                                }
                              }
                            }
                          }

                          // Bersihkan nama stasiun dari karakter ":", "Stasiun ", dsb
                          if (stationName) {
                            stationName = stationName
                              .replace(/^[:\s-]+/, '')
                              .replace(/^stasiun\s+/i, '')
                              .trim();
                            stationName = toProperCase(stationName);
                          }
                          if (!stationName) {
                            stationName = selectedStation;
                          }

                          // Cari baris header tabel secara dinamis
                          let headerRowIdx = -1;
                          let colIdx = { odp: -1, port: -1, lat: -1, lng: -1, keterangan: -1 };

                          for (let i = 0; i < 20 && i < data.length; i++) {
                            const row = data[i];
                            if (!row) continue;

                            for (let c = 0; c < row.length; c++) {
                              const val = String(row[c] || '').toLowerCase().trim();
                              if (val === 'odp' || val.includes('label odp')) colIdx.odp = c;
                              if (val.includes('port') || val.includes('kapasitas')) colIdx.port = c;
                              if (val.includes('lat')) colIdx.lat = c;
                              if (val.includes('long') || val.includes('lng')) colIdx.lng = c;
                              if (val.includes('keterangan') || val.includes('tahap')) colIdx.keterangan = c;
                            }

                            if (colIdx.odp !== -1) {
                              headerRowIdx = i;
                              break;
                            }
                          }

                          if (headerRowIdx === -1) {
                            throw new Error("Tidak dapat menemukan kolom 'ODP' di file Excel.");
                          }

                          const newPayload = [];
                          for (let i = headerRowIdx + 1; i < data.length; i++) {
                            const row = data[i];
                            if (!row) continue;

                            const odpName = String(row[colIdx.odp] || '').trim();
                            if (!odpName || odpName === '' || odpName.toLowerCase() === 'jumlah') continue;

                            const kapasitas = parseInt(row[colIdx.port]) || 8;
                            let val1 = parseFloat(row[colIdx.lat]);
                            let val2 = parseFloat(row[colIdx.lng]);

                            let lat = 0, lng = 0;
                            if (val1 < 0 && val2 > 0) {
                              lat = val1; lng = val2;
                            } else if (val2 < 0 && val1 > 0) {
                              lat = val2; lng = val1;
                            } else {
                              lat = val1; lng = val2;
                            }

                            let kodeOdc = odpName;
                            if (odpName.includes('_L')) {
                              kodeOdc = odpName.substring(0, odpName.lastIndexOf('_L'));
                            }

                            let tahap = "";
                            if (colIdx.keterangan !== -1) {
                              tahap = String(row[colIdx.keterangan] || "").trim();
                            }

                            newPayload.push({
                              label: odpName,
                              latitude: String(lat),
                              longitude: String(lng),
                              port_terpakai: 0,
                              tahap_pembangunan: tahap, // Akan ditimpa oleh input user
                              kapasitas: kapasitas,
                              kode_odp: odpName,
                              kode_odc: kodeOdc,
                              stasiun: stationName
                            });
                          }

                          if (newPayload.length === 0) {
                            setSyncToast({ show: true, type: 'error', message: 'File Excel terbaca, tapi tidak ada data ODP di bawah tabel header.' });
                            setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 4000);
                          } else {
                            setParsedExcelData(newPayload);
                            setInputTahap('');
                            setIsNewTahap(false);
                          }

                        } catch (err) {
                          setSyncToast({ show: true, type: 'error', message: 'Gagal membaca file Excel: ' + err.message });
                          setTimeout(() => setSyncToast(prev => prev.type === 'error' ? { ...prev, show: false } : prev), 4000);
                          console.error(err);
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-slate-700 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm shrink-0">
                        {parsedExcelData.length} ODP Ditemukan
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <span className="text-sm font-bold text-slate-600">Tahap Pembangunan <span className="text-rose-500">*</span></span>
                        {!isNewTahap ? (
                          <select
                            value={inputTahap}
                            onChange={(e) => {
                              if (e.target.value === '___NEW___') {
                                setIsNewTahap(true);
                                setInputTahap('');
                              } else {
                                setInputTahap(e.target.value);
                              }
                            }}
                            className="text-sm px-3 py-1.5 w-64 border border-slate-300 bg-white text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-colors cursor-pointer"
                          >
                            <option value="" disabled hidden>Pilih atau Tambah Baru</option>
                            {okupansiData.existingTahapList && okupansiData.existingTahapList.map(t => (
                              <option key={t} value={t} className="text-slate-700">{t}</option>
                            ))}
                            <option value="___NEW___" className="font-bold text-emerald-600">+ Tambah Baru...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={inputTahap}
                              onChange={(e) => setInputTahap(e.target.value)}
                              placeholder="Ketik tahap baru..."
                              className="text-sm px-3 py-1.5 w-56 border border-slate-300 bg-white text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-colors"
                            />
                            <button onClick={() => { setIsNewTahap(false); setInputTahap(''); }} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors">
                              <Icon name="x" size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setParsedExcelData([]); setInputTahap(''); setIsNewTahap(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-sm font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-colors">
                      Ganti File
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden overflow-y-auto max-h-64 shadow-sm bg-slate-50 relative">
                    <table className="w-full text-left text-[11px] text-slate-600">
                      <thead className="bg-slate-100 text-slate-500 sticky top-0 uppercase font-bold">
                        <tr>
                          <th className="p-3 border-b border-slate-200">ODP</th>
                          <th className="p-3 border-b border-slate-200">ODC</th>
                          <th className="p-3 border-b border-slate-200">Kapasitas</th>
                          <th className="p-3 border-b border-slate-200">Koordinat</th>
                          <th className="p-3 border-b border-slate-200">Stasiun</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {parsedExcelData.slice(0, 50).map((r, i) => (
                          <tr key={i} className="hover:bg-emerald-50">
                            <td className="p-3 font-bold text-slate-800">{r.label}</td>
                            <td className="p-3">{r.kode_odc}</td>
                            <td className="p-3">{r.kapasitas}</td>
                            <td className="p-3">{r.latitude}, {r.longitude}</td>
                            <td className="p-3">{r.stasiun}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedExcelData.length > 50 && (
                      <div className="p-3 text-center text-xs font-bold text-slate-400 bg-slate-100 border-t border-slate-200">
                        ... dan {parsedExcelData.length - 50} baris lainnya disembunyikan untuk preview.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setShowBulkModal(false); setParsedExcelData([]); setInputTahap(''); setIsNewTahap(false); }}
                disabled={isUploading}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (parsedExcelData.length === 0) return;
                  if (!inputTahap.trim()) return;

                  const existingOdpMap = new Map();
                  (data.odpData || []).forEach(o => {
                    const key = String(o.kodeOdp || o.kode_odp || o.label || '').trim().toLowerCase();
                    if (key) existingOdpMap.set(key, o);
                  });

                  let currentMaxId = (data.odpData || []).reduce((max, o) => {
                    const num = Number(o.id);
                    return !isNaN(num) && num > max ? num : max;
                  }, 12785);

                  // Terapkan nilai inputTahap ke semua odp sebelum dikirim dan pastikan memiliki ID integer untuk Supabase
                  const finalPayload = parsedExcelData.map(odp => {
                    const key = String(odp.kode_odp || odp.label || '').trim().toLowerCase();
                    const existing = existingOdpMap.get(key);
                    return {
                      ...odp,
                      id: existing?.id || ++currentMaxId,
                      tahap_pembangunan: inputTahap.trim()
                    };
                  });

                  // DETEKSI DUPLIKAT
                  const duplicates = finalPayload.filter(o => existingOdpMap.has(String(o.kode_odp || o.label || '').trim().toLowerCase()));
                  const newItems = finalPayload.filter(o => !existingOdpMap.has(String(o.kode_odp || o.label || '').trim().toLowerCase()));

                  if (duplicates.length > 0) {
                    setConflictModalData({
                      duplicatesCount: duplicates.length,
                      newItems: newItems,
                      finalPayload: finalPayload
                    });
                    return;
                  }

                  await handleUploadPayload(finalPayload);
                }}
                disabled={isUploading || parsedExcelData.length === 0 || !inputTahap.trim()}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-colors flex items-center gap-2 ${parsedExcelData.length === 0 || !inputTahap.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {isUploading ? (
                  <><Icon name="loader" size={16} className="animate-spin" /> Memproses...</>
                ) : (
                  <><Icon name="save" size={16} /> Simpan Data ke Database</>
                )}
              </button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* TOAST NOTIFICATION PREMIUM */}
      {syncToast.show && ReactDOM.createPortal(
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[99999] bg-white border rounded-full shadow-2xl px-5 py-3 flex items-center gap-3 animate-dropdown transition-all ${syncToast.type === 'syncing' ? 'border-blue-200' :
          syncToast.type === 'success' ? 'border-emerald-200' : 'border-rose-200'
          }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${syncToast.type === 'syncing' ? 'bg-blue-500' :
            syncToast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}>
            <Icon name={
              syncToast.type === 'syncing' ? "refresh-cw" :
                syncToast.type === 'success' ? "check" : "alert-circle"
            } className={`text-white ${syncToast.type === 'syncing' ? 'animate-spin' : ''}`} size={14} />
          </div>
          <span className="text-sm font-bold text-slate-700">{syncToast.message}</span>
        </div>,
        document.body
      )}

      {/* CONFLICT MODAL */}
      {conflictModalData && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Icon name="alert-triangle" size={20} weight="fill" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Data ODP Sudah Ada</h3>
                  <p className="text-xs text-amber-700 mt-0.5">Ditemukan {conflictModalData.duplicatesCount} data bentrok.</p>
                </div>
              </div>
            </div>

            <div className="p-5 text-sm text-slate-600 space-y-3">
              <p>Beberapa data ODP yang Anda unggah sudah ada di dalam database. Apa yang ingin Anda lakukan dengan data yang bentrok ini?</p>

              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={async () => {
                    const payload = conflictModalData.finalPayload;
                    setConflictModalData(null);
                    await handleUploadPayload(payload);
                  }}
                  disabled={isUploading}
                  className="w-full text-left p-3 rounded-xl border border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-colors flex items-start gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="mt-0.5 text-rose-500 group-hover:scale-110 transition-transform"><Icon name="copy" size={18} /></div>
                  <div>
                    <strong className="block text-rose-700">Timpa Semua (Overwrite)</strong>
                    <span className="text-xs text-slate-500">Data lama akan digantikan sepenuhnya oleh data baru dari Excel ini.</span>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    const payload = conflictModalData.newItems;
                    setConflictModalData(null);
                    if (payload.length === 0) {
                      setSyncToast({ show: true, type: 'info', message: 'Tidak ada data baru untuk disubmit (semua dilewati).' });
                      setTimeout(() => setSyncToast({ show: false, type: '', message: '' }), 4000);
                      return;
                    }
                    await handleUploadPayload(payload);
                  }}
                  disabled={isUploading}
                  className="w-full text-left p-3 rounded-xl border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex items-start gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="mt-0.5 text-emerald-500 group-hover:scale-110 transition-transform"><Icon name="fast-forward" size={18} /></div>
                  <div>
                    <strong className="block text-emerald-700">Lewati Saja (Skip)</strong>
                    <span className="text-xs text-slate-500">Abaikan data yang bentrok, hanya simpan data ODP yang benar-benar baru.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setConflictModalData(null)}
                className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Batal Upload
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KELOLA ODP */}
      {showManageOdpModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl xl:max-w-7xl flex flex-col relative animate-modal max-h-[92vh] overflow-hidden border border-slate-100">

            {/* HEADER MODAL */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1e3a8a] flex items-center justify-center shadow-inner shrink-0">
                  <Icon name="sliders" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-800">Kelola Data ODP</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {filteredManageOdps.length} ODP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Filter, cari, edit data koordinat/tahap, atau hapus ODP stasiun</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageOdpModal(false)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* TOOLBAR FILTER & AKSI */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Filter Stasiun */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Icon name="map-pin" size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={manageStationFilter}
                    onChange={(e) => {
                      setManageStationFilter(e.target.value);
                      setManageTahapFilter('');
                      setManagePage(1);
                    }}
                    className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="">Semua Stasiun</option>
                    {uniqueStations.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tahap Pembangunan */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Icon name="tag" size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={manageTahapFilter}
                    onChange={(e) => {
                      setManageTahapFilter(e.target.value);
                      setManagePage(1);
                    }}
                    className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer max-w-[160px]"
                  >
                    <option value="">Semua Tahap</option>
                    {allTahapList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 min-w-[180px] shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                  <Icon name="search" size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={manageSearch}
                    onChange={(e) => {
                      setManageSearch(e.target.value);
                      setManagePage(1);
                    }}
                    placeholder="Cari ODP, ODC, atau Stasiun..."
                    className="w-full text-xs bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none font-medium"
                  />
                  {manageSearch && (
                    <button onClick={() => { setManageSearch(''); setManagePage(1); }} className="text-slate-400 hover:text-slate-600">
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tombol Aksi Toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleSyncPortsFromPelanggan}
                  disabled={isSyncingPorts}
                  className={`px-3 sm:px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ${isSyncingPorts ? 'opacity-70 cursor-wait' : ''}`}
                  title="Sinkronkan keterisian port dari data pelanggan riil"
                >
                  <Icon name="refresh-cw" size={14} className={isSyncingPorts ? 'animate-spin text-blue-600' : 'text-blue-600'} />
                  <span>{isSyncingPorts ? 'Menyinkronkan...' : 'Sinkronkan Port'}</span>
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Icon name="upload-cloud" size={16} />
                  <span>+ Tambah / Upload ODP</span>
                </button>
              </div>
            </div>

            {/* TABEL DAFTAR ODP */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs text-slate-600 min-w-[850px]">
                  <thead className="bg-slate-100/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12 whitespace-nowrap">No</th>
                      <th
                        onClick={() => handleManageSort('kodeOdp')}
                        className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition-colors select-none group"
                        title="Klik untuk mengurutkan Kode ODP"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Kode ODP</span>
                          {manageSortKey === 'kodeOdp' ? (
                            manageSortOrder === 'asc' ? (
                              <Icon name="chevron-up" size={13} className="text-blue-600" />
                            ) : (
                              <Icon name="chevron-down" size={13} className="text-blue-600" />
                            )
                          ) : (
                            <Icon name="chevrons-up-down" size={13} className="text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Stasiun</th>
                      <th
                        onClick={() => handleManageSort('kodeOdc')}
                        className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition-colors select-none group"
                        title="Klik untuk mengurutkan ODC"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>ODC</span>
                          {manageSortKey === 'kodeOdc' ? (
                            manageSortOrder === 'asc' ? (
                              <Icon name="chevron-up" size={13} className="text-blue-600" />
                            ) : (
                              <Icon name="chevron-down" size={13} className="text-blue-600" />
                            )
                          ) : (
                            <Icon name="chevrons-up-down" size={13} className="text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3.5 whitespace-nowrap min-w-[190px]">Tahap Pembangunan</th>
                      <th
                        onClick={() => handleManageSort('port')}
                        className="py-3 px-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition-colors select-none group"
                        title="Klik untuk mengurutkan Keterisian Port"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>Port</span>
                          {manageSortKey === 'port' ? (
                            manageSortOrder === 'asc' ? (
                              <Icon name="chevron-up" size={13} className="text-blue-600" />
                            ) : (
                              <Icon name="chevron-down" size={13} className="text-blue-600" />
                            )
                          ) : (
                            <Icon name="chevrons-up-down" size={13} className="text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-3.5 whitespace-nowrap min-w-[160px]">Koordinat</th>
                      <th className="py-3 px-3.5 text-center w-24 whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedManageOdps.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-400">
                          <Icon name="inbox" size={36} className="mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-sm">Tidak ada data ODP yang sesuai</p>
                          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter stasiun/tahap</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedManageOdps.map((odp, idx) => {
                        const rowNum = (managePage - 1) * MANAGE_ITEMS_PER_PAGE + idx + 1;
                        const odpKey = cleanOdpStr(odp.kodeOdp || odp.label || odp.kode_odp);
                        const countFromCust = customerCountByOdp[odpKey];
                        const terpakai = countFromCust !== undefined ? countFromCust : (Number(odp.portTerpakai ?? odp.port_terpakai) || 0);
                        const kapasitas = Number(odp.kapasitas) || 8;
                        const pct = kapasitas > 0 ? (terpakai / kapasitas) * 100 : 0;
                        const hasCoords = odp.latitude && odp.longitude && odp.latitude !== '0' && odp.longitude !== '0';

                        return (
                          <tr key={odp.id || odp.kodeOdp || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3.5 text-center text-slate-400 font-bold text-[11px] whitespace-nowrap">{rowNum}</td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {odp.kodeOdp || odp.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {odp.stasiun || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-700 font-semibold whitespace-nowrap">{odp.kodeOdc || '-'}</td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap min-w-[190px]">
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
                                {odp.tahapPembangunan || odp.tahap_pembangunan || 'Tanpa Tahap'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                pct >= 100 ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                pct >= 75 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {terpakai}/{kapasitas} ({pct.toFixed(0)}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                              {hasCoords ? (
                                <a
                                  href={`https://www.google.com/maps?q=${odp.latitude},${odp.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                  title="Lihat di Google Maps"
                                >
                                  <Icon name="map-pin" size={11} className="shrink-0" />
                                  <span>{odp.latitude}, {odp.longitude}</span>
                                </a>
                              ) : (
                                <span className="text-slate-300 italic">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(odp)}
                                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit ODP"
                                >
                                  <Icon name="edit-3" size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingOdp(odp)}
                                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus ODP"
                                >
                                  <Icon name="trash-2" size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER & PAGINATION */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-800">{filteredManageOdps.length === 0 ? 0 : (managePage - 1) * MANAGE_ITEMS_PER_PAGE + 1}</strong> - <strong className="text-slate-800">{Math.min(managePage * MANAGE_ITEMS_PER_PAGE, filteredManageOdps.length)}</strong> dari <strong className="text-slate-800">{filteredManageOdps.length}</strong> ODP
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManagePage(p => Math.max(1, p - 1))}
                  disabled={managePage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-slate-700 px-2">
                  Halaman {managePage} / {totalManagePages}
                </span>
                <button
                  onClick={() => setManagePage(p => Math.min(totalManagePages, p + 1))}
                  disabled={managePage >= totalManagePages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL EDIT ODP */}
      {editingOdp && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative animate-scale-up overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon name="edit-3" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Edit Data ODP</h3>
                  <p className="text-xs text-slate-500 font-mono font-medium">{editingOdp.kode_odp}</p>
                </div>
              </div>
              <button onClick={() => !isSavingEdit && setEditingOdp(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditOdp} className="p-5 space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Kode ODP <span className="text-rose-500">*</span></label>
                  <input
                    required
                    value={editingOdp.kode_odp}
                    onChange={(e) => setEditingOdp({ ...editingOdp, kode_odp: e.target.value, label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Kode ODC</label>
                  <input
                    value={editingOdp.kode_odc}
                    onChange={(e) => setEditingOdp({ ...editingOdp, kode_odc: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Stasiun <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={editingOdp.stasiun}
                    onChange={(e) => setEditingOdp({ ...editingOdp, stasiun: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold cursor-pointer"
                  >
                    {uniqueStations.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Kapasitas (Port)</label>
                  <input
                    type="number"
                    min="1"
                    max="144"
                    value={editingOdp.kapasitas}
                    onChange={(e) => setEditingOdp({ ...editingOdp, kapasitas: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Tahap Pembangunan</label>
                <input
                  value={editingOdp.tahap_pembangunan}
                  onChange={(e) => setEditingOdp({ ...editingOdp, tahap_pembangunan: e.target.value })}
                  placeholder="Contoh: Percepatan 2080HP"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Latitude</label>
                  <input
                    value={editingOdp.latitude}
                    onChange={(e) => setEditingOdp({ ...editingOdp, latitude: e.target.value })}
                    placeholder="-7.123456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Longitude</label>
                  <input
                    value={editingOdp.longitude}
                    onChange={(e) => setEditingOdp({ ...editingOdp, longitude: e.target.value })}
                    placeholder="110.123456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingOdp(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSavingEdit ? (
                    <><Icon name="loader" size={14} className="animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Icon name="save" size={14} /> Simpan Perubahan</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KONFIRMASI HAPUS ODP */}
      {deletingOdp && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative animate-scale-up overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-rose-100 flex items-center gap-3 bg-rose-50/70">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Icon name="trash-2" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Hapus Data ODP?</h3>
                <p className="text-xs text-rose-600 font-medium">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600">
              <p>Apakah Anda yakin ingin menghapus data ODP berikut dari database sistem?</p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kode ODP:</span>
                  <strong className="font-mono text-slate-800">{deletingOdp.kodeOdp || deletingOdp.label}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stasiun:</span>
                  <span className="font-bold text-blue-700">{deletingOdp.stasiun}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tahap:</span>
                  <span className="text-slate-700 font-medium">{deletingOdp.tahapPembangunan || deletingOdp.tahap_pembangunan || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Port Terpakai:</span>
                  <span className={`font-bold ${Number(deletingOdp.portTerpakai ?? deletingOdp.port_terpakai) > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {deletingOdp.portTerpakai ?? deletingOdp.port_terpakai ?? 0} / {deletingOdp.kapasitas || 8} Port
                  </span>
                </div>
              </div>

              {Number(deletingOdp.portTerpakai ?? deletingOdp.port_terpakai) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                  <Icon name="alert-triangle" size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Perhatian:</strong> ODP ini masih memiliki {deletingOdp.portTerpakai ?? deletingOdp.port_terpakai} port pelanggan terpakai! Pastikan pelanggan telah dipindahkan sebelum menghapus.</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDeletingOdp(null)}
                disabled={isDeletingOdp}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-all text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteOdp}
                disabled={isDeletingOdp}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md flex items-center gap-1.5 transition-all text-xs cursor-pointer"
              >
                {isDeletingOdp ? (
                  <><Icon name="loader" size={14} className="animate-spin" /> Menghapus...</>
                ) : (
                  <><Icon name="trash-2" size={14} /> Ya, Hapus ODP</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ==========================================
// KOMPONEN: PAPAN PERINGKAT AKTIVASI PETUGAS
// ==========================================
function OfficerAchievementBoard({ data }) {
  // Menghitung total aktivasi per petugas secara otomatis dari data
  const achievements = useMemo(() => {
    const counts = {};
    (data || []).forEach(p => {
      // Di database pelanggan, kolom petugas aktivasi biasanya bernama 'petugasAktivasi'
      const nama = p.petugasAktivasi || p.petugas;

      // Karena data yang dioper (aktivasiList) sudah difilter status AKTIF, kita langsung hitung
      if (nama) {
        counts[nama] = (counts[nama] || 0) + 1;
      }
    });

    // Mengubah object menjadi array dan mengurutkan dari pencapaian terbanyak
    return Object.entries(counts)
      .map(([nama, total]) => ({ nama, total }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  // Sembunyikan jika tidak ada data aktivasi di rentang waktu tersebut
  if (achievements.length === 0) return null;

  return (
    <div className="mt-2 mb-6 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade">
      {/* Header Papan Capaian */}
      <div className="px-3 sm:px-5 py-2 sm:py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Icon name="award" size={18} className="text-amber-500 w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
          <h3 className="text-[10px] sm:text-sm font-bold text-slate-700 leading-tight">Peringkat Capaian Aktivasi Petugas</h3>
        </div>
        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-slate-200 shadow-sm shrink-0 flex flex-col sm:inline-block items-center text-center">
          <span className="sm:inline">Total: </span><span className="text-blue-600 sm:mx-1 text-[10px] sm:text-[10px] leading-none">{achievements.reduce((acc, curr) => acc + curr.total, 0)}</span> <span className="sm:inline">Aktivasi</span>
        </span>
      </div>

      {/* Daftar Petugas */}
      <div className="p-2 sm:p-4 flex gap-2 sm:gap-4 overflow-x-auto custom-scrollbar">
        {achievements.map((item, idx) => {
          // Styling khusus untuk Top 3
          const isTop1 = idx === 0;
          const isTop2 = idx === 1;
          const isTop3 = idx === 2;

          return (
            <div key={item.nama} className={`flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-3 rounded-xl shrink-0 min-w-[110px] sm:min-w-[170px] border transition-all hover:-translate-y-0.5 ${isTop1 ? 'bg-amber-50 border-amber-200 shadow-sm' : isTop2 ? 'bg-slate-50 border-slate-300 shadow-sm' : isTop3 ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>

              {/* Lingkaran Angka/Medali */}
              <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[9px] sm:text-xs shrink-0 ${isTop1 ? 'bg-amber-400 text-white shadow-inner' : isTop2 ? 'bg-slate-300 text-slate-700 shadow-inner' : isTop3 ? 'bg-orange-400 text-white shadow-inner' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                {isTop1 ? '1' : isTop2 ? '2' : isTop3 ? '3' : idx + 1}
              </div>

              {/* Nama dan Total Capaian */}
              <div className="min-w-0">
                <div className={`text-[9px] sm:text-xs font-bold truncate max-w-[80px] sm:max-w-[110px] ${isTop1 ? 'text-amber-900' : isTop2 ? 'text-slate-800' : isTop3 ? 'text-orange-900' : 'text-slate-700'}`} title={item.nama}>
                  {item.nama}
                </div>
                <div className="text-[8px] sm:text-[10px] font-bold text-emerald-600 mt-0.5 bg-white/60 px-1 sm:px-1.5 py-0.5 rounded inline-block">
                  {item.total} Pelanggan
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// HALAMAN: OVERVIEW
// ==========================================
function OverviewView({ data, onGoToDatabase }) {
  const [timeFilter, setTimeFilter] = useState('minggu_ini');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [customMonth, setCustomMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [stationFilter, setStationFilter] = useState(''); // Filter Stasiun untuk Overview
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);

  const [trendMode, setTrendMode] = useState('daily');
  const [activeTableTab, setActiveTableTab] = useState('aktivasi');
  const [currentPage, setCurrentPage] = useState(1);

  const [showAktivasiLine, setShowAktivasiLine] = useState(true);
  const [showAverageLine, setShowAverageLine] = useState(true);

  const ITEMS_PER_PAGE = 15;

  const timeOptions = [
    { value: 'semua', label: 'Semua Waktu' },
    { value: 'hari_ini', label: 'Hari Ini' },
    { value: 'kemarin', label: 'Kemarin' },
    { value: 'minggu_ini', label: 'Minggu Ini' },
    { value: 'bulan_ini', label: 'Bulan Ini' },
    { value: 'custom_bulan', label: 'Pilih Bulan...' },
    { value: 'custom_range', label: 'Rentang Tanggal...' }
  ];

  // Daftar stasiun unik
  const uniqueOverviewStations = useMemo(() => {
    if (!data.stationData) return [];
    const rawStations = data.stationData.map(s => s.stasiun).filter(Boolean);
    const properStations = rawStations.map(st => toProperCase(st));
    return [...new Set(properStations)].sort();
  }, [data.stationData]);

  // Reset halaman ke 1 setiap kali tab atau filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, customMonth, startDate, endDate, activeTableTab, stationFilter]);

  // Helper Tanggal & Minggu ISO
  const getLocalDateStr = (d) => {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const getISOWeekNumber = (d) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getWeekDateRange = (year, week) => {
    const d = new Date(year, 0, 4); // Tanggal 4 Jan selalu berada di minggu ke 1
    d.setDate(d.getDate() - (d.getDay() || 7) + 1 + (week - 1) * 7); // Geser ke hari Senin minggu tersebut
    const end = new Date(d);
    end.setDate(end.getDate() + 6); // Hari Minggu di minggu tersebut

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  };

  // 1. FILTER DATA BERDASARKAN WAKTU & STASIUN
  const { aktivasiList, outstandingList, filterRangeStr, startDateStr, endDateStr } = useMemo(() => {
    if (!data.pelangganData) return { aktivasiList: [], outstandingList: [], filterRangeStr: '', startDateStr: '', endDateStr: '' };

    let start = '', end = '', rangeStr = '';
    const t = new Date();

    if (timeFilter === 'semua') {
      start = '';
      end = '';
      rangeStr = 'Semua Waktu';
    } else if (timeFilter === 'hari_ini') {
      start = end = getLocalDateStr(t);
      rangeStr = 'Hari Ini';
    } else if (timeFilter === 'kemarin') {
      t.setDate(t.getDate() - 1);
      start = end = getLocalDateStr(t);
      rangeStr = 'Kemarin';
    } else if (timeFilter === 'minggu_ini') {
      const day = t.getDay();
      const diff = t.getDate() - day + (day === 0 ? -6 : 1);
      const firstDay = new Date(t.setDate(diff));
      start = getLocalDateStr(firstDay);
      end = getLocalDateStr(new Date(firstDay.valueOf() + 6 * 86400000));
      rangeStr = 'Minggu Ini';
    } else if (timeFilter === 'bulan_ini') {
      start = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-01';
      end = getLocalDateStr(new Date(t.getFullYear(), t.getMonth() + 1, 0));
      rangeStr = 'Bulan Ini';
    } else if (timeFilter === 'custom_bulan' && customMonth) {
      start = customMonth + '-01';
      const [y, m] = customMonth.split('-');
      end = getLocalDateStr(new Date(y, m, 0));
      rangeStr = `Bulan ${customMonth}`;
    } else if (timeFilter === 'custom_range') {
      start = startDate;
      end = endDate || '2099-12-31'; // jika end kosong, anggap tak terbatas
      rangeStr = `Rentang: ${startDate || '?'} s/d ${endDate || '?'}`;
    }

    const actList = [];
    const outList = [];

    data.pelangganData.forEach(item => {
      // Cek kecocokan Stasiun (Abaikan Case Sensitive)
      const isStationMatch = stationFilter === '' || String(item.stasiun || '').toLowerCase().trim() === String(stationFilter).toLowerCase().trim();
      if (!isStationMatch) return; // Lewati jika tidak cocok

      const status = getGlobalStatusStr(item);

      if (status.includes('AKTIF') || status === 'DONE') {
        const tAkt = standardizeDate(item.tglAktivasi);
        let inRange = true;
        if (start && end) inRange = tAkt >= start && tAkt <= end;
        if (inRange) actList.push(item);
      }
      else if (status === 'WAITING') {
        // Outstanding data TIDAK DIFILTER BERDASARKAN RENTANG WAKTU.
        // Karena data antrean (Waiting) merepresentasikan kondisi saat ini secara real-time.
        outList.push(item);
      }
    });

    // Urutkan
    actList.sort((a, b) => {
      const dA = a.tglAktivasi || ''; const dB = b.tglAktivasi || '';
      return dB.localeCompare(dA);
    });
    outList.sort((a, b) => {
      // Jika ada tanggal input/IKR, urutkan dari yg terlama menunggu
      const dA = a.tglIkr || ''; const dB = b.tglIkr || '';
      return dA.localeCompare(dB);
    });

    return { aktivasiList: actList, outstandingList: outList, filterRangeStr: rangeStr, startDateStr: start, endDateStr: end };
  }, [data.pelangganData, timeFilter, customMonth, startDate, endDate, stationFilter]);

  // --- LOGIKA TINGKAT KESULITAN DINAMIS (UPDATED: WEIGHTED AVERAGE) ---
  const difficultyStats = useMemo(() => {
    let rendah = 0, sedang = 0, tinggi = 0;

    // Iterasi aktivasiList yang sudah difilter sesuai rentang waktu & stasiun
    aktivasiList.forEach(item => {
      let strPrecon = String(item.kabelPrecon || '0').toLowerCase();
      let totalMeters = 0;

      let nums = strPrecon.match(/\d+/g);
      if (nums) {
        let vals = nums.map(Number).filter(n => n >= 10);
        if (vals.length > 0) {
          totalMeters = vals.reduce((a, b) => a + b, 0);
        }
      }

      if (totalMeters <= 100) rendah++;
      else if (totalMeters <= 150) sedang++;
      else tinggi++;
    });

    let dominant = "Belum ada progres";
    let color = "text-slate-400";
    let bg = "bg-slate-100";
    let icon = "minus";
    let averageScore = 0;

    if (aktivasiList.length > 0) {
      // Pendekatan Rata-Rata Terbobot (Weighted Average)
      // Rendah = 1 point, Sedang = 2 point, Tinggi = 3 point
      const totalAktivasi = rendah + sedang + tinggi;
      const totalScore = (rendah * 1) + (sedang * 2) + (tinggi * 3);
      averageScore = totalAktivasi > 0 ? (totalScore / totalAktivasi) : 0;

      if (averageScore > 2.3) {
        dominant = "Tinggi"; color = "text-rose-600"; bg = "bg-rose-50"; icon = "alert-octagon";
      } else if (averageScore >= 1.7) {
        dominant = "Sedang"; color = "text-amber-600"; bg = "bg-amber-50"; icon = "activity";
      } else {
        dominant = "Rendah"; color = "text-emerald-600"; bg = "bg-emerald-50"; icon = "check-circle";
      }
    }

    return { rendah, sedang, tinggi, dominant, color, bg, icon, averageScore };
  }, [aktivasiList]);

  // 2. KALKULASI DATA TREND PINTAR (Mode Harian, Mingguan, Bulanan)
  const trendData = useMemo(() => {
    if (!aktivasiList) return [];
    const map = {};

    // Jika mode harian dan kita punya rentang tanggal, pre-populate dengan nilai 0
    // agar grafik berbentuk garis bersambung (terutama untuk "Minggu Ini" atau "Bulan Ini")
    if (trendMode === 'daily' && startDateStr && endDateStr) {
      let current = new Date(startDateStr);
      const end = new Date(endDateStr);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let limit = 0;
      while (current <= end && limit < 366) { // Batasi max 1 tahun biar tidak crash
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        const label = `${d}/${m}/${y}`;

        // Masa depan di-set null agar garis tidak anjlok ke angka 0
        const isFuture = current > today;
        map[key] = { key, label, aktivasi: isFuture ? null : 0, dateRange: null };

        current.setDate(current.getDate() + 1);
        limit++;
      }
    }

    aktivasiList.forEach(item => {
      let dateStr = standardizeDate(item.tglAktivasi);
      if (!dateStr) return; // Abaikan jika tidak ada valid date

      let key = '';
      let dateRangeStr = null;
      let label = '';

      // Pemetaan Sumbu-X
      if (trendMode === 'yearly') {
        key = dateStr.substring(0, 4); // YYYY
        label = key;
      } else if (trendMode === 'monthly') {
        key = dateStr.substring(0, 7); // YYYY-MM
        const [y, m] = key.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        label = `${months[parseInt(m) - 1]} ${y}`;
      } else if (trendMode === 'weekly') {
        const d = new Date(dateStr);
        const weekNum = getISOWeekNumber(d);
        const year = d.getFullYear();
        key = `${year} - W${weekNum.toString().padStart(2, '0')}`;
        dateRangeStr = getWeekDateRange(year, weekNum);
        label = key;
      } else if (trendMode === 'daily') {
        key = dateStr.substring(0, 10); // YYYY-MM-DD
        const [y, m, d] = key.split('-');
        label = `${d}/${m}/${y}`;
      }

      if (!map[key]) {
        map[key] = { key, label, aktivasi: 0, dateRange: dateRangeStr };
      }

      map[key].aktivasi++;
    });

    // Urutkan rentang waktu secara kronologis (dari masa lalu ke masa kini)
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, ...rest }) => rest);
  }, [aktivasiList, trendMode, startDateStr, endDateStr]);

  const averageAktivasi = useMemo(() => {
    if (trendData.length === 0) return 0;
    const sum = trendData.reduce((acc, curr) => acc + curr.aktivasi, 0);
    return (sum / trendData.length).toFixed(1);
  }, [trendData]);

  // Menambahkan data rata-rata ke setiap titik untuk dirender sebagai garis di chart
  const finalTrendData = useMemo(() => {
    const avgNum = Number(averageAktivasi);
    return trendData.map(d => ({ ...d, average: avgNum }));
  }, [trendData, averageAktivasi]);

  // Teks dinamis stasiun
  const statStationText = stationFilter ? ` - ${toProperCase(stationFilter)}` : '';

  return (
    <div className="max-w-7xl mx-auto space-y-6 page-enter pb-8">

      {/* HEADER & FILTER */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Icon name="calendar-days" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">Filter Analisis Overview</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Pilih stasiun & rentang waktu</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">

          {/* DROPDOWN FILTER STASIUN */}
          <div className="relative w-full sm:w-48 shrink-0 z-[60]">
            {isStationDropdownOpen && (
              <div className="fixed inset-0 z-[55]" onClick={() => setIsStationDropdownOpen(false)}></div>
            )}
            <div
              onClick={() => { setIsStationDropdownOpen(!isStationDropdownOpen); setIsTimeDropdownOpen(false); }}
              className={`w-full px-3 py-1.5 sm:py-2 bg-slate-50 border ${isStationDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-lg text-xs sm:text-sm font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 relative z-[56] select-none`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon name="map-pin" size={14} className="text-slate-400 shrink-0 sm:w-4 sm:h-4 w-3.5 h-3.5" />
                <span className="truncate">{stationFilter || 'Semua Stasiun'}</span>
              </div>
              <Icon name={isStationDropdownOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400 shrink-0 ml-2 sm:w-4 sm:h-4 w-3.5 h-3.5" />
            </div>

            {isStationDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[60] animate-dropdown overflow-y-auto max-h-48">
                <div
                  onClick={() => { setStationFilter(''); setIsStationDropdownOpen(false); }}
                  className={`px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${stationFilter === '' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                >
                  Semua Stasiun
                  {stationFilter === '' && <Icon name="check" size={14} className="ml-auto sm:w-4 sm:h-4 w-3.5 h-3.5" />}
                </div>
                {uniqueOverviewStations.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => { setStationFilter(st); setIsStationDropdownOpen(false); }}
                    className={`px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${stationFilter === st ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                  >
                    {st}
                    {stationFilter === st && <Icon name="check" size={14} className="ml-auto sm:w-4 sm:h-4 w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DROPDOWN FILTER WAKTU KUSTOM (BERANIMASI) */}
          <div className="relative w-full sm:w-48 shrink-0 z-[50]">
            {isTimeDropdownOpen && (
              <div className="fixed inset-0 z-[45]" onClick={() => setIsTimeDropdownOpen(false)}></div>
            )}
            <div
              onClick={() => { setIsTimeDropdownOpen(!isTimeDropdownOpen); setIsStationDropdownOpen(false); }}
              className={`w-full px-3 py-1.5 sm:py-2 bg-slate-50 border ${isTimeDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-lg text-xs sm:text-sm font-semibold text-slate-700 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 relative z-[46] select-none`}
            >
              <span className="truncate">{timeOptions.find(o => o.value === timeFilter)?.label}</span>
              <Icon name={isTimeDropdownOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400 shrink-0 ml-2 sm:w-4 sm:h-4 w-3.5 h-3.5" />
            </div>

            {isTimeDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[50] animate-dropdown overflow-y-auto max-h-48">
                {timeOptions.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => { setTimeFilter(opt.value); setIsTimeDropdownOpen(false); }}
                    className={`px-4 py-2 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${timeFilter === opt.value ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                  >
                    {opt.label}
                    {timeFilter === opt.value && <Icon name="check" size={14} className="ml-auto sm:w-4 sm:h-4 w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {timeFilter === 'custom_bulan' && (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors z-[40]"
            />
          )}

          {timeFilter === 'custom_range' && (
            <div className="flex items-center gap-2 w-full sm:w-auto z-[40]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="text-slate-400 text-sm">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW - BERUBAH MENJADI 4 KOLOM DENGAN TINGKAT KESULITAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
        <StatCard title={`Total Aktivasi Selesai (${filterRangeStr})${statStationText}`} value={aktivasiList.length} icon="check-circle" bg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title={`Total Outstanding (Saat Ini)${statStationText}`} value={outstandingList.length} icon="clock" bg="bg-amber-50" iconColor="text-amber-600" onClick={() => onGoToDatabase && onGoToDatabase('WAITING', stationFilter)} />
        <StatCard title={`Rata-rata Aktivasi / ${trendMode === 'daily' ? 'Hari' : trendMode === 'monthly' ? 'Bulan' : trendMode === 'weekly' ? 'Minggu' : 'Tahun'}${statStationText}`} value={averageAktivasi} icon="trending-up" bg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard
          title={`Tingkat Kesulitan`}
          infoTooltip={
            <div className="space-y-1 text-left">
              <p className="font-bold text-blue-300 mb-1.5 border-b border-slate-600 pb-1.5 text-xs">Sistem Rata-Rata Terbobot:</p>
              <p className="text-slate-300 mb-2 leading-relaxed">Dihitung dari rata-rata beban tarikan kabel harian (Rendah=1, Sedang=2, Tinggi=3).</p>
              <p><span className="text-emerald-400 font-bold inline-block w-12">Rendah:</span> &le; 100m</p>
              <p><span className="text-amber-400 font-bold inline-block w-12">Sedang:</span> &gt; 100m - 150m</p>
              <p><span className="text-rose-400 font-bold inline-block w-12">Tinggi:</span> &gt; 150m</p>
            </div>
          }
          value={
            difficultyStats.dominant === "Belum ada progres"
              ? <span className="text-[10px] sm:text-sm font-semibold text-slate-400">{difficultyStats.dominant}</span>
              : <span>{difficultyStats.dominant} <span className="text-[10px] sm:text-lg font-semibold text-slate-400 ml-1">/ {difficultyStats.averageScore.toFixed(1)}</span></span>
          }
          icon={difficultyStats.icon}
          bg={difficultyStats.bg}
          iconColor={difficultyStats.color}
        />
      </div>

      {/* TREND CHART */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-[320px] sm:h-[400px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2 mb-2">
              <Icon name="trending-up" className="text-blue-500 sm:w-5 sm:h-5 w-4 h-4" size={20} />
              Trend Performa Aktivasi Keseluruhan
            </h2>
            {/* CUSTOM LEGEND: Aktivasi & Average */}
            <div className="flex items-center gap-6 mt-1">
              <div
                className="flex items-center cursor-pointer group"
                onClick={() => setShowAktivasiLine(!showAktivasiLine)}
              >
                <div className={`w-3 h-3 rounded-full mr-2 transition-all ${showAktivasiLine ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                <span className={`text-sm font-medium select-none transition-colors ${showAktivasiLine ? 'text-slate-700 group-hover:text-blue-600' : 'text-slate-400 line-through'}`}>Aktivasi</span>
              </div>
              <div
                className="flex items-center cursor-pointer group"
                onClick={() => setShowAverageLine(!showAverageLine)}
              >
                <div className={`w-4 border-t-2 border-dashed mr-2 transition-all ${showAverageLine ? 'border-slate-500' : 'border-slate-300'}`}></div>
                <span className={`text-sm font-medium select-none transition-colors ${showAverageLine ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-400 line-through'}`}>Average</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:flex bg-slate-100 p-1 rounded-lg shrink-0 overflow-x-auto custom-scrollbar w-full sm:w-auto gap-1 sm:gap-0">
            <button onClick={() => setTrendMode('daily')} className={`px-1 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center ${trendMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Harian</button>
            <button onClick={() => setTrendMode('weekly')} className={`px-1 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center ${trendMode === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mingguan</button>
            <button onClick={() => setTrendMode('monthly')} className={`px-1 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center ${trendMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Bulanan</button>
            <button onClick={() => setTrendMode('yearly')} className={`px-1 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center ${trendMode === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tahunan</button>
          </div>
        </div>

        <div className="flex-1 w-full h-full">
          {finalTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={150} debounce={50}>
              <LineChart data={finalTrendData} margin={{ top: 25, right: window.innerWidth < 640 ? 15 : 30, left: window.innerWidth < 640 ? -25 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: window.innerWidth < 640 ? 8 : 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: window.innerWidth < 640 ? 9 : 12 }} width={window.innerWidth < 640 ? 25 : 40} />
                <Tooltip content={<CustomTrendTooltip />} />

                {/* GARIS AVERAGE */}
                {showAverageLine && (
                  <Line
                    type="monotone"
                    dataKey="average"
                    name="Average"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* GARIS AKTIVASI */}
                {showAktivasiLine && (
                  <Line
                    type="monotone"
                    dataKey="aktivasi"
                    name="Aktivasi Selesai"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Icon name="bar-chart-2" size={40} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">Data trend belum tersedia</p>
            </div>
          )}
        </div>
      </div>

      {/* --- KALENDER AKTIVASI PER STASIUN (WADU S/D KRENGSENG) --- */}
      <ActivationCalendarTable pelangganData={data.pelangganData} onGoToDatabase={onGoToDatabase} />

      {/* --- MENAMPILKAN PAPAN PERINGKAT DI SINI --- */}
      <OfficerAchievementBoard data={aktivasiList} />

      {/* TABEL DATA (AKTIVASI & OUTSTANDING) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTableTab('aktivasi')}
            className={`flex-1 py-3 sm:py-4 text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors ${activeTableTab === 'aktivasi' ? 'bg-blue-50/50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Icon name="check-circle" size={16} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> Data Aktivasi
          </button>
          <button
            onClick={() => setActiveTableTab('outstanding')}
            className={`flex-1 py-3 sm:py-4 text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors ${activeTableTab === 'outstanding' ? 'bg-amber-50/50 text-amber-700 border-b-2 border-amber-500' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Icon name="clock" size={16} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> Data Outstanding
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-[10px] sm:text-sm text-left whitespace-nowrap min-w-[700px] sm:min-w-0">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[8px] sm:text-xs">
              <tr>
                <th className="px-3 py-2.5 sm:px-6 sm:py-4">ID PELANGGAN</th>
                <th className="px-3 py-2.5 sm:px-6 sm:py-4">NAMA PELANGGAN</th>
                <th className="px-3 py-2.5 sm:px-6 sm:py-4">STASIUN</th>
                {activeTableTab === 'aktivasi' && <th className="px-3 py-2.5 sm:px-6 sm:py-4">TANGGAL AKTIVASI</th>}
                {activeTableTab === 'aktivasi' && <th className="px-3 py-2.5 sm:px-6 sm:py-4 text-center">KABEL</th>}
                {activeTableTab === 'aktivasi' && <th className="px-3 py-2.5 sm:px-6 sm:py-4">PETUGAS</th>}
                <th className="px-3 py-2.5 sm:px-6 sm:py-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const currentListData = activeTableTab === 'aktivasi' ? aktivasiList : outstandingList;
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const paginatedData = currentListData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                if (paginatedData.length === 0) {
                  return (
                    <tr>
                      <td colSpan={activeTableTab === 'aktivasi' ? "7" : "4"} className="px-6 py-12 text-center text-slate-400">
                        <p className="font-medium">Tidak ada data untuk rentang waktu/stasiun ini.</p>
                      </td>
                    </tr>
                  );
                }

                return paginatedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 sm:px-6 sm:py-3 font-semibold text-slate-700">{item.idPelanggan || '-'}</td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-3 font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]" title={item.namaPelanggan}>{item.namaPelanggan || 'Tanpa Nama'}</td>
                    <td className="px-3 py-2.5 sm:px-6 sm:py-3 text-slate-600 font-medium">{toProperCase(item.stasiun) || '-'}</td>

                    {activeTableTab === 'aktivasi' && (
                      <>
                        <td className="px-3 py-2.5 sm:px-6 sm:py-3 text-slate-500">
                          {item.tglAktivasi ? String(item.tglAktivasi).split('T')[0] : '-'}
                        </td>
                        <td className="px-3 py-2.5 sm:px-6 sm:py-3 text-center">
                          {(() => {
                            let strPrecon = String(item.kabelPrecon || '0').toLowerCase();
                            let totalMeters = 0;
                            let nums = strPrecon.match(/\d+/g);
                            if (nums) {
                              let vals = nums.map(Number).filter(n => n >= 10);
                              if (vals.length > 0) {
                                totalMeters = vals.reduce((a, b) => a + b, 0);
                              }
                            }
                            return totalMeters > 0 ? (
                              <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-slate-100 text-slate-600 rounded text-[9px] sm:text-xs font-bold border border-slate-200">
                                {totalMeters}m
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 sm:px-6 sm:py-3">
                          <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-xs font-bold bg-blue-50 text-blue-700">
                            {item.petugasAktivasi || '-'}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="px-3 py-2.5 sm:px-6 sm:py-3">
                      {activeTableTab === 'aktivasi' ? (
                        <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                          AKTIF
                        </span>
                      ) : (
                        <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                          WAITING
                        </span>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* PAGINATION UI */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-sm text-slate-500 gap-2 sm:gap-0">
          {(() => {
            const currentListData = activeTableTab === 'aktivasi' ? aktivasiList : outstandingList;
            const totalPages = Math.ceil(currentListData.length / ITEMS_PER_PAGE);
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

            return (
              <>
                <span>Menampilkan {currentListData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + ITEMS_PER_PAGE, currentListData.length)} dari {currentListData.length} data</span>
                <div className="flex gap-1 items-center">
                  <span className="mr-2 sm:mr-4 text-[9px] sm:text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200">
                    Hal {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 sm:px-3 py-1 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 sm:px-3 py-1 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

    </div>
  );
}


// ==========================================
// SKELETON LOADING KOMPONEN DASHBOARD
// ==========================================
function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 page-enter pb-16 lg:pb-8 animate-pulse">
      {/* Top Bar Desktop Skeleton */}
      <div className="hidden lg:flex justify-end mb-2">
        <div className="bg-slate-200 h-10 w-48 rounded-xl"></div>
      </div>

      {/* Mobile Welcome Banner Skeleton */}
      <div className="lg:hidden bg-gradient-to-br from-blue-700 to-[#1e3a8a] rounded-xl p-4 h-24 relative overflow-hidden flex flex-col justify-between">
        <div className="h-4 w-48 bg-white/20 rounded mb-2"></div>
        <div className="h-3 w-32 bg-white/10 rounded"></div>
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="space-y-2 flex-1 mr-2">
              <div className="h-3 w-20 sm:w-24 bg-slate-200 rounded"></div>
              <div className="h-6 sm:h-8 w-12 sm:w-16 bg-slate-300 rounded-md"></div>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 shrink-0"></div>
          </div>
        ))}
      </div>

      {/* Registrasi Pelanggan Skeleton */}
      <div className="bg-white p-3.5 sm:p-4 lg:p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
            <div className="space-y-1.5">
              <div className="h-4 w-44 bg-slate-200 rounded"></div>
              <div className="h-3 w-28 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="h-7 w-20 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="h-10 bg-slate-100 rounded-lg flex items-center justify-between px-3">
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
              <div className="h-4 w-6 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 Kolom Raihan & Report Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-100 shadow-sm space-y-4 h-80">
          <div className="h-4 w-52 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map(j => (
              <div key={j} className="h-8 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-100 shadow-sm space-y-4 h-80">
          <div className="h-4 w-48 bg-slate-200 rounded"></div>
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
            <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
            <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map(k => (
              <div key={k} className="h-8 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HALAMAN 1: DASHBOARD OVERVIEW
// ==========================================
function DashboardView({ data, isSyncing }) {
  const safeStationData = data.stationData || [];

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDate]);

  // --- TOTAL PELANGGAN AKTIF ---
  const totalPelangganAktif = useMemo(() => {
    return (data.pelangganData || []).filter(p => {
      const ikr = String(p.status_ikr || p.ikr || '').toUpperCase();
      return ikr === 'SUDAH' || ikr.includes('DISMANTLE');
    }).length;
  }, [data.pelangganData]);

  // --- LIST KENDALA ---
  const kendalaList = useMemo(() => {
    // Gunakan HANYA dari sumber data kendala sheet (BI6:BN) sesuai permintaan
    if (data.dataKendalaSheet && data.dataKendalaSheet.length > 0) {
      return data.dataKendalaSheet.filter(item => {
        const itemDate = standardizeDate(item.tanggalKendala || item.timestampKendala || item.tglAktivasi || item.timestampAktivasi || item.tanggal || item.timestamp || item.waktuLapor);
        return itemDate === selectedDate;
      }).map(item => {
        let issue = item.issueKendala || '';
        if (!issue || issue.includes('GMT+') || issue.includes('Waktu Indonesia')) {
          const matched = (data.pelangganData || []).find(p => String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase() === String(item.idPelanggan || '').trim().toUpperCase());
          if (matched) {
            issue = matched.issueKendala || matched.issue_kendala || matched.catatan || matched.keluhan || '';
          }
        }
        return {
          ...item,
          extractedIssue: issue,
          extractedReporter: item.reporterKendala || ''
        };
      });
    }

    // Fallback jika tidak ada dataKendalaSheet
    return (data.pelangganData || []).filter(item => {
      const isGlobalKendala = getGlobalStatusStr(item) === 'KENDALA';
      const itemDate = standardizeDate(item.tanggalKendala || item.timestampKendala || item.tglAktivasi || item.timestampAktivasi || item.tanggal || item.timestamp || item.waktuLapor);
      return isGlobalKendala && itemDate === selectedDate;
    }).map(item => {
      const { issue, reporter } = extractKendalaData(item);
      return { ...item, extractedIssue: issue, extractedReporter: reporter };
    });
  }, [data.dataKendalaSheet, data.pelangganData, selectedDate]);

  const totalKendalaHarian = kendalaList.length;

  // --- LIST VISIT / GANGGUAN ---
  const visitList = useMemo(() => {
    const raw = (data.visitData || []).filter(item => {
      const itemDate = standardizeDate(item.timestamp);
      return itemDate === selectedDate;
    });
    return deduplicateVisitData(raw);
  }, [data.visitData, selectedDate]);

  const totalVisitHarian = visitList.length;

  // --- STATS HARIAN ---
  const dailyStats = useMemo(() => {
    let aktivasi = 0;
    let ikr = 0;

    (data.pelangganData || []).forEach(row => {
      const tAkt = standardizeDate(row.tglAktivasi);
      if (tAkt === selectedDate && String(row.aktivasi || '').toLowerCase().includes('sudah')) aktivasi++;

      const tIkr = standardizeDate(row.tglIkr);
      if (tIkr === selectedDate) ikr++;
    });

    return { aktivasi, ikr };
  }, [data.pelangganData, selectedDate]);

  // --- STASIUN DINAMIS ---
  const dynamicStationData = useMemo(() => {
    const stationAktifTodayMap = {};
    const stationTotalAktivasiMap = {};
    const stationHcAktifMap = {};
    const stationNamesSet = new Set();

    (data.pelangganData || []).forEach(p => {
      const rawSt = String(p.stasiun || '').trim();
      if (!rawSt) return;
      const stKey = rawSt.toLowerCase();
      stationNamesSet.add(rawSt);

      const ikr = String(p.ikr || p.status_ikr || '').toLowerCase();
      const akt = String(p.aktivasi || p.status_aktivasi || '').toLowerCase();

      // Total Aktivasi (Sudah / Aktif / Dismantle / Ready to Dismantle)
      if (akt.includes('sudah') || akt.includes('aktif') || akt.includes('dismantle') || ikr.includes('sudah')) {
        stationTotalAktivasiMap[stKey] = (stationTotalAktivasiMap[stKey] || 0) + 1;
      }

      // HC Aktif (Sudah / Aktif)
      if (akt.includes('sudah') || akt === 'aktif') {
        stationHcAktifMap[stKey] = (stationHcAktifMap[stKey] || 0) + 1;
      }

      // Aktivasi Hari Ini (pada selectedDate)
      const tAkt = standardizeDate(p.tglAktivasi);
      if (tAkt === selectedDate && (akt.includes('sudah') || akt === 'aktif')) {
        stationAktifTodayMap[stKey] = (stationAktifTodayMap[stKey] || 0) + 1;
      }
    });

    const defaultStations = ['Brumbung', 'Wadu', 'Kradenan', 'Sulur', 'Randublatung', 'Alastua', 'Krengseng', 'Weleri', 'Kaliwungu', 'Kalibodri', 'Tawang'];
    let baseStations = safeStationData;
    const hasSheetData = baseStations && baseStations.length > 0;

    if (!hasSheetData) {
      const setList = Array.from(stationNamesSet);
      const combined = Array.from(new Set([...setList, ...defaultStations]));
      baseStations = combined.map(st => ({ stasiun: st }));
    }

    return baseStations.map(station => {
      const stKey = String(station.stasiun || '').toLowerCase();
      const aktifPadaTanggalIni = stationAktifTodayMap[stKey] || 0;
      const rawHpPercepatan = station.hpPercepatan !== undefined ? station.hpPercepatan : station.aktifHariIni;

      const totalFromSheet = Number(station.totalAktivasiHc || station.aktivasiReguler || 0);
      const totalFromPelanggan = stationTotalAktivasiMap[stKey] || 0;
      const totAkt = hasSheetData ? totalFromSheet : totalFromPelanggan;

      const hcFromSheet = Number(station.hcAktif || station.hcAktifReguler || 0);
      const hcFromPelanggan = stationHcAktifMap[stKey] || 0;
      const hcAkt = hasSheetData ? hcFromSheet : hcFromPelanggan;

      return {
        ...station,
        totalAktivasiHc: totAkt,
        hcAktif: hcAkt,
        hpPercepatanVal: Number(rawHpPercepatan || 0),
        aktifHariIniVal: Number(aktifPadaTanggalIni || 0),
      };
    });
  }, [safeStationData, data.pelangganData, selectedDate]);

  const totalAktivasiHarian = useMemo(() => {
    const fromChart = dynamicStationData.reduce((acc, curr) => acc + (Number(curr.aktifHariIniVal) || 0), 0);
    return Math.max(fromChart, dailyStats.aktivasi);
  }, [dynamicStationData, dailyStats.aktivasi]);

  // --- HITUNG DYNAMIC TOTAL SUMMARY UNTUK BARIS BAWAH TABEL ---
  const totals = useMemo(() => {
    let totalHpReguler = 0;
    let totalHpPercepatan = 0;
    let totalAktivasiReguler = 0;
    let totalAktivasiPercepatan = 0;
    let totalHcAktifReguler = 0;
    let totalHcAktifPercepatan = 0;
    let totalAktifHariIni = 0;
    let totalAktivasiHc = 0;

    dynamicStationData.forEach(row => {
      const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
      const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);

      const aktReg = row.aktivasiReguler !== undefined ? Number(row.aktivasiReguler) : Number(row.totalAktivasiHc || 0);
      const aktPerc = row.aktivasiPercepatan !== undefined ? Number(row.aktivasiPercepatan) : Number(row.hcAktif || 0);

      const hcAktReg = row.hcAktifReguler !== undefined ? Number(row.hcAktifReguler) : Number(row.performaHc || 0);
      const hcAktPerc = row.hcAktifPercepatan !== undefined ? Number(row.hcAktifPercepatan) : Number(row.tieringHc || 0);

      const totAkt = aktReg + aktPerc;
      const aktToday = Number(row.aktifHariIniVal || 0);

      totalHpReguler += hpReg;
      totalHpPercepatan += hpPerc;
      totalAktivasiReguler += aktReg;
      totalAktivasiPercepatan += aktPerc;
      totalHcAktifReguler += hcAktReg;
      totalHcAktifPercepatan += hcAktPerc;
      totalAktifHariIni += aktToday;
      totalAktivasiHc += totAkt;
    });

    const totalHpTerbangun = totalHpReguler + totalHpPercepatan;
    const totalHcAktif = totalHcAktifReguler + totalHcAktifPercepatan;
    const totalPerforma = totalHpTerbangun > 0
      ? ((totalAktivasiHc / totalHpTerbangun) * 100).toFixed(2)
      : "0.00";
    const performaReguler = totalHpReguler > 0
      ? ((totalAktivasiReguler / totalHpReguler) * 100).toFixed(2)
      : "0.00";
    const performaPercepatan = totalHpPercepatan > 0
      ? ((totalAktivasiPercepatan / totalHpPercepatan) * 100).toFixed(2)
      : "0.00";

    return {
      hpReguler: totalHpReguler,
      hpPercepatan: totalHpPercepatan,
      hpTerbangun: totalHpTerbangun,
      aktivasiReguler: totalAktivasiReguler,
      aktivasiPercepatan: totalAktivasiPercepatan,
      hcAktifReguler: totalHcAktifReguler,
      hcAktifPercepatan: totalHcAktifPercepatan,
      aktifHariIni: totalAktifHariIni,
      totalAktivasiHc: totalAktivasiHc,
      hcAktif: totalHcAktif,
      performaHc: totalPerforma,
      performaReguler: performaReguler,
      performaPercepatan: performaPercepatan
    };
  }, [dynamicStationData]);

  // =========================================================================
  // --- STATS REGISTRASI HARIAN PER STASIUN ---
  // =========================================================================
  const registrasiPerStasiun = useMemo(() => {
    const stats = {};
    const defaultStations = ['Brumbung', 'Wadu', 'Kradenan', 'Sulur', 'Randublatung', 'Alastua', 'Krengseng', 'Weleri', 'Kaliwungu', 'Kalibodri', 'Tawang'];
    const stationList = safeStationData.length > 0 ? safeStationData : defaultStations.map(s => ({ stasiun: s }));

    stationList.forEach(st => {
      if (st.stasiun) stats[String(st.stasiun).toLowerCase()] = 0;
    });

    const parts = selectedDate.split('-');
    const targetDateIndo = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const targetDateIntl = selectedDate;

    (data.dataRegistrasi || []).forEach(reg => {
      const valStr = String(reg.tanggal || reg.tanggalRegistrasi || '');
      if (valStr.includes(targetDateIndo) || valStr.includes(targetDateIntl)) {
        const st = String(reg.stasiun || '').toLowerCase();
        if (stats[st] !== undefined) {
          stats[st] += 1;
        } else {
          stats[st] = 1;
        }
      }
    });

    return Object.keys(stats).sort().map(key => ({
      stasiun: key,
      total: stats[key]
    }));
  }, [data.dataRegistrasi, safeStationData, selectedDate]);

  const totalRegistrasiHarian = registrasiPerStasiun.reduce((acc, curr) => acc + curr.total, 0);

  // --- STATE MODAL ---
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showKendalaModal, setShowKendalaModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  // STATE BARU: Menyimpan nama stasiun yang diklik (bukan true/false lagi)
  const [selectedRegStation, setSelectedRegStation] = useState(null);
  const [selectedPoStation, setSelectedPoStation] = useState(null);

  useEffect(() => {
    // Kunci scroll layar ketika salah satu modal terbuka
    if (showDiscrepancyModal || showKendalaModal || showVisitModal || selectedRegStation || selectedPoStation) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showDiscrepancyModal, showKendalaModal, showVisitModal, selectedRegStation, selectedPoStation]);

  // --- LIST DAFTAR REGISTRASI UNTUK POP-UP (DIFILTER BERDASARKAN STASIUN YANG DIKLIK) ---
  const registrasiList = useMemo(() => {
    if (!selectedRegStation) return []; // Jangan proses jika modal tidak terbuka

    const parts = selectedDate.split('-');
    const targetDateIndo = `${parts[2]}/${parts[1]}/${parts[0]}`;
    const targetDateIntl = selectedDate;

    return (data.dataRegistrasi || []).filter(reg => {
      const valStr = String(reg.tanggal || reg.tanggalRegistrasi || '');
      const matchDate = valStr.includes(targetDateIndo) || valStr.includes(targetDateIntl);
      const matchStation = String(reg.stasiun || '').toLowerCase() === String(selectedRegStation).toLowerCase();

      return matchDate && matchStation;
    });
  }, [data.dataRegistrasi, selectedDate, selectedRegStation]);

  // --- LIST DAFTAR DETAIL PO UNTUK POP-UP PER STASIUN ---
  const detailPoList = useMemo(() => {
    if (!selectedPoStation) return [];
    return (data.detailPoData || []).filter(po =>
      String(po.stasiun || '').toLowerCase().trim() === String(selectedPoStation).toLowerCase().trim()
    );
  }, [data.detailPoData, selectedPoStation]);


  // --- LOGIKA SELISIH ---
  const discrepancyList = useMemo(() => {
    return (data.pelangganData || [])
      .map(row => {
        const tIkr = standardizeDate(row.tglIkr);
        const tAkt = standardizeDate(row.tglAktivasi);

        const isIkrSelected = tIkr === selectedDate;
        const isAktSelected = tAkt === selectedDate;

        if (isIkrSelected && !isAktSelected) {
          return { ...row, discrepancyType: 'BELUM REPORT AKTIVASI' };
        } else if (isAktSelected && !isIkrSelected) {
          return { ...row, discrepancyType: 'AKTIVASI KENDALA KEMARIN' };
        }
        return null;
      })
      .filter(row => row !== null);
  }, [data.pelangganData, selectedDate]);

  // --- FILTER RIWAYAT ---
  const [historyFilter, setHistoryFilter] = useState('');
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);

  const uniqueHistoryStations = useMemo(() => {
    if (!data.stationData) return [];
    const rawStations = data.stationData.map(s => s.stasiun).filter(Boolean);
    const properStations = rawStations.map(st => toProperCase(st));
    return [...new Set(properStations)].sort();
  }, [data.stationData]);

  const historyAktivasi = useMemo(() => {
    return (data.pelangganData || [])
      .filter(row => {
        const tAkt = standardizeDate(row.tglAktivasi);
        const isSelectedDay = tAkt === selectedDate && String(row.aktivasi || '').toLowerCase().includes('sudah');
        const isStationMatch = historyFilter === '' || String(row.stasiun || '').toLowerCase().trim() === String(historyFilter).toLowerCase().trim();
        return isSelectedDay && isStationMatch;
      })
      .map(row => {
        let jam = "00:00";
        const tsStr = String(row.timestampAktivasi || row.tglAktivasi || "");
        const timeMatch = tsStr.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

        if (timeMatch) {
          jam = timeMatch[0];
        } else if (tsStr.includes('T')) {
          jam = tsStr.split('T')[1].substring(0, 5);
        }

        return { ...row, time: jam };
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [data.pelangganData, historyFilter, selectedDate]);

  const [petugasMode, setPetugasMode] = useState('aktivasi');

  // --- CHART PETUGAS ---
  const chartPetugasData = useMemo(() => {
    const map = {};

    if (petugasMode === 'kendala') {
      kendalaList.forEach(row => {
        const stasiun = row.stasiun || 'Tanpa Stasiun';
        const pKendala = row.extractedReporter || row.reporterKendala || 'Sistem';
        if (!map[pKendala]) map[pKendala] = { nama: pKendala, stasiun: stasiun, kendala: 0 };
        map[pKendala].kendala += 1;
      });
    } else {
      (data.pelangganData || []).forEach(row => {
        const stasiun = row.stasiun || 'Tanpa Stasiun';

        if (petugasMode === 'aktivasi') {
          const pAkt = row.petugasAktivasi;
          const tAkt = standardizeDate(row.tglAktivasi);
          if (pAkt && tAkt === selectedDate && String(row.aktivasi || '').toLowerCase().includes('sudah')) {
            if (!map[pAkt]) map[pAkt] = { nama: pAkt, stasiun: stasiun, aktivasi: 0 };
            map[pAkt].aktivasi += 1;
          }
        } else if (petugasMode === 'ikr') {
          const pIkr = row.petugasIkr;
          const tIkr = standardizeDate(row.tglIkr);
          if (pIkr && tIkr === selectedDate) {
            if (!map[pIkr]) map[pIkr] = { nama: pIkr, stasiun: stasiun, ikr: 0 };
            map[pIkr].ikr += 1;
          }
        }
      });
    }

    return Object.values(map)
      .sort((a, b) => {
        if (petugasMode === 'aktivasi') return b.aktivasi - a.aktivasi;
        if (petugasMode === 'ikr') return b.ikr - a.ikr;
        return b.kendala - a.kendala;
      })
      .map(p => ({
        ...p,
        chartKey: `${p.nama}|${p.stasiun}`
      }));
  }, [data.pelangganData, kendalaList, petugasMode, selectedDate]);

  const maxNameLength = chartPetugasData.reduce((max, p) => Math.max(max, (p.nama || '').length), 0);
  const dynamicYAxisWidth = Math.min(Math.max(90, maxNameLength * 8 + 20), 200);
  const dynamicHeight = Math.max(300, chartPetugasData.length * 45);

  const renderStatValue = (actualValue, variant = 'stat') => {
    if (isSyncing) {
      if (variant === 'compact') {
        return <span className="h-3.5 w-4 bg-slate-200/90 animate-pulse rounded inline-block align-middle"></span>;
      }
      if (variant === 'total') {
        return <span className="h-3.5 w-5 bg-blue-300/80 animate-pulse rounded inline-block align-middle ml-1"></span>;
      }
      return <div className="h-5 sm:h-7 w-9 sm:w-14 bg-slate-200/80 animate-pulse rounded inline-block align-middle"></div>;
    }
    return actualValue;
  };

  const hasData = (data.pelangganData && data.pelangganData.length > 0) || (data.stationData && data.stationData.length > 0) || (data.fastKpi && data.fastKpi.totalAktif > 0);

  if (isSyncing && !hasData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6 page-enter pb-16 lg:pb-8">

      {/* DESKTOP TOP BAR (TANGGAL) - ASLI DESKTOP */}
      <div className="hidden lg:flex justify-end mb-2">
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-pointer">
          <Icon name="calendar" size={16} className="text-blue-600 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* MOBILE ONLY: Welcome Banner Ala mobile.html */}
      <div className="lg:hidden bg-gradient-to-br from-blue-700 to-[#1e3a8a] rounded-xl p-4 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10">
          <h2 className="text-base font-bold mb-0.5 tracking-tight">Selamat Datang di OpsTracker!</h2>
          <p className="text-blue-100 text-[10.5px]">Pantau Operasional Desnarum hari ini.</p>
        </div>
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2">
          <div className="bg-white/15 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-sm text-white w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Icon name="calendar" size={14} className="text-blue-200" />
              <span className="text-[10px] font-bold text-blue-200 sm:hidden">Tanggal:</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[11px] font-bold text-white bg-transparent outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>
        <Icon name="activity" size={110} className="absolute -right-6 -bottom-6 text-white opacity-10 pointer-events-none" />
      </div>

      {/* KPI CARDS (2-COL ON MOBILE, 4-COL ON DESKTOP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
        <StatCard title="Total Aktivasi HC" value={renderStatValue(totalPelangganAktif)} icon="activity" bg="bg-orange-50" iconColor="text-orange-500" infoTooltip="Total seluruh Aktivasi HC dari Dashboard E16." />

        <StatCard title="Aktivasi Harian" value={renderStatValue(totalAktivasiHarian)} icon="check-circle" bg="bg-emerald-50" iconColor="text-emerald-500" infoTooltip={`Total aktivasi pada tanggal ${formattedDate}`} />

        <div
          onClick={() => { if (kendalaList.length > 0 && !isSyncing) setShowKendalaModal(true); }}
          className={kendalaList.length > 0 && !isSyncing ? "cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-95 rounded-xl ring-2 ring-transparent hover:ring-rose-200" : ""}
          title={kendalaList.length > 0 && !isSyncing ? "Klik untuk melihat detail pelanggan yang terkendala" : ""}
        >
          <StatCard title="Kendala Harian" value={renderStatValue(totalKendalaHarian)} icon="alert-triangle" bg="bg-rose-50" iconColor="text-rose-500" infoTooltip={`Total pelanggan yang masih dalam status Kendala`} />
        </div>

        <div
          onClick={() => { if (visitList.length > 0 && !isSyncing) setShowVisitModal(true); }}
          className={visitList.length > 0 && !isSyncing ? "cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-95 rounded-xl ring-2 ring-transparent hover:ring-purple-200" : ""}
          title={visitList.length > 0 && !isSyncing ? "Klik untuk melihat detail tiket visit/gangguan" : ""}
        >
          <StatCard title="Visit / Gangguan" value={renderStatValue(totalVisitHarian)} icon="headset" bg="bg-purple-50" iconColor="text-purple-500" infoTooltip={`Total tiket visit/gangguan pada tanggal ${formattedDate}`} />
        </div>
      </div>

      {/* --- CARD: REGISTRASI PELANGGAN HARI INI --- */}
      <div className="bg-white p-3.5 sm:p-4 lg:p-5 rounded-xl border border-slate-200/80 lg:border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 border-b border-slate-50 pb-2.5 sm:pb-3 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="user-plus" size={16} className="sm:hidden" />
              <span className="hidden sm:inline-flex"><Icon name="user-plus" size={20} /></span>
            </div>
            <div>
              <h3 className="text-[13px] sm:text-[15px] font-bold text-slate-800 tracking-tight leading-snug">Registrasi Pelanggan Hari Ini</h3>
              <p className="text-[9px] sm:text-[11px] text-slate-400">Total pendaftaran (sales) baru pada {formattedDate}</p>
            </div>
          </div>
          <div className="bg-blue-600 text-white px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-bold shadow-sm shadow-blue-500/20 shrink-0 w-full sm:w-auto text-center flex items-center justify-center">
            Total: {renderStatValue(totalRegistrasiHarian, 'total')}
          </div>
        </div>

        {/* Grid Stasiun ala mobile.html */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {registrasiPerStasiun.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (item.total > 0 && !isSyncing) setSelectedRegStation(item.stasiun);
              }}
              className={`flex justify-between items-center border border-slate-100 rounded-lg p-2.5 transition-all group ${item.total > 0 && !isSyncing ? 'bg-white cursor-pointer hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow active:scale-95' : 'bg-slate-50/60 opacity-80'}`}
              title={item.total > 0 && !isSyncing ? `Lihat pendaftar dari stasiun ${toProperCase(item.stasiun)}` : "Belum ada pendaftar"}
            >
              <span className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-wide truncate mr-1.5 ${item.total > 0 ? 'text-slate-700 group-hover:text-blue-700' : 'text-slate-400'}`}>
                {toProperCase(item.stasiun)}
              </span>
              <span className={`text-xs sm:text-base font-black shrink-0 ${item.total > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                {renderStatValue(item.total, 'compact')}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* --- AKHIR CARD REGISTRASI --- */}

      {/* 2 KOLOM: Raihan & Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 items-start">
        {/* RAIHAN AKTIVASI */}
        <div className="bg-white p-3.5 sm:p-5 lg:p-6 rounded-xl border border-slate-200/80 lg:border-slate-100 shadow-sm flex flex-col w-full h-full relative">
          {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div></div>}

          <div className="flex items-center mb-0.5 sm:mb-1 gap-2">
            <Icon name="train" className="text-emerald-500 shrink-0" size={18} />
            <h2 className="text-[13px] sm:text-base lg:text-lg font-bold text-slate-800">Raihan Aktivasi Harian per Stasiun</h2>
          </div>
          <p className="text-slate-400 text-[9.5px] sm:text-xs mb-3.5 sm:mb-6 ml-6 sm:ml-7">Progres aktivasi pada tanggal <span className="font-semibold">{formattedDate}</span></p>
          <div className="w-full flex-1"><TrainChart data={dynamicStationData} /></div>
        </div>

        {/* REPORT PETUGAS */}
        <div className="bg-white p-3.5 sm:p-5 lg:p-6 rounded-xl border border-slate-200/80 lg:border-slate-100 shadow-sm flex flex-col h-full relative">
          {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-xl flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div></div>}

          <div className="flex justify-between items-start mb-2.5 sm:mb-4">
            <div>
              <h2 className="text-[13px] sm:text-base lg:text-lg font-bold text-slate-800">Report Petugas Lapangan</h2>
              <p className="text-slate-400 text-[9.5px] sm:text-xs mt-0.5">Data pekerjaan pada <span className="font-semibold">{formattedDate}</span></p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-3 sm:mb-4">
            {/* Filter Chips Pill */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setPetugasMode('aktivasi')}
                className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-colors border flex items-center ${petugasMode === 'aktivasi' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${petugasMode === 'aktivasi' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                  Aktivasi
                </div>
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${petugasMode === 'aktivasi' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                  {dailyStats.aktivasi}
                </span>
              </button>

              <button
                onClick={() => setPetugasMode('ikr')}
                className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-colors border flex items-center ${petugasMode === 'ikr' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${petugasMode === 'ikr' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  IKR
                </div>
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${petugasMode === 'ikr' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                  {dailyStats.ikr}
                </span>
              </button>

              <button
                onClick={() => setPetugasMode('kendala')}
                className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-colors border flex items-center ${petugasMode === 'kendala' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${petugasMode === 'kendala' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                  Kendala
                </div>
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black ${petugasMode === 'kendala' ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-500'}`}>
                  {totalKendalaHarian}
                </span>
              </button>
            </div>

            {/* Sync Badge */}
            <div className="flex items-center">
              {discrepancyList.length > 0 ? (
                <button
                  onClick={() => setShowDiscrepancyModal(true)}
                  className="text-[9px] font-bold bg-[#fffbeb] text-[#b45309] px-2 py-1 rounded-md border border-[#fcd34d] inline-flex items-center shadow-sm cursor-pointer hover:bg-[#fef3c7] transition-colors group w-max"
                >
                  <Icon name="alert-circle" size={11} className="mr-1 text-[#f59e0b]" />
                  Selisih: {discrepancyList.length} data
                  <Icon name="chevron-right" size={10} className="ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-200 inline-flex items-center shadow-sm w-max">
                  <Icon name="check-circle" size={11} className="mr-1 text-emerald-500" />
                  Semua Data Laporan Sinkron
                </div>
              )}
            </div>
          </div>

          {/* MOBILE LIST LEADERBOARD ALA mobile.html */}
          <div className="lg:hidden space-y-1.5 pt-1">
            {chartPetugasData.length === 0 ? (
              <div className="text-center text-[11px] text-slate-400 py-6">Belum ada data {petugasMode} di tanggal ini.</div>
            ) : (
              chartPetugasData.map((item, idx) => {
                const currentVal = petugasMode === 'aktivasi' ? item.aktivasi : petugasMode === 'ikr' ? item.ikr : item.kendala;
                const maxVal = Math.max(...chartPetugasData.map(p => petugasMode === 'aktivasi' ? p.aktivasi : petugasMode === 'ikr' ? p.ikr : p.kendala), 1);
                const percentage = (currentVal / maxVal) * 100;
                const barColor = petugasMode === 'aktivasi' ? 'bg-blue-500' : petugasMode === 'ikr' ? 'bg-emerald-500' : 'bg-rose-500';
                const textColor = petugasMode === 'aktivasi' ? 'text-blue-600' : petugasMode === 'ikr' ? 'text-emerald-600' : 'text-rose-600';
                const cleanUsername = String(item.nama || '').replace('@', '');

                return (
                  <div key={idx} className="flex items-center gap-2.5 py-1 px-1 rounded-lg">
                    <div className="w-[85px] shrink-0 text-right">
                      <p className="text-[10px] font-bold text-slate-700 truncate">@{cleanUsername}</p>
                      <p className="text-[8px] text-slate-400 truncate">{toProperCase(item.stasiun)}</p>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <div className={`h-3.5 ${barColor} rounded-sm transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div>
                      <span className={`text-[11px] font-black ${textColor}`}>{currentVal}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP CHART VIEW (>= lg) ASLI */}
          <div className="hidden lg:block flex-1 relative min-h-[260px] sm:min-h-[300px]">
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
              {chartPetugasData.length > 0 ? (
                <div style={{ height: `${dynamicHeight}px`, minWidth: '180px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                    <BarChart data={chartPetugasData} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="chartKey" type="category" axisLine={false} tickLine={false} width={dynamicYAxisWidth} tick={<CustomYAxisTick />} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipPetugas />} />

                      {petugasMode === 'aktivasi' && (
                        <Bar dataKey="aktivasi" name="Aktivasi" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fontWeight: 'bold', fill: '#3b82f6' }} />
                      )}
                      {petugasMode === 'ikr' && (
                        <Bar dataKey="ikr" name="IKR" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fontWeight: 'bold', fill: '#10b981' }} />
                      )}
                      {petugasMode === 'kendala' && (
                        <Bar dataKey="kendala" name="Kendala" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fontWeight: 'bold', fill: '#f43f5e' }} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[200px]">
                  <Icon name="bar-chart-2" size={40} className="mb-2 opacity-20" />
                  <p className="text-xs sm:text-sm font-medium">Belum ada data {petugasMode.toUpperCase()} di tanggal ini</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Rekap */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
        {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div></div>}

        <div className="px-6 py-4 bg-[#1e3a8a] text-white flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center">
            <Icon name="activity" className="mr-2 text-cyan-400" size={18} />
            <h2 className="font-bold text-sm">Tabel Rekap Aktivasi Homeconnect</h2>
          </div>
          <span className="text-[10px] font-medium bg-blue-900/50 px-2 py-1 rounded">Tanggal: {formattedDate}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] sm:text-[12px] text-left border-collapse min-w-[700px] sm:min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[7.5px] sm:text-[10px]">
              <tr>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center font-extrabold border-r border-slate-200/60 align-middle">NO</th>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-left font-extrabold border-r border-slate-200/60 align-middle">STASIUN</th>
                <th colSpan={2} className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-center font-extrabold border-r border-slate-200/60 bg-slate-100/60 text-slate-700">HOMEPASS (HP)</th>
                <th colSpan={2} className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-center font-extrabold border-r border-slate-200/60 bg-blue-50/80 text-blue-700">AKTIVASI HC</th>
                <th colSpan={2} className="px-1.5 py-1 sm:px-3 sm:py-1.5 text-center font-extrabold border-r border-slate-200/60 bg-emerald-50/80 text-emerald-700">HC AKTIF</th>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center font-extrabold border-r border-slate-200/60 align-middle">AKTIVASI HARI INI</th>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center font-extrabold border-r border-slate-200/60 align-middle text-blue-700">TOTAL AKTIVASI HC</th>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center font-extrabold border-r border-slate-200/60 align-middle">PERFORMA HC VS HP</th>
                <th rowSpan={2} className="px-1.5 py-1.5 sm:px-3 sm:py-2.5 text-center font-extrabold align-middle">DETAIL PO</th>
              </tr>
              <tr className="border-t border-slate-200/60 text-[7px] sm:text-[9px]">
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold bg-slate-100/40 text-slate-600">REGULER</th>
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold border-r border-slate-200/60 bg-slate-100/40 text-slate-600">PERCEPATAN</th>
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold bg-blue-50/40 text-blue-700">REGULER</th>
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold border-r border-slate-200/60 bg-blue-50/40 text-blue-700">PERCEPATAN</th>
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold bg-emerald-50/40 text-emerald-700">REGULER</th>
                <th className="px-1.5 py-1 sm:px-2.5 sm:py-1 text-center font-bold border-r border-slate-200/60 bg-emerald-50/40 text-emerald-700">PERCEPATAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dynamicStationData.length > 0 ? (
                <>
                  {dynamicStationData.map((row, i) => {
                    const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
                    const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);
                    const totalHpRow = hpReg + hpPerc;

                    const aktReg = row.aktivasiReguler !== undefined ? Number(row.aktivasiReguler) : Number(row.totalAktivasiHc || 0);
                    const aktPerc = row.aktivasiPercepatan !== undefined ? Number(row.aktivasiPercepatan) : Number(row.hcAktif || 0);

                    const hcAktReg = row.hcAktifReguler !== undefined ? Number(row.hcAktifReguler) : Number(row.performaHc || 0);
                    const hcAktPerc = row.hcAktifPercepatan !== undefined ? Number(row.hcAktifPercepatan) : Number(row.tieringHc || 0);

                    const totAktRow = row.totalAktivasiHc !== undefined && row.hpPercepatan !== undefined
                      ? Number(row.totalAktivasiHc)
                      : (row.keterangan !== undefined ? Number(row.keterangan || 0) : (aktReg + aktPerc));

                    const aktToday = Number(row.aktifHariIniVal || 0);

                    const progress = totalHpRow > 0 ? ((totAktRow / totalHpRow) * 100).toFixed(2) : 0;
                    const isZeroActiveToday = !aktToday || aktToday === 0;

                    return (
                      <tr key={i} className="hover:bg-slate-100/50 transition-colors group">
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center text-slate-400 font-semibold border-r border-slate-100/80">{i + 1}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 font-bold text-slate-700 border-r border-slate-100/80">{toProperCase(row.stasiun)}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-medium text-slate-600 bg-slate-50/30">{hpReg.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-medium text-slate-600 bg-slate-50/30 border-r border-slate-100/80">{hpPerc.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-bold text-blue-700 bg-blue-50/20">{aktReg.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-bold text-blue-700 bg-blue-50/20 border-r border-slate-100/80">{aktPerc.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-semibold text-emerald-700 bg-emerald-50/20">{hcAktReg.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-semibold text-emerald-700 bg-emerald-50/20 border-r border-slate-100/80">{hcAktPerc.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center border-r border-slate-100/80">
                          {isZeroActiveToday ? (
                            <span className="text-slate-300 font-medium text-[9px] sm:text-[11px]">-</span>
                          ) : (
                            <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-extrabold border border-emerald-100 shadow-sm animate-pulse-soft inline-block">
                              +{aktToday}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center font-bold text-blue-600 bg-blue-50/15 border-r border-slate-100/80">{totAktRow.toLocaleString('id-ID')}</td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 border-r border-slate-100/80">
                          {(() => {
                            const perfReg = hpReg > 0 ? ((aktReg / hpReg) * 100).toFixed(2) + '%' : '-';
                            const perfPerc = hpPerc > 0 ? ((aktPerc / hpPerc) * 100).toFixed(2) + '%' : '-';
                            return (
                              <div className="flex flex-col items-center gap-0 sm:gap-0.5 min-w-[90px] sm:min-w-[125px] max-w-[150px] mx-auto">
                                <span className="text-[8px] sm:text-[10px] font-extrabold text-blue-700 leading-tight">{Number(progress).toFixed(2)}%</span>
                                <div className="w-full bg-slate-100 h-1 sm:h-1.5 rounded-full overflow-hidden my-0.5 sm:my-0">
                                  <div className={`h-full bg-blue-500 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                </div>
                                <div className="flex items-center justify-between w-full text-[6px] sm:text-[9px] text-slate-400 font-semibold tracking-tighter sm:mt-0.5 px-0.5">
                                  <span title="Performa HP Reguler">Reg: <strong className="text-slate-600 font-bold">{perfReg}</strong></span>
                                  <span title="Performa HP Percepatan">Perc: <strong className="text-slate-600 font-bold">{perfPerc}</strong></span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-1.5 py-2 sm:px-3 sm:py-3 text-center">
                          <button
                            onClick={() => setSelectedPoStation(row.stasiun)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center border border-blue-200/50 shadow-sm mx-auto group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                            title={`Lihat detail PO untuk stasiun ${toProperCase(row.stasiun)}`}
                          >
                            <Icon name="arrow-right" size={12} className="transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                    <td className="px-3 py-3.5 text-center text-slate-400 border-r border-slate-200/80"></td>
                    <td className="px-3 py-3.5 text-left text-slate-800 font-black border-r border-slate-200/80">TOTAL</td>
                    <td className="px-3 py-3.5 text-center text-slate-700 bg-slate-100/50">{totals.hpReguler.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center text-slate-700 bg-slate-100/50 border-r border-slate-200/80">{totals.hpPercepatan.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center text-blue-800 bg-blue-50/40 font-black">{totals.aktivasiReguler.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center text-blue-800 bg-blue-50/40 font-black border-r border-slate-200/80">{totals.aktivasiPercepatan.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center text-emerald-800 bg-emerald-50/40 font-black">{totals.hcAktifReguler.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center text-emerald-800 bg-emerald-50/40 font-black border-r border-slate-200/80">{totals.hcAktifPercepatan.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center border-r border-slate-200/80">
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black border border-emerald-200 shadow-sm">
                        {totals.aktifHariIni}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center text-blue-700 bg-blue-50/40 font-black border-r border-slate-200/80">{totals.totalAktivasiHc.toLocaleString('id-ID')}</td>
                    <td className="px-3 py-3.5 text-center border-r border-slate-200/80">
                      <div className="flex flex-col items-center gap-0.5 min-w-[125px] max-w-[150px] mx-auto">
                        <span className="text-[11px] font-black text-blue-700">{Number(totals.performaHc).toFixed(2)}%</span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(totals.performaHc, 100)}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between w-full text-[9px] text-slate-500 font-bold tracking-tighter mt-0.5 px-0.5">
                          <span>Reg: <strong className="text-slate-800 font-extrabold">{totals.performaReguler}%</strong></span>
                          <span>Perc: <strong className="text-slate-800 font-extrabold">{totals.performaPercepatan}%</strong></span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center"></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="12" className="py-10 text-center text-slate-300 italic">Data kosong</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col min-h-[300px] relative">
        {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div></div>}

        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-50 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800 flex items-center">
              <Icon name="clock" className="mr-2 text-blue-500" size={18} />
              Riwayat Aktivasi
            </h2>
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter hidden sm:inline-block">
              {formattedDate}
            </span>
          </div>

          <div className="relative w-full sm:w-48">
            {isHistoryDropdownOpen && (
              <div className="fixed inset-0 z-[55]" onClick={() => setIsHistoryDropdownOpen(false)}></div>
            )}

            <div
              onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
              className={`w-full px-3 py-2 bg-slate-50 border ${isHistoryDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-lg text-xs font-semibold text-slate-600 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 relative z-[56] select-none`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon name="filter" size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{historyFilter || 'Semua Stasiun'}</span>
              </div>
              <Icon name={isHistoryDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 ml-2" />
            </div>

            {isHistoryDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[60] animate-dropdown max-h-48 overflow-y-auto">
                <div
                  onClick={() => { setHistoryFilter(''); setIsHistoryDropdownOpen(false); }}
                  className={`px-4 py-2.5 text-xs cursor-pointer transition-colors flex items-center ${historyFilter === '' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                >
                  Semua Stasiun
                  {historyFilter === '' && <Icon name="check" size={12} className="ml-auto" />}
                </div>
                {uniqueHistoryStations.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => { setHistoryFilter(st); setIsHistoryDropdownOpen(false); }}
                    className={`px-4 py-2.5 text-xs cursor-pointer transition-colors flex items-center ${historyFilter === st ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                  >
                    {st}
                    {historyFilter === st && <Icon name="check" size={12} className="ml-auto" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto max-h-[500px] custom-scrollbar rounded-b-xl">
          <div className="divide-y divide-slate-100 pb-2">
            {historyAktivasi.length > 0 ? (
              historyAktivasi.map((item, i) => (
                <div key={i} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
                    <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                      <Icon name="check-circle" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-[12px] sm:text-[13px] text-slate-800 truncate">{item.namaPelanggan || 'Tanpa Nama'}</h4>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] sm:text-[9px] font-bold rounded border border-slate-200 shrink-0">
                          {toProperCase(item.stasiun)}
                        </span>
                      </div>
                      <p className="text-[9.5px] sm:text-[11px] text-slate-500 mb-1.5 truncate">{item.alamat || '-'}</p>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-2.5 gap-y-1 text-[8.5px] sm:text-[11px] font-semibold sm:font-medium text-slate-500 sm:text-slate-600">
                        <span className="flex items-center" title="ID Pelanggan"><Icon name="hash" size={9} className="mr-1 text-slate-400" />{item.idPelanggan || '-'}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="flex items-center" title="ODP Aktual"><Icon name="box" size={9} className="mr-1 text-slate-400" />{item.odpAktual || '-'}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="flex items-center" title="Port"><Icon name="link" size={9} className="mr-1 text-slate-400" />Port {item.portOdp || '-'}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="flex items-center" title="Kabel Precon"><Icon name="git-commit" size={9} className="mr-1 text-slate-400" />{item.kabelPrecon || '-'}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="flex items-center text-slate-500" title="SN ONT"><Icon name="cpu" size={9} className="mr-1 text-slate-400" />{item.snOnt || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-[calc(100%-36px)] sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-1.5 ml-9 sm:ml-0">
                    <div className="text-[8.5px] sm:text-[10px] text-slate-400 font-medium flex items-center">
                      <Icon name="clock" size={9} className="mr-1" />
                      {item.time} WIB
                    </div>
                    <div className="flex items-center gap-1 text-[8.5px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      <Icon name="user" size={9} />
                      {item.petugasAktivasi || '-'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 h-full min-h-[200px]">
                <Icon name="inbox" size={48} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada riwayat aktivasi {historyFilter ? `untuk ${historyFilter}` : 'di tanggal ini'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL SELISIH LAPORAN --- */}
      {showDiscrepancyModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setShowDiscrepancyModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center">
                  <Icon name="alert-circle" size={18} className="mr-2 text-rose-500" />
                  Selisih Laporan Petugas
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Pelanggan dengan status IKR/Aktivasi tidak sinkron pada <span className="font-bold">{formattedDate}</span> ({discrepancyList.length} data).</p>
              </div>
              <button onClick={() => setShowDiscrepancyModal(false)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
              {discrepancyList.length > 0 ? (
                <>
                  {/* TAMPILAN MOBILE: KARTU KHUSUS MOBILE */}
                  <div className="sm:hidden space-y-2.5">
                    {discrepancyList.map((cust, idx) => {
                      let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
                      if (cust.discrepancyType === 'BELUM REPORT AKTIVASI') badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                      else if (cust.discrepancyType === 'AKTIVASI KENDALA KEMARIN') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";

                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{cust.namaPelanggan || 'Tanpa Nama'}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{cust.idPelanggan || '-'}</span>
                                <span className="text-[8.5px] uppercase font-bold text-slate-400">{toProperCase(cust.stasiun)}</span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border shrink-0 ${badgeStyle}`}>
                              {cust.discrepancyType}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-[10px]">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-400 font-bold text-[8px] uppercase block">Petugas IKR</span>
                              <span className="font-semibold text-slate-700">{cust.petugasIkr || '-'}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-slate-400 font-bold text-[8px] uppercase block">Petugas Aktivasi</span>
                              <span className="font-semibold text-slate-700">{cust.petugasAktivasi || '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TAMPILAN DESKTOP: TABEL LEBAR */}
                  <table className="hidden sm:table w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">ID Pelanggan</th>
                        <th className="px-6 py-3">Nama & Stasiun</th>
                        <th className="px-6 py-3">Petugas IKR</th>
                        <th className="px-6 py-3">Petugas Aktivasi</th>
                        <th className="px-6 py-3">Status Selisih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {discrepancyList.map((cust, idx) => {
                        let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
                        if (cust.discrepancyType === 'BELUM REPORT AKTIVASI') badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                        else if (cust.discrepancyType === 'AKTIVASI KENDALA KEMARIN') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";

                        return (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-6 py-3 font-mono text-xs text-slate-600 font-medium">{cust.idPelanggan || '-'}</td>
                            <td className="px-6 py-3">
                              <div className="font-bold text-slate-800">{cust.namaPelanggan || 'Tanpa Nama'}</div>
                              <div className="text-xs text-slate-500">{toProperCase(cust.stasiun)}</div>
                            </td>
                            <td className="px-6 py-3 text-xs font-medium text-slate-600">
                              {cust.petugasIkr ? <span className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" /> {cust.petugasIkr}</span> : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-6 py-3 text-xs font-medium text-slate-600">
                              {cust.petugasAktivasi ? <span className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" /> {cust.petugasAktivasi}</span> : <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap ${badgeStyle}`}>
                                {cust.discrepancyType}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex justify-end items-center bg-white shrink-0">
              <button onClick={() => setShowDiscrepancyModal(false)} className="w-full sm:w-auto px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95">Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL KENDALA HARIAN --- */}
      {showKendalaModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setShowKendalaModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center">
                  <Icon name="alert-triangle" size={18} className="mr-2 text-rose-500" />
                  Daftar Kendala Pada Tanggal Ini
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Daftar pelanggan terkendala pada <span className="font-bold">{formattedDate}</span> ({kendalaList.length} data).</p>
              </div>
              <button onClick={() => setShowKendalaModal(false)} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
              {kendalaList.length > 0 ? (
                <>
                  {/* TAMPILAN MOBILE: KARTU LIST KENDALA KHUSUS MOBILE */}
                  <div className="sm:hidden space-y-2.5">
                    {kendalaList.map((cust, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                          <Icon name="alert-triangle" size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 gap-1.5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{cust.namaPelanggan || 'Tanpa Nama'}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{cust.idPelanggan || '-'}</span>
                                <span className="text-[8.5px] uppercase font-bold text-slate-400">{toProperCase(cust.stasiun)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
                            <Icon name="user" size={10} className="text-rose-400" />
                            <span>Pelapor: <strong className="text-slate-700">{cust.extractedReporter || 'Sistem'}</strong></span>
                          </div>

                          <div className="mt-2 text-[10px] text-rose-700 bg-rose-50/80 p-2.5 rounded-lg border border-rose-100/80 leading-relaxed break-words">
                            <span className="font-bold block mb-0.5 text-rose-800 text-[9px] uppercase tracking-wider">Keterangan Kendala:</span>
                            {cust.extractedIssue && !String(cust.extractedIssue).includes("GMT+")
                              ? cust.extractedIssue
                              : (cust.catatan || cust.keluhan || 'Tidak ada keterangan kendala')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TAMPILAN DESKTOP: TABEL */}
                  <table className="hidden sm:table w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 w-32">ID Pelanggan</th>
                        <th className="px-6 py-3 w-48">Nama & Stasiun</th>
                        <th className="px-6 py-3 w-40">Pelapor</th>
                        <th className="px-6 py-3">Keterangan Kendala</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kendalaList.map((cust, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-slate-600 font-medium">{cust.idPelanggan || '-'}</td>
                          <td className="px-6 py-3">
                            <div className="font-bold text-slate-800">{cust.namaPelanggan || 'Tanpa Nama'}</div>
                            <div className="text-xs text-slate-500">{toProperCase(cust.stasiun)}</div>
                          </td>
                          <td className="px-6 py-3 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Icon name="user" size={12} className="text-slate-400" />
                              {cust.extractedReporter || 'Sistem'}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-xs font-medium text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100 break-words whitespace-normal leading-relaxed">
                              {cust.extractedIssue && !String(cust.extractedIssue).includes("GMT+")
                                ? cust.extractedIssue
                                : (cust.catatan || cust.keluhan || 'Tidak ada keterangan kendala')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex justify-end items-center bg-white shrink-0">
              <button onClick={() => setShowKendalaModal(false)} className="w-full sm:w-auto px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95">Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL VISIT / GANGGUAN --- */}
      {showVisitModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setShowVisitModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center">
                  <Icon name="headset" size={18} className="mr-2 text-purple-500" />
                  Daftar Tiket Visit / Gangguan
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Daftar tiket visit gangguan pada <span className="font-bold">{formattedDate}</span> ({visitList.length} tiket).</p>
              </div>
              <button onClick={() => setShowVisitModal(false)} className="p-1.5 sm:p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-xl transition-colors">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
              {visitList.length > 0 ? (
                <>
                  {/* TAMPILAN MOBILE: KARTU LIST VISIT KHUSUS MOBILE */}
                  <div className="sm:hidden space-y-2.5">
                    {visitList.map((ticket, idx) => {
                      const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(ticket.status || '').toUpperCase());
                      const ttrString = isDone ? calculateTTR(ticket.timestamp, ticket.waktuClose) : null;
                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-purple-50 text-purple-500'}`}>
                            <Icon name="headset" size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1.5 mb-1">
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate">{ticket.namaPelanggan || 'Tanpa Nama'}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{ticket.idPelanggan || '-'}</span>
                                  <span className="text-[8.5px] uppercase font-bold text-slate-400">{toProperCase(ticket.stasiun)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDone && ttrString && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                    <Icon name="clock" size={9} /> TTR: {ttrString}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                  {isDone ? 'DONE' : 'OPEN'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1.5">
                              <div className="flex items-center gap-1">
                                <Icon name="user" size={10} className="text-purple-400" />
                                <span>Teknisi: <strong className="text-slate-700">{ticket.petugas || '-'}</strong></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Icon name="clock" size={10} className="text-slate-400" />
                                <span>{ticket.timestamp ? String(ticket.timestamp).split(/[T ]/)[1]?.substring(0, 5) + ' WIB' : '-'}</span>
                              </div>
                            </div>

                            <div className="mt-2 space-y-1.5">
                              <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="font-bold text-rose-600 mr-1">[{ticket.keluhan || 'Gangguan'}]</span>
                                {ticket.catatan || '-'}
                              </div>

                              {ticket.tindakan && (
                                <div className="text-[10px] text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                                  <span className="font-bold block mb-0.5 text-[8.5px] uppercase tracking-wider text-emerald-800">Tindakan:</span>
                                  {ticket.tindakan}
                                  {ticket.material && <span className="block mt-1 text-[9px] text-slate-500 border-t border-emerald-100 pt-1">Material: {ticket.material}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* TAMPILAN DESKTOP: TABEL */}
                  <table className="hidden sm:table w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 w-32">Waktu</th>
                        <th className="px-6 py-3 w-48">Pelanggan & Stasiun</th>
                        <th className="px-6 py-3">Keluhan & Catatan</th>
                        <th className="px-6 py-3">Tindakan Perbaikan</th>
                        <th className="px-6 py-3 w-28 text-center">Status</th>
                        <th className="px-6 py-3 w-40">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visitList.map((ticket, idx) => {
                        const isTicketDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(ticket.status || '').toUpperCase());
                        const ttrDesk = isTicketDone ? calculateTTR(ticket.timestamp, ticket.waktuClose) : null;
                        return (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-6 py-3 font-mono text-xs text-slate-600 font-medium align-top">
                              {ticket.timestamp ? (() => {
                                const parts = String(ticket.timestamp).split(/[T ]/);
                                return parts[1] ? parts[1].substring(0, 5) + ' WIB' : '-';
                              })() : '-'}
                            </td>
                            <td className="px-6 py-3 align-top">
                              <div className="font-bold text-slate-800">{ticket.namaPelanggan || 'Tanpa Nama'}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ticket.idPelanggan} | {toProperCase(ticket.stasiun)}</div>
                            </td>
                            <td className="px-6 py-3 align-top">
                              <div className="flex flex-col gap-1.5">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[9px] uppercase tracking-wider rounded border border-rose-200 w-max">
                                  <Icon name="alert-triangle" size={10} /> {ticket.keluhan}
                                </div>
                                <p className="text-[11px] font-medium text-slate-600 leading-snug break-words max-w-[200px] whitespace-normal">
                                  {ticket.catatan || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-3 align-top">
                              {isTicketDone ? (
                                ticket.tindakan ? (
                                  <div className="text-[10px] bg-emerald-50/60 p-2 rounded-md border border-emerald-100 text-slate-700 min-w-[150px] max-w-[220px] whitespace-normal break-words">
                                    <div className="flex items-start gap-1.5">
                                      <Icon name="check-circle" size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <span className="font-semibold text-emerald-800">{ticket.tindakan}</span>
                                        {ticket.material && (
                                          <div className="mt-1 text-slate-500 font-medium flex items-start gap-1 border-t border-emerald-100 pt-1">
                                            <Icon name="box" size={10} className="shrink-0 mt-0.5" />
                                            <span>{ticket.material}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Diselesaikan tanpa catatan</span>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-max">
                                  <Icon name="clock" size={10} className="animate-pulse" /> Menunggu Perbaikan
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 text-center align-top pt-4">
                              {!isTicketDone ? (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded shadow-sm">OPEN</span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded shadow-sm">DONE</span>
                                  {ttrDesk && (
                                    <span className="text-[8px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                                      <Icon name="clock" size={8} /> TTR: {ttrDesk}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          <td className="px-6 py-3 text-xs font-medium text-slate-600 align-top pt-4">
                            {ticket.petugas ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm">
                                  {ticket.petugas.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[11px] text-slate-700">{ticket.petugas}</span>
                                  <span className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Teknisi</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10px] flex items-center gap-1">
                                <Icon name="user-minus" size={12} /> Belum Ada
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex justify-end items-center bg-white shrink-0">
              <button onClick={() => setShowVisitModal(false)} className="w-full sm:w-auto px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95">Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL DAFTAR REGISTRASI STASIUN --- */}
      {selectedRegStation && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setSelectedRegStation(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center">
                  <Icon name="user-plus" size={18} className="mr-2 text-blue-500" />
                  Pendaftar Baru - {toProperCase(selectedRegStation)}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Daftar pelanggan (sales) pada <span className="font-bold">{formattedDate}</span> ({registrasiList.length} data).</p>
              </div>
              <button onClick={() => setSelectedRegStation(null)} className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-0 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
              {registrasiList.length > 0 ? (
                <>
                  {/* TAMPILAN MOBILE: KARTU LIST REGISTRASI KHUSUS MOBILE */}
                  <div className="sm:hidden space-y-2.5">
                    {registrasiList.map((cust, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Icon name="user-plus" size={14} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{cust.namaPelanggan || 'Tanpa Nama'}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{cust.idPelanggan || '-'}</span>
                              <span className="text-[8.5px] uppercase font-bold text-slate-400">{toProperCase(cust.stasiun)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                            <Icon name="clock" size={10} className="text-blue-400" />
                            {(() => {
                              const t = String(cust.tanggal || '');
                              const parts = t.split(/[T ]/);
                              const dateStr = parts[0] ? standardizeDate(parts[0]) : '-';
                              const timeStr = parts[1] ? parts[1].substring(0, 5) + ' WIB' : '';
                              return timeStr || dateStr;
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TAMPILAN DESKTOP: TABEL */}
                  <table className="hidden sm:table w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 w-16 text-center">No</th>
                        <th className="px-6 py-3">ID Pelanggan</th>
                        <th className="px-6 py-3">Nama Pelanggan</th>
                        <th className="px-6 py-3">Stasiun</th>
                        <th className="px-6 py-3">Waktu Registrasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registrasiList.map((cust, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="px-6 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-600 font-medium">{cust.idPelanggan || '-'}</td>
                          <td className="px-6 py-3 font-bold text-slate-800">{cust.namaPelanggan || 'Tanpa Nama'}</td>
                          <td className="px-6 py-3">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200">
                              {cust.stasiun}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100 w-max text-blue-700">
                              <Icon name="clock" size={12} className="text-blue-400" />
                              {(() => {
                                const t = String(cust.tanggal || '');
                                const parts = t.split(/[T ]/);
                                const dateStr = parts[0] ? standardizeDate(parts[0]) : '-';
                                const timeStr = parts[1] ? parts[1].substring(0, 5) + ' WIB' : '';
                                return timeStr || dateStr;
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="p-10 text-center text-slate-400">Tidak ada data untuk stasiun ini.</div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 flex justify-end items-center bg-white shrink-0">
              <button onClick={() => setSelectedRegStation(null)} className="w-full sm:w-auto px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95">Tutup</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL DETAIL PO RELEASE PER STASIUN (SHEET DASHBOARD B21:L55) --- */}
      {selectedPoStation && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => setSelectedPoStation(null)}></div>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Icon name="train" size={18} className="text-blue-600" />
                  Detail PO Release - {toProperCase(selectedPoStation)}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Daftar rincian PO Release untuk stasiun {toProperCase(selectedPoStation)} ({detailPoList.length} PO).</p>
              </div>
              <button
                onClick={() => setSelectedPoStation(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              {detailPoList.length > 0 ? (
                <>
                  {/* TAMPILAN MOBILE: KARTU DETAIL PO KHUSUS MOBILE */}
                  <div className="sm:hidden space-y-3">
                    {detailPoList.map((po, i) => {
                      const isCleanSchema = po.hpReguler !== undefined && !isNaN(Number(po.hpReguler));
                      const noPo = po.noPoRelease || po.stasiun || '-';
                      const jenis = po.jenisPo || '-';
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
                        if (isPercepatan) {
                          hpReg = 0;
                          hpPerc = typeof po.hcAktif === 'number' ? po.hcAktif : 0;
                          totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                          hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                          ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                          dismantled = 0;
                        } else {
                          hpReg = typeof po.hpTerbangun === 'number' ? po.hpTerbangun : (typeof po.totalAktivasiHc === 'number' ? po.totalAktivasiHc : 0);
                          hpPerc = 0;
                          totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                          hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                          ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                          dismantled = 0;
                        }
                      }

                      if (hpReg === 0 && hpPerc === 0 && po.hpTerbangun > 0) {
                        if (isPercepatan) hpPerc = po.hpTerbangun;
                        else hpReg = po.hpTerbangun;
                      }

                      const totalHp = hpReg + hpPerc;
                      const perfVal = totalHp > 0 ? parseFloat(((totHc / totalHp) * 100).toFixed(2)) : (typeof po.performaHc === 'number' ? po.performaHc : 0);

                      return (
                        <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                                <h4 className="text-xs font-black text-slate-800 font-mono">{noPo}</h4>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-semibold">
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{jenis}</span>
                                <span>•</span>
                                <span>{tahap}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-blue-600">{perfVal}%</span>
                              <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                                <div className={`h-full ${perfVal >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(perfVal, 100)}%` }}></div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                              <span className="text-[8px] font-bold text-slate-500 uppercase block truncate">
                                {hpPerc > 0 && hpReg === 0 ? 'HP PERCEPATAN' : hpReg > 0 && hpPerc === 0 ? 'HP REGULER' : 'TOTAL HP'}
                              </span>
                              <span className="text-[11px] font-black text-slate-800">{totalHp.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="bg-blue-50/60 p-1.5 rounded-lg border border-blue-100">
                              <span className="text-[8px] font-bold text-blue-600 uppercase block">Aktivasi HC</span>
                              <span className="text-[11px] font-black text-blue-700">{totHc.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                              <span className="text-[8px] font-bold text-emerald-600 uppercase block">HC Aktif</span>
                              <span className="text-[11px] font-black text-emerald-700">{hcAktif.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          {(suspend > 0 || ready > 0 || dismantled > 0) && (
                            <div className="flex items-center justify-between text-[9px] pt-1.5 px-1 text-slate-400 border-t border-slate-50 font-medium">
                              <span>Suspend: <strong className="text-orange-600 font-bold">{suspend}</strong></span>
                              <span>Ready: <strong className="text-amber-600 font-bold">{ready}</strong></span>
                              <span>Dismantled: <strong className="text-rose-600 font-bold">{dismantled}</strong></span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Ringkasan Total Mobile */}
                    {(() => {
                      let sumHpReg = 0;
                      let sumHpPerc = 0;
                      let sumTotHc = 0;
                      let sumHcAktif = 0;

                      detailPoList.forEach(po => {
                        const isCleanSchema = po.hpReguler !== undefined && !isNaN(Number(po.hpReguler));
                        const tahap = po.hpByPo || po.tahapPembangunan || po.kategori || '-';
                        const isPercepatan = String(tahap).toLowerCase().includes('percepatan');

                        let hpReg = 0;
                        let hpPerc = 0;
                        let totHc = 0;
                        let hcAktif = 0;

                        if (isCleanSchema) {
                          hpReg = Number(po.hpReguler || 0);
                          hpPerc = Number(po.hpPercepatan || 0);
                          totHc = Number(po.totalAktivasiHc || 0);
                          hcAktif = Number(po.hcAktif || 0);
                        } else {
                          if (isPercepatan) {
                            hpReg = 0;
                            hpPerc = typeof po.hcAktif === 'number' ? po.hcAktif : 0;
                            totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                            hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          } else {
                            hpReg = typeof po.hpTerbangun === 'number' ? po.hpTerbangun : (typeof po.totalAktivasiHc === 'number' ? po.totalAktivasiHc : 0);
                            hpPerc = 0;
                            totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                            hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                          }
                        }

                        if (hpReg === 0 && hpPerc === 0 && po.hpTerbangun > 0) {
                          if (isPercepatan) hpPerc = po.hpTerbangun;
                          else hpReg = po.hpTerbangun;
                        }

                        sumHpReg += hpReg;
                        sumHpPerc += hpPerc;
                        sumTotHc += totHc;
                        sumHcAktif += hcAktif;
                      });

                      const sumTotalHp = sumHpReg + sumHpPerc;
                      const overallPerf = sumTotalHp > 0 ? ((sumTotHc / sumTotalHp) * 100).toFixed(2) : "0.00";

                      return (
                        <div className="bg-slate-100/90 rounded-xl p-3 border border-slate-200 shadow-sm space-y-2">
                          <div className="flex justify-between items-center text-xs font-black text-slate-800">
                            <span>TOTAL KESELURUHAN</span>
                            <span className="text-blue-600">{overallPerf}%</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-slate-200 text-[10px] font-bold">
                            <div>
                              <span className="text-[8px] text-slate-400 block">TOTAL HP</span>
                              <span className="text-slate-700">{sumTotalHp.toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-blue-500 block">AKTIVASI HC</span>
                              <span className="text-blue-700">{sumTotHc.toLocaleString('id-ID')}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-emerald-500 block">HC AKTIF</span>
                              <span className="text-emerald-700">{sumHcAktif.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* TAMPILAN DESKTOP: TABEL LEBAR */}
                  <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                    <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-center w-10">NO</th>
                          <th className="px-4 py-3">NO PO RELEASE</th>
                          <th className="px-4 py-3 text-center">JENIS PO</th>
                          <th className="px-4 py-3 text-center">TAHAP PEMBANGUNAN</th>
                          <th className="px-4 py-3 text-center">HP REGULER</th>
                          <th className="px-4 py-3 text-center">HP PERCEPATAN</th>
                          <th className="px-4 py-3 text-center">TOTAL AKTIVASI</th>
                          <th className="px-4 py-3 text-center">HC AKTIF</th>
                          <th className="px-4 py-3 text-center">SUSPEND</th>
                          <th className="px-4 py-3 text-center">READY TO DISMANTLE</th>
                          <th className="px-4 py-3 text-center">DISMANTLED</th>
                          <th className="px-4 py-3 text-center">PERFORMA HC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailPoList.map((po, i) => {
                          const isCleanSchema = po.hpReguler !== undefined && !isNaN(Number(po.hpReguler));

                          const noPo = po.noPoRelease || po.stasiun || '-';
                          const jenis = po.jenisPo || '-';
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
                            if (isPercepatan) {
                              hpReg = 0;
                              hpPerc = typeof po.hcAktif === 'number' ? po.hcAktif : 0;
                              totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                              hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                              suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                              ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                              dismantled = 0;
                            } else {
                              hpReg = typeof po.hpTerbangun === 'number' ? po.hpTerbangun : (typeof po.totalAktivasiHc === 'number' ? po.totalAktivasiHc : 0);
                              hpPerc = 0;
                              totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                              hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                              suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                              ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                              dismantled = 0;
                            }
                          }

                          if (hpReg === 0 && hpPerc === 0 && po.hpTerbangun > 0) {
                            if (isPercepatan) hpPerc = po.hpTerbangun;
                            else hpReg = po.hpTerbangun;
                          }

                          const totalHp = hpReg + hpPerc;
                          const perfVal = totalHp > 0 ? parseFloat(((totHc / totalHp) * 100).toFixed(2)) : (typeof po.performaHc === 'number' ? po.performaHc : 0);

                          return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 text-center text-slate-400 font-semibold">{i + 1}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-700">{noPo}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-slate-600">{jenis}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-slate-600">{tahap}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-slate-700">{hpReg.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-slate-700">{hpPerc.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-blue-600">{totHc.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{hcAktif.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-semibold text-orange-600">{suspend.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-amber-600">{ready.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center font-medium text-rose-600">{dismantled.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-center w-28">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                    <div className={`h-full ${perfVal >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(perfVal, 100)}%` }}></div>
                                  </div>
                                  <span className="text-[10px] font-extrabold text-slate-600">{perfVal}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Totals Row */}
                        {(() => {
                          let sumHpReg = 0;
                          let sumHpPerc = 0;
                          let sumTotHc = 0;
                          let sumHcAktif = 0;
                          let sumSuspend = 0;
                          let sumReadyToDismantle = 0;
                          let sumDismantled = 0;

                          detailPoList.forEach(po => {
                            const isCleanSchema = po.hpReguler !== undefined && !isNaN(Number(po.hpReguler));
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
                              if (isPercepatan) {
                                hpReg = 0;
                                hpPerc = typeof po.hcAktif === 'number' ? po.hcAktif : 0;
                                totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                                hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                                suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                                ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                                dismantled = 0;
                              } else {
                                hpReg = typeof po.hpTerbangun === 'number' ? po.hpTerbangun : (typeof po.totalAktivasiHc === 'number' ? po.totalAktivasiHc : 0);
                                hpPerc = 0;
                                totHc = typeof po.suspend === 'number' ? po.suspend : 0;
                                hcAktif = typeof po.readyToDismantle === 'number' ? po.readyToDismantle : 0;
                                suspend = typeof po.dismantled === 'number' ? po.dismantled : 0;
                                ready = typeof po.performaHc === 'number' ? po.performaHc : 0;
                                dismantled = 0;
                              }
                            }

                            if (hpReg === 0 && hpPerc === 0 && po.hpTerbangun > 0) {
                              if (isPercepatan) hpPerc = po.hpTerbangun;
                              else hpReg = po.hpTerbangun;
                            }

                            sumHpReg += hpReg;
                            sumHpPerc += hpPerc;
                            sumTotHc += totHc;
                            sumHcAktif += hcAktif;
                            sumSuspend += suspend;
                            sumReadyToDismantle += ready;
                            sumDismantled += dismantled;
                          });

                          const sumTotalHp = sumHpReg + sumHpPerc;
                          const overallPerf = sumTotalHp > 0
                            ? ((sumTotHc / sumTotalHp) * 100).toFixed(2)
                            : "0.00";

                          return (
                            <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                              <td className="px-4 py-3 text-center text-slate-400"></td>
                              <td className="px-4 py-3 text-left">TOTAL</td>
                              <td className="px-4 py-3 text-center"></td>
                              <td className="px-4 py-3 text-center"></td>
                              <td className="px-4 py-3 text-center text-slate-700">{sumHpReg.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-slate-700">{sumHpPerc.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-blue-600">{sumTotHc.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-emerald-600">{sumHcAktif.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-orange-600">{sumSuspend.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-amber-600">{sumReadyToDismantle.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center text-rose-600">{sumDismantled.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden shrink-0">
                                    <div className="h-full bg-blue-600" style={{ width: `${Math.min(parseFloat(overallPerf), 100)}%` }}></div>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-700">{overallPerf}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <Icon name="folder-open" size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm">Tidak ada data detail PO Release untuk stasiun ini.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button
                onClick={() => setSelectedPoStation(null)}
                className="w-full sm:w-auto px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-900 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95"
              >
                Tutup Detail PO
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// ==========================================
// MODAL AKSI (ADD, EDIT, LOG GANGGUAN, DETAIL PELANGGAN)
// ==========================================
function ActionModal({ type, data, onClose, onGoToCoverage, visitData = [], onGoToHistory, onLocalPelangganUpdate, onLocalVisitUpdate, petugasList = [] }) {
  const [formData, setFormData] = useState({
    idPelanggan: data?.idPelanggan || '',
    namaPelanggan: data?.namaPelanggan || '',
    alamat: data?.alamat || '',
    stasiun: data?.stasiun || '',
    nomorHp: data?.nomorHp || '',
    odpAktual: data?.odpAktual || '',
    portOdp: data?.portOdp || '',
    snOnt: data?.snOnt || '',
    latitude: data?.latitude || '',
    longitude: data?.longitude || '',
    aktivasi: data?.aktivasi || '',
    catatan: data?.catatan || '', // Field Catatan Pelanggan Baru
    issueKendala: data?.issueKendala || '',
    keluhan: 'Modem LOS / Nyala Merah',
    catatanKendala: '',
    petugas: '' // Note: This still stores the Name in state for the UI dropdown
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState(null);

  const [internalData, setInternalData] = useState(data || {});
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  // <--- STATE UNTUK DROPDOWN PETUGAS
  const [isPetugasOpen, setIsPetugasOpen] = useState(false);

  // STATE UNTUK CUSTOM DROPDOWN KELUHAN
  const [isKeluhanOpen, setIsKeluhanOpen] = useState(false);
  const keluhanOptionsList = [
    "Modem LOS / Nyala Merah", "No Internet / Tidak Ada Koneksi", "Koneksi Putus-Putus / Lambat",
    "Kabel Drop / Putus", "Perangkat Mati / Rusak", "Kendala Konfigurasi / Sistem",
    "Tindak Lanjut Visit Teknisi", "Keluhan Lainnya..."
  ];

  // STATE UNTUK CUSTOM DROPDOWN STASIUN (ADD/EDIT)
  const [isStationOpen, setIsStationOpen] = useState(false);
  const stationOptionsList = [
    "Alastua", "Brumbung", "Kalibodri", "Kaliwungu",
    "Kradenan", "Krengseng", "Randublatung", "Semarang Tawang",
    "Sulur", "Wadu", "Weleri"
  ];

  // STATE UNTUK CUSTOM DROPDOWN STATUS PELANGGAN (EDIT/ADD)
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusOptions = [
    { value: 'Sudah', label: 'Aktif (Sudah)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check-circle' },
    { value: 'Belum', label: 'Waiting (Belum Aktif)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'clock' },
    { value: 'Suspend', label: 'Suspend', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'pause-circle' },
    { value: 'Ready To Dismantle', label: 'Ready To Dismantle', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', icon: 'alert-triangle' },
    { value: 'Dismantled', label: 'Dismantled', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: 'x-circle' },
    { value: 'Kendala', label: 'Kendala', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'alert-circle' }
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === formData.aktivasi) || {
    label: '-- Pilih Status --', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'help-circle'
  };

  const riwayatSelesai = useMemo(() => {
    if (!visitData || !Array.isArray(visitData)) return [];
    return visitData.filter(v => String(v.idPelanggan) === String(data?.idPelanggan) && v.status === 'DONE');
  }, [visitData, data]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  let title = ""; let icon = "";
  if (type === 'edit') { title = "Edit Data Pelanggan"; icon = "edit"; }
  else if (type === 'add') { title = "Tambah Pelanggan Baru"; icon = "user-plus"; }
  else if (type === 'log') { title = "Input Visit / Gangguan"; icon = "headset"; }
  else if (type === 'detail') { title = "Detail Profil Pelanggan"; icon = "user"; }

  const formatDateStr = (dateStr) => {
    if (!dateStr) return '-';
    if (typeof dateStr === 'string' && dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  const getDriveDirectUrl = (url) => {
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[0]}&sz=w800`;
    return url;
  };

  const handleInlineEdit = (fieldKey, value) => {
    setEditingField(fieldKey);
    setEditValue(value || '');
  };

  const saveInlineEdit = async (fieldKey) => {
    if (editValue === (internalData[fieldKey] || '')) {
      setEditingField(null);
      return;
    }

    setIsSaving(true);

    const payload = { ...internalData, [fieldKey]: editValue };
    if (fieldKey === 'aktivasi') payload.ikr = editValue;

    try {
      const formatTgl = (tgl) => {
        if (!tgl) return '';
        if (tgl.includes('T')) {
          let f = tgl.replace('T', ' ');
          if (f.length === 16) f += ':00';
          return f;
        }
        return tgl;
      };

      let finalAktivasi = payload.aktivasi;
      let finalIkr = payload.ikr;
      if (finalAktivasi === 'Waiting') { finalAktivasi = 'Belum'; finalIkr = 'Belum'; }
      else if (finalAktivasi === 'Aktif') { finalAktivasi = 'Sudah'; finalIkr = 'Sudah'; }

      const { error } = await supabase.from('data_pelanggan').update({
        nomor_hp: payload.nomorHp,
        alamat: payload.alamat,
        latitude: payload.latitude,
        longitude: payload.longitude,
        odp: payload.odpAktual,
        port_odp: payload.portOdp,
        sn_ont: payload.snOnt,
        kabel_precon: payload.kabelPrecon,
        status_aktivasi: finalAktivasi,
        status_ikr: finalIkr,
        tgl_aktivasi: formatTgl(payload.tglAktivasi),
        tgl_ikr: formatTgl(payload.tglIkr),
        petugas_aktivasi: payload.petugasAktivasi,
        petugas_ikr: payload.petugasIkr,
        catatan: payload.catatan,
        issue_kendala: payload.issueKendala
      }).eq('id_pelanggan', payload.idPelanggan);

      if (error) throw error;

      api.run('updatePelangganData', payload)
        .then(res => {
          setIsSaving(false);
          if (res !== false && res?.success !== false) {
            if (onLocalPelangganUpdate) onLocalPelangganUpdate([payload]);
            setInternalData(payload);
            setEditingField(null);
          } else {
            setMessage({ type: 'error', text: res?.message || 'Gagal update ke Sheet' });
          }
        })
        .catch(err => {
          setIsSaving(false);
          setMessage({ type: 'error', text: err.message });
        });
    } catch (err) {
      setIsSaving(false);
      setMessage({ type: 'error', text: 'Supabase Error: ' + err.message });
    }
  };

  const renderEditableDetailRow = ({ label, fieldKey, fullWidth = false, options = null, type = 'text', readOnly = false, valueOverride = null }) => {
    const isEditing = editingField === fieldKey;
    const value = valueOverride !== null ? valueOverride : internalData[fieldKey];

    return (
      <div className={`flex flex-col border-b border-slate-100 pb-2 relative group ${fullWidth ? 'md:col-span-2' : ''}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1 relative z-[60]">
            {options ? (
              <select value={editValue} onChange={e => setEditValue(e.target.value)} disabled={isSaving} className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">-- Pilih --</option>
                {options.map(opt => (
                  <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                ))}
              </select>
            ) : (
              <input type={type} value={editValue} onChange={e => setEditValue(e.target.value)} disabled={isSaving} className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500" />
            )}
            <button disabled={isSaving} onClick={() => saveInlineEdit(fieldKey)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 disabled:opacity-50 transition-colors"><Icon name="check" size={14} /></button>
            <button disabled={isSaving} onClick={() => setEditingField(null)} className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 disabled:opacity-50 transition-colors"><Icon name="x" size={14} /></button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 break-words pr-6">{value || '-'}</span>
            {!readOnly && fieldKey && (
              <button onClick={() => handleInlineEdit(fieldKey, value)} className="text-slate-400 hover:text-blue-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute right-0 top-1/2 mt-1 bg-white p-1 rounded-md shadow-sm border border-slate-100">
                <Icon name="edit-2" size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    try {
      // --- LOGIKA HELPDESK (INPUT VISIT) ---
      if (type === 'log') {
        if (!formData.catatanKendala.trim()) { setMessage({ type: 'error', text: 'Deskripsi wajib diisi!' }); return; }
        setIsSaving(true); setMessage(null);

        // --- PERBAIKAN LOGIKA PETUGAS DISINI ---
        let usernamePetugas = formData.petugas; // Defaultnya nama jika gagal ketemu
        if (formData.petugas && petugasList && petugasList.length > 0) {
          const teknisiTerpilih = petugasList.find(t => t.nama === formData.petugas);
          if (teknisiTerpilih && teknisiTerpilih.username) {
            usernamePetugas = teknisiTerpilih.username.startsWith('@')
              ? teknisiTerpilih.username
              : '@' + teknisiTerpilih.username;
          }
        }

        const payload = {
          idPelanggan: data.idPelanggan || '', namaPelanggan: data.namaPelanggan || '', stasiun: data.stasiun || '',
          keluhan: formData.keluhan || '', catatan: formData.catatanKendala || '', snOnt: data.snOnt || '',
          odpAktual: data.kodeOdp || data.odpAktual || '', portOdp: data.portOdp || '',
          nomorHp: data.nomorHp || '', latitude: data.latitude || '', longitude: data.longitude || '',
          petugas: usernamePetugas
        };

        const finalizeSuccessLog = () => {
          try { if (onLocalVisitUpdate) onLocalVisitUpdate('add', payload); } catch (e) { console.error("Abaikan error tabel:", e); }
          setIsSaving(false); setIsSuccess(true);
          setTimeout(() => onClose(false), 1500);
        };

        const failsafeLog = setTimeout(() => { finalizeSuccessLog(); }, 3500);

        api.run('insertVisitLog', payload)
          .then((res) => {
            clearTimeout(failsafeLog);
            if (res === false || (res && res.success === false)) {
              setIsSaving(false);
              setMessage({ type: 'error', text: res.message || 'Gagal menyimpan ke server' });
            } else {
              finalizeSuccessLog();
            }
          })
          .catch((err) => {
            clearTimeout(failsafeLog);
            setIsSaving(false);
            setMessage({ type: 'error', text: err.message });
          });

        return;
      } // <--- KURUNG KURAWAL INI YANG SEBELUMNYA HILANG

      // --- LOGIKA PELANGGAN BARU ---
      if (type === 'add') {
        if (!formData.idPelanggan.trim() || !formData.namaPelanggan.trim() || !formData.stasiun.trim()) {
          setMessage({ type: 'error', text: 'ID Pelanggan, Nama, dan Stasiun wajib diisi!' }); return;
        }
        setIsSaving(true); setMessage(null);

        const nowIso = new Date().toISOString();
        const formattedId = String(formData.idPelanggan).trim().toUpperCase();

        const supabaseAddPayload = {
          id_pelanggan: formattedId,
          nama_pelanggan: formData.namaPelanggan || '',
          alamat: formData.alamat || '',
          stasiun: formData.stasiun || '',
          nomor_hp: formData.nomorHp || '',
          odp: String(formData.odpAktual || '').trim().toUpperCase(),
          port_odp: formData.portOdp || '',
          latitude: formData.latitude || '',
          longitude: formData.longitude || '',
          status_ikr: 'Belum',
          status_aktivasi: formData.aktivasi || 'Belum',
          catatan: formData.catatan || '',
          issue_kendala: formData.issueKendala || '',
          created_at: nowIso,
          updated_at: nowIso
        };

        const finalizeSuccessAdd = () => {
          try {
            if (onLocalPelangganUpdate) {
              onLocalPelangganUpdate([{
                ...formData,
                idPelanggan: formattedId,
                ikr: 'Belum',
                aktivasi: formData.aktivasi || 'Belum'
              }]);
            }
          } catch (e) { console.error(e); }
          setIsSaving(false); setIsSuccess(true);
          setTimeout(() => onClose(false), 1500);
        };

        const doAdd = async () => {
          try {
            // 1. Simpan langsung ke Supabase
            const { error: sbErr } = await supabase.from('data_pelanggan').insert([supabaseAddPayload]);
            if (sbErr) {
              console.error("Supabase Insert Error:", sbErr);
            }

            // 2. Simpan ke Google Sheet via GAS
            const res = await api.run('insertPelangganBaru', formData);
            if (res === false || (res && res.success === false)) {
              if (sbErr) {
                setIsSaving(false);
                setMessage({ type: 'error', text: res?.message || sbErr.message || 'Gagal menyimpan data pelanggan' });
                return;
              }
            }

            finalizeSuccessAdd();
          } catch (err) {
            console.error("Add customer error:", err);
            finalizeSuccessAdd();
          }
        };

        doAdd();
        return;
      } // <--- KURUNG KURAWAL INI JUGA SEBELUMNYA HILANG

      // --- LOGIKA EDIT DATA BIASA ---
      setIsSaving(true); setMessage(null);

      // Pastikan saat diubah jadi Waiting (Belum) atau Aktif (Sudah), 
      // kolom IKR ikut berubah mengikuti kolom Aktivasi
      const updatePayload = {
        ...formData,
        ikr: formData.aktivasi // sinkronkan IKR dengan Aktivasi
      };

      const finalizeSuccessEdit = () => {
        try {
          const localPayload = { ...updatePayload };
          // Jangan hapus issueKendala atau catatan secara otomatis
          // Biarkan masing-masing independen sesuai input user
          if (onLocalPelangganUpdate) onLocalPelangganUpdate([{ ...data, ...localPayload }]);
        } catch (e) { console.error(e); }
        setIsSaving(false); setIsSuccess(true);
        setTimeout(() => onClose(false), 1500);
      };

      const doUpdate = async () => {
        try {
          const formatTgl = (tgl) => {
            if (!tgl) return '';
            if (tgl.includes('T')) {
              let f = tgl.replace('T', ' ');
              if (f.length === 16) f += ':00';
              return f;
            }
            return tgl;
          };

          let finalAktivasi = updatePayload.aktivasi;
          let finalIkr = updatePayload.ikr;
          if (finalAktivasi === 'Waiting') { finalAktivasi = 'Belum'; finalIkr = 'Belum'; }
          else if (finalAktivasi === 'Aktif') { finalAktivasi = 'Sudah'; finalIkr = 'Sudah'; }

          const { error } = await supabase.from('data_pelanggan').update({
            nomor_hp: updatePayload.nomorHp,
            alamat: updatePayload.alamat,
            latitude: updatePayload.latitude,
            longitude: updatePayload.longitude,
            odp: updatePayload.odpAktual,
            port_odp: updatePayload.portOdp,
            sn_ont: updatePayload.snOnt,
            kabel_precon: updatePayload.kabelPrecon,
            status_aktivasi: finalAktivasi,
            status_ikr: finalIkr,
            tgl_aktivasi: formatTgl(updatePayload.tglAktivasi),
            tgl_ikr: formatTgl(updatePayload.tglIkr),
            petugas_aktivasi: updatePayload.petugasAktivasi,
            petugas_ikr: updatePayload.petugasIkr,
            catatan: updatePayload.catatan,
            issue_kendala: updatePayload.issueKendala
          }).eq('id_pelanggan', updatePayload.idPelanggan);

          if (error) throw error;

          const failsafeEdit = setTimeout(() => { finalizeSuccessEdit(); }, 3500);

          api.run('updatePelangganData', updatePayload)
            .then((res) => {
              clearTimeout(failsafeEdit);
              if (res === false || (res && res.success === false)) {
                setIsSaving(false);
                setMessage({ type: 'error', text: res.message || 'Gagal update Sheet' });
              } else {
                finalizeSuccessEdit();
              }
            })
            .catch((err) => {
              clearTimeout(failsafeEdit);
              setIsSaving(false);
              setMessage({ type: 'error', text: err.message });
            });
        } catch (err) {
          setIsSaving(false);
          setMessage({ type: 'error', text: 'Supabase Error: ' + err.message });
        }
      };

      doUpdate();

    } catch (fatalError) {
      // Tangkapan terakhir jika ada error misterius lainnya
      setIsSaving(false);
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem internal.' });
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 animate-fade" onClick={() => !isSaving && onClose(false)}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 animate-modal flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">

        {isSaving && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[999] flex flex-col items-center justify-center animate-fade">
            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4 shadow-md"></div>
            <h3 className="text-base font-bold text-slate-800">
              {type === 'add' ? 'Menyimpan Pelanggan Baru...' : type === 'log' ? 'Membuat Tiket Visit...' : 'Menyimpan Perubahan...'}
            </h3>
          </div>
        )}

        {/* LAYAR NOTIFIKASI SUKSES (TAMBAHKAN KODE INI) */}
        {isSuccess && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center animate-fade">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-lg border-4 border-white transform transition-transform animate-bounce">
              <Icon name="check" size={40} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Berhasil!</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Data Telah Tersimpan.</p>
          </div>
        )}

        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center">
            <Icon name={icon} size={18} className={`mr-2 ${type === 'log' ? 'text-amber-500' : 'text-blue-600'}`} />
            {title}
          </h2>
          <button onClick={() => !isSaving && onClose(false)} disabled={isSaving} className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"><Icon name="x" size={18} /></button>
        </div>

        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar relative">

          {/* ======================================================== */}
          {/* TAMPILAN DETAIL PROFIL */}
          {/* ======================================================== */}
          {type === 'detail' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                  {(internalData.namaPelanggan || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-800 leading-tight">{internalData.namaPelanggan || 'Tanpa Nama'}</h3>
                  <p className="text-sm text-slate-500">{internalData.idPelanggan || 'ID Tidak Diketahui'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {renderEditableDetailRow({ label: "Stasiun", fieldKey: "stasiun", options: stationOptionsList })}
                {renderEditableDetailRow({ label: "ID Pelanggan", fieldKey: "idPelanggan" })}
                {renderEditableDetailRow({ label: "Nomor HP", fieldKey: "nomorHp" })}
                {renderEditableDetailRow({ label: "Alamat", fieldKey: "alamat", fullWidth: true })}
                {renderEditableDetailRow({ label: "Latitude", fieldKey: "latitude" })}
                {renderEditableDetailRow({ label: "Longitude", fieldKey: "longitude" })}
                {renderEditableDetailRow({ label: "Catatan", fieldKey: "catatan", fullWidth: true })}
                {renderEditableDetailRow({ label: "Issue / Kendala", fieldKey: "issueKendala", fullWidth: true })}

                <div className="md:col-span-2 border-b-2 border-slate-100 mt-2 mb-1"></div>
                {renderEditableDetailRow({ label: "Status IKR", fieldKey: "ikr", options: statusOptions })}
                {renderEditableDetailRow({ label: "Tanggal IKR", fieldKey: "tglIkr", valueOverride: formatDateStr(internalData.tglIkr) })}
                {renderEditableDetailRow({ label: "Status Aktivasi", fieldKey: "aktivasi", options: statusOptions })}
                {renderEditableDetailRow({ label: "Tanggal Aktivasi", fieldKey: "tglAktivasi", valueOverride: formatDateStr(internalData.tglAktivasi) })}
                {internalData.tanggalBerakhir && renderEditableDetailRow({ label: "Tanggal Berakhir", fieldKey: "tanggalBerakhir", valueOverride: internalData.tanggalBerakhir ? internalData.tanggalBerakhir.substring(0, 10) : '-' })}
                {(internalData.telatBayarHari !== null && internalData.telatBayarHari !== undefined) && renderEditableDetailRow({ label: "Telat Bayar", fieldKey: "telatBayarHari", valueOverride: `${internalData.telatBayarHari} Hari` })}
                <div className="md:col-span-2 border-b-2 border-slate-100 mt-2 mb-1"></div>
                {renderEditableDetailRow({ label: "SN ONT", fieldKey: "snOnt", fullWidth: true })}
                {renderEditableDetailRow({ label: "KODE ODP", fieldKey: "odpAktual", valueOverride: internalData.kodeOdp || internalData.odpAktual })}
                {renderEditableDetailRow({ label: "Port ODP", fieldKey: "portOdp" })}
                {renderEditableDetailRow({ label: "Kabel Precon", fieldKey: "kabelPrecon" })}
                <div className="hidden md:block"></div>
                <div className="md:col-span-2 border-b-2 border-slate-100 mt-2 mb-1"></div>
                {renderEditableDetailRow({ label: "Petugas IKR", fieldKey: "petugasIkr", options: petugasList.map(p => p.nama) })}
                {renderEditableDetailRow({ label: "Petugas Aktivasi", fieldKey: "petugasAktivasi", options: petugasList.map(p => p.nama) })}

                {/* FOTO DOKUMENTASI */}
                <div className="md:col-span-2 mt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Foto Dokumentasi</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {internalData.fotoRumahPelanggan ? (
                      <a href={internalData.fotoRumahPelanggan} target="_blank" rel="noreferrer" className="block group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-sm">
                        <img src={getDriveDirectUrl(internalData.fotoRumahPelanggan)} alt="Foto Rumah Pelanggan" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Gagal+Memuat+Foto'; }} />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                          <Icon name="external-link" className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={28} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2">
                          <span className="text-[10px] text-white font-medium drop-shadow">Rumah Pelanggan</span>
                        </div>
                      </a>
                    ) : (
                      <div className="rounded-xl border-2 border-slate-200 border-dashed bg-slate-50 aspect-video flex flex-col items-center justify-center text-slate-400 relative"><Icon name="image-off" size={28} className="mb-2 opacity-40" /><span className="text-xs font-semibold">Foto Rumah Belum Ada</span></div>
                    )}
                    {internalData.fotoOntTerpasang ? (
                      <a href={internalData.fotoOntTerpasang} target="_blank" rel="noreferrer" className="block group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video shadow-sm">
                        <img src={getDriveDirectUrl(internalData.fotoOntTerpasang)} alt="Foto ONT Terpasang" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Gagal+Memuat+Foto'; }} />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                          <Icon name="external-link" className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={28} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2">
                          <span className="text-[10px] text-white font-medium drop-shadow">ONT Terpasang</span>
                        </div>
                      </a>
                    ) : (
                      <div className="rounded-xl border-2 border-slate-200 border-dashed bg-slate-50 aspect-video flex flex-col items-center justify-center text-slate-400 relative"><Icon name="image-off" size={28} className="mb-2 opacity-40" /><span className="text-xs font-semibold">Foto ONT Belum Ada</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAMPILAN FORM UNTUK EDIT DATA & TAMBAH PELANGGAN BARU */}
          {/* ======================================================== */}
          {(type === 'edit' || type === 'add') && (
            <div className="space-y-4 pb-8">
              {message && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 mb-4 animate-fade">
                  <Icon name="alert-circle" size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed text-rose-700">{message.text}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 mb-4">
                <Icon name="info" size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  {type === 'add' ? 'Lengkapi form di bawah ini untuk menambahkan data pelanggan baru ke dalam sistem.' : 'Perbarui data pelanggan di bawah ini. Data baru akan otomatis masuk ke database.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. CUSTOM DROPDOWN STASIUN (Paling Atas Sesuai Request) */}
                <div className="md:col-span-2 relative z-[90]">
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                    Stasiun {type === 'add' && <span className="text-rose-500">*</span>}
                  </label>
                  {isStationOpen && <div className="fixed inset-0 z-[85]" onClick={() => setIsStationOpen(false)}></div>}
                  <div
                    onClick={() => !isSaving && setIsStationOpen(!isStationOpen)}
                    className={`w-full p-2.5 bg-slate-50 border ${isStationOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'} rounded-lg text-sm font-medium flex justify-between items-center transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                  >
                    <span className={formData.stasiun ? 'text-slate-800' : 'text-slate-400'}>
                      {formData.stasiun || '-- Pilih Stasiun --'}
                    </span>
                    <Icon name={isStationOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400 shrink-0" />
                  </div>

                  {isStationOpen && !isSaving && (
                    <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[95] animate-dropdown overflow-y-auto max-h-48 custom-scrollbar">
                      {stationOptionsList.map((st, i) => (
                        <div
                          key={i}
                          onClick={() => { setFormData(prev => ({ ...prev, stasiun: st })); setIsStationOpen(false); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center ${formData.stasiun === st ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {st}{formData.stasiun === st && <Icon name="check" size={14} className="ml-auto text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. ID Pelanggan (Hanya di mode Tambah Baru) */}
                {type === 'add' && (
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                      ID Pelanggan <span className="text-rose-500">*</span>
                    </label>
                    <input type="text" name="idPelanggan" value={formData.idPelanggan} onChange={handleInputChange} disabled={isSaving} placeholder="Misal: AW1234" className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase" />
                  </div>
                )}

                {/* 3. Nama Pelanggan */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Nama Pelanggan {type === 'add' && <span className="text-rose-500">*</span>}</label>
                  <input type="text" name="namaPelanggan" value={formData.namaPelanggan} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                </div>

                {/* 4. No Handphone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">No Handphone</label>
                  <input type="text" name="nomorHp" value={formData.nomorHp} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                </div>

                {/* 5. Alamat Lengkap */}
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Alamat Lengkap</label>
                  <textarea rows="2" name="alamat" value={formData.alamat} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 resize-y"></textarea>
                </div>

                {/* 6. ODP & Port (DISEMBUNYIKAN SAAT TAMBAH BARU) */}
                {type !== 'add' && (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">ODP Aktual</label>
                      <input type="text" name="odpAktual" value={formData.odpAktual} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Port ODP</label>
                      <input type="text" name="portOdp" value={formData.portOdp} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                    </div>
                  </>
                )}

                {/* 7. Koordinat Map */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Latitude</label>
                  <input type="text" name="latitude" value={formData.latitude} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Longitude</label>
                  <input type="text" name="longitude" value={formData.longitude} onChange={handleInputChange} disabled={isSaving} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
                </div>

                {/* 8. CATATAN UMUM */}
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Catatan</label>
                  <textarea rows="2" name="catatan" value={formData.catatan} onChange={handleInputChange} disabled={isSaving} placeholder="Opsional: Tulis catatan administratif..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 resize-y"></textarea>
                </div>

                {/* 8B. ISSUE / KENDALA */}
                {type !== 'add' && (
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-rose-500 mb-1.5 block uppercase tracking-wider">Issue / Kendala</label>
                    <textarea rows="2" name="issueKendala" value={formData.issueKendala || ''} onChange={handleInputChange} disabled={isSaving} placeholder="Opsional: Tulis kendala yang dialami di lapangan..." className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors disabled:opacity-50 resize-y"></textarea>
                  </div>
                )}

                {/* 9. CUSTOM DROPDOWN STATUS PELANGGAN */}
                <div className="md:col-span-2 pt-3 border-t border-slate-100 mt-2 relative z-[80]">
                  <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                    Status Pelanggan <span className="text-slate-400 font-medium normal-case ml-1">({type === 'add' ? 'Aktivasi' : 'Update Status'})</span>
                  </label>

                  {isStatusOpen && <div className="fixed inset-0 z-[75]" onClick={() => setIsStatusOpen(false)}></div>}

                  <div
                    onClick={() => !isSaving && setIsStatusOpen(!isStatusOpen)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm select-none ${currentStatusOption.bg} ${currentStatusOption.border} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-500/20'}`}
                  >
                    <div className={`flex items-center gap-2 font-bold ${currentStatusOption.text}`}>
                      <Icon name={currentStatusOption.icon} size={18} />
                      {currentStatusOption.label}
                    </div>
                    <Icon name={isStatusOpen ? "chevron-up" : "chevron-down"} size={16} className={`opacity-70 ${currentStatusOption.text}`} />
                  </div>

                  {isStatusOpen && !isSaving && (
                    <div className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-100 shadow-2xl rounded-xl py-2 z-[85] animate-dropdown">
                      {statusOptions.map((opt, i) => (
                        <div
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, aktivasi: opt.value })); setIsStatusOpen(false); }}
                          className="px-4 py-3 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 group/opt"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border ${opt.bg} ${opt.border} ${opt.text}`}><Icon name={opt.icon} size={14} /></div>
                            <span className={`text-sm font-bold ${formData.aktivasi === opt.value ? 'text-slate-800' : 'text-slate-600 group-hover/opt:text-slate-800'}`}>{opt.label}</span>
                          </div>
                          {formData.aktivasi === opt.value && <Icon name="check" size={16} className="text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAMPILAN INPUT VISIT HELPDESK */}
          {/* ======================================================== */}
          {type === 'log' && (
            <div className="space-y-5 pb-4">
              {message && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 mb-4">
                  <Icon name="alert-circle" size={18} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed text-rose-700">{message.text}</p>
                </div>
              )}

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Icon name="info" size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  Silakan catat keluhan dan deskripsi kendala pelanggan dengan detail. Sistem akan membuatkan tiket visit baru yang akan diteruskan ke tim lapangan untuk segera ditindaklanjuti.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner h-max">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                    <Icon name="file-text" size={16} className="text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Data Pelanggan</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {renderEditableDetailRow({ label: "Nama Pelanggan", fieldKey: "namaPelanggan", fullWidth: true, readOnly: true })}
                    {renderEditableDetailRow({ label: "ID Pelanggan", fieldKey: "idPelanggan", readOnly: true })}
                    {renderEditableDetailRow({ label: "Stasiun", fieldKey: "stasiun", readOnly: true, valueOverride: toProperCase(internalData.stasiun) })}
                    {renderEditableDetailRow({ label: "Nomor HP", fieldKey: "nomorHp", fullWidth: true, readOnly: true })}
                    {renderEditableDetailRow({ label: "KODE ODP", fieldKey: "odpAktual", readOnly: true, valueOverride: internalData.kodeOdp || internalData.odpAktual })}
                    {renderEditableDetailRow({ label: "Port", fieldKey: "portOdp", readOnly: true })}
                    {renderEditableDetailRow({ label: "SN ONT", fieldKey: "snOnt", fullWidth: true, readOnly: true })}
                    {renderEditableDetailRow({ label: "Lat / Long", fieldKey: "latitude", readOnly: true, valueOverride: `${internalData.latitude || '-'} , ${internalData.longitude || '-'}`, fullWidth: true })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative z-[70]">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Keluhan Pelanggan <span className="text-rose-500">*</span></label>
                    {isKeluhanOpen && <div className="fixed inset-0 z-[65]" onClick={() => setIsKeluhanOpen(false)}></div>}
                    <div
                      onClick={() => !isSaving && setIsKeluhanOpen(!isKeluhanOpen)}
                      className={`w-full p-3 bg-white border ${isKeluhanOpen ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'} rounded-xl text-sm font-bold text-slate-700 flex justify-between items-center transition-all shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{formData.keluhan}</span>
                      <Icon name={isKeluhanOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400 shrink-0 ml-2" />
                    </div>
                    {isKeluhanOpen && !isSaving && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-xl py-1.5 z-[75] animate-dropdown overflow-y-auto max-h-48 custom-scrollbar">
                        {keluhanOptionsList.map((opt, i) => (
                          <div
                            key={i} onClick={() => { setFormData(prev => ({ ...prev, keluhan: opt })); setIsKeluhanOpen(false); }}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${formData.keluhan === opt ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                          >
                            {opt}{formData.keluhan === opt && <Icon name="check" size={14} className="ml-auto text-amber-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FORM BARU: DROPDOWN PETUGAS */}
                  <div className="relative z-[60]">
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Tugaskan Teknisi <span className="text-slate-400 font-medium normal-case text-[10px]">(Opsional)</span></label>
                    {isPetugasOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsPetugasOpen(false)}></div>}
                    <div
                      onClick={() => !isSaving && setIsPetugasOpen(!isPetugasOpen)}
                      className={`w-full p-3 bg-white border ${isPetugasOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-xl text-sm font-bold text-slate-700 flex justify-between items-center transition-all shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{formData.petugas ? formData.petugas : '-- Pilih Teknisi --'}</span>
                      <Icon name={isPetugasOpen ? "chevron-up" : "chevron-down"} size={16} className="text-slate-400 shrink-0 ml-2" />
                    </div>

                    {isPetugasOpen && !isSaving && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-xl py-1.5 z-[65] animate-dropdown overflow-y-auto max-h-48 custom-scrollbar">
                        <div
                          onClick={() => { setFormData(prev => ({ ...prev, petugas: '' })); setIsPetugasOpen(false); }}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${formData.petugas === '' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                        >
                          -- Kosongkan / Belum Ditugaskan --
                          {formData.petugas === '' && <Icon name="check" size={14} className="ml-auto text-blue-600" />}
                        </div>
                        {petugasList.map((ptg, i) => (
                          <div
                            key={i}
                            onClick={() => { setFormData(prev => ({ ...prev, petugas: ptg.nama })); setIsPetugasOpen(false); }}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${formData.petugas === ptg.nama ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-slate-800">{ptg.nama}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{ptg.username}</span>
                            </div>
                            {formData.petugas === ptg.nama && <Icon name="check" size={14} className="ml-auto text-blue-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Deskripsi / Catatan <span className="text-rose-500">*</span></label>
                    <textarea
                      rows="6" name="catatanKendala" value={formData.catatanKendala} onChange={handleInputChange}
                      placeholder="Misal: Pending besok pagi, janjian dengan pelanggan jam 10:00 untuk kunjungan teknisi, imbas gangguan massal tiang roboh, dsb..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm resize-none relative z-[50]" disabled={isSaving}
                    ></textarea>
                  </div>

                  {riwayatSelesai.length > 0 && (
                    <div className="flex items-center justify-between bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-sm animate-fade">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Icon name="history" size={16} /></div>
                        <div>
                          <span className="text-[11px] font-bold text-amber-800 block leading-tight">Pernah Gangguan</span>
                          <span className="text-[9px] font-semibold text-amber-600/80 uppercase tracking-wider">{riwayatSelesai.length} Tiket Selesai</span>
                        </div>
                      </div>
                      <button onClick={() => { onClose(false); if (onGoToHistory) onGoToHistory(internalData.idPelanggan); }} className="text-[10px] font-bold text-amber-700 bg-white hover:bg-amber-100 px-3 py-2 rounded-lg transition-colors border border-amber-300 shadow-sm active:scale-95">Lihat Riwayat</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {type !== 'detail' ? (
          <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto shrink-0 z-[60] relative">
            <button onClick={() => !isSaving && onClose(false)} disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Batal</button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all transform active:scale-95 disabled:opacity-0 flex items-center ${type === 'add' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : type === 'log' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
            >
              {type === 'add' ? 'Simpan Pelanggan Baru' : type === 'log' ? 'Input Visit' : 'Simpan Perubahan'}
            </button>
          </div>
        ) : (
          <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-slate-50 mt-auto shrink-0">
            <div>
              {(String(internalData?.aktivasi || '').toLowerCase() !== 'sudah') && (
                <button onClick={() => { onClose(false); if (onGoToCoverage) onGoToCoverage(internalData.latitude, internalData.longitude); }} className="px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/30 transition-all flex items-center gap-2 transform active:scale-95">
                  <Icon name="radar" size={16} /> Cek Coverage ODP
                </button>
              )}
            </div>
            <button onClick={() => onClose(false)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all transform active:scale-95">Tutup</button>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ==========================================
// HALAMAN BARU: MANAJEMEN TIKET GANGGUAN (VISIT LOG)
// ==========================================
// PERBAIKAN: Menambahkan prop onLocalVisitUpdate
// ==========================================
// ==========================================
// HALAMAN BARU: MONITORING GANGGUAN MASSAL (GAMAS)
// ==========================================
function MonitoringGamasView() {
  const STATION_CHAIN = [
    { name: "Wadu", abbr: "WDU" },
    { name: "Randublatung", abbr: "RBG" },
    { name: "Sulur", abbr: "SL" },
    { name: "Kradenan", abbr: "KNN" },
    { name: "Brumbung", abbr: "BBG" },
    { name: "Alastua", abbr: "ATA" },
    { name: "Semarang Tawang", abbr: "SMT" },
    { name: "Kaliwungu", abbr: "KLN" },
    { name: "Kalibodri", abbr: "KBD" },
    { name: "Weleri", abbr: "WLR" },
    { name: "Krengseng", abbr: "KNS" },
  ];

  const [gamasData, setGamasData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const calculateTTR = (downtime, uptime) => {
    if (!downtime) return '-';
    // Assume downtime and uptime are in format "YYYY-MM-DD HH:mm:ss" or similar parseable string.
    const start = new Date(downtime.replace(' ', 'T'));
    const end = uptime ? new Date(uptime.replace(' ', 'T')) : new Date();

    if (isNaN(start.getTime())) return '-';

    const diffMs = end - start;
    if (diffMs < 0) return '-';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0 && diffMinutes === 0) return '< 1m';
    if (diffHours === 0) return `${diffMinutes}m`;
    return `${diffHours}h ${diffMinutes}m`;
  };
  const [filterStation, setFilterStation] = useState(null);
  const [searchLog, setSearchLog] = useState('');
  const [selectedGamas, setSelectedGamas] = useState(null); // State baru untuk melihat data spesifik
  const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  // State untuk form input gamas
  const [showInputModal, setShowInputModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    stasiun: [],
    penyebab: '',
    downtime: '',
    uptime: '',
  });

  const openModal = (gamas = null) => {
    if (gamas) {
      setFormData({
        id: gamas.id,
        stasiun: (gamas.stasiun || '').split(',').map(s => s.trim()).filter(Boolean),
        penyebab: gamas.penyebab || gamas.rca || '',
        downtime: gamas.downtime ? gamas.downtime.replace(' ', 'T').slice(0, 16) : '',
        uptime: gamas.uptime ? gamas.uptime.replace(' ', 'T').slice(0, 16) : '',
      });
    } else {
      setFormData({ id: null, stasiun: [], penyebab: '', downtime: '', uptime: '' });
    }
    setShowInputModal(true);
  };

  const handleStationToggle = (st) => {
    setFormData(prev => ({
      ...prev,
      stasiun: prev.stasiun.includes(st)
        ? prev.stasiun.filter(s => s !== st)
        : [...prev.stasiun, st]
    }));
  };

  const handleSaveGamas = async () => {
    if (formData.stasiun.length === 0 || !formData.downtime) {
      alert("Pilih minimal 1 stasiun dan isi waktu downtime!");
      return;
    }
    setIsSubmitting(true);

    // Pastikan downtime detik ada
    const dtFormat = formData.downtime.length <= 16 ? formData.downtime + ':00' : formData.downtime;
    const utFormat = formData.uptime ? (formData.uptime.length <= 16 ? formData.uptime + ':00' : formData.uptime) : null;

    const payload = {
      stasiun: formData.stasiun.join(', '),
      penyebab: formData.penyebab,
      downtime: dtFormat.replace('T', ' '),
      uptime: utFormat ? utFormat.replace('T', ' ') : null,
      status: utFormat ? 'RESOLVED' : 'OPEN',
    };

    try {
      if (formData.id) {
        const { error } = await supabase.from('rekap_massal').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rekap_massal').insert([payload]);
        if (error) throw error;
      }

      setShowInputModal(false);
      setFormData({ id: null, stasiun: [], penyebab: '', downtime: '', uptime: '' });
      loadData(true);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGamas = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data gangguan massal ini?")) return;
    try {
      const { error } = await supabase.from('rekap_massal').delete().eq('id', id);
      if (error) throw error;
      loadData(true);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data: " + err.message);
    }
  };
  const loadData = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('rekap_massal')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      } else {
        setGamasData(data || []);
        setLoadError(null);
      }
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const ch = supabase
      .channel('gamas_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rekap_massal' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setGamasData(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setGamasData(prev => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item));
        } else if (payload.eventType === 'DELETE') {
          setGamasData(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const isDone = (g) => g.uptime != null || ['DONE', 'SELESAI', 'RESOLVED', 'CLOSED'].includes(String(g.status || '').toUpperCase());

  // Fungsi untuk mengekstrak array nama stasiun dari string koma
  const parseStations = (stasiunStr) => {
    if (!stasiunStr) return [];
    return stasiunStr.split(',').map(s => {
      let st = s.trim().toLowerCase();
      if (st === 'tawang') return 'semarang tawang';
      return st;
    });
  };

  // Jika ada log yang di-klik, ambil stasiun dari log tersebut.
  // Jika tidak, ambil dari semua gangguan aktif.
  const activeStations = useMemo(() => {
    if (selectedGamas) {
      return new Set(parseStations(selectedGamas.stasiun));
    }
    const activeSets = gamasData.filter(g => !isDone(g)).map(g => parseStations(g.stasiun)).flat();
    return new Set(activeSets);
  }, [gamasData, selectedGamas]);

  const countActive = (name) => {
    if (selectedGamas) return parseStations(selectedGamas.stasiun).includes(name.toLowerCase()) ? 1 : 0;
    return gamasData.filter(g => !isDone(g) && parseStations(g.stasiun).includes(name.toLowerCase())).length;
  };

  const displayData = useMemo(() => {
    let d = gamasData;
    if (filterStation) d = d.filter(g => String(g.stasiun || '').toLowerCase().includes(filterStation.toLowerCase()));

    if (filterMonth) {
      d = d.filter(g => {
        const dateStr = g.downtime || g.created_at;
        return dateStr && dateStr.startsWith(filterMonth);
      });
    }
    if (searchLog.trim()) {
      const q = searchLog.toLowerCase();
      d = d.filter(g =>
        String(g.stasiun || '').toLowerCase().includes(q) ||
        String(g.penyebab || '').toLowerCase().includes(q) ||
        String(g.kronologi || '').toLowerCase().includes(q) ||
        String(g.area_terdampak || '').toLowerCase().includes(q)
      );
    }
    return d;
  }, [gamasData, filterStation, filterMonth, searchLog]);

  const totalAktif = gamasData.filter(g => !isDone(g)).length;

  const fmtDate = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      const p = n => String(n).padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch { return String(ts); }
  };

  const renderCalendarView = () => {
    let year, month;
    if (filterMonth) {
      [year, month] = filterMonth.split('-').map(Number);
      month -= 1; // 0-indexed
    } else {
      const d = new Date();
      year = d.getFullYear();
      month = d.getMonth();
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const eventsByDay = {};
    displayData.forEach(g => {
      const dStr = g.downtime || g.created_at;
      if (!dStr) return;
      const d = new Date(dStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(g);
      }
    });

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i);

    return (
      <div className="p-2 px-4 bg-slate-50/50 rounded-b-2xl overflow-hidden relative">
        <div className="grid grid-cols-7 gap-1.5 animate-fade">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, idx) => (
            <div key={d} className={`text-center text-[11px] font-bold py-1 ${idx === 0 ? 'text-rose-500' : 'text-slate-500'}`}>{d}</div>
          ))}
          {blanks.map(b => (
            <div key={`blank-${b}`} className="p-1 border border-transparent"></div>
          ))}
          {daysArray.map(day => {
            const events = eventsByDay[day] || [];
            const hasEvent = events.length > 0;
            const isSunday = new Date(year, month, day).getDay() === 0;
            return (
              <div
                key={day}
                className={`relative p-1.5 px-2 rounded-xl border ${hasEvent ? 'bg-rose-50 border-rose-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group' : 'bg-white border-slate-100'} min-h-[50px] sm:min-h-[58px] flex flex-col shadow-sm`}
                title={hasEvent ? `Stasiun Terdampak:\n${events.map(e => e.stasiun).join('\n')}` : ''}
              >
                <span className={`text-xs font-bold ${hasEvent ? 'text-rose-600' : isSunday ? 'text-rose-500' : 'text-slate-600'}`}>{day}</span>
                {hasEvent && (
                  <div className="mt-auto space-y-1 w-full">
                    {events.map((ev, idx) => {
                      const stList = (ev.stasiun || '').split(',').map(s => s.trim());
                      const label = stList[0] + (stList.length > 1 ? ` +${stList.length - 1}` : '');
                      return (
                        <div key={idx} className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded truncate shadow-sm w-full leading-tight">
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-5 pb-8 page-enter">

      {/* ── STATS BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl shadow-lg text-white ${totalAktif > 0 ? 'bg-rose-600 shadow-rose-500/30' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
            <Icon name="activity" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-none">Monitoring Gangguan Massal</h2>
            <p className={`text-sm mt-1 font-semibold ${totalAktif > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalAktif > 0 ? `⚠ ${totalAktif} Gangguan Massal Aktif` : '✓ Semua stasiun beroperasi normal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filterStation && (
            <button onClick={() => setFilterStation(null)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
              <Icon name="x" size={12} /> Reset Filter
            </button>
          )}
          <button onClick={() => loadData(true)} disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50">
            <Icon name="refresh-cw" size={13} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STATION CHAIN VISUALIZATION ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Icon name="network" size={15} className={selectedGamas ? "text-blue-600" : "text-blue-500"} />
            {selectedGamas ? 'Stasiun Terdampak Gamas' : 'Peta Jaringan Stasiun (Live)'}
            {!selectedGamas && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">Klik tabel untuk visualisasi historis</span>}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
            {selectedGamas && (
              <button onClick={() => setSelectedGamas(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all mr-2 shadow-sm">
                <Icon name="arrow-left" size={12} /> Kembali ke Live Monitoring
              </button>
            )}
            <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Normal</span>
            <span className="flex items-center gap-1.5 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />Terdampak</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm font-medium">Memuat data...</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center h-40 text-rose-500 text-sm font-medium gap-2">
            <Icon name="alert-circle" size={18} /> Gagal memuat: {loadError}
          </div>
        ) : (
          <div className="overflow-x-auto pb-3 no-scrollbar">
            <div className="flex items-end justify-between min-w-max lg:min-w-0 lg:w-full px-4 py-6 gap-2 lg:gap-0">
              {STATION_CHAIN.map((st, idx) => {
                const affected = activeStations.has(st.name.toLowerCase());
                const selected = filterStation === st.name;
                const cnt = countActive(st.name);
                const nextAff = idx < STATION_CHAIN.length - 1 && activeStations.has(STATION_CHAIN[idx + 1].name.toLowerCase());
                const lineRed = affected || nextAff;

                return (
                  <React.Fragment key={st.name}>
                    {/* NODE */}
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        {affected && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-rose-400 opacity-25 pointer-events-none" style={{ width: '96px', height: '96px', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                        )}
                        <button
                          onClick={() => setFilterStation(selected ? null : st.name)}
                          title={`${st.name}${affected ? ' — OLT Down' : ' — Online'}`}
                          className={`
                            relative z-10 flex flex-col items-center w-[76px] rounded-2xl border-2 px-1 py-2.5 cursor-pointer transition-all duration-200 shadow-sm
                            ${selected ? 'bg-blue-600 border-blue-500 shadow-blue-400/40 shadow-lg scale-110'
                              : affected ? 'bg-rose-600 border-rose-400 shadow-rose-500/40 shadow-lg scale-105'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1'}
                          `}
                        >
                          {/* Affected badge */}
                          {affected && !selectedGamas && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-200 text-rose-800 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
                              !
                            </div>
                          )}
                          {/* Icon */}
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-1.5 ${selected || affected ? 'bg-white/20' : 'bg-slate-50 border border-slate-200'}`}>
                            <Icon name={affected ? 'wifi-off' : 'radio'} size={14} className={selected || affected ? 'text-white' : 'text-blue-500'} />
                          </div>
                          <span className={`text-[9px] font-black tracking-widest uppercase ${selected || affected ? 'text-white/70' : 'text-slate-400'}`}>{st.abbr}</span>
                          <span className={`text-[10px] font-bold text-center leading-tight mt-0.5 px-0.5 ${selected || affected ? 'text-white' : 'text-slate-700'}`}>{st.name}</span>
                          {/* Status dot */}
                          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow ${selected ? 'bg-blue-400' : affected ? 'bg-rose-300 animate-pulse' : 'bg-emerald-500'}`} />
                        </button>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-4">RBS</span>
                    </div>

                    {/* CONNECTOR */}
                    {idx < STATION_CHAIN.length - 1 && (
                      <div className="flex items-center self-center mb-5 mx-0 lg:mx-[-2px] flex-1 min-w-[15px] lg:min-w-[2px] z-0" style={{ marginTop: '-14px' }}>
                        <div className={`w-full h-1.5 rounded-none overflow-hidden relative ${lineRed ? 'bg-rose-200' : 'bg-blue-400'}`}>
                          {lineRed ? (
                            <div className="absolute inset-y-0 rounded-none bg-rose-500 w-full animate-pulse" />
                          ) : (
                            <div className="absolute inset-y-0 rounded-none bg-blue-300" style={{ width: '45%', animation: 'slideConnector 2s linear infinite' }} />
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── LOG TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        {/* Table header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')}
              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors bg-slate-100 border border-slate-200 shadow-sm group"
              title="Ganti Tampilan (List / Kalender)"
            >
              <Icon name={viewMode === 'list' ? "calendar" : "list"} size={15} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
            </button>
            <h3 className="text-sm font-bold text-slate-700 ml-1">Log Gangguan Massal</h3>
            {filterStation && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Filter: {filterStation}
              </span>
            )}
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{displayData.length} data</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative">
              <Icon name="calendar" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full sm:w-[140px] pl-8 pr-2 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-all cursor-pointer shadow-sm [color-scheme:light]"
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={searchLog} onChange={e => setSearchLog(e.target.value)}
                placeholder="Cari stasiun, penyebab..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-all"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm whitespace-nowrap"
            >
              <Icon name="plus" size={14} /> Tambah Data
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? renderCalendarView() : (
          <div className="overflow-auto flex-1 animate-fade max-h-[420px]">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Site / Stasiun Terdampak</th>
                  <th className="px-4 py-3">RCA / Penyebab</th>
                  <th className="px-4 py-3">Downtime</th>
                  <th className="px-4 py-3">Uptime</th>
                  <th className="px-4 py-3">TTR</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!isLoading && displayData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Icon name="inbox" size={32} className="text-slate-300" />
                        <p className="text-sm font-medium">Belum ada data gangguan massal</p>
                      </div>
                    </td>
                  </tr>
                ) : displayData.map((g, i) => {
                  const done = isDone(g);
                  const isSelectedRow = selectedGamas?.id === g.id;

                  return (
                    <tr
                      key={g.id || i}
                      onClick={() => setSelectedGamas(isSelectedRow ? null : g)}
                      className={`cursor-pointer transition-colors ${isSelectedRow
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-500'
                        : !done
                          ? 'hover:bg-slate-50/60 border-l-4 border-l-rose-400'
                          : 'hover:bg-slate-50/60 border-l-4 border-l-transparent'
                        }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-bold text-slate-700">{fmtDate(g.downtime || g.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-slate-100' : 'bg-rose-100'} ${isSelectedRow ? 'bg-blue-200 text-blue-700' : ''}`}>
                            <Icon name={isSelectedRow ? 'eye' : 'radio'} size={13} className={isSelectedRow ? 'text-blue-600' : done ? 'text-slate-400' : 'text-rose-600'} />
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-relaxed">
                            {g.stasiun || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {g.penyebab || g.rca || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-500 font-mono">
                          {fmtDate(g.downtime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-500 font-mono">
                          {fmtDate(g.uptime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                          {calculateTTR(g.downtime, g.uptime)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap group">
                        <div className="flex items-center justify-center gap-2 min-h-[32px]">
                          {/* Status Badge */}
                          <div className="group-hover:hidden transition-all duration-200">
                            {done ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />Aktif
                              </span>
                            )}
                          </div>

                          {/* Action Buttons (Hidden by default, shown on hover) */}
                          <div className="hidden group-hover:flex items-center gap-1 animate-fade">
                            <button
                              onClick={(e) => { e.stopPropagation(); openModal(g); }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white border border-slate-200 shadow-sm"
                              title="Edit Data"
                            >
                              <Icon name="edit-3" size={12} />
                            </button>

                            {/* Resolve Button */}
                            {!done && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openModal(g); }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors bg-white border border-slate-200 shadow-sm"
                                title="Resolve Gangguan"
                              >
                                <Icon name="check-circle" size={12} />
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteGamas(g.id); }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors bg-white border border-slate-200 shadow-sm"
                              title="Hapus Data"
                            >
                              <Icon name="trash-2" size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ── MODAL INPUT GAMAS ── */}
      {showInputModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade" onClick={() => !isSubmitting && setShowInputModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[540px] overflow-hidden animate-modal border border-slate-100 relative z-10">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon name="plus-circle" size={20} />
                </div>
                Input Log Gangguan Massal
              </h3>
              <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all">
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 bg-slate-50/30">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-700">Stasiun Terdampak <span className="text-rose-500">*</span></label>
                  {formData.stasiun.length > 0 && (
                    <button
                      onClick={() => setFormData({ ...formData, stasiun: [] })}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-rose-200"
                    >
                      <Icon name="rotate-ccw" size={12} /> Reset Pilihan
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATION_CHAIN.map(st => {
                    const isSelected = formData.stasiun.includes(st.name);
                    return (
                      <button
                        key={st.name}
                        onClick={() => handleStationToggle(st.name)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                          }`}
                      >
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">RCA / Penyebab / Keterangan</label>
                <textarea
                  value={formData.penyebab}
                  onChange={e => setFormData({ ...formData, penyebab: e.target.value })}
                  rows={2}
                  className="w-full text-sm p-3.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Deskripsikan penyebab gangguan secara detail..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Waktu Mulai <span className="text-rose-500">*</span></label>
                  <input
                    type="datetime-local"
                    lang="en-GB"
                    value={formData.downtime}
                    onChange={e => setFormData({ ...formData, downtime: e.target.value })}
                    className="w-full text-sm p-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    lang="en-GB"
                    value={formData.uptime}
                    onChange={e => setFormData({ ...formData, uptime: e.target.value })}
                    className="w-full text-sm p-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">*Kosongkan jika gangguan masih aktif</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowInputModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                Batal
              </button>
              <button
                onClick={handleSaveGamas}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="save" size={16} />}
                Simpan Log
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ==========================================
// HALAMAN: MANAJEMEN TIKET GANGGUAN (DENGAN FITUR RESOLVE & DELETE)
// ==========================================
function DataGangguanView({ visitData, pelangganData = [], petugasList = [], onRefresh, onLocalVisitUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('hari_ini');

  // EFEK PENANGKAP NAVIGASI RIWAYAT DARI MODAL INPUT VISIT
  useEffect(() => {
    const historyId = sessionStorage.getItem('otas_history_search');
    if (historyId) {
      setSearchTerm(historyId);
      setStatusFilter('DONE');
      setStationFilter('');
      setTimeFilter('');
      sessionStorage.removeItem('otas_history_search');
    }
  }, []);

  // STATE UNTUK CUSTOM DROPDOWN
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Pagination State for Data Gangguan
  const [currentPageVisit, setCurrentPageVisit] = useState(1);
  const ITEMS_PER_PAGE_VISIT = 10;

  // STATE UNTUK MODAL SELESAI & HAPUS
  const [isResolving, setIsResolving] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [resolveTindakan, setResolveTindakan] = useState('');
  const [resolveMaterial, setResolveMaterial] = useState('');
  const [resolveError, setResolveError] = useState('');

  // ========== STATE MODAL INPUT TIKET BARU ==========
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
  const [newTicketSuccess, setNewTicketSuccess] = useState(false);

  const keluhanOptions = [
    "Modem LOS / Nyala Merah", "No Internet / Bengong", "Koneksi Putus-Putus / Lambat",
    "Kabel Drop / Putus", "Perangkat Mati / Rusak", "Kendala Konfigurasi / Sistem",
    "Tindak Lanjut Visit Teknisi", "Keluhan Lainnya..."
  ];

  const filteredPelangganSuggestions = useMemo(() => {
    if (!newTicketSearch.trim() || newTicketSearch.length < 2) return [];
    const q = newTicketSearch.toLowerCase();
    return (pelangganData || []).filter(p =>
      String(p.idPelanggan || '').toLowerCase().includes(q) ||
      String(p.namaPelanggan || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [newTicketSearch, pelangganData]);

  const filteredPetugasList = useMemo(() => {
    if (!newTicketPetugasSearch.trim()) return petugasList;
    const q = newTicketPetugasSearch.toLowerCase();
    return (petugasList || []).filter(ptg =>
      String(ptg.nama || '').toLowerCase().includes(q) ||
      String(ptg.username || '').toLowerCase().includes(q)
    );
  }, [newTicketPetugasSearch, petugasList]);

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
    setNewTicketSuccess(false);
  };

  const handleNewTicketSubmit = async () => {
    if (!newTicketSelectedPelanggan) { setNewTicketError('Pilih pelanggan terlebih dahulu!'); return; }
    if (!newTicketKeluhan) { setNewTicketError('Keluhan pelanggan wajib dipilih!'); return; }
    if (!newTicketCatatan.trim()) { setNewTicketError('Deskripsi / catatan wajib diisi!'); return; }

    setNewTicketIsSaving(true);
    setNewTicketError('');

    let usernamePetugas = newTicketPetugas;
    if (newTicketPetugas && petugasList.length > 0) {
      const tk = petugasList.find(t => t.nama === newTicketPetugas);
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
      try { if (onLocalVisitUpdate) onLocalVisitUpdate('add', payload); } catch (e) { }
      setNewTicketIsSaving(false);
      setNewTicketSuccess(true);
      setTimeout(() => { setShowNewTicketModal(false); resetNewTicketModal(); }, 1500);
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
      console.warn("Supabase insert error:", err);
      finalize();
    }
  };

  const statusOptionsList = [
    { val: '', label: 'Semua Tiket' },
    { val: 'OPEN', label: 'Tiket Aktif (OPEN)' },
    { val: 'DONE', label: 'Tiket Selesai (DONE)' }
  ];

  const timeOptionsList = [
    { val: '', label: 'Semua Waktu' },
    { val: 'hari_ini', label: 'Hari Ini' },
    { val: 'minggu_ini', label: 'Minggu Ini' },
    { val: 'bulan_ini', label: 'Bulan Ini' }
  ];

  const uniqueStations = useMemo(() => {
    const defaultStations = ["Alastua", "Brumbung", "Kalibodri", "Kaliwungu", "Kradenan", "Krengseng", "Randublatung", "Semarang Tawang", "Sulur", "Wadu", "Weleri"];
    const rawStations = (visitData || []).map(v => v.stasiun).filter(Boolean);
    const properStations = rawStations.map(st => toProperCase(st));
    return [...new Set([...defaultStations, ...properStations])].sort();
  }, [visitData]);

  const enrichedVisitData = useMemo(() => {
    if (!visitData || !Array.isArray(visitData)) return [];
    if (!pelangganData || !Array.isArray(pelangganData)) return visitData;
    const customerMap = {};
    pelangganData.forEach(p => {
      if (p.idPelanggan) customerMap[String(p.idPelanggan).trim().toUpperCase()] = p;
    });
    const cleanVisits = deduplicateVisitData(visitData);
    return cleanVisits.map(item => {
      const custId = String(item.idPelanggan || '').trim().toUpperCase();
      const customer = customerMap[custId];
      if (customer) {
        return {
          ...item,
          nomorHp: item.nomorHp || customer.nomorHp || '',
          latitude: item.latitude || customer.latitude || '',
          longitude: item.longitude || customer.longitude || '',
          odpAktual: item.odpAktual || customer.odpAktual || customer.kodeOdp || '',
          portOdp: item.portOdp || item.port || customer.portOdp || '',
          snOnt: item.snOnt || customer.snOnt || '',
          alamat: item.alamat || customer.alamat || ''
        };
      }
      return item;
    });
  }, [visitData, pelangganData]);

  const parseTimestampMs = (tStr) => {
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

  const filteredData = useMemo(() => {
    if (!enrichedVisitData || !Array.isArray(enrichedVisitData)) return [];
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diff);
    const startOfWeekStr = startOfWeek.getFullYear() + '-' + String(startOfWeek.getMonth() + 1).padStart(2, '0') + '-' + String(startOfWeek.getDate()).padStart(2, '0');
    const startOfMonthStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';

    const result = enrichedVisitData.filter(item => {
      const matchSearch = String(item.namaPelanggan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.idPelanggan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.keluhan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.petugas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.odpAktual || '').toLowerCase().includes(searchTerm.toLowerCase());

      const itemStatus = String(item.status || '').toUpperCase();
      const matchStatus = statusFilter === '' ? true : (statusFilter === 'DONE' ? (['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(itemStatus)) : (!['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(itemStatus)));
      const matchStation = stationFilter === '' ? true : String(item.stasiun || '').toLowerCase() === stationFilter.toLowerCase();

      let matchTime = true;
      const itemDateStr = item.timestamp ? standardizeDate(item.timestamp) : '';

      if (timeFilter === 'hari_ini') matchTime = itemDateStr === todayStr;
      else if (timeFilter === 'minggu_ini') matchTime = itemDateStr >= startOfWeekStr && itemDateStr <= todayStr;
      else if (timeFilter === 'bulan_ini') matchTime = itemDateStr >= startOfMonthStr && itemDateStr <= todayStr;

      return matchSearch && matchStatus && matchStation && matchTime;
    });

    // Urutkan dari yang paling baru (Newest timestamp first)
    return result.sort((a, b) => {
      const tB = parseTimestampMs(b.timestamp);
      const tA = parseTimestampMs(a.timestamp);
      return tB - tA;
    });
  }, [enrichedVisitData, searchTerm, statusFilter, stationFilter, timeFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPageVisit(1);
  }, [searchTerm, statusFilter, stationFilter, timeFilter]);

  // Pagination Variables
  const totalPagesVisit = Math.ceil(filteredData.length / ITEMS_PER_PAGE_VISIT);
  const startIndexVisit = (currentPageVisit - 1) * ITEMS_PER_PAGE_VISIT;
  const endIndexVisit = startIndexVisit + ITEMS_PER_PAGE_VISIT;
  const currentDataVisit = filteredData.slice(startIndexVisit, endIndexVisit);

  const handleResolve = async () => {
    if (!resolveTarget) return;
    if (!resolveTindakan.trim()) {
      setResolveError('Form Tindakan Perbaikan wajib diisi!');
      return;
    }

    setIsResolving(true);
    setResolveError('');

    const payload = {
      id: resolveTarget.id,
      timestamp: resolveTarget.timestamp,
      idPelanggan: resolveTarget.idPelanggan,
      namaPelanggan: resolveTarget.namaPelanggan,
      stasiun: resolveTarget.stasiun,
      tindakan: resolveTindakan,
      material: resolveMaterial,
      penyebab: resolveTarget.penyebab || '',
      petugas: resolveTarget.petugas || ''
    };

    try {
      // 1. Eksekusi update langsung ke Supabase dan state lokal
      if (onLocalVisitUpdate) {
        await onLocalVisitUpdate('resolve', payload);
      }

      // 2. Kirim update ke Google Apps Script di background (non-blocking)
      if (typeof api !== 'undefined' && api.run) {
        api.run('resolveVisitTicket', payload).catch(e => console.warn("GAS resolve sync warning:", e));
      }

      // 3. Sukses, tutup modal
      setTimeout(() => {
        setIsResolving(false);
        setResolveTarget(null);
        setResolveTindakan('');
        setResolveMaterial('');
      }, 300);
    } catch (err) {
      console.error("Gagal menyelesaikan tiket:", err);
      setIsResolving(false);
      setResolveError(err.message || 'Gagal menyimpan perubahan.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);

    const payload = {
      id: deleteTarget.id,
      timestamp: deleteTarget.timestamp,
      idPelanggan: deleteTarget.idPelanggan
    };

    try {
      // 1. Eksekusi hapus di Supabase dan state lokal
      if (onLocalVisitUpdate) {
        await onLocalVisitUpdate('delete', deleteTarget);
      }

      // 2. Sync ke Google Apps Script di background (non-blocking)
      if (typeof api !== 'undefined' && api.run) {
        api.run('deleteVisitLog', payload).catch(e => console.warn("GAS delete sync warning:", e));
      }

      // 3. Sukses, tutup modal
      setTimeout(() => {
        setDeleteTarget(null);
        setIsProcessing(false);
      }, 300);
    } catch (err) {
      console.error("Gagal menghapus tiket:", err);
      setIsProcessing(false);
      alert('Gagal menghapus data: ' + (err.message || 'Error'));
    }
  };

  const toggleDropdown = (dropdownName) => {
    setIsStatusDropdownOpen(dropdownName === 'status' ? !isStatusDropdownOpen : false);
    setIsStationDropdownOpen(dropdownName === 'station' ? !isStationDropdownOpen : false);
    setIsTimeDropdownOpen(dropdownName === 'time' ? !isTimeDropdownOpen : false);
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto h-full flex flex-col page-enter relative pb-0">

      {/* POPUP KONFIRMASI HAPUS (MODAL MERAH) */}
      {deleteTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 animate-fade" onClick={() => !isProcessing && setDeleteTarget(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl p-0 relative z-10 max-w-sm w-full animate-modal overflow-hidden border border-slate-100 text-center">

            {/* LOADING OVERLAY DI DALAM MODAL HAPUS */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade">
                <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin mb-3 shadow-md"></div>
                <h3 className="text-sm font-bold text-slate-800">Menghapus Data...</h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 animate-pulse">
                  <Icon name="refresh-cw" size={10} className="animate-spin" />
                  Mensinkronisasi dengan server
                </p>
              </div>
            )}

            <div className="bg-rose-600 p-6 text-center relative overflow-hidden">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30">
                <Icon name="trash-2" size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-white tracking-wide">Hapus Tiket Visit</h3>
            </div>
            <div className="p-7">
              <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
                Hapus tiket visit pelanggan <b className="text-slate-800">{deleteTarget.namaPelanggan}</b>? Tindakan ini akan menghapus log dari database.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} disabled={isProcessing} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Batal</button>
                <button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-50">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* POPUP KONFIRMASI SELESAIKAN TIKET */}
      {resolveTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 animate-fade" onClick={() => !isResolving && setResolveTarget(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl p-0 relative z-10 max-w-lg w-full animate-modal overflow-hidden border border-slate-100">

            {/* LOADING OVERLAY DI DALAM MODAL SELESAI */}
            {isResolving && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3 shadow-md"></div>
                <h3 className="text-sm font-bold text-slate-800">Menyimpan Perbaikan...</h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 animate-pulse">
                  <Icon name="refresh-cw" size={10} className="animate-spin" />
                  Mensinkronisasi dengan server
                </p>
              </div>
            )}

            <div className="bg-emerald-600 p-6 text-center relative overflow-hidden">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 relative z-10 backdrop-blur-sm border border-white/30"><Icon name="check-circle" size={28} className="text-white" /></div>
              <h3 className="text-xl font-black text-white relative z-10 tracking-wide">Penyelesaian Tiket</h3>
            </div>
            <div className="p-7">
              {resolveError && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl mb-5 flex items-start"><Icon name="alert-circle" size={16} className="mr-2 shrink-0" /><span>{resolveError}</span></div>}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-left flex justify-between items-center">
                <div><span className="text-[10px] font-bold text-slate-400 font-mono mb-1 block">{resolveTarget.idPelanggan}</span><p className="font-bold text-slate-800 text-sm">{resolveTarget.namaPelanggan}</p></div>
                <div className="text-right"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Keluhan</span><span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-1 rounded uppercase">{resolveTarget.keluhan}</span></div>
              </div>
              <div className="space-y-4 mb-7 text-left">
                <div><label className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 block">Tindakan Perbaikan <span className="text-rose-500">*</span></label>
                  <textarea value={resolveTindakan} onChange={(e) => setResolveTindakan(e.target.value)} disabled={isResolving} placeholder="Tindakan yang dilakukan teknisi..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none disabled:bg-slate-50 disabled:text-slate-400" rows="3"></textarea></div>
                <div><label className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 block">Material Digunakan</label>
                  <input type="text" value={resolveMaterial} onChange={(e) => setResolveMaterial(e.target.value)} disabled={isResolving} placeholder="Misal: 50m Dropcore, 2 Fastcon..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResolveTarget(null)} disabled={isResolving} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Batal</button>
                <button onClick={handleResolve} disabled={isResolving} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">Simpan & Selesai</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* MODAL INPUT TIKET BARU */}
      {/* ============================================================ */}
      {showNewTicketModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => !newTicketIsSaving && (setShowNewTicketModal(false), resetNewTicketModal())}></div>

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-modal flex flex-col border border-slate-100 overflow-hidden">

            {/* Loading Overlay */}
            {newTicketIsSaving && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center rounded-2xl">
                {/* Animated ring */}
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full bg-amber-50 flex items-center justify-center">
                    <Icon name="headset" size={22} className="text-amber-500" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Menyimpan Tiket...</h3>
                <p className="text-xs text-slate-400 font-medium animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
                  Mensinkronisasi dengan server
                </p>
              </div>
            )}

            {/* Success Overlay */}
            {newTicketSuccess && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center rounded-2xl">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner">
                    <Icon name="check-circle" size={40} className="text-emerald-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                    <Icon name="check" size={14} className="text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Tiket Berhasil Dibuat!</h3>
                <p className="text-sm text-slate-500">Tiket visit telah tercatat ke sistem.</p>
              </div>
            )}

            {/* Header Modal */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-2">
                <Icon name="headset" size={100} className="text-white" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                    <Icon name="plus-circle" size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight leading-none">Input Tiket Baru</h2>
                    <p className="text-amber-100 text-[11px] font-medium mt-0.5">Buat tiket visit / gangguan pelanggan</p>
                  </div>
                </div>
                <button onClick={() => { setShowNewTicketModal(false); resetNewTicketModal(); }} disabled={newTicketIsSaving} className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                  <Icon name="x" size={20} />
                </button>
              </div>
            </div>

            {/* Body Modal */}
            <div className="p-6 pb-24 space-y-5 overflow-y-auto custom-scrollbar max-h-[70vh]">

              {newTicketError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-fade">
                  <Icon name="alert-circle" size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-rose-700">{newTicketError}</p>
                </div>
              )}

              {/* 1. PENCARIAN PELANGGAN */}
              <div className="relative z-[80]">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Cari Pelanggan <span className="text-rose-500">*</span>
                </label>
                {newTicketSelectedPelanggan ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3 animate-fade">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <Icon name="user-check" size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{newTicketSelectedPelanggan.namaPelanggan}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{newTicketSelectedPelanggan.idPelanggan} · {toProperCase(newTicketSelectedPelanggan.stasiun)}</p>
                        {newTicketSelectedPelanggan.odpAktual && <p className="text-[10px] text-slate-400">ODP: {newTicketSelectedPelanggan.odpAktual}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setNewTicketSelectedPelanggan(null); setNewTicketSearch(''); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={newTicketSearch}
                      onChange={e => setNewTicketSearch(e.target.value)}
                      placeholder="Ketik ID atau nama pelanggan (min. 2 karakter)..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
                      autoFocus
                    />
                    {filteredPelangganSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 z-[90] animate-dropdown overflow-y-auto max-h-52 custom-scrollbar">
                        {filteredPelangganSuggestions.map((p, i) => (
                          <div
                            key={i}
                            onClick={() => { setNewTicketSelectedPelanggan(p); setNewTicketSearch(''); }}
                            className="px-4 py-3 cursor-pointer hover:bg-amber-50 border-b border-slate-50 last:border-0 flex flex-col group transition-all"
                          >
                            <span className="font-bold text-slate-800 text-sm group-hover:text-amber-700">{p.namaPelanggan}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.idPelanggan} · {toProperCase(p.stasiun || '')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {newTicketSearch.length >= 2 && filteredPelangganSuggestions.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-[90] text-center">
                        <p className="text-xs text-slate-400 italic">Pelanggan tidak ditemukan.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. PILIH KELUHAN */}
              <div className="relative z-[70]">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Keluhan Pelanggan <span className="text-rose-500">*</span>
                </label>
                {newTicketIsKeluhanOpen && <div className="fixed inset-0 z-[65]" onClick={() => setNewTicketIsKeluhanOpen(false)}></div>}
                <div
                  onClick={() => setNewTicketIsKeluhanOpen(!newTicketIsKeluhanOpen)}
                  className={`w-full p-3 bg-white border ${newTicketIsKeluhanOpen ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'} rounded-xl text-sm font-semibold text-slate-700 flex justify-between items-center cursor-pointer shadow-sm transition-all`}
                >
                  <span className={newTicketKeluhan ? 'text-slate-800' : 'text-slate-400 font-normal'}>{newTicketKeluhan || '-- Pilih jenis keluhan --'}</span>
                  <Icon name={newTicketIsKeluhanOpen ? 'chevron-up' : 'chevron-down'} size={16} className="text-slate-400 shrink-0 ml-2" />
                </div>
                {newTicketIsKeluhanOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl py-1.5 z-[75] animate-dropdown overflow-y-auto max-h-48 custom-scrollbar">
                    {keluhanOptions.map((opt, i) => (
                      <div
                        key={i}
                        onClick={() => { setNewTicketKeluhan(opt); setNewTicketIsKeluhanOpen(false); }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center ${newTicketKeluhan === opt ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                      >
                        {opt}{newTicketKeluhan === opt && <Icon name="check" size={14} className="ml-auto text-amber-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. PENUGASAN PETUGAS */}
              <div className="relative z-[60]">
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Tugaskan Teknisi <span className="text-slate-400 font-normal text-[10px] normal-case">(Opsional)</span>
                </label>
                {newTicketIsPetugasOpen && <div className="fixed inset-0 z-[55]" onClick={() => setNewTicketIsPetugasOpen(false)}></div>}

                <div className="relative">
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
                    className={`w-full p-3 pr-10 bg-white border ${newTicketIsPetugasOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all text-slate-700 cursor-text`}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 px-4 flex items-center cursor-pointer"
                    onClick={() => setNewTicketIsPetugasOpen(!newTicketIsPetugasOpen)}
                  >
                    <Icon name={newTicketIsPetugasOpen ? 'chevron-up' : 'chevron-down'} size={16} className="text-slate-400" />
                  </div>
                </div>

                {newTicketIsPetugasOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl py-1.5 z-[65] animate-dropdown overflow-y-auto max-h-48 custom-scrollbar">
                    <div onClick={() => { setNewTicketPetugas(''); setNewTicketPetugasSearch(''); setNewTicketIsPetugasOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer flex items-center ${!newTicketPetugas ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                      -- Kosongkan / Belum Ditugaskan --
                      {!newTicketPetugas && <Icon name="check" size={14} className="ml-auto text-blue-600" />}
                    </div>
                    {filteredPetugasList.map((ptg, i) => (
                      <div
                        key={i}
                        onClick={() => { setNewTicketPetugas(ptg.nama); setNewTicketPetugasSearch(''); setNewTicketIsPetugasOpen(false); }}
                        className={`px-4 py-2.5 text-sm cursor-pointer flex items-center transition-colors ${newTicketPetugas === ptg.nama ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                      >
                        <div className="flex flex-col">
                          <span>{ptg.nama}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{ptg.username} · {ptg.stasiun}</span>
                        </div>
                        {newTicketPetugas === ptg.nama && <Icon name="check" size={14} className="ml-auto text-blue-600" />}
                      </div>
                    ))}
                    {filteredPetugasList.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
                        Teknisi tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. DESKRIPSI / CATATAN */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                  Deskripsi / Catatan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="4"
                  value={newTicketCatatan}
                  onChange={e => setNewTicketCatatan(e.target.value)}
                  placeholder="Catat detail keluhan pelanggan, situasi di lapangan, atau instruksi kepada teknisi..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
              <button
                onClick={() => { setShowNewTicketModal(false); resetNewTicketModal(); }}
                disabled={newTicketIsSaving}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleNewTicketSubmit}
                disabled={newTicketIsSaving || !newTicketSelectedPelanggan || !newTicketKeluhan || !newTicketCatatan.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon name="save" size={16} />
                Buat Tiket
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* HEADER & FILTER BAR */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 sm:gap-4 mb-3.5 sm:mb-6 shrink-0 relative z-20">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start lg:items-center justify-between">

          {/* Pencarian Teks */}
          <div className="relative w-full lg:w-96 shrink-0">
            <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari ID, Nama Pelanggan, atau Keluhan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>

          {/* Custom Filters + Tombol Input Baru */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">

            {/* 1. FILTER STASIUN */}
            <div className={`relative w-full sm:w-36 lg:w-44 ${isStationDropdownOpen ? 'z-[62]' : 'z-[60]'}`}>
              {isStationDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsStationDropdownOpen(false)}></div>}
              <div
                onClick={() => toggleDropdown('station')}
                className={`w-full px-3 py-2.5 sm:px-3.5 bg-white border ${isStationDropdownOpen ? 'border-blue-500 ring-2' : 'border-slate-200'} rounded-lg text-xs font-semibold flex justify-between items-center cursor-pointer shadow-sm relative z-[56]`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <Icon name="map-pin" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{stationFilter || 'Semua Stasiun'}</span>
                </div>
                <Icon name={isStationDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 ml-1" />
              </div>

              {isStationDropdownOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 min-w-[150px] w-full sm:w-max bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[60] animate-dropdown overflow-y-auto max-h-56">
                  <div onClick={() => { setStationFilter(''); setIsStationDropdownOpen(false); }} className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center whitespace-nowrap ${stationFilter === '' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Semua Stasiun {stationFilter === '' && <Icon name="check" size={12} className="ml-auto pl-3 text-blue-600" />}
                  </div>
                  {uniqueStations.map(st => (
                    <div key={st} onClick={() => { setStationFilter(st); setIsStationDropdownOpen(false); }} className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center whitespace-nowrap ${stationFilter === st ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {st} {stationFilter === st && <Icon name="check" size={12} className="ml-auto pl-3 text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. FILTER WAKTU */}
            <div className={`relative w-full sm:w-36 lg:w-44 ${isTimeDropdownOpen ? 'z-[62]' : 'z-[60]'}`}>
              {isTimeDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsTimeDropdownOpen(false)}></div>}
              <div
                onClick={() => toggleDropdown('time')}
                className={`w-full px-3 py-2.5 sm:px-3.5 bg-white border ${isTimeDropdownOpen ? 'border-blue-500 ring-2' : 'border-slate-200'} rounded-lg text-xs font-semibold flex justify-between items-center cursor-pointer shadow-sm relative z-[56]`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <Icon name="calendar" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{timeOptionsList.find(o => o.val === timeFilter)?.label || 'Semua Waktu'}</span>
                </div>
                <Icon name={isTimeDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 ml-1" />
              </div>

              {isTimeDropdownOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 min-w-[150px] w-full sm:w-max bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[60] animate-dropdown overflow-hidden">
                  {timeOptionsList.map(opt => (
                    <div key={opt.val} onClick={() => { setTimeFilter(opt.val); setIsTimeDropdownOpen(false); }} className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center whitespace-nowrap ${timeFilter === opt.val ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {opt.label} {timeFilter === opt.val && <Icon name="check" size={12} className="ml-auto pl-3 text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. FILTER STATUS */}
            <div className={`relative w-full sm:w-40 lg:w-48 col-span-2 sm:col-span-1 ${isStatusDropdownOpen ? 'z-[62]' : 'z-[60]'}`}>
              {isStatusDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsStatusDropdownOpen(false)}></div>}
              <div
                onClick={() => toggleDropdown('status')}
                className={`w-full px-3 py-2.5 sm:px-3.5 bg-white border ${isStatusDropdownOpen ? 'border-blue-500 ring-2' : 'border-slate-200'} rounded-lg text-xs font-bold flex justify-between items-center cursor-pointer shadow-sm relative z-[56]`}
              >
                <span className="truncate text-slate-700">
                  {statusOptionsList.find(o => o.val === statusFilter)?.label || 'Semua Tiket'}
                </span>
                <Icon name={isStatusDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 ml-2" />
              </div>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 min-w-[150px] w-full sm:w-max bg-white border border-slate-100 shadow-xl rounded-xl py-1.5 z-[60] animate-dropdown overflow-hidden">
                  {statusOptionsList.map(opt => (
                    <div key={opt.val} onClick={() => { setStatusFilter(opt.val); setIsStatusDropdownOpen(false); }} className={`px-4 py-2.5 text-xs cursor-pointer transition-colors flex items-center whitespace-nowrap ${statusFilter === opt.val ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {opt.label} {statusFilter === opt.val && <Icon name="check" size={14} className="ml-auto pl-3 text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOMBOL INPUT TIKET BARU */}
            <button
              id="btn-input-tiket-baru"
              onClick={() => setShowNewTicketModal(true)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg sm:rounded-xl shadow-md shadow-amber-500/25 transition-all active:scale-95 whitespace-nowrap shrink-0 ml-0 sm:ml-auto lg:ml-0 w-full sm:w-auto mt-0.5 sm:mt-0"
            >
              <Icon name="plus-circle" size={17} />
              <span>Input Tiket Baru</span>
            </button>

          </div>
        </div>
      </div>

      {/* TABEL DATA GANGGUAN */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative z-10 min-h-0">

        {/* TAMPILAN MOBILE: KARTU TIKET KHUSUS MOBILE */}
        <div className="sm:hidden p-2.5 sm:p-3 space-y-2.5 sm:space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-0">
          {currentDataVisit.map((item, idx) => {
            let waLink = "";
            if (item.nomorHp) {
              let no = String(item.nomorHp).replace(/\D/g, '');
              if (no.startsWith('0')) no = '62' + no.substring(1);
              waLink = `https://wa.me/${no}`;
            }

            const tStr = String(item.timestamp || '');
            let displayDate = '-';
            let displayTime = '';
            if (tStr) {
              const parts = tStr.split(/[T ]/);
              const parsedDate = parts[0] ? standardizeDate(parts[0]) : '';
              if (parsedDate) {
                const dateParts = parsedDate.split('-');
                if (dateParts.length === 3) {
                  const y = dateParts[0];
                  const m = parseInt(dateParts[1], 10);
                  const d = parseInt(dateParts[2], 10);
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                  displayDate = `${d} ${months[m - 1]} ${y}`;
                } else {
                  displayDate = parsedDate;
                }
              }
              if (parts[1]) {
                displayTime = parts[1].substring(0, 5) + ' WIB';
              }
            }

            const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status || '').toUpperCase());
            const ttrString = isDone ? calculateTTR(item.timestamp, item.waktuClose) : null;

            return (
              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.namaPelanggan || 'Tanpa Nama'}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.idPelanggan || '-'}</span>
                      <span className="text-[8.5px] uppercase font-bold text-slate-400">{toProperCase(item.stasiun)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDone && ttrString && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        <Icon name="clock" size={9} /> TTR: {ttrString}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {isDone ? 'DONE' : 'OPEN'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <Icon name="clock" size={10} className="text-blue-500" />
                    <span>{displayDate} {displayTime && `• ${displayTime}`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon name="user" size={10} className="text-purple-500" />
                    <span className="font-semibold text-slate-700">{item.petugas || 'Belum Ada'}</span>
                  </div>
                </div>

                {/* Keluhan & Catatan */}
                <div className="text-[10px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1 text-rose-600 font-bold">
                    <Icon name="alert-triangle" size={11} />
                    <span>{item.keluhan || 'Gangguan'}</span>
                  </div>
                  <p className="text-[9.5px] text-slate-600 leading-snug">{item.catatan || '-'}</p>
                </div>

                {/* Tindakan jika selesai */}
                {isDone && (item.tindakan || item.perbaikan) && (
                  <div className="text-[10px] text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold text-[8.5px] uppercase tracking-wider text-emerald-700">
                      <Icon name="check-circle" size={11} />
                      <span>Tindakan:</span>
                    </div>
                    <p className="text-[9.5px] font-medium leading-snug">{item.tindakan || item.perbaikan}</p>
                    {(item.material || item.usedMaterials) && (
                      <p className="text-[9px] text-slate-500 pt-1 border-t border-emerald-100/60 mt-1">Material: {item.material || item.usedMaterials}</p>
                    )}
                  </div>
                )}

                {/* Aksi & Kontak */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noreferrer" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                        <Icon name="phone" size={11} /> WA
                      </a>
                    )}
                    {item.latitude && item.longitude && (
                      <a href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-blue-200">
                        <Icon name="map-pin" size={11} /> Peta
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isDone ? (
                      <button
                        onClick={() => setResolveTarget(item)}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <Icon name="check-circle" size={11} /> Selesaikan
                      </button>
                    ) : null}
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Tiket"
                    >
                      <Icon name="trash-2" size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {currentDataVisit.length === 0 && enrichedVisitData.length === 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <Icon name="inbox" size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Belum ada data tiket gangguan di server</p>
            </div>
          )}
          {currentDataVisit.length === 0 && enrichedVisitData.length > 0 && (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <Icon name="search" size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Tidak ada data tiket yang sesuai filter saat ini</p>
            </div>
          )}
        </div>

        {/* TAMPILAN DESKTOP: TABEL PENUH */}
        <div className="hidden sm:block overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">WAKTU</th>
                <th className="px-4 py-3">PELANGGAN</th>
                <th className="px-4 py-3">KONTAK & LOKASI</th>
                <th className="px-4 py-3">KELUHAN & CATATAN</th>
                <th className="px-4 py-3">PERBAIKAN</th>
                <th className="px-4 py-3">DATA TEKNIS</th>
                <th className="px-4 py-3 text-center">PETUGAS</th>
                <th className="px-4 py-3 text-center">STATUS & AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentDataVisit.map((item, idx) => {

                let waLink = "";
                if (item.nomorHp) {
                  let no = String(item.nomorHp).replace(/\D/g, '');
                  if (no.startsWith('0')) no = '62' + no.substring(1);
                  waLink = `https://wa.me/${no}`;
                }

                const tStr = String(item.timestamp || '');
                let displayDate = '-';
                let displayTime = '';
                if (tStr) {
                  const parts = tStr.split(/[T ]/);
                  const parsedDate = parts[0] ? standardizeDate(parts[0]) : '';
                  if (parsedDate) {
                    const dateParts = parsedDate.split('-');
                    if (dateParts.length === 3) {
                      const y = dateParts[0];
                      const m = parseInt(dateParts[1], 10);
                      const d = parseInt(dateParts[2], 10);
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                      displayDate = `${d} ${months[m - 1]} ${y}`;
                    } else {
                      displayDate = parsedDate;
                    }
                  }
                  if (parts[1]) {
                    displayTime = parts[1].substring(0, 5) + ' WIB';
                  }
                }

                const isItemDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(item.status || '').toUpperCase());
                const ttrItemString = isItemDone ? calculateTTR(item.timestamp, item.waktuClose) : null;

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap align-top text-xs text-slate-500">
                      <div className="font-bold text-slate-800">{displayDate}</div>
                      {displayTime && (
                        <div className="flex items-center mt-0.5 text-blue-600 font-semibold"><Icon name="clock" size={10} className="mr-1 text-blue-400" /> {displayTime}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-bold text-slate-800 text-[13px]">{item.namaPelanggan || 'Tanpa Nama'}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.idPelanggan || '-'} | {toProperCase(item.stasiun)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                            <Icon name="phone" size={10} className="mr-1.5" /> {item.nomorHp}
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center"><Icon name="phone" size={10} className="mr-1.5" /> -</span>
                        )}
                        {item.latitude && item.longitude ? (
                          <a href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="flex items-center text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            <Icon name="map-pin" size={10} className="mr-1.5" /> Lihat Peta
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center"><Icon name="map-pin" size={10} className="mr-1.5" /> -</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top min-w-[200px] max-w-[250px]">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-[9px] uppercase tracking-wider rounded border border-rose-200 mb-2">
                        <Icon name="alert-triangle" size={10} /> {item.keluhan || 'Tanpa Keluhan'}
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 leading-snug whitespace-normal break-words bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.catatan || '-'}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top min-w-[220px] max-w-[280px]">
                      {isItemDone && (item.tindakan || item.perbaikan) ? (
                        <div className="bg-emerald-50/80 rounded-xl border border-emerald-200 overflow-hidden w-full shadow-sm">
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon name="check-circle" size={14} className="text-emerald-500" />
                              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">
                                Tindakan
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-emerald-900 leading-snug whitespace-normal break-words pl-5">
                              {item.tindakan || item.perbaikan}
                            </div>
                          </div>
                          {(item.material || item.usedMaterials) && (
                            <div className="p-3 border-t border-emerald-200/60 bg-emerald-100/30">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Icon name="box" size={14} className="text-emerald-500" />
                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">
                                  Material Digunakan
                                </span>
                              </div>
                              <div className="text-[11px] font-bold text-emerald-900 leading-snug break-words whitespace-normal pl-5">
                                {item.material || item.usedMaterials}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 h-full min-h-[60px] opacity-70">
                          <Icon name="more-horizontal" size={16} className="mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Belum Diselesaikan</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 w-max">
                        <div className="flex justify-between gap-3 border-b border-slate-200 pb-1">
                          <span className="text-slate-400 font-sans font-bold">ODP</span>
                          <span className="font-bold text-slate-800 ml-2">{item.kodeOdp || item.odpAktual || '-'} (P.{item.port || item.portOdp || '-'})</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400 font-sans font-bold">SN</span>
                          <span className="font-bold text-slate-800 ml-2">{item.snOnt || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      {item.petugas ? (
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[11px] mb-1">
                            {String(item.petugas).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-slate-800">{item.petugas}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center mt-2 opacity-50">
                          <Icon name="user-minus" size={14} className="text-slate-400 mb-1" />
                          <span className="text-[9px] font-medium text-slate-400">Belum Ada</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-top w-32">
                      <div className="flex flex-col gap-2">
                        {!isItemDone ? (
                          <button
                            onClick={() => setResolveTarget(item)}
                            className="flex items-center justify-center gap-2 w-full py-1.5 bg-amber-50 hover:bg-emerald-50 text-amber-600 hover:text-emerald-600 border border-amber-200 hover:border-emerald-300 rounded-lg transition-all group shadow-sm hover:shadow-md"
                            title="Klik untuk menyelesaikan tiket"
                          >
                            <Icon name="clock" size={14} className="group-hover:hidden" />
                            <Icon name="check-circle" size={14} className="hidden group-hover:block" />
                            <span className="text-[9px] font-bold uppercase tracking-wider group-hover:hidden">Tiket Aktif</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider hidden group-hover:block">Selesaikan</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 w-full py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase">
                            <div className="flex items-center gap-1 font-black">
                              <Icon name="check" size={12} /> Selesai
                            </div>
                            {ttrItemString && (
                              <span className="text-[8.5px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1 normal-case tracking-normal">
                                <Icon name="clock" size={8} /> <strong className="font-bold">TTR:</strong> {ttrItemString}
                              </span>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="flex items-center justify-center gap-2 w-full py-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all text-[9px] font-bold uppercase opacity-0 group-hover:opacity-100"
                        >
                          <Icon name="trash-2" size={12} /> Hapus Tiket
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentDataVisit.length === 0 && enrichedVisitData.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Icon name="inbox" size={32} className="mb-3 text-slate-300" />
                      <p className="text-sm font-bold text-slate-500">Belum ada data tiket gangguan di server</p>
                    </div>
                  </td>
                </tr>
              )}
              {currentDataVisit.length === 0 && enrichedVisitData.length > 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Icon name="search" size={32} className="mb-3 text-slate-300" />
                      <p className="text-sm font-bold text-slate-500">Tidak ada data tiket yang sesuai filter saat ini</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {filteredData.length > 0 && (
          <div className="bg-white border-t border-slate-100 p-2.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shrink-0 z-10">
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
              <span>Menampilkan {filteredData.length > 0 ? startIndexVisit + 1 : 0} - {Math.min(endIndexVisit, filteredData.length)} dari total {filteredData.length} data tiket</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50/80 p-1 sm:p-1.5 rounded-lg border border-slate-100">
              <button
                onClick={() => setCurrentPageVisit(prev => Math.max(prev - 1, 1))}
                disabled={currentPageVisit === 1}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Icon name="chevron-left" size={13} />
              </button>

              <div className="flex items-center px-0.5 sm:px-1 gap-0.5 sm:gap-1">
                {Array.from({ length: Math.min(5, totalPagesVisit) }, (_, i) => {
                  let pageNum;
                  if (totalPagesVisit <= 5) {
                    pageNum = i + 1;
                  } else if (currentPageVisit <= 3) {
                    pageNum = i + 1;
                  } else if (currentPageVisit >= totalPagesVisit - 2) {
                    pageNum = totalPagesVisit - 4 + i;
                  } else {
                    pageNum = currentPageVisit - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPageVisit(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded-md transition-all ${currentPageVisit === pageNum
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-white hover:border hover:border-slate-200'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPageVisit(prev => Math.min(prev + 1, totalPagesVisit))}
                disabled={currentPageVisit === totalPagesVisit}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Icon name="chevron-right" size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ==========================================
// KOMPONEN: MODAL UPDATE MASSAL (DENGAN LOCAL UPDATE & MODERN DROPDOWN)
// ==========================================
function MassUpdateModal({ selectedData, onClose, onLocalPelangganUpdate }) {
  const [bulkData, setBulkData] = useState(() =>
    selectedData.map(item => ({
      ...item,
      idPelanggan: item.idPelanggan || '',
      namaPelanggan: item.namaPelanggan || '',
      stasiun: item.stasiun || '',
      aktivasi: item.aktivasi || ''
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState(null);

  // STATE BARU UNTUK MENGONTROL DROPDOWN MANA YANG SEDANG TERBUKA
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

  // OPSI STATUS DENGAN WARNA CUSTOM (SESUAI REQUEST)
  const statusOptions = [
    { value: 'Sudah', label: 'Aktif (Sudah)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check-circle' },
    { value: 'Belum', label: 'Waiting (Belum Aktif)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'clock' },
    { value: 'Suspend', label: 'Suspend', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'pause-circle' },
    { value: 'Ready To Dismantle', label: 'Ready To Dismantle', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', icon: 'alert-triangle' },
    { value: 'Dismantled', label: 'Dismantled', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: 'x-circle' },
    { value: 'Kendala', label: 'Kendala', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'alert-circle' }
  ];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleInputChange = (index, field, value) => {
    const newData = [...bulkData];
    newData[index][field] = value;
    setBulkData(newData);
  };

  const applyToAll = (value) => {
    const newData = bulkData.map(item => ({ ...item, aktivasi: value }));
    setBulkData(newData);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setMessage(null);

    const finalBulkData = bulkData.map(item => {
      return {
        ...item,
        ikr: item.aktivasi,
        issueKendala: item.issueKendala || null,
        reporterKendala: item.reporterKendala || null,
        tanggalKendala: item.tanggalKendala || null,
        catatan: item.catatan || null
      };
    });

    api.run('updateMassalPelanggan', finalBulkData)
      .then((res) => {
        if (res && res.success) {
          setIsSaving(false);
          setIsSuccess(true);
          if (onLocalPelangganUpdate) onLocalPelangganUpdate(finalBulkData);
          setTimeout(() => onClose(false), 1500);
        } else {
          setIsSaving(false);
          setMessage({ type: 'error', text: (res && res.message) ? res.message : 'Gagal memproses data massal.' });
        }
      })
      .catch((err) => {
        setIsSaving(false);
        setMessage({ type: 'error', text: err.message });
      });
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 animate-fade" onClick={() => !isSaving && onClose(false)}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-modal flex flex-col h-[85vh] overflow-hidden">

        {isSaving && !isSuccess && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade">
            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4 shadow-md"></div>
            <h3 className="text-base font-bold text-slate-800">Menyimpan Status {bulkData.length} Pelanggan...</h3>
          </div>
        )}

        {isSuccess && (
          <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade text-white">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mb-4 animate-bounce">
              <Icon name="check" size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-black mb-1">Berhasil Disimpan!</h3>
            <p className="text-emerald-100 font-medium">Status {bulkData.length} pelanggan telah diperbarui.</p>
          </div>
        )}

        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-800 text-white shrink-0">
          <h2 className="text-lg font-bold flex items-center"><Icon name="layers" size={20} className="mr-2 text-rose-400" /> Update Status Massal ({bulkData.length} Pelanggan)</h2>
          <button onClick={() => !isSaving && onClose(false)} disabled={isSaving} className="p-2 text-slate-400 hover:text-white transition-colors"><Icon name="x" size={20} /></button>
        </div>

        <div className="bg-rose-50/50 p-4 border-b border-rose-100 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            {message && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 mb-2 text-rose-700 text-xs font-bold">
                <Icon name="alert-circle" size={16} className="shrink-0" /> {message.text}
              </div>
            )}
            <p className="text-xs text-slate-600 font-medium flex items-center gap-2"><Icon name="info" size={14} className="text-rose-500 shrink-0" /> Ubah status pelanggan yang dipilih.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase sm:ml-2 mb-1 sm:mb-0">Set Semua Ke:</span>
            <div className="flex w-full sm:w-auto gap-1.5">
              <button onClick={() => applyToAll('Ready To Dismantle')} className="flex-1 sm:flex-none px-1.5 sm:px-3 py-1.5 bg-orange-50 text-orange-800 text-[10px] sm:text-xs font-bold rounded hover:bg-orange-100 transition-colors border border-orange-200 text-center">Ready to Dismantle</button>
              <button onClick={() => applyToAll('Dismantled')} className="flex-1 sm:flex-none px-1.5 sm:px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-bold rounded hover:bg-slate-200 transition-colors border border-slate-300 text-center">Dismantled</button>
              <button onClick={() => applyToAll('Kendala')} className="flex-1 sm:flex-none px-1.5 sm:px-3 py-1.5 bg-rose-50 text-rose-700 text-[10px] sm:text-xs font-bold rounded hover:bg-rose-100 transition-colors border border-rose-200 text-center">Kendala</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-0 sm:p-4 bg-slate-50 pb-32">

          {/* === MOBILE LIST VIEW (CARD) === */}
          <div className="md:hidden flex flex-col gap-2 p-3">
            {bulkData.map((row, idx) => {
              const currentOpt = statusOptions.find(opt => opt.value === row.aktivasi) || {
                label: '-- Pilih Status --', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'help-circle'
              };

              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{row.namaPelanggan || 'Tanpa Nama'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.idPelanggan} &bull; {String(row.stasiun).charAt(0).toUpperCase() + String(row.stasiun).slice(1).toLowerCase()}</div>
                    </div>
                  </div>

                  <div className="mt-1 relative z-10">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Update Ke:</div>
                    <div
                      onClick={() => !isSaving && setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                      className={`w-full min-h-[40px] px-3 py-2 flex items-center justify-between cursor-pointer rounded-lg border transition-colors ${currentOpt.bg} ${currentOpt.text} ${currentOpt.border} ${isSaving ? 'opacity-50' : 'hover:ring-2 hover:ring-inset hover:ring-blue-500/20'}`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Icon name={currentOpt.icon} size={14} />
                        {currentOpt.label}
                      </div>
                      <Icon name={openDropdownIdx === idx ? "chevron-up" : "chevron-down"} size={14} className="opacity-70" />
                    </div>

                    {openDropdownIdx === idx && !isSaving && (
                      <>
                        <div className="fixed inset-0 z-[65]" onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(null); }}></div>
                        <div className="absolute left-0 right-0 top-[100%] bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-[70] animate-dropdown mt-1">
                          {statusOptions.map((opt, i) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInputChange(idx, 'aktivasi', opt.value);
                                setOpenDropdownIdx(null);
                              }}
                              className="px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 group/opt"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg border ${opt.bg} ${opt.border} ${opt.text}`}>
                                  <Icon name={opt.icon} size={12} />
                                </div>
                                <span className={`text-xs font-bold ${row.aktivasi === opt.value ? 'text-slate-800' : 'text-slate-600 group-hover/opt:text-slate-800'}`}>
                                  {opt.label}
                                </span>
                              </div>
                              {row.aktivasi === opt.value && <Icon name="check" size={14} className="text-blue-600" />}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* === DESKTOP TABLE VIEW === */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left whitespace-nowrap table-fixed">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-20 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center border-r border-slate-300">No</th>
                  <th className="px-4 py-3 w-32 border-r border-slate-300">ID Pelanggan</th>
                  <th className="px-4 py-3 min-w-[200px] border-r border-slate-300">Nama Pelanggan</th>
                  <th className="px-4 py-3 w-32 border-r border-slate-300">Stasiun</th>
                  <th className="px-4 py-3 min-w-[220px]">Update Status Baru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {bulkData.map((row, idx) => {
                  const currentOpt = statusOptions.find(opt => opt.value === row.aktivasi) || {
                    label: '-- Pilih Status --', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'help-circle'
                  };

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono border-r border-slate-100 bg-slate-50">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-600 border-r border-slate-100 bg-slate-50">{row.idPelanggan}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 bg-slate-50 truncate">{row.namaPelanggan}</td>
                      <td className="px-4 py-3 text-slate-600 border-r border-slate-100 bg-slate-50 truncate">{String(row.stasiun).charAt(0).toUpperCase() + String(row.stasiun).slice(1).toLowerCase()}</td>

                      <td className={`p-0 relative border-l-2 ${row.aktivasi ? 'border-blue-500' : 'border-transparent'} ${openDropdownIdx === idx ? 'z-[60]' : 'z-0'}`}>
                        <div
                          onClick={() => !isSaving && setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                          className={`w-full h-full min-h-[46px] px-4 py-2 flex items-center justify-between cursor-pointer transition-colors ${currentOpt.bg} ${currentOpt.text} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-inset hover:ring-blue-500/20'}`}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <Icon name={currentOpt.icon} size={14} />
                            {currentOpt.label}
                          </div>
                          <Icon name={openDropdownIdx === idx ? "chevron-up" : "chevron-down"} size={14} className="opacity-70" />
                        </div>

                        {openDropdownIdx === idx && !isSaving && (
                          <>
                            <div className="fixed inset-0 z-[65]" onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(null); }}></div>
                            <div className="absolute left-0 right-0 top-[100%] bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 z-[70] animate-dropdown min-w-[200px] mt-1 mx-1">
                              {statusOptions.map((opt, i) => (
                                <div
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInputChange(idx, 'aktivasi', opt.value);
                                    setOpenDropdownIdx(null);
                                  }}
                                  className="px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between hover:bg-slate-50 group/opt"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`p-1.5 rounded-lg border ${opt.bg} ${opt.border} ${opt.text}`}>
                                      <Icon name={opt.icon} size={12} />
                                    </div>
                                    <span className={`text-xs font-bold ${row.aktivasi === opt.value ? 'text-slate-800' : 'text-slate-600 group-hover/opt:text-slate-800'}`}>
                                      {opt.label}
                                    </span>
                                  </div>
                                  {row.aktivasi === opt.value && <Icon name="check" size={14} className="text-blue-600" />}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex justify-end gap-2 sm:gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => !isSaving && onClose(false)} disabled={isSaving} className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50">Batal</button>
          <button onClick={handleSaveAll} disabled={isSaving} className="px-4 sm:px-8 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg sm:rounded-xl shadow-lg shadow-rose-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center">
            <Icon name="check-square" size={16} className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Terapkan Status Massal</span><span className="sm:hidden">Update Semua</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ==========================================
// KOMPONEN: MODAL KONFIRMASI HAPUS MASSAL
// ==========================================
function MassDeleteModal({ selectedData, onClose, onLocalPelangganDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleDeleteAll = () => {
    setIsDeleting(true);
    setMessage(null);

    // KARENA HOSTING DI FIREBASE, PASTIKAN MENGGUNAKAN api.run (bukan google.script.run)
    if (typeof api !== 'undefined' && api.run) {
      api.run('deleteMassalPelanggan', selectedData)
        .then((res) => {
          if (res && res.success) {
            // 1. Eksekusi update lokal terlebih dahulu
            const deletedIds = selectedData.map(item => item.idPelanggan);
            if (onLocalPelangganDelete) onLocalPelangganDelete(deletedIds);

            // 2. Beri jeda sedikit sebelum menutup modal agar React sempat me-render ulang tabel
            setTimeout(() => {
              setIsDeleting(false);
              onClose(false);
            }, 300);
          } else {
            setIsDeleting(false);
            setMessage({ type: 'error', text: (res && res.message) ? res.message : 'Gagal menghapus data.' });
          }
        })
        .catch((err) => {
          setIsDeleting(false);
          setMessage({ type: 'error', text: err.message });
        });
    } else {
      // Fallback jika API belum termuat (Sangat penting saat di hosting luar)
      setIsDeleting(false);
      setMessage({ type: 'error', text: "Sistem API belum terhubung. Gagal menghapus data." });
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 animate-fade" onClick={() => !isDeleting && onClose(false)}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-modal flex flex-col overflow-hidden">

        {isDeleting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade">
            <div className="w-14 h-14 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin mb-4 shadow-md"></div>
            <h3 className="text-base font-bold text-slate-800">Menghapus {selectedData.length} Pelanggan...</h3>
            <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-2 animate-pulse">
              <Icon name="trash-2" size={12} className="animate-bounce" />
              Menghapus baris di Spreadsheet
            </p>
          </div>
        )}

        <div className="bg-rose-600 p-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Icon name="alert-triangle" size={120} className="text-white" />
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 relative z-10 backdrop-blur-sm border border-white/30">
            <Icon name="trash-2" size={28} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-white relative z-10 tracking-wide">Hapus Permanen?</h3>
          <p className="text-rose-100 text-xs mt-1 font-medium relative z-10">Tindakan ini tidak dapat dibatalkan.</p>
        </div>

        <div className="p-6 bg-slate-50 flex-1">
          {message && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 mb-4 text-rose-700 text-xs font-bold">
              <Icon name="alert-circle" size={16} className="shrink-0" /> {message.text}
            </div>
          )}

          <p className="text-sm text-slate-700 mb-4 font-medium text-center">
            Anda akan menghapus <span className="font-bold text-rose-600">{selectedData.length} pelanggan</span> berikut dari database:
          </p>

          <div className="bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto custom-scrollbar p-2 shadow-inner">
            {selectedData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.namaPelanggan}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{item.idPelanggan} | {item.stasiun}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
          <button onClick={() => !isDeleting && onClose(false)} disabled={isDeleting} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Batal</button>
          <button onClick={handleDeleteAll} disabled={isDeleting} className="px-8 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center">
            <Icon name="trash-2" size={16} className="mr-2" /> Ya, Hapus Data
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// HALAMAN 2: DATABASE & MANAJEMEN PELANGGAN
// ==========================================
function DatabaseView({ pelangganData, visitData, odpData, onRefresh, onGoToCoverage, onGoToHistory, onLocalPelangganUpdate, onLocalVisitUpdate, onLocalPelangganDelete, petugasList, initialStatusFilter = '', initialStationFilter = '', isLoading = false }) {
  const isPageLoading = Boolean(isLoading || !pelangganData || (Array.isArray(pelangganData) && pelangganData.length === 0 && isLoading));

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAgeOrder, setSortAgeOrder] = useState(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [filterStation, setFilterStation] = useState(initialStationFilter);
  const [filterStatus, setFilterStatus] = useState(initialStatusFilter ? [initialStatusFilter] : []);

  const [tempFilterStation, setTempFilterStation] = useState('');
  const [tempFilterStatus, setTempFilterStatus] = useState([]);

  const [actionModal, setActionModal] = useState({ type: null, data: null });
  const [openKendalaId, setOpenKendalaId] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showMassUpdate, setShowMassUpdate] = useState(false);
  const [showMassDelete, setShowMassDelete] = useState(false); // STATE BARU UNTUK MODAL HAPUS

  const ITEMS_PER_PAGE = 15;

  const statusOptions = [
    { val: '', label: 'Semua Status' },
    { val: 'AKTIF', label: 'Aktif' },
    { val: 'SUSPEND', label: 'Suspend' },
    { val: 'READY TO DISMANTLE', label: 'Ready To Dismantle' },
    { val: 'DISMANTLED', label: 'Dismantled' },
    { val: 'WAITING', label: 'Waiting' },
    { val: 'KENDALA', label: 'Kendala' }
  ];

  useEffect(() => { setCurrentPage(1); setOpenKendalaId(null); }, [searchTerm, filterStation, filterStatus]);

  useEffect(() => {
    if (!isFilterModalOpen) {
      setIsStationDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    }
  }, [isFilterModalOpen]);

  const uniqueStations = useMemo(() => {
    if (!pelangganData || !Array.isArray(pelangganData)) return [];
    const rawStations = pelangganData.map(item => item.stasiun).filter(Boolean);
    const properStations = rawStations.map(st => String(st).charAt(0).toUpperCase() + String(st).slice(1).toLowerCase());
    return [...new Set(properStations)].sort();
  }, [pelangganData]);

  const filteredData = useMemo(() => {
    if (!pelangganData || !Array.isArray(pelangganData)) return [];

    let filtered = pelangganData.filter(item => {
      const matchSearch = String(item.namaPelanggan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.idPelanggan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.alamat || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStation = filterStation === '' || String(item.stasiun || '').toLowerCase().trim() === String(filterStation).toLowerCase().trim();

      const rawIkr = String(item.ikr || item.statusIkr || '').trim().toLowerCase();
      const rawAktivasi = String(item.aktivasi || item.statusAktivasi || '').trim().toLowerCase();
      const globalStat = String(getGlobalStatusStr(item)).toUpperCase(); // Pastikan huruf besar untuk perbandingan

      // MURNI LOGIKA UNTUK FILTER (Apa yang dilihat filter di pojok kanan atas)
      let finalStatus = 'WAITING';
      if (globalStat.includes('KENDALA')) finalStatus = 'KENDALA';
      else if (rawAktivasi === 'sudah' || rawAktivasi === 'aktif') finalStatus = 'AKTIF';
      else if (rawAktivasi === 'ready to dismantle') finalStatus = 'READY TO DISMANTLE';
      else if (rawAktivasi === 'dismantled' || rawAktivasi === 'dismantle') finalStatus = 'DISMANTLED';
      else if (rawAktivasi === 'suspend') finalStatus = 'SUSPEND';
      else if (rawAktivasi === 'kendala') finalStatus = 'KENDALA';
      else if (rawIkr === 'sudah') finalStatus = 'SUDAH IKR';
      else if (rawIkr === 'belum' || rawIkr === '') finalStatus = 'WAITING';
      else finalStatus = globalStat;

      let matchStatus = true;

      if (filterStatus && filterStatus.length > 0) {
        matchStatus = filterStatus.some(fStatus => {
          if (fStatus === 'AKTIF') {
            return finalStatus.includes('AKTIF') || finalStatus.includes('DONE');
          } else if (fStatus === 'KENDALA') {
            return finalStatus === 'KENDALA';
          } else if (fStatus === 'READY TO DISMANTLE') {
            return finalStatus === 'READY TO DISMANTLE';
          } else if (fStatus === 'DISMANTLED') {
            return finalStatus === 'DISMANTLED';
          } else if (fStatus === 'SUSPEND') {
            return finalStatus === 'SUSPEND';
          } else if (fStatus === 'WAITING') {
            return finalStatus.includes('WAITING') && (rawIkr === 'belum' || rawIkr === '' || rawIkr !== 'sudah');
          } else {
            return finalStatus === fStatus;
          }
        });
      }

      return matchSearch && matchStation && matchStatus;
    });

    if (sortAgeOrder) {
      filtered.sort((a, b) => {
        const getAge = (item) => {
          const rawAktivasi = String(item.aktivasi || '').trim().toLowerCase();
          const globalStat = String(getGlobalStatusStr(item)).toUpperCase();
          let finalStatus = 'WAITING';
          if (globalStat.includes('KENDALA')) finalStatus = 'KENDALA';
          else if (rawAktivasi === 'sudah' || rawAktivasi === 'aktif' || globalStat === 'AKTIF') finalStatus = 'AKTIF';
          else if (rawAktivasi === 'ready to dismantle' || globalStat === 'READY TO DISMANTLE') finalStatus = 'READY TO DISMANTLE';
          else if (rawAktivasi === 'dismantled' || rawAktivasi === 'dismantle' || globalStat === 'DISMANTLED') finalStatus = 'DISMANTLED';
          else if (rawAktivasi === 'suspend' || globalStat === 'SUSPEND') finalStatus = 'SUSPEND';
          else if (rawAktivasi === 'kendala') finalStatus = 'KENDALA';
          else finalStatus = globalStat;

          // 1. JIKA STATUS SUSPEND / READY TO DISMANTLE / DISMANTLE / DISMANTLED: Hitung dari telatBayarHari atau tanggalBerakhir
          if (finalStatus === 'SUSPEND' || finalStatus === 'READY TO DISMANTLE' || finalStatus === 'DISMANTLE' || finalStatus === 'DISMANTLED') {
            if (item.telatBayarHari !== null && item.telatBayarHari !== undefined && !isNaN(Number(item.telatBayarHari))) {
              return Number(item.telatBayarHari);
            }
            if (item.tanggalBerakhir) {
              const stdDate = standardizeDate(item.tanggalBerakhir);
              if (stdDate) {
                const expDate = new Date(stdDate);
                if (!isNaN(expDate.getTime())) {
                  const today = new Date();
                  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const expDateZero = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
                  return Math.floor((todayZero - expDateZero) / (1000 * 60 * 60 * 24));
                }
              }
            }
            return -999999;
          }

          // 2. JIKA STATUS WAITING / KENDALA: Hitung umur WO dari tanggal registrasi
          if ((finalStatus === 'WAITING' || finalStatus === 'KENDALA') && item.tanggalRegistrasi) {
            const stdDate = standardizeDate(item.tanggalRegistrasi);
            if (stdDate) {
              const regDate = new Date(stdDate);
              if (!isNaN(regDate.getTime())) {
                const today = new Date();
                const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const regDateZero = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
                return Math.floor((todayZero - regDateZero) / (1000 * 60 * 60 * 24));
              }
            }
          }

          return -999999;
        };

        const ageA = getAge(a);
        const ageB = getAge(b);

        if (ageA === -999999 && ageB !== -999999) return 1;
        if (ageB === -999999 && ageA !== -999999) return -1;
        if (ageA === -999999 && ageB === -999999) return 0;

        if (sortAgeOrder === 'asc') return ageA - ageB;
        if (sortAgeOrder === 'desc') return ageB - ageA;
        return 0;
      });
    }

    return filtered;
  }, [pelangganData, searchTerm, filterStation, filterStatus, sortAgeOrder]);

  const summaryCounts = useMemo(() => {
    const counts = { WAITING: 0, AKTIF: 0, SUSPEND: 0, 'READY TO DISMANTLE': 0, DISMANTLED: 0, KENDALA: 0 };
    if (pelangganData && Array.isArray(pelangganData)) {
      pelangganData.forEach(item => {
        const matchStation = filterStation === '' || String(item.stasiun || '').toLowerCase().trim() === String(filterStation).toLowerCase().trim();
        if (!matchStation) return;

        const rawIkr = String(item.ikr || item.statusIkr || '').trim().toLowerCase();
        const rawAktivasi = String(item.aktivasi || '').trim().toLowerCase();
        const globalStat = String(getGlobalStatusStr(item)).toUpperCase();
        let finalStatus = 'WAITING';
        if (globalStat.includes('KENDALA')) finalStatus = 'KENDALA';
        else if (rawAktivasi === 'sudah' || rawAktivasi === 'aktif') finalStatus = 'AKTIF';
        else if (rawAktivasi === 'ready to dismantle') finalStatus = 'READY TO DISMANTLE';
        else if (rawAktivasi === 'dismantled' || rawAktivasi === 'dismantle') finalStatus = 'DISMANTLED';
        else if (rawAktivasi === 'suspend') finalStatus = 'SUSPEND';
        else if (rawAktivasi === 'kendala') finalStatus = 'KENDALA';
        else if (rawIkr === 'sudah') finalStatus = 'SUDAH IKR';
        else if (rawIkr === 'belum' || rawIkr === '') finalStatus = 'WAITING';
        else finalStatus = globalStat;

        if (counts[finalStatus] !== undefined) {
          counts[finalStatus]++;
        }
      });
    }
    return counts;
  }, [pelangganData, filterStation]);

  const colorStyles = {
    amber: { active: 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-amber-100 text-amber-600' },
    emerald: { active: 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-emerald-100 text-emerald-600' },
    orange: { active: 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-orange-100 text-orange-600' },
    purple: { active: 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-purple-100 text-purple-600' },
    brown: { active: 'bg-amber-800 border-amber-800 text-white shadow-lg shadow-amber-800/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-amber-800/30 hover:bg-amber-900/5', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-amber-900/10 text-amber-800' },
    slate: { active: 'bg-slate-600 border-slate-600 text-white shadow-lg shadow-slate-600/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-slate-100 text-slate-600' },
    rose: { active: 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02]', inactive: 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50', iconActive: 'bg-white/20 text-white', iconInactive: 'bg-rose-100 text-rose-600' }
  };

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, endIndex);

  const activeFilterCount = (filterStation ? 1 : 0) + (filterStatus && filterStatus.length > 0 ? 1 : 0);

  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const pageIds = currentData.map(item => item.idPelanggan).filter(Boolean);
      const newIds = [...new Set([...selectedIds, ...pageIds])];
      setSelectedIds(newIds);
    } else {
      const pageIds = currentData.map(item => item.idPelanggan);
      setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id, isChecked) => {
    if (isChecked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    }
  };

  const isAllPageSelected = currentData.length > 0 && currentData.every(item => selectedIds.includes(item.idPelanggan));

  const [isExporting, setIsExporting] = useState(false);

  // FUNGSI EKSPOR EXCEL DINAMIS
  const handleExportExcel = (customRows = null, customLabel = '') => {
    const rowsToExport = customRows || filteredData;
    if (!rowsToExport || rowsToExport.length === 0) {
      alert("Tidak ada data pelanggan yang cocok untuk diekspor.");
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      try {
        const exportRows = rowsToExport.map((item, index) => {
          const rawAktivasi = String(item.aktivasi || item.statusAktivasi || '').trim().toLowerCase();
          const globalStat = String(getGlobalStatusStr(item)).toUpperCase();
          let displayStatusStr = 'WAITING';
          if (globalStat.includes('KENDALA')) displayStatusStr = 'KENDALA';
          else if (rawAktivasi === 'sudah' || rawAktivasi === 'aktif' || globalStat === 'AKTIF') displayStatusStr = 'AKTIF';
          else if (rawAktivasi === 'ready to dismantle' || globalStat === 'READY TO DISMANTLE') displayStatusStr = 'READY TO DISMANTLE';
          else if (rawAktivasi === 'dismantled' || rawAktivasi === 'dismantle' || globalStat === 'DISMANTLED') displayStatusStr = 'DISMANTLED';
          else if (rawAktivasi === 'suspend' || globalStat === 'SUSPEND') displayStatusStr = 'SUSPEND';
          else if (rawAktivasi === 'kendala') displayStatusStr = 'KENDALA';
          else displayStatusStr = getGlobalStatusStr(item);

          return {
            'No': index + 1,
            'ID Pelanggan': item.idPelanggan || '',
            'Nama Pelanggan': item.namaPelanggan || '',
            'Nomor HP': item.nomorHp ? String(item.nomorHp) : '',
            'Alamat': item.alamat || '',
            'Catatan': item.catatan || '',
            'Stasiun': toProperCase(item.stasiun) || '',
            'ODP': item.odpAktual || item.odp || '',
            'Port ODP': (item.portOdp !== undefined && item.portOdp !== null) ? String(item.portOdp) : '',
            'Status IKR': item.ikr || item.statusIkr || 'Belum',
            'Status Aktivasi': displayStatusStr,
            'Telat Bayar (Hari)': (item.telatBayarHari !== null && item.telatBayarHari !== undefined && !isNaN(Number(item.telatBayarHari))) ? Number(item.telatBayarHari) : '',
            'Tanggal Exp / Berakhir': item.tanggalBerakhir ? String(item.tanggalBerakhir).substring(0, 10) : ''
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportRows);

        ws['!cols'] = [
          { wch: 6 },  // No
          { wch: 15 }, // ID Pelanggan
          { wch: 28 }, // Nama Pelanggan
          { wch: 18 }, // Nomor HP
          { wch: 40 }, // Alamat
          { wch: 22 }, // Catatan
          { wch: 16 }, // Stasiun
          { wch: 16 }, // ODP
          { wch: 10 }, // Port ODP
          { wch: 13 }, // Status IKR
          { wch: 22 }, // Status Aktivasi
          { wch: 18 }, // Telat Bayar (Hari)
          { wch: 24 }  // Tanggal Exp / Berakhir
        ];

        // Format styling header (Warna Biru Muda)
        if (ws['!ref']) {
          const range = XLSX.utils.decode_range(ws['!ref']);
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
              fill: {
                fgColor: { rgb: "BFDBFE" } // Biru muda lembut (Tailwind Blue-200 / Sky Blue)
              },
              font: {
                name: "Calibri",
                sz: 11,
                bold: true,
                color: { rgb: "1E3A8A" } // Biru tua kontras dan jelas dibaca
              },
              alignment: {
                vertical: "center",
                horizontal: "center",
                wrapText: true
              },
              border: {
                top: { style: "thin", color: { rgb: "93C5FD" } },
                bottom: { style: "medium", color: { rgb: "3B82F6" } },
                left: { style: "thin", color: { rgb: "BFDBFE" } },
                right: { style: "thin", color: { rgb: "BFDBFE" } }
              }
            };
          }
          ws['!rows'] = [{ hpt: 26 }];
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Pelanggan");

        let nameParts = ['Data_Pelanggan'];
        if (customLabel) {
          nameParts.push(customLabel);
        } else {
          if (filterStation) nameParts.push(String(filterStation).trim().replace(/\s+/g, '_'));
          if (filterStatus && filterStatus.length > 0) nameParts.push(filterStatus.join('_').replace(/\s+/g, '-'));
          if (searchTerm) nameParts.push('Search');
          if (!filterStation && (!filterStatus || filterStatus.length === 0) && !searchTerm) {
            nameParts = ['Data_Semua_Pelanggan'];
          }
        }
        const todayStr = new Date().toISOString().substring(0, 10);
        nameParts.push(todayStr);
        const fileName = `${nameParts.join('_')}.xlsx`;

        // Generate file binary dan freeze baris 1 (Header)
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        let finalBuffer = wbout;
        try {
          const unzipped = fflate.unzipSync(new Uint8Array(wbout));
          for (const path in unzipped) {
            if (path.startsWith('xl/worksheets/sheet')) {
              let xml = fflate.strFromU8(unzipped[path]);
              xml = xml.replace(
                /<sheetViews><sheetView workbookViewId="0"\/>/g,
                '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>'
              );
              unzipped[path] = fflate.strToU8(xml);
            }
          }
          finalBuffer = fflate.zipSync(unzipped);
        } catch (freezeErr) {
          console.warn("Freeze header warning, using standard buffer:", freezeErr);
        }

        const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error("Gagal ekspor excel:", err);
        alert("Terjadi kesalahan saat mengekspor data: " + err.message);
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  return (
    <div className="max-w-7xl mx-auto h-auto md:h-full min-h-full flex flex-col page-enter relative pb-20 md:pb-0">

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterModalOpen(false)}></div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-4 mb-2 sm:mb-4">
        {isPageLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-2 sm:px-4 py-2 sm:py-3 min-h-[48px] sm:min-h-0 rounded-lg sm:rounded-2xl border border-slate-200/70 bg-white flex flex-col justify-between shadow-sm animate-pulse"
            >
              <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-xl bg-slate-200/70"></div>
                <div className="h-4 sm:h-6 w-8 sm:w-12 bg-slate-200/80 rounded-md"></div>
              </div>
              <div className="h-2 sm:h-2.5 w-12 sm:w-16 bg-slate-200/60 rounded mt-1"></div>
            </div>
          ))
        ) : (
          [
            { label: 'WAITING', key: 'WAITING', icon: 'clock', color: 'amber' },
            { label: 'AKTIF', key: 'AKTIF', icon: 'check-circle', color: 'emerald' },
            { label: 'KENDALA', key: 'KENDALA', icon: 'alert-triangle', color: 'rose' },
            { label: 'SUSPEND', key: 'SUSPEND', icon: 'pause-circle', color: 'orange' },
            { label: 'DISMANTLE', key: 'READY TO DISMANTLE', icon: 'alert-circle', color: 'brown' },
            { label: 'DISMANTLED', key: 'DISMANTLED', icon: 'x-circle', color: 'slate' }
          ].map((c, i) => {
            const count = summaryCounts[c.key] || 0;
            const isActive = filterStatus && filterStatus.includes(c.key);
            const activeClass = isActive ? colorStyles[c.color].active : colorStyles[c.color].inactive;
            const iconClass = isActive ? colorStyles[c.color].iconActive : colorStyles[c.color].iconInactive;

            return (
              <div
                key={c.key}
                onClick={() => {
                  const newFilter = isActive
                    ? filterStatus.filter(s => s !== c.key)
                    : [...(filterStatus || []), c.key];
                  setFilterStatus(newFilter);
                  setTempFilterStatus(newFilter);
                }}
                className={`px-2 sm:px-4 py-2 sm:py-3 min-h-[48px] sm:min-h-0 rounded-lg sm:rounded-2xl cursor-pointer transition-all border flex flex-col justify-between ${activeClass}`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <div className={`w-5 h-5 sm:w-8 sm:h-8 rounded-md sm:rounded-xl flex items-center justify-center ${iconClass}`}>
                    <Icon name={c.icon} size={12} className="sm:w-[15px] sm:h-[15px]" />
                  </div>
                  <div className={`text-xs sm:text-xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {count}
                  </div>
                </div>
                <div className={`text-[7.5px] sm:text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                  {c.label}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Header Actions */}
      <div className="bg-white p-2.5 sm:p-4 rounded-lg sm:rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-2.5 sm:gap-4 justify-between items-center relative z-50 mb-2.5 sm:mb-4">
        <div className="relative w-full md:w-96 flex-1">
          <Icon name="search" className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 sm:w-[18px] sm:h-[18px]" size={14} />
          <input
            type="text"
            placeholder="Cari ID Pelanggan, Nama, atau Alamat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs sm:text-sm"
          />
        </div>

        <div className="flex gap-1.5 sm:gap-2 w-full md:w-auto relative flex-wrap sm:flex-nowrap justify-end">

          {/* Tombol Hapus Pilihan, Hapus Massal & Update Massal (Muncul Jika Ada Yang Dicentang) */}
          {selectedIds.length > 0 && (
            <div className="flex gap-2 mr-2 animate-fade">
              <button
                onClick={() => setSelectedIds([])}
                className="flex items-center justify-center border border-slate-200 bg-white text-slate-500 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors"
                title="Batalkan Pilihan"
              >
                <Icon name="x" size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" />
              </button>

              {/* --- TOMBOL HAPUS MASSAL --- */}
              <button
                onClick={() => setShowMassDelete(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-800 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold hover:bg-slate-900 shadow-sm shadow-slate-500/20 transition-colors"
              >
                <Icon name="trash-2" size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> Hapus ({selectedIds.length})
              </button>

              <button
                onClick={() => setShowMassUpdate(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-rose-500 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold hover:bg-rose-600 shadow-sm shadow-rose-500/20 transition-colors"
              >
                <Icon name="layers" size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> <span className="hidden sm:inline">Update Status</span><span className="sm:hidden">Update</span> ({selectedIds.length})
              </button>

              {/* TOMBOL EKSPOR PILIHAN (JIKA ADA CENTANGAN) */}
              <button
                onClick={() => {
                  const selectedRows = filteredData.filter(item => selectedIds.includes(item.idPelanggan));
                  handleExportExcel(selectedRows, `Pilihan_${selectedIds.length}_Pelanggan`);
                }}
                disabled={isExporting}
                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-colors disabled:opacity-50"
                title="Ekspor baris yang dipilih ke Excel"
              >
                <Icon name="download" size={14} className="sm:w-4 sm:h-4 w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">Ekspor Pilihan</span>
                <span className="sm:hidden">Ekspor</span> ({selectedIds.length})
              </button>
            </div>
          )}

          <div className="relative flex-1 md:flex-none flex">
            <button
              onClick={() => {
                setIsFilterModalOpen(!isFilterModalOpen);
                if (!isFilterModalOpen) {
                  setTempFilterStation(filterStation);
                  setTempFilterStatus(filterStatus);
                }
              }}
              className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 border px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${activeFilterCount > 0 || isFilterModalOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon name="filter" size={14} className="sm:w-4 sm:h-4" /> Filter
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[9px] sm:text-[10px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center ml-0.5 sm:ml-1">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterModalOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 sm:mt-3 w-64 sm:w-72 bg-white border border-slate-200 shadow-2xl rounded-xl sm:rounded-2xl p-4 sm:p-5 z-50 origin-top-left sm:origin-top-right animate-dropdown">
                {(isStationDropdownOpen || isStatusDropdownOpen) && (
                  <div className="fixed inset-0 z-[55]" onClick={(e) => { e.stopPropagation(); setIsStationDropdownOpen(false); setIsStatusDropdownOpen(false); }}></div>
                )}

                <div className="flex justify-between items-center mb-3 sm:mb-5 border-b border-slate-100 pb-2 sm:pb-3 relative z-[56]">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center">
                    <Icon name="list-filter" size={16} className="mr-2 text-blue-500 sm:w-[18px] sm:h-[18px]" />
                    Filter Data
                  </h3>
                  <button
                    onClick={() => {
                      setTempFilterStation('');
                      setTempFilterStatus([]);
                      setFilterStation('');
                      setFilterStatus([]);
                    }}
                    className="text-[10px] sm:text-xs text-rose-500 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-5">
                  <div className="relative">
                    <label className="text-[9px] sm:text-[11px] font-bold text-slate-500 mb-1 sm:mb-1.5 block uppercase tracking-wider">Stasiun</label>
                    <div
                      onClick={() => { setIsStationDropdownOpen(!isStationDropdownOpen); setIsStatusDropdownOpen(false); }}
                      className={`w-full p-2 sm:p-2.5 bg-slate-50 border ${isStationDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 relative z-[56] select-none`}
                    >
                      <span className="truncate">{tempFilterStation || 'Semua Stasiun'}</span>
                      <Icon name={isStationDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 sm:w-4 sm:h-4" />
                    </div>

                    {isStationDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-lg sm:rounded-xl py-1 sm:py-1.5 z-[60] animate-dropdown max-h-40 sm:max-h-48 overflow-y-auto">
                        <div
                          onClick={() => { setTempFilterStation(''); setIsStationDropdownOpen(false); }}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${tempFilterStation === '' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Semua Stasiun
                          {tempFilterStation === '' && <Icon name="check" size={12} className="ml-auto sm:w-3.5 sm:h-3.5" />}
                        </div>
                        {uniqueStations.map(st => (
                          <div
                            key={st}
                            onClick={() => { setTempFilterStation(st); setIsStationDropdownOpen(false); }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${tempFilterStation === st ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {st}
                            {tempFilterStation === st && <Icon name="check" size={12} className="ml-auto sm:w-3.5 sm:h-3.5" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="text-[9px] sm:text-[11px] font-bold text-slate-500 mb-1 sm:mb-1.5 block uppercase tracking-wider">Status</label>
                    <div
                      onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsStationDropdownOpen(false); }}
                      className={`w-full p-2 sm:p-2.5 bg-slate-50 border ${isStatusDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-700 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-100 relative z-[56] select-none`}
                    >
                      <span className="truncate">
                        {tempFilterStatus.length === 0 ? 'Semua Status' : tempFilterStatus.length === 1 ? statusOptions.find(o => o.val === tempFilterStatus[0])?.label : `${tempFilterStatus.length} Status Terpilih`}
                      </span>
                      <Icon name={isStatusDropdownOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400 shrink-0 sm:w-4 sm:h-4" />
                    </div>

                    {isStatusDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-lg sm:rounded-xl py-1 sm:py-1.5 z-[60] animate-dropdown max-h-40 sm:max-h-48 overflow-y-auto">
                        {statusOptions.map(opt => (
                          <div
                            key={opt.val}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (opt.val === '') {
                                setTempFilterStatus([]);
                              } else {
                                if (tempFilterStatus.includes(opt.val)) {
                                  setTempFilterStatus(tempFilterStatus.filter(s => s !== opt.val));
                                } else {
                                  setTempFilterStatus([...tempFilterStatus, opt.val]);
                                }
                              }
                            }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2.5 text-[11px] sm:text-sm cursor-pointer transition-colors flex items-center ${(opt.val === '' && tempFilterStatus.length === 0) || tempFilterStatus.includes(opt.val) ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {opt.label}
                            {((opt.val === '' && tempFilterStatus.length === 0) || tempFilterStatus.includes(opt.val)) && <Icon name="check" size={12} className="ml-auto sm:w-3.5 sm:h-3.5" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setFilterStation(tempFilterStation);
                      setFilterStatus(tempFilterStatus);
                      setIsFilterModalOpen(false);
                    }}
                    className="w-full mt-4 sm:mt-6 bg-blue-600 text-white text-xs sm:text-sm font-bold py-2 sm:py-2.5 rounded-lg sm:rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all transform active:scale-[0.98]"
                  >
                    Terapkan Filter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sembunyikan Tombol Baru Jika Ada Pilihan Massal */}
          {selectedIds.length === 0 && (
            <>
              {/* TOMBOL EKSPOR EXCEL DINAMIS (SESUAI FILTER ATAU SEMUA) */}
              <button
                onClick={() => handleExportExcel()}
                disabled={isExporting || filteredData.length === 0}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg hover:bg-emerald-700 text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Ekspor ${filteredData.length} data saat ini ke Excel`}
              >
                <Icon name={isExporting ? "clock" : "download"} size={14} className={`sm:w-4 sm:h-4 ${isExporting ? 'animate-spin' : ''}`} /> 
                <span>{isExporting ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                <span className="bg-emerald-700/90 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none">
                  {filteredData.length}
                </span>
              </button>

              <button
                onClick={() => setActionModal({ type: 'add', data: null })}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-semibold shadow-sm transition-colors"
              >
                <Icon name="plus" size={14} className="sm:w-4 sm:h-4" /> Pelanggan Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabel Data Pelanggan SPA */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative z-30">

        {/* === MOBILE LIST VIEW (CARD) === */}
        <div className="md:hidden flex flex-col gap-2 p-2 bg-slate-50">
          {isPageLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-sm flex flex-col gap-2.5 animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-4 h-4 rounded bg-slate-200 shrink-0"></div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="h-3.5 w-32 bg-slate-200 rounded"></div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-16 bg-slate-100 rounded"></div>
                        <div className="h-2.5 w-14 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-5 w-16 bg-slate-200 rounded-full shrink-0"></div>
                </div>
                <div className="h-2.5 w-4/5 bg-slate-100 rounded ml-6"></div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 ml-6">
                  <div className="flex gap-2">
                    <div className="h-5 w-12 bg-slate-100 rounded"></div>
                    <div className="h-5 w-12 bg-slate-100 rounded"></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-slate-100 rounded-md"></div>
                    <div className="w-6 h-6 bg-slate-100 rounded-md"></div>
                    <div className="w-6 h-6 bg-slate-100 rounded-md"></div>
                  </div>
                </div>
              </div>
            ))
          ) : currentData.length > 0 ? currentData.map((item, idx) => {
            const rawAktivasi = String(item.aktivasi || '').trim().toLowerCase();
            const globalStat = String(getGlobalStatusStr(item)).toUpperCase();
            let displayStatusStr = 'WAITING';

            if (globalStat.includes('KENDALA')) displayStatusStr = 'KENDALA';
            else if (rawAktivasi === 'sudah') displayStatusStr = 'AKTIF';
            else if (rawAktivasi === 'belum') displayStatusStr = 'WAITING';
            else if (rawAktivasi === 'kendala') displayStatusStr = 'KENDALA';
            else if (rawAktivasi === 'ready to dismantle') displayStatusStr = 'READY TO DISMANTLE';
            else if (rawAktivasi === 'dismantled') displayStatusStr = 'DISMANTLED';
            else if (rawAktivasi === 'suspend') displayStatusStr = 'SUSPEND';
            else displayStatusStr = getGlobalStatusStr(item);

            const { issue, reporter, date } = extractKendalaData(item);

            let umurWoStr = '';
            let isWoLama = false;
            if ((displayStatusStr === 'WAITING' || displayStatusStr === 'KENDALA') && item.tanggalRegistrasi) {
              const stdDate = standardizeDate(item.tanggalRegistrasi);
              if (stdDate) {
                const regDate = new Date(stdDate);
                if (!isNaN(regDate.getTime())) {
                  const today = new Date();
                  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const regDateZero = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
                  const diffMs = todayZero - regDateZero;
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays >= 0) {
                    if (diffDays === 0) {
                      const rawDate = new Date(item.tanggalRegistrasi);
                      if (!isNaN(rawDate.getTime())) {
                        const diffHours = Math.max(0, Math.floor((today - rawDate) / (1000 * 60 * 60)));
                        umurWoStr = `${diffHours} Jam`;
                      } else {
                        umurWoStr = `0 Jam`;
                      }
                    } else {
                      umurWoStr = `${diffDays} Hari`;
                    }
                    isWoLama = diffDays >= 3;
                  }
                }
              }
            }
            let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
            if (displayStatusStr.includes("AKTIF") || displayStatusStr === "DONE") {
              statusColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
            } else if (displayStatusStr.includes("WAITING")) {
              statusColor = "bg-amber-100 text-amber-700 border-amber-200";
            } else if (displayStatusStr.includes("KENDALA")) {
              statusColor = "bg-rose-100 text-rose-700 border-rose-200";
            } else if (displayStatusStr === "SUSPEND") {
              statusColor = "bg-orange-100 text-orange-800 border-orange-200";
            } else if (displayStatusStr === "READY TO DISMANTLE") {
              statusColor = "bg-amber-900/10 text-amber-800 border-amber-800/30";
            } else if (displayStatusStr === "DISMANTLED") {
              statusColor = "bg-slate-100 text-slate-500 border-slate-300 opacity-80 line-through";
            }

            let waLink = "";
            if (item.nomorHp) {
              let no = String(item.nomorHp).replace(/\D/g, '');
              if (no.startsWith('0')) no = '62' + no.substring(1);
              waLink = `https://wa.me/${no}`;
            }

            const isSelected = selectedIds.includes(item.idPelanggan);

            return (
              <div key={idx} className={`p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-blue-50/70 border-blue-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'} flex flex-col gap-2`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectRow(item.idPelanggan, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 truncate leading-tight">{item.namaPelanggan || 'Tanpa Nama'}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded leading-none">{item.idPelanggan || '-'}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">{toProperCase(item.stasiun)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${statusColor}`}>
                      {displayStatusStr}
                    </span>
                    {umurWoStr && (
                      <span className={`px-1.5 py-0.5 flex items-center gap-1 rounded text-[8px] font-bold uppercase tracking-wider border ${isWoLama ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        <Icon name="clock" size={8} /> {umurWoStr}
                      </span>
                    )}
                    {(displayStatusStr === 'SUSPEND' || displayStatusStr === 'READY TO DISMANTLE' || displayStatusStr === 'DISMANTLE') && (
                      <>
                        {(Number(item.telatBayarHari) > 0) && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            <Icon name="clock" size={8} className="text-rose-500" /> Telat {item.telatBayarHari}h
                          </span>
                        )}
                        {item.tanggalBerakhir && (
                          <span className="text-[8px] font-medium text-slate-400">
                            Exp: {item.tanggalBerakhir.substring(0, 10)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 truncate w-full pl-6">
                  {item.alamat || 'Alamat tidak tersedia'}
                </div>

                {/* Kendala Mobile Row */}
                {(() => {
                  if (displayStatusStr !== 'KENDALA' && displayStatusStr !== 'WAITING') return null;
                  const hasKendala = item.issueKendala && item.issueKendala !== item.alamat;
                  const issueText = issue && issue !== item.alamat ? issue : '';
                  if (!hasKendala && !issueText) return null;
                  return (
                    <div className="flex items-start gap-1.5 text-[9px] font-medium text-rose-900 bg-rose-50 border border-rose-200 px-2 py-1.5 rounded-md ml-6">
                      <Icon name="alert-circle" size={10} className="text-rose-600 shrink-0 mt-0.5" />
                      <span className="whitespace-normal leading-tight italic">
                        <span className="font-bold text-rose-800">KENDALA:</span> {item.issueKendala || issueText}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2 border-t border-slate-50 ml-6">
                  <div className="flex gap-2">
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-1 rounded transition-colors hover:bg-emerald-100">
                        <Icon name="phone" size={10} className="mr-1" /> WA
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-1 rounded flex items-center"><Icon name="phone" size={10} className="mr-1" /> -</span>
                    )}

                    {item.latitude && item.longitude ? (
                      <a href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="flex items-center text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-1 rounded transition-colors hover:bg-blue-100">
                        <Icon name="map-pin" size={10} className="mr-1" /> Peta
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-1 rounded flex items-center"><Icon name="map-pin" size={10} className="mr-1" /> -</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setActionModal({ type: 'detail', data: item })} className="p-1.5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center">
                      <Icon name="eye" size={12} />
                    </button>
                    <button onClick={() => setActionModal({ type: 'edit', data: item })} className="p-1.5 bg-slate-100 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors flex items-center justify-center">
                      <Icon name="edit" size={12} />
                    </button>
                    <button onClick={() => setActionModal({ type: 'log', data: item })} className="p-1.5 bg-slate-100 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center justify-center">
                      <Icon name="headset" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="py-12 text-center text-slate-400">
              <Icon name="filter-x" size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-slate-600">Pelanggan tidak ditemukan</p>
              <p className="text-xs mt-1">Silakan gunakan kata kunci pencarian atau kriteria filter yang berbeda.</p>
            </div>
          )}
        </div>

        {/* === DESKTOP TABLE VIEW === */}
        <div className="hidden md:block overflow-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap relative">
            <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 font-bold shadow-sm outline outline-1 outline-slate-200">
              <tr>
                {/* Kolom Checkbox Header */}
                <th className="px-4 py-4 w-12 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleSelectAllOnPage}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-4 py-4">ID PELANGGAN</th>
                <th className="px-6 py-4">NAMA & ALAMAT</th>
                <th className="px-6 py-4">KONTAK & LOKASI</th>
                <th className="px-6 py-4">STASIUN</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => setSortAgeOrder(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))}>
                  <div className="flex items-center">
                    STATUS
                    {sortAgeOrder === 'asc' && <Icon name="chevron-up" size={14} className="ml-1 text-blue-500" />}
                    {sortAgeOrder === 'desc' && <Icon name="chevron-down" size={14} className="ml-1 text-blue-500" />}
                    {!sortAgeOrder && <Icon name="chevrons-up-down" size={14} className="ml-1 text-slate-300" />}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPageLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {/* Checkbox Skeleton */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 rounded bg-slate-200"></div>
                      </div>
                    </td>
                    {/* ID Pelanggan Skeleton */}
                    <td className="px-4 py-4">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                    </td>
                    {/* Nama & Alamat Skeleton */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-36 sm:w-44 bg-slate-200 rounded"></div>
                        <div className="h-3 w-52 sm:w-64 bg-slate-100 rounded"></div>
                      </div>
                    </td>
                    {/* Kontak & Lokasi Skeleton */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-3.5 w-24 bg-slate-100 rounded"></div>
                        <div className="h-3.5 w-20 bg-slate-100 rounded"></div>
                      </div>
                    </td>
                    {/* Stasiun Skeleton */}
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-slate-200 rounded"></div>
                    </td>
                    {/* Status Skeleton */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
                        <div className="h-5 w-14 bg-slate-100 rounded-md"></div>
                      </div>
                    </td>
                    {/* Aksi Skeleton */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-md"></div>
                        <div className="w-7 h-7 bg-slate-100 rounded-md"></div>
                        <div className="w-7 h-7 bg-slate-100 rounded-md"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : currentData.length > 0 ? currentData.map((item, idx) => {
                const rawAktivasi = String(item.aktivasi || '').trim().toLowerCase();
                const globalStat = String(getGlobalStatusStr(item)).toUpperCase();
                let displayStatusStr = 'WAITING';

                if (globalStat.includes('KENDALA')) displayStatusStr = 'KENDALA';
                else if (rawAktivasi === 'sudah') displayStatusStr = 'AKTIF';
                else if (rawAktivasi === 'belum') displayStatusStr = 'WAITING';
                else if (rawAktivasi === 'kendala') displayStatusStr = 'KENDALA';
                else if (rawAktivasi === 'ready to dismantle') displayStatusStr = 'READY TO DISMANTLE';
                else if (rawAktivasi === 'dismantled') displayStatusStr = 'DISMANTLED';
                else if (rawAktivasi === 'suspend') displayStatusStr = 'SUSPEND';
                else displayStatusStr = getGlobalStatusStr(item);

                const { issue, reporter, date } = extractKendalaData(item);

                let umurWoStr = '';
                let isWoLama = false;
                if ((displayStatusStr === 'WAITING' || displayStatusStr === 'KENDALA') && item.tanggalRegistrasi) {
                  const stdDate = standardizeDate(item.tanggalRegistrasi);
                  if (stdDate) {
                    const regDate = new Date(stdDate);
                    if (!isNaN(regDate.getTime())) {
                      const today = new Date();
                      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const regDateZero = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());
                      const diffMs = todayZero - regDateZero;
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      if (diffDays >= 0) {
                        if (diffDays === 0) {
                          const rawDate = new Date(item.tanggalRegistrasi);
                          if (!isNaN(rawDate.getTime())) {
                            const diffHours = Math.max(0, Math.floor((today - rawDate) / (1000 * 60 * 60)));
                            umurWoStr = `${diffHours} Jam`;
                          } else {
                            umurWoStr = `0 Jam`;
                          }
                        } else {
                          umurWoStr = `${diffDays} Hari`;
                        }
                        isWoLama = diffDays >= 3;
                      }
                    }
                  }
                }
                let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                if (displayStatusStr.includes("AKTIF") || displayStatusStr === "DONE") {
                  statusColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
                } else if (displayStatusStr.includes("WAITING")) {
                  statusColor = "bg-amber-100 text-amber-700 border-amber-200";
                } else if (displayStatusStr.includes("KENDALA")) {
                  statusColor = "bg-rose-100 text-rose-700 border-rose-200";
                } else if (displayStatusStr === "SUSPEND") {
                  statusColor = "bg-orange-100 text-orange-800 border-orange-200";
                } else if (displayStatusStr === "READY TO DISMANTLE") {
                  statusColor = "bg-amber-900/10 text-amber-800 border-amber-800/30";
                } else if (displayStatusStr === "DISMANTLED") {
                  statusColor = "bg-slate-100 text-slate-500 border-slate-300 opacity-80 line-through";
                }

                let waLink = "";
                if (item.nomorHp) {
                  let no = String(item.nomorHp).replace(/\D/g, '');
                  if (no.startsWith('0')) no = '62' + no.substring(1);
                  waLink = `https://wa.me/${no}`;
                }

                const isSelected = selectedIds.includes(item.idPelanggan);

                return (
                  <tr key={idx} className={`transition-colors ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50/80' : 'hover:bg-slate-50'}`}>

                    {/* Checkbox Row */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(item.idPelanggan, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-700 font-mono">{item.idPelanggan || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{item.namaPelanggan || 'Tanpa Nama'}</div>
                      <div className="text-xs text-slate-500 max-w-xs truncate" title={item.alamat}>{item.alamat || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                            <Icon name="phone" size={12} className="mr-1.5" /> {item.nomorHp}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center"><Icon name="phone" size={12} className="mr-1.5" /> -</span>
                        )}

                        {item.latitude && item.longitude ? (
                          <a href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            <Icon name="map-pin" size={12} className="mr-1.5" /> Lihat Peta
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center"><Icon name="map-pin" size={12} className="mr-1.5" /> -</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {toProperCase(item.stasiun) || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start">
                        {/* BARIS 1: BADGES STATUS & UMUR WO */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                            {displayStatusStr}
                          </span>

                          {/* INDIKATOR UMUR WO */}
                          {umurWoStr && (
                            <span className={`px-2 py-1 flex items-center gap-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isWoLama ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`} title="Umur WO dari Tanggal Registrasi">
                              <Icon name="clock" size={10} />
                              {umurWoStr}
                            </span>
                          )}

                          {/* INDIKATOR TELAT BAYAR & EXP (Hanya untuk Suspend & Ready To Dismantle) */}
                          {(displayStatusStr === 'SUSPEND' || displayStatusStr === 'READY TO DISMANTLE' || displayStatusStr === 'DISMANTLE') && (
                            <>
                              {(Number(item.telatBayarHari) > 0) && (
                                <span className="px-1.5 py-0.5 flex items-center gap-1 rounded text-[8.5px] font-bold uppercase border bg-rose-50 text-rose-700 border-rose-200" title="Jumlah Hari Keterlambatan Bayar">
                                  <Icon name="clock" size={9} className="text-rose-500" />
                                  Telat {item.telatBayarHari} Hari
                                </span>
                              )}
                              {item.tanggalBerakhir && (
                                <span className="px-1.5 py-0.5 flex items-center gap-1 rounded text-[8.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200" title="Tanggal Berakhir / Jatuh Tempo">
                                  <Icon name="calendar" size={9} className="text-slate-400" />
                                  Exp: {item.tanggalBerakhir.substring(0, 10)}
                                </span>
                              )}
                            </>
                          )}

                          {/* INDIKATOR KENDALA */}
                          {displayStatusStr === 'KENDALA' && (
                            <div className="relative flex items-center">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenKendalaId(openKendalaId === item.idPelanggan ? null : item.idPelanggan);
                                }}
                                className={`p-1 rounded-full shadow-sm transition-colors cursor-pointer ${openKendalaId === item.idPelanggan ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-200 animate-pulse'}`}
                              >
                                <Icon name="alert-triangle" size={12} />
                              </div>

                              {openKendalaId === item.idPelanggan && (
                                <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 w-64 bg-white border border-rose-200 shadow-2xl rounded-xl p-4 z-50 animate-dropdown origin-right cursor-default">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOpenKendalaId(null); }}
                                    className="absolute top-2.5 right-2.5 p-1 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                  >
                                    <Icon name="x" size={14} />
                                  </button>

                                  <div className="text-xs font-bold text-rose-600 mb-2.5 flex items-center gap-1.5 border-b border-rose-50 pb-2 pr-6">
                                    <Icon name="info" size={16} /> Laporan Kendala
                                  </div>
                                  <p className="text-xs text-slate-700 mb-4 leading-relaxed whitespace-normal break-words font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    "{issue || 'Isi kendala tidak tercatat'}"
                                  </p>
                                  <div className="text-[10px] text-slate-500 font-bold flex justify-between pt-1">
                                    <span className="flex items-center truncate max-w-[120px]"><Icon name="user" size={12} className="mr-1.5 text-slate-400" /> {reporter || 'Sistem'}</span>
                                    <span className="flex items-center"><Icon name="calendar" size={12} className="mr-1.5 text-slate-400" /> {date ? standardizeDate(date) : '-'}</span>
                                  </div>

                                  <div className="absolute top-1/2 left-full transform -translate-y-1/2 border-[6px] border-transparent border-l-white"></div>
                                  <div className="absolute top-1/2 left-full transform -translate-y-1/2 ml-[1px] border-[6px] border-transparent border-l-rose-200 -z-10"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* BARIS 2: NOTE KENDALA DI BAWAH BADGE (1 BARIS LENGKAP) */}
                        {(() => {
                          if (displayStatusStr !== 'KENDALA' && displayStatusStr !== 'WAITING') return null;
                          const hasKendala = item.issueKendala && item.issueKendala !== item.alamat;
                          const issueText = issue && issue !== item.alamat ? issue : '';

                          if (!hasKendala && !issueText) return null;
                          return (
                            <div className="col-span-full mt-1.5 flex flex-col gap-1.5">
                              {(hasKendala || issueText) && (
                                <div className="flex items-start gap-1.5 text-[10px] font-medium text-rose-900 bg-rose-50/90 border border-rose-200/80 px-2.5 py-1.5 rounded-md" title={item.issueKendala || issueText}>
                                  <Icon name="alert-circle" size={12} className="text-rose-600 shrink-0 mt-0.5" />
                                  <span className="whitespace-normal leading-relaxed font-bold italic"><span className="font-extrabold text-rose-800">KENDALA:</span> {item.issueKendala || issueText}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* BARIS 3: PETUGAS (JIKA ADA) */}
                        {(item.petugasIkr || item.petugasAktivasi) && (
                          <div className="mt-1 flex items-center text-[10px] text-slate-400">
                            <Icon name="user" size={10} className="mr-1 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {item.petugasAktivasi || item.petugasIkr}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setActionModal({ type: 'edit', data: item })} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Edit Data"><Icon name="edit" size={16} /></button>
                        <button onClick={() => setActionModal({ type: 'log', data: item })} className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors" title="Log Gangguan / Visit"><Icon name="wrench" size={16} /></button>
                        <button onClick={() => setActionModal({ type: 'detail', data: item })} className="p-1.5 bg-slate-50 text-slate-600 rounded hover:bg-slate-200 transition-colors" title="Detail Profil"><Icon name="chevron-right" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                    <Icon name="filter-x" size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-slate-600">Pelanggan tidak ditemukan</p>
                    <p className="text-xs mt-1">Silakan gunakan kata kunci pencarian atau kriteria filter yang berbeda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto p-3 sm:p-4 pb-8 sm:pb-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 text-xs sm:text-sm text-slate-500">
          {isPageLoading ? (
            <span className="flex items-center gap-2 text-slate-500 font-medium">
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              Sedang memuat data pelanggan...
            </span>
          ) : (
            <span className="text-center sm:text-left">Menampilkan <span className="font-bold">{filteredData.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)}</span> dari <span className="font-bold">{filteredData.length}</span> data</span>
          )}
          <div className="flex gap-2 sm:gap-1 items-center w-full sm:w-auto justify-between sm:justify-end">
            <span className="sm:mr-4 text-xs font-bold bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              Hal {isPageLoading ? '...' : `${currentPage} / ${totalPages || 1}`}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={isPageLoading || currentPage === 1}
                className="px-4 py-2 sm:py-1.5 border border-slate-200 bg-white font-bold rounded-md hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={isPageLoading || currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 sm:py-1.5 border border-slate-200 bg-white font-bold rounded-md hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* MODAL AKSI (PASTIKAN SEMUA KABEL TERSAMBUNG DI SINI) */}
        {actionModal.type && (
          <ActionModal
            type={actionModal.type}
            data={actionModal.data}
            onClose={(shouldRefresh) => {
              setActionModal({ type: null, data: null });
              if (shouldRefresh === true) onRefresh();
            }}
            onGoToCoverage={onGoToCoverage}
            visitData={visitData}
            onGoToHistory={onGoToHistory}

            // 👇 INI DIA KABEL PENGHUBUNG YANG KEMUNGKINAN TERLEWAT 👇
            onLocalPelangganUpdate={onLocalPelangganUpdate}
            onLocalVisitUpdate={onLocalVisitUpdate}
            petugasList={petugasList}
          />
        )}

        {/* --- RENDER MODAL UPDATE MASSAL --- */}
        {showMassUpdate && (
          <MassUpdateModal
            selectedData={pelangganData.filter(item => selectedIds.includes(item.idPelanggan))}
            onClose={(shouldRefresh) => {
              setShowMassUpdate(false);
              setSelectedIds([]); // Kosongkan pilihan otomatis saat modal ditutup
              if (shouldRefresh === true) {
                onRefresh();
              }
            }}
            onLocalPelangganUpdate={onLocalPelangganUpdate}
          />
        )}

        {/* --- RENDER MODAL HAPUS MASSAL --- */}
        {showMassDelete && (
          <MassDeleteModal
            selectedData={pelangganData.filter(item => selectedIds.includes(item.idPelanggan))}
            onClose={(shouldRefresh) => {
              setShowMassDelete(false);
              setSelectedIds([]); // Kosongkan pilihan otomatis saat modal ditutup
              if (shouldRefresh === true) {
                onRefresh();
              }
            }}
            onLocalPelangganDelete={onLocalPelangganDelete}
          />
        )}

        {/* MODAL AKSI (PASTIKAN SEMUA KABEL TERSAMBUNG DI SINI) */}

      </div>
    </div>
  );
}
// ==========================================
// HALAMAN: PETA GIS & CEK COVERAGE
// ==========================================
// KINI MENERIMA PROP BARU: targetCoords
function CoverageGISView({ data, targetCoords }) {
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
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>', maxZoom: 20
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
          const displayTitle = odp.kodeOdp || odp.label || 'Nama ODP Kosong';

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

  // --- FUNGSI INTI EKSEKUSI KALKULASI ---
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
      mapInstance.current.flyTo([tLat, tLng], 17, { duration: 1.5 }); // Zoom level 17 agar lebih dekat
    }
  };

  // --- AUTO-TRIGGER JIKA MENDAPAT KOORDINAT DARI TAB DATABASE ---
  useEffect(() => {
    if (targetCoords && targetCoords.lat && targetCoords.lng) {
      const parsedLat = parseFloat(String(targetCoords.lat).replace(',', '.'));
      const parsedLng = parseFloat(String(targetCoords.lng).replace(',', '.'));

      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setManualLat(parsedLat.toString());
        setManualLng(parsedLng.toString());
        setGmapsLink(''); // Bersihkan link gmaps jika ada

        // Eksekusi otomatis!
        executeCoverageCalculation(parsedLat, parsedLng, searchRadius);
      }
    }
  }, [targetCoords]); // Hanya jalan saat targetCoords berubah

  // --- TRIGGER MANUAL DARI TOMBOL CEK COVERAGE ---
  const handleCekCoverage = () => {
    let targetLat = parseFloat(String(manualLat).replace(',', '.'));
    let targetLng = parseFloat(String(manualLng).replace(',', '.'));

    if (gmapsLink.trim() !== '') {
      const link = gmapsLink.trim();
      let extractedLat = null; let extractedLng = null;
      const rawMatch = link.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
      const exactPinMatches = [...link.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
      const placeMatch = link.match(/(?:place|search)\/(-?\d+\.\d+)[, +]+(-?\d+\.\d+)/);
      const viewportMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (rawMatch) { extractedLat = parseFloat(rawMatch[1]); extractedLng = parseFloat(rawMatch[2]); }
      else if (exactPinMatches && exactPinMatches.length > 0) { const lastMatch = exactPinMatches[exactPinMatches.length - 1]; extractedLat = parseFloat(lastMatch[1]); extractedLng = parseFloat(lastMatch[2]); }
      else if (placeMatch) { extractedLat = parseFloat(placeMatch[1]); extractedLng = parseFloat(placeMatch[2]); }
      else if (viewportMatch) { extractedLat = parseFloat(viewportMatch[1]); extractedLng = parseFloat(viewportMatch[2]); }

      if (extractedLat !== null && extractedLng !== null) {
        targetLat = extractedLat; targetLng = extractedLng;
        setManualLat(extractedLat.toString()); setManualLng(extractedLng.toString());
      } else {
        setErrorMsg('Gagal membaca koordinat pasti dari link. Pastikan Anda menyalin link lengkap atau paste langsung koordinat angkanya.');
        return;
      }
    }

    if (isNaN(targetLat) || isNaN(targetLng)) {
      setErrorMsg('Latitude dan Longitude harus diisi dengan angka yang valid.');
      return;
    }

    executeCoverageCalculation(targetLat, targetLng, searchRadius);
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
      .bindPopup("<b style='font-size:12px;'>Titik Lokasi Pelanggan</b>")
      .addTo(userLayerRef.current)
      .openPopup();

    window.L.circle([userLocation.lat, userLocation.lng], {
      color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, radius: searchRadius, weight: 1, dashArray: '5, 5'
    }).addTo(userLayerRef.current);

  }, [userLocation, searchRadius]);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    if (lineLayerRef.current) { mapInstance.current.removeLayer(lineLayerRef.current); lineLayerRef.current = null; }

    if (userLocation && selectedOdp) {
      const oLat = parseFloat(String(selectedOdp.latitude).trim().replace(',', '.'));
      const oLng = parseFloat(String(selectedOdp.longitude).trim().replace(',', '.'));

      if (!isNaN(oLat) && !isNaN(oLng)) {
        const startPoint = [userLocation.lat, userLocation.lng];
        const endPoint = [oLat, oLng];

        const drawPolyline = (latlngs) => {
          lineLayerRef.current = window.L.polyline(latlngs, {
            color: '#a855f7', weight: 4, opacity: 0.9, dashArray: '10, 10', className: 'animated-polyline', lineCap: 'round', lineJoin: 'round'
          }).addTo(mapInstance.current);

          const bounds = window.L.latLngBounds(latlngs);
          mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18, animate: true, duration: 1 });
        };

        const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${userLocation.lng},${userLocation.lat};${oLng},${oLat}?geometries=geojson`;

        fetch(osrmUrl)
          .then(response => response.json())
          .then(result => {
            if (result && result.routes && result.routes.length > 0) {
              const routeCoords = result.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
              drawPolyline(routeCoords);
              setRealRouteDistance(Math.round(result.routes[0].distance));
            } else {
              drawPolyline([startPoint, endPoint]);
              setRealRouteDistance(null);
            }
          })
          .catch(err => {
            console.error('Gagal mengambil rute dari OSRM, menggunakan garis lurus.', err);
            drawPolyline([startPoint, endPoint]);
            setRealRouteDistance(null);
          });
      }
    }
  }, [selectedOdp, userLocation]);

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error('Gagal menyalin', err); }
    document.body.removeChild(textArea);
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-140px)] sm:h-[calc(100vh-120px)] lg:h-[calc(100vh-70px)] flex flex-col lg:flex-row gap-3 sm:gap-6 page-enter pb-2 lg:pb-0">
      <style>{`
        .animated-polyline { animation: dash-animation 1s linear infinite; }
        @keyframes dash-animation { to { stroke-dashoffset: -20; } }
      `}</style>

      {/* --- PANEL KIRI: Formulir & Daftar ODP --- */}
      <div className="flex flex-col lg:w-[400px] gap-3 sm:gap-5 shrink-0 flex-1 lg:flex-none order-2 lg:order-1 min-h-0">

        {/* KOTAK ATAS: FORM */}
        <div className="w-full bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm shrink-0 relative overflow-hidden">
          {targetCoords && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse"></div>
          )}

          <div className="flex justify-between items-center mb-3 sm:mb-5">
            <h2 className="font-bold text-slate-800 flex items-center text-sm sm:text-lg">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 flex items-center justify-center mr-2.5 sm:mr-3">
                <Icon name="map-pin" className="text-rose-500" size={16} />
              </div>
              Cari Lokasi Pelanggan
            </h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2 block">
                Paste Link Google Maps / Koordinat
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={gmapsLink}
                  onChange={(e) => setGmapsLink(e.target.value)}
                  placeholder="Paste link map atau '-6.xx, 110.xx'"
                  className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm transition-colors"
                />
                <button
                  onClick={handleCekCoverage}
                  className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-r-xl hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Icon name="search" size={16} />
                </button>
              </div>
            </div>

            <div className="relative flex items-center py-0.5 sm:py-2 hidden lg:flex">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="shrink-0 mx-3 sm:mx-4 text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Atau Manual</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Latitude</label>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="-6.xxx"
                  className={`w-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 border rounded-lg text-xs sm:text-sm focus:outline-none focus:bg-white transition-colors font-mono ${targetCoords ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                />
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Longitude</label>
                <input
                  type="text"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="106.xxx"
                  className={`w-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 border rounded-lg text-xs sm:text-sm focus:outline-none focus:bg-white transition-colors font-mono ${targetCoords ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 focus:border-blue-500'}`}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-[10px] sm:text-[11px] text-rose-600 bg-rose-50 p-2 sm:p-2.5 rounded-lg border border-rose-100 flex items-start">
                <Icon name="alert-triangle" size={14} className="mr-1.5 mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleCekCoverage}
              className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 sm:py-3 mt-0.5 sm:mt-1 rounded-xl shadow-md shadow-blue-900/20 hover:bg-blue-800 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 text-xs sm:text-sm"
            >
              <Icon name="radar" size={16} /> Cek Coverage
            </button>
          </div>
        </div>

        {/* KOTAK BAWAH: REKOMENDASI ODP */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-3 py-2.5 sm:px-5 sm:py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="font-bold text-xs sm:text-sm text-slate-700 flex items-center">
              <Icon name="list" size={14} className="mr-1.5 sm:mr-2 text-slate-400" />
              Rekomendasi ODP
            </span>
            <select
              value={searchRadius}
              onChange={(e) => {
                const newRadius = Number(e.target.value);
                setSearchRadius(newRadius);
                if (userLocation) {
                  executeCoverageCalculation(userLocation.lat, userLocation.lng, newRadius);
                }
              }}
              className="text-[9px] sm:text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded-md font-bold focus:outline-none cursor-pointer"
            >
              <option value={150}>Radius: 150m</option>
              <option value={300}>Radius: 300m</option>
              <option value={500}>Radius: 500m</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 custom-scrollbar bg-slate-50/30 relative">
            {!userLocation ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 opacity-60 absolute inset-0">
                <Icon name="map" size={32} className="mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm font-medium">Silakan lakukan pencarian<br />untuk melihat ODP di sini.</p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {recommendations.map((rec, i) => {
                  const isSelected = selectedOdp && (selectedOdp.kodeOdp === rec.kodeOdp && selectedOdp.label === rec.label);
                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedOdp(rec); setRealRouteDistance(null); }}
                      className={`cursor-pointer border rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm transition-all transform hover:-translate-y-0.5 ${isSelected ? 'bg-purple-50/40 border-purple-500 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                    >
                      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                        <div className="pr-2">
                          <h3 className={`font-bold text-xs sm:text-[13px] ${isSelected ? 'text-purple-700' : 'text-slate-800'}`}>
                            {rec.kodeOdp || rec.label}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex items-center">
                            <Icon name="map-pin" size={10} className="mr-1" /> Stasiun: {toProperCase(rec.stasiun)}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
                          {rec.isFull ? (
                            <div className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-1 rounded border border-slate-200">
                              FULL ({rec.distance}m)
                            </div>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-1 rounded border border-emerald-200">
                              RADIUS ({rec.distance}m)
                            </div>
                          )}

                          {isSelected && realRouteDistance && (
                            <div className="text-[9px] bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 font-bold flex items-center shadow-sm animate-fade">
                              <Icon name="git-commit" size={10} className="mr-1" /> JALUR: ±{realRouteDistance}m
                            </div>
                          )}
                          {isSelected && !realRouteDistance && (
                            <div className="text-[9px] text-slate-400 font-medium flex items-center animate-pulse">
                              Mengkalkulasi rute...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-medium text-slate-600">
                          Port Tersedia: <strong className={rec.isFull ? "text-rose-600" : "text-emerald-600"}>{rec.available}</strong> / {rec.kapasitas}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(rec.kodeOdp || rec.label); }}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center ${rec.isFull ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50'}`}
                          disabled={rec.isFull}
                        >
                          <Icon name="copy" size={12} className="mr-1" /> Salin
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-rose-500 opacity-80 absolute inset-0">
                <Icon name="alert-circle" size={40} className="mb-3" />
                <p className="text-sm font-medium">Tidak ada ODP ditemukan</p>
                <p className="text-[10px] sm:text-xs mt-1 text-slate-500">Coba perbesar radius pencarian Anda.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- PANEL KANAN: Peta Map --- */}
      <div className="order-1 lg:order-2 w-full lg:flex-1 h-[45vh] lg:h-full bg-slate-100 rounded-xl sm:rounded-2xl border border-slate-200 shadow-inner relative overflow-hidden z-0 shrink-0 lg:shrink">
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon, bg, iconColor, subtext, infoTooltip, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl p-3.5 lg:p-6 shadow-sm border border-slate-200 lg:border-slate-100 flex flex-col justify-between lg:justify-center transition-all hover:shadow-md relative group ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}
      onClick={onClick}
    >
      {infoTooltip && (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 cursor-help group/info">
          <Icon name="info" size={12} className="text-slate-300 hover:text-blue-500 transition-colors lg:hidden" />
          <span className="hidden lg:inline-flex"><Icon name="info" size={16} className="text-slate-300 hover:text-blue-500 transition-colors" /></span>
          {/* Tooltip Popup */}
          <div className="absolute right-0 top-full mt-2 hidden group-hover/info:block w-48 lg:w-56 bg-slate-800 text-white text-[10px] p-2.5 lg:p-3 rounded-lg shadow-xl z-50 normal-case tracking-normal">
            {infoTooltip}
            {/* Panah (Arrow) */}
            <div className="absolute bottom-full right-1 border-4 border-transparent border-b-slate-800"></div>
          </div>
        </div>
      )}

      {/* Tampilan Mobile (< lg) Persis mobile.jsx */}
      <div className="lg:hidden">
        <div className="flex justify-between items-start mb-2.5">
          <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight line-clamp-2 pr-1">{title}</h3>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-xl font-black text-slate-800 leading-none">{value}</span>
          <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center ${iconColor} shrink-0`}>
            <Icon name={icon} size={12} />
          </div>
        </div>
      </div>

      {/* Tampilan Desktop (>= lg) ASLI */}
      <div className="hidden lg:flex items-center justify-between mt-2">
        <div className="space-y-1">
          <p className="text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="text-2xl font-extrabold text-slate-800">{value}</div>
        </div>
        <div className={`p-3 lg:p-4 rounded-xl ${bg} ${iconColor} shrink-0`}>
          <Icon name={icon} size={24} />
        </div>
      </div>

      {/* Render rincian jika ada props subtext */}
      {subtext && <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-slate-50 w-full">{subtext}</div>}
    </div>
  );
}

function TrainChart({ data }) {
  if (!data || data.length === 0) return <div className="h-20 flex items-center justify-center text-slate-200 italic">Data stasiun kosong</div>;

  const getAktifVal = (s) => (s.aktifHariIniVal !== undefined ? Number(s.aktifHariIniVal) : (Number(s.performaAktivasi) || 0));
  const maxAktif = Math.max(...data.map(getAktifVal), 0);
  const chartMax = Math.max(5, maxAktif);

  return (
    <>
      {/* Mobile TrainChart */}
      <div className="space-y-3 lg:hidden">
        {data.map((station, i) => {
          const val = getAktifVal(station);
          const progress = (val / chartMax) * 100;

          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 shrink-0 truncate">
                {toProperCase(station.stasiun)}
              </span>

              <div className="flex-1 h-2 bg-slate-100 rounded-full relative flex items-center mr-2 border border-slate-100 min-w-[70px]">
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-100 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-sm z-10 -ml-2.5 transition-all duration-700"
                  style={{ left: `${progress}%` }}
                >
                  <Icon name="train" size={10} className="text-emerald-600" />
                </div>
              </div>

              <span className={`text-[11px] sm:text-xs font-black w-4 text-right shrink-0 ${val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {val}
              </span>
            </div>
          );
        })}
      </div>

      {/* Desktop TrainChart (ASLI) */}
      <div className="space-y-4 mt-2 hidden lg:block">
        {data.map((station, i) => {
          const val = getAktifVal(station);
          const progress = (val / chartMax) * 100;

          return (
            <div key={i} className="flex items-center gap-4">
              <div className="w-24 text-[10px] font-bold text-slate-500 uppercase truncate">{toProperCase(station.stasiun)}</div>
              <div className="flex-1 bg-slate-50 h-2 rounded-full relative overflow-visible border border-slate-100 flex items-center px-1">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                <div className="absolute transition-all duration-1000 flex items-center justify-center" style={{ left: `${Math.min(progress, 100)}%`, transform: 'translateX(-50%)' }}>
                  <div className="bg-white border-2 border-emerald-500 text-emerald-600 rounded-full p-1 shadow-md">
                    <Icon name="train" size={12} />
                  </div>
                </div>
              </div>
              <div className="w-8 text-right font-black text-emerald-600 text-xs">{val}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        throw new Error('Username atau password salah!');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-100 p-4 font-sans relative overflow-hidden">

      {/* Top Wavy Background */}
      <div className="absolute top-0 left-0 right-0 w-full z-0 pointer-events-none text-slate-50 flex">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full block h-[45vh] sm:h-[55vh] lg:h-[65vh]" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,202.7C960,224,1056,224,1152,213.3C1248,203,1344,181,1392,170.7L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-5 sm:p-8 border border-white/50 relative z-10 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-800" />

        <div className="flex justify-center mb-6 mt-2">
          <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-700/30">
            <Icon name="activity" size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 text-center mb-2 tracking-tight">OpsTracker Portal</h2>
        <p className="text-sm text-slate-500 text-center mb-8 font-medium">Silakan masuk untuk melanjutkan</p>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade">
            <Icon name="alert-circle" size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wider">Username</label>
            <div className="relative group">
              <Icon name="user" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-800 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700 transition-all text-slate-800"
                placeholder="Masukkan username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <Icon name="lock" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-800 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700 transition-all text-slate-800"
                placeholder="Masukkan password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-800/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center gap-2 mt-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Masuk ke Sistem'}
            {!loading && <Icon name="arrow-right" size={16} />}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2026 Desnarum. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function AppWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('otas_auth') === 'true');

  if (!isAuthenticated) {
    return <LoginView onLogin={(user) => {
      setIsAuthenticated(true);
      localStorage.setItem('otas_auth', 'true');
      localStorage.setItem('otas_user', JSON.stringify(user));
    }} />;
  }

  return <App onLogout={() => {
    setIsAuthenticated(false);
    localStorage.removeItem('otas_auth');
    localStorage.removeItem('otas_user');
  }} />;
}
