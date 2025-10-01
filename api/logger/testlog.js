import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import moment from 'moment-timezone';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

// Mapping akun berdasarkan username
const accounts = {
  bagas: { 
    email: '13636@gmail.com', 
    password: '13636',
    nama: 'Bagas Zakyan',
    tempat: 'PT CYB Media'
  },
  dea: { 
    email: '13637@gmail.com', 
    password: '13637',
    nama: 'Dea Fransiska',
    tempat: 'Particle Komputer'
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
    
    console.log(`[HISTORY LOG] ${JSON.stringify(logEntry)}`);
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

function getDateRange() {
  const today = new Date();
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(today.getDate() - 5);

  const format = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return {
    from: format(fiveDaysAgo),
    to: format(today)
  };
}

export default async function handler(req, res) {
  const { user } = req.query; // ambil param user dari query

  if (!user || !accounts[user]) {
    logSystem.addLog({
      user: 'system',
      status: 'error',
      message: 'User tidak ditemukan',
      request: req.query
    });
    
    return res.status(400).json({
      success: false,
      message: 'User tidak ditemukan.',
      timestamp: new Date().toISOString()
    });
  }

  const { email, password, nama, tempat } = accounts[user];
  const requestStartTime = Date.now();

  try {
    // Login
    const loginStartTime = Date.now();
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
    const loginDuration = Date.now() - loginStartTime;
    
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

    // History
    const historyStartTime = Date.now();
    const { from, to } = getDateRange();
    const historyRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/plain, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://absenpkl.stmbksimo.com/history',
      },
      body: new URLSearchParams({ from, to })
    });

    const historyText = await historyRes.text();
    const historyDuration = Date.now() - historyStartTime;
    const totalDuration = Date.now() - requestStartTime;

    logSystem.addLog({
      user,
      status: 'success',
      message: 'History berhasil diambil',
      dateRange: { from, to },
      duration: historyDuration,
      totalDuration
    });

    res.status(200).json({
      success: true,
      message: 'History berhasil diambil',
      user: {
        nama,
        tempat,
        username: user
      },
      dateRange: { from, to },
      data: historyText,
      timestamp: new Date().toISOString(),
      performance: {
        login: loginDuration,
        history: historyDuration,
        total: totalDuration
      }
    });
  } catch (err) {
    console.error(err);
    
    logSystem.addLog({
      user: user || 'unknown',
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil history',
      detail: err.message || 'Terjadi kesalahan tidak diketahui',
      stack: err.stack
    });

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil history.',
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