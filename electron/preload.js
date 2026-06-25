// Preload: bridge an toàn giữa Electron main process và renderer (Next.js)
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Lắng nghe lệnh từ tray / global shortcuts
  onTriggerAnkiSync: (cb) => ipcRenderer.on("trigger-anki-sync", cb),
  onToggleTheme:     (cb) => ipcRenderer.on("toggle-theme", cb),

  // Gửi thông báo desktop
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),

  // Kiểm tra đang chạy trong Electron hay browser
  isElectron: true,
  platform: process.platform,
});
