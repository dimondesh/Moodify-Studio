import mongoose from "mongoose";
import { Library } from "../models/library.model.js";

// Получить только альбомы из библиотеки пользователя
export const getLibraryAlbums = async (req, res, next) => {
  try {
    // 💡 ИСПРАВЛЕНО: используем req.user.id
    const userId = req.user?.id;
    if (!userId) {
      // Это по идее не должно произойти, если protectRoute отработал
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
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    res.json({ albums });
  } catch (err) {
    next(err);
  }
};

// Получить только лайкнутые песни из библиотеки пользователя
export const getLikedSongs = async (req, res, next) => {
  try {
    // 💡 ИСПРАВЛЕНО: используем req.user.id
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const library = await Library.findOne({ userId }).populate("songs.songId");

    if (!library) {
      return res.json({ songs: [] });
    }

    const songs = library.songs
      .map((s) => ({
        ...s.songId._doc,
        addedAt: s.addedAt,
      }))
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    res.json({ songs });
  } catch (err) {
    next(err);
  }
};

// Тоггл альбома (добавить/удалить из библиотеки альбом)
export const toggleAlbumInLibrary = async (req, res, next) => {
  try {
    console.log("▶️ toggleAlbumInLibrary called with:", req.body);

    // 💡 ИСПРАВЛЕНО: используем req.user.id
    const userId = req.user?.id;
    console.log("UserId from req.user:", userId); // Логируем правильный путь
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

    res.json({ success: true });
  } catch (err) {
    console.error("❌ toggleAlbumInLibrary error:", err);
    next(err);
  }
};

// Тоггл лайка песни (добавить/удалить из likedSongs)
export const toggleSongLikeInLibrary = async (req, res, next) => {
  try {
    // 💡 ИСПРАВЛЕНО: используем req.user.id
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

    const exists = library.songs.some((s) => s.songId?.toString() === songId);

    if (exists) {
      library.songs = library.songs.filter(
        (s) => s.songId?.toString() !== songId
      );
    } else {
      library.songs.push({
        songId: new mongoose.Types.ObjectId(songId),
        addedAt: new Date(),
      });
    }

    await library.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ toggleSongLikeInLibrary error:", err);
    next(err);
  }
};
