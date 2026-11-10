import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { supabase } from '../supabaseClient';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin (Akses Penuh)', shortLabel: 'Admin', color: 'purple' },
  { value: 'supervisor', label: 'Supervisor (Pengawas Sektor)', shortLabel: 'Supervisor', color: 'indigo' },
  { value: 'team_leader', label: 'Team Leader (Stasiun)', shortLabel: 'Team Leader', color: 'blue' },
  { value: 'helpdesk', label: 'Helpdesk (Tiket & Dispatch)', shortLabel: 'Helpdesk', color: 'amber' }
];

const SEKTOR_OPTIONS = [
  { value: 'Semua', label: 'Semua Sektor' },
  { value: 'Barat', label: 'Wilayah Barat' },
  { value: 'Tengah', label: 'Wilayah Tengah' },
  { value: 'Timur', label: 'Wilayah Timur' }
];

const STASIUN_LIST = [
  'Semua',
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

export default function UserManagementView() {
  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSektorFilter, setUserSektorFilter] = useState('all');
  const [userStasiunFilter, setUserStasiunFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const userItemsPerPage = 10;

  // Form State
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Delete Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'team_leader',
    sektor: 'Semua',
    stasiun: 'Semua',
    status: 'active'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Users dari Supabase
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Gagal fetch users:', error);
        showToast('Gagal memuat data users: ' + error.message, 'error');
      } else {
        setUsersData(data || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      showToast('Terjadi kesalahan memuat data: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handler Copy Password
  const handleCopyPassword = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Password disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevealPassword = (id) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenCreateModal = () => {
    setUserForm({
      username: '',
      password: '',
      name: '',
      role: 'team_leader',
      sektor: 'Semua',
      stasiun: 'Semua',
      status: 'active'
    });
    setEditingUserId(null);
    setShowUserPassword(false);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setUserForm({
      username: user.username || '',
      password: user.password || '',
      name: user.name || '',
      role: user.role || 'team_leader',
      sektor: user.sektor || 'Semua',
      stasiun: user.stasiun || 'Semua',
      status: user.status || 'active'
    });
    setShowUserPassword(false);
    setEditingUserId(user.id);
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.name) {
      showToast('Mohon lengkapi Username dan Nama Lengkap!', 'error');
      return;
    }

    if (!editingUserId && !userForm.password) {
      showToast('Password wajib diisi untuk pengguna baru!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        // Update user
        const updatePayload = {
          username: userForm.username.toLowerCase().trim(),
          name: userForm.name.trim(),
          role: userForm.role,
          sektor: userForm.sektor,
          stasiun: userForm.stasiun,
          status: userForm.status || 'active'
        };
        if (userForm.password && userForm.password.trim()) {
          updatePayload.password = userForm.password.trim();
        }

        const { error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', editingUserId);

        if (error) throw error;

        setUsersData(prev => prev.map(u => {
          if (u.id === editingUserId) {
            return { ...u, ...updatePayload };
          }
          return u;
        }));

        showToast(`Data pengguna @${userForm.username} berhasil diperbarui!`, 'success');
      } else {
        // Create user
        const insertPayload = {
          username: userForm.username.toLowerCase().trim(),
          password: userForm.password.trim(),
          name: userForm.name.trim(),
          role: userForm.role,
          sektor: userForm.sektor,
          stasiun: userForm.stasiun,
          status: userForm.status || 'active'
        };

        const { data, error } = await supabase
          .from('users')
          .insert([insertPayload])
          .select();

        if (error) throw error;

        const newUser = data && data[0]
          ? data[0]
          : { id: `USER-${Date.now()}`, ...insertPayload, created_at: new Date().toISOString() };

        setUsersData(prev => [newUser, ...prev]);
        showToast(`Pengguna baru @${userForm.username} berhasil didaftarkan!`, 'success');
      }

      setShowUserForm(false);
      setEditingUserId(null);
    } catch (err) {
      console.error("Save user error:", err);
      showToast('Gagal menyimpan pengguna: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      setUsersData(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(`Status @${user.username} diubah menjadi ${newStatus === 'active' ? 'AKTIF' : 'NON-AKTIF'}!`, 'success');
    } catch (err) {
      console.error("Toggle user status error:", err);
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun @${user.username} (${user.name}) secara permanen dari sistem OpsTracker?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

          if (error) throw error;

          setUsersData(prev => prev.filter(u => u.id !== user.id));
          showToast(`Akun user @${user.username} berhasil dihapus!`, 'success');
        } catch (err) {
          console.error("Delete user error:", err);
          showToast('Gagal menghapus pengguna: ' + err.message, 'error');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const resetAllFilters = () => {
    setUserSearch('');
    setUserRoleFilter('all');
    setUserSektorFilter('all');
    setUserStasiunFilter('all');
    setUserStatusFilter('all');
    setUserPage(1);
  };

  const hasActiveFilters = Boolean(
    userSearch ||
    userRoleFilter !== 'all' ||
    userSektorFilter !== 'all' ||
    userStasiunFilter !== 'all' ||
    userStatusFilter !== 'all'
  );

  // Filter Data
  const filteredUsers = useMemo(() => {
    return usersData.filter(u => {
      const q = userSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.sektor && u.sektor.toLowerCase().includes(q)) ||
        (u.stasiun && u.stasiun.toLowerCase().includes(q));

      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchSektor = userSektorFilter === 'all' || (u.sektor || 'Semua') === userSektorFilter;
      const matchStasiun = userStasiunFilter === 'all' || (u.stasiun || 'Semua') === userStasiunFilter;
      const matchStatus = userStatusFilter === 'all' || (u.status || 'active') === userStatusFilter;

      return matchSearch && matchRole && matchSektor && matchStasiun && matchStatus;
    });
  }, [usersData, userSearch, userRoleFilter, userSektorFilter, userStasiunFilter, userStatusFilter]);

  // KPIs
  const totalUsersCount = usersData.length;
  const activeUsersCount = usersData.filter(u => (u.status || 'active') === 'active').length;
  const inactiveUsersCount = usersData.filter(u => u.status === 'inactive').length;
  const tlUsersCount = usersData.filter(u => u.role === 'team_leader').length;
  const spvUsersCount = usersData.filter(u => u.role === 'supervisor').length;
  const helpdeskUsersCount = usersData.filter(u => u.role === 'helpdesk').length;
  const adminUsersCount = usersData.filter(u => u.role === 'admin').length;

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / userItemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, userPage), totalPages);
  const startIndex = (safePage - 1) * userItemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + userItemsPerPage);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', className: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'supervisor':
        return { label: 'Supervisor', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'team_leader':
        return { label: 'Team Leader', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'helpdesk':
        return { label: 'Helpdesk', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: role || '-', className: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
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

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-fade">
      {/* Toast Notification (Portal ke Body) */}
      {toast && ReactDOM.createPortal(
        <div className={`fixed top-5 right-5 z-[10001] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold transition-all ${toast.type === 'error'
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
          <Icon
            name={toast.type === 'error' ? 'alert-circle' : 'check-circle-2'}
            size={17}
            className={toast.type === 'error' ? 'text-rose-600 shrink-0' : 'text-emerald-600 shrink-0'}
          />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 p-1 rounded-lg hover:bg-black/5 text-current"
            aria-label="Tutup notifikasi"
          >
            <Icon name="x" size={14} />
          </button>
        </div>,
        document.body
      )}

      {/* HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>PT DESNARUM JAYA AKASHA</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Sistem Terpusat: {usersData.length} Pengguna Terdaftar</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              Management User & Hak Akses
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Kelola data akun pengguna, kredensial password login, hak akses role, pembagian sektor kerja, dan penugasan stasiun.
            </p>
          </div>

          {/* TOMBOL AKSI UTAMA */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
              title="Perbarui daftar pengguna terbaru"
            >
              <Icon name="refresh-cw" size={14} className={isLoading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
              <span>Muat Ulang</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <Icon name="user-plus" size={15} />
              <span>Tambah Pengguna</span>
            </button>
          </div>
        </div>
      </div>

      {/* KARTU KPI INTERAKTIF (KLIK UNTUK FILTER) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Pengguna */}
        <button
          type="button"
          onClick={() => { setUserRoleFilter('all'); setUserStatusFilter('all'); setUserSektorFilter('all'); setUserStasiunFilter('all'); }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${userRoleFilter === 'all' && userStatusFilter === 'all' && userSektorFilter === 'all' && userStasiunFilter === 'all'
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pengguna</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                {totalUsersCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="users" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Seluruh akun terdaftar di sistem
          </p>
        </button>

        {/* 2. Team Leader */}
        <button
          type="button"
          onClick={() => {
            setUserRoleFilter(userRoleFilter === 'team_leader' ? 'all' : 'team_leader');
            setUserPage(1);
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${userRoleFilter === 'team_leader'
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Team Leader</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">
                {tlUsersCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Icon name="user-check" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {spvUsersCount} SPV • {tlUsersCount} TL Stasiun
          </p>
        </button>

        {/* 3. Helpdesk & Dispatcher */}
        <button
          type="button"
          onClick={() => {
            setUserRoleFilter(userRoleFilter === 'helpdesk' ? 'all' : 'helpdesk');
            setUserPage(1);
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${userRoleFilter === 'helpdesk'
            ? 'border-amber-500 ring-2 ring-amber-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Helpdesk</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {helpdeskUsersCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Icon name="headphones" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {helpdeskUsersCount} Helpdesk • {adminUsersCount} Super Admin
          </p>
        </button>

        {/* 4. Pengguna Aktif */}
        <button
          type="button"
          onClick={() => {
            setUserStatusFilter(userStatusFilter === 'active' ? 'all' : 'active');
            setUserPage(1);
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${userStatusFilter === 'active'
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pengguna Aktif</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {activeUsersCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Icon name="check-circle-2" size={20} />
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-bold">
            {inactiveUsersCount > 0 ? `${inactiveUsersCount} user non-aktif` : '100% akun aktif dapat login'}
          </p>
        </button>
      </div>

      {/* FILTER & PENCARIAN TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Input Pencarian */}
          <div className="relative flex-1 min-w-[200px] w-full xl:w-auto">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
              placeholder="Cari nama, username, stasiun, atau sektor..."
              className="w-full pl-9 pr-8 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                aria-label="Bersihkan pencarian"
              >
                <Icon name="x" size={14} />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full xl:w-auto">
            {/* Filter Role */}
            <select
              value={userRoleFilter}
              onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
              aria-label="Filter berdasarkan Role"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[170px]"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="team_leader">Team Leader</option>
              <option value="helpdesk">Helpdesk</option>
            </select>

            {/* Filter Sektor */}
            <select
              value={userSektorFilter}
              onChange={(e) => { setUserSektorFilter(e.target.value); setUserPage(1); }}
              aria-label="Filter berdasarkan Sektor"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[160px]"
            >
              <option value="all">Semua Sektor</option>
              {SEKTOR_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Filter Stasiun */}
            <select
              value={userStasiunFilter}
              onChange={(e) => { setUserStasiunFilter(e.target.value); setUserPage(1); }}
              aria-label="Filter berdasarkan Stasiun"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[190px]"
            >
              <option value="all">Semua Stasiun</option>
              {STASIUN_LIST.map(st => (
                <option key={st} value={st}>{st === 'Semua' ? 'Stasiun: Semua' : st}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={userStatusFilter}
              onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
              aria-label="Filter berdasarkan Status"
              className="w-full sm:w-auto px-3 py-2.5 min-h-[42px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer max-w-full sm:max-w-[150px]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-Aktif</option>
            </select>
          </div>
        </div>

        {/* Info Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> dari{' '}
              <strong className="text-slate-800">{usersData.length}</strong> pengguna
            </span>
            {userRoleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <span>Role: {getRoleBadge(userRoleFilter).label}</span>
                <button type="button" onClick={() => setUserRoleFilter('all')} className="hover:text-blue-900" aria-label="Hapus filter role">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {userSektorFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span>Sektor: {userSektorFilter}</span>
                <button type="button" onClick={() => setUserSektorFilter('all')} className="hover:text-emerald-900" aria-label="Hapus filter sektor">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {userStasiunFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <span>Stasiun: {userStasiunFilter}</span>
                <button type="button" onClick={() => setUserStasiunFilter('all')} className="hover:text-purple-900" aria-label="Hapus filter stasiun">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
            {userStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <span>Status: {userStatusFilter === 'active' ? 'Aktif' : 'Non-Aktif'}</span>
                <button type="button" onClick={() => setUserStatusFilter('all')} className="hover:text-slate-900" aria-label="Hapus filter status">
                  <Icon name="x" size={12} />
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <Icon name="rotate-ccw" size={13} />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Role & Hak Akses</th>
                <th className="py-3.5 px-4">Sektor</th>
                <th className="py-3.5 px-4">Penugasan Stasiun</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="refresh-cw" size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="users" size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada pengguna ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const uid = user.id;
                  const isPasswordRevealed = revealedPasswords[uid];
                  const isActive = (user.status || 'active') === 'active';
                  const roleBadge = getRoleBadge(user.role);

                  return (
                    <tr key={uid} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Pengguna */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0 border border-blue-200">
                            {(user.name || user.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 leading-snug truncate" title={user.name}>
                              {user.name || '-'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role & Hak Akses */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleBadge.className}`}>
                          <Icon name={user.role === 'admin' ? 'shield-check' : user.role === 'supervisor' ? 'shield' : user.role === 'helpdesk' ? 'headphones' : 'user'} size={12} />
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      {/* 3. Sektor */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getSektorBadge(user.sektor)}`}>
                          {user.sektor || 'Semua'}
                        </span>
                      </td>

                      {/* 4. Stasiun */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Icon name="map-pin" size={13} className="text-slate-400 shrink-0" />
                          <span>{user.stasiun || 'Semua'}</span>
                        </div>
                      </td>

                      {/* 5. Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                          <span className="font-semibold text-xs tracking-wider">
                            {isPasswordRevealed ? (user.password || '-') : '••••••••'}
                          </span>
                          {user.password && (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleRevealPassword(uid)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                title={isPasswordRevealed ? "Sembunyikan password" : "Lihat password"}
                              >
                                <Icon name={isPasswordRevealed ? "eye-off" : "eye"} size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(user.password, uid)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                title="Salin password"
                              >
                                <Icon name={copiedId === uid ? "check" : "copy"} size={13} className={copiedId === uid ? "text-emerald-600" : ""} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 6. Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          title="Klik untuk mengubah status aktif / non-aktif"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span>{isActive ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>

                      {/* 7. Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Pengguna"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Icon name="trash-2" size={14} />
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

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan <strong className="text-slate-700">{paginatedUsers.length}</strong> dari{' '}
              <strong className="text-slate-700">{filteredUsers.length}</strong> pengguna
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Halaman sebelumnya"
              >
                <Icon name="chevron-left" size={14} />
              </button>
              <span className="font-bold px-2 text-slate-700">Halaman {safePage} dari {totalPages}</span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Halaman berikutnya"
              >
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM TAMBAH / EDIT USER */}
      {showUserForm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop Gelap Menyeluruh Tanpa Blur */}
          <div
            className="fixed inset-0 bg-slate-950/75 transition-opacity"
            onClick={() => setShowUserForm(false)}
          />

          {/* Dialog Card Modal */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/90 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon name="shield-check" size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                    {editingUserId ? `Edit Pengguna: @${userForm.username}` : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingUserId ? 'Perbarui data akun dan hak akses pengguna' : 'Daftarkan akun baru ke dalam sistem'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="p-5 space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Contoh: Setyo Ali"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 font-medium transition-all"
                  required
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="tl_setyo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Huruf kecil tanpa spasi.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password {!editingUserId && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPassword ? "text" : "password"}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={editingUserId ? "Kosongkan bila tetap" : "Password login"}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      required={!editingUserId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={showUserPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      <Icon name={showUserPassword ? "eye-off" : "eye"} size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role & Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-all"
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-all"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Non-Aktif (Dibekukan)</option>
                  </select>
                </div>
              </div>

              {/* Sektor & Stasiun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wilayah Sektor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.sektor}
                    onChange={(e) => setUserForm({ ...userForm, sektor: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-all"
                  >
                    {SEKTOR_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penugasan Stasiun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.stasiun}
                    onChange={(e) => setUserForm({ ...userForm, stasiun: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer transition-all"
                  >
                    {STASIUN_LIST.map(st => (
                      <option key={st} value={st}>{st === 'Semua' ? 'Semua Stasiun' : st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Icon name="refresh-cw" size={14} className="animate-spin" />}
                  <span>{editingUserId ? 'Simpan Perubahan' : 'Daftarkan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmModal.isOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop Gelap Menyeluruh Tanpa Blur */}
          <div
            className="fixed inset-0 bg-slate-950/75 transition-opacity"
            onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
          />

          {/* Dialog Card Modal */}
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 text-center animate-in zoom-in-95 duration-150 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="trash-2" size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mb-5">{confirmModal.message}</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-2xs hover:shadow transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
