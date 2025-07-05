// backend/controller/library.controller.js

import mongoose from "mongoose";
import { Library } from "../models/library.model.js"; // Убедись, что путь корректен

// Получить только альбомы из библиотеки пользователя
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
      .map((a) => ({
        ...a.albumId._doc,
        addedAt: a.addedAt,
      }))
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      ); // Добавил .getTime() для надежности

    res.json({ albums });
  } catch (err) {
    next(err);
  }
};

// Получить только лайкнутые песни из библиотеки пользователя
export const getLikedSongs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const library = await Library.findOne({ userId }).populate({
      path: "likedSongs.songId", // 💡 ИСПРАВЛЕНО: Путь к полю, которое нужно populate для лайкнутых песен
      model: "Song", // Модель, на которую ссылается songId
    });

    if (!library) {
      return res.json({ songs: [] });
    }

    // 💡 ИСПРАВЛЕНО: Сортируем по addedAt из вложенного объекта и преобразуем ответ
    const songs = library.likedSongs
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      )
      .map((item) => ({
        ...item.songId._doc, // Разворачиваем объект песни
        likedAt: item.addedAt, // Добавляем время лайка
      }));

    res.json({ songs });
  } catch (err) {
    next(err);
  }
};

// Тоггл альбома (добавить/удалить из библиотеки альбом)
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

    res.json({ success: true, isAdded: !exists }); // Добавил isAdded для удобства фронтенда
  } catch (err) {
    console.error("❌ toggleAlbumInLibrary error:", err);
    next(err);
  }
};

// Тоггл лайка песни (добавить/удалить из likedSongs)
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

    // 💡 ИСПРАВЛЕНО: Проверяем наличие songId в массиве likedSongs (который теперь массив объектов)
    const exists = library.likedSongs.some(
      (s) => s.songId?.toString() === songId
    );

    if (exists) {
      // 💡 ИСПРАВЛЕНО: Фильтруем likedSongs
      library.likedSongs = library.likedSongs.filter(
        (s) => s.songId?.toString() !== songId
      );
    } else {
      // 💡 ИСПРАВЛЕНО: Добавляем новый объект в likedSongs
      library.likedSongs.push({
        songId: new mongoose.Types.ObjectId(songId),
        addedAt: new Date(),
      });
    }

    await library.save();

    res.json({ success: true, isLiked: !exists }); // Добавил isLiked для удобства фронтенда
  } catch (err) {
    console.error("❌ toggleSongLikeInLibrary error:", err);
    next(err);
  }
};
