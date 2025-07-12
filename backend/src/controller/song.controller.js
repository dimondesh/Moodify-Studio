import { Song } from "../models/song.model.js";

export const getAllSongs = async (req, res, next) => {
  try {
    // Для getAllSongs тоже стоит добавить populate, если фронтенд ожидает полные объекты артистов
    const songs = await Song.find()
      .populate("artist", "name imageUrl") // Добавлено populate
      .sort({ createdAt: -1 });
    res.status(200).json({ songs });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedSongs = async (req, res, next) => {
  try {
    const songs = await Song.aggregate([
      { $sample: { size: 6 } },
      {
        $lookup: {
          // <-- НОВОЕ: Используем $lookup для "джойна" с коллекцией artists
          from: "artists", // Название коллекции артистов (обычно во множественном числе)
          localField: "artist", // Поле в коллекции songs, которое содержит ID артиста
          foreignField: "_id", // Поле в коллекции artists, которое соответствует ID артиста
          as: "artistDetails", // Название нового поля, куда будут помещены данные артиста
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          artist: "$artistDetails", // <-- ИЗМЕНЕНО: Теперь artist будет массивом объектов artistDetails
          imageUrl: 1,
          audioUrl: 1,
          albumId: 1,
        },
      },
      // Опционально: если вам нужны только определенные поля из artistDetails
      // {
      //   $unwind: "$artist" // Если artist всегда один, можно развернуть массив
      // },
      // {
      //   $project: {
      //     _id: 1,
      //     title: 1,
      //     "artist._id": "$artist._id",
      //     "artist.name": "$artist.name",
      //     "artist.imageUrl": "$artist.imageUrl",
      //     imageUrl: 1,
      //     audioUrl: 1,
      //     albumId: 1,
      //   },
      // },
    ]);
    res.json(songs);
  } catch (error) {
    next(error);
  }
};

export const getMadeForYouSongs = async (req, res, next) => {
  try {
    const songs = await Song.aggregate([
      { $sample: { size: 8 } },
      {
        $lookup: {
          // <-- НОВОЕ: Используем $lookup
          from: "artists",
          localField: "artist",
          foreignField: "_id",
          as: "artistDetails",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          artist: "$artistDetails", // <-- ИЗМЕНЕНО
          imageUrl: 1,
          audioUrl: 1,
          albumId: 1,
        },
      },
    ]);
    res.json(songs);
  } catch (error) {
    next(error);
  }
};

export const getTrendingSongs = async (req, res, next) => {
  try {
    const songs = await Song.aggregate([
      { $sample: { size: 8 } },
      {
        $lookup: {
          // <-- НОВОЕ: Используем $lookup
          from: "artists",
          localField: "artist",
          foreignField: "_id",
          as: "artistDetails",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          artist: "$artistDetails", // <-- ИЗМЕНЕНО
          imageUrl: 1,
          audioUrl: 1,
          albumId: 1,
        },
      },
    ]);
    res.json(songs);
  } catch (error) {
    next(error);
  }
};

export const incrementPlayCount = async (req, res, next) => {
  try {
    const { songId } = req.params;

    const song = await Song.findById(songId);

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    song.playCount = (song.playCount || 0) + 1;
    await song.save();

    res.status(200).json({
      message: "Play count incremented successfully.",
      playCount: song.playCount,
    });
  } catch (error) {
    console.error("Error incrementing play count:", error);
    next(error);
  }
};
