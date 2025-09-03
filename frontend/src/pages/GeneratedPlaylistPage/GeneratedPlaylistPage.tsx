// frontend/src/pages/GeneratedPlaylistPage/GeneratedPlaylistPage.tsx

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
import PlaylistDetailsSkeleton from "../../components/ui/skeletons/PlaylistDetailsSkeleton";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { Play, Pause, Heart, PlusCircle, CheckCircle2 } from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Song } from "../../types";
import { useLibraryStore } from "../../stores/useLibraryStore";
import Equalizer from "../../components/ui/equalizer";
import { useGeneratedPlaylistStore } from "../../stores/useGeneratedPlaylistStore";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useDominantColor } from "@/hooks/useDominantColor";
import EqualizerTitle from "@/components/ui/equalizer-title";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const GeneratedPlaylistPage = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { t } = useTranslation();
  const { id: playlistId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentPlaylist, error, isLoading, fetchPlaylistById, reset } =
    useGeneratedPlaylistStore();
  const {
    likedSongs,
    toggleSongLike,
    isGeneratedPlaylistSaved,
    toggleGeneratedPlaylistInLibrary,
  } = useLibraryStore();
  const { playAlbum, togglePlay, isPlaying, currentSong } = usePlayerStore();
  const [isTogglingLibrary, setIsTogglingLibrary] = useState(false);
  const { extractColor } = useDominantColor();
  const [isColorLoading, setIsColorLoading] = useState(true);
  const backgroundKeyRef = useRef(0);
  const [backgrounds, setBackgrounds] = useState([
    { key: 0, color: "#18181b" },
  ]);

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistById(playlistId);
    }
    return () => {
      reset();
    };
  }, [playlistId, fetchPlaylistById, reset]);

  useEffect(() => {
    const updateBackgroundColor = (color: string) => {
      backgroundKeyRef.current += 1;
      const newKey = backgroundKeyRef.current;
      setBackgrounds((prev) => [{ key: newKey, color }, ...prev.slice(0, 1)]);
    };
    if (currentPlaylist?.imageUrl) {
      setIsColorLoading(true);
      extractColor(currentPlaylist.imageUrl)
        .then((color) => updateBackgroundColor(color || "#18181b"))
        .finally(() => setIsColorLoading(false));
    } else if (currentPlaylist) {
      updateBackgroundColor("#18181b");
      setIsColorLoading(false);
    }
  }, [currentPlaylist, extractColor]);

  const handleToggleInLibrary = async () => {
    if (!currentPlaylist || isTogglingLibrary) return;
    setIsTogglingLibrary(true);
    await toggleGeneratedPlaylistInLibrary(currentPlaylist._id);
    setIsTogglingLibrary(false);
  };

  const handlePlayPlaylist = () => {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    const isThisPlaylistInPlayer =
      isPlaying &&
      currentPlaylist.songs.some((song) => song._id === currentSong?._id);
    if (isThisPlaylistInPlayer) togglePlay();
    else playAlbum(currentPlaylist.songs, 0);
  };

  const handlePlaySong = (song: Song, index: number) => {
    if (!currentPlaylist) return;
    if (currentSong?._id === song._id) togglePlay();
    else playAlbum(currentPlaylist.songs, index);
  };

  const handleSongTitleClick = (albumId: string | null | undefined) => {
    if (albumId) navigate(`/albums/${albumId}`);
  };

  const handleArtistNameClick = (artistId: string) =>
    navigate(`/artists/${artistId}`);

  if (isLoading || isColorLoading) {
    return (
      <>
        <Helmet>
          <title>Loading Playlist...</title>
        </Helmet>
        <PlaylistDetailsSkeleton />
      </>
    );
  }

  if (error || !currentPlaylist) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white text-center">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
          {t("pages.playlist.notFoundTitle")}
        </h1>
        <p className="text-zinc-400">
          {error || t("pages.playlist.notFoundDesc")}
        </p>
      </div>
    );
  }

  const isInLibrary = isGeneratedPlaylistSaved(currentPlaylist._id);
  const isCurrentPlaylistPlaying =
    isPlaying &&
    currentPlaylist.songs.some((song) => song._id === currentSong?._id);

  return (
    <>
      <Helmet>
        <title>{t(currentPlaylist.nameKey)}</title>
        <meta name="description" content={t(currentPlaylist.descriptionKey)} />
      </Helmet>
      <div className="h-full">
        <ScrollArea className="h-full rounded-md md:pb-0">
          <div className="relative min-h-screen">
            {backgrounds
              .slice(0, 2)
              .reverse()
              .map((bg, index) => (
                <div
                  key={bg.key}
                  className={`absolute inset-0 pointer-events-none ${
                    index === 1 ? "animate-fade-in" : ""
                  }`}
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(to bottom, ${bg.color} 0%, rgba(20, 20, 20, 0.8) 50%, #18181b 100%)`,
                  }}
                />
              ))}
            <div className="relative z-10">
              {/* Header section with image and title */}
              <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6 pb-8 sm:pb-8 items-center sm:items-end text-center sm:text-left">
                <img
                  src={currentPlaylist.imageUrl || "/default-album-cover.png"}
                  alt={t(currentPlaylist.nameKey)}
                  className="w-48 h-48 sm:w-[200px] sm:h-[200px] lg:w-[240px] lg:h-[240px] shadow-xl rounded-md object-cover flex-shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex flex-col justify-end flex-grow">
                  <p className="text-xs sm:text-sm font-medium">
                    {t("sidebar.subtitle.playlist")}
                  </p>
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-2 sm:my-4">
                    {t(currentPlaylist.nameKey)}
                  </h1>
                  <p className="text-zinc-400 text-base mt-2">
                    {t(currentPlaylist.descriptionKey)}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 text-xs sm:text-sm text-zinc-100 mt-2">
                    <img src="/Moodify.svg" alt="Moodify" className="size-4" />
                    <span className="font-semibold text-white">Moodify</span>
                    <span className="hidden lg:inline">
                      • {currentPlaylist.songs.length}{" "}
                      {t("pages.playlist.songs")}
                    </span>
                    {currentPlaylist.songs.length > 0 && (
                      <span className="hidden lg:inline">
                        •{" "}
                        {formatDuration(
                          currentPlaylist.songs.reduce(
                            (acc, song) => acc + (song.duration || 0),
                            0
                          )
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Controls section */}
              <div className="px-4 sm:px-6 pb-4 flex items-center gap-3 sm:gap-6">
                {currentPlaylist.songs.length > 0 && (
                  <Button
                    size="icon"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 hover:bg-violet-400 transition-colors shadow-lg flex-shrink-0 hover:scale-105"
                    onClick={handlePlayPlaylist}
                    title={
                      isCurrentPlaylistPlaying
                        ? t("pages.playlist.actions.pause")
                        : t("pages.playlist.actions.play")
                    }
                  >
                    {isCurrentPlaylistPlaying ? (
                      <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleToggleInLibrary}
                  disabled={isTogglingLibrary}
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-2 transition-colors hover:bg-white/10"
                  title={
                    isInLibrary
                      ? "Remove from Your Library"
                      : "Add to Your Library"
                  }
                >
                  {isInLibrary ? (
                    <CheckCircle2 className="size-5 sm:size-6 text-violet-400" />
                  ) : (
                    <PlusCircle className="size-5 sm:size-6 text-white" />
                  )}
                </Button>
                <DownloadButton
                  itemId={currentPlaylist._id}
                  itemType="generated-playlists"
                  itemTitle={t(currentPlaylist.nameKey)}
                />
              </div>

              {/* Songs list section */}
              <div className="bg-black/20 backdrop-blur-sm">
                <div className="px-4 sm:px-6">
                  <div className="space-y-2 py-4">
                    {currentPlaylist.songs.map((song, index) => {
                      const isCurrentlyPlaying = currentSong?._id === song._id;
                      const songIsLiked = likedSongs.some(
                        (likedSong) => likedSong._id === song._id
                      );
                      return (
                        <div
                          key={song._id}
                          onClick={() => handlePlaySong(song, index)}
                          className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[16px_4fr_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] items-center gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer ${
                            isCurrentlyPlaying ? "bg-white/10" : ""
                          }`}
                        >
                          <div className="hidden sm:flex items-center justify-center">
                            {isCurrentlyPlaying && isPlaying ? (
                              <div className="z-10">
                                <Equalizer />
                              </div>
                            ) : (
                              <span className="group-hover:hidden text-xs sm:text-sm">
                                {index + 1}
                              </span>
                            )}
                            {!isCurrentlyPlaying && (
                              <Play className="h-3 w-3 sm:h-4 sm:w-4 hidden group-hover:block" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <img
                              src={song.imageUrl || "/default-song-cover.png"}
                              alt={song.title}
                              className="size-10 object-cover rounded-md flex-shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                {isCurrentlyPlaying && isPlaying && (
                                  <div className="block sm:hidden flex-shrink-0">
                                    <EqualizerTitle />
                                  </div>
                                )}
                                {isMobile ? (
                                  <span
                                    className={`font-medium w-full text-left ${
                                      isCurrentlyPlaying
                                        ? "text-violet-400"
                                        : "text-white"
                                    }`}
                                  >
                                    <p className="truncate">{song.title}</p>
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSongTitleClick(song.albumId);
                                    }}
                                    className={`font-medium w-full text-left hover:underline focus:outline-none focus:underline ${
                                      isCurrentlyPlaying
                                        ? "text-violet-400"
                                        : "text-white"
                                    }`}
                                  >
                                    <p className="truncate">{song.title}</p>
                                  </button>
                                )}
                              </div>
                              <div className="text-zinc-400 text-xs sm:text-sm truncate">
                                {song.artist.map((artist, artistIndex) => (
                                  <span key={artist._id}>
                                    {isMobile ? (
                                      <span>{artist.name}</span>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArtistNameClick(artist._id);
                                        }}
                                        className="hover:underline focus:outline-none focus:underline"
                                      >
                                        {artist.name}
                                      </button>
                                    )}
                                    {artistIndex < song.artist.length - 1 &&
                                      ", "}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="items-center hidden md:flex text-xs">
                            {song.createdAt
                              ? format(new Date(song.createdAt), "MMM dd, yyyy")
                              : "N/A"}
                          </div>
                          <div className="flex items-center justify-end gap-1 sm:gap-4 flex-shrink-0">
                            <span className="hidden sm:inline text-xs sm:text-sm md:mr-10">
                              {formatDuration(song.duration)}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`rounded-full size-6 sm:size-7 ${
                                songIsLiked
                                  ? "text-violet-500 hover:text-violet-400"
                                  : "text-zinc-400 hover:text-white opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSongLike(song._id);
                              }}
                              title={
                                songIsLiked
                                  ? t("player.unlike")
                                  : t("player.like")
                              }
                            >
                              <Heart
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                  songIsLiked ? "fill-violet-500" : ""
                                }`}
                              />
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
    </>
  );
};

export default GeneratedPlaylistPage;
