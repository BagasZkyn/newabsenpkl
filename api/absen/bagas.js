import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

export default async function handler(req, res) {
  try {
    // Step 1: Login
    const loginRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=login', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://absenpkl.stmbksimo.com/',
      },
      body: new URLSearchParams({
        email: '13636@gmail.com',
        password: '13636'
      })
    });

    const loginText = await loginRes.text();
    if (!loginText.toLowerCase().includes('success')) {
      return res.status(401).send('Login gagal. Cek email/password.');
    }

    // Step 2: Absen
    const absenRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=absent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://absenpkl.stmbksimo.com/absent',
      },
      body: new URLSearchParams({
        qrcode: '2025/53ECC/SW2025-03-21',
        latitude: '-7.530607277797366,110.58327667415142',
        radius: '2'
      })
    });

    const absenText = await absenRes.text();
    res.status(200).send(`Absen response: ${absenText}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat absen.');
  }
}
