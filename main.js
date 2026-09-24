const { app, BrowserWindow, Menu, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Без этого AppImage на многих системах падает с ошибкой про SUID sandbox —
// тот же флаг уже используется в dev-режиме (см. "start" в package.json),
// тут просто зашиваем его и в собранное приложение, чтобы не заставлять
// друзей запускать через терминал с флагами.
app.commandLine.appendSwitch('no-sandbox');

// --- автообновление через GitHub Releases ---
// electron-builder (уже настроен в package.json) публикует релизы на
// GitHub, а electron-updater при каждом запуске тихо проверяет, нет ли
// версии новее текущей, и если есть — скачивает её в фоне. Работает
// только в СОБРАННОМ приложении (установленном .exe/.AppImage), в
// режиме разработки (npm start) просто ничего не делает — это ожидаемо.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true; // поставится при следующем закрытии

autoUpdater.on('error', (err) => {
  console.error('Автообновление: ошибка', err);
});

autoUpdater.on('update-available', (info) => {
  console.log('Автообновление: найдена версия', info.version, '— скачиваю...');
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Автообновление: версия', info.version, 'скачана');
  if (Notification.isSupported()) {
    new Notification({
      title: 'Обновление готово',
      body: `Версия ${info.version} скачана и установится при следующем перезапуске приложения.`,
    }).show();
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#14161a',
    title: 'Микро-мессенджер',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null); // убираем стандартное меню File/Edit/View
  win.loadFile('index.html');

  // Без системного меню пропадает и стандартный шорткат для DevTools —
  // возвращаем его вручную, чтобы можно было отлаживать (в т.ч. смотреть
  // ошибки шифрования в консоли).
  win.webContents.on('before-input-event', (event, input) => {
    const isDevToolsShortcut =
      input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isDevToolsShortcut) {
      win.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  autoUpdater.checkForUpdates(); // тихая проверка при каждом запуске

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
