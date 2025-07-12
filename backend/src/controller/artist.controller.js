import { Artist } from "../models/artist.model.js"; // Убедись, что путь правильный

// Контроллер для получения всех артистов
export const getAllArtists = async (req, res, next) => {
  try {
    const artists = await Artist.find().sort({ name: 1 }); // Сортируем по имени
    res.status(200).json(artists);
  } catch (error) {
    console.error("Error in getAllArtists:", error);
    next(error); // Передаем ошибку в глобальный обработчик
  }
};

// Контроллер для получения одного артиста по ID
export const getArtistById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Находим артиста и "заполняем" (populate) его песни и альбомы,
    // а также артистов внутри этих песен и альбомов
    const artist = await Artist.findById(id)
      .populate({
        path: "songs", // Загружаем данные песен
        populate: {
          path: "artist", // <-- ДОБАВЛЕНО: Загружаем данные артиста внутри каждой песни
          model: "Artist", // <-- ДОБАВЛЕНО: Указываем модель Artist
        },
      })
      .populate({
        path: "albums", // Загружаем данные альбомов
        populate: {
          path: "artist", // <-- ДОБАВЛЕНО: Загружаем данные артиста внутри каждого альбома
          model: "Artist", // <-- ДОБАВЛЕНО: Указываем модель Artist
        },
      });

    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }
    res.status(200).json(artist);
  } catch (error) {
    console.error("Error in getArtistById:", error);
    next(error); // Передаем ошибку в глобальный обработчик
  }
};
