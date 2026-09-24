import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Search, 
  User, 
  Phone, 
  MapPin, 
  Network, 
  Calendar, 
  ExternalLink,
  Users,
  Copy,
  Check
} from 'lucide-react';

export const CustomerStatusDrilldownModal = ({
  isOpen,
  onClose,
  stasiun,
  statusType, // 'AKTIF' | 'SUSPEND' | 'READY TO DISMANTLE' | 'DISMANTLED' | 'ALL_AKTIVASI'
  customers = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'AKTIF' || s === 'SUDAH') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">AKTIF</span>;
    }
    if (s === 'SUSPEND') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">SUSPEND</span>;
    }
    if (s === 'READY TO DISMANTLE') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">READY DISMANTLE</span>;
    }
    if (s === 'DISMANTLED' || s === 'DISMANTLE') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">DISMANTLED</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{status || '-'}</span>;
  };

  const statusTitle = useMemo(() => {
    switch (statusType) {
      case 'ALL_AKTIVASI': return 'Semua Pelanggan Total Aktivasi';
      case 'AKTIF': return 'Pelanggan HC Aktif';
      case 'SUSPEND': return 'Pelanggan Suspend (Isolir)';
      case 'READY TO DISMANTLE': return 'Pelanggan Ready to Dismantle';
      case 'DISMANTLED': return 'Pelanggan Dismantled';
      default: return 'Rincian Pelanggan';
    }
  }, [statusType]);

  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    if (!searchTerm.trim()) return customers;

    const term = searchTerm.toLowerCase();
    return customers.filter(c => {
      const nama = String(c.namaPelanggan || c.nama_pelanggan || '').toLowerCase();
      const id = String(c.idPelanggan || c.id_pelanggan || '').toLowerCase();
      const hp = String(c.nomorHp || c.nomor_hp || '').toLowerCase();
      const alamat = String(c.alamat || '').toLowerCase();
      const odp = String(c.odp || '').toLowerCase();
      return nama.includes(term) || id.includes(term) || hp.includes(term) || alamat.includes(term) || odp.includes(term);
    });
  }, [customers, searchTerm]);

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl xl:max-w-[85vw] relative z-10 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  {statusTitle} - Stasiun {stasiun}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                  {customers.length} pelanggan
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Daftar pelanggan terdaftar di stasiun {stasiun} dengan status {statusType}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar (Search) */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama, ID pelanggan, ODP, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline-block">
            Menampilkan {filteredCustomers.length} dari {customers.length} data
          </span>
        </div>

        {/* Table List */}
        <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-slate-50/30">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
              <Users size={40} className="opacity-30 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Tidak ada data pelanggan yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian Anda</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">No</th>
                      <th className="px-3 py-2.5">ID Pelanggan</th>
                      <th className="px-3 py-2.5">Nama Pelanggan</th>
                      <th className="px-3 py-2.5">Kontak / WA</th>
                      <th className="px-3 py-2.5">Alamat</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((p, idx) => {
                      const idPelanggan = p.idPelanggan || p.id_pelanggan || '-';
                      const nama = p.namaPelanggan || p.nama_pelanggan || '-';
                      const noHp = p.nomorHp || p.nomor_hp || '';
                      const rawHp = noHp.replace(/[^0-9]/g, '');
                      const waNumber = rawHp.startsWith('0') ? '62' + rawHp.slice(1) : (rawHp.startsWith('62') ? rawHp : '');
                      const odp = p.odp || '-';
                      const port = p.portOdp || p.port_odp || '';
                      const alamat = p.alamat || '-';
                      const statusAkt = p.aktivasi || p.statusAktivasi || p.status_aktivasi || statusType;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{idPelanggan}</span>
                              <button
                                onClick={() => handleCopy(idPelanggan, `id-${idx}`)}
                                className="text-slate-300 hover:text-blue-600 transition-colors"
                                title="Salin ID"
                              >
                                {copiedId === `id-${idx}` ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                            {nama}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {waNumber ? (
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors border border-emerald-200/50"
                              >
                                <Phone size={12} />
                                {noHp}
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px] max-w-[220px] truncate" title={alamat}>
                            {alamat}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {getStatusBadge(statusAkt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500">
            Total {filteredCustomers.length} pelanggan berstatus {statusType} di {stasiun}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
