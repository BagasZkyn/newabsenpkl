// api/config.js
// File ini berfungsi sebagai satu-satunya sumber kebenaran (Single Source of Truth)
// untuk semua data akun. Baik API absensi maupun API histori akan mengimpor dari sini.

export const accounts = {
  bagas: { 
    email: '13636@gmail.com', 
    password: '13636',
    qrcode: '2025/53ECC/SW2025-03-21',
    nama: 'Bagas Zakyan',
    tempat: 'PT CYB Media'
  },
  dea: { 
    email: '13637@gmail.com', 
    password: '13637',
    qrcode: '2024/9722/SW2024-12-18',
    nama: 'Dea Fransiska',
    tempat: 'Particle Komputer'
  },
  // Tambahkan akun lain di sini jika perlu
};
