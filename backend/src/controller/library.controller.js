import mongoose from "mongoose";
import { Library } from "../models/library.model.js";
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

    const library = await Library.findOne({ userId }).populate({
      path: "likedSongs.songId",
      model: "Song",
    });

    if (!library) {
      return res.json({ songs: [] });
    }

    const songs = library.likedSongs
      .filter((item) => item.songId && item.songId._doc)
      .sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      )
      .map((item) => ({
        ...item.songId._doc,
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

    if (exists) {
      library.likedSongs = library.likedSongs.filter(
        (s) => s.songId?.toString() !== songId
      );
    } else {
      library.likedSongs.push({
        songId: new mongoose.Types.ObjectId(songId),
        addedAt: new Date(),
      });
    }

    await library.save();

    res.json({ success: true, isLiked: !exists });
  } catch (err) {
    console.error("❌ toggleSongLikeInLibrary error:", err);
    next(err);
  }
};
