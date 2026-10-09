const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// Même dossier / même fichier data.json que la version Java, pour rester compatible.
const DATA_DIR  = path.join(os.homedir(), 'BreakersGang');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_KEEP = 30; // nombre de sauvegardes automatiques conservées

let mainWindow = null;

function createWindow() {
  app.setAppUserModelId('com.breakers.gang'); // nécessaire sous Windows pour que les notifications s'affichent correctement
  mainWindow = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1080, minHeight: 680,
    frame: false, titleBarStyle: 'hidden',
    backgroundColor: '#0a0610',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false // les minuteurs/notifs doivent continuer à tourner fenêtre réduite
    }
  });
  mainWindow.loadFile('index.html');

  ipcMain.on('win-minimize', () => mainWindow.minimize());
  ipcMain.on('win-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
  ipcMain.on('win-close',    () => mainWindow.close());
}

app.whenReady().then(() => { autoBackup(); createWindow(); setupUpdater(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ---- Données ----
function getDefaultData() {
  return {
    storages: [],
    items: [],
    recipes: [],
    markers: [],
    bornes: [],
    infractions: [],
    pms: [],
    pmBasePrices: {},
    hackZones: [],
    history: [],
    sales: []
  };
}

/** Ne garde que les champs connus, avec le bon type (utilisé au chargement ET à l'import). */
function normalizeData(raw) {
  const def = getDefaultData();
  const arr = (v, d) => Array.isArray(v) ? v : d;
  return {
    storages: arr(raw.storages, def.storages),
    items:    arr(raw.items, def.items),
    recipes:  arr(raw.recipes, def.recipes),
    markers:  arr(raw.markers, def.markers),
    bornes:   arr(raw.bornes, def.bornes),
    infractions: arr(raw.infractions, def.infractions),
    hackZones: arr(raw.hackZones, def.hackZones),
    pms: arr(raw.pms, def.pms),
    pmBasePrices: (raw.pmBasePrices && typeof raw.pmBasePrices === 'object' && !Array.isArray(raw.pmBasePrices)) ? raw.pmBasePrices : def.pmBasePrices,
    history: arr(raw.history, def.history),
    sales: arr(raw.sales, def.sales),
  };
}

function loadData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const def = getDefaultData();
    saveData(def);
    return def;
  }
  try {
    return normalizeData(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    console.error('Erreur de lecture data.json :', e);
    return getDefaultData();
  }
}

// ---- Sauvegardes automatiques : une copie datée de data.json à chaque lancement ----
function autoBackup() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
    fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `data-${stamp}.json`));
    const files = fs.readdirSync(BACKUP_DIR).filter(f => /^data-.*\.json$/.test(f)).sort();
    while (files.length > BACKUP_KEEP) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  } catch (e) { console.error('Sauvegarde auto impossible :', e); }
}

function saveData(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

ipcMain.handle('data-load', () => loadData());
ipcMain.handle('data-save', (_, data) => { saveData(data); return true; });
ipcMain.handle('data-path', () => DATA_FILE);

// ---- Export / import / sauvegardes / démarrage auto ----
ipcMain.handle('data-export', async (_, data) => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter les données',
    defaultPath: `breakers-export-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, path: res.filePath };
});

ipcMain.handle('data-import', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer des données',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
  try {
    const raw = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'));
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return { ok: false, error: "Ce fichier ne ressemble pas à une sauvegarde BreakersGang." };
    autoBackup(); // filet de sécurité avant d'écraser quoi que ce soit
    return { ok: true, data: normalizeData(raw) };
  } catch (e) {
    return { ok: false, error: 'Fichier illisible : ' + e.message };
  }
});

ipcMain.handle('open-backups', async () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  await shell.openPath(BACKUP_DIR);
  return BACKUP_DIR;
});

ipcMain.handle('autostart-get', () => {
  try { return !!app.getLoginItemSettings().openAtLogin; } catch (e) { return false; }
});
ipcMain.handle('autostart-set', (_, enabled) => {
  try {
    const opts = { openAtLogin: !!enabled };
    // En mode développement (npm start), il faut relancer electron avec le dossier de l'app.
    if (!app.isPackaged) { opts.path = process.execPath; opts.args = [app.getAppPath()]; }
    // Version portable : l'exe réel est celui indiqué ici (process.execPath pointerait vers un dossier temporaire).
    if (process.env.PORTABLE_EXECUTABLE_FILE) { opts.path = process.env.PORTABLE_EXECUTABLE_FILE; opts.args = []; }
    app.setLoginItemSettings(opts);
    return !!app.getLoginItemSettings(!app.isPackaged ? { path: process.execPath, args: [app.getAppPath()] } : undefined).openAtLogin;
  } catch (e) { return false; }
});

// ---- Mises à jour automatiques (electron-updater) ----
// Actif uniquement dans l'appli installée (npm run dist) et si le dépôt GitHub est renseigné dans package.json → build.publish.
let autoUpdater = null;
let updateState = { state: 'idle' };

function sendUpdate(s) {
  updateState = s;
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', s);
}

function setupUpdater() {
  if (!app.isPackaged) { updateState = { state: 'dev' }; return; }
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    updateState = { state: 'unavailable' };
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // si tu ne cliques pas sur « Redémarrer », elle s'installe à la fermeture
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'available', version: i.version }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'uptodate' }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'downloaded', version: i.version }));
  autoUpdater.on('error', (e) => sendUpdate({ state: 'error', message: String((e && e.message) || e).split('\n')[0].slice(0, 160) }));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);                 // au lancement
  setInterval(check, 4 * 60 * 60 * 1000);  // puis toutes les 4 h
}

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('update-state', () => updateState);
ipcMain.handle('update-check', async () => {
  if (!autoUpdater) return updateState;
  try { await autoUpdater.checkForUpdates(); } catch (e) { sendUpdate({ state: 'error', message: String(e.message || e).split('\n')[0].slice(0, 160) }); }
  return updateState;
});
ipcMain.handle('update-install', () => { if (autoUpdater && updateState.state === 'downloaded') autoUpdater.quitAndInstall(); return true; });
