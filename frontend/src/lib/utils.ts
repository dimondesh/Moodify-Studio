// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Artist } from "../types";

/**
 * Вспомогательная функция для безопасного извлечения имен артистов.
 * Эффективно работает с массивами ID или объектов.
 * @param artistData Данные об артистах, могут быть Artist | string | (Artist | string)[] | undefined
 * @param allArtists (Опционально) Полный массив объектов Artist из useMusicStore. Нужен, если artistData содержит только ID.
 * @returns Строка с именами артистов, разделенными запятыми, или "Unknown artist".
 */
export const getArtistNames = (
  artistData: (Artist | string) | (Artist | string)[] | undefined,
  allArtists: Artist[] = []
): string => {
  if (!artistData || (Array.isArray(artistData) && artistData.length === 0)) {
    return "Unknown artist";
  }

  const artistsArray = Array.isArray(artistData) ? artistData : [artistData];

  const names = artistsArray
    .map((item) => {
      if (typeof item === "object" && item !== null && "name" in item) {
        return item.name;
      }
      if (typeof item === "string" && allArtists.length > 0) {
        const foundArtist = allArtists.find((artist) => artist._id === item);
        return foundArtist ? foundArtist.name : null;
      }
      return null;
    })
    .filter(Boolean); // filter(Boolean) уберет все null значения

  return names.join(", ") || "Unknown artist";
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Создает URL для оптимизированного изображения через Bunny.net.
 * @param originalUrl Оригинальный URL изображения.
 * @param width Требуемая ширина в пикселях.
 * @param quality Качество изображения (0-100).
 * @returns Новый URL с параметрами для оптимизации.
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  width: number,
  quality = 85
): string => {
  if (!originalUrl || !originalUrl.includes("b-cdn.net")) {
    return originalUrl;
  }
  // Добавляем параметры к URL
  return `${originalUrl}?width=${width}&quality=${quality}`;
};
