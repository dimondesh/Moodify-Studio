// src/hooks/useDominantColor.ts
import { usePlayerStore } from "@/stores/usePlayerStore";
import { FastAverageColor } from "fast-average-color";
import { useCallback } from "react"; // Импортируем useCallback

export const useDominantColor = () => {
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);
  const fac = new FastAverageColor();

  // Мемоизируем extractColor с помощью useCallback
  const extractColor = useCallback(
    async (imageUrl: string) => {
      try {
        const color = await fac.getColorAsync(imageUrl);
        // Проверяем, изменился ли цвет, прежде чем обновлять состояние
        if (usePlayerStore.getState().dominantColor !== color.hex) {
          setDominantColor(color.hex);
        }
      } catch (error) {
        console.error("Ошибка при извлечении цвета:", error);
      }
    },
    [setDominantColor, fac] // Зависимости для useCallback. fac - стабильный объект.
  );

  // Добавим функцию для сброса цвета
  const resetDominantColor = useCallback(() => {
    setDominantColor("#18181b"); // Цвет по умолчанию (ваше текущее фоновое значение)
  }, [setDominantColor]);

  return { extractColor, resetDominantColor };
};
