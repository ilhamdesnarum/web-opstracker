import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Search,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Building2,
  Layers,
  Users,
  Target,
  Sparkles,
  ArrowUpDown,
  Zap,
  Info
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { toProperCase } from '../utils';

// Target acuan standar industri FTTH ISP untuk penetrasi jaringan Ready For Sale
export const DEFAULT_TARGET_TAKE_UP_RATE = 40; // 40%

export const TakeUpRateDetailModal = ({
  isOpen,
  onClose,
  dynamicStationData = [],
  stationDataMaps = {},
  totals = {},
  totalRfs = 0
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MODERATE' | 'LOW'
  const [sortBy, setSortBy] = useState('potensi_desc'); // 'potensi_desc' | 'potensi_asc' | 'takeup_desc' | 'takeup_asc' | 'rfs_desc' | 'name'

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Kalkulasi data stasiun lengkap dengan Potensi HC dan Take-Up Rate
  const stationRows = useMemo(() => {
    return (dynamicStationData || []).map((row, idx) => {
      const stName = row.stasiun;
      const stationPoList = stationDataMaps?.poMap?.[stName] || [];
      const poCount = stationPoList.length;

      // Kapasitas RFS stasiun (HP yang sudah Ready For Sale)
      const stationRfs = stationPoList.reduce((acc, po) => acc + Number(po.hp_rfs || po.hpRfs || 0), 0);

      // Total HP Terbangun (Reguler + Percepatan)
      const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
      const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);
      const totalHp = hpReg + hpPerc;

      // Basis acuan perhitungan Take-Up: Prioritaskan HP RFS (Siap Jual)
      const baseHp = stationRfs > 0 ? stationRfs : totalHp;

      // Aktivasi Homeconnect (Total Realisasi)
      const aktReg = row.aktivasiReguler !== undefined ? Number(row.aktivasiReguler) : Number(row.totalAktivasiHc || 0);
      const aktPerc = row.aktivasiPercepatan !== undefined ? Number(row.aktivasiPercepatan) : Number(row.hcAktif || 0);
      const totAkt = row.totalAktivasiHc !== undefined && row.hpPercepatan !== undefined
        ? Number(row.totalAktivasiHc)
        : (aktReg + aktPerc);

      // Pelanggan Aktif saat ini
      const hcAktif = Number(row.hcAktif || 0);

      // Take-Up Rate (%)
      const takeUpRateNum = baseHp > 0 ? (totAkt / baseHp) * 100 : 0;
      const takeUpRateStr = takeUpRateNum.toFixed(2);

      // Active Rate (%)
      const activeRateNum = baseHp > 0 ? (hcAktif / baseHp) * 100 : 0;
      const activeRateStr = activeRateNum.toFixed(2);

      // Akumulasi Potensi HC (Sisa kapasitas HP RFS yang belum teraktivasi / siap dipasarkan)
      const potensiHcVal = Math.max(0, baseHp - totAkt);
      const potensiHcPctNum = baseHp > 0 ? (potensiHcVal / baseHp) * 100 : 0;
      const potensiHcPctStr = potensiHcPctNum.toFixed(2);

      // Potensi HC berbasis pelanggan aktif (termasuk potensi recover suspend/dismantle)
      const potensiHcFromActiveVal = Math.max(0, baseHp - hcAktif);
      const potensiHcFromActivePctStr = baseHp > 0 ? ((potensiHcFromActiveVal / baseHp) * 100).toFixed(2) : "0.00";

      // Target 40% Stasiun
      const targetHcStation = Math.round(baseHp * 0.40);
      const targetGapStation = Math.max(0, targetHcStation - totAkt);

      // Status Klasifikasi
      let health = 'HIGH';
      let healthLabel = 'High Demand';
      let healthColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/90';
      let dotColor = 'bg-emerald-500';

      if (takeUpRateNum < 20) {
        health = 'LOW';
        healthLabel = 'Low Take-Up';
        healthColor = 'bg-rose-50 text-rose-700 border-rose-200/90';
        dotColor = 'bg-rose-500';
      } else if (takeUpRateNum < 35) {
        health = 'MODERATE';
        healthLabel = 'Moderate Growth';
        healthColor = 'bg-amber-50 text-amber-700 border-amber-200/90';
        dotColor = 'bg-amber-500';
      }

      return {
        id: idx + 1,
        stasiun: stName,
        poCount,
        hpReg,
        hpPerc,
        totalHp,
        stationRfs,
        baseHp,
        aktReg,
        aktPerc,
        totAkt,
        hcAktif,
        takeUpRateNum,
        takeUpRateStr,
        activeRateNum,
        activeRateStr,
        potensiHcVal,
        potensiHcPctNum,
        potensiHcPctStr,
        potensiHcFromActiveVal,
        potensiHcFromActivePctStr,
        targetHcStation,
        targetGapStation,
        health,
        healthLabel,
        healthColor,
        dotColor
      };
    });
  }, [dynamicStationData, stationDataMaps]);

  // Filter & Sorting
  const filteredAndSortedRows = useMemo(() => {
    let result = stationRows.filter(row => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || row.stasiun.toLowerCase().includes(q);

      let matchHealth = true;
      if (healthFilter === 'HIGH') matchHealth = row.health === 'HIGH';
      if (healthFilter === 'MODERATE') matchHealth = row.health === 'MODERATE';
      if (healthFilter === 'LOW') matchHealth = row.health === 'LOW';

      return matchSearch && matchHealth;
    });

    result.sort((a, b) => {
      if (sortBy === 'potensi_desc') return b.potensiHcVal - a.potensiHcVal;
      if (sortBy === 'potensi_asc') return a.potensiHcVal - b.potensiHcVal;
      if (sortBy === 'takeup_desc') return b.takeUpRateNum - a.takeUpRateNum;
      if (sortBy === 'takeup_asc') return a.takeUpRateNum - b.takeUpRateNum;
      if (sortBy === 'rfs_desc') return b.stationRfs - a.stationRfs;
      if (sortBy === 'name') return a.stasiun.localeCompare(b.stasiun);
      return 0;
    });

    return result;
  }, [stationRows, searchTerm, healthFilter, sortBy]);

  // Akumulasi Global
  const globalSummary = useMemo(() => {
    const totalRfsCapacity = totalRfs > 0 ? totalRfs : (totals.hpTerbangun || 0);
    const totalAktivasi = Number(totals.totalAktivasiHc || 0);
    const totalAktif = Number(totals.hcAktif || 0);

    const takeUpRateNum = totalRfsCapacity > 0 ? (totalAktivasi / totalRfsCapacity) * 100 : 0;
    const takeUpRateStr = takeUpRateNum.toFixed(2);

    const activeRateNum = totalRfsCapacity > 0 ? (totalAktif / totalRfsCapacity) * 100 : 0;
    const activeRateStr = activeRateNum.toFixed(2);

    // Akumulasi Potensi HC Global Siap Jual
    const totalPotensiHc = Math.max(0, totalRfsCapacity - totalAktivasi);
    const potensiHcPctNum = totalRfsCapacity > 0 ? (totalPotensiHc / totalRfsCapacity) * 100 : 0;
    const potensiHcPctStr = potensiHcPctNum.toFixed(2);

    // Target 40% Analysis
    const targetHcGlobal = Math.round(totalRfsCapacity * (DEFAULT_TARGET_TAKE_UP_RATE / 100));
    const targetShortfall = Math.max(0, targetHcGlobal - totalAktivasi);
    const targetAchievementPct = ((takeUpRateNum / DEFAULT_TARGET_TAKE_UP_RATE) * 100).toFixed(1);

    return {
      totalRfsCapacity,
      totalAktivasi,
      totalAktif,
      takeUpRateNum,
      takeUpRateStr,
      activeRateNum,
      activeRateStr,
      totalPotensiHc,
      potensiHcPctNum,
      potensiHcPctStr,
      targetHcGlobal,
      targetShortfall,
      targetAchievementPct
    };
  }, [totalRfs, totals]);

  // Export Excel Laporan Potensi HC
  const handleExportExcel = () => {
    try {
      const headerRow = [
        'NO',
        'NAMA STASIUN',
        'JUMLAH PO',
        'HP REGULER',
        'HP PERCEPATAN',
        'TOTAL HP TERBANGUN',
        'TOTAL HP RFS (SIAP JUAL)',
        'REALISASI AKTIVASI HC',
        'PELANGGAN AKTIF',
        'TAKE-UP RATE (%)',
        'STATUS DEMAND',
        'AKUMULASI POTENSI HC (HP)',
        'POTENSI HC (%)',
        'TARGET 40% (HC)',
        'KEKURANGAN TARGET 40% (HC)'
      ];

      const dataRows = filteredAndSortedRows.map((r, i) => [
        i + 1,
        toProperCase(r.stasiun),
        r.poCount,
        r.hpReg,
        r.hpPerc,
        r.totalHp,
        r.stationRfs,
        r.totAkt,
        r.hcAktif,
        Number(r.takeUpRateStr),
        r.healthLabel,
        r.potensiHcVal,
        Number(r.potensiHcPctStr),
        r.targetHcStation,
        r.targetGapStation
      ]);

      // Total Row
      const totalRow = [
        'TOTAL',
        '11 STASIUN',
        filteredAndSortedRows.reduce((acc, r) => acc + r.poCount, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.hpReg, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.hpPerc, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.totalHp, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.stationRfs, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.totAkt, 0),
        filteredAndSortedRows.reduce((acc, r) => acc + r.hcAktif, 0),
        Number(globalSummary.takeUpRateStr),
        globalSummary.takeUpRateNum >= 35 ? 'High Demand' : globalSummary.takeUpRateNum >= 20 ? 'Moderate Growth' : 'Low Take-Up',
        globalSummary.totalPotensiHc,
        Number(globalSummary.potensiHcPctStr),
        globalSummary.targetHcGlobal,
        globalSummary.targetShortfall
      ];

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow]);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 24 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 26 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rincian Take-Up & Potensi HC');
      XLSX.writeFile(wb, `Laporan_TakeUp_Rate_dan_Potensi_HC_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Gagal export excel potensi HC:', err);
      alert('Gagal mengekspor laporan ke Excel.');
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-5">
      {/* Backdrop Blur */}
      <div
        className="absolute inset-0 bg-slate-950/75 animate-fade"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative z-10 flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 animate-modal">

        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
              <TrendingUp size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate">
                  Rincian Take-Up Rate & Akumulasi Potensi Homeconnect (HC)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {dynamicStationData.length} Stasiun • {globalSummary.totalRfsCapacity.toLocaleString('id-ID')} HP RFS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Tingkat penetrasi aktivasi dan akumulasi kapasitas Homepass Ready For Sale (RFS) yang siap dipasarkan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer shrink-0 ml-2"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 KPI SUMMARY CARDS BANNER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0">
          {/* Card 1: Realisasi Take-Up Rate */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-emerald-600" /> Take-Up Rate
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                Realisasi
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {globalSummary.takeUpRateStr}%
                </span>
                <span className="text-xs font-bold text-slate-400">dari HP RFS</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                <strong className="text-slate-800 font-bold">{globalSummary.totalAktivasi.toLocaleString('id-ID')}</strong> dari {globalSummary.totalRfsCapacity.toLocaleString('id-ID')} HP RFS
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/60 mt-1 font-semibold text-slate-500">
              <span>Reg: <strong className="text-blue-700">{totals.performaReguler || 0}%</strong></span>
              <span>Perc: <strong className="text-purple-700">{totals.performaPercepatan || 0}%</strong></span>
            </div>
          </div>

          {/* Card 2: Target Penetrasi 40% */}
          <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <Target size={13} className="text-blue-600" /> Target Penetrasi
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">
                {DEFAULT_TARGET_TAKE_UP_RATE}% Target
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-700 tracking-tight">
                  {globalSummary.targetHcGlobal.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-blue-600/70">HC</span>
              </div>
              <p className="text-[11px] text-blue-900/80 font-medium mt-0.5">
                Tercapai <strong className="font-bold text-blue-900">{globalSummary.targetAchievementPct}%</strong> dari target
              </p>
            </div>
            {/* Progress Bar Target */}
            <div className="pt-1.5 border-t border-blue-200/60 mt-1">
              <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Number(globalSummary.targetAchievementPct), 100)}%` }}
                />
              </div>
              <div className="text-[10px] font-semibold text-blue-700 flex justify-between">
                <span>Kurang: <strong>{globalSummary.targetShortfall.toLocaleString('id-ID')} HC lagi</strong></span>
              </div>
            </div>
          </div>

          {/* Card 3: AKUMULASI POTENSI HC (HIGHLIGHT UTAMA) */}
          <div className="p-3.5 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Zap size={13} className="text-emerald-700" /> Akumulasi Potensi HC
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-600 text-white rounded shadow-2xs">
                Siap Jual
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-800 tracking-tight">
                  {globalSummary.totalPotensiHc.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-black text-emerald-700">HP</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-200/70 px-1.5 py-0.2 rounded-md ml-1">
                  {globalSummary.potensiHcPctStr}%
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 font-medium mt-0.5">
                Kapasitas RFS aktif yang belum teraktivasi
              </p>
            </div>
            <div className="pt-1.5 border-t border-emerald-200/80 mt-1 text-[10px] text-emerald-900 flex items-center justify-between font-semibold">
              <span>Peluang HC Baru: <strong className="font-extrabold text-emerald-950">{globalSummary.potensiHcPctStr}%</strong></span>
              <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Tanpa Bangun ODP</span>
            </div>
          </div>

          {/* Card 4: Pelanggan Aktif Terpasang */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" /> Pelanggan Aktif
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                {globalSummary.activeRateStr}%
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 tracking-tight">
                  {globalSummary.totalAktif.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-slate-400">HC Aktif</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Pelanggan status AKTIF di database
              </p>
            </div>
            <div className="pt-1.5 border-t border-slate-200/60 mt-1 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Non-Aktif: <strong className="text-slate-700">{Math.max(0, globalSummary.totalAktivasi - globalSummary.totalAktif).toLocaleString('id-ID')}</strong></span>
              <span>Sus / Dism: <strong className="text-rose-600">{(totals.suspend || 0) + (totals.readyDismantle || 0) + (totals.dismantled || 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, FILTER DEMAND, SORT & EXPORT */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama stasiun..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Demand Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setHealthFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                healthFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Semua ({stationRows.length})
            </button>
            <button
              onClick={() => setHealthFilter('HIGH')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                healthFilter === 'HIGH'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              High Demand (≥35%)
            </button>
            <button
              onClick={() => setHealthFilter('MODERATE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                healthFilter === 'MODERATE'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Moderate (20-35%)
            </button>
            <button
              onClick={() => setHealthFilter('LOW')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                healthFilter === 'LOW'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Low Take-Up (&lt;20%)
            </button>
          </div>

          {/* Sort & Export Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
              <ArrowUpDown size={12} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="potensi_desc">Potensi HC: Tertinggi</option>
                <option value="potensi_asc">Potensi HC: Terendah</option>
                <option value="takeup_desc">Take-Up: Tertinggi</option>
                <option value="takeup_asc">Take-Up: Terendah</option>
                <option value="rfs_desc">Kapasitas RFS: Terbesar</option>
                <option value="name">Nama Stasiun (A-Z)</option>
              </select>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0"
              title="Unduh laporan ini ke file Excel (.xlsx)"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* TABEL DETAIL SEBARAN POTENSI HC PER STASIUN */}
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[46vh]">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[850px]">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="px-3.5 py-3 text-center w-10">NO</th>
                <th className="px-3.5 py-3">STASIUN & PO</th>
                <th className="px-3.5 py-3 text-right">KAPASITAS RFS</th>
                <th className="px-3.5 py-3 text-right">REALISASI HC</th>
                <th className="px-3.5 py-3 text-center">TAKE-UP RATE</th>
                <th className="px-3.5 py-3 text-center">STATUS</th>
                <th className="px-3.5 py-3 text-right bg-emerald-50/70 border-l border-emerald-100 text-emerald-900 font-black">
                  AKUMULASI POTENSI HC
                </th>
                <th className="px-3.5 py-3 text-center w-40">VISUAL PROPORSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    <p className="font-medium">Tidak ada data stasiun yang sesuai dengan filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => (
                  <tr key={row.stasiun} className="hover:bg-slate-50/80 transition-colors group">
                    {/* NO */}
                    <td className="px-3.5 py-2.5 text-center text-slate-400 font-bold text-[11px]">
                      {idx + 1}
                    </td>

                    {/* STASIUN */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-xs">
                          {toProperCase(row.stasiun)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          {row.poCount} PO
                        </span>
                      </div>
                    </td>

                    {/* KAPASITAS RFS */}
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                      <span>{row.stationRfs.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">RFS</span>
                    </td>

                    {/* REALISASI HC */}
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">
                      <span>{row.totAkt.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({row.hcAktif.toLocaleString('id-ID')} Aktif)
                      </span>
                    </td>

                    {/* TAKE-UP RATE */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="font-black text-slate-800 text-xs">
                        {row.takeUpRateStr}%
                      </span>
                    </td>

                    {/* STATUS BADGE */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${row.healthColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.dotColor}`}></span>
                        {row.healthLabel}
                      </span>
                    </td>

                    {/* AKUMULASI POTENSI HC (HIGHLIGHT) */}
                    <td className="px-3.5 py-2.5 text-right bg-emerald-50/40 border-l border-emerald-100">
                      <div className="flex items-baseline justify-end gap-1.5">
                        <span className="font-black text-emerald-800 text-sm">
                          {row.potensiHcVal.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">HP</span>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {row.potensiHcPctStr}%
                        </span>
                      </div>
                    </td>

                    {/* VISUAL PROPORSI (BAR) */}
                    <td className="px-3.5 py-2.5">
                      <div className="w-full">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          {/* Teraktivasi */}
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${Math.min(row.takeUpRateNum, 100)}%` }}
                            title={`Teraktivasi: ${row.totAkt} HC (${row.takeUpRateStr}%)`}
                          />
                          {/* Sisa Potensi HC */}
                          <div
                            className="h-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.min(row.potensiHcPctNum, 100 - Math.min(row.takeUpRateNum, 100))}%` }}
                            title={`Potensi Siap Jual: ${row.potensiHcVal} HP (${row.potensiHcPctStr}%)`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-semibold mt-0.5">
                          <span className="text-blue-600">{row.takeUpRateStr}% HC</span>
                          <span className="text-emerald-700">{row.potensiHcPctStr}% Sisa</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* TOTAL FOOTER ROW */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold sticky bottom-0 z-10 text-[11px]">
              <tr>
                <td className="px-3.5 py-2.5 text-center font-black text-slate-700">∑</td>
                <td className="px-3.5 py-2.5 font-black text-slate-900">
                  TOTAL AKUMULASI ({filteredAndSortedRows.length} STASIUN)
                </td>
                <td className="px-3.5 py-2.5 text-right font-black text-slate-900">
                  {filteredAndSortedRows.reduce((acc, r) => acc + r.stationRfs, 0).toLocaleString('id-ID')} RFS
                </td>
                <td className="px-3.5 py-2.5 text-right font-black text-slate-900">
                  {filteredAndSortedRows.reduce((acc, r) => acc + r.totAkt, 0).toLocaleString('id-ID')} HC
                </td>
                <td className="px-3.5 py-2.5 text-center font-black text-blue-700 text-xs">
                  {globalSummary.takeUpRateStr}%
                </td>
                <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">
                  Rata-rata
                </td>
                <td className="px-3.5 py-2.5 text-right bg-emerald-100/80 border-l border-emerald-200 font-black text-emerald-950 text-xs sm:text-sm">
                  {globalSummary.totalPotensiHc.toLocaleString('id-ID')} HP ({globalSummary.potensiHcPctStr}%)
                </td>
                <td className="px-3.5 py-2.5 text-center text-[10px] text-slate-500 font-semibold">
                  {globalSummary.takeUpRateStr}% Akt / {globalSummary.potensiHcPctStr}% Potensi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* MODAL FOOTER & BUSINESS INSIGHT BOX */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <Info size={15} className="text-emerald-600 shrink-0" />
            <span className="leading-tight text-[11px] text-slate-600">
              <strong>Penjelasan Bisnis:</strong> Target <strong>{DEFAULT_TARGET_TAKE_UP_RATE}%</strong> adalah tolok ukur standar industri FTTH. Akumulasi <strong>{globalSummary.totalPotensiHc.toLocaleString('id-ID')} HP ({globalSummary.potensiHcPctStr}%)</strong> merupakan port RFS yang siap dipasarkan secara agresif tanpa modal pembangunan baru.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors shadow-xs cursor-pointer shrink-0 self-end sm:self-auto"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
