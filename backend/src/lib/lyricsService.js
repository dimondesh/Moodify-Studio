// backend/src/lib/lyricsService.js
// Убедись, что пути импорта корректны относительно этого файла
import axios from "axios"; // Импортируем axios здесь, так как он используется в обеих функциях

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
    // ИЗМЕНЕНО: Теперь передаем artistName в getLyricsByQuery
    console.log(
      `[Lrclib] Поиск по запросу: ${artistName} - ${songName} ${albumName}`
    );
    lyricsResult = await getLyricsByQuery(artistName, songName, albumName);

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

const getLyricsBySignature = async (
  artistName,
  songName,
  albumName,
  songDuration
) => {
  try {
    // Кодируем параметры URL, чтобы избежать проблем с пробелами и спецсимволами
    const encodedArtistName = encodeURIComponent(artistName);
    const encodedSongName = encodeURIComponent(songName);
    const encodedAlbumName = encodeURIComponent(albumName);

    const url = `https://lrclib.net/api/search?artist_name=${encodedArtistName}&track_name=${encodedSongName}&album_name=${encodedAlbumName}&duration=${songDuration}`;
    const res = await axios.get(url);
    if (res.data.length !== 0) {
      // Обработка случая, когда syncedLyrics или plainLyrics могут быть null
      return {
        syncedLyrics:
          res.data[0].syncedLyrics !== null
            ? res.data[0].syncedLyrics.split("\n")
            : ["Synced Lyrics Not Found!"],
        plainLyrics:
          res.data[0].plainLyrics !== null
            ? res.data[0].plainLyrics.split("\n")
            : ["Plain Lyrics not found!"],
        foundSyncedLyrics: res.data[0].syncedLyrics != null, // Используем более короткую форму для булева
        foundPlainLyrics: res.data[0].plainLyrics != null,
      };
    }
    return null;
  } catch (error) {
    console.error(`[Lrclib] Ошибка в getLyricsBySignature:`, error.message);
    return null;
  }
};

export { getLyricsBySignature };

// ИЗМЕНЕНО: Теперь принимает artistName
const getLyricsByQuery = async (artistName, songName, albumName) => {
  try {
    // Кодируем параметры URL
    const encodedArtistName = encodeURIComponent(artistName);
    const encodedSongName = encodeURIComponent(songName);
    const encodedAlbumName = encodeURIComponent(albumName || ""); // albumName может быть null

    // Строим запрос, включая имя артиста
    let query = `${encodedArtistName} ${encodedSongName}`;
    if (encodedAlbumName) {
      query += ` ${encodedAlbumName}`;
    }

    const reqUrl = `https://lrclib.net/api/search?q=${query}`;
    const res = await axios.get(reqUrl);

    if (res.data.length === 0) return null;

    // Дополнительная проверка: если найдено несколько результатов,
    // пытаемся выбрать наиболее подходящий по исполнителю и названию трека.
    // lrclib.net возвращает наиболее релевантные в начале.
    // Для более точной фильтрации можно было бы добавить более сложную логику,
    // но обычно первый результат достаточно хорош, если запрос точен.
    const bestMatch = res.data[0];

    return {
      syncedLyrics:
        bestMatch.syncedLyrics != null
          ? bestMatch.syncedLyrics.split("\n")
          : ["Synced Lyrics Not Found!"],
      plainLyrics:
        bestMatch.plainLyrics != null
          ? bestMatch.plainLyrics.split("\n")
          : ["Plain Lyrics Not Found!"],
      foundSyncedLyrics: bestMatch.syncedLyrics != null,
      foundPlainLyrics: bestMatch.plainLyrics != null,
    };
  } catch (error) {
    console.error(`[Lrclib] Ошибка в getLyricsByQuery:`, error.message);
    return null;
  }
};

export { getLyricsByQuery };
