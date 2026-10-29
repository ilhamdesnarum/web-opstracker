import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import XLSX from 'xlsx-js-style';
import { toBlob } from 'html-to-image';
import { supabase } from '../supabaseClient';
import { toProperCase } from '../utils';

import Icon from './Icon';

// Helper: Format tanggal YYYY-MM-DD
const formatDateToYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: Parse format tanggal fleksibel (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, ISO)
const parseAnyDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return null;

  // DD/MM/YY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += 2000;
    const m = parseInt(dmy[2], 10) - 1;
    const d = parseInt(dmy[1], 10);
    return new Date(y, m, d);
  }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
};

// Helper: Cek kecocokan hari persis
const isSameDay = (itemDateStr, targetYMD) => {
  if (!itemDateStr) return false;
  const d = parseAnyDate(itemDateStr);
  if (!d) return false;
  return formatDateToYMD(d) === targetYMD;
};

// Helper: Cek kecocokan nama / username petugas
const isMatchMember = (rawOfficer, member) => {
  if (!rawOfficer || !member) return false;
  const raw = String(rawOfficer).trim().toLowerCase().replace(/^@/, '');
  if (!raw || raw === '-' || raw === 'unknown') return false;

  const uName = String(member.username || '').trim().toLowerCase().replace(/^@/, '');
  const mName = String(member.nama || '').trim().toLowerCase();

  // 1. Cocok persis username (contoh: tyyexo === tyyexo)
  if (uName && raw === uName) return true;
  // 2. Cocok persis nama lengkap
  if (mName && raw === mName) return true;

  // 3. Username diawali / berawalan sama
  if (uName && (raw.startsWith(uName) || uName.startsWith(raw))) return true;

  // 4. Token match: Ekstrak kata-kata (dipisah spasi, underscore, titik, minus)
  const rawTokens = raw.split(/[._\s-]+/).filter(t => t.length >= 3);
  const memberTokens = mName.split(/[._\s-]+/).filter(t => t.length >= 3);

  // Kata pertama / nama panggilan utama teknisi (contoh: 'tyo', 'baskoro', 'adji', 'yogi')
  const primaryMemberName = memberTokens[0];
  if (primaryMemberName && primaryMemberName.length >= 3) {
    if (rawTokens.includes(primaryMemberName)) return true;
    if (raw.startsWith(primaryMemberName)) return true;
  }

  // Jika username teknisi persis ada di salah satu token raw
  if (uName && rawTokens.includes(uName)) return true;

  return false;
};

export default function TeamPerformanceView({
  teknisiList = [],
  pelangganData = [],
  visitData = [],
  odpData = [],
  woDispatchData = [],
  onLocalWoDispatchDelete,
  isLoading = false,
  isSyncing = false,
  onRefresh,
  onRefreshSilent
}) {
  // Tanggal Harian yang dipilih
  const todayYMD = useMemo(() => formatDateToYMD(new Date()), []);
  const [selectedDateYMD, setSelectedDateYMD] = useState(todayYMD);

  // Filter Stasiun & Pencarian
  const [stationFilter, setStationFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Snapshot State
  const snapshotRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, teamData: null, activeTab: 'semua' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal Konfirmasi Kustom (Pengganti window.confirm / alert bawaan browser)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    confirmType: 'danger',
    onConfirm: null
  });

  // Modal Kelola Tim & Team Leader
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [draftClusters, setDraftClusters] = useState([]);
  const [activeStationIdx, setActiveStationIdx] = useState(0);
  const [stationTagInput, setStationTagInput] = useState('');

  const [isSavingClusters, setIsSavingClusters] = useState(false);
  const [isClustersLoading, setIsClustersLoading] = useState(true);

  // Plotting Tim per Stasiun (Disimpan di Supabase Cloud dengan fallback localStorage)
  const [stationClusters, setStationClusters] = useState(() => {
    try {
      const saved = localStorage.getItem('starlite_station_clusters_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Gagal membaca saved clusters:", e);
    }
    return [];
  });

  // Sinkronisasi data plotting tim dari Supabase Cloud & Realtime Listener
  useEffect(() => {
    let isMounted = true;

    const fetchSupabaseClusters = async () => {
      setIsClustersLoading(true);
      try {
        const { data, error } = await supabase
          .from('starlite_team_config')
          .select('clusters')
          .eq('id', 'current_clusters')
          .maybeSingle();

        if (!error && data && Array.isArray(data.clusters) && data.clusters.length > 0) {
          if (isMounted) {
            setStationClusters(data.clusters);
            try {
              localStorage.setItem('starlite_station_clusters_v3', JSON.stringify(data.clusters));
            } catch (e) {
              console.error(e);
            }
          }
        } else if (!error && (!data || !data.clusters || data.clusters.length === 0)) {
          // Jika di cloud belum ada data tetapi ada data lokal, unggah data lokal ke cloud
          const localData = localStorage.getItem('starlite_station_clusters_v3');
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                await supabase.from('starlite_team_config').upsert({
                  id: 'current_clusters',
                  clusters: parsed,
                  updated_at: new Date().toISOString()
                });
              }
            } catch (e) { }
          }
        }
      } catch (err) {
        console.warn("Info sinkronisasi tim Supabase:", err);
      } finally {
        if (isMounted) setIsClustersLoading(false);
      }
    };

    fetchSupabaseClusters();

    // Listener Realtime Supabase (Otomatis sinkron jika ada admin lain mengubah tim)
    const channel = supabase
      .channel('public:starlite_team_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'starlite_team_config', filter: 'id=eq.current_clusters' },
        (payload) => {
          if (payload.new && Array.isArray(payload.new.clusters) && payload.new.clusters.length > 0) {
            if (isMounted) {
              setStationClusters(payload.new.clusters);
              try {
                localStorage.setItem('starlite_station_clusters_v3', JSON.stringify(payload.new.clusters));
              } catch (e) { }
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Lookup data teknisi dari database untuk saran autocomplete & resolusi username
  const teknisiLookupMap = useMemo(() => {
    const map = new Map();
    (teknisiList || []).forEach(t => {
      if (t.nama) {
        const trimmed = t.nama.trim().toLowerCase();
        let u = (t.username || t.telegram || '').trim();
        if (u && u !== '-' && !u.startsWith('@')) {
          u = '@' + u;
        }
        map.set(trimmed, {
          nama: t.nama.trim(),
          username: u
        });
      }
    });
    return map;
  }, [teknisiList]);

  // Helper: Dapatkan username teknisi untuk ditampilkan di bawah nama tim
  const getMemberUsername = (a) => {
    if (!a) return '';
    // 1. Cek langsung username di anggota tim
    let u = (a.username || '').trim();

    // 2. Jika belum ada di a.username, cari di data teknisi (teknisiList) berdasarkan nama lengkap
    if (!u && a.nama) {
      const trimmedNama = a.nama.trim().toLowerCase();
      const found = teknisiLookupMap.get(trimmedNama);
      if (found && found.username) {
        u = found.username.trim();
      } else {
        // Coba cari kecocokan sebagian jika nama lengkap lebih panjang atau berupa substring
        for (const [k, v] of teknisiLookupMap.entries()) {
          if (v.username && (trimmedNama.includes(k) || k.includes(trimmedNama))) {
            u = v.username.trim();
            break;
          }
        }
      }
    }

    if (u && u !== '-') {
      return u.startsWith('@') ? u : `@${u}`;
    }

    // 3. Fallback jika teknisi belum memiliki username: tampilkan nama panggilan (kata pertama)
    if (a.nama) {
      return a.nama.trim().split(/\s+/)[0];
    }
    return '';
  };

  const uniqueTeknisiList = useMemo(() => {
    return Array.from(teknisiLookupMap.values());
  }, [teknisiLookupMap]);

  // Master Default Kode Stasiun dari Database (Tabel starlite_station_counts kolom kode_stasiun)
  const DEFAULT_STATION_CODES = [
    { kode_stasiun: 'ATA', stasiun: 'Alastua', sektor: 'Tengah' },
    { kode_stasiun: 'BBG', stasiun: 'Brumbung', sektor: 'Tengah' },
    { kode_stasiun: 'KBD', stasiun: 'Kalibodri', sektor: 'Barat' },
    { kode_stasiun: 'KLN', stasiun: 'Kaliwungu', sektor: 'Barat' },
    { kode_stasiun: 'KNN', stasiun: 'Kradenan', sektor: 'Timur' },
    { kode_stasiun: 'KNS', stasiun: 'Krengseng', sektor: 'Barat' },
    { kode_stasiun: 'RBG', stasiun: 'Randublatung', sektor: 'Timur' },
    { kode_stasiun: 'SMT', stasiun: 'Semarang Tawang', sektor: 'Tengah' },
    { kode_stasiun: 'SL', stasiun: 'Sulur', sektor: 'Timur' },
    { kode_stasiun: 'WDU', stasiun: 'Wadu', sektor: 'Timur' },
    { kode_stasiun: 'WLR', stasiun: 'Weleri', sektor: 'Barat' }
  ];

  const [stationMasterList, setStationMasterList] = useState(DEFAULT_STATION_CODES);

  // Fetch data kode_stasiun langsung dari tabel starlite_station_counts Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchStationMaster = async () => {
      try {
        const { data, error } = await supabase
          .from('starlite_station_counts')
          .select('stasiun, kode_stasiun, sektor');
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          const validList = data
            .filter(d => d.kode_stasiun)
            .map(d => ({
              kode_stasiun: String(d.kode_stasiun).trim().toUpperCase(),
              stasiun: String(d.stasiun || '').trim(),
              sektor: d.sektor || ''
            }));
          if (validList.length > 0) {
            setStationMasterList(validList);
          }
        }
      } catch (e) {
        console.warn("Gagal fetch master stasiun dari starlite_station_counts:", e);
      }
    };
    fetchStationMaster();
    return () => { isMounted = false; };
  }, []);

  // Mapping Kode Stasiun ke Nama Stasiun
  const stationCodeToNameMap = useMemo(() => {
    const map = {};
    stationMasterList.forEach(s => {
      if (s.kode_stasiun) {
        map[s.kode_stasiun.toUpperCase()] = s.stasiun;
      }
    });
    return map;
  }, [stationMasterList]);

  // Mapping Nama Panjang Stasiun ke Kode Stasiun
  const stationNameToCodeMap = useMemo(() => {
    const map = {};
    stationMasterList.forEach(s => {
      if (s.kode_stasiun) {
        const code = s.kode_stasiun.toUpperCase();
        if (s.stasiun) {
          map[s.stasiun.toUpperCase()] = code;
        }
        map[code] = code;
      }
    });
    // Alias fleksibel
    map['TAWANG'] = 'SMT';
    map['SEMARANG TAWANG'] = 'SMT';
    return map;
  }, [stationMasterList]);

  // Helper: Ambil array daftar stasiun dari suatu cluster (support st.stasiunList array & st.stasiun string)
  const getStationList = (st) => {
    if (!st) return [];
    if (Array.isArray(st.stasiunList) && st.stasiunList.length > 0) {
      return st.stasiunList;
    }
    if (st.stasiun) {
      return String(st.stasiun).split(/[-–—,]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    return [];
  };

  // Handler Buka Modal Kelola Tim
  const handleOpenManageModal = () => {
    const list = JSON.parse(JSON.stringify(stationClusters || []));
    list.forEach(st => {
      if (!st.stasiunList || !Array.isArray(st.stasiunList) || st.stasiunList.length === 0) {
        st.stasiunList = st.stasiun
          ? String(st.stasiun).split(/[-–—,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
          : [];
      }
    });

    if (list.length === 0) {
      list.push({
        stasiun: '',
        stasiunList: [],
        teamLeader: '',
        teams: [
          {
            id: `tm_${Date.now()}_1`,
            nama: '',
            stasiun: '',
            anggota: [
              { nama: '', username: '' },
              { nama: '', username: '' }
            ]
          }
        ]
      });
    }
    setDraftClusters(list);
    setActiveStationIdx(0);
    setStationTagInput('');
    setIsManageModalOpen(true);
  };

  // Handler Tambah Tag Kode Stasiun Baru ke Cluster Aktif
  const handleAddStationTag = (rawName) => {
    let name = String(rawName || '').trim().toUpperCase();
    if (!name) return;

    // Jika input dalam format "WDU - WADU" atau "WDU (WADU)", ambil kode stasiunnya
    if (name.includes(' - ')) {
      name = name.split(' - ')[0].trim().toUpperCase();
    } else if (name.includes('(')) {
      name = name.split('(')[0].trim().toUpperCase();
    }

    // Jika user mengetik nama lengkap stasiun (misal "WADU"), konversi otomatis ke kode_stasiun ("WDU")
    if (stationNameToCodeMap[name]) {
      name = stationNameToCodeMap[name];
    }

    setDraftClusters(prev => {
      const next = [...prev];
      const cur = { ...next[activeStationIdx] };
      const currentList = Array.isArray(cur.stasiunList) && cur.stasiunList.length > 0
        ? [...cur.stasiunList]
        : (cur.stasiun ? String(cur.stasiun).split(/[-–—,]+/).map(s => s.trim().toUpperCase()).filter(Boolean) : []);

      if (!currentList.includes(name)) {
        currentList.push(name);
      }

      const combinedName = currentList.join(' - ');
      cur.stasiunList = currentList;
      cur.stasiun = combinedName;
      cur.teams = (cur.teams || []).map(t => ({ ...t, stasiun: combinedName }));

      next[activeStationIdx] = cur;
      return next;
    });

    setStationTagInput('');
  };

  // Handler Hapus Tag Stasiun dari Cluster Aktif
  const handleRemoveStationTag = (tagIdx) => {
    setDraftClusters(prev => {
      const next = [...prev];
      const cur = { ...next[activeStationIdx] };
      let currentList = Array.isArray(cur.stasiunList) && cur.stasiunList.length > 0
        ? [...cur.stasiunList]
        : (cur.stasiun ? String(cur.stasiun).split(/[-–—,]+/).map(s => s.trim().toUpperCase()).filter(Boolean) : []);

      currentList = currentList.filter((_, i) => i !== tagIdx);
      const combinedName = currentList.join(' - ');
      cur.stasiunList = currentList;
      cur.stasiun = combinedName;
      cur.teams = (cur.teams || []).map(t => ({ ...t, stasiun: combinedName }));

      next[activeStationIdx] = cur;
      return next;
    });
  };

  // Handler Simpan Konfigurasi Tim ke Supabase Cloud & LocalStorage
  const handleSaveClusters = async () => {
    for (let i = 0; i < draftClusters.length; i++) {
      const st = draftClusters[i];
      const sList = getStationList(st);
      if (sList.length === 0 && (!st.stasiun || !st.stasiun.trim())) {
        showToast(`Stasiun #${i + 1} belum memiliki stasiun yang dipilih!`, 'error');
        setActiveStationIdx(i);
        return;
      }
      if (!st.teams || st.teams.length === 0) {
        showToast(`Stasiun "${st.stasiun || '#' + (i + 1)}" minimal harus memiliki 1 tim!`, 'error');
        setActiveStationIdx(i);
        return;
      }
    }

    setIsSavingClusters(true);
    setStationClusters(draftClusters);

    // 1. Simpan ke LocalStorage sebagai cache cepat
    try {
      localStorage.setItem('starlite_station_clusters_v3', JSON.stringify(draftClusters));
    } catch (e) {
      console.error(e);
    }

    // 2. Simpan ke Supabase Cloud (starlite_team_config)
    let isCloudSuccess = false;
    try {
      const { error: sbErr } = await supabase
        .from('starlite_team_config')
        .upsert({
          id: 'current_clusters',
          clusters: draftClusters,
          updated_at: new Date().toISOString()
        });

      if (!sbErr) {
        isCloudSuccess = true;
      } else {
        console.warn("Supabase upsert warning:", sbErr.message);
      }
    } catch (err) {
      console.warn("Supabase save error:", err);
    } finally {
      setIsSavingClusters(false);
    }

    if (isCloudSuccess) {
      showToast('Konfigurasi Tim & Stasiun berhasil disimpan ke Supabase Cloud!', 'success');
    } else {
      showToast('Tersimpan di perangkat lokal. (Tabel Supabase belum di-setup)', 'info');
    }
    setIsManageModalOpen(false);
  };

  // Handler Tambah Stasiun Baru
  const handleAddStation = () => {
    const newSt = {
      stasiun: '',
      stasiunList: [],
      teamLeader: '',
      teams: [
        {
          id: `tm_${Date.now()}_1`,
          nama: 'TIM 1',
          stasiun: '',
          anggota: [
            { nama: '', username: '' },
            { nama: '', username: '' }
          ]
        }
      ]
    };
    setDraftClusters(prev => [...prev, newSt]);
    setActiveStationIdx(draftClusters.length);
    setStationTagInput('');
  };

  // Handler Hapus Stasiun (Menggunakan Modal Konfirmasi Kustom)
  const handleDeleteStation = (idx) => {
    if (draftClusters.length <= 1) {
      showToast('Minimal harus ada 1 stasiun!', 'error');
      return;
    }
    const targetName = draftClusters[idx]?.stasiun || 'ini';
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Stasiun',
      message: `Yakin ingin menghapus stasiun "${targetName}" beserta seluruh timnya?`,
      confirmText: 'Ya, Hapus Stasiun',
      cancelText: 'Batal',
      confirmType: 'danger',
      onConfirm: () => {
        setDraftClusters(prev => prev.filter((_, i) => i !== idx));
        setActiveStationIdx(prev => (prev >= idx ? Math.max(0, prev - 1) : prev));
        showToast(`Stasiun "${targetName}" berhasil dihapus.`, 'info');
      }
    });
  };

  // Handler Update Field Stasiun (Nama / TL)
  const handleUpdateStationField = (field, val) => {
    setDraftClusters(prev => {
      const next = [...prev];
      const cur = { ...next[activeStationIdx], [field]: val };
      if (field === 'stasiun') {
        cur.teams = (cur.teams || []).map(t => ({ ...t, stasiun: val }));
      }
      next[activeStationIdx] = cur;
      return next;
    });
  };

  // Handler Tambah Tim di Stasiun Aktif
  const handleAddTeam = () => {
    setDraftClusters(prev => {
      const next = [...prev];
      const cur = { ...next[activeStationIdx] };
      const teams = [...(cur.teams || [])];
      const newNum = teams.length + 1;
      teams.push({
        id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nama: `TIM ${newNum}`,
        stasiun: cur.stasiun,
        anggota: [
          { nama: '', username: '' },
          { nama: '', username: '' }
        ]
      });
      cur.teams = teams;
      next[activeStationIdx] = cur;
      return next;
    });
  };

  // Handler Hapus Tim (Menggunakan Modal Konfirmasi Kustom)
  const handleDeleteTeam = (teamIdx) => {
    const cur = draftClusters[activeStationIdx];
    if ((cur?.teams || []).length <= 1) {
      showToast('Setiap stasiun minimal harus memiliki 1 tim!', 'error');
      return;
    }
    const teamName = cur?.teams?.[teamIdx]?.nama || `Tim #${teamIdx + 1}`;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Tim Teknisi',
      message: `Yakin ingin menghapus "${teamName}" dari stasiun ${cur.stasiun || 'ini'}?`,
      confirmText: 'Ya, Hapus Tim',
      cancelText: 'Batal',
      confirmType: 'danger',
      onConfirm: () => {
        setDraftClusters(prev => {
          const next = [...prev];
          const curSt = { ...next[activeStationIdx] };
          curSt.teams = curSt.teams.filter((_, i) => i !== teamIdx);
          next[activeStationIdx] = curSt;
          return next;
        });
        showToast(`"${teamName}" berhasil dihapus.`, 'info');
      }
    });
  };

  // Handler Update Nama Tim
  const handleUpdateTeamName = (teamIdx, val) => {
    setDraftClusters(prev => {
      const next = [...prev];
      const curSt = { ...next[activeStationIdx] };
      const teams = [...curSt.teams];
      teams[teamIdx] = { ...teams[teamIdx], nama: val };
      curSt.teams = teams;
      next[activeStationIdx] = curSt;
      return next;
    });
  };

  // Handler Auto-Generate Nama Tim (e.g. "ADJI - ANDIKA")
  const handleAutoTeamName = (teamIdx) => {
    const curSt = draftClusters[activeStationIdx];
    const team = curSt?.teams?.[teamIdx];
    const m1 = (team?.anggota?.[0]?.nama || '').trim();
    const m2 = (team?.anggota?.[1]?.nama || '').trim();
    if (!m1 && !m2) {
      showToast('Isi nama teknisi terlebih dahulu!', 'info');
      return;
    }
    const name1 = (m1.split(/\s+/)[0] || 'TEKNISI 1').toUpperCase();
    const name2 = (m2.split(/\s+/)[0] || 'TEKNISI 2').toUpperCase();
    handleUpdateTeamName(teamIdx, `${name1} - ${name2}`);
  };

  // Handler Update Anggota Teknisi (Nama & Username Telegram)
  const handleUpdateMember = (teamIdx, memberIdx, field, val) => {
    setDraftClusters(prev => {
      const next = [...prev];
      const curSt = { ...next[activeStationIdx] };
      const teams = [...curSt.teams];
      const team = { ...teams[teamIdx] };
      const anggota = [...(team.anggota || [{}, {}])];

      let updatedMember = { ...anggota[memberIdx], [field]: val };
      if (field === 'nama') {
        const found = teknisiLookupMap.get(val.trim().toLowerCase());
        if (found && found.username && !updatedMember.username) {
          updatedMember.username = found.username.startsWith('@') ? found.username : `@${found.username}`;
        }
      }

      anggota[memberIdx] = updatedMember;
      team.anggota = anggota;
      teams[teamIdx] = team;
      curSt.teams = teams;
      next[activeStationIdx] = curSt;
      return next;
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Navigasi Tanggal Harian
  const shiftDate = (days) => {
    const cur = new Date(selectedDateYMD + 'T00:00:00');
    cur.setDate(cur.getDate() + days);
    setSelectedDateYMD(formatDateToYMD(cur));
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDateYMD + 'T00:00:00');
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return selectedDateYMD;
    }
  }, [selectedDateYMD]);

  // Flatten all teams untuk kalkulasi metrik
  const allTeamsFlat = useMemo(() => {
    const list = [];
    stationClusters.forEach(sc => {
      const sCodes = getStationList(sc);
      (sc.teams || []).forEach(tm => {
        list.push({
          ...tm,
          stasiun: sc.stasiun,
          teamLeader: sc.teamLeader,
          stasiunList: sCodes
        });
      });
    });
    return list;
  }, [stationClusters]);

  // =========================================================================
  // KALKULASI METRIK HARIAN YANG AKURAT (MURNI PADA HARI selectedDateYMD)
  // Format Konsep: WO, Aktivasi, Visit, Dismantle, Pending, Outstanding
  // =========================================================================
  const teamMetricsMap = useMemo(() => {
    const map = {};

    const cleanVal = (v, fallback = '-') => {
      if (v === undefined || v === null) return fallback;
      const s = String(v).trim();
      return (s === '' || s === 'null' || s === 'undefined') ? fallback : s;
    };

    // Helper resolusi kode stasiun dari item (nama stasiun / kode ODP)
    const resolveItemStationCode = (item) => {
      if (!item) return '';
      const rawSt = String(item.stasiun || '').trim().toUpperCase();
      if (rawSt) {
        if (stationNameToCodeMap[rawSt]) return stationNameToCodeMap[rawSt];
        for (const [name, code] of Object.entries(stationNameToCodeMap)) {
          if (rawSt.includes(name)) return code;
        }
      }
      const rawOdp = String(item.odpAktual || item.odp || item.kodeOdp || item.kode_odp || '').trim().toUpperCase();
      if (rawOdp) {
        const m = rawOdp.match(/_(ATA|BBG|KBD|KLN|KNN|KNS|RBG|SMT|SL|WDU|WLR)_/i);
        if (m) return m[1].toUpperCase();
      }
      return '';
    };

    // Lookup pelanggan by ID untuk memperkaya data jika field tiket visit tidak lengkap
    const custMap = new Map();
    (pelangganData || []).forEach(p => {
      const id = String(p.idPelanggan || p.id_pelanggan || '').trim().toUpperCase();
      if (id) {
        custMap.set(id, p);
      }
    });

    allTeamsFlat.forEach(team => {
      const members = team.anggota || [];

      // 1. Aktivasi Selesai pada hari ini
      const aktivasiList = [];
      // 2. Dismantle Selesai pada hari ini
      const dismantleList = [];
      // 3. Pending (Reschedule / Janji Pasang) pada hari ini
      const pendingList = [];
      // 4. Kendala (Batal / Issue Lapangan) pada hari ini
      const kendalaList = [];
      // 5. Outstanding / On Progress hari ini
      const outstandingList = [];
      // 6. Visit Gangguan Selesai pada hari ini
      const visitList = [];

      // Evaluasi data_pelanggan
      pelangganData.forEach(p => {
        // VALIDASI LINGKUP WILAYAH: Customer harus berada di wilayah / stasiun cluster tim ini
        const custStationCode = resolveItemStationCode(p);
        if (custStationCode && team.stasiunList && team.stasiunList.length > 0) {
          if (!team.stasiunList.includes(custStationCode)) {
            return; // Misal: Data SMT (Semarang Tawang) tidak boleh masuk ke tim WDU - RBG
          }
        }

        const pAkt = p.petugasAktivasi || p.petugas_aktivasi || '';
        const pIkr = p.petugasIkr || p.petugas_ikr || '';
        const pRep = p.reporterKendala || p.reporter_kendala || '';
        const isAssigned = members.some(m => isMatchMember(pAkt, m) || isMatchMember(pIkr, m) || isMatchMember(pRep, m));
        if (!isAssigned) return;

        const sAkt = String(p.statusAktivasi || p.status_aktivasi || p.aktivasi || '').trim().toUpperCase();
        const sIkr = String(p.statusIkr || p.status_ikr || p.ikr || '').trim().toUpperCase();
        const tglAkt = p.tglAktivasi || p.tgl_aktivasi || p.timestampAktivasi || '';
        const tglDis = p.tanggalDismantle || p.tanggal_dismantle || '';
        const tglKen = p.tanggalKendala || p.tanggal_kendala || '';
        const tglReg = p.tanggalRegistrasi || p.tanggal_registrasi || p.createdAt || '';
        const issue = p.issueKendala || p.catatan || '';

        const stasiunVal = cleanVal(p.stasiun || team.stasiun);
        const odpVal = cleanVal(p.odpAktual || p.odp || p.kodeOdp || p.odpRencana || p.odp_aktual);
        const portVal = cleanVal(p.portOdp || p.port_odp || p.port);
        const snVal = cleanVal(p.snOnt || p.sn_ont || p.sn || p.serialNumber || p.noSn);
        const idVal = cleanVal(p.idPelanggan || p.id_pelanggan);
        const namaVal = cleanVal(p.namaPelanggan || p.nama_pelanggan);

        // Dismantle hari ini
        if ((sAkt.includes('DISMANTLE') || sIkr.includes('DISMANTLE') || tglDis) && isSameDay(tglDis, selectedDateYMD)) {
          dismantleList.push({
            id: idVal,
            tipe: 'Dismantle',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: cleanVal(p.reasonDismantle, 'Dismantle selesai')
          });
        }
        // Aktivasi Baru Selesai hari ini
        else if ((sAkt === 'SUDAH' || sAkt === 'AKTIF' || sIkr === 'SUDAH') && isSameDay(tglAkt, selectedDateYMD)) {
          aktivasiList.push({
            id: idVal,
            tipe: 'Aktivasi',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: 'Aktivasi berhasil'
          });
        }
        // Pending / Kendala hari ini
        else if ((sAkt === 'PENDING' || sIkr === 'PENDING' || sAkt === 'KENDALA' || sIkr === 'KENDALA') && isSameDay(tglKen || tglReg, selectedDateYMD)) {
          const isPendingText = /minta\s*(di)?pasang|reschedule|pending|tunda|bulan depan|awal bulan|tgl \d|tanggal \d|nunggu/i.test(issue);
          const isPending = (sAkt === 'PENDING' || sIkr === 'PENDING') || isPendingText;

          if (isPending) {
            pendingList.push({
              id: idVal,
              tipe: 'Pending Pasang',
              nama: namaVal,
              stasiun: stasiunVal,
              odp: odpVal,
              portOdp: portVal,
              snOnt: snVal,
              keterangan: issue || cleanVal(p.catatan, 'Pending reschedule')
            });
          } else {
            kendalaList.push({
              id: idVal,
              tipe: 'Kendala Aktivasi',
              nama: namaVal,
              stasiun: stasiunVal,
              odp: odpVal,
              portOdp: portVal,
              snOnt: snVal,
              keterangan: issue || 'Kendala lapangan'
            });
          }
        }
        // Outstanding (Terjadwal / Registrasi hari ini yang masih proses)
        else if ((sAkt === 'WAITING' || sAkt === 'IN PROGRESS' || sAkt === 'OPEN' || sIkr === 'WAITING') && isSameDay(tglReg, selectedDateYMD)) {
          outstandingList.push({
            id: idVal,
            tipe: 'Aktivasi Baru (Proses)',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: 'Belum aktivasi'
          });
        }
      });

      // Evaluasi log_visit
      visitData.forEach(v => {
        const vIdCust = String(v.idPelanggan || v.id_pelanggan || '').trim().toUpperCase();
        const linkedCust = vIdCust ? custMap.get(vIdCust) : null;

        // VALIDASI LINGKUP WILAYAH: Tiket visit harus berada di wilayah / stasiun cluster tim ini
        const visitStationCode = resolveItemStationCode(v) || (linkedCust ? resolveItemStationCode(linkedCust) : '');
        if (visitStationCode && team.stasiunList && team.stasiunList.length > 0) {
          if (!team.stasiunList.includes(visitStationCode)) {
            return; // Lewati jika tiket visit bukan milik cluster tim ini
          }
        }

        const vPet = v.petugas || '';
        const isAssigned = members.some(m => isMatchMember(vPet, m));
        if (!isAssigned) return;

        const vDate = v.timestamp || v.waktu || v.createdAt || '';
        if (!isSameDay(vDate, selectedDateYMD)) return;

        const stat = String(v.status_visit || v.status || '').trim().toUpperCase();
        const kendalaText = v.kendala || v.keterangan || v.issue || '';

        const stasiunVal = cleanVal(v.stasiun || (linkedCust && linkedCust.stasiun) || team.stasiun);
        const odpVal = cleanVal(v.odpAktual || v.odp || v.kodeOdp || v.odp_aktual || (linkedCust && (linkedCust.odpAktual || linkedCust.odp || linkedCust.kodeOdp)));
        const portVal = cleanVal(v.portOdp || v.port || v.port_odp || (linkedCust && (linkedCust.portOdp || linkedCust.port || linkedCust.port_odp)));
        const snVal = cleanVal(v.snOnt || v.sn_ont || v.sn || (linkedCust && (linkedCust.snOnt || linkedCust.sn_ont || linkedCust.sn)));
        const idVal = cleanVal(v.idPelanggan || v.id_pelanggan || v.id_visit || v.id || v.no_tiket);
        const namaVal = cleanVal(v.namaPelanggan || v.nama_pelanggan || v.pelanggan || (linkedCust && linkedCust.namaPelanggan) || 'Pelanggan Visit');

        if (stat === 'CLOSED' || stat === 'RESOLVED' || stat === 'SELESAI' || stat === 'DONE') {
          visitList.push({
            id: idVal,
            tipe: 'Visit Gangguan',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: kendalaText || 'Visit selesai'
          });
        } else if (stat === 'PENDING') {
          pendingList.push({
            id: idVal,
            tipe: 'Visit Pending',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: kendalaText || 'Visit tertunda'
          });
        } else if (stat === 'KENDALA') {
          kendalaList.push({
            id: idVal,
            tipe: 'Visit Kendala',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: kendalaText || 'Kendala visit'
          });
        } else {
          // OPEN / IN PROGRESS
          outstandingList.push({
            id: idVal,
            tipe: 'Visit Gangguan (Proses)',
            nama: namaVal,
            stasiun: stasiunVal,
            odp: odpVal,
            portOdp: portVal,
            snOnt: snVal,
            keterangan: kendalaText || 'Dalam pengerjaan'
          });
        }
      });

      // 6. Evaluasi log_wo_dispatch (Penugasan Harian Khusus WO Teknisi)
      (woDispatchData || []).forEach(wo => {
        const woDate = wo.tanggal_wo || wo.tanggalWo || wo.created_at || '';
        if (!isSameDay(woDate, selectedDateYMD)) return;

        const woOfficer = wo.petugas || wo.petugas_username || '';
        const isAssigned = members.some(m => isMatchMember(woOfficer, m));
        if (!isAssigned) return;

        const custCode = resolveItemStationCode(wo);
        if (custCode && team.stasiunList && team.stasiunList.length > 0) {
          if (!team.stasiunList.includes(custCode)) return;
        }

        const idVal = cleanVal(wo.id_pelanggan || wo.idPelanggan);
        const namaVal = cleanVal(wo.nama_pelanggan || wo.namaPelanggan);
        const stasiunVal = cleanVal(wo.stasiun || team.stasiun);
        const odpVal = cleanVal(wo.odp);
        const portVal = cleanVal(wo.port);
        const snVal = cleanVal(wo.sn_ont || wo.snOnt);
        const statusWo = String(wo.status_wo || wo.statusWo || 'DISPATCHED').toUpperCase();
        const tipeWo = String(wo.tipe_wo || wo.tipeWo || 'AKTIVASI').toUpperCase();

        if (statusWo === 'DONE' || statusWo === 'SELESAI') {
          if (tipeWo === 'AKTIVASI') {
            if (!aktivasiList.some(a => a.id === idVal)) {
              aktivasiList.push({
                id: idVal,
                tipe: 'Aktivasi (WO)',
                nama: namaVal,
                stasiun: stasiunVal,
                odp: odpVal,
                portOdp: portVal,
                snOnt: snVal,
                keterangan: cleanVal(wo.tindakan, 'Aktivasi berhasil')
              });
            }
          } else if (tipeWo === 'DISMANTLE') {
            if (!dismantleList.some(d => d.id === idVal)) {
              dismantleList.push({
                id: idVal,
                tipe: 'Dismantle (WO)',
                nama: namaVal,
                stasiun: stasiunVal,
                odp: odpVal,
                portOdp: portVal,
                snOnt: snVal,
                keterangan: cleanVal(wo.catatan || wo.alasan_dismantle, 'Dismantle selesai')
              });
            }
          } else if (tipeWo === 'VISIT') {
            if (!visitList.some(v => v.id === idVal)) {
              visitList.push({
                id: idVal,
                tipe: 'Visit Gangguan (WO)',
                nama: namaVal,
                stasiun: stasiunVal,
                odp: odpVal,
                portOdp: portVal,
                snOnt: snVal,
                keterangan: cleanVal(wo.tindakan || wo.catatan, 'Visit selesai')
              });
            }
          }
        } else if (statusWo === 'PENDING') {
          if (!pendingList.some(p => p.id === idVal)) {
            pendingList.push({
              id: idVal,
              tipe: `Pending ${toProperCase(tipeWo)}`,
              nama: namaVal,
              stasiun: stasiunVal,
              odp: odpVal,
              portOdp: portVal,
              snOnt: snVal,
              keterangan: cleanVal(wo.catatan_kendala || wo.catatan, 'Pending reschedule')
            });
          }
        } else if (statusWo === 'KENDALA') {
          const isPendingWo = /minta\s*(di)?pasang|reschedule|pending|tunda|bulan depan|awal bulan|tgl \d|tanggal \d|nunggu/i.test(wo.catatan_kendala || wo.catatan || '');
          if (isPendingWo) {
            if (!pendingList.some(p => p.id === idVal)) {
              pendingList.push({
                id: idVal,
                tipe: `Pending ${toProperCase(tipeWo)}`,
                nama: namaVal,
                stasiun: stasiunVal,
                odp: odpVal,
                portOdp: portVal,
                snOnt: snVal,
                keterangan: cleanVal(wo.catatan_kendala || wo.catatan, 'Pending reschedule')
              });
            }
          } else {
            if (!kendalaList.some(k => k.id === idVal)) {
              kendalaList.push({
                id: idVal,
                tipe: `Kendala ${toProperCase(tipeWo)}`,
                nama: namaVal,
                stasiun: stasiunVal,
                odp: odpVal,
                portOdp: portVal,
                snOnt: snVal,
                keterangan: cleanVal(wo.catatan_kendala || wo.catatan, 'Kendala lapangan')
              });
            }
          }
        } else {
          // Status: DISPATCHED / ON PROGRESS
          if (!outstandingList.some(o => o.id === idVal)) {
            outstandingList.push({
              id: idVal,
              tipe: `WO ${toProperCase(tipeWo)} (Proses)`,
              nama: namaVal,
              stasiun: stasiunVal,
              odp: odpVal,
              portOdp: portVal,
              snOnt: snVal,
              keterangan: cleanVal(wo.catatan, 'Dalam proses pengerjaan')
            });
          }
        }
      });

      const nAktivasi = aktivasiList.length;
      const nVisit = visitList.length;
      const nDismantle = dismantleList.length;
      const nPending = pendingList.length;
      const nKendala = kendalaList.length;
      const nOutstanding = outstandingList.length;

      // Total WO = Aktivasi + Visit + Dismantle + Pending + Kendala + Outstanding
      const totalWO = nAktivasi + nVisit + nDismantle + nPending + nKendala + nOutstanding;
      const totalSelesai = nAktivasi + nVisit + nDismantle;

      // Persentase performansi
      const prodVal = totalWO > 0 ? (totalSelesai / totalWO) * 100 : 0;
      const prodStr = totalWO > 0 ? `${prodVal.toFixed(1).replace('.', ',')}%` : '-';

      map[team.id] = {
        totalWO,
        aktivasi: nAktivasi,
        visit: nVisit,
        dismantle: nDismantle,
        pending: nPending,
        kendala: nKendala,
        outstanding: nOutstanding,
        selesai: totalSelesai,
        prodVal,
        prodStr,
        records: {
          aktivasi: aktivasiList,
          visit: visitList,
          dismantle: dismantleList,
          pending: pendingList,
          kendala: kendalaList,
          outstanding: outstandingList
        }
      };
    });

    return map;
  }, [allTeamsFlat, pelangganData, visitData, woDispatchData, selectedDateYMD, stationNameToCodeMap]);

  // Grand Total Ringkasan Semua Stasiun
  const grandTotal = useMemo(() => {
    let wo = 0, akt = 0, vis = 0, dis = 0, pnd = 0, kdl = 0, out = 0, sel = 0;
    allTeamsFlat.forEach(t => {
      const m = teamMetricsMap[t.id] || { totalWO: 0, aktivasi: 0, visit: 0, dismantle: 0, pending: 0, kendala: 0, outstanding: 0, selesai: 0 };
      wo += m.totalWO;
      akt += m.aktivasi;
      vis += m.visit;
      dis += m.dismantle;
      pnd += m.pending;
      kdl += (m.kendala || 0);
      out += m.outstanding;
      sel += m.selesai;
    });
    const avgProd = wo > 0 ? (sel / wo) * 100 : 0;
    return {
      wo,
      akt,
      vis,
      dis,
      pnd,
      kdl,
      out,
      sel,
      prodStr: wo > 0 ? `${avgProd.toFixed(1).replace('.', ',')}%` : '0,0%'
    };
  }, [allTeamsFlat, teamMetricsMap]);

  // Export ke Excel (.xlsx) dengan kolom terpisah Team Leader dan Stasiun (Tanpa Keterangan)
  const handleExportExcel = () => {
    try {
      const exportData = [];
      exportData.push(['REKAP MONITORING PERFORMANSI TIM LAPANGAN']);
      exportData.push([`Tanggal: ${formattedSelectedDate} (${selectedDateYMD})`]);
      exportData.push([]);
      exportData.push(['TEAM LEADER', 'STASIUN', 'TIM TEKNISI', 'TOTAL WO', 'AKTIVASI', 'VISIT', 'DISMANTLE', 'PENDING', 'KENDALA', 'OUTSTANDING', 'PERFORMANSI']);

      stationClusters.forEach(sc => {
        (sc.teams || []).forEach(tm => {
          const m = teamMetricsMap[tm.id] || { totalWO: 0, aktivasi: 0, visit: 0, dismantle: 0, pending: 0, kendala: 0, outstanding: 0, prodStr: '-' };
          exportData.push([
            sc.teamLeader || '-',
            sc.stasiun,
            tm.nama,
            m.totalWO,
            m.aktivasi,
            m.visit,
            m.dismantle,
            m.pending,
            m.kendala || 0,
            m.outstanding,
            m.prodStr
          ]);
        });
      });

      exportData.push([]);
      exportData.push(['GRAND TOTAL', '', '', grandTotal.wo, grandTotal.akt, grandTotal.vis, grandTotal.dis, grandTotal.pnd, grandTotal.kdl, grandTotal.out, grandTotal.prodStr]);

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Performansi Tim');
      XLSX.writeFile(wb, `Performansi_Tim_${selectedDateYMD}.xlsx`);
      showToast('File Excel berhasil diekspor!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal ekspor Excel: ' + e.message, 'error');
    }
  };

  // Salin Format Laporan Operasional Telegram
  const handleCopyTelegram = (tm, stasiunName, teamLeader) => {
    const m = teamMetricsMap[tm.id] || { totalWO: 0, aktivasi: 0, visit: 0, dismantle: 0, pending: 0, outstanding: 0, prodStr: '-' };

    const rec = m.records || {};
    const allTasks = [
      ...(rec.aktivasi || []),
      ...(rec.visit || []),
      ...(rec.dismantle || []),
      ...(rec.pending || []),
      ...(rec.outstanding || [])
    ];

    let rincianText = '';
    if (allTasks.length > 0) {
      rincianText = `\n📋 *RINCIAN PEKERJAAN (${allTasks.length}):*\n` +
        allTasks.map((t, idx) => {
          let line = `${idx + 1}. [${t.tipe}] *${t.nama}* (ID: ${t.id})\n` +
            `   • Stasiun: ${t.stasiun}\n` +
            `   • ODP: ${t.odp}${t.portOdp && t.portOdp !== '-' ? ` (Port ${t.portOdp})` : ''}\n` +
            `   • SN ONT: ${t.snOnt}`;
          if (t.keterangan && t.keterangan !== '-') {
            line += `\n   • Ket: ${t.keterangan}`;
          }
          return line;
        }).join('\n\n') + `\n----------------------------------------\n`;
    }

    const text = `📊 *LAPORAN HARIAN TIM LAPANGAN*\n` +
      `📅 *Tanggal:* ${formattedSelectedDate}\n` +
      `👤 *Team Leader:* ${teamLeader || '-'}\n` +
      `🚉 *Stasiun:* ${stasiunName}\n` +
      `👥 *Tim:* ${tm.nama}\n` +
      `----------------------------------------\n` +
      `• *Total WO:* ${m.totalWO}\n` +
      `• *Aktivasi:* ${m.aktivasi}\n` +
      `• *Visit:* ${m.visit}\n` +
      `• *Dismantle:* ${m.dismantle}\n` +
      `• *Pending:* ${m.pending}\n` +
      `• *Outstanding:* ${m.outstanding}\n` +
      `• *Performansi:* ${m.prodStr}\n` +
      `----------------------------------------\n` +
      rincianText +
      `_Starlite OpsTracker_`;

    navigator.clipboard.writeText(text).then(() => {
      showToast(`Laporan ${tm.nama} disalin ke clipboard!`, 'success');
    }).catch(() => {
      showToast('Gagal menyalin teks.', 'error');
    });
  };

  // Tangkap gambar tabel dan salin langsung ke clipboard untuk WhatsApp
  const handleCaptureSnapshot = async () => {
    if (!snapshotRef.current || isCapturing) return;
    setIsCapturing(true);
    showToast('Sedang membuat snapshot tabel...', 'info');

    let offscreenContainer = null;

    try {
      const originalNode = snapshotRef.current;

      // 1. Buat salinan (clone) elemen secara terisolasi agar tampilan asli di layar user TIDAK BERUBAH SAMA SEKALI
      const clone = originalNode.cloneNode(true);
      clone.classList.add('is-capturing-snapshot');
      clone.style.width = '1240px';
      clone.style.maxWidth = '1240px';
      clone.style.minWidth = '1240px';
      clone.style.position = 'relative';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#f8fafc';

      // Pastikan semua scrollbar dihilangkan di dalam klon
      clone.querySelectorAll('*').forEach(el => {
        el.style.scrollbarWidth = 'none';
      });
      // Hanya overflow-x-auto pada tabel yang dibuat visible agar bebas scrollbar
      clone.querySelectorAll('.overflow-x-auto, .custom-scrollbar').forEach(el => {
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';
        el.style.overflowY = 'visible';
      });
      // Pastikan card stasiun memotong (clip) sudut header tabel melengkung rapi di dalam card
      clone.querySelectorAll('.snapshot-card').forEach(el => {
        el.style.overflow = 'hidden';
        el.style.borderRadius = '16px';
      });
      clone.querySelectorAll('.snapshot-grid-container').forEach(el => {
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        el.style.gap = '14px';
        el.style.alignItems = 'start';
      });

      // 2. Tempatkan klon jauh di luar layar (-99999px) sehingga user tidak melihat apa pun
      offscreenContainer = document.createElement('div');
      offscreenContainer.style.position = 'fixed';
      offscreenContainer.style.left = '-99999px';
      offscreenContainer.style.top = '0';
      offscreenContainer.style.width = '1240px';
      offscreenContainer.style.zIndex = '-9999';
      offscreenContainer.style.overflow = 'visible';
      offscreenContainer.style.opacity = '1';
      offscreenContainer.appendChild(clone);
      document.body.appendChild(offscreenContainer);

      // Beri waktu 80ms agar DOM selesai menghitung layout pada elemen klon offscreen
      await new Promise(r => setTimeout(r, 80));

      const actualWidth = 1240;
      const actualHeight = clone.scrollHeight || clone.offsetHeight;

      const blob = await toBlob(clone, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2, // Resolusi tinggi (tajam dan jernih di WA)
        cacheBust: true,
        skipFonts: true, // Mencegah akses ke stylesheet eksternal (menghindari SecurityError leaflet.css)
        fontEmbedCSS: '', // Mencegah looping parsing cssRules eksternal
        width: actualWidth,
        height: actualHeight,
        style: {
          width: `${actualWidth}px`,
          height: `${actualHeight}px`,
          overflow: 'visible'
        }
      });

      if (!blob) {
        throw new Error('Gagal memproses gambar snapshot.');
      }

      let isCopied = false;
      // Coba salin gambar langsung ke Clipboard sistem sebagai image/png
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          if (typeof window !== 'undefined' && window.focus) {
            window.focus();
          }
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          isCopied = true;
          showToast('✅ Snapshot disalin! Silakan langsung Paste (Ctrl+V).', 'success');
        } catch (clipErr) {
          console.warn('Clipboard direct copy dibatasi browser (misal jendela inspect aktif):', clipErr);
        }
      }

      // Fallback unduh otomatis jika browser membatasi direct clipboard copy
      if (!isCopied) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Monitoring_Tim_${selectedDateYMD}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('Gambar snapshot berhasil diunduh ke komputer Anda.', 'info');
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      showToast('Gagal membuat snapshot: ' + err.message, 'error');
    } finally {
      // Bersihkan container klon offscreen dari DOM
      if (offscreenContainer && offscreenContainer.parentNode) {
        document.body.removeChild(offscreenContainer);
      }
      setIsCapturing(false);
    }
  };

  // =========================================================================
  // FUNGSI KOMPONEN RENDER TABEL STASIUN (FIT DAN KOMPAK UNTUK 2 KOLOM)
  // =========================================================================
  // =========================================================================
  // FUNGSI KOMPONEN RENDER TABEL STASIUN (FIT DAN KOMPAK UNTUK 2 KOLOM / 1 KOLOM)
  // =========================================================================
  const renderStationTable = (clustersSubset, isTwoCol = false) => {
    // Saring clusters dan teams
    const activeClusters = clustersSubset.map(sc => {
      if (stationFilter !== 'ALL') {
        const clusterSt = String(sc.stasiun || '').toLowerCase();
        const filterSt = stationFilter.toLowerCase();
        const sList = getStationList(sc).map(s => s.toLowerCase());
        const sNames = sList.map(code => (stationCodeToNameMap[code.toUpperCase()] || '').toLowerCase());
        const isMatch = clusterSt === filterSt || sList.includes(filterSt) || sNames.includes(filterSt);
        if (!isMatch) return null;
      }
      const filteredTeams = (sc.teams || []).filter(tm => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (tm.nama || '').toLowerCase().includes(q);
          const matchSt = (sc.stasiun || '').toLowerCase().includes(q);
          const matchTL = (sc.teamLeader || '').toLowerCase().includes(q);
          const matchMemb = (tm.anggota || []).some(m => (m.nama || '').toLowerCase().includes(q));
          const matchIndividualSt = getStationList(sc).some(s => s.toLowerCase().includes(q));
          return matchName || matchSt || matchTL || matchMemb || matchIndividualSt;
        }
        return true;
      });

      if (filteredTeams.length === 0) return null;
      return { ...sc, filteredTeams };
    }).filter(Boolean);

    if (activeClusters.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400 text-xs">
          <Icon name="search" size={24} className="mx-auto mb-2 text-slate-300" />
          Tidak ada data tim yang sesuai filter.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto custom-scrollbar">
        <table className={`w-full text-left border-collapse text-xs font-sans ${isTwoCol ? 'min-w-[420px]' : 'min-w-[560px]'}`}>
          {/* THEAD LIGHT STASIUN */}
          <thead className="sticky top-0 z-10 select-none bg-slate-50 text-slate-500 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              {isTwoCol ? (
                <th className="px-2 py-2.5 w-28 text-left border-r border-slate-200/70 rounded-tl-xl">
                  Stasiun / TL
                </th>
              ) : (
                <>
                  <th className="px-2 py-2.5 w-24 text-left border-r border-slate-200/70 rounded-tl-xl">
                    TL
                  </th>
                  <th className="px-2 py-2.5 w-24 text-left border-r border-slate-200/70">
                    Stasiun
                  </th>
                </>
              )}
              <th className="px-2 py-2.5 min-w-[130px] text-left border-r border-slate-200/70">
                Tim Teknisi
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Total Work Order">
                WO
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Aktivasi Selesai">
                Akt
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Visit Selesai">
                Vis
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Dismantle Selesai">
                Dis
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Pending">
                Pnd
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Kendala">
                Kdl
              </th>
              <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70" title="Outstanding">
                Out
              </th>
              <th className="px-0.5 py-2.5 w-11 text-center rounded-tr-xl" title="Pencapaian Performansi">
                Prod
              </th>
            </tr>
          </thead>

          {/* TBODY DATA */}
          <tbody className="text-slate-800 font-medium text-xs divide-y divide-slate-100">
            {activeClusters.map((sc, scIdx) => {
              const teams = sc.filteredTeams;

              // Hitung Subtotal per Stasiun
              let subWO = 0, subAkt = 0, subVis = 0, subDis = 0, subPnd = 0, subKdl = 0, subOut = 0, subSel = 0;
              teams.forEach(tm => {
                const m = teamMetricsMap[tm.id] || { totalWO: 0, aktivasi: 0, visit: 0, dismantle: 0, pending: 0, kendala: 0, outstanding: 0, selesai: 0 };
                subWO += m.totalWO;
                subAkt += m.aktivasi;
                subVis += m.visit;
                subDis += m.dismantle;
                subPnd += m.pending;
                subKdl += (m.kendala || 0);
                subOut += m.outstanding;
                subSel += m.selesai;
              });
              const subAvgProd = subWO > 0 ? (subSel / subWO) * 100 : 0;

              return (
                <React.Fragment key={sc.stasiun || scIdx}>
                  {teams.map((tm, tmIdx) => {
                    const m = teamMetricsMap[tm.id] || { totalWO: 0, aktivasi: 0, visit: 0, dismantle: 0, pending: 0, kendala: 0, outstanding: 0, prodVal: 0, prodStr: '-' };
                    const isHighProd = m.prodVal > 0;

                    return (
                      <tr key={tm.id || tmIdx} className="hover:bg-slate-50/70 transition-colors">

                        {/* JIKA 2 KOLOM: STASIUN & TL DIGABUNG JADI 1 KOLOM */}
                        {isTwoCol ? (
                          tmIdx === 0 && (
                            <td
                              rowSpan={teams.length}
                              className="px-2.5 py-2 border-r border-slate-100 bg-white align-top"
                            >
                              <div className="font-bold text-slate-800 text-[11px] leading-tight break-words" title={sc.stasiun}>
                                {sc.stasiun}
                              </div>
                              <div className="mt-1">
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 max-w-full"
                                  title={`Team Leader: ${sc.teamLeader || '-'}`}
                                >
                                  <span className="text-[8.5px] uppercase tracking-wider font-black text-indigo-500 shrink-0">TL:</span>
                                  <span className="truncate">{sc.teamLeader || '-'}</span>
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1 flex-wrap">
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200/60" title={`Mencakup ${getStationList(sc).join(', ')}`}>
                                  {getStationList(sc).length} Stasiun
                                </span>
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                  {teams.length} Tim
                                </span>
                              </div>
                            </td>
                          )
                        ) : (
                          /* JIKA 1 KOLOM: TL & STASIUN TERPISAH */
                          <>
                            {tmIdx === 0 && (
                              <td
                                rowSpan={teams.length}
                                className="px-2.5 py-2 border-r border-slate-100 bg-slate-50/40 align-top"
                              >
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70"
                                  title={`Team Leader: ${sc.teamLeader || '-'}`}
                                >
                                  <span className="text-[8.5px] uppercase tracking-wider font-black text-indigo-500 shrink-0">TL:</span>
                                  <span>{sc.teamLeader || '-'}</span>
                                </span>
                              </td>
                            )}

                            {tmIdx === 0 && (
                              <td
                                rowSpan={teams.length}
                                className="px-2.5 py-2 border-r border-slate-100 bg-white align-top"
                              >
                                <div className="font-bold text-slate-800 text-[11px] break-words" title={sc.stasiun}>
                                  {sc.stasiun}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200/60" title={`Mencakup ${getStationList(sc).join(', ')}`}>
                                    {getStationList(sc).length} Stasiun
                                  </span>
                                  <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                    {teams.length} Tim
                                  </span>
                                </div>
                              </td>
                            )}
                          </>
                        )}

                        {/* TIM TEKNISI - USERNAME TEKNISI */}
                        <td className="px-2.5 py-2 border-r border-slate-100">
                          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-tight break-words" title={tm.nama}>
                            {tm.nama}
                          </div>
                          <div
                            className="text-[9.5px] font-medium text-slate-400 leading-snug mt-0.5 break-words"
                            title={(tm.anggota || []).map(a => a.nama).filter(Boolean).join(' • ')}
                          >
                            {(tm.anggota || []).map(getMemberUsername).filter(Boolean).join(' • ')}
                          </div>
                        </td>

                        {/* TOTAL WO (KLIK UNTUK LIHAT RINCIAN TUGAS) */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-xs">
                          {m.totalWO > 0 ? (
                            <button
                              type="button"
                              onClick={() => setDetailModal({ isOpen: true, teamData: { ...tm, ...m, stasiun: sc.stasiun, teamLeader: sc.teamLeader }, activeTab: 'semua' })}
                              className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-black text-[10px] border border-blue-200 hover:border-blue-600 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="Klik untuk melihat rincian tugas / WO hari ini"
                            >
                              {m.totalWO}
                            </button>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* AKTIVASI */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-emerald-600 text-xs">
                          {m.aktivasi > 0 ? m.aktivasi : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* VISIT */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-indigo-600 text-xs">
                          {m.visit > 0 ? m.visit : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* DISMANTLE */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-rose-600 text-xs">
                          {m.dismantle > 0 ? m.dismantle : <span className="text-slate-300 font-normal">-</span>}
                        </td>

                        {/* PENDING */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-amber-600 text-xs">
                          {m.pending > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200/60">
                              {m.pending}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* KENDALA (KDL) */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-rose-600 text-xs">
                          {m.kendala > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200/60">
                              {m.kendala}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* OUTSTANDING */}
                        <td className="px-1 py-2 text-center border-r border-slate-100 font-bold text-slate-700 text-xs">
                          {m.outstanding > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200/60">
                              {m.outstanding}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* PERFORMANSI */}
                        <td className="px-1 py-2 text-center font-bold text-xs">
                          {isHighProd ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/70">
                              {m.prodStr}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">{m.prodStr}</span>
                          )}
                        </td>

                      </tr>
                    );
                  })}

                  {/* BARIS SUBTOTAL PER STASIUN */}
                  <tr className="bg-slate-50/80 text-slate-700 font-bold text-[11px] border-y border-slate-200/80">
                    <td colSpan={isTwoCol ? 2 : 3} className="px-2.5 py-1.5 font-bold text-slate-700 text-left border-r border-slate-200/60 uppercase tracking-tight">
                      Subtotal {sc.stasiun}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-blue-700 border-r border-slate-200/60">
                      {subWO > 0 ? subWO : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-emerald-700 border-r border-slate-200/60">
                      {subAkt > 0 ? subAkt : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-indigo-700 border-r border-slate-200/60">
                      {subVis > 0 ? subVis : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-rose-700 border-r border-slate-200/60">
                      {subDis > 0 ? subDis : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-amber-700 border-r border-slate-200/60">
                      {subPnd > 0 ? subPnd : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-rose-700 border-r border-slate-200/60">
                      {subKdl > 0 ? subKdl : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-slate-700 border-r border-slate-200/60">
                      {subOut > 0 ? subOut : '-'}
                    </td>
                    <td className="px-1 py-1.5 text-center font-bold text-slate-800">
                      {subWO > 0 ? `${subAvgProd.toFixed(1).replace('.', ',')}%` : '-'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // =========================================================================
  // KOMPONEN RENDER SKELETON ANIMASI TABEL (SAAT LOAD DATA SAMPAI 100% TERMUAT)
  // =========================================================================
  const renderSkeletonTableCard = (stationCount = 4) => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden snapshot-card">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-sans min-w-[420px]">
            {/* THEAD */}
            <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-2.5 w-28 text-left border-r border-slate-200/70 rounded-tl-xl">
                  Stasiun / TL
                </th>
                <th className="px-2.5 py-2.5 min-w-[130px] text-left border-r border-slate-200/70">
                  Tim Teknisi
                </th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">WO</th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">Akt</th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">Vis</th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">Dis</th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">Pnd</th>
                <th className="px-0.5 py-2.5 w-7 text-center border-r border-slate-200/70">Out</th>
                <th className="px-0.5 py-2.5 w-11 text-center rounded-tr-xl">Prod</th>
              </tr>
            </thead>

            {/* TBODY SKELETON SHIMMER */}
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: stationCount }).map((_, stIdx) => {
                const teamCount = stIdx % 2 === 0 ? 2 : 1;
                return (
                  <React.Fragment key={stIdx}>
                    {Array.from({ length: teamCount }).map((__, tmIdx) => (
                      <tr key={tmIdx} className="animate-pulse">
                        {tmIdx === 0 && (
                          <td
                            rowSpan={teamCount}
                            className="px-2.5 py-2.5 border-r border-slate-100 bg-white align-top"
                          >
                            {/* Stasiun Title Shimmer */}
                            <div className="h-3.5 bg-slate-200 rounded-md w-20 mb-1.5 animate-pulse"></div>
                            {/* TL Badge Shimmer */}
                            <div className="h-4 bg-indigo-50/80 border border-indigo-100/70 rounded-md w-20 mb-1.5 animate-pulse"></div>
                            {/* Badges Shimmer */}
                            <div className="flex items-center gap-1">
                              <div className="h-3.5 bg-blue-50 border border-blue-100 rounded w-12 animate-pulse"></div>
                              <div className="h-3.5 bg-slate-100 rounded w-10 animate-pulse"></div>
                            </div>
                          </td>
                        )}

                        {/* Tim Teknisi Shimmer */}
                        <td className="px-2.5 py-2 border-r border-slate-100">
                          <div className="h-3.5 bg-slate-200 rounded w-24 mb-1.5 animate-pulse"></div>
                          <div className="h-2.5 bg-slate-100 rounded w-32 animate-pulse"></div>
                        </td>

                        {/* Metric Columns Shimmer */}
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-4 w-5 bg-blue-50 rounded-md mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-3.5 w-4 bg-emerald-50 rounded mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-3.5 w-4 bg-indigo-50 rounded mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-3.5 w-4 bg-rose-50 rounded mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-3.5 w-4 bg-slate-100 rounded mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center border-r border-slate-100">
                          <div className="h-3.5 w-4 bg-slate-100 rounded mx-auto animate-pulse"></div>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <div className="h-4 w-10 bg-emerald-100/70 rounded-full mx-auto animate-pulse"></div>
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal Shimmer */}
                    <tr className="bg-slate-50/80 border-y border-slate-200/80 animate-pulse">
                      <td colSpan={2} className="px-2.5 py-2 border-r border-slate-200/60">
                        <div className="h-3 bg-slate-200 rounded w-28 animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-5 bg-blue-100 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-4 bg-emerald-100 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-4 bg-indigo-100 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-4 bg-rose-100 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-4 bg-slate-200 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-200/60">
                        <div className="h-3.5 w-4 bg-slate-200 rounded mx-auto animate-pulse"></div>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <div className="h-3.5 w-10 bg-slate-200 rounded-full mx-auto animate-pulse"></div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Status loading data lengkap sampai 100% termuat
  const isDataActuallyLoading = isLoading ||
    (!pelangganData || pelangganData.length === 0) ||
    (isClustersLoading && (!stationClusters || stationClusters.length === 0));

  // Perhitungan Akurat Stasiun: Menghitung seluruh stasiun individual unik (memecah stasiun yang digabung di 1 TL seperti WDU - RBG)
  const uniqueStationsList = useMemo(() => {
    const map = new Map();

    // 1. Ambil dari master list starlite_station_counts
    stationMasterList.forEach(s => {
      const code = String(s.kode_stasiun || '').trim().toUpperCase();
      if (code) {
        map.set(code, {
          kode: code,
          nama: s.stasiun || code,
          sektor: s.sektor || ''
        });
      }
    });

    // 2. Tambahkan juga dari cluster jika ada kode custom yang dimasukkan admin
    stationClusters.forEach(sc => {
      const sList = getStationList(sc);
      sList.forEach(code => {
        const uCode = String(code).trim().toUpperCase();
        if (uCode && !map.has(uCode)) {
          const name = stationCodeToNameMap[uCode] || uCode;
          map.set(uCode, {
            kode: uCode,
            nama: name,
            sektor: ''
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
  }, [stationMasterList, stationClusters, stationCodeToNameMap]);

  // Jumlah stasiun operasional murni (11 Stasiun) dan jumlah Team Leader (7 TL)
  const totalUniqueStationCount = uniqueStationsList.length;
  const totalTeamLeadersCount = stationClusters.length;

  const halfCount = Math.ceil(stationClusters.length / 2);
  const leftStations = useMemo(() => stationClusters.slice(0, halfCount), [stationClusters, halfCount]);
  const rightStations = useMemo(() => stationClusters.slice(halfCount), [stationClusters, halfCount]);

  return (
    <div className="flex flex-col min-h-full gap-3.5 select-none font-sans pb-4">



      {/* HEADER UTAMA & TOOLBAR NAVIGASI */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">

        {/* Judul & Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Icon name="users" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                Monitoring Performansi Tim Lapangan
              </h2>
              {isDataActuallyLoading ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                  Memuat Data...
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                  {totalUniqueStationCount} Stasiun ({totalTeamLeadersCount} TL) • {allTeamsFlat.length} Tim
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Rekapitulasi harian tugas & produktivitas teknisi per stasiun secara real-time
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tombol Snapshot (Salin Gambar untuk WA) */}
          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Ambil snapshot gambar tabel untuk dikirim (Langsung Paste)"
          >
            <Icon name={isCapturing ? "loader-2" : "camera"} size={14} className={isCapturing ? "animate-spin" : ""} />
            <span>{isCapturing ? "Menyalin..." : "Snapshot"}</span>
          </button>

          {/* Tombol Kelola Tim */}
          <button
            onClick={handleOpenManageModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Kelola Team Leader & Plotting Tim"
          >
            <Icon name="users" size={14} />
            <span>Kelola Tim</span>
          </button>
        </div>

      </div>

      {/* FILTER & DATE NAVIGATOR BAR */}
      <div className="bg-white rounded-2xl p-3 sm:px-4 sm:py-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">

        {/* Navigasi Tanggal Harian */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer"
            title="Hari Sebelumnya"
          >
            <Icon name="chevron-left" size={15} />
          </button>

          <div className="flex items-center gap-2 px-2">
            <input
              type="date"
              value={selectedDateYMD}
              onChange={(e) => e.target.value && setSelectedDateYMD(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none cursor-pointer focus:outline-none"
            />
            <span className="hidden lg:inline text-xs font-bold text-blue-600">
              ({formattedSelectedDate})
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer"
            title="Hari Berikutnya"
          >
            <Icon name="chevron-right" size={15} />
          </button>

          {selectedDateYMD !== todayYMD && (
            <button
              onClick={() => setSelectedDateYMD(todayYMD)}
              className="ml-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
            >
              Hari Ini
            </button>
          )}
        </div>

        {/* Filter Stasiun & Cari Tim */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="ALL">Semua Stasiun ({totalUniqueStationCount} Stasiun • {totalTeamLeadersCount} TL)</option>
            <optgroup label="Wilayah Team Leader (Cluster)">
              {stationClusters.map(sc => (
                <option key={sc.stasiun} value={sc.stasiun}>
                  {sc.stasiun} ({sc.teamLeader ? `TL: ${sc.teamLeader}` : ''} • {getStationList(sc).length} Stasiun)
                </option>
              ))}
            </optgroup>
            <optgroup label="Stasiun Individual">
              {uniqueStationsList.map(st => (
                <option key={st.kode} value={st.kode}>
                  Stasiun {st.kode} ({st.nama})
                </option>
              ))}
            </optgroup>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari teknisi / tim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-36 sm:w-48"
            />
            <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

      </div>

      {/* AREA DOKUMEN SNAPSHOT LAPORAN MONITORING (UNTUK DI-SHARE KE WA) */}
      <div
        ref={snapshotRef}
        className="flex flex-col gap-3.5 bg-slate-50/70 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80"
      >

        {/* Banner Identitas Snapshot (Menampilkan Header & Tanggal di atas tangkapan layar) */}
        <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
          {/* SISI KIRI: JUDUL MONITORING (MURNI TANPA BADGE, RUANG LEGA & BEBAS TERTUTUP) */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 inline-block"></span>
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight uppercase whitespace-nowrap">
              Monitoring Performansi Tim Lapangan
            </span>
          </div>

          {/* SISI KANAN: BADGE TOTAL STASIUN & TANGGAL (BERDAMPINGAN DENGAN RAPI) */}
          <div className="flex items-center gap-2 shrink-0">
            {isDataActuallyLoading ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 whitespace-nowrap animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                Memuat Data...
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/70 whitespace-nowrap">
                {totalUniqueStationCount} Stasiun ({totalTeamLeadersCount} TL) • {allTeamsFlat.length} Tim
              </span>
            )}
            <div className="text-xs font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 whitespace-nowrap">
              📅 {formattedSelectedDate}
            </div>
          </div>
        </div>

        {/* CONTAINER TABEL: PERMANEN 2 KOLOM (BERDAMPINGAN) */}
        {isDataActuallyLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start snapshot-grid-container">
            {renderSkeletonTableCard(4)}
            {renderSkeletonTableCard(3)}
          </div>
        ) : stationClusters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Icon name="users" size={28} />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">Belum Ada Data Tim & Stasiun</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Data stasiun dan plotting tim masih kosong. Silakan tambahkan stasiun, tentukan Team Leader, dan atur anggota tim melalui menu Kelola Tim.
            </p>
            <button
              onClick={handleOpenManageModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Icon name="plus" size={14} />
              <span>Kelola & Tambah Tim</span>
            </button>
          </div>
        ) : stationFilter !== 'ALL' ? (
          /* Jika difilter 1 stasiun spesifik */
          <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden snapshot-card">
            {renderStationTable(stationClusters, true)}
          </div>
        ) : (
          /* TAMPILAN 2 KOLOM BERDAMPINGAN */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 items-start snapshot-grid-container">
            {/* TABEL KOLOM KIRI */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden snapshot-card">
              {renderStationTable(leftStations, true)}
            </div>

            {/* TABEL KOLOM KANAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden snapshot-card">
              {renderStationTable(rightStations, true)}
            </div>
          </div>
        )}

        {/* GRAND TOTAL BAR DI BAWAH (REKAPITULASI RESMI SEMUA STASIUN) */}
        {isDataActuallyLoading ? (
          <div className="bg-white rounded-2xl p-3 sm:px-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Icon name="award" size={17} />
              </div>
              <div>
                <div className="h-3.5 bg-slate-200 rounded w-48 mb-1 animate-pulse"></div>
                <div className="h-2.5 bg-slate-100 rounded w-64 animate-pulse"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="h-6 w-20 bg-blue-50/90 rounded-lg border border-blue-100 animate-pulse"></div>
              <div className="h-6 w-16 bg-emerald-50/90 rounded border border-emerald-100 animate-pulse"></div>
              <div className="h-6 w-16 bg-indigo-50/90 rounded border border-indigo-100 animate-pulse"></div>
              <div className="h-6 w-16 bg-rose-50/90 rounded border border-rose-100 animate-pulse"></div>
              <div className="h-6 w-16 bg-amber-50/90 rounded border border-amber-100 animate-pulse"></div>
              <div className="h-6 w-16 bg-slate-100 rounded border border-slate-200 animate-pulse"></div>
              <div className="h-7 w-24 bg-emerald-100/80 rounded-full border border-emerald-200 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3 sm:px-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Icon name="award" size={17} />
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Total Keseluruhan ({totalUniqueStationCount} Stasiun • {totalTeamLeadersCount} Team Leader)
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Rekapitulasi performansi {allTeamsFlat.length} tim operasional di {totalUniqueStationCount} stasiun hari ini
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Total WO:</span>
                <span className="font-black text-blue-700 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200/60 text-xs">{grandTotal.wo}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Aktivasi:</span>
                <span className="font-black text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-xs">{grandTotal.akt}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Visit:</span>
                <span className="font-black text-indigo-600 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-xs">{grandTotal.vis}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Dismantle:</span>
                <span className="font-black text-rose-600 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-xs">{grandTotal.dis}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Pending:</span>
                <span className="font-black text-amber-600 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-xs">{grandTotal.pnd}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Kendala:</span>
                <span className="font-black text-rose-700 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-xs">{grandTotal.kdl || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold text-[11px]">Outstanding:</span>
                <span className="font-black text-slate-700 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs">{grandTotal.out}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black ml-1">
                <span className="text-slate-500 text-[11px]">Performansi:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                  {grandTotal.prodStr}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL RINCIAN TIKET / TUGAS HARI INI */}
      {detailModal.isOpen && detailModal.teamData && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailModal({ isOpen: false, teamData: null, activeTab: 'semua' });
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl h-[560px] max-h-[88vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Icon name="list-checks" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Rincian Tugas: {detailModal.teamData.nama}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    TL: {detailModal.teamData.teamLeader} • Stasiun {detailModal.teamData.stasiun} • {formattedSelectedDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModal({ isOpen: false, teamData: null, activeTab: 'semua' })}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Modal Tabs Ringkasan */}
            <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 custom-scrollbar">
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'semua' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'semua' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Semua ({detailModal.teamData.totalWO || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'aktivasi' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'aktivasi' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Aktivasi ({detailModal.teamData.aktivasi || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'visit' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'visit' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Visit ({detailModal.teamData.visit || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'dismantle' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'dismantle' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Dismantle ({detailModal.teamData.dismantle || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'pending' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Pending ({detailModal.teamData.pending || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'kendala' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'kendala' ? 'bg-rose-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Kendala ({detailModal.teamData.kendala || 0})
              </button>
              <button
                onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'outstanding' }))}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${detailModal.activeTab === 'outstanding' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Proses ({detailModal.teamData.outstanding || 0})
              </button>
            </div>

            {/* List Tugas */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar flex flex-col min-h-0">
              {(() => {
                const rec = detailModal.teamData.records || {};
                let items = [];
                if (detailModal.activeTab === 'semua') {
                  items = [
                    ...(rec.aktivasi || []),
                    ...(rec.visit || []),
                    ...(rec.dismantle || []),
                    ...(rec.pending || []),
                    ...(rec.kendala || []),
                    ...(rec.outstanding || [])
                  ];
                } else {
                  items = rec[detailModal.activeTab] || [];
                }

                if (items.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                      <Icon name="inbox" size={36} className="mx-auto mb-2.5 text-slate-300" />
                      <p className="font-semibold text-slate-600">Tidak ada catatan tugas pada kategori ini</p>
                      <p className="text-[11px] text-slate-400 mt-1">Tanggal: {formattedSelectedDate}</p>
                    </div>
                  );
                }

                return items.map((it, idx) => {
                  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  const tLow = (it.tipe || '').toLowerCase();
                  if (tLow.includes('kendala')) {
                    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200/80';
                  } else if (tLow.includes('pending')) {
                    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200/80';
                  } else if (tLow.includes('dismantle')) {
                    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200/80';
                  } else if (tLow.includes('visit')) {
                    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
                  } else if (tLow.includes('proses') || tLow.includes('outstanding')) {
                    badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  } else if (tLow.includes('aktivasi')) {
                    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3 sm:p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/90 transition-all flex flex-col gap-2.5 shadow-2xs"
                    >
                      {/* Baris Atas: Nama Pelanggan, Tipe, ID Pelanggan */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {it.nama || it.id}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeStyle}`}>
                            {it.tipe}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 bg-white text-slate-700 rounded-md border border-slate-200 shrink-0 shadow-2xs">
                          ID: {it.id || '-'}
                        </span>
                      </div>

                      {/* Baris Tengah: Info Rinci (Stasiun, ODP & Port, SN ONT) Tanpa Icon */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {/* Stasiun */}
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                          <span className="text-slate-500 font-semibold">Stasiun:</span>
                          <span className="font-bold text-slate-900">{it.stasiun || '-'}</span>
                        </div>

                        {/* ODP & Port */}
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                          <span className="text-slate-500 font-semibold">ODP:</span>
                          <span className="font-bold text-slate-900">
                            {it.odp !== '-' ? it.odp : '-'} {it.portOdp && it.portOdp !== '-' ? `(Port ${it.portOdp})` : ''}
                          </span>
                        </div>

                        {/* SN ONT (Bisa diklik untuk salin) */}
                        <div
                          onClick={() => {
                            if (it.snOnt && it.snOnt !== '-') {
                              navigator.clipboard.writeText(it.snOnt);
                              showToast(`SN ONT "${it.snOnt}" disalin!`, 'success');
                            }
                          }}
                          className={`flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 shadow-2xs ${it.snOnt && it.snOnt !== '-' ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50' : ''}`}
                          title={it.snOnt && it.snOnt !== '-' ? 'Klik untuk salin Serial Number ONT' : ''}
                        >
                          <span className="text-slate-500 font-semibold">SN:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {it.snOnt || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Baris Bawah: Keterangan / Status jika ada */}
                      {it.keterangan && it.keterangan !== '-' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                          <span className="truncate">{it.keterangan}</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setDetailModal({ isOpen: false, teamData: null, activeTab: 'semua' })}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL KELOLA PLOTTING TIM & TEAM LEADER */}
      {isManageModalOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsManageModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[680px] max-h-[90vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Icon name="users" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Kelola Plotting Tim & Team Leader
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Atur pembagian stasiun, penunjukan Team Leader, dan komposisi 2 orang teknisi per tim
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Datalist untuk Autocomplete Nama Teknisi */}
            <datalist id="registered-teknisi-options">
              {uniqueTeknisiList.map((t, idx) => (
                <option key={idx} value={t.nama}>
                  {t.username ? `${t.nama} (${t.username})` : t.nama}
                </option>
              ))}
            </datalist>

            {/* Datalist untuk Autocomplete Kode Stasiun dari Database (kolom kode_stasiun) */}
            <datalist id="available-station-options">
              {stationMasterList.map((st, idx) => (
                <option key={idx} value={st.kode_stasiun}>
                  {st.stasiun ? `${st.kode_stasiun} - ${st.stasiun}` : st.kode_stasiun}
                </option>
              ))}
            </datalist>

            {/* Modal Body: 2 Kolom (Sidebar Stasiun di Kiri, Editor Tim di Kanan) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

              {/* SIDEBAR PILIH STASIUN */}
              <div className="w-full md:w-60 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Wilayah TL ({draftClusters.length}) • {draftClusters.reduce((acc, c) => acc + (getStationList(c).length || 1), 0)} Stasiun
                  </span>
                  <button
                    onClick={handleAddStation}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    title="Tambah Stasiun / Wilayah Baru"
                  >
                    <Icon name="plus" size={12} />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="p-2 overflow-y-auto flex-1 custom-scrollbar space-y-1">
                  {draftClusters.map((st, sIdx) => {
                    const isActive = sIdx === activeStationIdx;
                    const stCount = getStationList(st).length;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => setActiveStationIdx(sIdx)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${isActive
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'hover:bg-slate-200/60 text-slate-700 font-medium'
                          }`}
                      >
                        <div className="truncate">
                          <div className="text-xs truncate">{st.stasiun || 'Tanpa Nama'}</div>
                          <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                            TL: {st.teamLeader || '-'} {stCount > 1 ? `(${stCount} Stasiun)` : ''}
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${isActive
                          ? 'bg-blue-700/80 text-blue-100'
                          : 'bg-slate-200 text-slate-600'
                          }`}>
                          {(st.teams || []).length} Tim
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EDITOR DETAIL STASIUN & TIM */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-white">
                {draftClusters[activeStationIdx] && (() => {
                  const currentSt = draftClusters[activeStationIdx];
                  return (
                    <>
                      {/* Box Pengaturan Stasiun & TL */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                            Informasi Stasiun #{activeStationIdx + 1}
                          </span>
                          {draftClusters.length > 1 && (
                            <button
                              onClick={() => handleDeleteStation(activeStationIdx)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Icon name="trash-2" size={13} />
                              <span>Hapus Stasiun</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* INPUT MULTI-STASIUN (CHIPS / TAGS) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-600">
                                Cakupan Stasiun (Bisa Lebih Dari 1)
                              </label>
                              <span className="text-[10px] text-blue-600 font-black">
                                {getStationList(currentSt).length} Stasiun Terpilih
                              </span>
                            </div>

                            {/* Area Box Chips Kode Stasiun */}
                            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-xl min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                              {getStationList(currentSt).map((stCode, idx) => {
                                const fullName = stationCodeToNameMap[stCode];
                                return (
                                  <span
                                    key={idx}
                                    title={fullName ? `${stCode} - Stasiun ${fullName}` : stCode}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-black uppercase tracking-tight shadow-2xs group"
                                  >
                                    <span>{stCode}</span>
                                    {fullName && (
                                      <span className="text-[10px] font-semibold text-blue-500 hidden sm:inline">
                                        ({fullName})
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStationTag(idx)}
                                      className="text-blue-400 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 transition-colors cursor-pointer"
                                      title={`Hapus kode stasiun ${stCode}`}
                                    >
                                      <Icon name="x" size={12} />
                                    </button>
                                  </span>
                                );
                              })}

                              {/* Input penambah kode stasiun baru */}
                              <div className="flex-1 min-w-[140px] flex items-center gap-1">
                                <input
                                  type="text"
                                  list="available-station-options"
                                  value={stationTagInput}
                                  onChange={(e) => setStationTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      handleAddStationTag(stationTagInput);
                                    }
                                  }}
                                  placeholder={getStationList(currentSt).length === 0 ? "Pilih / ketik kode stasiun (e.g. WDU, RBG)..." : "+ Tambah kode..."}
                                  className="w-full text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none placeholder-slate-400"
                                />
                                {stationTagInput.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddStationTag(stationTagInput)}
                                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shrink-0 cursor-pointer transition-colors"
                                  >
                                    + Tambah
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Petunjuk penggunaan */}
                            <div className="mt-1.5 flex flex-col gap-0.5 text-[10px]">
                              <span className="text-slate-400">
                                Pilih <strong>kode stasiun</strong> lalu tekan <strong>Enter</strong>.
                              </span>
                              {getStationList(currentSt).length > 1 && (
                                <div className="text-blue-600 font-bold tracking-tight" title={currentSt.stasiun}>
                                  Gabungan: <span className="font-extrabold">{currentSt.stasiun}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* INPUT TEAM LEADER */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Team Leader (TL)
                            </label>
                            <input
                              type="text"
                              list="registered-teknisi-options"
                              value={currentSt.teamLeader || ''}
                              onChange={(e) => handleUpdateStationField('teamLeader', e.target.value)}
                              placeholder="Nama Team Leader..."
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <p className="mt-1 text-[10px] text-slate-400">
                              Penanggung jawab teknisi untuk {getStationList(currentSt).length > 0 ? getStationList(currentSt).join(', ') : 'stasiun ini'}.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Header Daftar Tim */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                            Plotting Tim Teknisi (1 Tim 2 Orang)
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Pilih nama teknisi dari database atau ketik langsung
                          </p>
                        </div>
                        <button
                          onClick={handleAddTeam}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 cursor-pointer transition-colors"
                        >
                          <Icon name="plus" size={13} />
                          <span>Tambah Tim</span>
                        </button>
                      </div>

                      {/* Daftar Kartu Tim */}
                      <div className="space-y-3">
                        {(currentSt.teams || []).map((tm, tmIdx) => {
                          const mem1 = tm.anggota?.[0] || { nama: '', username: '' };
                          const mem2 = tm.anggota?.[1] || { nama: '', username: '' };

                          return (
                            <div
                              key={tm.id || tmIdx}
                              className="bg-slate-50/60 rounded-2xl border border-slate-200 p-3.5 flex flex-col gap-3 relative hover:border-slate-300 transition-colors"
                            >
                              {/* Header Kartu Tim */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                    {tmIdx + 1}
                                  </span>
                                  <div className="flex-1 max-w-xs">
                                    <input
                                      type="text"
                                      value={tm.nama || ''}
                                      onChange={(e) => handleUpdateTeamName(tmIdx, e.target.value)}
                                      placeholder="Nama Tim (e.g. ADJI - ANDIKA)"
                                      className="w-full text-xs font-black uppercase tracking-tight text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleAutoTeamName(tmIdx)}
                                    className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:bg-white rounded border border-slate-200/80 cursor-pointer transition-colors"
                                    title="Auto-generate nama tim dari nama anggota"
                                  >
                                    Auto
                                  </button>
                                </div>

                                {(currentSt.teams || []).length > 1 && (
                                  <button
                                    onClick={() => handleDeleteTeam(tmIdx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer self-end sm:self-center"
                                    title="Hapus Tim Ini"
                                  >
                                    <Icon name="trash-2" size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Form 2 Orang Teknisi */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                {/* Teknisi 1 */}
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                                    Teknisi 1
                                  </span>
                                  <input
                                    type="text"
                                    list="registered-teknisi-options"
                                    value={mem1.nama || ''}
                                    onChange={(e) => handleUpdateMember(tmIdx, 0, 'nama', e.target.value)}
                                    placeholder="Nama Teknisi 1..."
                                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 font-medium"
                                  />
                                  <input
                                    type="text"
                                    value={mem1.username || ''}
                                    onChange={(e) => handleUpdateMember(tmIdx, 0, 'username', e.target.value)}
                                    placeholder="Username Telegram (opsional)"
                                    className="w-full text-[11px] text-slate-500 border border-slate-200/80 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 font-mono"
                                  />
                                </div>

                                {/* Teknisi 2 */}
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                    Teknisi 2
                                  </span>
                                  <input
                                    type="text"
                                    list="registered-teknisi-options"
                                    value={mem2.nama || ''}
                                    onChange={(e) => handleUpdateMember(tmIdx, 1, 'nama', e.target.value)}
                                    placeholder="Nama Teknisi 2..."
                                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 font-medium"
                                  />
                                  <input
                                    type="text"
                                    value={mem2.username || ''}
                                    onChange={(e) => handleUpdateMember(tmIdx, 1, 'username', e.target.value)}
                                    placeholder="Username Telegram (opsional)"
                                    className="w-full text-[11px] text-slate-500 border border-slate-200/80 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 font-mono"
                                  />
                                </div>

                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </>
                  );
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveClusters}
                disabled={isSavingClusters}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {isSavingClusters ? (
                  <>
                    <Icon name="refresh-cw" size={14} className="animate-spin" />
                    <span>Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={14} />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* TOAST NOTIFIKASI SELALU DI LAPISAN PALING ATAS (DI DEPAN MODAL & EFEK BLUR) */}
      {toast.show && ReactDOM.createPortal(
        <div className="fixed top-5 right-5 z-[10001] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold bg-slate-900 text-white border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert-circle' : 'info'} size={16} className={toast.type === 'success' ? 'text-emerald-400' : toast.type === 'error' ? 'text-rose-400' : 'text-blue-400'} />
          <span>{toast.message}</span>
        </div>,
        document.body
      )}

      {/* MODAL KONFIRMASI KUSTOM (PENGGANTI WINDOW.CONFIRM / ALERT) */}
      {confirmModal.isOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                <Icon name="alert-triangle" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {confirmModal.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'Batal'}
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="trash-2" size={13} />
                <span>{confirmModal.confirmText || 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
