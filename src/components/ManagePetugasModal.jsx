import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { supabase } from '../supabaseClient';

const STASIUN_OPTIONS = [
  'Alastua',
  'Brumbung',
  'Kalibodri',
  'Kaliwungu',
  'Kradenan',
  'Krengseng',
  'Randublatung',
  'Semarang Tawang',
  'Sulur',
  'Wadu',
  'Weleri'
];

const SEKTOR_OPTIONS = [
  'Barat',
  'Tengah',
  'Timur'
];

const ROLE_OPTIONS = [
  'Teknisi FTTH',
  'Team Leader',
  'SPV Site',
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
  const [sektorFilter, setSektorFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    nick_name: '',
    role: 'Teknisi FTTH',
    area_kerja: 'Kaliwungu',
    sektor: 'Barat',
    kontak_hp: '',
    email: '',
    akun_ikr: '',
    password: 'dja123!',
    status: 'Aktif'
  });

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Fetch Petugas dari tabel list_petugas di Supabase
  const fetchPetugas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('list_petugas')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.warn('Gagal fetch list_petugas:', error);
        showToast('Gagal memuat data petugas: ' + error.message, 'error');
      } else {
        setPetugasList(data || []);
      }
    } catch (err) {
      console.error('Fetch list_petugas error:', err);
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

  const handleOpenAdd = () => {
    setFormData({
      full_name: '',
      nick_name: '',
      role: 'Teknisi FTTH',
      area_kerja: 'Kaliwungu',
      sektor: 'Barat',
      kontak_hp: '',
      email: '',
      akun_ikr: '',
      password: 'dja123!',
      status: 'Aktif'
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (p) => {
    setFormData({
      full_name: p.full_name || '',
      nick_name: p.nick_name || '',
      role: p.role || 'Teknisi FTTH',
      area_kerja: p.area_kerja || 'Kaliwungu',
      sektor: p.sektor || 'Barat',
      kontak_hp: p.kontak_hp || '',
      email: p.email || '',
      akun_ikr: p.akun_ikr || '',
      password: p.password || 'dja123!',
      status: p.status || 'Aktif'
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      showToast('Nama lengkap petugas wajib diisi!', 'error');
      return;
    }
    if (!formData.nick_name.trim()) {
      showToast('Nama panggilan petugas wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        nick_name: formData.nick_name.trim(),
        role: formData.role || 'Teknisi FTTH',
        area_kerja: formData.area_kerja || 'Kaliwungu',
        sektor: formData.sektor || 'Barat',
        kontak_hp: formData.kontak_hp ? formData.kontak_hp.trim() : null,
        email: formData.email ? formData.email.trim() : null,
        akun_ikr: formData.akun_ikr ? formData.akun_ikr.trim() : null,
        password: formData.password ? formData.password.trim() : 'dja123!',
        status: formData.status || 'Aktif',
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('list_petugas')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showToast(`Data petugas ${payload.full_name} berhasil diperbarui!`, 'success');
      } else {
        const { error } = await supabase
          .from('list_petugas')
          .insert([payload]);

        if (error) throw error;
        showToast(`Petugas baru ${payload.full_name} berhasil ditambahkan!`, 'success');
      }

      setShowForm(false);
      setEditingId(null);
      fetchPetugas();
      if (typeof onPetugasUpdated === 'function') onPetugasUpdated();
    } catch (err) {
      console.error('Save list_petugas error:', err);
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (p) => {
    const newStatus = p.status === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    try {
      const { error } = await supabase
        .from('list_petugas')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', p.id);

      if (error) throw error;
      setPetugasList(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
      showToast(`Status ${p.full_name} diubah menjadi ${newStatus}!`, 'success');
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
        .from('list_petugas')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      setPetugasList(prev => prev.filter(item => item.id !== deleteTarget.id));
      showToast(`Petugas ${deleteTarget.full_name} berhasil dihapus!`, 'success');
      if (typeof onPetugasUpdated === 'function') onPetugasUpdated();
    } catch (err) {
      console.error('Delete list_petugas error:', err);
      showToast('Gagal menghapus: ' + err.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return petugasList.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.nick_name && p.nick_name.toLowerCase().includes(q)) ||
        (p.area_kerja && p.area_kerja.toLowerCase().includes(q)) ||
        (p.sektor && p.sektor.toLowerCase().includes(q)) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        (p.kontak_hp && p.kontak_hp.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.akun_ikr && p.akun_ikr.toLowerCase().includes(q));

      const matchStasiun = stasiunFilter === 'ALL' || (p.area_kerja || '').toLowerCase() === stasiunFilter.toLowerCase();
      const matchSektor = sektorFilter === 'ALL' || (p.sektor || '').toLowerCase() === sektorFilter.toLowerCase();
      const matchRole = roleFilter === 'ALL' || (p.role || '').toLowerCase() === roleFilter.toLowerCase();
      const matchStatus = statusFilter === 'ALL' || (p.status || 'Aktif').toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStasiun && matchSektor && matchRole && matchStatus;
    });
  }, [petugasList, searchQuery, stasiunFilter, sektorFilter, roleFilter, statusFilter]);

  // KPIs
  const totalCount = petugasList.length;
  const activeCount = petugasList.filter(p => (p.status || 'Aktif') === 'Aktif').length;
  const tlCount = petugasList.filter(p => (p.role || '').toLowerCase().includes('leader') || (p.role || '').toLowerCase() === 'tl').length;
  const uniqueStasiunCount = new Set(petugasList.map(p => p.area_kerja).filter(Boolean)).size;

  const getRoleBadge = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('leader') || r === 'tl') {
      return { label: role, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (r.includes('spv') || r.includes('supervisor')) {
      return { label: role, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (r.includes('teknisi')) {
      return { label: role, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: role || 'Teknisi', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const getSektorBadge = (sektor) => {
    switch (sektor) {
      case 'Barat':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Tengah':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Timur':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatWaLink = (raw) => {
    if (!raw) return null;
    let digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    else if (!digits.startsWith('62') && digits.length >= 8) digits = '62' + digits;
    return `https://wa.me/${digits}`;
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop Gelap Menyeluruh Tanpa Blur */}
      <div className="fixed inset-0 bg-slate-950/75 transition-opacity" onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[10001] px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 ${toast.type === 'error'
          ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
          }`}>
          <Icon name={toast.type === 'error' ? 'alert-triangle' : 'check-circle-2'} size={15} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Dialog Card Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <Icon name="user-check" size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base sm:text-lg leading-tight">
                Kelola Master Data Petugas
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Database teknisi & piket operasional lapangan PT DESNARUM JAYA AKASHA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showForm ? () => setShowForm(false) : handleOpenAdd}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${showForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              <Icon name={showForm ? "x" : "plus"} size={14} />
              <span>{showForm ? "Tutup Form" : "Tambah Petugas"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Tutup Modal"
              aria-label="Tutup"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* KPI STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Petugas</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{totalCount}</div>
            <span className="text-[10px] text-slate-400 font-medium">Personel Terdaftar</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Petugas Aktif</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{activeCount}</div>
            <span className="text-[10px] text-emerald-600/80 font-medium">Siap Bertugas</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Team Leader</span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">{tlCount}</div>
            <span className="text-[10px] text-blue-600/80 font-medium">Pimpinan Stasiun</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Stasiun Operasional</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">{uniqueStasiunCount}</div>
            <span className="text-[10px] text-indigo-600/80 font-medium">Area Kerja Aktif</span>
          </div>
        </div>

        {/* FORM TAMBAH / EDIT PETUGAS */}
        {showForm && (
          <form onSubmit={handleSave} className="p-4 sm:p-5 bg-blue-50/50 border-b border-blue-100 animate-in slide-in-from-top duration-150">
            <div className="font-bold text-xs text-blue-900 mb-3 flex items-center gap-1.5">
              <Icon name={editingId ? "edit" : "plus-circle"} size={15} className="text-blue-600" />
              <span>{editingId ? `Edit Petugas: ${formData.full_name}` : "Formulir Tambah Petugas Baru"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Contoh: Dimas Andika Putra"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              {/* Nama Panggilan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Panggilan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nick_name}
                  onChange={(e) => setFormData({ ...formData, nick_name: e.target.value })}
                  placeholder="Contoh: Dimas"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              {/* Jabatan / Role */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jabatan / Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Stasiun (Area Kerja) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Stasiun (Area Kerja) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.area_kerja}
                  onChange={(e) => setFormData({ ...formData, area_kerja: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {STASIUN_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Sektor */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Wilayah Sektor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.sektor}
                  onChange={(e) => setFormData({ ...formData, sektor: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {SEKTOR_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* No. Kontak WhatsApp */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Kontak / WhatsApp</label>
                <input
                  type="text"
                  value={formData.kontak_hp}
                  onChange={(e) => setFormData({ ...formData, kontak_hp: e.target.value })}
                  placeholder="085600195787"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="petugas@desnarum.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Akun IKR */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Akun IKR (Web Mitra)</label>
                <input
                  type="text"
                  value={formData.akun_ikr}
                  onChange={(e) => setFormData({ ...formData, akun_ikr: e.target.value })}
                  placeholder="dimas_andika"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Keaktifan</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-blue-200/60">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting && <Icon name="refresh-cw" size={13} className="animate-spin" />}
                <span>{editingId ? "Simpan Perubahan" : "Tambahkan Petugas"}</span>
              </button>
            </div>
          </form>
        )}

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, panggilan, stasiun, no HP, akun IKR..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Stasiun */}
            <select
              value={stasiunFilter}
              onChange={(e) => setStasiunFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Semua Stasiun</option>
              {STASIUN_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Filter Sektor */}
            <select
              value={sektorFilter}
              onChange={(e) => setSektorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Semua Sektor</option>
              {SEKTOR_OPTIONS.map(s => (
                <option key={s} value={s}>Sektor {s}</option>
              ))}
            </select>

            {/* Filter Jabatan */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Semua Jabatan</option>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Non-Aktif">Non-Aktif</option>
            </select>
          </div>
        </div>

        {/* LIST TABLE (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 sticky top-0 z-10 tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Nama & Email</th>
                <th className="py-3 px-3">Jabatan</th>
                <th className="py-3 px-3">Area Kerja</th>
                <th className="py-3 px-3">Kontak</th>
                <th className="py-3 px-3">Akun IKR</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="refresh-cw" size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat master data petugas...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="users" size={26} className="mx-auto mb-1.5 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada petugas ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isActive = (p.status || 'Aktif').toLowerCase() === 'aktif';
                  const roleBadge = getRoleBadge(p.role);
                  const waUrl = formatWaLink(p.kontak_hp);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Nama & Panggilan */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                            {(p.nick_name || p.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 leading-snug truncate" title={p.full_name}>
                              {p.full_name || '-'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.nick_name && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                                  {p.nick_name}
                                </span>
                              )}
                              {p.email && (
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={p.email}>
                                  {p.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Jabatan / Role */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${roleBadge.bg}`}>
                          <Icon name={p.role === 'Team Leader' ? 'user-check' : 'user'} size={11} />
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      {/* 3. Stasiun & Sektor */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-800 font-bold text-xs">
                            <Icon name="map-pin" size={12} className="text-slate-400 shrink-0" />
                            <span>{p.area_kerja || '-'}</span>
                          </div>
                          {p.sektor && (
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getSektorBadge(p.sektor)}`}>
                              Sektor {p.sektor}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Kontak & WhatsApp */}
                      <td className="py-3 px-3">
                        {p.kontak_hp ? (
                          waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-mono text-[11px] font-semibold border border-emerald-200 transition-colors"
                              title="Buka WhatsApp"
                            >
                              <Icon name="phone" size={11} className="text-emerald-600" />
                              <span>{p.kontak_hp}</span>
                            </a>
                          ) : (
                            <span className="font-mono text-slate-600 text-xs">{p.kontak_hp}</span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 5. Akun IKR */}
                      <td className="py-3 px-3">
                        {p.akun_ikr ? (
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.akun_ikr}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 6. Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          title="Klik untuk ubah status aktif / non-aktif"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span>{isActive ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>

                      {/* 7. Aksi */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Petugas"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
        <div className="p-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan <strong className="text-slate-700">{filteredList.length}</strong> dari{' '}
            <strong className="text-slate-700">{totalCount}</strong> petugas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
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
              Apakah Anda yakin ingin menghapus petugas <b>{deleteTarget.full_name}</b> ({deleteTarget.nick_name}) dari sistem?
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
