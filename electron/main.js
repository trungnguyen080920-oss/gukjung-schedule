// PolyGlot Hub — Electron Main Process
// Trao quyền "App Desktop" cho Next.js: System Tray + Global Shortcuts + Window mgmt
"use strict";

const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, shell, dialog } = require("electron");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────
const PROD_URL = "https://gukjung.vercel.app";
const DEV_URL = "http://localhost:3000";
const isDev = !app.isPackaged;
const APP_URL = isDev ? DEV_URL : PROD_URL;

let mainWindow = null;
let pomodoroWindow = null;
let tray = null;
let isQuitting = false;

// ── Tạo cửa sổ chính ─────────────────────────────────────────────────────────
async function createMainWindow() {
  const iconPath = isDev
    ? path.join(__dirname, "../assets/icon.png")
    : path.join(process.resourcesPath, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath,
    title: "PolyGlot Hub",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      // Cho phép gọi AnkiConnect localhost từ renderer
      webSecurity: false,
    },
    show: false,
    backgroundColor: "#0f172a",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  });

  // Ẩn menu bar mặc định của Electron
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(APP_URL);
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Ctrl+R reload (dev only)
  if (isDev) {
    mainWindow.webContents.on("before-input-event", (_, input) => {
      if (input.control && input.key === "r") mainWindow?.webContents.reload();
    });
  }

  // Đóng cửa sổ → thu nhỏ xuống tray thay vì thoát
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      tray?.displayBalloon?.({
        iconType: "info",
        title: "PolyGlot Hub",
        content: "Ứng dụng vẫn chạy ngầm trong System Tray. Nhấn biểu tượng để mở lại.",
      });
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Cửa sổ Pomodoro (floating timer) ─────────────────────────────────────────
function createOrTogglePomodoroWindow() {
  if (pomodoroWindow) {
    pomodoroWindow.isVisible() ? pomodoroWindow.hide() : pomodoroWindow.show();
    return;
  }

  pomodoroWindow = new BrowserWindow({
    width: 340,
    height: 420,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, isDev ? "../assets/icon.png" : ""),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  pomodoroWindow.loadURL(`${APP_URL}/pomodoro`);
  pomodoroWindow.once("ready-to-show", () => pomodoroWindow?.show());
  pomodoroWindow.on("closed", () => { pomodoroWindow = null; });
}

// ── System Tray ────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, "../assets/icon.png")
    : path.join(process.resourcesPath, "icon.png");

  const img = nativeImage.createFromPath(iconPath);
  tray = new Tray(img.resize({ width: 20, height: 20 }));
  tray.setToolTip("PolyGlot Hub");

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: "📊 Mở Dashboard",
        click() { mainWindow?.show(); mainWindow?.focus(); mainWindow?.loadURL(APP_URL + "/dashboard"); },
      },
      {
        label: "🍅 Pomodoro Timer (Ctrl+Shift+P)",
        click() { createOrTogglePomodoroWindow(); },
      },
      {
        label: "⚡ Sync Anki ngay",
        click() { mainWindow?.webContents.send("trigger-anki-sync"); mainWindow?.show(); },
      },
      { type: "separator" },
      {
        label: "🌙 Chế độ tối / sáng",
        click() { mainWindow?.webContents.send("toggle-theme"); },
      },
      { type: "separator" },
      {
        label: "Thoát PolyGlot Hub",
        click() { isQuitting = true; app.quit(); },
      },
    ]);

  tray.setContextMenu(buildMenu());

  // Click trái vào tray → toggle window
  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

// ── Global Shortcuts ───────────────────────────────────────────────────────
function registerShortcuts() {
  // Ctrl+Shift+G — toggle Dashboard
  globalShortcut.register("CommandOrControl+Shift+G", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  // Ctrl+Shift+P — toggle Pomodoro
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    createOrTogglePomodoroWindow();
  });

  // Ctrl+Shift+A — trigger Anki sync
  globalShortcut.register("CommandOrControl+Shift+A", () => {
    mainWindow?.webContents.send("trigger-anki-sync");
    if (!mainWindow?.isVisible()) mainWindow?.show();
  });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Single-instance guard
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  createTray();
  await createMainWindow();
  registerShortcuts();
});

app.on("window-all-closed", () => {
  // macOS: giữ app sống dù đóng hết cửa sổ
  if (process.platform !== "darwin") {
    // Không quit — app vẫn sống trong tray
  }
});

app.on("activate", () => {
  if (!mainWindow) createMainWindow();
  else mainWindow.show();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Mở link ngoài trình duyệt mặc định thay vì Electron window mới
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("https://gukjung.vercel.app")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
});
