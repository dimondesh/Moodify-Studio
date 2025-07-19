// backend/src/lib/lyricsService.js
// Убедись, что пути импорта корректны относительно этого файла
import { getLyricsByQuery } from "./getLyricsByQuery.js";
import { getLyricsBySignature } from "./getLyricsBySignature.js";

/**
 * Пытается получить LRC-тексты из lrclib.net по сигнатуре или по запросу.
 * @param {object} songData - Объект с данными о песне.
 * @param {string} songData.artistName - Имя исполнителя.
 * @param {string} songData.songName - Название песни.
 * @param {string} songData.albumName - Название альбома.
 * @param {number} songData.songDuration - Длительность песни в миллисекундах.
 * @returns {Promise<string|null>} - Промис, который разрешается в строку LRC-текста или null, если текст не найден/ошибка.
 */
export const getLrcLyricsFromLrclib = async (songData) => {
  const { artistName, songName, albumName, songDuration } = songData;

  if (!songName || !artistName) {
    console.warn(
      "Недостаточно данных (название песни или артист) для поиска текстов на lrclib.net."
    );
    return null;
  }

  let lyricsResult = null;

  try {
    // 1. Попытка получить тексты по сигнатуре (более точный поиск)
    console.log(`[Lrclib] Поиск по сигнатуре: ${artistName} - ${songName}`);
    lyricsResult = await getLyricsBySignature(
      artistName,
      songName,
      albumName,
      songDuration
    );

    if (lyricsResult && lyricsResult.foundSyncedLyrics) {
      // lrclib.net возвращает массив строк, склеиваем их в одну строку LRC
      return lyricsResult.syncedLyrics.join("\n");
    }

    // 2. Если по сигнатуре не нашли, пробуем по запросу (менее точный поиск)
    console.log(`[Lrclib] Поиск по запросу: ${songName} ${albumName}`);
    lyricsResult = await getLyricsByQuery(songName, albumName);

    if (lyricsResult && lyricsResult.foundSyncedLyrics) {
      return lyricsResult.syncedLyrics.join("\n");
    }

    console.warn(
      `[Lrclib] Синхронизированные LRC-тексты не найдены для "${songName}" - "${artistName}".`
    );
    return null;
  } catch (error) {
    console.error(`[Lrclib] Ошибка при получении текстов:`, error.message);
    return null;
  }
};
