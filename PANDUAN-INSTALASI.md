# Panduan Instalasi E-PPT Maker

Aplikasi ini terdiri dari dua bagian:

| Bagian | Isi | Tempat |
|---|---|---|
| **Backend** | `Kode.gs` dan `appsscript.json` | Google Apps Script (akun Google Anda) |
| **Frontend** | Folder `e-ppt-maker` (berisi `index.html`, `css/`, `js/`) | GitHub Pages |

Kerjakan **Bagian A dulu**, karena frontend butuh URL dari backend.

---

## Bagian A — Backend (Google Apps Script)

### A1. Buat proyek
1. Buka https://script.google.com, lalu klik **Proyek baru**.
2. Ganti nama proyek (kiri atas) menjadi `E-PPT Maker`.

### A2. Tempel kode
1. Klik file `Code.gs`, hapus semua isinya, lalu tempel seluruh isi **`Kode.gs`**.
2. Klik ikon ⚙️ **Setelan proyek** (Project Settings), lalu centang **Tampilkan file manifes "appsscript.json" di editor**.
3. Kembali ke Editor, buka `appsscript.json`, ganti seluruh isinya dengan isi file **`appsscript.json`**.
4. Tekan **Ctrl+S** untuk menyimpan.

> File manifes ini sudah mengaktifkan layanan **Drive API (v3)**. Kalau di panel kiri bagian **Layanan** belum muncul "Drive", klik **+**, pilih **Drive API**, versi **v3**, lalu **Tambahkan**.

### A3. Jalankan setup (sekali saja)
1. Di bilah atas, pilih fungsi **`setupAppEnvironment`**, lalu klik ▶ **Jalankan**.
2. Muncul permintaan izin: **Tinjau izin** → pilih akun Anda → **Lanjutan** → **Buka E-PPT Maker (tidak aman)** → **Izinkan**.
   Peringatan "tidak aman" muncul karena skrip ini buatan Anda sendiri, bukan aplikasi resmi. Ini normal.
3. Buka **Log eksekusi** di bawah. Pastikan muncul tanda ✅ dan baris:
   ```
   🔑 KUNCI AKSES ANDA (simpan baik-baik, jangan dibagikan):
      a1b2c3d4...
   ```
4. **Salin Kunci Akses itu** ke tempat aman (misalnya catatan pribadi). Anda butuh kunci ini saat pertama membuka aplikasi.
5. Cek Google Drive: ada folder **📁 E-PPT Maker** berisi `Upload_Asli`, `Hasil_Desain`, `_Proses`, dan spreadsheet **🗃️ Database — E-PPT Maker**.

> ⚠️ Jangan jalankan `setupAppEnvironment()` dua kali. Kalau lupa Kunci Akses, jalankan **`tampilkanKunciAkses`**. Kalau kunci bocor, jalankan **`gantiKunciAkses`** (kunci lama langsung tidak berlaku).

### A4. Deploy sebagai Web App
1. Klik **Terapkan (Deploy)** → **Deployment baru**.
2. Klik ikon ⚙️ di samping "Pilih jenis", pilih **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai:** Saya (email Anda)
   - **Yang memiliki akses:** Siapa saja (Anyone)
4. Klik **Terapkan**, lalu **salin URL** yang berakhiran `/exec`.

> **Kenapa "Siapa saja"?** Frontend di GitHub Pages memanggil backend dari domain lain, dan Google hanya mengizinkannya dengan akses "Siapa saja". Data Anda tetap aman: setiap permintaan wajib membawa Kunci Akses yang hanya Anda miliki, dan tanpa kunci itu backend menolak semua permintaan.

> Setiap kali Anda mengubah `Kode.gs`, deploy ulang lewat **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. URL `/exec` tetap sama.

---

## Bagian B — Frontend ke GitHub Pages

### B1. Isi URL backend
1. Ekstrak `e-ppt-maker.zip`. Hasilnya folder **`e-ppt-maker`**.
2. Buka `e-ppt-maker/js/config.js` dengan Notepad, isi `GAS_URL`:
   ```js
   GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
3. Simpan. **Jangan** taruh Kunci Akses di file ini, karena repository GitHub bersifat publik.

### B2. Pasang Git (sekali seumur komputer)
- **Windows:** unduh dari https://git-scm.com/download/win, install dengan pilihan bawaan, lalu buka **PowerShell**.
- **Mac:** buka Terminal, ketik `git --version`. Kalau belum ada, macOS menawarkan instalasi.

Cek dengan:
```bash
git --version
```

Lalu atur identitas (bebas, hanya label di riwayat):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### B3. Buat repository di GitHub
1. Masuk ke https://github.com, klik **+** → **New repository**.
2. Nama: misalnya `e-ppt-maker`. Pilih **Public**.
3. **Jangan** centang README, .gitignore, atau license.
4. Klik **Create repository**, biarkan halamannya terbuka.

### B4. Masuk ke folder yang BENAR
Folder kerja adalah **`e-ppt-maker`** hasil ekstrak, yaitu folder yang langsung berisi `index.html`.

Cara cepat di Windows: buka folder `e-ppt-maker` di File Explorer, klik address bar, ketik `powershell`, tekan Enter.

Lalu periksa isinya:
```powershell
dir
```
Yang harus terlihat: `index.html`, `README.md`, `PANDUAN-INSTALASI.md`, folder `css`, dan folder `js`.
Kalau yang terlihat justru folder `e-ppt-maker` lagi, masuk dulu dengan `cd e-ppt-maker`. **Jangan lanjut sebelum `index.html` terlihat**, karena kalau folder salah, situs akan 404 tanpa pesan error apa pun.

### B5. Kirim ke GitHub
Jalankan satu per satu:
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/e-ppt-maker.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda. Perhatikan **titik** di akhir `git add .`.

Saat `git push` meminta login:
- **Username:** username GitHub
- **Password:** **Personal Access Token**, bukan password akun

> Saat menempel token, layar tidak menampilkan karakter apa pun. Ini normal. Tempel (klik kanan di PowerShell), lalu tekan Enter.

**Membuat token:** buka https://github.com/settings/tokens → **Generate new token (classic)** → Note: `git-push` → Expiration: 90 days → centang **repo** → **Generate token** → salin token `ghp_...` (hanya tampil sekali).

Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B6. Aktifkan GitHub Pages
1. Di halaman repository: **Settings** → **Pages**.
2. Source: **Deploy from a branch**. Branch: **main**, folder **/ (root)**. Klik **Save**.
3. Centang **Enforce HTTPS**.
4. Tunggu 1–2 menit, refresh. Muncul alamat `https://USERNAME.github.io/e-ppt-maker/`.

### B7. Buka & masuk
1. Buka alamat situs. Muncul layar **Kunci Akses**.
2. Tempel kunci dari langkah A3, klik **Masuk**. Kunci disimpan di browser ini saja.

---

## Uji coba setelah instalasi
1. **Presentasi Baru:** isi judul dan beberapa poin, klik **Buat Slide**. Cek sheet `Proyek` dan `Slide` terisi.
2. **Editor:** ubah judul, tambah poin, ganti tata letak. Status "Semua perubahan tersimpan ke Drive" muncul.
3. **Ekspor PDF dan PPTX:** cek folder `Hasil_Desain`. Buka PPTX di PowerPoint untuk memastikan masih bisa diedit.
4. **Unggah PPT:** coba file kecil (5 slide) dulu, lalu file 30 slide.
5. Kalau ada masalah, tekan **F12 → Console** di browser dan kirim tangkapan layarnya.

## Memperbarui situs
Setelah mengubah file frontend, dari folder `e-ppt-maker`:
```bash
git add .
git commit -m "Perbarui tampilan"
git push
```
Kalau masih tampil versi lama, tekan **Ctrl+Shift+R**.

## Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Situs 404 | `git init` dijalankan di folder yang salah | Pastikan `index.html` terlihat di halaman repo GitHub. Kalau tidak, ulangi B4–B5 dari folder yang benar, lalu `git push -u origin main --force` |
| Tampilan polos tanpa warna | Folder `css/` dan `js/` tidak ikut | Selalu kirim lewat terminal, jangan "Upload files" di web GitHub |
| "Tidak dapat terhubung ke server" | `GAS_URL` salah atau belum di-deploy | Cek URL berakhiran `/exec` dan akses "Siapa saja" |
| "Kunci akses salah" | Kunci salah tempel | Jalankan `tampilkanKunciAkses` di Apps Script |
| "Konversi gagal … Drive API" | Layanan Drive belum aktif | Lihat catatan di A2 |
| "Password authentication is not supported" | GitHub menolak password akun | Pakai Personal Access Token (B5) |
| Muncul "Mode Demo" | `GAS_URL` masih kosong | Isi `js/config.js`, lalu push ulang |

## Batasan yang perlu diketahui
- Isi slide dari **Presentasi Baru** disusun dari poin yang Anda tulis (kerangka, agenda, penutup, catatan). Aplikasi tidak menulis isi materi sendiri.
- Efek miring 3D dan animasi web hanya tampil di aplikasi. Di file PDF/PPTX, efek 3D diwujudkan sebagai kartu berlapis. Transisi slide tidak ikut ke PPTX dan bisa diatur ulang di PowerPoint.
- Font Inter tersedia di Google Slides. Di PowerPoint, Inter akan diganti font lain jika belum terpasang di komputer.
- Dari file unggahan, yang diambil adalah teks, urutan slide, catatan pembicara, isi tabel sebagai teks, dan gambar pertama tiap slide. Video, animasi PowerPoint, dan SmartArt tidak terbawa.
- Tautan unduhan membuka Google Drive, jadi pastikan browser masuk ke akun Google pemilik.
