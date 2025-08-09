// frontend/src/hooks/useDominantColor.ts

import { useCallback } from "react";
import { FastAverageColor } from "fast-average-color";
import { axiosInstance } from "@/lib/axios";

// Создаем экземпляр ОДИН РАЗ за пределами хука для лучшей производительности.
const fac = new FastAverageColor();

/**
 * Хук, предоставляющий функцию для извлечения доминантного цвета из изображения.
 * Больше не зависит от какого-либо хранилища.
 */
export const useDominantColor = () => {
  const extractColor = useCallback(
    async (imageUrl: string | null | undefined): Promise<string> => {
      // Если URL не предоставлен, сразу возвращаем цвет по умолчанию
      if (!imageUrl) {
        return "#18181b";
      }

      let objectUrl: string | null = null;
      const fallbackColor = "#18181b";

      try {
        // Запрашиваем изображение через наш бэкенд-прокси
        const proxyUrl = `/songs/image-proxy?url=${encodeURIComponent(
          imageUrl
        )}`;
        const response = await axiosInstance.get(proxyUrl, {
          responseType: "blob",
        });

        const imageBlob = response.data;
        objectUrl = URL.createObjectURL(imageBlob);

        const imageElement = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = objectUrl!;
          }
        );

        // Получаем и возвращаем цвет
        const color = await fac.getColorAsync(imageElement);
        return color.hex;
      } catch (error) {
        console.error("Ошибка при извлечении цвета через прокси:", error);
        // В случае любой ошибки возвращаем цвет по умолчанию
        return fallbackColor;
      } finally {
        // Очищаем временный URL
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
    []
  ); // Пустой массив зависимостей, так как функция не зависит от внешних состояний

  return { extractColor };
};
