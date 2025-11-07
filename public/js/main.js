// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');

  // Add animations to elements with .fade-in class
  const fadeInElements = document.querySelectorAll('.fade-in');
  fadeInElements.forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`;
  });

  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      // Save theme preference to local storage
      if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
      } else {
        localStorage.setItem('theme', 'light');
      }
    });
  }

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  // --- Mobile Sidebar Logic ---
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      console.log('Menu toggle clicked!');
      sidebar.classList.toggle('show');
    });
  }

  // --- Devices Page Logic ---
  if (document.getElementById('device-list')) {
    const modal = document.getElementById('add-device-modal');
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.querySelector('.close-btn');
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const deviceNameInput = document.getElementById('device-name-input');

    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalInputContainer = document.getElementById('modal-input-container');

    const socket = io();
    let currentInstanceId = null;

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        document.querySelectorAll('#device-list tr').forEach(row => {
            const instanceId = row.dataset.instanceId;
            if (instanceId) {
                socket.emit('join_room', instanceId);
            }
        });
    });

    socket.on('qr_code', (qrCodeDataUrl) => {
        qrCodeContainer.style.display = 'block';
        qrCodeContainer.innerHTML = `<img id="qr-code-display" src="${qrCodeDataUrl}" alt="QR Code">`;
    });

    socket.on('status_update', (data) => {
        if (data.status === 'CONNECTED' && data.instanceId === currentInstanceId) {
            Swal.fire({
                icon: 'success',
                title: 'Terhubung!',
                text: data.message || 'Perangkat berhasil terhubung!',
                timer: 2000,
                showConfirmButton: false
            }).then(() => window.location.reload());
            return;
        }

        const row = document.querySelector(`tr[data-instance-id="${data.instanceId}"]`);
        if (row) {
            Swal.fire({
                icon: 'info',
                title: 'Pembaruan Status',
                text: `Status perangkat "${row.querySelector('td:first-child').innerText}" berubah menjadi: ${data.status}. Halaman akan dimuat ulang.`,
            }).then(() => window.location.reload());
        }
    });

    const resetModal = () => {
        modalTitle.textContent = 'Tambah Perangkat WhatsApp Baru';
        modalDescription.textContent = 'Masukkan nama untuk perangkat Anda dan klik "Hasilkan QR".';
        modalInputContainer.style.display = 'block';
        deviceNameInput.value = '';
        qrCodeContainer.style.display = 'none';
        qrCodeContainer.innerHTML = '';
        currentInstanceId = null;
    };

    const openModal = () => {
        resetModal();
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
        currentInstanceId = null;
    };

    if (openModalBtn) {
      openModalBtn.onclick = openModal;
    }
    closeModalBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    generateQrBtn.addEventListener('click', async () => {
        const deviceName = deviceNameInput.value.trim();
        if (!deviceName) {
            Swal.fire({
                icon: 'warning',
                title: 'Input Diperlukan',
                text: 'Silakan masukkan nama untuk perangkat.'
            });
            return;
        }

        qrCodeContainer.style.display = 'block';
        qrCodeContainer.innerHTML = '<p class="loading-text">Menghasilkan kode QR, harap tunggu...</p>';

        try {
            const response = await fetch('/api/v1/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceName }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal membuat perangkat.');
            }

            const data = await response.json();
            currentInstanceId = data.instanceId;
            socket.emit('join_room', currentInstanceId);

        } catch (error) {
            qrCodeContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    });
  }
});

async function handleReconnect(deviceId, instanceId) {
  const modal = document.getElementById('add-device-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalInputContainer = document.getElementById('modal-input-container');
  const qrCodeContainer = document.getElementById('qr-code-container');

  modal.style.display = 'flex';

  // This logic is global now, so we need to ensure socket is available.
  // A better implementation would be to instantiate socket once.
  const socket = io();
  let currentInstanceId = instanceId;
  socket.emit('join_room', currentInstanceId);

  modalTitle.textContent = 'Hubungkan Ulang Perangkat';
  modalDescription.textContent = 'Silakan pindai kode QR baru untuk menghubungkan ulang perangkat Anda.';
  modalInputContainer.style.display = 'none';

  qrCodeContainer.style.display = 'block';
  qrCodeContainer.innerHTML = '<p class="loading-text">Meminta kode QR baru, harap tunggu...</p>';

  try {
      const response = await fetch('/api/v1/devices/reconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal menghubungkan ulang perangkat.');
      }
  } catch (error) {
      qrCodeContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

async function deleteDevice(deviceId) {
    const result = await Swal.fire({
        title: 'Apakah Anda yakin?',
        text: "Tindakan ini tidak dapat dibatalkan.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/v1/devices/${deviceId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus perangkat.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Dihapus!',
            text: 'Perangkat berhasil dihapus.',
            timer: 2000,
            showConfirmButton: false
        });
        window.location.reload();
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: `Error: ${error.message}`
        });
    }
}

// --- Messaging Page Logic ---
if (document.querySelector('.tabs')) {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
      tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));

          tab.classList.add('active');
          document.getElementById(tab.dataset.tab).classList.add('active');
      });
  });
}

function toggleBulkMedia(type) {
    const bulkMediaUpload = document.getElementById('bulk_media_upload');
    const bulkMediaInput = document.getElementById('media_file_bulk');
    if (type === 'media') {
        bulkMediaUpload.style.display = 'block';
        bulkMediaInput.required = true;
    } else {
        bulkMediaUpload.style.display = 'none';
        bulkMediaInput.required = false;
    }
}

// --- Subscribe Page Logic ---
if (document.querySelector('.packages-grid')) {
  const modal = document.getElementById('qr-modal');
  const qrCodeImage = document.getElementById('qr-code-image');
  const closeModalBtn = document.getElementById('close-qr-modal');

  const closeModal = () => {
    modal.style.display = 'none';
  }

  closeModalBtn.onclick = closeModal;
  window.onclick = function(event) {
      if (event.target == modal) {
          closeModal();
      }
  }

  const packageContainer = document.querySelector('.packages-grid');
  packageContainer.addEventListener('click', async (event) => {
      if (!event.target.matches('.btn-upgrade')) {
          return;
      }

      const payButton = event.target;
      const packageId = payButton.dataset.packageId;
      const errorContainer = document.getElementById(`payment-error-${packageId}`);

      if(errorContainer) errorContainer.textContent = '';
      payButton.disabled = true;
      payButton.textContent = 'Memproses...';

      try {
          const monthsInput = document.getElementById(`months-${packageId}`);
          const months = monthsInput ? monthsInput.value : 1;

          const response = await fetch(`/api/v1/payment/subscribe/${packageId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ months }),
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.message || 'Gagal memulai pembayaran');
          }

          if (data.qr_code_url) {
              qrCodeImage.src = data.qr_code_url;
              modal.style.display = 'flex';
          } else {
              const qrAction = data.actions?.find(action => action.name === 'generate-qr-code');
              if (qrAction) {
                  qrCodeImage.src = qrAction.url;
                  modal.style.display = 'flex';
              } else {
                  throw new Error('URL Kode QR tidak ditemukan dalam respons.');
              }
          }

      } catch (error) {
          console.error('Payment error:', error);
          if (errorContainer) {
              errorContainer.textContent = `${error.message}`;
          } else {
              Swal.fire({
                  icon: 'error',
                  title: 'Kesalahan Pembayaran',
                  text: error.message
              });
          }
      } finally {
          payButton.disabled = false;
          payButton.textContent = 'Tingkatkan ke Premium';
      }
  });
}

// --- Bot Page Logic ---
if (document.querySelector('.bot-container, #add-bot-btn')) {
  // Modal Handling
  function setupModal(modalId, openBtnClass, hiddenInputId, dataField) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      const closeBtn = modal.querySelector('.close-btn');

      document.querySelectorAll(openBtnClass).forEach(btn => {
          btn.onclick = function() {
              if (hiddenInputId) {
                  modal.querySelector(hiddenInputId).value = this.dataset[dataField];
              }
              modal.style.display = 'flex';
          }
      });

      if(closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
      }

      window.addEventListener('click', (event) => {
          if (event.target == modal) {
              modal.style.display = 'none';
          }
      });
  }

  const addBotBtn = document.getElementById('add-bot-btn');
  if (addBotBtn) {
    addBotBtn.onclick = () => {
      const addBotModal = document.getElementById('add-bot-modal');
      if(addBotModal) addBotModal.style.display = 'flex';
    };
  }

  setupModal('add-trigger-modal', '.add-trigger-btn', '#trigger-bot-id', 'botId');
  setupModal('add-action-modal', '.add-action-btn', '#action-trigger-id', 'triggerId');
  setupModal('add-bot-modal', '#add-bot-btn', null, null);


  // Action Form Logic
  const actionForm = document.getElementById('action-form');
  if (actionForm) {
      const actionTypeSelect = document.getElementById('action-type');
      const replyFields = document.getElementById('reply-fields');
      const webhookFields = document.getElementById('webhook-fields');

      actionTypeSelect.onchange = function() {
          replyFields.style.display = this.value === 'reply' ? 'block' : 'none';
          webhookFields.style.display = this.value === 'webhook' ? 'block' : 'none';
      }

      actionForm.addEventListener('submit', function(e) {
          const type = actionTypeSelect.value;
          let payload = {};
          if (type === 'reply') {
              const text = document.getElementById('reply-text').value;
              const media = document.getElementById('reply-media').value;
              if (media) {
                  payload = { image: { url: media }, caption: text };
              } else {
                  payload = { text: text };
              }
          } else if (type === 'webhook') {
              payload = { url: document.getElementById('webhook-url').value };
          }
          document.getElementById('action-payload').value = JSON.stringify(payload);
      });
  }
}
