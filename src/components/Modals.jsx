import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  AlertCircle, 
  Info,
  CheckCircle,
  Clock,
  ChevronDown,
  User,
  Wrench,
  FileText,
  Radar
} from 'lucide-react';
import { toProperCase } from '../utils';

export const ActionModal = ({ type, data, onClose, onLocalPelangganUpdate, petugasList = [] }) => {
  const [formData, setFormData] = useState(data || {
    namaPelanggan: '',
    idPelanggan: '',
    stasiun: '',
    aktivasi: 'Belum',
    nomorHp: '',
    alamat: '',
    latitude: '',
    longitude: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Logic for API call would go here
    setTimeout(() => {
      onLocalPelangganUpdate && onLocalPelangganUpdate(formData);
      setIsSaving(false);
      onClose(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => onClose(false)}></div>
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 animate-modal overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-base sm:text-xl font-black text-slate-800 flex items-center">
            {type === 'add' ? 'Tambah Pelanggan Baru' : type === 'edit' ? 'Edit Data Pelanggan' : 'Detail Pelanggan'}
          </h2>
          <button onClick={() => onClose(false)} className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1 block">Nama Pelanggan</label>
              <input 
                type="text" 
                value={formData.namaPelanggan}
                onChange={(e) => setFormData({...formData, namaPelanggan: e.target.value})}
                className="w-full p-2 sm:p-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1 block">ID Pelanggan</label>
              <input 
                type="text" 
                value={formData.idPelanggan}
                onChange={(e) => setFormData({...formData, idPelanggan: e.target.value})}
                className="w-full p-2 sm:p-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t bg-slate-50 flex justify-end gap-2 sm:gap-3">
          <button onClick={() => onClose(false)} className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Batal</button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 shadow-md sm:shadow-lg shadow-blue-500/30 flex items-center gap-2"
          >
            {isSaving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};

export const MassUpdateModal = ({ selectedData, onClose, onLocalPelangganUpdate }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade" onClick={() => onClose(false)}></div>
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg relative z-10 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-black mb-2 sm:mb-4">Update Massal ({selectedData.length} Data)</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Fitur ini memungkinkan Anda mengubah status banyak pelanggan sekaligus.</p>
        <div className="flex justify-end gap-2">
           <button onClick={() => onClose(false)} className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-500">Batal</button>
           <button className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-lg">Terapkan</button>
        </div>
      </div>
    </div>
  );
};
