// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa"; // <-- 1. ИМПОРТ
import path from "path"; // <-- Убедитесь, что этот импорт есть

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // <-- 2. ДОБАВЬТЕ ПЛАГИН И ЕГО КОНФИГУРАЦИЮ
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // Включаем для разработки
      },
      workbox: {
        // Стратегии кэширования
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wav}"], // Кэшируем основные ассеты
        runtimeCaching: [
          {
            // Кэшируем изображения с Cloudinary (обложки)
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images-cache",
              expiration: {
                maxEntries: 200, // Увеличим лимит для обложек
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Эта стратегия будет ловить аудиофайлы, когда мы их будем скачивать вручную
            urlPattern: /.*\.(mp3|wav|ogg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "moodify-audio-cache",
              expiration: {
                maxEntries: 500, // Больше места для треков
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 дней
              },
              rangeRequests: true, // ВАЖНО для аудио/видео
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Кэшируем ответы API. NetworkFirst - хорошая стратегия для данных, которые могут обновляться.
            urlPattern: ({ url }) =>
              url.origin === import.meta.env.VITE_API_URL,
            handler: "NetworkFirst",
            options: {
              cacheName: "moodify-api-cache",
              networkTimeoutSeconds: 5, // Даем сети 5 секунд, прежде чем перейти к кэшу
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 дней
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "Moodify",
        short_name: "Moodify",
        description: "Your ultimate guide in the world of music.",
        theme_color: "#7B39EC", // Ваш фиолетовый цвет
        background_color: "#18181b", // Ваш фоновый цвет
        icons: [
          {
            src: "Moodify.png", // Убедитесь, что этот файл есть в /public
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "Moodify.png",
            sizes: "512x512",
            type: "image/png",
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
