// backend/src/lib/ai.service.js

import axios from "axios";
import { Genre } from "../models/genre.model.js";
import { Mood } from "../models/mood.model.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findOrCreate = async (model, name) => {
  const cleanedName = name.trim();
  let entity = await model.findOne({
    name: { $regex: `^${cleanedName}$`, $options: "i" },
  });
  if (!entity) {
    entity = await new model({ name: cleanedName }).save();
  }
  return entity;
};

export const getTagsFromAI = async (artistName, trackName) => {
  if (!GEMINI_API_KEY) {
    console.error("[AI Service] GEMINI_API_KEY не найден.");
    return { genreIds: [], moodIds: [] };
  }

  const prompt = `You are an expert musicologist. Your task is to analyze the provided artist and track and return its primary genre, specific sub-genres, and relevant moods.
Artist: "${artistName}"
Track: "${trackName}"
Constraints:
1.  **Determine the Primary Core Genre**: From the following list, choose the ONE most fitting core genre. Core Genres List: [${CORE_GENRES_LIST.join(
    ", "
  )}]
2.  **Determine Specific Sub-Genres**: Identify 1 or 2 more specific sub-genres (e.g., "Shoegaze", "Synthpop"). Do NOT repeat the core genre here.
3.  **Determine Moods**: Identify 1 to 3 moods that describe the feeling of the song (e.g., "Melancholic", "Energetic", "Dreamy").
4.  **Format the Output**: Your response MUST be ONLY a valid JSON object, starting with { and ending with }. Do not include any text, explanations, or markdown.
Example Response: { "primaryGenre": "Alternative", "subGenres": ["Indie Pop", "Jangle Pop"], "moods": ["Melancholic", "Nostalgic", "Bittersweet"] }`;

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

    if (!tags.primaryGenre || !tags.subGenres || !tags.moods) {
      console.warn("[AI Service] Gemini вернул JSON без обязательных полей.");
      return { genreIds: [], moodIds: [] };
    }

    console.log(`[AI Service] Получены теги от Gemini:`, tags);

    const allGenreNames = new Set([tags.primaryGenre, ...tags.subGenres]);

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
      "[AI Service] Ошибка при обращении к Gemini API:",
      error.response?.data?.error?.message || error.message
    );

    if (error.response && error.response.status === 429) {
      console.log(
        "[AI Service] Достигнут лимит запросов. Пауза на 2 секунды..."
      );
      await sleep(2000);
    } else {
      await sleep(1000); 
    }

    return { genreIds: [], moodIds: [] };
  }
};
