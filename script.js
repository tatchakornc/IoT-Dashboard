let currentUser = null;
let devices = [];

// (สำหรับ dev เท่านั้น) จำลอง user
if (!localStorage.getItem('currentUser')) {
    localStorage.setItem('currentUser', JSON.stringify({ username: 'test', token: '123' }));
}

// Show/hide pages
function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
}
function showRegister() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.remove('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
}
function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser?.username || 'ผู้ใช้งาน';
    loadDevices();
}

// Helper: ซ่อนทุกหน้าใน dashboard แล้วโชว์เฉพาะที่ต้องการ
function showDashboardPage(pageId) {
    document.getElementById('mainDashboardContent').classList.add('hidden');
    document.getElementById('settingsContent').classList.add('hidden');
    document.getElementById('addDeviceContent').classList.add('hidden');
    document.getElementById(pageId).classList.remove('hidden');

    // เปลี่ยน active ใน sidebar
    document.getElementById('navHome').classList.remove('active');
    document.getElementById('navSettings').classList.remove('active');
    document.getElementById('navAddDevice').classList.remove('active');
    if (pageId === 'mainDashboardContent') {
        document.getElementById('navHome').classList.add('active');
    } else if (pageId === 'settingsContent') {
        document.getElementById('navSettings').classList.add('active');
    } else if (pageId === 'addDeviceContent') {
        document.getElementById('navAddDevice').classList.add('active');
    }
}

// Event listeners for switching pages
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('showRegister').onclick = (e) => { e.preventDefault(); showRegister(); };
    document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); showLogin(); };
    document.getElementById('loginForm').onsubmit = handleLogin;
    document.getElementById('registerForm').onsubmit = handleRegister;

    // เมนู dashboard
    const navHome = document.getElementById('navHome');
    const navSettings = document.getElementById('navSettings');
    const navAddDevice = document.getElementById('navAddDevice');
    if (navHome && navSettings && navAddDevice) {
        navHome.onclick = (e) => {
            e.preventDefault();
            showDashboardPage('mainDashboardContent');
        };
        navSettings.onclick = (e) => {
            e.preventDefault();
            showDashboardPage('settingsContent');
        };
        navAddDevice.onclick = (e) => {
            e.preventDefault();
            showDashboardPage('addDeviceContent');
        };
    }

    // ฟอร์มเพิ่มอุปกรณ์ (Full Page)
    const addDeviceForm = document.getElementById('addDeviceForm');
    if (addDeviceForm) {
        addDeviceForm.onsubmit = handleAddDevice;
    }

    // Auto-login if user exists in localStorage
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        showDashboard();
        showDashboardPage('mainDashboardContent');
    } else {
        showLogin();
    }
});

// Authentication functions
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    showLoading();

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            hideLoading();
            showSuccess('เข้าสู่ระบบสำเร็จ!');
            showDashboard();
            showDashboardPage('mainDashboardContent');
        } else {
            hideLoading();
            showError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        }
    })
    .catch(() => {
        hideLoading();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (password !== confirm) {
        showError('รหัสผ่านไม่ตรงกัน');
        return;
    }

    showLoading();

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            hideLoading();
            showSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            showLogin();
        } else {
            hideLoading();
            showError(data.message || 'สมัครสมาชิกไม่สำเร็จ');
        }
    })
    .catch(() => {
        hideLoading();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    devices = [];
    showSuccess('ออกจากระบบสำเร็จ');
    showLogin();
}

// Device management functions
function loadDevices() {
    fetch('/api/devices', {
        headers: { 'Authorization': `Bearer ${currentUser?.token || ''}` }
    })
    .then(res => res.json())
    .then(data => {
        devices = data.devices || [];
        updateStats();
        renderDevices();
    })
    .catch(() => {
        devices = [];
        updateStats();
        renderDevices();
        showError('โหลดอุปกรณ์ไม่สำเร็จ');
    });
}

function updateDeviceState(deviceId, control, value) {
    fetch(`/api/devices/${deviceId}/state`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token || ''}`
        },
        body: JSON.stringify({ [control]: value })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            loadDevices();
            showSuccess('อัปเดตอุปกรณ์สำเร็จ');
        } else {
            showError(data.message || 'อัปเดตอุปกรณ์ไม่สำเร็จ');
        }
    })
    .catch(() => {
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
}

// เพิ่มอุปกรณ์ (Full Page)
function handleAddDevice(e) {
    e.preventDefault();
    const sn = document.getElementById('deviceSN').value.trim();
    const name = document.getElementById('deviceName').value.trim();
    if (!sn || !name) {
        showError('กรุณากรอกข้อมูลให้ครบ');
        return;
    }
    showLoading();
    fetch('/api/devices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.token || ''}`
        },
        body: JSON.stringify({ sn, name })
    })
    .then(res => res.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            showSuccess('เพิ่มอุปกรณ์สำเร็จ');
            document.getElementById('addDeviceForm').reset();
            showDashboardPage('mainDashboardContent');
            loadDevices();
        } else {
            showError(data.message || 'เพิ่มอุปกรณ์ไม่สำเร็จ');
        }
    })
    .catch(() => {
        hideLoading();
        showError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    });
}

// Render devices
function renderDevices() {
    const grid = document.getElementById('devicesGrid');
    grid.innerHTML = '';
    if (!devices.length) {
        grid.innerHTML = '<div style="color:#64748b;text-align:center;width:100%;">ไม่มีอุปกรณ์ในระบบ</div>';
        return;
    }
    devices.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
            <div class="device-header">
                <div class="device-info">
                    <div class="device-icon ${device.type || 'other'}">
                        <i class="fas fa-${getDeviceIcon(device.type)}"></i>
                    </div>
                    <div class="device-details">
                        <h3>${device.name || '-'}</h3>
                        <p>SN: ${device.sn || '-'}</p>
                    </div>
                </div>
            </div>
            <div class="device-status">
                <span class="status-dot ${device.online ? 'online' : 'offline'}"></span>
                ${device.online ? 'ออนไลน์' : 'ออฟไลน์'}
            </div>
            <div class="device-controls">
                ${renderDeviceControls(device)}
            </div>
        `;
        grid.appendChild(card);
    });
}

function getDeviceIcon(type) {
    switch (type) {
        case 'lighting': return 'lightbulb';
        case 'air_conditioning': return 'snowflake';
        case 'security_camera': return 'video';
        case 'door_lock': return 'lock';
        case 'irrigation': return 'tint';
        case 'weather_station': return 'cloud-sun';
        default: return 'microchip';
    }
}

function renderDeviceControls(device) {
    // ตัวอย่าง: toggle switch สำหรับเปิด/ปิด
    if (device.type === 'lighting' || device.type === 'air_conditioning' || device.type === 'door_lock') {
        return `
            <div class="toggle${device.state?.on ? ' active' : ''}" onclick="updateDeviceState('${device.id}','on',${!device.state?.on})">
                <div class="toggle-slider"></div>
            </div>
        `;
    }
    return '';
}

// Stats
function updateStats() {
    document.getElementById('statOnline').textContent = devices.filter(d => d.online).length;
    document.getElementById('statOffline').textContent = devices.filter(d => !d.online).length;
    document.getElementById('statTotal').textContent = devices.length;
    document.getElementById('statUser').textContent = currentUser?.username || '-';
}

// Loading & Toast
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}
function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}
function showSuccess(msg) { showToast(msg, 'success'); }
function showError(msg) { showToast(msg, 'error'); }
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}