import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Icon from './Icon';
import { supabase } from '../supabaseClient';
import { logActivity as recordActivityLog } from '../services/activityLogService';

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

export default function UserManagementView({ currentUser }) {
  // Guard proteksi hak akses: Hanya Administrator yang berhak mengakses
  const isSuperAdmin = currentUser?.role === 'admin';

  // Main Tab State: 'users' (Daftar Pengguna) | 'logs' (Log Activity)
  const [activeMainTab, setActiveMainTab] = useState('users');

  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const logItemsPerPage = 15;
  const [selectedLogModal, setSelectedLogModal] = useState(null);

  // Filters & Search Pengguna
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

  // 2. Fetch Activity Logs dari Supabase
  const fetchActivityLogs = async () => {
    setIsLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.warn('Gagal fetch activity_logs:', error);
        showToast('Gagal memuat log aktivitas: ' + error.message, 'error');
      } else {
        setActivityLogs(data || []);
      }
    } catch (err) {
      console.error('Fetch activity logs error:', err);
      showToast('Terjadi kesalahan memuat log: ' + err.message, 'error');
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchUsers();
    fetchActivityLogs();
  }, [isSuperAdmin]);

  // Helper Mencatat Log Aktivitas ke Supabase
  const logActivity = async (action, description, metadata = null) => {
    try {
      const saved = await recordActivityLog({
        module: 'Kelola Pengguna',
        action,
        description,
        metadata
      });
      if (saved) {
        setActivityLogs(prev => [saved, ...prev]);
      }
    } catch (err) {
      console.warn('Gagal mencatat log aktivitas:', err);
    }
  };

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
        await logActivity(
          'USER_MANAGEMENT',
          `Memperbarui profil pengguna @${userForm.username} (${userForm.name}) role ${userForm.role} sektor ${userForm.sektor}`,
          { username: userForm.username, name: userForm.name, role: userForm.role, sektor: userForm.sektor, stasiun: userForm.stasiun, status: userForm.status }
        );
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
        await logActivity(
          'USER_MANAGEMENT',
          `Menambahkan pengguna baru: ${insertPayload.name} (@${insertPayload.username}) sebagai ${insertPayload.role} di sektor ${insertPayload.sektor}`,
          { username: insertPayload.username, role: insertPayload.role, sektor: insertPayload.sektor, stasiun: insertPayload.stasiun }
        );
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
      await logActivity(
        'UPDATE_STATUS',
        `Mengubah status akun pengguna @${user.username} (${user.name}) menjadi ${newStatus === 'active' ? 'AKTIF' : 'NON-AKTIF'}`,
        { username: user.username, status: newStatus }
      );
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
          await logActivity(
            'DELETE_USER',
            `Menghapus akun pengguna @${user.username} (${user.name}) secara permanen`,
            { username: user.username, role: user.role, sektor: user.sektor }
          );
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

      const matchRole = userRoleFilter === 'all' ||
        (userRoleFilter === 'leader' ? (u.role === 'team_leader' || u.role === 'supervisor') : u.role === userRoleFilter);
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
  const leaderUsersCount = tlUsersCount + spvUsersCount;
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

  // Helpers Log Aktivitas
  const formatLogTime = (dateStr) => {
    if (!dateStr) return { formatted: '-', relative: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { formatted: String(dateStr), relative: '' };
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relative = '';
      if (diffMins < 1) relative = 'Baru saja';
      else if (diffMins < 60) relative = `${diffMins} mnt lalu`;
      else if (diffHours < 24) relative = `${diffHours} jam lalu`;
      else if (diffDays === 1) relative = 'Kemarin';
      else if (diffDays < 7) relative = `${diffDays} hari lalu`;
      else relative = `${Math.floor(diffDays / 7)} mgg lalu`;

      const datePart = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      });
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const formatted = `${datePart}, ${hours}:${minutes} WIB`;

      return { formatted, relative };
    } catch {
      return { formatted: String(dateStr || '-'), relative: '' };
    }
  };

  const colorizeJsonValue = (val) => {
    const trimmed = (val || '').trim();
    if (trimmed.startsWith('"')) {
      return <span className="text-emerald-300">{val}</span>;
    }
    if (trimmed.startsWith('true') || trimmed.startsWith('false')) {
      return <span className="text-purple-400 font-bold">{val}</span>;
    }
    if (trimmed.startsWith('null')) {
      return <span className="text-rose-400 font-bold">{val}</span>;
    }
    if (trimmed !== '' && !isNaN(Number(trimmed.replace(',', '')))) {
      return <span className="text-amber-300 font-semibold">{val}</span>;
    }
    return <span className="text-slate-300">{val}</span>;
  };

  const renderJsonCodeView = (obj) => {
    let safeObj = obj;
    if (typeof obj === 'string') {
      try {
        safeObj = JSON.parse(obj);
      } catch {
        safeObj = { raw: obj };
      }
    } else if (!obj || typeof obj !== 'object') {
      safeObj = { value: obj };
    }

    const jsonStr = JSON.stringify(safeObj, null, 2) || '{}';
    const lines = jsonStr.split('\n');

    return (
      <div className="flex font-mono text-xs">
        {/* Line numbers */}
        <div className="select-none text-slate-500 pr-3.5 text-right border-r border-slate-700/80 shrink-0 font-mono">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code content */}
        <div className="pl-3.5 overflow-x-auto flex-1 font-mono">
          {lines.map((line, i) => {
            const keyMatch = line.match(/^(\s*)(".*?")(\s*:\s*)(.*)$/);
            if (keyMatch) {
              const [, indent, key, colon, val] = keyMatch;
              return (
                <div key={i} className="whitespace-pre">
                  {indent}
                  <span className="text-sky-300 font-semibold">{key}</span>
                  <span className="text-slate-400">{colon}</span>
                  {colorizeJsonValue(val)}
                </div>
              );
            }
            return (
              <div key={i} className="whitespace-pre text-slate-300">
                {line}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getLogActionBadge = (action) => {
    const actionStr = typeof action === 'string' ? action : String(action || '-');
    const safeLabel = actionStr.replace(/_/g, ' ');

    switch (actionStr) {
      case 'LOGIN':
        return { label: 'Login', icon: 'log-in', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'LOGOUT':
        return { label: 'Logout', icon: 'log-out', className: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'SYSTEM_SETUP':
        return { label: 'System Setup', icon: 'settings', className: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'USER_MANAGEMENT':
        return { label: 'User Management', icon: 'user-check', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'UPDATE_STATUS':
        return { label: 'Update Status', icon: 'toggle-left', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'DELETE_USER':
      case 'DELETE_PETUGAS':
      case 'HAPUS_PELANGGAN':
        return { label: safeLabel, icon: 'trash-2', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'UPDATE_PELANGGAN':
      case 'UPDATE_PETUGAS':
        return { label: safeLabel, icon: 'edit', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'MASS_UPDATE_PELANGGAN':
        return { label: 'Mass Update Pelanggan', icon: 'layers', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'TAMBAH_PELANGGAN':
        return { label: 'Tambah Pelanggan', icon: 'user-plus', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SYNC_PARTNER_CANCEL':
        return { label: 'Sync Partner Batal', icon: 'refresh-cw', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'SYNC_PARTNER_AKTIF':
        return { label: 'Sync Partner Aktif', icon: 'check-circle-2', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SYNC_PARTNER_NEW':
        return { label: 'Sync Partner Baru', icon: 'user-plus', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SYNC_PARTNER_DISMANTLE':
        return { label: 'Sync Partner Dismantle', icon: 'wrench', className: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'SYNC_PARTNER_SALES':
        return { label: 'Sync Partner Sales', icon: 'users', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'SYNC_PARTNER_DATA':
        return { label: 'Sync Partner Data', icon: 'refresh-cw', className: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: safeLabel, icon: 'activity', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getLogModuleBadge = (module) => {
    const modStr = typeof module === 'string' ? module : String(module || 'Umum');
    switch (modStr) {
      case 'Kelola Pengguna':
      case 'Management User':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Autentikasi':
      case 'Auth':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Data Pelanggan':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Monitoring Tim':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Activity Log Pagination
  const totalLogPages = Math.ceil(activityLogs.length / logItemsPerPage) || 1;
  const safeLogPage = Math.min(Math.max(1, logPage), totalLogPages);
  const startLogIndex = (safeLogPage - 1) * logItemsPerPage;
  const paginatedLogs = activityLogs.slice(startLogIndex, startLogIndex + logItemsPerPage);

  // Jika bukan role admin, blokir tampilan dengan pesan Akses Ditolak
  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto w-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm mt-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <Icon name="shield-alert" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">Akses Ditolak</h3>
        <p className="text-sm text-slate-500 max-w-md mb-2 leading-relaxed">
          Halaman Manajemen Pengguna Sistem hanya dapat diakses oleh akun dengan peran <strong className="text-slate-700">Administrator</strong>.
        </p>
        <span className="text-xs text-slate-400">
          Peran akun Anda saat ini: <span className="font-semibold text-slate-600 capitalize">{currentUser?.role || 'Bukan Admin'}</span>
        </span>
      </div>
    );
  }

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
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* JUDUL & DESKRIPSI */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
            Management User & Hak Akses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola data akun pengguna, kredensial password login, hak akses role, pembagian sektor kerja, dan audit log aktivitas.
          </p>
        </div>

        {/* BARIS KONTROL BAWAH: TAB SWITCHER (KIRI) & TOMBOL AKSI (KANAN) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          {/* TAB MENU SWITCHER: DAFTAR PENGGUNA & LOG ACTIVITY */}
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 w-fit">
            <button
              type="button"
              onClick={() => setActiveMainTab('users')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'users'
                  ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon name="users" size={15} />
              <span>Daftar Pengguna</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeMainTab === 'users' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {usersData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('logs')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'logs'
                  ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon name="history" size={15} />
              <span>Log Activity</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeMainTab === 'logs' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {activityLogs.length}
              </span>
            </button>
          </div>

          {/* TOMBOL AKSI UTAMA */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeMainTab === 'users' ? (
              <>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
                  title="Perbarui daftar pengguna terbaru"
                >
                  <Icon name="refresh-cw" size={14} className={isLoading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
                  <span>Muat Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <Icon name="user-plus" size={15} />
                  <span>Tambah Pengguna</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={fetchActivityLogs}
                disabled={isLogsLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
                title="Perbarui log aktivitas terbaru"
              >
                <Icon name="refresh-cw" size={14} className={isLogsLoading ? 'animate-spin text-blue-600' : 'text-slate-600'} />
                <span>Muat Ulang Log</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeMainTab === 'users' ? (
        <>
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

        {/* 2. Leader (SPV & Team Leader) */}
        <button
          type="button"
          onClick={() => {
            setUserRoleFilter(userRoleFilter === 'leader' ? 'all' : 'leader');
            setUserPage(1);
          }}
          className={`text-left bg-white p-4 rounded-2xl border transition-all cursor-pointer ${userRoleFilter === 'leader'
            ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
            : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leader</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">
                {leaderUsersCount}
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
              <option value="leader">Leader (SPV & TL)</option>
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap ${roleBadge.className}`}>
                          <Icon name={user.role === 'admin' ? 'shield-check' : user.role === 'supervisor' ? 'shield' : user.role === 'helpdesk' ? 'headphones' : 'user'} size={12} className="shrink-0" />
                          <span className="whitespace-nowrap">{roleBadge.label}</span>
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
    </>
  ) : (
    <>
      {/* TABLE VIEW ACTIVITY LOGS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4 min-w-[160px]">Waktu & Tanggal</th>
                <th className="py-3.5 px-4 min-w-[130px] max-w-[150px]">Pengguna</th>
                <th className="py-3.5 px-4 min-w-[120px] whitespace-nowrap">Role & Sektor</th>
                <th className="py-3.5 px-4 min-w-[125px] whitespace-nowrap">Modul</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4 min-w-[260px]">Deskripsi Aktivitas</th>
                <th className="py-3.5 px-4 text-right min-w-[100px]">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLogsLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="refresh-cw" size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data log aktivitas...</span>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="history" size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada log aktivitas ditemukan</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const timeInfo = formatLogTime(log.created_at);
                  const actionBadge = getLogActionBadge(log.action);
                  const roleBadge = getRoleBadge(log.role);
                  const hasMetadata = Boolean(
                    log.metadata &&
                    (typeof log.metadata === 'object'
                      ? Object.keys(log.metadata).length > 0
                      : String(log.metadata).trim().length > 0)
                  );

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. Waktu & Tanggal */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 whitespace-nowrap">
                            {timeInfo.formatted}
                          </div>
                          {timeInfo.relative && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              <Icon name="clock" size={10} />
                              <span>{timeInfo.relative}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Pengguna */}
                      <td className="py-3.5 px-4 align-top min-w-[130px] max-w-[150px]">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 leading-snug truncate" title={log.user_name}>
                            {log.user_name || log.username || 'Sistem'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{log.username || 'sistem'}
                          </div>
                        </div>
                      </td>

                      {/* 3. Role & Sektor */}
                      <td className="py-3.5 px-4 align-top min-w-[120px] whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${roleBadge.className}`}>
                            <span className="whitespace-nowrap">{roleBadge.label}</span>
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${getSektorBadge(log.sektor)}`}>
                            {log.sektor || 'Semua'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Modul */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${getLogModuleBadge(log.module)}`}>
                          {log.module || 'Umum'}
                        </span>
                      </td>

                      {/* 5. Aksi */}
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border whitespace-nowrap ${actionBadge.className}`}>
                          <Icon name={actionBadge.icon} size={11} />
                          <span>{actionBadge.label}</span>
                        </span>
                      </td>

                      {/* 6. Deskripsi Aktivitas */}
                      <td className="py-3.5 px-4 align-top">
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {log.description || '-'}
                        </p>
                      </td>

                      {/* 7. Detail Button */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogModal(log);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                            hasMetadata
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                          }`}
                          title="Klik untuk membuka pop-up detail data perubahan"
                        >
                          <Icon name="file-text" size={13} className={hasMetadata ? 'text-blue-600' : 'text-slate-500'} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER LOGS */}
        {totalLogPages > 1 && (
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan <strong className="text-slate-700">{paginatedLogs.length}</strong> dari{' '}
              <strong className="text-slate-700">{activityLogs.length}</strong> catatan aktivitas
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeLogPage <= 1}
                onClick={() => setLogPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Halaman sebelumnya"
              >
                <Icon name="chevron-left" size={14} />
              </button>
              <span className="font-bold px-2 text-slate-700">Halaman {safeLogPage} dari {totalLogPages}</span>
              <button
                type="button"
                disabled={safeLogPage >= totalLogPages}
                onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 cursor-pointer"
                aria-label="Halaman berikutnya"
              >
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL POP UP DETAIL LOG & TAMPILAN FILE CODE JSON */}
      {selectedLogModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop Gelap Menyeluruh Tanpa Blur */}
          <div
            className="fixed inset-0 bg-slate-950/75 transition-opacity"
            onClick={() => setSelectedLogModal(null)}
          />

          {/* Dialog Card Modal */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/90 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon name="file-code-2" size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                    Detail Log Aktivitas & Data Perubahan
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedLogModal.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Ringkasan Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Waktu WIB</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatLogTime(selectedLogModal.created_at).formatted}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktor / Pengguna</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate" title={selectedLogModal.user_name}>
                    {selectedLogModal.user_name || selectedLogModal.username}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">@{selectedLogModal.username}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Modul</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border mt-1 ${getLogModuleBadge(selectedLogModal.module)}`}>
                    {selectedLogModal.module || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Aksi</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getLogActionBadge(selectedLogModal.action).className}`}>
                    <Icon name={getLogActionBadge(selectedLogModal.action).icon} size={10} />
                    <span>{getLogActionBadge(selectedLogModal.action).label}</span>
                  </span>
                </div>
              </div>

              {/* Deskripsi Aktivitas Box */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <Icon name="message-square" size={13} className="text-blue-600" />
                  <span>Deskripsi Aktivitas:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedLogModal.description || '-'}
                </p>
              </div>

              {/* TAMPILAN FILE CODE JSON */}
              <div className="rounded-xl overflow-hidden border border-slate-800 shadow-md bg-[#0f172a]">
                {/* Top Bar Window like Code Editor */}
                <div className="px-4 py-2.5 bg-[#1e293b] flex items-center border-b border-slate-800">
                  {/* Left: macOS dots & filename */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                    </div>
                    <span className="text-slate-400 text-xs font-mono pl-2 flex items-center gap-1.5">
                      <Icon name="file-code" size={13} className="text-sky-400" />
                      <span>changes.json</span>
                    </span>
                  </div>
                </div>

                {/* Code Editor Body with Line Numbers & Colors */}
                <div className="p-4 font-mono text-xs overflow-x-auto max-h-[300px] overflow-y-auto leading-relaxed text-slate-200">
                  {renderJsonCodeView(
                    selectedLogModal.metadata &&
                    (typeof selectedLogModal.metadata === 'object'
                      ? Object.keys(selectedLogModal.metadata).length > 0
                      : String(selectedLogModal.metadata).trim().length > 0)
                      ? selectedLogModal.metadata
                      : {
                          status: "Tidak ada metadata perubahan langsung",
                          action: selectedLogModal.action,
                          module: selectedLogModal.module,
                          actor: selectedLogModal.username,
                          timestamp: selectedLogModal.created_at
                        }
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )}

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
