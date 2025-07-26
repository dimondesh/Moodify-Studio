/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
import PlaylistDetailsSkeleton from "../../components/ui/skeletons/PlaylistDetailsSkeleton";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import {
  Play,
  Pause,
  PlusCircle,
  CheckCircle2,
  Clock,
  Heart,
} from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Song } from "../../types";
import toast from "react-hot-toast";
import { useLibraryStore } from "../../stores/useLibraryStore";
import Equalizer from "../../components/ui/equalizer";
import { FastAverageColor } from "fast-average-color";
import { useMixesStore } from "../../stores/useMixesStore";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60); // Используем Math.floor для целых секунд
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};
const fac = new FastAverageColor();

const MixDetailsPage = () => {
  const { mixId } = useParams<{ mixId: string }>();
  const navigate = useNavigate();

  const { currentMix, error, fetchMixById } = useMixesStore();
  const { likedSongs, isMixSaved, toggleMixInLibrary, toggleSongLike } =
    useLibraryStore();
  const { playAlbum, togglePlay, isPlaying, currentSong, queue } =
    usePlayerStore();

  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [isTogglingLibrary, setIsTogglingLibrary] = useState(false);
  const [dominantColor, setDominantColor] = useState("#18181b");

  useEffect(() => {
    const imageUrl = currentMix?.imageUrl;
    if (imageUrl && imageUrl.trim() !== "") {
      fac
        .getColorAsync(imageUrl)
        .then((color) => {
          setDominantColor(color.hex);
        })
        .catch(() => {
          setDominantColor("#18181b");
        });
    } else {
      setDominantColor("#18181b");
    }
  }, [currentMix?.imageUrl]);

  const isInLibrary = mixId ? isMixSaved(mixId) : false;

  useEffect(() => {
    const loadMix = async () => {
      setLocalIsLoading(true);
      if (mixId) {
        await fetchMixById(mixId);
      }
      setLocalIsLoading(false);
    };

    loadMix();
  }, [mixId, fetchMixById]);

  const handlePlayMix = () => {
    if (!currentMix || currentMix.songs.length === 0) return;

    const isThisMixInPlayer =
      isPlaying &&
      currentSong &&
      queue.length > 0 &&
      currentMix.songs.some((song) => song._id === currentSong._id);

    if (isThisMixInPlayer) {
      togglePlay();
    } else {
      playAlbum(currentMix.songs, 0);
    }
  };

  const handlePlaySong = (song: Song, index: number) => {
    if (!currentMix) return;
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      playAlbum(currentMix.songs, index);
    }
  };

  const handleSongTitleClick = (albumId: string | null | undefined) => {
    if (albumId) navigate(`/albums/${albumId}`);
  };

  const handleArtistNameClick = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  const handleToggleMixInLibrary = async () => {
    if (!mixId || isTogglingLibrary) return;
    setIsTogglingLibrary(true);
    try {
      await toggleMixInLibrary(mixId);
      toast.success(
        isInLibrary ? "Mix removed from library" : "Mix added to library"
      );
    } catch (e) {
      toast.error("Failed to update library.");
    } finally {
      setIsTogglingLibrary(false);
    }
  };

  if (localIsLoading) return <PlaylistDetailsSkeleton />;

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white text-center">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">Error</h1>
        <p className="text-red-500">Failed to load mix details: {error}</p>
      </div>
    );
  }

  if (!currentMix) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white text-center">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">Mix Not Found</h1>
        <p className="text-zinc-400">It seems this mix does not exist.</p>
      </div>
    );
  }

  const totalDurationSeconds = currentMix.songs.reduce(
    (acc, song) => acc + (song.duration || 0),
    0
  );
  const formattedDuration = formatDuration(totalDurationSeconds);
  const isCurrentMixPlaying =
    isPlaying && currentMix.songs.some((song) => song._id === currentSong?._id);

  return (
    <div className="h-full">
      <ScrollArea className="h-full rounded-md md:pb-0">
        <div className="relative min-h-screen">
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: `linear-gradient(to bottom, ${dominantColor} 0%, rgba(20, 20, 20, 0.8) 50%, #18181b 100%)`,
            }}
          />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6 pb-8 sm:pb-8 items-center sm:items-end text-center sm:text-left">
              <img
                src={currentMix.imageUrl || "/default-album-cover.png"}
                alt={currentMix.name}
                className="w-48 h-48 sm:w-[200px] sm:h-[200px] lg:w-[240px] lg:h-[240px] shadow-xl rounded-md object-cover flex-shrink-0 mx-auto sm:mx-0"
              />
              <div className="flex flex-col justify-end flex-grow">
                <p className="text-xs sm:text-sm font-medium">Daily Mix</p>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-2 sm:my-4">
                  {currentMix.name}
                </h1>
                <p className="text-zinc-400 text-base mt-2">
                  {`A daily mix based on ${currentMix.type.toLowerCase()} '${
                    currentMix.sourceName
                  }'.`}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 text-xs sm:text-sm text-zinc-100 mt-2">
                  <img
                    src="../../../public/Moodify.png"
                    alt="Moodify"
                    className="size-4"
                  />
                  <span className="font-semibold text-white">Moodify</span>
                  <span className="hidden lg:inline">
                    • {currentMix.songs.length} songs
                  </span>
                  {currentMix.songs.length > 0 && (
                    <span className="hidden lg:inline">
                      • {formattedDuration}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-4 flex flex-wrap sm:justify-start items-center gap-3 sm:gap-6">
              {currentMix.songs.length > 0 && (
                <Button
                  size="icon"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 hover:bg-violet-400 transition-colors shadow-lg flex-shrink-0 hover:scale-105"
                  onClick={handlePlayMix}
                  title={isCurrentMixPlaying ? "Pause" : "Play"}
                >
                  {isCurrentMixPlaying ? (
                    <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                  )}
                </Button>
              )}
              <Button
                onClick={handleToggleMixInLibrary}
                disabled={isTogglingLibrary}
                variant="ghost"
                size="icon"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-transparent p-2 hover:border-white/20 transition-colors flex-shrink-0 ${
                  isInLibrary ? "hover:bg-white/20" : "hover:bg-white/10"
                }`}
                title={isInLibrary ? "Remove from Library" : "Add to Library"}
              >
                {isInLibrary ? (
                  <CheckCircle2 className="size-5 sm:size-6 text-violet-400" />
                ) : (
                  <PlusCircle className="size-5 sm:size-6 text-white" />
                )}
              </Button>
            </div>

            <div className="bg-black/20 backdrop-blur-sm">
              <div className="grid grid-cols-[35px_1fr_min-content] md:grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 sm:px-6 py-2 text-sm text-zinc-400 border-b border-white/5">
                <div className="flex items-center justify-center">#</div>
                <div>Title</div>
                <div className="hidden md:block">Date Added</div>
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="hidden md:block"></div>
              </div>

              <div className="px-4 sm:px-6">
                <div className="space-y-2 py-4">
                  {currentMix.songs.map((song, index) => {
                    const isCurrentlyPlaying = currentSong?._id === song._id;
                    const songIsLiked = likedSongs.some(
                      (likedSong) => likedSong._id === song._id
                    );

                    return (
                      <div
                        key={song._id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button"))
                            return;
                          handlePlaySong(song, index);
                        }}
                        className={`grid grid-cols-[16px_4fr_1fr_min-content] md:grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer ${
                          isCurrentlyPlaying ? "bg-white/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-center">
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
                          <button
                            onClick={() => handleSongTitleClick(song.albumId)}
                          >
                            <img
                              src={song.imageUrl || "/default-song-cover.png"}
                              alt={song.title}
                              className="size-10 object-cover rounded-md flex-shrink-0"
                            />
                          </button>
                          <div className="flex flex-col overflow-hidden">
                            <button
                              onClick={() => handleSongTitleClick(song.albumId)}
                              className={`font-medium truncate text-left hover:underline focus:outline-none focus:underline ${
                                isCurrentlyPlaying
                                  ? "text-violet-400"
                                  : "text-white"
                              }`}
                            >
                              {song.title}
                            </button>
                            <div className="text-zinc-400 text-xs sm:text-sm truncate">
                              {song.artist.map((artist, artistIndex) => (
                                <span key={artist._id}>
                                  <button
                                    onClick={() =>
                                      handleArtistNameClick(artist._id)
                                    }
                                    className="hover:underline focus:outline-none focus:underline"
                                  >
                                    {artist.name}
                                  </button>
                                  {artistIndex < song.artist.length - 1 && ", "}
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

                        <div className="flex items-center text-xs sm:text-sm flex-shrink-0">
                          {formatDuration(song.duration)}
                        </div>

                        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`rounded-full size-6 sm:size-7 ${
                              songIsLiked
                                ? "text-violet-500 hover:text-violet-400"
                                : "text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSongLike(song._id);
                            }}
                            title={songIsLiked ? "Unlike song" : "Like song"}
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
  );
};

export default MixDetailsPage;
