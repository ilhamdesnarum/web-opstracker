import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { supabase } from '../supabaseClient';

const STASIUN_OPTIONS = [
  'WDU', 'RBG', 'SL', 'KNN', 'BBG', 'ATA', 'SMT', 'KLN', 'KBD', 'WLR', 'KNS',
  'ALASTUA', 'SULUR', 'WELERI', 'KRADENAN', 'SEMARANG'
];

const JABATAN_OPTIONS = [
  'Teknisi',
  'Team Leader',
  'Dispatcher',
  'Helpdesk',
  'Admin'
];

export default function ManagePetugasModal({
  isOpen = false,
  onClose,
  onPetugasUpdated
}) {
  const [petugasList, setPetugasList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stasiunFilter, setStasiunFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jabatanFilter, setJabatanFilter] = useState('ALL');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    chat_id: '',
    stasiun: 'WDU',
    jabatan: 'Teknisi',
    status: 'Active',
    akun_ikr: ''
  });

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Petugas dari Supabase
  const fetchPetugas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('petugas')
        .select('*')
        .order('nama', { ascending: true });

      if (error) {
        console.warn('Gagal fetch petugas:', error);
        showToast('Gagal memuat petugas: ' + error.message, 'error');
      } else {
        setPetugasList(data || []);
      }
    } catch (err) {
      console.error('Fetch petugas error:', err);
      showToast('Error koneksi database: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPetugas();
    }
  }, [isOpen]);

  const handleEdit = (p) => {
    setFormData({
      nama: p.nama || '',
      username: p.username || '',
      chat_id: p.chat_id || '',
      stasiun: p.stasiun || 'WDU',
      jabatan: p.jabatan || 'Teknisi',
      status: p.status || 'Active',
      akun_ikr: p.akun_ikr || ''
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showToast('Nama petugas wajib diisi!', 'error');
      return;
    }

    let uName = formData.username.trim();
    if (uName && !uName.startsWith('@')) {
      uName = '@' + uName;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
        username: uName || null,
        chat_id: formData.chat_id ? formData.chat_id.trim() : null,
        stasiun: formData.stasiun || '',
        jabatan: formData.jabatan || 'Teknisi',
        status: formData.status || 'Active',
        akun_ikr: formData.akun_ikr ? formData.akun_ikr.trim() : null
      };

      if (editingId) {
        const { error } = await supabase
          .from('petugas')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showToast(`Data petugas ${payload.nama} berhasil diperbarui!`, 'success');
      } else {
        const { error } = await supabase
          .from('petugas')
          .insert([payload]);

        if (error) throw error;
        showToast(`Petugas baru ${payload.nama} berhasil ditambahkan!`, 'success');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        nama: '',
        username: '',
        chat_id: '',
        stasiun: 'WDU',
        jabatan: 'Teknisi',
        status: 'Active',
        akun_ikr: ''
      });
      fetchPetugas();
      if (typeof onPetugasUpdated === 'function') onPetugasUpdated();
    } catch (err) {
      console.error('Save petugas error:', err);
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (p) => {
    const newStatus = p.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('petugas')
        .update({ status: newStatus })
        .eq('id', p.id);

      if (error) throw error;
      setPetugasList(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
      showToast(`Status ${p.nama} diubah menjadi ${newStatus}!`, 'success');
      if (typeof onPetugasUpdated === 'function') onPetugasUpdated();
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('petugas')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      setPetugasList(prev => prev.filter(item => item.id !== deleteTarget.id));
      showToast(`Petugas ${deleteTarget.nama} berhasil dihapus!`, 'success');
      if (typeof onPetugasUpdated === 'function') onPetugasUpdated();
    } catch (err) {
      console.error('Delete petugas error:', err);
      showToast('Gagal menghapus: ' + err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return petugasList.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        (p.nama && p.nama.toLowerCase().includes(q)) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.chat_id && p.chat_id.includes(q)) ||
        (p.akun_ikr && p.akun_ikr.toLowerCase().includes(q));

      const matchStasiun = stasiunFilter === 'ALL' || (p.stasiun || '').toUpperCase() === stasiunFilter.toUpperCase();
      const matchStatus = statusFilter === 'ALL' || (p.status || 'Active').toLowerCase() === statusFilter.toLowerCase();
      const matchJabatan = jabatanFilter === 'ALL' || (p.jabatan || 'Teknisi').toLowerCase() === jabatanFilter.toLowerCase();

      return matchSearch && matchStasiun && matchStatus && matchJabatan;
    });
  }, [petugasList, searchQuery, stasiunFilter, statusFilter, jabatanFilter]);

  // KPIs
  const totalCount = petugasList.length;
  const activeCount = petugasList.filter(p => (p.status || 'Active') === 'Active').length;
  const tlCount = petugasList.filter(p => (p.jabatan || '').toLowerCase().includes('leader') || (p.jabatan || '').toLowerCase() === 'tl').length;
  const uniqueStasiunCount = new Set(petugasList.map(p => p.stasiun).filter(Boolean)).size;

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop Gelap Menyeluruh Tanpa Blur */}
      <div className="fixed inset-0 bg-slate-950/75 transition-opacity" onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[10001] px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 ${
          toast.type === 'error'
            ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
        }`}>
          <Icon name={toast.type === 'error' ? 'alert-triangle' : 'check-circle-2'} size={15} />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Icon name="user-check" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base sm:text-lg">Kelola Master Data Petugas</h3>
              <p className="text-slate-500 text-xs">
                Database teknisi & piket operasional lapangan PT DESNARUM JAYA AKASHA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormData({
                  nama: '',
                  username: '',
                  chat_id: '',
                  stasiun: 'WDU',
                  jabatan: 'Teknisi',
                  status: 'Active',
                  akun_ikr: ''
                });
                setEditingId(null);
                setShowForm(!showForm);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                showForm
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Icon name={showForm ? "x" : "plus"} size={14} />
              <span>{showForm ? "Tutup Form" : "Tambah Petugas"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Tutup"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* KPI STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Petugas</span>
            <div className="text-xl font-black text-slate-800 mt-0.5">{totalCount}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Petugas Aktif</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{activeCount}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Team Leader</span>
            <div className="text-xl font-black text-blue-600 mt-0.5">{tlCount}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Stasiun</span>
            <div className="text-xl font-black text-indigo-600 mt-0.5">{uniqueStasiunCount}</div>
          </div>
        </div>

        {/* FORM TAMBAH / EDIT PETUGAS */}
        {showForm && (
          <form onSubmit={handleSave} className="p-4 bg-blue-50/40 border-b border-blue-100 animate-in slide-in-from-top duration-150">
            <div className="font-bold text-xs text-blue-900 mb-3 flex items-center gap-1.5">
              <Icon name={editingId ? "edit" : "plus-circle"} size={14} className="text-blue-600" />
              <span>{editingId ? "Edit Data Petugas" : "Formulir Tambah Petugas Baru"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Petugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: YOGI PRATAMA"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Telegram</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@yogikbaek"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  value={formData.chat_id}
                  onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                  placeholder="123456789"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stasiun</label>
                <select
                  value={formData.stasiun}
                  onChange={(e) => setFormData({ ...formData, stasiun: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold"
                >
                  {STASIUN_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan</label>
                <select
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold"
                >
                  {JABATAN_OPTIONS.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Akun IKR (Web Mitra)</label>
                <input
                  type="text"
                  value={formData.akun_ikr}
                  onChange={(e) => setFormData({ ...formData, akun_ikr: e.target.value })}
                  placeholder="ikr_kld_1"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting && <Icon name="loader-2" size={13} className="animate-spin" />}
                <span>{editingId ? "Simpan Perubahan" : "Tambahkan Petugas"}</span>
              </button>
            </div>
          </form>
        )}

        {/* SEARCH & FILTERS */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, @username, Chat ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={stasiunFilter}
              onChange={(e) => setStasiunFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Semua Stasiun</option>
              {STASIUN_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={jabatanFilter}
              onChange={(e) => setJabatanFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Semua Jabatan</option>
              {JABATAN_OPTIONS.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* LIST TABLE (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Nama Petugas</th>
                <th className="py-2.5 px-3">Username & Chat ID</th>
                <th className="py-2.5 px-3">Stasiun</th>
                <th className="py-2.5 px-3">Jabatan</th>
                <th className="py-2.5 px-3">Akun IKR</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Icon name="loader-2" size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat daftar petugas...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Icon name="users" size={24} className="mx-auto mb-1 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada petugas ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isActive = (p.status || 'Active').toLowerCase() === 'active';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {p.nama}
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <div className="text-blue-600 font-semibold">{p.username || '-'}</div>
                        {p.chat_id && <div className="text-[10px] text-slate-400">ID: {p.chat_id}</div>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.stasiun || '-'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          (p.jabatan || '').toLowerCase().includes('leader')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {p.jabatan || 'Teknisi'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {p.akun_ikr || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Klik untuk ubah status"
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Petugas"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Petugas"
                          >
                            <Icon name="trash-2" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredList.length} dari {totalCount} petugas</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[10002] flex justify-center items-center p-4">
          <div className="fixed inset-0 bg-slate-950/75 transition-opacity" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 text-center animate-in zoom-in-95 duration-150 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="trash-2" size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Hapus Data Petugas</h3>
            <p className="text-xs text-slate-500 mb-5">
              Apakah Anda yakin ingin menghapus petugas <b>{deleteTarget.nama}</b> dari daftar?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
