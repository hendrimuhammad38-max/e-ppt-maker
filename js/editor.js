/* ============================================================
   EDITOR SLIDE, PRATINJAU LAYAR PENUH, MODAL EKSPOR
   ============================================================ */
const Editor = { preload: null };
const E = { project: null, slides: [], sel: 0, tab: 'isi', past: [], future: [], lastSnap: 0, saveTimer: null, saving: null };

const LAYOUTS = [
  { id: 'judul', label: 'Judul', icon: 'type' },
  { id: 'poin', label: 'Judul + Poin', icon: 'list' },
  { id: 'dua-kolom', label: 'Dua Kolom', icon: 'columns' },
  { id: 'penutup', label: 'Penutup', icon: 'presentation' }
];
const ANIMS = [['none', 'Tanpa'], ['fade', 'Fade'], ['slide', 'Slide-in'], ['zoom', 'Zoom']];

const maxPoin = (layout) => {
  const m = Number(Store.settings.MAX_POIN) || 6;
  if (layout === 'dua-kolom') return m * 2;
  if (layout === 'judul' || layout === 'penutup') return 3;
  return m;
};
const cur = () => E.slides[E.sel];
const theme = () => themeById(E.project && E.project.tema);

Pages.editor = async (view, params, id) => {
  if (!Store.loaded) refreshStore();
  view.innerHTML = `<section class="page"><div class="card pad-lg">${skeletonRows(3)}</div></section>`;
  let data = Editor.preload && Editor.preload.project.id === id ? Editor.preload : null;
  Editor.preload = null;
  if (!data) {
    const r = await Api.call('getProject', { id });
    if (!r.success) {
      view.innerHTML = `<section class="page"><div class="card empty"><h3>Proyek tidak ditemukan</h3><p class="muted">${esc(r.message)}</p><a class="btn btn-primary" href="#/dashboard">Kembali ke Dashboard</a></div></section>`;
      return;
    }
    data = r.data;
  }
  if (!Store.themes.length) await refreshStore();
  Object.assign(E, { project: data.project, slides: data.slides.map(normSlide), sel: 0, tab: 'isi', past: [], future: [] });
  if (!E.slides.length) E.slides.push(normSlide({ layout: 'judul', judul: E.project.judul, poin: [] }));
  if (E.project.status === 'Memproses' && E.project.sumber === 'Upload' && E.slides.length < E.project.jumlahSlide) {
    toast('Ekstraksi slide belum selesai. Melanjutkan proses…', 'info');
    await resumeExtract(view, data);
    return;
  }
  drawEditor(view);
};

async function resumeExtract(view, data) {
  let next = data.slides.length;
  while (true) {
    const r = await Api.call('extractBatch', { id: data.project.id, start: next });
    if (!r.success) return toast(r.message, 'error');
    next = r.data.next;
    if (r.data.done) break;
  }
  Pages.editor(view, null, data.project.id);
}

function normSlide(s) {
  return {
    id: s.id || '', judul: s.judul || '', poin: Array.isArray(s.poin) ? s.poin.slice() : [], catatan: s.catatan || '',
    layout: s.layout || 'poin', animasi: s.animasi || 'fade', efek3d: s.efek3d !== false, gambar: s.gambar || '', teksAsli: s.teksAsli || ''
  };
}

function drawEditor(view) {
  view.innerHTML = `
    <section class="editor fade-up">
      <div class="card ed-head">
        <div class="ed-title">
          <a class="back" href="#/dashboard">${icon('arrowLeft', 18)} <span class="hide-sm">Proyek</span></a>
          <i class="vsep hide-sm"></i>
          <input class="title-input" id="deckTitle" value="${esc(E.project.judul)}" aria-label="Judul presentasi" maxlength="120">
          <span class="sync-chip" id="saveChip"><i class="dot"></i>Semua perubahan tersimpan</span>
        </div>
        <div class="ed-tools">
          <div class="tool-group"><button class="icon-btn" id="undoBtn" title="Urungkan (Ctrl+Z)">${icon('undo', 18)}</button><button class="icon-btn" id="redoBtn" title="Ulangi (Ctrl+Y)">${icon('redo', 18)}</button></div>
          <a class="btn btn-outline hide-sm" href="#/pratinjau/${E.project.id}" id="prevBtn">${icon('eye', 18)} Pratinjau</a>
          <button class="btn btn-accent hide-sm" id="expBtn">${icon('share', 18)} Ekspor ${icon('chevronDown', 16)}</button>
        </div>
      </div>
      <div class="ed-grid">
        <aside class="ed-rail">
          <div class="rail-head"><span>KERANGKA SLIDE</span><span class="muted" id="slideCount"></span></div>
          <div class="rail-list" id="rail"></div>
          <button class="btn btn-dashed" id="addSlide">${icon('plus', 18)} Tambah Slide</button>
        </aside>
        <div class="ed-center">
          <div class="stage-wrap">
            <div class="stage-bar"><span class="badge badge-live">${icon('maximize', 12)} Panggung 16:9</span><span class="muted tnum" id="stageNum"></span></div>
            <div class="stage" id="stage" data-tilt="2"></div>
            <div class="stage-warn" id="stageWarn" hidden>${icon('alert', 16)} Teks melebihi area slide. Kurangi poin atau persingkat kalimat.</div>
          </div>
          <div class="card notes">
            <div class="row between"><h3 class="h4">${icon('notes', 18)} Catatan Pembicara</h3><span class="muted" id="readTime"></span></div>
            <textarea class="input" id="notesIn" rows="4" placeholder="Apa yang ingin Anda sampaikan di slide ini?"></textarea>
            <div class="row between muted small"><span>Hanya terlihat di mode presenter</span><span>Ikut tersimpan di PPTX</span></div>
          </div>
        </div>
        <aside class="card ed-panel" id="panel"></aside>
      </div>
      <div class="ed-mobile-bar"><a class="btn btn-soft grow" href="#/pratinjau/${E.project.id}">${icon('eye', 18)} Pratinjau</a><button class="btn btn-accent grow" id="expBtnM">${icon('share', 18)} Ekspor</button></div>
    </section>`;

  $('#deckTitle').addEventListener('input', (e) => { snapshot(); E.project.judul = e.target.value; renderStage(); renderRail(); queueSave(); });
  $('#deckTitle').addEventListener('blur', (e) => { if (!e.target.value.trim()) { e.target.value = E.project.judul = 'Tanpa Judul'; queueSave(); } });
  $('#notesIn').addEventListener('input', (e) => { snapshot(); cur().catatan = e.target.value; renderReadTime(); queueSave(); });
  $('#addSlide').onclick = () => addSlide(E.sel + 1);
  $('#undoBtn').onclick = undo;
  $('#redoBtn').onclick = redo;
  $('#expBtn').onclick = () => openExportModal(E.project, E.slides);
  $('#expBtnM').onclick = () => openExportModal(E.project, E.slides);
  renderAll();
}

function renderAll() { renderRail(); renderStage(); renderPanel(); renderNotes(); updateHistoryBtns(); }

function renderRail() {
  const t = theme();
  $('#slideCount').textContent = `${E.slides.length} slide`;
  $('#rail').innerHTML = E.slides.map((s, i) => `
    <div class="rail-item ${i === E.sel ? 'on' : ''}" draggable="true" data-i="${i}">
      <div class="rail-top"><span class="tnum">${String(i + 1).padStart(2, '0')}</span><span class="rail-name">${esc(s.judul || 'Tanpa judul')}</span>
        <button class="icon-btn xs" data-menu="${i}" title="Aksi slide">${icon('more', 16)}</button></div>
      <div class="rail-thumb">${renderSlide(s, t, { deckTitle: E.project.judul, total: E.slides.length, index: i + 1 })}</div>
    </div>`).join('');
  $$('.rail-item').forEach((el) => {
    const i = Number(el.dataset.i);
    el.addEventListener('click', (e) => { if (!e.target.closest('[data-menu]')) select(i); });
    el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); el.classList.add('dragging'); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-over'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop-over'); moveSlide(Number(e.dataTransfer.getData('text/plain')), i); });
  });
  $$('[data-menu]').forEach((b) => {
    const i = Number(b.dataset.menu);
    attachMenu(b, [
      { icon: 'arrowUp', label: 'Pindah ke atas', disabled: i === 0, onClick: () => moveSlide(i, i - 1) },
      { icon: 'arrowDown', label: 'Pindah ke bawah', disabled: i === E.slides.length - 1, onClick: () => moveSlide(i, i + 1) },
      { icon: 'copy', label: 'Duplikat', onClick: () => { snapshot(true); E.slides.splice(i + 1, 0, Object.assign(normSlide(E.slides[i]), { id: '' })); select(i + 1, true); queueSave(); } },
      { icon: 'plus', label: 'Sisipkan slide setelahnya', onClick: () => addSlide(i + 1) },
      '-',
      { icon: 'trash', label: 'Hapus slide', danger: true, disabled: E.slides.length <= 1, onClick: () => removeSlide(i) }
    ]);
  });
}

function renderStage() {
  const s = cur();
  $('#stage').innerHTML = renderSlide(s, theme(), { deckTitle: E.project.judul, total: E.slides.length, index: E.sel + 1, editing: true });
  $('#stageNum').textContent = `Slide ${E.sel + 1} / ${E.slides.length}`;
  requestAnimationFrame(checkOverflow);
}

function checkOverflow() {
  const slide = $('#stage .slide');
  if (!slide) return;
  const boxes = $$('.s-card, .s-hero, .s-title', slide);
  const over = boxes.some((b) => b.scrollHeight > b.clientHeight + 2);
  $('#stageWarn').hidden = !over;
  const hint = $('#balanceHint');
  if (hint) {
    const n = cur().poin.length, max = maxPoin(cur().layout);
    hint.className = `hint-box ${over ? 'warn' : 'ok'}`;
    hint.innerHTML = over
      ? `${icon('alert', 18)}<div><b>Teks terlalu padat</b><span>Isi melebihi area slide 16:9. Persingkat kalimat atau pindahkan sebagian ke slide baru.</span></div>`
      : `${icon('badgeCheck', 18)}<div><b>Keseimbangan optimal</b><span>${n} dari ${max} poin terpakai. Tidak ada teks yang meluap.</span></div>`;
  }
}

function renderNotes() {
  $('#notesIn').value = cur().catatan;
  renderReadTime();
}
function renderReadTime() {
  const words = cur().catatan.trim().split(/\s+/).filter(Boolean).length;
  $('#readTime').textContent = words ? `Waktu bicara ±${Math.max(5, Math.round((words / 130) * 60))} detik` : '';
}

function renderPanel() {
  const s = cur(), max = maxPoin(s.layout);
  const tabs = `<div class="tabs"><button class="${E.tab === 'isi' ? 'on' : ''}" data-tab="isi">${icon('list', 16)} Isi</button><button class="${E.tab === 'gaya' ? 'on' : ''}" data-tab="gaya">${icon('cube', 16)} Gaya & 3D</button></div>`;
  let body;
  if (E.tab === 'isi') {
    body = `
      <label class="field"><span class="label caps">Judul Slide <i class="req">*</i></span>
        <input class="input" id="sTitle" value="${esc(s.judul)}" maxlength="140" placeholder="Tulis judul slide">
        <small class="field-error" id="sTitleErr">${s.judul.trim() ? '' : 'Judul wajib diisi.'}</small></label>
      <div class="row between"><span class="label caps">${s.layout === 'judul' || s.layout === 'penutup' ? 'Subjudul' : 'Poin Utama'}</span><span class="muted small tnum">${s.poin.length} / ${max}</span></div>
      <div class="bullets" id="bullets">${s.poin.map((p, i) => `
        <div class="bullet" data-i="${i}">
          <span class="grip" title="Geser urutan">${icon('grip', 16)}</span>
          <input class="input bare" value="${esc(p)}" data-b="${i}" placeholder="Tulis poin…">
          <button class="icon-btn xs" data-up="${i}" title="Naikkan" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 14)}</button>
          <button class="icon-btn xs" data-del="${i}" title="Hapus poin">${icon('x', 14)}</button>
        </div>`).join('')}</div>
      <button class="btn btn-soft btn-block" id="addPoin" ${s.poin.length >= max ? 'disabled' : ''}>${icon('plusCircle', 16)} ${s.poin.length >= max ? `Maksimal ${max} poin` : 'Tambah poin'}</button>
      <div class="hint-box ok" id="balanceHint"></div>
      ${s.teksAsli ? `<details class="orig"><summary>${icon('file', 16)} Lihat teks asli dari file</summary><pre>${esc(s.teksAsli)}</pre></details>` : ''}`;
  } else {
    body = `
      <span class="label caps">Tata Letak</span>
      <div class="layout-pick">${LAYOUTS.map((l) => `<button class="lp ${s.layout === l.id ? 'on' : ''}" data-layout="${l.id}"><span class="lp-ico lp-${l.id}"><i></i><i></i><i></i></span><small>${l.label}</small></button>`).join('')}</div>
      <label class="field"><span class="label caps">Tema Presentasi</span>
        <select class="input" id="themeSel">${Store.themes.map((t) => `<option value="${t.id}" ${t.id === E.project.tema ? 'selected' : ''}>${esc(t.nama)}</option>`).join('')}</select>
        <small class="hint">Tema berlaku untuk seluruh slide. <a class="link" href="#/tema?proyek=${E.project.id}">Buka galeri</a></small></label>
      <label class="switch-row"><span><b>Efek 3D</b><small class="muted">Kartu berlapis dengan bayangan bertingkat</small></span><span class="switch"><input type="checkbox" id="d3" ${s.efek3d ? 'checked' : ''}><i></i></span></label>
      <span class="label caps">Animasi Masuk</span>
      <div class="seg">${ANIMS.map(([v, l]) => `<button class="${s.animasi === v ? 'on' : ''}" data-anim="${v}">${l}</button>`).join('')}</div>
      <button class="btn btn-soft btn-sm" id="playAnim">${icon('play', 16)} Putar animasi</button>
      <label class="check"><input type="checkbox" id="allSlides"><span>Terapkan gaya ini ke semua slide</span></label>
      ${s.gambar ? `<div class="kv"><span>${icon('image', 16)} Gambar dari file asli</span><button class="btn btn-ghost btn-sm" id="rmImg">Lepas</button></div>` : ''}`;
  }
  $('#panel').innerHTML = tabs + `<div class="panel-body">${body}</div>`;
  $$('[data-tab]').forEach((b) => (b.onclick = () => { E.tab = b.dataset.tab; renderPanel(); }));
  E.tab === 'isi' ? bindContentPanel() : bindStylePanel();
}

function bindContentPanel() {
  const s = cur();
  $('#sTitle').addEventListener('input', (e) => {
    snapshot(); s.judul = e.target.value;
    $('#sTitleErr').textContent = s.judul.trim() ? '' : 'Judul wajib diisi.';
    e.target.classList.toggle('invalid', !s.judul.trim());
    updateCurrent();
  });
  $$('[data-b]').forEach((inp) => {
    inp.addEventListener('input', (e) => { snapshot(); s.poin[Number(inp.dataset.b)] = e.target.value; updateCurrent(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (s.poin.length < maxPoin(s.layout)) addPoin(Number(inp.dataset.b) + 1); }
      if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); removePoin(Number(inp.dataset.b)); }
    });
  });
  $$('[data-del]').forEach((b) => (b.onclick = () => removePoin(Number(b.dataset.del))));
  $$('[data-up]').forEach((b) => (b.onclick = () => {
    const i = Number(b.dataset.up); snapshot(true);
    [s.poin[i - 1], s.poin[i]] = [s.poin[i], s.poin[i - 1]];
    renderPanel(); updateCurrent();
  }));
  $('#addPoin').onclick = () => addPoin(s.poin.length);
  checkOverflow();
}

function addPoin(at) {
  const s = cur();
  if (s.poin.length >= maxPoin(s.layout)) return toast(`Maksimal ${maxPoin(s.layout)} poin untuk tata letak ini.`, 'warning');
  snapshot(true);
  s.poin.splice(at, 0, '');
  renderPanel(); updateCurrent();
  const inp = $(`[data-b="${at}"]`); inp && inp.focus();
}
function removePoin(i) {
  snapshot(true);
  cur().poin.splice(i, 1);
  renderPanel(); updateCurrent();
  const prev = $(`[data-b="${Math.max(0, i - 1)}"]`); prev && prev.focus();
}

function bindStylePanel() {
  const s = cur();
  const all = () => $('#allSlides').checked;
  const apply = (fn) => { snapshot(true); (all() ? E.slides : [s]).forEach(fn); renderAll(); queueSave(); };
  $$('[data-layout]').forEach((b) => (b.onclick = () => {
    snapshot(true); s.layout = b.dataset.layout;
    if (s.poin.length > maxPoin(s.layout)) toast('Jumlah poin melebihi batas tata letak ini. Kurangi agar tidak meluap.', 'warning');
    renderAll(); queueSave();
  }));
  $('#themeSel').onchange = async (e) => {
    snapshot(true); E.project.tema = e.target.value; renderAll();
    const r = await Api.call('updateProject', { id: E.project.id, patch: { tema: E.project.tema } });
    if (!r.success) toast(r.message, 'error'); else toast(`Tema ${themeById(E.project.tema).nama} diterapkan.`);
  };
  $('#d3').onchange = (e) => apply((x) => { x.efek3d = e.target.checked; });
  $$('[data-anim]').forEach((b) => (b.onclick = () => { apply((x) => { x.animasi = b.dataset.anim; }); playAnim(); }));
  $('#playAnim').onclick = playAnim;
  const rm = $('#rmImg');
  if (rm) rm.onclick = () => { snapshot(true); s.gambar = ''; renderAll(); queueSave(); };
}

function playAnim() {
  const st = $('#stage');
  st.innerHTML = renderSlide(cur(), theme(), { deckTitle: E.project.judul, total: E.slides.length, index: E.sel + 1, animate: true, editing: true });
}

function updateCurrent() {
  renderStage();
  const item = $(`.rail-item[data-i="${E.sel}"]`);
  if (item) {
    item.querySelector('.rail-thumb').innerHTML = renderSlide(cur(), theme(), { deckTitle: E.project.judul, total: E.slides.length, index: E.sel + 1 });
    item.querySelector('.rail-name').textContent = cur().judul || 'Tanpa judul';
  }
  const cnt = $('#panel .tnum');
  if (cnt) cnt.textContent = `${cur().poin.length} / ${maxPoin(cur().layout)}`;
  queueSave();
}

function select(i, full) {
  E.sel = Math.max(0, Math.min(E.slides.length - 1, i));
  if (full) renderAll(); else { renderRail(); renderStage(); renderPanel(); renderNotes(); }
  const it = $(`.rail-item[data-i="${E.sel}"]`); it && it.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function addSlide(at) {
  snapshot(true);
  E.slides.splice(at, 0, normSlide({ layout: 'poin', judul: '', poin: [''] }));
  E.tab = 'isi';
  select(at, true);
  queueSave();
  setTimeout(() => { const t = $('#sTitle'); t && t.focus(); }, 30);
}

async function removeSlide(i) {
  const ok = await confirmDialog({ title: 'Hapus slide ini?', message: `Slide ${i + 1} "${E.slides[i].judul || 'Tanpa judul'}" akan dihapus. Anda masih bisa mengurungkannya.`, okText: 'Hapus', danger: true });
  if (!ok) return;
  snapshot(true);
  E.slides.splice(i, 1);
  select(Math.min(i, E.slides.length - 1), true);
  queueSave();
}

function moveSlide(from, to) {
  if (from === to || to < 0 || to >= E.slides.length) return;
  snapshot(true);
  const [s] = E.slides.splice(from, 1);
  E.slides.splice(to, 0, s);
  select(to, true);
  queueSave();
}

/* ---------- Riwayat urungkan/ulangi ---------- */
function stateJson() { return JSON.stringify({ slides: E.slides, judul: E.project.judul, tema: E.project.tema, sel: E.sel }); }
function snapshot(force) {
  const now = Date.now();
  if (!force && now - E.lastSnap < 900) return;
  E.lastSnap = now;
  E.past.push(stateJson());
  if (E.past.length > 60) E.past.shift();
  E.future = [];
  updateHistoryBtns();
}
function restore(json) {
  const st = JSON.parse(json);
  E.slides = st.slides; E.project.judul = st.judul; E.project.tema = st.tema; E.sel = Math.min(st.sel, E.slides.length - 1);
  $('#deckTitle').value = E.project.judul;
  renderAll(); queueSave();
}
function undo() { if (!E.past.length) return; E.future.push(stateJson()); restore(E.past.pop()); E.lastSnap = 0; }
function redo() { if (!E.future.length) return; E.past.push(stateJson()); restore(E.future.pop()); E.lastSnap = 0; }
function updateHistoryBtns() {
  const u = $('#undoBtn'), r = $('#redoBtn');
  if (u) u.disabled = !E.past.length;
  if (r) r.disabled = !E.future.length;
}

/* ---------- Simpan otomatis ---------- */
function setChip(state) {
  const c = $('#saveChip');
  if (!c) return;
  const txt = { saving: 'Menyimpan…', saved: Api.isDemo() ? 'Tersimpan di browser' : 'Semua perubahan tersimpan ke Drive', error: 'Gagal menyimpan — mencoba lagi' };
  c.className = `sync-chip ${state}`;
  c.innerHTML = `<i class="dot"></i>${txt[state]}`;
  setSync(state);
}
function queueSave() {
  setChip('saving');
  clearTimeout(E.saveTimer);
  E.saveTimer = setTimeout(saveNow, 1200);
}
async function saveNow() {
  clearTimeout(E.saveTimer);
  E.saveTimer = null;
  if (!E.project) return true;
  const payload = { idProyek: E.project.id, judul: E.project.judul, slides: E.slides.map((s) => Object.assign({}, s, { poin: s.poin.map((p) => p.trim()).filter(Boolean) })) };
  const p = Api.call('saveSlides', payload);
  E.saving = p;
  const r = await p;
  E.saving = null;
  if (r.success) {
    setChip('saved');
    E.project.status = 'Draf';
    const sp = Store.projects.find((x) => x.id === E.project.id);
    if (sp) Object.assign(sp, { judul: E.project.judul, jumlahSlide: E.slides.length, status: 'Draf', diubah: new Date().toISOString() });
    return true;
  }
  setChip('error');
  E.saveTimer = setTimeout(saveNow, 5000);
  return false;
}
async function flushSave() {
  if (E.saving) await E.saving;
  if (E.saveTimer) return saveNow();
  return true;
}

document.addEventListener('keydown', (e) => {
  if (!location.hash.startsWith('#/editor/')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); }
});
window.addEventListener('beforeunload', (e) => { if (E.saveTimer || E.saving) { e.preventDefault(); e.returnValue = ''; } });

/* ============================================================
   MODAL EKSPOR — bangun Google Slides bertema, lalu PDF/PPTX
   ============================================================ */
function openExportModal(project, slides, preset = 'pdf') {
  const opts = [
    ['pdf', 'Dokumen PDF', 'Siap dibagikan dan dipresentasikan. Tampilan terkunci, tidak bisa diedit.', 'Resolusi Tinggi', 'file'],
    ['pptx', 'PPTX yang Bisa Diedit', 'File PowerPoint asli. Teks, kartu, dan tata letak bisa diedit di PowerPoint atau Google Slides.', 'Office / Keynote', 'play'],
    ['slides', 'Google Slides', 'Tersimpan di folder Drive Hasil_Desain dan langsung dibuka di browser.', 'Tautan Cloud', 'cloud']
  ];
  const m = openModal(`
    <div class="modal-head"><div class="modal-ico">${icon('download', 20)}</div>
      <div><h3>Ekspor Presentasi</h3><p class="muted">${esc(project.judul)} (${slides.length} slide)</p></div>
      <button class="icon-btn" data-close aria-label="Tutup">${icon('x', 18)}</button></div>
    <div class="modal-body" id="expBody">
      <span class="label">Pilih format</span>
      ${opts.map(([v, t, d, tag, ic]) => `<label class="opt-card ${v === preset ? 'on' : ''}"><input type="radio" name="fmt" value="${v}" ${v === preset ? 'checked' : ''}>
        <span class="opt-ico">${icon(ic, 20)}</span><div><div class="row between"><b>${t}</b><span class="badge ${v === 'pdf' ? 'badge-final' : 'badge-soft'}">${tag}</span></div><small class="muted">${d}</small></div></label>`).join('')}
      <div class="notice sm">${icon('info', 18)}<p><b>Catatan:</b> efek miring dan animasi web hanya tampil di pratinjau. File hasil memakai kartu berlapis sebagai efek 3D, dan transisi slide perlu diatur ulang di PowerPoint bila diinginkan.</p></div>
    </div>
    <div class="modal-foot"><span class="muted small row gap-sm">${icon('lock', 14)} Tersimpan di Drive Anda</span>
      <div class="row gap-sm"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-accent" id="expGo">${icon('download', 18)} Konfirmasi & Unduh</button></div></div>`, { size: 'md' });
  $$('.opt-card input', m.el).forEach((i) => i.addEventListener('change', () => $$('.opt-card', m.el).forEach((c) => c.classList.toggle('on', c.querySelector('input').checked))));
  $('#expGo', m.el).onclick = () => runExport(m, project, slides, $('input[name="fmt"]:checked', m.el).value);
}

async function runExport(m, project, slides, fmt) {
  const untitled = slides.findIndex((s) => !String(s.judul).trim());
  if (untitled >= 0) {
    toast(`Slide ${untitled + 1} belum memiliki judul.`, 'error', 'Belum bisa diekspor');
    if (E.project && E.project.id === project.id) { m.close(); E.tab = 'isi'; select(untitled, true); }
    return;
  }
  const body = $('#expBody', m.el), foot = $('.modal-foot', m.el);
  foot.hidden = true;
  const draw = (pct, label) => { body.innerHTML = `<div class="exp-run"><div class="exp-ring"><i class="spin lg"></i></div><b>${esc(label)}</b>
    <div class="bar"><i style="width:${pct * 100}%"></i></div><small class="muted">Jangan tutup jendela ini. Proses dibagi per 8 slide agar aman dari batas waktu.</small></div>`; };
  const failView = (msg) => {
    body.innerHTML = `<div class="exp-run">${icon('alert', 36, 'err-ico')}<b>Ekspor belum berhasil</b><p class="muted ta-c">${esc(msg)}</p></div>`;
    foot.hidden = false;
    foot.innerHTML = `<span></span><div class="row gap-sm"><button class="btn btn-outline" data-x>Tutup</button><button class="btn btn-primary" data-retry>${icon('refresh', 16)} Coba lagi</button></div>`;
    foot.querySelector('[data-x]').onclick = m.close;
    foot.querySelector('[data-retry]').onclick = () => { m.close(); openExportModal(project, slides, fmt); };
  };

  draw(0.03, 'Menyimpan perubahan terakhir…');
  if (E.project && E.project.id === project.id) {
    const saved = await flushSave();
    if (!saved) return failView('Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.');
  }
  let next = 0, total = slides.length, slidesUrl = '';
  while (true) {
    draw(0.08 + 0.72 * (next / total), `Membangun slide ${Math.min(next + 1, total)}–${Math.min(next + 8, total)} dari ${total}…`);
    const r = await Api.call('buildBatch', { id: project.id, start: next });
    if (!r.success) return failView(r.message);
    next = r.data.next; total = r.data.total; slidesUrl = r.data.slidesUrl;
    if (r.data.done) break;
  }
  if (E.project && E.project.id === project.id) E.project.status = 'Siap';

  let result = { name: project.judul, downloadUrl: slidesUrl, folderUrl: Store.folderUrl };
  if (fmt !== 'slides') {
    draw(0.88, `Membuat file ${fmt.toUpperCase()}…`);
    const ex = await Api.call('exportFile', { id: project.id, format: fmt });
    if (!ex.success) return failView(ex.message);
    result = ex.data;
  } else if (!slidesUrl) {
    return failView('Mode Demo: Google Slides sungguhan dibuat oleh backend Apps Script.');
  }
  refreshStore();
  body.innerHTML = `<div class="exp-run ok"><div class="success-ico">${icon('check', 30)}</div><b>${fmt === 'slides' ? 'Google Slides siap' : `File ${fmt.toUpperCase()} siap`}</b>
    <p class="muted ta-c">Tersimpan di Drive: <code>Hasil_Desain/${esc(result.name || '')}</code></p></div>`;
  foot.hidden = false;
  foot.innerHTML = `${result.folderUrl ? `<a class="link" href="${esc(result.folderUrl)}" target="_blank" rel="noopener">${icon('folder', 16)} Buka folder Drive</a>` : '<span></span>'}
    <div class="row gap-sm">${slidesUrl && fmt !== 'slides' ? `<a class="btn btn-outline" href="${esc(slidesUrl)}" target="_blank" rel="noopener">${icon('external', 16)} Google Slides</a>` : ''}
    <a class="btn btn-accent" href="${esc(result.downloadUrl)}" target="_blank" rel="noopener">${icon(fmt === 'slides' ? 'external' : 'download', 18)} ${fmt === 'slides' ? 'Buka Google Slides' : 'Unduh Sekarang'}</a></div>`;
  toast(fmt === 'slides' ? 'Google Slides berhasil dibuat.' : `File ${fmt.toUpperCase()} berhasil dibuat.`, 'success', 'Ekspor selesai');
}

/* ============================================================
   PRATINJAU LAYAR PENUH
   ============================================================ */
const P = { slides: [], project: null, i: 0, notes: false };

Pages.preview = async (view, params, id) => {
  document.body.classList.add('presenting');
  view.innerHTML = `<div class="present"><div class="present-stage"><i class="spin lg"></i></div></div>`;
  let data;
  if (E.project && E.project.id === id) data = { project: E.project, slides: E.slides };
  else {
    if (!Store.themes.length) await refreshStore();
    const r = await Api.call('getProject', { id });
    if (!r.success) { toast(r.message, 'error'); location.hash = '#/dashboard'; return; }
    data = r.data;
  }
  Object.assign(P, { slides: data.slides.map(normSlide), project: data.project, i: Number(params.get('slide')) || 0 });
  view.innerHTML = `
    <div class="present" id="present">
      <div class="present-top">
        <a class="pbtn ghost" href="#/editor/${id}">${icon('arrowLeft', 18)} <span class="hide-sm">Editor</span></a>
        <span class="present-title">${esc(P.project.judul)}</span>
        <div class="row gap-sm"><button class="pbtn ghost hide-sm" id="pPdf">${icon('download', 16)} PDF</button><button class="pbtn gold" id="pPptx">${icon('download', 16)} PPTX</button></div>
      </div>
      <div class="present-stage" id="pStage"></div>
      <div class="present-notes" id="pNotes" hidden></div>
      <div class="present-bar">
        <button class="pbtn" id="pPrev" aria-label="Sebelumnya">${icon('chevronLeft', 20)}</button>
        <span class="tnum" id="pNum"></span>
        <button class="pbtn" id="pNext" aria-label="Berikutnya">${icon('chevronRight', 20)}</button>
        <i class="vsep"></i>
        <button class="pbtn" id="pNoteBtn" title="Catatan pembicara">${icon('notes', 18)}</button>
        <button class="pbtn" id="pMotion" title="Kurangi gerakan">${icon('motion', 18)}</button>
        <button class="pbtn" id="pFull" title="Layar penuh">${icon('maximize', 18)}</button>
      </div>
    </div>`;
  const go = (d) => { P.i = Math.max(0, Math.min(P.slides.length - 1, P.i + d)); drawPresent(); };
  $('#pPrev').onclick = () => go(-1);
  $('#pNext').onclick = () => go(1);
  $('#pStage').onclick = (e) => go(e.clientX < window.innerWidth / 3 ? -1 : 1);
  $('#pNoteBtn').onclick = () => { P.notes = !P.notes; drawPresent(); };
  $('#pMotion').onclick = () => {
    const on = !document.documentElement.classList.contains('reduce-motion');
    document.documentElement.classList.toggle('reduce-motion', on);
    try { localStorage.setItem('eppt_reduce_motion', on ? '1' : '0'); } catch (err) { /* abaikan */ }
    toast(on ? 'Gerakan dikurangi.' : 'Animasi diaktifkan.', 'info'); drawPresent();
  };
  $('#pFull').onclick = () => {
    const el = $('#present');
    if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };
  $('#pPdf').onclick = () => openExportModal(P.project, P.slides, 'pdf');
  $('#pPptx').onclick = () => openExportModal(P.project, P.slides, 'pptx');
  P.onKey = (e) => {
    if (!location.hash.startsWith('#/pratinjau/') || $('.modal-wrap')) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    if (e.key === 'Escape' && !document.fullscreenElement) location.hash = `#/editor/${id}`;
  };
  document.addEventListener('keydown', P.onKey);
  drawPresent();
};

function drawPresent() {
  const s = P.slides[P.i];
  $('#pStage').innerHTML = `<div class="present-frame">${renderSlide(s, themeById(P.project.tema), { deckTitle: P.project.judul, total: P.slides.length, index: P.i + 1, animate: true })}</div>`;
  $('#pNum').innerHTML = `<b>${String(P.i + 1).padStart(2, '0')}</b> / ${String(P.slides.length).padStart(2, '0')}`;
  $('#pPrev').disabled = P.i === 0;
  $('#pNext').disabled = P.i === P.slides.length - 1;
  const n = $('#pNotes');
  n.hidden = !P.notes;
  n.innerHTML = `<b>${icon('notes', 16)} Catatan</b><p>${esc(s.catatan) || '<span class="muted">Tidak ada catatan untuk slide ini.</span>'}</p>`;
  $('#pNoteBtn').classList.toggle('on', P.notes);
  $('#pMotion').classList.toggle('on', document.documentElement.classList.contains('reduce-motion'));
}

function leavePreview() {
  document.body.classList.remove('presenting');
  if (P.onKey) document.removeEventListener('keydown', P.onKey);
  P.onKey = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
