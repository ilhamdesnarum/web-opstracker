import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import XLSX from 'xlsx-js-style';
import { toProperCase, calculateTTR } from '../utils';

import Icon from './Icon';

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
  let str = String(dateStr).trim();
  if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';

  // 1. Check ISO timestamp with timezone (T and Z or + offset)
  if (str.includes('T') && (str.endsWith('Z') || str.includes('+') || str.includes('-0') || str.includes('+0'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
      } catch (_e) {}
    }
  }

  // 2. Extract date part: split on comma, T, or space, and remove trailing punctuation
  let datePart = str.split(',')[0].trim().split(/[T ]/)[0].trim().replace(/[,;]+$/, '');

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy4 = datePart.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy4) {
    const day = dmy4[1].padStart(2, '0');
    const month = dmy4[2].padStart(2, '0');
    const year = dmy4[3];
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YY or DD-MM-YY or DD.MM.YY (2-digit year, e.g. 13-10-26 -> 2026-10-13)
  const dmy2 = datePart.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmy2) {
    const day = dmy2[1].padStart(2, '0');
    const month = dmy2[2].padStart(2, '0');
    const year = `20${dmy2[3]}`;
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd4 = datePart.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymd4) {
    const year = ymd4[1];
    const month = ymd4[2].padStart(2, '0');
    const day = ymd4[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback: try Date parsing
  try {
    const d = new Date(datePart);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
    }
  } catch (_e) {}

  return datePart;
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
  const [selectedCell, setSelectedCell] = useState(null); // Modal detail sel
  const [searchQuery, setSearchQuery] = useState('');

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

  // String tanggal hari ini (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [now]);

  // Daftar hari dalam bulan terpilih
  const daysList = useMemo(() => {
    const days = [];

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
  }, [currentYear, currentMonth, daysInMonth, todayStr]);

  // Kalkulasi matriks tiket gangguan per stasiun per tanggal
  const { matrixData, stationTotals, dailyTotals, grandTotal } = useMemo(() => {
    const matrix = {};
    const stTotals = {};
    STATIONS_ORDER.forEach(st => {
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
      if (!STATIONS_ORDER.includes(st)) return;

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
      grandTotal: totalAll
    };
  }, [visitData, daysList]);

  // Kalkulasi data visualisasi grafik batang samar pada background tabel
  const bgChartData = useMemo(() => {
    const STATION_COL_W = 170;
    const DAY_COL_W = 42;
    const TOTAL_COL_W = 70;
    const totalTableWidth = STATION_COL_W + (daysList.length * DAY_COL_W) + TOTAL_COL_W;

    const HEADER_H = 44;
    const BODY_ROW_H = 36;
    const BODY_TOTAL_H = STATIONS_ORDER.length * BODY_ROW_H; // 11 * 36 = 396px
    const yBaseline = HEADER_H + BODY_TOTAL_H; // 440px
    const maxBarHeight = 330; // menyisakan ruang ~66px di atas

    const values = Object.values(dailyTotals);
    const maxDaily = Math.max(...values, 1);

    const bars = [];

    daysList.forEach((d, idx) => {
      const count = dailyTotals[d.dateStr] || 0;
      const xLeft = STATION_COL_W + (idx * DAY_COL_W);
      const xCenter = xLeft + (DAY_COL_W / 2);
      const barWidth = 28;
      const barX = xCenter - (barWidth / 2);

      const ratio = count / maxDaily;
      const barHeight = Math.round(ratio * maxBarHeight);
      const barY = yBaseline - barHeight;

      bars.push({
        day: d.day,
        dateStr: d.dateStr,
        count,
        ratio,
        barX,
        barY,
        barWidth,
        barHeight,
        xCenter,
        isToday: d.isToday,
        isWeekend: d.isWeekend
      });
    });

    return {
      totalTableWidth,
      yBaseline,
      bars,
      maxDaily
    };
  }, [daysList, dailyTotals]);

  // Ekspor Matriks ke Excel
  const handleExportExcel = () => {
    try {
      const headerRow = ['STASIUN', ...daysList.map(d => `${d.day} (${d.dayName})`), 'TOTAL'];
      const rows = [];

      STATIONS_ORDER.forEach(st => {
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

      ws['!cols'] = [{ wch: 18 }, ...daysList.map(() => ({ wch: 6 })), { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Gangguan ${MONTH_NAMES[currentMonth]}`);

      const fileName = `Rekap_Gangguan_${MONTH_NAMES[currentMonth]}_${currentYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export excel:', err);
      alert('Gagal mengekspor data ke Excel.');
    }
  };

  // Helper pewarnaan cell badge untuk gangguan (Kriteria khusus gangguan)
  const getBadgeStyle = (count) => {
    if (count === 0) return '';
    if (count === 1) {
      return 'bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 hover:border-amber-300 font-bold';
    }
    if (count === 2) {
      return 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 hover:border-orange-400 font-black';
    }
    // count >= 3 (Lonjakan Gangguan)
    return 'bg-rose-100 text-rose-700 border border-rose-300 font-black shadow-xs hover:bg-rose-200 hover:border-rose-400';
  };

  // Helper membersihkan catatan kosong / tanda strip berulang
  const getCleanCatatan = (catatan) => {
    if (!catatan) return null;
    const trimmed = String(catatan).trim();
    if (
      trimmed === '' ||
      trimmed === '-' ||
      trimmed === '- -' ||
      trimmed === '--' ||
      trimmed === '"-"' ||
      trimmed === '"- -"' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return null;
    }
    return trimmed;
  };

  // Helper membersihkan tindakan kosong / tanda strip berulang
  const getCleanTindakan = (tindakan) => {
    if (!tindakan) return null;
    const trimmed = String(tindakan).trim();
    if (
      trimmed === '' ||
      trimmed === '-' ||
      trimmed === '- -' ||
      trimmed === '--' ||
      trimmed === '"-"' ||
      trimmed === '"- -"' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return null;
    }
    return trimmed;
  };

  // Statistik ringkasan modal rincian gangguan
  const statsModal = useMemo(() => {
    if (!selectedCell || !selectedCell.items) return { total: 0, selesai: 0, open: 0 };
    let selesai = 0;
    let open = 0;
    selectedCell.items.forEach(t => {
      const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(t.status || '').toUpperCase());
      if (isDone) selesai++;
      else open++;
    });
    return { total: selectedCell.items.length, selesai, open };
  }, [selectedCell]);

  // Kunci scroll halaman saat modal rincian terbuka dan tangani tombol Escape
  useEffect(() => {
    if (selectedCell) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Pastikan container scrollable latar belakang utama terkunci
      const scrollContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
      const savedStyles = [];
      scrollContainers.forEach(el => {
        if (!el.closest('.animate-modal')) {
          savedStyles.push({ el, overflow: el.style.overflow });
          el.style.overflow = 'hidden';
        }
      });

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setSelectedCell(null);
          setSearchQuery('');
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevBodyOverflow || 'auto';
        savedStyles.forEach(({ el, overflow }) => {
          el.style.overflow = overflow;
        });
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedCell]);

  // Filter pencarian di dalam modal
  const filteredModalItems = useMemo(() => {
    if (!selectedCell || !selectedCell.items) return [];
    if (!searchQuery) return selectedCell.items;
    const q = searchQuery.toLowerCase().trim();
    return selectedCell.items.filter(ticket => {
      return (
        String(ticket.idPelanggan || '').toLowerCase().includes(q) ||
        String(ticket.namaPelanggan || '').toLowerCase().includes(q) ||
        String(ticket.keluhan || '').toLowerCase().includes(q) ||
        String(ticket.tindakan || ticket.perbaikan || '').toLowerCase().includes(q) ||
        String(ticket.petugas || '').toLowerCase().includes(q) ||
        String(ticket.kodeOdp || ticket.odpAktual || ticket.odp || '').toLowerCase().includes(q) ||
        String(ticket.port || ticket.portOdp || '').toLowerCase().includes(q) ||
        String(ticket.nomorHp || '').toLowerCase().includes(q) ||
        String(ticket.catatan || '').toLowerCase().includes(q)
      );
    });
  }, [selectedCell, searchQuery]);

  // Ekspor rincian tiket modal ke Excel
  const handleExportModalExcel = () => {
    if (!selectedCell || !selectedCell.items || !selectedCell.items.length) return;
    try {
      const headers = ['NO', 'ID PELANGGAN', 'NAMA PELANGGAN', 'STASIUN', 'TANGGAL GANGGUAN', 'KELUHAN', 'TINDAKAN', 'ODP', 'PORT', 'PETUGAS', 'STATUS', 'WAKTU', 'TTR'];
      const targetItems = filteredModalItems && filteredModalItems.length > 0 ? filteredModalItems : selectedCell.items;
      const rows = targetItems.map((ticket, idx) => {
        const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(ticket.status || '').toUpperCase());
        const ttrVal = ticket.ttr || (isDone ? calculateTTR(ticket.timestampOpen || ticket.timestamp, ticket.waktuClose || ticket.waktuSelesai || ticket.closedAt || ticket.timestampClose) : null);
        const cleanTindakan = getCleanTindakan(ticket.tindakan || ticket.perbaikan || ticket.tindakan_perbaikan);
        return [
          idx + 1,
          ticket.idPelanggan || '-',
          ticket.namaPelanggan || 'Tanpa Nama',
          selectedCell.station,
          selectedCell.date,
          ticket.keluhan || '-',
          cleanTindakan || '-',
          ticket.kodeOdp || ticket.odpAktual || ticket.odp || '-',
          ticket.port || ticket.portOdp || '-',
          ticket.petugas || '-',
          ticket.status || 'OPEN',
          ticket.timestamp || '-',
          ttrVal || '-'
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 25 },
        { wch: 22 },
        { wch: 8 },
        { wch: 18 },
        { wch: 12 },
        { wch: 20 },
        { wch: 14 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rincian Gangguan');
      const cleanStation = String(selectedCell.station).replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(wb, `Rincian_Gangguan_${cleanStation}_${selectedCell.date}.xlsx`);
    } catch (err) {
      console.error('Gagal export excel modal:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col mb-6">
      {/* HEADER CARD KALENDER */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
            <Icon name="calendar" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Rekap Gangguan Harian per Stasiun
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Matriks sebaran gangguan harian untuk seluruh stasiun di sepanjang jalur operasional
            </p>
          </div>
        </div>

        {/* KONTROL BULAN, TAHUN & EKSPOR */}
        <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">
          {/* Total Bulan Terpilih */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-blue-600">{grandTotal}</span>
            <span className="text-[10px] text-slate-400 uppercase font-medium">Gangguan</span>
          </div>

          {/* Navigator Bulan */}
          <div className="inline-flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-1 shadow-inner">
            <button
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              <Icon name="chevron-left" size={16} />
            </button>

            {/* Dropdown Bulan */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 outline-none cursor-pointer hover:text-blue-600"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            {/* Dropdown Tahun */}
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 pr-1 py-1 outline-none cursor-pointer hover:text-blue-600"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>

          {/* Tombol Hari Ini / Bulan Ini */}
          <button
            onClick={handleTodayMonth}
            title="Kembali ke Bulan Berjalan"
            className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-xs"
          >
            Bulan Ini
          </button>

          {/* Tombol Export Excel */}
          <button
            onClick={handleExportExcel}
            title="Unduh tabel ke format Excel (.xlsx)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-xs"
          >
            <Icon name="file-spreadsheet" size={14} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* PETUNJUK & LEGEND INTENSITAS GANGGUAN */}
      <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Icon name="info" size={13} className="text-slate-400" />
          <span>Geser tabel ke kanan untuk melihat tanggal hingga akhir bulan.</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-amber-50 border border-amber-200 text-amber-700 inline-flex items-center justify-center text-[9px] font-bold">1</span>
            <span className="text-[10px]">1 Tiket</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-300 text-orange-800 inline-flex items-center justify-center text-[9px] font-bold">2</span>
            <span className="text-[10px]">2 Tiket</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-700 inline-flex items-center justify-center text-[9px] font-bold">≥3</span>
            <span className="text-[10px]">≥3 Tiket (Lonjakan)</span>
          </div>
          <span className="text-[10px] text-slate-400 italic">| Klik angka untuk rincian</span>
        </div>
      </div>

      {/* WADAH TABEL (SCROLLABLE & STICKY COLUMN) */}
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto relative">
        {/* VISUALISASI GRAFIK BATANG SAMAR DI BACKGROUND TABEL */}
        <svg
          className="absolute top-0 left-0 pointer-events-none select-none z-0"
          style={{
            width: `${bgChartData.totalTableWidth}px`,
            height: `${bgChartData.yBaseline + 42}px`
          }}
          aria-hidden="true"
        >
          <defs>
            {/* Gradient untuk Bar Harian Standar */}
            <linearGradient id="bgBarGradGangguan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.16" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.02" />
            </linearGradient>

            {/* Gradient untuk Bar Hari Ini */}
            <linearGradient id="bgBarTodayGradGangguan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Batang Kolom Samar Tiap Hari */}
          {bgChartData.bars.map((bar) => {
            if (bar.barHeight <= 0) return null;
            return (
              <rect
                key={bar.day}
                x={bar.barX}
                y={bar.barY}
                width={bar.barWidth}
                height={bar.barHeight}
                rx={4}
                fill={bar.isToday ? 'url(#bgBarTodayGradGangguan)' : 'url(#bgBarGradGangguan)'}
              />
            );
          })}
        </svg>

        <table
          className="w-full text-left border-collapse text-xs whitespace-nowrap relative z-10"
          style={{ width: `${bgChartData.totalTableWidth}px`, minWidth: `${bgChartData.totalTableWidth}px` }}
        >
          {/* KOLOM LEBAR PASTI */}
          <colgroup>
            <col style={{ width: '170px', minWidth: '170px' }} />
            {daysList.map(d => (
              <col key={d.day} style={{ width: '42px', minWidth: '42px' }} />
            ))}
            <col style={{ width: '70px', minWidth: '70px' }} />
          </colgroup>

          {/* HEADER ROW */}
          <thead>
            <tr className="h-[44px]">
              {/* Kolom Stasiun (FROZEN / STICKY LEFT) */}
              <th className="sticky left-0 top-0 z-30 bg-slate-100 text-slate-700 font-bold px-4 py-3 min-w-[170px] max-w-[170px] border-b border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between">
                  <span>STASIUN</span>
                  <span className="text-[9px] font-normal text-slate-400 uppercase tracking-widest">(11 ST)</span>
                </div>
              </th>

              {/* Kolom Tanggal 1 s/d Akhir Bulan */}
              {daysList.map(d => {
                const isSun = d.isSunday;
                const isSat = d.isSaturday;
                return (
                  <th
                    key={d.day}
                    className={`sticky top-0 z-20 px-0.5 py-2 w-[42px] min-w-[42px] max-w-[42px] text-center border-b border-r border-slate-200 transition-colors select-none ${
                      d.isToday
                        ? 'bg-blue-600 text-white font-black'
                        : isSun
                          ? 'bg-rose-50/80 text-rose-600 font-bold'
                          : isSat
                            ? 'bg-amber-50/70 text-amber-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 font-semibold'
                    }`}
                    title={`${d.dayName}, ${d.day} ${MONTH_NAMES[currentMonth]} ${currentYear}${d.isToday ? ' (Hari Ini)' : ''}`}
                  >
                    <div className="text-[11px] leading-tight font-bold">{d.day}</div>
                    <div className={`text-[8px] uppercase tracking-wider ${d.isToday ? 'text-blue-100' : 'text-slate-400'}`}>
                      {d.dayName}
                    </div>
                  </th>
                );
              })}

              {/* Kolom Total Stasiun (STICKY RIGHT - SOLID OPAQUE) */}
              <th
                className="sticky right-0 top-0 z-30 bg-[#eff6ff] text-blue-900 font-extrabold px-3 py-3 min-w-[70px] max-w-[70px] text-center border-l-2 border-blue-200"
                style={{
                  boxShadow: 'inset 0 -1px 0 #cbd5e1, -4px 0 6px -2px rgba(0,0,0,0.1)'
                }}
              >
                TOTAL
              </th>
            </tr>
          </thead>

          {/* BODY ROWS (STASIUN WADU S/D KRENGSENG) */}
          <tbody className="divide-y divide-slate-100">
            {STATIONS_ORDER.map((st, sIdx) => {
              const rowTotal = stationTotals[st] || 0;
              return (
                <tr key={st} className="group hover:bg-slate-50/80 transition-colors h-[36px]">
                  {/* KOLOM STASIUN (FROZEN / STICKY LEFT) */}
                  <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2 min-w-[170px] max-w-[170px] border-b border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-700" title={st}>
                          {st}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* KOLOM TANGGAL 1 s/d Akhir Bulan */}
                  {daysList.map(d => {
                    const tickets = matrixData[st]?.[d.dateStr] || [];
                    const count = tickets.length;
                    return (
                      <td
                        key={d.day}
                        className={`text-center p-0.5 w-[42px] min-w-[42px] max-w-[42px] border-b border-r border-slate-100/90 transition-colors ${
                          d.isToday ? 'bg-blue-50/20' : d.isWeekend ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        {count > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCell({
                              station: st,
                              date: d.dateStr,
                              dayName: d.dayName,
                              dayNumber: d.day,
                              items: tickets
                            })}
                            className={`w-7 h-7 inline-flex items-center justify-center rounded-lg text-[11px] transition-all cursor-pointer ${getBadgeStyle(count)}`}
                            title={`${st} - ${d.day} ${MONTH_NAMES[currentMonth]}: ${count} gangguan (Klik untuk rincian)`}
                          >
                            {count}
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px] select-none">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* TOTAL BARIS STASIUN (STICKY RIGHT) */}
                  <td
                    className="sticky right-0 z-20 bg-[#eff6ff] group-hover:bg-[#dbeafe] font-bold text-blue-800 text-center px-3 py-2 min-w-[70px] max-w-[70px] border-l-2 border-blue-200 transition-colors"
                    style={{
                      boxShadow: 'inset 0 -1px 0 #cbd5e1, -4px 0 6px -2px rgba(0,0,0,0.08)'
                    }}
                  >
                    <span className={rowTotal > 0 ? 'text-blue-700 font-black' : 'text-slate-400'}>
                      {rowTotal}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* FOOTER ROW: TOTAL HARIAN (STICKY BOTTOM) */}
          <tfoot>
            <tr className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-slate-300 font-bold h-[42px]">
              {/* CELL TOTAL HARIAN (STICKY LEFT & BOTTOM) */}
              <td className="sticky left-0 bottom-0 z-40 bg-slate-200 text-slate-800 px-4 py-2 min-w-[170px] max-w-[170px] border-r border-slate-300 font-black text-xs shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                TOTAL HARIAN
              </td>

              {/* KOLOM TANGGAL TOTAL */}
              {daysList.map(d => {
                const dayCount = dailyTotals[d.dateStr] || 0;
                return (
                  <td
                    key={d.day}
                    className={`text-center py-2 px-0.5 w-[42px] min-w-[42px] max-w-[42px] border-r border-slate-200 text-[11px] font-black ${
                      d.isToday ? 'bg-blue-100/90 text-blue-900' : 'bg-slate-100 text-slate-700'
                    }`}
                    title={`Total Seluruh Stasiun (${d.day} ${MONTH_NAMES[currentMonth]}): ${dayCount}`}
                  >
                    {dayCount > 0 ? (
                      <span className="text-slate-900 font-bold leading-tight">{dayCount}</span>
                    ) : (
                      <span className="text-slate-400 font-normal leading-tight">-</span>
                    )}
                  </td>
                );
              })}

              {/* GRAND TOTAL CELL (STICKY RIGHT & BOTTOM) */}
              <td className="sticky right-0 bottom-0 z-40 bg-blue-600 text-white text-center py-2.5 px-3 min-w-[70px] max-w-[70px] font-black text-xs sm:text-sm border-l border-blue-700 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.18)]">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER STATS INFO */}
      <div className="p-3 sm:px-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            Total Bulan Ini: <strong className="text-slate-800">{grandTotal} Gangguan</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Rata-rata: <strong className="text-slate-800">{(grandTotal / daysInMonth).toFixed(1)} / hari</strong>
          </span>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          *Data bersumber dari tiket visit gangguan pada stasiun terkait.
        </div>
      </div>

      {/* MODAL POPUP RINCIAN TIKET GANGGUAN (PORTAL KE BODY DENGAN TABEL ENTERPRISE & BACKDROP BLUR PENUH) */}
      {selectedCell && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6">
          {/* Backdrop Blur Menyeluruh ke Seluruh Halaman (Sidebar, Header & Konten) */}
          <div
            className="fixed inset-0 bg-slate-950/75 animate-fade"
            onClick={() => {
              setSelectedCell(null);
              setSearchQuery('');
            }}
          />

          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl xl:max-w-[85vw] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] relative z-10 animate-modal">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Icon name="alert-triangle" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-800">
                      Rincian Gangguan: {selectedCell.station}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {selectedCell.dayName}, {selectedCell.dayNumber} {MONTH_NAMES[currentMonth]} {currentYear}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span>
                      Total Tiket: <strong className="text-slate-800 font-bold">{selectedCell.items.length} Gangguan</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Selesai: <strong className="text-emerald-700 font-bold">{statsModal.selesai}</strong>
                    </span>
                    {statsModal.open > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>
                          Belum Selesai: <strong className="text-rose-600 font-bold">{statsModal.open}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onFilterTicketList && (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterTicketList(selectedCell.station, selectedCell.date);
                      setSelectedCell(null);
                      setSearchQuery('');
                    }}
                    title="Terapkan filter stasiun dan tanggal ke daftar tabel tiket utama"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Icon name="filter" size={14} />
                    <span>Filter di Tabel</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportModalExcel}
                  title="Unduh rincian tiket gangguan ini ke format Excel"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Icon name="file-spreadsheet" size={14} />
                  <span>Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCell(null);
                    setSearchQuery('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
            </div>

            {/* Modal Search Bar & Toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ID, nama, keluhan, ODP, atau petugas..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                />
                <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                  <Icon name="search" size={14} />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                {onFilterTicketList && (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterTicketList(selectedCell.station, selectedCell.date);
                      setSelectedCell(null);
                      setSearchQuery('');
                    }}
                    className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 rounded-xl cursor-pointer"
                  >
                    <Icon name="filter" size={13} />
                    <span>Filter di Tabel</span>
                  </button>
                )}
                <div className="text-xs text-slate-500 font-medium">
                  Menampilkan <strong className="text-slate-800 font-bold">{filteredModalItems.length}</strong> dari {selectedCell.items.length} tiket
                </div>
              </div>
            </div>

            {/* Modal Body: Tabel Data Tiket Gangguan Resmi (Fit 100% tanpa scroll horizontal) */}
            <div className="overflow-y-auto max-h-[56vh] flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-2.5 text-center w-10">NO</th>
                    <th className="px-3 py-2.5 w-24">ID</th>
                    <th className="px-3 py-2.5 min-w-[130px]">NAMA PELANGGAN</th>
                    <th className="px-3 py-2.5 min-w-[170px]">KELUHAN & TINDAKAN</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">ODP / PORT</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">PETUGAS</th>
                    <th className="px-2.5 py-2.5 text-center w-24 whitespace-nowrap">STATUS</th>
                    <th className="px-3 py-2.5 text-right w-28 whitespace-nowrap">WAKTU & TTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModalItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                        <p className="font-medium">Tidak ada tiket gangguan yang cocok dengan kata kunci pencarian.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredModalItems.map((ticket, idx) => {
                      const isDone = ['DONE', 'SELESAI', 'CLOSED', 'CLOSE'].includes(String(ticket.status || '').toUpperCase());
                      const cleanTindakan = getCleanTindakan(ticket.tindakan || ticket.perbaikan || ticket.tindakan_perbaikan);
                      const ttrString = ticket.ttr || (isDone ? calculateTTR(ticket.timestampOpen || ticket.timestamp, ticket.waktuClose || ticket.waktuSelesai || ticket.closedAt || ticket.timestampClose) : null);

                      let displayTime = '';
                      if (ticket.timestamp) {
                        const str = String(ticket.timestamp);
                        if (str.includes(' ')) {
                          displayTime = str.split(' ')[1].substring(0, 5) + ' WIB';
                        } else if (str.includes('T')) {
                          displayTime = str.split('T')[1].substring(0, 5) + ' WIB';
                        } else {
                          displayTime = str;
                        }
                      }

                      return (
                        <tr key={ticket.idPelanggan || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-2.5 py-2.5 text-center text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {ticket.idPelanggan || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800 leading-tight">
                              {ticket.namaPelanggan || 'Tanpa Nama'}
                            </div>
                            {ticket.nomorHp && (
                              <div className="text-[10.5px] text-slate-400 font-normal mt-0.5">
                                {ticket.nomorHp}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {/* Baris Atas: Keluhan */}
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[9.5px] uppercase tracking-wider rounded border border-rose-200 mb-1">
                              <Icon name="alert-triangle" size={10} />
                              <span>{ticket.keluhan || 'Gangguan'}</span>
                            </div>

                            {/* Baris Bawah: Tindakan */}
                            {cleanTindakan ? (
                              <div className="flex items-center gap-2 text-[11px] text-emerald-900 bg-emerald-50/90 px-2 py-1 rounded border border-emerald-200/80 leading-tight break-words">
                                <span className="w-[58px] py-0.5 text-center text-[8.5px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 bg-emerald-100/80 border border-emerald-200 rounded">
                                  Tindakan
                                </span>
                                <span className="font-semibold text-emerald-950 flex-1">
                                  {cleanTindakan}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic mt-0.5">
                                Belum ada tindakan
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {(ticket.kodeOdp || ticket.odpAktual || ticket.odp) ? (
                              <div className="font-mono text-xs">
                                <span className="font-bold text-blue-700">
                                  {ticket.kodeOdp || ticket.odpAktual || ticket.odp}
                                </span>
                                {(ticket.port || ticket.portOdp) && (
                                  <span className="text-slate-400 font-sans ml-1 text-[10.5px]">
                                    (P.{ticket.port || ticket.portOdp})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {ticket.petugas ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 inline-flex items-center gap-1">
                                @{String(ticket.petugas).replace(/^@/, '')}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                            {isDone ? (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Icon name="check" size={10} /> SELESAI
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                <Icon name="clock" size={10} /> AKTIF
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="text-[11px] text-slate-700 font-mono font-bold">
                              {displayTime || '-'}
                            </div>
                            {ttrString ? (
                              <div
                                className="inline-flex items-center gap-1 mt-0.5 text-[9.5px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-1.5 py-0.5 rounded font-sans tracking-tight"
                                title={`Durasi Penanganan (TTR): ${ttrString}`}
                              >
                                <Icon name="clock" size={9} className="text-emerald-600" />
                                <span>TTR: {ttrString}</span>
                              </div>
                            ) : (
                              !isDone ? (
                                <span className="inline-block mt-0.5 text-[9.5px] text-amber-600 font-bold font-sans">
                                  Dalam Proses
                                </span>
                              ) : null
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span>Stasiun: <strong className="text-slate-700 font-bold">{selectedCell.station}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Total: <strong className="text-blue-600 font-bold">{selectedCell.items.length} Tiket</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportModalExcel}
                  className="sm:hidden px-3 py-1.5 rounded-xl font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs cursor-pointer"
                >
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCell(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
