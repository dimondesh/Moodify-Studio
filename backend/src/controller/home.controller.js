// backend/src/controller/home.controller.js

import mongoose from "mongoose";
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
import { Library } from "../models/library.model.js";

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

// НОВЫЙ ОПТИМИЗИРОВАННЫЙ КОНТРОЛЛЕР
export const getBootstrapData = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // --- Параллельно запускаем все запросы ---
    const promises = [
      // 1. Быстрые подборки (бывший primary)
      getQuickPicks(req, res, next, true, 6),

      // 2. Тренды
      getTrendingSongs(req, res, next, true, HOME_SECTION_LIMIT),

      // 3. Миксы
      getDailyMixes(req, res, next, true, HOME_SECTION_LIMIT),

      // 4. Публичные плейлисты
      getPublicPlaylists(req, res, next, true, HOME_SECTION_LIMIT),

      // 5. Сгенерированные плейлисты
      getMyGeneratedPlaylists(req, res, next, true, HOME_SECTION_LIMIT),

      // 6. Персональные данные
      getMadeForYouSongs(req, res, next, true, HOME_SECTION_LIMIT),
      getListenHistory(req, res, next, true, HOME_SECTION_LIMIT),
      getFavoriteArtists(req, res, next, true, HOME_SECTION_LIMIT),
      getNewReleases(req, res, next, true, HOME_SECTION_LIMIT),
      getPlaylistRecommendations(req, res, next, true, HOME_SECTION_LIMIT),

      // 7. ОПТИМИЗИРОВАННЫЙ ЗАПРОС К БИБЛИОТЕКЕ
      getOptimizedLibrarySummary(userId),
    ];

    const [
      featuredSongs,
      trendingSongs,
      mixesData,
      publicPlaylists,
      allGeneratedPlaylists,
      madeForYouSongs,
      recentlyListened,
      favoriteArtists,
      newReleases,
      recommendedPlaylists,
      librarySummary,
    ] = await Promise.all(promises);

    // --- Формируем единый ответ ---
    const bootstrapData = {
      // Данные для главной страницы
      featuredSongs,
      trendingSongs,
      genreMixes: mixesData.genreMixes,
      moodMixes: mixesData.moodMixes,
      publicPlaylists,
      allGeneratedPlaylists,
      madeForYouSongs,
      recentlyListenedSongs: recentlyListened.songs,
      favoriteArtists,
      newReleases,
      recommendedPlaylists,
      // Данные библиотеки
      library: librarySummary,
    };

    res.status(200).json(bootstrapData);
  } catch (error) {
    console.error("Error fetching bootstrap data:", error);
    next(error);
  }
};

// НОВАЯ ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ для получения библиотеки одним запросом
async function getOptimizedLibrarySummary(userId) {
  const objectId = new mongoose.Types.ObjectId(userId);

  const libraryData = await Library.aggregate([
    // 1. Находим библиотеку пользователя
    { $match: { userId: objectId } },

    // 2. Выполняем все lookups параллельно
    {
      $lookup: {
        from: "albums",
        localField: "albums.albumId",
        foreignField: "_id",
        as: "albumDetails",
      },
    },
    {
      $lookup: {
        from: "songs",
        localField: "likedSongs.songId",
        foreignField: "_id",
        as: "songDetails",
      },
    },
    {
      $lookup: {
        from: "playlists",
        localField: "playlists.playlistId",
        foreignField: "_id",
        as: "playlistDetails",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "followedArtists.artistId",
        foreignField: "_id",
        as: "artistDetails",
      },
    },
    {
      $lookup: {
        from: "mixes",
        localField: "savedMixes.mixId",
        foreignField: "_id",
        as: "mixDetails",
      },
    },
    {
      $lookup: {
        from: "generatedplaylists",
        localField: "savedGeneratedPlaylists.playlistId",
        foreignField: "_id",
        as: "genPlaylistDetails",
      },
    },
    // Дополнительные lookups для populate
    {
      $lookup: {
        from: "artists",
        localField: "albumDetails.artist",
        foreignField: "_id",
        as: "albumArtists",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "songDetails.artist",
        foreignField: "_id",
        as: "songArtists",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "playlistDetails.owner",
        foreignField: "_id",
        as: "playlistOwners",
      },
    },

    // 3. Проецируем финальный результат
    {
      $project: {
        _id: 0,
        albums: {
          $map: {
            input: "$albumDetails",
            as: "album",
            in: {
              $mergeObjects: [
                "$$album",
                {
                  addedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$albums",
                                as: "a",
                                cond: { $eq: ["$$a.albumId", "$$album._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                  artist: {
                    $filter: {
                      input: "$albumArtists",
                      as: "art",
                      cond: { $in: ["$$art._id", "$$album.artist"] },
                    },
                  },
                },
              ],
            },
          },
        },
        likedSongs: {
          $map: {
            input: "$songDetails",
            as: "song",
            in: {
              $mergeObjects: [
                "$$song",
                {
                  likedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$likedSongs",
                                as: "s",
                                cond: { $eq: ["$$s.songId", "$$song._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                  artist: {
                    $filter: {
                      input: "$songArtists",
                      as: "art",
                      cond: { $in: ["$$art._id", "$$song.artist"] },
                    },
                  },
                },
              ],
            },
          },
        },
        playlists: {
          $map: {
            input: "$playlistDetails",
            as: "pl",
            in: {
              $mergeObjects: [
                "$$pl",
                {
                  addedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$playlists",
                                as: "p",
                                cond: { $eq: ["$$p.playlistId", "$$pl._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                  owner: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$playlistOwners",
                          as: "owner",
                          cond: { $eq: ["$$owner._id", "$$pl.owner"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
        followedArtists: {
          $map: {
            input: "$artistDetails",
            as: "artist",
            in: {
              $mergeObjects: [
                "$$artist",
                {
                  addedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$followedArtists",
                                as: "fa",
                                cond: {
                                  $eq: ["$$fa.artistId", "$$artist._id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                },
              ],
            },
          },
        },
        savedMixes: {
          $map: {
            input: "$mixDetails",
            as: "mix",
            in: {
              $mergeObjects: [
                "$$mix",
                {
                  addedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$savedMixes",
                                as: "sm",
                                cond: { $eq: ["$$sm.mixId", "$$mix._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                },
              ],
            },
          },
        },
        generatedPlaylists: {
          $map: {
            input: "$genPlaylistDetails",
            as: "gp",
            in: {
              $mergeObjects: [
                "$$gp",
                {
                  addedAt: {
                    $let: {
                      vars: {
                        libItem: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$savedGeneratedPlaylists",
                                as: "sgp",
                                cond: { $eq: ["$$sgp.playlistId", "$$gp._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$libItem.addedAt",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  ]);

  if (libraryData.length === 0) {
    return {
      albums: [],
      likedSongs: [],
      playlists: [],
      followedArtists: [],
      savedMixes: [],
      generatedPlaylists: [],
    };
  }

  // Очистка полей owner в плейлистах
  const finalData = libraryData[0];
  if (finalData.playlists) {
    finalData.playlists.forEach((pl) => {
      if (pl.owner) {
        pl.owner = {
          _id: pl.owner._id,
          fullName: pl.owner.fullName,
          imageUrl: pl.owner.imageUrl,
        };
      }
    });
  }

  return finalData;
}
