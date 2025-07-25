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
import { getGenresAndMoodsForTrack } from "../lib/lastfm.service.js"; // <-- НОВЫЙ ИМПОРТ
import { Genre } from "../models/genre.model.js"; // <-- НОВЫЙ ИМПОРТ
import { Mood } from "../models/mood.model.js"; // <-- НОВЫЙ ИМПОРТ

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
      genreIds: genreIdsJson, // <-- НОВОЕ
      moodIds: moodIdsJson, // <-- НОВОЕ
    } = req.body;
    const genreIds = genreIdsJson ? JSON.parse(genreIdsJson) : [];
    const moodIds = moodIdsJson ? JSON.parse(moodIdsJson) : [];

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
      genres: genreIds, // <-- НОВОЕ
      moods: moodIds, // <-- НОВОЕ
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
    let {
      title,
      artistIds,
      albumId,
      lyrics,
      clearVocals,
      genreIds: genreIdsJson,
      moodIds: moodIdsJson,
    } = req.body;
    const instrumentalFile = req.files ? req.files.instrumentalFile : null;
    const vocalsFile = req.files ? req.files.vocalsFile : null;
    const imageFile = req.files ? req.files.imageFile : null;

    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // 1. Обработка artistIds
    let parsedArtistIds;
    try {
      parsedArtistIds = artistIds ? JSON.parse(artistIds) : [];
      if (!Array.isArray(parsedArtistIds)) {
        parsedArtistIds = [];
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON:", e);
      parsedArtistIds = [];
    }

    if (parsedArtistIds.length > 0) {
      const existingArtists = await Artist.find({
        _id: { $in: parsedArtistIds },
      });
      if (existingArtists.length !== parsedArtistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = song.artist.map((artist) => artist.toString());
      const newArtistIds = parsedArtistIds;

      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, song._id, "songs");

      const artistsToAdd = newArtistIds.filter(
        (newId) => !oldArtistIds.includes(newId)
      );
      await updateArtistsContent(artistsToAdd, song._id, "songs");

      song.artist = newArtistIds;
    } else {
      return res
        .status(400)
        .json({ message: "Song must have at least one artist." });
    }

    // 2. Обработка instrumentalFile
    if (instrumentalFile) {
      if (song.instrumentalPublicId) {
        await deleteFromCloudinary(song.instrumentalPublicId);
      }
      const uploadResult = await uploadToCloudinary(
        instrumentalFile,
        "songs/instrumentals"
      );
      song.instrumentalUrl = uploadResult.secure_url;
      song.instrumentalPublicId = uploadResult.public_id;
      try {
        const metadata = await mm.parseFile(instrumentalFile.tempFilePath);
        song.duration = Math.floor(metadata.format.duration || 0);
      } catch (err) {
        console.error("Error parsing new instrumental metadata:", err);
      }
    }

    // 3. Обработка vocalsFile и clearVocals
    if (vocalsFile) {
      if (song.vocalsPublicId) {
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      const uploadResult = await uploadToCloudinary(vocalsFile, "songs/vocals");
      song.vocalsUrl = uploadResult.secure_url;
      song.vocalsPublicId = uploadResult.public_id;
    } else if (clearVocals === "true" && song.vocalsUrl) {
      if (song.vocalsPublicId) {
        await deleteFromCloudinary(song.vocalsPublicId);
      }
      song.vocalsUrl = null;
      song.vocalsPublicId = null;
    }

    // 4. Обработка imageFile
    if (imageFile) {
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      song.imageUrl = (
        await uploadToCloudinary(imageFile, "songs/images")
      ).secure_url;
    } else if (
      !song.albumId ||
      song.albumId === "none" ||
      song.albumId === ""
    ) {
      // Если это сингл (нет albumId) и нет нового изображения, и старое изображение удалено
      // Это условие нужно, если раньше было изображение, а сейчас его пытаются удалить без замены
      // Однако, фронтенд не должен позволять отправить форму без изображения для сингла
      // Эта проверка больше для бэкенда, чтобы убедиться в консистентности
      if (!song.imageUrl) {
        // Если нет ни нового, ни старого изображения для сингла
        return res.status(400).json({
          message: "Image file is required for singles.",
        });
      }
    }

    // 5. Обработка albumId
    if (albumId !== undefined) {
      const oldAlbumId = song.albumId ? song.albumId.toString() : null;
      const newAlbumId = albumId === "none" || albumId === "" ? null : albumId;

      if (oldAlbumId && oldAlbumId !== newAlbumId) {
        // Удаляем песню из старого альбома
        await Album.findByIdAndUpdate(oldAlbumId, {
          $pull: { songs: song._id },
        });
      }

      if (newAlbumId) {
        const newAlbum = await Album.findById(newAlbumId);
        if (!newAlbum) {
          return res.status(404).json({ message: "New album not found." });
        }
        // Проверяем, что артисты песни совпадают с артистами альбома
        const songArtists = song.artist.map((artist) => artist.toString());
        const albumArtists = newAlbum.artist.map((artist) => artist.toString());
        const hasCommonArtist = songArtists.some((id) =>
          albumArtists.includes(id)
        );

        if (!hasCommonArtist) {
          return res.status(400).json({
            message:
              "Cannot move song to an album of a different or unrelated artist.",
          });
        }
        // Добавляем песню в новый альбом, если ее там нет
        if (!newAlbum.songs.includes(song._id)) {
          newAlbum.songs.push(song._id);
          await newAlbum.save();
        }
      }
      song.albumId = newAlbumId;
    }

    // 6. Обновление title и lyrics
    song.title = title || song.title;
    song.lyrics = lyrics !== undefined ? lyrics : song.lyrics;
    if (genreIdsJson) {
      song.genres = JSON.parse(genreIdsJson);
    }
    if (moodIdsJson) {
      song.moods = JSON.parse(moodIdsJson);
    }

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
    const {
      title,
      artistIds: artistIdsJsonString,
      releaseYear,
      type,
    } = req.body; // <-- ИЗМЕНЕНО: получаем как artistIdsJsonString
    const imageFile = req.files ? req.files.imageFile : null;

    const album = await Album.findById(id);
    if (!album) {
      return res.status(404).json({ message: "Album not found." });
    }

    let newArtistIds; // <-- НОВАЯ ПЕРЕМЕННАЯ ДЛЯ РАСПАРСЕННЫХ ID
    try {
      newArtistIds = artistIdsJsonString ? JSON.parse(artistIdsJsonString) : [];
      if (!Array.isArray(newArtistIds)) {
        newArtistIds = [];
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON in updateAlbum:", e);
      newArtistIds = [];
    }

    // ИЗМЕНЕНО: Теперь используем newArtistIds
    if (newArtistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: newArtistIds } });
      if (existingArtists.length !== newArtistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = album.artist.map((id) => id.toString());

      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, album._id, "albums");

      const artistsToAdd = newArtistIds.filter(
        (newId) => !oldArtistIds.includes(newId)
      );
      await updateArtistsContent(artistsToAdd, album._id, "albums");

      album.artist = newArtistIds; // <-- Обновляем массив артистов в альбоме
    } else {
      // Если newArtistIds пуст после парсинга
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
// backend/src/controller/admin.controller.js

export const uploadFullAlbumAuto = async (req, res, next) => {
  console.log("🚀 Reached /admin/albums/upload-full-album route - AUTO UPLOAD");

  if (!req.user || !req.user.isAdmin) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }

  const { spotifyAlbumUrl } = req.body;
  const albumAudioZip = req.files ? req.files.albumAudioZip : null;

  if (!spotifyAlbumUrl) {
    return res
      .status(400)
      .json({ success: false, message: "Spotify URL не предоставлен." });
  }
  if (!albumAudioZip) {
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
    const spotifyAlbumData = await getAlbumDataFromSpotify(spotifyAlbumUrl);
    if (!spotifyAlbumData) {
      return res.status(500).json({
        success: false,
        message: "Не удалось получить данные альбома из Spotify.",
      });
    }

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
        } else if (parsed.trackType === "lrc") {
          trackFilesMap[normalizedSongName].lrcPath = filePath;
        }
      }
    }

    const albumArtistIds = [];
    for (const spotifyArtist of spotifyAlbumData.artists || []) {
      let artist = await Artist.findOne({ name: spotifyArtist.name });
      if (!artist) {
        const artistImageUrl =
          spotifyArtist.images && spotifyArtist.images.length > 0
            ? spotifyArtist.images[0].url
            : "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752891776/artist_xtfeje.jpg";
        artist = new Artist({
          name: spotifyArtist.name,
          imageUrl: artistImageUrl,
          bannerUrl: artistImageUrl,
        });
        await artist.save();
        console.log(`[AdminController] Новый артист создан: ${artist.name}`);
      } else {
        console.log(`[AdminController] Артист найден: ${artist.name}`);
      }
      albumArtistIds.push(artist._id);
    }

    const albumType =
      spotifyAlbumData.total_tracks === 1
        ? "Single"
        : spotifyAlbumData.total_tracks <= 6
        ? "EP"
        : "Album";

    console.log(`[AdminController] Определен тип альбома: ${albumType}`);

    const album = new Album({
      title: spotifyAlbumData.name,
      artist: albumArtistIds,
      imageUrl: spotifyAlbumData.images[0]?.url || "",
      releaseYear: spotifyAlbumData.release_date
        ? parseInt(spotifyAlbumData.release_date.split("-")[0])
        : null,
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
      // --- ИСПРАВЛЕННЫЙ ПОРЯДОК ОПЕРАЦИЙ ---

      // 1. Сначала получаем базовую информацию о треке
      const songName = spotifyTrack.name;
      const durationMs = spotifyTrack.duration_ms;
      console.log(`[AdminController] Обработка трека: ${songName}`);

      // 2. Затем обрабатываем артистов трека
      const songArtistIds = [];
      for (const spotifyTrackArtist of spotifyTrack.artists || []) {
        let artist = await Artist.findOne({ name: spotifyTrackArtist.name });
        if (!artist) {
          artist = new Artist({
            name: spotifyTrackArtist.name,
            imageUrl:
              "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752891776/artist_xtfeje.jpg",
            bannerUrl:
              "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752891776/artist_xtfeje.jpg",
          });
          await artist.save();
        }
        songArtistIds.push(artist._id);
      }

      if (songArtistIds.length === 0 && albumArtistIds.length > 0) {
        songArtistIds.push(...albumArtistIds);
      }

      // 3. ТЕПЕРЬ, когда у нас есть songName и артисты, получаем жанры
      const primaryArtistForTags =
        songArtistIds.length > 0
          ? (await Artist.findById(songArtistIds[0])).name
          : "";
      const { genreIds, moodIds } = await getGenresAndMoodsForTrack(
        primaryArtistForTags,
        songName,
        album.title // <-- ДОБАВЛЕНО НАЗВАНИЕ АЛЬБОМА
      );
      // 4. Продолжаем остальную логику
      const normalizedSpotifySongName = songName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const filesForTrack = trackFilesMap[normalizedSpotifySongName];

      let vocalsUrl = null,
        vocalsPublicId = null,
        instrumentalUrl = null,
        instrumentalPublicId = null,
        lrcText = "";

      if (filesForTrack) {
        if (filesForTrack.vocalsPath) {
          const up = await uploadToCloudinary(
            { tempFilePath: filesForTrack.vocalsPath },
            "songs/vocals"
          );
          vocalsUrl = up.secure_url;
          vocalsPublicId = up.public_id;
        }
        if (filesForTrack.instrumentalPath) {
          const up = await uploadToCloudinary(
            { tempFilePath: filesForTrack.instrumentalPath },
            "songs/instrumentals"
          );
          instrumentalUrl = up.secure_url;
          instrumentalPublicId = up.public_id;
        }
        if (filesForTrack.lrcPath) {
          lrcText = await fs.readFile(filesForTrack.lrcPath, "utf8");
        }
      }

      if (!lrcText) {
        lrcText = await getLrcLyricsFromLrclib({
          artistName: primaryArtistForTags,
          songName: songName,
          albumName: album.title,
          songDuration: durationMs,
        });
      }

      const song = new Song({
        title: songName,
        artist: songArtistIds,
        albumId: album._id,
        vocalsUrl,
        vocalsPublicId,
        instrumentalUrl,
        instrumentalPublicId,
        lyrics: lrcText || "",
        duration: Math.round(durationMs / 1000),
        imageUrl: album.imageUrl,
        releaseYear: album.releaseYear,
        genres: genreIds,
        moods: moodIds,
      });

      await song.save();
      createdSongs.push(song);

      await Album.findByIdAndUpdate(album._id, { $push: { songs: song._id } });
      await updateArtistsContent(songArtistIds, song._id, "songs");
    }

    console.log(`[AdminController] Запускаем очистку: ${tempUnzipDir}`);
    await cleanUpTempDir(tempUnzipDir);

    res.status(200).json({
      success: true,
      message: `Альбом "${album.title}" (${album.type}) и ${createdSongs.length} треков успешно добавлены!`,
      album,
      songs: createdSongs.map((s) => ({ title: s.title, id: s._id })),
    });
  } catch (error) {
    console.error("[AdminController] Критическая ошибка:", error);
    await cleanUpTempDir(tempUnzipDir);
    next(error);
  }
};
export const getGenres = async (req, res, next) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.status(200).json(genres);
  } catch (error) {
    next(error);
  }
};

export const getMoods = async (req, res, next) => {
  try {
    const moods = await Mood.find().sort({ name: 1 });
    res.status(200).json(moods);
  } catch (error) {
    next(error);
  }
};
