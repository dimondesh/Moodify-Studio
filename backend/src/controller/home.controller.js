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

const HOME_SECTION_LIMIT = 12;


export const getPrimaryHomePageData = async (req, res, next) => {
  try {
    const featuredSongs = await getQuickPicks(req, res, next, true, 6);
    res.status(200).json({ featuredSongs });
  } catch (error) {
    console.error("Error fetching primary homepage data:", error);
    next(error);
  }
};


export const getSecondaryHomePageData = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // --- Запросы, которые выполняются для всех пользователей (кроме featured) ---
    const commonPromises = [
      getTrendingSongs(req, res, next, true, HOME_SECTION_LIMIT),
      getDailyMixes(req, res, next, true, HOME_SECTION_LIMIT),
      getPublicPlaylists(req, res, next, true, HOME_SECTION_LIMIT),
      getMyGeneratedPlaylists(req, res, next, true, HOME_SECTION_LIMIT),
    ];

    // --- Запросы, которые выполняются только для авторизованных пользователей ---
    const userSpecificPromises = userId
      ? [
          getMadeForYouSongs(req, res, next, true, HOME_SECTION_LIMIT),
          getListenHistory(req, res, next, true, HOME_SECTION_LIMIT),
          getFavoriteArtists(req, res, next, true, HOME_SECTION_LIMIT),
          getNewReleases(req, res, next, true, HOME_SECTION_LIMIT),
          getPlaylistRecommendations(req, res, next, true, HOME_SECTION_LIMIT),
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
