// frontend/src/hooks/useDominantColor.ts

import { useCallback } from "react";
import { FastAverageColor } from "fast-average-color";
import { axiosInstance } from "@/lib/axios";

const fac = new FastAverageColor();


export const useDominantColor = () => {
  const extractColor = useCallback(
    async (imageUrl: string | null | undefined): Promise<string> => {
      if (!imageUrl) {
        return "#18181b";
      }

      let objectUrl: string | null = null;
      const fallbackColor = "#18181b";

      try {
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

        const color = await fac.getColorAsync(imageElement);
        return color.hex;
      } catch (error) {
        console.error("Ошибка при извлечении цвета через прокси:", error);
        return fallbackColor;
      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
    []
  ); 

  return { extractColor };
};
