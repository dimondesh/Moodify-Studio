// backend/src/services/spotifyService.js
import axios from "axios";

// Используем переменные окружения для безопасности
// Убедитесь, что вы установили их в файле .env или в окружении Vercel/другого хостинга
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token"; // Эндпоинт для получения токена

let accessToken = null; // Будем хранить токен доступа здесь
let tokenExpiresAt = 0; // Время истечения срока действия токена

/**
 * Получает или обновляет токен доступа Spotify.
 * @returns {Promise<string>} Токен доступа Spotify.
 */
const getAccessToken = async () => {
  // Если токен существует и еще действителен, возвращаем его
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      SPOTIFY_AUTH_URL,
      "grant_type=client_credentials", // Тип авторизации для серверных приложений
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
        },
      }
    );

    accessToken = response.data.access_token;
    // Время истечения срока действия токена (в секундах), конвертируем в миллисекунды и добавляем к текущему времени
    tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

    console.log(
      "[SpotifyService] Токен доступа Spotify успешно получен/обновлен."
    );
    return accessToken;
  } catch (error) {
    console.error(
      "[SpotifyService] Ошибка при получении/обновлении токена доступа Spotify:",
      error.message
    );
    if (error.response) {
      console.error(
        "Status:",
        error.response.status,
        "Data:",
        error.response.data
      );
    }
    throw new Error("Не удалось получить токен доступа Spotify.");
  }
};

/**
 * Извлекает ID альбома из Spotify URL.
 * @param {string} albumUrl - Spotify URL альбома.
 * @returns {string|null} ID альбома или null, если URL недействителен.
 */
const getAlbumIdFromUrl = (albumUrl) => {
  const match = albumUrl.match(/spotify\.com\/album\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

/**
 * Получает детальную информацию об альбоме и его треках из Spotify API.
 * @param {string} albumUrl - Spotify URL альбома.
 * @returns {Promise<object|null>} Объект с информацией об альбоме и треках или null при ошибке.
 */
export const getAlbumDataFromSpotify = async (albumUrl) => {
  const albumId = getAlbumIdFromUrl(albumUrl);
  if (!albumId) {
    console.error(
      "[SpotifyService] Недействительный Spotify URL альбома:",
      albumUrl
    );
    return null;
  }

  try {
    const token = await getAccessToken();
    const response = await axios.get(
      `http://api.spotify.com/v1/albums/${albumId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const albumData = response.data;

    // Извлекаем нужную информацию
    const extractedData = {
      id: albumData.id,
      name: albumData.name,
      artists: albumData.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
      release_date: albumData.release_date,
      // Берем самую большую обложку (обычно последняя в массиве или ищем по размеру)
      images: albumData.images,
      album_type: albumData.album_type,
      total_tracks: albumData.total_tracks,
      tracks: albumData.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        // Spotify предоставляет длительность в мс
        duration_ms: track.duration_ms,
        // Spotify URL для каждого трека может быть полезен для отладки, но для lrclib.net нужны метаданные
        // external_urls: track.external_urls.spotify,
      })),
    };

    console.log(
      `[SpotifyService] Данные альбома "${extractedData.name}" успешно получены со Spotify.`
    );
    return extractedData;
  } catch (error) {
    console.error(
      `[SpotifyService] Ошибка при получении данных альбома ${albumId} со Spotify:`,
      error.message
    );
    if (error.response) {
      console.error(
        "Status:",
        error.response.status,
        "Data:",
        error.response.data
      );
    }
    return null;
  }
};
