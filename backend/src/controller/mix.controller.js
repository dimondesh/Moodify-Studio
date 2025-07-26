import { Mix } from "../models/mix.model.js";
import { Genre } from "../models/genre.model.js";
import { Mood } from "../models/mood.model.js";
import { Song } from "../models/song.model.js";
import { ListenHistory } from "../models/listenHistory.model.js"; // <-- ИМПОРТ

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
    let mixes = await Mix.find({ generatedOn: today }).lean();

    // Генерация миксов, если их нет на сегодня
    if (mixes.length === 0) {
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
        const songCount = await Song.countDocuments({
          [queryField]: source._id,
        });
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
          sourceId: source._id, // <-- СОХРАНЯЕМ ID ИСТОЧНИКА
          songs: randomSongs.map((s) => s._id),
          imageUrl: randomSongs[0].artistDetails[0].imageUrl,
          generatedOn: today,
        });
      }
      if (newMixesData.length > 0) {
        mixes = await Mix.insertMany(newMixesData);
      }
    }

    // --- ЛОГИКА ПЕРСОНАЛИЗАЦИИ ---
    // Проверяем, определил ли middleware пользователя
    if (req.user && req.user.id) {
      const userId = req.user.id;
      const listenHistory = await ListenHistory.find({ user: userId })
        .limit(150)
        .populate({ path: "song", select: "genres moods" })
        .lean();

      const validHistory = listenHistory.filter((item) => item.song);

      if (validHistory.length > 0) {
        const preferenceCounts = {};
        validHistory.forEach((item) => {
          item.song.genres.forEach((genreId) => {
            preferenceCounts[genreId] = (preferenceCounts[genreId] || 0) + 1;
          });
          item.song.moods.forEach((moodId) => {
            preferenceCounts[moodId] = (preferenceCounts[moodId] || 0) + 1;
          });
        });

        // Сортируем миксы на основе очков предпочтений
        mixes.sort((a, b) => {
          const scoreA = preferenceCounts[a.sourceId.toString()] || 0;
          const scoreB = preferenceCounts[b.sourceId.toString()] || 0;
          return scoreB - scoreA; // Сортировка по убыванию
        });
      }
    }

    // Популируем песни в уже (возможно) отсортированном списке миксов
    const populatedMixes = await Mix.populate(mixes, {
      path: "songs",
      select: "title duration imageUrl artist albumId",
      populate: { path: "artist", select: "name" },
    });

    res.status(200).json(groupMixes(populatedMixes));
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
