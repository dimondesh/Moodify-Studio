// frontend/src/hooks/useDominantColor.ts

import { usePlayerStore } from "@/stores/usePlayerStore";
import { FastAverageColor } from "fast-average-color";
import { useCallback } from "react";
import { axiosInstance } from "@/lib/axios"; // Убедитесь, что axiosInstance импортирован

// Создаем экземпляр ОДИН РАЗ за пределами хука для лучшей производительности.
const fac = new FastAverageColor();

export const useDominantColor = () => {
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);

  const extractColor = useCallback(
    async (imageUrl: string) => {
      let objectUrl: string | null = null;
      const fallbackColor = "#18181b"; // Безопасный цвет по умолчанию

      try {
        // --- НОВОЕ РЕШЕНИЕ: ЗАПРОС ЧЕРЕЗ БЭКЕНД-ПРОКСИ ---
        // 1. Формируем URL к нашему новому эндпоинту на бэкенде.
        const proxyUrl = `/songs/image-proxy?url=${encodeURIComponent(
          imageUrl
        )}`;

        // 2. Запрашиваем изображение через наш прокси.
        // AxiosInstance автоматически добавит нужные заголовки аутентификации.
        // Мы ожидаем получить бинарные данные (blob).
        const response = await axiosInstance.get(proxyUrl, {
          responseType: "blob",
        });

        const imageBlob = response.data;

        // 3. Создаем временный локальный URL для этого Blob'а.
        objectUrl = URL.createObjectURL(imageBlob);

        // 4. Создаем HTMLImageElement и ждем его полной загрузки.
        const imageElement = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const img = new Image();
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
        console.error("Ошибка при извлечении цвета через прокси:", error);

        // В случае любой ошибки устанавливаем цвет по умолчанию.
        if (usePlayerStore.getState().dominantColor !== fallbackColor) {
          setDominantColor(fallbackColor);
        }
        return fallbackColor;
      } finally {
        // 6. КРИТИЧЕСКИ ВАЖНО: Освобождаем память.
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
