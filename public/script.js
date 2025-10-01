// Modern AbsenPKL Dashboard - Main Script
const CRON_API_URL = "https://api.cron-job.org";

// ========== CONFIGURATION ==========
const accounts = [
  {
    id: "bagas",
    name: "Bagas Zakyan",
    email: "13636@gmail.com",
    icon: "fa-user-graduate",
    iconColor: "purple",
    cron: {
      masuk: { jobId: "6070729", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" },
      pulang: { jobId: "6070763", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" }
    }
  },
  {
    id: "dea",
    name: "Dea Fransiska",
    email: "13637@gmail.com",
    icon: "fa-user-tie",
    iconColor: "pink",
    cron: {
      masuk: { jobId: "6070758", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" },
      pulang: { jobId: "6070776", apiKey: "8FgWf4X2k+tXfq5wHlVintm6zBokMuob0AHPo5FabPE=" }
    }
  }
];

// ========== UTILITIES ==========

function showNotification(message, type = 'error') {
  const container = document.getElementById('notification-container');
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ========== CRON API ==========

async function getCronStatus(jobId, apiKey) {
  try {
    const response = await fetchWithTimeout(`${CRON_API_URL}/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
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

async function updateCronJob(jobId, apiKey, updates) {
  try {
    const response = await fetchWithTimeout(`${CRON_API_URL}/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ job: updates })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update cron job: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating cron job:', error);
    throw error;
  }
}

// ========== UI RENDERING ==========

function createAccountCard(account) {
  const card = document.createElement('div');
  card.className = 'card-glass p-6 cursor-pointer group';
  
  const iconColors = {
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    green: 'text-green-400'
  };
  
  card.innerHTML = `
    <div class="flex items-start gap-4 mb-6">
      <div class="icon-box transition-transform group-hover:scale-110">
        <i class="fas ${account.icon} text-3xl ${iconColors[account.iconColor] || 'text-purple-400'}"></i>
      </div>
      <div class="flex-1">
        <h3 class="text-2xl font-bold text-white mb-1 group-hover:text-purple-300 transition">${account.name}</h3>
        <p class="text-slate-400 text-sm">${account.email}</p>
      </div>
    </div>
    
    <div class="flex items-center justify-between pt-4 border-t border-purple-500/10">
      <div class="flex items-center gap-2">
        <span class="status-dot status-loading" data-status></span>
        <span class="text-sm text-slate-400" data-status-text>Memeriksa...</span>
      </div>
      <i class="fas fa-arrow-right text-purple-400 group-hover:translate-x-1 transition"></i>
    </div>
  `;
  
  // Check initial status
  checkAccountStatus(card, account);
  
  // Add click handler
  card.addEventListener('click', () => openDetailModal(account));
  
  return card;
}

async function checkAccountStatus(card, account) {
  const statusDot = card.querySelector('[data-status]');
  const statusText = card.querySelector('[data-status-text]');
  
  try {
    const [cronMasuk, cronPulang] = await Promise.all([
      getCronStatus(account.cron.masuk.jobId, account.cron.masuk.apiKey),
      getCronStatus(account.cron.pulang.jobId, account.cron.pulang.apiKey)
    ]);
    
    const isActive = cronMasuk.enabled && cronPulang.enabled;
    
    statusDot.className = `status-dot ${isActive ? 'status-online' : 'status-offline'}`;
    statusText.textContent = isActive ? 'Aktif' : 'Nonaktif';
    statusText.className = `text-sm ${isActive ? 'text-green-400' : 'text-red-400'}`;
  } catch (error) {
    statusDot.className = 'status-dot status-offline';
    statusText.textContent = 'Gagal Cek';
    statusText.className = 'text-sm text-red-400';
    console.error('Failed to check status:', error);
  }
}

function buildHistoryTable(historyData) {
  if (!historyData || historyData.length === 0) {
    return `
      <div class="text-center py-12">
        <i class="fas fa-inbox text-5xl text-purple-400/30 mb-4"></i>
        <p class="text-slate-400">Tidak ada riwayat absensi</p>
      </div>
    `;
  }
  
  let tableHTML = `
    <table class="table-modern">
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Absen Masuk</th>
          <th>Absen Pulang</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  historyData.forEach(row => {
    tableHTML += `
      <tr>
        <td class="font-medium text-slate-200">${row.tanggal || '-'}</td>
        <td class="text-slate-300">${row.masuk || 'N/A'}</td>
        <td class="text-slate-300">${row.pulang || 'N/A'}</td>
        <td class="text-slate-300">${row.status || '-'}</td>
      </tr>
    `;
  });
  
  tableHTML += `</tbody></table>`;
  return tableHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  
  return new Date(timestamp * 1000).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

// ========== MODAL LOGIC ==========

let isModalLoading = false;

async function openDetailModal(account) {
  if (isModalLoading) return;
  
  const dialog = document.getElementById('detail-dialog');
  const loading = document.getElementById('modal-loading');
  const content = document.getElementById('modal-content');
  
  // Show modal with loading state
  loading.classList.remove('hidden');
  content.classList.add('hidden');
  dialog.showModal();
  
  isModalLoading = true;
  
  try {
    // Fetch all data in parallel
    const [cronMasuk, cronPulang, historyResponse] = await Promise.all([
      getCronStatus(account.cron.masuk.jobId, account.cron.masuk.apiKey),
      getCronStatus(account.cron.pulang.jobId, account.cron.pulang.apiKey),
      fetchWithTimeout(`/api/history?user=${account.id}`)
    ]);
    
    // Check history response
    if (!historyResponse.ok) {
      throw new Error(`Failed to fetch history: ${historyResponse.statusText}`);
    }
    
    const historyData = await historyResponse.json();
    
    if (!historyData.success) {
      throw new Error(`API Error: ${historyData.message || 'Unknown error'}`);
    }
    
    // Populate modal
    populateModal(account, cronMasuk, cronPulang, historyData.data);
    
    // Show content
    loading.classList.add('hidden');
    content.classList.remove('hidden');
    
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
    dialog.close();
    console.error('Modal error:', error);
  } finally {
    isModalLoading = false;
  }
}

function populateModal(account, cronMasuk, cronPulang, historyData) {
  // Update header
  document.getElementById('modal-title').textContent = account.name;
  document.getElementById('modal-email').textContent = account.email;
  
  const isActive = cronMasuk.enabled && cronPulang.enabled;
  const statusDot = document.getElementById('modal-status-dot');
  const statusText = document.getElementById('modal-status-text');
  
  statusDot.className = `status-dot ${isActive ? 'status-online' : 'status-offline'}`;
  statusText.textContent = isActive ? 'Aktif' : 'Nonaktif';
  
  // Build cron settings
  const jamMasuk = cronMasuk.schedule.hours[0] !== -1
    ? `${String(cronMasuk.schedule.hours[0]).padStart(2, '0')}:${String(cronMasuk.schedule.minutes[0]).padStart(2, '0')}`
    : '08:00';
  
  const jamPulang = cronPulang.schedule.hours[0] !== -1
    ? `${String(cronPulang.schedule.hours[0]).padStart(2, '0')}:${String(cronPulang.schedule.minutes[0]).padStart(2, '0')}`
    : '17:00';
  
  const cronContainer = document.getElementById('cron-container');
  cronContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Cron Masuk -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-slate-200">Cron Masuk</h4>
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${cronMasuk.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
            ${cronMasuk.enabled ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <p class="text-sm text-slate-400">Next: ${formatTime(cronMasuk.nextExecution)}</p>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Jam Masuk</label>
          <input id="input-jam-masuk" type="time" value="${jamMasuk}" 
                 class="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition">
        </div>
      </div>
      
      <!-- Cron Pulang -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-slate-200">Cron Pulang</h4>
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${cronPulang.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
            ${cronPulang.enabled ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <p class="text-sm text-slate-400">Next: ${formatTime(cronPulang.nextExecution)}</p>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Jam Pulang</label>
          <input id="input-jam-pulang" type="time" value="${jamPulang}" 
                 class="w-full px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition">
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-purple-500/10">
      <button id="save-schedule-btn" class="btn btn-primary flex-1">
        <i class="fas fa-save mr-2"></i>
        Simpan Jadwal
      </button>
      <button id="toggle-cron-btn" class="btn ${isActive ? 'btn-danger' : 'btn-success'} flex-1">
        <i class="fas ${isActive ? 'fa-stop' : 'fa-play'} mr-2"></i>
        ${isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
    </div>
  `;
  
  // Build history table
  document.getElementById('history-container').innerHTML = buildHistoryTable(historyData);
  
  // Add event listeners
  document.getElementById('save-schedule-btn').addEventListener('click', (e) => {
    handleSaveSchedule(e.target, account);
  });
  
  document.getElementById('toggle-cron-btn').addEventListener('click', (e) => {
    handleToggleCron(e.target, account, !isActive);
  });
}

// ========== EVENT HANDLERS ==========

async function handleSaveSchedule(button, account) {
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';
  
  try {
    const jamMasuk = document.getElementById('input-jam-masuk').value;
    const jamPulang = document.getElementById('input-jam-pulang').value;
    
    const [hMasuk, mMasuk] = jamMasuk.split(':').map(Number);
    const [hPulang, mPulang] = jamPulang.split(':').map(Number);
    
    const scheduleUpdate = {
      schedule: {
        timezone: 'Asia/Jakarta',
        wdays: [1, 2, 3, 4, 5],
        mdays: [-1],
        months: [-1]
      }
    };
    
    await Promise.all([
      updateCronJob(account.cron.masuk.jobId, account.cron.masuk.apiKey, {
        ...scheduleUpdate,
        schedule: { ...scheduleUpdate.schedule, hours: [hMasuk], minutes: [mMasuk] }
      }),
      updateCronJob(account.cron.pulang.jobId, account.cron.pulang.apiKey, {
        ...scheduleUpdate,
        schedule: { ...scheduleUpdate.schedule, hours: [hPulang], minutes: [mPulang] }
      })
    ]);
    
    showNotification('Jadwal berhasil diperbarui!', 'success');
    document.getElementById('detail-dialog').close();
    refreshAllCards();
    
  } catch (error) {
    showNotification(`Gagal menyimpan jadwal: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

async function handleToggleCron(button, account, enable) {
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memproses...';
  
  try {
    await Promise.all([
      updateCronJob(account.cron.masuk.jobId, account.cron.masuk.apiKey, { enabled: enable }),
      updateCronJob(account.cron.pulang.jobId, account.cron.pulang.apiKey, { enabled: enable })
    ]);
    
    showNotification(`Cron job berhasil ${enable ? 'diaktifkan' : 'dinonaktifkan'}!`, 'success');
    document.getElementById('detail-dialog').close();
    refreshAllCards();
    
  } catch (error) {
    showNotification(`Gagal mengubah status: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

// ========== INITIALIZATION ==========

function refreshAllCards() {
  const container = document.getElementById('account-list');
  container.innerHTML = '';
  
  accounts.forEach(account => {
    const card = createAccountCard(account);
    container.appendChild(card);
  });
}

function init() {
  // Initial render
  refreshAllCards();
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    const icon = document.querySelector('#refresh-btn i');
    icon.classList.add('fa-spin');
    
    refreshAllCards();
    
    setTimeout(() => {
      icon.classList.remove('fa-spin');
      showNotification('Dashboard berhasil di-refresh!', 'success');
    }, 1000);
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
