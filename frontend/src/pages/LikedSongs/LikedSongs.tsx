// frontend/src/pages/LikedSongs/LikedSongs.tsx

import { JSX, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useMusicStore } from "../../stores/useMusicStore";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Clock, Heart, Pause, Play } from "lucide-react";
import Equalizer from "../../components/ui/equalizer";
import LibraryGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ

interface Artist {
  _id: string;
  name: string;
}

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const LikedSongsPage = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const navigate = useNavigate();
  const { likedSongs, isLoading, error, fetchLikedSongs, toggleSongLike } =
    useLibraryStore();
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();
  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    fetchLikedSongs();
    fetchArtists();
  }, [fetchLikedSongs, fetchArtists]);

  const getArtistNamesDisplay = (
    artistsInput: (string | Artist)[] | undefined
  ) => {
    if (!artistsInput || artistsInput.length === 0)
      return <span>{t("common.unknownArtist")}</span>;
    const artistElements: JSX.Element[] = [];
    artistsInput.forEach((artistOrId, index) => {
      let artistName: string | null = null;
      let artistId: string | null = null;
      if (typeof artistOrId === "string") {
        const foundArtist = artists.find((a: Artist) => a._id === artistOrId);
        if (foundArtist) {
          artistName = foundArtist.name;
          artistId = foundArtist._id;
        }
      } else {
        artistName = artistOrId.name;
        artistId = artistOrId._id;
      }
      if (artistName && artistId) {
        artistElements.push(
          <span key={artistId}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToArtist(artistId);
              }}
              className="hover:underline focus:outline-none focus:underline"
            >
              {artistName}
            </button>
            {index < artistsInput.length - 1 && ", "}
          </span>
        );
      }
    });
    return <>{artistElements}</>;
  };

  if (isLoading) return <LibraryGridSkeleton />;

  if (!isLoading && !error && likedSongs.length === 0) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
          {t("pages.likedSongs.title")}
        </h1>
        <p className="text-zinc-400">{t("pages.likedSongs.empty")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
          {t("pages.likedSongs.title")}
        </h1>
        <p className="text-red-500 mt-4 text-center">
          {t("pages.likedSongs.error")}: {error}
        </p>
      </div>
    );
  }

  const totalDurationSeconds = likedSongs.reduce(
    (sum, song) => sum + (song.duration || 0),
    0
  );
  const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);
  const isAnyLikedSongPlaying = likedSongs.some(
    (song) => song._id === currentSong?._id
  );

  const handlePlayLikedSongs = () => {
    if (isAnyLikedSongPlaying) togglePlay();
    else playAlbum(likedSongs, 0);
  };

  const handlePlaySpecificSong = (index: number) => {
    playAlbum(likedSongs, index);
  };

  const handleNavigateToAlbum = (
    e: React.MouseEvent<HTMLButtonElement>,
    albumId: string | null | undefined
  ) => {
    e.stopPropagation();
    if (albumId) navigate(`/albums/${albumId}`);
    else console.warn("Album ID is missing for navigation.");
  };

  const handleNavigateToArtist = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-full rounded-md md:pb-0">
        <div className="relative min-h-screen">
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#5038a0]/80 via-zinc-900/80 to-zinc-900 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6 pb-8 items-center sm:items-end">
              <img
                src="/liked.png"
                alt={t("pages.likedSongs.title")}
                className="w-48 h-48 sm:w-[200px] sm:h-[200px] lg:w-[240px] lg:h-[240px] shadow-xl rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/default-song-cover.png";
                }}
              />
              <div className="flex flex-col justify-end text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium ">
                  {t("pages.likedSongs.playlist")}
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-2 sm:my-4">
                  {t("pages.likedSongs.title")}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 text-xs sm:text-sm text-zinc-100">
                  <span className="font-medium text-white">
                    {t("pages.likedSongs.yourLibrary")}
                  </span>
                  <span>
                    • {likedSongs.length}{" "}
                    {likedSongs.length !== 1
                      ? t("pages.likedSongs.songs")
                      : t("pages.likedSongs.song")}
                  </span>
                  {totalDurationMinutes > 0 && (
                    <span>
                      • {totalDurationMinutes} {t("pages.likedSongs.minutes")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-4 flex items-center gap-4 sm:gap-6 ">
              <Button
                onClick={handlePlayLikedSongs}
                size="icon"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 hover:bg-violet-400 hover:scale-105 transition-all"
              >
                {isPlaying && isAnyLikedSongPlaying ? (
                  <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                ) : (
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                )}
              </Button>
            </div>

            <div className="bg-black/20 backdrop-blur-sm">
              <div className="grid grid-cols-[16px_4fr_1.5fr_min-content] md:grid-cols-[16px_3.6fr_1.85fr_1.15fr_min-content] gap-4 px-4 sm:px-6 md:px-10 py-2 text-sm text-zinc-400 border-b border-white/5">
                <div>#</div>
                <div>{t("pages.likedSongs.headers.title")}</div>
                <div className="hidden md:block">
                  {t("pages.likedSongs.headers.dateAdded")}
                </div>
                <div>
                  <Clock className="h-4 w-4" />
                </div>
                <div></div>
              </div>
              <div className="px-4 sm:px-6">
                <div className="space-y-2 py-4">
                  {likedSongs.map((song, index) => {
                    const isThisSongPlaying = currentSong?._id === song._id;
                    return (
                      <div
                        key={song._id}
                        onClick={() => handlePlaySpecificSong(index)}
                        className={`grid grid-cols-[16px_4fr_1fr_min-content] md:grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer ${
                          isThisSongPlaying ? "bg-white/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          {isThisSongPlaying && isPlaying ? (
                            <div className="z-10">
                              <Equalizer />
                            </div>
                          ) : (
                            <span className="group-hover:hidden">
                              {index + 1}
                            </span>
                          )}
                          {!isThisSongPlaying && (
                            <Play className="h-4 w-4 hidden group-hover:block text-white" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <button
                            onClick={(e) =>
                              handleNavigateToAlbum(e, song.albumId)
                            }
                            className="flex-shrink-0"
                          >
                            <img
                              src={song.imageUrl || "/default-song-cover.png"}
                              alt={song.title}
                              className="size-10 object-cover rounded-md flex-shrink-0"
                            />
                          </button>
                          <div className="flex flex-col min-w-0">
                            <button
                              className={`font-medium text-left ${
                                isThisSongPlaying
                                  ? "text-violet-400"
                                  : "text-white"
                              } hover:underline`}
                              onClick={(e) =>
                                handleNavigateToAlbum(e, song.albumId)
                              }
                            >
                              <p className="truncate">{song.title}</p>
                            </button>
                            <div className="text-zinc-400 truncate">
                              {getArtistNamesDisplay(song.artist)}
                            </div>
                          </div>
                        </div>
                        <div className=" items-center hidden md:flex">
                          {" "}
                          {song.likedAt
                            ? new Date(song.likedAt).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div className="flex items-center">
                          {formatDuration(song.duration)}
                        </div>
                        <div className="flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-violet-500 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSongLike(song._id);
                            }}
                            title={t("player.unlike")}
                          >
                            <Heart className="h-5 w-5 fill-current" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LikedSongsPage;
