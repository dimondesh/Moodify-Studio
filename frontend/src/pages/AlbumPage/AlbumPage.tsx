// frontend/src/pages/AlbumPage/AlbumPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusicStore } from "../../stores/useMusicStore";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import {
  CheckCircle2,
  Clock,
  Pause,
  Play,
  PlusCircle,
  Heart,
} from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import Equalizer from "../../components/ui/equalizer";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { format } from "date-fns";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ
import { Helmet } from "react-helmet-async";

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const AlbumPage = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { fetchAlbumbyId, currentAlbum, isLoading } = useMusicStore();
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();
  const { albums, toggleAlbum, likedSongs, toggleSongLike } = useLibraryStore();
  const [inLibrary, setInLibrary] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { extractColor } = useDominantColor();
  const dominantColor = usePlayerStore((state) => state.dominantColor);
  const currentAlbumImage = currentAlbum?.imageUrl;

  useEffect(() => {
    if (!currentAlbum) return;
    const exists = albums.some(
      (a) => a._id.toString() === currentAlbum._id.toString()
    );
    setInLibrary(exists);
  }, [albums, currentAlbum]);

  useEffect(() => {
    if (currentAlbumImage) {
      extractColor(currentAlbum.imageUrl);
    }
  }, [currentAlbum?.imageUrl, currentAlbumImage, extractColor]);

  const handleToggleAlbum = async () => {
    if (!currentAlbum || isToggling) return;
    setIsToggling(true);
    await toggleAlbum(currentAlbum._id);
    setIsToggling(false);
  };

  useEffect(() => {
    if (albumId) fetchAlbumbyId(albumId);
  }, [albumId, fetchAlbumbyId]);

  if (isLoading)
    return (
      <Helmet>
        <title>Loading Album...</title>
      </Helmet>
    );

  if (!currentAlbum) {
    return (
      <>
        <Helmet>
          <title>Album Not Found | Moodify</title>
          <meta
            name="description"
            content="Sorry, the requested album could not be found on Moodify."
          />
        </Helmet>
        <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
          <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
            {t("pages.album.notFoundTitle")}
          </h1>
          <p className="text-zinc-400">{t("pages.album.notFoundDesc")}</p>
        </div>
      </>
    );
  }
  const artistNames = currentAlbum.artist.map((a) => a.name).join(", ");
  const metaDescription = `Listen to the album "${currentAlbum.title}" by ${artistNames}. Released in ${currentAlbum.releaseYear}. Available now on Moodify.`;
  const handlePlayAlbum = () => {
    const isCurrentAlbumPlaying = currentAlbum.songs.some(
      (song) => song._id === currentSong?._id
    );
    if (isCurrentAlbumPlaying) togglePlay();
    else {
      playAlbum(currentAlbum.songs, 0);
    }
  };

  const handlePlaySong = (index: number) => {
    playAlbum(currentAlbum.songs, index);
  };

  const handleArtistClick = (artistId: string) => {
    navigate(`/artists/${artistId}`);
  };

  const handleAlbumTitleClick = (albumId: string | null | undefined) => {
    if (albumId) {
      navigate(`/albums/${albumId}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`${currentAlbum.title} - ${artistNames} | Moodify`}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>
      <div className="h-full">
        <ScrollArea className="h-full rounded-md pb- md:pb-0">
          <div className="relative min-h-screen">
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background: `linear-gradient(to bottom, ${dominantColor} 0%, rgba(20, 20, 20, 0.8) 50%, #18181b 100%)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6 pb-8 sm:pb-8 items-center sm:items-end">
                <img
                  src={currentAlbum.imageUrl}
                  alt={currentAlbum.title}
                  className="w-48 h-48 sm:w-[200px] sm:h-[200px] lg:w-[240px] lg:h-[240px] shadow-xl rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default-album-cover.png";
                  }}
                />
                <div className="flex flex-col justify-end text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-medium ">
                    {currentAlbum.type || t("pages.album.type")}
                  </p>
                  <h1
                    className={`
                    ${
                      currentAlbum.title.length > 25
                        ? "text-3xl sm:text-4xl lg:text-5xl"
                        : "text-4xl sm:text-5xl lg:text-7xl"
                    } 
                    font-bold mt-2 mb-2 sm:my-4 break-words
                  `}
                  >
                    {currentAlbum.title}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 text-xs sm:text-sm text-zinc-100">
                    <span className="font-medium text-white">
                      {currentAlbum.artist.map((artist, index) => (
                        <span key={artist._id}>
                          <button
                            onClick={() => handleArtistClick(artist._id)}
                            className="hover:underline focus:outline-none focus:underline cursor-pointer"
                          >
                            {artist.name}
                          </button>
                          {index < currentAlbum.artist.length - 1 && ", "}
                        </span>
                      ))}
                    </span>
                    <span>
                      • {currentAlbum.songs.length}{" "}
                      {currentAlbum.songs.length !== 1
                        ? t("pages.album.songs")
                        : t("pages.album.song")}
                    </span>
                    <span>• {currentAlbum.releaseYear}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 pb-4 flex items-center gap-4 sm:gap-6 ">
                <Button
                  onClick={handlePlayAlbum}
                  size="icon"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500 hover:bg-violet-400
                hover:scale-105 transition-all"
                >
                  {isPlaying &&
                  currentAlbum.songs.some(
                    (song) => song._id === currentSong?._id
                  ) ? (
                    <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-black fill-current" />
                  )}
                </Button>
                {currentAlbum && (
                  <Button
                    onClick={handleToggleAlbum}
                    disabled={isToggling}
                    variant="ghost"
                    size="icon"
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-transparent p-2 hover:border-white/20 transition-colors ${
                      inLibrary ? "hover:bg-white/20" : "hover:bg-white/10"
                    }`}
                    title={
                      inLibrary
                        ? t("pages.album.actions.removeFromLibrary")
                        : t("pages.album.actions.addToLibrary")
                    }
                  >
                    {inLibrary ? (
                      <CheckCircle2 className="size-6 sm:size-8 text-violet-400" />
                    ) : (
                      <PlusCircle className="size-6 sm:size-8 text-white" />
                    )}
                  </Button>
                )}
              </div>

              <div className="bg-black/20 backdrop-blur-sm">
                <div
                  className="grid grid-cols-[16px_4fr_1.5fr_min-content] md:grid-cols-[16px_3.6fr_1.85fr_1.15fr_min-content] gap-4 px-4 sm:px-6 md:px-10 py-2 text-sm
            text-zinc-400 border-b border-white/5"
                >
                  <div>#</div>
                  <div>{t("pages.album.headers.title")}</div>
                  <div className="hidden md:flex justify-between">
                    {t("pages.album.headers.releaseDate")}
                  </div>
                  <div>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div></div>
                </div>

                <div className="px-4 sm:px-6">
                  <div className="space-y-2 py-4">
                    {currentAlbum.songs.map((song, index) => {
                      const isCurrentSong = currentSong?._id === song._id;
                      const songIsLiked = likedSongs.some(
                        (likedSong) => likedSong._id === song._id
                      );

                      return (
                        <div
                          key={song._id}
                          onClick={() => handlePlaySong(index)}
                          className={`grid grid-cols-[16px_4fr_1fr_min-content] md:grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 py-2 text-sm
                      text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer
                      ${isCurrentSong ? "bg-white/10" : ""}`}
                        >
                          <div className="flex items-center justify-center">
                            {isCurrentSong && isPlaying ? (
                              <div className="z-10">
                                <Equalizer />
                              </div>
                            ) : (
                              <span className="group-hover:hidden">
                                {index + 1}
                              </span>
                            )}
                            {!isCurrentSong && (
                              <Play className="h-4 w-4 hidden group-hover:block" />
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <img
                              src={song.imageUrl || "/default-song-cover.png"}
                              alt={song.title}
                              className="size-10 object-cover rounded-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/default-song-cover.png";
                              }}
                            />
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAlbumTitleClick(song.albumId);
                                }}
                                className={`font-medium text-left hover:underline focus:outline-none focus:underline ${
                                  isCurrentSong
                                    ? "text-violet-400"
                                    : "text-white"
                                }`}
                              >
                                {song.title}
                              </button>
                              <div className="text-zinc-400">
                                {song.artist.map((artist, artistIndex) => (
                                  <span key={artist._id}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArtistClick(artist._id);
                                      }}
                                      className="hover:underline focus:outline-none focus:underline"
                                    >
                                      {artist.name}
                                    </button>
                                    {artistIndex < song.artist.length - 1 &&
                                      ", "}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="items-center hidden md:flex justify-baseline text-xs">
                            {song.createdAt
                              ? format(new Date(song.createdAt), "MMM dd, yyyy")
                              : "N/A"}
                          </div>
                          <div className="flex items-center">
                            {formatDuration(song.duration)}
                          </div>
                          <div className="flex items-center justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`rounded-full ${
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
                                className={`h-5 w-5 ${
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

export default AlbumPage;
