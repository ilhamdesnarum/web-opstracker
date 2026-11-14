import { supabase } from '../supabaseClient.js';

/**
 * Mendapatkan info user yang sedang aktif dari localStorage
 */
export const getCurrentAuthUser = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('otas_user');
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Gagal membaca otas_user dari localStorage:', e);
  }
  return null;
};

/**
 * Log activity audit trail ke tabel activity_logs di Supabase.
 * Bersifat non-blocking dan safe agar tidak pernah menggagalkan aksi utama pengguna.
 *
 * @param {Object} params
 * @param {string} params.module - Modul fitur ('Data Pelanggan', 'Data Gangguan', 'Monitoring Tim', 'Kelola Pengguna', 'Autentikasi')
 * @param {string} params.action - Aksi operasional ('UPDATE_PELANGGAN', 'INPUT_TIKET', 'RESOLVE_GANGGUAN', 'UPDATE_PETUGAS', 'LOGIN', 'LOGOUT')
 * @param {string} params.description - Deskripsi ringkas aktivitas yang mudah dipahami manusia
 * @param {Object|null} [params.metadata] - Data detail perubahan yang diformat sebagai JSON (payload changes)
 * @param {Object|null} [params.actor] - User aktor opsional (jika tidak diberikan, diambil otomatis dari otas_user)
 * @returns {Promise<Object|null>} Data log yang tersimpan atau null
 */
export const logActivity = async ({
  module = 'Umum',
  action = 'ACTIVITY',
  description = '',
  metadata = null,
  actor = null
}) => {
  try {
    const user = actor || getCurrentAuthUser();

    const payload = {
      username: user?.username || 'system',
      user_name: user?.name || user?.nama_lengkap || user?.username || 'Sistem',
      role: user?.role || 'admin',
      sektor: user?.sektor || 'Semua',
      module,
      action,
      description: description || `${action} pada modul ${module}`,
      metadata: metadata || null
    };

    // Sertakan user_id jika berbentuk UUID valid
    if (user?.id && typeof user.id === 'string' && /^[0-9a-f-]{36}$/i.test(user.id)) {
      payload.user_id = user.id;
    }

    const { data, error } = await supabase.from('activity_logs').insert([payload]).select();

    if (error) {
      // Jika kolom user_id ditolak karena tipe data/foreign key, retry tanpa user_id
      if (payload.user_id) {
        delete payload.user_id;
        const retry = await supabase.from('activity_logs').insert([payload]).select();
        if (!retry.error && retry.data && retry.data[0]) {
          return retry.data[0];
        }
      }
      console.warn('Gagal mencatat log audit ke Supabase:', error.message);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.warn('Error logActivity:', err);
    return null;
  }
};

export default logActivity;

