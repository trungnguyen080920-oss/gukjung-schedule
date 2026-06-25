import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone mode: cho phép electron-builder đóng gói toàn bộ server
  output: process.env.ELECTRON_BUILD === "1" ? "standalone" : undefined,

  // Cho phép Electron load app qua file:// (chỉ cần khi export static)
  // Không cần assetPrefix vì dev mode dùng localhost:3000

  // Headers bảo mật (bỏ restrictive policy để AnkiConnect từ localhost hoạt động)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Cho phép Connect-Src đến localhost:8765 (AnkiConnect)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' http://127.0.0.1:8765 https://ark.volcengine.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
