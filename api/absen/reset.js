import { google } from 'googleapis';
import moment from 'moment-timezone';

// --- Konfigurasi Google Sheets ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME;

// Kolom di Google Sheet (0-indexed)
const COL_NAMA = 0; // Kolom A - Nama
const COL_EMAIL = 1; // Kolom B - Email
const COL_PASSWORD = 2; // Kolom C - Password
const COL_JAM_MASUK = 3; // Kolom D - Jam Absen Masuk
const COL_STATUS_MASUK = 4; // Kolom E - Status Absen Masuk
const COL_JAM_PULANG = 5; // Kolom F - Jam Absen Pulang
const COL_STATUS_PULANG = 6; // Kolom G - Status Absen Pulang

async function resetAllAbsenData() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!SPREADSHEET_ID || !SHEET_NAME) {
    console.error('❌ Variabel lingkungan GOOGLE_SHEET_ID atau GOOGLE_SHEET_NAME tidak lengkap.');
    return { success: false, message: 'Konfigurasi Google Sheets tidak lengkap' };
  }

  if (!clientEmail || !privateKey) {
    console.error('❌ Variabel lingkungan GOOGLE_CLIENT_EMAIL atau GOOGLE_PRIVATE_KEY tidak lengkap.');
    return { success: false, message: 'Kredensial Google tidak lengkap' };
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

    // 1. Ambil semua data untuk mengetahui berapa banyak baris yang ada
    console.log('📊 Mengambil data dari Google Sheet...');
    const allDataRange = `${SHEET_NAME}!A:G`; // Ambil semua kolom A-G
    const getAllDataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: allDataRange,
    });

    const allData = getAllDataRes.data.values || [];
    
    if (allData.length <= 1) {
      return { success: false, message: 'Tidak ada data yang perlu direset (hanya ada header atau sheet kosong)' };
    }

    const totalDataRows = allData.length - 1; // Kurangi 1 untuk header
    console.log(`📋 Ditemukan ${totalDataRows} baris data (tidak termasuk header)`);

    // 2. Siapkan data untuk reset
    const startRow = 2; // Mulai dari baris 2 (skip header)
    const endRow = allData.length; // Sampai baris terakhir

    // Kolom yang akan direset
    const jamMasukColumn = String.fromCharCode(65 + COL_JAM_MASUK); // D
    const statusMasukColumn = String.fromCharCode(65 + COL_STATUS_MASUK); // E
    const jamPulangColumn = String.fromCharCode(65 + COL_JAM_PULANG); // F
    const statusPulangColumn = String.fromCharCode(65 + COL_STATUS_PULANG); // G

    // 3. Reset Jam Absen Masuk (Kolom D) - menjadi kosong
    console.log('🔄 Mereset Jam Absen Masuk...');
    const jamMasukRange = `${SHEET_NAME}!${jamMasukColumn}${startRow}:${jamMasukColumn}${endRow}`;
    const emptyJamMasukValues = Array(totalDataRows).fill([""]);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: jamMasukRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: emptyJamMasukValues,
      },
    });

    // 4. Reset Status Absen Masuk (Kolom E) - menjadi "Belum Absen"
    console.log('🔄 Mereset Status Absen Masuk...');
    const statusMasukRange = `${SHEET_NAME}!${statusMasukColumn}${startRow}:${statusMasukColumn}${endRow}`;
    const belumAbsenMasukValues = Array(totalDataRows).fill(["Belum Absen"]);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: statusMasukRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: belumAbsenMasukValues,
      },
    });

    // 5. Reset Jam Absen Pulang (Kolom F) - menjadi kosong
    console.log('🔄 Mereset Jam Absen Pulang...');
    const jamPulangRange = `${SHEET_NAME}!${jamPulangColumn}${startRow}:${jamPulangColumn}${endRow}`;
    const emptyJamPulangValues = Array(totalDataRows).fill([""]);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: jamPulangRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: emptyJamPulangValues,
      },
    });

    // 6. Reset Status Absen Pulang (Kolom G) - menjadi "Belum Absen"
    console.log('🔄 Mereset Status Absen Pulang...');
    const statusPulangRange = `${SHEET_NAME}!${statusPulangColumn}${startRow}:${statusPulangColumn}${endRow}`;
    const belumAbsenPulangValues = Array(totalDataRows).fill(["Belum Absen"]);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: statusPulangRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: belumAbsenPulangValues,
      },
    });

    console.log(`✅ Berhasil mereset data absen untuk ${totalDataRows} siswa`);
    
    return { 
      success: true, 
      message: `Berhasil mereset data absen untuk ${totalDataRows} siswa`,
      details: {
        totalRows: totalDataRows,
        jamMasuk: 'Dikosongkan',
        statusMasuk: 'Diubah ke "Belum Absen"',
        jamPulang: 'Dikosongkan',
        statusPulang: 'Diubah ke "Belum Absen"'
      }
    };

  } catch (error) {
    console.error('❌ Error saat reset Google Sheet:', error.message || error);
    return { 
      success: false, 
      message: `Error saat reset: ${error.message}`,
      error: error.stack 
    };
  }
}

// Fungsi untuk mengirim notifikasi WhatsApp
async function sendWhatsAppNotification(message) {
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
    console.log('✅ Notifikasi WhatsApp terkirim');
  } catch (waError) {
    console.error('❌ Gagal mengirim notifikasi WhatsApp:', waError.message || waError);
  }
}

export default async function handler(req, res) {
  try {
    // Hanya izinkan method POST atau GET
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        message: 'Method tidak diizinkan. Gunakan POST atau GET.' 
      });
    }

    console.log('🚀 Memulai proses reset data absen...');
    const waktuReset = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    
    // Jalankan fungsi reset
    const resetResult = await resetAllAbsenData();
    
    if (!resetResult.success) {
      console.error('❌ Reset gagal:', resetResult.message);
      return res.status(500).json(resetResult);
    }

    // Jika berhasil, kirim notifikasi WhatsApp
    const waMessage = `🔄 *Reset Data Absen Berhasil*\n\n⏰ *Waktu Reset*: ${waktuReset} WIB\n📊 *Total Siswa*: ${resetResult.details.totalRows}\n\n📋 *Detail Reset*:\n• Jam Absen Masuk: ${resetResult.details.jamMasuk}\n• Status Absen Masuk: ${resetResult.details.statusMasuk}\n• Jam Absen Pulang: ${resetResult.details.jamPulang}\n• Status Absen Pulang: ${resetResult.details.statusPulang}\n\n✅ Semua data absen telah direset dan siap untuk periode baru.`;
    
    console.log('📱 Mengirim notifikasi WhatsApp...');
    await sendWhatsAppNotification(waMessage);

    // Response sukses
    const response = {
      success: true,
      message: resetResult.message,
      timestamp: waktuReset,
      details: resetResult.details
    };

    console.log('✅ Proses reset selesai:', response);
    res.status(200).json(response);

  } catch (err) {
    console.error('❌ ERROR SAAT PROSES RESET:', err.message || err, err.stack);
    
    const errorResponse = {
      success: false,
      message: `Terjadi kesalahan internal: ${err.message}`,
      timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
      error: err.stack
    };

    res.status(500).json(errorResponse);
  }
}