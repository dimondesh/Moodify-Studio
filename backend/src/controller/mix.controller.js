import { Mix } from "../models/mix.model.js";
import { Genre } from "../models/genre.model.js";
import { Mood } from "../models/mood.model.js";
import { Song } from "../models/song.model.js";

// Функция для получения YYYY-MM-DD для сравнения дат
const getTodayDate = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

// Хелпер для группировки миксов
const groupMixes = (mixes) => {
  return mixes.reduce(
    (acc, mix) => {
      if (mix.type === "Genre") {
        acc.genreMixes.push(mix);
      } else if (mix.type === "Mood") {
        acc.moodMixes.push(mix);
      }
      return acc;
    },
    { genreMixes: [], moodMixes: [] }
  );
};

export const getDailyMixes = async (req, res, next) => {
  try {
    const today = getTodayDate();

    let mixes = await Mix.find({ generatedOn: today }).populate({
      path: "songs",
      select: "title duration imageUrl artist",
      populate: { path: "artist", select: "name" },
    });

    if (mixes.length > 0) {
      return res.status(200).json(groupMixes(mixes));
    }

    await Mix.deleteMany({});

    const genres = await Genre.find().lean();
    const moods = await Mood.find().lean();
    const sources = [
      ...genres.map((g) => ({ ...g, type: "Genre" })),
      ...moods.map((m) => ({ ...m, type: "Mood" })),
    ];

    const newMixesData = [];

    for (const source of sources) {
      const queryField = source.type === "Genre" ? "genres" : "moods";
      const songCount = await Song.countDocuments({ [queryField]: source._id });
      if (songCount < 5) continue;

      const randomSongs = await Song.aggregate([
        { $match: { [queryField]: source._id } },
        { $sample: { size: 30 } },
        {
          $lookup: {
            from: "artists",
            localField: "artist",
            foreignField: "_id",
            as: "artistDetails",
          },
        },
      ]);

      if (randomSongs.length === 0 || !randomSongs[0].artistDetails?.[0])
        continue;

      newMixesData.push({
        name: `${source.name} Mix`,
        type: source.type,
        sourceName: source.name,
        songs: randomSongs.map((s) => s._id),
        imageUrl: randomSongs[0].artistDetails[0].imageUrl,
        generatedOn: today,
      });
    }

    if (newMixesData.length > 0) {
      const createdMixes = await Mix.insertMany(newMixesData);
      const populatedNewMixes = await Mix.find({
        _id: { $in: createdMixes.map((m) => m._id) },
      }).populate({
        path: "songs",
        select: "title duration imageUrl artist",
        populate: { path: "artist", select: "name" },
      });
      return res.status(200).json(groupMixes(populatedNewMixes));
    }

    return res.status(200).json({ genreMixes: [], moodMixes: [] });
  } catch (error) {
    console.error("Error in getDailyMixes:", error);
    next(error);
  }
};
export const getMixById = async (req, res, next) => {
  try {
    const mix = await Mix.findById(req.params.id).populate({
      path: "songs",
      populate: { path: "artist", model: "Artist" },
    });

    if (!mix) {
      return res.status(404).json({ message: "Mix not found" });
    }
    res.status(200).json(mix);
  } catch (error) {
    next(error);
  }
};
