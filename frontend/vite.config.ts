// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const BUNNY_CDN_HOSTNAME = "moodify.b-cdn.net";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wav,mp3}"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB

        runtimeCaching: [
          {
            urlPattern: new RegExp(
              `^https://${BUNNY_CDN_HOSTNAME}/.*\\.(png|jpg|jpeg|svg|gif|webp)$`,
              "i"
            ),
            handler: "CacheFirst",
            options: {
              cacheName: "bunny-images-cache",
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /.*\.(mp3|wav|ogg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "moodify-audio-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              rangeRequests: true,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === "https://moodify-yf1r.onrender.com/api",
            handler: "NetworkFirst",
            options: {
              cacheName: "moodify-api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      includeAssets: [
        "silent.mp3",
        "Moodify.png",
        "Moodify.svg",
        "Spotify.svg",
        "liked.png",
        "liked.svg",
        "default-album-cover.png",
        "robots.txt",
        "ir/small-room.wav",
        "ir/medium-room.wav",
        "ir/large-hall.wav",
      ],
      manifest: {
        name: "Moodify",
        short_name: "Moodify",
        description: "Your ultimate guide in the world of music.",
        theme_color: "#7B3EC",
        background_color: "#18181b",
        icons: [
          {
            src: "Moodify.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "Moodify.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
