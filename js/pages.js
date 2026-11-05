/* ============================================================
   HALAMAN: Dashboard, Buat Baru, Unggah, Galeri Tema, Pengaturan
   ============================================================ */
const Pages = {};

async function refreshStore() {
  const r = await Api.call('bootstrap');
  if (!r.success) { toast(r.message, 'error', 'Gagal memuat data'); return false; }
  Object.assign(Store, r.data, { loaded: true });
  renderQuota();
  renderNavBadges();
  return true;
}

const sampleSlide = (t) => ({ layout: 'poin', judul: 'Arah Strategis 2027', poin: ['Pertumbuhan pendapatan 38% YoY', 'Retensi pelanggan 118%', 'Ekspansi ke 3 wilayah baru'], efek3d: true, nomor: 2 });

function themePicker(selected, name = 'tema') {
  return `<div class="theme-pick" role="radiogroup">${Store.themes.map((t) => `
    <label class="tp-card ${t.id === selected ? 'on' : ''}" data-tilt="5">
      <input type="radio" name="${name}" value="${t.id}" ${t.id === selected ? 'checked' : ''}>
      <div class="tp-prev">${renderSlide({ layout: 'judul', judul: t.nama, poin: [t.deskripsi], efek3d: true }, t)}</div>
      <span class="tp-check">${icon('check', 14)}</span>
      <b>${esc(t.nama)}</b><small>${esc(t.deskripsi)}</small>
    </label>`).join('')}</div>`;
}
function bindThemePicker(root) {
  $$('.tp-card input', root).forEach((inp) => inp.addEventListener('change', () => {
    $$('.tp-card', root).forEach((c) => c.classList.toggle('on', c.querySelector('input').checked));
  }));
}

function skeletonRows(n = 4) {
  return Array.from({ length: n }, () => `<div class="sk-row"><i class="sk sk-thumb"></i><i class="sk sk-line w60"></i><i class="sk sk-line w20"></i></div>`).join('');
}

/* ---------------- DASHBOARD ---------------- */
const Dash = { q: '', src: 'Semua', status: 'Semua', page: 1, per: 8 };

Pages.dashboard = async (view) => {
  view.innerHTML = `
    <section class="page fade-up">
      <div class="page-head">
        <div>
          <div class="kicker"><span>RUANG KERJA EKSEKUTIF</span><i class="dot"></i><span class="muted">${Api.isDemo() ? 'Mode Demo' : 'Terhubung ke Google Drive'}</span></div>
          <h1 class="display">Presentasi Saya</h1>
          <p class="muted lead">Buat, desain ulang, dan ekspor presentasi siap rapat direksi yang tersimpan di Google Drive Anda.</p>
        </div>
        <div class="head-actions">
          <a class="btn btn-outline" href="#/unggah">${icon('fileUp', 18)} Unggah PPT</a>
          <a class="btn btn-accent" href="#/baru">${icon('plusCircle', 18)} Presentasi Baru</a>
        </div>
      </div>
      <div class="stats" id="stats">${[0, 1, 2].map(() => '<div class="card stat"><i class="sk sk-line w40"></i><i class="sk sk-big"></i></div>').join('')}</div>
      <div class="card filter-bar">
        <label class="search">${icon('search', 18)}<input id="fQ" class="input bare" placeholder="Cari judul presentasi…" value="${esc(Dash.q)}"></label>
        <select id="fSrc" class="input">${['Semua', 'Baru', 'Upload'].map((v) => `<option value="${v}" ${Dash.src === v ? 'selected' : ''}>${v === 'Semua' ? 'Semua Sumber' : v === 'Baru' ? 'Dibuat Baru' : 'PPTX Unggahan'}</option>`).join('')}</select>
        <select id="fStatus" class="input">${['Semua', 'Draf', 'Memproses', 'Siap'].map((v) => `<option value="${v}" ${Dash.status === v ? 'selected' : ''}>${v === 'Semua' ? 'Status: Semua' : v}</option>`).join('')}</select>
      </div>
      <div class="card table-card" id="list">${skeletonRows()}</div>
    </section>`;

  const draw = () => {
    renderStats();
    renderList();
  };
  $('#fQ').addEventListener('input', debounce((e) => { Dash.q = e.target.value; Dash.page = 1; renderList(); }, 200));
  $('#fSrc').onchange = (e) => { Dash.src = e.target.value; Dash.page = 1; renderList(); };
  $('#fStatus').onchange = (e) => { Dash.status = e.target.value; Dash.page = 1; renderList(); };

  if (Store.loaded) draw();
  if (await refreshStore()) draw();
};

function renderStats() {
  const el = $('#stats');
  if (!el) return;
  const s = Store.stats;
  const card = (ic, n, unit, label, tag) => `
    <div class="card stat" data-tilt="4">
      <div class="stat-top"><span class="stat-ico">${icon(ic, 22)}</span><span class="badge badge-soft">${tag}</span></div>
      <div class="stat-num"><b>${n}</b><span>${unit}</span></div>
      <div class="stat-label">${label}</div>
    </div>`;
  el.innerHTML =
    card('play', s.total, 'Deck', 'Total Proyek', `${icon('cloud', 12)} Drive`) +
    card('sparkles', s.fromUpload, 'Didesain ulang', 'Dari PPT Unggahan', `${icon('zap', 12)} Konversi`) +
    card('share', s.exportsThisMonth, 'Ekspor', 'Bulan Ini', `${icon('badgeCheck', 12)} PDF & PPTX`);
}

function filteredProjects() {
  const q = Dash.q.trim().toLowerCase();
  return Store.projects.filter((p) =>
    (!q || String(p.judul).toLowerCase().includes(q) || String(p.topik || '').toLowerCase().includes(q)) &&
    (Dash.src === 'Semua' || p.sumber === Dash.src) &&
    (Dash.status === 'Semua' || p.status === Dash.status));
}

function projectThumb(p) {
  if (p.status === 'Memproses' && !p.sampul) return `<div class="thumb processing">${icon('refresh', 18, 'spin-ico')}<small>MEMPROSES</small></div>`;
  const cover = p.sampul || { layout: 'judul', judul: p.judul, poin: [] };
  return `<div class="thumb">${renderSlide(Object.assign({ efek3d: true }, cover), themeById(p.tema))}<span class="thumb-ratio">16:9</span></div>`;
}

function renderList() {
  const el = $('#list');
  if (!el) return;
  const all = filteredProjects();
  if (!Store.projects.length) {
    el.innerHTML = `<div class="empty">
      <div class="empty-art"><i></i><i></i><i></i></div>
      <h3>Belum ada presentasi</h3>
      <p class="muted">Mulai dari topik baru, atau unggah PPT lama untuk didesain ulang.</p>
      <div class="row gap"><a class="btn btn-accent" href="#/baru">${icon('plus', 18)} Presentasi Baru</a><a class="btn btn-outline" href="#/unggah">${icon('fileUp', 18)} Unggah PPT</a></div></div>`;
    return;
  }
  const pages = Math.max(1, Math.ceil(all.length / Dash.per));
  Dash.page = Math.min(Dash.page, pages);
  const rows = all.slice((Dash.page - 1) * Dash.per, Dash.page * Dash.per);

  el.innerHTML = `
    <table class="table">
      <thead><tr><th>Deck & Presentasi</th><th>Sumber</th><th>Slide</th><th>Tema</th><th>Diubah</th><th>Status</th><th class="ta-r">Aksi</th></tr></thead>
      <tbody>${rows.map((p) => `
        <tr data-id="${p.id}">
          <td><a class="deck" href="#/editor/${p.id}">${projectThumb(p)}<span><b>${esc(p.judul)}</b><small>${esc(p.topik || (p.sumber === 'Upload' ? 'Dari file PPTX' : 'Presentasi baru'))}</small></span></a></td>
          <td>${sourcePill(p.sumber)}</td>
          <td class="tnum">${p.jumlahSlide} slide</td>
          <td><span class="badge badge-theme">${esc(themeById(p.tema).nama)}</span></td>
          <td class="muted">${timeAgo(p.diubah)}</td>
          <td>${statusPill(p.status)}</td>
          <td class="ta-r"><div class="row-actions">
            <a class="icon-btn" href="#/editor/${p.id}" title="Buka">${icon('pencil', 18)}</a>
            <button class="icon-btn" data-act="more" title="Aksi lain">${icon('more', 18)}</button>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="7" class="muted ta-c pad">Tidak ada presentasi yang cocok dengan filter.</td></tr>`}
      </tbody>
    </table>
    <div class="cards-m">${rows.map((p) => `
      <article class="pcard" data-id="${p.id}">
        <a href="#/editor/${p.id}" class="pcard-cover">${projectThumb(p)}<span class="pcard-src">${p.sumber === 'Upload' ? 'PPTX UNGGAHAN' : '16:9 LAYAR LEBAR'}</span></a>
        <div class="pcard-body">
          <div class="row between"><h3>${esc(p.judul)}</h3><button class="icon-btn" data-act="more">${icon('more', 18)}</button></div>
          <small class="muted">${p.jumlahSlide} slide • ${timeAgo(p.diubah)}</small>
          <div class="row between wrap gap-sm mt">
            <div class="row gap-sm">${statusPill(p.status)}</div>
            <div class="row gap-sm"><a class="btn btn-soft btn-sm" href="#/pratinjau/${p.id}">${icon('eye', 16)} Pratinjau</a><a class="btn btn-primary btn-sm" href="#/editor/${p.id}">${icon('pencil', 16)} Edit</a></div>
          </div>
        </div>
      </article>`).join('')}</div>
    <div class="table-foot">
      <span class="muted">Menampilkan <b>${all.length ? (Dash.page - 1) * Dash.per + 1 : 0}–${Math.min(Dash.page * Dash.per, all.length)}</b> dari <b>${all.length}</b> presentasi</span>
      <div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === Dash.page ? 'on' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}</div>
    </div>`;

  $$('[data-page]', el).forEach((b) => (b.onclick = () => { Dash.page = Number(b.dataset.page); renderList(); }));
  $$('[data-act="more"]', el).forEach((btn) => {
    const id = btn.closest('[data-id]').dataset.id;
    const p = Store.projects.find((x) => x.id === id);
    attachMenu(btn, [
      { icon: 'eye', label: 'Pratinjau', onClick: () => (location.hash = `#/pratinjau/${id}`) },
      { icon: 'download', label: 'Unduh PDF', onClick: () => quickExport(id, 'pdf') },
      { icon: 'download', label: 'Unduh PPTX', onClick: () => quickExport(id, 'pptx') },
      { icon: 'copy', label: 'Duplikat', onClick: () => duplicateProject(id) },
      '-',
      { icon: 'trash', label: 'Hapus', danger: true, onClick: () => deleteProject(p) }
    ]);
  });
}

async function quickExport(id, format) {
  const r = await Api.call('getProject', { id });
  if (!r.success) return toast(r.message, 'error');
  openExportModal(r.data.project, r.data.slides, format);
}

async function duplicateProject(id) {
  const r = await Api.call('duplicateProject', { id });
  if (!r.success) return toast(r.message, 'error');
  toast('Salinan presentasi dibuat.');
  await refreshStore();
  renderStats(); renderList();
}

async function deleteProject(p) {
  const ok = await confirmDialog({ title: 'Hapus presentasi?', message: `"${p.judul}" dan semua slidenya akan dihapus. File PPTX asli tetap aman di folder Upload_Asli.`, okText: 'Hapus', danger: true });
  if (!ok) return;
  Store.projects = Store.projects.filter((x) => x.id !== p.id);
  renderList();
  const r = await Api.call('deleteProject', { id: p.id });
  if (!r.success) toast(r.message, 'error'); else toast('Presentasi dihapus.');
  await refreshStore();
  renderStats(); renderList();
}

/* ---------------- BUAT PRESENTASI BARU ---------------- */
Pages.create = async (view) => {
  if (!Store.loaded) await refreshStore();
  const st = Store.settings;
  view.innerHTML = `
    <section class="page narrow fade-up">
      <a class="back" href="#/dashboard">${icon('arrowLeft', 18)} Dashboard</a>
      <h1 class="h1">Presentasi Baru</h1>
      <p class="muted lead">Tulis topik dan poin utama. Kerangka slide, agenda, dan catatan pembicara dibuat otomatis, lalu bisa Anda sunting.</p>
      <form class="card form-card" id="newForm" novalidate>
        <div class="form-sec"><h3>Dasar</h3>
          <label class="field"><span class="label">Judul Presentasi <i class="req">*</i></span>
            <input class="input" name="judul" maxlength="120" placeholder="Contoh: Strategi Direksi Kuartal 4" required><small class="field-error"></small></label>
          <div class="grid-2">
            <label class="field"><span class="label">Topik / Subjudul</span><input class="input" name="topik" maxlength="160" placeholder="Rapat Dewan Direksi 2026"></label>
            <label class="field"><span class="label">Jumlah Slide</span>
              <div class="stepper"><button type="button" data-step="-1">−</button><input class="input tnum" name="jumlahSlide" type="number" min="3" max="30" value="${Number(st.DEFAULT_SLIDES) || 8}"><button type="button" data-step="1">+</button></div></label>
          </div>
        </div>
        <div class="form-sec"><h3>Isi</h3>
          <label class="field"><span class="label">Poin Utama</span>
            <textarea class="input" name="poin" rows="6" placeholder="Satu poin per baris. Tambahkan rincian dengan titik dua dan titik koma:\nRingkasan Eksekutif: Pendapatan naik 38%; Retensi 118%\nKinerja Wilayah\nRencana Investasi 2027"></textarea>
            <small class="hint">Tiap baris menjadi satu slide. Teks setelah ":" dipecah dengan ";" menjadi poin-poin slide.</small></label>
          <label class="switch-row"><span><b>Buat catatan pembicara</b><small class="muted">Panduan singkat apa yang perlu disampaikan di tiap slide</small></span>
            <span class="switch"><input type="checkbox" name="catatan" checked><i></i></span></label>
        </div>
        <div class="form-sec"><h3>Tema</h3>${themePicker(st.DEFAULT_THEME || 'T-EXEC')}<a class="link" href="#/tema">Lihat semua tema</a></div>
        <div class="sticky-bar"><a class="btn btn-ghost" href="#/dashboard">Batal</a><button class="btn btn-accent" type="submit" id="genBtn">${icon('sparkles', 18)} Buat Slide</button></div>
      </form>
    </section>`;
  const f = $('#newForm');
  bindThemePicker(f);
  $$('[data-step]', f).forEach((b) => (b.onclick = () => {
    const inp = f.jumlahSlide;
    inp.value = Math.max(3, Math.min(30, (Number(inp.value) || 8) + Number(b.dataset.step)));
  }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = f.judul.parentElement.querySelector('.field-error');
    f.judul.classList.toggle('invalid', !f.judul.value.trim());
    err.textContent = f.judul.value.trim() ? '' : 'Judul presentasi wajib diisi.';
    if (!f.judul.value.trim()) return f.judul.focus();
    const btn = $('#genBtn');
    btn.disabled = true; btn.innerHTML = '<i class="spin"></i> Menyusun slide…';
    const r = await Api.call('createProject', {
      judul: f.judul.value, topik: f.topik.value, jumlahSlide: Number(f.jumlahSlide.value),
      poin: f.poin.value.split('\n'), catatan: f.catatan.checked, tema: f.tema.value
    });
    btn.disabled = false; btn.innerHTML = `${icon('sparkles', 18)} Buat Slide`;
    if (!r.success) return toast(r.message, 'error');
    toast(`${r.data.slides.length} slide siap disunting.`, 'success', 'Presentasi dibuat');
    Editor.preload = r.data;
    refreshStore();
    location.hash = `#/editor/${r.data.project.id}`;
  });
};

/* ---------------- UNGGAH & DESAIN ULANG ---------------- */
Pages.upload = async (view) => {
  if (!Store.loaded) await refreshStore();
  let file = null;
  view.innerHTML = `
    <section class="page mid fade-up">
      <div class="ta-c">
        <span class="badge badge-final big">${icon('sparkles', 14)} MESIN DESAIN ULANG</span>
        <h1 class="h1">Unggah & Desain Ulang Presentasi</h1>
        <p class="muted lead">Ubah file PowerPoint (.pptx) menjadi deck korporat modern dengan kedalaman 3D dan tipografi bersih.</p>
      </div>
      <label class="card dropzone" id="drop">
        <input type="file" id="fileIn" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden>
        <div class="dz-art"><span class="dz-sheet back"></span><span class="dz-sheet">${icon('play', 26)}</span></div>
        <h3>Seret & lepas file .pptx di sini, atau <span class="accent-text">Pilih File</span></h3>
        <p class="muted">Maks ${APP_CONFIG.MAX_FILE_MB} MB · File asli tetap utuh di Google Drive</p>
      </label>
      <div id="fileRow"></div>
      <div id="progress"></div>
      <div class="sec-head"><div><h3 class="h3">Pilih Tema 3D Tujuan</h3><p class="muted">Tema mengatur warna, kedalaman bayangan, dan hierarki tipografi.</p></div><span class="badge badge-soft">${Store.themes.length} tema siap</span></div>
      <div id="tp">${themePicker(Store.settings.DEFAULT_THEME || 'T-EXEC', 'tema-up')}</div>
      <div class="notice">${icon('info', 20)}<div><b>Batasan konversi</b><p>Video, animasi bawaan PowerPoint, dan tabel yang rumit mungkin tidak terbawa sempurna. Teks, urutan slide, catatan pembicara, dan gambar pertama tiap slide akan diambil.</p></div></div>
      <div class="row between wrap gap mt-lg">
        <a class="btn btn-ghost" href="#/dashboard">${icon('arrowLeft', 18)} Batal & Kembali</a>
        <button class="btn btn-accent btn-lg" id="goBtn" disabled>${icon('sparkles', 18)} Unggah & Desain Ulang</button>
      </div>
    </section>`;
  bindThemePicker($('#tp'));
  const drop = $('#drop');
  const pick = (f) => {
    if (!f) return;
    if (!/\.pptx$/i.test(f.name)) return toast('Hanya file .pptx yang didukung.', 'error');
    if (f.size > APP_CONFIG.MAX_FILE_MB * 1048576) return toast(`Ukuran file melebihi ${APP_CONFIG.MAX_FILE_MB} MB.`, 'error');
    file = f;
    $('#fileRow').innerHTML = `<div class="card file-row"><span class="file-ico">${icon('file', 22)}</span>
      <div><b>${esc(f.name)}</b> ${icon('checkCircle', 16, 'ok-ico')}<small class="muted">${(f.size / 1048576).toFixed(1)} MB · PowerPoint</small></div>
      <button class="icon-btn" id="rmFile" title="Hapus">${icon('x', 18)}</button></div>`;
    $('#rmFile').onclick = () => { file = null; $('#fileRow').innerHTML = ''; $('#goBtn').disabled = true; };
    $('#goBtn').disabled = false;
  };
  $('#fileIn').onchange = (e) => pick(e.target.files[0]);
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => pick(e.dataTransfer.files[0]));

  $('#goBtn').onclick = async () => {
    if (!file) return;
    if (Store.quota.left <= 0) return toast('Kuota konversi hari ini sudah habis.', 'warning');
    const tema = $('input[name="tema-up"]:checked').value;
    const btn = $('#goBtn');
    btn.disabled = true;
    const steps = ['Unggah', 'Konversi', 'Ekstrak Isi', 'Terapkan Tema'];
    const draw = (active, pct, label, state = '') => {
      $('#progress').innerHTML = `<div class="card progress-card ${state}">
        <div class="row between"><h3 class="h3"><i class="dot live"></i> Proses Desain Ulang</h3><span class="badge badge-final">${Math.round(pct * 100)}%</span></div>
        <ol class="stepper-h">${steps.map((s, i) => `<li class="${i < active ? 'done' : i === active ? 'active' : ''}"><span>${i < active ? icon('check', 16) : i + 1}</span><b>${s}</b><small>${i < active ? 'Selesai' : i === active ? 'Berjalan…' : 'Menunggu'}</small></li>`).join('')}</ol>
        <div class="bar-label"><span>${esc(label)}</span><span class="tnum">${Math.round(pct * 100)}%</span></div>
        <div class="bar"><i style="width:${pct * 100}%"></i></div></div>`;
    };
    const fail = (msg) => {
      $('#progress').innerHTML = `<div class="card progress-card failed"><div class="row gap">${icon('alert', 22, 'err-ico')}<div><b>Proses gagal</b><p class="muted">${esc(msg)}</p></div></div>
        <button class="btn btn-outline mt" id="retryUp">${icon('refresh', 16)} Coba Lagi</button></div>`;
      $('#retryUp').onclick = () => $('#goBtn').click();
      btn.disabled = false;
    };

    draw(0, 0, 'Mengirim potongan file…');
    const up = await Api.uploadFile(file, (p) => draw(0, p * 0.3, `Mengirim file… ${Math.round(p * 100)}%`));
    if (!up.success) return fail(up.message);

    draw(1, 0.32, 'Mengonversi ke Google Slides (bisa 1–2 menit untuk file besar)…');
    const fin = await Api.call('finalizeUpload', { uploadId: up.data.uploadId, total: up.data.total, name: file.name, tema });
    if (!fin.success) return fail(fin.message);
    Store.quota = fin.data.quota || Store.quota; renderQuota();

    let next = 0; const total = fin.data.total;
    while (next < total) {
      draw(2, 0.4 + 0.5 * (next / total), `Mengekstrak slide ${next + 1}–${Math.min(next + 8, total)} dari ${total}`);
      const ex = await Api.call('extractBatch', { id: fin.data.id, start: next });
      if (!ex.success) return fail(ex.message + ' Anda bisa membuka proyek dan mencoba lagi.');
      next = ex.data.next;
    }
    draw(3, 0.96, 'Menerapkan tema…');
    await refreshStore();
    $('#progress').innerHTML = `<div class="card progress-card success"><div class="success-ico">${icon('check', 30)}</div>
      <h3 class="h3">Presentasi siap disunting</h3><p class="muted">${total} slide berhasil diambil dari ${esc(file.name)}.</p>
      <a class="btn btn-primary" href="#/editor/${fin.data.id}">${icon('pencil', 18)} Buka di Editor</a></div>`;
    btn.disabled = false;
    toast(`${total} slide berhasil diekstrak.`, 'success', 'Konversi selesai');
  };
};

/* ---------------- GALERI TEMA ---------------- */
Pages.themes = async (view, params) => {
  if (!Store.loaded) await refreshStore();
  let cat = 'Semua';
  const forProject = params.get('proyek');
  const draw = () => {
    const def = Store.settings.DEFAULT_THEME;
    const list = Store.themes.filter((t) => cat === 'Semua' || t.kategori === cat);
    view.innerHTML = `
      <section class="page fade-up">
        <div class="page-head"><div><div class="kicker"><span>STUDIO TEMA</span></div><h1 class="h1">Galeri Tema</h1>
          <p class="muted lead">Sistem presentasi eksekutif dengan kedalaman 3D dan ekspor vektor.</p></div></div>
        <div class="chips">${['Semua', 'Korporat', 'Modern', 'Minimal', 'Gelap'].map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="theme-grid">${list.map((t) => `
          <article class="card theme-card ${t.id === def ? 'applied' : ''}" data-tilt="4">
            <div class="tc-prev">${renderSlide(sampleSlide(t), t, { deckTitle: 'TINJAUAN STRATEGIS', total: 12 })}</div>
            <div class="tc-body">
              <div class="row between"><h3>${esc(t.nama)}</h3>${t.id === def ? `<span class="badge badge-final">${icon('check', 12)} Bawaan</span>` : ''}</div>
              <p class="muted">${esc(t.deskripsi)}</p>
              <div class="swatches">${['bg', 'primary', 'accent', 'ink'].map((k) => `<i style="background:${t[k]}" title="${t[k]}"></i>`).join('')}</div>
              <div class="tags"><span class="tag">Font: ${esc(t.font)}</span><span class="tag">3D: Level ${t.depth}</span><span class="tag">Gerak: ${esc(t.motion)}</span></div>
              <div class="row gap-sm mt">
                <button class="btn btn-outline btn-sm grow" data-prev="${t.id}">${icon('eye', 16)} Pratinjau</button>
                <button class="btn btn-primary btn-sm grow" data-apply="${t.id}">${icon('check', 16)} ${forProject ? 'Terapkan' : 'Terapkan ke…'}</button>
              </div>
            </div>
          </article>`).join('')}</div>
      </section>`;
    $$('[data-cat]').forEach((b) => (b.onclick = () => { cat = b.dataset.cat; draw(); }));
    $$('[data-prev]').forEach((b) => (b.onclick = () => previewTheme(themeById(b.dataset.prev))));
    $$('[data-apply]').forEach((b) => (b.onclick = () => applyTheme(themeById(b.dataset.apply), forProject, draw)));
  };
  draw();
};

function previewTheme(t) {
  const slides = [
    { layout: 'judul', judul: 'Cakrawala Alokasi Modal', poin: ['Strategi 2026 • Rapat Direksi'], efek3d: true, animasi: 'zoom' },
    sampleSlide(t),
    { layout: 'dua-kolom', judul: 'Prioritas Kuartal', poin: ['Efisiensi biaya', 'Digitalisasi layanan', 'Ekspansi wilayah', 'Kemitraan strategis', 'Talenta kepemimpinan', 'Tata kelola risiko'], efek3d: true, nomor: 3 }
  ];
  const m = openModal(`<div class="modal-head"><div class="modal-ico">${icon('palette', 20)}</div><div><h3>${esc(t.nama)}</h3><p class="muted">${esc(t.deskripsi)}</p></div><button class="icon-btn" data-close>${icon('x', 18)}</button></div>
    <div class="tp-stack">${slides.map((s, i) => `<div class="tp-big" data-tilt="3">${renderSlide(s, t, { deckTitle: 'TINJAUAN STRATEGIS', total: 3, index: i + 1, animate: true })}</div>`).join('')}</div>
    <div class="modal-foot"><button class="btn btn-outline" data-close>Tutup</button><button class="btn btn-primary" id="useT">${icon('check', 16)} Gunakan Tema Ini</button></div>`, { size: 'lg' });
  $('#useT', m.el).onclick = () => { m.close(); applyTheme(t, null); };
}

async function applyTheme(t, forProject, after) {
  if (forProject) {
    const r = await Api.call('updateProject', { id: forProject, patch: { tema: t.id } });
    if (!r.success) return toast(r.message, 'error');
    toast(`Tema ${t.nama} diterapkan.`);
    location.hash = `#/editor/${forProject}`;
    return;
  }
  const m = openModal(`<div class="modal-head"><div class="modal-ico">${icon('palette', 20)}</div><div><h3>Terapkan ${esc(t.nama)}</h3><p class="muted">Pilih tujuan penerapan tema.</p></div></div>
    <label class="opt-card on"><input type="radio" name="tgt" value="__default" checked><div><b>Jadikan tema bawaan</b><small class="muted">Dipakai otomatis untuk presentasi baru dan unggahan</small></div></label>
    <div class="opt-list">${Store.projects.slice(0, 8).map((p) => `<label class="opt-card"><input type="radio" name="tgt" value="${p.id}"><div><b>${esc(p.judul)}</b><small class="muted">Tema saat ini: ${esc(themeById(p.tema).nama)}</small></div></label>`).join('')}</div>
    <div class="modal-foot"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" id="apOk">Terapkan</button></div>`);
  $$('.opt-card input', m.el).forEach((i) => i.addEventListener('change', () => $$('.opt-card', m.el).forEach((c) => c.classList.toggle('on', c.querySelector('input').checked))));
  $('#apOk', m.el).onclick = async () => {
    const v = $('input[name="tgt"]:checked', m.el).value;
    m.close();
    if (v === '__default') {
      const r = await Api.call('saveSettings', { DEFAULT_THEME: t.id });
      if (!r.success) return toast(r.message, 'error');
      Store.settings = r.data.settings;
      toast(`${t.nama} kini menjadi tema bawaan.`);
      after && after();
    } else {
      applyTheme(t, v);
    }
  };
}

/* ---------------- PENGATURAN ---------------- */
Pages.settings = async (view) => {
  if (!Store.loaded) await refreshStore();
  const s = Store.settings, q = Store.quota;
  const rm = document.documentElement.classList.contains('reduce-motion');
  view.innerHTML = `
    <section class="page narrow fade-up">
      <h1 class="h1">Pengaturan</h1>
      <form id="setForm" class="stack">
        <div class="card set-card"><div class="set-head"><span class="stat-ico">${icon('folder', 20)}</span><div><h3>Penyimpanan</h3><p class="muted">Semua file tersimpan di Google Drive Anda sendiri.</p></div></div>
          <div class="kv"><span>Folder utama</span><b>📁 E-PPT Maker</b></div>
          <div class="kv"><span>Subfolder</span><b>Upload_Asli · Hasil_Desain · _Proses</b></div>
          ${Store.folderUrl ? `<a class="btn btn-outline btn-sm" href="${esc(Store.folderUrl)}" target="_blank" rel="noopener">${icon('external', 16)} Buka Folder Drive</a>` : '<small class="muted">Folder tersedia setelah backend terhubung.</small>'}</div>
        <div class="card set-card"><div class="set-head"><span class="stat-ico">${icon('zap', 20)}</span><div><h3>Penggunaan & Kuota</h3><p class="muted">Membatasi konversi PPTX harian agar aman dari kuota Google.</p></div></div>
          <div class="bar-label"><span>Konversi hari ini</span><span class="tnum">${q.used} / ${q.limit}</span></div>
          <div class="bar"><i style="width:${Math.min(100, (q.used / Math.max(q.limit, 1)) * 100)}%"></i></div>
          <label class="field mt"><span class="label">Batas konversi per hari</span><input class="input w-sm tnum" type="number" name="DAILY_LIMIT" min="1" max="50" value="${esc(s.DAILY_LIMIT)}"></label></div>
        <div class="card set-card"><div class="set-head"><span class="stat-ico">${icon('motion', 20)}</span><div><h3>Tampilan</h3><p class="muted">Atur efek gerak dan tema bawaan.</p></div></div>
          <label class="switch-row"><span><b>Kurangi gerakan (mode hemat)</b><small class="muted">Matikan efek miring 3D, transisi, dan animasi slide di perangkat ini</small></span>
            <span class="switch"><input type="checkbox" id="rmToggle" ${rm ? 'checked' : ''}><i></i></span></label>
          <label class="field"><span class="label">Tema bawaan</span><select class="input" name="DEFAULT_THEME">${Store.themes.map((t) => `<option value="${t.id}" ${t.id === s.DEFAULT_THEME ? 'selected' : ''}>${esc(t.nama)}</option>`).join('')}</select></label></div>
        <div class="card set-card"><div class="set-head"><span class="stat-ico">${icon('sliders', 20)}</span><div><h3>Nilai Bawaan</h3></div></div>
          <div class="grid-2">
            <label class="field"><span class="label">Jumlah slide bawaan</span><input class="input tnum" type="number" name="DEFAULT_SLIDES" min="3" max="30" value="${esc(s.DEFAULT_SLIDES)}"></label>
            <label class="field"><span class="label">Maks. poin per slide</span><input class="input tnum" type="number" name="MAX_POIN" min="3" max="10" value="${esc(s.MAX_POIN)}"></label>
          </div></div>
        <div class="card set-card"><div class="set-head"><span class="stat-ico">${icon('lock', 20)}</span><div><h3>Keamanan</h3><p class="muted">Kunci Akses tersimpan hanya di browser ini.</p></div></div>
          <button type="button" class="btn btn-outline btn-sm" id="forget">${icon('logout', 16)} Keluar dari perangkat ini</button></div>
        <div class="row end"><button class="btn btn-accent" type="submit" id="saveSet">${icon('check', 18)} Simpan Pengaturan</button></div>
      </form>
    </section>`;
  $('#rmToggle').onchange = (e) => {
    document.documentElement.classList.toggle('reduce-motion', e.target.checked);
    try { localStorage.setItem('eppt_reduce_motion', e.target.checked ? '1' : '0'); } catch (err) { /* abaikan */ }
  };
  $('#forget').onclick = () => App.logout();
  $('#setForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = $('#saveSet');
    btn.disabled = true;
    const r = await Api.call('saveSettings', {
      DAILY_LIMIT: f.DAILY_LIMIT.value, DEFAULT_THEME: f.DEFAULT_THEME.value,
      DEFAULT_SLIDES: f.DEFAULT_SLIDES.value, MAX_POIN: f.MAX_POIN.value
    });
    btn.disabled = false;
    if (!r.success) return toast(r.message, 'error');
    Store.settings = r.data.settings; Store.quota = r.data.quota; renderQuota();
    toast(r.message || 'Pengaturan disimpan.');
  });
};
