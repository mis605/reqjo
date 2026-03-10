# Panduan Setup WebApp Job Order (JO)

Panduan ini berisi langkah-langkah untuk menghubungkan Backend Google Apps Script (GAS), Google Sheets, dan Frontend Web Apps yang akan di-hosting di GitHub Pages berserta Google SSO-nya.

## 1. Persiapan Google Sheets & Drive
1. Buat Google Sheet baru, beri nama (misal: `Database JO WebApp`).
2. Buat tiga sheet di dalamnya dengan nama **persis** seperti berikut:
   - `Data` (kolom akan terisi otomatis saat submit pertama)
   - `Config`
   - `MasterData`
3. Di sheet `Config`, buat dua baris:
   - Baris 1: Kolom A = `FolderID_Dokumen`, Kolom B = `[ID_Folder_Google_Drive_Untuk_PDF]`
   - Baris 2: Kolom A = `FolderID_Lampiran`, Kolom B = `[ID_Folder_Google_Drive_Untuk_Excel]`
   *(Cara mendapatkan Folder ID: Buka folder di Drive, copy ID panjang di URL setelah `folders/`)*
4. Di sheet `MasterData`, buat **Header** di baris 1: `Klien`, `Cabang`, `Kompetensi`, `OSM`.
   Isi data master pilihan di bawahnya (Dropdown frontend akan mengambil dari kolom-kolom ini).

## 2. Setup Google Apps Script (Backend)
1. Buka Google Sheet tadi, klik **Extensions > Apps Script**.
2. Hapus isi `Code.gs` bawaan, lalu **Copy-Paste** isi dari file `backend/Code.gs` yang baru Anda generate.
3. Klik **Deploy > New deployment**.
4. Pilih tipe: **Web app**.
5. Isi konfigurasi:
   - Execute as: **Me (email Anda)** (Wajib agar bisa upload ke Drive Anda & kirim email atas nama Anda).
   - Who has access: **Anyone** (Penting agar fetch API dari GitHub tidak terblokir).
6. Klik **Deploy** dan copy **Web app URL** yang muncul (berakhiran `.../exec`).
7. Paste URL tersebut di file `frontend/app.js` pada baris ke-2: `const GAS_API_URL = "URL_ANDA_DISINI";`.

## 3. Setup Google OAuth Client ID (SSO Login)
Karena frontend Anda berada di GitHub, Google memerlukan Client ID resmi untuk menampilkan popup login/SSO Workspace.
1. Buka **Google Cloud Console** (https://console.cloud.google.com).
2. Buat atau pilih Project baru.
3. Buka **APIs & Services > OAuth consent screen**.
   - User Type: Pilih **Internal** (Agar hanya karyawan Google Workspace perusahaan Anda yang bisa login).
   - Isi App Name, User support email, dan Developer contact information. Klik Save and Continue.
4. Buka **APIs & Services > Credentials**.
5. Klik **Create Credentials > OAuth client ID**.
6. Application Type: **Web application**.
7. Name: (misal `JO WebApp GitHub`).
8. Authorized JavaScript origins: Tambahkan URL GitHub Pages Anda (misal `https://username.github.io` atau `http://localhost:5500` jika Anda testing lokal).
9. Klik **Create**. Anda akan mendapatkan **Client ID** (berakhir dengan `.apps.googleusercontent.com`).
10. Copy Client ID tersebut dan paste di `frontend/index.html` pada baris sekitar 25: `data-client_id="YOUR_GOOGLE_CLIENT_ID_HERE"`.

## 4. Hosting ke GitHub Pages (Frontend)
1. Push file `index.html`, `style.css`, dan `app.js` (yang sekarang ada di *root* repository) ke repository GitHub Anda di branch `main`.
2. Di repository GitHub, masuk ke **Settings > Pages**.
3. Pilih branch `main`, pada folder `/ (root)`, lalu simpan.
4. GitHub akan memberikan URL publik (misal: `https://username.github.io/repo-name/`).
5. Jangan lupa tambahkan URL publik tersebut di **Authorized JavaScript origins** di Google Cloud Console (Langkah 3.8).

## 5. Testing
1. Buka URL GitHub Pages Anda.
2. Akan muncul halaman Login. Klik tombol untuk login menggunakan email kantor.
3. Form akan terbuka. Data master (Klien, dll) ter-load otomatis dari Sheet.
4. Isi form, attach PDF dan Excel, lalu klik **Submit**.
5. Periksa Sheet `Data` dan Google Drive folder untuk memastikan tersimpan, serta cek Email Anda untuk Summary.
