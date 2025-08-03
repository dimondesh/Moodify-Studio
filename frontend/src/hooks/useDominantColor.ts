// src/hooks/useDominantColor.ts

import { usePlayerStore } from "@/stores/usePlayerStore";
import { FastAverageColor } from "fast-average-color";
import { useCallback } from "react";

// Создаем экземпляр ОДИН РАЗ за пределами хука для лучшей производительности.
const fac = new FastAverageColor();

export const useDominantColor = () => {
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);

  const extractColor = useCallback(
    async (imageUrl: string) => {
      // Переменная для временного URL, чтобы мы могли его очистить
      let objectUrl: string | null = null;

      try {
        // 1. Самостоятельно загружаем изображение с 'cors' режимом.
        // Это гарантирует, что service worker вернет читаемый ответ из кэша.
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // 2. Преобразуем ответ в Blob (бинарные данные).
        const imageBlob = await response.blob();

        // 3. Создаем временный локальный URL для этого Blob'а.
        objectUrl = URL.createObjectURL(imageBlob);

        // 4. Создаем HTMLImageElement и ждем его полной загрузки.
        // Это необходимо, так как getColorAsync ожидает загруженный элемент.
        const imageElement = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const img = new Image();
            // Важно: устанавливаем crossOrigin, чтобы избежать "загрязнения" холста (canvas),
            // что является основной причиной проблем на iOS.
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = objectUrl!;
          }
        );

        // 5. Получаем цвет из загруженного элемента изображения.
        const color = await fac.getColorAsync(imageElement);

        // Обновляем состояние в сторе, если цвет изменился.
        if (usePlayerStore.getState().dominantColor !== color.hex) {
          setDominantColor(color.hex);
        }

        return color.hex;
      } catch (error) {
        console.error("Ошибка при извлечении цвета:", error);

        // В случае любой ошибки устанавливаем безопасный фоновый цвет по умолчанию.
        const fallbackColor = "#18181b";
        if (usePlayerStore.getState().dominantColor !== fallbackColor) {
          setDominantColor(fallbackColor);
        }
        return fallbackColor;
      } finally {
        // 6. КРИТИЧЕСКИ ВАЖНО: Освобождаем память, удаляя временный URL.
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
    [setDominantColor]
  );

  const resetDominantColor = useCallback(() => {
    setDominantColor("#18181b");
  }, [setDominantColor]);

  return { extractColor, resetDominantColor };
};
