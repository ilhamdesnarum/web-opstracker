import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Save,
  Trash2,
  AlertCircle,
  Check,
  Clock,
  FileText,
  Hash,
  Layers,
  MapPin
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const DEFAULT_STATIONS = [
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

export const ManagePoFormModal = ({
  isOpen,
  onClose,
  initialStation = '',
  poToEdit = null, // If null -> Add mode. If provided -> Edit mode.
  onSuccess
}) => {
  const isEdit = Boolean(poToEdit);

  const [formData, setFormData] = useState({
    stasiun: initialStation || '',
    noPoRelease: '',
    jenisPo: 'Direct',
    tahapPembangunan: '',
    segmen: 'Reguler',
    hpReguler: 0,
    hpPercepatan: 0,
    hpRfs: 0,
    catatan: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (poToEdit) {
      setFormData({
        stasiun: poToEdit.stasiun || initialStation || '',
        noPoRelease: poToEdit.noPoRelease || '',
        jenisPo: poToEdit.jenisPo || 'Direct',
        tahapPembangunan: poToEdit.tahapPembangunan || '',
        segmen: poToEdit.segmen || (String(poToEdit.tahapPembangunan || '').toLowerCase().includes('percepatan') ? 'Percepatan' : 'Reguler'),
        hpReguler: poToEdit.hp_reguler || poToEdit.hpReguler || '',
        hpPercepatan: poToEdit.hp_percepatan || poToEdit.hpPercepatan || '',
        hpRfs: poToEdit.hp_rfs || poToEdit.hpRfs || '',
        catatan: poToEdit.catatan || ''
      });
    } else {
      setFormData({
        stasiun: initialStation || '',
        noPoRelease: '',
        jenisPo: 'Direct',
        tahapPembangunan: '',
        segmen: 'Reguler',
        hpReguler: 0,
        hpPercepatan: 0,
        hpRfs: 0,
        catatan: ''
      });
    }
    setErrorMessage('');
    setShowConfirmDelete(false);
  }, [poToEdit, initialStation, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Otomatis sesuaikan segmen jika tahap pembangunan diubah
      if (field === 'tahapPembangunan') {
        const lower = String(value).toLowerCase();
        if (lower.includes('percepatan')) updated.segmen = 'Percepatan';
        else if (lower.includes('reguler')) updated.segmen = 'Reguler';
      }

      // Reset nilai HP yang tidak relevan jika segmen diubah
      if (field === 'segmen' || field === 'tahapPembangunan') {
        if (updated.segmen === 'Reguler') {
          updated.hpPercepatan = 0;
        } else if (updated.segmen === 'Percepatan') {
          updated.hpReguler = 0;
        }
      }

      return updated;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.stasiun.trim()) {
      setErrorMessage('Pilih atau masukkan stasiun.');
      return;
    }
    if (!formData.noPoRelease.trim()) {
      setErrorMessage('Nomor PO Release wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const hpReg = parseInt(formData.hpReguler, 10) || 0;
      const hpPerc = parseInt(formData.hpPercepatan, 10) || 0;
      const totalHp = hpReg + hpPerc;
      const hpRfs = parseInt(formData.hpRfs, 10) || 0;

      const payload = {
        stasiun: formData.stasiun.trim(),
        no_po_release: formData.noPoRelease.trim(),
        jenis_po: formData.jenisPo || 'Direct',
        tahap_pembangunan: formData.tahapPembangunan.trim(),
        segmen: formData.segmen,
        hp_reguler: hpReg,
        hp_percepatan: hpPerc,
        hp_rfs: hpRfs,
        catatan: formData.catatan ? formData.catatan.trim() : null
      };

      if (isEdit) {
        // Update by no_po_release instead of id, since id might be missing if data comes from Google Sheets
        const { error } = await supabase
          .from('po_release')
          .update(payload)
          .eq('no_po_release', poToEdit.noPoRelease || poToEdit.no_po_release)
          .eq('stasiun', poToEdit.stasiun);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('po_release')
          .insert([payload]);

        if (error) throw error;
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving PO:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data ke Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!poToEdit || (!poToEdit.id && !poToEdit.noPoRelease && !poToEdit.no_po_release)) return;
    setIsDeleting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('po_release')
        .delete()
        .eq(poToEdit.id ? 'id' : 'no_po_release', poToEdit.id || poToEdit.noPoRelease || poToEdit.no_po_release)
        .eq('stasiun', poToEdit.stasiun);

      if (error) throw error;

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting PO:', err);
      setErrorMessage(err.message || 'Gagal menghapus data dari Supabase.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${isEdit ? 'bg-amber-600' : 'bg-blue-600'}`}>
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                {isEdit ? 'Edit Data PO Release' : 'Tambah PO Release Baru'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEdit ? `Memperbarui rincian PO untuk stasiun ${formData.stasiun}` : 'Data akan tersimpan langsung di Supabase dan terintegrasi otomatis.'}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {/* Baris 1: Stasiun & Nomor PO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Stasiun <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  list="station-options"
                  type="text"
                  required
                  placeholder="Pilih atau ketik stasiun..."
                  value={formData.stasiun}
                  onChange={(e) => handleChange('stasiun', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <datalist id="station-options">
                  {DEFAULT_STATIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Nomor PO Release <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PO.2025.10.00052"
                value={formData.noPoRelease}
                onChange={(e) => handleChange('noPoRelease', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Baris 2: Jenis PO, Tahap Pembangunan, Segmen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Jenis PO
              </label>
              <select
                value={formData.jenisPo}
                onChange={(e) => handleChange('jenisPo', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="Direct">Direct</option>
                <option value="Handover">Handover</option>
                <option value="Percepatan">Percepatan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Tahap Pembangunan
              </label>
              <input
                type="text"
                placeholder="Contoh: Reguler 1024"
                value={formData.tahapPembangunan}
                onChange={(e) => handleChange('tahapPembangunan', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Segmen
              </label>
              <select
                value={formData.segmen}
                onChange={(e) => handleChange('segmen', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="Reguler">Reguler</option>
                <option value="Percepatan">Percepatan</option>
              </select>
            </div>
          </div>

          {/* Baris 3: Homepass (Reguler & Percepatan) */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash size={14} className="text-blue-600" />
                Kapasitas Homepass (HP)
              </span>
              <span className="text-[11px] font-black text-blue-700">
                Total HP: {(Number(formData.hpReguler || 0) + Number(formData.hpPercepatan || 0)).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {formData.segmen === 'Reguler' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">HP Reguler</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hpReguler}
                    onChange={(e) => handleChange('hpReguler', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              )}
              {formData.segmen === 'Percepatan' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">HP Percepatan</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hpPercepatan}
                    onChange={(e) => handleChange('hpPercepatan', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">HP RFS</label>
                <input
                  type="number"
                  min="0"
                  value={formData.hpRfs}
                  onChange={(e) => handleChange('hpRfs', e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs sm:text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Info Dinamis */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100/80 flex items-start gap-2.5">
            <Check size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[11px] text-blue-900 leading-relaxed">
              <span className="font-bold">Kalkulasi HC & Performansi Otomatis:</span> Angka Total Aktivasi, HC Aktif, Suspend, Ready to Dismantle, Dismantled, dan Performa (%) dihitung secara dinamis dari data riil pelanggan di Database. Anda cukup mengelola kapasitas Homepass (HP) untuk PO ini.
            </div>
          </div>

          {/* Baris 5: Catatan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Tambahkan catatan khusus bila ada..."
              value={formData.catatan}
              onChange={(e) => handleChange('catatan', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Konfirmasi Hapus */}
          {showConfirmDelete && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-rose-800">
                Yakin ingin menghapus PO ini dari Supabase? Tindakan ini tidak dapat dibatalkan.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-lg font-bold transition-all"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mt-4 mb-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEdit ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Hapus PO
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5"
              >
                {isSaving ? <Clock className="animate-spin" size={15} /> : <Save size={15} />}
                {isEdit ? 'Perbarui PO' : 'Simpan PO Baru'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
