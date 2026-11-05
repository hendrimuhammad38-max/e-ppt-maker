/* ============================================================
   APP — router berbasis hash, navigasi, kunci akses, inisialisasi
   ============================================================ */
const NAV = [
  { hash: '#/dashboard', label: 'Dashboard', short: 'Dashboard', icon: 'grid', badge: true },
  { hash: '#/baru', label: 'Presentasi Baru', short: 'Baru', icon: 'plusCircle' },
  { hash: '#/unggah', label: 'Unggah PPT', short: 'Unggah', icon: 'fileUp' },
  { hash: '#/tema', label: 'Galeri Tema', short: 'Tema', icon: 'palette' },
  { hash: '#/pengaturan', label: 'Pengaturan', short: 'Atur', icon: 'settings' }
];

const ROUTES_UI = {
  dashboard: { page: 'dashboard', crumb: 'Ringkasan' },
  baru: { page: 'create', crumb: 'Presentasi Baru' },
  unggah: { page: 'upload', crumb: 'Unggah PPT' },
  tema: { page: 'themes', crumb: 'Galeri Tema' },
  pengaturan: { page: 'settings', crumb: 'Pengaturan' },
  editor: { page: 'editor', crumb: 'Editor Slide' },
  pratinjau: { page: 'preview', crumb: 'Pratinjau' }
};

function renderNav() {
  const active = '#/' + (location.hash.replace(/^#\//, '').split(/[/?]/)[0] || 'dashboard');
  const isActive = (h) => h === active || (h === '#/dashboard' && (active === '#/editor' || active === '#/pratinjau'));
  $('#sideNav').innerHTML = NAV.map((n) => `<a href="${n.hash}" class="${isActive(n.hash) ? 'on' : ''}">${icon(n.icon, 20)}<span>${n.label}</span>${n.badge ? '<span class="nav-badge" data-badge hidden></span>' : ''}</a>`).join('');
  $('#bottomNav').innerHTML = NAV.slice(0, 4).map((n) => `<a href="${n.hash}" class="${isActive(n.hash) ? 'on' : ''}">${icon(n.icon, 22)}<span>${n.short}</span></a>`).join('') +
    `<a href="#/pengaturan" class="${isActive('#/pengaturan') ? 'on' : ''}">${icon('settings', 22)}<span>Atur</span></a>`;
  renderNavBadges();
}

function renderNavBadges() {
  const n = Store.projects.filter((p) => p.status === 'Memproses').length;
  $$('[data-badge]').forEach((b) => { b.hidden = !n; b.textContent = `${n} diproses`; });
}

const App = {
  async route() {
    const raw = location.hash.replace(/^#\//, '') || 'dashboard';
    const [path, query] = raw.split('?');
    const [name, id] = path.split('/');
    const r = ROUTES_UI[name] || ROUTES_UI.dashboard;
    const params = new URLSearchParams(query || '');

    if (E.project && name !== 'editor' && name !== 'pratinjau') { await flushSave(); E.project = null; }
    if (name !== 'pratinjau') leavePreview();
    $$('.menu-pop, .modal-wrap').forEach((x) => x.remove());
    document.body.classList.remove('nav-open');

    $('#crumbs').innerHTML = `${icon('folder', 16)}<span class="hide-sm">Ruang Kerja</span>${icon('chevronRight', 14, 'hide-sm')}<b>${r.crumb}</b>`;
    renderNav();
    const view = $('#view');
    view.scrollTop = 0;
    window.scrollTo(0, 0);
    try {
      await Pages[r.page](view, params, id);
    } catch (err) {
      console.error(err);
      view.innerHTML = `<section class="page"><div class="card empty"><h3>Terjadi kesalahan</h3><p class="muted">${esc(err.message)}</p><a class="btn btn-primary" href="#/dashboard">Kembali</a></div></section>`;
    }
  },

  showLock(message) {
    $('#lock').hidden = false;
    $('#app').hidden = true;
    $('#lockError').textContent = message || '';
    setTimeout(() => $('#lockKey').focus(), 50);
  },

  logout() {
    Api.clearKey();
    Store.loaded = false;
    toast('Anda keluar dari perangkat ini.', 'info');
    App.showLock();
  },

  async start() {
    $('#app').hidden = false;
    $('#lock').hidden = true;
    renderQuota();
    setSync('saved');
    await App.route();
  }
};

async function boot() {
  try { if (localStorage.getItem('eppt_reduce_motion') === '1') document.documentElement.classList.add('reduce-motion'); } catch (e) { /* abaikan */ }

  $('#menuBtn').innerHTML = icon('menu', 22);
  $('#logoutBtn').innerHTML = icon('logout', 18);
  $('#sideAvatar').innerHTML = icon('user', 18);
  $('#topCreate').innerHTML = `${icon('plus', 16)} Buat`;
  $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
  $('#scrim').onclick = () => document.body.classList.remove('nav-open');
  $('#logoutBtn').onclick = () => App.logout();

  if (Api.isDemo()) {
    const b = $('#demoBanner');
    b.hidden = false;
    b.innerHTML = `${icon('info', 16)} <span><b>Mode Demo</b> — data hanya tersimpan di browser ini. Isi <code>GAS_URL</code> di <code>js/config.js</code> untuk terhubung ke Google Drive.</span>`;
  }

  window.addEventListener('hashchange', App.route);
  window.addEventListener('eppt:auth', () => App.showLock('Kunci akses tidak valid. Masukkan ulang.'));

  $('#lockForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('#lockKey').value.trim();
    const btn = $('#lockBtn');
    if (!key) { $('#lockError').textContent = 'Kunci akses wajib diisi.'; return; }
    btn.disabled = true; btn.innerHTML = '<i class="spin"></i> Memeriksa…';
    const r = await Api.call('ping', {}, key);
    btn.disabled = false; btn.textContent = 'Masuk';
    if (!r.success) { $('#lockError').textContent = r.message; return; }
    Api.setKey(key);
    $('#lockKey').value = '';
    App.start();
  });

  if (Api.isDemo() || Api.getKey()) App.start();
  else App.showLock();
}

document.addEventListener('DOMContentLoaded', boot);
