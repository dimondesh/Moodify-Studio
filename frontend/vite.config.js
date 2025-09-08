// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
var BUNNY_CDN_HOSTNAME = "moodify.b-cdn.net";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            template: "treemap",
            open: true,
            gzipSize: true,
            brotliSize: true,
            filename: "bundle-analysis.html",
        }),
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
                        urlPattern: new RegExp("^https://".concat(BUNNY_CDN_HOSTNAME, "/.*"), "i"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "bunny-assets-cache", // Новое общее имя кэша
                            expiration: {
                                maxEntries: 750, // Увеличим лимит для песен и изображений
                                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 дней
                            },
                            rangeRequests: true, // Важно для стриминга аудио
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: function (_a) {
                            var url = _a.url;
                            return url.origin === "https://moodify-yf1r.onrender.com/api";
                        },
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
                theme_color: "#7B39EC",
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
