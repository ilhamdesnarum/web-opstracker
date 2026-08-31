 /*************************************************
 * TELEGRAM BOT - WEB APP MENU (CLEAN VERSION)
 * Mode: Inline Keyboard + Web App + Rate Limiter Anti-Spam
 *************************************************/

// ================= CONFIG =================
const BOT_TOKEN = "8789065775:AAEsOr7g1myDHyHPPuhuujNR07euM3tNmEs";
const BASE_URL = "https://api.telegram.org/bot" + BOT_TOKEN;
const MASTER_VISIT_ID = "13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M";
const STOK_GUDANG_ID = "1dsQgRJUX-ZLFAHE4t4UxZdxQCpgG4eICkF7AqsV08G0";
const MASTER_FILE_ID = "13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M";

// ================= SUPABASE SCM TRACKER CONFIG =================
var SCM_SUPABASE_URL = "https://tngdhjggjbnaoxkfxqej.supabase.co";
var SCM_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuZ2RoamdnamJuYW94a2Z4cWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MTIwNDgsImV4cCI6MjEwMDM4ODA0OH0.c751j1b-kMaV9caikq8Pl1h9jUHPYW-jXKPINdcN6JM";
var SCM_SUPABASE_SCHEMA = "scm_tracker";

function callScmSupabase(endpoint, method, payload, extraHeaders) {
  method = method || "GET";
  var headers = {
    "apikey": SCM_SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SCM_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Accept-Profile": SCM_SUPABASE_SCHEMA,
    "Content-Profile": SCM_SUPABASE_SCHEMA,
    "Prefer": "return=representation"
  };
  if (extraHeaders) {
    for (var k in extraHeaders) headers[k] = extraHeaders[k];
  }
  var options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true
  };
  if (payload && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.payload = JSON.stringify(payload);
  }
  var response = UrlFetchApp.fetch(SCM_SUPABASE_URL + "/rest/v1/" + endpoint, options);
  var text = response.getContentText();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

// [+] ID Folder "Database Pelanggan"
const PARENT_FOLDER_ID = "1wYSNN7k5zkim8fIP0jUvagoRpKt7FTij"; 

// ================= SUPABASE OPS TRACKER CONFIG =================
const SUPABASE_URL = "https://jtmferyskpbnacluyafs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bWZlcnlza3BibmFjbHV5YWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTkxNjksImV4cCI6MjEwMjY5NTE2OX0.QCtYEUipE1wBBQ7hy1wbNu2L7T7P5v4pKqkVEu221Jw";

function upsertToSupabase(payloadArray) {
  if (!payloadArray || payloadArray.length === 0) return;
  var nowIso = new Date().toISOString();
  payloadArray.forEach(function(item) {
    if (!item.created_at) item.created_at = nowIso;
    item.updated_at = nowIso;
  });

  var url = SUPABASE_URL + "/rest/v1/data_pelanggan";
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(payloadArray),
    muteHttpExceptions: true
  };
  try {
    var res = UrlFetchApp.fetch(url, options);
    Logger.log("Response Supabase data_pelanggan: " + res.getContentText());
  } catch (error) {
    Logger.log("Error Supabase data_pelanggan: " + error.message);
  }
}

function syncVisitLogToSupabase(action, payload) {
  if (!payload) return;
  try {
    var d = new Date();
    var localTimestamp = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

    if (action === "insert" || action === "add") {
      var body = {
        timestamp: payload.timestamp || localTimestamp,
        id_pelanggan: String(payload.id_pelanggan || payload.idPelanggan || ""),
        nama_pelanggan: String(payload.nama_pelanggan || payload.namaPelanggan || ""),
        stasiun: String(payload.stasiun || ""),
        keluhan: String(payload.keluhan || ""),
        catatan: String(payload.catatan || payload.deskripsi || ""),
        status_visit: String(payload.status_visit || payload.status || "OPEN").toUpperCase(),
        odp: String(payload.odp || payload.odpAktual || payload.kode_odp || ""),
        port: String(payload.port || payload.port_odp || payload.portOdp || ""),
        sn_ont: String(payload.sn_ont || payload.snOnt || ""),
        nomor_hp: String(payload.nomor_hp || payload.kontak || payload.nomorHp || ""),
        latitude: String(payload.latitude || "").replace(/['"]/g, ""),
        longitude: String(payload.longitude || "").replace(/['"]/g, ""),
        penyebab: String(payload.penyebab || ""),
        perbaikan: String(payload.perbaikan || payload.tindakan || ""),
        used_materials: String(payload.used_materials || payload.material || ""),
        petugas: String(payload.petugas || ""),
        evidence: String(payload.evidence || "")
      };

      var url = SUPABASE_URL + "/rest/v1/log_visit";
      var options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Prefer": "return=representation"
        },
        payload: JSON.stringify([body]),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(url, options);
      Logger.log("[Supabase log_visit INSERT]: " + res.getContentText());

    } else if (action === "close" || action === "resolve" || action === "update") {
      var idPel = String(payload.id_pelanggan || payload.idPelanggan || "").trim();
      if (!idPel) return;

      var updateBody = {
        status_visit: String(payload.status_visit || payload.status || "CLOSED").toUpperCase(),
        penyebab: String(payload.penyebab || ""),
        perbaikan: String(payload.perbaikan || payload.tindakan || ""),
        used_materials: String(payload.used_materials || payload.material || ""),
        evidence: String(payload.evidence || payload.url_evidence || ""),
        waktu_close: payload.waktu_close || localTimestamp
      };
      if (payload.petugas) updateBody.petugas = String(payload.petugas);

      var url = SUPABASE_URL + "/rest/v1/log_visit?id_pelanggan=eq." + encodeURIComponent(idPel) + "&status_visit=eq.OPEN";
      var options = {
        method: "patch",
        contentType: "application/json",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Prefer": "return=representation"
        },
        payload: JSON.stringify(updateBody),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(url, options);
      Logger.log("[Supabase log_visit UPDATE]: " + res.getContentText());
    }
  } catch (e) {
    Logger.log("[Supabase log_visit Error]: " + e.message);
  }
}

// [+] ID FOLDER KHUSUS DATA MATERIAL
const FOLDER_SURAT_JALAN_ID = "1cvKNzuIBMTz-o96K6aHcJ1Q-YrWh5eFG";
const FOLDER_REPORT_MATERIAL_ID = "12n7AQ76BYXox9sME-ZYrbQWG9kwDGs0o";

// [+] KONFIGURASI TELEGRAM BOT (NOTIFIKASI GRUP)
const TELEGRAM_BOT_TOKEN = "8789065775:AAEsOr7g1myDHyHPPuhuujNR07euM3tNmEs";
const TELEGRAM_GROUP_ID = "-1002731480508";

// URL WEB APP (NETLIFY / HOSTING KAMU)
const WEB_APP_URL = "https://desnarum-ops.web.app";

// ⚠️ URL DEPLOYMENT APPS SCRIPT (FIXED)
// Hardcode URL ini mencegah webhook salah terhubung ke versi /dev yang terkunci
const DEPLOY_URL = "https://script.google.com/macros/s/AKfycbw_e__jUU1_zZG3eny0XFoniKx1QUoNckuImB6yHL6TQXYT06XjKSW4iRYcTYXOQWaqjQ/exec";

const STATION_DB_MAP = {
  "Brumbung": { id: "1CyHkgCR-6kUO5gxKBQbNwT28PYHTPNDvaSt3F5TXGUs", sheetName: "Brumbung", folderId: "18MKoZn4ahwdAic7MxwX9Ss2nyiWVKHJR", masterId: "1tDDbdD3_tPFvPLYcAUK6dfkYkI3zcNQX" },
  "Wadu": { id: "1UIQpbuGdPdIefIggktJpSsdmRIhhrjyXbNx60m2LMPA", sheetName: "Wadu", folderId: "1_y644YRS2LnQ7RQLfQExJ99tYhEnEte8", masterId: "1XRXtxKQMI0CETBC3PnhleK5fy75E01bA" },
  "Kradenan": { id: "1GEc9s_oMpEbuwdahzNgCtb42PGFWWASVYwuuBAwk5UE", sheetName: "Kradenan", folderId: "10uEu4tRmMdcp0ijQduoZFDUCm8Z34gi7", masterId: "1YPgid7oDaLFCiaq-yUsRCc-1un28oi5B" },
  "Sulur": { id: "1zoy7IvYtjfmjvBw2lUK7-i-1c73ikCRDlhGT5CftNvc", sheetName: "Sulur", folderId: "1FL9ipcLHDMQlCXIfv7qtbpJCUEXhHcxd", masterId: "1INhAMSL02Iyj-1a6Uv9kztdJJuemqbmu" },
  "Randublatung": { id: "1BPa2WBRzYwus336l3s4wfE333QaxvuIvg-jV_QaCsmQ", sheetName: "Randu", folderId: "1CcImFUKhQ8XVCZBQUzoaLBQdoJ4vKh9q", masterId: "1WugJ0_1myOIfzV5DzBv8X9pRLGW9XFwg" },
  "Alastua": { id: "1zJbx-ZJoRay4dj-E5dv2T9w1bpE8vi8GtyDuNlaV-Ws", sheetName: "Alastua", folderId: "1AWeDbGEKo6_Is1C1ouRtrfqr1hBjJRR3", masterId: "1JMKuYyey-fZVn5ZuXnjMqp97OzMtmCQQ" },
  "Krengseng": { id: "1qTqQpzK34kqBJE-NsvidUhM3x2cVRXhA5F4_G65X7mo", sheetName: "Krengseng", folderId: "1kQTPHRR8abEP-X-6eFpHTsgu3LZFOuQD", masterId: "1GI4zmGrvp-WjDJckcygL8tdep6PA3WO6" },
  "Weleri": { id: "1ZVlW0X0NB5RU9NoLSdFFbOisLhBjy_bxBJXwL-Xgqnk", sheetName: "Weleri", folderId: "1zKdRkAcdnHVPh7kb0o2esly3fNZ_QoXv", masterId: "1StiBe0RWcOX5BiJ_nEHM8S76F7wHB6G2" },
  "Kaliwungu": { id: "1r7SErCmhxBuWqo_DOpThJk8X8Ddgv0oR7A98Av18Zo8", sheetName: "Kaliwungu", folderId: "1sZuEGGuj-MQMzz-yvkn2OvwdJXOOpa2T", masterId: "1MCLsL9AEqQjwWkmb6Gjb6f6GBibfrbT6" },
  "Kalibodri": { id: "1P4bESYhtqkyM14tknKYMiBVVNg3Zgj8KS9yVSGiQIwo", sheetName: "Kalibodri", folderId: "12UhV2YLvb10eXAunq8AL-3a9GO5Gpwq2", masterId: "1RDFRQIZ_-3Ogk8uV0xBf5M1QuGV4SDkB" },
  "Semarang Tawang": { id: "1HmG71UGj2r7lOB5XzDzWTETMjYKoij-X8ofCw_XrEdk", sheetName: "Tawang", folderId: "1HoTZJjs6B81tWEv6QTpl66pSc1LEW37f", masterId: "1wW3iuQz5qSBsPkXFqURJZiZE7L0D5tOc" },
  "Tawang": { id: "1HmG71UGj2r7lOB5XzDzWTETMjYKoij-X8ofCw_XrEdk", sheetName: "Tawang", folderId: "1HoTZJjs6B81tWEv6QTpl66pSc1LEW37f", masterId: "1wW3iuQz5qSBsPkXFqURJZiZE7L0D5tOc" }
};

// ==========================================
// ALAT DIAGNOSA AKSES GOOGLE DRIVE
// ==========================================
function testDriveAccess() {
  const stasiuns = ["Krengseng", "Weleri", "Kaliwungu", "Kalibodri"];
  let log = "";
  
  log += `Akun Eksekutor Aktif: ${Session.getActiveUser().getEmail()}
`;
  log += `Akun Eksekutor Efektif: ${Session.getEffectiveUser().getEmail()}

`;
  
  stasiuns.forEach(st => {
    let conf = STATION_DB_MAP[st];
    log += `--- Cek Stasiun: ${st} ---
`;
    
    // 1. Cek Spreadsheet Database
    try {
      let ss = SpreadsheetApp.openById(conf.id);
      log += `[SUCCESS] Spreadsheet Database terbaca: ${ss.getName()}
`;
    } catch(e) {
      log += `[ERROR] Spreadsheet Database (ID: ${conf.id}): ${e.message}
`;
    }
    
    // 2. Cek Master File
    try {
      let file = DriveApp.getFileById(conf.masterId);
      log += `[SUCCESS] Master File KML terbaca: ${file.getName()}
`;
    } catch(e) {
      log += `[ERROR] Master File KML (ID: ${conf.masterId}): ${e.message}
`;
    }
    
    // 3. Cek Output Folder
    try {
      let folder = DriveApp.getFolderById(conf.folderId);
      log += `[SUCCESS] Folder Output terbaca: ${folder.getName()}
`;
    } catch(e) {
      log += `[ERROR] Folder Output (ID: ${conf.folderId}): ${e.message}
`;
    }
    log += `
`;
  });
  
  Logger.log(log);
}

// ==========================================
// 1. SETUP WEBHOOK (WAJIB DI-RUN 1X SAJA)
// ==========================================
function setupWebhook() {
  const url = BASE_URL + "/setWebhook?url=" + DEPLOY_URL + "&drop_pending_updates=true";
  const res = UrlFetchApp.fetch(url);
  Logger.log("Status Webhook: " + res.getContentText());
}

// ========================================================
// FUNGSI UTAMA (DO GET & DO POST)
// ========================================================
function doGet(e) {
  if (e && e.parameter) {
    // Ambil Data Stasiun (Pelanggan & ODP)
    if (e.parameter.action === "getStationData") {
      const bypass = e.parameter.bypassCache === "true";
      return getCachedStationData(e.parameter.station, bypass);
    }
    // Ambil Data Outstanding (Untuk Peta)
    if (e.parameter.action === "getOutstandingData") {
      return getOutstandingData(e.parameter.station);
    }
    // Ambil Data Teknisi (Untuk Jadwal Tim)
    if (e.parameter.action === "getTechnicians") {
      return getTechnicians(e.parameter.station);
    }
    
    // [+] AMBIL DATA STASIUN & MATERIAL DARI STOK GUDANG
    if (e.parameter.action === "getMaterialMetadata") {
      return getMaterialMetadata();
    }
    
    // [+] AMBIL MATERIAL YANG MASIH OPEN UNTUK PENGEMBALIAN
    if (e.parameter.action === "getOpenMaterials") {
      return getOpenMaterials(e.parameter.username, e.parameter.stasiun, e.parameter.gudang);
    }
    
    if (e.parameter.action === "getDailyPlanData") {
        return getDailyPlanData(e.parameter.station);
    }

    // [+] TAMBAHAN BARU: AMBIL DAFTAR STASIUN
    if (e.parameter.action === "getStationList") {
        return getStationList();
    }

    // [+] TARIK SALESKIT TERPUSAT
    if (e.parameter.action === "tarikSaleskit") {
        return tarikSaleskitClientEndpoint(e.parameter.station);
    }

    // [+] MONITORING HARIAN
    if (e.parameter.action === "getMonitoringHarian") {
      return getMonitoringHarian(e.parameter.station);
    }

    // [+] PERFORMANSI HOMECONNECT & TUR
    if (e.parameter.action === "getPerformansiData") {
      return getPerformansiData(e.parameter.station);
    }
  }
  return ContentService.createTextOutput("API FTTH Aktif.");
}

// ==========================================
// 1. FUNGSI CEK ROLE USER
// ==========================================
/**
 * Fungsi ini mengecek role user berdasarkan username dari sheet List_Teknisi.
 * Struktur Kolom Sheet "List_Teknisi":
 * A: CHAT ID, B: USERNAME, C: NAMA, D: STASIUN, E: JABATAN, F: STATUS
 */
function getUserRole(username) {
  if (!username) return "Guest";
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheet = ss.getSheetByName("List_Teknisi"); 
    if (!sheet) return "Guest"; 

    const data = sheet.getDataRange().getValues();
    const cleanUser = username.toLowerCase().trim().replace(/^@/, "");

    for (let i = 1; i < data.length; i++) {
      let dbUser = String(data[i][1]).toLowerCase().trim().replace(/^@/, ""); 
      if (dbUser === cleanUser) {
        let role = String(data[i][4]).trim(); // Mengambil nilai dari Kolom E (Jabatan)
        
        // [+] PERBAIKAN: Jika Jabatan kosong, null, atau strip, paksa jadi Guest agar diblokir
        if (!role || role === "" || role === "-") {
          return "Guest";
        }
        
        return role; 
      }
    }
  } catch (e) {
    console.error("Error checking role: " + e.message);
  }
  return "Guest";
}

/**
 * [+] FUNGSI BARU: OTOMATIS REKAP USER KE SPREADSHEET
 * Mencatat/Update Chat ID, Username, dan Nama ke sheet List_Teknisi
 */
function autoRecapUserInfo(chatId, username, firstName, lastName) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    let sheet = ss.getSheetByName("List_Teknisi");
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const cleanUser = (username || "").toLowerCase().trim().replace(/^@/, "");
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    let found = false;

    // Cari berdasarkan Username
    for (let i = 1; i < data.length; i++) {
      let dbUser = String(data[i][1]).toLowerCase().trim().replace(/^@/, "");
      if (dbUser === cleanUser && cleanUser !== "") {
        found = true;
        // Jika Chat ID (Kolom A) masih kosong atau berbeda, update datanya
        if (String(data[i][0]) !== String(chatId)) {
          sheet.getRange(i + 1, 1).setValue(String(chatId)); // Update Chat ID
          sheet.getRange(i + 1, 3).setValue(fullName);       // Update Nama Profil
        }
        break;
      }
    }

    // Jika user sama sekali tidak ada di database, tambahkan baris baru sebagai Guest
    if (!found && cleanUser !== "") {
      sheet.appendRow([
        String(chatId), 
        "@" + cleanUser, 
        fullName, 
        "", // Stasiun (Kosongkan)
        "", // Jabatan (Kosongkan -> Triggers Blokir Otomatis)
        ""
      ]);
    }
  } catch (e) {
    console.error("Error in autoRecapUserInfo: " + e.message);
  }
}

// ==========================================
// 2. ENTRY POINT (doPost TAHAN BANTING)
// ==========================================
function doPost(e) {
  try {
    if (!e || !e.postData) return HtmlService.createHtmlOutput("OK");
    const data = JSON.parse(e.postData.contents);

    // --- LOGIKA 1: JIKA REQUEST DARI WEB APP ---
    if (data.action) {
      const action = data.action;
      const payload = data.payload || {};

      // [+] ROUTING KHUSUS ADMIN PANEL
      // Diletakkan di atas agar menggunakan sistem keamanan Chat ID absolut 
      // yang ada di dalam fungsinya masing-masing (checkAbsoluteAdmin).
      if (action === "getAllUsers") return getAllUsers(payload);
      if (action === "updateUserAccess") return updateUserAccess(payload);

      // Identifikasi pengirim untuk validasi role web app reguler
      const requester = payload.reporter_username || payload.tl || payload.petugas || "";
      const userRole = getUserRole(requester);

      // [+] BLOKIR TOTAL JIKA GUEST (Jabatan Kosong atau Tidak Terdaftar)
      if (userRole === "Guest") {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Akses Ditolak: Jabatan Anda kosong atau tidak terdaftar! Hubungi Bot Development." 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // --- PROTEKSI ROLE KHUSUS TEAM LEADER / ADMIN ---
      const tlOnlyActions = [
        "simpanRekapVisit", 
        "kirimNotifDailyPlan", 
        "updateStatusTeknisi", 
        "addTechnicianToDailyPlan", 
        "removeTechnicianFromDailyPlan"
      ];

      if (tlOnlyActions.includes(action)) {
        if (userRole !== "Team Leader" && userRole !== "Admin") {
          return ContentService.createTextOutput(JSON.stringify({ 
            status: "error", 
            message: "Akses Ditolak: Jabatan Anda (" + userRole + ") tidak diizinkan melakukan aksi ini!" 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // --- ROUTING AKSI WEB APP UMUM ---
      if (action === "simpanLaporan") {
        const res = saveOrUpdate(payload);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: res })).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === "updateStatusTeknisi") return updateStatusTeknisi(payload);
      if (action === "addTechnicianToDailyPlan") return addTechnicianToDailyPlan(payload);
      if (action === "removeTechnicianFromDailyPlan") return removeTechnicianFromDailyPlan(payload);
      if (action === "simpanRekapVisit") {
          const res = simpanRekapVisit(payload);
          return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === "simpanMaterialMulti") {
        const res = processMaterialLog(payload);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: res })).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === "kirimNotifDailyPlan") {
        const res = kirimNotifikasiDailyPlan(payload);
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: res })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // [+] ENDPOINT KMZ GENERATOR
      if (action === "generate") {
        const result = generateKMZ(data.station);
        if (result.status === "success" && data.payload && data.payload.chatId && result.base64) {
          try {
            const decodedBytes = Utilities.base64Decode(result.base64);
            const blob = Utilities.newBlob(decodedBytes, 'application/vnd.google-earth.kmz', result.filename);
            const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const now = new Date();
            const timeStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const captionMsg = `✅ KMZ Homeconnect Stasiun ${data.station}
🕑 Update : ${timeStr}`;

            const tgPayload = {
              chat_id: String(data.payload.chatId),
              document: blob,
              caption: captionMsg
            };
            UrlFetchApp.fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
              method: 'post',
              payload: tgPayload
            });
          } catch (e) {
            // Abaikan jika error kirim telegram agar tidak merusak response WebApp
          }
        }
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }
      if (action === "get_history") {
        return ContentService.createTextOutput(JSON.stringify(getKMZHistory(data.station))).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // --- LOGIKA 2: JIKA REQUEST DARI TELEGRAM (Chat Masuk) ---
    if (data.message && data.message.text) {
      const updateId = data.update_id;
      const chatId = data.message.chat.id;
      const text = data.message.text.trim();
      const user = data.message.from;
      const username = user.username || "";

      // Anti-Spam Filter
      if (updateId) {
        const cache = CacheService.getScriptCache();
        if (cache.get(updateId.toString())) return HtmlService.createHtmlOutput("OK"); 
        cache.put(updateId.toString(), "1", 3600);
      }

      // [+] EKSEKUSI AUTO REKAP SETIAP KALI USER CHAT KE BOT
      autoRecapUserInfo(chatId, username, user.first_name, user.last_name);

      // Handle Perintah Bot
      if (text === "/start" || text === "/menu") {
        kirimMenuTelegram(chatId, username);
      } else if (text === "/ping") {
        UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({ chat_id: chatId, text: "✅ Bot Online & Sangat Stabil!" }),
          muteHttpExceptions: true
        });
      }
    }

    return HtmlService.createHtmlOutput("OK");
    
  } catch (error) {
    console.error("Error doPost:", error);
    return HtmlService.createHtmlOutput("OK"); 
  }
}


// ==========================================
// 3. FUNGSI KIRIM MENU TELEGRAM
// ==========================================
function kirimMenuTelegram(chatId, username) {
  try {
    const userRole = getUserRole(username);
    
    // [+] JIKA GUEST: Tampilkan Pesan Blokir & Instruksi Hubungi Dev
    if (userRole === "Guest") {
      const blockMsg = `🚫 <b>AKSES DITOLAK</b>

` +
                       `Halo @${username || 'User'},
` +
                       `Akun Anda <b>belum terdaftar</b> di <b>Operations Tracker Desnarum</b>.

` +
                       `Anda tidak dapat mengakses menu dalam Bot ini. Silakan hubungi <b>Bot Developer</b> untuk melakukan otorisasi akun.`;

      UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({
          chat_id: chatId, 
          text: blockMsg, 
          parse_mode: "HTML"
        })
      });
      return; // Berhenti di sini, jangan kirim menu
    }

    // Jika Role Valid (Admin/Team Leader/Teknisi)
    let buttons = [
      [{ text: "📝 Input Report Lapangan", web_app: { url: WEB_APP_URL } }],
      [{ text: "📋 Input Report Material", web_app: { url: WEB_APP_URL + "/material.html" } }],
      [{ text: "📋 Outstanding WO", web_app: { url: WEB_APP_URL + "/outstanding.html" } }],
      [{ text: "🗺️ Generate KMZ", web_app: { url: WEB_APP_URL + "/generate-kmz.html" } }],
      [{ text: "📊 Daily Monitoring", web_app: { url: WEB_APP_URL + "/monitoring.html" } }]
    ];

    // Menu khusus Team Leader & Admin
    if (userRole === "Team Leader" || userRole === "Admin") {
      buttons.splice(2, 0, [{ text: "🆘 Input WO Visit", web_app: { url: WEB_APP_URL + "/visit.html" } }]);
      buttons.push([{ text: "📅 Daily Plan IKR", web_app: { url: WEB_APP_URL + "/jadwal.html" } }]);
      buttons.push([{ text: "📈 Performansi TUR", web_app: { url: WEB_APP_URL + "/performansi.html" } }]);
    }

    // [+] TAMBAHAN: Menu KHUSUS ADMIN (User Management)
    // Team Leader tidak akan masuk ke dalam blok ini
    if (userRole === "Admin") {
      buttons.push([{ text: "⚙️ Admin Panel (User Mgt)", web_app: { url: WEB_APP_URL + "/admin.html" } }]);
    }

    const msg = `👋 Halo, @${username || 'User'}! Selamat datang di <b>Operations Tracker Desnarum</b>.

` +
                `Role saat ini: <b>${userRole}</b>
` +
                `Silakan pilih menu di bawah ini:`;

    UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({
        chat_id: chatId, text: msg, parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons }
      })
    });
  } catch (e) {
    UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
      method: "post", contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: "❌ Gagal memuat menu: " + e.message })
    });
  }
}


// ================= SEND MESSAGE =================
function sendMessage(chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown"
  };

  if (keyboard) {
    payload.reply_markup = keyboard; 
  }

  callApi("sendMessage", payload);
}


// ================= TELEGRAM API =================
function callApi(method, payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const url = BASE_URL + "/" + method;
  return UrlFetchApp.fetch(url, options);
}

// ================= ANTI SPAM =================
function isSpam(chatId) {
  const cache = CacheService.getUserCache();
  const key = "menu_" + chatId;

  if (cache.get(key)) return true;

  cache.put(key, "1", 3); 
  return false;
}

// ==========================================
// PULL DATA OUTSTANDING (UNTUK WEB APP PETA)
// ==========================================
function getOutstandingData(stationName) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = "OUTSTANDING_" + stationName;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return ContentService.createTextOutput(cachedData).setMimeType(ContentService.MimeType.JSON);
    }

    const stationInfo = STATION_DB_MAP[stationName];
    if (!stationInfo) throw new Error("Stasiun tidak terdaftar.");

    const ssStation = SpreadsheetApp.openById(stationInfo.id);
    const sheetUtama = ssStation.getSheetByName(stationInfo.sheetName);
    
    let dbOutstanding = [];

    // 1. AMBIL DATA PELANGGAN OUTSTANDING
    if (sheetUtama) {
      const data = sheetUtama.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        let id = String(data[i][0]).trim().toUpperCase(); 
        
        let statusIKR = String(data[i][7]).trim(); 
        let statusAct = String(data[i][8]).trim(); 
        if (id && id !== "ID" && statusIKR === "Belum" && statusAct === "Belum") { 
          let latVal = parseFloat(data[i][5]); 
          let lngVal = parseFloat(data[i][6]); 
          
          dbOutstanding.push({
            id: id,
            nama: String(data[i][1]).trim(),   
            kontak: String(data[i][2]).trim(), 
            alamat: String(data[i][3]).trim(), 
            lat: isNaN(latVal) ? null : latVal,
            lng: isNaN(lngVal) ? null : lngVal,
            tgl_reg: data[i][37],
            kendala: String(data[i][21] || "").trim()
          });
        }
      }
    }

    // 2. AMBIL DATA TITIK ODP (Sudah disesuaikan kolom B,C,D,F,G)
    let dbTitikODP = [];
    const sheetODP = ssStation.getSheetByName("ODP");
    
    if (sheetODP) {
      const dataODP = sheetODP.getDataRange().getValues();
      for (let i = 1; i < dataODP.length; i++) { 
        let odpId = dataODP[i][6] ? String(dataODP[i][6]).trim().toUpperCase() : ""; // Kolom G (Index 6)
        
        if (odpId !== "") {
          let colB = String(dataODP[i][1] || "").trim(); // Kolom B (Lat)
          let colC = String(dataODP[i][2] || "").trim(); // Kolom C (Lng)
          let lat = null, lng = null;
          
          // Mengamankan penulisan jika "Lat, Lng" ditulis tergabung di Kolom B
          if (colB.includes(",")) {
            let parts = colB.split(",");
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
          } else {
            lat = parseFloat(colB);
            lng = parseFloat(colC);
          }

          // Kapasitas dari Kolom F (Index 5)
          let portTotal = parseInt(dataODP[i][5]); 
          if (isNaN(portTotal) || portTotal <= 0) portTotal = 8; 

          // Port Terpakai langsung dari Kolom D (Index 3)
          let terpakai = parseInt(dataODP[i][3]); 
          if (isNaN(terpakai) || terpakai < 0) terpakai = 0;

          // Sisa Port
          let portTersedia = portTotal - terpakai;
          if (portTersedia < 0) portTersedia = 0;

          dbTitikODP.push({
            id: odpId,
            lat: isNaN(lat) ? null : lat,
            lng: isNaN(lng) ? null : lng,
            port_tersedia: portTersedia,
            port_total: portTotal
          });
        }
      }
    }

    const outputString = JSON.stringify({
      status: "success",
      dbOutstanding: dbOutstanding,
      dbTitikODP: dbTitikODP
    });

    cache.put(cacheKey, outputString, 300);

    return ContentService.createTextOutput(outputString).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// FUNGSI TARIK LIST STASIUN DARI MASTER DATABASE
// ==========================================
function getStationList() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheet = ss.getSheetByName("Master_Database");
    
    if (!sheet) throw new Error("Sheet Master_Database tidak ditemukan");
    
    // Tarik data mulai dari baris ke-2 (Baris 1 biasanya Header) di Kolom A
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Data stasiun kosong");
    
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let stations = [];
    
    for (let i = 0; i < data.length; i++) {
      let stName = String(data[i][0]).trim();
      // Memastikan nama stasiun tidak kosong, bukan error formula (#VALUE!, #REF!, dll), dan menghindari duplikat
      if (stName !== "" && !stName.startsWith("#") && !stations.includes(stName)) {
        stations.push(stName);
      }
    }
    
    // [+] Fallback & Tambahan dari STATION_DB_MAP (jika di Master_Database ada error formula)
    for (let key in STATION_DB_MAP) {
      let cleanKey = key.trim();
      if (!stations.includes(cleanKey)) {
        stations.push(cleanKey);
      }
    }
    
    // Urutkan daftar stasiun berdasarkan abjad
    stations.sort();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      data: stations 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: e.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 4. DATABASE SYSTEM NORMAL
// ==========================================
function clearStationCache(stationName) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheVersion = "MASTER_V2_";
    const chunkCountVal = cache.get("CHUNK_COUNT_" + cacheVersion + stationName);
    let keysToRemove = ["CHUNK_COUNT_" + cacheVersion + stationName, "OUTSTANDING_" + stationName];
    
    let limit = chunkCountVal ? parseInt(chunkCountVal) : 30; // Batas aman default
    for (let i = 0; i < limit; i++) {
      keysToRemove.push("DATA_" + cacheVersion + stationName + "_" + i);
    }
    cache.removeAll(keysToRemove);
  } catch (e) {
    console.error("Error clearing station cache: " + e.message);
  }
}

function getCachedStationData(stationName, bypassCache = false) {
  try {
    const stationInfo = STATION_DB_MAP[stationName];
    if (!stationInfo) throw new Error("Stasiun tidak terdaftar.");

    let dbPelanggan = {};
    let dbPortTerpakai = {};

    // ========================================================
    // 1. TARIK DATA PELANGGAN LANGSUNG DARI SUPABASE (KILAT & PAGINATION)
    // ========================================================
    if (typeof SUPABASE_URL !== 'undefined') {
      let allData = [];
      let start = 0;
      const limit = 1000;
      let hasMore = true;

      // LOOPING UNTUK MENGAMBIL SELURUH DATA JIKA LEBIH DARI 1000
      while (hasMore) {
        const url = SUPABASE_URL + "/rest/v1/data_pelanggan?stasiun=ilike.*" + encodeURIComponent(stationName) + "*&select=id_pelanggan,nama_pelanggan,nomor_hp,alamat,sn_ont,odp,port_odp,status_ikr,status_aktivasi,latitude,longitude,tgl_aktivasi,petugas_aktivasi,issue_kendala&limit=" + limit + "&offset=" + start;

        const options = {
          method: "get",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          },
          muteHttpExceptions: true
        };
        
        const res = UrlFetchApp.fetch(url, options);
        if (res.getResponseCode() === 200 || res.getResponseCode() === 201) {
          const chunk = JSON.parse(res.getContentText());
          allData = allData.concat(chunk);
          if (chunk.length < limit) {
            hasMore = false;
          } else {
            start += limit;
          }
        } else {
          hasMore = false;
          throw new Error("Gagal mengambil data dari Supabase: " + res.getContentText());
        }
      }

      for (let i = 0; i < allData.length; i++) {
        let row = allData[i];
        if (!row.id_pelanggan) continue;
        
        let id = String(row.id_pelanggan).toUpperCase();
        let odpVal = row.odp ? String(row.odp).trim().toUpperCase() : "";
        let portVal = row.port_odp ? String(row.port_odp).trim() : "";

        dbPelanggan[id] = {
          nama: String(row.nama_pelanggan || ""),
          kontak: String(row.nomor_hp || ""),
          alamat: String(row.alamat || ""),
          sn: String(row.sn_ont || "").trim(),
          odp: odpVal,
          port: portVal,
          status_ikr: String(row.status_ikr || ""),
          status_act: String(row.status_aktivasi || ""),
          lat: String(row.latitude || "").trim(),
          lng: String(row.longitude || "").trim(),
          tgl_aktivasi: String(row.tgl_aktivasi || "-").trim(),
          petugas_aktivasi: String(row.petugas_aktivasi || "-").trim(),
          kendala: String(row.issue_kendala || "").trim()
        };

        // Mendata Port yang Terpakai
        if (odpVal && portVal) {
          let pNum = parseInt(portVal);
          if (!isNaN(pNum)) {
            if (!dbPortTerpakai[odpVal]) dbPortTerpakai[odpVal] = [];
            if (!dbPortTerpakai[odpVal].includes(pNum)) dbPortTerpakai[odpVal].push(pNum);
          }
        }
      }
    } else {
      throw new Error("Konfigurasi Supabase tidak ditemukan!");
    }

    // ========================================================
    // 2. TARIK DATA MASTER ODP DARI GOOGLE SHEET (KARENA INI DAFTAR TIANG)
    // ========================================================
    let listODP = [];
    const ssStation = SpreadsheetApp.openById(stationInfo.id);
    const sheetODP = ssStation.getSheetByName("ODP");
    if (sheetODP) {
      const dataODP = sheetODP.getDataRange().getValues();
      for (let i = 1; i < dataODP.length; i++) {
        let odp = dataODP[i][6] ? String(dataODP[i][6]).trim() : ""; 
        if (odp !== "") listODP.push(odp);
      }
    }

    // ========================================================
    // 3. TARIK DATA VISIT (SELALU LIVE DARI SHEET MASTER VISIT)
    // ========================================================
    let dbVisit = [];
    try {
      const ssVisit = SpreadsheetApp.openById("13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M");
      const sheetVisit = ssVisit.getSheetByName("Visit_Log");
      
      if (sheetVisit) {
        const dataVisit = sheetVisit.getDataRange().getValues();
        for (let i = 1; i < dataVisit.length; i++) {
          let id = String(dataVisit[i][1] || "").trim().toUpperCase(); 
          let nama = String(dataVisit[i][2] || "").trim(); 
          let stasiunVisit = String(dataVisit[i][3] || "").trim(); 
          let status = String(dataVisit[i][6] || "").trim().toUpperCase(); // Kolom G (Status Visit)
          
          if (status === "OPEN" && stasiunVisit.toLowerCase() === stationName.toLowerCase()) {
            let keluhanAsli = String(dataVisit[i][4] || "").trim(); 
            let deskripsiAsli = String(dataVisit[i][5] || "").trim(); 
            let infoLengkap = deskripsiAsli !== "-" && deskripsiAsli !== "" ? keluhanAsli + " (" + deskripsiAsli + ")" : keluhanAsli;

            dbVisit.push({ 
              id: id !== "" ? id : "ID_KOSONG_" + (i + 1), 
              nama: nama,
              kontak: String(dataVisit[i][10] || "").trim(),      
              alamat: "-", 
              keluhan: infoLengkap, 
              odp: String(dataVisit[i][7] || "").trim(),         
              port: String(dataVisit[i][8] || "").trim(),        
              sn: String(dataVisit[i][9] || "").trim(),          
              petugas: String(dataVisit[i][16] || "").trim()     
            });
          }
        }
      }
    } catch (errVisit) {
      console.log("Error Visit Log: " + errVisit.message);
    }

    // ========================================================
    // 4. GABUNGKAN DATA & KIRIM KE WEB APP
    // ========================================================
    const finalResponse = {
      status: "success",
      dbPelanggan: dbPelanggan,
      dbODP: listODP,
      dbPortTerpakai: dbPortTerpakai,
      dbVisit: dbVisit 
    };

    return ContentService.createTextOutput(JSON.stringify(finalResponse)).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


function saveOrUpdate(data) {
  const stationName = data.nama_stasiun;
  const stationMap = STATION_DB_MAP[stationName];
  const ss = SpreadsheetApp.openById(stationMap.id);
  
  // [+] AMBIL STRUKTUR FOLDER: Database Pelanggan -> Stasiun [Nama] -> Dokumentasi
  const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  const stationFolder = getOrCreateFolder(parentFolder, "Stasiun " + stationName);
  const dokumentasiFolder = getOrCreateFolder(stationFolder, "Dokumentasi");
  
  // [+] Format Timestamp penamaan file: DDMMYY_HHmm
  const fileTime = Utilities.formatDate(new Date(), "Asia/Jakarta", "ddMMyy_HHmm");
  
  // 1. PENANGANAN KHUSUS UNTUK FORM VISIT DI SPREADSHEET BERBEDA
  if (data.jenis_laporan === "visit") {
    try {
      const ssVisit = SpreadsheetApp.openById("13jcv3tNA4ncAj7WTv4xE0_Tb63_FU5JF0hLIfasJk2M");
      const sheetVisit = ssVisit.getSheetByName("Visit_Log");
      
      if (sheetVisit) {
        const rows = sheetVisit.getDataRange().getValues();
        let target = -1;
        
        for (let i = 1; i < rows.length; i++) {
          let id = String(rows[i][1]).trim().toUpperCase();
          let status = String(rows[i][6]).trim().toUpperCase();
          if (id === String(data.id_pelanggan).trim().toUpperCase() && status === "OPEN") {
            target = i + 1;
            break;
          }
        }
        
        if (target !== -1) {
          let visitFolder = getOrCreateFolder(dokumentasiFolder, "Visit");
          let urlVisit = up(data.foto_visit_base64, `VISIT_${data.id_pelanggan}`, visitFolder);
          let linkEvid = urlVisit.startsWith("http") ? '=HYPERLINK("' + urlVisit + '"; "Foto Perbaikan")' : urlVisit;

          // Tulis ke Sheet Visit_Log Master
          sheetVisit.getRange(target, 7).setValue("CLOSED"); 
          sheetVisit.getRange(target, 14).setValue(data.penyebab); 
          sheetVisit.getRange(target, 15).setValue(data.perbaikan); 
          sheetVisit.getRange(target, 16).setValue(data.material); 
          sheetVisit.getRange(target, 18).setValue(linkEvid);
          sheetVisit.getRange(target, 19).setValue(new Date());
          
          clearStationCache(stationName);
          
          // [+] TARIK DATA TEKNIS UTAMA
          let namaPelanggan = String(rows[target-1][2]); 
          let hpPelanggan = String(rows[target-1][10]);  
          
          data.kode_odp = String(rows[target-1][7] || "").trim(); // Kolom H (ODP)
          data.port_odp = String(rows[target-1][8] || "").trim(); // Kolom I (Port)
          data.sn_ont = String(rows[target-1][9] || "").trim();   // Kolom J (SN)

          let latV = String(rows[target-1][11] || "").replace(/['"]/g, "").trim(); // Kolom L
let lngV = String(rows[target-1][12] || "").replace(/['"]/g, "").trim(); // Kolom M
          if (latV !== "" && lngV !== "" && latV !== "-" && lngV !== "-") data.lokasi_gps = latV + ", " + lngV;
          else data.lokasi_gps = "-";

          // [+] CROSS-CHECK KE SHEET STASIUN (JAGA-JAGA SHEET VISIT KOSONG)
          const sheetStasiun = ss.getSheetByName(stationMap.sheetName);
          if (sheetStasiun) {
            const rowsStasiun = sheetStasiun.getDataRange().getValues();
            for (let j = 1; j < rowsStasiun.length; j++) {
              if (String(rowsStasiun[j][0]).trim().toUpperCase() === String(data.id_pelanggan).trim().toUpperCase()) {
                  // Timpa jika di visit kosong
                  if (!data.kode_odp || data.kode_odp === "-") data.kode_odp = String(rowsStasiun[j][12] || "").trim();
                  if (!data.port_odp || data.port_odp === "-") data.port_odp = String(rowsStasiun[j][13] || "").trim();
                  if (!data.sn_ont || data.sn_ont === "-") data.sn_ont = String(rowsStasiun[j][9] || "").trim();
                  
                  // Timpa GPS jika di visit kosong
                  if (data.lokasi_gps === "-") {
                      let latS = String(rowsStasiun[j][5] || "").replace(/['"]/g, "").trim();
let lngS = String(rowsStasiun[j][6] || "").replace(/['"]/g, "").trim();
                      let catS = String(rowsStasiun[j][4] || "").trim();
                      if (latS !== "" && lngS !== "" && latS !== "-" && lngS !== "-") data.lokasi_gps = latS + ", " + lngS;
                      else if (catS !== "" && catS.includes(",")) data.lokasi_gps = catS;
                  }
                  break;
              }
            }
          }

          // --- SUPABASE DUAL WRITE TRIGGER ---
          try {
            syncSinglePelangganToSupabase(data.id_pelanggan, {
              "id_pelanggan": data.id_pelanggan,
              "nama_pelanggan": namaPelanggan,
              "nomor_hp": hpPelanggan,
              "stasiun": stationName === "Tawang" ? "Semarang Tawang" : stationName,
              "status_visit": "CLOSED",
              "visit_penyebab": data.penyebab,
              "visit_perbaikan": data.perbaikan,
              "visit_material": data.material,
              "kode_odp": data.kode_odp,
              "odp_aktual": data.kode_odp,
              "port_odp": data.port_odp,
              "sn_ont": data.sn_ont,
              "latitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[0].trim() : "",
              "longitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[1].trim() : "",
              "petugas_visit": data.petugas || ""
            });

            // SINKRONISASI CLOSE KE TABEL log_visit SUPABASE
            syncVisitLogToSupabase("close", {
              id_pelanggan: data.id_pelanggan,
              status_visit: "CLOSED",
              penyebab: data.penyebab,
              perbaikan: data.perbaikan,
              used_materials: data.material,
              evidence: urlVisit,
              petugas: data.petugas || ""
            });
          } catch(err) {
            Logger.log("Supabase Sync Failed on Bot Visit: " + err.message);
          }

          let docLinks = { "Foto Perbaikan": urlVisit };
          kirimNotifTelegram(data, docLinks, data.foto_visit_base64, namaPelanggan, hpPelanggan);

          return "Laporan Visit berhasil di-Close dan disimpan.";
        } else {
          return "Gagal: Tiket visit open untuk ID tersebut tidak ditemukan.";
        }
      } else {
        return "Error: Sheet Visit_Log tidak ada di Master Visit.";
      }
    } catch (errSave) {
      return "Error Buka File Visit Master saat simpan: " + errSave.message;
    }
  }

  // 2. [+] PENANGANAN KHUSUS UNTUK FORM DISMANTLE
  if (data.jenis_laporan === "dismantle") {
    try {
      const sheetDismantle = ss.getSheetByName(stationMap.sheetName);
      const rows = sheetDismantle.getDataRange().getValues();
      let target = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toUpperCase() === String(data.id_pelanggan).trim().toUpperCase()) {
          target = i + 1;
          break;
        }
      }

      if (target !== -1) {
        let dismantleFolder = getOrCreateFolder(dokumentasiFolder, "Dismantle");
        let urlDis = up(data.foto_dismantle_base64, `DISMANTLE_${data.id_pelanggan}`, dismantleFolder);
        let linkEvid = urlDis;

        sheetDismantle.getRange(target, 9).setValue("Dismantled");
        sheetDismantle.getRange(target, 14).setValue(""); 
        sheetDismantle.getRange(target, 22).setValue(data.alasan_dismantle);
        sheetDismantle.getRange(target, 38).setValue(linkEvid);
        
        clearStationCache(stationName);
        
        let namaPelanggan = String(rows[target-1][1]);
        let hpPelanggan = String(rows[target-1][2]);   
        
        data.kode_odp = String(rows[target-1][12] || "").trim(); // Kolom M (ODP)
        data.port_odp = String(rows[target-1][13] || "").trim(); // Kolom N (Port)
        data.sn_ont = String(rows[target-1][9] || "").trim();    // Kolom J (SN ONT)
        
        let lat = String(rows[target-1][5] || "").replace(/['"]/g, "").trim();
let lng = String(rows[target-1][6] || "").replace(/['"]/g, "").trim();
        let cat = String(rows[target-1][4] || "").trim();
        
        if (lat !== "" && lng !== "" && lat !== "-" && lng !== "-") data.lokasi_gps = lat + ", " + lng;
        else if (cat !== "" && cat.includes(",")) data.lokasi_gps = cat;
        else data.lokasi_gps = "-";

        // --- SUPABASE DUAL WRITE TRIGGER ---
        try {
          syncSinglePelangganToSupabase(data.id_pelanggan, {
            "id_pelanggan": data.id_pelanggan,
            "nama_pelanggan": namaPelanggan,
            "nomor_hp": hpPelanggan,
            "stasiun": stationName === "Tawang" ? "Semarang Tawang" : stationName,
            "aktivasi": "Dismantled",
            "alasan_dismantle": data.alasan_dismantle,
            "kode_odp": data.kode_odp,
            "odp_aktual": data.kode_odp,
            "port_odp": "",
            "sn_ont": data.sn_ont,
            "latitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[0].trim() : "",
            "longitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[1].trim() : "",
            "foto_dismantle": urlDis
          });
        } catch(err) {
          Logger.log("Firestore Sync Failed on Bot Dismantle: " + err.message);
        }

        let docLinks = { "Foto ONT Dismantle": urlDis };
        kirimNotifTelegram(data, docLinks, data.foto_dismantle_base64, namaPelanggan, hpPelanggan);

        return "Laporan Dismantle sukses dicatat.";
      } else {
        return "Gagal: ID Pelanggan tidak ditemukan untuk di-dismantle.";
      }
    } catch (errDis) {
      return "Error saat menyimpan Dismantle: " + errDis.message;
    }
  }

  // 3. JIKA LAPORAN REGULER (IKR / AKTIVASI / KENDALA)
  const sheet = ss.getSheetByName(stationMap.sheetName);
  
  let ikrFolder = getOrCreateFolder(dokumentasiFolder, "IKR");
  let aktivasiFolder = getOrCreateFolder(dokumentasiFolder, "Aktivasi");
  
    let urls = {
    odp: up(data.foto_odp_base64, `ODP_${data.id_pelanggan}`, ikrFolder),
    tarik: up(data.foto_penarikan_base64, `Tarik_${data.id_pelanggan}`, ikrFolder),
    rumah: up(data.foto_rumah_base64, `Rumah_${data.id_pelanggan}`, ikrFolder),
    sn: up(data.foto_sn_ont_base64, `SN_${data.id_pelanggan}`, aktivasiFolder),
    ont: up(data.foto_ont_terpasang_base64, `ONT_${data.id_pelanggan}`, aktivasiFolder),
    starlite: up(data.foto_starlite_base64, `Starlite_${data.id_pelanggan}`, aktivasiFolder)
  };
  
  const now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");
  const rows = sheet.getDataRange().getValues();
  let target = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toUpperCase() === String(data.id_pelanggan).trim().toUpperCase()) {
      target = i + 1; break;
    }
  }

  if (target !== -1) {
    let statusIKR = String(rows[target-1][7] || "").trim(); 
    let statusACT = String(rows[target-1][8] || "").trim(); 
    let jns = String(data.jenis_laporan).toLowerCase();

    if (jns === "ikr" && statusIKR === "Sudah") return "Gagal: ID ini sudah dilaporkan IKR sebelumnya.";
    if (jns === "aktivasi" && statusACT === "Sudah") return "Gagal: ID ini sudah dilaporkan AKTIVASI sebelumnya.";
    if (jns === "ikr_aktivasi") {
      if (statusIKR === "Sudah" && statusACT === "Sudah") return "Gagal: Pelanggan ini sudah berstatus Selesai.";
      if (statusIKR === "Sudah") return "Gagal: Pelanggan sudah IKR. Silakan ganti Jenis Laporan menjadi 'Aktivasi Saja'.";
      if (statusACT === "Sudah") return "Gagal: Pelanggan sudah Aktivasi. Silakan periksa kembali data Anda.";
    }
  }

  let finalMessage = "";
  let extractedName = data.nama_baru || "-";
  let extractedHP = data.hp_baru || "-";
  let extractedAlamat = data.alamat_baru || "-";

  if (target === -1) {
    let firstEmptyRow = sheet.getLastRow() + 1;
    const dataA = sheet.getRange("A:A").getValues();
    for (let r = dataA.length - 1; r >= 0; r--) {
        if (dataA[r][0] !== "") {
            firstEmptyRow = r + 2; 
            break;
        }
    }
    
    let totalCols = 31;
    let newRow = new Array(totalCols).fill("");
    newRow[0] = data.id_pelanggan;
    newRow[1] = extractedName;
    newRow[2] = extractedHP;
    newRow[3] = extractedAlamat;
    
    let formulasNew = sheet.getRange(firstEmptyRow, 1, 1, totalCols).getFormulas()[0]; 
    applyData(newRow, data, urls, now);
    
    for (let j = 0; j < newRow.length; j++) {
        if (formulasNew && formulasNew[j] !== "") newRow[j] = formulasNew[j]; 
    }
    
    sheet.getRange(firstEmptyRow, 1, 1, totalCols).setValues([newRow]);
    finalMessage = "Pelanggan baru ditambahkan ke database " + stationName;
  } else {
    let totalCols = 31;
    let range = sheet.getRange(target, 1, 1, totalCols);
    let vals = range.getValues()[0];
    let formulas = range.getFormulas()[0]; 
    
    extractedName = String(vals[1] || "-"); 
    extractedHP = String(vals[2] || "-");
    let dbAlamat = String(vals[3] || "").trim();
    if (!data.alamat_baru) {
        extractedAlamat = (dbAlamat !== "") ? dbAlamat : "-";
    }

    let dbOdp = String(vals[12] || "").trim(); 
    let dbPort = String(vals[13] || "").trim();
    let inputOdp = String(data.kode_odp || "").trim().toLowerCase();
    let inputPort = String(data.port_odp || "").trim().toLowerCase();

    if (inputOdp === "" || inputOdp === "-" || inputOdp.includes("ditarik")) data.kode_odp = (dbOdp !== "") ? dbOdp : "-";
    if (inputPort === "" || inputPort === "-" || inputPort.includes("ditarik")) data.port_odp = (dbPort !== "") ? dbPort : "-";

    let inputGps = String(data.lokasi_gps || "").trim().toLowerCase();
    if (inputGps === "" || inputGps === "-" || inputGps === "undefined" || inputGps === "null" || inputGps.includes("ambil")) {
        let lat = String(vals[5] || "").replace(/['"]/g, "").trim(); 
let lng = String(vals[6] || "").replace(/['"]/g, "").trim(); 
        let catatanColE = String(vals[4] || "").trim(); 
        
        if (lat !== "" && lng !== "" && lat !== "-" && lng !== "-") data.lokasi_gps = lat + ", " + lng;
        else if (catatanColE !== "" && catatanColE.includes(",")) data.lokasi_gps = catatanColE;
        else data.lokasi_gps = "-";
    }

    applyData(vals, data, urls, now);
    
    for (let j = 0; j < vals.length; j++) {
        if (formulas[j] !== "") vals[j] = formulas[j]; 
    }

    range.setValues([vals]);
    finalMessage = "Data Laporan sukses diperbarui.";
  }

  clearStationCache(stationName);

  // --- SUPABASE DUAL WRITE TRIGGER ---
  try {
    var statusIkrSync = data.jenis_laporan.includes("ikr") ? "Sudah" : (data.jenis_laporan === "kendala" ? "Kendala" : "-");
    var statusAktSync = data.jenis_laporan.includes("aktivasi") ? "Sudah" : (data.jenis_laporan === "kendala" ? "Kendala" : "-");

    syncSinglePelangganToSupabase(data.id_pelanggan, {
      "id_pelanggan": data.id_pelanggan,
      "nama_pelanggan": extractedName,
      "nomor_hp": extractedHP,
      "stasiun": stationName === "Tawang" ? "Semarang Tawang" : stationName,
      "alamat": extractedAlamat,
      "kode_odp": data.kode_odp || "-",
      "odp_aktual": data.kode_odp || "-",
      "port_odp": data.port_odp || "-",
      "sn_ont": data.sn_ont || "-",
      "ikr": statusIkrSync,
      "aktivasi": statusAktSync,
      "tgl_ikr": statusIkrSync === "Sudah" ? now : "",
      "tgl_aktivasi": statusAktSync === "Sudah" ? now : "",
      "latitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[0].trim() : "",
      "longitude": (data.lokasi_gps && data.lokasi_gps !== "-") ? data.lokasi_gps.split(",")[1].trim() : "",
      "reporter_username": data.reporter_username || "",
      "foto_odp": urls.odp || "",
      "foto_tarik": urls.tarik || "",
      "foto_rumah": urls.rumah || "",
      "foto_ont": urls.ont || "",
      "foto_sn": urls.sn || "",
      "foto_starlite": urls.starlite || "",
      "kabel_precon": data.pemakaian_precon || "",
      "issue_kendala": data.deskripsi_kendala || "",
      "jenis_laporan": data.jenis_laporan || ""
    });
  } catch(err) {
    Logger.log("Firestore Sync Failed on Bot Regular: " + err.message);
  }

  let docLinks = {};
  if (urls.odp && !urls.odp.startsWith("Error")) docLinks["Foto ODP"] = urls.odp;
  if (urls.tarik && !urls.tarik.startsWith("Error")) docLinks["Foto Penarikan"] = urls.tarik;
  if (urls.rumah && !urls.rumah.startsWith("Error")) docLinks["Foto Rumah"] = urls.rumah;
  if (urls.sn && !urls.sn.startsWith("Error")) docLinks["Foto SN"] = urls.sn;
  if (urls.ont && !urls.ont.startsWith("Error")) docLinks["Foto ONT"] = urls.ont;
  if (urls.starlite && !urls.starlite.startsWith("Error")) docLinks["Foto App Starlite"] = urls.starlite;

  let mainPic = data.foto_ont_terpasang_base64 && data.foto_ont_terpasang_base64 !== "-" ? data.foto_ont_terpasang_base64 :
                (data.foto_rumah_base64 && data.foto_rumah_base64 !== "-" ? data.foto_rumah_base64 : 
                (data.foto_kendala_base64 && data.foto_kendala_base64 !== "-" ? data.foto_kendala_base64 : null));

  kirimNotifTelegram(data, docLinks, mainPic, extractedName, extractedHP);

  return finalMessage;
}

// ====================================================================
// FUNGSI APPLY DATA (SUDAH DIPERBARUI SESUAI MILIKMU)
// ====================================================================
function applyData(row, data, urls, now) {
  if (data.jenis_laporan.includes("ikr")) {
    row[7] = "Sudah"; 
    
    // Jika Laporan IKR Saja, Set Status Aktivasi Menjadi Belum
    if (data.jenis_laporan === "ikr") {
      row[8] = "Belum";
    }

    row[10] = now; 
    row[12] = data.kode_odp; 
    row[13] = data.port_odp; 
    row[15] = urls.odp.startsWith("http") ? '=HYPERLINK("' + urls.odp + '"; "ODP Terbuka (Port ODP)")' : urls.odp; 
    row[16] = urls.tarik.startsWith("http") ? '=HYPERLINK("' + urls.tarik + '"; "Penarikan Dari ODP")' : urls.tarik; 
    row[17] = urls.rumah.startsWith("http") ? '=HYPERLINK("' + urls.rumah + '"; "Foto Rumah")' : urls.rumah; 
    row[20] = data.pemakaian_precon; 
    row[27] = data.reporter_username; 
    
    if (data.lokasi_gps && data.lokasi_gps !== "-") {
      let g = data.lokasi_gps.split(",");
      if(g.length >= 2) {
        // Berikan tanda petik tunggal agar Google Sheet menjadikannya Plain Text (mencegah format ribuan)
        row[5] = "'" + g[0].trim(); 
        row[6] = "'" + g[1].trim(); 
      }
    }
  }
  if (data.jenis_laporan.includes("aktivasi")) {
    row[8] = "Sudah"; 
    row[9] = data.sn_ont; 
    row[11] = now; 
    row[18] = urls.ont.startsWith("http") ? '=HYPERLINK("' + urls.ont + '"; "ONT Terpasang")' : urls.ont; 
    row[19] = urls.sn.startsWith("http") ? '=HYPERLINK("' + urls.sn + '"; "Foto SN ONT")' : urls.sn; 
    row[28] = data.reporter_username; 
  }
  if (data.jenis_laporan === "kendala") {
    row[7] = "Kendala"; // Update Status IKR
    row[8] = "Kendala"; // Update Status Aktivasi
    row[21] = data.deskripsi_kendala; 
    row[29] = data.reporter_username; 
    row[30] = now; 
  }
}


// ==========================================
// FUNGSI MANAJEMEN TIM (JADWAL)
// ==========================================

function getTechnicians(stationName) {
  try {
    const ssMaster = SpreadsheetApp.openById(MASTER_VISIT_ID);
    const sheetTeknisi = ssMaster.getSheetByName("List_Teknisi");
    if (!sheetTeknisi) throw new Error("Sheet List_Teknisi tidak ditemukan.");
    
    const data = sheetTeknisi.getDataRange().getValues();
    let list = [];
    
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      let stasiun = String(row[3]).trim();
      if (stasiun.toLowerCase() === stationName.toLowerCase()) {
        list.push({
          chatId: String(row[0]),   // Kolom A
          username: row[1] || "-",  // Kolom B
          nama: row[2],             // Kolom C
          jabatan: row[4] || "-",   // Kolom E
          status: row[5] || "Libur" // Kolom F
        });
      }
    }

    // LOGIKA SORTING: Mengutamakan jabatan yang mengandung "TEAM LEADER"
    list.sort((a, b) => {
      const aIsTL = a.jabatan.toUpperCase().includes("TEAM LEADER");
      const bIsTL = b.jabatan.toUpperCase().includes("TEAM LEADER");
      if (aIsTL && !bIsTL) return -1;
      if (!aIsTL && bIsTL) return 1;
      return 0;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: list })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Fungsi untuk memperbarui status teknisi di Sheet List_Teknisi.
 */
function updateStatusTeknisi(payload) {
  try {
    const ssMaster = SpreadsheetApp.openById(MASTER_VISIT_ID);
    const sheetTeknisi = ssMaster.getSheetByName("List_Teknisi");
    if (!sheetTeknisi) throw new Error("Sheet List_Teknisi tidak ditemukan.");
    
    const data = sheetTeknisi.getDataRange().getValues();
    let targetRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(payload.chatId).trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow !== -1) {
      const statusFinal = payload.newStatus === "Masuk" ? "Masuk" : "Libur";
      sheetTeknisi.getRange(targetRow, 6).setValue(statusFinal); 
      return "Status " + payload.nama + " diubah menjadi " + statusFinal;
    }
    return "Gagal: Data tidak ditemukan.";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function up(b64, name, f) {
  if (!b64 || b64 === "" || b64 === "-") return "-";
  try {
    let fn = name + "_" + Utilities.formatDate(new Date(), "Asia/Jakarta", "ddMMyy_HHmm") + ".jpg";
    return f.createFile(Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", fn)).getUrl();
  } catch (e) { return "Error"; }
}

// ==========================================
// 3. FUNGSI PENDUKUNG MATERIAL & STOK
// ==========================================

// ==========================================
// 3. FUNGSI PENDUKUNG MATERIAL & STOK (SUPABASE SCM TRACKER)
// ==========================================

function getWarehouseMapping() {
  const whRes = callScmSupabase("warehouses?select=*&order=name.asc");
  return Array.isArray(whRes) ? whRes : [];
}

function getMaterialsMapping() {
  const matRes = callScmSupabase("materials?select=*&order=id.asc");
  return Array.isArray(matRes) ? matRes : [];
}

function findWarehouseId(whName, whList) {
  if (!whName || !whList || !Array.isArray(whList)) return null;
  const clean = whName.toLowerCase().replace(/^wh\s*/i, '').replace(/[^a-z0-9]/g, '');
  const found = whList.find(w => {
    const wName = (w.name || '').toLowerCase().replace(/^wh\s*/i, '').replace(/[^a-z0-9]/g, '');
    const wCity = (w.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return wName.includes(clean) || clean.includes(wName) || (wCity && (wCity.includes(clean) || clean.includes(wCity)));
  });
  return found ? found.id : null;
}

function resolveMaterialSku(name, allMats) {
  if (!name) return "";
  const clean = String(name).trim();
  if (allMats && Array.isArray(allMats)) {
    // 1. Match by exact ID
    const exactId = allMats.find(m => m.id && m.id.toLowerCase() === clean.toLowerCase());
    if (exactId) return exactId.id;
    // 2. Match if name format is "ID - Description"
    const prefixMatch = allMats.find(m => clean.toLowerCase().startsWith(m.id.toLowerCase() + " -") || clean.toLowerCase().startsWith(m.id.toLowerCase() + " "));
    if (prefixMatch) return prefixMatch.id;
    // 3. Match by description
    const descMatch = allMats.find(m => m.description && (m.description.toLowerCase() === clean.toLowerCase() || m.description.toLowerCase().includes(clean.toLowerCase()) || clean.toLowerCase().includes(m.description.toLowerCase())));
    if (descMatch) return descMatch.id;
  }
  return clean;
}

/**
 * 1. METADATA MATERIAL DARI SUPABASE SCM TRACKER:
 * Mengambil daftar gudang, master material standar, stok real-time, dan nomor PO.
 */
function getMaterialMetadata() {
  try {
    const warehouses = getWarehouseMapping();
    const materials = getMaterialsMapping();
    const invRes = callScmSupabase("inventory?select=*");
    const inventories = Array.isArray(invRes) ? invRes : [];

    // Map: warehouse_id -> { [material_id]: stock_qty }
    let stockByWhAndMat = {};
    let globalStockByMat = {};

    inventories.forEach(inv => {
      const whId = inv.warehouse_id;
      const matId = inv.material_id;
      const stock = Number(inv.stock_qty) || 0;
      if (!stockByWhAndMat[whId]) stockByWhAndMat[whId] = {};
      stockByWhAndMat[whId][matId] = stock;
      globalStockByMat[matId] = (globalStockByMat[matId] || 0) + stock;
    });

    let locations = [];
    let materialsByLocMap = {};
    let allMaterialsList = [];

    // Daftar Pasangan Precon (IKR Utama -> Distribusi Fallback)
    const PRECON_PAIRS = {
      "M-PR-IKR-50M": "M-PR-D-50M",
      "M-PR-IKR-100M": "M-PR-D-100M",
      "M-PR-IKR-150M": "M-PR-D-150M"
    };
    const PRECON_DIST_SKUS = ["M-PR-D-50M", "M-PR-D-100M", "M-PR-D-150M"];

    // Format material standar: "ID - Description"
    materials.forEach(m => {
      // Sembunyikan SKU Precon Distribusi duplikat dari tampilan bot
      if (PRECON_DIST_SKUS.includes(m.id)) return;

      let displayName = `${m.id} - ${m.description.replace(/^Material:\s*/i, '')}`;
      let totalStock = globalStockByMat[m.id] || 0;

      // Jika item Precon IKR, gabungkan total stok dengan Distribusi
      if (PRECON_PAIRS[m.id]) {
        let distSku = PRECON_PAIRS[m.id];
        totalStock += (globalStockByMat[distSku] || 0);
        displayName = `${m.id} - ${m.description.replace(/^Material:\s*Cable\s+IKR\s+/i, 'Drop Cable ').replace(/^Material:\s*/i, '')}`;
      }

      allMaterialsList.push({
        name: displayName,
        sku: m.id,
        desc: m.description.replace(/^Material:\s*/i, ''),
        uom: m.uom || 'Roll',
        stock: totalStock
      });
    });

    warehouses.forEach(wh => {
      const whName = (wh.name || "").trim(); // Format standar SCM: "WH Randublatung", "WH Meteseh", dll
      const whCleanName = whName.replace(/^WH\s*/i, '').trim();
      
      if (whName && !locations.includes(whName)) locations.push(whName);

      let whMatList = [];
      materials.forEach(m => {
        if (PRECON_DIST_SKUS.includes(m.id)) return;

        let displayName = `${m.id} - ${m.description.replace(/^Material:\s*/i, '')}`;
        let whStock = (stockByWhAndMat[wh.id] && stockByWhAndMat[wh.id][m.id]) ? stockByWhAndMat[wh.id][m.id] : 0;

        // Akumulasikan stok IKR + Distribusi untuk gudang ini
        if (PRECON_PAIRS[m.id]) {
          let distSku = PRECON_PAIRS[m.id];
          let distStock = (stockByWhAndMat[wh.id] && stockByWhAndMat[wh.id][distSku]) ? stockByWhAndMat[wh.id][distSku] : 0;
          whStock += distStock;
          displayName = `${m.id} - ${m.description.replace(/^Material:\s*Cable\s+IKR\s+/i, 'Drop Cable ').replace(/^Material:\s*/i, '')}`;
        }

        whMatList.push({
          name: displayName,
          sku: m.id,
          desc: m.description.replace(/^Material:\s*/i, ''),
          uom: m.uom || 'Roll',
          stock: whStock
        });
      });

      // Simpan pemetaan baik dengan format "WH ..." maupun nama kotanya agar fleksibel
      materialsByLocMap[whName] = whMatList;
      if (whCleanName) {
        materialsByLocMap[whCleanName] = whMatList;
      }
      if (wh.id) {
        materialsByLocMap[wh.id] = whMatList;
      }
    });

    // Ambil list PO dari Supabase po_requests
    let poList = [];
    try {
      const poRes = callScmSupabase("po_requests?select=no_rab,po_suplier&order=created_at.desc");
      if (Array.isArray(poRes)) {
        poRes.forEach(po => {
          if (po.no_rab && !poList.includes(po.no_rab)) poList.push(po.no_rab);
          if (po.po_suplier && !poList.includes(po.po_suplier)) poList.push(po.po_suplier);
        });
      }
    } catch (e) {
      console.log("Gagal ambil PO: " + e.message);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      locations: locations.sort(),
      materialsByLocation: materialsByLocMap,
      materials: allMaterialsList.sort((a, b) => a.name.localeCompare(b.name)),
      poList: poList
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. PENCARIAN OPEN MATERIAL DARI SUPABASE TECHNICIAN_LOGS:
 * Mengambil material yang sedang dibawa teknisi berstatus OPEN.
 * Difilter berdasarkan username dan lokasi gudang asal pengambilan.
 */
function getOpenMaterials(username, stasiun, gudang) {
  try {
    let cleanUser = String(username || "").split('@').join('').trim().toLowerCase();
    let cleanGudang = String(gudang || "").trim().toLowerCase();
    
    // Query Supabase technician_logs where status = OPEN
    const logsRes = callScmSupabase("technician_logs?status=eq.OPEN&order=created_at.desc");
    let list = [];

    if (Array.isArray(logsRes)) {
      logsRes.forEach(row => {
        let rowUser = String(row.username || "").split('@').join('').trim().toLowerCase();
        let rowGudang = String(row.warehouse_name || "").trim().toLowerCase();

        // Validasi kepemilikan teknisi
        if (rowUser !== cleanUser && cleanUser !== "") return;

        // Validasi gudang asal: Hanya tampilkan barang yang diambil dari gudang yang sedang dipilih
        if (cleanGudang !== "") {
          if (rowGudang !== cleanGudang && !rowGudang.includes(cleanGudang) && !cleanGudang.includes(rowGudang)) {
            return;
          }
        }

        let tglStr = "-";
        if (row.created_at) {
          try {
            let d = new Date(row.created_at);
            tglStr = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM HH:mm");
          } catch (err) {
            tglStr = String(row.created_at).substring(0, 16);
          }
        }
        list.push({
          id: row.id,
          waktu: tglStr,
          material: row.material_name || row.material_id,
          material_id: row.material_id,
          qty: Number(row.qty_take) || 0,
          stasiun: row.station || "-",
          gudang: row.warehouse_name || "-",
          warehouse_id: row.warehouse_id || ""
        });
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: list,
      username_debug: cleanUser,
      gudang_debug: cleanGudang
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message, data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. FUNGSI PUSAT PENGOLAHAN MATERIAL:
 * Menyimpan data Ambil, Kembali, dan Input ke Supabase SCM Tracker serta upload bukti ke Drive.
 */
function processMaterialLog(p) {
  const now = new Date();
  let safePetugas = String(p.petugas || "").trim();
  if (!safePetugas.startsWith('@')) safePetugas = "@" + safePetugas;

  let linkFoto = "-";
  let linkFoto2 = "-";

  // Upload Foto Evidence ke Google Drive
  if (p.foto && p.foto !== "" && p.foto !== "-") {
    try {
      const namaGudang = "Gudang " + p.lokasi_gudang;
      let targetFolder;
      if (p.transaksi === "input") {
        const parentSuratJalan = DriveApp.getFolderById(FOLDER_SURAT_JALAN_ID);
        targetFolder = getOrCreateFolder(parentSuratJalan, namaGudang);
      } else {
        const parentReportFolder = DriveApp.getFolderById(FOLDER_REPORT_MATERIAL_ID);
        targetFolder = getOrCreateFolder(parentReportFolder, namaGudang);
      }

      let filePrefix = p.transaksi === "input" ? "SJ" : p.transaksi.toUpperCase();
      let fileName = `${filePrefix}_${safePetugas}_${Utilities.formatDate(now, "Asia/Jakarta", "ddMMyy_HHmm")}`;
      let blob = Utilities.newBlob(Utilities.base64Decode(p.foto), "image/jpeg", fileName + ".jpg");
      let file = targetFolder.createFile(blob);
      linkFoto = file.getUrl();

      if (p.transaksi === "input" && p.foto2 && p.foto2 !== "" && p.foto2 !== "-") {
        let fileName2 = `MAT_MASUK_${safePetugas}_${Utilities.formatDate(now, "Asia/Jakarta", "ddMMyy_HHmm")}`;
        let blob2 = Utilities.newBlob(Utilities.base64Decode(p.foto2), "image/jpeg", fileName2 + ".jpg");
        let file2 = targetFolder.createFile(blob2);
        linkFoto2 = file2.getUrl();
      }
    } catch(e) {
      linkFoto = "Error Upload Foto: " + e.message;
    }
  }

  const warehouses = getWarehouseMapping();
  const materials = getMaterialsMapping();
  const whId = findWarehouseId(p.lokasi_gudang, warehouses) || p.lokasi_gudang;

  p.items.forEach((item, idx) => {
    let skuId = resolveMaterialSku(item.nama, materials);
    let itemQty = Number(item.qty) || 0;
    let pekerjaanAktual = p.pekerjaan || "-";

    // 1. TRANSAKSI PENGEMBALIAN (KEMBALI)
    if (p.transaksi === "kembali" && item.id_ref) {
      // Ambil data lama dari technician_logs
      let oldLogRes = callScmSupabase("technician_logs?id=eq." + encodeURIComponent(item.id_ref));
      let oldLog = Array.isArray(oldLogRes) && oldLogRes.length > 0 ? oldLogRes[0] : null;
      
      // Tentukan gudang ASAL pengambilan agar lurus 100%
      let originWhId = oldLog && oldLog.warehouse_id ? oldLog.warehouse_id : (whId || findWarehouseId(p.lokasi_gudang, warehouses));
      let originWhName = oldLog && oldLog.warehouse_name ? oldLog.warehouse_name : p.lokasi_gudang;

      let qtyAmbil = oldLog ? (Number(oldLog.qty_take) || 0) : itemQty;
      pekerjaanAktual = oldLog && oldLog.work_order ? oldLog.work_order : (p.pekerjaan || "-");
      let qtyKembali = itemQty;
      let qtyPakai = Math.max(0, qtyAmbil - qtyKembali);

      item.qtyAmbil = qtyAmbil;
      item.qtyPakai = qtyPakai;
      skuId = oldLog && oldLog.material_id ? oldLog.material_id : skuId;

      // Update technician_logs jadi CLOSED
      callScmSupabase("technician_logs?id=eq." + encodeURIComponent(item.id_ref), "PATCH", {
        status: "CLOSED",
        qty_return: qtyKembali,
        qty_used: qtyPakai,
        closed_at: now.toISOString(),
        notes: (p.keterangan ? p.keterangan + " | " : "") + `Ambil: ${qtyAmbil}, Pakai: ${qtyPakai}, Kembali: ${qtyKembali}`
      });

      // Kembalikan sisa fisik LURUS ke gudang ASAL pengambilan
      if (qtyKembali > 0 && originWhId && skuId) {
        const PRECON_PAIRS = {
          "M-PR-IKR-50M": "M-PR-D-50M",
          "M-PR-IKR-100M": "M-PR-D-100M",
          "M-PR-IKR-150M": "M-PR-D-150M"
        };
        let targetReturnSku = PRECON_PAIRS[skuId] ? skuId : (Object.keys(PRECON_PAIRS).find(k => PRECON_PAIRS[k] === skuId) || skuId);

        let invRes = callScmSupabase("inventory?warehouse_id=eq." + encodeURIComponent(originWhId) + "&material_id=eq." + encodeURIComponent(targetReturnSku));
        if (Array.isArray(invRes) && invRes.length > 0) {
          let currentStock = Number(invRes[0].stock_qty) || 0;
          callScmSupabase("inventory?id=eq." + invRes[0].id, "PATCH", {
            stock_qty: currentStock + qtyKembali,
            last_updated: now.toISOString()
          });
        }
      }

      // Catat mutasi pengembalian untuk Log Transaksi SCM LURUS ke gudang ASAL
      if (qtyKembali > 0) {
        const PRECON_PAIRS = {
          "M-PR-IKR-50M": "M-PR-D-50M",
          "M-PR-IKR-100M": "M-PR-D-100M",
          "M-PR-IKR-150M": "M-PR-D-150M"
        };
        let targetReturnSku = PRECON_PAIRS[skuId] ? skuId : (Object.keys(PRECON_PAIRS).find(k => PRECON_PAIRS[k] === skuId) || skuId);

        callScmSupabase("mutations", "POST", [{
          id: "MUT-RET-" + Date.now() + "-" + idx,
          date: Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"),
          source_warehouse: "Teknisi: " + safePetugas,
          dest_warehouse: originWhName,
          material_id: targetReturnSku,
          qty: qtyKembali
        }]);
      }

    } else if (p.transaksi === "ambil") {
      // 2. TRANSAKSI PENGAMBILAN (AMBIL)
      const logId = "TLOG-" + Date.now() + "-" + (idx + 1);

      // Cek apakah item adalah Precon dengan prioritas IKR -> Fallback Distribusi
      const PRECON_PAIRS = {
        "M-PR-IKR-50M": "M-PR-D-50M",
        "M-PR-IKR-100M": "M-PR-D-100M",
        "M-PR-IKR-150M": "M-PR-D-150M"
      };

      let targetIkrSku = PRECON_PAIRS[skuId] ? skuId : (Object.keys(PRECON_PAIRS).find(k => PRECON_PAIRS[k] === skuId) || null);
      let targetDistSku = targetIkrSku ? PRECON_PAIRS[targetIkrSku] : null;

      if (targetIkrSku && targetDistSku && whId) {
        // Cek stok IKR & Distribusi di gudang terkait
        let invIkr = callScmSupabase("inventory?warehouse_id=eq." + encodeURIComponent(whId) + "&material_id=eq." + encodeURIComponent(targetIkrSku));
        let invDist = callScmSupabase("inventory?warehouse_id=eq." + encodeURIComponent(whId) + "&material_id=eq." + encodeURIComponent(targetDistSku));

        let stockIkr = (Array.isArray(invIkr) && invIkr.length > 0) ? (Number(invIkr[0].stock_qty) || 0) : 0;
        let stockDist = (Array.isArray(invDist) && invDist.length > 0) ? (Number(invDist[0].stock_qty) || 0) : 0;

        let ambilIkr = 0;
        let ambilDist = 0;

        if (stockIkr >= itemQty) {
          ambilIkr = itemQty;
        } else {
          ambilIkr = Math.max(0, stockIkr);
          ambilDist = itemQty - ambilIkr;
        }

        // Potong stok IKR jika ada
        if (ambilIkr > 0 && Array.isArray(invIkr) && invIkr.length > 0) {
          callScmSupabase("inventory?id=eq." + invIkr[0].id, "PATCH", {
            stock_qty: stockIkr - ambilIkr,
            last_updated: now.toISOString()
          });
          callScmSupabase("outbounds", "POST", [{
            id: Date.now() + idx,
            warehouse: p.lokasi_gudang,
            pic: safePetugas,
            spk: pekerjaanAktual,
            date: Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd"),
            timestamp: Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
            created_at: now.toISOString(),
            material_id: targetIkrSku,
            qty: ambilIkr
          }]);
        }

        // Potong stok Distribusi (Fallback) jika stok IKR habis/kurang
        if (ambilDist > 0 && Array.isArray(invDist) && invDist.length > 0) {
          callScmSupabase("inventory?id=eq." + invDist[0].id, "PATCH", {
            stock_qty: Math.max(0, stockDist - ambilDist),
            last_updated: now.toISOString()
          });
          callScmSupabase("outbounds", "POST", [{
            id: Date.now() + idx + 999,
            warehouse: p.lokasi_gudang,
            pic: safePetugas,
            spk: pekerjaanAktual + " (Fallback Distribusi)",
            date: Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd"),
            timestamp: Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
            created_at: now.toISOString(),
            material_id: targetDistSku,
            qty: ambilDist
          }]);
        }

        // Simpan ke technician_logs
        let alokasiKet = ambilDist > 0 ? `(Alokasi: ${ambilIkr} IKR, ${ambilDist} Distribusi)` : `(Alokasi: ${ambilIkr} IKR)`;
        callScmSupabase("technician_logs", "POST", [{
          id: logId,
          username: safePetugas,
          warehouse_id: whId,
          warehouse_name: p.lokasi_gudang,
          station: p.stasiun,
          work_order: pekerjaanAktual,
          material_id: targetIkrSku,
          material_name: item.nama,
          qty_take: itemQty,
          qty_return: 0,
          qty_used: 0,
          status: "OPEN",
          notes: (p.keterangan ? p.keterangan + " • " : "") + alokasiKet,
          photo_url: linkFoto
        }]);

      } else {
        // Material Standar Reguler (Non-Precon)
        callScmSupabase("technician_logs", "POST", [{
          id: logId,
          username: safePetugas,
          warehouse_id: whId,
          warehouse_name: p.lokasi_gudang,
          station: p.stasiun,
          work_order: pekerjaanAktual,
          material_id: skuId,
          material_name: item.nama,
          qty_take: itemQty,
          qty_return: 0,
          qty_used: 0,
          status: "OPEN",
          notes: p.keterangan || "-",
          photo_url: linkFoto
        }]);

        callScmSupabase("outbounds", "POST", [{
          id: Date.now() + idx,
          warehouse: p.lokasi_gudang,
          pic: safePetugas,
          spk: pekerjaanAktual,
          date: Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd"),
          timestamp: Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
          created_at: now.toISOString(),
          material_id: skuId,
          qty: itemQty
        }]);

        if (whId && skuId) {
          let invRes = callScmSupabase("inventory?warehouse_id=eq." + encodeURIComponent(whId) + "&material_id=eq." + encodeURIComponent(skuId));
          if (Array.isArray(invRes) && invRes.length > 0) {
            let currentStock = Number(invRes[0].stock_qty) || 0;
            let newStock = Math.max(0, currentStock - itemQty);
            callScmSupabase("inventory?id=eq." + invRes[0].id, "PATCH", {
              stock_qty: newStock,
              last_updated: now.toISOString()
            });
          }
        }
      }
    } else if (p.transaksi === "input") {
      // 3. TRANSAKSI PENERIMAAN DARI SUPPLIER (RESTOCK MASUK)
      const receiptId = "RCV-BOT-" + Date.now() + "-" + (idx + 1);

      // A. Simpan Header ke tabel receipts (Supabase SCM Tracker)
      callScmSupabase("receipts", "POST", [{
        id: receiptId,
        date: Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
        warehouse_name: p.lokasi_gudang,
        ref: p.po || "Internal",
        site_name: p.stasiun || "-",
        surat_jalan: linkFoto.startsWith("http") ? linkFoto : (p.po || "SJ-Telegram"),
        po_suplier: p.po || "-",
        suplier: p.supplier || "-",
        driver: safePetugas
      }]);

      // B. Simpan Item ke tabel receipt_items
      callScmSupabase("receipt_items", "POST", [{
        id: Date.now() + idx,
        receipt_id: receiptId,
        material_id: skuId,
        expected_qty: itemQty,
        actual_qty: itemQty,
        selisih: 0
      }]);

      // C. Tambah Stok Fisik ke tabel inventory di Gudang Terkait
      if (whId && skuId) {
        let invRes = callScmSupabase("inventory?warehouse_id=eq." + encodeURIComponent(whId) + "&material_id=eq." + encodeURIComponent(skuId));
        if (Array.isArray(invRes) && invRes.length > 0) {
          let currentStock = Number(invRes[0].stock_qty) || 0;
          callScmSupabase("inventory?id=eq." + invRes[0].id, "PATCH", {
            stock_qty: currentStock + itemQty,
            last_updated: now.toISOString()
          });
        } else {
          callScmSupabase("inventory", "POST", [{
            warehouse_id: whId,
            material_id: skuId,
            stock_qty: itemQty,
            last_updated: now.toISOString()
          }]);
        }
      }
    }
  });

  // Bersihkan cache
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll([
      "MATERIAL_METADATA",
      "OPEN_MAT_" + safePetugas,
      "OPEN_MAT_" + p.stasiun + "_" + safePetugas
    ]);
  } catch (e) {
    console.log("Cache clear err: " + e.message);
  }

  // Kirim notifikasi rekap ke grup Telegram
  kirimNotifTelegramMaterial(p, linkFoto, linkFoto2);

  return "Laporan Material sukses dicatat di Supabase SCM Tracker.";
}

// ========================================================
// FUNGSI BANTUAN BUAT FOLDER DINAMIS
// ========================================================
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    let newFolder = parentFolder.createFolder(folderName);
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFolder;
  }
}


// ========================================================
// FUNGSI PENGIRIM PUSAT NOTIFIKASI TELEGRAM
// ========================================================
function kirimNotifTelegram(data, links, mainPhotoBase64, namaPelanggan, hpPelanggan) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "ISI_TOKEN_BOT_ANDA_DISINI") return;

  function esc(str) {
    if (!str) return "-";
    return String(str).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }

  let d = new Date();
  let tgl = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy HH:mm");
  let fileTime = Utilities.formatDate(d, "Asia/Jakarta", "ddMMyy_HHmm");
  let jenis = String(data.jenis_laporan).toUpperCase();

  // 1. BAGIAN HEADER
  let titleBadge = "";
  if (jenis === "VISIT") titleBadge = "🆘 [ VISIT GANGGUAN ]";
  else if (jenis === "DISMANTLE") titleBadge = "📦 [ DISMANTLE ]";
  else if (jenis === "KENDALA") titleBadge = "⛔ [ KENDALA ]";
  else if (jenis === "IKR") titleBadge = "🏠 [ IKR ]";
  else if (jenis === "AKTIVASI") titleBadge = "🛜 [ AKTIVASI ]";
  else if (jenis === "IKR_AKTIVASI") titleBadge = "🚀 [ IKR & AKTIVASI ]";
  else titleBadge = `📋 [ ${esc(jenis).replace("_", " & ")} ]`;

  let msg = `<b>${titleBadge} - NEW REPORT ‼️</b>

`;
  msg += `--------------------------------------------------
`;
  msg += `🕘 Waktu : ${tgl}
`;
  msg += `👷‍♂️ Petugas : ${esc(data.reporter_username)}
`;
  msg += `--------------------------------------------------

`;

  // 2. BAGIAN DATA PELANGGAN
  msg += `👤 <b>INFO PELANGGAN</b>
`;
  let infoPelanggan = [];
  infoPelanggan.push(`ID : ${esc(data.id_pelanggan)}`);
  infoPelanggan.push(`Nama : ${esc(namaPelanggan)}`);
  
  // [+] HANYA MUNCUL DI SINI JIKA LAPORANNYA ADALAH "KENDALA"
  if (jenis === "KENDALA") {
    infoPelanggan.push(`Stasiun : ${esc(data.nama_stasiun)}`);
  }

  let hpClean = "-";
  if (hpPelanggan && hpPelanggan !== "-") {
    hpClean = hpPelanggan.replace(/[^0-9]/g, '');
    if (hpClean.startsWith("0")) hpClean = "62" + hpClean.substring(1);
    infoPelanggan.push(`Kontak : <a href="https://wa.me/${hpClean}">${esc(hpPelanggan)}</a>`);
  } else {
    infoPelanggan.push(`Kontak : -`);
  }

  if (data.alamat_pelanggan && data.alamat_pelanggan !== "-") {
    infoPelanggan.push(`Alamat : ${esc(data.alamat_pelanggan)}`);
  }

  let gpsValid = data.lokasi_gps && data.lokasi_gps !== "-" && data.lokasi_gps !== "" && data.lokasi_gps !== "null" && data.lokasi_gps !== "undefined";
  if (gpsValid) {
    msg += `├ Lokasi : <a href="https://maps.google.com/?q=${esc(data.lokasi_gps)}">${esc(data.lokasi_gps)}</a>
`;
  }

  for (let i = 0; i < infoPelanggan.length; i++) {
    let prefix = (i === infoPelanggan.length - 1 && !gpsValid) ? "└" : "├";
    msg += `${prefix} ${infoPelanggan[i]}
`;
  }
  
  if (!gpsValid) {
     msg += `└ Lokasi : -
`;
  }
  msg += `
`;

  // 3. BAGIAN DATA TEKNIS (Hanya muncul jika BUKAN KENDALA)
  if (jenis !== "KENDALA") {
    msg += `⚙️ <b>DATA TEKNIS</b>
`;
    let dataTeknis = [];
    
    // [+] MUNCUL DI SINI UNTUK LAPORAN SELAIN KENDALA (Visit, IKR, dll)
    dataTeknis.push(`Stasiun : ${esc(data.nama_stasiun)}`);
    
    let valOdp = data.kode_odp && data.kode_odp !== "-" && data.kode_odp !== "undefined" ? data.kode_odp : "-";
    let valPort = data.port_odp && data.port_odp !== "-" && data.port_odp !== "undefined" ? data.port_odp : "-";
    
    dataTeknis.push(`ODP : ${esc(valOdp)}`);
    dataTeknis.push(`Port : ${esc(valPort)}`);
    
    if (jenis !== "IKR") {
      let valSn = data.sn_ont && data.sn_ont !== "-" && data.sn_ont !== "undefined" ? data.sn_ont : "-";
      dataTeknis.push(`SN ONT : ${esc(valSn)}`); 
    }
    
    if (data.pemakaian_precon && data.pemakaian_precon !== "-") {
      dataTeknis.push(`Precon : ${esc(data.pemakaian_precon)}`);
    }

    for (let i = 0; i < dataTeknis.length; i++) {
      let prefix = (i === dataTeknis.length - 1) ? "└" : "├";
      msg += `${prefix} ${dataTeknis[i]}
`;
    }
    msg += `
`;
  }

  // 4. BAGIAN DETAIL TINDAKAN
  msg += `📝 <b>DETAIL LAPORAN</b>
`;
  if (jenis === "DISMANTLE") {
    msg += `└ Alasan: ${esc(data.alasan_dismantle)}
`;
  } else if (jenis === "VISIT") {
    msg += `├ Penyebab: ${esc(data.penyebab)}
`;
    if (data.material && data.material !== "-") {
      msg += `├ Tindakan: ${esc(data.perbaikan)}
`;
      msg += `└ Material: ${esc(data.material)}
`;
    } else {
      msg += `└ Tindakan: ${esc(data.perbaikan)}
`;
    }
  } else if (jenis === "KENDALA") {
    msg += `└ Kendala: ${esc(data.deskripsi_kendala)}
`;
  } else if (jenis === "IKR") {
    msg += `└ Pekerjaan: Instalasi Jaringan Baru
`;
  } else if (jenis === "AKTIVASI") {
    msg += `└ Pekerjaan: Aktivasi Layanan
`;
  } else if (jenis === "IKR_AKTIVASI") {
    msg += `└ Pekerjaan: Instalasi dan Aktivasi Layanan
`;
  } else {
    msg += `└ Pekerjaan: Instalasi / Aktivasi Jaringan Baru
`;
  }
  msg += `
`;

  // 5. BAGIAN HYPERLINK BUKTI FOTO
  if (Object.keys(links).length > 0) {
    msg += `📎 <b>FILE EVIDENCE:</b>
`;
    let count = 0;
    let entries = Object.entries(links);
    for (const [key, url] of entries) {
      count++;
      let prefix = (count === entries.length) ? "└" : "├";
      if (url && url !== "-") msg += `${prefix} 🔗 <a href="${url}">${esc(key)}</a>
`;
    }
  }

  msg += `
© <i>Starlite Support By Desnarum</i>`;

  let baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`;
  
  if (mainPhotoBase64 && mainPhotoBase64 !== "-") {
    try {
      let tgFileName = `${data.id_pelanggan}_EVIDENCE_${fileTime}.jpg`;
      let blob = Utilities.newBlob(Utilities.base64Decode(mainPhotoBase64), 'image/jpeg', tgFileName);
      let options = {
        method: "post",
        muteHttpExceptions: true,
        payload: {
          chat_id: TELEGRAM_GROUP_ID,
          photo: blob,
          caption: msg,
          parse_mode: "HTML"
        }
      };
      
      let res = UrlFetchApp.fetch(baseUrl + "sendPhoto", options);
      let resJson = JSON.parse(res.getContentText());
      if (resJson.ok) return; 
      console.log("Telegram Error (Photo): " + res.getContentText());
    } catch (e) {
      console.log("Gagal kirim foto: " + e.message);
    }
  }

  try {
    let textOptions = {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    };
    UrlFetchApp.fetch(baseUrl + "sendMessage", textOptions);
  } catch (e) {
    console.log("Gagal kirim teks fallback: " + e.message);
  }
}

// ========================================================
// FUNGSI KHUSUS NOTIFIKASI TELEGRAM REPORT MATERIAL
// ========================================================
function kirimNotifTelegramMaterial(data, urlFotoEvidence, urlFotoEvidence2) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "ISI_TOKEN_BOT_ANDA_DISINI") return;

  function esc(str) {
    if (!str) return "-";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  let d = new Date();
  let tgl = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy HH:mm");
  let transType = String(data.transaksi).toLowerCase();
  
  // 1. BAGIAN HEADER
  let titleBadge = "";
  if (transType === "ambil") titleBadge = "📦 [ AMBIL MATERIAL ]";
  else if (transType === "kembali") titleBadge = "↩️ [ PENGEMBALIAN MATERIAL ]";
  else if (transType === "input") titleBadge = "🚚 [ INPUT MATERIAL MASUK ]";
  else titleBadge = `📦 [ ${esc(transType).toUpperCase()} MATERIAL ]`;

  let msg = `<b>${titleBadge} - NEW REPORT ‼️</b>

`;
  msg += `--------------------------------------------------
`;
  msg += `🕘 Waktu : ${tgl}
`;
  msg += `👷‍♂️ Petugas : ${esc(data.petugas)}
`;
  msg += `--------------------------------------------------

`;

  // 2. BAGIAN DETAIL TRANSAKSI
  msg += `🔄️ <b>DETAIL TRANSAKSI</b>
`;
  msg += `├ Alokasi Site : ${esc(data.stasiun)}
`;
  msg += `├ Gudang : ${esc(data.lokasi_gudang)}
`;
  
  if (transType === "ambil") {
    msg += `└ Pekerjaan : ${esc(data.pekerjaan)}
`;
  } else if (transType === "input") {
    msg += `├ Supplier : ${esc(data.supplier)}
`;
    msg += `└ No. PO : ${esc(data.po)}
`;
  } else {
    msg += `└ Note : Pengembalian Sisa Material
`;
  }
  msg += `
`;

  // 3. BAGIAN DAFTAR MATERIAL
  msg += `📋 <b>DAFTAR MATERIAL</b>
`;
  if (data.items && data.items.length > 0) {
    for (let i = 0; i < data.items.length; i++) {
      let prefix = (i === data.items.length - 1) ? "└" : "├";
      
      // [+] PERBAIKAN: Menampilkan Ambil dan Pakai khusus untuk pengembalian
      if (transType === "kembali") {
        let qAmbil = data.items[i].qtyAmbil || 0;
        let qPakai = data.items[i].qtyPakai || 0;
        msg += `${prefix} ${esc(data.items[i].nama)} : <b>${data.items[i].qty}</b> (Ambil: ${qAmbil} | Pakai: ${qPakai})
`;
      } else {
        msg += `${prefix} ${esc(data.items[i].nama)} : <b>${data.items[i].qty}</b>
`;
      }
    }
  } else {
    msg += `└ Tidak ada item
`;
  }
  msg += `
`;

  // 4. BAGIAN CATATAN TAMBAHAN
  if (data.keterangan && data.keterangan.trim() !== "") {
    msg += `📝 <b>CATATAN</b>
`;
    msg += `└ ${esc(data.keterangan)}

`;
  }

  // 5. HYPERLINK BUKTI FOTO
  if (transType === "input") {
    msg += `📎 <b>FILE EVIDENCE:</b>
`;
    let line1 = "";
    let line2 = "";
    
    if (urlFotoEvidence && urlFotoEvidence !== "-") {
      line1 = `├ 🔗 <a href="${urlFotoEvidence}">Foto Surat Jalan</a>
`;
    }
    if (urlFotoEvidence2 && urlFotoEvidence2 !== "-") {
      line2 = `└ 🔗 <a href="${urlFotoEvidence2}">Foto Material Diterima</a>

`;
    }
    
    if (line1 !== "" && line2 === "") line1 = line1.replace("├", "└") + "\n";
    if (line1 === "" && line2 !== "") line2 = line2.replace("└", "├");
    
    msg += line1 + line2;
    if (!line1 && !line2) msg += `└ Tidak ada foto

`;
    
  } else {
    if (urlFotoEvidence && urlFotoEvidence !== "-") {
      msg += `📎 <b>FILE EVIDENCE:</b>
`;
      msg += `└ 🔗 <a href="${urlFotoEvidence}">Foto Transaksi</a>

`;
    }
  }

  msg += `© <i>Starlite Support By Desnarum</i>`;

  let baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`;
  
  // Kirim Gambar Utama
  if (data.foto && data.foto !== "-") {
    try {
      let tgFileName = `MAT_${transType.toUpperCase()}_${Utilities.formatDate(d, "Asia/Jakarta", "ddMMyy_HHmm")}.jpg`;
      let blob = Utilities.newBlob(Utilities.base64Decode(data.foto), 'image/jpeg', tgFileName);
      let options = {
        method: "post",
        muteHttpExceptions: true,
        payload: {
          chat_id: TELEGRAM_GROUP_ID,
          photo: blob,
          caption: msg,
          parse_mode: "HTML"
        }
      };
      let res = UrlFetchApp.fetch(baseUrl + "sendPhoto", options);
      let resJson = JSON.parse(res.getContentText());
      if (resJson.ok) return; 
      console.log("Telegram Error (Material Photo): " + res.getContentText());
    } catch (e) {
      console.log("Gagal kirim foto material: " + e.message);
    }
  }

  // Fallback Kirim Teks Saja
  try {
    let textOptions = {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text: msg,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    };
    UrlFetchApp.fetch(baseUrl + "sendMessage", textOptions);
  } catch (e) {
    console.log("Gagal kirim teks fallback material: " + e.message);
  }
}

function getDailyPlanData(stationName) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheetMaster = ss.getSheetByName("List_Teknisi");
    if (!sheetMaster) throw new Error("Sheet List_Teknisi tidak ditemukan");
    
    let masterData = sheetMaster.getDataRange().getValues();
    let masterList = [];
    let stationLookup = {}; // Map untuk mencari stasiun asal berdasarkan ChatID jika di plotting kosong
    
    // Iterasi Database Teknisi Utama
    for (let i = 1; i < masterData.length; i++) {
      let chatId = String(masterData[i][0]).trim();
      let stasiunAsal = String(masterData[i][3]).trim();
      let jabatan = String(masterData[i][4]).trim();
      
      // Filter Keamanan: Hanya yang memiliki Jabatan
      if (chatId && jabatan && jabatan !== "" && jabatan !== "-") {
        stationLookup[chatId] = stasiunAsal; // Simpan ke memory lookup
        masterList.push({
          chatId: chatId,
          username: String(masterData[i][1]).trim(),
          nama: String(masterData[i][2]).trim(),
          stasiun: stasiunAsal,
          jabatan: jabatan,
          status: String(masterData[i][5]).trim() || "Masuk"
        });
      }
    }
    
    let sheetPlotting = ss.getSheetByName("Plotting_Tim") || ss.insertSheet("Plotting_Tim");
    let plotData = sheetPlotting.getDataRange().getValues();
    let currentTeam = [];
    
    // Iterasi Tabel Plotting Harian
    for (let i = 1; i < plotData.length; i++) {
      // Filter berdasarkan stasiun yang sedang dibuka di Web App
      if (String(plotData[i][0]).trim().toLowerCase() === String(stationName).toLowerCase()) {
        let cId = String(plotData[i][1]).trim();
        
        /**
         * LOGIKA PENYELAMAT STASIUN:
         * 1. Ambil dari Kolom G (Index 6) di Plotting_Tim
         * 2. Jika G kosong, cari berdasarkan ChatID di stationLookup (Master List)
         * 3. Jika tetap tidak ada, tampilkan tanda strip
         */
        let originSt = String(plotData[i][6] || stationLookup[cId] || "-").trim();
        
        currentTeam.push({
          chatId: cId,
          nama: String(plotData[i][2]).trim(),
          jabatan: String(plotData[i][3]).trim(),
          username: String(plotData[i][4]).trim(),
          status: String(plotData[i][5]).trim() || "Masuk",
          stasiun: originSt // Stasiun asal yang benar sekarang terkirim
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      masterList: masterList, 
      currentTeam: currentTeam 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: e.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 5. FUNGSI LOGIKA TIM (UPDATE TERBARU)
// ==========================================

/**
 * Menambahkan Teknisi ke Plotting Harian
 * Menyimpan identitas Station Origin di kolom ke-7 (Idx 6)
 */
function addTechnicianToDailyPlan(payload) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    let sheetPlotting = ss.getSheetByName("Plotting_Tim") || ss.insertSheet("Plotting_Tim");
    let tek = payload.technician;
    
    // Urutan kolom harus: Stasiun Plot, ChatID, Nama, Jabatan, Username, Status, Stasiun Asal
    sheetPlotting.appendRow([
      payload.station, 
      String(tek.chatId), 
      tek.nama, 
      tek.jabatan, 
      tek.username, 
      "Masuk", 
      tek.stasiun // Kolom G: Penting agar label stasiun asal tidak hilang
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menghapus Teknisi dari Plotting Harian
 * CATATAN: Ini hanya menghapus dari jadwal kerja HARI INI, 
 * TIDAK menghapus teknisi dari database utama (List_Teknisi).
 */
function removeTechnicianFromDailyPlan(payload) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    let sheetPlotting = ss.getSheetByName("Plotting_Tim");
    let data = sheetPlotting.getDataRange().getValues();
    let targetChatId = String(payload.chatId).trim();
    let targetStation = String(payload.station).trim().toLowerCase();
    
    // Scan dari bawah ke atas
    for (let i = data.length - 1; i >= 1; i--) {
      let rowStation = String(data[i][0]).trim().toLowerCase();
      let rowChatId = String(data[i][1]).trim();

      if (rowStation === targetStation && rowChatId === targetChatId) {
        sheetPlotting.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    throw new Error("Data tidak ditemukan di database.");
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Mengubah Status Teknisi (Masuk / Libur)
 * Sinkronisasi ke Plotting_Tim dan List_Teknisi
 */
function updateStatusTeknisi(payload) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const chatId = String(payload.chatId).trim();
    const newStatus = payload.status;

    // 1. Update pada Sheet Plotting_Tim (Attendance harian)
    const sheetPlotting = ss.getSheetByName("Plotting_Tim");
    if (sheetPlotting) {
      const dataPlot = sheetPlotting.getDataRange().getValues();
      for (let i = 1; i < dataPlot.length; i++) {
        if (String(dataPlot[i][1]).trim() === chatId) {
          sheetPlotting.getRange(i + 1, 6).setValue(newStatus); // Kolom F
        }
      }
    }
    
    // 2. Update pada Sheet List_Teknisi (Database Utama)
    const sheetMaster = ss.getSheetByName("List_Teknisi");
    if (sheetMaster) {
      const dataMaster = sheetMaster.getDataRange().getValues();
      for (let i = 1; i < dataMaster.length; i++) {
        if (String(dataMaster[i][0]).trim() === chatId) {
          sheetMaster.getRange(i + 1, 6).setValue(newStatus); // Kolom F
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
     return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


// ========================================================
// FUNGSI KIRIM NOTIF DAILY PLAN KE TELEGRAM
// ========================================================
function kirimNotifikasiDailyPlan(data) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "ISI_TOKEN_BOT_ANDA_DISINI") return "Token belum diisi";

  function esc(str) {
  // 1. Cek ketat agar angka 0 tidak dianggap kosong
  if (str === undefined || str === null || str === "") return "-";
  
  // 2. Mencegah double escape menggunakan negative lookahead regex
  return String(str)
    .replace(/&(?!(amp|lt|gt|quot);)/ig, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

  let d = new Date();
  let tgl = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy");

  let msg = `<b>📋 [ DAILY PLAN ] - ${esc(data.stasiun).toUpperCase()}</b>

`;
  msg += `--------------------------------------------------
`;
  msg += `📅 Tanggal : ${tgl}
`;
  msg += `👨‍💼 TL : ${esc(data.pengirim)}
`;
  msg += `--------------------------------------------------

`;

  msg += `👷‍♂️ <b>TIM BERTUGAS HARI INI</b>
`;
  if (data.tim && data.tim.length > 0) {
      data.tim.forEach((t, i) => {
          let prefix = (i === data.tim.length - 1) ? "└" : "├";
          let uname = t.username ? (t.username.startsWith('@') ? t.username : '@' + t.username) : '';
          msg += `${prefix} ${esc(t.nama)} ${uname}
`;
      });
  } else {
      msg += `└ (Belum ada tim yang di-plot)
`;
  }
  msg += `
`;

  msg += `🎯 <b>PRIORITAS IKR HARI INI</b>
`;
  if (data.ikr && data.ikr.length > 0) {
      data.ikr.forEach((c, i) => {
          let prefix = (i === data.ikr.length - 1) ? "└" : "├";
          msg += `${prefix} <b>${esc(c.nama)}</b> (${esc(c.id)})
`;
      });
  } else {
      msg += `└ (Belum ada target IKR)
`;
  }

  msg += `
© <i>Starlite Support By Desnarum</i>`;

  let baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  let options = {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
          chat_id: TELEGRAM_GROUP_ID,
          text: msg,
          parse_mode: "HTML",
          disable_web_page_preview: true
      })
  };

  try {
      UrlFetchApp.fetch(baseUrl, options);
      return "Notifikasi terkirim";
  } catch (e) {
      return "Gagal kirim notif: " + e.message;
  }
}


// ========================================================
// FUNGSI SIMPAN INPUT VISIT KE SHEET Visit_Log
// ========================================================
function simpanRekapVisit(payload) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    let sheet = ss.getSheetByName("Visit_Log");
    
    if (!sheet) {
        sheet = ss.insertSheet("Visit_Log");
        sheet.appendRow([
          "Timestamp", "ID", "Nama Pelanggan", "Stasiun", "Keluhan", 
          "Deskripsi / Catatan", "Status Visit", "ODP", "Port", "SN ONT", 
          "Kontak", "Latitude", "Longitude", "Penyebab", "Perbaikan", 
          "Used Materials", "Petugas", "Evidence"
        ]);
        sheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#f3f3f3");
    }

    let d = new Date();
    let tgl = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    // [+] PASTI KAN MAPPING SESUAI DENGAN PAYLOAD DARI FRONTEND
    sheet.appendRow([
      tgl,                                // Col A (Timestamp)
      String(payload.id_pelanggan),       // Col B (ID)
      String(payload.nama_pelanggan),     // Col C (Nama)
      String(payload.stasiun),            // Col D (Stasiun)
      String(payload.keluhan),            // Col E (Keluhan)
      String(payload.catatan),            // Col F (Catatan)
      String(payload.status_visit || "Open"), // Col G (Status)
      String(payload.odp),                // Col H (ODP)
      String(payload.port),               // Col I (Port)
      String(payload.sn_ont),             // Col J (SN ONT)
      String(payload.kontak),             // Col K (Kontak)
      "'" + String(payload.latitude),     // Col L (Lat) -> Ditambah "'" agar tidak jadi ribuan
      "'" + String(payload.longitude),    // Col M (Long) -> Ditambah "'" agar tidak jadi ribuan
      "",                                // Col N (Penyebab)
      "",                                // Col O (Perbaikan)
      "",                                // Col P (Materials)
      String(payload.petugas),            // Col Q (Petugas)
      ""                                 // Col R (Evidence)
    ]);

    // [+] SINKRONISASI KE TABEL log_visit SUPABASE
    try {
      syncVisitLogToSupabase("insert", {
        timestamp: tgl,
        id_pelanggan: payload.id_pelanggan,
        nama_pelanggan: payload.nama_pelanggan,
        stasiun: payload.stasiun,
        keluhan: payload.keluhan,
        catatan: payload.catatan,
        status_visit: payload.status_visit || "OPEN",
        odp: payload.odp,
        port: payload.port,
        sn_ont: payload.sn_ont,
        nomor_hp: payload.kontak,
        latitude: payload.latitude,
        longitude: payload.longitude,
        petugas: payload.petugas
      });
    } catch (errSupabase) {
      Logger.log("Gagal sync visit ke Supabase: " + errSupabase.message);
    }

    // [+] KIRIM NOTIFIKASI DM KE TEKNISI BERSANGKUTAN
    let statusVisit = String(payload.status_visit || "Open").trim().toLowerCase();
    if (statusVisit === "open" || statusVisit === "pending") {
      kirimNotifDMKeTeknisi(payload);
    }

    return { status: "success", message: "Data berhasil disimpan." };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

// ==========================================
// FUNGSI KIRIM NOTIFIKASI TIKET BARU (DM)
// ==========================================
function kirimNotifDMKeTeknisi(payload) {
  try {
    let petugasRaw = String(payload.petugas || "").trim();
    if (!petugasRaw || petugasRaw === "-") return;
    
    // Ekstrak username
    let username = "";
    let matchUser = petugasRaw.match(/@([a-zA-Z0-9_]+)/);
    if (matchUser) username = matchUser[1].toLowerCase();
    else username = petugasRaw.toLowerCase().replace(/^@/, "");

    if (!username) return;

    // Cari Chat ID di User (Master File)
    const ssMaster = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheetTeknisi = ssMaster.getSheetByName("List_Teknisi");
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
      let msg = `🚨 <b>TIKET BARU (ASSIGNED)</b> 🚨

`;
      msg += `Halo <b>${namaAsli} (@${username})</b>,
Kamu baru saja ditugaskan untuk mengecek kendala/visit berikut:

`;
      msg += `🆔 <b>ID Pelanggan:</b> ${payload.id_pelanggan || "-"}
`;
      msg += `👤 <b>Pelanggan:</b> ${payload.nama_pelanggan || "-"}
`;
      msg += `📍 <b>Stasiun:</b> ${payload.stasiun || "-"}
`;
      if (payload.latitude && payload.longitude && payload.latitude !== "-" && payload.longitude !== "-") {
        msg += `🗺️ <b>Tikor:</b> <a href="https://www.google.com/maps/search/?api=1&query=${payload.latitude},${payload.longitude}">${payload.latitude}, ${payload.longitude}</a>
`;
      } else {
        msg += `🗺️ <b>Tikor:</b> -
`;
      }
      msg += `📞 <b>Kontak:</b> ${payload.kontak || "-"}
`;
      msg += `⚠️ <b>Keluhan:</b> ${payload.keluhan || "-"}
`;
      if (payload.catatan) {
        msg += `📝 <b>Catatan:</b> ${payload.catatan}
`;
      }
      msg += `
<i>Mohon segera berkoordinasi dan tindak lanjuti. Jangan lupa update status ke bot (Close) setelah selesai. Semangat! 🛠️</i>`;

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
// FUNGSI ADMIN PANEL (USER MANAGEMENT)
// ==========================================

// [+] Fungsi Verifikasi Mandiri Anti-Gagal berbasis Chat ID
function checkAbsoluteAdmin(chatId) {
  if (!chatId) return "Guest";
  const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
  const sheet = ss.getSheetByName("List_Teknisi");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Membandingkan Chat ID dari Telegram dengan Chat ID di Kolom A
    if (String(data[i][0]).trim() === String(chatId).trim()) {
      return String(data[i][4]).trim(); // Mengembalikan nilai Jabatan (Kolom E)
    }
  }
  return "Guest";
}

/**
 * Mengambil seluruh data dari List_Teknisi untuk ditampilkan di Admin Panel
 */
function getAllUsers(payload) {
  try {
    // [+] Gunakan fungsi verifikasi baru
    const requesterRole = checkAbsoluteAdmin(payload.adminId);
    if (requesterRole !== "Admin") {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Akses Ditolak: Anda tidak terdeteksi sebagai Admin." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheetMaster = ss.getSheetByName("List_Teknisi");
    const data = sheetMaster.getDataRange().getValues();
    let userList = [];
    
    for (let i = 1; i < data.length; i++) {
      let chatId = String(data[i][0]).trim();
      if (chatId !== "") {
        userList.push({
          row: i + 1,
          chatId: chatId,
          username: String(data[i][1]).trim(),
          nama: String(data[i][2]).trim(),
          stasiun: String(data[i][3]).trim(),
          jabatan: String(data[i][4]).trim(),
          status: String(data[i][5]).trim()
        });
      }
    }

    userList.sort((a, b) => {
      let isAGuest = (!a.jabatan || a.jabatan === "-") ? 0 : 1;
      let isBGuest = (!b.jabatan || b.jabatan === "-") ? 0 : 1;
      if (isAGuest !== isBGuest) return isAGuest - isBGuest;
      return a.nama.localeCompare(b.nama);
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: userList })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Menyimpan perubahan Role/Stasiun User dari Admin Panel ke Spreadsheet List_Teknisi
 */
function updateUserAccess(payload) {
  try {
    // [+] Gunakan fungsi verifikasi baru
    const requesterRole = checkAbsoluteAdmin(payload.adminId);
    if (requesterRole !== "Admin") {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Akses Ditolak: Anda tidak terdeteksi sebagai Admin." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheetMaster = ss.getSheetByName("List_Teknisi");
    
    const row = parseInt(payload.row);
    const chatIdToVerify = String(payload.chatId).trim();
    
    const currentChatId = String(sheetMaster.getRange(row, 1).getValue()).trim();
    if (currentChatId !== chatIdToVerify) {
      throw new Error("Data tidak sinkron. Mohon refresh halaman.");
    }

    sheetMaster.getRange(row, 3).setValue(payload.nama);
    sheetMaster.getRange(row, 4).setValue(payload.stasiun);
    sheetMaster.getRange(row, 5).setValue(payload.jabatan);
    sheetMaster.getRange(row, 6).setValue(payload.status);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// MONITORING REPORTING HARIAN
// ==========================================
function getMonitoringHarian(stationName) {
  try {
    const today = new Date();
    const todayStr = Utilities.formatDate(today, "Asia/Jakarta", "dd/MM/yyyy");

    let reports = [];
    let pelangganBaruCount = 0;
    let debugInfo = [];

    const ss = SpreadsheetApp.openById(MASTER_FILE_ID);
    const sheet = ss.getSheetByName("Dashboard");
    if (!sheet) throw new Error("Sheet 'Dashboard' tidak ditemukan di database utama.");

    const lastRow = sheet.getLastRow();
    if (lastRow >= 6) {
      // Ambil seluruh range dari baris 6 ke bawah untuk diproses (BO adalah kolom ke-67)
      const data = sheet.getRange(6, 1, lastRow - 5, 67).getValues();
      
      let pelangganBaruIds = new Set();
      const targetStationLower = (stationName || "").trim().toLowerCase();

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // ========================================
        // 1. PELANGGAN BARU (O6:R -> Indeks 14 s/d 17)
        // ========================================
        const pbId = String(row[14] || "").trim().toUpperCase(); // O = 14
        if (pbId && pbId !== "ID" && pbId !== "-") {
          const pbStation = String(row[16] || "").trim().toLowerCase(); // Q = 16
          if (pbStation === targetStationLower) {
            const pbTgl = row[17]; // R = 17
            const dateMatch = pbTgl && (isToday(pbTgl, todayStr) || isSameDate(pbTgl, today));
            debugInfo.push({
              id: pbId,
              nama: String(row[15] || "").trim(), // P = 15
              station: pbStation,
              tgl: String(pbTgl),
              dateMatch: !!dateMatch
            });

            if (dateMatch) {
              pelangganBaruIds.add(pbId);
              reports.push({
                id_pelanggan: pbId,
                nama: String(row[15] || "").trim(), // P = 15
                jenis: "baru",
                petugas: "-",
                waktu: extractTime(pbTgl),
                odp: "-",
                port: "-",
                sn_ont: "-",
                keterangan: "Baru terdaftar hari ini"
              });
            }
          }
        }

        // ========================================
        // 2. AKTIVASI (T6:AD -> Indeks 19 s/d 29)
        // ========================================
        const aktId = String(row[19] || "").trim().toUpperCase(); // T = 19
        if (aktId && aktId !== "ID" && aktId !== "-") {
          const aktStation = String(row[21] || "").trim().toLowerCase(); // V = 21
          if (aktStation === targetStationLower) {
            const aktTgl = row[28] || row[27]; // AC (28) / AB (27)
            if (aktTgl && (isToday(aktTgl, todayStr) || isSameDate(aktTgl, today))) {
              reports.push({
                id_pelanggan: aktId,
                nama: String(row[20] || "").trim(), // U = 20
                jenis: "aktivasi",
                petugas: String(row[26] || "-").trim(), // AA = 26
                waktu: extractTime(aktTgl),
                odp: String(row[22] || "-").trim(), // W = 22
                port: String(row[23] || "-").trim(), // X = 23
                sn_ont: String(row[25] || "-").trim(), // Z = 25
                keterangan: String(row[24] || "").trim() !== "-" && String(row[24] || "").trim() !== "" ? "Kabel Precon: " + String(row[24] || "").trim() : "-" // Y = 24
              });
            }
          }
        }

        // ========================================
        // 3. IKR (AF6:AO -> Indeks 31 s/d 40)
        // ========================================
        const ikrId = String(row[32] || "").trim().toUpperCase(); // AG = 32
        if (ikrId && ikrId !== "ID" && ikrId !== "-") {
          const ikrStation = String(row[31] || "").trim().toLowerCase(); // AF = 31
          if (ikrStation === targetStationLower) {
            const ikrTgl = row[36]; // AK = 36
            if (ikrTgl && (isToday(ikrTgl, todayStr) || isSameDate(ikrTgl, today))) {
              reports.push({
                id_pelanggan: ikrId,
                nama: String(row[33] || "").trim(), // AH = 33
                jenis: "ikr",
                petugas: String(row[40] || "-").trim(), // AO = 40
                waktu: extractTime(ikrTgl),
                odp: String(row[37] || "-").trim(), // AL = 37
                port: String(row[38] || "-").trim(), // AM = 38
                sn_ont: "-",
                keterangan: String(row[39] || "").trim() !== "-" && String(row[39] || "").trim() !== "" ? "Kabel Precon: " + String(row[39] || "").trim() : "-" // AN = 39
              });
            }
          }
        }

        // ========================================
        // 4. VISIT (AQ6:BH -> Indeks 42 s/d 59)
        // ========================================
        const visId = String(row[43] || "").trim().toUpperCase(); // AR = 43
        if (visId && visId !== "ID" && visId !== "-") {
          const visStation = String(row[45] || "").trim().toLowerCase(); // AT = 45
          const visStatus = String(row[47] || "").trim().toUpperCase(); // AV = 47
          if (visStation === targetStationLower && visStatus === "CLOSED") {
            const visTgl = row[42]; // AQ = 42
            if (visTgl && (isToday(visTgl, todayStr) || isSameDate(visTgl, today))) {
              const penyebab = String(row[54] || "").trim(); // BC = 54
              const perbaikan = String(row[55] || "").trim(); // BD = 55
              let keteranganVisit = penyebab !== "" && penyebab !== "-" ? penyebab : "-";
              if (perbaikan !== "" && perbaikan !== "-") {
                keteranganVisit += (keteranganVisit !== "-" ? " → " : "") + perbaikan;
              }

              reports.push({
                id_pelanggan: visId,
                nama: String(row[44] || "").trim(), // AS = 44
                jenis: "visit",
                petugas: String(row[57] || "-").trim(), // BF = 57
                waktu: extractTime(visTgl),
                odp: String(row[48] || "-").trim(), // AW = 48
                port: String(row[49] || "-").trim(), // AX = 49
                sn_ont: String(row[50] || "-").trim(), // AY = 50
                keterangan: keteranganVisit
              });
            }
          }
        }

        // ========================================
        // 5. KENDALA (BJ6:BO -> Indeks 61 s/d 66)
        // ========================================
        const kenId = String(row[62] || "").trim().toUpperCase(); // BK = 62
        if (kenId && kenId !== "ID" && kenId !== "-") {
          const kenStation = String(row[61] || "").trim().toLowerCase(); // BJ = 61
          if (kenStation === targetStationLower) {
            const kenTgl = row[65]; // BN = 65
            if (kenTgl && (isToday(kenTgl, todayStr) || isSameDate(kenTgl, today))) {
              reports.push({
                id_pelanggan: kenId,
                nama: String(row[63] || "").trim(), // BL = 63
                jenis: "kendala",
                petugas: String(row[64] || "-").trim(), // BM = 64
                waktu: extractTime(kenTgl),
                odp: "-",
                port: "-",
                sn_ont: "-",
                keterangan: String(row[66] || "-").trim() // BO = 66
              });
            }
          }
        }
      }

      pelangganBaruCount = pelangganBaruIds.size;
    }

    // ========================================
    // 6. MATERIAL OPEN DARI SUPABASE TECHNICIAN_LOGS
    // ========================================
    try {
      const targetStationLower = (stationName || "").trim().toLowerCase();
      const techLogsRes = callScmSupabase("technician_logs?status=eq.OPEN&order=created_at.desc");
      if (Array.isArray(techLogsRes)) {
        techLogsRes.forEach(row => {
          const matStatus = String(row.status || "").trim().toUpperCase();
          const matCreatedAt = row.created_at;
          const isHariIni = matCreatedAt && (isToday(matCreatedAt, todayStr) || isSameDate(new Date(matCreatedAt), today));

          if (matStatus !== "OPEN" && !isHariIni) return;

          const matSite = String(row.station || "").trim().toLowerCase();
          const matGudang = String(row.warehouse_name || "").trim().toLowerCase();

          if (matSite === targetStationLower || matGudang === targetStationLower || !targetStationLower) {
            let waktuStr = "-";
            if (matCreatedAt) {
              try {
                let d = new Date(matCreatedAt);
                waktuStr = isHariIni ? extractTime(d) : Utilities.formatDate(d, "Asia/Jakarta", "dd/MM HH:mm");
              } catch (e) {
                waktuStr = String(matCreatedAt).substring(0, 16);
              }
            }

            let qtyAmbil = Number(row.qty_take || 0);
            let qtyKembali = Number(row.qty_return || 0);
            let qtyPakai = Number(row.qty_used || 0);

            reports.push({
              id_pelanggan: String(row.work_order || "-").trim(),
              nama: String(row.material_name || row.material_id || "").trim(),
              jenis: "material",
              petugas: String(row.username || "-").trim(),
              waktu: waktuStr,
              odp: String(row.station || "-").trim(),
              port: String(row.warehouse_name || "-").trim(),
              sn_ont: "-",
              status: matStatus,
              diambil: qtyAmbil,
              kembali: qtyKembali,
              dipakai: qtyPakai,
              keterangan: `Diambil: ${qtyAmbil} • Dipakai: ${qtyPakai} • Kembali: ${qtyKembali}${row.notes && row.notes !== "-" ? " • Ket: " + row.notes : ""}`
            });
          }
        });
      }
    } catch(e) {
      console.log("Supabase getMonitoringHarian err: " + e.message);
    }

    // Urutkan berdasarkan waktu terbaru
    reports.sort(function(a, b) {
      let tA = a.waktu || "00:00";
      let tB = b.waktu || "00:00";
      return tB.localeCompare(tA);
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: reports,
      pelangganBaru: pelangganBaruCount,
      debug: debugInfo
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}




/**
 * [+] Helper BARU: Bandingkan 2 tanggal secara robust (Date object langsung)
 * Mengatasi masalah format string yang berbeda-beda
 * Membandingkan Tahun, Bulan, dan Hari secara langsung
 */
function isSameDate(tgl, todayDate) {
  if (!tgl) return false;
  try {
    let d;
    if (tgl instanceof Date) {
      d = tgl;
    } else {
      let s = String(tgl).trim();
      // Coba parsing berbagai format: dd/MM/yyyy, yyyy-MM-dd, dll
      if (s.includes("/")) {
        let parts = s.split(/[\s\/]+/); // Split "dd/MM/yyyy" atau "dd/MM/yyyy HH:mm"
        if (parts.length >= 3) {
          // Format: dd/MM/yyyy
          d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      } else {
        d = new Date(s);
      }
    }
    if (!d || isNaN(d.getTime())) return false;

    // Bandingkan komponen tanggal di timezone WIB
    let tglStr = Utilities.formatDate(d, "Asia/Jakarta", "yyyyMMdd");
    let todayDateStr = Utilities.formatDate(todayDate, "Asia/Jakarta", "yyyyMMdd");
    return tglStr === todayDateStr;
  } catch (e) {
    return false;
  }
}

/**
 * Helper: Cek apakah timestamp jatuh pada hari ini
 * Mendukung format Date object, string "dd/MM/yyyy HH:mm", dan ISO string
 */
function isToday(tgl, todayStr) {
  if (!tgl || tgl === "" || tgl === "-") return false;
  try {
    let dateStr = "";
    if (tgl instanceof Date) {
      dateStr = Utilities.formatDate(tgl, "Asia/Jakarta", "dd/MM/yyyy");
    } else {
      let s = String(tgl).trim();
      if (s.includes("/")) {
        dateStr = s.split(" ")[0];
      } else {
        let d = new Date(s);
        if (!isNaN(d.getTime())) {
          dateStr = Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy");
        }
      }
    }
    return dateStr === todayStr;
  } catch (e) {
    return false;
  }
}

/**
 * Helper: Ekstrak waktu (HH:mm) dari timestamp
 */
function extractTime(tgl) {
  if (!tgl || tgl === "" || tgl === "-") return "-";
  try {
    if (tgl instanceof Date) {
      return Utilities.formatDate(tgl, "Asia/Jakarta", "HH:mm");
    }
    let s = String(tgl).trim();
    if (s.includes(" ") && s.includes(":")) {
      let parts = s.split(" ");
      if (parts.length >= 2) return parts[1].substring(0, 5);
    }
    let d = new Date(s);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, "Asia/Jakarta", "HH:mm");
    }
    return "-";
  } catch (e) {
    return "-";
  }
}

// ==========================================
// PERFORMANSI HOMECONNECT & TUR (PER TAHAP)
// ==========================================
function getPerformansiData(stationName) {
  try {
    const stationInfo = STATION_DB_MAP[stationName];
    if (!stationInfo) throw new Error("Stasiun tidak terdaftar.");

    const ssStation = SpreadsheetApp.openById(stationInfo.id);
    let phasesMap = {};

    // ========================================
    // 1. AMBIL DATA TAHAP/STASIUN & HP TERBANGUN (Sheet "Data IKR" dinamis A4:K16)
    // ========================================
    try {
      const sheetIKR = ssStation.getSheetByName("Data IKR");
      if (sheetIKR) {
        // Ambil data dari seluruh sheet secara dinamis agar mencakup kolom & baris baru
        const ikrData = sheetIKR.getDataRange().getValues();
        
        let labelColIdx = 1; // Default ke kolom Stasiun/Tahap (Kolom B)
        let hpColIdx = 2;    // Default ke kolom HP Terbangun (Kolom C)
        let hasPO = false;
        let poColIdx = -1;
        
        let headerRowIdx = -1;
        // Deteksi header secara otomatis untuk menemukan indeks kolom
        let maxSearchRow = Math.min(10, ikrData.length);
        for (let r = 0; r < maxSearchRow; r++) {
          let rowStr = ikrData[r].map(c => String(c).toLowerCase()).join('|');
          if (rowStr.includes("stasiun") || rowStr.includes("tahap") || rowStr.includes("hp")) {
            let sIdx = ikrData[r].findIndex(c => String(c).toLowerCase().includes("stasiun") || String(c).toLowerCase().includes("tahap"));
            let hIdx = ikrData[r].findIndex(c => String(c).toLowerCase().includes("hp"));
            let pIdx = ikrData[r].findIndex(c => String(c).toLowerCase().includes("po"));
            
            if (sIdx !== -1) labelColIdx = sIdx;
            if (hIdx !== -1) hpColIdx = hIdx;
            if (pIdx !== -1) { poColIdx = pIdx; hasPO = true; }
            headerRowIdx = r;
            break;
          }
        }
        
        let startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
        for (let i = startIdx; i < ikrData.length; i++) {
          let labelRaw = String(ikrData[i][labelColIdx]).trim();
          let poStr = hasPO ? String(ikrData[i][poColIdx]).trim() : "";
          
          // Jika ketemu baris kosong setelah header, asumsikan tabel sudah habis dan break
          if (!labelRaw || labelRaw === "") {
            break;
          }

          let checkLabel = labelRaw.toLowerCase();
          // SKIP baris header, total, atau baris summary tambahan yang tidak relevan
          if (
            checkLabel === "stasiun" || 
            checkLabel.includes("tahap pembangunan") || 
            checkLabel.includes("nomor po") ||
            checkLabel === "total" ||
            checkLabel.includes("total list pelanggan") ||
            checkLabel.includes("ready ikr") ||
            checkLabel.includes("done penarikan") ||
            checkLabel.includes("belum penarikan") ||
            checkLabel.includes("sudah aktivasi") ||
            checkLabel.includes("homeconnect") ||
            checkLabel.includes("sudah ikr") ||
            checkLabel.includes("belum ikr")
          ) {
            continue;
          }

          let tahapKey = labelRaw.toLowerCase();
          
          // Bersihkan karakter huruf/titik dari angka HP
          let hpValRaw = ikrData[i][hpColIdx];
          if(hpValRaw === undefined || hpValRaw === null) hpValRaw = "";
          
          let hpStr = String(hpValRaw).replace(/\./g, '').replace(/\D/g, ''); 
          let hpTerbangun = parseInt(hpStr) || 0;

          // Jika HP masih 0, coba ambil angka dari nama (Misal: "Percepatan 1056HP")
          if (hpTerbangun === 0) {
            let matchHP = labelRaw.match(/(\d+)\s*HP/i);
            if (matchHP) hpTerbangun = parseInt(matchHP[1]);
          }
          
          let namaTahapFinal = labelRaw;
          if (hasPO && poStr && poStr !== "-") {
            namaTahapFinal = `${poStr} - ${labelRaw}`;
          }

          phasesMap[tahapKey] = {
            nama_tahap: namaTahapFinal,
            hp_terbangun: hpTerbangun,
            total_input: 0,
            total_aktivasi: 0,
            hc_aktif: 0,
            ready_to_dismantle: 0,
            dismantled: 0
          };
        }
      }
    } catch (eIKR) {
      console.log("Error baca Data IKR D10:G14: " + eIKR.message);
    }

    // Wadah penampung
    phasesMap["lainnya"] = {
      nama_tahap: "Tahap Lainnya / Belum Ditentukan",
      hp_terbangun: 0,
      total_input: 0,
      total_aktivasi: 0,
      hc_aktif: 0,
      ready_to_dismantle: 0,
      dismantled: 0
    };

    // Cari tahu ada berapa tahap yang valid (selain "lainnya")
    let validPhaseKeys = Object.keys(phasesMap).filter(k => k !== "lainnya");

    // ========================================
    // 2. HITUNG DATA PELANGGAN PER TAHAP (Sheet Utama)
    // ========================================
    const sheetUtama = ssStation.getSheetByName(stationInfo.sheetName);
    if (sheetUtama) {
      const data = sheetUtama.getDataRange().getValues();
      
      // Lewati baris pertama (header)
      for (let i = 1; i < data.length; i++) {
        let id = String(data[i][0]).trim().toUpperCase();
        if (!id || id === "ID") continue;

        // Kolom AF = Index 31
        let tahapPelangganKey = String(data[i][31] || "").trim().toLowerCase();
        
        let currentPhase = phasesMap[tahapPelangganKey];
        
        // JIKA pelanggan tidak punya kecocokan Tahap:
        if (!currentPhase) {
          // LOGIKA PINTAR: Jika stasiun ini cuma punya 1 Tahap, masukkan otomatis ke tahap tersebut!
          if (validPhaseKeys.length === 1) {
            currentPhase = phasesMap[validPhaseKeys[0]];
          } else {
            currentPhase = phasesMap["lainnya"];
          }
        }

        currentPhase.total_input++; // Tambah total input

        // Status Aktivasi (Kolom I / Index 8)
        let statusAkt = String(data[i][8] || "").trim();
        
        if (statusAkt === "Sudah" || statusAkt === "Dismantled" || statusAkt === "Ready To Dismantle") {
          currentPhase.total_aktivasi++;
        }

        if (statusAkt === "Sudah") {
          currentPhase.hc_aktif++;
        } else if (statusAkt === "Ready To Dismantle") {
          currentPhase.ready_to_dismantle++;
        } else if (statusAkt === "Dismantled") {
          currentPhase.dismantled++;
        }
      }
    }

    // Buang kartu "Lainnya" jika kosong (karena semua sudah masuk ke tahap utama)
    if (phasesMap["lainnya"].total_input === 0) {
      delete phasesMap["lainnya"];
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: Object.values(phasesMap)
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// FUNGSI HELPER: SINKRONISASI SATU PELANGGAN KE SUPABASE SECARA REAL-TIME
function syncSinglePelangganToSupabase(idPelanggan, payload) {
  if (!idPelanggan) return;

  var supabasePayload = {
    "id_pelanggan": idPelanggan
  };
  
  if (payload.nama_pelanggan) supabasePayload.nama_pelanggan = payload.nama_pelanggan;
  if (payload.nomor_hp) supabasePayload.nomor_hp = payload.nomor_hp;
  if (payload.alamat) supabasePayload.alamat = payload.alamat;
  if (payload.stasiun) supabasePayload.stasiun = payload.stasiun;
  if (payload.kode_odp) supabasePayload.odp = payload.kode_odp;
  if (payload.port_odp) supabasePayload.port_odp = payload.port_odp;
  if (payload.sn_ont) supabasePayload.sn_ont = payload.sn_ont;
  if (payload.latitude) supabasePayload.latitude = payload.latitude;
  if (payload.longitude) supabasePayload.longitude = payload.longitude;
  
  if (payload.ikr === "Sudah" || payload.status_visit === "CLOSED") {
    supabasePayload.status_ikr = "Sudah";
  } else if (payload.ikr === "Kendala") {
    supabasePayload.status_ikr = "Kendala";
  }
  
  if (payload.aktivasi) supabasePayload.status_aktivasi = payload.aktivasi; 
  
  if (payload.tgl_ikr) supabasePayload.tgl_ikr = payload.tgl_ikr;
  if (payload.tgl_aktivasi) supabasePayload.tgl_aktivasi = payload.tgl_aktivasi;

  if (payload.foto_odp && !payload.foto_odp.startsWith("Error")) supabasePayload.foto_odp_terbuka = payload.foto_odp;
  if (payload.foto_tarik && !payload.foto_tarik.startsWith("Error")) supabasePayload.foto_penarikan_odp = payload.foto_tarik;
  if (payload.foto_rumah && !payload.foto_rumah.startsWith("Error")) supabasePayload.foto_rumah_pelanggan = payload.foto_rumah;
  if (payload.foto_ont && !payload.foto_ont.startsWith("Error")) supabasePayload.foto_ont_terpasang = payload.foto_ont;
  if (payload.foto_sn && !payload.foto_sn.startsWith("Error")) supabasePayload.foto_sn_ont = payload.foto_sn;
  if (payload.foto_dismantle && !payload.foto_dismantle.startsWith("Error")) supabasePayload.foto_dismantle = payload.foto_dismantle;
  
  if (payload.kabel_precon && payload.kabel_precon !== "-") supabasePayload.kabel_precon = payload.kabel_precon;
  if (payload.issue_kendala && payload.issue_kendala !== "-") supabasePayload.issue_kendala = payload.issue_kendala;

  if (payload.jenis_laporan) {
    if (payload.jenis_laporan.includes("ikr")) supabasePayload.petugas_ikr = payload.reporter_username;
    if (payload.jenis_laporan.includes("aktivasi")) supabasePayload.petugas_aktivasi = payload.reporter_username;
    if (payload.jenis_laporan === "kendala") supabasePayload.reporter_kendala = payload.reporter_username;
  } else if (payload.reporter_username) {
    supabasePayload.petugas_aktivasi = payload.reporter_username;
  }
  
  if (payload.visit_penyebab || payload.visit_perbaikan) {
    supabasePayload.issue_kendala = (payload.visit_penyebab || "") + " - " + (payload.visit_perbaikan || "");
  }
  if (payload.alasan_dismantle) supabasePayload.catatan = payload.alasan_dismantle;
  
  try {
    if (typeof upsertToSupabase === "function") {
      upsertToSupabase([supabasePayload]);
      Logger.log("[Supabase Sync Success] ID " + idPelanggan);
    }
  } catch (errSupabase) {
    Logger.log("[Supabase Sync Error] ID " + idPelanggan + ": " + errSupabase.message);
  }
}

/**
 * Helper: Format tanggal/waktu untuk material secara dinamis
 * Jika hari ini, tampilkan HH:mm. Jika hari lain, tampilkan dd/MM HH:mm.
 */
function formatMaterialDate(tgl, todayStr, today) {
  if (!tgl || tgl === "" || tgl === "-") return "-";
  try {
    let dateObj;
    if (tgl instanceof Date) {
      dateObj = tgl;
    } else {
      let s = String(tgl).trim();
      let d = new Date(s);
      if (!isNaN(d.getTime())) dateObj = d;
    }
    
    if (dateObj) {
      const formattedDate = Utilities.formatDate(dateObj, "Asia/Jakarta", "dd/MM/yyyy");
      const timeStr = Utilities.formatDate(dateObj, "Asia/Jakarta", "HH:mm");
      if (formattedDate === todayStr) {
        return timeStr;
      } else {
        return Utilities.formatDate(dateObj, "Asia/Jakarta", "dd/MM HH:mm");
      }
    }
    return String(tgl);
  } catch (e) {
    return String(tgl);
  }
}

// ======================================================================================
// FUNGSI PENGINGAT OTOMATIS TIKET VISIT (CRON JOB / MANUAL TRIGGER)
// ======================================================================================
function sendOpenVisitReminders(testUsername = null) {
  try {
    const ssMaster = SpreadsheetApp.openById(MASTER_FILE_ID);
  const sheetTeknisi = ssMaster.getSheetByName("List_Teknisi");
  if (!sheetTeknisi) return;
  const dataTeknisi = sheetTeknisi.getDataRange().getValues();
  
  let userMap = {}; 
  for (let i = 1; i < dataTeknisi.length; i++) {
    let chatId = String(dataTeknisi[i][0]).trim();
    let username = String(dataTeknisi[i][1]).toLowerCase().trim().replace(/^@/, "");
    let nama = String(dataTeknisi[i][2]).trim();
    if (chatId && username) {
      userMap[username] = { chatId: chatId, nama: nama };
    }
  }

  let pendingTasks = {}; // { username: [] }

  try {
    const ssVisit = SpreadsheetApp.openById(MASTER_VISIT_ID);
    const sheetVisit = ssVisit.getSheetByName("Visit_Log");
    if (sheetVisit) {
      const dataVisit = sheetVisit.getDataRange().getValues();
      for (let i = 1; i < dataVisit.length; i++) {
        let status = String(dataVisit[i][6] || "").trim().toUpperCase();
        if (status === "OPEN") {
          let idVisit = String(dataVisit[i][1] || "").trim();
          let namaPelanggan = String(dataVisit[i][2] || "").trim();
          let stasiun = String(dataVisit[i][3] || "").trim();
          let keluhan = String(dataVisit[i][4] || "").trim();
          let deskripsi = String(dataVisit[i][5] || "").trim();
          let odp = String(dataVisit[i][7] || "").trim();
          let port = String(dataVisit[i][8] || "").trim();
          let sn = String(dataVisit[i][9] || "").trim();
          let petugasStr = String(dataVisit[i][16] || "").trim(); 
          
          let username = "";
          let matchUser = petugasStr.match(/@([a-zA-Z0-9_]+)/);
          if (matchUser) username = matchUser[1].toLowerCase();
          else username = petugasStr.toLowerCase().replace(/^@/, "");

          if (username && userMap[username]) {
            if (!pendingTasks[username]) pendingTasks[username] = [];
            
            let keterangan = keluhan;
            if (deskripsi && deskripsi !== "-") keterangan += ` → ${deskripsi}`;
            let portStr = port && port !== "-" ? `(Port ${port})` : "";
            
            let itemStr = `🔧 [${stasiun}] ${idVisit} - ${namaPelanggan}
`;
            itemStr += `         ${keterangan}
`;
            itemStr += `         ${odp} ${portStr}
`;
            itemStr += `         ${sn}`;
            
            pendingTasks[username].push(itemStr);
          }
        }
      }
    }
  } catch(e) { console.log("Visit error: " + e.message); }

  for (let username in pendingTasks) {
    if (testUsername && typeof testUsername === "string" && username !== testUsername.toLowerCase().replace(/^@/, "")) continue;
    let tasks = pendingTasks[username];
    if (tasks.length === 0) continue;
    
    let msg = `⚠️ <b>PENGINGAT OUTSTANDING TASK</b> ⚠️

Halo <b>${userMap[username].nama} (@${username})</b>,
Sistem mendeteksi bahwa kamu memiliki <b>${tasks.length} Tiket Visit</b> yang berstatus <b>OPEN</b> dan belum diselesaikan:

`;
    tasks.forEach(v => msg += `• ${v}

`);
    msg = msg.trimEnd() + `

<i>Mohon untuk segera menindaklanjuti dan melakukan update (Close). Terima kasih!</i> 🙏`;
    
    try {
      UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({ chat_id: userMap[username].chatId, text: msg, parse_mode: "HTML" }),
        muteHttpExceptions: true
      });
    } catch(e) { console.log("Gagal kirim pesan: " + username); }
  }
  } catch (globalErr) {
    Logger.log("Critical Error in sendOpenVisitReminders: " + globalErr.message);
  }
}

// ======================================================================================
// FUNGSI PENGINGAT OTOMATIS TRANSAKSI MATERIAL (CRON JOB / MANUAL TRIGGER)
// ======================================================================================
function sendOpenMaterialReminders(testUsername = null) {
  try {
    const ssMaster = SpreadsheetApp.openById(MASTER_FILE_ID);
  const sheetTeknisi = ssMaster.getSheetByName("List_Teknisi");
  if (!sheetTeknisi) return;
  const dataTeknisi = sheetTeknisi.getDataRange().getValues();
  
  let userMap = {}; 
  for (let i = 1; i < dataTeknisi.length; i++) {
    let chatId = String(dataTeknisi[i][0]).trim();
    let username = String(dataTeknisi[i][1]).toLowerCase().trim().replace(/^@/, "");
    let nama = String(dataTeknisi[i][2]).trim();
    if (chatId && username) {
      userMap[username] = { chatId: chatId, nama: nama };
    }
  }

  let pendingTasks = {}; // { username: [] }

  try {
    const techLogsRes = callScmSupabase("technician_logs?status=eq.OPEN&order=created_at.desc");
    if (Array.isArray(techLogsRes)) {
      techLogsRes.forEach(row => {
        let namaMat = String(row.material_name || row.material_id || "").trim();
        let qtyAmbil = Number(row.qty_take || 0);
        let qtyKembali = Number(row.qty_return || 0);
        let qtyPakai = Number(row.qty_used || 0);
        let qtySisa = qtyAmbil - qtyPakai - qtyKembali;
        let sisaStr = qtySisa > 0 ? ` → ${qtySisa}` : (qtyAmbil > 0 ? ` → ${qtyAmbil}` : "");
        
        let stasiun = String(row.station || "-").trim();
        let username = String(row.username || "").toLowerCase().trim().replace(/^@/, "");
        
        if (username && userMap[username]) {
          if (!pendingTasks[username]) pendingTasks[username] = [];
          pendingTasks[username].push(`📦 [${stasiun}] ${namaMat}${sisaStr}`);
        }
      });
    }
  } catch(e) { console.log("Supabase reminder error: " + e.message); }

  for (let username in pendingTasks) {
    if (testUsername && typeof testUsername === "string" && username !== testUsername.toLowerCase().replace(/^@/, "")) continue;
    let tasks = pendingTasks[username];
    if (tasks.length === 0) continue;
    
    let msg = `⚠️ <b>PENGINGAT MATERIAL OPEN</b> ⚠️

Halo <b>${userMap[username].nama} (@${username})</b>,
Sistem mendeteksi bahwa kamu masih memiliki <b>${tasks.length} Transaksi Material</b> yang berstatus <b>OPEN</b> (Belum diselesaikan pengembaliannya):

`;
    tasks.forEach(m => msg += `• ${m}
`);
    msg += `
<i>Mohon untuk segera menindaklanjuti dan melakukan update (Close). Terima kasih!</i> 🙏`;
    
    try {
      UrlFetchApp.fetch(BASE_URL + "/sendMessage", {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({ chat_id: userMap[username].chatId, text: msg, parse_mode: "HTML" }),
        muteHttpExceptions: true
      });
    } catch(e) { console.log("Gagal kirim pesan: " + username); }
  }
  } catch (globalErr) {
    Logger.log("Critical Error in sendOpenMaterialReminders: " + globalErr.message);
  }
}

// ======================================================================================
// FUNGSI TESTING (JALANKAN INI UNTUK MENCOBA KE @ilhamdwiw)
// ======================================================================================
function testPengingatKeIlham() {
  sendOpenVisitReminders("ilhamdwiw");
  sendOpenMaterialReminders("ilhamdwiw");
  
  // NOTE: Jika @ilhamdwiw saat ini TIDAK memiliki tiket Open di database, 
  // bot tidak akan mengirim pesan apapun. Untuk melihat hasilnya, pastikan
  // ada setidaknya 1 Visit atau 1 Material dengan status OPEN atas nama ilham.
}

// ======================================================================================
// FUNGSI AUTO KIRIM DAILY REPORT TELEGRAM
// ======================================================================================
function sendDailyReportTelegram() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_VISIT_ID);
    const dashboardSheet = ss.getSheetByName("Dashboard");
    
    if (!dashboardSheet) {
      Logger.log("Sheet Dashboard tidak ditemukan.");
      return;
    }

    // 1. Baca Data Aktivasi dan Performansi (B6:G16)
    const dataAktivasi = dashboardSheet.getRange("B6:G16").getValues();
    
    let totalAktivasi = 0;
    let totalHpTerbangun = 0;
    let totalHcAktif = 0;
    let turStr = "0%";
    
    let mapAktivasi = {};
    const stationList = [];
    
    // Looping B6:B15 (index 0 sd 9) -> Inisialisasi stasiun
    for (let i = 0; i < 10; i++) {
      let stName = String(dataAktivasi[i][0]).trim();
      if (stName && stName.toLowerCase() !== "total" && stName.toLowerCase() !== "stasiun") {
        stationList.push(stName);
        mapAktivasi[stName] = 0; 
      }
    }
    
    // Baris TOTAL (B16) -> index 10
    totalHpTerbangun = parseInt(dataAktivasi[10][1]) || 0; // Kolom C
    totalHcAktif = parseInt(dataAktivasi[10][4]) || 0;     // Kolom F
    let performaTur = dataAktivasi[10][5];                 // Kolom G
    
    if (typeof performaTur === 'number') {
      turStr = (performaTur * 100).toFixed(2) + "%";
    } else {
      turStr = String(performaTur);
    }
    
    // 1.5. Baca Pelanggan Baru Hari Ini (N6:Q100)
    // N (index 0) = ID Pelanggan, P (index 2) = Stasiun
    const dataPelBaru = dashboardSheet.getRange("N6:Q100").getValues();
    let totalPelangganBaru = 0;
    let mapPelangganBaru = {};
    
    for (let i = 0; i < dataPelBaru.length; i++) {
      let id = String(dataPelBaru[i][0]).trim();
      let stName = String(dataPelBaru[i][2]).trim();
      
      if (id && !id.toLowerCase().includes("belum") && !id.toLowerCase().includes("tidak") && !id.toLowerCase().includes("id pelanggan")) {
        if (stName && stName.toLowerCase() !== "stasiun") {
          let properKey = stationList.find(s => s.toLowerCase() === stName.toLowerCase()) || stName;
          if (!mapPelangganBaru[properKey]) mapPelangganBaru[properKey] = 0;
          mapPelangganBaru[properKey]++;
          totalPelangganBaru++;
        }
      }
    }
    
    // 2. Baca Aktivasi Hari Ini langsung dari TABEL "AKTIVASI HARI INI" (S6:U100)
    // S (index 0) = ID Pelanggan, U (index 2) = Stasiun
    const dataAktList = dashboardSheet.getRange("S6:U100").getValues();
    for (let i = 0; i < dataAktList.length; i++) {
      let id = String(dataAktList[i][0]).trim();
      let stName = String(dataAktList[i][2]).trim();
      
      if (id && !id.toLowerCase().includes("belum") && !id.toLowerCase().includes("tidak") && !id.toLowerCase().includes("id pelanggan")) {
        if (stName && stName.toLowerCase() !== "stasiun") {
          let properKey = stationList.find(s => s.toLowerCase() === stName.toLowerCase()) || stName;
          if (!mapAktivasi[properKey]) mapAktivasi[properKey] = 0;
          mapAktivasi[properKey]++;
          totalAktivasi++;
        }
      }
    }
    
        // 3. Baca Data Visit Gangguan (AP6:AV100)
    // AP (Tanggal) = index 0, AS (Stasiun) = index 3, AV (Status) = index 6
    const dataVisit = dashboardSheet.getRange("AP6:AV100").getValues();
    let totalVisit = 0;
    let mapVisit = {};
    
    // Ambil tanggal hari ini untuk perbandingan
    let dNowForVisit = new Date();
    let todayYYYYMMDD = Utilities.formatDate(dNowForVisit, "Asia/Jakarta", "yyyy-MM-dd");
    let todayDDMMYYYY = Utilities.formatDate(dNowForVisit, "Asia/Jakarta", "dd/MM/yyyy");

    for (let i = 0; i < dataVisit.length; i++) {
      let tglVisit = dataVisit[i][0]; // Kolom AP
      let stName = String(dataVisit[i][3]).trim(); // Kolom AS
      let status = String(dataVisit[i][6]).trim().toUpperCase(); // Kolom AV
      
      // Pengecekan: Apakah tanggal di baris ini adalah "Hari Ini"?
      let isToday = false;
      if (tglVisit instanceof Date) {
        let visitDateStr = Utilities.formatDate(tglVisit, "Asia/Jakarta", "yyyy-MM-dd");
        if (visitDateStr === todayYYYYMMDD) isToday = true;
      } else if (tglVisit) {
        let visitStr = String(tglVisit);
        // Memastikan cocok dengan format teks apa pun (dd/MM/yyyy atau yyyy-MM-dd)
        if (visitStr.includes(todayDDMMYYYY) || visitStr.includes(todayYYYYMMDD)) {
          isToday = true;
        }
      }
      
      // Tiga syarat: Stasiun ada isinya, dan Tanggal = Hari Ini. 
      // (Hapus  && status === "OPEN"  di bawah ini kalau kamu mau menghitung SEMUA visit hari ini baik yg open maupun closed)
      if (stName && isToday) { 
        let properKey = stationList.find(s => s.toLowerCase() === stName.toLowerCase()) || stName;
        if (!mapVisit[properKey]) mapVisit[properKey] = 0;
        mapVisit[properKey]++;
        totalVisit++;
      }
    }
    
    // 4. Baca Data Kendala (BI6:BN100)
    // BI (Stasiun) = index 0
    const dataKendala = dashboardSheet.getRange("BI6:BN100").getValues();
    let totalKendala = 0;
    let mapKendala = {};
    
    for (let i = 0; i < dataKendala.length; i++) {
      let stName = String(dataKendala[i][0]).trim();
      if (stName && stName.toLowerCase() !== "stasiun" && stName.toLowerCase() !== "belum ada kendala hari ini" && stName.toLowerCase() !== "n/a") {
        let properKey = stationList.find(s => s.toLowerCase() === stName.toLowerCase()) || stName;
        if (!mapKendala[properKey]) mapKendala[properKey] = 0;
        mapKendala[properKey]++;
        totalKendala++;
      }
    }
    
    // Susun Pesan
    let dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let dNow = new Date();
    let dayName = dayNames[dNow.getDay()];
    let monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let cleanDate = `${dayName}, ${dNow.getDate()} ${monthNames[dNow.getMonth()]} ${dNow.getFullYear()}`;
    let timeStr = Utilities.formatDate(dNow, "Asia/Jakarta", "HH:mm");
    
    let msg = "📅 <b>DAILY REPORT OPERATIONS DESNARUM</b>\n";
    msg += "--------------------------------------------------\n";
    msg += "📆 <b>Tanggal :</b> " + cleanDate + "\n";
    msg += "⏰ <b>Waktu :</b> " + timeStr + " WIB\n";
    msg += "--------------------------------------------------\n";

    msg += "<b>📋 SUMMARY HARI INI</b>\n";
    msg += "🆕 Registrasi Baru : " + totalPelangganBaru + "\n";
    msg += "📶 Aktivasi : " + totalAktivasi + "\n";
    msg += "🆘 Visit Gangguan : " + totalVisit + "\n";
    msg += "🚧 Kendala : " + totalKendala + "\n";

    msg += "<b>📊 BREAKDOWN PER STASIUN</b>\n";
    msg += "<i>(Regist | Aktivasi | Visit | Kendala)</i>\n";
    
    // Gabungkan semua stasiun yang ada di stationList atau punya data
    let allStations = [...stationList];
    let others = [...new Set([...Object.keys(mapPelangganBaru), ...Object.keys(mapAktivasi), ...Object.keys(mapVisit), ...Object.keys(mapKendala)])];
    others.forEach(st => {
      if (!allStations.includes(st)) allStations.push(st);
    });

    allStations.forEach(st => {
      let reg = mapPelangganBaru[st] || 0;
      let akt = mapAktivasi[st] || 0;
      let vis = mapVisit[st] || 0;
      let kdl = mapKendala[st] || 0;
      
      // Tampilkan jika ada di stationList (stasiun utama) atau jika punya data > 0
      if (stationList.includes(st) || reg > 0 || akt > 0 || vis > 0 || kdl > 0) {
        msg += "\n📍 <b>" + st + "</b>\n";
        msg += "   └ <i>" + reg + " Reg | " + akt + " Akt | " + vis + " Visit | " + kdl + " Kdl</i>";
      }
    });

    msg += "\n\n<i>(Based on data reporting Bot)</i>";
    msg += "\n© <i>Starlite Support By Desnarum</i>";
    
    // Kirim Telegram
    const tgPayload = {
      chat_id: "-1002731480508", // Grup ID Anda
      text: msg,
      parse_mode: "HTML"
    };

    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(tgPayload)
    });
    
    Logger.log("Berhasil mengirim laporan harian.");
  } catch (e) {
    Logger.log("Gagal mengirim laporan harian: " + e.message);
  }
}

// ======================================================================================
// FUNGSI AUTO KIRIM REPORT PERFORMANSI TELEGRAM
// ======================================================================================
function sendReportPerformansiTelegram() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_VISIT_ID);
    const dashboardSheet = ss.getSheetByName("Dashboard");
    
    if (!dashboardSheet) {
      Logger.log("Sheet Dashboard tidak ditemukan.");
      return;
    }

    // Baca Data Performansi (B6:G16)
    const dataPerformansi = dashboardSheet.getRange("B6:G16").getValues();
    
    let dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let dNow = new Date();
    let dayName = dayNames[dNow.getDay()];
    let monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let cleanDate = `${dayName}, ${dNow.getDate()} ${monthNames[dNow.getMonth()]} ${dNow.getFullYear()}`;
    let timeStr = Utilities.formatDate(dNow, "Asia/Jakarta", "HH:mm");
    
    let msg = "📊 <b>REPORT PERFORMANSI HC DESNARUM</b>\n";
    msg += "--------------------------------------------------\n";
    msg += "🗓 <b>Tanggal :</b> " + cleanDate + "\n";
    msg += "⏰ <b>Waktu :</b> " + timeStr + " WIB\n";
    msg += "--------------------------------------------------\n";

    msg += "📄 <b>DETAIL PER STASIUN</b>\n";
    msg += "<i>(HP Terbangun | Total Aktivasi | HC Aktif)</i>\n";
    
    // Looping B6:B15 (index 0 sd 9) -> Inisialisasi stasiun
    for (let i = 0; i < 10; i++) {
      let stName = String(dataPerformansi[i][0]).trim();
      if (stName && stName.toLowerCase() !== "total" && stName.toLowerCase() !== "stasiun") {
        let hp = parseInt(dataPerformansi[i][1]) || 0;
        let totAkt = parseInt(dataPerformansi[i][3]) || 0;
        let hcAkt = parseInt(dataPerformansi[i][4]) || 0;
        let turRaw = dataPerformansi[i][5];
        let turStr = "0%";
        
        if (typeof turRaw === 'number') {
          turStr = Number((turRaw * 100).toFixed(2)) + "%";
        } else {
          turStr = String(turRaw);
        }
        
        msg += "📍 <b>" + stName + "</b> ➝ <b>" + turStr + "</b>\n";
        msg += "   └ <i>" + hp + " HP | " + totAkt + " Akt | " + hcAkt + " HC</i>\n";
      }
    }
    
    // Baris TOTAL (B16) -> index 10
    let totalHpTerbangun = parseInt(dataPerformansi[10][1]) || 0; 
    let globalTotAkt = parseInt(dataPerformansi[10][3]) || 0;
    let globalHcAkt = parseInt(dataPerformansi[10][4]) || 0;     
    let globalTurRaw = dataPerformansi[10][5];                 
    let globalTurStr = "0%";
    
    if (typeof globalTurRaw === 'number') {
      globalTurStr = Number((globalTurRaw * 100).toFixed(2)) + "%";
    } else {
      globalTurStr = String(globalTurRaw);
    }
    
    msg += "\n📊 <b>PERFORMANSI HOMECONNECT</b>\n";
    msg += "🏠 HP Terbangun : " + totalHpTerbangun + " HP\n";
    msg += "📶 Total Aktivasi : " + globalTotAkt + " HC\n";
    msg += "🛜 HC Aktif : " + globalHcAkt + " HC\n";
    msg += "📈 TUR Keseluruhan : " + globalTurStr + "\n";
    
    msg += "© <i>Starlite Support By Desnarum</i>";
    
    // Kirim Telegram
    const tgPayload = {
      chat_id: "-1002731480508", // Grup ID Anda
      text: msg,
      parse_mode: "HTML"
    };

    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(tgPayload)
    });
    
    Logger.log("Berhasil mengirim laporan performansi HC.");
  } catch (e) {
    Logger.log("Gagal mengirim laporan performansi HC: " + e.message);
  }
}

// ======================================================================================
// FUNGSI AUTO KIRIM REPORT MATERIAL OPEN TEKNISI (GROUPING PER GUDANG)
// ======================================================================================
function sendReportMaterialOpenTelegram() {
  try {
    const techLogsRes = callScmSupabase("technician_logs?status=eq.OPEN&order=created_at.desc");
    if (!Array.isArray(techLogsRes)) {
      Logger.log("Gagal membaca technician_logs dari Supabase.");
      return;
    }

    // Struktur map: { "Nama Gudang": { totalItem: 0, teknisi: { "@nama1": jumlah, "@nama2": jumlah } } }
    let locationMap = {};
    let totalOpen = 0;

    techLogsRes.forEach(row => {
      let username = String(row.username || "").split('@').join('').trim();
      let gudang = String(row.warehouse_name || "").trim();
      
      let locName = gudang ? gudang.toUpperCase() : "TIDAK DIKETAHUI";
      if (!username) username = "Tanpa_Nama";

      let formattedName = username.startsWith("@") ? username : "@" + username;

      if (!locationMap[locName]) {
        locationMap[locName] = { 
          totalItem: 0, 
          teknisi: {} 
        };
      }
      
      if (!locationMap[locName].teknisi[formattedName]) {
        locationMap[locName].teknisi[formattedName] = 0;
      }
      
      locationMap[locName].teknisi[formattedName]++;
      locationMap[locName].totalItem++;
      totalOpen++;
    });
    
    // FORMAT TANGGAL DAN WAKTU
    let dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let dNow = new Date();
    let dayName = dayNames[dNow.getDay()];
    let monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let cleanDate = `${dayName}, ${dNow.getDate()} ${monthNames[dNow.getMonth()]} ${dNow.getFullYear()}`;
    let timeStr = Utilities.formatDate(dNow, "Asia/Jakarta", "HH:mm");
    
    // HEADER
    let msg = "📦 <b>REPORT MATERIAL OPEN TEKNISI</b>\n";
    msg += "--------------------------------------------------\n";
    msg += "🗓 <b>Tanggal :</b> " + cleanDate + "\n";
    msg += "⏰ <b>Waktu :</b> " + timeStr + " WIB\n";
    msg += "--------------------------------------------------\n";

    if (totalOpen === 0) {
      msg += "✅ <i>Saat ini tidak ada material berstatus Open. Semua report material sudah Closed. Terimakasih sudah disiplin Reporting</i>\n";
    } else {
      msg += "📄 <b>DETAIL PER GUDANG</b>\n";
      msg += "<i>(Lokasi Gudang | Teknisi | Jumlah Material Belum Kembali)</i>\n";
      
      // Urutkan nama gudang
      let listLocations = Object.keys(locationMap).sort();
      
      listLocations.forEach(loc => {
        let locData = locationMap[loc];
        // Ubah loc menjadi huruf Title Case agar enak dibaca di Telegram (misal "KRADENAN" jadi "Kradenan")
        let locDisplay = loc.charAt(0).toUpperCase() + loc.slice(1).toLowerCase();
        
        msg += "📍 <b>Gudang " + locDisplay + "</b> ➝ <b>" + locData.totalItem + " Item</b>\n";
        
        // Urutkan nama teknisi dalam gudang ini
        let teknisiList = Object.keys(locData.teknisi).sort();
        
        teknisiList.forEach((petugas, index) => {
           let jumlahItem = locData.teknisi[petugas];
           msg += "   " + (index === teknisiList.length - 1 ? "└" : "├") + " 👷‍♂️ <b>" + petugas + "</b> : " + jumlahItem + " Item\n";
        });
        msg += "\n"; // Tambah enter pemisah antar gudang
      });
      
      // 📌 GANTI TOTAL KESELURUHAN DENGAN PESAN PENGINGAT
      msg += "⚠️ <i>Perhatian untuk rekan teknisi yang bersangkutan agar segera melakukan pengembalian dan report sisa material. Terima kasih.</i>\n";
    }
    
    // FOOTER
    msg += "© <i>Starlite Support By Desnarum</i>";
    
    // Kirim Ke Telegram
    const tgPayload = {
      chat_id: "-1002731480508", 
      text: msg,
      parse_mode: "HTML"
    };

    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(tgPayload)
    });
    
    Logger.log("Berhasil mengirim laporan material open per gudang.");
  } catch (e) {
    Logger.log("Gagal mengirim laporan material open: " + e.message);
  }
}


// ======================================================================================
// FUNGSI AUTO KIRIM REPORT VISIT/TIKET OPEN TEKNISI (GROUPING PER STASIUN)
// ======================================================================================
function sendReportVisitOpenTelegram() {
  try {
    // Buka file Master Visit
    const ss = SpreadsheetApp.openById(MASTER_VISIT_ID); 
    const sheetVisit = ss.getSheetByName("Visit_Log");
    
    if (!sheetVisit) {
      Logger.log("Sheet Visit_Log tidak ditemukan.");
      return;
    }

    const dataLog = sheetVisit.getDataRange().getValues();
    
    // Struktur map: { "Nama Stasiun": { totalItem: 0, teknisi: { "@nama1": jumlah, "@nama2": jumlah } } }
    let locationMap = {};
    let totalOpen = 0;

    // Mulai dari 1 karena baris 0 adalah Header
    for (let i = 1; i < dataLog.length; i++) {
      let status = String(dataLog[i][6] || "").trim().toUpperCase(); // Kolom G: Status
      
      // Filter tiket yang belum selesai (OPEN)
      if (status === "OPEN" || status === "PENDING") {
        let stasiun = String(dataLog[i][3] || "").trim(); // Kolom D: Stasiun
        let username = String(dataLog[i][16] || "").split('@').join('').trim(); // Kolom Q: Petugas
        
        // Samakan jadi UPPERCASE supaya tidak double (misal "Kradenan" dan "KRADENAN")
        let locName = stasiun ? stasiun.toUpperCase() : "TIDAK DIKETAHUI";
        
        if (!username) username = "Belum_Diplotting";

        // Ubah format username jadi lebih rapi
        let formattedName = username.startsWith("@") ? username : "@" + username;

        // Inisialisasi object untuk stasiun ini jika belum ada
        if (!locationMap[locName]) {
          locationMap[locName] = { 
            totalItem: 0, 
            teknisi: {} 
          };
        }
        
        // Inisialisasi hitungan untuk teknisi di stasiun ini jika belum ada
        if (!locationMap[locName].teknisi[formattedName]) {
          locationMap[locName].teknisi[formattedName] = 0;
        }
        
        // Tambahkan hitungan tiket
        locationMap[locName].teknisi[formattedName]++;
        locationMap[locName].totalItem++;
        totalOpen++;
      }
    }
    
    // FORMAT TANGGAL DAN WAKTU
    let dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let dNow = new Date();
    let dayName = dayNames[dNow.getDay()];
    let monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let cleanDate = `${dayName}, ${dNow.getDate()} ${monthNames[dNow.getMonth()]} ${dNow.getFullYear()}`;
    let timeStr = Utilities.formatDate(dNow, "Asia/Jakarta", "HH:mm");
    
    // HEADER
    let msg = "🆘 <b>REPORT TIKET VISIT OPEN TEKNISI</b>\n";
    msg += "--------------------------------------------------\n";
    msg += "🗓 <b>Tanggal :</b> " + cleanDate + "\n";
    msg += "⏰ <b>Waktu :</b> " + timeStr + " WIB\n";
    msg += "--------------------------------------------------\n";

    if (totalOpen === 0) {
      msg += "✅ <i>Saat ini tidak ada tiket visit berstatus Open. Tetap konsisten untuk disiplin Reporting</i>\n";
    } else {
      msg += "📄 <b>DETAIL PER STASIUN</b>\n";
      msg += "<i>(Lokasi | Teknisi | Jumlah Tiket/Pekerjaan)</i>\n";
      
      // Urutkan nama stasiun
      let listLocations = Object.keys(locationMap).sort();
      
      listLocations.forEach(loc => {
        let locData = locationMap[loc];
        // Ubah loc menjadi huruf Title Case
        let locDisplay = loc.charAt(0).toUpperCase() + loc.slice(1).toLowerCase();
        
        msg += "📍 <b>Stasiun " + locDisplay + "</b> ➝ <b>" + locData.totalItem + " Tiket</b>\n";
        
        // Urutkan nama teknisi dalam stasiun ini
        let teknisiList = Object.keys(locData.teknisi).sort();
        
        teknisiList.forEach((petugas, index) => {
           let jumlahItem = locData.teknisi[petugas];
           msg += "   " + (index === teknisiList.length - 1 ? "└" : "├") + " 👷‍♂️ <b>" + petugas + "</b> : " + jumlahItem + " Pekerjaan\n";
        });
        msg += "\n"; 
      });
      
      // PESAN PENGINGAT
      msg += "⚠️ <i>Perhatian untuk rekan teknisi yang bersangkutan agar segera menindaklanjuti tiket (Open) dan meng-update statusnya di sistem/bot. Terima kasih.</i>\n";
    }
    
    // FOOTER
    msg += "© <i>Starlite Support By Desnarum</i>";
    
    // Kirim Ke Telegram
    const tgPayload = {
      chat_id: "-1002731480508", 
      text: msg,
      parse_mode: "HTML"
    };

    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(tgPayload)
    });
    
    Logger.log("Berhasil mengirim laporan visit open per stasiun.");
  } catch (e) {
    Logger.log("Gagal mengirim laporan visit open: " + e.message);
  }
}


