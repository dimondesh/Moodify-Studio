import mongoose from "mongoose";
import { Library } from "../models/library.model.js";
import { Playlist } from "../models/playlist.model.js"; // Убедитесь, что импортировали модель Playlist
import { Song } from "../models/song.model.js"; // <-- ДОБАВЛЕНО: Импортируем модель Song

export const getLibraryAlbums = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const library = await Library.findOne({ userId }).populate(
      "albums.albumId"
    );

    if (!library) {
      return res.json({ albums: [] });
    }

    const albums = library.albums
      .filter((a) => a.albumId && a.albumId._doc)
      .map((a) => ({
        ...a.albumId._doc,
        addedAt: a.addedAt,
      }))
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );

    res.json({ albums });
  } catch (err) {
    console.error("❌ Error in getLibraryAlbums:", err);
    next(err);
  }
};

export const getLikedSongs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const library = await Library.findOne({ userId })
      .populate({
        path: "likedSongs.songId",
        model: "Song",
        populate: {
          // <-- Заполняем поле 'artist' внутри каждой лайкнутой песни
          path: "artist",
          model: "Artist", // Укажите вашу модель Artist
          select: "name imageUrl", // Выбираем только нужные поля артиста
        },
      })
      .lean(); // <-- Используем .lean() для получения простых JS объектов

    if (!library) {
      return res.json({ songs: [] });
    }

    const songs = library.likedSongs
      .filter((item) => item.songId) // <-- ИЗМЕНЕНО: Удалено ._doc, так как .lean() возвращает простые объекты
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      )
      .map((item) => ({
        ...item.songId, // <-- ИЗМЕНЕНО: Удалено ._doc, так как .lean() возвращает простые объекты
        likedAt: item.addedAt,
      }));

    res.json({ songs });
  } catch (err) {
    console.error("❌ Error in getLikedSongs:", err);
    next(err);
  }
};

export const toggleAlbumInLibrary = async (req, res, next) => {
  try {
    console.log("▶️ toggleAlbumInLibrary called with:", req.body);

    const userId = req.user?.id;
    console.log("UserId from req.user:", userId);
    const { albumId } = req.body;

    if (!userId || !albumId) {
      return res.status(400).json({ message: "Missing userId or albumId" });
    }

    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(400).json({ message: "Invalid albumId format" });
    }

    const library = await Library.findOneAndUpdate(
      { userId },
      {},
      { upsert: true, new: true }
    );

    const exists = library.albums.some(
      (a) => a.albumId?.toString() === albumId
    );

    if (exists) {
      library.albums = library.albums.filter(
        (a) => a.albumId?.toString() !== albumId
      );
    } else {
      library.albums.push({
        albumId: new mongoose.Types.ObjectId(albumId),
        addedAt: new Date(),
      });
    }

    await library.save();

    res.json({ success: true, isAdded: !exists });
  } catch (err) {
    console.error("❌ toggleAlbumInLibrary error:", err);
    next(err);
  }
};

export const toggleSongLikeInLibrary = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { songId } = req.body;

    if (!userId || !songId) {
      return res.status(400).json({ message: "Missing userId or songId" });
    }

    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: "Invalid songId format" });
    }

    const library = await Library.findOneAndUpdate(
      { userId },
      {},
      { upsert: true, new: true }
    );

    const exists = library.likedSongs.some(
      (s) => s.songId?.toString() === songId
    );

    let isLikedStatus;
    let returnedSong = null; // <-- Для хранения заполненной песни

    if (exists) {
      library.likedSongs = library.likedSongs.filter(
        (s) => s.songId?.toString() !== songId
      );
      isLikedStatus = false;
    } else {
      library.likedSongs.push({
        songId: new mongoose.Types.ObjectId(songId),
        addedAt: new Date(),
      });
      isLikedStatus = true;
      // <-- Запрашиваем и заполняем песню, если она только что была лайкнута
      returnedSong = await Song.findById(songId)
        .populate({
          path: "artist",
          model: "Artist",
          select: "name imageUrl",
        })
        .lean();
    }

    await library.save();

    // <-- Возвращаем заполненную песню (если она была добавлена)
    res.json({ success: true, isLiked: isLikedStatus, song: returnedSong });
  } catch (err) {
    console.error("❌ toggleSongLikeInLibrary error:", err);
    next(err);
  }
};

export const getPlaylistsInLibrary = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    console.log("UserId from req.user (in getPlaylistsInLibrary):", userId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const library = await Library.findOne({ userId }).populate({
      path: "playlists.playlistId", // Правильный путь для популяции
      model: "Playlist", // Указываем модель, если имя поля не совпадает с ref напрямую
      match: { isPublic: true }, // фильтрация прямо в populate

      populate: {
        path: "owner", // Популируем владельца плейлиста
        select: "fullName imageUrl", // Выбираем только нужные поля владельца
      },
    });

    if (!library) {
      return res.json({ playlists: [] });
    }

    const playlists = library.playlists
      .filter((item) => item.playlistId && item.playlistId._doc) // Убеждаемся, что playlistId существует и популирован
      .map((item) => ({
        ...item.playlistId._doc, // Разворачиваем популированный документ плейлиста
        addedAt: item.addedAt, // Добавляем дату добавления из Library
      }))
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      ); // Сортируем по дате добавления

    res.json({ playlists });
  } catch (err) {
    console.error("❌ Error in getPlaylistsInLibrary:", err);
    next(err);
  }
};

// @desc    Add/Remove playlist from user's library
// @route   POST /api/library/playlists/toggle
// @access  Private
export const togglePlaylistInLibrary = async (req, res, next) => {
  try {
    console.log("▶️ togglePlaylistInLibrary called with:", req.body);

    const userId = req.user?.id;
    console.log("UserId from req.user:", userId);
    const { playlistId } = req.body; // Получаем playlistId из тела запроса
    const playlistToUpdate = await Playlist.findById(playlistId);

    if (!userId || !playlistId) {
      return res.status(400).json({ message: "Missing userId or playlistId" });
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(400).json({ message: "Invalid playlistId format" });
    }

    // Находим или создаем запись в библиотеке пользователя
    const library = await Library.findOneAndUpdate(
      { userId },
      {}, // Пустой объект обновления, если upsert: true, создаст новый документ
      { upsert: true, new: true } // upsert: true создаст документ, если не найден; new: true вернет обновленный/новый документ
    );

    // Проверяем, существует ли плейлист уже в библиотеке
    const exists = library.playlists.some(
      (p) => p.playlistId?.toString() === playlistId
    );

    let message;
    let isAdded;

    if (exists) {
      // Если существует, удаляем его из массива

      library.playlists = library.playlists.filter(
        (p) => p.playlistId?.toString() !== playlistId
      );
      message = "Playlist removed from library";
      isAdded = false;
      if (playlistToUpdate.likes > 0) {
        playlistToUpdate.likes -= 1;
      }
    } else {
      // Если не существует, добавляем его
      library.playlists.push({
        playlistId: new mongoose.Types.ObjectId(playlistId),
        addedAt: new Date(),
      });
      message = "Playlist added to library";
      isAdded = true;
      playlistToUpdate.likes += 1;
    }

    await playlistToUpdate.save();
    await library.save(); // Сохраняем изменения в библиотеке

    res.json({ success: true, isAdded, message }); // Отправляем статус успеха и информацию о том, был ли добавлен
  } catch (err) {
    console.error("❌ togglePlaylistInLibrary error:", err);
    next(err);
  }
};
