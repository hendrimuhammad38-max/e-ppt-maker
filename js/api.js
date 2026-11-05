/**
 * API — semua komunikasi ke backend Apps Script lewat fetch() POST.
 * Header text/plain wajib agar tidak memicu CORS preflight yang ditolak GAS.
 */
const Api = (() => {
  const KEY_STORE = 'eppt_access_key';
  const isDemo = () => !APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL.includes('XXXX');

  const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } };
  const setKey = (k) => { try { localStorage.setItem(KEY_STORE, k); } catch (e) { /* abaikan */ } };
  const clearKey = () => { try { localStorage.removeItem(KEY_STORE); } catch (e) { /* abaikan */ } };

  async function call(action, data = {}, keyOverride) {
    if (isDemo()) return DemoBackend.call(action, data);
    let res;
    try {
      const r = await fetch(APP_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, key: keyOverride || getKey(), data })
      });
      res = await r.json();
    } catch (err) {
      return { success: false, code: 'NETWORK', message: 'Tidak dapat terhubung ke server. Periksa koneksi atau GAS_URL.' };
    }
    if (res && res.code === 'AUTH') window.dispatchEvent(new CustomEvent('eppt:auth'));
    return res || { success: false, message: 'Respons kosong dari server.' };
  }

  /** Baca potongan file sebagai base64 (tanpa prefix data URL). */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  /** Unggah file bertahap. onProgress(0..1). */
  async function uploadFile(file, onProgress) {
    const size = APP_CONFIG.CHUNK_BYTES;
    const total = Math.max(1, Math.ceil(file.size / size));
    const uploadId = 'U' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    for (let i = 0; i < total; i++) {
      const data = await blobToBase64(file.slice(i * size, (i + 1) * size));
      const r = await call('uploadChunk', { uploadId, index: i, total, name: file.name, data });
      if (!r.success) return r;
      onProgress && onProgress((i + 1) / total);
    }
    return { success: true, data: { uploadId, total } };
  }

  return { call, uploadFile, isDemo, getKey, setKey, clearKey };
})();
