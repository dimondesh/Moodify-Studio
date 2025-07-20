// backend/src/controller/admin.controller.js
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Artist } from "../models/artist.model.js";
import cloudinary from "../lib/cloudinary.js";
import {
  extractPublicId,
  deleteFromCloudinary,
} from "../lib/deleteFromCloudinary.js";
import * as mm from "music-metadata";

// --- НОВЫЕ ИМПОРТЫ ДЛЯ АВТОМАТИЗАЦИИ АЛЬБОМА ---
import { getAlbumDataFromSpotify } from "../lib/spotifyService.js"; // Для данных Spotify
import { getLrcLyricsFromLrclib } from "../lib/lyricsService.js"; // Для LRC текстов
import {
  extractZip,
  parseTrackFileName,
  cleanUpTempDir,
} from "../lib/zipHandler.js"; // Для ZIP
// uploadToCloudinary уже определен ниже, поэтому отдельный импорт не нужен

import path from "path"; // Для работы с путями файлов
import fs from "fs/promises"; // Для работы с файловой системой (для удаления временных файлов)

const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "auto",
      folder: folder,
    });
    return result; // Возвращаем весь объект result, чтобы получить public_id
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload file to Cloudinary");
  }
};

// Вспомогательная функция для проверки и добавления ID в массивы артистов
const updateArtistsContent = async (artistIds, contentId, contentType) => {
  if (!artistIds || artistIds.length === 0) return;

  const updateField = contentType === "songs" ? "songs" : "albums";

  await Artist.updateMany(
    { _id: { $in: artistIds } }, // Обновляем всех указанных артистов
    { $addToSet: { [updateField]: contentId } } // Добавляем contentId в соответствующий массив, если его там нет
  );
  console.log(
    `[updateArtistsContent] Successfully updated ${contentType} for artists: ${artistIds}`
  );
};

// Вспомогательная функция для проверки и удаления ID из массивов артистов
// ИЗМЕНЕНО: Использование updateMany с $pull для повышения эффективности
const removeContentFromArtists = async (artistIds, contentId, contentType) => {
  if (!artistIds || artistIds.length === 0) return;

  const updateField = contentType === "songs" ? "songs" : "albums";

  await Artist.updateMany(
    { _id: { $in: artistIds } }, // Обновляем всех указанных артистов
    { $pull: { [updateField]: contentId } } // Удаляем contentId из соответствующего массива
  );
  console.log(
    `[removeContentFromArtists] Successfully removed ${contentType} for artists: ${artistIds}`
  );
};

// --- CRUD для SONGS ---

export const createSong = async (req, res, next) => {
  console.log("🚀 Reached /admin/songs route - CREATE");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Проверяем наличие instrumentalFile - это всегда обязательно
    if (!req.files || !req.files.instrumentalFile) {
      return res
        .status(400)
        .json({ message: "Please upload instrumental audio file." });
    }

    const {
      title,
      artistIds: artistIdsJsonString,
      albumId, // Получаем albumId здесь, чтобы использовать его в условной проверке
      releaseYear,
      lyrics,
    } = req.body;

    // ✅ ИЗМЕНЕНО: Условная проверка imageFile.
    // imageFile обязателен, только если albumId не предоставлен (это сингл)
    if (
      (!albumId || albumId === "none" || albumId === "") &&
      !req.files.imageFile
    ) {
      return res.status(400).json({
        message:
          "Please upload an image file for the song (required for singles).",
      });
    }

    let artistIds;
    try {
      artistIds = artistIdsJsonString ? JSON.parse(artistIdsJsonString) : [];
      if (!Array.isArray(artistIds)) {
        artistIds = [];
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON:", e);
      artistIds = [];
    }

    if (!artistIds || artistIds.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one Artist ID is required." });
    }

    const existingArtists = await Artist.find({ _id: { $in: artistIds } });
    if (existingArtists.length !== artistIds.length) {
      return res
        .status(404)
        .json({ message: "One or more artists not found." });
    }

    let duration = 0;
    try {
      const metadata = await mm.parseFile(
        req.files.instrumentalFile.tempFilePath
      );
      duration = Math.floor(metadata.format.duration || 0);
    } catch (err) {
      console.error("Error parsing instrumental audio metadata:", err);
      throw new Error("Invalid instrumental audio file");
    }

    const instrumentalUploadResult = await uploadToCloudinary(
      // Изменено
      req.files.instrumentalFile,
      "songs/instrumentals"
    );
    const instrumentalUrl = instrumentalUploadResult.secure_url;
    const instrumentalPublicId = instrumentalUploadResult.public_id;

    let vocalsUrl = null;
    let vocalsPublicId = null;
    if (req.files.vocalsFile) {
      const vocalsUploadResult = await uploadToCloudinary(
        // Изменено
        req.files.vocalsFile,
        "songs/vocals"
      );
      vocalsUrl = vocalsUploadResult.secure_url;
      vocalsPublicId = vocalsUploadResult.public_id;
    }

    let songImageUrl;
    let finalAlbumId = null;

    if (albumId && albumId !== "none" && albumId !== "") {
      const existingAlbum = await Album.findById(albumId);
      if (!existingAlbum) {
        return res.status(404).json({ message: "Album not found." });
      }
      const albumArtists = existingAlbum.artist.map((id) => id.toString());
      const hasCommonArtist = artistIds.some((id) => albumArtists.includes(id));
      if (!hasCommonArtist) {
        return res.status(400).json({
          message: "Album does not belong to any of the specified artists.",
        });
      }
      finalAlbumId = albumId;

      if (req.files.imageFile) {
        songImageUrl = (
          await uploadToCloudinary(req.files.imageFile, "songs/images")
        ).secure_url;
      } else {
        songImageUrl = existingAlbum.imageUrl;
      }
    } else {
      songImageUrl = (
        await uploadToCloudinary(req.files.imageFile, "songs/images")
      ).secure_url;

      const newAlbum = new Album({
        title,
        artist: artistIds,
        imageUrl: songImageUrl,
        releaseYear: releaseYear || new Date().getFullYear(),
        songs: [],
        type: "Single",
      });
      await newAlbum.save();
      finalAlbumId = newAlbum._id;

      await updateArtistsContent(artistIds, newAlbum._id, "albums");
    }

    const song = new Song({
      title,
      artist: artistIds,
      instrumentalUrl,
      instrumentalPublicId,
      vocalsUrl,
      vocalsPublicId,
      imageUrl: songImageUrl,
      duration,
      albumId: finalAlbumId,
      lyrics: lyrics || null,
    });

    await song.save();

    if (finalAlbumId) {
      await Album.findByIdAndUpdate(finalAlbumId, {
        $push: { songs: song._id },
      });
    }

    await updateArtistsContent(artistIds, song._id, "songs");

    res.status(201).json(song);
  } catch (error) {
    console.log("Error in createSong", error);
    next(error);
  }
};

export const updateSong = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const { title, artistIds, albumId, lyrics } = req.body;
    const instrumentalFile = req.files ? req.files.instrumentalFile : null;
    const vocalsFile = req.files ? req.files.vocalsFile : null;
    const imageFile = req.files ? req.files.imageFile : null;

    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: artistIds } });
      if (existingArtists.length !== artistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = song.artist.map((id) => id.toString());
      const newArtistIds = artistIds;

      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, song._id, "songs");

      const artistsToAdd = newArtistIds.filter(
        (newId) => !oldArtistIds.includes(newId)
      );
      await updateArtistsContent(artistsToAdd, song._id, "songs");

      song.artist = newArtistIds;
    } else if (
      artistIds &&
      Array.isArray(artistIds) &&
      artistIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Song must have at least one artist." });
    }

    if (instrumentalFile) {
      if (song.instrumentalPublicId) {
        // Использование publicId
        await deleteFromCloudinary(song.instrumentalPublicId);
      }
      const uploadResult = await uploadToCloudinary(
        // Изменено
        instrumentalFile,
        "songs/instrumentals"
      );
      song.instrumentalUrl = uploadResult.secure_url;
      song.instrumentalPublicId = uploadResult.public_id; // Сохраняем publicId
      try {
        const metadata = await mm.parseFile(instrumentalFile.tempFilePath);
        song.duration = Math.floor(metadata.format.duration || 0);
      } catch (err) {
        console.error("Error parsing new instrumental metadata:", err);
      }
    }

    if (vocalsFile) {
      if (song.vocalsPublicId) {
        // Использование publicId
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      const uploadResult = await uploadToCloudinary(
        // Изменено
        vocalsFile,
        "songs/vocals"
      );
      song.vocalsUrl = uploadResult.secure_url;
      song.vocalsPublicId = uploadResult.public_id; // Сохраняем publicId
    } else if (req.body.clearVocals === "true" && song.vocalsUrl) {
      if (song.vocalsPublicId) {
        // Использование publicId
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      song.vocalsUrl = null;
      song.vocalsPublicId = null;
    }

    if (imageFile) {
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl)); // extractPublicId пока оставим, но лучше перевести на publicId напрямую
      }
      song.imageUrl = (
        await uploadToCloudinary(imageFile, "songs/images")
      ).secure_url;
    }

    if (albumId !== undefined) {
      if (song.albumId && song.albumId.toString() !== albumId) {
        await Album.findByIdAndUpdate(song.albumId, {
          $pull: { songs: song._id },
        });
      }
      if (albumId && albumId !== "none" && albumId !== "") {
        const newAlbum = await Album.findById(albumId);
        if (!newAlbum) {
          return res.status(404).json({ message: "New album not found." });
        }
        const songArtists = song.artist.map((id) => id.toString());
        const albumArtists = newAlbum.artist.map((id) => id.toString());
        const hasCommonArtist = songArtists.some((id) =>
          albumArtists.includes(id)
        );

        if (!hasCommonArtist) {
          return res.status(400).json({
            message:
              "Cannot move song to an album of a different or unrelated artist.",
          });
        }
        if (!newAlbum.songs.includes(song._id)) {
          newAlbum.songs.push(song._id);
          await newAlbum.save();
        }
        song.albumId = albumId;
      } else {
        song.albumId = null;
      }
    }

    song.title = title || song.title;
    song.lyrics = lyrics !== undefined ? lyrics : song.lyrics;

    await song.save();
    res.status(200).json(song);
  } catch (error) {
    console.log("Error in updateSong", error);
    next(error);
  }
};

export const deleteSong = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // Удаление из Cloudinary по publicId
    if (song.instrumentalPublicId) {
      await deleteFromCloudinary(song.instrumentalPublicId);
    }
    if (song.vocalsPublicId) {
      await deleteFromCloudinary(song.vocalsPublicId);
    }
    if (song.imageUrl) {
      // Для imageUrl пока оставим extractPublicId
      await deleteFromCloudinary(extractPublicId(song.imageUrl));
    }

    // Удаление из альбома
    if (song.albumId) {
      await Album.findByIdAndUpdate(song.albumId, {
        $pull: { songs: song._id },
      });
    }

    // Удаление из списка песен артистов
    await removeContentFromArtists(song.artist, song._id, "songs");

    await Song.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Song deleted successfully" });
  } catch (error) {
    console.log("Error in deleteSong", error);
    next(error);
  }
};

// --- CRUD для ALBUMS ---

export const createAlbum = async (req, res, next) => {
  console.log("🚀 Reached createAlbum route");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const {
      title,
      artistIds: artistIdsJsonString,
      releaseYear,
      type = "Album",
    } = req.body;

    let artistIds;
    try {
      artistIds = artistIdsJsonString ? JSON.parse(artistIdsJsonString) : [];
      if (!Array.isArray(artistIds)) {
        artistIds = [];
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON:", e);
      artistIds = [];
    }

    if (!artistIds || artistIds.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one Artist ID is required." });
    }

    const existingArtists = await Artist.find({ _id: { $in: artistIds } });
    if (existingArtists.length !== artistIds.length) {
      return res
        .status(404)
        .json({ message: "One or more artists not found." });
    }

    if (!req.files || !req.files.imageFile) {
      console.log("Validation Failed: No imageFile uploaded.");
      console.log("req.files status:", req.files);
      return res.status(400).json({ message: "No imageFile uploaded" });
    }

    const imageUrl = (await uploadToCloudinary(req.files.imageFile, "albums"))
      .secure_url;

    const album = new Album({
      title,
      artist: artistIds,
      imageUrl,
      releaseYear,
      type,
    });
    await album.save();

    await updateArtistsContent(artistIds, album._id, "albums");

    res.status(201).json(album);
  } catch (error) {
    console.error("Error in createAlbum:", error);
    next(error);
  }
};

export const updateAlbum = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const { title, artistIds, releaseYear, type } = req.body;
    const imageFile = req.files ? req.files.imageFile : null;

    const album = await Album.findById(id);
    if (!album) {
      return res.status(404).json({ message: "Album not found." });
    }

    if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: artistIds } });
      if (existingArtists.length !== artistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = album.artist.map((id) => id.toString());
      const newArtistIds = artistIds;

      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, album._id, "albums");

      const artistsToAdd = newArtistIds.filter(
        (newId) => !oldArtistIds.includes(newId)
      );
      await updateArtistsContent(artistsToAdd, album._id, "albums");

      album.artist = newArtistIds;
    } else if (
      artistIds &&
      Array.isArray(artistIds) &&
      artistIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Album must have at least one artist." });
    }

    if (imageFile) {
      if (album.imageUrl) {
        await deleteFromCloudinary(extractPublicId(album.imageUrl));
      }
      album.imageUrl = (
        await uploadToCloudinary(imageFile, "albums")
      ).secure_url;
    }

    album.title = title || album.title;
    album.releaseYear =
      releaseYear !== undefined ? releaseYear : album.releaseYear;
    album.type = type || album.type;

    await album.save();
    res.status(200).json(album);
  } catch (error) {
    console.error("Error in updateAlbum:", error);
    next(error);
  }
};

export const deleteAlbum = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const album = await Album.findById(id);

    if (!album) {
      return res.status(404).json({ message: "Album not found." });
    }

    if (album.imageUrl) {
      await deleteFromCloudinary(extractPublicId(album.imageUrl));
    }

    const songsInAlbum = await Song.find({ albumId: id });
    for (const song of songsInAlbum) {
      if (song.instrumentalPublicId) {
        // Удаление по publicId
        await deleteFromCloudinary(song.instrumentalPublicId);
      }
      if (song.vocalsPublicId) {
        // Удаление по publicId
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      await removeContentFromArtists(song.artist, song._id, "songs");
    }

    await Song.deleteMany({ albumId: id });

    await removeContentFromArtists(album.artist, album._id, "albums");

    await Album.findByIdAndDelete(id);
    res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAlbum", error);
    next(error);
  }
};

// --- CRUD для ARTISTS ---

export const createArtist = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { name, bio } = req.body;
    const imageFile = req.files ? req.files.imageFile : null;
    const bannerFile = req.files ? req.files.bannerFile : null;

    if (!name) {
      return res.status(400).json({ message: "Artist name is required." });
    }
    if (!imageFile) {
      return res.status(400).json({ message: "Artist image is required." });
    }

    const imageUrl = (await uploadToCloudinary(imageFile, "artists"))
      .secure_url;
    let bannerUrl = null;

    if (bannerFile) {
      bannerUrl = (await uploadToCloudinary(bannerFile, "artists/banners"))
        .secure_url;
    }

    const newArtist = new Artist({
      name,
      bio,
      imageUrl,
      bannerUrl,
    });
    await newArtist.save();

    res.status(201).json(newArtist);
  } catch (error) {
    console.error("Error in createArtist:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res
        .status(409)
        .json({ message: "Artist with this name already exists." });
    }
    next(error);
  }
};

export const updateArtist = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const { name, bio } = req.body;
    const imageFile = req.files ? req.files.imageFile : null;
    const bannerFile = req.files ? req.files.bannerFile : null;

    const artist = await Artist.findById(id);
    if (!artist) {
      return res.status(404).json({ message: "Artist not found." });
    }

    let imageUrl = artist.imageUrl;
    let bannerUrl = artist.bannerUrl;

    if (imageFile) {
      if (artist.imageUrl) {
        await deleteFromCloudinary(extractPublicId(artist.imageUrl));
      }
      imageUrl = (await uploadToCloudinary(imageFile, "artists")).secure_url;
    }

    if (bannerFile) {
      if (artist.bannerUrl) {
        await deleteFromCloudinary(extractPublicId(artist.bannerUrl));
      }
      bannerUrl = (await uploadToCloudinary(bannerFile, "artists/banners"))
        .secure_url;
    } else if (req.body.bannerUrl === null || req.body.bannerUrl === "") {
      if (artist.bannerUrl) {
        await deleteFromCloudinary(extractPublicId(artist.bannerUrl));
      }
      bannerUrl = null;
    }

    artist.name = name || artist.name;
    artist.bio = bio !== undefined ? bio : artist.bio;
    artist.imageUrl = imageUrl;
    artist.bannerUrl = bannerUrl;

    await artist.save();
    res.status(200).json(artist);
  } catch (error) {
    console.error("Error in updateArtist:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res
        .status(409)
        .json({ message: "Artist with this name already exists." });
    }
    next(error);
  }
};

export const deleteArtist = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const artist = await Artist.findById(id);

    if (!artist) {
      return res.status(404).json({ message: "Artist not found." });
    }

    // 1. Удаление изображения артиста из Cloudinary
    if (artist.imageUrl) {
      await deleteFromCloudinary(extractPublicId(artist.imageUrl));
    }
    // 1.1. Удаление баннера артиста из Cloudinary
    if (artist.bannerUrl) {
      await deleteFromCloudinary(extractPublicId(artist.bannerUrl));
    }

    // 2. Удаление всех песен, связанных с этим артистом, из Cloudinary и БД
    // и удаление этих песен из всех альбомов, в которых они могли быть
    const songsOfArtist = await Song.find({ artist: artist._id });
    for (const song of songsOfArtist) {
      if (song.instrumentalPublicId) {
        await deleteFromCloudinary(song.instrumentalPublicId);
      }
      if (song.vocalsPublicId) {
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      // Удаляем песню из альбома, если она там есть
      if (song.albumId) {
        await Album.findByIdAndUpdate(song.albumId, {
          $pull: { songs: song._id },
        });
      }
      // Если песня была связана только с этим артистом, удаляем её
      if (song.artist.length === 1 && song.artist[0].toString() === id) {
        await Song.findByIdAndDelete(song._id);
      } else {
        // Если песня связана с несколькими артистами, просто удаляем текущего из списка
        await Song.findByIdAndUpdate(song._id, { $pull: { artist: id } });
      }
    }

    // 3. Удаление всех альбомов, связанных с этим артистом, из Cloudinary и БД
    const albumsOfArtist = await Album.find({ artist: artist._id });
    for (const album of albumsOfArtist) {
      if (album.imageUrl) {
        await deleteFromCloudinary(extractPublicId(album.imageUrl));
      }
      // Если альбом был связан только с этим артистом, удаляем его
      if (album.artist.length === 1 && album.artist[0].toString() === id) {
        await Album.findByIdAndDelete(album._id);
      } else {
        // Если альбом связан с несколькими артистами, просто удаляем текущего из списка
        await Album.findByIdAndUpdate(album._id, { $pull: { artist: id } });
      }
    }

    // 4. Удаление самого артиста из БД
    await Artist.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message:
        "Artist and associated content relationships updated/deleted successfully.",
    });
  } catch (error) {
    console.error("Error in deleteArtist:", error);
    next(error);
  }
};

// --- НОВЫЙ КОНТРОЛЛЕР ДЛЯ ЗАГРУЗКИ ПОЛНОГО АЛЬБОМА ---
export const uploadFullAlbumAuto = async (req, res, next) => {
  console.log("🚀 Reached /admin/albums/upload-full-album route - AUTO UPLOAD");
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);

  if (!req.user || !req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }

  const { spotifyAlbumUrl } = req.body;
  const albumAudioZip = req.files ? req.files.albumAudioZip : null;

  if (!spotifyAlbumUrl) {
    return res.status(400).json({
      success: false,
      message: "Spotify URL альбома не предоставлен.",
    });
  }
  if (!albumAudioZip) {
    console.error("[AdminController] albumAudioZip не найден в req.files.");
    return res
      .status(400)
      .json({ success: false, message: "ZIP-файл с аудио не загружен." });
  }

  const tempUnzipDir = path.join(
    process.cwd(),
    "temp_unzip_albums",
    Date.now().toString()
  );

  try {
    console.log(
      `[AdminController] Получение данных Spotify для: ${spotifyAlbumUrl}`
    );
    const spotifyAlbumData = await getAlbumDataFromSpotify(spotifyAlbumUrl);
    if (!spotifyAlbumData) {
      return res.status(500).json({
        success: false,
        message:
          "Не удалось получить данные альбома из Spotify. Проверьте URL или настройки Spotify API.",
      });
    }

    console.log(
      `[AdminController] Начинаем распаковку ZIP: ${albumAudioZip.tempFilePath}`
    );
    const extractedFilePaths = await extractZip(
      albumAudioZip.tempFilePath,
      tempUnzipDir
    );

    const trackFilesMap = {};
    for (const filePath of extractedFilePaths) {
      const parsed = parseTrackFileName(filePath);
      if (parsed) {
        const normalizedSongName = parsed.songName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        if (!trackFilesMap[normalizedSongName]) {
          trackFilesMap[normalizedSongName] = {};
        }
        if (parsed.trackType === "vocals") {
          trackFilesMap[normalizedSongName].vocalsPath = filePath;
        } else if (parsed.trackType === "instrumental") {
          trackFilesMap[normalizedSongName].instrumentalPath = filePath;
        }
        // Обработка LRC-файлов из ZIP
        if (parsed.trackType === "lrc") {
          trackFilesMap[normalizedSongName].lrcPath = filePath;
        }
      }
    }
    console.log(
      "[AdminController] Карта файлов треков:",
      Object.keys(trackFilesMap)
    );

    // --- ОБРАБОТКА МНОЖЕСТВА АРТИСТОВ АЛЬБОМА ---
    const albumArtistIds = [];
    for (const spotifyArtist of spotifyAlbumData.artists || []) {
      let artist = await Artist.findOne({ name: spotifyArtist.name });
      if (!artist) {
        const spotifyArtistImages = spotifyArtist.images;
        const artistImageUrl =
          spotifyArtistImages && spotifyArtistImages.length > 0
            ? spotifyArtistImages[0].url
            : "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752891776/artist_xtfeje.jpg";

        const artistBannerUrl =
          spotifyArtistImages && spotifyArtistImages.length > 0
            ? (
                spotifyArtistImages.find((img) => img.width > 600) ||
                spotifyArtistImages[0]
              ).url
            : artistImageUrl;

        artist = new Artist({
          name: spotifyArtist.name,
          imageUrl: artistImageUrl,
          bannerUrl: artistBannerUrl,
        });
        await artist.save();
        console.log(`[AdminController] Новый артист создан: ${artist.name}`);
      } else {
        console.log(`[AdminController] Артист найден: ${artist.name}`);
      }
      albumArtistIds.push(artist._id);
    }
    // ---------------------------------------------------

    const totalTracksInAlbum = spotifyAlbumData.total_tracks;
    let albumType;
    if (totalTracksInAlbum === 1) {
      albumType = "Single";
    } else if (totalTracksInAlbum > 1 && totalTracksInAlbum <= 6) {
      albumType = "EP";
    } else {
      albumType = "Album";
    }
    console.log(
      `[AdminController] Определен тип альбома: ${albumType} (на основе total_tracks: ${totalTracksInAlbum})`
    );

    const albumImageUrl =
      spotifyAlbumData.images.length > 0 ? spotifyAlbumData.images[0].url : "";
    const releaseYear = spotifyAlbumData.release_date
      ? parseInt(spotifyAlbumData.release_date.split("-")[0])
      : null;

    const album = new Album({
      title: spotifyAlbumData.name,
      artist: albumArtistIds,
      imageUrl: albumImageUrl,
      releaseYear: releaseYear,
      type: albumType,
      songs: [],
    });
    await album.save();
    console.log(`[AdminController] Альбом создан: ${album.title}`);
    await updateArtistsContent(albumArtistIds, album._id, "albums");

    const createdSongs = [];
    const tracksToProcess = Array.isArray(spotifyAlbumData.tracks)
      ? spotifyAlbumData.tracks
      : spotifyAlbumData.tracks.items;

    for (const spotifyTrack of tracksToProcess) {
      // --- ОБРАБОТКА МНОЖЕСТВА АРТИСТОВ ТРЕКА ---
      const songArtistIds = [];
      // Убедимся, что spotifyTrack.artists является массивом, даже если он null/undefined
      for (const spotifyTrackArtist of spotifyTrack.artists || []) {
        let artist = await Artist.findOne({ name: spotifyTrackArtist.name });
        if (!artist) {
          const artistImageUrl =
            "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752891776/artist_xtfeje.jpg";
          const artistBannerUrl = artistImageUrl;

          artist = new Artist({
            name: spotifyTrackArtist.name,
            imageUrl: artistImageUrl,
            bannerUrl: artistBannerUrl,
          });
          await artist.save();
          console.log(
            `[AdminController] Новый артист трека создан: ${artist.name}`
          );
        }
        songArtistIds.push(artist._id);
      }

      // НОВОЕ ДОБАВЛЕНИЕ: Запасной вариант - использование артистов альбома, если артисты трека не найдены
      if (songArtistIds.length === 0 && albumArtistIds.length > 0) {
        console.warn(
          `[AdminController] Артисты трека не найдены для "${spotifyTrack.name}". Использование артистов альбома в качестве запасного варианта.`
        );
        songArtistIds.push(...albumArtistIds);
      }
      // ---------------------------------------------------

      const songName = spotifyTrack.name;
      const durationMs = spotifyTrack.duration_ms;

      const normalizedSpotifySongName = songName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const filesForTrack = trackFilesMap[normalizedSpotifySongName];

      let vocalsUrl = "";
      let vocalsPublicId = "";
      let instrumentalUrl = "";
      let instrumentalPublicId = "";
      let lrcText = "";

      console.log(`[AdminController] Обработка трека: ${songName}`);

      if (filesForTrack) {
        if (filesForTrack.vocalsPath) {
          const vocalsUpload = await uploadToCloudinary(
            { tempFilePath: filesForTrack.vocalsPath },
            "songs/vocals"
          );
          vocalsUrl = vocalsUpload.secure_url;
          vocalsPublicId = vocalsUpload.public_id;
          console.log(`[AdminController] Вокал загружен для ${songName}`);
        } else {
          console.warn(
            `[AdminController] Вокал файл не найден для трека: ${songName}. Проверьте ZIP.`
          );
        }

        if (filesForTrack.instrumentalPath) {
          const instrumentalUpload = await uploadToCloudinary(
            { tempFilePath: filesForTrack.instrumentalPath },
            "songs/instrumentals"
          );
          instrumentalUrl = instrumentalUpload.secure_url;
          instrumentalPublicId = instrumentalUpload.public_id;
          console.log(
            `[AdminController] Инструментал загружен для ${songName}`
          );
        } else {
          console.warn(
            `[AdminController] Инструментал файл не найден для трека: ${songName}. Проверьте ZIP.`
          );
        }

        // Чтение LRC-файла из ZIP, если он есть
        if (filesForTrack.lrcPath) {
          try {
            lrcText = await fs.readFile(filesForTrack.lrcPath, "utf8");
            console.log(
              `[AdminController] LRC-текст загружен из ZIP для трека: ${songName}`
            );
          } catch (readError) {
            console.error(
              `[AdminController] Ошибка чтения LRC-файла из ZIP для ${songName}:`,
              readError
            );
          }
        }
      } else {
        console.warn(
          `[AdminController] Аудиофайлы (вокал/инструментал) не найдены в ZIP для трека: ${songName}.`
        );
      }

      // Если LRC не был найден в ZIP, пытаемся получить его из lrclib.net
      if (!lrcText) {
        const primaryArtist =
          songArtistIds.length > 0
            ? (await Artist.findById(songArtistIds[0])).name
            : "";
        const songDataForLRC = {
          artistName: primaryArtist,
          songName: songName,
          albumName: album.title,
          songDuration: durationMs,
        };
        lrcText = await getLrcLyricsFromLrclib(songDataForLRC);
        if (!lrcText) {
          console.warn(
            `[AdminController] Не удалось получить LRC-текст с lrclib.net для трека: ${songName}`
          );
        }
      }

      const song = new Song({
        title: songName,
        artist: songArtistIds, // Теперь здесь будут либо артисты трека, либо артисты альбома
        albumId: album._id,
        vocalsUrl: vocalsUrl || null,
        vocalsPublicId: vocalsPublicId || null,
        instrumentalUrl: instrumentalUrl || null,
        instrumentalPublicId: instrumentalPublicId || null,
        lyrics: lrcText || "",
        duration: Math.round(durationMs / 1000),
        imageUrl: album.imageUrl,
        releaseYear: album.releaseYear,
      });

      await song.save();
      createdSongs.push(song);
      console.log(`[AdminController] Песня сохранена в БД: ${song.title}`);

      await Album.findByIdAndUpdate(album._id, { $push: { songs: song._id } });
      await updateArtistsContent(songArtistIds, song._id, "songs"); // Обновляем артистов песни
    }

    console.log(
      `[AdminController] Запускаем очистку временной директории: ${tempUnzipDir}`
    );
    await cleanUpTempDir(tempUnzipDir);

    res.status(200).json({
      success: true,
      message: `Альбом "${album.title}" (${album.type}) и ${createdSongs.length} треков успешно добавлены!`,
      album: album,
      songs: createdSongs.map((s) => ({ title: s.title, id: s._id })),
    });
  } catch (error) {
    console.error(
      "[AdminController] Критическая ошибка при автоматической загрузке альбома:",
      error
    );
    await cleanUpTempDir(tempUnzipDir);
    next(error);
  } finally {
    // Временный файл, созданный express-fileupload (albumAudioZip.tempFilePath),
    // обычно удаляется им самим автоматически.
  }
};
