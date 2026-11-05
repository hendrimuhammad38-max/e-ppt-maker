/**
 * MODE DEMO — meniru backend di browser (localStorage) saat GAS_URL kosong.
 * Unggah PPTX dan ekspor file nyata hanya berjalan dengan backend Apps Script.
 */
const DemoBackend = (() => {
  const KEY = 'eppt_demo_db_v1';
  const THEMES = [
    { id: 'T-EXEC', nama: 'Executive Precision', kategori: 'Korporat', deskripsi: 'Navy, slate, dan emas tegas', bg: '#FFFFFF', surface: '#F4F6F8', primary: '#1B2A41', accent: '#C9A227', ink: '#0F172A', muted: '#64748B', font: 'Inter', depth: 2, motion: 'Halus' },
    { id: 'T-MIN', nama: 'Modern Minimalist', kategori: 'Minimal', deskripsi: 'Ruang putih lega, aksen slate', bg: '#F8FAFC', surface: '#FFFFFF', primary: '#334155', accent: '#64748B', ink: '#0F172A', muted: '#94A3B8', font: 'Inter', depth: 1, motion: 'Halus' },
    { id: 'T-DARK', nama: 'Dark Boardroom', kategori: 'Gelap', deskripsi: 'Kanvas obsidian dengan aksen amber', bg: '#0F1A29', surface: '#1B2A41', primary: '#2B3C58', accent: '#FED255', ink: '#FFFFFF', muted: '#94A3B8', font: 'Inter', depth: 3, motion: 'Dinamis' },
    { id: 'T-GOLD', nama: 'Venture Gold', kategori: 'Korporat', deskripsi: 'Sampanye dan perunggu untuk investor', bg: '#FDF8E7', surface: '#FFFFFF', primary: '#382605', accent: '#C9A227', ink: '#1F1200', muted: '#75777E', font: 'Inter', depth: 2, motion: 'Elegan' },
    { id: 'T-SLATE', nama: 'Nordic Slate', kategori: 'Modern', deskripsi: 'Biru baja dengan grid arsitektural', bg: '#F1F5F9', surface: '#FFFFFF', primary: '#1E3A5F', accent: '#0EA5E9', ink: '#0F172A', muted: '#64748B', font: 'Inter', depth: 1, motion: 'Halus' }
  ];
  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 12);
  const now = () => new Date().toISOString();

  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch (e) { /* abaikan */ }
    return seed();
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* penuh */ } }

  function seed() {
    const db = { projects: [], slides: [], exports: [], settings: { DAILY_LIMIT: '10', DEFAULT_THEME: 'T-EXEC', MAX_POIN: '6', DEFAULT_SLIDES: '8' } };
    const mk = (judul, topik, sumber, tema, status, ago, poin) => {
      const r = generate({ judul, topik, poin, jumlahSlide: 6, catatan: true });
      const id = uid('P');
      const t = new Date(Date.now() - ago * 60000).toISOString();
      db.projects.push({ id, judul, topik, sumber, tema, status, jumlahSlide: r.length, dibuat: t, diubah: t, idSlidesHasil: '' });
      r.forEach((s) => db.slides.push(Object.assign({ id: uid('S'), idProyek: id }, s)));
    };
    mk('Strategi Direksi Kuartal 4', 'Rapat Dewan Direksi 2026', 'Baru', 'T-EXEC', 'Siap', 12,
      ['Ringkasan Eksekutif: Pendapatan tumbuh 38%; Retensi pelanggan 118%; Margin EBITDA 24%', 'Kinerja Wilayah', 'Rencana Investasi 2027', 'Risiko & Mitigasi']);
    mk('Ikhtisar Investor Seri B', 'Presentasi pendanaan', 'Upload', 'T-DARK', 'Draf', 130,
      ['Masalah Pasar', 'Solusi Kami', 'Traksi', 'Kebutuhan Dana']);
    mk('Laporan Keberlanjutan Tahunan', 'ESG 2026', 'Upload', 'T-SLATE', 'Draf', 1500,
      ['Emisi Karbon', 'Program Sosial', 'Tata Kelola']);
    return db;
  }

  function generate(d) {
    const jumlah = Math.max(3, Math.min(30, Number(d.jumlahSlide) || 8));
    const withNotes = d.catatan !== false;
    const points = (d.poin || []).map((s) => String(s).trim()).filter(Boolean).map((line) => {
      const i = line.indexOf(':');
      if (i > 0 && line.slice(i + 1).trim()) return { judul: line.slice(0, i).trim(), rinci: line.slice(i + 1).split(';').map((x) => x.trim()).filter(Boolean) };
      return { judul: line, rinci: [] };
    });
    const out = [];
    const add = (o) => out.push(Object.assign({ nomor: out.length + 1, animasi: 'fade', efek3d: true, gambar: '', teksAsli: '' }, o));
    add({ layout: 'judul', judul: d.judul, poin: d.topik ? [d.topik] : [], catatan: withNotes ? `Sapa audiens dan sampaikan tujuan presentasi "${d.judul}".` : '' });
    if (points.length >= 2 && jumlah >= 4) add({ layout: points.length > 6 ? 'dua-kolom' : 'poin', judul: 'Agenda', poin: points.slice(0, 12).map((p) => p.judul), catatan: withNotes ? 'Jelaskan alur pembahasan secara singkat.' : '' });
    const room = jumlah - out.length - 1;
    for (let i = 0; i < room; i++) {
      const p = points[i];
      add({ layout: 'poin', judul: p ? p.judul : `Poin Pembahasan ${i + 1}`, poin: p && p.rinci.length ? p.rinci.slice(0, 6) : ['Tulis poin pendukung di sini'], catatan: withNotes ? (p ? `Uraikan "${p.judul}" dan berikan contoh nyata.` : 'Tambahkan isi slide ini.') : '' });
    }
    add({ layout: 'penutup', judul: 'Terima Kasih', poin: points.length ? ['Ringkasan: ' + points.slice(0, 3).map((p) => p.judul).join(' • ')] : ['Sesi tanya jawab'], catatan: withNotes ? 'Rangkum poin utama dan buka sesi tanya jawab.' : '' });
    return out;
  }

  function withCovers(db) {
    return db.projects.map((p) => {
      const c = db.slides.find((s) => s.idProyek === p.id && s.nomor === 1);
      return Object.assign({}, p, { sampul: c ? { judul: c.judul, poin: c.poin, layout: c.layout } : null });
    }).sort((a, b) => b.diubah.localeCompare(a.diubah));
  }

  const ok = (data, message) => ({ success: true, data, message });
  const fail = (message) => ({ success: false, message });

  const routes = {
    ping: () => ok(null, 'Mode Demo'),
    bootstrap: (_, db) => {
      const ym = now().slice(0, 7);
      return ok({
        projects: withCovers(db), themes: THEMES, settings: db.settings,
        quota: { used: 0, limit: Number(db.settings.DAILY_LIMIT), left: Number(db.settings.DAILY_LIMIT) },
        folderUrl: '',
        stats: { total: db.projects.length, fromUpload: db.projects.filter((p) => p.sumber === 'Upload').length, exportsThisMonth: db.exports.filter((e) => e.tanggal.slice(0, 7) === ym).length }
      });
    },
    getProject: (d, db) => {
      const p = db.projects.find((x) => x.id === d.id);
      if (!p) return fail('Proyek tidak ditemukan.');
      return ok({ project: p, slides: db.slides.filter((s) => s.idProyek === d.id).sort((a, b) => a.nomor - b.nomor) });
    },
    createProject: (d, db) => {
      if (!String(d.judul || '').trim()) return fail('Judul presentasi wajib diisi.');
      const id = uid('P');
      db.projects.push({ id, judul: d.judul.trim(), topik: d.topik || '', sumber: 'Baru', tema: d.tema || db.settings.DEFAULT_THEME, status: 'Draf', jumlahSlide: 0, dibuat: now(), diubah: now(), idSlidesHasil: '' });
      const sl = generate(d);
      sl.forEach((s) => db.slides.push(Object.assign({ id: uid('S'), idProyek: id }, s)));
      db.projects.find((p) => p.id === id).jumlahSlide = sl.length;
      return routes.getProject({ id }, db);
    },
    updateProject: (d, db) => {
      const p = db.projects.find((x) => x.id === d.id);
      if (!p) return fail('Proyek tidak ditemukan.');
      Object.assign(p, d.patch, { diubah: now() });
      if (d.patch.tema && !d.patch.status) p.status = 'Draf';
      return ok(p);
    },
    deleteProject: (d, db) => {
      db.projects = db.projects.filter((p) => p.id !== d.id);
      db.slides = db.slides.filter((s) => s.idProyek !== d.id);
      return ok(null, 'Proyek dihapus.');
    },
    duplicateProject: (d, db) => {
      const p = db.projects.find((x) => x.id === d.id);
      const id = uid('P');
      db.projects.push(Object.assign({}, p, { id, judul: p.judul + ' (Salinan)', status: 'Draf', dibuat: now(), diubah: now(), idSlidesHasil: '' }));
      db.slides.filter((s) => s.idProyek === d.id).forEach((s) => db.slides.push(Object.assign({}, s, { id: uid('S'), idProyek: id })));
      return ok({ id });
    },
    saveSlides: (d, db) => {
      const p = db.projects.find((x) => x.id === d.idProyek);
      db.slides = db.slides.filter((s) => s.idProyek !== d.idProyek);
      d.slides.forEach((s, i) => db.slides.push(Object.assign({}, s, { id: s.id || uid('S'), idProyek: d.idProyek, nomor: i + 1 })));
      Object.assign(p, { jumlahSlide: d.slides.length, diubah: now(), status: 'Draf' });
      if (d.judul) p.judul = d.judul;
      return ok(p, 'Tersimpan');
    },
    saveSettings: (d, db) => {
      Object.keys(db.settings).forEach((k) => { if (d[k] !== undefined) db.settings[k] = String(d[k]); });
      return ok({ settings: db.settings, quota: { used: 0, limit: Number(db.settings.DAILY_LIMIT), left: Number(db.settings.DAILY_LIMIT) } }, 'Pengaturan disimpan.');
    },
    uploadChunk: () => fail('Unggah PPTX membutuhkan backend Apps Script. Isi GAS_URL di js/config.js.'),
    finalizeUpload: () => fail('Unggah PPTX membutuhkan backend Apps Script.'),
    extractBatch: () => fail('Unggah PPTX membutuhkan backend Apps Script.'),
    buildBatch: (d, db) => {
      const p = db.projects.find((x) => x.id === d.id);
      const total = db.slides.filter((s) => s.idProyek === d.id).length;
      const next = Math.min((Number(d.start) || 0) + 8, total);
      if (next >= total) { p.status = 'Siap'; p.idSlidesHasil = 'demo'; }
      return ok({ next, total, done: next >= total, slidesUrl: '' });
    },
    exportFile: (d, db) => {
      db.exports.push({ id: uid('E'), idProyek: d.id, format: d.format, tanggal: now() });
      return fail('Mode Demo: file PDF/PPTX sungguhan dibuat oleh backend Apps Script. Isi GAS_URL untuk mengaktifkannya.');
    }
  };

  async function call(action, data) {
    await new Promise((r) => setTimeout(r, 220));
    const fn = routes[action];
    if (!fn) return fail('Action tidak dikenal: ' + action);
    const db = load();
    const res = fn(JSON.parse(JSON.stringify(data || {})), db);
    save(db);
    return JSON.parse(JSON.stringify(res));
  }

  return { call };
})();
