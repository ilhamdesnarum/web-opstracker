import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { BROADCAST_OUTCOMES } from '../services/partnerBroadcastService';

function formatBroadcastDateTime(val) {
  if (!val) return '-';
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return str;
  const [, y, m, d, hh, mm] = match;
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthName = months[parseInt(m, 10)] || m;
  const timeStr = hh && mm ? `, ${hh}:${mm} WIB` : '';
  return `${parseInt(d, 10)} ${monthName} ${y}${timeStr}`;
}

function formatPhoneDisplay(val) {
  if (!val) return '-';
  let clean = String(val).replace(/\D/g, '');
  if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  if (clean.length >= 10) {
    return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return clean;
}

export default function BroadcastDetailModal({ isOpen, onClose, data }) {
  // Tangani tombol ESC dan kunci scroll latar belakang
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

  if (!isOpen || !data) return null;

  const { customer, broadcast } = data;
  const idPel = customer?.idPelanggan || customer?.id_pelanggan || '-';
  const namaPel = customer?.namaPelanggan || customer?.nama_pelanggan || broadcast?.name || 'Pelanggan';
  const rawPhone = customer?.nomorHp || customer?.telepon || broadcast?.phone || '';
  const cleanPhone = String(rawPhone).replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone.startsWith('62') ? cleanPhone : (cleanPhone.startsWith('8') ? '62' + cleanPhone : cleanPhone));
  const waLink = waPhone ? `https://wa.me/${waPhone}` : null;
  const phoneFormatted = formatPhoneDisplay(rawPhone);

  const outcomeInfo = BROADCAST_OUTCOMES[broadcast?.outcome] || BROADCAST_OUTCOMES.notag;
  const rooms = broadcast?.rooms || [];
  const latestFormattedDate = formatBroadcastDateTime(broadcast?.latestAt);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5">
      {/* BACKDROP SOLID (BEBAS EFEK BLUR / ANTI-SLOP) */}
      <div 
        className="fixed inset-0 bg-slate-950/75 transition-opacity" 
        onClick={onClose} 
      />

      {/* MODAL CARD (LEGA, RAPI & ELEGAN) */}
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="message-square" size={22} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Status Broadcast FTTH • CS Pusat Starlite
              </div>
              <div className="flex items-center gap-2.5 flex-wrap mt-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {namaPel}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${outcomeInfo.badgeClass}`}>
                  <Icon name={outcomeInfo.icon} size={11} className="inline mr-1.5 -mt-0.5" />
                  {outcomeInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5 flex-wrap">
                <span className="font-mono font-semibold bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {idPel}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-700">{phoneFormatted}</span>
                {customer?.stasiun && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-slate-700">Stasiun {customer.stasiun}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0 ml-3"
            title="Tutup Modal (ESC)"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* SUMMARY INFO BAR (LUAS, RAPI, DATA TIDAK AKAN PERNAH TERPOTONG) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* BOX 1: WAKTU & CHANNEL */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Waktu Broadcast Terakhir
              </span>
              <div className="text-sm font-bold text-slate-900 mt-2 font-mono">
                {latestFormattedDate}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Channel: <span className="font-semibold text-slate-700">{broadcast?.channel || 'Starlite Broadcast'}</span>
              </div>
            </div>

            {/* BOX 2: AGEN CS & KECEPATAN RESPON */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                CS Agen Pusat
              </span>
              <div className="text-sm font-bold text-slate-900 mt-2">
                {broadcast?.agent || 'CS Pusat'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                Respon Pertama: <span className="font-semibold text-slate-700">{broadcast?.firstResponseMinutes ? `${broadcast.firstResponseMinutes} menit` : 'Belum ada respon'}</span>
              </div>
            </div>

            {/* BOX 3: HASIL RESPON & TAG RESMI */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Hasil & Tag Resmi
              </span>
              <div className="text-sm font-bold text-slate-900 mt-2">
                {outcomeInfo.label}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">
                {broadcast?.tag ? (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 break-all inline-block">
                    {broadcast.tag}
                  </span>
                ) : (
                  <span className="italic text-slate-400">Tanpa tag khusus</span>
                )}
              </div>
            </div>
          </div>

          {/* REKOMENDASI TINDAKAN DESNARUM */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="info" size={13} />
              </div>
              <div className="text-xs text-amber-950 leading-relaxed">
                <span className="font-bold">Rekomendasi Tindakan Desnarum: </span>
                {broadcast?.outcome === 'lanjut' && (
                  <span>Pelanggan berminat melanjutkan langganan! Segera konfirmasi kesiapan pembayaran dan pandu pembayaran via <strong>starliteindonesia.com/payment-billing</strong> atau aplikasi Starlite.</span>
                )}
                {broadcast?.outcome === 'bayar' && (
                  <span>Pelanggan mengonfirmasi sudah bayar. Silakan verifikasi mutasi dan segera pastikan layanan internet aktif kembali.</span>
                )}
                {broadcast?.outcome === 'tidak' && (
                  <span>Pelanggan menyatakan tidak ingin lanjut berlangganan. Disarankan untuk segera menjadwalkan penarikan perangkat (Dismantle).</span>
                )}
                {broadcast?.outcome === 'norespon' && (
                  <span>Pelanggan belum merespons pesan broadcast dari CS Pusat. Coba hubungi via panggilan telepon langsung atau kirimkan reminder WhatsApp dari tim Desnarum.</span>
                )}
                {(!broadcast?.outcome || broadcast?.outcome === 'notag' || broadcast?.outcome === 'reminder') && (
                  <span>Broadcast telah terkirim ke WhatsApp pelanggan. Pantau perkembangan respon atau kirimkan reminder berkala dari Desnarum.</span>
                )}
              </div>
            </div>
          </div>

          {/* RIWAYAT LOG ROOM BROADCAST */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="history" size={13} className="text-slate-500" />
                <span>Riwayat Room Broadcast WhatsApp ({rooms.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Data real-time dari Vendor Management
              </span>
            </div>

            {rooms.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Tidak ada detail pesan broadcast tambahan.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Waktu Broadcast</th>
                        <th className="px-4 py-3 whitespace-nowrap">Channel</th>
                        <th className="px-4 py-3 whitespace-nowrap">CS Agen</th>
                        <th className="px-4 py-3">Tag WhatsApp</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Status Pengiriman</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rooms.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {formatBroadcastDateTime(rm.time || rm.date)}
                          </td>
                          <td className="px-4 py-3 text-slate-800 whitespace-nowrap font-medium">
                            {rm.channel || 'Starlite Broadcast'}
                          </td>
                          <td className="px-4 py-3 text-slate-900 whitespace-nowrap font-semibold">
                            {rm.agent || 'CS Pusat'}
                          </td>
                          <td className="px-4 py-3">
                            {rm.tag ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200 inline-block break-all">
                                {rm.tag}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rm.status === 'read' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              rm.status === 'delivered' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              rm.status === 'resolved' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {rm.status === 'read' ? 'Dibaca' : rm.status === 'delivered' ? 'Terkirim' : rm.status === 'resolved' ? 'Selesai (Resolved)' : (rm.status || 'Terkirim')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Terverifikasi melalui API Vendor Management Starlite
          </div>

          <div className="flex items-center gap-2.5">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs"
              >
                <Icon name="phone" size={13} />
                <span>Chat WhatsApp Pelanggan</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
