import React, { useState, useMemo, useRef, useEffect } from 'react';
import XLSX from 'xlsx-js-style';
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

// Urutan stasiun spesifik jalur operasional dari Wadu ke Krengseng
const STATIONS_ORDER = [
  'Wadu',
  'Randublatung',
  'Sulur',
  'Kradenan',
  'Brumbung',
  'Alastua',
  'Semarang Tawang',
  'Kaliwungu',
  'Kalibodri',
  'Weleri',
  'Krengseng'
];

// Helper normalisasi nama stasiun
const normalizeStation = (raw) => {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (s.includes('WADU')) return 'Wadu';
  if (s.includes('RANDUBLATUNG')) return 'Randublatung';
  if (s.includes('SULUR')) return 'Sulur';
  if (s.includes('KRADENAN')) return 'Kradenan';
  if (s.includes('BRUMBUNG')) return 'Brumbung';
  if (s.includes('ALASTUA')) return 'Alastua';
  if (s.includes('TAWANG')) return 'Semarang Tawang';
  if (s.includes('KALIWUNGU')) return 'Kaliwungu';
  if (s.includes('KALIBODRI')) return 'Kalibodri';
  if (s.includes('WELERI')) return 'Weleri';
  if (s.includes('KRENGSENG')) return 'Krengseng';
  return toProperCase(raw);
};

// Helper standardisasi format tanggal YYYY-MM-DD
const standardizeDate = (dateStr) => {
  if (!dateStr) return '';
  let cleaned = String(dateStr).trim().split(/[T ]/)[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const p = cleaned.split('/');
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  } catch (e) { }
  return cleaned;
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function GangguanCalendarTable({ visitData = [], onFilterTicketList }) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth()); // 0-11
  const [selectedCell, setSelectedCell] = useState(null); // Modal detail cell

  // Navigasi bulan
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Jumlah hari dalam bulan terpilih
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Daftar hari dalam bulan terpilih
  const daysList = useMemo(() => {
    const days = [];
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = dateObj.getDay();
      days.push({
        day: d,
        dateStr,
        dayName: DAY_NAMES[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [currentYear, currentMonth, daysInMonth, now]);

  // Kalkulasi matriks tiket gangguan per stasiun per tanggal
  const { matrixData, stationTotals, dailyTotals, grandTotal, allStationsList } = useMemo(() => {
    // Kumpulkan stasiun yang ada di data
    const dynamicStations = new Set(STATIONS_ORDER);
    (visitData || []).forEach(v => {
      if (v.stasiun) {
        const norm = normalizeStation(v.stasiun);
        if (norm) dynamicStations.add(norm);
      }
    });

    const orderedStations = Array.from(dynamicStations);

    const matrix = {};
    const stTotals = {};
    orderedStations.forEach(st => {
      matrix[st] = {};
      stTotals[st] = 0;
      daysList.forEach(d => {
        matrix[st][d.dateStr] = [];
      });
    });

    const dayTotals = {};
    daysList.forEach(d => {
      dayTotals[d.dateStr] = 0;
    });

    let totalAll = 0;

    (visitData || []).forEach(item => {
      const tStr = standardizeDate(item.timestamp);
      if (!tStr) return;

      const st = normalizeStation(item.stasiun);
      if (!st || !matrix[st]) return;

      if (matrix[st] && matrix[st][tStr]) {
        matrix[st][tStr].push(item);
        stTotals[st] = (stTotals[st] || 0) + 1;
        dayTotals[tStr] = (dayTotals[tStr] || 0) + 1;
        totalAll++;
      }
    });

    return {
      matrixData: matrix,
      stationTotals: stTotals,
      dailyTotals: dayTotals,
      grandTotal: totalAll,
      allStationsList: orderedStations
    };
  }, [visitData, daysList]);

  // Ekspor Matriks ke Excel
  const handleExportExcel = () => {
    try {
      const headerRow = ['STASIUN', ...daysList.map(d => `${d.day} (${d.dayName})`), 'TOTAL GANGGUAN'];
      const rows = [];

      allStationsList.forEach(st => {
        const rowData = [st];
        daysList.forEach(d => {
          const count = (matrixData[st]?.[d.dateStr] || []).length;
          rowData.push(count === 0 ? '' : count);
        });
        rowData.push(stationTotals[st] || 0);
        rows.push(rowData);
      });

      // Total Harian
      const totalRow = ['TOTAL HARIAN'];
      daysList.forEach(d => {
        const count = dailyTotals[d.dateStr] || 0;
        totalRow.push(count === 0 ? '' : count);
      });
      totalRow.push(grandTotal);
      rows.push(totalRow);

      const wsData = [headerRow, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [{ wch: 18 }, ...daysList.map(() => ({ wch: 6 })), { wch: 14 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Gangguan ${MONTH_NAMES[currentMonth]}`);

      const fileName = `Kalender_Gangguan_${MONTH_NAMES[currentMonth]}_${currentYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export excel:', err);
      alert('Gagal mengekspor data ke Excel.');
    }
  };

  // Helper badge pewarnaan intensitas gangguan
  const getBadgeStyle = (count) => {
    if (count === 0) return 'text-slate-300 font-normal';
    if (count === 1) {
      return 'bg-amber-50 text-amber-700 border border-amber-200/80 font-bold hover:bg-amber-100 hover:scale-105';
    }
    if (count === 2) {
      return 'bg-orange-100 text-orange-800 border border-orange-300 font-black hover:bg-orange-200 hover:scale-105';
    }
    // count >= 3
    return 'bg-rose-100 text-rose-700 border border-rose-300 font-black shadow-2xs hover:bg-rose-200 hover:scale-110 animate-pulse';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      {/* HEADER KALENDER */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60 shadow-2xs">
            <Icon name="calendar" size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Kalender Gangguan per Stasiun
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {grandTotal} Tiket Bulan Ini
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Distribusi jumlah tiket visit gangguan harian di setiap stasiun
            </p>
          </div>
        </div>

        {/* CONTROLS: BULAN & EXCEL */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all shadow-2xs active:scale-95"
              title="Bulan Sebelumnya"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <span className="px-3 text-xs font-black text-slate-800 min-w-[140px] text-center select-none">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-all shadow-2xs active:scale-95"
              title="Bulan Berikutnya"
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <button
              onClick={handleTodayMonth}
              className="ml-1 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
              title="Kembali ke Bulan Sekarang"
            >
              Hari Ini
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95 shrink-0"
            title="Ekspor Matriks Kalender ke Excel"
          >
            <Icon name="file-spreadsheet" size={14} />
            <span className="hidden md:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="overflow-x-auto custom-scrollbar relative max-h-[500px]">
        <table className="w-full text-left border-collapse border-spacing-0">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 sticky top-0 z-30">
              {/* KOLOM STASIUN STICKY */}
              <th className="p-3 text-[11px] font-black text-slate-600 uppercase tracking-wider sticky left-0 z-40 bg-slate-50 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.03)] min-w-[150px]">
                Stasiun Operasional
              </th>

              {/* KOLOM TANGGAL 1..N */}
              {daysList.map(d => {
                let colBg = d.isToday ? 'bg-amber-50/80 text-amber-900 font-black' : d.isSunday ? 'bg-rose-50/50 text-rose-600' : 'text-slate-600';
                return (
                  <th
                    key={d.dateStr}
                    className={`p-1.5 sm:p-2 text-center border-r border-slate-100 min-w-[36px] sm:min-w-[42px] ${colBg}`}
                    title={`${d.day} ${MONTH_NAMES[currentMonth]} ${currentYear} (${d.dayName})`}
                  >
                    <div className="text-[9px] uppercase font-bold tracking-tighter opacity-70 leading-none mb-0.5">
                      {d.dayName}
                    </div>
                    <div className={`text-xs ${d.isToday ? 'w-5 h-5 mx-auto bg-amber-500 text-white rounded-full flex items-center justify-center font-black shadow-2xs' : 'font-extrabold'}`}>
                      {d.day}
                    </div>
                  </th>
                );
              })}

              {/* KOLOM TOTAL BULANAN */}
              <th className="p-3 text-center text-[11px] font-black text-slate-700 uppercase tracking-wider bg-slate-100/90 sticky right-0 z-30 border-l border-slate-200/80 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {allStationsList.map((st, sIdx) => {
              const totalSt = stationTotals[st] || 0;
              const isEven = sIdx % 2 === 0;

              return (
                <tr
                  key={st}
                  className={`hover:bg-blue-50/40 transition-colors group ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {/* STASIUN CELL (STICKY LEFT) */}
                  <td className={`p-2.5 sm:p-3 font-bold text-slate-800 sticky left-0 z-20 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.03)] truncate max-w-[170px] ${isEven ? 'bg-white' : 'bg-slate-50/90'} group-hover:bg-blue-50/60`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-blue-500 transition-colors shrink-0"></span>
                      <span className="truncate">{st}</span>
                    </div>
                  </td>

                  {/* TANGGAL CELLS */}
                  {daysList.map(d => {
                    const tickets = matrixData[st]?.[d.dateStr] || [];
                    const count = tickets.length;
                    const badgeClass = getBadgeStyle(count);

                    return (
                      <td
                        key={d.dateStr}
                        onClick={() => {
                          if (count > 0) {
                            setSelectedCell({ station: st, dateStr: d.dateStr, tickets });
                          }
                        }}
                        className={`p-1 text-center border-r border-slate-100 select-none transition-all ${count > 0 ? 'cursor-pointer' : ''} ${d.isToday ? 'bg-amber-50/20' : d.isSunday ? 'bg-rose-50/20' : ''}`}
                        title={count > 0 ? `${st}: ${count} tiket pada ${d.day} ${MONTH_NAMES[currentMonth]}` : ''}
                      >
                        {count === 0 ? (
                          <span className="text-[11px] text-slate-300 font-light">-</span>
                        ) : (
                          <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-md text-[11px] transition-transform ${badgeClass}`}>
                            {count}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* TOTAL PER STASIUN (STICKY RIGHT) */}
                  <td className="p-2.5 text-center font-black text-slate-800 bg-slate-50/90 group-hover:bg-blue-100/50 sticky right-0 z-10 border-l border-slate-200/80">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${totalSt > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200/70' : 'text-slate-400'}`}>
                      {totalSt}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* TOTAL ROW (FOOTER) */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-200 sticky bottom-0 z-30 font-black">
              <td className="p-2.5 sm:p-3 text-slate-800 uppercase tracking-wider text-[11px] sticky left-0 z-40 bg-slate-100 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                Total Harian
              </td>
              {daysList.map(d => {
                const totalDay = dailyTotals[d.dateStr] || 0;
                return (
                  <td
                    key={d.dateStr}
                    className={`p-1.5 text-center text-xs border-r border-slate-200/70 ${d.isToday ? 'text-amber-800 bg-amber-100/60' : totalDay > 0 ? 'text-slate-800' : 'text-slate-400 font-normal'}`}
                  >
                    {totalDay === 0 ? '-' : totalDay}
                  </td>
                );
              })}
              <td className="p-2.5 text-center text-sm font-black text-white bg-blue-600 sticky right-0 z-30 border-l border-blue-700">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER LEGEND & PETUNJUK */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-slate-700">Keterangan Intensitas:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] items-center justify-center font-bold">1</span>
            <span>1 Tiket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-orange-100 text-orange-800 border border-orange-300 text-[10px] items-center justify-center font-bold">2</span>
            <span>2 Tiket</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-4 h-4 rounded bg-rose-100 text-rose-700 border border-rose-300 text-[10px] items-center justify-center font-black">3+</span>
            <span>≥3 Tiket (Lonjakan)</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 italic">
          *Klik angka pada sel untuk melihat detail tiket gangguan di stasiun & tanggal tersebut
        </div>
      </div>

      {/* MODAL POPUP DETAIL SEL TANGGAL */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scale-up">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon name="calendar-check" size={16} />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base leading-tight">
                    Tiket Gangguan: {selectedCell.station}
                  </h4>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    Tanggal: {selectedCell.dateStr} ({selectedCell.tickets.length} Tiket)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100 space-y-2">
              {selectedCell.tickets.map((t, idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">
                      {t.namaPelanggan || t.idPelanggan || 'Pelanggan'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${String(t.status || '').toUpperCase().includes('DONE') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {t.status || 'OPEN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <Icon name="alert-triangle" size={12} />
                    {t.keluhan || 'Kendala Teknis'}
                  </p>
                  {t.catatan && (
                    <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                      "{t.catatan}"
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Petugas: {t.petugas || '-'}</span>
                    <span>{t.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (onFilterTicketList) {
                    onFilterTicketList(selectedCell.station, selectedCell.dateStr);
                  }
                  setSelectedCell(null);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Icon name="filter" size={14} />
                <span>Filter di Tabel Tiket Utama</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
