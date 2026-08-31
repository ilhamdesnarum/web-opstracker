# ARSITEKTUR BARU: MIGRASI SUPABASE & UNIFIED SALESKIT API

Berikut adalah ringkasan komprehensif dari seluruh perubahan arsitektur yang telah dilakukan selama sesi ini. Ringkasan ini sangat penting sebagai titik tolak (Konteks Awal) untuk melanjutkan pengembangan di workspace lain.

## 1. Migrasi Database ke Supabase (Frontend `index.html`)
- **Penghapusan CacheService GAS**: Web App tidak lagi mengandalkan `CacheService` atau membaca langsung dari Google Sheets untuk memuat data pelanggan. Hal ini mengatasi masalah performa dan batasan waktu eksekusi Google Apps Script (GAS).
- **Direct REST API Supabase**: Semua pengambilan data kini dilakukan langsung dari sisi *client/frontend* menggunakan `fetch()` ke endpoint REST API Supabase (Project ID: `eemlwemkpibldnmjoznr`). Data ditarik dalam format JSON dan langsung dirender ke tabel HTML.
- **Pembaruan UI**: Teks *loading* indikator pada UI telah diperbarui dari "Mencari di server Sheets..." menjadi "Mencari di Supabase...". Ini menandakan Web App sudah sepenuhnya terhubung dengan infrastruktur database modern.

## 2. Arsitektur Dual-Write (Backend & Telegram Bot)
Karena transisi masih berjalan, kita menerapkan pola **Dual-Write** untuk menjaga keselamatan data operasional. Setiap penambahan atau perubahan data pelanggan dari Web App tidak hanya disimpan ke Supabase, tetapi juga masih disinkronkan ke Google Sheets.
- **Fungsi `upsertToSupabase(payload)`**: Telah ditambahkan ke *script* utama (`Bot Ops Tracker Telegram.gs`). Fungsi ini menerima *array of objects* dan melakukan HTTP POST ke endpoint Supabase. Fungsi ini menggunakan metode *upsert* berdasarkan Primary Key (`id_pelanggan`) sehingga mampu menangani data baru maupun *update* data lama secara dinamis tanpa duplikasi.

## 3. Sentralisasi Penarikan Data Saleskit (`scraping saleskit.gs`)
- **Penghapusan Script Lokal**: Fitur "Daftarkan Baru" secara manual telah dihapus dari *frontend*. Penarikan data kini 100% bergantung pada fitur "Impor dari Saleskit". Script *scraper* lokal yang sebelumnya tersebar di 10 file Sheet terpisah telah **dihapus** dan digantikan oleh satu modul terpusat.
- **Unified Scraper (`tarikSaleskitClientEndpoint`)**: Modul baru yang hidup berdampingan dengan Bot. Modul ini secara otomatis menggunakan *Token & Cookie* yang sesuai untuk masing-masing stasiun berdasarkan parameter stasiun dari Web App (menggunakan kamus `SALESKIT_TOKENS`).
- **Pencarian Sheet Dinamis**: *Script* tidak lagi *hardcoded* ke "DATA PELANGGAN", melainkan cerdas membaca nama sheet dari *dictionary* konfigurasi `STATION_DB_MAP` (contoh: jika stasiun Alastua, maka data masuk ke sheet "Alastua").

## 4. Logika API & Efisiensi Data (Dual-Loop Fetching)
Sistem *scraper* Saleskit terbaru melakukan dua tugas sekaligus dalam satu kali jalan:
1. **Endpoint `/customer`**: Menarik seluruh pelanggan baru yang belum terdaftar.
2. **Endpoint `/customer/active`**: Mengecek pelanggan lama dan meng-*update* tanggal registrasi/status mereka jika terjadi perubahan.

**Optimasi Performa (*Safety Brake*):**
Dilengkapi dengan fitur `consecutiveExistingCount`. Jika *script* mendeteksi 5 data pelanggan lama berturut-turut di halaman pertama, ia langsung menyetop proses ke halaman berikutnya. Ini memangkas drastis waktu eksekusi penarikan data dari hitungan menit menjadi hanya **3-15 detik**. 

Setelah data terkumpul di *memory*, *script* melakukan Bulk Insert ke Google Sheet (`setValues`) dan Bulk Upsert ke Supabase secara bersamaan.

## 5. Otomatisasi Database (PostgreSQL Triggers)
Untuk menjaga akurasi okupansi secara otomatis, kita telah memindahkan logika bisnis ke level *database* menggunakan fitur Trigger dari PostgreSQL:
- **`trigger_update_odp_port`**: Sebuah trigger yang dipasang pada tabel `data_pelanggan`. Trigger ini mengeksekusi fungsi `update_odp_port_terpakai()` setiap kali ada event `INSERT`, `UPDATE`, atau `DELETE`.
- **Fungsi `update_odp_port_terpakai()`**: Secara otomatis menambahkan nilai `port_terpakai` (+1) pada tabel `odp` saat ada pelanggan baru, menguranginya (-1) saat pelanggan dihapus, dan memindahkan port (mengurangi yang lama & menambah yang baru) jika pelanggan berganti ODP (`odp`).

---
**Instruksi untuk Agent Berikutnya:**
1. Semua aliran data bacaan (*Read*) sekarang mengandalkan **Supabase REST API**. 
2. Semua aliran penulisan (*Write*) dari *backend* menggunakan sistem **Dual-Write** (ke Sheet & Supabase).
3. Jika ada penambahan kolom atau fitur status IKR baru, pastikan untuk memperbarui struktur objek *payload* di fungsi *scraper* dan fungsi simpan agar kedua *database* menerima data yang simetris.
4. Jangan membuat fungsi manual di Frontend/Backend untuk menghitung ulang port ODP, karena hal itu sudah ditangani secara *real-time* oleh Database Trigger Supabase.
