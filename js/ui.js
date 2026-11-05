/* ============================================================
   UI HELPERS — state global, toast, modal, render slide, efek 3D
   ============================================================ */
const Store = {
  projects: [], themes: [], settings: {}, quota: { used: 0, limit: 10, left: 10 },
  stats: { total: 0, fromUpload: 0, exportsThisMonth: 0 }, folderUrl: '', loaded: false
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function themeById(id) {
  return Store.themes.find((t) => t.id === id) || Store.themes[0] || {
    id: 'T-EXEC', nama: 'Executive Precision', bg: '#FFFFFF', surface: '#F4F6F8', primary: '#1B2A41',
    accent: '#C9A227', ink: '#0F172A', muted: '#64748B', font: 'Inter', depth: 2
  };
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '-';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Kemarin';
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusPill(s) {
  const map = { 'Siap': 'final', 'Draf': 'draft', 'Memproses': 'proc', 'Gagal': 'fail' };
  const spin = s === 'Memproses' ? '<i class="spin"></i>' : '';
  return `<span class="badge badge-${map[s] || 'draft'}">${spin}${esc(s || 'Draf')}</span>`;
}

function sourcePill(s) {
  return s === 'Upload'
    ? `<span class="badge badge-upload">${icon('fileUp', 12)} PPTX Unggahan</span>`
    : `<span class="badge badge-native"><i class="dot"></i> Dibuat Baru</span>`;
}

/* ---------- Toast ---------- */
function toast(message, type = 'success', title) {
  const box = document.createElement('div');
  const ic = { success: 'checkCircle', error: 'alert', info: 'info', warning: 'alert' }[type] || 'info';
  box.className = `toast toast-${type}`;
  box.innerHTML = `<span class="toast-ico">${icon(ic, 20)}</span>
    <div class="toast-body">${title ? `<b>${esc(title)}</b>` : ''}<span>${esc(message)}</span></div>
    <button class="toast-x" aria-label="Tutup">${icon('x', 16)}</button>`;
  $('#toasts').appendChild(box);
  const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
  box.querySelector('.toast-x').onclick = close;
  setTimeout(close, type === 'error' ? 6000 : 3500);
}

/* ---------- Modal ---------- */
function openModal(html, opts = {}) {
  const root = $('#modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${opts.size || ''}" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));
  const close = () => {
    wrap.classList.remove('in');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 200);
    opts.onClose && opts.onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape' && !opts.locked) close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !opts.locked) close(); });
  $$('[data-close]', wrap).forEach((b) => (b.onclick = close));
  const first = wrap.querySelector('input, textarea, select, button:not([data-close])');
  first && setTimeout(() => first.focus(), 60);
  return { el: wrap.firstElementChild, close };
}

function confirmDialog({ title, message, okText = 'Ya, lanjutkan', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal(`
      <div class="modal-head"><div class="modal-ico ${danger ? 'danger' : ''}">${icon(danger ? 'trash' : 'info', 20)}</div>
        <div><h3>${esc(title)}</h3><p class="muted">${esc(message)}</p></div></div>
      <div class="modal-foot"><button class="btn btn-outline" data-close>Batal</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cfOk">${esc(okText)}</button></div>`,
      { size: 'sm', onClose: () => { if (!answered) resolve(false); } });
    $('#cfOk', m.el).onclick = () => { answered = true; resolve(true); m.close(); };
  });
}

/* ---------- Render slide (dipakai editor, thumbnail, pratinjau, galeri tema) ---------- */
function shade(hex, amt) {
  const c = String(hex || '#ffffff').replace('#', '');
  const f = (i) => {
    const v = parseInt(c.substr(i, 2), 16);
    const n = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
    return ('0' + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2);
  };
  return '#' + f(0) + f(2) + f(4);
}
function isDark(hex) {
  const c = String(hex || '#fff').replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function renderSlide(s, theme, opts = {}) {
  const t = theme || themeById();
  const depth = s.efek3d === false ? 0 : Number(t.depth) || 1;
  const dark = isDark(t.bg);
  const layers = [];
  for (let k = 1; k <= depth; k++) layers.push(`${k * 0.42}cqw ${k * 0.56}cqw 0 ${shade(t.bg, dark ? -0.25 - k * 0.05 : -0.04 - k * 0.025)}`);
  const shadow = depth ? layers.join(',') + `, 0 ${depth * 1.2}cqw ${depth * 3}cqw rgba(15,23,42,${dark ? 0.35 : 0.08})` : 'none';
  const style = `--bg:${t.bg};--sf:${t.surface};--pr:${t.primary};--ac:${t.accent};--ink:${t.ink};--mu:${t.muted};--card-shadow:${shadow};font-family:'${t.font || 'Inter'}',Inter,sans-serif`;
  const poin = (s.poin || []).filter((p) => String(p).trim() !== '' || opts.editing);
  const li = (arr) => arr.map((p, i) => `<li class="s-a" style="--i:${i + 3}">${esc(p) || '&nbsp;'}</li>`).join('');
  const anim = opts.animate ? `anim-${s.animasi || 'fade'}` : '';
  const img = s.gambar ? `<div class="s-img s-a" style="--i:3">${icon('image', 28)}<span>Gambar dari file asli</span></div>` : '';
  let body = '';

  if (s.layout === 'judul' || s.layout === 'penutup') {
    body = `<div class="s-hero ${s.layout === 'penutup' ? 'center' : ''} ${depth ? 'carded' : ''}">
      <i class="s-bar s-a" style="--i:0"></i>
      <h2 class="s-title-lg s-a" style="--i:1">${esc(s.judul) || '<span class="ph">Judul slide</span>'}</h2>
      ${poin.length ? `<p class="s-sub s-a" style="--i:2">${poin.map(esc).join('<br>')}</p>` : ''}
    </div>`;
  } else {
    const two = s.layout === 'dua-kolom' && !s.gambar;
    const half = Math.ceil(poin.length / 2);
    body = `<div class="s-kicker s-a" style="--i:0">${esc(opts.deckTitle || '')}</div>
      <h2 class="s-title s-a" style="--i:1">${esc(s.judul) || '<span class="ph">Judul slide</span>'}</h2>
      <i class="s-bar sm s-a" style="--i:2"></i>
      <div class="s-content ${s.gambar ? 'has-img' : ''}">
        <div class="s-card ${depth ? 'carded' : 'flat'}">
          ${two ? `<ul class="s-list">${li(poin.slice(0, half))}</ul><ul class="s-list">${li(poin.slice(half))}</ul>`
                : `<ul class="s-list">${li(poin)}</ul>`}
        </div>${img}
      </div>
      ${opts.total ? `<div class="s-num">${s.nomor || opts.index || ''} / ${opts.total}</div>` : ''}`;
  }
  return `<div class="slide l-${s.layout || 'poin'} ${anim}" style="${style}">${body}</div>`;
}

/* ---------- Efek miring 3D pada elemen [data-tilt] ---------- */
function reduceMotion() {
  return document.documentElement.classList.contains('reduce-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest && e.target.closest('[data-tilt]');
  $$('[data-tilt].tilting').forEach((x) => { if (x !== el) { x.classList.remove('tilting'); x.style.transform = ''; } });
  if (!el || reduceMotion() || e.pointerType === 'touch') return;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  const max = Number(el.dataset.tilt) || 4;
  el.classList.add('tilting');
  el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-3px)`;
});
document.addEventListener('pointerleave', () => $$('[data-tilt]').forEach((x) => { x.style.transform = ''; }), true);

/* ---------- Dropdown sederhana ---------- */
function attachMenu(btn, items) {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    $$('.menu-pop').forEach((m) => m.remove());
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.innerHTML = items.map((it, i) => it === '-' ? '<hr>' :
      `<button data-i="${i}" class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''}>${icon(it.icon, 16)} ${esc(it.label)}</button>`).join('');
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    pop.style.top = (r.bottom + h + 8 > window.innerHeight ? r.top - h - 6 : r.bottom + 6) + 'px';
    pop.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      if (!b) return;
      pop.remove();
      items[Number(b.dataset.i)].onClick();
    });
  });
}
document.addEventListener('click', () => $$('.menu-pop').forEach((m) => m.remove()));
window.addEventListener('scroll', () => $$('.menu-pop').forEach((m) => m.remove()), true);

/* ---------- Kuota & sinkronisasi di topbar ---------- */
function renderQuota() {
  const q = Store.quota;
  $('#quotaPill').innerHTML = `${icon('zap', 14)} <span><b>${q.left}</b>/${q.limit}<span class="hide-sm"> konversi tersisa</span></span>`;
}
function setSync(state) {
  const el = $('#syncState');
  const map = {
    saved: ['ok', 'cloud', Api.isDemo() ? 'Tersimpan di browser' : 'Tersinkron ke Drive'],
    saving: ['busy', 'refresh', 'Menyimpan…'],
    error: ['err', 'alert', 'Gagal menyimpan']
  };
  const [cls, ic, label] = map[state] || map.saved;
  el.className = `sync sync-${cls}`;
  el.innerHTML = `<i class="dot"></i>${icon(ic, 14)}<span class="hide-sm">${label}</span>`;
}
