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

    if (!req.files || !req.files.audioFile || !req.files.imageFile) {
      return res.status(400).json({ message: "Please upload all files" });
    }

    // ИЗМЕНЕНИЕ ЗДЕСЬ: Переименовываем artistIds во что-то временное для парсинга
    // и получаем остальные поля
    const {
      title,
      artistIds: artistIdsJsonString,
      albumId,
      releaseYear,
    } = req.body;

    let artistIds;
    try {
      // ИЗМЕНЕНИЕ ЗДЕСЬ: Пытаемся распарсить JSON-строку
      artistIds = artistIdsJsonString ? JSON.parse(artistIdsJsonString) : [];
      // Убедитесь, что после парсинга это действительно массив
      if (!Array.isArray(artistIds)) {
        artistIds = []; // Если парсинг не удался или это не массив, устанавливаем пустой массив
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON:", e);
      artistIds = []; // В случае ошибки парсинга, устанавливаем пустой массив
    }

    if (!artistIds || artistIds.length === 0) {
      console.log(
        "Validation Failed: artistIds is invalid or empty (after parsing)."
      );
      console.log("Value of artistIds (parsed):", artistIds);
      console.log(
        "Is artistIds an array (after parsing)?",
        Array.isArray(artistIds)
      );
      console.log("Length of artistIds (after parsing):", artistIds?.length);
      return res
        .status(400)
        .json({ message: "At least one Artist ID is required." });
    }

    // Проверяем существование всех артистов
    const existingArtists = await Artist.find({ _id: { $in: artistIds } });
    if (existingArtists.length !== artistIds.length) {
      return res
        .status(404)
        .json({ message: "One or more artists not found." });
    }

    let duration = 0;
    try {
      const metadata = await mm.parseFile(req.files.audioFile.tempFilePath);
      duration = Math.floor(metadata.format.duration || 0);
    } catch (err) {
      console.error("Error parsing audio metadata:", err);
      throw new Error("Invalid audio file");
    }

    const audioUrl = await uploadToCloudinary(
      req.files.audioFile,
      "songs/audio"
    );
    const imageUrl = await uploadToCloudinary(
      req.files.imageFile,
      "songs/images"
    );

    let finalAlbumId = null;

    if (!albumId || albumId === "none" || albumId === "") {
      const newAlbum = new Album({
        title,
        artist: artistIds, // Передаем массив artistIds
        imageUrl,
        releaseYear: releaseYear || new Date().getFullYear(),
        songs: [],
        type: "Single",
      });
      await newAlbum.save();
      finalAlbumId = newAlbum._id;

      await updateArtistsContent(artistIds, newAlbum._id, "albums"); // Добавляем альбом артистам
    } else {
      const existingAlbum = await Album.findById(albumId);
      if (!existingAlbum) {
        return res.status(404).json({ message: "Album not found." });
      }
      // Проверяем, что альбом принадлежит хотя бы одному из указанных артистов
      const albumArtists = existingAlbum.artist.map((id) => id.toString());
      const hasCommonArtist = artistIds.some((id) => albumArtists.includes(id));
      if (!hasCommonArtist) {
        return res.status(400).json({
          message: "Album does not belong to any of the specified artists.",
        });
      }
      finalAlbumId = albumId;
    }

    const song = new Song({
      title,
      artist: artistIds, // Сохраняем массив ID артистов
      audioUrl,
      imageUrl,
      duration,
      albumId: finalAlbumId,
    });

    await song.save();

    if (finalAlbumId) {
      await Album.findByIdAndUpdate(finalAlbumId, {
        $push: { songs: song._id },
      });
    }

    await updateArtistsContent(artistIds, song._id, "songs"); // Добавляем песню артистам

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
    const { title, artistIds, albumId } = req.body; // Ожидаем artistIds (массив строк)
    const audioFile = req.files ? req.files.audioFile : null;
    const imageFile = req.files ? req.files.imageFile : null;

    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // Обновляем артистов
    if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: artistIds } });
      if (existingArtists.length !== artistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = song.artist.map((id) => id.toString());
      const newArtistIds = artistIds;

      // Удаляем песню из старых артистов, которых нет в новом списке
      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, song._id, "songs");

      // Добавляем песню к новым артистам, которых не было в старом списке
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

    // Обновляем аудиофайл
    if (audioFile) {
      if (song.audioUrl) {
        await deleteFromCloudinary(extractPublicId(song.audioUrl));
      }
      song.audioUrl = await uploadToCloudinary(audioFile, "songs/audio");
      try {
        const metadata = await mm.parseFile(audioFile.tempFilePath);
        song.duration = Math.floor(metadata.format.duration || 0);
      } catch (err) {
        console.error("Error parsing new audio metadata:", err);
      }
    }

    // Обновляем изображение
    if (imageFile) {
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      song.imageUrl = await uploadToCloudinary(imageFile, "songs/images");
    }

    // Обновляем альбом
    if (albumId !== undefined) {
      if (song.albumId && song.albumId.toString() !== albumId) {
        // Удаляем из старого альбома
        await Album.findByIdAndUpdate(song.albumId, {
          $pull: { songs: song._id },
        });
      }
      if (albumId && albumId !== "none" && albumId !== "") {
        const newAlbum = await Album.findById(albumId);
        if (!newAlbum) {
          return res.status(404).json({ message: "New album not found." });
        }
        // Проверяем, что новый альбом принадлежит хотя бы одному из текущих артистов песни
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
        // Если песня уже есть в этом альбоме, не добавляем её повторно
        if (!newAlbum.songs.includes(song._id)) {
          newAlbum.songs.push(song._id);
          await newAlbum.save();
        }
        song.albumId = albumId;
      } else {
        song.albumId = null; // Убираем альбом
      }
    }

    song.title = title || song.title;

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
    if (song.audioUrl) {
      await deleteFromCloudinary(extractPublicId(song.audioUrl));
    }
    if (song.imageUrl) {
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
  console.log("🚀 Reached createAlbum route"); // Логирование добавлено
  console.log("req.body:", req.body); // Логирование добавлено
  console.log("req.files:", req.files); // Логирование добавлено

  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // ИЗМЕНЕНИЕ ЗДЕСЬ: Переименовываем artistIds во что-то временное для парсинга
    const {
      title,
      artistIds: artistIdsJsonString,
      releaseYear,
      type = "Album",
    } = req.body;

    let artistIds;
    try {
      // ИЗМЕНЕНИЕ ЗДЕСЬ: Пытаемся распарсить JSON-строку
      artistIds = artistIdsJsonString ? JSON.parse(artistIdsJsonString) : [];
      // Убедитесь, что после парсинга это действительно массив
      if (!Array.isArray(artistIds)) {
        artistIds = []; // Если парсинг не удался или это не массив, устанавливаем пустой массив
      }
    } catch (e) {
      console.error("Failed to parse artistIds JSON:", e);
      artistIds = []; // В случае ошибки парсинга, устанавливаем пустой массив
    }

    if (!artistIds || artistIds.length === 0) {
      console.log(
        "Validation Failed: artistIds is invalid or empty (after parsing)."
      );
      console.log("Value of artistIds (parsed):", artistIds);
      console.log(
        "Is artistIds an array (after parsing)?",
        Array.isArray(artistIds)
      );
      console.log("Length of artistIds (after parsing):", artistIds?.length);

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
      // Добавим более информативный лог, если файл не загружен
      console.log("Validation Failed: No imageFile uploaded.");
      console.log("req.files status:", req.files);
      return res.status(400).json({ message: "No imageFile uploaded" });
    }

    const imageUrl = await uploadToCloudinary(req.files.imageFile, "albums");

    const album = new Album({
      title,
      artist: artistIds, // Теперь artistIds будет гарантированно массивом
      imageUrl,
      releaseYear,
      type,
    });
    await album.save();

    await updateArtistsContent(artistIds, album._id, "albums"); // Добавляем альбом артистам

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
    const { title, artistIds, releaseYear, type } = req.body; // Ожидаем artistIds (массив строк)
    const imageFile = req.files ? req.files.imageFile : null;

    const album = await Album.findById(id);
    if (!album) {
      return res.status(404).json({ message: "Album not found." });
    }

    // Обновляем артистов
    if (artistIds && Array.isArray(artistIds) && artistIds.length > 0) {
      const existingArtists = await Artist.find({ _id: { $in: artistIds } });
      if (existingArtists.length !== artistIds.length) {
        return res
          .status(404)
          .json({ message: "One or more new artists not found." });
      }

      const oldArtistIds = album.artist.map((id) => id.toString());
      const newArtistIds = artistIds;

      // Удаляем альбом из старых артистов, которых нет в новом списке
      const artistsToRemove = oldArtistIds.filter(
        (oldId) => !newArtistIds.includes(oldId)
      );
      await removeContentFromArtists(artistsToRemove, album._id, "albums");

      // Добавляем альбом к новым артистам, которых не было в старом списке
      const artistsToAdd = newArtistIds.filter(
        (newId) => !oldArtistIds.includes(newId)
      );
      await updateArtistsContent(artistsToAdd, album._id, "albums");

      album.artist = newArtistIds;

      // Важно: Если артисты альбома меняются, нужно убедиться, что все песни в этом альбоме
      // также привязаны к новым артистам (или хотя бы к одному из них).
      // Это сложная логика, пока оставим так: песни в альбоме могут иметь своих артистов,
      // не обязательно совпадающих с артистами альбома. Если артист песни не входит
      // в артистов альбома, это может быть нелогично, но технически возможно.
      // Для упрощения, не будем трогать artistIds песен при смене artistIds альбома.
      // Если нужно strict-соответствие, то логика будет сложнее.
    } else if (
      artistIds &&
      Array.isArray(artistIds) &&
      artistIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Album must have at least one artist." });
    }

    // Обновляем изображение
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

    // Удаление изображения альбома из Cloudinary
    if (album.imageUrl) {
      await deleteFromCloudinary(extractPublicId(album.imageUrl));
    }

    // Удаление всех песен, принадлежащих этому альбому, из Cloudinary и БД
    const songsInAlbum = await Song.find({ albumId: id });
    for (const song of songsInAlbum) {
      if (song.audioUrl) {
        await deleteFromCloudinary(extractPublicId(song.audioUrl));
      }
      if (song.imageUrl) {
        await deleteFromCloudinary(extractPublicId(song.imageUrl));
      }
      // Также удаляем ссылку на песню из артистов
      await removeContentFromArtists(song.artist, song._id, "songs");
    }

    await Song.deleteMany({ albumId: id }); // Удаляем песни из БД

    // Удаление альбома из списка альбомов артистов
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

    if (!name) {
      return res.status(400).json({ message: "Artist name is required." });
    }
    if (!req.files || !req.files.imageFile) {
      return res.status(400).json({ message: "Artist image is required." });
    }

    const imageUrl = await uploadToCloudinary(req.files.imageFile, "artists");

    const newArtist = new Artist({
      name,
      bio,
      imageUrl,
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

    const artist = await Artist.findById(id);
    if (!artist) {
      return res.status(404).json({ message: "Artist not found." });
    }

    let imageUrl = artist.imageUrl;

    if (imageFile) {
      if (artist.imageUrl) {
        await deleteFromCloudinary(extractPublicId(artist.imageUrl));
      }
      imageUrl = await uploadToCloudinary(imageFile, "artists");
    }

    artist.name = name || artist.name;
    artist.bio = bio !== undefined ? bio : artist.bio;
    artist.imageUrl = imageUrl;

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

    // 2. Удаление всех песен, связанных с этим артистом, из Cloudinary и БД
    // и удаление этих песен из всех альбомов, в которых они могли быть
    const songsOfArtist = await Song.find({ artist: artist._id });
    for (const song of songsOfArtist) {
      if (song.audioUrl) {
        await deleteFromCloudinary(extractPublicId(song.audioUrl));
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
