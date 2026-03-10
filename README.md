# Job Order (JO) WebApp

Web application untuk pengajuan permintaan Job Order (JO) dari Project Coordinator (PC). Aplikasi ini memisahkan antara *frontend* statis dengan *backend* berbasis Google Apps Script secara *serverless*. Seluruh respon *form* akan tercatat di Google Sheets dan *file* terlampir di-upload secara otomatis ke dalam Google Drive, sekaligus mengirimkan *email summary* ke pengaju.

## Arsitektur

### 1. Frontend (GitHub Pages)
- **Framework/Teknologi**: HTML5, Vanilla CSS3 (Styling responsif dan modern), Vanilla JavaScript, Select2 (Dropdown multi-select).
- **Authentication**: Menggunakan **Google Identity Services (SSO)**. PC harus login menggunakan email korporat Google Workspace mereka sebelum dapat melihat dan men-*submit* form.
- **Hosting**: Dirancang sepenuhnya untuk di-host secara gratis di **GitHub Pages**. Hal ini menjaga agar UI terpisah dari batasan iframe Google Apps Script.
- **Fitur Utama**:
  - Konversi file (PDF dan Excel) menjadi Base64 string pada *client-side*.
  - *Fetch API* data Master (Dropdown: Klien, Cabang, Kompetensi, OSM) langsung dari Google Sheets via AJAX GET request.
  - Pengiriman form JSON melalui AJAX POST request ke backend endpoint.

### 2. Backend (Google Apps Script)
- **Framework/Teknologi**: Google Apps Script (`Code.gs`)
- **Database**: Google Sheets (3 sheet wajib: `Data`, `Config`, `MasterData`).
- **Penyimpanan Berkas**: Google Drive.
- **Fitur Utama**:
  - Validasi **JWT Token** langsung ke _endpoint_ publik verifikasi Google (`oauth2.googleapis.com/tokeninfo`). Ini dijamin aman dan menghindarkan kebocoran keamanan biarpun ditaruh di *client side*.
  - `doGet` endpoint untuk merespons *request* drop-down.
  - `doPost` endpoint untuk decode file dari Base64 ke Blob, lalu menyimpan ke Drive Folder yang sudah di-*setting* berdasarkan Sheet `Config`.
  - Fungsi `appendRow` ke Sheet `Data`.
  - Fungsi trigger otomatis pengiriman email *summary* melalui `MailApp` kepada email PC setelah *request* berhasil.

## Struktur Direktori
```text
JO/
├── backend/
│   └── Code.gs        # Script Backend untuk Google Apps Script
├── frontend/
│   ├── app.js         # Logika fetch API, base64 convert, dan Google SSO
│   ├── index.html     # Mark-up form UI
│   └── style.css      # Styling Web App
├── SETUP.md           # Panduan Lengkap Instalasi & Setup Sistem (Wajib dibaca)
└── README.md          # File ini
```

## Persyaratan
- Memiliki akun Google yang dapat mengakses **Google Apps Script**, **Google Sheets**, dan **Google Drive**.
- Memiliki akses ke **Google Cloud Console** untuk membuat OAuth 2.0 Client ID jenis Web application.
- Repositori GitHub untuk hosting frontend (melalui *Settings > Pages*).

## Cara Penggunaan dan Deploy
Seluruh panduan dari mulai setup sheet, backend GAS, pengaturan SSO Google Cloud, hingga deployment GitHub Pages dijelaskan secara detail dan berurutan pada file `SETUP.md`. Silakan ikuti langkah-langkah di dokumen tersebut.

## Keamanan (*Security Note*)
1. Pastikan script GAS Anda di-deploy dengan pengaturan *Who has access: **Anyone*** agar *CORS request* dari *fetch* di frontend tidak tertolak.
2. Meskipun API terbuka untuk umum, tidak ada satupun pihak luar yang bisa melakukan HTTP POST sembarangan. Setiap `doPost` memvalidasi JWT Google Token yang disesuaikan dalam body *payload*-nya (`token`). Tanpa token yang valid terverifikasi server Google langsung, *request* akan di-*reject* (Status `401 Unauthorized`).
3. Pengaturan *Client ID* di sisi Google Cloud Console **harus** difilter statusnya menjadi *Internal* agar pembatasan *login* hanya dapat memakai email korporat/Workspace.
