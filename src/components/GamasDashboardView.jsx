import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  fetchAllOspTickets,
  mapTicketStatus,
  calculateDuration,
  formatDateTimeWib
} from '../services/ospTicketService';

import Icon from './Icon';

export default function GamasDashboardView({ onGamasUpdate }) {
  // Topologi Rantai Stasiun
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

  // State data
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Open'); // 'Open' (default) | 'Semua' | status name
  const [stationFilter, setStationFilter] = useState('');
  const [oltBrandFilter, setOltBrandFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState(''); // 'compliant' | 'breached' | ''
  const [selectedStationNode, setSelectedStationNode] = useState(null);

  // Modal Detail State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('summary'); // 'summary' | 'visit' | 'photos' | 'timeline'
  const [copiedTicketId, setCopiedTicketId] = useState(null);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (selectedTicket) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setSelectedTicket(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedTicket]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load Data from Partner API
  const loadTickets = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await fetchAllOspTickets(isManual);
      if (res.success) {
        setTickets(res.data || []);
        setLastSyncTime(res.lastSync || new Date());
        if (typeof onGamasUpdate === 'function') {
          onGamasUpdate();
        }
      } else {
        setErrorMessage(res.error || "Gagal memuat data dari Partner API");
      }
    } catch (err) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Auto-refresh timer every 60 seconds if enabled
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      loadTickets(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [autoSync]);

  // Status mapping constants matching Partner Dashboard
  const STATUS_CONFIGS = [
    { key: 'Menunggu Ditugaskan', label: 'Menunggu Ditugaskan', color: 'amber', icon: 'clock', bg: 'bg-amber-500' },
    { key: 'Ditugaskan ke IKR', label: 'Ditugaskan ke IKR', color: 'blue', icon: 'users', bg: 'bg-blue-600' },
    { key: 'Diproses IKR', label: 'Diproses IKR', color: 'purple', icon: 'wrench', bg: 'bg-purple-600' },
    { key: 'Menunggu Validasi', label: 'Menunggu Validasi', color: 'sky', icon: 'check-square', bg: 'bg-sky-500' },
    { key: 'Selesai', label: 'Selesai', color: 'emerald', icon: 'check-circle-2', bg: 'bg-emerald-600' },
    { key: 'Batal', label: 'Batal', color: 'rose', icon: 'x-circle', bg: 'bg-rose-500' },
  ];

  // Sanitize tickets to ensure 'Done' or visit 'finish' without NOC validation is always mapped to 'Menunggu Validasi' and 'Selesai WO'
  const sanitizedTickets = useMemo(() => {
    return tickets.map(t => {
      let status = t.status;
      let penugasanBadge = t.penugasanBadge;
      let penugasanColor = t.penugasanColor;

      const rawSt = String(t.rawStatus || t.raw?.status || '').toLowerCase();
      const isWaitingValidation = status === 'Menunggu Validasi' || status === 'Done' || status === 'done' || rawSt === 'done';

      if (isWaitingValidation && status !== 'Selesai' && status !== 'Batal') {
        status = 'Menunggu Validasi';
        penugasanBadge = 'Selesai WO';
        penugasanColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
      }

      return {
        ...t,
        status,
        penugasanBadge,
        penugasanColor
      };
    });
  }, [tickets]);

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts = {
      'Semua': sanitizedTickets.length,
      'Menunggu Ditugaskan': 0,
      'Ditugaskan ke IKR': 0,
      'Diproses IKR': 0,
      'Menunggu Validasi': 0,
      'Selesai': 0,
      'Batal': 0,
    };
    sanitizedTickets.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status] += 1;
      }
    });
    return counts;
  }, [sanitizedTickets]);

  // Topology Station Stats (Active Gamas per station)
  const stationTopologyMap = useMemo(() => {
    const map = {};
    STATION_CHAIN.forEach(st => {
      map[st.name.toLowerCase()] = {
        total: 0,
        active: 0,
        activeTickets: []
      };
    });

    sanitizedTickets.forEach(t => {
      const stName = (t.stationName || '').toLowerCase();
      // Match with station chain
      const matched = STATION_CHAIN.find(sc =>
        stName.includes(sc.name.toLowerCase()) ||
        sc.name.toLowerCase().includes(stName) ||
        (sc.abbr && (t.stationCode === sc.abbr || t.ticketNumber.includes(`-${sc.abbr}-`)))
      );

      if (matched) {
        const key = matched.name.toLowerCase();
        if (!map[key]) map[key] = { total: 0, active: 0, activeTickets: [] };
        map[key].total += 1;
        // Gamas aktif di stasiun hanya jika perbaikan di lapangan masih berlangsung (bukan Selesai, Batal, Menunggu Validasi, atau Selesai WO)
        const isFieldGamasActive = t.status !== 'Selesai' &&
                                   t.status !== 'Batal' &&
                                   t.status !== 'Menunggu Validasi' &&
                                   t.penugasanBadge !== 'Selesai WO';
        if (isFieldGamasActive) {
          map[key].active += 1;
          map[key].activeTickets.push(t);
        }
      }
    });

    return map;
  }, [sanitizedTickets]);

  // Distinct Station List for dropdown filter
  const distinctStations = useMemo(() => {
    const set = new Set();
    sanitizedTickets.forEach(t => {
      if (t.stationName && t.stationName !== '-') set.add(t.stationName);
    });
    return Array.from(set).sort();
  }, [sanitizedTickets]);

  // Distinct OLT Brands for dropdown filter
  const distinctBrands = useMemo(() => {
    const set = new Set();
    sanitizedTickets.forEach(t => {
      if (t.oltBrand && t.oltBrand !== '-') set.add(t.oltBrand);
    });
    return Array.from(set).sort();
  }, [sanitizedTickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return sanitizedTickets.filter(t => {
      // 1. Status Filter
      if (statusFilter === 'Open') {
        // Tampilkan tiket yang sedang open / belum close atau selesai
        if (t.status === 'Selesai' || t.status === 'Batal') {
          return false;
        }
      } else if (statusFilter !== 'Semua' && t.status !== statusFilter) {
        return false;
      }

      // 2. Station Filter (from dropdown or topology node click)
      const activeStFilter = selectedStationNode || stationFilter;
      if (activeStFilter) {
        const stLower = (t.stationName || '').toLowerCase();
        const fLower = activeStFilter.toLowerCase();
        if (!stLower.includes(fLower) && !fLower.includes(stLower)) {
          return false;
        }
      }

      // 3. OLT Brand Filter
      if (oltBrandFilter && t.oltBrand !== oltBrandFilter) {
        return false;
      }

      // 4. SLA Filter
      if (slaFilter === 'compliant' && t.isSlaBreached) return false;
      if (slaFilter === 'breached' && !t.isSlaBreached) return false;

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = (t.ticketNumber || '').toLowerCase().includes(q);
        const matchStation = (t.stationName || '').toLowerCase().includes(q);
        const matchOlt = (t.oltName || '').toLowerCase().includes(q);
        const matchIp = (t.ipOlt || '').toLowerCase().includes(q);
        const matchLead = (t.leadName || '').toLowerCase().includes(q);
        const matchTeknisi = (t.teknisiName || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        const matchCity = (t.city || '').toLowerCase().includes(q);
        if (!matchNumber && !matchStation && !matchOlt && !matchIp && !matchLead && !matchTeknisi && !matchNotes && !matchCity) {
          return false;
        }
      }

      return true;
    });
  }, [sanitizedTickets, statusFilter, stationFilter, selectedStationNode, oltBrandFilter, slaFilter, searchQuery]);

  // Paginated Tickets
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage]);

  const handleCopyTicket = (ticketNumber) => {
    navigator.clipboard.writeText(ticketNumber);
    setCopiedTicketId(ticketNumber);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  const handleExportCsv = () => {
    if (filteredTickets.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }
    const headers = [
      "Nomor Tiket", "Status", "Stasiun", "OLT", "Brand", "IP OLT",
      "Catatan", "Dampak Pelanggan", "Lead IKR", "Teknisi IKR",
      "Waktu Mulai Gangguan", "Waktu Selesai", "Durasi (TTR)", "SLA Breached (>12 Jam)"
    ];
    const rows = filteredTickets.map(t => [
      `"${t.ticketNumber}"`,
      `"${t.status}"`,
      `"${t.stationName}"`,
      `"${t.oltName}"`,
      `"${t.oltBrand}"`,
      `"${t.ipOlt}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.customerImpacted,
      `"${t.leadName}"`,
      `"${t.teknisiName}"`,
      `"${t.startTimeFormatted}"`,
      `"${t.finishTimeFormatted}"`,
      `"${t.durationText}"`,
      t.isSlaBreached ? "Ya" : "Tidak"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tiket_Gamas_OSP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge styling helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Ditugaskan ke IKR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Ditugaskan ke IKR
          </span>
        );
      case 'Menunggu Ditugaskan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Menunggu Ditugaskan
          </span>
        );
      case 'Diproses IKR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Diproses IKR
          </span>
        );
      case 'Menunggu Validasi':
      case 'Done':
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-400 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Menunggu Validasi
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Selesai
          </span>
        );
      case 'Batal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Batal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatLogState = (state) => {
    switch (String(state || '').toLowerCase()) {
      case 'assigned':
        return 'Ditugaskan ke IKR';
      case 'check_olt_odc':
        return 'Pemeriksaan OLT / ODC Lapangan';
      case 'finish':
        return 'Pekerjaan Selesai (WO Finish)';
      case 'validated':
        return 'Divalidasi & Selesai';
      case 'pending':
        return 'Tiket Baru Dibuat';
      case 'process':
        return 'Sedang Diproses IKR';
      case 'cancel':
        return 'Tiket Dibatalkan';
      default:
        return String(state || '-').toUpperCase();
    }
  };

  const formatLogActor = (log) => {
    const table = String(log.user_source_table || '').toLowerCase();
    const uid = String(log.user_id || '').trim();

    if (table === 'user_crm') {
      if (!uid || uid === '' || uid === 'null') {
        return 'Sistem Otomatis CRM / NMS Starlite';
      }
      return `NOC / Helpdesk Starlite (User #${uid})`;
    }
    if (table === 'ikr') {
      return 'Petugas / Teknisi IKR Lapangan';
    }
    if (uid) {
      return `User #${uid}`;
    }
    return 'Sistem Otomatis';
  };

  const totalOpenTickets = useMemo(() => {
    return sanitizedTickets.filter(t => t.status !== 'Selesai' && t.status !== 'Batal').length;
  }, [sanitizedTickets]);

  const totalActiveFieldGamas = useMemo(() => {
    return sanitizedTickets.filter(t =>
      t.status !== 'Selesai' &&
      t.status !== 'Batal' &&
      t.status !== 'Menunggu Validasi' &&
      t.penugasanBadge !== 'Selesai WO'
    ).length;
  }, [sanitizedTickets]);

  const totalWaitingValidation = useMemo(() => {
    return sanitizedTickets.filter(t =>
      t.status === 'Menunggu Validasi' || t.penugasanBadge === 'Selesai WO'
    ).length;
  }, [sanitizedTickets]);

  return (
    <div className="space-y-6 pb-12 animate-fade">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. HEADER & LIVE SYNC CONTROLS */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Icon name="activity" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Monitoring Gangguan Massal (OSP)
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                  Partner API Live
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistem pemantauan tiket gangguan jaringan massal (OSP) Starlite & pelacakan SLA 12 Jam
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
            <span className={`w-2 h-2 rounded-full ${totalActiveFieldGamas > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span>
              {totalActiveFieldGamas > 0
                ? `${totalActiveFieldGamas} Gangguan Membutuhkan Tindakan`
                : totalWaitingValidation > 0
                  ? `Semua Stasiun Normal (${totalWaitingValidation} Menunggu Validasi)`
                  : 'Semua Stasiun Normal'}
            </span>
          </div>

          {lastSyncTime && (
            <span className="text-[11px] font-semibold text-slate-400 hidden lg:inline-block">
              Sync: {lastSyncTime.toLocaleTimeString('id-ID')} WIB
            </span>
          )}

          <button
            onClick={() => loadTickets(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            <Icon name="refresh-cw" size={13} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? 'Sinkronisasi...' : 'Sinkronkan'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700 font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <Icon name="alert-triangle" size={16} className="text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => loadTickets(true)} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700">
            Coba Lagi
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. TOP METRIC STAT CARDS (SESUAI GAMBAR 2 DARI MITRA) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_CONFIGS.map((sc) => {
          const count = statusCounts[sc.key] || 0;
          const isSelected = statusFilter === sc.key;

          const colorClasses = {
            amber: { border: 'border-amber-200', text: 'text-amber-600', bg: 'bg-amber-50/70', activeRing: 'ring-2 ring-amber-500 bg-amber-50' },
            blue: { border: 'border-blue-200', text: 'text-blue-600', bg: 'bg-blue-50/70', activeRing: 'ring-2 ring-blue-500 bg-blue-50' },
            purple: { border: 'border-purple-200', text: 'text-purple-600', bg: 'bg-purple-50/70', activeRing: 'ring-2 ring-purple-500 bg-purple-50' },
            sky: { border: 'border-sky-200', text: 'text-sky-600', bg: 'bg-sky-50/70', activeRing: 'ring-2 ring-sky-500 bg-sky-50' },
            emerald: { border: 'border-emerald-200', text: 'text-emerald-600', bg: 'bg-emerald-50/70', activeRing: 'ring-2 ring-emerald-500 bg-emerald-50' },
            rose: { border: 'border-rose-200', text: 'text-rose-600', bg: 'bg-rose-50/70', activeRing: 'ring-2 ring-rose-500 bg-rose-50' },
          }[sc.color];

          return (
            <div
              key={sc.key}
              onClick={() => {
                setStatusFilter(isSelected ? 'Open' : sc.key);
                setCurrentPage(1);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md ${colorClasses.border} ${isSelected ? colorClasses.activeRing : 'hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{count}</span>
                <div className={`w-8 h-8 rounded-xl ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center`}>
                  <Icon name={sc.icon} size={15} />
                </div>
              </div>
              <h3 className="text-[11px] font-bold text-slate-500 truncate leading-tight">
                {sc.label}
              </h3>
            </div>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. PETA JARINGAN STASIUN (LIVE TOPOLOGY CHAIN) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Icon name="network" size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Peta Jaringan Stasiun (Live OSP Topology)
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Klik stasiun untuk filter tiket
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Normal
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Terdampak Gamas
            </span>
            {selectedStationNode && (
              <button
                onClick={() => setSelectedStationNode(null)}
                className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
              >
                Reset Stasiun ✕
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Chain Container */}
        <div className="overflow-x-auto pt-2 pb-2 scrollbar-thin">
          <div className="flex items-center gap-2 min-w-[980px] justify-between pt-5 pb-3 px-2">
            {STATION_CHAIN.map((st, index) => {
              const stat = stationTopologyMap[st.name.toLowerCase()] || { active: 0, total: 0, activeTickets: [] };
              const isAffected = stat.active > 0;
              const isSelected = selectedStationNode?.toLowerCase() === st.name.toLowerCase();

              return (
                <React.Fragment key={st.abbr}>
                  {/* Station Node Card */}
                  <div
                    onClick={() => {
                      setSelectedStationNode(isSelected ? null : st.name);
                      setCurrentPage(1);
                    }}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer min-w-[82px] max-w-[95px] flex-1 text-center group ${isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-400 shadow-md'
                        : isAffected
                          ? 'border-rose-300 bg-rose-50/60 shadow-sm shadow-rose-500/10 hover:border-rose-400'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Active pulse badge */}
                    {isAffected && (
                      <span className="absolute -top-2.5 -right-1 z-10 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-bounce pointer-events-none select-none">
                        {stat.active} Gamas
                      </span>
                    )}

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105 ${isAffected
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs group-hover:bg-emerald-100 group-hover:text-emerald-700'
                      }`}>
                      <Icon name="radio" size={14} className={isAffected ? "text-white" : "text-emerald-600"} />
                    </div>

                    <span className="text-[11px] font-black tracking-tight text-slate-800 leading-none">
                      {st.abbr}
                    </span>
                    <span className="text-[9.5px] font-semibold text-slate-500 truncate w-full mt-0.5">
                      {st.name}
                    </span>

                    <span className={`text-[8.5px] font-bold mt-1 px-1.5 py-0.2 rounded ${isAffected
                        ? 'text-rose-700 bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50'
                      }`}>
                      {isAffected ? 'Gamas' : 'Normal'}
                    </span>
                  </div>

                  {/* Connector between stations */}
                  {index < STATION_CHAIN.length - 1 && (
                    <div className="flex-1 h-0.5 max-w-[20px] bg-slate-200 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. FILTER TABS & SEARCH BAR (SESUAI GAMBAR 2 DARI MITRA) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        {/* Status Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {/* Default Pill: Tiket Open (Belum Selesai / Close) */}
          <button
            onClick={() => { setStatusFilter('Open'); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === 'Open'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'Open' ? 'bg-amber-300 animate-pulse' : 'bg-amber-500'}`}></span>
            Tiket Open ({totalOpenTickets})
          </button>

          <button
            onClick={() => { setStatusFilter('Semua'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === 'Semua'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
          >
            Semua ({statusCounts['Semua'] || 0})
          </button>

          {STATUS_CONFIGS.map(sc => (
            <button
              key={sc.key}
              onClick={() => { setStatusFilter(sc.key); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${statusFilter === sc.key
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
            >
              {sc.label} ({statusCounts[sc.key] || 0})
            </button>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Icon name="search" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari Nomor Tiket, Stasiun, OLT, IP, Petugas..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                ✕
              </button>
            )}
          </div>

          {/* Stasiun Dropdown */}
          <div>
            <select
              value={stationFilter}
              onChange={(e) => {
                setStationFilter(e.target.value);
                setSelectedStationNode(null);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="">Semua Stasiun</option>
              {distinctStations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* OLT Brand Dropdown */}
          <div>
            <select
              value={oltBrandFilter}
              onChange={(e) => { setOltBrandFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="">Semua Brand OLT</option>
              {distinctBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Export CSV & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              title="Ekspor data ke CSV"
            >
              <Icon name="download" size={13} />
              <span>Ekspor CSV</span>
            </button>

            {(statusFilter !== 'Open' || stationFilter || selectedStationNode || oltBrandFilter || searchQuery || slaFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('Open');
                  setStationFilter('');
                  setSelectedStationNode(null);
                  setOltBrandFilter('');
                  setSlaFilter('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="py-2 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                title="Reset Semua Filter ke Tampilan Default (Tiket Open)"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator */}
        {(selectedStationNode || stationFilter) && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
            <Icon name="map-pin" size={13} className="text-blue-500" />
            <span>Filter Aktif Stasiun: <strong>{selectedStationNode || stationFilter}</strong></span>
            <button
              onClick={() => { setSelectedStationNode(null); setStationFilter(''); }}
              className="ml-auto text-blue-500 hover:text-blue-800 font-bold"
            >
              ✕ Hapus
            </button>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. DATA TABLE (SESUAI KOLOM GAMBAR 2 DARI MITRA) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-28">Aksi</th>
                <th className="py-3 px-4 min-w-[200px]">Informasi Tiket</th>
                <th className="py-3 px-4 min-w-[180px]">Catatan / Gejala</th>
                <th className="py-3 px-4 min-w-[200px]">Informasi Stasiun</th>
                <th className="py-3 px-4 min-w-[170px]">Informasi OLT</th>
                <th className="py-3 px-4 min-w-[190px]">Informasi IKR</th>
                <th className="py-3 px-4 min-w-[180px]">SLA (12 Jam)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold text-xs">Menghubungkan ke Starlite Partner API...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name={statusFilter === 'Open' ? "check-circle-2" : "inbox"} size={36} className={statusFilter === 'Open' ? "text-emerald-400" : "text-slate-300"} />
                      <span className="font-bold text-sm text-slate-700">
                        {statusFilter === 'Open' ? 'Tidak ada tiket gangguan massal yang aktif (Open)' : 'Tidak ada tiket ditemukan'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {statusFilter === 'Open'
                          ? 'Seluruh tiket telah selesai atau ditutup. Klik tab "Semua" untuk melihat seluruh riwayat tiket.'
                          : 'Coba sesuaikan pencarian atau filter status yang dipilih'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* 1. AKSI */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => { setSelectedTicket(t); setModalActiveTab('summary'); }}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-95"
                        >
                          <Icon name="eye" size={12} />
                          <span>Detail</span>
                        </button>

                        {t.latitude && t.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${t.latitude},${t.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors"
                            title="Buka Peta Lokasi Perbaikan"
                          >
                            <Icon name="map-pin" size={10} />
                            <span>Peta</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 2. INFORMASI TIKET */}
                    <td className="py-3.5 px-4 align-top space-y-1">
                      <div>
                        {renderStatusBadge(t.status)}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {t.ticketNumber}
                        </span>
                        <button
                          onClick={() => handleCopyTicket(t.ticketNumber)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Salin nomor tiket"
                        >
                          <Icon name={copiedTicketId === t.ticketNumber ? "check" : "copy"} size={11} className={copiedTicketId === t.ticketNumber ? "text-emerald-500" : ""} />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]" title={`PIC NOC: ${t.picNoc}`}>
                        PIC: <span className="text-slate-600 font-semibold">{t.picNoc}</span>
                      </div>
                    </td>

                    {/* 3. CATATAN & DAMPAK */}
                    <td className="py-3.5 px-4 align-top space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-800 whitespace-pre-wrap leading-tight">
                        {t.notes}
                      </p>
                      {t.customerImpacted > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <Icon name="users" size={10} />
                          <span>{t.customerImpacted} Pelanggan Terdampak</span>
                        </div>
                      )}
                    </td>

                    {/* 4. INFORMASI STASIUN */}
                    <td className="py-3.5 px-4 align-top space-y-0.5">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Nama Stasiun</div>
                      <div className="font-bold text-slate-800 text-[11px]">{t.stationName}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase pt-1">Nama Mitra</div>
                      <div className="text-[10px] text-slate-600 font-medium leading-tight truncate max-w-[200px]" title={t.partnerName}>
                        {t.partnerName}
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-medium pt-0.5">
                        {t.city} • {t.province}
                      </div>
                    </td>

                    {/* 5. INFORMASI OLT */}
                    <td className="py-3.5 px-4 align-top space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Brand:</span>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {t.oltBrand}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama OLT</span>
                        <span className="font-bold text-slate-800 text-[11px]">{t.oltName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Host / IP</span>
                        <span className="font-mono text-[10.5px] text-slate-600 font-semibold">{t.ipOlt}</span>
                      </div>
                    </td>

                    {/* 6. INFORMASI IKR */}
                    <td className="py-3.5 px-4 align-top space-y-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Penugasan</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${t.penugasanColor}`}>
                          {t.penugasanBadge}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama IKR Lead</span>
                        <span className="font-bold text-slate-700 text-[11px]">{t.leadName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Nama IKR Reguler</span>
                        <span className="font-medium text-slate-600 text-[11px]">{t.teknisiName}</span>
                      </div>
                    </td>

                    {/* 7. SLA (12 JAM) */}
                    <td className="py-3.5 px-4 align-top space-y-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Mulai Gangguan</span>
                        <span className="text-[11px] font-bold text-slate-800">{t.startTimeFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Selesai Gangguan</span>
                        <span className="text-[11px] font-bold text-slate-700">{t.finishTimeFormatted}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Durasi / TTR</span>
                        <span className={`text-[10.5px] font-bold ${t.isSlaBreached ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {t.durationText}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="py-3.5 px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong>{filteredTickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(currentPage * pageSize, filteredTickets.length)}</strong> dari <strong>{filteredTickets.length}</strong> tiket
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 font-bold transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 6. MODAL DETAIL TIKET OSP (PORTAL DI DOCUMENT.BODY) */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTicket && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
          {/* Full-Page Backdrop Blur Menyeluruh (Meliputi Sidebar & Header) */}
          <div
            className="fixed inset-0 bg-slate-950/75 transition-opacity animate-fade"
            onClick={() => setSelectedTicket(null)}
          />

          {/* Modal Card - Tinggi Konsisten (Fixed Height) agar tidak berubah/lompat saat pindah tab */}
          <div className="relative z-10 bg-white rounded-3xl max-w-3xl w-full h-[620px] max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Icon name="file-text" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-800 font-mono tracking-tight">
                      {selectedTicket.ticketNumber}
                    </h3>
                    {renderStatusBadge(selectedTicket.status)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Stasiun {selectedTicket.stationName} • {selectedTicket.oltName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-100 px-5 gap-4 text-xs font-bold bg-white shrink-0">
              <button
                onClick={() => setModalActiveTab('summary')}
                className={`py-3 border-b-2 transition-colors ${modalActiveTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
              >
                Ringkasan Tiket
              </button>
              <button
                onClick={() => setModalActiveTab('visit')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${modalActiveTab === 'visit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
              >
                <span>Hasil Visit Lapangan</span>
                {selectedTicket.hasVisit && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                )}
              </button>
              <button
                onClick={() => setModalActiveTab('photos')}
                className={`py-3 border-b-2 transition-colors ${modalActiveTab === 'photos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
              >
                Foto Dokumentasi
              </button>
              <button
                onClick={() => setModalActiveTab('timeline')}
                className={`py-3 border-b-2 transition-colors ${modalActiveTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
              >
                Riwayat Log ({selectedTicket.logs.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 scrollbar-thin">
              {/* TAB 1: SUMMARY */}
              {modalActiveTab === 'summary' && (
                <div className="space-y-4">
                  {/* Catatan Alert Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Catatan / Gejala Gangguan
                    </span>
                    <p className="text-sm font-bold text-slate-800 leading-snug whitespace-pre-wrap">
                      "{selectedTicket.notes}"
                    </p>
                    {selectedTicket.customerImpacted > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Icon name="users" size={13} />
                        <span>Impact: {selectedTicket.customerImpacted} Pelanggan Terdampak</span>
                      </div>
                    )}
                  </div>

                  {/* DETAIL PELANGGAN TERDAMPAK (JIKA TERCATAT OLEH NOC) */}
                  {selectedTicket.affectedCustomers && selectedTicket.affectedCustomers.length > 0 && (
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                          <Icon name="users" size={14} className="text-rose-600" />
                          Rincian Pelanggan Terdampak ({selectedTicket.affectedCustomers.length} Pelanggan)
                        </h4>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                          Data Terinci dari NOC
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-rose-200/80 bg-white max-h-48 scrollbar-thin">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-rose-50/80 text-[10px] font-bold text-rose-700 uppercase border-b border-rose-100 sticky top-0">
                              <th className="py-2 px-3">ID Pelanggan</th>
                              <th className="py-2 px-3">Nama Pelanggan</th>
                              <th className="py-2 px-3">Serial Number (SN)</th>
                              <th className="py-2 px-3 text-right">Redaman (RX)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-50 text-[11px]">
                            {selectedTicket.affectedCustomers.map((c, cIdx) => (
                              <tr key={cIdx} className="hover:bg-rose-50/50 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-slate-800">{c.id}</td>
                                <td className="py-2 px-3 font-semibold text-slate-700">{c.name}</td>
                                <td className="py-2 px-3 font-mono text-[10.5px] text-slate-600">{c.sn}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">{c.rx}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Grid 2 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Data OLT & Stasiun */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                      <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Icon name="server" size={14} className="text-blue-500" />
                        Informasi Jaringan & OLT
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Stasiun:</span>
                          <span className="font-bold text-slate-700">{selectedTicket.stationName} ({selectedTicket.stationCode || '-'})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nama OLT:</span>
                          <span className="font-mono font-bold text-slate-800">{selectedTicket.oltName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Brand OLT:</span>
                          <span className="font-bold text-indigo-600">{selectedTicket.oltBrand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">IP Host OLT:</span>
                          <span className="font-mono font-bold text-slate-700">{selectedTicket.ipOlt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">VLAN Internet:</span>
                          <span className="font-mono text-slate-700">{selectedTicket.vlanInet || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Wilayah:</span>
                          <span className="font-medium text-slate-700">{selectedTicket.city}, {selectedTicket.province}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Personel IKR */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                      <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Icon name="user-check" size={14} className="text-emerald-500" />
                        Petugas & Penugasan IKR
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mitra IKR:</span>
                          <span className="font-bold text-slate-700 text-right truncate max-w-[160px]" title={selectedTicket.partnerName}>
                            {selectedTicket.partnerName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Lead IKR:</span>
                          <span className="font-bold text-slate-800">{selectedTicket.leadName}</span>
                        </div>
                        {selectedTicket.leadPhone && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Kontak Lead:</span>
                            <a href={`https://wa.me/${selectedTicket.leadPhone}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">
                              {selectedTicket.leadPhone}
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Teknisi Lapangan:</span>
                          <span className="font-bold text-slate-800">{selectedTicket.teknisiName}</span>
                        </div>
                        {selectedTicket.teknisiPhone && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Kontak Teknisi:</span>
                            <a href={`https://wa.me/${selectedTicket.teknisiPhone}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline">
                              {selectedTicket.teknisiPhone}
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-100 pt-1.5">
                          <span className="text-slate-400">PIC Pelapor NOC:</span>
                          <span className="font-medium text-slate-700 text-right truncate max-w-[170px]" title={selectedTicket.picNoc}>
                            {selectedTicket.picNoc}
                          </span>
                        </div>
                        {selectedTicket.canceledByUser && selectedTicket.canceledByUser !== '-' && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Dibatalkan Oleh:</span>
                            <span className="font-medium text-rose-600 text-right truncate max-w-[170px]" title={selectedTicket.canceledByUser}>
                              {selectedTicket.canceledByUser}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SLA Box */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pelacakan Waktu SLA (Batas 12 Jam)</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-800 text-xs">Mulai: {selectedTicket.startTimeFormatted}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800 text-xs">Selesai: {selectedTicket.finishTimeFormatted}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${selectedTicket.isSlaBreached ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        <Icon name={selectedTicket.isSlaBreached ? "alert-circle" : "check"} size={13} />
                        {selectedTicket.isSlaBreached ? `Melebihi SLA (${selectedTicket.durationText})` : `Sesuai SLA (${selectedTicket.durationText})`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VISIT DETAILS */}
              {modalActiveTab === 'visit' && (
                <div className="space-y-4">
                  {selectedTicket.hasVisit ? (
                    <>
                      {/* Status Visit & Koordinat */}
                      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Status Visit Lapangan</span>
                          <span className="text-sm font-black text-slate-800 uppercase">
                            {selectedTicket.visit.status || '-'} ({selectedTicket.visit.last_status || '-'})
                          </span>
                        </div>
                        {selectedTicket.latitude && selectedTicket.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${selectedTicket.latitude},${selectedTicket.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                          >
                            <Icon name="map-pin" size={13} />
                            <span>Buka Google Maps ({selectedTicket.latitude.toFixed(4)}, {selectedTicket.longitude.toFixed(4)})</span>
                          </a>
                        )}
                      </div>

                      {/* Kerusakan & Tindakan */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                          <h4 className="font-bold text-rose-600 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Icon name="alert-triangle" size={14} />
                            Pemeriksaan Kerusakan
                          </h4>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Lokasi Masalah:</span>
                            <span className="font-bold text-slate-800">{selectedTicket.checkDamage?.lokasi_masalah || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Penyebab Masalah:</span>
                            <span className="font-bold text-rose-600">{selectedTicket.checkDamage?.penyebab_masalah || '-'}</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                          <h4 className="font-bold text-emerald-600 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Icon name="check-circle" size={14} />
                            Tindakan Perbaikan
                          </h4>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Resolusi Masalah:</span>
                            <span className="font-bold text-slate-800">{selectedTicket.action?.resolusi_masalah || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Detail Resolusi:</span>
                            <span className="font-medium text-slate-700">{selectedTicket.action?.detail_resolusi_masalah || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Timeline Visit */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waktu Eksekusi Visit</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Mulai:</span>
                            <span className="font-bold">{formatDateTimeWib(selectedTicket.visit.start_at)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Selesai:</span>
                            <span className="font-bold">{formatDateTimeWib(selectedTicket.visit.done_at)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Divalidasi:</span>
                            <span className="font-bold">{formatDateTimeWib(selectedTicket.visit.validate_at)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Icon name="info" size={24} />
                      </div>
                      <p className="font-bold text-sm text-slate-700">Belum ada data visit</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">Tiket ini belum dieksekusi atau belum ada laporan visit lapangan.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PHOTOS */}
              {modalActiveTab === 'photos' && (
                <div className="space-y-4">
                  {selectedTicket.hasVisit ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* OLT / ODC */}
                      <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Kondisi OLT / ODC</span>
                        <div className="bg-slate-200/60 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
                          {selectedTicket.checkOltOdc?.foto_kondisi_olt_odc_url ? (
                            <span className="text-[11px] font-mono text-slate-500 p-2 break-all text-center">
                              {selectedTicket.checkOltOdc.foto_kondisi_olt_odc_url}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada foto</span>
                          )}
                        </div>
                      </div>

                      {/* Lokasi Sebelum */}
                      <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Gangguan Sebelum Perbaikan</span>
                        <div className="bg-slate-200/60 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
                          {selectedTicket.checkDamage?.foto_lokasi_gangguan_sebelum_perbaikan_url ? (
                            <span className="text-[11px] font-mono text-slate-500 p-2 break-all text-center">
                              {selectedTicket.checkDamage.foto_lokasi_gangguan_sebelum_perbaikan_url}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada foto</span>
                          )}
                        </div>
                      </div>

                      {/* OPM Sebelum */}
                      <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. OPM Sebelum Perbaikan</span>
                        <div className="bg-slate-200/60 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
                          {selectedTicket.checkDamage?.foto_opm_sebelum_perbaikan_url ? (
                            <span className="text-[11px] font-mono text-slate-500 p-2 break-all text-center">
                              {selectedTicket.checkDamage.foto_opm_sebelum_perbaikan_url}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada foto</span>
                          )}
                        </div>
                      </div>

                      {/* Sesudah Perbaikan */}
                      <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. Lokasi Sesudah Perbaikan</span>
                        <div className="bg-slate-200/60 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
                          {selectedTicket.action?.foto_lokasi_gangguan_setelah_perbaikan_url ? (
                            <span className="text-[11px] font-mono text-slate-500 p-2 break-all text-center">
                              {selectedTicket.action.foto_lokasi_gangguan_setelah_perbaikan_url}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada foto</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Icon name="image" size={24} />
                      </div>
                      <p className="font-bold text-sm text-slate-700">Belum ada foto dokumentasi</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">Foto akan otomatis tampil setelah teknisi mengunggah dokumentasi visit.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TIMELINE / LOGS */}
              {modalActiveTab === 'timeline' && (
                <div className="space-y-4">
                  {selectedTicket.logs.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {selectedTicket.logs.map((log, idx) => (
                        <div key={log.id || idx} className="relative">
                          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 border-4 border-white text-white flex items-center justify-center shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          </div>
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {formatLogState(log.state)}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {formatDateTimeWib(log.created_at)}
                              </span>
                            </div>

                            {log.notes && (
                              <p className="text-slate-700 font-medium text-xs leading-relaxed whitespace-pre-wrap bg-white/80 p-2.5 rounded-xl border border-slate-100">
                                {log.notes}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium pt-0.5">
                              <Icon name="user-check" size={12} className="text-slate-400 shrink-0" />
                              <span>Dicatat oleh: <strong className="text-slate-700">{formatLogActor(log)}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 py-12">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                        <Icon name="list" size={24} />
                      </div>
                      <p className="font-bold text-sm text-slate-700">Tidak ada riwayat log</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-white border border-slate-200 text-slate-600 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Terhubung ke Partner API Starlite
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyTicket(selectedTicket.id)}
                  className="text-[10.5px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  title={`ID Tiket: ${selectedTicket.id}`}
                >
                  <Icon name={copiedTicketId === selectedTicket.id ? "check" : "copy"} size={11} className={copiedTicketId === selectedTicket.id ? "text-emerald-500" : ""} />
                  <span>{copiedTicketId === selectedTicket.id ? "ID Tersalin!" : "Salin ID Tiket"}</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
