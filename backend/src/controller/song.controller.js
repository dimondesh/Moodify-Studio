import { Song } from "../models/song.model.js";

export const getAllSongs = async (req, res, next) => {
  try {
    const songs = await Song.find()
      .populate("artist", "name imageUrl")
      // Добавим instrumentalUrl и vocalsUrl в project, если используете агрегацию в других местах
      // В find() они будут включены по умолчанию, если не указан select
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
          artist: "$artistDetails",
          imageUrl: 1,
          instrumentalUrl: 1, // <-- ИЗМЕНЕНО: Добавлено
          vocalsUrl: 1, // <-- НОВОЕ: Добавлено
          albumId: 1,
        },
      },
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
          artist: "$artistDetails",
          imageUrl: 1,
          instrumentalUrl: 1, // <-- ИЗМЕНЕНО: Добавлено
          vocalsUrl: 1, // <-- НОВОЕ: Добавлено
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
          artist: "$artistDetails",
          imageUrl: 1,
          instrumentalUrl: 1, // <-- ИЗМЕНЕНО: Добавлено
          vocalsUrl: 1, // <-- НОВОЕ: Добавлено
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
