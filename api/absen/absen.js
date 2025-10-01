import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import moment from 'moment-timezone';
import { google } from 'googleapis';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

// Daftar user (tetap sama)
const users = {
  agung: { email: '13648@gmail.com', password: '13648', qrcode: '2025/C709/SW2025-02-25', nama: 'Agung' },
  azka: { email: '13706@gmail.com', password: '13706', qrcode: '2025/D163/SW2025-02-25', nama: 'Azka' },
  fadil: { email: '13686@gmail.com', password: '13686', qrcode: '2025/B2BB/SW2025-02-25', nama: 'Fadil' },
  bagas: { email: '13636@gmail.com', password: '13636', qrcode: '2025/53ECC/SW2025-03-21', nama: 'Bagas' },
  eko: { email: '13664@gmail.com', password: '13664', qrcode: '2025/909C/SW2025-02-25', nama: 'Eko' },
  fahmi: { email: '13687@gmail.com', password: '13687', qrcode: '2025/087A/SW2025-02-25', nama: 'Fahmi' },
  hasta: { email: '13643@gmail.com', password: '13643', qrcode: '2025/9074/SW2025-02-25', nama: 'Hasta' },
  nauval: { email: '13157@gmail.com', password: '13157', qrcode: '2025/900D/SW2025-02-25', nama: 'Nauval' },
  surya: { email: '13666@gmail.com', password: '13666', qrcode: '2025/8215/SW2025-02-25', nama: 'Surya' },
  vino: { email: '13734@gmail.com', password: '13734', qrcode: '2025/59F9/SW2025-02-25', nama: 'Vino' },
  test: { email: 'akuntest@gmail.com', password: 'akuntest', qrcode: '2025/2210B/SW2025-04-27', nama: 'Test' }
};

// --- Konfigurasi Google Sheets ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME;

// Kolom di Google Sheet (0-indexed) - Sesuai dengan struktur tabel Anda
const COL_NAMA = 0; // Kolom A - Nama
const COL_EMAIL = 1; // Kolom B - Email
const COL_PASSWORD = 2; // Kolom C - Password
const COL_JAM_MASUK = 3; // Kolom D - Jam Absen Masuk
const COL_STATUS_MASUK = 4; // Kolom E - Status Absen Masuk
const COL_JAM_PULANG = 5; // Kolom F - Jam Absen Pulang
const COL_STATUS_PULANG = 6; // Kolom G - Status Absen Pulang

async function updateGoogleSheet(namaSiswa, waktuAbsen, jenisAbsen) {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!SPREADSHEET_ID || !SHEET_NAME) {
    console.error('Variabel lingkungan GOOGLE_SHEET_ID atau GOOGLE_SHEET_NAME tidak lengkap.');
    return false;
  }

  if (!clientEmail || !privateKey) {
    console.error('Variabel lingkungan GOOGLE_CLIENT_EMAIL atau GOOGLE_PRIVATE_KEY tidak lengkap.');
    return false;
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        project_id: projectId,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Dapatkan semua data nama untuk mencari baris yang sesuai
    const namaRange = `${SHEET_NAME}!A2:A`; // Mulai dari baris 2, skip header
    const getNamesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: namaRange,
    });

    const namesInSheet = getNamesRes.data.values ? getNamesRes.data.values.flat() : [];
    const rowIndex = namesInSheet.findIndex(name => name === namaSiswa);

    if (rowIndex === -1) {
      console.error(`Nama "${namaSiswa}" tidak ditemukan di Google Sheet.`);
      return false;
    }

    const targetRow = rowIndex + 2; // +2 karena sheet 1-indexed dan kita skip header

    // 2. Tentukan kolom mana yang akan diupdate berdasarkan jenis absen
    let jamColumnLetter;
    let statusColumnLetter;

    if (jenisAbsen === 'Masuk') {
      jamColumnLetter = String.fromCharCode(65 + COL_JAM_MASUK); // Kolom D
      statusColumnLetter = String.fromCharCode(65 + COL_STATUS_MASUK); // Kolom E
    } else { // Pulang
      jamColumnLetter = String.fromCharCode(65 + COL_JAM_PULANG); // Kolom F
      statusColumnLetter = String.fromCharCode(65 + COL_STATUS_PULANG); // Kolom G
    }

    const rangeJam = `${SHEET_NAME}!${jamColumnLetter}${targetRow}`;
    const rangeStatus = `${SHEET_NAME}!${statusColumnLetter}${targetRow}`;

    // 3. Update Jam Absen
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeJam,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[waktuAbsen]],
      },
    });

    // 4. Update Status Absen menjadi "Sudah"
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeStatus,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['Sudah']],
      },
    });

    console.log(`✅ Google Sheet berhasil diupdate untuk ${namaSiswa} - ${jenisAbsen} pukul ${waktuAbsen}`);
    return true;

  } catch (error) {
    console.error('❌ Error saat update Google Sheet:', error.message || error);
    return false;
  }
}

// Fungsi untuk mengecek apakah absen berhasil berdasarkan response
function isAbsenSuccessful(absenText) {
  const lowerText = absenText.toLowerCase();
  
  // Kondisi yang menandakan absen GAGAL
  const failureConditions = [
    'error',
    'gagal',
    'invalid qr code',
    'sudah melakukan absen',
    'pulang belum diperbolehkan',
    'qr code tidak valid',
    'absen sudah dilakukan'
  ];
  
  // Jika ada kondisi gagal, return false
  for (const condition of failureConditions) {
    if (lowerText.includes(condition)) {
      return false;
    }
  }
  
  // Kondisi yang menandakan absen BERHASIL
  const successConditions = [
    'success',
    'berhasil',
    'sukses',
    'absen tercatat'
  ];
  
  // Jika ada kondisi berhasil, return true
  for (const condition of successConditions) {
    if (lowerText.includes(condition)) {
      return true;
    }
  }
  
  // Jika tidak ada kondisi gagal dan tidak ada kondisi berhasil yang jelas,
  // kita perlu hati-hati. Untuk safety, anggap gagal jika tidak ada konfirmasi sukses
  console.warn(`⚠️ Response absen tidak jelas: ${absenText}`);
  return false;
}

export default async function handler(req, res) {
  try {
    await jar.removeAllCookies();
    const { user } = req.query;
    
    if (!user || !users[user]) {
      return res.status(400).send('User tidak ditemukan atau tidak valid.');
    }

    const { email, password, qrcode, nama } = users[user];

    // Step 1: Login
    console.log(`[${nama}] 🔐 Mencoba login...`);
    const loginRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=login', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://absenpkl.stmbksimo.com/',
      },
      body: new URLSearchParams({ email, password })
    });

    const loginText = await loginRes.text();
    if (!loginText.toLowerCase().includes('success')) {
      console.error(`[${nama}] ❌ Login gagal. Respon: ${loginText}`);
      return res.status(401).send(`Login gagal untuk ${nama}. Respon: ${loginText}`);
    }
    console.log(`[${nama}] ✅ Login berhasil.`);

    // Step 2: Absen
    console.log(`[${nama}] 📝 Mencoba absen...`);
    const absenRes = await fetchWithCookies('https://absenpkl.stmbksimo.com/sw-proses?action=absent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://absenpkl.stmbksimo.com/absent',
      },
      body: new URLSearchParams({
        qrcode,
        latitude: '-7.530607277797366,110.58327667415142',
        radius: '2'
      })
    });

    const absenText = await absenRes.text();
    console.log(`[${nama}] 📋 Respon absen: ${absenText}`);

    // Step 3: Cek apakah absen berhasil
    if (!isAbsenSuccessful(absenText)) {
      console.log(`[${nama}] ❌ Absen ditolak/gagal: ${absenText}`);
      return res.status(200).send(`Absen ditolak/gagal untuk ${nama}: ${absenText}`);
    }

    // Step 4: Jika absen berhasil, update Google Sheet
    const waktu = moment().tz('Asia/Jakarta').format('HH:mm:ss');
    const jam = moment().tz('Asia/Jakarta').hour();
    const jenisAbsen = jam < 12 ? 'Masuk' : 'Pulang';

    console.log(`[${nama}] ✅ Absen berhasil! Updating Google Sheet untuk absen ${jenisAbsen}...`);
    
    const sheetUpdateSuccess = await updateGoogleSheet(nama, waktu, jenisAbsen);
    
    if (!sheetUpdateSuccess) {
      console.error(`[${nama}] ⚠️ Absen berhasil tapi gagal update Google Sheet`);
    }

    // Step 5: Kirim notifikasi WhatsApp
    const message = `✅ *Absensi Berhasil*\n\n👤 *Nama* : ${nama}\n⏰ *Waktu* : ${waktu} WIB\n📌 *Status* : ${jenisAbsen}\n📊 *Google Sheet* : ${sheetUpdateSuccess ? 'Terupdate' : 'Gagal update'}\n\nRespon Server: ${absenText}`;

    console.log(`[${nama}] 📱 Mengirim notifikasi WhatsApp...`);
    try {
        await fetch('https://go-whatsapp-web-multidevice-production-add9.up.railway.app/send/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64')
            },
            body: JSON.stringify({
                phone: '120363415349017222@g.us',
                message,
                reply_message_id: ''
            })
        });
        console.log(`[${nama}] ✅ Notifikasi WhatsApp terkirim.`);
    } catch (waError) {
        console.error(`[${nama}] ❌ Gagal mengirim notifikasi WhatsApp:`, waError.message || waError);
    }

    const responseMessage = `✅ Absen ${jenisAbsen} untuk ${nama} pukul ${waktu} berhasil!\n📊 Google Sheet: ${sheetUpdateSuccess ? 'Berhasil diupdate' : 'Gagal diupdate'}\n📋 Respon server: ${absenText}`;
    
    res.status(200).send(responseMessage);

  } catch (err) {
    console.error(`[${req.query.user || 'UNKNOWN_USER'}] ❌ ERROR SAAT PROSES ABSEN UTAMA:`, err.message || err, err.stack);
    res.status(500).send(`Terjadi kesalahan internal saat proses absen: ${err.message}`);
  }
}