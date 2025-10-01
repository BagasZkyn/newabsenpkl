// api/history.js
// Endpoint ini dipanggil oleh frontend untuk mendapatkan riwayat absensi.
// Perbaikan utama: endpoint ini sekarang mem-parsing HTML dan mengembalikan JSON yang bersih.

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import { JSDOM } from 'jsdom'; // Diperlukan untuk parsing HTML di server
import { accounts } from './config.js'; // Impor konfigurasi

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

function getDateRange() {
  const today = new Date();
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(today.getDate() - 5);
  const format = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  return { from: format(fiveDaysAgo), to: format(today) };
}

export default async function handler(req, res) {
  const { user } = req.query;

  if (!user || !accounts[user]) {
    return res.status(400).json({ success: false, message: 'User tidak valid.' });
  }

  const { email, password, nama, tempat } = accounts[user];

  try {
    // 1. Login
    const loginRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=login', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ email, password })
    });
    const loginText = await loginRes.text();
    if (!loginText.toLowerCase().includes('success')) {
      return res.status(401).json({ success: false, message: 'Login gagal.' });
    }

    // 2. Fetch History
    const { from, to } = getDateRange();
    const historyRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ from, to })
    });
    const historyHtml = await historyRes.text();

    // --- INILAH BAGIAN PENTINGNYA ---
    // 3. Parse HTML di backend dan ubah menjadi JSON
    const dom = new JSDOM(historyHtml);
    const table = dom.window.document.querySelector('#swdatatable');
    let historyData = [];

    if (table) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 4) { // Pastikan kolom cukup
                historyData.push({
                    tanggal: cols[1]?.textContent.trim() || '',
                    masuk: cols[2]?.textContent.trim() || 'N/A',
                    pulang: cols[3]?.textContent.trim() || 'N/A',
                    status: cols[4]?.textContent.trim() || ''
                });
            }
        });
    }

    res.status(200).json({
      success: true,
      message: 'History berhasil diambil',
      user: { nama, tempat, username: user },
      dateRange: { from, to },
      data: historyData // Kirim data JSON yang sudah bersih
    });

  } catch (err) {
    console.error(`Error saat ambil histori user ${user}:`, err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.', error: err.message });
  }
}
