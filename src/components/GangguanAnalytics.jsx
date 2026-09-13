import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { toProperCase } from '../utils';

// Icon Helper
const Icon = ({ name, size = 18, className = "" }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (window.lucide && containerRef.current) {
      containerRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px;"></i>`;
      window.lucide.createIcons({ root: containerRef.current });
    }
  }, [name, size, className]);
  return <span ref={containerRef} style={{ display: 'contents' }} />;
};

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Palet warna modern untuk donut chart keluhan
const ISSUE_COLORS = [
  '#f43f5e', // Rose - Kabel Putus / Jatuh
  '#ef4444', // Red - Modem LOS
  '#f59e0b', // Amber - No Internet / Bengong
  '#3b82f6', // Blue - Koneksi Lambat / Putus
  '#8b5cf6', // Purple - Perangkat Mati / Rusak
  '#06b6d4', // Cyan - Sistem / Konfigurasi
  '#64748b'  // Slate - Lainnya
];

export default function GangguanAnalytics({ visitData = [] }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear());
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Kategori normalisasi keluhan
  const categorizeKeluhan = (raw) => {
    if (!raw) return 'Lainnya';
    const s = String(raw).toUpperCase();
    if (s.includes('KABEL') || s.includes('PUTUS') || s.includes('DROP')) return 'Kabel Putus / Jatuh';
    if (s.includes('LOS') || s.includes('MERAH')) return 'Modem LOS Merah';
    if (s.includes('BENGONG') || s.includes('NO INTERNET')) return 'No Internet / Bengong';
    if (s.includes('LAMBAT') || s.includes('PUTUS-PUTUS') || s.includes('LEMOT')) return 'Koneksi Putus / Lambat';
    if (s.includes('MATI') || s.includes('RUSAK') || s.includes('ADAPTOR')) return 'Perangkat Rusak';
    if (s.includes('SISTEM') || s.includes('KONFIGURASI') || s.includes('SETTING')) return 'Konfigurasi / Sistem';
    return 'Keluhan Lainnya';
  };

  // Kalkulasi data tren bulanan untuk tahun terpilih
  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0);
    const resolvedCounts = new Array(12).fill(0);

    (visitData || []).forEach(v => {
      if (!v.timestamp) return;
      const str = String(v.timestamp).trim();
      let dObj = null;

      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dmyMatch) {
        const d = parseInt(dmyMatch[1], 10);
        const m = parseInt(dmyMatch[2], 10) - 1;
        const y = parseInt(dmyMatch[3], 10);
        dObj = new Date(y, m, d);
      } else {
        const parsed = Date.parse(str);
        if (!isNaN(parsed)) dObj = new Date(parsed);
      }

      if (dObj && dObj.getFullYear() === selectedYear) {
        const m = dObj.getMonth();
        if (m >= 0 && m < 12) {
          counts[m]++;
          const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(v.status || '').toUpperCase());
          if (isDone) resolvedCounts[m]++;
        }
      }
    });

    return MONTH_LABELS.map((name, idx) => ({
      name,
      fullName: MONTH_FULL[idx],
      tiket: counts[idx],
      selesai: resolvedCounts[idx],
      isCurrentMonth: idx === now.getMonth() && selectedYear === now.getFullYear()
    }));
  }, [visitData, selectedYear, now]);

  // Kalkulasi distribusi kategori keluhan (semua / tahun terpilih)
  const { keluhanData, totalKeluhanTahunIni } = useMemo(() => {
    const counts = {};
    let total = 0;

    (visitData || []).forEach(v => {
      if (!v.timestamp) return;
      const str = String(v.timestamp).trim();
      let dObj = null;

      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dmyMatch) {
        dObj = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
      } else {
        const parsed = Date.parse(str);
        if (!isNaN(parsed)) dObj = new Date(parsed);
      }

      if (dObj && dObj.getFullYear() === selectedYear) {
        const cat = categorizeKeluhan(v.keluhan);
        counts[cat] = (counts[cat] || 0) + 1;
        total++;
      }
    });

    const sorted = Object.entries(counts)
      .map(([name, value], idx) => ({
        name,
        value,
        color: ISSUE_COLORS[idx % ISSUE_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    return { keluhanData: sorted, totalKeluhanTahunIni: total };
  }, [visitData, selectedYear]);

  // Kalkulasi stasiun dengan gangguan terbanyak vs paling sedikit tahun ini
  const stationInsights = useMemo(() => {
    const map = {};
    (visitData || []).forEach(v => {
      if (!v.timestamp || !v.stasiun) return;
      let dObj = null;
      const str = String(v.timestamp).trim();
      const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (dmyMatch) {
        dObj = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
      } else {
        const parsed = Date.parse(str);
        if (!isNaN(parsed)) dObj = new Date(parsed);
      }

      if (dObj && dObj.getFullYear() === selectedYear) {
        const st = toProperCase(v.stasiun);
        map[st] = (map[st] || 0) + 1;
      }
    });

    const list = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const highest = list.length > 0 ? { name: list[0][0], count: list[0][1] } : null;
    const lowest = list.length > 1 ? { name: list[list.length - 1][0], count: list[list.length - 1][1] } : null;

    return { highest, lowest };
  }, [visitData, selectedYear]);

  // Tooltip custom untuk bar chart
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const pctSelesai = d.tiket > 0 ? Math.round((d.selesai / d.tiket) * 100) : 0;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700/80 backdrop-blur-md pointer-events-none animate-fade">
          <div className="flex items-center gap-2 border-b border-slate-700/70 pb-1.5 mb-2">
            <span className={`w-2 h-2 rounded-full ${d.isCurrentMonth ? 'bg-blue-400' : 'bg-blue-300'}`}></span>
            <p className="font-bold text-slate-100">
              {d.fullName} {selectedYear}
            </p>
            {d.isCurrentMonth && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/25 text-blue-300 border border-blue-400/30 ml-auto">
                Bulan Ini
              </span>
            )}
          </div>
          <div className="space-y-1.5 min-w-[140px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Total Tiket:
              </span>
              <span className="font-black text-white text-sm">{d.tiket}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Selesai:
              </span>
              <span className="font-bold text-emerald-400">{d.selesai}</span>
            </div>
            {d.tiket > 0 && (
              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">Tingkat Selesai:</span>
                <span className="font-bold text-emerald-300">{pctSelesai}%</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      {/* HEADER SECTION ANALISA */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60 shadow-2xs">
            <Icon name="bar-chart-3" size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Analisa & Grafik Tren Gangguan
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Tahun {selectedYear}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Evaluasi tren frekuensi tiket visit per bulan dan komparasi jenis kerusakan
            </p>
          </div>
        </div>

        {/* YEAR PICKER */}
        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all shadow-2xs active:scale-95"
            title="Tahun Sebelumnya"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <span className="px-3 text-xs font-black text-slate-800 select-none">
            Tahun {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all shadow-2xs active:scale-95"
            title="Tahun Berikutnya"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      {/* QUICK HIGHLIGHT STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-5 bg-slate-50/50 border-b border-slate-100">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Icon name="ticket" size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Tiket {selectedYear}</p>
            <p className="text-base font-black text-slate-800 leading-tight">{totalKeluhanTahunIni} Tiket</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Icon name="alert-circle" size={16} />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-[10px] uppercase font-bold text-slate-400">Stasiun Tiket Terbanyak</p>
            <p className="text-base font-black text-slate-800 leading-tight truncate">
              {stationInsights.highest ? `${stationInsights.highest.name} (${stationInsights.highest.count})` : '-'}
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Icon name="shield-check" size={16} />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-[10px] uppercase font-bold text-slate-400">Stasiun Paling Stabil</p>
            <p className="text-base font-black text-slate-800 leading-tight truncate">
              {stationInsights.lowest ? `${stationInsights.lowest.name} (${stationInsights.lowest.count})` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* CHARTS GRID (2 KOLOM: BAR CHART BULANAN + DONUT CHART KATEGORI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-3.5 sm:p-6">
        {/* 1. GRAFIK TREN BULANAN (7 KOLOM) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">
                Tren Gangguan Bulanan Semua Stasiun
              </h4>
              <p className="text-[11px] text-slate-500">
                Grafik total tiket visit per bulan di tahun {selectedYear}
              </p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setHoveredBarIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={false} />
                <Bar dataKey="tiket" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {monthlyData.map((entry, index) => {
                    const isHovered = hoveredBarIndex === index;
                    const isAnyHovered = hoveredBarIndex !== null;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCurrentMonth ? (isHovered ? '#1d4ed8' : '#3b82f6') : (isHovered ? '#3b82f6' : '#93c5fd')}
                        opacity={isAnyHovered && !isHovered ? 0.45 : 1}
                        className="transition-all duration-200 cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500"></span>
              <span>Bulan Berjalan ({MONTH_FULL[now.getMonth()]})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-300"></span>
              <span>Bulan Lainnya</span>
            </div>
          </div>
        </div>

        {/* 2. DONUT CHART DISTRIBUSI KELUHAN (5 KOLOM) */}
        <div className="lg:col-span-5 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-5">
          <div className="mb-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-800">
              Distribusi Jenis Gangguan
            </h4>
            <p className="text-[11px] text-slate-500">
              Proporsi kendala teknis yang dilaporkan pelanggan
            </p>
          </div>

          {keluhanData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Icon name="pie-chart" size={36} className="mb-2 opacity-40" />
              <p className="text-xs font-bold">Belum ada data keluhan pada tahun {selectedYear}</p>
            </div>
          ) : (
            <>
              <div className="h-44 sm:h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={keluhanData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {keluhanData.map((entry, index) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [
                        `${val} Tiket (${totalKeluhanTahunIni > 0 ? ((val / totalKeluhanTahunIni) * 100).toFixed(1) : 0}%)`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-slate-800 leading-none">{totalKeluhanTahunIni}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Tiket</span>
                </div>
              </div>

              {/* LIST LEGEND DENGAN PERSENTASE */}
              <div className="space-y-1.5 overflow-y-auto max-h-40 custom-scrollbar pr-1 mt-1">
                {keluhanData.map((item, idx) => {
                  const pct = totalKeluhanTahunIni > 0 ? ((item.value / totalKeluhanTahunIni) * 100).toFixed(1) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-bold text-slate-800">{item.value}</span>
                        <span className="text-[10px] font-bold text-slate-400 min-w-[38px] text-right">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
