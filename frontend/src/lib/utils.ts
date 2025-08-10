import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// frontend/src/lib/utils.ts

import type { Artist } from "../types"; // Убедитесь, что путь к вашему файлу типов правильный

/**
 * Вспомогательная функция для безопасного извлечения имен артистов
 * @param artistData Данные об артистах, могут быть Artist | string | (Artist | string)[] | undefined
 * @param allArtists (Опционально) Полный массив объектов Artist из useMusicStore, если artistData содержит только ID.
 * @returns Строка с именами артистов, разделенными запятыми, или "Unknown artist".
 */
export const getArtistNames = (
  artistData: (Artist | string) | (Artist | string)[] | undefined,
  allArtists: Artist[] = [] // Добавляем необязательный параметр для всех артистов
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
      return String(item);
    })
    .filter(Boolean); 

  return names.join(", ") || "Unknown artist";
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
