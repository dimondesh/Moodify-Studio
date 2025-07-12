import { Album } from "../models/album.model.js";

export const getAllAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find()
      .populate("artist", "name imageUrl") // Заполняем поле 'artist' для самого альбома
      .populate({
        path: "songs", // Заполняем песни
        populate: {
          path: "artist", // И внутри каждой песни заполняем поле 'artist'
          model: "Artist", // Укажите вашу модель Artist
          select: "name imageUrl", // Выбираем только нужные поля артиста
        },
      })
      .lean(); // Добавьте .lean() для получения простых JS объектов

    res.status(200).json(albums);
  } catch (error) {
    next(error);
  }
};

export const getAlbumById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const album = await Album.findById(id)
      .populate("artist", "name imageUrl") // Заполняем поле 'artist' для самого альбома
      .populate({
        path: "songs", // Заполняем песни
        populate: {
          path: "artist", // И внутри каждой песни заполняем поле 'artist'
          model: "Artist", // Укажите вашу модель Artist
          select: "name imageUrl", // Выбираем только нужные поля артиста
        },
      })
      .lean(); // Добавьте .lean() для получения простых JS объектов

    if (!album) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found" });
    }
    res.status(200).json({ album });
  } catch (error) {
    next(error);
  }
};
