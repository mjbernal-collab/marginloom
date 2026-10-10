const { app, BrowserWindow, protocol, net, Menu, dialog, session, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{
  scheme: 'marginloom',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true },
}]);
app.setAppUserModelId('io.marginloom.desktop');
app.setName('Marginloom');
if (process.env.MARGINLOOM_TEST_PROFILE) app.setPath('userData', path.resolve(process.env.MARGINLOOM_TEST_PROFILE));
let window;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    const notificationPreference = path.join(app.getPath('userData'), 'notification-preference.json');
    let notificationsAllowed = false;
    try { notificationsAllowed = JSON.parse(fs.readFileSync(notificationPreference, 'utf8')).enabled === true; } catch {}
    ipcMain.handle('marginloom:notifications', (event, enabled) => {
      if (!event.senderFrame?.url.startsWith('marginloom://app/') || typeof enabled !== 'boolean') throw new Error('Untrusted notification preference request');
      fs.mkdirSync(path.dirname(notificationPreference), { recursive: true });
      fs.writeFileSync(notificationPreference, JSON.stringify({ enabled }));
      notificationsAllowed = enabled;
      return enabled;
    });
    if (process.env.MARGINLOOM_TEST_OFFLINE === '1') session.defaultSession.enableNetworkEmulation({ offline: true });
    const webRoot = app.isPackaged ? path.join(process.resourcesPath, 'webapp') : path.resolve(__dirname, '../dist');
    protocol.handle('marginloom', async request => {
      const url = new URL(request.url);
      if (url.host !== 'app' || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Invalid path', { status: 400 }); }
      const file = path.resolve(webRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(webRoot, file);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Invalid path', { status: 403 });
      try { return await net.fetch(pathToFileURL(file).href); }
      catch { return new Response('Not found', { status: 404 }); }
    });
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
      const trusted=contents.getURL().startsWith('marginloom://app/');
      // Electron reports denied before opt-in. The trusted preload bridge lets
      // the calendar's explicit Enable action set a persistent preference.
      if (trusted && permission === 'notifications') {
        callback(notificationsAllowed);
        return;
      }
      callback(trusted&&(permission==='persistent-storage'||permission==='media'&&details.mediaTypes?.every(type=>type==='audio')));
    });
    session.defaultSession.setPermissionCheckHandler((contents,permission)=>!!contents?.getURL().startsWith('marginloom://app/')&&(['persistent-storage','media'].includes(permission)||permission==='notifications'&&notificationsAllowed));
    window = new BrowserWindow({
      width: 1280, height: 900, minWidth: 800, minHeight: 620, show: false,
      title: 'Marginloom', backgroundColor: '#f5f3ec', icon: path.join(__dirname, 'icon.ico'),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('marginloom://app/')) event.preventDefault(); });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Marginloom', submenu: [{ role: 'quit', label: 'Close Marginloom' }] },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
      { label: 'Help', submenu: [{ label: 'About Marginloom', click: () => dialog.showMessageBox(window, { type: 'info', title: 'Marginloom', message: `Marginloom ${app.getVersion()}`, detail: 'Your offline study notebook. Documents and progress are saved on this PC. AI models download during first setup, then run locally.' }) }] },
    ]));
    window.once('ready-to-show', () => { if (!process.env.MARGINLOOM_TEST_PROFILE) window.show(); });
    await window.loadURL('marginloom://app/');
  }).catch(error => { dialog.showErrorBox('Marginloom could not start', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
