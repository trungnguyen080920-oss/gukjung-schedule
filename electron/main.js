// PolyGlot Hub — Electron Main Process
// Trao quyền "App Desktop" cho Next.js: System Tray + Global Shortcuts + Window mgmt
"use strict";

const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, shell, dialog } = require("electron");
const path = require("path");
const { spawn, execSync } = require("child_process");

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = 3000;
const DEV_URL = `http://localhost:${PORT}`;
const isDev = !app.isPackaged;

let mainWindow = null;
let pomodoroWindow = null;
let tray = null;
let nextProcess = null;
let isQuitting = false;

// ── Khởi động Next.js server (chỉ trong production) ─────────────────────────
function startNextServer() {
  if (isDev) return Promise.resolve(); // dev: Next.js chạy riêng qua `npm run dev`

  return new Promise((resolve, reject) => {
    const serverDir = path.join(process.resourcesPath, "server");
    const serverScript = path.join(serverDir, "server.js");

    nextProcess = spawn(process.execPath, [serverScript], {
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "production",
        // Prisma database ở resources
        DATABASE_URL: `file:${path.join(app.getPath("userData"), "polyglot.db")}`,
      },
    });

    nextProcess.stdout.on("data", (d) => {
      const msg = d.toString();
      if (msg.includes("Ready") || msg.includes("ready")) resolve();
    });
    nextProcess.stderr.on("data", (d) => console.error("[Next]", d.toString()));
    nextProcess.on("error", reject);

    // Timeout fallback: đợi 15s rồi thử load dù Next.js chưa log Ready
    setTimeout(resolve, 15000);
  });
}

// ── Chờ Next.js sẵn sàng (polling) ─────────────────────────────────────────
async function waitForNext(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const http = require("http");
      await new Promise((res, rej) => {
        const req = http.get(`http://localhost:${PORT}`, (r) => { r.resume(); res(); });
        req.on("error", rej);
        req.setTimeout(1000, () => { req.destroy(); rej(new Error("timeout")); });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

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

  const ready = await waitForNext(30000);
  if (!ready) {
    dialog.showErrorBox("PolyGlot Hub", "Không thể kết nối server. Hãy đảm bảo `npm run dev` đang chạy.");
    app.quit();
    return;
  }

  mainWindow.loadURL(DEV_URL);
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

  pomodoroWindow.loadURL(`${DEV_URL}/pomodoro`);
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
        click() { mainWindow?.show(); mainWindow?.focus(); mainWindow?.loadURL(DEV_URL + "/dashboard"); },
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

  await startNextServer();
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
  if (nextProcess) { nextProcess.kill(); nextProcess = null; }
});

// Mở link ngoài trình duyệt mặc định thay vì Electron window mới
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
});
