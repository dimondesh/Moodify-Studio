import { Song } from "../models/song.model.js";

export const getAllSongs = async (req, res, next) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
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
        $project: {
          _id: 1,
          title: 1,
          artist: 1,
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
export const getMadeForYouSongs = async (req, res, next) => {
  try {
    const songs = await Song.aggregate([
      { $sample: { size: 8 } },
      {
        $project: {
          _id: 1,
          title: 1,
          artist: 1,
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
        $project: {
          _id: 1,
          title: 1,
          artist: 1,
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

    song.playCount = (song.playCount || 0) + 1; // Увеличиваем счетчик
    await song.save();

    res
      .status(200)
      .json({
        message: "Play count incremented successfully.",
        playCount: song.playCount,
      });
  } catch (error) {
    console.error("Error incrementing play count:", error);
    next(error);
  }
};
