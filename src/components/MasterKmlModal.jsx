import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { parseKmlOrKmz } from '../utils/kmlHelper';

const BUCKET_NAME = "kmz-master";

// Komponen Icon Vektor Lucide
const Icon = ({ name, size = 16, className = "" }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (window.lucide && containerRef.current) {
      containerRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px;"></i>`;
      window.lucide.createIcons({ root: containerRef.current });
    }
  }, [name, size, className]);
  return <span ref={containerRef} style={{ display: 'contents' }} />;
};

// Helper: Format ukuran file dalam KB/MB
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper: Format waktu ke zona WIB (Asia/Jakarta)
function formatWibDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d) + ' WIB';
  } catch (e) {
    return isoStr;
  }
}

// Helper: Hitung selisih waktu relatif
function getRelativeTime(isoStr) {
  if (!isoStr) return '';
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Baru saja';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 30) return `${diffDays} hari lalu`;
    return '';
  } catch (e) {
    return '';
  }
}

export default function MasterKmlModal({ isOpen, onClose, onPlotToMap }) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null); // { fileName, isUploading: bool }
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message: string }
  const [targetReplaceFile, setTargetReplaceFile] = useState(null); // nama file yang sedang ditargetkan untuk update
  const [showRlsGuide, setShowRlsGuide] = useState(false);
  const [loadingMapFile, setLoadingMapFile] = useState(null); // nama file yang sedang di-download & di-parse ke peta

  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  // Ambil daftar file dari bucket kmz-master
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 200,
          sortBy: { column: 'updated_at', order: 'desc' }
        });

      if (error) {
        throw error;
      }

      // Filter agar folder atau file tersembunyi tidak masuk
      const fileList = (data || []).filter(item => item.name && !item.name.startsWith('.'));
      setFiles(fileList);
    } catch (err) {
      console.error("Gagal memuat file master:", err);
      showToast('error', 'Gagal memuat daftar file: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setShowRlsGuide(false);
    }
  }, [isOpen]);

  // Toast Notifikasi
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // Handler upload file baru atau update file yang ada
  const handleFileUpload = async (file, customName = null) => {
    if (!file) return;

    const fileName = customName || file.name;
    const isUpdate = !!customName;

    setUploadProgress({ fileName, isUploading: true });
    try {
      // Upsert: true agar file yang namanya sama otomatis diperbarui/ditimpa
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        if (error.message && error.message.toLowerCase().includes('row-level security')) {
          setShowRlsGuide(true);
        }
        throw error;
      }

      showToast('success', isUpdate 
        ? `File "${fileName}" berhasil diperbarui!` 
        : `File "${fileName}" berhasil diupload ke Master KML!`
      );

      // Refresh daftar file
      await fetchFiles();
    } catch (err) {
      console.error("Upload error:", err);
      showToast('error', 'Gagal upload file: ' + (err.message || 'Kesalahan jaringan/izin RLS'));
    } finally {
      setUploadProgress(null);
      setTargetReplaceFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  // Trigger file picker untuk upload file baru
  const onSelectNewFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Trigger file picker untuk update/timpa file tertentu
  const onSelectReplaceFile = (e) => {
    const file = e.target.files?.[0];
    if (file && targetReplaceFile) {
      handleFileUpload(file, targetReplaceFile);
    }
  };

  const handleStartReplace = (item) => {
    setTargetReplaceFile(item.name);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.click();
    }
  };

  // Download file
  const handleDownload = async (item) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(item.name);

      if (error) throw error;

      // Buat link download virtual
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('info', `Mendownload ${item.name}...`);
    } catch (err) {
      // Fallback ke Public URL
      const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(item.name);
      if (pubData?.publicUrl) {
        window.open(pubData.publicUrl, '_blank');
      } else {
        showToast('error', 'Gagal mengunduh file: ' + err.message);
      }
    }
  };

  // Tampilkan file KML/KMZ ke peta
  const handleShowOnMap = async (item) => {
    setLoadingMapFile(item.name);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(item.name);

      if (error) throw error;

      const { geojson, folders } = await parseKmlOrKmz(data, item.name);

      if (onPlotToMap) {
        onPlotToMap({
          fileName: item.name,
          geojson,
          folders
        });
      }

      onClose();
    } catch (err) {
      console.error("Gagal menampilkan KML ke peta:", err);
      showToast('error', 'Gagal memproses file KML: ' + (err.message || 'Error'));
    } finally {
      setLoadingMapFile(null);
    }
  };

  // Salin Link Publik
  const handleCopyLink = (item) => {
    const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(item.name);
    if (pubData?.publicUrl) {
      navigator.clipboard.writeText(pubData.publicUrl);
      showToast('success', 'Link download publik disalin ke clipboard!');
    }
  };

  // Hapus File
  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus file "${item.name}" dari data master?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([item.name]);

      if (error) throw error;

      showToast('success', `File "${item.name}" berhasil dihapus.`);
      setFiles(prev => prev.filter(f => f.name !== item.name));
    } catch (err) {
      showToast('error', 'Gagal menghapus file: ' + err.message);
    }
  };

  if (!isOpen) return null;

  // Filter file sesuai pencarian
  const filteredFiles = files.filter(f => {
    if (!searchQuery.trim()) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm animate-fade"
        onClick={() => !uploadProgress && onClose()} 
      />

      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onSelectNewFile} 
        accept=".kml,.kmz,.zip,.xml" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={replaceFileInputRef} 
        onChange={onSelectReplaceFile} 
        accept=".kml,.kmz,.zip,.xml" 
        className="hidden" 
      />

      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-modal">
        
        {/* HEADER MODAL */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Icon name="layers" size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Master KML / KMZ</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola file master peta jaringan & sebaran pelanggan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              title="Refresh Daftar File"
            >
              <Icon name="refresh-cw" size={17} className={isLoading ? "animate-spin text-blue-600" : ""} />
            </button>
            <button 
              onClick={onClose}
              disabled={!!uploadProgress}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* TOAST ALERT */}
        {toast && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert-circle' : 'info'} size={15} />
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="hover:opacity-75">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {/* PANDUAN JIKA TERDAPAT KENDALA IZIN UPLOAD */}
        {showRlsGuide && (
          <div className="mx-6 mt-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-start gap-2.5">
              <Icon name="shield-alert" size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-bold text-amber-900">Perhatian: Izin Akses Upload Belum Aktif</div>
                <p className="text-[11.5px] text-amber-800">
                  Izin penyimpanan file master belum diaktifkan di server. Silakan hubungi tim administrator untuk mengaktifkan izin upload/update file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH & ACTIONS BAR */}
        <div className="p-4 sm:p-6 pb-2 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Input Pencarian */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={14} />
              </div>
              <input
                type="text"
                placeholder="Cari file master KML/KMZ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>

            {/* Tombol Upload File Baru */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploadProgress}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0 disabled:opacity-50"
            >
              <Icon name="upload-cloud" size={15} />
              <span>Upload File Master Baru</span>
            </button>
          </div>

          {/* Indikator Loading Upload */}
          {uploadProgress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-fade">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
              <div className="text-xs text-blue-900 font-semibold truncate flex-1">
                Sedang mengupload & memperbarui <strong>{uploadProgress.fileName}</strong> ke Supabase...
              </div>
            </div>
          )}
        </div>

        {/* DAFTAR FILE (TABLE / LIST) */}
        <div className="p-4 sm:p-6 pt-2 overflow-y-auto flex-1 custom-scrollbar">
          {isLoading && files.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold text-slate-500">Memuat daftar file master...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Icon name="file-question" size={26} />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                {searchQuery ? 'File Tidak Ditemukan' : 'Belum Ada File Master Tersimpan'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery 
                  ? `Tidak ada file yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Unggah file master KML atau KMZ pertama Anda untuk mulai mengelola peta jaringan terpusat.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Upload File Master Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredFiles.map((item) => {
                const isKmz = item.name.toLowerCase().endsWith('.kmz');
                const isKml = item.name.toLowerCase().endsWith('.kml');
                const fileSize = formatFileSize(item.metadata?.size);
                const updatedIso = item.updated_at || item.created_at || item.metadata?.lastModified;
                const formattedDate = formatWibDateTime(updatedIso);
                const relTime = getRelativeTime(updatedIso);
                const isUpdatingThis = uploadProgress?.fileName === item.name;

                return (
                  <div
                    key={item.id || item.name}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-xs"
                  >
                    {/* INFO FILE */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px] shadow-xs ${
                        isKmz 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : isKml 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isKmz ? 'KMZ' : isKml ? 'KML' : 'FILE'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {fileSize}
                          </span>
                        </div>

                        {/* WAKTU TERAKHIR UPDATE */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                            <Icon name="clock" size={12} className="text-blue-500" />
                            Terakhir di-update: <strong className="text-slate-800">{formattedDate}</strong>
                          </span>
                          {relTime && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded">
                              ({relTime})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end flex-wrap">
                      
                      {/* Tombol Tampilkan di Peta (Icon Map) */}
                      <button
                        onClick={() => handleShowOnMap(item)}
                        disabled={!!uploadProgress || !!loadingMapFile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                        title="Tampilkan layer KML ini langsung ke peta"
                      >
                        {loadingMapFile === item.name ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Icon name="map" size={13} />
                        )}
                        <span>Tampilkan di Peta</span>
                      </button>

                      {/* Tombol Update / Timpa File */}
                      <button
                        onClick={() => handleStartReplace(item)}
                        disabled={!!uploadProgress || !!loadingMapFile}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Klik untuk memilih file baru dan menimpa file master ini"
                      >
                        {isUpdatingThis ? (
                          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Icon name="refresh-cw" size={13} />
                        )}
                        <span>Update File</span>
                      </button>

                      {/* Tombol Download */}
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all inline-flex items-center gap-1"
                        title="Download file ke komputer"
                      >
                        <Icon name="download" size={14} className="text-slate-500" />
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      {/* Tombol Hapus */}
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Hapus file dari master"
                      >
                        <Icon name="trash-2" size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Icon name="info" size={14} className="text-blue-500 shrink-0" />
            <span>
              Total: <strong>{files.length} file master</strong> terdaftar
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 bg-white border border-slate-200 transition-all"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
