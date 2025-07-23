// src/hooks/useDominantColor.ts

import { usePlayerStore } from "@/stores/usePlayerStore";
import { FastAverageColor } from "fast-average-color";
import { useCallback } from "react";

// --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ---
// Создаем экземпляр ОДИН РАЗ за пределами хука.
// Теперь это стабильная константа для всего приложения.
const fac = new FastAverageColor();

export const useDominantColor = () => {
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);

  const extractColor = useCallback(
    async (imageUrl: string) => {
      try {
        const color = await fac.getColorAsync(imageUrl);
        // Теперь get.State() не нужен, так как мы не в Zustand
        if (usePlayerStore.getState().dominantColor !== color.hex) {
          setDominantColor(color.hex);
        }
        // Возвращаем цвет, чтобы его можно было использовать напрямую
        return color.hex;
      } catch (error) {
        console.error("Ошибка при извлечении цвета:", error);
        return null; // Возвращаем null в случае ошибки
      }
    },
    [setDominantColor] // Теперь `fac` не нужно в зависимостях, так как он стабилен
  );

  const resetDominantColor = useCallback(() => {
    setDominantColor("#18181b");
  }, [setDominantColor]);

  return { extractColor, resetDominantColor };
};
