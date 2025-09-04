// backend/src/controller/home.controller.js

import { getQuickPicks } from "./song.controller.js";
import { getTrendingSongs } from "./song.controller.js";
import { getDailyMixes } from "./mix.controller.js";
import { getPublicPlaylists } from "./playlist.controller.js";
import { getMadeForYouSongs, getListenHistory } from "./song.controller.js";
import {
  getFavoriteArtists,
  getNewReleases,
  getPlaylistRecommendations,
} from "./user.controller.js";
import { getMyGeneratedPlaylists } from "./generatedPlaylist.controller.js";

export const getHomePageData = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // --- Запросы, которые выполняются для всех пользователей ---
    const commonPromises = [
      getQuickPicks(req, res, next, true), // true, чтобы вернуть данные, а не отправлять ответ
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

    const [
      featuredSongs,
      trendingSongs,
      mixesData,
      publicPlaylists,
      allGeneratedPlaylists,
    ] = await Promise.all(commonPromises);

    const homePageData = {
      featuredSongs,
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

    if (userId) {
      const [
        madeForYouSongs,
        recentlyListened,
        favoriteArtists,
        newReleases,
        recommendedPlaylists,
      ] = await Promise.all(userSpecificPromises);

      homePageData.madeForYouSongs = madeForYouSongs;
      homePageData.recentlyListenedSongs = recentlyListened.songs;
      homePageData.favoriteArtists = favoriteArtists;
      homePageData.newReleases = newReleases;
      homePageData.recommendedPlaylists = recommendedPlaylists;
    }

    res.status(200).json(homePageData);
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    next(error);
  }
};
