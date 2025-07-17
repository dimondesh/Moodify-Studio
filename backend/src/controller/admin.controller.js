import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Artist } from "../models/artist.model.js";
import cloudinary from "../lib/cloudinary.js";
import {
  extractPublicId,
  deleteFromCloudinary,
} from "../lib/deleteFromCloudinary.js";
import * as mm from "music-metadata";

const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "auto",
      folder: folder,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload file to Cloudinary");
  }
};

// Вспомогательная функция для проверки и добавления ID в массивы артистов
const updateArtistsContent = async (
  artistIds,
  contentId,
  contentType,
  action = "$push"
) => {
  if (!artistIds || artistIds.length === 0) return;

  const updateField = contentType === "songs" ? "songs" : "albums";

  for (const artistId of artistIds) {
    await Artist.findByIdAndUpdate(artistId, {
      [action]: { [updateField]: contentId },
    });
  }
};

// Вспомогательная функция для проверки и удаления ID из массивов артистов
const removeContentFromArtists = async (artistIds, contentId, contentType) => {
  if (!artistIds || artistIds.length === 0) return;

  const updateField = contentType === "songs" ? "songs" : "albums";

  for (const artistId of artistIds) {
    await Artist.findByIdAndUpdate(artistId, {
      $pull: { [updateField]: contentId },
    });
  }
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

    const instrumentalUrl = await uploadToCloudinary(
      req.files.instrumentalFile,
      "songs/instrumentals"
    );
    let vocalsUrl = null;
    if (req.files.vocalsFile) {
      vocalsUrl = await uploadToCloudinary(
        req.files.vocalsFile,
        "songs/vocals"
      );
    }

    let songImageUrl; // ✅ НОВОЕ: Переменная для окончательного URL обложки песни
    let finalAlbumId = null;

    // ✅ ИЗМЕНЕНО: Логика определения imageUrl и finalAlbumId
    if (albumId && albumId !== "none" && albumId !== "") {
      // Пользователь выбрал существующий альбом
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

      // Если пользователь загрузил изображение для песни, используем его, иначе - обложку альбома
      if (req.files.imageFile) {
        songImageUrl = await uploadToCloudinary(
          req.files.imageFile,
          "songs/images"
        );
      } else {
        songImageUrl = existingAlbum.imageUrl; // Берем обложку из альбома
      }
    } else {
      // Это сингл или новый альбом (который будет синглом)
      // imageFile здесь обязателен по предыдущей проверке, поэтому req.files.imageFile точно есть
      songImageUrl = await uploadToCloudinary(
        req.files.imageFile,
        "songs/images"
      );

      const newAlbum = new Album({
        title, // Название сингла = название песни
        artist: artistIds,
        imageUrl: songImageUrl, // Обложка сингла = обложка песни
        releaseYear: releaseYear || new Date().getFullYear(),
        songs: [],
        type: "Single", // Всегда "Single" для новых альбомов, созданных через песню
      });
      await newAlbum.save();
      finalAlbumId = newAlbum._id;

      await updateArtistsContent(artistIds, newAlbum._id, "albums");
    }

    const song = new Song({
      title,
      artist: artistIds,
      instrumentalUrl,
      vocalsUrl,
      imageUrl: songImageUrl, // ✅ ИЗМЕНЕНО: Используем определенный выше songImageUrl
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
    const { title, artistIds, albumId, lyrics } = req.body; // --- НОВОЕ: Получаем lyrics из req.body
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
      if (song.instrumentalUrl) {
        await deleteFromCloudinary(extractPublicId(song.instrumentalUrl));
      }
      song.instrumentalUrl = await uploadToCloudinary(
        instrumentalFile,
        "songs/instrumentals"
      );
      try {
        const metadata = await mm.parseFile(instrumentalFile.tempFilePath);
        song.duration = Math.floor(metadata.format.duration || 0);
      } catch (err) {
        console.error("Error parsing new instrumental metadata:", err);
      }
    }

    if (vocalsFile) {
      if (song.vocalsUrl) {
        await deleteFromCloudinary(extractPublicId(song.vocalsUrl));
      }
      song.vocalsUrl = await uploadToCloudinary(vocalsFile, "songs/vocals");
    } else if (req.body.clearVocals === "true" && song.vocalsUrl) {
      await deleteFromCloudinary(extractPublicId(song.vocalsUrl));
      song.vocalsUrl = null;
    }

    if (imageFile) {
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      song.imageUrl = await uploadToCloudinary(imageFile, "songs/images");
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
    song.lyrics = lyrics !== undefined ? lyrics : song.lyrics; // --- НОВОЕ: Обновляем lyrics

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

    // Удаление из Cloudinary
    if (song.instrumentalUrl) {
      await deleteFromCloudinary(extractPublicId(song.instrumentalUrl));
    }
    if (song.vocalsUrl) {
      await deleteFromCloudinary(extractPublicId(song.vocalsUrl));
    }
    if (song.imageUrl) {
      await deleteFromCloudinary(extractPublicId(song.imageUrl));
    }
    // --- НОВОЕ: Тексты песен не хранятся в Cloudinary, поэтому нечего удалять здесь.

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

    const imageUrl = await uploadToCloudinary(req.files.imageFile, "albums");

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
      album.imageUrl = await uploadToCloudinary(imageFile, "albums");
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
      if (song.instrumentalUrl) {
        await deleteFromCloudinary(extractPublicId(song.instrumentalUrl));
      }
      if (song.vocalsUrl) {
        await deleteFromCloudinary(extractPublicId(song.vocalsUrl));
      }
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      // --- НОВОЕ: Тексты песен не хранятся в Cloudinary, поэтому нечего удалять здесь.
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

    const imageUrl = await uploadToCloudinary(imageFile, "artists");
    let bannerUrl = null;

    if (bannerFile) {
      bannerUrl = await uploadToCloudinary(bannerFile, "artists/banners");
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
      imageUrl = await uploadToCloudinary(imageFile, "artists");
    }

    if (bannerFile) {
      if (artist.bannerUrl) {
        await deleteFromCloudinary(extractPublicId(artist.bannerUrl));
      }
      bannerUrl = await uploadToCloudinary(bannerFile, "artists/banners");
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
    // 1.1. Удаление баннера артиста из Cloudinary (НОВОЕ)
    if (artist.bannerUrl) {
      await deleteFromCloudinary(extractPublicId(artist.bannerUrl));
    }

    // 2. Удаление всех песен, связанных с этим артистом, из Cloudinary и БД
    // и удаление этих песен из всех альбомов, в которых они могли быть
    const songsOfArtist = await Song.find({ artist: artist._id });
    for (const song of songsOfArtist) {
      if (song.instrumentalUrl) {
        await deleteFromCloudinary(extractPublicId(song.instrumentalUrl));
      }
      if (song.vocalsUrl) {
        await deleteFromCloudinary(extractPublicId(song.vocalsUrl));
      }
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      // --- НОВОЕ: Тексты песен не хранятся в Cloudinary, поэтому нечего удалять здесь.
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
