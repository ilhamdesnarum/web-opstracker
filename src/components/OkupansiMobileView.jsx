import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';

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

function OkupansiMobileView({ data, activeStation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOdcs, setExpandedOdcs] = useState({});
  const [collapsedTahap, setCollapsedTahap] = useState({});
  const [odpModal, setOdpModal] = useState({ isOpen: false, odpLabel: '', customers: [] });

  useEffect(() => {
    if (odpModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [odpModal.isOpen]);

  const handleOdpClick = (odp) => {
    if (!data || !data.pelangganData) return;
    
    // Normalisasi: standarisasi 1-2 digit ODC/ODP ke 3 digit, buang karakter tersembunyi, dan buang simbol
    const cleanOdp = (str) => String(str || '').replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '').trim().toUpperCase().replace(/_\s*(\d{1,2})\s*(_L\d+|_P\d+|_|$)/gi, (_, num, suffix) => '_' + num.padStart(3, '0') + suffix);
    const normalize = (str) => String(cleanOdp(str) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const odpStr = normalize(odp.label);
    const shortOdpStr = normalize(odp.shortLabel);
    const odcStr = normalize(odp.raw.kodeOdc || odp.raw['Kode ODC'] || odp.raw.KodeOdc);

    const customers = data.pelangganData.filter(p => {
      const pOdp = normalize(p.odpAktual || p.odp || p.kodeOdp);
      if (!pOdp) return false;
      
      if (pOdp === odpStr || pOdp === shortOdpStr) return true;
      if (odcStr && pOdp.includes(odcStr) && pOdp.includes(shortOdpStr)) return true;
      
      return false;
    });
    
    setOdpModal({ isOpen: true, odpLabel: odp.label, customers });
  };

  const toggleOdc = (label) => {
    setExpandedOdcs(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const toggleTahap = (tahap) => {
    setCollapsedTahap(prev => ({
      ...prev,
      [tahap]: !prev[tahap]
    }));
  };

  const expandAll = () => {
    const allOdcs = {};
    filteredOdcs.forEach(odc => { allOdcs[odc.label] = true; });
    setExpandedOdcs(allOdcs);
    setCollapsedTahap({});
  };

  const collapseAll = () => {
    setExpandedOdcs({});
    const allTahap = {};
    groupedOdcs.forEach(g => { allTahap[g.tahap] = true; });
    setCollapsedTahap(allTahap);
  };

  const [localStation, setLocalStation] = useState(activeStation || 'Semua Stasiun');
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);

  const uniqueStations = useMemo(() => {
    if (!data || !data.odpData) return [];
    const st = new Set();
    data.odpData.forEach(odp => {
      if (odp.stasiun) {
        const name = odp.stasiun.trim();
        const proper = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (proper) st.add(proper);
      }
    });
    return Array.from(st).sort();
  }, [data]);

  const okupansiData = useMemo(() => {
    if (!data || !data.odpData) return { odcs: [], kpi: {} };
    
    let stationOdps = data.odpData;
    if (localStation && localStation !== 'Semua Stasiun') {
      stationOdps = stationOdps.filter(odp => {
        const odpSt = String(odp.stasiun || '').toLowerCase().trim();
        const selSt = String(localStation).toLowerCase().trim();
        return odpSt === selSt ||
          (selSt === 'semarang tawang' && odpSt === 'tawang') ||
          (selSt === 'tawang' && odpSt === 'semarang tawang');
      });
    }

    const odcMap = {};
    let totalOdcKapasitas = 0;
    let totalOdcTerpakai = 0;

    stationOdps.forEach(odp => {
      const odcCode = odp.kodeOdc || odp['Kode ODC'] || odp.KodeOdc || 'TANPA-ODC';
      const odpLabel = odp.kodeOdp || odp['Kode ODP'] || odp.label || odp.Label || 'ODP-UNKNOWN';
      const kapasitas = Number(odp.kapasitas || odp.Kapasitas) || 0;
      const terpakai = Number(odp.portTerpakai || odp['Port Terpakai'] || odp.port_terpakai) || 0;

      if (!odcMap[odcCode]) {
        odcMap[odcCode] = {
          label: odcCode,
          kapasitas: 0,
          terpakai: 0,
          tersisa: 0,
          percent: 0,
          odps: []
        };
      }

      const tersisa = Math.max(0, kapasitas - terpakai);
      const percent = kapasitas > 0 ? (terpakai / kapasitas) * 100 : 0;

      let shortOdpLabel = odpLabel;
      const odpMatch = odpLabel.match(/L\d+$/i);
      if (odpMatch) {
        shortOdpLabel = odpMatch[0].toUpperCase();
      } else {
        const odpParts = odpLabel.split('_');
        if (odpParts.length > 1) shortOdpLabel = odpParts[odpParts.length - 1];
      }

      odcMap[odcCode].odps.push({
        label: odpLabel,
        stasiun: odp.stasiun,
        shortLabel: shortOdpLabel,
        kapasitas,
        terpakai,
        tersisa,
        percent,
        raw: odp
      });

      odcMap[odcCode].kapasitas += kapasitas;
      odcMap[odcCode].terpakai += terpakai;
      totalOdcKapasitas += kapasitas;
      totalOdcTerpakai += terpakai;
    });

    const odcList = Object.values(odcMap).map(odc => {
      odc.tersisa = Math.max(0, odc.kapasitas - odc.terpakai);
      odc.percent = odc.kapasitas > 0 ? (odc.terpakai / odc.kapasitas) * 100 : 0;
      odc.odps.sort((a, b) => a.shortLabel.localeCompare(b.shortLabel, undefined, { numeric: true }));
      return odc;
    });
    odcList.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    return {
      odcs: odcList,
      kpi: {
        totalOdc: odcList.length,
        totalOdp: stationOdps.length,
        totalKapasitas: totalOdcKapasitas,
        totalTerpakai: totalOdcTerpakai,
        occupancyRate: totalOdcKapasitas > 0 ? ((totalOdcTerpakai / totalOdcKapasitas) * 100).toFixed(1) : 0
      }
    };
  }, [data, localStation]);

  const filteredOdcs = useMemo(() => {
    if (!searchQuery) return okupansiData.odcs;
    const q = searchQuery.toLowerCase();
    return okupansiData.odcs.filter(odc => 
      odc.label.toLowerCase().includes(q) || 
      odc.odps.some(odp => odp.label.toLowerCase().includes(q))
    );
  }, [okupansiData.odcs, searchQuery]);

  const groupedOdcs = useMemo(() => {
    const groups = {};
    filteredOdcs.forEach(odc => {
      let tahap = 'Tahap Pembangunan Tidak Diketahui';
      if (odc.odps && odc.odps.length > 0) {
        const raw = odc.odps[0].raw;
        tahap = raw.tahapPembangunan || raw.tahap_pembangunan || raw.Tahap_Pembangunan || raw['Tahap Pembangunan'] || raw.tahap || 'Tahap Pembangunan Tidak Diketahui';
      }
      
      if (!groups[tahap]) groups[tahap] = [];
      groups[tahap].push(odc);
    });
    
    return Object.keys(groups).sort().map(key => ({
      tahap: key,
      odcs: groups[key]
    }));
  }, [filteredOdcs]);

  return (
    <div className="space-y-4 animate-slide-up pb-8">

      {/* Filter Stasiun */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-3">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Icon name="map-pin" size={14} className="text-teal-600" />
          Stasiun
        </label>
        <div className="flex-1 max-w-[200px] relative">
          <div
            onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between cursor-pointer"
          >
            <span className="text-[11px] font-bold text-slate-700 truncate">{localStation}</span>
            <Icon name="chevron-down" size={14} className={`text-slate-400 shrink-0 transition-transform ${isStationDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </div>
          {isStationDropdownOpen && (
            <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div
                onClick={() => { setLocalStation('Semua Stasiun'); setIsStationDropdownOpen(false); }}
                className={`px-4 py-3 text-[11px] font-bold cursor-pointer transition-colors ${localStation === 'Semua Stasiun' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Semua Stasiun
              </div>
              {uniqueStations.map(st => (
                <div
                  key={st}
                  onClick={() => { setLocalStation(st); setIsStationDropdownOpen(false); }}
                  className={`px-4 py-3 text-[11px] font-bold cursor-pointer transition-colors ${localStation === st ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {st}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Hero Banner */}
      <div className={`p-4 rounded-xl shadow-sm border border-slate-200 text-white flex flex-col justify-between relative overflow-hidden transition-all ${
        Number(okupansiData.kpi.occupancyRate) >= 100 
          ? 'bg-gradient-to-br from-rose-500 to-rose-600' 
          : Number(okupansiData.kpi.occupancyRate) >= 75 
          ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
          : 'bg-gradient-to-br from-emerald-600 to-teal-600'
      }`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Icon name="pie-chart" size={14} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-90 leading-tight">Okupansi Keseluruhan</h3>
              <p className="text-[9px] opacity-75 mt-0.5">
                {localStation && localStation !== 'Semua Stasiun' ? `Stasiun ${localStation}` : 'Semua Stasiun'}
              </p>
            </div>
          </div>
          <span className="text-2xl font-black tracking-tight">{okupansiData.kpi.occupancyRate || 0}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden my-1">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, okupansiData.kpi.occupancyRate)}%` }}
          />
        </div>
        
        <p className="text-[9px] font-medium opacity-80 text-right mt-0.5">
          {okupansiData.kpi.totalTerpakai} / {okupansiData.kpi.totalKapasitas} Port Terpakai
        </p>
      </div>

      {/* 4 KPI Grid Cards (Identik dengan Overview) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Total ODC</h3>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalOdc || 0}</span>
            <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
              <Icon name="cpu" size={12} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Total ODP</h3>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalOdp || 0}</span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Icon name="box" size={12} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Kapasitas</h3>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xl font-black text-slate-800 leading-none">{okupansiData.kpi.totalKapasitas || 0}</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Icon name="layers" size={12} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">Terpakai</h3>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xl font-black text-blue-600 leading-none">{okupansiData.kpi.totalTerpakai || 0}</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="check-circle" size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card Container */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 space-y-3">
        
        {/* Search Bar */}
        <div className="relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari Kode ODC atau ODP..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-[11px] outline-none focus:border-blue-400 focus:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              <Icon name="x" size={12} />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {filteredOdcs.length} ODC Ditemukan
          </span>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={expandAll} 
              className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1 active:scale-95"
            >
              <Icon name="chevrons-down" size={11} /> Buka Semua
            </button>
            <button 
              onClick={collapseAll} 
              className="text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded transition-colors flex items-center gap-1 active:scale-95"
            >
              <Icon name="chevrons-up" size={11} /> Tutup Semua
            </button>
          </div>
        </div>

        {/* ODC Accordion Items */}
        <div className="space-y-4 mt-2 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
          {groupedOdcs.map((group, gIdx) => {
            const isGroupOpen = searchQuery ? true : !collapsedTahap[group.tahap];
            return (
              <div key={gIdx} className="space-y-2.5">
                {/* Group Header */}
                <button 
                  onClick={() => toggleTahap(group.tahap)}
                  className="w-full flex items-center justify-between px-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 active:scale-95"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-wider text-left truncate">
                      {group.tahap}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                      {group.odcs.length}
                    </span>
                    <Icon 
                      name="chevron-down" 
                      size={14} 
                      className={`text-slate-400 transition-transform duration-200 ${isGroupOpen ? 'rotate-180 text-blue-500' : ''}`} 
                    />
                  </div>
                </button>
                
                {/* List of ODCs in this group */}
                <div className={`space-y-2.5 ${isGroupOpen ? 'block' : 'hidden'}`}>
                  {group.odcs.map((odc, idx) => {
                    const isOpen = searchQuery ? true : !!expandedOdcs[odc.label];
                    const getBadgeStyle = (pct) => {
                      if (pct >= 100) return 'bg-rose-50 text-rose-700 border-rose-200';
                      if (pct >= 75) return 'bg-amber-50 text-amber-700 border-amber-200';
                      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    };

                    return (
                      <div 
                        key={idx} 
                        className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleOdc(odc.label)}
                          className="w-full text-left p-3 flex items-center justify-between bg-slate-50/60 hover:bg-slate-100/80 active:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-xs truncate leading-tight" title={odc.label}>
                                {odc.label}
                              </h4>
                              <p className="text-[9px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                                <span>{odc.odps.length} ODP</span>
                                <span>•</span>
                                <span>{odc.terpakai}/{odc.kapasitas} Port</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeStyle(odc.percent)}`}>
                              {odc.percent.toFixed(1)}%
                            </span>
                            <Icon 
                              name="chevron-down" 
                              size={16} 
                              className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
                            />
                          </div>
                        </button>

                        {/* Collapsible List of ODPs */}
                        {isOpen && (
                          <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                            {odc.odps.map((odp, oIdx) => (
                              <div 
                                key={oIdx} 
                                onClick={() => handleOdpClick(odp)}
                                className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer active:bg-slate-100"
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-[11px] font-bold text-slate-800 leading-tight">
                                    {odp.shortLabel}
                                  </span>
                                  <span className="text-[9px] text-slate-400 truncate mt-0.5" title={odp.label}>
                                    {odp.label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-700">{odp.terpakai}/{odp.kapasitas}</p>
                                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase mt-0.5 ${getBadgeStyle(odp.percent)}`}>
                                      {odp.percent.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredOdcs.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Icon name="inbox" size={28} className="mx-auto mb-2 opacity-30" />
              Tidak ada data ODC/ODP ditemukan.
            </div>
          )}
        </div>
      </div>

      {/* Modal Daftar Pelanggan ODP (Menggunakan Portal agar terlepas dari container ber-overflow) */}
      {odpModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade" onClick={() => setOdpModal({ isOpen: false, odpLabel: '', customers: [] })}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col relative z-10 animate-modal overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 text-[14px]">Pelanggan di ODP</h3>
                <p className="text-[10px] text-slate-500 font-bold">{odpModal.odpLabel}</p>
              </div>
              <button 
                onClick={() => setOdpModal({ isOpen: false, odpLabel: '', customers: [] })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            
            <div className="p-2 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
              {odpModal.customers.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Icon name="users" size={20} className="text-slate-300" />
                  </div>
                  <h4 className="text-[12px] font-bold text-slate-600">Belum Ada Pelanggan</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Sistem tidak menemukan pelanggan yang terdaftar pada ODP ini.</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {odpModal.customers.length} Pelanggan
                    </span>
                  </div>
                  {odpModal.customers.map((c, i) => {
                    const getStatusInfo = (p) => {
                      // Ambil langsung dari kolom status aktivasi sesuai permintaan
                      let statusStr = String(p.statusAktivasi || p.status_aktivasi || p.aktivasi || '').trim().toUpperCase();
                      
                      // Normalisasi teks
                      if (statusStr === 'SUD' || statusStr === 'SUDAH') statusStr = 'AKTIF';
                      if (!statusStr || statusStr === 'BELUM') statusStr = 'PROSES';

                      if (statusStr === 'DISMANTLED') return { text: 'DISMANTLED', style: 'bg-slate-100 text-slate-600 border border-slate-200' };
                      if (statusStr === 'SUSPEND') return { text: 'SUSPEND', style: 'bg-rose-50 text-rose-600 border border-rose-200' };
                      if (statusStr === 'READY TO DISMANTLE') return { text: 'READY TO DISMANTLE', style: 'bg-purple-50 text-purple-600 border border-purple-200' };
                      if (statusStr === 'AKTIF') return { text: 'AKTIF', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };
                      
                      // Default untuk PROSES atau teks lainnya
                      return { text: statusStr, style: 'bg-amber-50 text-amber-600 border border-amber-100' };
                    };
                    
                    const statusInfo = getStatusInfo(c);

                    return (
                      <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-2">
                            <h4 className="font-black text-[12px] text-slate-800 leading-tight truncate">{c.namaPelanggan || c.idPelanggan}</h4>
                            <p className="text-[9px] text-slate-500 font-bold mt-0.5">{c.idPelanggan}</p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusInfo.style}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 mt-1 pt-2 border-t border-slate-50">
                          <Icon name="map-pin" size={10} className="text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{c.alamat || '-'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default OkupansiMobileView;
