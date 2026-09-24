import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Plus, 
  Edit3, 
  Search, 
  Train, 
  Layers, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { toProperCase, isPercepatanCustomer } from '../utils';
import { CustomerStatusDrilldownModal } from './CustomerStatusDrilldownModal';
import { ManagePoFormModal } from './ManagePoFormModal';

export const cleanTahapStr = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const matchCustomerToPo = (po, cust, odpData = []) => {
  if (!po || !cust) return false;
  
  // 1. Coba pencocokan akurat berdasarkan no_po_release (jika data pelanggan memilikinya)
  const cPo = String(cust.no_po_release || cust.noPoRelease || cust.noPo || '').trim().toUpperCase();
  const pPo = String(po.no_po_release || po.noPoRelease || '').trim().toUpperCase();
  
  if (cPo && pPo) {
    if (cPo === pPo) return true;
    // Jika pelanggan PUNYA no_po_release, tapi tidak cocok dengan PO ini, berarti BUKAN milik PO ini!
    return false;
  }
  
  // 2. Ambil Tahap Pembangunan PELANGGAN (Prioritas: Dari tabel ODP)
  let cTahapRaw = cust.tahapPembangunan || cust.tahap_pembangunan || '';
  if (cust.odp && odpData && odpData.length > 0) {
    const custOdpClean = String(cust.odp).trim().toUpperCase();
    const matchedOdp = odpData.find(o => String(o.nama_odp || o.namaOdp || '').trim().toUpperCase() === custOdpClean);
    if (matchedOdp && (matchedOdp.tahap_pembangunan || matchedOdp.tahapPembangunan)) {
      cTahapRaw = matchedOdp.tahap_pembangunan || matchedOdp.tahapPembangunan;
    }
  }
  
  // 3. Pencocokan fuzzy legacy berdasarkan tahap_pembangunan (fallback)
  const pTahap = cleanTahapStr(po.tahapPembangunan || po.hpByPo || po.segmen || '');
  const cTahap = cleanTahapStr(cTahapRaw);
  
  if (cTahap && pTahap) {
    if (cTahap === pTahap) return true;
    
    const pNum = pTahap.replace(/[^0-9]/g, '');
    const cNum = cTahap.replace(/[^0-9]/g, '');
    if (pNum && cNum && pNum === cNum) return true;
    
    // Mapping Tahap reguler: 'tahap1' -> 'reguler512' (atau 512 tanpa sufiks a/b/c)
    if (cTahap === 'tahap1' && (pTahap.includes('512') && !pTahap.includes('512a') && !pTahap.includes('512b') && !pTahap.includes('512c') || pTahap.includes('tahap1'))) return true;
    if (cTahap === 'tahap2' && (pTahap.includes('512a') || pTahap.includes('tahap2'))) return true;
    if (cTahap === 'tahap3' && (pTahap.includes('512b') || pTahap.includes('tahap3'))) return true;
    if (cTahap === 'tahap4' && (pTahap.includes('512c') || pTahap.includes('tahap4'))) return true;
    
    // Penanganan khusus kata "handover" agar tidak menimpa PO yang berbeda
    const isCHandover = cTahap.includes('handover');
    const isPHandover = pTahap.includes('handover');
    
    if (isCHandover && isPHandover) {
      if (cTahap === pTahap) return true;
      if (pNum && cNum && pNum === cNum) return true;
      // Jika ODP hanya ditulis "handover" tanpa keterangan lain, ia HANYA cocok dengan PO yang tahapnya murni "handover"
      if (cTahap === 'handover' && pTahap !== 'handover') return false;
      if (pTahap === 'handover' && cTahap !== 'handover') return false;
      // Jika keduanya punya ekstra string tapi tidak sama (contoh: handover1920 vs handover512), jangan di-match!
      return false;
    }

    // Fallback string matching jika BUKAN handover
    if (!isCHandover && !isPHandover) {
      if (pTahap.includes(cTahap) || cTahap.includes(pTahap)) return true;
    }
  }
  return false;
};

export const PoReleaseModal = ({
  isOpen,
  onClose,
  stasiun,
  detailPoList = [],
  pelangganData = [],
  odpData = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'REGULER' | 'PERCEPATAN'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drill-down State
  const [drilldownStatus, setDrilldownStatus] = useState(null); // 'AKTIF' | 'SUSPEND' | 'READY TO DISMANTLE' | 'DISMANTLED' | 'ALL_AKTIVASI'
  const [drilldownPo, setDrilldownPo] = useState(null);

  // Manage PO State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState(null);

  // Pelanggan yang stasiunnya cocok dengan modal ini
  const matchedStationCusts = useMemo(() => {
    if (!stasiun) return [];
    let targetSt = String(stasiun).toLowerCase().trim();
    if (targetSt === 'tawang') targetSt = 'semarang tawang';

    return (pelangganData || []).filter(p => {
      let st = String(p.stasiun || '').trim().toLowerCase();
      if (st === 'tawang') st = 'semarang tawang';
      return st === targetSt || targetSt.includes(st) || st.includes(targetSt);
    });
  }, [pelangganData, stasiun]);

  // Filtered PO List dari tab dan search
  const filteredList = useMemo(() => {
    return (detailPoList || []).filter(po => {
      const seg = String(po.segmen || po.hpByPo || po.tahapPembangunan || '').toLowerCase();
      if (activeTab === 'REGULER' && !seg.includes('reguler')) return false;
      if (activeTab === 'PERCEPATAN' && !seg.includes('percepatan')) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const noPo = String(po.noPoRelease || '').toLowerCase();
        const jenis = String(po.jenisPo || '').toLowerCase();
        const tahap = String(po.tahapPembangunan || '').toLowerCase();
        return noPo.includes(term) || jenis.includes(term) || tahap.includes(term);
      }
      return true;
    });
  }, [detailPoList, activeTab, searchTerm]);

  // Kalkulasi data HC dinamis untuk setiap baris PO
  const poCalculatedList = useMemo(() => {
    return filteredList.map(po => {
      const hpReg = Number(po.hpReguler || 0);
      const hpPerc = Number(po.hpPercepatan || 0);
      const totHp = hpReg + hpPerc;

      // 1. Cari pelanggan aktual yang match dengan PO ini
      const poCustomers = matchedStationCusts.filter(c => matchCustomerToPo(po, c, odpData));

      let totAkt = 0;
      let hcAkt = 0;
      let susp = 0;
      let ready = 0;
      let dism = 0;

      if (poCustomers.length > 0) {
        poCustomers.forEach(c => {
          const akt = String(c.status_aktivasi || c.aktivasi || c.statusAktivasi || '').trim().toUpperCase();
          const ikr = String(c.status_ikr || c.ikr || c.statusIkr || '').trim().toUpperCase();

          const isAktif = akt === 'AKTIF' || akt === 'SUDAH';
          const isSuspend = akt === 'SUSPEND';
          const isReady = akt === 'READY TO DISMANTLE';
          const isDis = akt === 'DISMANTLED' || akt === 'DISMANTLE';
          const isAktivasi = isAktif || isSuspend || isReady || isDis || ikr === 'SUDAH';

          if (isSuspend) susp++;
          if (isReady) ready++;
          if (isDis) dism++;
          if (isAktivasi) {
            totAkt++;
            if (isAktif) hcAkt++;
          }
        });
      } else {
        // Fallback ke data tersimpan di record PO jika pelangganData belum selesai load di latar belakang
        totAkt = Number(po.totalAktivasiHc || 0);
        hcAkt = Number(po.hcAktif || 0);
        susp = Number(po.suspend || 0);
        ready = Number(po.readyToDismantle || 0);
        dism = Number(po.dismantled || 0);
      }

      const perf = totHp > 0 ? parseFloat(((totAkt / totHp) * 100).toFixed(2)) : (Number(po.performaHc) || 0);

      return {
        ...po,
        hpReg,
        hpPerc,
        totHp,
        totAkt,
        hcAkt,
        susp,
        ready,
        dism,
        perf,
        poCustomers
      };
    });
  }, [filteredList, matchedStationCusts]);

  // Overall Station Totals from POs and actual live customers
  const stationStats = useMemo(() => {
    let sumHpReg = 0;
    let sumHpPerc = 0;

    (detailPoList || []).forEach(po => {
      sumHpReg += Number(po.hpReguler || 0);
      sumHpPerc += Number(po.hpPercepatan || 0);
    });

    const totalHp = sumHpReg + sumHpPerc;

    let sumTotAkt = 0;
    let sumHcAktif = 0;
    let sumSuspend = 0;
    let sumReady = 0;
    let sumDismantled = 0;

    if (matchedStationCusts.length > 0) {
      matchedStationCusts.forEach(p => {
        const akt = String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').trim().toUpperCase();
        const ikr = String(p.status_ikr || p.ikr || p.statusIkr || '').trim().toUpperCase();

        const isAktif = akt === 'AKTIF' || akt === 'SUDAH';
        const isSuspend = akt === 'SUSPEND';
        const isReady = akt === 'READY TO DISMANTLE';
        const isDis = akt === 'DISMANTLED' || akt === 'DISMANTLE';
        const isAktivasi = isAktif || isSuspend || isReady || isDis || ikr === 'SUDAH';

        if (isSuspend) sumSuspend++;
        if (isReady) sumReady++;
        if (isDis) sumDismantled++;
        if (isAktivasi) {
          sumTotAkt++;
          if (isAktif) sumHcAktif++;
        }
      });
    }

    // Fallback jika pelangganData belum ter-load sama sekali (masih proses background sync)
    if (sumTotAkt === 0 && (detailPoList || []).length > 0) {
      detailPoList.forEach(po => {
        sumTotAkt += Number(po.totalAktivasiHc || 0);
        sumHcAktif += Number(po.hcAktif || 0);
        sumSuspend += Number(po.suspend || 0);
        sumReady += Number(po.readyToDismantle || 0);
        sumDismantled += Number(po.dismantled || 0);
      });
    }

    const takeUpRate = totalHp > 0 ? ((sumTotAkt / totalHp) * 100).toFixed(2) : 0;

    return {
      sumHpReg,
      sumHpPerc,
      totalHp,
      sumTotAkt,
      sumHcAktif,
      sumSuspend,
      sumReady,
      sumDismantled,
      takeUpRate
    };
  }, [detailPoList, matchedStationCusts]);

  // Customers of this station for drill-down modal
  const stationCustomersForStatus = useMemo(() => {
    if (!drilldownStatus || !stasiun) return [];

    // Jika drilldown dari baris PO tertentu, filter pelanggan milik PO tersebut
    let baseList = matchedStationCusts;
    if (drilldownPo) {
      const poMatched = matchedStationCusts.filter(c => matchCustomerToPo(drilldownPo, c, odpData));
      if (poMatched.length > 0) {
        baseList = poMatched;
      }
    }

    return baseList.filter(p => {
      const akt = String(p.status_aktivasi || p.aktivasi || p.statusAktivasi || '').trim().toUpperCase();
      const ikr = String(p.status_ikr || p.ikr || p.statusIkr || '').trim().toUpperCase();

      if (drilldownStatus === 'ALL_AKTIVASI') {
        return akt === 'AKTIF' || akt === 'SUDAH' || akt === 'SUSPEND' || akt === 'READY TO DISMANTLE' || akt === 'DISMANTLED' || ikr === 'SUDAH';
      }
      if (drilldownStatus === 'AKTIF') {
        return akt === 'AKTIF' || akt === 'SUDAH';
      }
      if (drilldownStatus === 'SUSPEND') {
        return akt === 'SUSPEND';
      }
      if (drilldownStatus === 'READY TO DISMANTLE') {
        return akt === 'READY TO DISMANTLE';
      }
      if (drilldownStatus === 'DISMANTLED') {
        return akt === 'DISMANTLED' || akt === 'DISMANTLE';
      }
      return false;
    });
  }, [matchedStationCusts, drilldownStatus, drilldownPo, stasiun]);

  const handleOpenAdd = () => {
    setPoToEdit(null);
    setIsManageModalOpen(true);
  };

  const handleOpenEdit = (po) => {
    setPoToEdit(po);
    setIsManageModalOpen(true);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm animate-fade" 
        onClick={onClose} 
      />

      {/* Main Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative z-10 animate-modal flex flex-col max-h-[88vh] sm:max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/80 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Train size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight">
                  Detail PO Release - {toProperCase(stasiun)}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">
                  {detailPoList.length} PO Terdaftar
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Data real-time Supabase. Klik pada angka status untuk melihat daftar pelanggan.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>+ Tambah PO Release</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-200/70 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Station KPI Highlight Strip */}
        <div className="bg-slate-50/90 border-b border-slate-100 p-3 sm:p-4 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-xs">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Total Homepass</span>
              <span className="text-sm sm:text-base font-black text-slate-800">{stationStats.totalHp.toLocaleString('id-ID')} HP</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Reg: {stationStats.sumHpReg} • Perc: {stationStats.sumHpPerc}</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-xs">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Take-Up Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-blue-600">{stationStats.takeUpRate}%</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${Number(stationStats.takeUpRate) >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                  {Number(stationStats.takeUpRate) >= 50 ? 'High' : 'Growth'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(stationStats.takeUpRate, 100)}%` }} />
              </div>
            </div>

            <div 
              onClick={() => { setDrilldownPo(null); setDrilldownStatus('ALL_AKTIVASI'); }}
              className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
              title="Klik untuk lihat semua pelanggan aktivasi stasiun ini"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase block">Total Aktivasi</span>
                <ExternalLink size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm sm:text-base font-black text-blue-700">{stationStats.sumTotAkt.toLocaleString('id-ID')} HC</span>
              <span className="text-[9px] text-blue-500 font-semibold block mt-0.5 group-hover:underline">Lihat Pelanggan →</span>
            </div>

            <div 
              onClick={() => { setDrilldownPo(null); setDrilldownStatus('AKTIF'); }}
              className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
              title="Klik untuk lihat pelanggan HC Aktif stasiun ini"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase block">HC Aktif</span>
                <ExternalLink size={10} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm sm:text-base font-black text-emerald-700">{stationStats.sumHcAktif.toLocaleString('id-ID')} HC</span>
              <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5 group-hover:underline">Lihat Pelanggan →</span>
            </div>

            <div 
              onClick={() => { setDrilldownPo(null); setDrilldownStatus('SUSPEND'); }}
              className="bg-white p-2.5 rounded-xl border border-orange-100 shadow-xs hover:border-orange-300 transition-all cursor-pointer group"
              title="Klik untuk lihat pelanggan Suspend stasiun ini"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-orange-600 uppercase block">Suspend</span>
                <ExternalLink size={10} className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm sm:text-base font-black text-orange-700">{stationStats.sumSuspend.toLocaleString('id-ID')}</span>
              <span className="text-[9px] text-orange-600 font-semibold block mt-0.5 group-hover:underline">Lihat Pelanggan →</span>
            </div>

            <div 
              onClick={() => { setDrilldownPo(null); setDrilldownStatus('READY TO DISMANTLE'); }}
              className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
              title="Klik untuk lihat pelanggan Ready to Dismantle stasiun ini"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase block">Ready Dismantle</span>
                <ExternalLink size={10} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm sm:text-base font-black text-amber-700">{stationStats.sumReady.toLocaleString('id-ID')}</span>
              <span className="text-[9px] text-amber-600 font-semibold block mt-0.5 group-hover:underline">Lihat Pelanggan →</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Segment Tabs & Search */}
        <div className="px-3 sm:px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semua ({detailPoList.length})
            </button>
            <button
              onClick={() => setActiveTab('REGULER')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === 'REGULER' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Reguler
            </button>
            <button
              onClick={() => setActiveTab('PERCEPATAN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTab === 'PERCEPATAN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Percepatan
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari No PO / Tahap..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-slate-50/40">
          {poCalculatedList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <Layers size={40} className="opacity-30 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada data PO Release yang cocok</p>
              <button
                onClick={handleOpenAdd}
                className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
              >
                + Tambah PO Pertama Untuk Stasiun Ini
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">NO</th>
                      <th className="px-3 py-2.5">NO PO RELEASE</th>
                      <th className="px-3 py-2.5 text-center">JENIS PO</th>
                      <th className="px-3 py-2.5 text-center">TAHAP</th>
                      <th className="px-3 py-2.5 text-center bg-slate-100/50">HP REGULER</th>
                      <th className="px-3 py-2.5 text-center bg-slate-100/50 border-r border-slate-200/60">HP PERCEPATAN</th>
                      <th className="px-3 py-2.5 text-center bg-blue-50/60 text-blue-700">TOTAL AKTIVASI</th>
                      <th className="px-3 py-2.5 text-center bg-emerald-50/60 text-emerald-700">HC AKTIF</th>
                      <th className="px-3 py-2.5 text-center bg-orange-50/60 text-orange-700">SUSPEND</th>
                      <th className="px-3 py-2.5 text-center bg-amber-50/60 text-amber-700">READY DISMANTLE</th>
                      <th className="px-3 py-2.5 text-center bg-rose-50/60 text-rose-700 border-r border-slate-200/60">DISMANTLED</th>
                      <th className="px-3 py-2.5 text-center">PERFORMA HC</th>
                      <th className="px-3 py-2.5 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poCalculatedList.map((po, idx) => {
                      const noPo = po.noPoRelease || '-';
                      const jenis = po.jenisPo || 'Direct';
                      const tahap = po.tahapPembangunan || po.hpByPo || '-';
                      const hpReg = Number(po.hpReguler || 0);
                      const hpPerc = Number(po.hpPercepatan || 0);
                      const totAkt = Number(po.totAkt || 0);
                      const hcAkt = Number(po.hcAkt || 0);
                      const susp = Number(po.susp || 0);
                      const ready = Number(po.ready || 0);
                      const dism = Number(po.dism || 0);
                      const perf = po.perf || 0;

                      return (
                        <tr key={po.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-800">
                            {noPo}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {jenis}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium text-slate-600">
                            {tahap}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700 bg-slate-50/30">
                            {hpReg.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700 bg-slate-50/30 border-r border-slate-100">
                            {hpPerc.toLocaleString('id-ID')}
                          </td>
                          
                          {/* Total Aktivasi - Clickable Badge */}
                          <td className="px-3 py-2.5 text-center bg-blue-50/20">
                            <button
                              onClick={() => { setDrilldownPo(po); setDrilldownStatus('ALL_AKTIVASI'); }}
                              className="px-2 py-0.5 rounded-md font-black text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/50 cursor-pointer shadow-2xs"
                              title="Klik untuk lihat daftar pelanggan aktivasi PO ini"
                            >
                              {totAkt.toLocaleString('id-ID')}
                            </button>
                          </td>

                          {/* HC Aktif - Clickable Badge */}
                          <td className="px-3 py-2.5 text-center bg-emerald-50/20">
                            <button
                              onClick={() => { setDrilldownPo(po); setDrilldownStatus('AKTIF'); }}
                              className="px-2 py-0.5 rounded-md font-black text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/50 cursor-pointer shadow-2xs"
                              title="Klik untuk lihat pelanggan HC Aktif PO ini"
                            >
                              {hcAkt.toLocaleString('id-ID')}
                            </button>
                          </td>

                          {/* Suspend - Clickable Badge */}
                          <td className="px-3 py-2.5 text-center bg-orange-50/20">
                            <button
                              onClick={() => { setDrilldownPo(po); setDrilldownStatus('SUSPEND'); }}
                              className="px-2 py-0.5 rounded-md font-bold text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200/50 cursor-pointer shadow-2xs"
                              title="Klik untuk lihat pelanggan Suspend PO ini"
                            >
                              {susp.toLocaleString('id-ID')}
                            </button>
                          </td>

                          {/* Ready Dismantle - Clickable Badge */}
                          <td className="px-3 py-2.5 text-center bg-amber-50/20">
                            <button
                              onClick={() => { setDrilldownPo(po); setDrilldownStatus('READY TO DISMANTLE'); }}
                              className="px-2 py-0.5 rounded-md font-medium text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200/50 cursor-pointer shadow-2xs"
                              title="Klik untuk lihat pelanggan Ready Dismantle PO ini"
                            >
                              {ready.toLocaleString('id-ID')}
                            </button>
                          </td>

                          {/* Dismantled - Clickable Badge */}
                          <td className="px-3 py-2.5 text-center bg-rose-50/20 border-r border-slate-100">
                            <button
                              onClick={() => { setDrilldownPo(po); setDrilldownStatus('DISMANTLED'); }}
                              className="px-2 py-0.5 rounded-md font-medium text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200/50 cursor-pointer shadow-2xs"
                              title="Klik untuk lihat pelanggan Dismantled PO ini"
                            >
                              {dism.toLocaleString('id-ID')}
                            </button>
                          </td>

                          {/* Performa */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className={`h-full ${perf >= 50 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                  style={{ width: `${Math.min(perf, 100)}%` }} 
                                />
                              </div>
                              <span className="text-[10px] font-black text-slate-700">{perf}%</span>
                            </div>
                          </td>

                          {/* Edit Action */}
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handleOpenEdit(po)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all border border-slate-200 cursor-pointer"
                              title="Edit data PO / update kapasitas homepass"
                            >
                              <Edit3 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Row */}
                    <tr className="bg-slate-50/90 font-black text-slate-800 border-t-2 border-slate-200">
                      <td className="px-3 py-3 text-center text-slate-400"></td>
                      <td colSpan={3} className="px-3 py-3 font-black text-slate-800">
                        TOTAL KESELURUHAN ({filteredList.length} PO)
                      </td>
                      <td className="px-3 py-3 text-center bg-slate-100/70 text-slate-800">
                        {stationStats.sumHpReg.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-slate-100/70 text-slate-800 border-r border-slate-200">
                        {stationStats.sumHpPerc.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-blue-50/60 text-blue-800">
                        {stationStats.sumTotAkt.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-emerald-50/60 text-emerald-800">
                        {stationStats.sumHcAktif.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-orange-50/60 text-orange-800">
                        {stationStats.sumSuspend.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-amber-50/60 text-amber-800">
                        {stationStats.sumReady.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center bg-rose-50/60 text-rose-800 border-r border-slate-200">
                        {stationStats.sumDismantled.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center text-blue-700">
                        {stationStats.takeUpRate}%
                      </td>
                      <td className="px-3 py-3 text-center"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Kapasitas Total: <strong className="text-slate-700">{stationStats.totalHp.toLocaleString('id-ID')} HP</strong> • Terisi: <strong className="text-blue-700">{stationStats.sumTotAkt.toLocaleString('id-ID')} HC ({stationStats.takeUpRate}%)</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Tutup Detail PO
          </button>
        </div>

      </div>

      {/* Customer Status Drilldown Modal */}
      <CustomerStatusDrilldownModal
        isOpen={Boolean(drilldownStatus)}
        onClose={() => { setDrilldownStatus(null); setDrilldownPo(null); }}
        stasiun={drilldownPo ? `${toProperCase(stasiun)} • ${drilldownPo.tahapPembangunan || drilldownPo.noPoRelease}` : toProperCase(stasiun)}
        statusType={drilldownStatus}
        customers={stationCustomersForStatus}
      />

      {/* Manage PO Form Modal (Add / Edit) */}
      <ManagePoFormModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        initialStation={stasiun}
        poToEdit={poToEdit}
        onSuccess={onRefresh}
      />
    </div>,
    document.body
  );
};
