// CONSTANTS
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwUxmmcWKFwPs1_X7K2mFM3Uow_W8wByDpILrcGjPX3LCtzA4fES_hlEcHEYHNUrxQO/exec";

let currentUserToken = null;
let currentUserEmail = null;

$(document).ready(function () {
  // Initialize Select2 Make it look good
  $('.select2-multiple').select2({
    placeholder: "Cari kompetensi...",
    allowClear: true,
    width: '100%'
  });

  // Handle file input text changes
  $('.file-input').on('change', function () {
    let fileName = $(this).val().split('\\').pop();
    let msgEl = $(this).siblings('.file-msg');
    if (fileName) {
      msgEl.text(fileName);
    } else {
      msgEl.text('Tidak ada file yang dipilih');
    }
  });

  // Form Submit Handler
  $('#jo-form').on('submit', handleFormSubmit);

  // Logout
  $('#btn-logout').on('click', handleLogout);

  // Try to load state from session storage
  const savedToken = sessionStorage.getItem('jo_token');
  const savedEmail = sessionStorage.getItem('jo_email');
  if (savedToken && savedEmail) {
    currentUserToken = savedToken;
    currentUserEmail = savedEmail;
    showFormView();
  }
});

// Google SSO Callback function MUST be global so script can find it
function handleCredentialResponse(response) {
  // response.credential contains the JWT ID token
  const token = response.credential;

  // Decode JWT Payload to UI
  const payloadBase64 = token.split('.')[1];
  const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

  currentUserToken = token;
  currentUserEmail = decodedPayload.email;

  // Persist session superficially
  sessionStorage.setItem('jo_token', token);
  sessionStorage.setItem('jo_email', currentUserEmail);

  showFormView();
}

function handleLogout() {
  currentUserToken = null;
  currentUserEmail = null;
  sessionStorage.removeItem('jo_token');
  sessionStorage.removeItem('jo_email');

  $('#user-email').text('');
  $('#auth-view').removeClass('hidden');
  $('#form-view').addClass('hidden');
}

function showFormView() {
  $('#auth-view').addClass('hidden');
  $('#form-view').removeClass('hidden');
  $('#user-email').text(currentUserEmail);

  // Set default Tanggal Request to today
  const today = new Date().toISOString().split('T')[0];
  $('#tanggalRequest').val(today);

  // Fetch master data to fill dropdowns
  fetchMasterData();
}

function fetchMasterData() {
  if (!GAS_API_URL || GAS_API_URL === "YOUR_GAS_WEBAPP_URL_HERE") {
    showAlert('error', 'GAS API URL belum diatur di app.js. Silakan edit app.js.');
    return;
  }

  $('#global-loader').removeClass('hidden');

  fetch(`${GAS_API_URL}?action=getMasterData`, {
    method: 'GET',
    mode: 'cors'
  })
    .then(res => res.json())
    .then(response => {
      $('#global-loader').addClass('hidden');
      if (response.status === 'success') {
        populateDropdowns(response.data);
      } else {
        showAlert('error', 'Gagal memuat data master: ' + response.message);
      }
    })
    .catch(err => {
      $('#global-loader').addClass('hidden');
      // If CORS error, it usually falls here before hitting 'then'
      // To identify if it is indeed CORS:
      if (err.message === "Failed to fetch") {
        showAlert('error', 'Gagal memuat data master. Pastikan Google Apps Script di-deploy "Anyone" dan tidak diakses melalui akun yang terblokir.');
      } else {
        showAlert('error', 'Terjadi kesalahan saat memuat data master.');
      }
      console.error(err);
    });
}

function populateDropdowns(data) {
  // Populate Klien
  const $klien = $('#klien');
  $klien.find('option:not([disabled])').remove(); // clear previous
  data.Klien.forEach(item => {
    $klien.append(`<option value="${item}">${item}</option>`);
  });

  // Populate Cabang
  const $cabang = $('#cabang');
  $cabang.find('option:not([disabled])').remove();
  data.Cabang.forEach(item => {
    if (item) $cabang.append(`<option value="${item}">${item}</option>`);
  });

  // Populate OSM
  const $osm = $('#osm');
  $osm.find('option:not([disabled])').remove();
  data.OSM.forEach(item => {
    if (item) $osm.append(`<option value="${item}">${item}</option>`);
  });

  // Populate Kompetensi (select2)
  const $kompetensi = $('#kompetensi');
  $kompetensi.empty(); // select2 handles differently
  data.Kompetensi.forEach(item => {
    if (item) $kompetensi.append(`<option value="${item}">${item}</option>`);
  });
}

// Progress Bar Management
function resetProgress() {
  $('#progress-box').addClass('hidden');
  updateProgress(0, 'Memulai pengiriman...');
}

function updateProgress(percent, text) {
  $('#progress-percentage').text(`${percent}%`);
  $('#progress-bar').css('width', `${percent}%`);
  if (text) $('#progress-text').text(text);
}

// Convert File to Base64 Promise
function getBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!GAS_API_URL || GAS_API_URL === "YOUR_GAS_WEBAPP_URL_HERE") {
    showAlert('error', 'GAS API URL belum diatur di app.js.');
    return;
  }

  hideAlert();

  // Extract inputs
  const formDataObj = {
    tanggalRequest: $('#tanggalRequest').val(),
    namaUser: $('#namaUser').val(),
    statusKandidat: $('#statusKandidat').val(),
    penempatan: $('#penempatan').val(),
    alamatPenempatan: $('#alamatPenempatan').val(),
    klien: $('#klien').val(),
    status: $('#status').val(),
    cabang: $('#cabang').val(),
    posisi: $('#posisi').val(),
    jumlahKebutuhan: $('#jumlahKebutuhan').val(),
    osm: $('#osm').val(),
    deskripsiPekerjaan: $('#deskripsiPekerjaan').val(),
    kompetensi: $('#kompetensi').val() // Array dari multiple select
  };

  const filePdfInput = $('#filePdf')[0].files[0];
  const fileExcelInput = $('#fileExcel')[0].files[0];

  // Switch to loading state
  const $submitBtn = $('#btn-submit');
  $submitBtn.prop('disabled', true);
  $submitBtn.find('span').text('Memproses...');
  $submitBtn.find('.spinner').removeClass('hidden');

  // Show progress container
  $('#progress-box').removeClass('hidden');
  updateProgress(10, 'Menyiapkan berkas...');

  try {
    // Process files
    let filePdfData = null;
    let fileExcelData = null;

    if (filePdfInput) {
      updateProgress(20, 'Membaca dokumen PDF...');
      filePdfData = {
        filename: filePdfInput.name,
        mimeType: filePdfInput.type,
        base64: await getBase64(filePdfInput)
      };
    }

    if (fileExcelInput) {
      updateProgress(40, 'Membaca dokumen Excel...');
      fileExcelData = {
        filename: fileExcelInput.name,
        mimeType: fileExcelInput.type,
        base64: await getBase64(fileExcelInput)
      };
    }

    formDataObj.filePdf = filePdfData;
    formDataObj.fileExcel = fileExcelData;

    updateProgress(60, 'Mengamankan data kredensial...');

    // Construct payload
    const payload = {
      token: currentUserToken, // Google JWT token for backend security validation
      formData: formDataObj
    };

    updateProgress(70, 'Mengunggah ke server backend...');

    // Send POST Request ke GAS (Pakai default mode dengan string body -> menghindar CORS preflight option di GAS)
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    updateProgress(90, 'Memproses respon dari server...');

    const result = await response.json();

    if (result.status === 'success') {
      updateProgress(100, 'Data berhasil disimpan!');
      showAlert('success', 'Permintaan Job Order berhasil disubmit dan tersimpan!');
      // Reset Form
      $('#jo-form')[0].reset();
      $('.select2-multiple').val(null).trigger('change');
      $('.file-msg').text('Tidak ada file yang dipilih');

      // Sembunyikan progress bar setelah sukses dalam 3 detik
      setTimeout(() => {
        $('#progress-box').addClass('hidden');
      }, 3000);
    } else {
      updateProgress(100, 'Gagal menyimpan data.');
      showAlert('error', 'Gagal memproses data: ' + result.message);
    }
  } catch (err) {
    updateProgress(0, 'Terjadi kesalahan sistem.');
    showAlert('error', 'Terjadi kesalahan sistem saat mengirim data. Pastikan koneksi stabil dan file tidak lebih dari batas skrip.');
    console.error(err);
  } finally {
    // Reset button state
    $submitBtn.prop('disabled', false);
    $submitBtn.find('span').text('Submit Permintaan');
    $submitBtn.find('.spinner').addClass('hidden');
  }


}

function showAlert(type, message) {
  const $alert = $('#alert-box');
  $alert.removeClass('hidden success error').addClass(type).text(message);
}

function hideAlert() {
  $('#alert-box').addClass('hidden');
}
