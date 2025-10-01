const CRON_API_URL = "https://api.cron-job.org";
const accounts = [
  {
    name: "Bagas Zakyan",
    email: "13636@gmail.com",
    endpoint: "/api/logger/testlog?user=bagas",
    cron: {
      masuk: { jobId: "6070729", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" },
      pulang: { jobId: "6070763", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" }
    }
  },
  {
    name: "Dea Fransiska",
    email: "13637@gmail.com",
    endpoint: "/api/logger/testlog?user=dea",
    cron: {
      masuk: { jobId: "6070758", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" },
      pulang: { jobId: "6070776", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" }
    }
  }
];

// ========== Function Utilities ==========

function formatTanggal(date = new Date()) {
  return new Date(date).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase().replace(/\./g, '');
}

function showNotification(message, type = 'error') {
  const notification = document.getElementById('cron-error');
  const notificationText = notification.querySelector('span');
  
  notificationText.textContent = message;
  
  if (type === 'success') {
    notification.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
    notification.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
  } else {
    notification.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
    notification.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
  }
  
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 5000);
}

async function getCronStatus(cronId, apiKey) {
  try {
    const response = await fetch(`${CRON_API_URL}/jobs/${cronId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.jobDetails) {
      throw new Error('Invalid job details structure');
    }

    return data.jobDetails;
  } catch (error) {
    console.error('Error fetching cron status:', error);
    throw error;
  }
}

async function toggleBothCrons(acc, enable) {
  const body = { job: { enabled: enable } };

  const requests = [
    fetch(`${CRON_API_URL}/jobs/${acc.cron.masuk.jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${acc.cron.masuk.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }),
    fetch(`${CRON_API_URL}/jobs/${acc.cron.pulang.jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${acc.cron.pulang.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
  ];

  const responses = await Promise.all(requests);
  if (!responses.every(r => r.ok)) {
    throw new Error('Gagal mengubah status cron');
  }
}

async function updateCronSchedule(acc, jamMasuk, jamPulang) {
  const [jamMasukHours, jamMasukMinutes] = jamMasuk.split(':').map(Number);
  const [jamPulangHours, jamPulangMinutes] = jamPulang.split(':').map(Number);

  const bodyMasuk = {
    job: {
      schedule: {
        timezone: "Asia/Jakarta",
        minutes: [jamMasukMinutes],
        hours: [jamMasukHours],
        mdays: [-1],
        months: [-1],
        wdays: [1,2,3,4,5]
      }
    }
  };
  const bodyPulang = {
    job: {
      schedule: {
        timezone: "Asia/Jakarta",
        minutes: [jamPulangMinutes],
        hours: [jamPulangHours],
        mdays: [-1],
        months: [-1],
        wdays: [1,2,3,4,5]
      }
    }
  };

  const requests = [
    fetch(`${CRON_API_URL}/jobs/${acc.cron.masuk.jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${acc.cron.masuk.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyMasuk)
    }),
    fetch(`${CRON_API_URL}/jobs/${acc.cron.pulang.jobId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${acc.cron.pulang.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyPulang)
    })
  ];

  const responses = await Promise.all(requests);
  if (!responses.every(r => r.ok)) {
    throw new Error('Gagal update jadwal cron');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("account-list");
  const icons = ['fa-user-graduate', 'fa-user-tie', 'fa-user-ninja'];
  let loading = false;

  // Add refresh button functionality
  document.querySelector('.fa-sync-alt').parentElement.addEventListener('click', () => {
    location.reload();
  });

  // Add export button functionality
  document.querySelector('.fa-download').parentElement.addEventListener('click', () => {
    showNotification('Fitur export akan segera tersedia', 'success');
  });

  accounts.forEach((acc, index) => {
    const card = document.createElement("div");
    card.className = "glass-card p-6 transition-all duration-300 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02]";

    const randomIcon = icons[index % icons.length];

    card.innerHTML = `
      <div class="card-content">
        <div class="flex items-start mb-6">
          <div class="bg-blue-900/30 p-4 rounded-xl mr-4 border border-blue-700/30 transition-all group-hover:bg-blue-800/50">
            <i class="fas ${randomIcon} text-3xl text-blue-400"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-white mb-1">${acc.name}</h3>
            <p class="text-blue-300">${acc.email}</p>
          </div>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <span class="status-indicator status-offline mr-2"></span>
            <span class="text-blue-300 text-sm">Memeriksa status...</span>
          </div>
          <button class="px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 rounded-lg text-blue-300 transition flex items-center">
            <i class="fas fa-external-link-alt mr-2"></i>Detail
          </button>
        </div>
      </div>
    `;

    // Check initial cron status
    const checkInitialStatus = async () => {
      try {
        const [cronMasuk, cronPulang] = await Promise.all([
          getCronStatus(acc.cron.masuk.jobId, acc.cron.masuk.apiKey),
          getCronStatus(acc.cron.pulang.jobId, acc.cron.pulang.apiKey)
        ]);
        
        const statusIndicator = card.querySelector('.status-indicator');
        const statusText = card.querySelector('.text-blue-300');
        
        if (cronMasuk.enabled && cronPulang.enabled) {
          statusIndicator.className = 'status-indicator status-online mr-2';
          statusText.textContent = 'Aktif';
        } else {
          statusIndicator.className = 'status-indicator status-offline mr-2';
          statusText.textContent = 'Nonaktif';
        }
      } catch (error) {
        const statusIndicator = card.querySelector('.status-indicator');
        const statusText = card.querySelector('.text-blue-300');
        
        statusIndicator.className = 'status-indicator status-warning mr-2';
        statusText.textContent = 'Error';
      }
    };
    
    checkInitialStatus();

    card.onclick = async () => {
      if (loading) return;
      loading = true;

      try {
        // Show loading state
        const iconElement = card.querySelector('i');
        const originalIconClass = iconElement.className;
        iconElement.className = 'fas fa-spinner fa-spin text-3xl text-blue-400';

        const [cronMasuk, cronPulang, absensiRes] = await Promise.all([
          getCronStatus(acc.cron.masuk.jobId, acc.cron.masuk.apiKey),
          getCronStatus(acc.cron.pulang.jobId, acc.cron.pulang.apiKey),
          fetch(acc.endpoint).then(res => {
            if (!res.ok) throw new Error(`Gagal fetch endpoint: ${res.status}`);
            return res.text();
          })
        ]);
        
        const semuaAktif = cronMasuk.enabled && cronPulang.enabled;
        
        const jamMasukDefault = cronMasuk.schedule.hours[0] !== -1 ?
          `${String(cronMasuk.schedule.hours[0]).padStart(2, '0')}:${String(cronMasuk.schedule.minutes[0]).padStart(2, '0')}` : "08:00";
        
        const jamPulangDefault = cronPulang.schedule.hours[0] !== -1 ?
          `${String(cronPulang.schedule.hours[0]).padStart(2, '0')}:${String(cronPulang.schedule.minutes[0]).padStart(2, '0')}` : "17:00";

        const formatWaktuLokal = (timestamp) => timestamp ? 
          new Date(timestamp * 1000).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }) : '-';

        const statusContainer = document.getElementById("cron-status-container");
        statusContainer.innerHTML = `
          <div class="glass-card p-6 mb-6">
            <h4 class="text-xl font-semibold text-blue-300 mb-4">Cron Masuk</h4>
            <div class="flex items-center mb-2">
              <span class="status-indicator ${cronMasuk.enabled ? 'status-online' : 'status-offline'} mr-2"></span>
              <span class="${cronMasuk.enabled ? 'text-green-400' : 'text-red-400'} font-bold">
                ${cronMasuk.enabled ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
            <p class="text-blue-300 text-sm mb-1">Eksekusi berikutnya:</p>
            <p class="text-white">${formatWaktuLokal(cronMasuk.nextExecution)}</p>
          </div>
          
          <div class="glass-card p-6 mb-6">
            <h4 class="text-xl font-semibold text-blue-300 mb-4">Cron Pulang</h4>
            <div class="flex items-center mb-2">
              <span class="status-indicator ${cronPulang.enabled ? 'status-online' : 'status-offline'} mr-2"></span>
              <span class="${cronPulang.enabled ? 'text-green-400' : 'text-red-400'} font-bold">
                ${cronPulang.enabled ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
            <p class="text-blue-300 text-sm mb-1">Eksekusi berikutnya:</p>
            <p class="text-white">${formatWaktuLokal(cronPulang.nextExecution)}</p>
          </div>
          
          <div class="glass-card p-6">
            <h4 class="text-xl font-semibold text-blue-300 mb-4">Pengaturan Jadwal</h4>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-semibold text-blue-300 mb-2">Jam Masuk</label>
                <input id="input-jam-masuk" type="time" class="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value="${jamMasukDefault}">
              </div>
              <div>
                <label class="block text-sm font-semibold text-blue-300 mb-2">Jam Pulang</label>
                <input id="input-jam-pulang" type="time" class="w-full bg-blue-900/50 border border-blue-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value="${jamPulangDefault}">
              </div>
            </div>
            
            <div class="flex gap-4 mt-6">
              <button id="save-cron-btn" class="flex-1 btn-primary">
                <i class="fas fa-save mr-2"></i>Simpan Jadwal
              </button>
              <button id="toggle-cron-btn" class="flex-1 ${semuaAktif ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white py-3 rounded-lg font-semibold transition">
                <i class="fas ${semuaAktif ? 'fa-stop' : 'fa-play'} mr-2"></i>
                ${semuaAktif ? 'Nonaktifkan Semua' : 'Aktifkan Semua'}
              </button>
            </div>
          </div>
        `;

        document.getElementById("save-cron-btn").onclick = async () => {
          const jamMasuk = document.getElementById("input-jam-masuk").value;
          const jamPulang = document.getElementById("input-jam-pulang").value;
          try {
            loading = true;
            await updateCronSchedule(acc, jamMasuk, jamPulang);
            showNotification('Jadwal berhasil diupdate!', 'success');
            setTimeout(() => location.reload(), 1500);
          } catch (error) {
            showNotification(error.message);
          } finally {
            loading = false;
          }
        };

        document.getElementById("toggle-cron-btn").onclick = async () => {
          try {
            loading = true;
            const enable = !(cronMasuk.enabled && cronPulang.enabled);
            await toggleBothCrons(acc, enable);
            showNotification(`Cron Job berhasil ${enable ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
            setTimeout(() => location.reload(), 1500);
          } catch (error) {
            showNotification(`Error Toggle Cron: ${error.message}`);
          } finally {
            loading = false;
          }
        };

        // Parse Absensi Data
        const parser = new DOMParser();
        const doc = parser.parseFromString(absensiRes, 'text/html');
        const table = doc.querySelector('#swdatatable');
        const rows = table ? table.querySelectorAll('tbody tr') : [];
        const thead = table ? table.querySelector('thead tr') : null;
        let headers = [];
        if (thead) {
          headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent.trim().toUpperCase());
        }

        const tanggalIndex = headers.indexOf('TANGGAL');
        const absenMasukIndex = headers.indexOf('ABSEN MASUK');
        const absenPulangIndex = headers.indexOf('ABSEN PULANG');

        const tanggalHariIni = formatTanggal();
        let status = { masuk: 'Belum Absen', pulang: 'Belum Pulang' };

        rows.forEach(row => {
          const cols = row.querySelectorAll('td, th');
          if (cols.length > Math.max(tanggalIndex, absenMasukIndex, absenPulangIndex) && 
              tanggalIndex !== -1 && absenMasukIndex !== -1 && absenPulangIndex !== -1) {
            const tanggalDiLog = cols[tanggalIndex].textContent.trim().toUpperCase();
            if (tanggalDiLog === tanggalHariIni) {
              const absenMasukText = cols[absenMasukIndex].textContent.trim() || 'Belum Absen';
              status.masuk = absenMasukText.split(' ')[0];
              const jamPulang = cols[absenPulangIndex].textContent.trim();
              status.pulang = jamPulang === '00:00:00' ? 'Belum Pulang' : (jamPulang || 'Belum Pulang');
            }
          }
        });

        const absensiStatusHTML = `
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="glass-card p-6">
              <div class="flex items-center mb-4">
                <i class="fas ${status.masuk === 'Belum Absen' ? 'fa-times-circle text-red-400 text-2xl' : 'fa-clock text-blue-400 text-2xl'} mr-3"></i>
                <div>
                  <h4 class="text-lg font-semibold text-white">Absen Masuk</h4>
                  <p class="${status.masuk === 'Belum Absen' ? 'text-red-400' : 'text-blue-300'} font-medium">${status.masuk}</p>
                </div>
              </div>
            </div>

            <div class="glass-card p-6">
              <div class="flex items-center mb-4">
                <i class="fas ${status.pulang === 'Belum Pulang' ? 'fa-times-circle text-orange-400 text-2xl' : 'fa-check-circle text-green-400 text-2xl'} mr-3"></i>
                <div>
                  <h4 class="text-lg font-semibold text-white">Absen Pulang</h4>
                  <p class="${status.pulang === 'Belum Pulang' ? 'text-orange-400' : 'text-green-300'} font-medium">${status.pulang}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="mb-6 text-blue-300 flex items-center">
            <i class="fas fa-calendar-day mr-3 text-blue-400"></i>
            <span>Pengecekan tanggal: ${tanggalHariIni}</span>
          </div>
        `;

        let riwayatHTML = '';
        if (table) {
          // Apply dark theme to table
          table.classList.add('history-table');
          table.querySelectorAll('th').forEach(th => {
            th.className = 'bg-blue-900/50 text-blue-300 px-4 py-3 text-left font-semibold border-b border-blue-700/50';
          });
          table.querySelectorAll('td').forEach(td => {
            td.className = 'px-4 py-3 border-b border-blue-800/30 text-blue-100';
          });
          table.querySelectorAll('tbody tr').forEach(tr => {
            tr.classList.add('hover:bg-blue-900/30', 'transition-colors');
          });
          riwayatHTML = table.outerHTML;
        } else {
          riwayatHTML = '<div class="text-center py-8 text-blue-300"><i class="fas fa-inbox text-4xl mb-4 block"></i>Tidak ada riwayat absensi.</div>';
        }

        document.getElementById("dialog-title").textContent = acc.name;
        document.getElementById("dialog-email").textContent = acc.email;
        
        // Update status indicator in dialog
        const statusIndicator = document.getElementById("status-indicator");
        const statusText = document.getElementById("status-text");
        
        if (semuaAktif) {
          statusIndicator.className = 'status-indicator status-online';
          statusText.textContent = 'Aktif';
        } else {
          statusIndicator.className = 'status-indicator status-offline';
          statusText.textContent = 'Nonaktif';
        }
        
        document.getElementById("dialog-last").innerHTML = `
          ${absensiStatusHTML}
          <div class="mt-8">
            <h4 class="text-xl font-semibold text-blue-300 mb-4 flex items-center">
              <i class="fas fa-history mr-3"></i> Riwayat Absensi
            </h4>
            ${riwayatHTML}
          </div>
        `;

        document.getElementById("detail-dialog").showModal();

      } catch (error) {
        showNotification(`Error: ${error.message}`);
      } finally {
        loading = false;
        iconElement.className = originalIconClass;
      }
    };

    list.appendChild(card);
  });
});