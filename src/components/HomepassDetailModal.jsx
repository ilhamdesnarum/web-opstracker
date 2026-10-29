import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Search, 
  Layers, 
  CheckCircle2, 
  Building2, 
  FileText, 
  Filter, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { toProperCase, isPoPercepatan } from '../utils';

export const HomepassDetailModal = ({
  isOpen,
  onClose,
  dynamicStationData = [],
  detailPoData = [],
  totals = {},
  totalRfs = 0,
  onSelectStation
}) => {
  // State
  const [activeTab, setActiveTab] = useState('station'); // 'station' | 'po'
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL'); // 'ALL' | 'REGULER' | 'PERCEPATAN'
  const [rfsFilter, setRfsFilter] = useState('ALL'); // 'ALL' | 'HAS_RFS' | 'NO_RFS'
  const [selectedStationName, setSelectedStationName] = useState('ALL');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pre-group POs by station
  const stationPoMap = useMemo(() => {
    const map = new Map();
    const stationList = (dynamicStationData || []).map(row => {
      const stName = row.stasiun;
      let targetSt = String(stName).toLowerCase().trim();
      if (targetSt === 'tawang') targetSt = 'semarang tawang';
      map.set(stName, []);
      return { stName, targetSt };
    });

    const findStationEntry = (rawName) => {
      if (!rawName) return null;
      let s = String(rawName).toLowerCase().trim();
      if (s === 'tawang') s = 'semarang tawang';
      let match = stationList.find(item => item.targetSt === s);
      if (match) return match;
      return stationList.find(item => item.targetSt.includes(s) || s.includes(item.targetSt)) || null;
    };

    (detailPoData || []).forEach(po => {
      const match = findStationEntry(po.stasiun);
      if (match) {
        const arr = map.get(match.stName) || [];
        arr.push(po);
        map.set(match.stName, arr);
      }
    });

    return map;
  }, [dynamicStationData, detailPoData]);

  // 1. Station Rows with Calculated RFS and HP
  const stationRows = useMemo(() => {
    return (dynamicStationData || []).map(row => {
      const stName = row.stasiun;
      const pos = stationPoMap.get(stName) || [];
      const hpReg = row.hpReguler !== undefined ? Number(row.hpReguler) : Number(row.hpTerbangun || 0);
      const hpPerc = row.hpPercepatan !== undefined ? Number(row.hpPercepatan) : Number(row.hpPercepatanVal || 0);
      const totalHp = hpReg + hpPerc;
      const rfs = pos.reduce((acc, p) => acc + Number(p.hp_rfs || p.hpRfs || 0), 0);
      const rfsRatio = totalHp > 0 ? (rfs / totalHp) * 100 : 0;

      return {
        stasiun: stName,
        pos,
        poCount: pos.length,
        hpReg,
        hpPerc,
        totalHp,
        rfs,
        rfsRatio
      };
    });
  }, [dynamicStationData, stationPoMap]);

  // Filtered Station Rows
  const filteredStationRows = useMemo(() => {
    return stationRows.filter(row => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || row.stasiun.toLowerCase().includes(q);

      let matchSegment = true;
      if (segmentFilter === 'REGULER') matchSegment = row.hpReg > 0;
      if (segmentFilter === 'PERCEPATAN') matchSegment = row.hpPerc > 0;

      let matchRfs = true;
      if (rfsFilter === 'HAS_RFS') matchRfs = row.rfs > 0;
      if (rfsFilter === 'NO_RFS') matchRfs = row.rfs === 0;

      return matchSearch && matchSegment && matchRfs;
    });
  }, [stationRows, searchTerm, segmentFilter, rfsFilter]);

  // 2. All PO Rows with Segment & RFS info
  const poRows = useMemo(() => {
    return (detailPoData || []).map(po => {
      const isPerc = isPoPercepatan(po);
      const hpReg = Number(po.hpReguler || po.hp_reguler || 0);
      const hpPerc = Number(po.hpPercepatan || po.hp_percepatan || 0);
      const totalHp = hpReg + hpPerc;
      const rfs = Number(po.hp_rfs || po.hpRfs || 0);
      const rfsRatio = totalHp > 0 ? (rfs / totalHp) * 100 : 0;
      const tahap = po.tahapPembangunan || po.tahap_pembangunan || (isPerc ? 'Percepatan' : 'Reguler');

      return {
        ...po,
        isPerc,
        tahap,
        hpReg,
        hpPerc,
        totalHp,
        rfs,
        rfsRatio
      };
    });
  }, [detailPoData]);

  // Filtered PO Rows
  const filteredPoRows = useMemo(() => {
    return poRows.filter(po => {
      const q = searchTerm.toLowerCase().trim();
      const noPo = String(po.noPoRelease || po.no_po_release || '').toLowerCase();
      const stName = String(po.stasiun || '').toLowerCase();
      const tahap = String(po.tahap || '').toLowerCase();

      const matchSearch = !q || noPo.includes(q) || stName.includes(q) || tahap.includes(q);

      let matchStation = true;
      if (selectedStationName !== 'ALL') {
        matchStation = String(po.stasiun || '').toLowerCase().trim() === selectedStationName.toLowerCase().trim();
      }

      let matchSegment = true;
      if (segmentFilter === 'REGULER') matchSegment = !po.isPerc;
      if (segmentFilter === 'PERCEPATAN') matchSegment = po.isPerc;

      let matchRfs = true;
      if (rfsFilter === 'HAS_RFS') matchRfs = po.rfs > 0;
      if (rfsFilter === 'NO_RFS') matchRfs = po.rfs === 0;

      return matchSearch && matchStation && matchSegment && matchRfs;
    });
  }, [poRows, searchTerm, selectedStationName, segmentFilter, rfsFilter]);

  // Summary Totals from Active Filter
  const activeStationTotals = useMemo(() => {
    return filteredStationRows.reduce(
      (acc, r) => ({
        poCount: acc.poCount + r.poCount,
        hpReg: acc.hpReg + r.hpReg,
        hpPerc: acc.hpPerc + r.hpPerc,
        totalHp: acc.totalHp + r.totalHp,
        rfs: acc.rfs + r.rfs
      }),
      { poCount: 0, hpReg: 0, hpPerc: 0, totalHp: 0, rfs: 0 }
    );
  }, [filteredStationRows]);

  const activePoTotals = useMemo(() => {
    return filteredPoRows.reduce(
      (acc, r) => ({
        hpReg: acc.hpReg + r.hpReg,
        hpPerc: acc.hpPerc + r.hpPerc,
        totalHp: acc.totalHp + r.totalHp,
        rfs: acc.rfs + r.rfs
      }),
      { hpReg: 0, hpPerc: 0, totalHp: 0, rfs: 0 }
    );
  }, [filteredPoRows]);

  if (!isOpen) return null;

  const totalHpGlobal = Number(totals.hpTerbangun || 0);
  const totalHpRegGlobal = Number(totals.hpReguler || 0);
  const totalHpPercGlobal = Number(totals.hpPercepatan || 0);
  const rfsRatioGlobal = totalHpGlobal > 0 ? ((totalRfs / totalHpGlobal) * 100).toFixed(2) : "0.00";
  const rfsPendingGlobal = Math.max(0, totalHpGlobal - totalRfs);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-5">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 animate-fade" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate">
                  Rincian Sumber Kapasitas Homepass & RFS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  {dynamicStationData.length} Stasiun • {detailPoData.length} PO Release
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Audit sebaran alokasi Homepass (HP) dan kesiapan Ready For Service (RFS) dari setiap Stasiun dan PO Release.
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

        {/* Global Summary KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-white border-b border-slate-100 shrink-0">
          {/* Card 1: Total Homepass */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-blue-600" /> Total Homepass (HP)
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                Kapasitas
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {totalHpGlobal.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold text-slate-400">HP</span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/60 mt-1">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                Reguler: <strong className="text-blue-700 font-extrabold">{totalHpRegGlobal.toLocaleString('id-ID')}</strong>
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                Percepatan: <strong className="text-purple-700 font-extrabold">{totalHpPercGlobal.toLocaleString('id-ID')}</strong>
              </span>
            </div>
          </div>

          {/* Card 2: Total RFS */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" /> Total Ready For Service (RFS)
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                {rfsRatioGlobal}% Siap
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {totalRfs.toLocaleString('id-ID')}
              </span>
              <span className="text-xs font-bold text-emerald-700/70">RFS</span>
              <span className="text-[11px] text-slate-400 font-medium ml-1">
                / {totalHpGlobal.toLocaleString('id-ID')} HP
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-emerald-100 mt-1">
              <span className="text-slate-500 font-medium">
                Sisa belum RFS: <strong className="text-amber-700 font-bold">{rfsPendingGlobal.toLocaleString('id-ID')} HP</strong>
              </span>
              <span className="text-emerald-700 font-bold">
                {detailPoData.filter(p => Number(p.hp_rfs || p.hpRfs || 0) > 0).length} PO RFS
              </span>
            </div>
          </div>

          {/* Card 3: Sebaran & Rasio */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-blue-600" /> Sebaran Jaringan
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                Portfolio
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {dynamicStationData.length}
              </span>
              <span className="text-xs font-bold text-slate-400">Stasiun</span>
              <span className="text-slate-300 font-light mx-1">•</span>
              <span className="text-xl font-black text-slate-700 tracking-tight">
                {detailPoData.length}
              </span>
              <span className="text-xs font-bold text-slate-400">PO Release</span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/60 mt-1 text-slate-500">
              <span>
                Rata-rata HP per Stasiun: <strong className="text-slate-700 font-bold">{(totalHpGlobal / (dynamicStationData.length || 1)).toFixed(0)} HP</strong>
              </span>
              <span>
                Rata-rata per PO: <strong className="text-slate-700 font-bold">{(totalHpGlobal / (detailPoData.length || 1)).toFixed(0)} HP</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 sm:p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Tab Selection */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveTab('station')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'station'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 size={13} />
              Rincian Per Stasiun ({stationRows.length})
            </button>
            <button
              onClick={() => setActiveTab('po')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'po'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={13} />
              Rincian Per PO Release ({detailPoData.length})
            </button>
          </div>

          {/* Search & Select Controls */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={activeTab === 'station' ? "Cari stasiun..." : "Cari no PO, stasiun, tahap..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Filter Segmen */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
            >
              <option value="ALL">Semua Segmen</option>
              <option value="REGULER">Hanya Reguler</option>
              <option value="PERCEPATAN">Hanya Percepatan</option>
            </select>

            {/* Filter RFS */}
            <select
              value={rfsFilter}
              onChange={(e) => setRfsFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
            >
              <option value="ALL">Semua RFS</option>
              <option value="HAS_RFS">Sudah RFS (&gt;0)</option>
              <option value="NO_RFS">Belum RFS (0)</option>
            </select>

            {/* Filter Stasiun jika tab PO */}
            {activeTab === 'po' && (
              <select
                value={selectedStationName}
                onChange={(e) => setSelectedStationName(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 max-w-[150px] truncate"
              >
                <option value="ALL">Semua Stasiun</option>
                {dynamicStationData.map((st, sIdx) => (
                  <option key={sIdx} value={st.stasiun}>{toProperCase(st.stasiun)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1 min-h-[300px] bg-white custom-scrollbar">
          {activeTab === 'station' ? (
            /* TAB 1: RINCIAN PER STASIUN */
            <div className="relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-3.5 py-2.5 text-center w-12">No</th>
                    <th className="px-3.5 py-2.5">Stasiun</th>
                    <th className="px-3.5 py-2.5 text-center">Jml PO</th>
                    <th className="px-3.5 py-2.5 text-right bg-blue-50/40 text-blue-700">HP Reguler</th>
                    <th className="px-3.5 py-2.5 text-right bg-purple-50/40 text-purple-700">HP Percepatan</th>
                    <th className="px-3.5 py-2.5 text-right font-black text-slate-800">Total HP</th>
                    <th className="px-3.5 py-2.5 text-right bg-emerald-50/50 text-emerald-700">Total RFS</th>
                    <th className="px-3.5 py-2.5 text-center">Kesiapan RFS</th>
                    <th className="px-3.5 py-2.5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredStationRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Building2 size={36} className="opacity-30 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Tidak ada stasiun yang cocok dengan filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStationRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-blue-50/30 transition-colors group cursor-default"
                      >
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-extrabold text-slate-800 text-xs">
                            {toProperCase(row.stasiun)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {row.poCount} PO
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-blue-700 bg-blue-50/10">
                          {row.hpReg.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-purple-700 bg-purple-50/10">
                          {row.hpPerc.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900">
                          {row.totalHp.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-black text-emerald-700 bg-emerald-50/20">
                          {row.rfs.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(row.rfsRatio, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 w-9 text-right">
                              {row.rfsRatio.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedStationName(row.stasiun);
                              setActiveTab('po');
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                            title={`Lihat rincian PO di stasiun ${toProperCase(row.stasiun)}`}
                          >
                            <span>Rincian PO</span>
                            <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Sticky Footer Total Row */}
                {filteredStationRows.length > 0 && (
                  <tfoot className="bg-slate-50 sticky bottom-0 z-10 border-t-2 border-slate-200 font-black text-xs">
                    <tr>
                      <td colSpan={2} className="px-3.5 py-3 text-slate-800 uppercase tracking-wide">
                        TOTAL ({filteredStationRows.length} Stasiun)
                      </td>
                      <td className="px-3.5 py-3 text-center text-slate-800">
                        {activeStationTotals.poCount} PO
                      </td>
                      <td className="px-3.5 py-3 text-right text-blue-700 bg-blue-50/30">
                        {activeStationTotals.hpReg.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-purple-700 bg-purple-50/30">
                        {activeStationTotals.hpPerc.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-900 text-[13px]">
                        {activeStationTotals.totalHp.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-emerald-700 bg-emerald-50/30 text-[13px]">
                        {activeStationTotals.rfs.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-center text-emerald-800">
                        {activeStationTotals.totalHp > 0
                          ? ((activeStationTotals.rfs / activeStationTotals.totalHp) * 100).toFixed(2)
                          : "0.00"}%
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            /* TAB 2: RINCIAN PER PO RELEASE */
            <div className="relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-3.5 py-2.5 text-center w-12">No</th>
                    <th className="px-3.5 py-2.5">Nomor PO Release</th>
                    <th className="px-3.5 py-2.5">Stasiun</th>
                    <th className="px-3.5 py-2.5 text-center">Tahap Pembangunan</th>
                    <th className="px-3.5 py-2.5 text-center">Jenis PO</th>
                    <th className="px-3.5 py-2.5 text-right bg-blue-50/40 text-blue-700">HP Reguler</th>
                    <th className="px-3.5 py-2.5 text-right bg-purple-50/40 text-purple-700">HP Percepatan</th>
                    <th className="px-3.5 py-2.5 text-right font-black text-slate-800">Total HP</th>
                    <th className="px-3.5 py-2.5 text-right bg-emerald-50/50 text-emerald-700">HP RFS</th>
                    <th className="px-3.5 py-2.5 text-center">Status RFS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPoRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <FileText size={36} className="opacity-30 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Tidak ada PO Release yang cocok dengan filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPoRows.map((po, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-blue-50/30 transition-colors group cursor-default"
                      >
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 text-[11px]">
                          {po.noPoRelease || po.no_po_release || '-'}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-700">
                          {toProperCase(po.stasiun || '-')}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border inline-block ${
                            po.isPerc
                              ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                              : 'bg-blue-50 text-blue-700 border-blue-200/60'
                          }`}>
                            {po.tahap}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {po.jenisPo || po.jenis_po || 'Direct'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-blue-700 bg-blue-50/10">
                          {po.hpReg > 0 ? po.hpReg.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-purple-700 bg-purple-50/10">
                          {po.hpPerc > 0 ? po.hpPerc.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900">
                          {po.totalHp.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-black text-emerald-700 bg-emerald-50/20">
                          {po.rfs > 0 ? (
                            <span className="text-emerald-700 font-extrabold">
                              {po.rfs.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">0</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {po.rfs > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              {po.rfsRatio >= 100 ? 'RFS Lengkap' : `${po.rfsRatio.toFixed(0)}% RFS`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Belum RFS
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Sticky Footer Total Row */}
                {filteredPoRows.length > 0 && (
                  <tfoot className="bg-slate-50 sticky bottom-0 z-10 border-t-2 border-slate-200 font-black text-xs">
                    <tr>
                      <td colSpan={5} className="px-3.5 py-3 text-slate-800 uppercase tracking-wide">
                        TOTAL ({filteredPoRows.length} PO)
                      </td>
                      <td className="px-3.5 py-3 text-right text-blue-700 bg-blue-50/30">
                        {activePoTotals.hpReg.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-purple-700 bg-purple-50/30">
                        {activePoTotals.hpPerc.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-900 text-[13px]">
                        {activePoTotals.totalHp.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-right text-emerald-700 bg-emerald-50/30 text-[13px]">
                        {activePoTotals.rfs.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3.5 py-3 text-center text-emerald-800">
                        {activePoTotals.totalHp > 0
                          ? ((activePoTotals.rfs / activePoTotals.totalHp) * 100).toFixed(2)
                          : "0.00"}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Reguler: {totalHpRegGlobal.toLocaleString('id-ID')} HP
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 font-bold text-purple-700">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Percepatan: {totalHpPercGlobal.toLocaleString('id-ID')} HP
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              RFS: {totalRfs.toLocaleString('id-ID')} RFS
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
