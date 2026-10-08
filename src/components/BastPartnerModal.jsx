import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { standardizeDate } from '../utils.js';

function extractJam(str) {
  if (!str) return '-';
  const s = String(str).trim();
  const timeMatch = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (timeMatch) return timeMatch[0];
  if (s.includes('T')) return s.split('T')[1].substring(0, 5);
  if (s.includes(' ')) return s.split(' ')[1].substring(0, 5);
  return '-';
}

export default function BastPartnerModal({
  isOpen,
  onClose,
  bastData = [],
  pelangganData = [],
  selectedDate = '',
  formattedDate = '',
  isLoading = false,
  isLive = true,
  lastSync = null,
  onRefresh = null,
  initialFilterStatus = 'ALL'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus || 'ALL');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFilterStatus(initialFilterStatus || 'ALL');
      setSearchTerm('');
      setSelectedStation('ALL');
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, initialFilterStatus]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Rekonsiliasi 2 Arah: BAST Web Partner vs Report Petugas Lapangan
  const comparison = useMemo(() => {
    const fieldMap = new Map();
    (pelangganData || []).forEach(p => {
      const pAkt = String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').trim().toLowerCase();
      const isAktif = pAkt.includes('sudah') || pAkt === 'aktif';
      const tAkt = standardizeDate(p.tglAktivasi || p.timestampAktivasi);

      if (tAkt === selectedDate && isAktif) {
        const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
        if (id) {
          fieldMap.set(id, {
            ...p,
            idPelanggan: id,
            namaPelanggan: p.namaPelanggan || p.nama_pelanggan || p.nama || 'Tanpa Nama',
            stasiun: p.stasiun || 'Tanpa Stasiun',
            petugas: p.petugasAktivasi || p.petugas_aktivasi || p.petugasIkr || p.petugas_ikr || p.petugas || 'Petugas Lapangan',
            jam: extractJam(p.tglAktivasi || p.timestampAktivasi)
          });
        }
      }
    });

    const bastIdSet = new Set();
    const bastMergedList = (bastData || []).map((b) => {
      const idUpper = String(b.idPelanggan || '').trim().toUpperCase();
      if (idUpper) bastIdSet.add(idUpper);
      const fieldMatch = fieldMap.get(idUpper) || null;
      return {
        ...b,
        idPelanggan: idUpper,
        namaPelanggan: b.namaPelanggan || (fieldMatch ? fieldMatch.namaPelanggan : 'Tanpa Nama'),
        stasiun: b.stasiun || (fieldMatch ? fieldMatch.stasiun : 'Tanpa Stasiun'),
        isBast: true,
        isReported: Boolean(fieldMatch),
        petugasLapangan: fieldMatch ? fieldMatch.petugas : null,
        jamReportLapangan: fieldMatch ? fieldMatch.jam : null,
        jamBast: b.jam || '-',
        category: fieldMatch ? 'MATCHED' : 'UNREPORTED'
      };
    });

    // Pelanggan di Report Petugas yang BELUM ada di BAST Web Partner
    const unbastList = [];
    fieldMap.forEach((fieldItem, idUpper) => {
      if (!bastIdSet.has(idUpper)) {
        unbastList.push({
          idPelanggan: idUpper,
          namaPelanggan: fieldItem.namaPelanggan,
          stasiun: fieldItem.stasiun,
          jam: fieldItem.jam,
          jamBast: '-',
          jamReportLapangan: fieldItem.jam,
          petugasLapangan: fieldItem.petugas,
          isBast: false,
          isReported: true,
          category: 'UNBAST'
        });
      }
    });

    // Gabungkan list: seluruh BAST + seluruh UNBAST
    const allReconciledList = [...bastMergedList, ...unbastList].map((item, idx) => ({
      ...item,
      index: idx + 1
    }));

    const totalBast = bastMergedList.length;
    const fieldTotal = fieldMap.size;
    const reportedCount = bastMergedList.filter(item => item.isReported).length;
    const unreportedCount = bastMergedList.filter(item => !item.isReported).length;
    const unbastCount = unbastList.length;
    const totalAll = allReconciledList.length;

    return {
      allReconciledList,
      bastMergedList,
      unbastList,
      totalBast,
      fieldTotal,
      reportedCount,
      unreportedCount,
      unbastCount,
      totalAll
    };
  }, [bastData, pelangganData, selectedDate]);

  // Unique station list across all reconciled items
  const stations = useMemo(() => {
    const set = new Set();
    comparison.allReconciledList.forEach(item => {
      if (item.stasiun) set.add(item.stasiun);
    });
    return Array.from(set).sort();
  }, [comparison.allReconciledList]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return comparison.allReconciledList.filter(item => {
      if (selectedStation !== 'ALL' && item.stasiun !== selectedStation) return false;
      if (filterStatus === 'MATCHED' && item.category !== 'MATCHED') return false;
      if (filterStatus === 'UNREPORTED' && item.category !== 'UNREPORTED') return false;
      if (filterStatus === 'UNBAST' && item.category !== 'UNBAST') return false;
      if (filterStatus === 'ALL_BAST' && !item.isBast) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const id = String(item.idPelanggan || '').toLowerCase();
        const nama = String(item.namaPelanggan || '').toLowerCase();
        const st = String(item.stasiun || '').toLowerCase();
        const pet = String(item.petugasLapangan || '').toLowerCase();
        return id.includes(term) || nama.includes(term) || st.includes(term) || pet.includes(term);
      }
      return true;
    });
  }, [comparison.allReconciledList, selectedStation, filterStatus, searchTerm]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl h-[92vh] sm:h-[88vh] max-h-[820px] flex flex-col overflow-hidden relative z-10 animate-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 font-black text-xs sm:text-sm">
              BAST
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 leading-tight">
                  BAST Aktivasi Web Partner
                </h2>
                {isLive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Partner API
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Histori DB
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                Rekonsiliasi BAST Web Partner vs Report Petugas pada <span className="font-semibold text-slate-700">{formattedDate || selectedDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs hover:border-slate-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Tarik data BAST terbaru dari API Web Partner"
              >
                <span className={`${isLoading ? 'animate-spin' : ''}`}>🔄</span>
                <span>{isLoading ? 'Menarik...' : 'Refresh API'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="p-3 sm:p-5 bg-slate-50/70 border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Card 1: BAST Partner */}
            <div 
              onClick={() => setFilterStatus('ALL_BAST')}
              className="bg-white p-2.5 sm:p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/20 transition-all active:scale-[0.98]"
              title="Klik untuk memfilter seluruh data BAST Web Partner"
            >
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5 truncate">
                  BAST Partner
                </span>
                <div className="flex items-baseline gap-1 sm:gap-1.5">
                  <span className="text-lg sm:text-2xl font-black text-emerald-950 font-mono">
                    {comparison.totalBast}
                  </span>
                  <span className="text-[9px] sm:text-xs text-slate-400 font-medium hidden sm:inline">Pelanggan</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm sm:text-base font-bold shrink-0">
                ✓
              </div>
            </div>

            {/* Card 2: Laporan Lapangan */}
            <div 
              onClick={() => setFilterStatus('MATCHED')}
              className="bg-white p-2.5 sm:p-4 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all active:scale-[0.98]"
              title="Klik untuk memfilter laporan petugas lapangan"
            >
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5 truncate">
                  Report Petugas
                </span>
                <div className="flex items-baseline gap-1 sm:gap-1.5">
                  <span className="text-lg sm:text-2xl font-black text-blue-950 font-mono">
                    {comparison.fieldTotal}
                  </span>
                  <span className="text-[9px] sm:text-xs text-slate-400 font-medium hidden sm:inline">Aktivasi</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm sm:text-base font-bold shrink-0">
                📋
              </div>
            </div>

            {/* Card 3: Selisih Status Rekonsiliasi */}
            <div 
              onClick={() => {
                if (comparison.unbastCount > 0) setFilterStatus('UNBAST');
                else if (comparison.unreportedCount > 0) setFilterStatus('UNREPORTED');
                else setFilterStatus('ALL');
              }}
              className={`p-2.5 sm:p-4 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                comparison.unbastCount === 0 && comparison.unreportedCount === 0
                  ? 'bg-emerald-500/10 border-emerald-200 text-emerald-900 hover:border-emerald-300'
                  : comparison.unbastCount > 0 && comparison.unreportedCount === 0
                    ? 'bg-amber-500/15 border-amber-300 text-amber-950 ring-1 ring-amber-400/40 hover:bg-amber-500/20'
                    : 'bg-rose-500/15 border-rose-300 text-rose-950 ring-1 ring-rose-400/40 hover:bg-rose-500/20'
              }`}
              title="Klik untuk memfilter pelanggan dengan status selisih"
            >
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block mb-0.5 opacity-80 truncate">
                  Status
                </span>
                <div className="flex items-baseline gap-1 sm:gap-1.5">
                  <span className="text-lg sm:text-2xl font-black font-mono">
                    {comparison.unbastCount === 0 && comparison.unreportedCount === 0
                      ? '0'
                      : comparison.unbastCount > 0 && comparison.unreportedCount === 0
                        ? comparison.unbastCount
                        : comparison.unreportedCount > 0 && comparison.unbastCount === 0
                          ? comparison.unreportedCount
                          : comparison.unbastCount + comparison.unreportedCount}
                  </span>
                  <span className="text-[9px] sm:text-xs font-semibold truncate">
                    {comparison.unbastCount === 0 && comparison.unreportedCount === 0
                      ? 'Sinkron'
                      : comparison.unbastCount > 0 && comparison.unreportedCount === 0
                        ? 'Belum BAST'
                        : comparison.unreportedCount > 0 && comparison.unbastCount === 0
                          ? 'Belum Lapor'
                          : 'Ada Selisih'}
                  </span>
                </div>
              </div>
              <div className="text-sm sm:text-lg shrink-0">
                {comparison.unbastCount === 0 && comparison.unreportedCount === 0
                  ? '🎉'
                  : comparison.unbastCount > 0
                    ? '⏳'
                    : '⚠️'}
              </div>
            </div>
          </div>

          {/* Alert Banner 1: Pelanggan Sudah Lapor tapi Belum di-BAST */}
          {comparison.unbastCount > 0 && (
            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-fade">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">⏳</span>
                <div>
                  <span className="font-bold text-slate-800">
                    Terdapat {comparison.unbastCount} pelanggan dilaporkan aktif oleh petugas
                  </span>
                  <span className="text-slate-600 block sm:inline sm:ml-1">
                    namun belum terbit BAST di Web Partner hari ini.
                  </span>
                </div>
              </div>
              {filterStatus !== 'UNBAST' && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('UNBAST')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shrink-0 transition-all shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <span>Filter Belum BAST ({comparison.unbastCount})</span>
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {/* Alert Banner 2: Pelanggan BAST yang Belum Dilaporkan Petugas */}
          {comparison.unreportedCount > 0 && (
            <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-orange-500/10 to-rose-500/15 border border-rose-300 text-rose-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-fade">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0">⚠️</span>
                <div>
                  <span className="font-bold text-slate-800">
                    Terdapat {comparison.unreportedCount} pelanggan BAST Web Partner
                  </span>
                  <span className="text-slate-600 block sm:inline sm:ml-1">
                    yang belum dilaporkan oleh petugas lapangan hari ini.
                  </span>
                </div>
              </div>
              {filterStatus !== 'UNREPORTED' && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('UNREPORTED')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shrink-0 transition-all shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <span>Filter Belum Lapor ({comparison.unreportedCount})</span>
                  <span>→</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 sm:px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-white shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Filter Pill: Semua */}
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({comparison.totalAll})
            </button>

            {/* Filter Pill: Sudah Sinkron */}
            <button
              type="button"
              onClick={() => setFilterStatus('MATCHED')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'MATCHED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              Sudah Sinkron ({comparison.reportedCount})
            </button>

            {/* Filter Pill: Belum BAST Partner (Highlight saat ada data) */}
            <button
              type="button"
              onClick={() => setFilterStatus('UNBAST')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'UNBAST'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                  : comparison.unbastCount > 0
                    ? 'bg-amber-100/90 text-amber-900 border border-amber-300 hover:bg-amber-200/70 font-black'
                    : 'bg-slate-100 text-slate-400 border border-slate-200/60'
              }`}
            >
              {comparison.unbastCount > 0 && <span>⏳</span>}
              <span>Belum BAST ({comparison.unbastCount})</span>
            </button>

            {/* Filter Pill: Belum Lapor Lapangan */}
            <button
              type="button"
              onClick={() => setFilterStatus('UNREPORTED')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === 'UNREPORTED'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/30'
                  : comparison.unreportedCount > 0
                    ? 'bg-rose-100/90 text-rose-900 border border-rose-300 hover:bg-rose-200/70 font-black'
                    : 'bg-slate-100 text-slate-400 border border-slate-200/60'
              }`}
            >
              {comparison.unreportedCount > 0 && <span>⚠️</span>}
              <span>Belum Lapor ({comparison.unreportedCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Stasiun */}
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="ALL">Semua Stasiun ({stations.length})</option>
              {stations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-52">
              <input
                type="text"
                placeholder="Cari ID, Nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>
        </div>

        {/* Content Table / Card Container (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 custom-scrollbar bg-slate-50/30">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-semibold text-slate-500">Menghubungkan ke API Partner Starlite...</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <span className="text-3xl block mb-2">
                {filterStatus === 'UNBAST' || filterStatus === 'UNREPORTED' ? '🎉' : '📭'}
              </span>
              <p className="text-sm font-semibold text-slate-600">
                {filterStatus === 'UNBAST'
                  ? 'Semua laporan petugas sudah terbit BAST di Web Partner'
                  : filterStatus === 'UNREPORTED'
                    ? 'Semua BAST Web Partner sudah dilaporkan oleh petugas lapangan'
                    : 'Tidak ada data ditemukan'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {filterStatus === 'UNBAST' || filterStatus === 'UNREPORTED'
                  ? 'Tidak ada selisih data pada kategori ini.'
                  : 'Coba sesuaikan filter pencarian atau tanggal.'}
              </p>
            </div>
          ) : (
            <>
              {/* TAMPILAN MOBILE: KARTU LIST */}
              <div className="sm:hidden space-y-2.5">
                {filteredRows.map((row, idx) => {
                  const isUnbast = row.category === 'UNBAST';
                  const isUnreported = row.category === 'UNREPORTED';

                  return (
                    <div 
                      key={row.idPelanggan || idx} 
                      className={`p-3 rounded-xl border shadow-xs space-y-2 ${
                        isUnbast
                          ? 'bg-amber-50/50 border-amber-200'
                          : isUnreported
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              isUnbast 
                                ? 'bg-amber-100 border border-amber-300 text-amber-900' 
                                : 'bg-slate-100 border border-slate-200 text-slate-800'
                            }`}>
                              {row.idPelanggan}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {row.stasiun}
                            </span>
                            {isUnbast && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-amber-200/70 text-amber-800">
                                Report Saja
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 mt-1 truncate">
                            {row.namaPelanggan}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono text-slate-500 font-bold block">
                            {isUnbast ? (row.jamReportLapangan || row.jam || '-') : (row.jamBast || row.jam || '-')}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {isUnbast ? 'Lapor Petugas' : 'BAST'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        {isUnbast ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                              <span>⏳</span>
                              <span>Belum BAST Partner</span>
                            </span>
                            <span className="text-slate-600 font-medium">
                              Oleh: <strong>{row.petugasLapangan}</strong>
                            </span>
                          </div>
                        ) : isUnreported ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold border border-rose-200">
                            <span>⚠️</span>
                            <span>Belum Lapor Lapangan</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              <span className="text-emerald-500 font-black">✓</span>
                              <span>{row.petugasLapangan}</span>
                            </span>
                            {row.jamReportLapangan && (
                              <span className="text-slate-400 text-[9px]">Lapor: {row.jamReportLapangan}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TAMPILAN DESKTOP: TABEL */}
              <div className="hidden sm:block border border-slate-200/90 rounded-xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3.5 text-center w-12">No</th>
                      <th className="py-3 px-3.5">ID Pelanggan</th>
                      <th className="py-3 px-3.5">Nama Pelanggan</th>
                      <th className="py-3 px-3.5">Stasiun</th>
                      <th className="py-3 px-3.5 text-center">Waktu</th>
                      <th className="py-3 px-3.5">Status Rekonsiliasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRows.map((row, idx) => {
                      const isUnbast = row.category === 'UNBAST';
                      const isUnreported = row.category === 'UNREPORTED';

                      return (
                        <tr 
                          key={row.idPelanggan || idx} 
                          className={`transition-colors ${
                            isUnbast 
                              ? 'bg-amber-50/40 hover:bg-amber-50/80' 
                              : isUnreported 
                                ? 'bg-rose-50/30 hover:bg-rose-50/70' 
                                : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold font-mono">
                            <span className={`px-2 py-0.5 rounded border ${
                              isUnbast 
                                ? 'bg-amber-100/80 border-amber-300 text-amber-950 font-bold' 
                                : isUnreported 
                                  ? 'bg-rose-100/70 border-rose-200 text-rose-950' 
                                  : 'bg-slate-100 border-slate-200/70 text-slate-800'
                            }`}>
                              {row.idPelanggan}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span>{row.namaPelanggan}</span>
                              {isUnbast && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200/80 text-amber-800 border border-amber-300">
                                  Report Saja
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {row.stasiun}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {isUnbast ? (
                              <div>
                                <span className="font-mono text-amber-800 text-[11px] font-bold">
                                  {row.jamReportLapangan || row.jam || '-'}
                                </span>
                                <span className="block text-[8.5px] text-amber-600 font-medium">Lapor Petugas</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-mono text-slate-600 text-[11px]">
                                  {row.jamBast || row.jam || '-'}
                                </span>
                                <span className="block text-[8.5px] text-slate-400">BAST Partner</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            {isUnbast ? (
                              <div className="flex flex-col gap-0.5 items-start">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-300 text-[11px] font-bold shadow-2xs">
                                  <span className="text-amber-600">⏳</span>
                                  <span>Belum BAST di Web Partner</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  Dilaporkan oleh <strong className="text-slate-800">{row.petugasLapangan}</strong>
                                </span>
                              </div>
                            ) : isUnreported ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                                <span>⚠️</span>
                                <span>Belum Ada Laporan Petugas</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 items-start">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                  <span className="text-emerald-500 font-black">✓</span>
                                  <span>Dilaporkan {row.petugasLapangan}</span>
                                </div>
                                {row.jamReportLapangan && (
                                  <span className="text-[9.5px] text-slate-400 ml-1">
                                    Lapor jam {row.jamReportLapangan}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>ℹ️</span>
            <span>
              Menampilkan <span className="font-bold text-slate-700">{filteredRows.length}</span> dari{' '}
              <span className="font-bold text-slate-700">{comparison.totalAll}</span> total pelanggan{' '}
              <span className="text-slate-400">({comparison.totalBast} BAST, {comparison.fieldTotal} Report Petugas)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
