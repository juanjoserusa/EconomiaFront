import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Economía",
        short_name: "Economía",
        description: "Gestión de gastos y ahorro",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/251697.png", sizes: "192x192", type: "image/png" },
          { src: "/251697.png", sizes: "512x512", type: "image/png" },
          { src: "/251697.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
      },
    }),
  ],
});
