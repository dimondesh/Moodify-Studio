// backend/src/controller/home.controller.js

import {
  getQuickPicks,
  getTrendingSongs,
  getMadeForYouSongs,
  getListenHistory,
} from "./song.controller.js";
import { getDailyMixes } from "./mix.controller.js";
import { getPublicPlaylists } from "./playlist.controller.js";
import {
  getFavoriteArtists,
  getNewReleases,
  getPlaylistRecommendations,
} from "./user.controller.js";
import { getMyGeneratedPlaylists } from "./generatedPlaylist.controller.js";

/**
 * @description Получает только основные данные для первого экрана. Должен быть максимально быстрым.
 */
export const getPrimaryHomePageData = async (req, res, next) => {
  try {
    // Получаем только featuredSongs (бывший getQuickPicks)
    const featuredSongs = await getQuickPicks(req, res, next, true);
    res.status(200).json({ featuredSongs });
  } catch (error) {
    console.error("Error fetching primary homepage data:", error);
    next(error);
  }
};

/**
 * @description Получает все остальные данные для главной страницы, которые можно загрузить в фоне.
 */
export const getSecondaryHomePageData = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // --- Запросы, которые выполняются для всех пользователей (кроме featured) ---
    const commonPromises = [
      getTrendingSongs(req, res, next, true),
      getDailyMixes(req, res, next, true),
      getPublicPlaylists(req, res, next, true),
      getMyGeneratedPlaylists(req, res, next, true),
    ];

    // --- Запросы, которые выполняются только для авторизованных пользователей ---
    const userSpecificPromises = userId
      ? [
          getMadeForYouSongs(req, res, next, true),
          getListenHistory(req, res, next, true),
          getFavoriteArtists(req, res, next, true),
          getNewReleases(req, res, next, true),
          getPlaylistRecommendations(req, res, next, true),
        ]
      : [];

    const [trendingSongs, mixesData, publicPlaylists, allGeneratedPlaylists] =
      await Promise.all(commonPromises);

    const secondaryData = {
      trendingSongs,
      genreMixes: mixesData.genreMixes,
      moodMixes: mixesData.moodMixes,
      publicPlaylists,
      allGeneratedPlaylists,
      madeForYouSongs: [],
      recentlyListenedSongs: [],
      favoriteArtists: [],
      newReleases: [],
      recommendedPlaylists: [],
    };

    if (userId && userSpecificPromises.length > 0) {
      const [
        madeForYouSongs,
        recentlyListened,
        favoriteArtists,
        newReleases,
        recommendedPlaylists,
      ] = await Promise.all(userSpecificPromises);

      secondaryData.madeForYouSongs = madeForYouSongs;
      secondaryData.recentlyListenedSongs = recentlyListened.songs;
      secondaryData.favoriteArtists = favoriteArtists;
      secondaryData.newReleases = newReleases;
      secondaryData.recommendedPlaylists = recommendedPlaylists;
    }

    res.status(200).json(secondaryData);
  } catch (error) {
    console.error("Error fetching secondary homepage data:", error);
    next(error);
  }
};
