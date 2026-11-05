/**
 * KONFIGURASI E-PPT MAKER
 * Isi GAS_URL dengan URL /exec dari Deploy > Web App di Apps Script.
 * Biarkan kosong untuk mencoba Mode Demo (data hanya di browser ini).
 *
 * Catatan keamanan: JANGAN taruh Kunci Akses di file ini.
 * Kunci Akses diminta saat aplikasi dibuka dan disimpan di browser Anda saja.
 */
const APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbya7XkJSKUiVXDsVO5ZS-gpyFP5SEWF7PZs3LvVD3r8RPJQF98PdIOpUDCBz11q6ClG/exec',
  CHUNK_BYTES: 4718592, // 4,5 MB per potongan (kelipatan 3 byte agar base64 bisa disambung)
  MAX_FILE_MB: 50
};
