// frontend/src/pages/PlaylistPage/PlaylistDetailsPage.tsx

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import PlaylistDetailsSkeleton from "../../components/ui/skeletons/PlaylistDetailsSkeleton";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import {
  Play,
  Pause,
  PlusCircle,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  X,
  Clock,
  Heart,
  Lock,
  Unlock,
} from "lucide-react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Song, Playlist } from "../../types";
import { useAuthStore } from "../../stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useSearchStore } from "../../stores/useSearchStore";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { EditPlaylistDialog } from "./EditPlaylistDialog";
import Equalizer from "../../components/ui/equalizer";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { DownloadButton } from "@/components/ui/DownloadButton";

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const PlaylistDetailsPage = () => {
  const { t } = useTranslation();
  const { playlistId } = useParams<{ playlistId: string }>();
  const {
    currentPlaylist,
    error,
    fetchPlaylistDetails,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  } = usePlaylistStore();

  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const {
    playlists: libraryPlaylists,
    togglePlaylist,
    likedSongs,
    toggleSongLike,
  } = useLibraryStore();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddSongDialogOpen, setIsAddSongDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [songToDeleteId, setSongToDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTogglingLibrary, setIsTogglingLibrary] = useState(false);

  const { extractColor } = useDominantColor();
  const [isColorLoading, setIsColorLoading] = useState(true);
  const [localIsLoading, setLocalIsLoading] = useState(true);

  const backgroundKeyRef = useRef(0);
  const [backgrounds, setBackgrounds] = useState([
    { key: 0, color: "#18181b" },
  ]);

  const {
    songs: searchSongs,
    loading: searchLoading,
    search: performSearch,
  } = useSearchStore();
  const {
    playAlbum,
    setCurrentSong,
    togglePlay,
    isPlaying,
    currentSong,
    queue,
  } = usePlayerStore();

  const isInLibrary = currentPlaylist
    ? libraryPlaylists.some((p: Playlist) => p._id === currentPlaylist._id)
    : false;

  useEffect(() => {
    const loadPlaylist = async () => {
      setLocalIsLoading(true);
      if (playlistId) {
        await fetchPlaylistDetails(playlistId);
      }
      setLocalIsLoading(false);
    };
    loadPlaylist();
  }, [playlistId, fetchPlaylistDetails]);

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

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, performSearch]);

  const handlePlayPlaylist = () => {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    const isCurrentPlaylistPlaying =
      isPlaying &&
      currentSong &&
      queue.length > 0 &&
      currentPlaylist.songs.some((song) => song._id === currentSong._id) &&
      queue[0]?._id === currentPlaylist.songs[0]?._id;
    if (isCurrentPlaylistPlaying) {
      togglePlay();
    } else {
      playAlbum(currentPlaylist.songs, 0);
    }
  };

  const handlePlaySong = (song: Song, index: number) => {
    if (!currentPlaylist) return;
    const isThisPlaylistInPlayer =
      queue.length > 0 &&
      currentPlaylist.songs.some((s) => s._id === queue[0]?._id);
    if (isThisPlaylistInPlayer) {
      if (currentSong?._id === song._id) {
        togglePlay();
      } else {
        setCurrentSong(song);
        playAlbum(currentPlaylist.songs, index);
      }
    } else {
      playAlbum(currentPlaylist.songs, index);
    }
  };

  const handleSongTitleClick = (albumId: string | null | undefined) => {
    if (albumId) {
      navigate(`/albums/${albumId}`);
    }
  };

  const handleArtistNameClick = (artistId: string) =>
    navigate(`/artists/${artistId}`);
  const handleOwnerClick = () => {
    if (currentPlaylist?.owner?._id)
      navigate(`/users/${currentPlaylist.owner._id}`);
  };
  const isOwner = authUser && currentPlaylist?.owner?._id === authUser.id;

  const handleDeletePlaylistConfirm = async () => {
    if (!currentPlaylist || !isOwner) {
      toast.error("You don't have permission to delete this playlist.");
      return;
    }
    try {
      await deletePlaylist(currentPlaylist._id);
      toast.success("Playlist successfully deleted!");
      navigate("/library");
    } catch (e) {
      toast.error("Failed to delete playlist.");
      console.error("Error deleting playlist:", e);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteSongConfirm = async () => {
    if (!songToDeleteId || !currentPlaylist || !isOwner) {
      toast.error("Error deleting song.");
      return;
    }
    try {
      await removeSongFromPlaylist(currentPlaylist._id, songToDeleteId);
      toast.success("Song successfully removed from playlist!");
      await fetchPlaylistDetails(currentPlaylist._id);
    } catch (e) {
      toast.error("Failed to remove song.");
      console.error("Error removing song:", e);
    } finally {
      setSongToDeleteId(null);
    }
  };

  const handleAddSongToPlaylist = async (songId: string) => {
    if (!currentPlaylist) return;
    try {
      await addSongToPlaylist(currentPlaylist._id, songId);
      toast.success("Song added to playlist!");
      await fetchPlaylistDetails(currentPlaylist._id);
    } catch (e) {
      toast.error("Failed to add song.");
      console.error("Error adding song:", e);
    }
  };

  const handleRemoveSong = (songId: string) => {
    if (!currentPlaylist || !isOwner) {
      toast.error(
        "You don't have permission to remove songs from this playlist."
      );
      return;
    }
    setSongToDeleteId(songId);
  };

  const handleTogglePlaylistInLibrary = async () => {
    if (!currentPlaylist || isTogglingLibrary) return;
    setIsTogglingLibrary(true);
    try {
      await togglePlaylist(currentPlaylist._id);
      toast.success(
        isInLibrary
          ? "Playlist removed from library!"
          : "Playlist added to library!"
      );
    } catch (e) {
      toast.error("Failed to change playlist status in library.");
      console.error("Error adding/removing playlist from library:", e);
    } finally {
      setIsTogglingLibrary(false);
    }
  };

  if (localIsLoading || isColorLoading) {
    return (
      <>
        <Helmet>
          <title>Loading Playlist...</title>
        </Helmet>
        <PlaylistDetailsSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white text-center">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
          {t("pages.playlist.errorTitle")}
        </h1>
        <p className="text-red-500">
          {t("pages.playlist.error")}: {error}
        </p>
      </div>
    );
  }

  if (!currentPlaylist) {
    return (
      <>
        <Helmet>
          <title>Playlist Not Found</title>
          <meta
            name="description"
            content="Sorry, the requested playlist could not be found or is private."
          />
        </Helmet>
        <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white text-center">
          <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
            {t("pages.playlist.notFoundTitle")}
          </h1>
          <p className="text-zinc-400">{t("pages.playlist.notFoundDesc")}</p>
        </div>
      </>
    );
  }

  const totalDurationSeconds = currentPlaylist.songs.reduce(
    (acc, song) => acc + song.duration,
    0
  );
  const totalMinutes = Math.floor(totalDurationSeconds / 60);
  const remainingSeconds = totalDurationSeconds % 60;
  const formattedDuration = `${totalMinutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
  const isCurrentPlaylistPlaying =
    isPlaying &&
    currentPlaylist.songs.length > 0 &&
    queue.length > 0 &&
    currentSong &&
    currentPlaylist.songs.some((song) => song._id === currentSong._id) &&
    queue[0]?._id === currentPlaylist.songs[0]?._id;

  const ownerName = currentPlaylist.owner?.fullName || "a user";
  const metaDescription = `Listen to "${
    currentPlaylist.title
  }", a playlist by ${ownerName} on Moodify. Features ${
    currentPlaylist.songs.length
  } songs. ${currentPlaylist.description || ""}`;

  return (
    <>
      <Helmet>
        <title>{`${currentPlaylist.title} by ${ownerName}`}</title>
        <meta name="description" content={metaDescription.substring(0, 160)} />
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
                  className={`absolute inset-0 pointer-events-none  ${
                    index === 1 ? "animate-fade-in" : ""
                  }`}
                  aria-hidden="true"
                  style={{
                    background: `linear-gradient(to bottom, ${bg.color} 0%, rgba(20, 20, 20, 0.8) 50%, #18181b 100%)`,
                  }}
                />
              ))}
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6 pb-8 sm:pb-8 items-center sm:items-end text-center sm:text-left">
                <img
                  src={
                    currentPlaylist.imageUrl ||
                    "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png"
                  }
                  alt={currentPlaylist.title}
                  className="w-48 h-48 sm:w-[200px] sm:h-[200px] lg:w-[240px] lg:h-[240px] shadow-xl rounded-md object-cover flex-shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex flex-col justify-end flex-grow">
                  <p className="text-xs sm:text-sm font-medium">
                    {t("pages.playlist.type")}
                  </p>
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-2 sm:my-4">
                    {currentPlaylist.title}
                  </h1>
                  {currentPlaylist.description && (
                    <p className="text-zinc-400 text-base mt-2">
                      {currentPlaylist.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 text-xs sm:text-sm text-zinc-100 mt-2">
                    {isOwner ? (
                      <>
                        {currentPlaylist.isPublic ? (
                          <Unlock className="size-3.5" />
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                      </>
                    ) : (
                      <></>
                    )}{" "}
                    <button
                      onClick={handleOwnerClick}
                      className="font-semibold text-white flex items-center hover:underline focus:outline-none focus:underline"
                    >
                      <img
                        src={currentPlaylist.owner.imageUrl}
                        className="size-4 rounded-full mr-1"
                        alt={currentPlaylist.owner.fullName}
                      />
                      {currentPlaylist.owner?.fullName ||
                        t("common.unknownArtist")}
                    </button>
                    <span className="hidden lg:inline">
                      • {currentPlaylist.songs.length}{" "}
                      {currentPlaylist.songs.length !== 1
                        ? t("pages.playlist.songs")
                        : t("pages.playlist.song")}
                    </span>
                    {currentPlaylist.songs.length > 0 && (
                      <span className="hidden lg:inline">
                        • {formattedDuration}
                      </span>
                    )}
                    {currentPlaylist.likes > 0 && (
                      <span className="hidden lg:inline">
                        • {currentPlaylist.likes} {t("pages.playlist.saved")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 pb-4 flex flex-wrap  sm:justify-start items-center gap-3 sm:gap-6">
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
                {!isOwner ? (
                  <>
                    <Button
                      onClick={handleTogglePlaylistInLibrary}
                      disabled={isTogglingLibrary}
                      variant="ghost"
                      size="icon"
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-transparent p-2 hover:border-white/20 transition-colors flex-shrink-0 ${
                        isInLibrary ? "hover:bg-white/20" : "hover:bg-white/10"
                      }`}
                      title={
                        isInLibrary
                          ? t("pages.playlist.actions.removeFromLibrary")
                          : t("pages.playlist.actions.addToLibrary")
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
                      itemType="playlists"
                      itemTitle={currentPlaylist.title}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 sm:w-10 sm:h-10 hover:bg-zinc-800 text-white flex-shrink-0"
                      onClick={() => setIsAddSongDialogOpen(true)}
                      title={t("pages.playlist.actions.addSong")}
                    >
                      <Plus className="size-4 sm:size-5" />
                    </Button>
                    <DownloadButton
                      itemId={currentPlaylist._id}
                      itemType="playlists"
                      itemTitle={currentPlaylist.title}
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 sm:w-10 sm:h-10 hover:bg-zinc-800 text-white flex-shrink-0"
                          title={t("pages.playlist.actions.moreActions")}
                        >
                          <MoreHorizontal className="size-4 sm:size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-zinc-800 text-white border-zinc-700">
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-zinc-700"
                          onClick={() => setIsEditDialogOpen(true)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t("pages.playlist.actions.edit")}
                        </DropdownMenuItem>
                        <AlertDialog
                          open={isDeleteDialogOpen}
                          onOpenChange={setIsDeleteDialogOpen}
                        >
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-400 hover:bg-zinc-700 hover:text-red-300"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("pages.playlist.actions.delete")}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-900 text-white border-zinc-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                {t("pages.playlist.deleteDialog.title")}
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                {t("pages.playlist.deleteDialog.description")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-zinc-700 text-white hover:bg-zinc-600 border-none">
                                {t("pages.playlist.deleteDialog.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 text-white hover:bg-red-700"
                                onClick={handleDeletePlaylistConfirm}
                              >
                                {t("pages.playlist.deleteDialog.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              <div className="bg-black/20 backdrop-blur-sm">
                <div className="grid grid-cols-[35px_1fr_2fr_min-content] md:grid-cols-[16px_6fr_1.2fr_4fr_min-content] gap-4 px-4 sm:px-6 md:px-10 py-2 text-sm text-zinc-400 border-b border-white/5">
                  <div>#</div>
                  <div>{t("pages.playlist.headers.title")}</div>
                  <div className="hidden md:block">
                    {t("pages.playlist.headers.dateAdded")}
                  </div>
                  <div className="flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="hidden md:block"></div>
                </div>
                <div className="px-4 sm:px-6">
                  <div className="space-y-2 py-4">
                    {currentPlaylist.songs.map((song, index) => {
                      const isCurrentSong = currentSong?._id === song._id;
                      const songIsLiked = likedSongs.some(
                        (likedSong) => likedSong._id === song._id
                      );
                      return (
                        <div
                          key={song._id}
                          onClick={(e) => {
                            if (!(e.target as HTMLElement).closest("button"))
                              handlePlaySong(song, index);
                          }}
                          className={`grid grid-cols-[16px_4fr_1fr_min-content] md:grid-cols-[16px_4fr_2fr_1fr_min-content] gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 rounded-md group cursor-pointer ${
                            isCurrentSong ? "bg-white/10" : ""
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {isCurrentSong && isPlaying ? (
                              <div className="z-10">
                                <Equalizer />
                              </div>
                            ) : (
                              <span className="group-hover:hidden text-xs sm:text-sm">
                                {index + 1}
                              </span>
                            )}
                            {!isCurrentSong && (
                              <Play className="h-3 w-3 sm:h-4 sm:w-4 hidden group-hover:block" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSongTitleClick(song.albumId);
                              }}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSongTitleClick(song.albumId);
                                }}
                                className={`font-medium w-full text-left hover:underline focus:outline-none focus:underline ${
                                  isCurrentSong
                                    ? "text-violet-400"
                                    : "text-white"
                                }`}
                              >
                                <p className="truncate">{song.title}</p>
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
                                  : "text-zinc-400 hover:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-zinc-700 text-zinc-400 hover:text-red-400 rounded-full size-6 sm:size-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSong(song._id);
                                }}
                                title={t("pages.playlist.actions.removeSong")}
                              >
                                <X className="size-3 sm:size-4" />
                              </Button>
                            )}
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

        {currentPlaylist && (
          <EditPlaylistDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            playlist={currentPlaylist}
            onSuccess={() => fetchPlaylistDetails(currentPlaylist._id)}
          />
        )}
        <Dialog
          open={isAddSongDialogOpen}
          onOpenChange={setIsAddSongDialogOpen}
        >
          <DialogContent className="sm:w-[60%vw] w-[40%vw] bg-zinc-900 text-white border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white max-w-[80vw]">
                {t("pages.playlist.addSongDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 max-w-[80vw]">
                {t("pages.playlist.addSongDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder={t(
                  "pages.playlist.addSongDialog.searchPlaceholder"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4 bg-zinc-800 text-white border-zinc-700 focus:ring-green-500 w-[80vw] sm:w-[55vw] md:w-[38vw] lg:w-[19.5vw] 2xl:w-[18vw]"
              />
              {searchLoading ? (
                <p className="text-zinc-400">
                  {t("pages.playlist.addSongDialog.searching")}
                </p>
              ) : searchSongs.length === 0 && searchTerm.length > 0 ? (
                <p className="text-zinc-400">
                  {t("pages.playlist.addSongDialog.noSongsFound")}
                </p>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {searchSongs.map((song) => (
                      <div
                        key={song._id}
                        className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded-md cursor-pointer sm:w-[55vw] md:w-[38vw] w-[80vw] lg:w-[20vw] 2xl:w-[18vw]"
                      >
                        <div className="flex flex-col truncate">
                          <button
                            onClick={() => handleSongTitleClick(song.albumId)}
                            className="font-semibold text-white truncate text-left hover:underline focus:outline-none focus:underline"
                          >
                            {song.title}
                          </button>
                          <span className="text-sm text-zinc-400 truncate">
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
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddSongToPlaylist(song._id)}
                          className="bg-green-500 hover:bg-green-600 text-white ml-4 flex-shrink-0"
                          disabled={currentPlaylist?.songs.some(
                            (s) => s._id === song._id
                          )}
                        >
                          {currentPlaylist?.songs.some(
                            (s) => s._id === song._id
                          )
                            ? t("pages.playlist.addSongDialog.added")
                            : t("pages.playlist.addSongDialog.add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!songToDeleteId}
          onOpenChange={(open) => {
            if (!open) setSongToDeleteId(null);
          }}
        >
          <AlertDialogContent className="bg-zinc-900 text-white border-zinc-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                {t("pages.playlist.removeSongDialog.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                {t("pages.playlist.removeSongDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-700 text-white hover:bg-zinc-600 border-none">
                {t("pages.playlist.removeSongDialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteSongConfirm}
              >
                {t("pages.playlist.removeSongDialog.remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default PlaylistDetailsPage;
