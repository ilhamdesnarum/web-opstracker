import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { supabase } from '../supabaseClient';

export default function UserManagementView() {
  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & Pagination
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
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
    full_name: '',
    role: 'Teknisi',
    phone: '',
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
        // Fallback jika tabel users kosong atau query gagal
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

  const handleEditUser = (user) => {
    setUserForm({
      username: user.username || '',
      password: user.password || '',
      full_name: user.full_name || '',
      role: user.role || 'Teknisi',
      phone: user.phone || '',
      status: user.status || 'active'
    });
    setShowUserPassword(false);
    setEditingUserId(user.id || user.username);
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.full_name) {
      showToast('Mohon lengkapi Username dan Nama Lengkap!', 'error');
      return;
    }

    if (!editingUserId && !userForm.password) {
      showToast('Password wajib diisi untuk user baru!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUserId) {
        // Update user
        const updatePayload = {
          username: userForm.username.toLowerCase().trim(),
          full_name: userForm.full_name.trim(),
          role: userForm.role,
          phone: userForm.phone ? userForm.phone.trim() : null,
          status: userForm.status || 'active'
        };
        if (userForm.password && userForm.password.trim()) {
          updatePayload.password = userForm.password.trim();
        }

        const isUuid = typeof editingUserId === 'string' && editingUserId.includes('-');
        let query = supabase.from('users').update(updatePayload);
        if (isUuid) {
          query = query.eq('id', editingUserId);
        } else {
          query = query.eq('username', userForm.username.toLowerCase().trim());
        }

        const { error } = await query;
        if (error) throw error;

        setUsersData(prev => prev.map(u => {
          if (u.id === editingUserId || u.username === editingUserId || u.username === userForm.username) {
            return { ...u, ...updatePayload };
          }
          return u;
        }));

        showToast(`Data user @${userForm.username} berhasil diperbarui!`, 'success');
      } else {
        // Create user
        const insertPayload = {
          username: userForm.username.toLowerCase().trim(),
          password: userForm.password.trim(),
          full_name: userForm.full_name.trim(),
          role: userForm.role,
          phone: userForm.phone ? userForm.phone.trim() : null,
          status: userForm.status || 'active'
        };

        const { data, error } = await supabase.from('users').insert([insertPayload]).select();
        if (error) throw error;

        const newUser = data && data[0]
          ? data[0]
          : { id: `USER-${Date.now()}`, ...insertPayload, created_at: new Date().toISOString() };

        setUsersData(prev => [newUser, ...prev]);
        showToast(`User baru @${userForm.username} berhasil didaftarkan!`, 'success');
      }

      setShowUserForm(false);
      setEditingUserId(null);
      setUserForm({ username: '', password: '', full_name: '', role: 'Teknisi', phone: '', status: 'active' });
    } catch (err) {
      console.error("Save user error:", err);
      showToast('Gagal menyimpan user: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const isUuid = typeof user.id === 'string' && user.id.includes('-');
      let query = supabase.from('users').update({ status: newStatus });
      if (isUuid) {
        query = query.eq('id', user.id);
      } else {
        query = query.eq('username', user.username);
      }

      const { error } = await query;
      if (error) throw error;

      setUsersData(prev => prev.map(u => (u.username === user.username || u.id === user.id) ? { ...u, status: newStatus } : u));
      showToast(`Status user @${user.username} diubah menjadi ${newStatus === 'active' ? 'AKTIF' : 'NON-AKTIF'}!`, 'success');
    } catch (err) {
      console.error("Toggle user status error:", err);
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus User Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun user @${user.username} (${user.full_name}) secara permanen?`,
      onConfirm: async () => {
        try {
          const isUuid = typeof user.id === 'string' && user.id.includes('-');
          let query = supabase.from('users').delete();
          if (isUuid) {
            query = query.eq('id', user.id);
          } else {
            query = query.eq('username', user.username);
          }

          const { error } = await query;
          if (error) throw error;

          setUsersData(prev => prev.filter(u => u.username !== user.username && u.id !== user.id));
          showToast(`Akun user @${user.username} berhasil dihapus!`, 'success');
        } catch (err) {
          console.error("Delete user error:", err);
          showToast('Gagal menghapus user: ' + err.message, 'error');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Filter Data
  const filteredUsers = useMemo(() => {
    return usersData.filter(u => {
      const matchSearch = !userSearch ||
        (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.phone && u.phone.includes(userSearch));
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchStatus = userStatusFilter === 'all' || (u.status || 'active') === userStatusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [usersData, userSearch, userRoleFilter, userStatusFilter]);

  // KPIs
  const totalUsersCount = usersData.length;
  const activeUsersCount = usersData.filter(u => (u.status || 'active') === 'active').length;
  const inactiveUsersCount = usersData.filter(u => u.status === 'inactive').length;
  const uniqueRolesCount = new Set(usersData.map(u => u.role)).size;

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / userItemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, userPage), totalPages);
  const startIndex = (safePage - 1) * userItemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + userItemsPerPage);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Team Leader':
      case 'TL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Helpdesk':
      case 'Dispatcher':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Teknisi':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Manajemen':
      case 'Eksekutif':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 ${toast.type === 'error'
          ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
          }`}>
          <Icon name={toast.type === 'error' ? 'alert-triangle' : 'check-circle-2'} size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header View */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Icon name="shield-check" size={24} />
              </div>
              Manajemen User & Hak Akses
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Kelola akun login sistem OpsTracker, hak akses (Role), nomor WhatsApp, dan status aktif akun pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer font-medium text-xs flex items-center gap-1.5"
              title="Refresh Data"
            >
              <Icon name="refresh-cw" size={15} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUserForm({ username: '', password: '', full_name: '', role: 'Teknisi', phone: '', status: 'active' });
                setEditingUserId(null);
                setShowUserForm(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Icon name="plus" size={16} />
              <span>Tambah User Baru</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total User</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Icon name="users" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800">{totalUsersCount}</span>
              <span className="text-[11px] text-slate-500 ml-1.5 font-medium">Akun</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">User Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Icon name="check-circle" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-700">{activeUsersCount}</span>
              <span className="text-[11px] text-emerald-600 ml-1.5 font-medium">Dapat Login</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Non-Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                <Icon name="x-circle" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-700">{inactiveUsersCount}</span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-medium">Suspended</span>
            </div>
          </div>

          <div className="bg-purple-50/50 border border-purple-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Variasi Role</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Icon name="key" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-purple-700">{uniqueRolesCount}</span>
              <span className="text-[11px] text-purple-600 ml-1.5 font-medium">Hak Akses</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
            placeholder="Cari username, nama lengkap, atau no HP..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
          />
          {userSearch && (
            <button
              onClick={() => setUserSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Role */}
          <select
            value={userRoleFilter}
            onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="all">Semua Role</option>
            <option value="Admin">Admin</option>
            <option value="Team Leader">Team Leader</option>
            <option value="Helpdesk">Helpdesk</option>
            <option value="Teknisi">Teknisi</option>
            <option value="Manajemen">Manajemen</option>
          </select>

          {/* Filter Status */}
          <select
            value={userStatusFilter}
            onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Non-Aktif</option>
          </select>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">No. WhatsApp</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Icon name="loader-2" size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data user...</span>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Icon name="users" size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada user ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const uid = user.id || user.username;
                  const isPasswordRevealed = revealedPasswords[uid];
                  const isActive = (user.status || 'active') === 'active';

                  return (
                    <tr key={uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {(user.full_name || user.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{user.full_name || '-'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getRoleBadgeClass(user.role)}`}>
                          {user.role || 'Teknisi'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {user.phone ? (
                          <span className="flex items-center gap-1">
                            <Icon name="phone" size={12} className="text-emerald-600" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600">
                          <span>{isPasswordRevealed ? (user.password || '-') : '••••••••'}</span>
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

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(user)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          title="Klik untuk ubah status aktif / non-aktif"
                        >
                          {isActive ? 'Aktif' : 'Non-Aktif'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus User"
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {paginatedUsers.length} dari {filteredUsers.length} pengguna</span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage <= 1}
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <Icon name="chevron-left" size={14} />
              </button>
              <span className="font-bold px-2">Halaman {safePage} / {totalPages}</span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
              >
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM TAMBAH / EDIT USER */}
      {showUserForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Icon name="shield-check" size={18} className="text-blue-600" />
                {editingUserId ? `Edit User: @${userForm.username}` : 'Tambah User Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserForm(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="budi_ops"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono outline-none focus:bg-white focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Huruf kecil tanpa spasi.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Password {!editingUserId && <span className="text-rose-500">*</span>}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showUserPassword ? "text" : "password"}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={editingUserId ? "Kosongkan jika tidak diganti" : "Password login"}
                      className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono outline-none focus:bg-white focus:border-blue-500"
                      required={!editingUserId}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <Icon name={showUserPassword ? "eye-off" : "eye"} size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Admin">Admin (Akses Penuh)</option>
                    <option value="Team Leader">Team Leader (TL)</option>
                    <option value="Helpdesk">Helpdesk (Tiket & Dispatch)</option>
                    <option value="Teknisi">Teknisi (Petugas Lapangan)</option>
                    <option value="Manajemen">Manajemen (Eksekutif)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akun <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="active">Aktif (Dapat Login)</option>
                    <option value="inactive">Non-Aktif (Dibekukan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <Icon name="loader-2" size={14} className="animate-spin" />}
                  <span>{editingUserId ? 'Simpan Perubahan' : 'Daftarkan User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="trash-2" size={22} />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mb-5">{confirmModal.message}</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
