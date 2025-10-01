import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import moment from 'moment-timezone';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

// Daftar user
const users = {
  bagas: {
    email: '13636@gmail.com',
    password: '13636',
    qrcode: '2025/53ECC/SW2025-03-21',
    nama: 'Bagas',
    tempat: 'PT CYB Media',
    wa: '6281312539057@s.whatsapp.net'
  },
  dea: {
    email: '13637@gmail.com',
    password: '13637',
    qrcode: '2024/9722/SW2024-12-18',
    nama: 'Dea',
    tempat: 'Particle Komputer',
    wa: '62882007936203@s.whatsapp.net'
  },
  test: {
    email: 'akuntest2@gmail.com',
    password: 'akuntest2',
    qrcode: '2025/DEC38/SW2025-07-09',
    nama: 'Test',
    tempat: 'Peler lu pecah',
    wa: '6281312539057@s.whatsapp.net'
  }
};

// Sistem logging internal
const logSystem = {
  logs: [],
  
  addLog: (logData) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...logData
    };
    logSystem.logs.push(logEntry);
    
    // Batasi jumlah log untuk mencegah memory leak
    if (logSystem.logs.length > 100) {
      logSystem.logs = logSystem.logs.slice(-50);
    }
    
    console.log(`[ABSENSI LOG] ${JSON.stringify(logEntry)}`);
  },
  
  getLogs: (user = null, limit = 20) => {
    if (user) {
      return logSystem.logs
        .filter(log => log.user === user)
        .slice(-limit);
    }
    return logSystem.logs.slice(-limit);
  },
  
  clearLogs: () => {
    logSystem.logs = [];
  }
};

export default async function handler(req, res) {
  try {
    const { user } = req.query;
    if (!user || !users[user]) {
      logSystem.addLog({
        user: 'system',
        status: 'error',
        message: 'User tidak ditemukan atau tidak valid',
        request: req.query
      });
      return res.status(400).json({
        success: false,
        message: 'User tidak ditemukan atau tidak valid.',
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, qrcode, nama, tempat } = users[user];
    const requestStartTime = Date.now();

    // Step 1: Login
    const loginRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=login', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://absenpkl.stmbksimo.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      body: new URLSearchParams({ email, password })
    });

    const loginText = await loginRes.text();
    const loginDuration = Date.now() - requestStartTime;
    
    if (!loginText.toLowerCase().includes('success')) {
      logSystem.addLog({
        user,
        status: 'login_failed',
        message: 'Login gagal',
        detail: 'Email atau password salah',
        response: loginText,
        duration: loginDuration
      });
      
      return res.status(401).json({
        success: false,
        message: 'Login gagal. Cek email/password.',
        timestamp: new Date().toISOString(),
        duration: loginDuration
      });
    }

    // Step 2: Absen
    const absenStartTime = Date.now();
    const absenRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=absent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://absenpkl.stmbksimo.com/absent'
      },
      body: new URLSearchParams({
        qrcode,
        latitude: '-7.544776,110.792730',
        radius: '2'
      })
    });

    const absenText = await absenRes.text();
    const absenDuration = Date.now() - absenStartTime;
    const totalDuration = Date.now() - requestStartTime;

    // Jika absen belum diperbolehkan
    if (absenText.toLowerCase().includes('pulang belum diperbolehkan')) {
      logSystem.addLog({
        user,
        status: 'absen_rejected',
        message: 'Absen ditolak',
        detail: absenText,
        duration: absenDuration,
        totalDuration
      });
      
      return res.status(200).json({
        success: false,
        message: 'Absen ditolak',
        detail: absenText,
        timestamp: new Date().toISOString(),
        duration: absenDuration,
        totalDuration
      });
    }

    // Absen berhasil
    const waktu = moment().tz('Asia/Jakarta').format('HH:mm:ss');
    const jam = moment().tz('Asia/Jakarta').hour();
    const status = jam >= 6 && jam < 15 ? 'Masuk' : 'Pulang';

    logSystem.addLog({
      user,
      status: 'success',
      message: `Absen ${status} berhasil`,
      waktu,
      detail: absenText,
      duration: absenDuration,
      totalDuration
    });

    res.status(200).json({
      success: true,
      message: `Absen ${status} berhasil`,
      waktu,
      status,
      detail: absenText,
      timestamp: new Date().toISOString(),
      duration: absenDuration,
      totalDuration,
      performance: {
        login: loginDuration,
        absen: absenDuration,
        total: totalDuration
      }
    });
  } catch (err) {
    console.error('ERROR SAAT ABSEN:', err);
    
    const waktu = moment().tz('Asia/Jakarta').format('HH:mm:ss');
    logSystem.addLog({
      user: req.query.user || 'unknown',
      status: 'error',
      message: 'Terjadi kesalahan sistem',
      detail: err.message || 'Terjadi kesalahan tidak diketahui',
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat absen.',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Endpoint untuk mendapatkan log (opsional)
export async function logsHandler(req, res) {
  try {
    const { user, limit } = req.query;
    const logs = logSystem.getLogs(user, limit ? parseInt(limit) : 20);
    
    res.status(200).json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil log',
      error: err.message
    });
  }
}