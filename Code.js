/**
 * Google Apps Script - Server Side Logic
 * Terhubung ke Spreadsheet ID Master & Multi-Database Stasiun
 */

const SPREADSHEET_ID = "13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M";
const DB_SHEET_NAME = "Master_Database";
const DASH_SHEET_NAME = "Dashboard";

// ==========================================
// TOKEN BOT TELEGRAM (Untuk fitur DM Teknisi)
// ==========================================
const BOT_TOKEN = "8789065775:AAEsOr7g1myDHyHPPuhuujNR07euM3tNmEs"; // Ganti dengan Token Bot asli

// --- PETA DATABASE SUMBER STASIUN ---
// Diambil dari formula IMPORTRANGE Anda
const STATION_DB_MAP = {
  "Brumbung": { id: "1CyHkgCR-6kUO5gxKBQbNwT28PYHTPNDvaSt3F5TXGUs", sheetName: "Brumbung" },
  "Wadu": { id: "1UIQpbuGdPdIefIggktJpSsdmRIhhrjyXbNx60m2LMPA", sheetName: "Wadu" },
  "Kradenan": { id: "1GEc9s_oMpEbuwdahzNgCtb42PGFWWASVYwuuBAwk5UE", sheetName: "Kradenan" },
  "Sulur": { id: "1zoy7IvYtjfmjvBw2lUK7-i-1c73ikCRDlhGT5CftNvc", sheetName: "Sulur" },
  "Randublatung": { id: "1BPa2WBRzYwus336l3s4wfE333QaxvuIvg-jV_QaCsmQ", sheetName: "Randu" },
  "Alastua": { id: "1zJbx-ZJoRay4dj-E5dv2T9w1bpE8vi8GtyDuNlaV-Ws", sheetName: "Alastua" },
  "Semarang Tawang": { id: "1HmG71UGj2r7lOB5XzDzWTETMjYKoij-X8ofCw_XrEdk", sheetName: "Tawang" },
  "Krengseng": { id: "1qTqQpzK34kqBJE-NsvidUhM3x2cVRXhA5F4_G65X7mo", sheetName: "Krengseng" },
  "Weleri": { id: "1ZVlW0X0NB5RU9NoLSdFFbOisLhBjy_bxBJXwL-Xgqnk", sheetName: "Weleri" },
  "Kaliwungu": { id: "1r7SErCmhxBuWqo_DOpThJk8X8Ddgv0oR7A98Av18Zo8", sheetName: "Kaliwungu" },
  "Kalibodri": { id: "1P4bESYhtqkyM14tknKYMiBVVNg3Zgj8KS9yVSGiQIwo", sheetName: "Kalibodri" }
};

const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Operational Tracker & Analytics System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ====================================================================
    // 1. AMBIL DATA VISIT LOG (KITA BACA DULUAN UNTUK PENGURANG HC)
    // ====================================================================
    let visitLogData = [];
    const openTicketIds = {}; // Menyimpan ID Pelanggan yang sedang gangguan
    let totalKendalaHariIni = 0; // Menghitung total kendala

    const visitSheet = ss.getSheetByName("Visit_Log");
    if (visitSheet) {
      const vValues = visitSheet.getDataRange().getValues();
      if (vValues.length > 1) {
        for (let i = 1; i < vValues.length; i++) {
          const r = vValues[i];
          const vId = String(r[1] || "").trim();
          if (!vId) continue;

          const tStamp = r[0] instanceof Date ? Utilities.formatDate(r[0], "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(r[0]);
          const statusTkt = String(r[6] || "OPEN").toUpperCase().trim();

          if (statusTkt === "OPEN") {
            openTicketIds[vId] = true;
            totalKendalaHariIni++;
          }

          visitLogData.push({
            timestamp: tStamp,
            idPelanggan: vId,
            namaPelanggan: String(r[2] || ""),
            stasiun: String(r[3] || ""),
            keluhan: String(r[4] || ""),
            catatan: String(r[5] || ""),
            status: statusTkt,
            odpAktual: String(r[7] || ""),
            port: String(r[8] || ""),
            snOnt: String(r[9] || ""),
            nomorHp: String(r[10] || ""),    // Kolom K (11)
            latitude: String(r[11] || ""),   // Kolom L (12)
            longitude: String(r[12] || ""),  // Kolom M (13)
            penyebab: String(r[13] || ""),   // Kolom N (14) 
            perbaikan: String(r[14] || ""),  // Kolom O (15) 
            material: String(r[15] || ""),   // Kolom P (16 - Used Materials)
            petugas: String(r[16] || ""),    // Kolom Q (17 - Petugas)
            evidence: String(r[17] || "")    // Kolom R (18 - Evidence)
          });
        }
      }
    }

    // ====================================================================
    // 2. AMBIL DATA MASTER LANGSUNG DARI SHEET MASTER_DATABASE (SUPER KILAT!)
    // ====================================================================
    const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) throw new Error("Sheet 'Master_Database' tidak ditemukan.");

    const values = dbSheet.getDataRange().getValues();
    const headers = values.shift();

    const rows = values.map(r => {
      let obj = {};
      headers.forEach((h, i) => {
        let key = String(h).toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
        let val = r[i];
        if (val instanceof Date) val = Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss");
        if (typeof val === 'string' && val.startsWith('#')) val = null;
        obj[key] = val !== "" ? val : null;
      });
      return obj;
    });

    const validRows = rows.filter(row => row.idPelanggan || row.namaPelanggan);


    // Hitung pengurangan HC per stasiun dari data valid
    const hcReductionPerStation = {};
    validRows.forEach(obj => {
      const rowId = String(obj.idPelanggan || '').trim();
      const stasiunName = String(obj.stasiun || '').toLowerCase().trim();
      if (rowId && openTicketIds[rowId]) {
        if (!hcReductionPerStation[stasiunName]) {
          hcReductionPerStation[stasiunName] = 0;
        }
        hcReductionPerStation[stasiunName]++;
      }
    });

    const now = new Date();
    const todayStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");

    const petugasMap = {};
    const history = [];
    const dailyTrend = {};


    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyTrend[Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd")] = {
        date: Utilities.formatDate(d, "GMT+7", "dd MMM"), aktivasi: 0, visit: 0
      };
    }

    validRows.forEach(row => {
      const stasiun = row['stasiun'] || "Tanpa Stasiun";
      const tglAktivasiFull = String(row['tglAktivasi'] || "");
      const tglKendalaFull = String(row['tanggalKendala'] || "");

      const tglAktifStr = tglAktivasiFull.split('T')[0] || "";
      const tglKendalaStr = tglKendalaFull.split('T')[0] || "";

      const isAktifToday = tglAktifStr === todayStr;
      const isKendalaToday = tglKendalaStr === todayStr;

      const pAktif = row['petugasAktivasi'];
      if (isAktifToday && pAktif) {
        if (!petugasMap[pAktif]) petugasMap[pAktif] = { nama: pAktif, stasiun: stasiun, aktivasi: 0, visit: 0 };
        petugasMap[pAktif].aktivasi++;
      }

      const pIkr = row['petugasIkr'];
      if (isKendalaToday && pIkr) {
        if (!petugasMap[pIkr]) petugasMap[pIkr] = { nama: pIkr, stasiun: stasiun, aktivasi: 0, visit: 0 };
        petugasMap[pIkr].visit++;
      }

      if (isAktifToday || isKendalaToday) {
        let jam = "00:00";
        if (isAktifToday && tglAktivasiFull.includes('T')) jam = tglAktivasiFull.split('T')[1].substring(0, 5);
        else if (isKendalaToday && tglKendalaFull.includes('T')) jam = tglKendalaFull.split('T')[1].substring(0, 5);

        history.push({
          name: row['namaPelanggan'] || "Pelanggan",
          address: row['alamat'] || "-",
          stasiun: stasiun,
          time: jam,
          type: isAktifToday ? 'aktivasi' : 'visit',
          issue: row['reporterKendala'] || ""
        });
      }

      if (dailyTrend[tglAktifStr]) dailyTrend[tglAktifStr].aktivasi++;
      if (dailyTrend[tglKendalaStr]) dailyTrend[tglKendalaStr].visit++;
    });


    // ====================================================================
    // 3. AMBIL DATA STASIUN DARI SHEET "Dashboard" (DIPROSES TERAKHIR AGAR BISA DIKURANGI)
    // ====================================================================
    const dashboardSheet = ss.getSheetByName(DASH_SHEET_NAME);
    let finalStationData = [];

    if (dashboardSheet) {
      function parseIndoNum(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        let str = String(val).trim().replace('%', '');
        if (str.includes('.') && !str.includes(',')) {
          str = str.replace(/\./g, '');
        } else if (str.includes(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        }
        return parseFloat(str) || 0;
      }

      // Ambil range A6:K16 (11 baris data stasiun, 11 kolom: NO, Stasiun, Total HP Reguler, Total HP Percepatan, Aktivasi HC Reguler, Aktivasi HC Percepatan, HC Aktif Reguler, HC Aktif Percepatan, Aktif Hari Ini, Total Aktivasi HC, Performa HC vs HP)
      const dashValues = dashboardSheet.getRange(6, 1, 11, 11).getValues();

      finalStationData = dashValues.map(r => {
        let stasiunRaw = r[1]; // Kolom B: Stasiun
        if (!stasiunRaw || String(stasiunRaw).trim() === '' || String(stasiunRaw).toLowerCase().includes('stasiun') || String(stasiunRaw).toLowerCase().includes('total')) {
          return null;
        }

        let stasiunKey = String(stasiunRaw || '').toLowerCase().trim();
        let hpReguler = parseIndoNum(r[2]);        // Kolom C: Total HP Reguler
        let hpPercepatan = parseIndoNum(r[3]);     // Kolom D: Total HP Percepatan
        let aktivasiReguler = parseIndoNum(r[4]);  // Kolom E: Aktivasi HC Reguler
        let aktivasiPercepatan = parseIndoNum(r[5]);// Kolom F: Aktivasi HC Percepatan
        let hcAktifReguler = parseIndoNum(r[6]);   // Kolom G: HC Aktif Reguler
        let hcAktifPercepatan = parseIndoNum(r[7]);// Kolom H: HC Aktif Percepatan
        let aktifHariIni = parseIndoNum(r[8]);     // Kolom I: Aktif Hari Ini
        let totalAktivasiHc = parseIndoNum(r[9]);  // Kolom J: Total Aktivasi HC

        let hpTerbangun = hpReguler + hpPercepatan;
        let hcAktif = hcAktifReguler + hcAktifPercepatan;
        let performaHc = hpTerbangun > 0 ? parseFloat(((totalAktivasiHc / hpTerbangun) * 100).toFixed(2)) : 0;

        let pengurangan = hcReductionPerStation[stasiunKey] || 0;
        let totalHcAkurat = Math.max(0, totalAktivasiHc - pengurangan);

        return {
          stasiun: stasiunRaw ? String(stasiunRaw) : "",
          hpReguler: hpReguler,
          hpPercepatan: hpPercepatan,
          hpTerbangun: hpTerbangun,
          aktivasiReguler: aktivasiReguler,
          aktivasiPercepatan: aktivasiPercepatan,
          hcAktifReguler: hcAktifReguler,
          hcAktifPercepatan: hcAktifPercepatan,
          aktifHariIni: aktifHariIni,
          totalAktivasiHc: totalAktivasiHc,
          hcAktif: hcAktif,
          performaHc: performaHc,
          // Fallback kompatibilitas key lama
          totalHpPo: hpTerbangun,
          totalHc: totalHcAkurat,
          targetHarian: 5
        };
      }).filter(Boolean);
    }


    // ====================================================================
    // 4. AMBIL DATA OKUPANSI ODP (DENGAN SHEET CACHE BARIS UNTUK BYPASS LIMIT SEL 50KB!)
    // ====================================================================
    let allOdpData = [];
    let odpSheet = ss.getSheetByName("List ODP") || ss.getSheetByName("list_odp") || ss.getSheetByName("List_ODP") || ss.getSheetByName("Cache_ODP") || ss.getSheetByName("List ODP");

    if (odpSheet) {
      const odpValues = odpSheet.getDataRange().getValues();
      if (odpValues.length > 1) {
        const odpHeaders = odpValues[0].map(h => String(h).trim().toLowerCase());

        // Auto-detect index kolom secara cerdas & tahan error
        const getIdx = (kws) => odpHeaders.findIndex(h => kws.some(k => String(h).includes(k.toLowerCase())));

        const idxStasiun = getIdx(['stasiun', 'station']);
        const idxLabel = getIdx(['label', 'nama odp', 'kode odp']);
        const idxKapasitas = getIdx(['kapasitas', 'capacity']);
        const idxTerpakai = getIdx(['terpakai', 'port terpakai', 'used']);
        const idxKodeOdp = getIdx(['kode odp', 'label']);
        const idxKodeOdc = getIdx(['kode odc', 'odc']);
        const idxLat = getIdx(['latitude', 'lat']);
        const idxLng = getIdx(['longitude', 'lng', 'long']);
        const idxTahap = getIdx(['tahap', 'pembangunan', 'status']);

        for (let r = 1; r < odpValues.length; r++) {
          const row = odpValues[r];
          // Mengambil nama ODP langsung dari Kolom G (index 6) sesuai instruksi user
          const labelVal = row.length > 6 ? String(row[6] || '').trim() : '';
          if (!labelVal) continue;

          allOdpData.push({
            stasiun: idxStasiun !== -1 ? String(row[idxStasiun] || '').trim() : '',
            label: labelVal,
            kapasitas: idxKapasitas !== -1 ? Number(row[idxKapasitas]) || 0 : 8,
            portTerpakai: idxTerpakai !== -1 ? Number(row[idxTerpakai]) || 0 : 0,
            kodeOdp: labelVal,
            kodeOdc: idxKodeOdc !== -1 ? String(row[idxKodeOdc] || '').trim() : 'ODC-01',
            latitude: idxLat !== -1 ? String(row[idxLat] || '').trim() : '',
            longitude: idxLng !== -1 ? String(row[idxLng] || '').trim() : '',
            tahapPembangunan: idxTahap !== -1 ? String(row[idxTahap] || '').trim() : 'Sudah'
          });
        }
        Logger.log("[ODP Direct Load] Berhasil memuat " + allOdpData.length + " ODP dari sheet List ODP lokal.");
      }
    }

    if (allOdpData.length < 10 && typeof STATION_DB_MAP !== 'undefined') {
      Logger.log("[ODP Cache Miss/Incomplete] Membuka 11 sheet stasiun untuk memperbarui cache ODP...");
      for (let stasiunName in STATION_DB_MAP) {
        try {
          const stasiunSsId = STATION_DB_MAP[stasiunName].id;
          const stasiunSs = SpreadsheetApp.openById(stasiunSsId);
          const odpSheet = stasiunSs.getSheetByName("ODP");

          if (odpSheet) {
            const odpValues = odpSheet.getDataRange().getValues();
            if (odpValues.length > 1) {
              const odpHeaders = odpValues[0].map(h => String(h).trim());

              for (let k = 1; k < odpValues.length; k++) {
                if (!odpValues[k][0]) continue;
                let rowData = { stasiun: stasiunName };
                for (let m = 0; m < odpHeaders.length; m++) {
                  let headerName = odpHeaders[m];
                  let cellVal = odpValues[k][m];

                  if (headerName === 'Label') rowData.label = cellVal;
                  else if (headerName === 'Kapasitas') rowData.kapasitas = cellVal;
                  else if (headerName === 'Port Terpakai') rowData.portTerpakai = cellVal;
                  else if (headerName === 'Kode ODP') rowData.kodeOdp = cellVal;
                  else if (headerName === 'Kode ODC') rowData.kodeOdc = cellVal;
                  else if (headerName === 'Latitude') rowData.latitude = cellVal;
                  else if (headerName === 'Longitude') rowData.longitude = cellVal;
                  else if (headerName === 'Tahap Pembangunan') rowData.tahapPembangunan = cellVal;
                }
                allOdpData.push(rowData);
              }
            }
          }
        } catch (err) {
          console.error("Gagal menarik data ODP untuk " + stasiunName + ": " + err.message);
        }
      }

      // Simpan ke Sheet Cache dalam bentuk baris
      if (allOdpData.length > 0) {
        try {
          if (!cacheSheet) {
            cacheSheet = ss.insertSheet("Cache_ODP");
            cacheSheet.hideSheet(); // Sembunyikan agar spreadsheet user tetap rapi!
          } else {
            cacheSheet.clear();
          }

          const cacheHeaders = ['stasiun', 'label', 'kapasitas', 'portTerpakai', 'kodeOdp', 'kodeOdc', 'latitude', 'longitude', 'tahapPembangunan'];
          const rowsToWrite = [cacheHeaders];

          allOdpData.forEach(odp => {
            rowsToWrite.push([
              odp.stasiun || '',
              odp.label || '',
              odp.kapasitas || '',
              odp.portTerpakai || '',
              odp.kodeOdp || '',
              odp.kodeOdc || '',
              odp.latitude || '',
              odp.longitude || '',
              odp.tahapPembangunan || ''
            ]);
          });

          cacheSheet.getRange(1, 1, rowsToWrite.length, cacheHeaders.length).setValues(rowsToWrite);
          Logger.log("[ODP Row Cache Saved] Sukses menyimpan " + allOdpData.length + " baris ODP ke Cache_ODP.");
        } catch (e) {
          Logger.log("[ODP Row Cache Save Failed] Gagal menyimpan ke cache: " + e.message);
        }
      }


    // ====================================================================
    // AMBIL MASTER TEKNISI DARI List_Teknisi & STATUS PLOTTING DARI Plotting_Tim
    // ====================================================================
    let listTeknisi = [];
    try {
      const masterSs = SpreadsheetApp.openById("13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M");

      // 1. Ambil semua data Master Teknisi
      let allTeknisi = [];
      const sheetMasterTeknisi = masterSs.getSheetByName("List_Teknisi");
      if (sheetMasterTeknisi) {
        const masterValues = sheetMasterTeknisi.getDataRange().getDisplayValues();
        for (let i = 1; i < masterValues.length; i++) {
          let row = masterValues[i];
          let tNama = String(row[2] || '').trim();
          if (tNama) {
            let tId = String(row[0] || '').trim(); // Kolom A (CHAT ID)
            if (tId.startsWith("'")) tId = tId.substring(1);
            allTeknisi.push({
              chatId: tId,
              username: String(row[1] || '').trim(), // Kolom B (USERNAME)
              nama: tNama, // Kolom C (NAMA)
              stasiunAsal: String(row[3] || '').trim(), // Kolom D (STASIUN as home station)
              jabatan: String(row[4] || '').trim(), // Kolom E (JABATAN)
              status: String(row[5] || 'Active').trim() // Kolom F (STATUS)
            });
          }
        }
      }

      // 2. Ambil Status Plotting Aktif
      let activePlottings = {};
      const sheetPlotting = masterSs.getSheetByName("Plotting_Tim");
      if (sheetPlotting) {
        const plottingValues = sheetPlotting.getDataRange().getDisplayValues();
        for (let i = 1; i < plottingValues.length; i++) {
          let row = plottingValues[i];
          let tId = String(row[1] || '').trim(); // Kolom B (Chat ID)
          if (tId.startsWith("'")) tId = tId.substring(1);
          let tNama = String(row[2] || '').trim(); // Kolom C (Nama)

          let key = tId || tNama;
          if (key) {
            activePlottings[key] = {
              stasiun: String(row[0] || '').trim(), // Kolom A (Stasiun Plotting)
              chatId: tId,
              nama: tNama,
              jabatan: String(row[3] || '').trim(), // Kolom D (Jabatan)
              username: String(row[4] || '').trim(), // Kolom E (Username)
              status: String(row[5] || 'Masuk').trim(), // Kolom F (Status)
              stasiunAsal: String(row[6] || '').trim() // Kolom G (Stasiun Asal)
            };
          }
        }
      }

      // 3. Gabungkan Data: Jika ada di Plotting_Tim, gunakan stasiun plottingnya. Jika tidak ada, stasiun = "" (unassigned)
      allTeknisi.forEach((tech, idx) => {
        let matchKey = tech.chatId || tech.nama;
        let activePlot = activePlottings[matchKey];
        if (activePlot) {
          listTeknisi.push({
            id: tech.chatId || "UID_" + idx,
            chatId: tech.chatId,
            username: activePlot.username || tech.username,
            nama: tech.nama,
            stasiun: activePlot.stasiun, // Ambil dari Plotting_Tim
            jabatan: activePlot.jabatan || tech.jabatan,
            status: activePlot.status || 'Masuk',
            stasiunAsal: activePlot.stasiunAsal || tech.stasiunAsal
          });
        } else {
          listTeknisi.push({
            id: tech.chatId || "UID_" + idx,
            chatId: tech.chatId,
            username: tech.username,
            nama: tech.nama,
            stasiun: "", // Kosong agar masuk botQueue
            jabatan: tech.jabatan,
            status: 'Masuk',
            stasiunAsal: tech.stasiunAsal
          });
        }
      });
    } catch (err) {
      console.error("Gagal memuat data petugas: " + err.message);
    }

    // --- PROSES TANGGAL REGISTRASI UNTUK DASHBOARD BACKGROUND ---
    const listRegistrasi = [];
    if (dashboardSheet) {
      try {
        const regValues = dashboardSheet.getRange("O6:R").getValues();
        regValues.forEach(row => {
          const idPelanggan = String(row[0] || '').trim();
          if (idPelanggan && idPelanggan.toLowerCase() !== "id pelanggan") {
             let dateStr = String(row[3] || '').trim();
             if (row[3] instanceof Date) {
               dateStr = Utilities.formatDate(row[3], "GMT+7", "dd/MM/yyyy HH:mm:ss");
             }
             listRegistrasi.push({
               idPelanggan: idPelanggan,
               namaPelanggan: String(row[1] || 'Tanpa Nama').trim(),
               stasiun: String(row[2] || 'Tanpa Stasiun').trim(),
               tanggal: dateStr
             });
          }
        });
      } catch (err) {
        Logger.log("Gagal membaca Registrasi dari Dashboard: " + err.message);
      }
    }

    // --- HITUNG TOTAL PELANGGAN AKTIF GLOBAL (AMBIL DARI DASHBOARD E16 SESUAI INSTRUKSI USER) ---
    let globalTotalAktif = 0;
    var listDetailPo = [];
    if (dashboardSheet) {
      try {
        globalTotalAktif = parseInt(dashboardSheet.getRange("E16").getValue()) || 0;
      } catch (e) {
        Logger.log("Gagal membaca E16 di getDashboardData: " + e.message);
      }

      // Ambil Range A21:N75
      try {
        var poRange = dashboardSheet.getRange(21, 1, 55, 14);
        var poValues = poRange.getValues();
        poValues.forEach(r => {
          var stasiun = String(r[1] || r[0] || '').trim();
          if (!stasiun || stasiun.toLowerCase() === 'stasiun' || stasiun.toLowerCase() === 'total' || stasiun.toLowerCase().includes('no')) return;

          // Kolom N (14) adalah index 13 (Performance)
          var perfRaw = r[13] || 0;
          var perf = 0;
          if (typeof perfRaw === 'number') {
            perf = perfRaw <= 1 ? parseFloat((perfRaw * 100).toFixed(2)) : parseFloat(perfRaw.toFixed(2));
          } else {
            perf = parseFloat(String(perfRaw).replace('%', '')) || 0;
          }

          // F = r[5] (Reguler), H = r[7] (Percepatan)
          const hpReg = parseIndoNum(r[5]);
          const hpPerc = parseIndoNum(r[7]);

          listDetailPo.push({
            stasiun: stasiun,
            noPoRelease: String(r[2] || '').trim(),
            jenisPo: String(r[3] || '').trim(),
            tahapPembangunan: String(r[4] || '').trim(),
            hpByPo: String(r[4] || '').trim(),
            kategori: String(r[4] || '').trim(),
            hpReguler: hpReg,
            hpPercepatan: hpPerc,
            hpTerbangun: hpReg + hpPerc,
            // I = r[8], J = r[9], K = r[10], L = r[11], M = r[12]
            totalAktivasiHc: parseIndoNum(r[8]),
            hcAktif: parseIndoNum(r[9]),
            suspend: parseIndoNum(r[10]),
            readyToDismantle: parseIndoNum(r[11]),
            dismantled: parseIndoNum(r[12]),
            performaHc: perf
          });
        });
      } catch (e) {
        Logger.log("Gagal membaca detail PO di getDashboardData: " + e.message);
      }
    }
    // Fallback jika E16 kosong atau bernilai 0
    if (!globalTotalAktif && finalStationData && finalStationData.length > 0) {
      finalStationData.forEach(st => {
        globalTotalAktif += (parseInt(st.totalHc) || 0);
      });
    }

    const result = {
      stationData: finalStationData,
      petugasData: Object.values(petugasMap),
      teknisiData: listTeknisi,
      recentHistory: history.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 30),
      dailyProgress: Object.values(dailyTrend),
      odpData: allOdpData,
      pelangganData: validRows.reverse(),
      visitData: visitLogData.reverse(),
      dataRegistrasi: listRegistrasi, // <-- PERBAIKAN UTAMA: Agar data registrasi tidak ter-overwrite nol oleh background sync!
      detailPoData: listDetailPo, // <-- DETAIL PO PER-STASIUN
      fastKpi: {
        totalAktif: globalTotalAktif, // <-- PERBAIKAN UTAMA: Agar total aktif tidak hilang oleh background sync!
        totalKendalaHariIni: totalKendalaHariIni
      }
    };

    return JSON.parse(JSON.stringify(result));


  } catch (e) {
    throw new Error("Gagal memproses data: " + e.message);
  }
}

// ==========================================
// FUNGSI KIRIM NOTIFIKASI TIKET BARU (DM)
// ==========================================
function kirimNotifDMKeTeknisi(payload) {
  try {
    if (!BOT_TOKEN || BOT_TOKEN === "MASUKKAN_TOKEN_BOT_DISINI") return;

    let petugasRaw = String(payload.petugas || "").trim();
    if (!petugasRaw || petugasRaw === "-") return;

    // Ekstrak username
    let username = "";
    let matchUser = petugasRaw.match(/@([a-zA-Z0-9_]+)/);
    if (matchUser) username = matchUser[1].toLowerCase();
    else username = petugasRaw.toLowerCase().replace(/^@/, "");

    if (!username) return;

    // Cari Chat ID di User (Master File)
    const ssMaster = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetTeknisi = ssMaster.getSheetByName("User");
    if (!sheetTeknisi) return;

    const dataTeknisi = sheetTeknisi.getDataRange().getValues();
    let chatId = null;
    let namaAsli = username;

    for (let i = 1; i < dataTeknisi.length; i++) {
      let dbUser = String(dataTeknisi[i][1]).toLowerCase().trim().replace(/^@/, "");
      if (dbUser === username) {
        chatId = String(dataTeknisi[i][0]).trim();
        namaAsli = String(dataTeknisi[i][2]).trim();
        break;
      }
    }

    // Jika Chat ID ketemu, tembak pesannya
    if (chatId) {
      let msg = `🚨 <b>TIKET BARU (ASSIGNED)</b> 🚨\n\n`;
      msg += `Halo <b>${namaAsli} (@${username})</b>,\nKamu baru saja ditugaskan untuk mengecek kendala/visit berikut:\n\n`;
      msg += `🆔 <b>ID Pelanggan:</b> ${payload.idPelanggan || "-"}\n`;
      msg += `👤 <b>Pelanggan:</b> ${payload.namaPelanggan || "-"}\n`;
      msg += `📍 <b>Stasiun:</b> ${payload.stasiun || "-"}\n`;
      if (payload.latitude && payload.longitude && payload.latitude !== "-" && payload.longitude !== "-") {
        msg += `🗺️ <b>Tikor:</b> <a href="https://www.google.com/maps/search/?api=1&query=${payload.latitude},${payload.longitude}">${payload.latitude}, ${payload.longitude}</a>\n`;
      } else {
        msg += `🗺️ <b>Tikor:</b> -\n`;
      }
      msg += `📞 <b>Kontak:</b> ${payload.nomorHp || "-"}\n`;
      msg += `⚠️ <b>Keluhan:</b> ${payload.keluhan || "-"}\n`;
      if (payload.catatan) {
        msg += `📝 <b>Catatan:</b> ${payload.catatan}\n`;
      }
      msg += `\n<i>Mohon segera berkoordinasi dan tindak lanjuti. Jangan lupa update status ke bot (Close) setelah selesai. Semangat! 🛠️</i>`;

      UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
        muteHttpExceptions: true
      });
      Logger.log("Berhasil kirim DM Assign Tiket ke " + username);
    }
  } catch (e) {
    Logger.log("Gagal DM Assign Tiket: " + e.message);
  }
}

// ==========================================
// FUNGSI UNTUK MENYIMPAN INPUT VISIT (HELPDESK)
// ==========================================
function insertVisitLog(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let visitSheet = ss.getSheetByName("Visit_Log");

    // Pastikan Sheet ada dan buat Header jika belum (disesuaikan dengan urutan asli Anda)
    if (!visitSheet) {
      visitSheet = ss.insertSheet("Visit_Log");
      visitSheet.appendRow([
        "Timestamp", "ID", "Nama Pelanggan", "Stasiun", "Keluhan",
        "Deskripsi / Catatan", "Status Visit", "ODP", "Port", "SN ONT",
        "Kontak", "Latitude", "Longitude", "Penyebab", "Perbaikan",
        "Used Materials", "Petugas"
      ]);
      visitSheet.getRange("A1:Q1").setFontWeight("bold").setBackground("#f3f4f6");
    }

    const now = new Date();
    const timestampStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");

    // Formatting khusus agar HP & Koordinat terbaca sebagai teks di Excel
    const latStr = payload.latitude ? "'" + String(payload.latitude) : "";
    const lngStr = payload.longitude ? "'" + String(payload.longitude) : "";
    const phoneStr = payload.nomorHp ? "'" + String(payload.nomorHp) : "";

    // PERBAIKAN: Susunan persis sesuai dengan header (17 Kolom)
    visitSheet.appendRow([
      timestampStr,          // 1.  Kolom A (Timestamp)
      payload.idPelanggan,   // 2.  Kolom B (ID)
      payload.namaPelanggan, // 3.  Kolom C (Nama Pelanggan)
      payload.stasiun,       // 4.  Kolom D (Stasiun)
      payload.keluhan,       // 5.  Kolom E (Keluhan)
      payload.catatan,       // 6.  Kolom F (Deskripsi / Catatan)
      "OPEN",                // 7.  Kolom G (Status Visit) -> Dibuat OPEN saat awal
      payload.odpAktual,     // 8.  Kolom H (ODP)
      payload.portOdp,       // 9.  Kolom I (Port)
      payload.snOnt,         // 10. Kolom J (SN ONT)
      phoneStr,              // 11. Kolom K (Kontak)
      latStr,                // 12. Kolom L (Latitude)
      lngStr,                // 13. Kolom M (Longitude)
      "",                    // 14. Kolom N (Penyebab) -> Kosong di awal
      "",                    // 15. Kolom O (Perbaikan) -> Kosong di awal
      "",                    // 16. Kolom P (Used Materials) -> Kosong di awal
      payload.petugas || ""  // 17. Kolom Q (Petugas) -> Username Petugas
    ]);

    // Panggil fungsi kirim DM ke teknisi yang ditugaskan
    kirimNotifDMKeTeknisi(payload);

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// FUNGSI UNTUK MENYELESAIKAN TIKET VISIT (DONE)
// ==========================================
function resolveVisitTicket(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const visitSheet = ss.getSheetByName("Visit_Log");
    if (!visitSheet) throw new Error("Sheet Visit_Log tidak ditemukan.");

    const data = visitSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rTsRaw = data[i][0];
      const rTsStr = rTsRaw instanceof Date ? Utilities.formatDate(rTsRaw, "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(rTsRaw);

      if (rTsStr === payload.timestamp && String(data[i][1]) === String(payload.idPelanggan)) {

        // Update Kolom 7 (G): Status
        visitSheet.getRange(i + 1, 7).setValue("DONE");

        // Update Kolom 14 (N): Tindakan Perbaikan
        if (payload.tindakan) visitSheet.getRange(i + 1, 14).setValue(payload.tindakan);

        // Update Kolom 15 (O): Material Digunakan
        if (payload.material) visitSheet.getRange(i + 1, 15).setValue(payload.material);

        // Update Kolom 19 (S): Waktu Close
        visitSheet.getRange(i + 1, 19).setValue(new Date());

        return { success: true };
      }
    }
    throw new Error("Tiket dengan ID tersebut tidak ditemukan.");
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// FUNGSI UNTUK MENGUPDATE DATA PELANGGAN (DIPERBARUI DENGAN STATUS AKTIVASI)
// ==========================================
function updatePelangganData(payload) {
  try {
    // 1. Cari kunci stasiun dari STATION_DB_MAP yang cocok dengan payload
    const stasiunKey = Object.keys(STATION_DB_MAP).find(
      key => key.toLowerCase() === String(payload.stasiun).toLowerCase().trim()
    );

    if (!stasiunKey) {
      throw new Error("Stasiun '" + payload.stasiun + "' tidak ditemukan di peta sistem.");
    }

    const stationInfo = STATION_DB_MAP[stasiunKey];

    // 2. Buka Spreadsheet khusus stasiun tersebut
    const stationSs = SpreadsheetApp.openById(stationInfo.id);

    // 3. Buka sheet datanya (menggunakan properti sheetName, atau fallback ke sheet pertama)
    let dbSheet = stationSs.getSheetByName(stationInfo.sheetName);
    if (!dbSheet) {
      dbSheet = stationSs.getSheets()[0];
    }

    if (!dbSheet) throw new Error("Sheet data untuk stasiun " + stasiunKey + " tidak ditemukan.");

    const data = dbSheet.getDataRange().getValues();
    const headers = data[0];

    // Fungsi pencari letak indeks kolom berdasarkan kata kunci header
    const getColIdx = (keywords) => headers.findIndex(h =>
      keywords.some(k => String(h).toLowerCase().includes(k))
    );

    const idxId = getColIdx(['id pelanggan', 'id_pelanggan']);
    const idxNama = getColIdx(['nama pelanggan', 'nama']);
    const idxAlamat = getColIdx(['alamat']);
    const idxStasiun = getColIdx(['stasiun']);
    const idxHp = getColIdx(['hp', 'nomor', 'kontak', 'whatsapp']);
    const idxOdp = getColIdx(['odp aktual', 'kode odp', 'odp']);
    const idxPort = getColIdx(['port']);
    const idxLat = getColIdx(['latitude', 'lat']);
    const idxLng = getColIdx(['longitude', 'lng', 'long']);
    let idxSales = getColIdx(['sales', 'nama sales', 'marketing']);
    if (idxSales === -1 && headers.length >= 25) idxSales = 24; // Kolom Y (SALES)

    // --- PERBAIKAN BARU: Tambahkan pencarian kolom Aktivasi, IKR, dan Catatan ---
    const idxAktivasi = getColIdx(['aktivasi']);
    const idxIkr = getColIdx(['ikr']);
    const idxCatatan = getColIdx(['catatan']);

    if (idxId === -1) throw new Error("Kolom ID Pelanggan tidak ditemukan di Database Stasiun " + stasiunKey);

    let targetRow = -1;
    // Cari baris yang ID Pelanggannya cocok
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() === String(payload.idPelanggan).trim()) {
        targetRow = i + 1; // +1 karena getRange menggunakan 1-based index
        break;
      }
    }

    if (targetRow === -1) throw new Error("Pelanggan dengan ID " + payload.idPelanggan + " tidak ditemukan di database stasiun " + stasiunKey);

    // 4. Update kolom jika ditemukan (tambahkan ' dan setNumberFormat @ agar format teks koordinat tidak berubah jadi ribuan)
    let cleanLat = payload.latitude ? String(payload.latitude).replace(/^'+/, '').trim().replace(',', '.') : "";
    let cleanLng = payload.longitude ? String(payload.longitude).replace(/^'+/, '').trim().replace(',', '.') : "";

    if (idxNama !== -1) dbSheet.getRange(targetRow, idxNama + 1).setValue(payload.namaPelanggan);
    if (idxAlamat !== -1) dbSheet.getRange(targetRow, idxAlamat + 1).setValue(payload.alamat);
    if (idxStasiun !== -1) dbSheet.getRange(targetRow, idxStasiun + 1).setValue(payload.stasiun);
    if (idxHp !== -1) dbSheet.getRange(targetRow, idxHp + 1).setValue(payload.nomorHp ? "'" + payload.nomorHp : "");
    if (idxOdp !== -1) dbSheet.getRange(targetRow, idxOdp + 1).setValue(payload.odpAktual);
    if (idxPort !== -1) dbSheet.getRange(targetRow, idxPort + 1).setValue(payload.portOdp);
    if (idxLat !== -1) {
      dbSheet.getRange(targetRow, idxLat + 1).setNumberFormat("@");
      dbSheet.getRange(targetRow, idxLat + 1).setValue(cleanLat || "");
      dbSheet.getRange(targetRow, idxLat + 1).setNumberFormat("@");
    }
    if (idxLng !== -1) {
      dbSheet.getRange(targetRow, idxLng + 1).setNumberFormat("@");
      dbSheet.getRange(targetRow, idxLng + 1).setValue(cleanLng || "");
      dbSheet.getRange(targetRow, idxLng + 1).setNumberFormat("@");
    }
    if (idxSales !== -1 && payload.namaSales !== undefined) dbSheet.getRange(targetRow, idxSales + 1).setValue(payload.namaSales);
    if (idxAktivasi !== -1 && payload.aktivasi !== undefined) dbSheet.getRange(targetRow, idxAktivasi + 1).setValue(payload.aktivasi);
    if (idxIkr !== -1 && payload.ikr !== undefined) dbSheet.getRange(targetRow, idxIkr + 1).setValue(payload.ikr);
    if (idxCatatan !== -1 && payload.catatan !== undefined) dbSheet.getRange(targetRow, idxCatatan + 1).setValue(payload.catatan);

    // --- SUPABASE DUAL WRITE TRIGGER ---
    try {
      let url = SUPABASE_URL + "/rest/v1/data_pelanggan?id_pelanggan=eq." + payload.idPelanggan;

      let supabasePayload = {
        nama_pelanggan: payload.namaPelanggan,
        alamat: payload.alamat,
        stasiun: payload.stasiun,
        nomor_hp: payload.nomorHp,
        odp: String(payload.odpAktual || "").trim().toUpperCase(),
        port_odp: payload.portOdp,
        latitude: cleanLat || null,
        longitude: cleanLng || null,
        status_aktivasi: payload.aktivasi || "Belum",
        status_ikr: payload.ikr || "Belum",
        catatan: payload.catatan || "",
        issue_kendala: payload.catatan || "",
        reporter_kendala: payload.catatan ? undefined : null,
        tanggal_kendala: payload.catatan ? undefined : null
      };
      if (payload.namaSales !== undefined) {
        supabasePayload.nama_sales = payload.namaSales;
      }

      // Mencegah error 'invalid input syntax for type numeric: ""' di Postgres 
      Object.keys(supabasePayload).forEach(key => {
        if (supabasePayload[key] === "") {
          supabasePayload[key] = null;
        }
      });

      let options = {
        method: "patch",
        contentType: "application/json",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        payload: JSON.stringify(supabasePayload),
        muteHttpExceptions: true
      };

      let response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 400) {
        Logger.log("Supabase Update Error: " + response.getContentText());
      }
    } catch (err) {
      Logger.log("Supabase Sync Failed in updatePelangganData: " + err.message);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ==========================================
// FUNGSI BARU: UPDATE STATUS MASSAL PELANGGAN
// ==========================================
function updateMassalPelanggan(updatesArray) {
  try {
    if (!updatesArray || updatesArray.length === 0) return { success: true };

    // 1. Kelompokkan update berdasarkan Stasiun
    const groupedUpdates = {};
    updatesArray.forEach(payload => {
      const stKey = String(payload.stasiun || '').toLowerCase().trim();
      if (!groupedUpdates[stKey]) groupedUpdates[stKey] = [];
      groupedUpdates[stKey].push(payload);
    });

    // 2. Proses tiap grup stasiun
    for (let stKey in groupedUpdates) {
      const stasiunNameForMap = Object.keys(STATION_DB_MAP).find(
        key => key.toLowerCase() === stKey
      );

      if (!stasiunNameForMap) continue;

      const stationInfo = STATION_DB_MAP[stasiunNameForMap];
      const stationSs = SpreadsheetApp.openById(stationInfo.id);

      let dbSheet = stationSs.getSheetByName(stationInfo.sheetName);
      if (!dbSheet) dbSheet = stationSs.getSheets()[0];
      if (!dbSheet) continue;

      const data = dbSheet.getDataRange().getValues();
      if (data.length < 2) continue;

      const headers = data[0];

      // Helper pencari index kolom
      const getColIdx = (keywords) => headers.findIndex(h =>
        keywords.some(k => String(h).toLowerCase().includes(k))
      );

      const idxId = getColIdx(['id pelanggan', 'id_pelanggan']);
      // PERBAIKAN: Fokus mencari kolom 'Aktivasi' dan 'IKR'
      const idxAktivasi = getColIdx(['aktivasi']);
      const idxIkr = getColIdx(['ikr']);

      // Jika kolom ID Pelanggan atau Kolom Aktivasi tidak ditemukan, lewati stasiun ini
      if (idxId === -1 || idxAktivasi === -1) continue;

      // 3. Eksekusi update untuk tiap pelanggan di stasiun ini
      const stUpdates = groupedUpdates[stKey];

      stUpdates.forEach(payload => {
        if (!payload.aktivasi) return; // Skip jika user tidak memilih status baru

        let targetRow = -1;
        // Cari baris ID pelanggan
        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idxId]).trim() === String(payload.idPelanggan).trim()) {
            targetRow = i + 1;
            break;
          }
        }

        // Jika ketemu, timpa sel di kolom AKTIVASI dan IKR
        if (targetRow !== -1) {
          dbSheet.getRange(targetRow, idxAktivasi + 1).setValue(payload.aktivasi);
          if (idxIkr !== -1 && payload.ikr !== undefined) {
            dbSheet.getRange(targetRow, idxIkr + 1).setValue(payload.ikr);
          }
        }

        // [SUPABASE] DUAL-WRITE UNTUK UPDATE MASSAL
        try {
          let url = SUPABASE_URL + "/rest/v1/data_pelanggan?id_pelanggan=eq." + payload.idPelanggan;

          let supabasePayload = { "status_aktivasi": payload.aktivasi };
          if (payload.ikr !== undefined) supabasePayload["status_ikr"] = payload.ikr;

          let options = {
            method: "patch",
            contentType: "application/json",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY
            },
            payload: JSON.stringify(supabasePayload),
            muteHttpExceptions: true
          };
          UrlFetchApp.fetch(url, options);
        } catch (e) {
          Logger.log("Gagal update massal Supabase: " + e.message);
        }
      });
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ==========================================
// FUNGSI UNTUK MENAMBAH PELANGGAN BARU
// ==========================================
function insertPelangganBaru(payload) {
  try {
    const stasiunKey = Object.keys(STATION_DB_MAP).find(
      key => key.toLowerCase() === String(payload.stasiun).toLowerCase().trim()
    );

    if (!stasiunKey) {
      throw new Error("Stasiun '" + payload.stasiun + "' tidak ditemukan. Pastikan penulisan ejaan Stasiun benar.");
    }

    const stationInfo = STATION_DB_MAP[stasiunKey];
    const stationSs = SpreadsheetApp.openById(stationInfo.id);

    let dbSheet = stationSs.getSheetByName(stationInfo.sheetName);
    if (!dbSheet) dbSheet = stationSs.getSheets()[0];
    if (!dbSheet) throw new Error("Sheet data stasiun tidak ditemukan.");

    const data = dbSheet.getDataRange().getValues();
    const headers = data[0];
    const getColIdx = (keywords) => headers.findIndex(h => keywords.some(k => String(h).toLowerCase().includes(k)));

    const idxId = getColIdx(['id pelanggan', 'id_pelanggan']);
    const idxNama = getColIdx(['nama pelanggan', 'nama']);
    const idxAlamat = getColIdx(['alamat']);
    const idxStasiun = getColIdx(['stasiun']);
    const idxHp = getColIdx(['hp', 'nomor', 'kontak', 'whatsapp']);
    const idxOdp = getColIdx(['odp aktual', 'kode odp', 'odp']);
    const idxPort = getColIdx(['port']);
    const idxLat = getColIdx(['latitude', 'lat']);
    const idxLng = getColIdx(['longitude', 'lng', 'long']);
    let idxSales = getColIdx(['sales', 'nama sales', 'marketing']);
    if (idxSales === -1 && headers.length >= 25) idxSales = 24; // Kolom Y (SALES)

    // PENDETEKSI KOLOM STATUS & CATATAN
    const idxAktivasi = getColIdx(['aktivasi', 'status']);
    const idxIkr = getColIdx(['ikr', 'status ikr']); // <-- TAMBAHAN BARU UNTUK IKR
    const idxCatatan = getColIdx(['catatan']);

    if (idxId === -1) throw new Error("Format kolom di Google Sheet berantakan (Kolom ID tidak ditemukan).");

    // Validasi Duplikat ID & Cari Baris Terakhir yang Valid
    let trueLastRow = 1;
    for (let i = 1; i < data.length; i++) {
      const currentId = String(data[i][idxId] || "").trim();

      if (currentId.toUpperCase() === String(payload.idPelanggan).trim().toUpperCase()) {
        throw new Error("Gagal! ID Pelanggan '" + payload.idPelanggan + "' sudah terdaftar di stasiun ini.");
      }

      if (currentId !== "") {
        trueLastRow = i + 1;
      }
    }

    // Susun array untuk baris baru
    let cleanLat = payload.latitude ? String(payload.latitude).replace(/^'+/, '').trim().replace(',', '.') : "";
    let cleanLng = payload.longitude ? String(payload.longitude).replace(/^'+/, '').trim().replace(',', '.') : "";

    const newRow = new Array(headers.length).fill('');

    if (idxId !== -1) newRow[idxId] = String(payload.idPelanggan).toUpperCase();
    if (idxNama !== -1) newRow[idxNama] = payload.namaPelanggan;
    if (idxAlamat !== -1) newRow[idxAlamat] = payload.alamat;
    if (idxStasiun !== -1) newRow[idxStasiun] = payload.stasiun;
    if (idxHp !== -1) newRow[idxHp] = payload.nomorHp ? "'" + payload.nomorHp : "";
    if (idxOdp !== -1) newRow[idxOdp] = payload.odpAktual || "";
    if (idxPort !== -1) newRow[idxPort] = payload.portOdp || "";
    if (idxLat !== -1) newRow[idxLat] = cleanLat || "";
    if (idxLng !== -1) newRow[idxLng] = cleanLng || "";
    if (idxSales !== -1) newRow[idxSales] = payload.namaSales || payload.sales || "Daftar Mandiri";

    // SET DEFAULT "BELUM" UNTUK AKTIVASI DAN IKR
    if (idxAktivasi !== -1) newRow[idxAktivasi] = payload.aktivasi || 'Belum';
    if (idxIkr !== -1) newRow[idxIkr] = 'Belum'; // <-- SET DEFAULT IKR MENJADI "Belum"

    if (idxCatatan !== -1) newRow[idxCatatan] = payload.catatan || '';

    // Tulis data tepat di bawah pelanggan terakhir (Format teks biasa @ agar koordinat tidak jadi angka ribuan)
    const targetRow = trueLastRow + 1;
    if (idxLat !== -1) dbSheet.getRange(targetRow, idxLat + 1).setNumberFormat("@");
    if (idxLng !== -1) dbSheet.getRange(targetRow, idxLng + 1).setNumberFormat("@");
    dbSheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
    if (idxLat !== -1) dbSheet.getRange(targetRow, idxLat + 1).setNumberFormat("@");
    if (idxLng !== -1) dbSheet.getRange(targetRow, idxLng + 1).setNumberFormat("@");

    // --- SUPABASE DUAL WRITE TRIGGER ---
    try {
      let url = SUPABASE_URL + "/rest/v1/data_pelanggan";

      let supabasePayload = {
        id_pelanggan: String(payload.idPelanggan).trim().toUpperCase(),
        nama_pelanggan: payload.namaPelanggan,
        alamat: payload.alamat,
        stasiun: payload.stasiun,
        nomor_hp: payload.nomorHp,
        odp: String(payload.odpAktual || "").trim().toUpperCase(),
        port_odp: payload.portOdp,
        latitude: cleanLat,
        longitude: cleanLng,
        nama_sales: payload.namaSales || payload.sales || "Daftar Mandiri",
        status_ikr: "Belum",
        status_aktivasi: payload.aktivasi || "Belum",
        catatan: payload.catatan || ""
      };

      // Hapus properti string kosong ("") agar tidak menyebabkan error validasi tipe data (misal column numeric di-insert "")
      Object.keys(supabasePayload).forEach(key => {
        if (supabasePayload[key] === "" || supabasePayload[key] === null || supabasePayload[key] === undefined) {
          delete supabasePayload[key];
        }
      });

      let options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(supabasePayload),
        muteHttpExceptions: true
      };

      let response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() >= 400) {
        Logger.log("Supabase Insert Error: " + response.getContentText());
      }
    } catch (err) {
      Logger.log("Supabase Sync Failed in insertPelangganBaru: " + err.message);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ==========================================
// FUNGSI UNTUK MENGHAPUS PELANGGAN (MASSAL)
// ==========================================
function deleteMassalPelanggan(payloadArray) {
  try {
    // 1. Kelompokkan data yang akan dihapus berdasarkan stasiunnya
    let groupedByStation = {};
    payloadArray.forEach(item => {
      let st = String(item.stasiun).toLowerCase().trim();
      if (!groupedByStation[st]) groupedByStation[st] = [];
      groupedByStation[st].push(String(item.idPelanggan).trim().toUpperCase());
    });

    // 2. Loop per stasiun untuk menghapus baris
    for (let st in groupedByStation) {
      const stasiunKey = Object.keys(STATION_DB_MAP).find(k => k.toLowerCase() === st);
      if (!stasiunKey) continue;

      const stationInfo = STATION_DB_MAP[stasiunKey];
      const stationSs = SpreadsheetApp.openById(stationInfo.id);
      let dbSheet = stationSs.getSheetByName(stationInfo.sheetName) || stationSs.getSheets()[0];

      let data = dbSheet.getDataRange().getValues();
      let headers = data[0];
      let idxId = headers.findIndex(h => String(h).toLowerCase().includes('id pelanggan') || String(h).toLowerCase().includes('id_pelanggan'));

      if (idxId === -1) continue;

      let idsToDelete = groupedByStation[st];
      let rowsToDelete = [];

      // Cari baris ke berapa saja yang harus dihapus
      for (let i = 1; i < data.length; i++) {
        let currentId = String(data[i][idxId]).trim().toUpperCase();
        if (idsToDelete.includes(currentId)) {
          rowsToDelete.push(i + 1); // +1 karena getRange 1-based index
        }
      }

      // SANGAT PENTING: Urutkan penghapusan dari baris PALING BAWAH ke atas (Descending)
      // Jika tidak diurutkan, penghapusan baris atas akan merusak indeks baris di bawahnya
      rowsToDelete.sort((a, b) => b - a);

      // Eksekusi hapus baris
      rowsToDelete.forEach(rowNum => {
        dbSheet.deleteRow(rowNum);
      });
    }

    // --- SUPABASE DUAL WRITE TRIGGER UNTUK DELETE ---
    try {
      payloadArray.forEach(item => {
        let url = SUPABASE_URL + "/rest/v1/data_pelanggan?id_pelanggan=eq." + String(item.idPelanggan).trim().toUpperCase();
        let options = {
          method: "delete",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          },
          muteHttpExceptions: true
        };
        UrlFetchApp.fetch(url, options);
      });
    } catch (e) {
      Logger.log("Gagal hapus massal Supabase: " + e.message);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ========================================================
// FUNGSI 1: MENGAMBIL SELURUH DATA UTUH (BACKGROUND SYNC)
// ========================================================
function getAllDatabase() {
  return getDashboardData(); // Memanggil fungsi utama Anda yang meload semua
}

// HELPER: Robust date parser for strings and dates in Google Sheets
function tryParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var str = String(val).trim();
  if (!str || str.toLowerCase().includes("belum") || str.toLowerCase().includes("tidak") || str.toLowerCase().includes("laporan") || str.toLowerCase().includes("id")) return null;

  // YYYY-MM-DD
  var partsYmd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (partsYmd) {
    return new Date(parseInt(partsYmd[1]), parseInt(partsYmd[2]) - 1, parseInt(partsYmd[3]));
  }

  // DD/MM/YYYY
  var partsDmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (partsDmy) {
    return new Date(parseInt(partsDmy[3]), parseInt(partsDmy[2]) - 1, parseInt(partsDmy[1]));
  }

  var d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// ========================================================
// FUNGSI FAST FETCH (TAMPILAN AWAL SEBELUM SINKRON SELESAI)
// ========================================================
function getFastDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const dashName = typeof DASH_SHEET_NAME !== 'undefined' ? DASH_SHEET_NAME : "Dashboard";
    const dbName = typeof DB_SHEET_NAME !== 'undefined' ? DB_SHEET_NAME : "Master_Database";

    let finalStationData = [];
    let globalTotalAktif = 0;
    const dashboardSheet = ss.getSheetByName(dashName);

    if (dashboardSheet) {
      // Ambil range A6:J16 (11 baris data stasiun, 10 kolom)
      const dashValues = dashboardSheet.getRange(6, 1, 11, 10).getValues();

      // MEMBACA LANGSUNG E16 DARI SHEET DASHBOARD SESUAI INSTRUKSI USER
      try {
        globalTotalAktif = parseInt(dashboardSheet.getRange("E16").getValue()) || 0;
      } catch (e) {
        Logger.log("Gagal membaca E16 di getFastDashboardData: " + e.message);
      }

      // Fallback kalkulasi jika E16 kosong or bernilai 0
      let tempSumAktif = 0;

      finalStationData = dashValues.map(r => {
        let stasiunRaw = r[1]; // Kolom B: Stasiun
        let hpTerbangun = r[2] || 0; // Kolom C: HP Terbangun
        let aktifHariIni = r[3] || 0; // Kolom D: Aktif Hari Ini
        let totalAktivasiHc = r[4] || 0; // Kolom E: Total Aktivasi HC
        let hcAktif = r[5] || 0; // Kolom F: HC Aktif
        let performaHcRaw = r[6] || 0; // Kolom G: Performa HC vs HP
        let tieringHcRaw = r[7] || 0; // Kolom H: Tiering HC
        let performaAktivasiRaw = r[8] || 0; // Kolom I: Performa Aktivasi vs HC Aktif
        let keteranganRaw = r[9] || ""; // Kolom J: Keterangan

        // Hitung performa or parse dari sheet
        let performaHc = 0;
        if (typeof performaHcRaw === 'number') {
          performaHc = performaHcRaw <= 1 ? parseFloat((performaHcRaw * 100).toFixed(2)) : parseFloat(performaHcRaw.toFixed(2));
        } else {
          performaHc = parseFloat(String(performaHcRaw).replace('%', '')) || 0;
        }

        let tieringHc = 0;
        if (typeof tieringHcRaw === 'number') {
          tieringHc = tieringHcRaw <= 1 ? parseFloat((tieringHcRaw * 100).toFixed(2)) : parseFloat(tieringHcRaw.toFixed(2));
        } else {
          tieringHc = parseFloat(String(tieringHcRaw).replace('%', '')) || 0;
        }

        let performaAktivasi = 0;
        if (typeof performaAktivasiRaw === 'number') {
          performaAktivasi = performaAktivasiRaw <= 1 ? parseFloat((performaAktivasiRaw * 100).toFixed(2)) : parseFloat(performaAktivasiRaw.toFixed(2));
        } else {
          performaAktivasi = parseFloat(String(performaAktivasiRaw).replace('%', '')) || 0;
        }

        tempSumAktif += parseInt(hcAktif) || 0;

        return {
          stasiun: stasiunRaw ? String(stasiunRaw) : "",
          hpTerbangun: hpTerbangun,
          aktifHariIni: aktifHariIni,
          totalAktivasiHc: totalAktivasiHc,
          hcAktif: hcAktif,
          performaHc: performaHc,
          tieringHc: tieringHc,
          performaAktivasi: performaAktivasi,
          keterangan: keteranganRaw ? String(keteranganRaw) : "",
          // Fallback kompatibilitas key lama agar tidak merusak diagram/rekap lainnya
          totalHpPo: hpTerbangun,
          totalHc: totalAktivasiHc,
          targetHarian: 5
        };
      }).filter(item => item.stasiun && item.stasiun.trim() !== "" && item.stasiun.toLowerCase().trim() !== "stasiun" && item.stasiun.toLowerCase().trim() !== "total");

      if (!globalTotalAktif) {
        globalTotalAktif = tempSumAktif;
      }
    }

    var fastPelanggan = [];
    var listRegistrasi = [];
    var listVisit = [];
    var listKendalaSheet = [];
    var totalKendalaHariIni = 0;

    // DETEKSI APAKAH USER SUDAH MEMASANG FORMULA INTEGRASI DASHBOARD DI SEBELAH KANAN
    var isNewDashboardSystemActive = false;
    if (dashboardSheet) {
      // Kita baca Baris 5, Kolom 14 (N) untuk mengecek header khusus kita
      var headersRow5 = dashboardSheet.getRange(5, 14, 1, 1).getValues()[0];
      var headerN = String(headersRow5[0] || '').trim().toLowerCase(); // Kolom N (ID Pelanggan Registrasi)

      // Jika Kolom N ada tulisan "id", tandanya user sudah memasang formula!
      if (headerN.includes("id")) {
        isNewDashboardSystemActive = true;
      }
    }

    if (isNewDashboardSystemActive) {
      Logger.log("[Fast Dashboard] Menggunakan sistem pre-aggregated formula dari sheet Dashboard! Menghemat 98% waktu load.");

      // 1. Baca Registrasi Hari Ini (Kolom N s/d Q) - Baris 6 s/d 100
      var regData = dashboardSheet.getRange(6, 14, 95, 4).getValues();
      regData.forEach(r => {
        var id = String(r[0] || '').trim();
        if (!id || id.toLowerCase().includes("belum") || id.toLowerCase().includes("tidak") || id.toLowerCase().includes("laporan") || id.toLowerCase().includes("registrasi") || id.toLowerCase().includes("antrean")) return;

        var stStasiun = String(r[2] || 'Tanpa Stasiun').trim();
        var stLower = stStasiun.toLowerCase();
        // Filter out numerical stasiun names, empty stasiun, total, or header values
        if (!stStasiun || !isNaN(Number(stStasiun)) || stLower === "stasiun" || stLower === "total" || stLower === "tanpa stasiun" || stLower === "id pelanggan" || stLower === "nama pelanggan" || stLower === "belum ada registrasi hari ini" || stLower === "") return;

        var tglRegVal = tryParseDate(r[3]);
        var tglRegStr = tglRegVal ? Utilities.formatDate(tglRegVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : String(r[3] || '').trim();

        listRegistrasi.push({
          idPelanggan: id,
          namaPelanggan: String(r[1] || 'Tanpa Nama').trim(),
          stasiun: stStasiun,
          tanggal: tglRegStr
        });
      });

      var pelangganMap = {};

      // 2. Baca Aktivasi Hari Ini (Kolom S s/d AC) - Baris 6 s/d 100
      var aktivasiData = dashboardSheet.getRange(6, 19, 95, 11).getValues();
      aktivasiData.forEach(r => {
        var id = String(r[0] || '').trim();
        if (!id || id.toLowerCase().includes("belum") || id.toLowerCase().includes("tidak") || id.toLowerCase().includes("aktivasi")) return;

        var key = id.toUpperCase();
        var tglAktivasiVal = tryParseDate(r[9]);
        var tglAktivasiStr = tglAktivasiVal ? Utilities.formatDate(tglAktivasiVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : String(r[9] || '').trim();
        var timestampAktivasiVal = tryParseDate(r[10]);
        var timestampAktivasiStr = timestampAktivasiVal ? Utilities.formatDate(timestampAktivasiVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : String(r[10] || '').trim();

        pelangganMap[key] = {
          idPelanggan: id,
          namaPelanggan: String(r[1] || 'Tanpa Nama').trim(),
          stasiun: String(r[2] || 'Tanpa Stasiun').trim(),
          alamat: String(r[3] || '').trim(),
          odpAktual: String(r[4] || '').trim(),
          kodeOdp: String(r[4] || '').trim(),
          port: String(r[5] || '').trim(),
          portOdp: String(r[5] || '').trim(),
          precon: String(r[6] || '').trim(),
          kabelPrecon: String(r[6] || '').trim(),
          snOnt: String(r[7] || '').trim(),
          aktivasi: "Sudah",
          petugasAktivasi: String(r[8] || '').trim(),
          tglAktivasi: tglAktivasiStr,
          timestampAktivasi: timestampAktivasiStr
        };
      });

      // 3. Baca IKR Hari Ini (Kolom AE s/d AN) - Baris 6 s/d 100
      var ikrData = dashboardSheet.getRange(6, 31, 95, 10).getValues();
      ikrData.forEach(r => {
        var id = String(r[1] || '').trim();
        if (!id || id.toLowerCase().includes("belum") || id.toLowerCase().includes("tidak") || id.toLowerCase().includes("id pelanggan")) return;

        var key = id.toUpperCase();
        var tglIkrVal = tryParseDate(r[5]);
        var tglIkrStr = tglIkrVal ? Utilities.formatDate(tglIkrVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : String(r[5] || '').trim();

        var existing = pelangganMap[key] || {
          idPelanggan: id,
          namaPelanggan: String(r[2] || 'Tanpa Nama').trim(),
          stasiun: String(r[0] || 'Tanpa Stasiun').trim(),
          alamat: String(r[4] || '').trim(),
          kodeOdp: String(r[6] || '').trim(),
          odpAktual: String(r[6] || '').trim(),
          port: String(r[7] || '').trim(),
          portOdp: String(r[7] || '').trim(),
          kabelPrecon: String(r[8] || '').trim(),
          precon: String(r[8] || '').trim()
        };

        existing.ikr = "Sudah";
        existing.petugasIkr = String(r[9] || '').trim();
        existing.tglIkr = tglIkrStr;

        pelangganMap[key] = existing;
      });

      // 4. Baca Kendala Hari Ini (Kolom BI s/d BN) - Baris 6 s/d 100
      var kendalaData = dashboardSheet.getRange(6, 61, 95, 6).getValues();
      kendalaData.forEach(r => {
        var id = String(r[1] || '').trim();
        if (!id || id.toLowerCase().includes("belum") || id.toLowerCase().includes("tidak") || id.toLowerCase().includes("id pelanggan")) return;

        var key = id.toUpperCase();
        var tglKendalaVal = tryParseDate(r[4]);
        var tglKendalaStr = tglKendalaVal ? Utilities.formatDate(tglKendalaVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : String(r[4] || '').trim();

        var issueStr = String(r[5] || '').trim();
        var reporterStr = String(r[3] || '').trim();
        var namaStr = String(r[2] || 'Tanpa Nama').trim();
        var stasiunStr = String(r[0] || 'Tanpa Stasiun').trim();

        var existing = pelangganMap[key] || {
          idPelanggan: id,
          namaPelanggan: namaStr,
          stasiun: stasiunStr
        };

        existing.issueKendala = issueStr;
        existing.reporterKendala = reporterStr;
        existing.tanggalKendala = tglKendalaStr;

        pelangganMap[key] = existing;

        listKendalaSheet.push({
          idPelanggan: id,
          namaPelanggan: namaStr,
          stasiun: stasiunStr,
          issueKendala: issueStr,
          reporterKendala: reporterStr,
          tanggalKendala: tglKendalaStr,
          aktivasi: 'Kendala'
        });
      });

      fastPelanggan = Object.values(pelangganMap);

      // 5. Baca Visit Log mentah langsung dari sheet Visit_Log (untuk Tab Visit / Gangguan)
      var sheetVisit = ss.getSheetByName("Visit_Log");
      if (sheetVisit) {
        var vData = sheetVisit.getDataRange().getValues();
        var vRichText = sheetVisit.getDataRange().getRichTextValues();
        var vFormulas = sheetVisit.getDataRange().getFormulas();
        for (var v = 1; v < vData.length; v++) {
          var vIdRaw = String(vData[v][1] || '').trim();
          if (!vIdRaw) continue;

          var tStamp = vData[v][0];
          var tStr = tStamp instanceof Date ? Utilities.formatDate(tStamp, "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(tStamp || '');
          var vStatus = String(vData[v][6] || 'OPEN').trim().toUpperCase();

          if (vStatus === 'OPEN') totalKendalaHariIni++;

          var fotoLink = '';
          var fotoFormula = vFormulas[v][17];
          if (fotoFormula && fotoFormula.toUpperCase().indexOf('HYPERLINK') > -1) {
            var match = fotoFormula.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
            if (match) fotoLink = match[1];
          }
          if (!fotoLink && vRichText[v][17]) fotoLink = vRichText[v][17].getLinkUrl();
          if (!fotoLink) fotoLink = String(vData[v][17] || '');

          listVisit.push({
            timestamp: tStr, idPelanggan: vIdRaw, namaPelanggan: String(vData[v][2] || ''),
            stasiun: String(vData[v][3] || ''), keluhan: String(vData[v][4] || ''),
            catatan: String(vData[v][5] || ''), status: vStatus, odpAktual: String(vData[v][7] || ''),
            portOdp: String(vData[v][8] || ''), snOnt: String(vData[v][9] || ''),
            nomorHp: String(vData[v][10] || ''), latitude: String(vData[v][11] || ''),
            longitude: String(vData[v][12] || ''),
            penyebab: String(vData[v][13] || ''), tindakan: String(vData[v][14] || ''),
            material: String(vData[v][15] || ''), petugas: String(vData[v][16] || ''),
            fotoPerbaikan: fotoLink,
            waktu_close: vData[v][18] instanceof Date ? Utilities.formatDate(vData[v][18], "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(vData[v][18] || '')
          });
        }
        listVisit.reverse();
      }
    } else {
      Logger.log("[Fast Dashboard Fallback] User belum memasang formula dashboard. Menggunakan scan data mentah...");

      // Fallback ke pembacaan data mentah
      // 1. Baca Visit Log mentah
      var sheetVisit = ss.getSheetByName("Visit_Log");
      if (sheetVisit) {
        var vData = sheetVisit.getDataRange().getValues();
        var vRichText = sheetVisit.getDataRange().getRichTextValues();
        var vFormulas = sheetVisit.getDataRange().getFormulas();
        for (var v = 1; v < vData.length; v++) {
          var vIdRaw = String(vData[v][1] || '').trim();
          if (!vIdRaw) continue;

          var tStamp = vData[v][0];
          var tStr = tStamp instanceof Date ? Utilities.formatDate(tStamp, "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(tStamp || '');
          var vStatus = String(vData[v][6] || 'OPEN').trim().toUpperCase();

          if (vStatus === 'OPEN') totalKendalaHariIni++;

          var fotoLink = '';
          var fotoFormula = vFormulas[v][17];
          if (fotoFormula && fotoFormula.toUpperCase().indexOf('HYPERLINK') > -1) {
            var match = fotoFormula.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
            if (match) fotoLink = match[1];
          }
          if (!fotoLink && vRichText[v][17]) fotoLink = vRichText[v][17].getLinkUrl();
          if (!fotoLink) fotoLink = String(vData[v][17] || '');

          listVisit.push({
            timestamp: tStr, idPelanggan: vIdRaw, namaPelanggan: String(vData[v][2] || ''),
            stasiun: String(vData[v][3] || ''), keluhan: String(vData[v][4] || ''),
            catatan: String(vData[v][5] || ''), status: vStatus, odpAktual: String(vData[v][7] || ''),
            portOdp: String(vData[v][8] || ''), snOnt: String(vData[v][9] || ''),
            nomorHp: String(vData[v][10] || ''), latitude: String(vData[v][11] || ''),
            longitude: String(vData[v][12] || ''),
            penyebab: String(vData[v][13] || ''), tindakan: String(vData[v][14] || ''),
            material: String(vData[v][15] || ''), petugas: String(vData[v][16] || ''),
            fotoPerbaikan: fotoLink,
            waktu_close: vData[v][18] instanceof Date ? Utilities.formatDate(vData[v][18], "GMT+7", "yyyy-MM-dd HH:mm:ss") : String(vData[v][18] || '')
          });
        }
        listVisit.reverse();
      }

      // 2. Baca Master Database mentah
      const sheet = ss.getSheetByName(dbName);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const getColIdx = (kws) => headers.findIndex(h => kws.some(k => String(h).toLowerCase().includes(k)));

        const idxId = getColIdx(['id pelanggan']);
        const idxNama = getColIdx(['nama']);
        const idxStasiun = getColIdx(['stasiun']);
        const idxAktivasi = getColIdx(['aktivasi', 'status']);
        const idxTglAkt = getColIdx(['tgl aktivasi']);
        const idxPetugasAkt = getColIdx(['petugas aktivasi']);
        const idxIkr = getColIdx(['ikr', 'status ikr']);
        const idxTglIkr = getColIdx(['tgl ikr', 'tanggal ikr']);
        const idxPetugasIkr = getColIdx(['petugas ikr']);
        const idxTglKendala = getColIdx(['tanggal kendala', 'tgl kendala']);
        const idxReporterKendala = getColIdx(['reporter kendala']);
        const idxIssueKendala = getColIdx(['issue kendala', 'issue', 'kendala']);
        const idxAlamat = getColIdx(['alamat']);
        const idxKodeOdp = getColIdx(['kode odp', 'odp aktual']);

        let idxReg = headers.findIndex(h => {
          const s = String(h).toLowerCase();
          return s.includes('registrasi') && (s.includes('tanggal') || s.includes('tgl'));
        });
        if (idxReg === -1) idxReg = 25;

        var batasWaktu = new Date(); batasWaktu.setDate(batasWaktu.getDate() - 14);

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var idRaw = String(row[idxId] || '').trim();
          if (!idRaw) continue;

          var statusAktivasi = String(row[idxAktivasi] || '').toLowerCase().trim();
          var isWaiting = (statusAktivasi === 'belum' || statusAktivasi === 'waiting' || statusAktivasi === '');

          var tglAktVal = tryParseDate(row[idxTglAkt]);
          var isRecentAkt = (tglAktVal && tglAktVal >= batasWaktu);

          var tglIkrVal = idxTglIkr !== -1 ? tryParseDate(row[idxTglIkr]) : null;
          var isRecentIkr = (tglIkrVal && tglIkrVal >= batasWaktu);

          var tglKendalaVal = idxTglKendala !== -1 ? tryParseDate(row[idxTglKendala]) : null;
          var isRecentKendala = (tglKendalaVal && tglKendalaVal >= batasWaktu);

          if (isWaiting || isRecentAkt || isRecentIkr || isRecentKendala) {
            var tglAktStr = tglAktVal ? Utilities.formatDate(tglAktVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : "";
            var tglIkrStr = tglIkrVal ? Utilities.formatDate(tglIkrVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : "";
            var tglKendalaStr = tglKendalaVal ? Utilities.formatDate(tglKendalaVal, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss") : "";

            fastPelanggan.push({
              idPelanggan: idRaw,
              namaPelanggan: String(row[idxNama] || 'Tanpa Nama').trim(),
              stasiun: String(row[idxStasiun] || 'Tanpa Stasiun').trim(),
              alamat: idxAlamat !== -1 ? String(row[idxAlamat] || '').trim() : "",
              aktivasi: row[idxAktivasi] || '',
              tglAktivasi: tglAktStr,
              petugasAktivasi: idxPetugasAkt !== -1 ? String(row[idxPetugasAkt] || '').trim() : "",
              ikr: idxIkr !== -1 ? String(row[idxIkr] || 'Belum').trim() : 'Belum',
              tglIkr: tglIkrStr,
              petugasIkr: idxPetugasIkr !== -1 ? String(row[idxPetugasIkr] || '').trim() : "",
              issueKendala: idxIssueKendala !== -1 ? String(row[idxIssueKendala] || '').trim() : "",
              reporterKendala: idxReporterKendala !== -1 ? String(row[idxReporterKendala] || '').trim() : "",
              tanggalKendala: tglKendalaStr,
              kodeOdp: idxKodeOdp !== -1 ? String(row[idxKodeOdp] || '').trim() : String(row[24] || '').trim(),
              odpAktual: idxKodeOdp !== -1 ? String(row[idxKodeOdp] || '').trim() : String(row[24] || '').trim()
            });
          }

          var rawDate = row[idxReg];
          if (rawDate) {
            var dateStr = rawDate instanceof Date ? Utilities.formatDate(rawDate, "GMT+7", "dd/MM/yyyy HH:mm:ss") : String(rawDate).trim();
            if (dateStr && dateStr !== "") {
              listRegistrasi.push({
                idPelanggan: idRaw,
                namaPelanggan: String(row[idxNama] || 'Tanpa Nama').trim(),
                stasiun: String(row[idxStasiun] || 'Tanpa Stasiun').trim(),
                tanggal: dateStr
              });
            }
          }
        }
      }
    }

    // 5. BACA DATA PETUGAS (LIST TEKNISI) - MENGGABUNGKAN List_Teknisi & Plotting_Tim
    var listTeknisi = [];
    try {
      var allTeknisi = [];
      var sheetMasterTeknisi = ss.getSheetByName("List_Teknisi");
      if (sheetMasterTeknisi) {
        var masterValues = sheetMasterTeknisi.getDataRange().getValues();
        for (var t = 1; t < masterValues.length; t++) {
          var tNama = String(masterValues[t][2] || '').trim();
          if (tNama) {
            var tId = String(masterValues[t][0] || '').trim();
            if (tId.startsWith("'")) tId = tId.substring(1);
            allTeknisi.push({
              chatId: tId,
              username: String(masterValues[t][1] || '').trim(),
              nama: tNama,
              stasiunAsal: String(masterValues[t][3] || '').trim(),
              jabatan: String(masterValues[t][4] || '').trim(),
              status: String(masterValues[t][5] || 'Active').trim()
            });
          }
        }
      }

      var activePlottings = {};
      var sheetPlotting = ss.getSheetByName("Plotting_Tim");
      if (sheetPlotting) {
        var plottingValues = sheetPlotting.getDataRange().getValues();
        for (var p = 1; p < plottingValues.length; p++) {
          var pId = String(plottingValues[p][1] || '').trim();
          if (pId.startsWith("'")) pId = pId.substring(1);
          var pNama = String(plottingValues[p][2] || '').trim();
          var key = pId || pNama;
          if (key) {
            activePlottings[key] = {
              stasiun: String(plottingValues[p][0] || '').trim(),
              chatId: pId,
              nama: pNama,
              jabatan: String(plottingValues[p][3] || '').trim(),
              username: String(plottingValues[p][4] || '').trim(),
              status: String(plottingValues[p][5] || 'Masuk').trim(),
              stasiunAsal: String(plottingValues[p][6] || '').trim()
            };
          }
        }
      }

      allTeknisi.forEach(function (tech, idx) {
        var matchKey = tech.chatId || tech.nama;
        var activePlot = activePlottings[matchKey];
        if (activePlot) {
          listTeknisi.push({
            id: tech.chatId || "UID_" + idx,
            chatId: tech.chatId,
            username: activePlot.username || tech.username,
            nama: tech.nama,
            stasiun: activePlot.stasiun,
            jabatan: activePlot.jabatan || tech.jabatan,
            status: activePlot.status || 'Masuk',
            stasiunAsal: activePlot.stasiunAsal || tech.stasiunAsal
          });
        } else {
          listTeknisi.push({
            id: tech.chatId || "UID_" + idx,
            chatId: tech.chatId,
            username: tech.username,
            nama: tech.nama,
            stasiun: "",
            jabatan: tech.jabatan,
            status: 'Masuk',
            stasiunAsal: tech.stasiunAsal
          });
        }
      });
    } catch (err) {
      console.error("Gagal getFastDashboardData petugas: " + err.message);
    }

    // 6. BACA DATA DETAIL PO PER-STASIUN (B21:K55)
    var listDetailPo = [];
    if (dashboardSheet) {
      try {
        var poRange = dashboardSheet.getRange(21, 2, 55, 11);
        var poValues = poRange.getValues();
        poValues.forEach(r => {
          var stasiun = String(r[0] || '').trim();
          if (!stasiun || stasiun.toLowerCase() === 'stasiun' || stasiun.toLowerCase() === 'total' || stasiun.toLowerCase().includes('no')) return;

          var perfRaw = r[10] || 0;
          var perf = 0;
          if (typeof perfRaw === 'number') {
            perf = perfRaw <= 1 ? parseFloat((perfRaw * 100).toFixed(2)) : parseFloat(perfRaw.toFixed(2));
          } else {
            perf = parseFloat(String(perfRaw).replace('%', '')) || 0;
          }

          listDetailPo.push({
            stasiun: stasiun,
            noPoRelease: String(r[1] || '').trim(),
            jenisPo: String(r[2] || '').trim(),
            hpByPo: String(r[3] || '').trim(),
            hpTerbangun: r[4] !== "" ? r[4] : 0,
            totalAktivasiHc: parseInt(r[5]) || 0,
            hcAktif: parseInt(r[6]) || 0,
            suspend: parseInt(r[7]) || 0,
            readyToDismantle: parseInt(r[8]) || 0,
            dismantled: parseInt(r[9]) || 0,
            performaHc: perf
          });
        });
      } catch (e) {
        Logger.log("Gagal membaca detail PO di getFastDashboardData: " + e.message);
      }
    }

    return {
      pelangganData: fastPelanggan,
      dataRegistrasi: listRegistrasi,
      visitData: listVisit,
      stationData: finalStationData,
      teknisiData: listTeknisi,
      detailPoData: listDetailPo, // <-- DETAIL PO PER-STASIUN
      dataKendalaSheet: listKendalaSheet,
      fastKpi: { totalAktif: globalTotalAktif, totalKendalaHariIni: totalKendalaHariIni }
    };
  } catch (e) {
    return { error: e.message };
  }
}


function updatePetugasData(formData) {
  var ss = SpreadsheetApp.openById("13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M");
  var sheetPlotting = ss.getSheetByName("Plotting_Tim");
  if (!sheetPlotting) {
    throw new Error("Sheet Plotting_Tim tidak ditemukan.");
  }

  var data = sheetPlotting.getDataRange().getValues();
  var targetRow = -1;
  var targetChatId = String(formData.id || '').trim();
  var targetNama = String(formData.nama || '').trim();

  // 1. Cari baris yang cocok di Plotting_Tim
  for (var i = 1; i < data.length; i++) {
    var rowChatId = String(data[i][1] || '').trim();
    var rowNama = String(data[i][2] || '').trim();
    if ((targetChatId && rowChatId === targetChatId) || (targetNama && rowNama === targetNama)) {
      targetRow = i + 1;
      break;
    }
  }

  // UPDATE DATA DI LIST_TEKNISI (MASTER SHEET) AGAR JABATAN & PROFIL SELALU UP-TO-DATE
  var sheetMaster = ss.getSheetByName("List_Teknisi");
  if (sheetMaster) {
    var masterData = sheetMaster.getDataRange().getValues();
    for (var m = 1; m < masterData.length; m++) {
      var mChatId = String(masterData[m][0] || '').trim();
      var mNama = String(masterData[m][2] || '').trim();
      if ((targetChatId && mChatId === targetChatId) || (targetNama && mNama === targetNama)) {
        sheetMaster.getRange(m + 1, 5).setValue(formData.jabatan); // Kolom E (Jabatan)
        break;
      }
    }
  }

  if (targetRow !== -1) {
    if (!formData.stasiun || String(formData.stasiun).trim() === "") {
      // JIKA STASIUN KOSONG (DI-DELETE/UNASSIGN), HAPUS BARIS DI PLOTTING_TIM
      sheetPlotting.deleteRow(targetRow);
      return "Sukses Hapus";
    } else {
      // UPDATE PENEMPATAN DI PLOTTING_TIM
      sheetPlotting.getRange(targetRow, 1).setValue(formData.stasiun); // Kolom A (Stasiun)
      sheetPlotting.getRange(targetRow, 4).setValue(formData.jabatan); // Kolom D (Jabatan)
      sheetPlotting.getRange(targetRow, 6).setValue(formData.status);  // Kolom F (Status)
      return "Sukses Update";
    }
  } else {
    // JIKA PENEMPATAN BARU DENGAN STASIUN KOSONG, TIDAK PERLU BUAT ROW DI PLOTTING_TIM
    if (!formData.stasiun || String(formData.stasiun).trim() === "") {
      return "Sukses (Unassigned)";
    }

    // 3. Tambah penempatan baru: cari profil lengkapnya dulu dari List_Teknisi
    var masterData = sheetMaster ? sheetMaster.getDataRange().getValues() : [];
    var techChatId = targetChatId;
    var techUsername = String(formData.username || '').trim();
    var techNama = targetNama;
    var techJabatan = String(formData.jabatan || 'Teknisi').trim();
    var techStasiunAsal = "";

    if (sheetMaster) {
      for (var j = 1; j < masterData.length; j++) {
        var mNama = String(masterData[j][2] || '').trim();
        var mChatId = String(masterData[j][0] || '').trim();
        if (mNama === targetNama || mChatId === targetChatId) {
          techChatId = mChatId;
          techUsername = String(masterData[j][1] || '').trim();
          techNama = mNama;
          techStasiunAsal = String(masterData[j][3] || '').trim(); // Kolom D (STASIUN)
          techJabatan = String(masterData[j][4] || 'Teknisi').trim();
          break;
        }
      }
    }

    // 4. Masukkan row baru di Plotting_Tim
    sheetPlotting.appendRow([
      formData.stasiun,
      techChatId,
      techNama,
      techJabatan,
      techUsername,
      formData.status || 'Masuk',
      techStasiunAsal
    ]);
    return "Sukses";
  }
}

// ==========================================
// FUNGSI UNTUK MENGHAPUS LOG GANGGUAN
// ==========================================
function deleteVisitLog(timestamp, idPelanggan) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Visit_Log");
    if (!sheet) throw new Error("Sheet 'Visit_Log' tidak ditemukan.");

    const data = sheet.getDataRange().getValues();

    // Cari baris yang cocok (Kolom A: Timestamp, Kolom B: ID)
    for (let i = 1; i < data.length; i++) {
      let rowTimestamp = data[i][0];
      // Pastikan format timestamp konsisten untuk perbandingan
      if (rowTimestamp instanceof Date) {
        rowTimestamp = Utilities.formatDate(rowTimestamp, "GMT+7", "yyyy-MM-dd HH:mm:ss");
      } else {
        rowTimestamp = String(rowTimestamp).trim();
      }

      const rowId = String(data[i][1]).trim();

      if (rowTimestamp === timestamp && rowId === idPelanggan) {
        sheet.deleteRow(i + 1); // +1 karena array mulai dari 0 dan sheet mulai dari 1
        return { success: true };
      }
    }

    throw new Error("Data tidak ditemukan di database.");
  } catch (e) {
    return { success: false, message: e.message };
  }
}


// ===============================================
// FUNGSI: UPLOAD ODP MASSAL DARI WEBSITE (EXCEL)
// ===============================================
function uploadMassalOdp(payload) {
  try {
    var odpList = payload;
    if (!odpList || odpList.length === 0) {
      return { success: false, message: "Data kosong." };
    }

    // 1. PUSH LANGSUNG KE SUPABASE
    // Tabel di Supabase bernama 'odp', kita gunakan upsert jika ada on_conflict=kode_odp
    var sbUrl = SUPABASE_URL + "/rest/v1/odp?on_conflict=kode_odp";
    var sbOptions = {
      "method": "post",
      "contentType": "application/json",
      "headers": {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Prefer": "resolution=merge-duplicates"
      },
      "payload": JSON.stringify(odpList),
      "muteHttpExceptions": true
    };

    var resSb = UrlFetchApp.fetch(sbUrl, sbOptions);
    var sbStatus = resSb.getResponseCode();
    if (sbStatus >= 400) {
      // Coba tanpa on_conflict jika error (fallback untuk insert murni)
      sbUrl = SUPABASE_URL + "/rest/v1/odp";
      sbOptions.headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      };
      resSb = UrlFetchApp.fetch(sbUrl, sbOptions);
      sbStatus = resSb.getResponseCode();
      if (sbStatus >= 400) {
        throw new Error("Supabase gagal: " + resSb.getContentText());
      }
    }

    // 2. BACKUP/DISTRIBUSI KE SHEET MASING-MASING STASIUN
    var groupedByStation = {};
    for (var i = 0; i < odpList.length; i++) {
      var st = odpList[i].stasiun.trim();
      if (!groupedByStation[st]) groupedByStation[st] = [];
      groupedByStation[st].push([
        odpList[i].label,
        odpList[i].latitude,
        odpList[i].longitude,
        odpList[i].port_terpakai,
        odpList[i].tahap_pembangunan,
        odpList[i].kapasitas,
        odpList[i].kode_odp,
        odpList[i].kode_odc,
        odpList[i].stasiun
      ]);
    }

    var sheetLogs = [];
    for (var stasiun in groupedByStation) {
      var targetId = null;
      // Pencarian stasiun yang lebih fleksibel (Tawang = Semarang Tawang)
      for (var key in STATION_DB_MAP) {
        if (stasiun.toLowerCase().indexOf(key.toLowerCase()) !== -1 || key.toLowerCase().indexOf(stasiun.toLowerCase()) !== -1) {
          targetId = STATION_DB_MAP[key].id;
          break;
        }
      }

      if (targetId) {
        try {
          var targetSs = SpreadsheetApp.openById(targetId);
          var targetSheet = targetSs.getSheetByName("ODP");
          if (targetSheet) {
            var rowsToAppend = groupedByStation[stasiun];

            // Cari baris terakhir yang benar-benar ada isinya (mengabaikan sel kosong berformat)
            var dataSheet = targetSheet.getDataRange().getValues();
            var realLastRow = 1;
            for (var r = dataSheet.length - 1; r >= 0; r--) {
              if (String(dataSheet[r][0]).trim() !== "" || String(dataSheet[r][1]).trim() !== "") {
                realLastRow = r + 1;
                break;
              }
            }

            targetSheet.getRange(realLastRow + 1, 1, rowsToAppend.length, 9).setValues(rowsToAppend);
            sheetLogs.push("Sheet " + stasiun + " sukses.");
          } else {
            throw new Error("Sheet ODP tidak ditemukan.");
          }
        } catch (e) {
          throw new Error("Gagal menulis ke Sheet Stasiun " + stasiun + ": " + e.message);
        }
      } else {
        throw new Error("Stasiun " + stasiun + " tidak ada di database STATION_DB_MAP.");
      }
    }

    return { success: true, message: "Berhasil upload " + odpList.length + " ODP" };
  } catch (err) {
    return { success: false, message: "Upload Gagal: " + err.message };
  }
}


// --- API ROUTER UNTUK FIREBASE ---
function doPost(e) {
  // Menangkap request dari frontend
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Format request tidak valid" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = params.action;
  const payload = params.payload;
  let result = {};

  try {
    // Routing ke fungsi yang sesuai
    switch (action) {
      case 'getFastDashboardData':
        result = getFastDashboardData();
        break;
      case 'getAllDatabase':
        result = getAllDatabase();
        break;
      case 'insertVisitLog':
        result = insertVisitLog(payload);
        break;
      case 'resolveVisitTicket':
        result = resolveVisitTicket(payload);
        break;
      case 'deleteVisitLog':
        result = deleteVisitLog(payload.timestamp, payload.idPelanggan);
        break;
      case 'updatePelangganData':
        result = updatePelangganData(payload);
        break;
      case 'updateMassalPelanggan':
        result = updateMassalPelanggan(payload);
        break;
      case 'insertPelangganBaru':
        result = insertPelangganBaru(payload);
        break;
      case 'deleteMassalPelanggan':
        result = deleteMassalPelanggan(payload);
        break;
      case 'updatePetugasData':
        result = { success: true, message: updatePetugasData(payload) };
        break;
      case 'uploadMassalOdp':
        result = uploadMassalOdp(payload);
        break;
      case 'expandMapsLink':
        result = expandMapsLink(payload.url);
        break;
      default:
        result = { error: "Action '" + action + "' tidak ditemukan." };
    }
  } catch (error) {
    result = { error: error.message };
  }

  // Mengembalikan hasil ke Firebase
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi untuk mengekspansi shortlink google maps
function expandMapsLink(shortUrl) {
  try {
    const res = UrlFetchApp.fetch(shortUrl, { followRedirects: false, muteHttpExceptions: true });
    // Biasanya HTTP 301 / 302, ambil header Location
    let location = res.getHeaders()['Location'] || res.getHeaders()['location'];

    // Jika tidak ada redirect, atau URL gagal, kembalikan URL aslinya
    return { success: true, url: location || shortUrl };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


function debugHitungRegistrasiManual() {
  // Peta database stasiun Anda
  const STATION_DB_MAP = {
    "Brumbung": { id: "1CyHkgCR-6kUO5gxKBQbNwT28PYHTPNDvaSt3F5TXGUs", sheetName: "Brumbung" },
    "Wadu": { id: "1UIQpbuGdPdIefIggktJpSsdmRIhhrjyXbNx60m2LMPA", sheetName: "Wadu" },
    "Kradenan": { id: "1GEc9s_oMpEbuwdahzNgCtb42PGFWWASVYwuuBAwk5UE", sheetName: "Kradenan" },
    "Sulur": { id: "1zoy7IvYtjfmjvBw2lUK7-i-1c73ikCRDlhGT5CftNvc", sheetName: "Sulur" },
    "Randublatung": { id: "1BPa2WBRzYwus336l3s4wfE333QaxvuIvg-jV_QaCsmQ", sheetName: "Randu" },
    "Alastua": { id: "1zJbx-ZJoRay4dj-E5dv2T9w1bpE8vi8GtyDuNlaV-Ws", sheetName: "Alastua" },
    "Krengseng": { id: "1qTqQpzK34kqBJE-NsvidUhM3x2cVRXhA5F4_G65X7mo", sheetName: "Krengseng" },
    "Weleri": { id: "1ZVlW0X0NB5RU9NoLSdFFbOisLhBjy_bxBJXwL-Xgqnk", sheetName: "Weleri" },
    "Kaliwungu": { id: "1r7SErCmhxBuWqo_DOpThJk8X8Ddgv0oR7A98Av18Zo8", sheetName: "Kaliwungu" },
    "Kalibodri": { id: "1P4bESYhtqkyM14tknKYMiBVVNg3Zgj8KS9yVSGiQIwo", sheetName: "Kalibodri" }
  };

  const targetDate1 = "06/05/2026";
  const targetDate2 = "2026-05-06";
  let totalKetemu = 0;

  Logger.log("=== MEMULAI DEBUGGING REGISTRASI (MENCARI TANGGAL 6 MEI 2026) ===");

  for (let stName in STATION_DB_MAP) {
    try {
      const stInfo = STATION_DB_MAP[stName];
      const ss = SpreadsheetApp.openById(stInfo.id);
      let sheet = ss.getSheetByName(stInfo.sheetName);
      if (!sheet) sheet = ss.getSheets()[0];

      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      const headers = data[0] || [];

      // Cari indeks kolom registrasi, fallback ke AL (37)
      let idxReg = headers.findIndex(h => String(h).toLowerCase().includes('registrasi'));
      if (idxReg === -1) idxReg = 37;

      let countStasiun = 0;
      let sampelRawPertama = null; // Menyimpan sampel untuk melihat tipe datanya

      for (let r = 1; r < data.length; r++) {
        let rawDate = data[r][idxReg];
        let idPelanggan = data[r][0]; // Asumsi ID di kolom A

        if (rawDate) {
          // Tangkap tipe data asli dari Sheets
          let tipeData = typeof rawDate;
          let isObjDate = rawDate instanceof Date;

          // Ubah menjadi string untuk diproses
          let dateStr = isObjDate ? Utilities.formatDate(rawDate, "GMT+7", "dd/MM/yyyy HH:mm:ss") : String(rawDate).trim();

          // Simpan sampel pertama yang tidak kosong untuk dianalisa
          if (!sampelRawPertama && r < 5) {
            sampelRawPertama = `Tipe: ${tipeData} | isDate: ${isObjDate} | Value: ${dateStr}`;
          }

          // Cek apakah tanggal mengandung target (06/05/2026 atau 2026-05-06)
          if (dateStr.includes(targetDate1) || dateStr.includes(targetDate2)) {
            countStasiun++;
            totalKetemu++;
            Logger.log(`[KETEMU] Stasiun: ${stName} | Baris: ${r + 1} | ID: ${idPelanggan} | Tgl: ${dateStr}`);
          }
        }
      }

      Logger.log(`-> Total ${stName}: ${countStasiun} | (Sampel Data: ${sampelRawPertama || 'Kosong'})`);

    } catch (err) {
      Logger.log(`[ERROR] Gagal membaca stasiun ${stName}: ${err.message}`);
    }
  }

  Logger.log("=========================================================");
  Logger.log(`TOTAL KESELURUHAN DITEMUKAN: ${totalKetemu}`);
}

function syncSinglePelangganToFirestore(idPelanggan, payload) {
  // DINONAKTIFKAN UNTUK MENGHEMAT KUOTA URLFETCH 20.000/HARI
  Logger.log("[Firestore Sync] DINONAKTIFKAN secara otomatis untuk menghemat kuota UrlFetchApp.");
  return;

  if (!idPelanggan) return;
  var projectId = "desnarum-opstracker";
  var apiKey = "AIzaSyCTNpuhwfd7qfMb4W6jBUOvKZZsOmgrzcI";

  var fields = {};
  var updateMask = "";

  for (var key in payload) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
      fields[key] = { "stringValue": String(payload[key]) };
      updateMask += "&updateMask.fieldPaths=" + encodeURIComponent(key);
    }
  }

  var url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/pelanggan/" + idPelanggan.toUpperCase() + "?key=" + apiKey;
  var options = {
    "method": "PATCH",
    "contentType": "application/json",
    "payload": JSON.stringify({ "fields": fields }),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url + updateMask, options);
    var resText = response.getContentText();
    if (resText.includes("error")) {
      Logger.log("[Firestore Sync Error] ID " + idPelanggan + ": " + resText);
    } else {
      Logger.log("[Firestore Sync Success] ID " + idPelanggan + " berhasil disinkron.");
    }
  } catch (e) {
    Logger.log("[Firestore Sync Fatal] ID " + idPelanggan + ": " + e.message);
  }
}

// FUNGSI SINKRONISASI MASSAL SHEET KE FIRESTORE (SUPER CEPAT DENGAN BATCH WRITE 400 DATA PER DETIK!)
function forceSyncToFirestore() {
  // GANTI NAMA STASIUN DI SINI UNTUK SINKRONISASI BERGANTIAN
  var nama_stasiun_target = "Wadu";
  syncIndividualStation(nama_stasiun_target);
}

// FUNGSI MASTER: SINKRONKAN SELURUH 10 DATABASE STASIUN SEKALIGUS KE FIRESTORE (TANPA DUPLIKAT & BEBAS TIMEOUT!)
function forceSyncAllStationsToFirestore() {
  Logger.log("=== MEMULAI SINKRONISASI MASTER SELURUH STASIUN ===");

  var listStasiun = Object.keys(STATION_DB_MAP);

  for (var s = 0; s < listStasiun.length; s++) {
    var stasiun = listStasiun[s];
    Logger.log("--> Menyinkronkan Stasiun (" + (s + 1) + "/" + listStasiun.length + "): " + stasiun);

    try {
      syncIndividualStation(stasiun);
    } catch (err) {
      Logger.log("[MASTER SYNC ERROR] Gagal menyinkronkan stasiun " + stasiun + ": " + err.message);
    }
  }

  Logger.log("=== SINKRONISASI MASTER SELESAI UNTUK SEMUA STASIUN! ===");
}

// FUNGSI KUSTOM SINKRONISASI INDIVIDU DENGAN BATCH COMMIT REST API (DAPAT MEMPROSES 2500+ DATA DALAM BEBERAPA DETIK)
function syncIndividualStation(nama_stasiun_target) {
  var id_sheet = STATION_DB_MAP[nama_stasiun_target].id;
  var nama_sheet = STATION_DB_MAP[nama_stasiun_target].sheetName;

  var ss = SpreadsheetApp.openById(id_sheet);
  var sheet = ss.getSheetByName(nama_sheet);
  if (!sheet) sheet = ss.getSheets()[0];
  if (!sheet) {
    Logger.log("-> Gagal: Sheet tidak ditemukan untuk stasiun " + nama_stasiun_target);
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Helper pencari indeks kolom secara dinamis
  var getColIdx = function (keywords) {
    return headers.findIndex(function (h) {
      return keywords.some(function (k) {
        return String(h).toLowerCase().includes(k);
      });
    });
  };

  var idxId = getColIdx(['id pelanggan', 'id_pelanggan']);
  var idxNama = getColIdx(['nama pelanggan', 'nama']);
  var idxAlamat = getColIdx(['alamat']);
  var idxHp = getColIdx(['hp', 'nomor', 'kontak', 'whatsapp']);
  var idxOdp = getColIdx(['odp aktual', 'kode odp', 'odp']);
  var idxPort = getColIdx(['port']);
  var idxLat = getColIdx(['latitude', 'lat']);
  var idxLng = getColIdx(['longitude', 'lng', 'long']);
  var idxIkr = getColIdx(['ikr', 'status ikr']);
  var idxAkt = getColIdx(['aktivasi', 'status akt']);
  var idxSn = getColIdx(['sn ont', 'sn_ont', 'sn']);
  var idxTglIkr = getColIdx(['tgl ikr', 'tanggal ikr']);
  var idxTglAkt = getColIdx(['tgl aktivasi', 'tanggal aktivasi', 'tgl_aktivasi']);

  var projectId = "desnarum-opstracker";
  var apiKey = "AIzaSyCTNpuhwfd7qfMb4W6jBUOvKZZsOmgrzcI";

  var batchWrites = [];
  var totalSynced = 0;

  for (var i = 1; i < data.length; i++) {
    var idPelanggan = idxId !== -1 ? String(data[i][idxId]).trim().toUpperCase() : "";
    if (!idPelanggan || idPelanggan === "ID") continue;

    var valTglIkr = idxTglIkr !== -1 ? data[i][idxTglIkr] : "";
    var valTglAkt = idxTglAkt !== -1 ? data[i][idxTglAkt] : "";

    var tglIkrISO = (valTglIkr instanceof Date) ? Utilities.formatDate(valTglIkr, "Asia/Jakarta", "yyyy-MM-dd'T'HH:mm:ss") : String(valTglIkr);
    var tglAktISO = (valTglAkt instanceof Date) ? Utilities.formatDate(valTglAkt, "Asia/Jakarta", "yyyy-MM-dd'T'HH:mm:ss") : String(valTglAkt);

    var payload = {
      "id_pelanggan": idPelanggan,
      "nama_pelanggan": idxNama !== -1 ? String(data[i][idxNama]).trim() : "",
      "alamat": idxAlamat !== -1 ? String(data[i][idxAlamat]).trim() : "",
      "stasiun": nama_stasiun_target,
      "nomor_hp": idxHp !== -1 ? String(data[i][idxHp]).trim() : "",
      "kode_odp": idxOdp !== -1 ? String(data[i][idxOdp]).trim() : "",
      "odp_aktual": idxOdp !== -1 ? String(data[i][idxOdp]).trim() : "",
      "port_odp": idxPort !== -1 ? String(data[i][idxPort]).trim() : "",
      "latitude": idxLat !== -1 ? String(data[i][idxLat]).trim() : "",
      "longitude": idxLng !== -1 ? String(data[i][idxLng]).trim() : "",
      "ikr": idxIkr !== -1 ? String(data[i][idxIkr]).trim() : "Belum",
      "aktivasi": idxAkt !== -1 ? String(data[i][idxAkt]).trim() : "Belum",
      "sn_ont": idxSn !== -1 ? String(data[i][idxSn]).trim() : "",
      "tgl_ikr": tglIkrISO,
      "tgl_aktivasi": tglAktISO
    };

    var fields = {};
    var fieldPaths = [];
    for (var key in payload) {
      if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
        fields[key] = { "stringValue": String(payload[key]) };
        fieldPaths.push(key);
      }
    }

    // Susun struktur operasi PATCH batch
    var writeOp = {
      "update": {
        "name": "projects/" + projectId + "/databases/(default)/documents/pelanggan/" + idPelanggan,
        "fields": fields
      },
      "updateMask": {
        "fieldPaths": fieldPaths
      }
    };

    batchWrites.push(writeOp);

    // Kirim batch jika sudah mencapai batas optimal 350 baris data per request
    if (batchWrites.length >= 350) {
      sendBatchToFirestore(projectId, apiKey, batchWrites);
      totalSynced += batchWrites.length;
      batchWrites = []; // Reset batch
      Utilities.sleep(200); // Delay kecil untuk kestabilan limit API
    }
  }

  // Kirim sisa data yang belum genap 350
  if (batchWrites.length > 0) {
    sendBatchToFirestore(projectId, apiKey, batchWrites);
    totalSynced += batchWrites.length;
  }

  Logger.log("-> Stasiun " + nama_stasiun_target + " Selesai! Sukses menyinkronkan " + totalSynced + " data pelanggan.");
}

// ASISTEN REST API BATCH COMMIT (MEMBUNGKUS OPERASI DAN MENGIRIM SATU KALI POST REQUEST)
function sendBatchToFirestore(projectId, apiKey, batchWrites) {
  // DINONAKTIFKAN UNTUK MENGHEMAT KUOTA URLFETCH 20.000/HARI
  Logger.log("[Firestore Batch Sync] DINONAKTIFKAN secara otomatis untuk menghemat kuota UrlFetchApp.");
  return;

  var url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents:commit?key=" + apiKey;
  var payload = {
    "writes": batchWrites
  };
  var options = {
    "method": "POST",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(url, options);
  var resText = response.getContentText();
  if (resText.includes("error")) {
    Logger.log("[Firestore Batch Commit Error]: " + resText);
  }
}

// =================================================================================
// [+] ASISTEN FAIL-SAFE: MENGAMBIL SELURUH DOKUMEN DARI KOLEKSI PELANGGAN FIRESTORE REST API
// =================================================================================
function getPelangganFromFirestore() {
  var projectId = "desnarum-opstracker";
  var apiKey = "AIzaSyCTNpuhwfd7qfMb4W6jBUOvKZZsOmgrzcI";

  var allDocs = [];
  var pageToken = "";
  var limit = 300; // Menggunakan limit optimal 300 agar sesuai dengan kebijakan REST API Google

  do {
    var url = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/pelanggan?pageSize=" + limit + "&key=" + apiKey;

    if (pageToken) {
      url += "&pageToken=" + pageToken;
    }

    var response = UrlFetchApp.fetch(url, { "muteHttpExceptions": true });
    if (response.getResponseCode() !== 200) {
      throw new Error("Firestore REST fetch failed with code " + response.getResponseCode() + ": " + response.getContentText());
    }

    var json = JSON.parse(response.getContentText());
    if (json.documents && json.documents.length > 0) {
      allDocs = allDocs.concat(json.documents);
    }
    pageToken = json.nextPageToken || "";
  } while (pageToken);

  return allDocs;
}

// [+] ASISTEN FAIL-SAFE: MEMETAKAN STRUKTUR DOKUMEN FIRESTORE KE CAMELCASE YANG DIHARAPKAN REACT DENGAN FALLBACK
function parseFirestoreDocument(doc) {
  var fields = doc.fields || {};
  var obj = {};

  obj.idPelanggan = fields.id_pelanggan ? fields.id_pelanggan.stringValue : "";
  obj.namaPelanggan = fields.nama_pelanggan ? fields.nama_pelanggan.stringValue : "";
  obj.nomorHp = fields.nomor_hp ? fields.nomor_hp.stringValue : "";
  obj.alamat = fields.alamat ? fields.alamat.stringValue : "";
  obj.stasiun = fields.stasiun ? fields.stasiun.stringValue : "";
  obj.odpAktual = fields.odp_aktual ? fields.odp_aktual.stringValue : "";
  obj.portOdp = fields.port_odp ? fields.port_odp.stringValue : "";
  obj.latitude = fields.latitude ? fields.latitude.stringValue : "";
  obj.longitude = fields.longitude ? fields.longitude.stringValue : "";
  obj.ikr = fields.ikr ? fields.ikr.stringValue : "Belum";
  obj.aktivasi = fields.aktivasi ? fields.aktivasi.stringValue : "Belum";
  obj.tanggalRegistrasi = fields.tanggal_registrasi ? fields.tanggal_registrasi.stringValue : "";
  obj.catatan = fields.catatan ? fields.catatan.stringValue : "";

  // Field tambahan untuk tracking progress harian & riwayat kpi
  obj.tglAktivasi = fields.tgl_aktivasi ? fields.tgl_aktivasi.stringValue : "";
  obj.tanggalKendala = fields.tanggal_kendala ? fields.tanggal_kendala.stringValue : "";
  obj.petugasAktivasi = fields.petugas_aktivasi ? fields.petugas_aktivasi.stringValue : "";
  obj.petugasIkr = fields.petugas_ikr ? fields.petugas_ikr.stringValue : "";
  obj.reporterKendala = fields.reporter_kendala ? fields.reporter_kendala.stringValue : "";

  return obj;
}

// =================================================================================
// [+] FUNGSI BARU: SINKRONKAN SELURUH DATA ODP DARI 11 STASIUN KE FIRESTORE & SHEET CACHE
// =================================================================================
function syncOdpToFirestore() {
  Logger.log("=== MEMULAI SINKRONISASI ODP KE FIRESTORE & CACHE ===");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let allOdpData = [];

  for (let stasiunName in STATION_DB_MAP) {
    try {
      const stasiunSsId = STATION_DB_MAP[stasiunName].id;
      const stasiunSs = SpreadsheetApp.openById(stasiunSsId);
      const odpSheet = stasiunSs.getSheetByName("ODP");

      if (odpSheet) {
        const odpValues = odpSheet.getDataRange().getValues();
        if (odpValues.length > 1) {
          const odpHeaders = odpValues[0].map(h => String(h).trim());
          for (let k = 1; k < odpValues.length; k++) {
            if (!odpValues[k][0]) continue;
            let rowData = { stasiun: stasiunName };
            for (let m = 0; m < odpHeaders.length; m++) {
              let headerName = odpHeaders[m];
              let cellVal = odpValues[k][m];

              if (headerName === 'Label') rowData.label = cellVal;
              else if (headerName === 'Kapasitas') rowData.kapasitas = cellVal;
              else if (headerName === 'Port Terpakai') rowData.portTerpakai = cellVal;
              else if (headerName === 'Kode ODP') rowData.kodeOdp = cellVal;
              else if (headerName === 'Kode ODC') rowData.kodeOdc = cellVal;
              else if (headerName === 'Latitude') rowData.latitude = cellVal;
              else if (headerName === 'Longitude') rowData.longitude = cellVal;
              else if (headerName === 'Tahap Pembangunan') rowData.tahapPembangunan = cellVal;
            }
            allOdpData.push(rowData);
          }
        }
      }
    } catch (err) {
      Logger.log("Gagal menarik ODP " + stasiunName + ": " + err.message);
    }
  }

  if (allOdpData.length > 0) {
    // 1. Simpan ke Cache_ODP Sheet Lokal
    try {
      let cacheSheet = ss.getSheetByName("Cache_ODP");
      if (!cacheSheet) {
        cacheSheet = ss.insertSheet("Cache_ODP");
        cacheSheet.hideSheet();
      } else {
        cacheSheet.clear();
      }

      const cacheHeaders = ['stasiun', 'label', 'kapasitas', 'portTerpakai', 'kodeOdp', 'kodeOdc', 'latitude', 'longitude', 'tahapPembangunan'];
      const rowsToWrite = [cacheHeaders];
      allOdpData.forEach(odp => {
        rowsToWrite.push([
          odp.stasiun || '',
          odp.label || '',
          odp.kapasitas || '',
          odp.portTerpakai || '',
          odp.kodeOdp || '',
          odp.kodeOdc || '',
          odp.latitude || '',
          odp.longitude || '',
          odp.tahapPembangunan || ''
        ]);
      });
      cacheSheet.getRange(1, 1, rowsToWrite.length, cacheHeaders.length).setValues(rowsToWrite);
      Logger.log("[Local Cache] Sukses menyimpan " + allOdpData.length + " ODP.");
    } catch (err) {
      Logger.log("Gagal simpan ODP ke local sheet: " + err.message);
    }

    // 2. Kirim ke Firestore Koleksi 'odp'
    try {
      var projectId = "desnarum-opstracker";
      var apiKey = "AIzaSyCTNpuhwfd7qfMb4W6jBUOvKZZsOmgrzcI";
      var batchWrites = [];
      var totalSynced = 0;

      for (var i = 0; i < allOdpData.length; i++) {
        var odp = allOdpData[i];
        var odpId = String(odp.kodeOdp || odp.label || '').trim().replace(/\//g, '-').toUpperCase();
        if (!odpId) continue;

        var payload = {
          "stasiun": odp.stasiun || "",
          "label": odp.label || "",
          "kapasitas": String(odp.kapasitas || ""),
          "port_terpakai": String(odp.portTerpakai || ""),
          "kode_odp": odp.kodeOdp || "",
          "kode_odc": odp.kodeOdc || "",
          "latitude": String(odp.latitude || ""),
          "longitude": String(odp.longitude || ""),
          "tahap_pembangunan": odp.tahapPembangunan || ""
        };

        var fields = {};
        var fieldPaths = [];
        for (var key in payload) {
          fields[key] = { "stringValue": String(payload[key]) };
          fieldPaths.push(key);
        }

        var writeOp = {
          "update": {
            "name": "projects/" + projectId + "/databases/(default)/documents/odp/" + odpId,
            "fields": fields
          },
          "updateMask": {
            "fieldPaths": fieldPaths
          }
        };

        batchWrites.push(writeOp);

        if (batchWrites.length >= 350) {
          sendBatchToFirestore(projectId, apiKey, batchWrites);
          totalSynced += batchWrites.length;
          batchWrites = [];
          Utilities.sleep(200);
        }
      }

      if (batchWrites.length > 0) {
        sendBatchToFirestore(projectId, apiKey, batchWrites);
        totalSynced += batchWrites.length;
      }

      Logger.log("[Firestore Sync] Sukses menyinkronkan " + totalSynced + " ODP ke Firestore.");
    } catch (err) {
      Logger.log("Gagal sync ODP ke Firestore: " + err.message);
    }
  }
  Logger.log("=== SINKRONISASI ODP SELESAI ===");
  return { success: true, count: allOdpData.length };
}