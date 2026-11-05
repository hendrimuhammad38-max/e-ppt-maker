# E-PPT Maker

Aplikasi web pribadi untuk membuat presentasi baru atau mendesain ulang file PowerPoint dengan gaya formal korporat, efek 3D, dan animasi. Hasilnya bisa diedit di aplikasi lalu diunduh sebagai PDF atau PPTX yang bisa diedit.

- **Frontend:** HTML, CSS, dan JavaScript murni di GitHub Pages
- **Backend:** Google Apps Script sebagai REST API (Google Sheets + Drive + Slides)

## Struktur
```
index.html          Kerangka aplikasi
css/style.css       Sistem desain "Executive Precision"
js/config.js        URL backend (GAS_URL)
js/api.js           Komunikasi fetch ke Apps Script + unggah bertahap
js/demo.js          Mode Demo (jalan tanpa backend)
js/ui.js            Toast, modal, render slide 16:9, efek miring 3D
js/pages.js         Dashboard, Presentasi Baru, Unggah, Galeri Tema, Pengaturan
js/editor.js        Editor slide, pratinjau layar penuh, ekspor
js/app.js           Router dan kunci akses
```

Langkah lengkap ada di **PANDUAN-INSTALASI.md**.

Tanpa `GAS_URL`, aplikasi berjalan dalam **Mode Demo** (data disimpan di browser) sehingga tampilan bisa dicoba langsung dengan membuka `index.html`.
