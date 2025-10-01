// api/absensi.js
// Endpoint ini yang akan dipanggil oleh cron-job.org untuk melakukan absensi.
// Mengimpor data akun dari file config terpusat.

import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import moment from 'moment-timezone';
import { accounts } from './config.js'; // Impor konfigurasi

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

export default async function handler(req, res) {
  const { user } = req.query;

  if (!user || !accounts[user]) {
    return res.status(400).json({ success: false, message: 'User tidak valid.' });
  }

  const { email, password, qrcode } = accounts[user];
  const requestStartTime = Date.now();

  try {
    // 1. Login
    const loginRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=login', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' },
      body: new URLSearchParams({ email, password })
    });
    const loginText = await loginRes.text();
    if (!loginText.toLowerCase().includes('success')) {
      return res.status(401).json({ success: false, message: 'Login gagal.' });
    }

    // 2. Absen
    const absenRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=absent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' },
      body: new URLSearchParams({ qrcode, latitude: '-7.544776,110.792730', radius: '2' })
    });
    const absenText = await absenRes.text();

    const totalDuration = Date.now() - requestStartTime;
    const jam = moment().tz('Asia/Jakarta').hour();
    const statusAbsen = jam >= 6 && jam < 15 ? 'Masuk' : 'Pulang';

    if (absenText.toLowerCase().includes('pulang belum diperbolehkan')) {
      return res.status(200).json({ success: false, message: 'Absen pulang belum diperbolehkan.', detail: absenText });
    }

    res.status(200).json({
      success: true,
      message: `Absen ${statusAbsen} berhasil`,
      detail: absenText,
      duration: totalDuration,
    });
  } catch (err) {
    console.error(`Error pada absensi user ${user}:`, err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.', error: err.message });
  }
}
