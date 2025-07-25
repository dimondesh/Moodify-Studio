// backend/src/lib/ai.service.js

import axios from "axios";
import { Genre } from "../models/genre.model.js";
import { Mood } from "../models/mood.model.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// --- СПИСОК ОСНОВНЫХ, ОБОБЩЕННЫХ ЖАНРОВ ДЛЯ РЕКОМЕНДАЦИЙ ---
const CORE_GENRES_LIST = [
  "Rock",
  "Pop",
  "Electronic",
  "Hip-Hop",
  "Jazz",
  "Classical",
  "R&B",
  "Reggae",
  "Metal",
  "Alternative",
  "Indie",
  "Punk",
  "Folk",
  "Country",
  "Blues",
  "Soul",
  "Funk",
  "Techno",
  "House",
  "Ambient",
];

// Вспомогательная функция для поиска или создания сущности
const findOrCreate = async (model, name) => {
  const modelName = model.modelName;
  const cleanedName = name.trim();
  let entity = await model.findOne({
    name: { $regex: `^${cleanedName}$`, $options: "i" },
  });

  if (!entity) {
    console.log(
      `[AI Service] Создание новой сущности ${modelName}: "${cleanedName}"`
    );
    entity = new model({ name: cleanedName });
    await entity.save();
  }
  return entity;
};

export const getTagsFromAI = async (artistName, trackName) => {
  if (!GEMINI_API_KEY) {
    console.error("[AI Service] GEMINI_API_KEY не найден.");
    return { genreIds: [], moodIds: [] };
  }

  // --- ОБНОВЛЕННЫЙ ПРОМПТ С ДВУХУРОВНЕВОЙ ЛОГИКОЙ ---
  const prompt = `
    You are an expert musicologist. Your task is to analyze the provided artist and track and return its primary genre, specific sub-genres, and relevant moods.

    Artist: "${artistName}"
    Track: "${trackName}"

    Follow these steps and constraints precisely:
    1.  **Determine the Primary Core Genre**: From the following list, choose the ONE most fitting core genre for this track. This is for broad categorization.
        Core Genres List: [${CORE_GENRES_LIST.join(", ")}]
    2.  **Determine Specific Sub-Genres**: Identify 1 or 2 more specific sub-genres. These should be more descriptive than the core genre (e.g., "Shoegaze", "Synthpop", "Dream Pop"). Do NOT repeat the core genre here.
    3.  **Determine Moods**: Identify 1 to 3 moods that describe the feeling of the song (e.g., "Melancholic", "Energetic", "Dreamy", "Chill").
    4.  **Format the Output**: Your response MUST be ONLY a valid JSON object. Do not include any text before or after the JSON. The JSON must contain three keys: "primaryGenre", "subGenres", and "moods".

    Example of a valid response for "The Smiths - There Is a Light That Never Goes Out":
    {
      "primaryGenre": "Alternative",
      "subGenres": ["Indie Pop", "Jangle Pop"],
      "moods": ["Melancholic", "Nostalgic", "Bittersweet"]
    }

    Example of a valid response for "Daft Punk - One More Time":
    {
      "primaryGenre": "Electronic",
      "subGenres": ["French House", "Nu-Disco"],
      "moods": ["Energetic", "Upbeat", "Party"]
    }
  `;

  try {
    console.log(
      `[AI Service] Отправка запроса к Gemini для трека: ${artistName} - ${trackName}`
    );

    const response = await axios.post(GEMINI_API_URL, {
      contents: [{ parts: [{ text: prompt }] }],
    });

    const rawText = response.data.candidates[0].content.parts[0].text;
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const tags = JSON.parse(cleanedText);

    // Проверяем, что ответ соответствует новому формату
    if (!tags.primaryGenre || !tags.subGenres || !tags.moods) {
      console.warn(
        "[AI Service] Нейросеть вернула JSON без обязательных полей 'primaryGenre', 'subGenres' или 'moods'."
      );
      return { genreIds: [], moodIds: [] };
    }

    console.log(`[AI Service] Получены теги от Gemini:`, tags);

    // --- ОБНОВЛЕННАЯ ЛОГИКА СБОРКИ ЖАНРОВ ---
    // Объединяем основной жанр и поджанры в один список.
    // Используем Set, чтобы автоматически убрать дубликаты, если нейросеть их вернет.
    const allGenreNames = new Set([tags.primaryGenre, ...tags.subGenres]);

    // Преобразуем названия в ID
    const genreIds = await Promise.all(
      [...allGenreNames].map((name) =>
        findOrCreate(Genre, name).then((g) => g._id)
      )
    );

    const moodIds = await Promise.all(
      tags.moods.map((name) => findOrCreate(Mood, name).then((m) => m._id))
    );

    return { genreIds, moodIds };
  } catch (error) {
    console.error(
      "[AI Service] Ошибка при обращении к Gemini API или парсинге JSON:",
      error.response?.data || error.message
    );
    return { genreIds: [], moodIds: [] };
  }
};
