import React, { useState, useMemo } from 'react';
import {
  Layers,
  TrendingUp,
  Users,
  Zap,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  ExternalLink,
  Edit3,
  Sparkles,
  ArrowUpRight,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toProperCase } from '../utils';
import { matchCustomerToPo } from './PoReleaseModal';
import { CustomerStatusDrilldownModal } from './CustomerStatusDrilldownModal';
import { ManagePoFormModal } from './ManagePoFormModal';

export const ExecutiveRolloutTracker = ({
  dynamicStationData = [],
  totals = {},
  detailPoData = [],
  pelangganData = [],
  odpData = [],
  onRefresh,
  onOpenStationModal,
  formattedDate = ''
}) => {
  // --- STATE ---
  const [expandedStations, setExpandedStations] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MODERATE' | 'LOW'

  // Drill-down Modal State
  const [drilldownStatus, setDrilldownStatus] = useState(null);
  const [drilldownStationName, setDrilldownStationName] = useState('');
  const [drilldownCustomers, setDrilldownCustomers] = useState([]);

  // Manage PO Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageStation, setManageStation] = useState('');
  const [poToEdit, setPoToEdit] = useState(null);

  // Toggle Accordion
  const toggleStation = (stName) => {
    setExpandedStations(prev => ({
      ...prev,
      [stName]: !prev[stName]
    }));
  };

  const expandAll = () => {
    const all = {};
    dynamicStationData.forEach(st => {
      all[st.stasiun] = true;
    });
    setExpandedStations(all);
  };

  const collapseAll = () => {
    setExpandedStations({});
  };

  // --- GLOBAL CUSTOMER HEALTH CALCULATIONS ---
  const customerHealthTotals = useMemo(() => {
    let aktif = 0;
    let suspend = 0;
    let ready = 0;
    let dismantled = 0;

    (pelangganData || []).forEach(p => {
      const akt = String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').trim().toUpperCase();
      const ikr = String(p.status_ikr || p.ikr || p.statusIkr || '').trim().toUpperCase();

      if (akt === 'SUSPEND') {
        suspend++;
      } else if (akt === 'READY TO DISMANTLE' || akt.includes('READY')) {
        ready++;
      } else if (akt === 'DISMANTLED' || akt === 'DISMANTLE') {
        dismantled++;
      } else if (akt === 'AKTIF' || akt === 'SUDAH' || ikr === 'SUDAH') {
        aktif++;
      }
    });

    // Fallback jika pelangganData belum selesai sinkron di browser
    if (suspend === 0 && ready === 0 && (detailPoData || []).length > 0) {
      detailPoData.forEach(po => {
        suspend += Number(po.suspend || 0);
        ready += Number(po.readyToDismantle || po.readyDismantle || 0);
        dismantled += Number(po.dismantled || 0);
      });
    }

    return { aktif, suspend, ready, dismantled };
  }, [pelangganData, detailPoData]);

  // --- PRE-COMPUTE STATION DATA (Mencegah Lagging saat Render) ---
  const stationDataMaps = useMemo(() => {
    const poMap = {};
    const custMap = {};

    (dynamicStationData || []).forEach(row => {
      const stName = row.stasiun;
      let targetSt = String(stName).toLowerCase().trim();
      if (targetSt === 'tawang') targetSt = 'semarang tawang';

      poMap[stName] = (detailPoData || []).filter(po => {
        let poSt = String(po.stasiun || '').toLowerCase().trim();
        if (poSt === 'tawang') poSt = 'semarang tawang';
        return poSt === targetSt || poSt.includes(targetSt) || targetSt.includes(poSt);
      });

      custMap[stName] = (pelangganData || []).filter(c => {
        let cSt = String(c.stasiun || '').toLowerCase().trim();
        if (cSt === 'tawang') cSt = 'semarang tawang';
        return cSt === targetSt || cSt.includes(targetSt) || targetSt.includes(cSt);
      });
    });

    return { poMap, custMap };
  }, [dynamicStationData, detailPoData, pelangganData]);

  // Kalkulasi Total HP RFS global
  const totalRfs = useMemo(() => {
    return (detailPoData || []).reduce((acc, po) => acc + Number(po.hp_rfs || po.hpRfs || 0), 0);
  }, [detailPoData]);

  // Top activating stations today
  const topStationsToday = useMemo(() => {
    return [...dynamicStationData]
      .filter(st => Number(st.aktifHariIniVal || 0) > 0)
      .sort((a, b) => Number(b.aktifHariIniVal || 0) - Number(a.aktifHariIniVal || 0))
      .slice(0, 3);
  }, [dynamicStationData]);

  // Handle Drilldown click
  const handleOpenDrilldown = (statusType, stationName, customerList) => {
    setDrilldownStatus(statusType);
    setDrilldownStationName(stationName);
    setDrilldownCustomers(customerList);
  };

  // Filtered stations based on search & health status
  const filteredStations = useMemo(() => {
    return dynamicStationData.filter(row => {
      const stName = String(row.stasiun || '').toLowerCase();
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || stName.includes(q);

      // Health Filter Calculation
      const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
      const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);
      const totalHp = hpReg + hpPerc;

      const aktReg = row.aktivasiReguler !== undefined ? Number(row.aktivasiReguler) : Number(row.totalAktivasiHc || 0);
      const aktPerc = row.aktivasiPercepatan !== undefined ? Number(row.aktivasiPercepatan) : Number(row.hcAktif || 0);
      const totAkt = row.totalAktivasiHc !== undefined && row.hpPercepatan !== undefined
        ? Number(row.totalAktivasiHc)
        : (aktReg + aktPerc);

      const takeUp = totalHp > 0 ? (totAkt / totalHp) * 100 : 0;

      let matchHealth = true;
      if (healthFilter === 'HIGH') matchHealth = takeUp >= 35;
      else if (healthFilter === 'MODERATE') matchHealth = takeUp >= 20 && takeUp < 35;
      else if (healthFilter === 'LOW') matchHealth = takeUp < 20;

      return matchSearch && matchHealth;
    });
  }, [dynamicStationData, searchTerm, healthFilter]);

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6">
      {/* ========================================================= */}
      {/* 1. EXECUTIVE KPI STRIP (STANDALONE CARDS OUTSIDE CONTAINER) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">

        {/* Card 1: Total Homepass */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-sm hover:shadow transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" />
              Total Homepass
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100/60">
              Kapasitas Jaringan
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {(totals.hpTerbangun || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-slate-400">HP</span>
            {totalRfs > 0 && (
              <>
                <span className="text-slate-300 font-light mx-1">/</span>
                <span className="text-xl font-black text-emerald-600 tracking-tight">
                  {totalRfs.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-bold text-emerald-700/70">RFS</span>
              </>
            )}
          </div>

          {/* Dual-color Progress Bar (Reguler vs Percepatan) */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex mb-2">
            {totals.hpTerbangun > 0 && (
              <>
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${(totals.hpReguler / totals.hpTerbangun) * 100}%` }}
                  title={`Reguler: ${(totals.hpReguler || 0).toLocaleString('id-ID')} HP`}
                ></div>
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(totals.hpPercepatan / totals.hpTerbangun) * 100}%` }}
                  title={`Percepatan: ${(totals.hpPercepatan || 0).toLocaleString('id-ID')} HP`}
                ></div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Reg: <strong>{(totals.hpReguler || 0).toLocaleString('id-ID')}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Perc: <strong>{(totals.hpPercepatan || 0).toLocaleString('id-ID')}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Take-Up Rate */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-sm hover:shadow transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-600" />
              Take-Up Rate
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/60 flex items-center gap-0.5">
              <ArrowUpRight size={10} /> Tingkat Penggunaan
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {Number(totals.performaHc || 0).toFixed(2)}%
            </span>
            <span className="text-[10px] font-bold text-slate-400">dari target 40%</span>
          </div>

          {/* Target Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(Number(totals.performaHc || 0), 100)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>Reguler: <strong className="text-slate-700">{totals.performaReguler || 0}%</strong></span>
            <span>Percepatan: <strong className="text-slate-700">{totals.performaPercepatan || 0}%</strong></span>
          </div>
        </div>

        {/* Card 3: Status Kesehatan Pelanggan */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-sm hover:shadow transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              Pelanggan Aktif
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100/60">
              Database
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">
              {(totals.hcAktif || customerHealthTotals.aktif || 0).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              HC Aktif
            </span>
          </div>

          {/* Interactive Status Chips */}
          <div className="flex items-center justify-between gap-1 pt-0.5 w-full">
            <button
              onClick={() => handleOpenDrilldown('SUSPEND', 'Semua Stasiun', pelangganData.filter(p => String(p.status_aktivasi || p.aktivasi || '').trim().toUpperCase() === 'SUSPEND'))}
              className="flex-1 text-[9px] font-extrabold px-1 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200/70 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 whitespace-nowrap"
              title="Lihat pelanggan Suspend"
            >
              <AlertCircle size={9} className="text-amber-500" /> {customerHealthTotals.suspend} Suspend
            </button>
            <button
              onClick={() => handleOpenDrilldown('READY TO DISMANTLE', 'Semua Stasiun', pelangganData.filter(p => String(p.status_aktivasi || p.aktivasi || '').trim().toUpperCase().includes('READY')))}
              className="flex-1 text-[9px] font-extrabold px-1 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded border border-orange-200/70 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 whitespace-nowrap"
              title="Lihat pelanggan Ready Dismantle"
            >
              <Clock size={9} className="text-orange-500" /> {customerHealthTotals.ready} Dismantle
            </button>
            <button
              onClick={() => handleOpenDrilldown('DISMANTLED', 'Semua Stasiun', pelangganData.filter(p => String(p.status_aktivasi || p.aktivasi || '').trim().toUpperCase().includes('DISMANTLE')))}
              className="flex-1 text-[9px] font-extrabold px-1 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded border border-rose-200/70 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 whitespace-nowrap"
              title="Lihat pelanggan Dismantled"
            >
              <XCircle size={9} className="text-rose-500" /> {customerHealthTotals.dismantled} Dismantled
            </button>
          </div>
        </div>

        {/* Card 4: Aktivasi Hari Ini */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-sm hover:shadow transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-500" />
              Aktivasi Hari Ini
            </span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-100/70 text-emerald-800 rounded-full">
              {formattedDate || 'Hari Ini'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">
              +{totals.aktifHariIni || 0}
            </span>
            <span className="text-[11px] font-bold text-slate-400">Pelanggan Baru</span>
          </div>

          <div className="text-[10px] font-medium text-slate-500 truncate pt-0.5">
            {topStationsToday.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-slate-400">Top:</span>
                {topStationsToday.map((st, i) => (
                  <span key={i} className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                    {toProperCase(st.stasiun)} (+{st.aktifHariIniVal})
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">Belum ada aktivasi baru hari ini</span>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. STATION LIST CONTAINER (TOOLBAR & STATIONS LIST)       */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        {/* SUB-TOOLBAR (SEARCH, HEALTH FILTERS, ACCORDION CONTROLS) */}
        <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-200/60 flex items-center justify-between gap-3 flex-wrap">

          {/* Left: Search Box & Health Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari stasiun atau No PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setHealthFilter('ALL')}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${healthFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Semua ({dynamicStationData.length})
              </button>
              <button
                onClick={() => setHealthFilter('HIGH')}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${healthFilter === 'HIGH'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                High Demand (≥35%)
              </button>
              <button
                onClick={() => setHealthFilter('MODERATE')}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${healthFilter === 'MODERATE'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Moderate (20-35%)
              </button>
              <button
                onClick={() => setHealthFilter('LOW')}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${healthFilter === 'LOW'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                Low Take-Up (&lt;20%)
              </button>
            </div>
          </div>

          {/* Right: Expand / Collapse All */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-0.5 rounded-lg shadow-sm">
            <button
              onClick={expandAll}
              className="text-[10px] font-extrabold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-all cursor-pointer active:scale-95"
            >
              Buka Semua
            </button>
            <div className="w-px h-3 bg-slate-200"></div>
            <button
              onClick={collapseAll}
              className="text-[10px] font-extrabold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-all cursor-pointer active:scale-95"
            >
              Tutup Semua
            </button>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 3. STATION ROWS (UNIFORM TABLE-LIKE ACCORDION LIST)       */}
        {/* ========================================================= */}
        <div className="divide-y divide-slate-100">
          {filteredStations.length === 0 ? (
            <div className="p-12 text-center">
              <Radio size={32} className="mx-auto text-slate-300 mb-2 animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Tidak ada stasiun yang cocok dengan filter</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter status kesehatan.</p>
            </div>
          ) : (
            filteredStations.map((row, idx) => {
              const stName = row.stasiun;
              const isExpanded = Boolean(expandedStations[stName]);

              // Kapasitas HP
              const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
              const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);
              const totalHp = hpReg + hpPerc;

              // Aktivasi HC
              const aktReg = row.aktivasiReguler !== undefined ? Number(row.aktivasiReguler) : Number(row.totalAktivasiHc || 0);
              const aktPerc = row.aktivasiPercepatan !== undefined ? Number(row.aktivasiPercepatan) : Number(row.hcAktif || 0);
              const totAkt = row.totalAktivasiHc !== undefined && row.hpPercepatan !== undefined
                ? Number(row.totalAktivasiHc)
                : (aktReg + aktPerc);

              // HC Aktif
              const hcAktReg = row.hcAktifReguler !== undefined ? Number(row.hcAktifReguler) : Number(row.performaHc || 0);
              const hcAktPerc = row.hcAktifPercepatan !== undefined ? Number(row.hcAktifPercepatan) : Number(row.tieringHc || 0);
              const totHcAktif = hcAktReg + hcAktPerc;

              // Other Statuses
              const stSuspend = Number(row.suspend || 0);
              const stReady = Number(row.readyToDismantle || row.readyDismantle || 0);
              const stDismantled = Number(row.dismantled || 0);
              const stLainnya = Math.max(0, totAkt - (totHcAktif + stSuspend + stReady + stDismantled));

              // Aktivasi Hari Ini
              const aktToday = Number(row.aktifHariIniVal || 0);

              // Take-Up Rate
              const takeUpRate = totalHp > 0 ? ((totAkt / totalHp) * 100).toFixed(2) : "0.00";
              const numTakeUp = Number(takeUpRate);

              // Health Status
              let healthBadge = {
                text: 'High Demand',
                color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                dot: 'bg-emerald-500'
              };
              if (numTakeUp < 20) {
                healthBadge = {
                  text: 'Low Take-Up',
                  color: 'bg-rose-50 text-rose-700 border-rose-200/80',
                  dot: 'bg-rose-500'
                };
              } else if (numTakeUp < 35) {
                healthBadge = {
                  text: 'Moderate Growth',
                  color: 'bg-amber-50 text-amber-700 border-amber-200/80',
                  dot: 'bg-amber-500'
                };
              }

              // PO List untuk stasiun ini (sudah di-cache)
              const stationPoList = stationDataMaps.poMap[stName] || [];

              // Pelanggan stasiun ini (sudah di-cache)
              const stationCustomers = stationDataMaps.custMap[stName] || [];

              return (
                <div
                  key={idx}
                  className={`transition-colors ${isExpanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/70'
                    }`}
                >
                  {/* --- ROW HEADER (UNIFIED ACCORDION ROW) --- */}
                  <div
                    onClick={() => toggleStation(stName)}
                    className="px-5 py-3.5 flex flex-col lg:grid lg:grid-cols-12 items-start lg:items-center gap-3 lg:gap-4 cursor-pointer select-none"
                  >
                    {/* Left: Chevron + Station Identity */}
                    <div className="flex items-center gap-3 w-full lg:col-span-4">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                        <ChevronRight
                          size={15}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-white' : 'text-slate-500'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-sm">
                            {toProperCase(stName)}
                          </h3>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {stationPoList.length} PO
                          </span>
                          {aktToday > 0 && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/60">
                              +{aktToday}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Kapasitas: <strong className="text-slate-600">{totalHp.toLocaleString('id-ID')} HP</strong> (Reg: {hpReg.toLocaleString('id-ID')} • Perc: {hpPerc.toLocaleString('id-ID')})
                        </p>
                      </div>
                    </div>

                    {/* Center: Take-Up Progress Bar & Metric Numbers */}
                    <div className="w-full lg:col-span-4 xl:col-span-5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 text-[11px]">
                          {totAkt.toLocaleString('id-ID')} <span className="font-medium text-slate-400">/ {totalHp.toLocaleString('id-ID')} HC</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-emerald-600 text-xs" title="Persentase HC Aktif">
                            {totalHp > 0 ? ((totHcAktif / totalHp) * 100).toFixed(2) : "0.00"}%
                          </span>
                          <span className="text-slate-300 text-[10px]">|</span>
                          <span className="font-black text-blue-700 text-xs" title="Persentase Total Aktivasi">
                            {takeUpRate}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        {totHcAktif > 0 && (
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${Math.min((totHcAktif / totalHp) * 100, 100)}%` }}
                            title={`Aktif: ${totHcAktif.toLocaleString('id-ID')} HC`}
                          ></div>
                        )}
                        {stSuspend > 0 && (
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${Math.min((stSuspend / totalHp) * 100, 100)}%` }}
                            title={`Suspend: ${stSuspend.toLocaleString('id-ID')} HC`}
                          ></div>
                        )}
                        {stReady > 0 && (
                          <div
                            className="h-full bg-orange-500 transition-all duration-500"
                            style={{ width: `${Math.min((stReady / totalHp) * 100, 100)}%` }}
                            title={`Dismantle: ${stReady.toLocaleString('id-ID')} HC`}
                          ></div>
                        )}
                        {stDismantled > 0 && (
                          <div
                            className="h-full bg-rose-500 transition-all duration-500"
                            style={{ width: `${Math.min((stDismantled / totalHp) * 100, 100)}%` }}
                            title={`Dismantled: ${stDismantled.toLocaleString('id-ID')} HC`}
                          ></div>
                        )}
                        {stLainnya > 0 && (
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min((stLainnya / totalHp) * 100, 100)}%` }}
                            title={`Lainnya: ${stLainnya.toLocaleString('id-ID')} HC`}
                          ></div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 mt-0.5">
                        <span>HC Aktif: <strong className="text-emerald-700 font-bold">{totHcAktif.toLocaleString('id-ID')}</strong></span>
                        <span>Reg: {row.hpReguler > 0 ? ((aktReg / row.hpReguler) * 100).toFixed(1) + '%' : '-'} | Perc: {row.hpPercepatan > 0 ? ((aktPerc / row.hpPercepatan) * 100).toFixed(1) + '%' : '-'}</span>
                      </div>
                    </div>

                    {/* Right: Health Badge & Action Buttons */}
                    <div className="flex items-center gap-2 w-full justify-end lg:col-span-4 xl:col-span-3 mt-2 lg:mt-0">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 whitespace-nowrap ${healthBadge.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${healthBadge.dot}`}></span>
                        {healthBadge.text}
                      </span>

                      {/* Quick Button Tambah PO */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setManageStation(stName);
                          setPoToEdit(null);
                          setIsManageModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                        title={`Tambah PO baru untuk stasiun ${toProperCase(stName)}`}
                      >
                        <Plus size={14} />
                      </button>

                      {/* Open Legacy Full Modal */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenStationModal) onOpenStationModal(stName);
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        title="Buka Modal Tabel Detail PO"
                      >
                        <span>Detail PO</span>
                        <ExternalLink size={11} className="text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* --- INLINE ACCORDION BODY (PO RELEASE CARDS) --- */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-slate-50/90 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-blue-600" />
                          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                            Rincian PO Release ({stationPoList.length} PO)
                          </h4>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          Klik angka status pada kartu PO untuk melihat rincian pelanggan aktual.
                        </span>
                      </div>

                      {stationPoList.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-600">Belum ada PO Release yang terdaftar untuk stasiun {toProperCase(stName)}</p>
                          <button
                            onClick={() => {
                              setManageStation(stName);
                              setPoToEdit(null);
                              setIsManageModalOpen(true);
                            }}
                            className="mt-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg inline-flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                          >
                            <Plus size={13} /> Tambah PO Sekarang
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {stationPoList.map((po, pIdx) => {
                            const poHpReg = Number(po.hpReguler || 0);
                            const poHpPerc = Number(po.hpPercepatan || 0);
                            const poTotalHp = poHpReg + poHpPerc;

                            // Ambil pelanggan yang cocok dengan PO ini
                            const matchedCusts = stationCustomers.filter(c => matchCustomerToPo(po, c, odpData));

                            let poAkt = 0;
                            let poAktif = 0;
                            let poSuspend = 0;
                            let poReady = 0;
                            let poDismantled = 0;

                            if (matchedCusts.length > 0) {
                              matchedCusts.forEach(c => {
                                const akt = String(c.status_aktivasi || c.aktivasi || c.statusAktivasi || '').trim().toUpperCase();
                                const ikr = String(c.status_ikr || c.ikr || c.statusIkr || '').trim().toUpperCase();

                                const isAktif = akt === 'AKTIF' || akt === 'SUDAH';
                                const isSuspend = akt === 'SUSPEND';
                                const isReady = akt === 'READY TO DISMANTLE' || akt.includes('READY');
                                const isDis = akt === 'DISMANTLED' || akt === 'DISMANTLE';
                                const isAktivasi = isAktif || isSuspend || isReady || isDis || ikr === 'SUDAH';

                                if (isSuspend) poSuspend++;
                                if (isReady) poReady++;
                                if (isDis) poDismantled++;
                                if (isAktivasi) {
                                  poAkt++;
                                  if (isAktif) poAktif++;
                                }
                              });
                            } else {
                              // Fallback jika belum selesai sinkronisasi
                              poAkt = Number(po.totalAktivasiHc || 0);
                              poAktif = Number(po.hcAktif || 0);
                              poSuspend = Number(po.suspend || 0);
                              poReady = Number(po.readyToDismantle || po.readyDismantle || 0);
                              poDismantled = Number(po.dismantled || 0);
                            }

                            const poTakeUp = poTotalHp > 0 ? ((poAkt / poTotalHp) * 100).toFixed(2) : "0.00";
                            const numPoTakeUp = Number(poTakeUp);

                            return (
                              <div
                                key={pIdx}
                                className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow transition-all flex flex-col justify-between"
                              >
                                <div>
                                  {/* Header: PO Number & Stage */}
                                  <div className="flex items-start justify-between gap-1.5 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                          {po.tahapPembangunan || 'Reguler'}
                                        </span>
                                        <span className="text-[9px] font-bold px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                          {po.jenisPo || 'Direct'}
                                        </span>
                                      </div>
                                      <h5 className="font-extrabold text-xs text-slate-800 truncate" title={po.noPoRelease}>
                                        {po.noPoRelease}
                                      </h5>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setManageStation(stName);
                                        setPoToEdit(po);
                                        setIsManageModalOpen(true);
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit data PO ini"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  </div>

                                  {/* Progress & Utilization */}
                                  <div className="mb-2.5">
                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">
                                          Aktivasi: <strong className="text-slate-700">{poAkt} / {poTotalHp} HP</strong>
                                        </span>
                                        {Number(po.hp_rfs || po.hpRfs || 0) > 0 && (
                                          <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                            {Number(po.hp_rfs || po.hpRfs || 0)} RFS
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-black text-emerald-600 text-[11px]" title="Persentase HC Aktif">
                                          {poTotalHp > 0 ? ((poAktif / poTotalHp) * 100).toFixed(2) : "0.00"}%
                                        </span>
                                        <span className="text-slate-300 text-[10px]">|</span>
                                        <span className="font-black text-blue-700 text-[11px]" title="Persentase Total Aktivasi">
                                          {poTakeUp}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                                      {poAktif > 0 && (
                                        <div
                                          className="h-full bg-emerald-500 transition-all duration-500"
                                          style={{ width: `${Math.min((poAktif / poTotalHp) * 100, 100)}%` }}
                                          title={`Aktif: ${poAktif}`}
                                        ></div>
                                      )}
                                      {poSuspend > 0 && (
                                        <div
                                          className="h-full bg-amber-500 transition-all duration-500"
                                          style={{ width: `${Math.min((poSuspend / poTotalHp) * 100, 100)}%` }}
                                          title={`Suspend: ${poSuspend}`}
                                        ></div>
                                      )}
                                      {poReady > 0 && (
                                        <div
                                          className="h-full bg-orange-500 transition-all duration-500"
                                          style={{ width: `${Math.min((poReady / poTotalHp) * 100, 100)}%` }}
                                          title={`Dismantle: ${poReady}`}
                                        ></div>
                                      )}
                                      {poDismantled > 0 && (
                                        <div
                                          className="h-full bg-rose-500 transition-all duration-500"
                                          style={{ width: `${Math.min((poDismantled / poTotalHp) * 100, 100)}%` }}
                                          title={`Dismantled: ${poDismantled}`}
                                        ></div>
                                      )}
                                      {Math.max(0, poAkt - (poAktif + poSuspend + poReady + poDismantled)) > 0 && (
                                        <div
                                          className="h-full bg-blue-500 transition-all duration-500"
                                          style={{ width: `${Math.min((Math.max(0, poAkt - (poAktif + poSuspend + poReady + poDismantled)) / poTotalHp) * 100, 100)}%` }}
                                          title={`Lainnya: ${Math.max(0, poAkt - (poAktif + poSuspend + poReady + poDismantled))}`}
                                        ></div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Customer Status Chips (Interactive Drilldown!) */}
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      onClick={() => handleOpenDrilldown('AKTIF', `${toProperCase(stName)} • ${po.tahapPembangunan || po.noPoRelease}`, matchedCusts.filter(c => {
                                        const akt = String(c.status_aktivasi || c.aktivasi || '').trim().toUpperCase();
                                        const ikr = String(c.status_ikr || c.ikr || '').trim().toUpperCase();
                                        return akt === 'AKTIF' || akt === 'SUDAH' || ikr === 'SUDAH';
                                      }))}
                                      className="text-[10px] font-bold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200/60 transition-all flex items-center justify-between cursor-pointer active:scale-95"
                                      title="Lihat pelanggan Aktif"
                                    >
                                      <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Aktif</span>
                                      <strong>{poAktif}</strong>
                                    </button>

                                    <button
                                      onClick={() => handleOpenDrilldown('SUSPEND', `${toProperCase(stName)} • ${po.tahapPembangunan || po.noPoRelease}`, matchedCusts.filter(c => String(c.status_aktivasi || c.aktivasi || '').trim().toUpperCase() === 'SUSPEND'))}
                                      className="text-[10px] font-bold px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200/60 transition-all flex items-center justify-between cursor-pointer active:scale-95"
                                      title="Lihat pelanggan Suspend"
                                    >
                                      <span className="flex items-center gap-1.5"><AlertCircle size={12} className="text-amber-500" /> Suspend</span>
                                      <strong>{poSuspend}</strong>
                                    </button>

                                    <button
                                      onClick={() => handleOpenDrilldown('READY TO DISMANTLE', `${toProperCase(stName)} • ${po.tahapPembangunan || po.noPoRelease}`, matchedCusts.filter(c => String(c.status_aktivasi || c.aktivasi || '').trim().toUpperCase().includes('READY')))}
                                      className="text-[10px] font-bold px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded border border-orange-200/60 transition-all flex items-center justify-between cursor-pointer active:scale-95"
                                      title="Lihat pelanggan Ready to Dismantle"
                                    >
                                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-orange-500" /> Ready to Dismantle</span>
                                      <strong>{poReady}</strong>
                                    </button>

                                    <button
                                      onClick={() => handleOpenDrilldown('DISMANTLED', `${toProperCase(stName)} • ${po.tahapPembangunan || po.noPoRelease}`, matchedCusts.filter(c => String(c.status_aktivasi || c.aktivasi || '').trim().toUpperCase().includes('DISMANTLE')))}
                                      className="text-[10px] font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded border border-rose-200/60 transition-all flex items-center justify-between cursor-pointer active:scale-95"
                                      title="Lihat pelanggan Dismantled"
                                    >
                                      <span className="flex items-center gap-1.5"><XCircle size={12} className="text-rose-500" /> Dismantled</span>
                                      <strong>{poDismantled}</strong>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================= */}
        {/* 4. FOOTER SUMMARY BAR                                     */}
        {/* ========================================================= */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs font-bold text-slate-700 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Total Kapasitas: <strong className="text-slate-900 font-extrabold">{(totals.hpTerbangun || 0).toLocaleString('id-ID')} HP</strong></span>
            <span className="text-slate-300">•</span>
            <span>Total Aktivasi: <strong className="text-blue-700 font-extrabold">{(totals.totalAktivasiHc || 0).toLocaleString('id-ID')} HC</strong></span>
            <span className="text-slate-300">•</span>
            <span>Total HC Aktif: <strong className="text-emerald-700 font-extrabold">{(totals.hcAktif || 0).toLocaleString('id-ID')} HC</strong></span>
          </div>
          <div>
            <span>Rata-rata Take-Up Rate: <strong className="text-blue-700 font-extrabold">{Number(totals.performaHc || 0).toFixed(2)}%</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL DRILLDOWN & FORM EDIT/ADD PO                     */}
      {/* ========================================================= */}
      {/* Customer Status Drilldown Modal */}
      <CustomerStatusDrilldownModal
        isOpen={Boolean(drilldownStatus)}
        onClose={() => {
          setDrilldownStatus(null);
          setDrilldownCustomers([]);
        }}
        stasiun={drilldownStationName}
        statusType={drilldownStatus}
        customers={drilldownCustomers}
      />

      {/* Manage PO Form Modal */}
      <ManagePoFormModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setPoToEdit(null);
        }}
        initialStation={manageStation}
        poToEdit={poToEdit}
        onSuccess={onRefresh}
      />

    </div>
  );
};
