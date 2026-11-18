/**
 * SERVICE: BROADCAST CS PUSAT STARLITE (VENDOR MANAGEMENT RECONCILIATION)
 * =========================================================================
 * Menarik status broadcast WhatsApp dari tim CS/Agen Pusat Starlite ke pelanggan
 * Isolir (Suspend) dan Ready To Dismantle.
 *
 * Data ditarik dari API Google Apps Script Vendor Management:
 * https://vendormanagement-ije.github.io/Dashboard-Isolir/#pencocokan
 *
 * Mengelompokkan status hasil respon:
 * - bayar     : Sudah Bayar / Lunas
 * - lanjut    : Mau Lanjut Berlangganan
 * - tidak     : Tidak Mau Lanjut (Bisa diprioritaskan Dismantle)
 * - norespon  : Tidak Respon
 * - reminder  : Reminder Tagihan Terkirim
 * - notag     : Broadcast Terkirim (Belum ada tag / respon)
 * - none      : Belum ada broadcast
 * =========================================================================
 */

const VENDOR_MANAGEMENT_API = "https://script.google.com/macros/s/AKfycbz-DqYj9vS-bT6jbe71Dvp7Zs-NcMIlQUb5UthJGSoY26QzhxTaYUYqMd5JdU-ZKuQ0ow/exec";

export const BROADCAST_OUTCOMES = {
  bayar: {
    k: 'bayar',
    label: 'Sudah Bayar',
    shortLabel: 'Sudah Bayar',
    color: '#15803d',
    bg: '#dcf5e5',
    border: '#86efac',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'check-circle',
    rank: 1
  },
  lanjut: {
    k: 'lanjut',
    label: 'Mau Lanjut',
    shortLabel: 'Mau Lanjut',
    color: '#1d4ed8',
    bg: '#e3ecfe',
    border: '#93c5fd',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'thumbs-up',
    rank: 2
  },
  tidak: {
    k: 'tidak',
    label: 'Tidak Mau Lanjut',
    shortLabel: 'Tidak Mau',
    color: '#b45309',
    bg: '#fdecd0',
    border: '#fcd34d',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: 'x-circle',
    rank: 3
  },
  norespon: {
    k: 'norespon',
    label: 'Tidak Respon',
    shortLabel: 'Tidak Respon',
    color: '#475569',
    bg: '#e6eaf0',
    border: '#cbd5e1',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: 'message-square',
    rank: 4
  },
  reminder: {
    k: 'reminder',
    label: 'Reminder Tagihan',
    shortLabel: 'Reminder',
    color: '#4338ca',
    bg: '#e4e5fb',
    border: '#c7d2fe',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: 'bell',
    rank: 5
  },
  lain: {
    k: 'lain',
    label: 'Layanan Lain',
    shortLabel: 'Layanan Lain',
    color: '#0f766e',
    bg: '#d6f1ee',
    border: '#99f6e4',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
    icon: 'help-circle',
    rank: 6
  },
  notag: {
    k: 'notag',
    label: 'Terkirim (Tanpa Tag)',
    shortLabel: 'Terkirim',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: 'send',
    rank: 7
  },
  none: {
    k: 'none',
    label: 'Belum Broadcast',
    shortLabel: 'Belum Broadcast',
    color: '#94a3b8',
    bg: '#f8fafc',
    border: '#e2e8f0',
    badgeClass: 'bg-slate-50 text-slate-400 border-slate-200',
    icon: 'minus',
    rank: 8
  }
};

/**
 * Normalisasi nomor HP menjadi awalan 628...
 */
export function normPhone(p) {
  let x = String(p || '').replace(/\D/g, '');
  if (!x) return '';
  if (x.startsWith('62')) return x;
  const i = x.indexOf('628');
  if (i > 0) return x.slice(i);
  if (x.startsWith('08')) return '62' + x.slice(1);
  if (x.startsWith('8')) return '62' + x;
  return x;
}

/**
 * Pengelompokan tag broadcast resmi Starlite Vendor Management
 */
export function tagGroup(t) {
  const str = String(t || '').toLowerCase();
  if (/sudah bayar/.test(str)) return 'bayar';
  if (/tidak mau lanjut/.test(str)) return 'tidak';
  if (/mau lanjut|vb-lanjut/.test(str)) return 'lanjut';
  if (/no respon/.test(str)) return 'norespon';

  const bc = /bc (?:isolir|billing)\s*(?:-\s*)?(.*)$/.exec(str);
  if (bc) {
    const r = bc[1].trim();
    if (!r) return 'reminder';
    if (/(?<!belum |tidak )(?:bayar|success|berhasil)/.test(r)) return 'bayar';
    if (/nanti aja|pikir|retensi|retention|mau/.test(r)) return 'lanjut';
    return 'lain';
  }

  if (/reminder h[-+]\d/.test(str)) return 'reminder';
  return 'lain';
}

function bestOf(groups) {
  if (!groups || !groups.length) return 'notag';
  return groups.reduce((best, cur) => {
    const rBest = BROADCAST_OUTCOMES[best]?.rank ?? 99;
    const rCur = BROADCAST_OUTCOMES[cur]?.rank ?? 99;
    return rCur < rBest ? cur : best;
  }, groups[0] || 'notag');
}

function roomGroup(tags) {
  if (!tags || !tags.length) return 'notag';
  return bestOf(tags.map(tagGroup));
}

// In-Memory cache broadcast map (Key: normPhone, Value: CustomerBroadcastSummary)
let cachedBroadcastMap = new Map();
let lastSyncTimestamp = 0;
let isFetchingBroadcast = false;

// Cek dan pulihkan cache lokal dari localStorage saat inisialisasi
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('opstracker_broadcast_cache');
    const savedTime = localStorage.getItem('opstracker_broadcast_time');
    if (saved && savedTime && Date.now() - Number(savedTime) < 24 * 3600 * 1000) {
      const parsed = JSON.parse(saved);
      cachedBroadcastMap = new Map(Object.entries(parsed));
      lastSyncTimestamp = Number(savedTime);
    }
  }
} catch (_e) {
  // Abaikan error kuota / format JSON lokal
}

/**
 * Mengambil ringkasan broadcast yang tersimpan di memori saat ini
 */
export function getCachedBroadcastMap() {
  return cachedBroadcastMap;
}

/**
 * Mencari status broadcast seorang pelanggan berdasarkan nomor telepon
 * @param {string} phone - Nomor HP pelanggan
 * @returns {Object|null}
 */
export function getCustomerBroadcastSummary(phone) {
  if (!phone) return null;
  const pn = normPhone(phone);
  if (!pn) return null;
  return cachedBroadcastMap.get(pn) || null;
}

/**
 * Sinkronisasi data broadcast dari API Vendor Management Pusat
 * @param {Object} options
 * @param {boolean} options.force - Paksa refresh ulang mengabaikan cache
 * @param {Function} options.onProgress - Callback update teks progres
 * @returns {Promise<{success: boolean, matchedCount: number, error?: string}>}
 */
export async function fetchBroadcastData({ force = false, onProgress = null } = {}) {
  // Jika sedang berjalan atau cache masih hangat (< 15 menit) dan tidak force
  if (isFetchingBroadcast) {
    return { success: true, matchedCount: cachedBroadcastMap.size };
  }
  if (!force && cachedBroadcastMap.size > 0 && Date.now() - lastSyncTimestamp < 15 * 60 * 1000) {
    return { success: true, matchedCount: cachedBroadcastMap.size };
  }

  isFetchingBroadcast = true;
  try {
    if (onProgress) onProgress('Memeriksa riwayat broadcast Starlite Pusat...');

    // 1. Ambil manifest tanggal broadcast
    const manifestRes = await fetch(VENDOR_MANAGEMENT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'manifest', key: '' }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    if (!manifestRes.ok) {
      throw new Error(`HTTP ${manifestRes.status} saat menghubungi Manifest Broadcast`);
    }

    const manifestJson = await manifestRes.json();
    const days = Array.isArray(manifestJson?.days) ? manifestJson.days : [];

    if (!days.length) {
      isFetchingBroadcast = false;
      return { success: true, matchedCount: 0 };
    }

    // Ambil maksimal 4 tanggal terbaru
    const recentDays = days.slice(-4);
    if (onProgress) onProgress(`Mengunduh data broadcast ${recentDays.length} hari terakhir...`);

    // 2. Unduh data hari yang belum ada di cache atau ada perubahan timestamp
    const dayDataList = [];
    for (const d of recentDays) {
      const cacheKey = `opstracker_bc_day_${d.date}`;
      let cachedDay = null;
      try {
        if (!force && typeof window !== 'undefined' && window.sessionStorage) {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.updated === d.updated && parsed.rows === d.rows) {
              cachedDay = parsed.data;
            }
          }
        }
      } catch (_e) {}

      if (cachedDay) {
        dayDataList.push({ date: d.date, day: cachedDay });
      } else {
        try {
          const dayRes = await fetch(VENDOR_MANAGEMENT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'day', date: d.date, key: '' }),
            redirect: 'follow',
            signal: AbortSignal.timeout(20000)
          });
          if (dayRes.ok) {
            const dayJson = await dayRes.json();
            if (dayJson?.day) {
              dayDataList.push({ date: d.date, day: dayJson.day });
              try {
                if (typeof window !== 'undefined' && window.sessionStorage) {
                  sessionStorage.setItem(cacheKey, JSON.stringify({
                    updated: d.updated,
                    rows: d.rows,
                    data: dayJson.day
                  }));
                }
              } catch (_e) {}
            }
          }
        } catch (err) {
          console.warn(`[BROADCAST SERVICE] Gagal memuat tanggal ${d.date}:`, err.message);
        }
      }
    }

    // 3. Bangun indeks Map per nomor telepon
    const newMap = new Map();

    dayDataList.forEach(({ date, day }) => {
      const ch = day.ch || [];
      const ag = day.ag || [];
      (day.rows || []).forEach(r => {
        const rawPhone = r[1];
        const pn = normPhone(rawPhone);
        if (!pn) return;

        const isBroadcastSent = r[12] === 'B';
        const channel = ch[r[2]] || '';
        const agent = r[7] >= 0 ? ag[r[7]] : '';
        const status = r[3] || '';
        const time = r[4] || '';
        const tagStr = r[5] || '';
        const tags = tagStr ? tagStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const note = r[6] || '';
        const firstResponse = r[8];
        const g = isBroadcastSent ? 'notag' : roomGroup(tags);

        const roomObj = {
          name: r[0] || '',
          phone: rawPhone,
          pn,
          channel: String(channel).replace(/^wa_cloud \[/, '').replace(/\]$/, ''),
          agent: agent || 'CS Pusat',
          status: status || (isBroadcastSent ? 'delivered' : 'terkirim'),
          time: time || date,
          tag: tagStr,
          tags,
          note,
          firstResponseMinutes: firstResponse ? (Number(firstResponse) / 60).toFixed(1).replace('.', ',') : null,
          date,
          g,
          isBroadcastSent
        };

        if (!newMap.has(pn)) {
          newMap.set(pn, []);
        }
        newMap.get(pn).push(roomObj);
      });
    });

    // 4. Kompilasi hasil terbaik per nomor telepon
    const summaryMap = new Map();
    for (const [pn, rooms] of newMap.entries()) {
      // Urutkan rooms dari yang terbaru ke terlama
      rooms.sort((a, b) => {
        const tA = new Date(a.time).getTime() || 0;
        const tB = new Date(b.time).getTime() || 0;
        return tB - tA;
      });

      const latestRoom = rooms[0];
      const bestOutcomeKey = bestOf(rooms.map(rm => rm.g));
      const outcomeInfo = BROADCAST_OUTCOMES[bestOutcomeKey] || BROADCAST_OUTCOMES.notag;

      summaryMap.set(pn, {
        pn,
        phone: latestRoom.phone,
        name: latestRoom.name,
        isBroadcasted: true,
        outcome: bestOutcomeKey,
        outcomeLabel: outcomeInfo.label,
        shortLabel: outcomeInfo.shortLabel,
        color: outcomeInfo.color,
        bg: outcomeInfo.bg,
        border: outcomeInfo.border,
        badgeClass: outcomeInfo.badgeClass,
        icon: outcomeInfo.icon,
        latestAt: latestRoom.time,
        agent: latestRoom.agent,
        channel: latestRoom.channel,
        tag: latestRoom.tag,
        tags: latestRoom.tags,
        note: latestRoom.note,
        status: latestRoom.status,
        firstResponseMinutes: latestRoom.firstResponseMinutes,
        roomCount: rooms.length,
        rooms
      });
    }

    cachedBroadcastMap = summaryMap;
    lastSyncTimestamp = Date.now();

    // Simpan ke localStorage versi ringkas
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Ambil objek ringkas untuk penyimpanan
        const serializable = {};
        for (const [pn, item] of summaryMap.entries()) {
          serializable[pn] = {
            outcome: item.outcome,
            outcomeLabel: item.outcomeLabel,
            shortLabel: item.shortLabel,
            badgeClass: item.badgeClass,
            icon: item.icon,
            latestAt: item.latestAt,
            agent: item.agent,
            channel: item.channel,
            tag: item.tag,
            status: item.status,
            firstResponseMinutes: item.firstResponseMinutes,
            roomCount: item.roomCount
          };
        }
        localStorage.setItem('opstracker_broadcast_cache', JSON.stringify(serializable));
        localStorage.setItem('opstracker_broadcast_time', String(lastSyncTimestamp));
      }
    } catch (_e) {}

    isFetchingBroadcast = false;
    return { success: true, matchedCount: summaryMap.size };
  } catch (err) {
    console.error('[BROADCAST SERVICE] Gagal menyinkronkan:', err);
    isFetchingBroadcast = false;
    return { success: false, matchedCount: cachedBroadcastMap.size, error: err.message };
  }
}

