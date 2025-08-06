// Firebase SDK (ต้องมีใน <head> ของ index.html)
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>

// Firebase config ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyBNPvRVxzxAFPnPK5shSzTtwr6x7UMXg1g",
  authDomain: "iot-dashboard-86cce.firebaseapp.com",
  databaseURL: "https://iot-dashboard-86cce-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-dashboard-86cce",
  storageBucket: "iot-dashboard-86cce.appspot.com",
  messagingSenderId: "105140968635",
  appId: "1:105140968635:web:0a97e1a3be0573b45d9d9e",
  measurementId: "G-JFXB248TED"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let devices = [];

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
    document.getElementById('userName').textContent = currentUser?.email || 'ผู้ใช้งาน';
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

    // Auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showDashboard();
            showDashboardPage('mainDashboardContent');
        } else {
            currentUser = null;
            showLogin();
        }
    });
});

// Authentication functions
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    showLoading();
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            hideLoading();
            showSuccess('เข้าสู่ระบบสำเร็จ!');
        })
        .catch(err => {
            hideLoading();
            showError(err.message);
        });
}

function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (password !== confirm) {
        showError('รหัสผ่านไม่ตรงกัน');
        return;
    }

    showLoading();
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            hideLoading();
            showSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            showLogin();
        })
        .catch(err => {
            hideLoading();
            showError(err.message);
        });
}

function logout() {
    auth.signOut();
    showSuccess('ออกจากระบบสำเร็จ');
    showLogin();
}

// Device management functions (ใช้ Realtime Database)
function loadDevices() {
    if (!currentUser) return;
    const userDevicesRef = db.ref('devices/' + currentUser.uid);
    userDevicesRef.once('value', snapshot => {
        devices = [];
        const data = snapshot.val();
        if (data) {
            for (const id in data) {
                devices.push({ id, ...data[id] });
            }
        }
        updateStats();
        renderDevices();
    }, () => {
        devices = [];
        updateStats();
        renderDevices();
        showError('โหลดอุปกรณ์ไม่สำเร็จ');
    });
}

function updateDeviceState(deviceId, control, value) {
    if (!currentUser) return;
    const deviceRef = db.ref(`devices/${currentUser.uid}/${deviceId}/state`);
    deviceRef.update({ [control]: value })
        .then(() => {
            loadDevices();
            showSuccess('อัปเดตอุปกรณ์สำเร็จ');
        })
        .catch(() => {
            showError('อัปเดตอุปกรณ์ไม่สำเร็จ');
        });
}

// เพิ่มอุปกรณ์ (Full Page)
function handleAddDevice(e) {
    e.preventDefault();
    if (!currentUser) return;
    const sn = document.getElementById('deviceSN').value.trim();
    const name = document.getElementById('deviceName').value.trim();
    if (!sn || !name) {
        showError('กรุณากรอกข้อมูลให้ครบ');
        return;
    }
    showLoading();

    // ตรวจสอบ SN ว่ามีใน valid_sn หรือไม่
    db.ref('valid_sn/' + sn).once('value', snapshot => {
        if (!snapshot.exists()) {
            hideLoading();
            showError('SN นี้ไม่มีในระบบ กรุณาตรวจสอบ SN อุปกรณ์ของคุณ');
            return;
        }

        // ถ้ามี SN ในระบบ ให้เพิ่มอุปกรณ์ให้ user
        const userDevicesRef = db.ref('devices/' + currentUser.uid);
        const newDeviceRef = userDevicesRef.push();
        newDeviceRef.set({
            sn,
            name,
            online: false,
            type: snapshot.val().type || 'other',
            state: {}
        })
        .then(() => {
            hideLoading();
            showSuccess('เพิ่มอุปกรณ์สำเร็จ');
            document.getElementById('addDeviceForm').reset();
            showDashboardPage('mainDashboardContent');
            loadDevices();
        })
        .catch(() => {
            hideLoading();
            showError('เพิ่มอุปกรณ์ไม่สำเร็จ');
        });
    }, () => {
        hideLoading();
        showError('เกิดข้อผิดพลาดในการตรวจสอบ SN');
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
    document.getElementById('statUser').textContent = currentUser?.email || '-';
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