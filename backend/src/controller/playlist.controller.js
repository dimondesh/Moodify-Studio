// backend/src/controller/playlist.controller.js
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Library } from "../models/library.model.js"; // <-- НОВОЕ: Импортируем модель Library

import cloudinary from "../lib/cloudinary.js";

const uploadImageToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "image",
      folder: "playlist_covers", // Создаем отдельную папку для обложек плейлистов
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Failed to upload image file to Cloudinary");
  }
};

// @desc    Create a new playlist
// @route   POST /api/playlists
// @access  Private
export const createPlaylist = async (req, res, next) => {
  try {
    const { title, description, isPublic } = req.body;
    const ownerId = req.user.id; // Получаем ID пользователя из req.user, установленного middleware protectRoute

    if (!title) {
      return res.status(400).json({ message: "Playlist title is required" });
    }

    let imageUrl =
      "https://res.cloudinary.com/your-cloud-name/image/upload/v1/default_playlist_image.png"; // Default image
    if (req.files && req.files.image) {
      // <--- ИЗМЕНЕНО С imageFile НА image
      imageUrl = await uploadImageToCloudinary(req.files.image); // <--- ИЗМЕНЕНО С imageFile НА image
    }

    const playlist = new Playlist({
      title,
      description,
      imageUrl,
      owner: ownerId,
      isPublic: isPublic === "true", // Convert string to boolean
      songs: [],
    });

    await playlist.save();

    // Добавляем плейлист в список созданных плейлистов пользователя
    await User.findByIdAndUpdate(ownerId, {
      $push: { playlists: playlist._id },
    });

    res.status(201).json(playlist);
  } catch (error) {
    console.error("Error in createPlaylist:", error);
    next(error);
  }
};

// @desc    Get all playlists for authenticated user (created by user AND added to library)
// @route   GET /api/playlists/my
// @access  Private
export const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Получаем плейлисты, созданные пользователем
    const createdPlaylists = await Playlist.find({ owner: userId })
      .populate("owner", "fullName imageUrl")
      .populate("songs")
      .lean(); // Используем .lean() для получения простых JS объектов

    // 2. Получаем плейлисты, добавленные пользователем в его библиотеку (через модель Library)
    const userLibrary = await Library.findOne({ userId })
      .populate({
        path: "playlists.playlistId", // Путь к популируемому полю в массиве
        model: "Playlist", // Модель для популяции
        populate: {
          path: "owner", // Внутри популированного плейлиста, популируем его владельца
          select: "fullName imageUrl",
        },
      })
      .lean(); // Используем .lean()

    const addedPlaylists = userLibrary
      ? userLibrary.playlists
          .filter((item) => item.playlistId && item.playlistId._doc) // Убеждаемся, что плейлист был успешно популирован
          .map((item) => ({
            ...item.playlistId._doc, // Разворачиваем данные популированного плейлиста
            addedAt: item.addedAt, // Добавляем поле addedAt из Library
          }))
      : [];

    // 3. Объединяем два списка и удаляем дубликаты (если один и тот же плейлист и создан, и добавлен)
    const combinedPlaylistsMap = new Map();

    // Сначала добавляем созданные плейлисты
    createdPlaylists.forEach((p) => {
      combinedPlaylistsMap.set(p._id.toString(), p);
    });

    // Затем добавляем добавленные плейлисты. Если _id уже есть, Map обновит запись.
    // Если созданный плейлист был также добавлен в библиотеку,
    // версия из Library (с addedAt) заменит версию created.
    addedPlaylists.forEach((p) => {
      combinedPlaylistsMap.set(p._id.toString(), p);
    });

    const allMyPlaylists = Array.from(combinedPlaylistsMap.values());

    // Отправляем объединенный список
    res.status(200).json(allMyPlaylists);
  } catch (error) {
    console.error("Error in getMyPlaylists:", error);
    next(error);
  }
};

// @desc    Get a single playlist by ID
// @route   GET /api/playlists/:id
// @access  Public (but private playlists only for owner or admin)
export const getPlaylistById = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findById(playlistId)
      .populate("owner", "fullName imageUrl")
      .populate("songs");

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Проверка доступа для приватных плейлистов
    if (
      !playlist.isPublic &&
      playlist.owner.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. This is a private playlist." });
    }

    res.status(200).json(playlist);
  } catch (error) {
    console.error("Error in getPlaylistById:", error);
    next(error);
  }
};

// @desc    Update a playlist (title, description, imageUrl, isPublic)
// @route   PUT /api/playlists/:id
// @access  Private (only owner or admin)
export const updatePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const { title, description, isPublic } = req.body;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Проверка, является ли пользователь владельцем или админом
    if (playlist.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    if (title) playlist.title = title;
    if (description) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic === "true"; // Convert string to boolean

    if (req.files && req.files.image) {
      playlist.imageUrl = await uploadImageToCloudinary(req.files.image);
    }

    await playlist.save();
    res.status(200).json(playlist);
  } catch (error) {
    console.error("Error in updatePlaylist:", error);
    next(error);
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/playlists/:id
// @access  Private (only owner or admin)
export const deletePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Проверка, является ли пользователь владельцем или админом
    if (playlist.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    await Playlist.findByIdAndDelete(playlistId);
    // Также можно удалить ссылку на этот плейлист из модели User
    await User.findByIdAndUpdate(playlist.owner, {
      $pull: { playlists: playlist._id },
    });

    res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (error) {
    console.error("Error in deletePlaylist:", error);
    next(error);
  }
};

// @desc    Add a song to a playlist
// @route   POST /api/playlists/:id/songs
// @access  Private (only owner or admin)
export const addSongToPlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const { songId } = req.body;

    const playlist = await Playlist.findById(playlistId);
    const song = await Song.findById(songId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // Проверка, является ли пользователь владельцем или админом
    if (playlist.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    // Проверяем, есть ли уже песня в плейлисте
    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: "Song already in playlist" });
    }

    playlist.songs.push(songId);
    await playlist.save();

    res.status(200).json({ message: "Song added to playlist", playlist });
  } catch (error) {
    console.error("Error in addSongToPlaylist:", error);
    next(error);
  }
};

// @desc    Remove a song from a playlist
// @route   DELETE /api/playlists/:playlistId/songs/:songId
// @access  Private (only owner or admin)
export const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, songId } = req.params;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Проверка, является ли пользователь владельцем или админом
    if (playlist.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    const initialSongCount = playlist.songs.length;
    playlist.songs = playlist.songs.filter(
      (song) => song.toString() !== songId
    );

    if (playlist.songs.length === initialSongCount) {
      return res.status(404).json({ message: "Song not found in playlist" });
    }

    await playlist.save();
    res.status(200).json({ message: "Song removed from playlist", playlist });
  } catch (error) {
    console.error("Error in removeSongFromPlaylist:", error);
    next(error);
  }
};

// @desc    Like a playlist
// @route   POST /api/playlists/:id/like
// @access  Private
export const likePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.likes.includes(userId)) {
      return res.status(400).json({ message: "Playlist already liked" });
    }

    playlist.likes.push(userId);
    await playlist.save();

    res.status(200).json({ message: "Playlist liked successfully", playlist });
  } catch (error) {
    console.error("Error in likePlaylist:", error);
    next(error);
  }
};

// @desc    Unlike a playlist
// @route   DELETE /api/playlists/:id/unlike
// @access  Private
export const unlikePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const initialLikeCount = playlist.likes.length;
    playlist.likes = playlist.likes.filter((id) => id.toString() !== userId);

    if (playlist.likes.length === initialLikeCount) {
      return res
        .status(400)
        .json({ message: "Playlist was not liked by this user" });
    }

    await playlist.save();

    res
      .status(200)
      .json({ message: "Playlist unliked successfully", playlist });
  } catch (error) {
    console.error("Error in unlikePlaylist:", error);
    next(error);
  }
};

// @desc    Get all public playlists
// @route   GET /api/playlists/public
// @access  Public
export const getPublicPlaylists = async (req, res, next) => {
  try {
    const publicPlaylists = await Playlist.find({ isPublic: true })
      .populate("owner", "fullName imageUrl")
      .populate("songs");
    res.status(200).json(publicPlaylists);
  } catch (error) {
    console.error("Error in getPublicPlaylists:", error);
    next(error);
  }
};
