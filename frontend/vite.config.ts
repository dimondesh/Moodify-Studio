import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // <-- Убедитесь, что 'path' импортирован

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Убедитесь, что этот алиас соответствует вашему tsconfig.json
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ... другие настройки Vite ...
});
