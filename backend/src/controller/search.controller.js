import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Playlist } from "../models/playlist.model.js"; // Импортируем модель Playlist

export const searchSongs = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      // Возвращаем пустые массивы для всех типов, если запрос пуст
      return res.json({ songs: [], albums: [], playlists: [] });
    }

    const regex = new RegExp(q.trim(), "i");

    // Выполняем все запросы параллельно для лучшей производительности
    const [songsRaw, albumsRaw, playlistsRaw] = await Promise.all([
      Song.find({
        $or: [{ title: regex }, { artist: regex }],
      })
        .limit(50)
        .lean(),

      Album.find({
        $or: [{ title: regex }, { artist: regex }],
      })
        .limit(50)
        .lean(),

      // <-- НОВАЯ ЧАСТЬ: ПОИСК ПУБЛИЧНЫХ ПЛЕЙЛИСТОВ
      Playlist.find({
        isPublic: true, // Ищем только публичные плейлисты
        $or: [
          { title: regex },
          { description: regex },
          // Если вы хотите искать по владельцу, нужно будет сделать Populate
          // и добавить owner.fullName, но это усложнит запрос.
          // Для начала, поиск по названию и описанию плейлиста достаточен.
        ],
      })
        .populate("owner", "fullName") // Загружаем информацию о владельце (только fullName)
        .limit(50)
        .lean(),
    ]);

    // Форматируем результаты песен
    const songs = songsRaw.map((song) => ({
      ...song,
      albumId: song.albumId ? song.albumId.toString() : null, // Убедитесь, что albumId корректно обрабатывается
      _id: song._id.toString(),
    }));

    // Форматируем результаты альбомов
    const albums = albumsRaw.map((album) => ({
      ...album,
      _id: album._id.toString(),
    }));

    // <-- НОВАЯ ЧАСТЬ: ФОРМАТИРУЕМ РЕЗУЛЬТАТЫ ПЛЕЙЛИСТОВ
    const playlists = playlistsRaw.map((playlist) => ({
      ...playlist,
      _id: playlist._id.toString(),
      // Убедитесь, что owner форматируется корректно, если это объект
      owner: playlist.owner
        ? {
            _id: playlist.owner._id.toString(),
            fullName: playlist.owner.fullName,
          }
        : null,
      // Песни в плейлисте могут быть большими, возможно, вам не нужны все данные о песнях здесь.
      // Если вам нужны только _id песен, можно сделать map:
      songs: playlist.songs ? playlist.songs.map((s) => s.toString()) : [], // Если songs это массив ObjectId
      // Если songs уже populated, тогда нужно другое форматирование
    }));

    // Возвращаем все три типа данных
    return res.json({ songs, albums, playlists });
  } catch (error) {
    next(error);
  }
};
