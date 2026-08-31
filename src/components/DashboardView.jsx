import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toProperCase, getGlobalStatusStr, extractKendalaData } from '../utils';

// --- Komponen Icon Anti-Crash ---
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

const DashboardView = ({ data, isSyncing }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDate]);

  // --- STATS LOGIC ASLI ---
  const totalPelangganAktif = useMemo(() => {
    return (data.pelangganData || []).filter(item => {
      const statusStr = getGlobalStatusStr(item);
      return statusStr.includes('AKTIF') || statusStr === 'DONE';
    }).length;
  }, [data.pelangganData]);

  const dailyAktivasiCount = useMemo(() => {
    return (data.pelangganData || []).filter(p => {
      const tAkt = p.tglAktivasi ? String(p.tglAktivasi).split('T')[0] : '';
      return tAkt === selectedDate && String(p.aktivasi || '').toLowerCase().includes('sudah');
    }).length;
  }, [data.pelangganData, selectedDate]);

  const dailyKendalaCount = useMemo(() => {
    return (data.pelangganData || []).filter(p => {
      const { issue, date } = extractKendalaData(p);
      return issue && date && String(date).split('T')[0] === selectedDate;
    }).length;
  }, [data.pelangganData, selectedDate]);

  const dailyVisitCount = useMemo(() => {
    return (data.visitData || []).filter(v => (v.timestamp ? String(v.timestamp).split(' ')[0] : '') === selectedDate).length;
  }, [data.visitData, selectedDate]);

  // --- REGISTRASI PER STASIUN ASLI ---
  const registrasiPerStasiun = useMemo(() => {
    const stats = {};
    (data.stationData || []).forEach(st => { if (st.stasiun) stats[String(st.stasiun).toLowerCase()] = 0; });

    const parts = selectedDate.split('-'); 
    const targetDateIndo = `${parts[2]}/${parts[1]}/${parts[0]}`; 

    (data.dataRegistrasi || []).forEach(reg => {
       const rawDate = String(reg.tanggal || reg.tanggalRegistrasi || '');
       if (rawDate.includes(targetDateIndo) || rawDate.includes(selectedDate)) {
           const st = String(reg.stasiun || '').toLowerCase();
           if (stats[st] !== undefined) stats[st] += 1;
       }
    });

    return Object.keys(stats).sort().map(key => ({ stasiun: key, total: stats[key] }));
  }, [data.dataRegistrasi, data.stationData, selectedDate]);

  const totalRegistrasi = registrasiPerStasiun.reduce((acc, curr) => acc + curr.total, 0);

  // --- CHART DATA ASLI ---
  const trainChartData = useMemo(() => {
    const map = {};
    (data.pelangganData || []).forEach(p => {
       const tAkt = p.tglAktivasi ? String(p.tglAktivasi).split('T')[0] : '';
       if (tAkt === selectedDate && String(p.aktivasi || '').toLowerCase().includes('sudah')) {
          const st = String(p.stasiun || '').toLowerCase();
          map[st] = (map[st] || 0) + 1;
       }
    });
    return (data.stationData || []).map(s => ({
      stasiun: s.stasiun,
      aktifHariIni: map[String(s.stasiun).toLowerCase()] || 0
    }));
  }, [data.stationData, data.pelangganData, selectedDate]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 lg:space-y-6 page-enter pb-6 sm:pb-10">
      {/* DESKTOP TOP BAR (TANGGAL) - ASLI */}
      <div className="hidden lg:flex justify-end w-full mb-2">
        <div className="bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 sm:gap-3 hover:border-blue-400 transition-all">
          <Icon name="calendar" size={16} className="text-blue-600 shrink-0" />
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer" />
        </div>
      </div>

      {/* MOBILE ONLY: Welcome Banner */}
      <div className="lg:hidden bg-gradient-to-br from-blue-700 to-[#1e3a8a] rounded-xl p-4 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div className="relative z-10">
          <h2 className="text-base font-bold mb-0.5 tracking-tight">Halo, Tim Leader!</h2>
          <p className="text-blue-100 text-[10.5px]">Pantau Operasional Desnarum hari ini.</p>
        </div>
        <div className="relative z-10 flex items-center justify-between sm:justify-end gap-2">
          <div className="bg-white/15 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-sm text-white w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Icon name="calendar" size={14} className="text-blue-200" />
              <span className="text-[10px] font-bold text-blue-200 sm:hidden">Tanggal:</span>
            </div>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-[11px] font-bold text-white bg-transparent outline-none cursor-pointer [color-scheme:dark]" />
          </div>
        </div>
        <Icon name="activity" size={110} className="absolute -right-6 -bottom-6 text-white opacity-10 pointer-events-none" />
      </div>

      {/* KPI CARDS (2-COL ON MOBILE, 4-COL ON DESKTOP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
        <StatCard title="Total Aktivasi HC" value={totalPelangganAktif} icon="activity" bg="bg-orange-50" iconColor="text-orange-500" isLoading={isSyncing} />
        <StatCard title="Aktivasi Harian" value={dailyAktivasiCount} icon="check-circle" bg="bg-emerald-50" iconColor="text-emerald-500" isLoading={isSyncing} />
        <StatCard title="Kendala Harian" value={dailyKendalaCount} icon="alert-triangle" bg="bg-rose-50" iconColor="text-rose-500" isLoading={isSyncing} />
        <StatCard title="Visit / Gangguan" value={dailyVisitCount} icon="headset" bg="bg-purple-50" iconColor="text-purple-500" isLoading={isSyncing} />
      </div>

      {/* REGISTRASI PELANGGAN SECTION */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-6 gap-3 sm:gap-4">
           <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                 <Icon name="user-plus" size={18} className="sm:hidden" />
                 <span className="hidden sm:inline-flex"><Icon name="user-plus" size={24} /></span>
              </div>
              <div>
                 <h3 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight leading-snug">Registrasi Pelanggan Hari Ini</h3>
                 <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider sm:tracking-widest mt-0.5 sm:mt-1.5">Total pendaftaran baru pada {formattedDate}</p>
              </div>
           </div>
           <div className="bg-blue-600 text-white px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black shadow-md sm:shadow-lg shadow-blue-500/20 w-full sm:w-auto text-center">
              Total: {totalRegistrasi}
           </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
           {registrasiPerStasiun.map((item, idx) => (
              <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-lg sm:rounded-xl p-2 sm:p-4 flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-all">
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest group-hover:text-blue-500 truncate mr-1">{toProperCase(item.stasiun)}</span>
                 <span className="text-base sm:text-xl font-black text-slate-700 group-hover:text-blue-600 flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 bg-white rounded-md sm:rounded-lg border border-slate-100 group-hover:border-blue-100 shadow-sm shrink-0">{item.total}</span>
              </div>
           ))}
        </div>
      </div>

      {/* BOTTOM GRID (RAIHAN & REPORT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <Icon name="train" className="text-emerald-500 shrink-0" size={22} />
            <h2 className="text-sm sm:text-[19px] font-black text-slate-800 tracking-tight">Raihan Aktivasi Harian per Stasiun</h2>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-4 sm:mb-8 ml-7 sm:ml-9">Progres aktivasi pada {formattedDate}</p>
          <div className="flex-1 space-y-4 sm:space-y-6">
            <TrainChart data={trainChartData} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm">
           <h2 className="text-sm sm:text-[19px] font-black text-slate-800 tracking-tight flex items-center gap-2 sm:gap-3">
             <Icon name="bar-chart-3" className="text-blue-500 shrink-0" size={20} /> Report Petugas Lapangan
           </h2>
           <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mb-4 sm:mb-8 ml-7 sm:ml-9 mt-1">Status Pekerjaan Tim hari ini</p>
           <div className="h-[220px] sm:h-[300px] bg-slate-50/50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 flex items-center justify-center flex-col opacity-50 grayscale">
              <Icon name="bar-chart-2" size={36} className="mb-2 sm:mb-4" />
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Detail Report Sedang Dimuat</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, bg, iconColor, isLoading }) => (
  <div className="bg-white rounded-xl p-2.5 lg:p-6 shadow-sm border border-slate-200 lg:border-slate-100 flex flex-col justify-between lg:justify-center transition-all hover:shadow-md relative overflow-hidden group">
    {/* Mobile View (< lg) */}
    <div className="lg:hidden">
      <div className="flex justify-between items-start mb-1.5">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate mr-1">{title}</p>
      </div>
      <div className="flex justify-between items-end">
        {isLoading ? (
          <div className="h-5 w-10 bg-slate-100 animate-pulse rounded"></div>
        ) : (
          <span className="text-xl font-black text-slate-800 leading-none">{value}</span>
        )}
        <div className={`w-6 h-6 rounded-md ${bg} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon name={icon} size={12} />
        </div>
      </div>
    </div>

    {/* Desktop View (>= lg) ASLI */}
    <div className="hidden lg:flex items-center justify-between relative z-10 gap-2">
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest truncate">{title}</p>
        <div className="flex items-baseline gap-1">
          {isLoading ? (
            <div className="h-6 sm:h-8 w-12 sm:w-16 bg-slate-100 animate-pulse rounded-lg"></div>
          ) : (
            <p className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight">{value}</p>
          )}
        </div>
      </div>
      <div className={`w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${bg} ${iconColor} flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
        <Icon name={icon} size={18} className="sm:hidden" />
        <span className="hidden sm:inline-flex"><Icon name={icon} size={28} /></span>
      </div>
    </div>
    <div className="hidden lg:block absolute -bottom-6 -right-6 w-16 sm:w-24 h-16 sm:h-24 bg-slate-50 rounded-full opacity-50 transition-all group-hover:scale-150 pointer-events-none"></div>
  </div>
);

const TrainChart = ({ data }) => {
  const getAktifVal = (s) => (s.aktifHariIniVal !== undefined ? Number(s.aktifHariIniVal) : (Number(s.aktifHariIni) || 0));
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
              <span className="text-[8.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20 sm:w-24 shrink-0 truncate">{toProperCase(station.stasiun)}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full relative flex items-center mr-2 border border-slate-100 min-w-[70px]">
                <div className="absolute left-0 top-0 h-full bg-emerald-100 rounded-full" style={{ width: `${progress}%` }}></div>
                <div className="absolute w-5 h-5 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-sm z-10 -ml-2.5 transition-all duration-700" style={{ left: `${progress}%` }}>
                  <Icon name="train" size={10} className="text-emerald-600" />
                </div>
              </div>
              <span className={`text-[11px] sm:text-xs font-black w-4 text-right shrink-0 ${val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* Desktop TrainChart (ASLI) */}
      <div className="space-y-4 sm:space-y-6 hidden lg:block">
        {data.map((station, i) => {
          const val = getAktifVal(station);
          const progress = (val / chartMax) * 100;
          return (
            <div key={i} className="flex items-center gap-2 sm:gap-4 group">
              <div className="w-20 sm:w-24 text-[10px] sm:text-[11px] font-black text-slate-400 uppercase truncate group-hover:text-slate-800 transition-colors shrink-0">{toProperCase(station.stasiun)}</div>
              <div className="flex-1 bg-slate-50 h-2 sm:h-2.5 rounded-full relative border border-slate-100 flex items-center px-0.5 min-w-[70px]">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                <div className="absolute transition-all duration-1000 flex items-center justify-center z-10" style={{ left: `${Math.min(progress, 100)}%`, transform: 'translateX(-50%)' }}>
                  <div className="bg-white border-2 border-emerald-500 text-emerald-600 rounded-full p-0.5 sm:p-1.5 shadow-md transform hover:scale-125 transition-transform">
                    <Icon name="train" size={11} className="sm:hidden" />
                    <span className="hidden sm:inline-flex"><Icon name="train" size={14} /></span>
                  </div>
                </div>
              </div>
              <div className="w-6 sm:w-8 text-right font-black text-emerald-600 text-xs sm:text-sm shrink-0">{val}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DashboardView;
