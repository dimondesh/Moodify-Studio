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
import { getTagsFromAI } from "../lib/ai.service.js"; // <-- ДОБАВИТЬ ЭТУ СТРОКУ

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

// --- ИСПРАВЛЕНИЕ 1: Функция теперь возвращает удобный объект ---
const uploadToCloudinary = async (fileSource, folder) => {
  try {
    // Определяем, является ли источник файлом (из req.files) или URL-адресом
    const source =
      typeof fileSource === "string" ? fileSource : fileSource.tempFilePath;

    const result = await cloudinary.uploader.upload(source, {
      resource_type: "auto",
      folder: folder,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(
      `Error uploading to Cloudinary from source ${fileSource}:`,
      error
    );
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
  try {
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ message: "Access denied." });
    if (!req.files || !req.files.instrumentalFile)
      return res
        .status(400)
        .json({ message: "Instrumental file is required." });

    const {
      title,
      artistIds: artistIdsJsonString,
      albumId,
      releaseYear,
      lyrics,
      genreIds: genreIdsJson,
      moodIds: moodIdsJson,
    } = req.body;

    const instrumentalUpload = await uploadToCloudinary(
      req.files.instrumentalFile,
      "songs/instrumentals"
    );

    let vocalsUpload = { url: null, publicId: null };
    if (req.files.vocalsFile) {
      vocalsUpload = await uploadToCloudinary(
        req.files.vocalsFile,
        "songs/vocals"
      );
    }

    let imageUpload = { url: null, publicId: null };
    let finalAlbumId = albumId && albumId !== "none" ? albumId : null;
    const artistIds = JSON.parse(artistIdsJsonString);

    if (!finalAlbumId) {
      // Логика для сингла
      if (!req.files.imageFile)
        return res
          .status(400)
          .json({ message: "Image file is required for singles." });

      imageUpload = await uploadToCloudinary(
        req.files.imageFile,
        "songs/images"
      );

      const newAlbum = new Album({
        title,
        artist: artistIds,
        imageUrl: imageUpload.url,
        imagePublicId: imageUpload.publicId,
        releaseYear: releaseYear || new Date().getFullYear(),
        type: "Single",
      });
      await newAlbum.save();
      finalAlbumId = newAlbum._id;
      await updateArtistsContent(artistIds, newAlbum._id, "albums");
    } else {
      // Логика для трека в существующем альбоме
      const existingAlbum = await Album.findById(finalAlbumId);
      if (!existingAlbum)
        return res.status(404).json({ message: "Album not found." });

      if (req.files.imageFile) {
        // Если у трека своя обложка
        imageUpload = await uploadToCloudinary(
          req.files.imageFile,
          "songs/images"
        );
      } else {
        imageUpload.url = existingAlbum.imageUrl; // Используем обложку альбома
      }
    }

    const metadata = await mm.parseFile(
      req.files.instrumentalFile.tempFilePath
    );
    const duration = Math.floor(metadata.format.duration || 0);

    const song = new Song({
      title,
      artist: artistIds,
      albumId: finalAlbumId,
      instrumentalUrl: instrumentalUpload.url,
      instrumentalPublicId: instrumentalUpload.publicId,
      vocalsUrl: vocalsUpload.url,
      vocalsPublicId: vocalsUpload.publicId,
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId, // Сохраняется только если есть своя обложка
      duration,
      lyrics: lyrics || null,
      genres: genreIdsJson ? JSON.parse(genreIdsJson) : [],
      moods: moodIdsJson ? JSON.parse(moodIdsJson) : [],
    });

    await song.save();
    await Album.findByIdAndUpdate(finalAlbumId, { $push: { songs: song._id } });
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
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ message: "Access denied." });

    const { id } = req.params;
    const song = await Song.findById(id);

    if (!song) return res.status(404).json({ message: "Song not found." });

    // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Указываем тип ресурса 'video' для аудио ---
    if (song.instrumentalPublicId)
      await deleteFromCloudinary(song.instrumentalPublicId, "video");
    if (song.vocalsPublicId)
      await deleteFromCloudinary(song.vocalsPublicId, "video");

    if (song.albumId) {
      const album = await Album.findById(song.albumId);
      if (album && album.type === "Single" && album.songs.length <= 1) {
        if (album.imagePublicId)
          await deleteFromCloudinary(album.imagePublicId, "image");
        await removeContentFromArtists(album.artist, album._id, "albums");
        await Album.findByIdAndDelete(album._id);
      } else if (album) {
        if (song.imagePublicId && song.imagePublicId !== album.imagePublicId) {
          await deleteFromCloudinary(song.imagePublicId, "image");
        }
        await Album.findByIdAndUpdate(song.albumId, {
          $pull: { songs: song._id },
        });
      }
    } else if (song.imagePublicId) {
      // Если это сингл без альбома, но с картинкой
      await deleteFromCloudinary(song.imagePublicId, "image");
    }

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
  try {
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ message: "Access denied." });
    if (!req.files || !req.files.imageFile)
      return res.status(400).json({ message: "Image file is required." });

    const {
      title,
      artistIds: artistIdsJsonString,
      releaseYear,
      type = "Album",
    } = req.body;
    const artistIds = JSON.parse(artistIdsJsonString);
    const imageUpload = await uploadToCloudinary(req.files.imageFile, "albums");

    const album = new Album({
      title,
      artist: artistIds,
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
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
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ message: "Access denied." });

    const { id } = req.params;
    const album = await Album.findById(id);

    if (!album) return res.status(404).json({ message: "Album not found." });

    if (album.imagePublicId)
      await deleteFromCloudinary(album.imagePublicId, "image");

    const songsInAlbum = await Song.find({ albumId: id });
    for (const song of songsInAlbum) {
      if (song.instrumentalPublicId)
        await deleteFromCloudinary(song.instrumentalPublicId, "video");
      if (song.vocalsPublicId)
        await deleteFromCloudinary(song.vocalsPublicId, "video");
      if (song.imagePublicId && song.imagePublicId !== album.imagePublicId) {
        await deleteFromCloudinary(song.imagePublicId, "image");
      }
    }

    await Song.deleteMany({ albumId: id });
    await removeContentFromArtists(album.artist, album._id, "albums");
    await Album.findByIdAndDelete(id);

    res
      .status(200)
      .json({ message: "Album and all associated files deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAlbum", error);
    next(error);
  }
};

// --- CRUD для ARTISTS ---

export const createArtist = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Access denied." });
    const { name, bio } = req.body;
    if (!name || !req.files?.imageFile)
      return res
        .status(400)
        .json({ message: "Name and image file are required." });

    const imageUpload = await uploadToCloudinary(
      req.files.imageFile,
      "artists"
    );
    let bannerUpload = { url: null, publicId: null };
    if (req.files.bannerFile) {
      bannerUpload = await uploadToCloudinary(
        req.files.bannerFile,
        "artists/banners"
      );
    }

    const newArtist = new Artist({
      name,
      bio,
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
      bannerUrl: bannerUpload.url,
      bannerPublicId: bannerUpload.publicId,
    });
    await newArtist.save();
    res.status(201).json(newArtist);
  } catch (error) {
    next(error);
  }
};

export const updateArtist = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Access denied." });

    const { id } = req.params;
    const { name, bio, bannerUrl } = req.body; // <-- Получаем bannerUrl из body
    const imageFile = req.files?.imageFile;
    const bannerFile = req.files?.bannerFile;

    const artist = await Artist.findById(id);
    if (!artist) return res.status(404).json({ message: "Artist not found." });

    if (imageFile) {
      if (artist.imagePublicId)
        await deleteFromCloudinary(artist.imagePublicId, "image");
      const imageUpload = await uploadToCloudinary(imageFile, "artists");
      artist.imageUrl = imageUpload.url;
      artist.imagePublicId = imageUpload.publicId;
    }

    // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    if (bannerFile) {
      // Если пришел новый файл баннера, удаляем старый и загружаем новый
      if (artist.bannerPublicId)
        await deleteFromCloudinary(artist.bannerPublicId, "image");
      const bannerUpload = await uploadToCloudinary(
        bannerFile,
        "artists/banners"
      );
      artist.bannerUrl = bannerUpload.url;
      artist.bannerPublicId = bannerUpload.publicId;
    } else if (bannerUrl === "") {
      // ЕСЛИ файла нет, но пришло поле bannerUrl: "", значит, нужно удалить существующий баннер
      if (artist.bannerPublicId)
        await deleteFromCloudinary(artist.bannerPublicId, "image");
      artist.bannerUrl = null;
      artist.bannerPublicId = null;
    }
    // Если ни bannerFile, ни bannerUrl === "" не пришли, ничего не делаем с баннером

    artist.name = name || artist.name;
    artist.bio = bio !== undefined ? bio : artist.bio;

    await artist.save();
    res.status(200).json(artist);
  } catch (error) {
    next(error);
  }
};

export const deleteArtist = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin)
      return res.status(403).json({ message: "Access denied." });
    const { id } = req.params;
    const artist = await Artist.findById(id);
    if (!artist) return res.status(404).json({ message: "Artist not found." });

    const mockRes = { status: () => mockRes, json: () => {} };

    const soloAlbums = await Album.find({
      artist: id,
      "artist.1": { $exists: false },
    });
    for (const album of soloAlbums) {
      await deleteAlbum(
        { params: { id: album._id.toString() }, user: req.user },
        mockRes,
        next
      );
    }

    const soloSongs = await Song.find({
      artist: id,
      "artist.1": { $exists: false },
    });
    for (const song of soloSongs) {
      await deleteSong(
        { params: { id: song._id.toString() }, user: req.user },
        mockRes,
        next
      );
    }

    await Album.updateMany({ artist: id }, { $pull: { artist: id } });
    await Song.updateMany({ artist: id }, { $pull: { artist: id } });

    if (artist.imagePublicId)
      await deleteFromCloudinary(artist.imagePublicId, "image");
    if (artist.bannerPublicId)
      await deleteFromCloudinary(artist.bannerPublicId, "image");

    await Artist.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Artist and their solo content deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// --- НОВЫЙ КОНТРОЛЛЕР ДЛЯ ЗАГРУЗКИ ПОЛНОГО АЛЬБОМА ---
// backend/src/controller/admin.controller.js

// --- АВТОМАТИЧЕСКАЯ ЗАГРУЗКА АЛЬБОМА ---

export const uploadFullAlbumAuto = async (req, res, next) => {
  const tempUnzipDir = path.join(
    process.cwd(),
    "temp_unzip_albums",
    Date.now().toString()
  );
  try {
    if (!req.user || !req.user.isAdmin)
      return res.status(403).json({ message: "Access denied." });

    const { spotifyAlbumUrl } = req.body;
    const albumAudioZip = req.files ? req.files.albumAudioZip : null;
    if (!spotifyAlbumUrl || !albumAudioZip)
      return res
        .status(400)
        .json({ message: "Spotify URL and ZIP file are required." });

    const spotifyAlbumData = await getAlbumDataFromSpotify(spotifyAlbumUrl);
    if (!spotifyAlbumData)
      return res
        .status(500)
        .json({ message: "Could not get album data from Spotify." });

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
        if (!trackFilesMap[normalizedSongName])
          trackFilesMap[normalizedSongName] = {};
        trackFilesMap[normalizedSongName][`${parsed.trackType}Path`] = filePath;
      }
    }

    const albumArtistIds = await Promise.all(
      (spotifyAlbumData.artists || []).map(async (spotifyArtist) => {
        let artist = await Artist.findOne({ name: spotifyArtist.name });
        if (!artist) {
          const imageUpload = await uploadToCloudinary(
            spotifyArtist.images[0]?.url,
            "artists"
          );
          artist = new Artist({
            name: spotifyArtist.name,
            imageUrl: imageUpload.url,
            imagePublicId: imageUpload.publicId,
          });
          await artist.save();
        }
        return artist._id;
      })
    );

    const albumImageUpload = await uploadToCloudinary(
      spotifyAlbumData.images[0]?.url,
      "albums"
    );
    const albumType =
      spotifyAlbumData.total_tracks === 1
        ? "Single"
        : spotifyAlbumData.total_tracks <= 6
        ? "EP"
        : "Album";

    const album = new Album({
      title: spotifyAlbumData.name,
      artist: albumArtistIds,
      imageUrl: albumImageUpload.url,
      imagePublicId: albumImageUpload.publicId,
      releaseYear: spotifyAlbumData.release_date
        ? parseInt(spotifyAlbumData.release_date.split("-")[0])
        : null,
      type: albumType,
    });
    await album.save();
    await updateArtistsContent(albumArtistIds, album._id, "albums");

    const tracksToProcess =
      spotifyAlbumData.tracks.items || spotifyAlbumData.tracks;
    for (const spotifyTrack of tracksToProcess) {
      const songName = spotifyTrack.name;
      const durationMs = spotifyTrack.duration_ms;
      const normalizedSpotifySongName = songName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const filesForTrack = trackFilesMap[normalizedSpotifySongName];

      let vocalsUpload = { url: null, publicId: null };
      let instrumentalUpload = { url: null, publicId: null };
      if (filesForTrack?.vocalsPath)
        vocalsUpload = await uploadToCloudinary(
          { tempFilePath: filesForTrack.vocalsPath },
          "songs/vocals"
        );
      if (filesForTrack?.instrumentalPath)
        instrumentalUpload = await uploadToCloudinary(
          { tempFilePath: filesForTrack.instrumentalPath },
          "songs/instrumentals"
        );

      const primaryArtistName = (await Artist.findById(albumArtistIds[0])).name;
      const { genreIds, moodIds } = await getTagsFromAI(
        primaryArtistName,
        songName
      );

      const song = new Song({
        title: songName,
        artist: albumArtistIds, // Упрощаем, используя артистов альбома
        albumId: album._id,
        vocalsUrl: vocalsUpload.url,
        vocalsPublicId: vocalsUpload.publicId,
        instrumentalUrl: instrumentalUpload.url,
        instrumentalPublicId: instrumentalUpload.publicId,
        lyrics: "", // Логика LRC остается прежней
        duration: Math.round(durationMs / 1000),
        imageUrl: album.imageUrl, // Используем обложку альбома
        genres: genreIds,
        moods: moodIds,
      });
      await song.save();
      album.songs.push(song._id);
    }
    await album.save();
    res
      .status(200)
      .json({ success: true, message: "Album uploaded successfully", album });
  } catch (error) {
    console.error(
      "[AdminController] Critical error during auto upload:",
      error
    );
    next(error);
  } finally {
    await cleanUpTempDir(tempUnzipDir);
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
