// frontend/src/pages/LibraryPage/LibraryPage.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useMusicStore } from "../../stores/useMusicStore";
import LibraryGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import {
  LibraryItem,
  AlbumItem,
  PlaylistItem,
  Artist,
  LikedSongsItem,
  FollowedArtistItem,
  MixItem,
} from "../../types";
import { Button } from "@/components/ui/button";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";
import { CreatePlaylistDialog } from "../PlaylistPage/CreatePlaylistDialog";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Download } from "lucide-react";
import { useOfflineStore } from "../../stores/useOfflineStore";
import { cn } from "@/lib/utils";

const LibraryPage = () => {
  const { t } = useTranslation();
  const {
    likedSongs,
    albums,
    playlists,
    followedArtists,
    savedMixes,
    isLoading: isLoadingLibrary,
    error: libraryError,
    fetchLibrary,
    fetchLikedSongs,
  } = useLibraryStore();
  const {
    myPlaylists,
    isLoading: isLoadingPlaylists,
    error: playlistsError,
    fetchMyPlaylists,
  } = usePlaylistStore();
  const { artists, fetchArtists } = useMusicStore();
  const [user] = useAuthState(auth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { isDownloaded } = useOfflineStore((s) => s.actions);
  const { isOffline } = useOfflineStore.getState(); // <-- ИЗМЕНЕНИЕ

  const [activeFilter, setActiveFilter] = useState<"all" | "downloaded">("all");

  // ИЗМЕНЕНИЕ: Автоматически переключаем фильтр в офлайн-режиме
  useEffect(() => {
    if (isOffline) {
      setActiveFilter("downloaded");
    }
  }, [isOffline]);

  useEffect(() => {
    if (!isOffline) {
      // <-- ИЗМЕНЕНИЕ: Загружаем данные только если есть сеть
      fetchLibrary();
      fetchLikedSongs();
      fetchMyPlaylists();
      fetchArtists();
    }
  }, [
    isOffline,
    fetchLibrary,
    fetchLikedSongs,
    fetchMyPlaylists,
    fetchArtists,
  ]);

  const getArtistNames = (artistsInput: (string | Artist)[] | undefined) => {
    if (!artistsInput || artistsInput.length === 0)
      return t("common.unknownArtist");
    const names = artistsInput
      .map((artistOrId) => {
        if (typeof artistOrId === "string") {
          const foundArtist = artists.find((a: Artist) => a._id === artistOrId);
          return foundArtist ? foundArtist.name : null;
        } else {
          return artistOrId.name;
        }
      })
      .filter(Boolean);
    return names.join(", ") || t("common.unknownArtist");
  };

  const isLoading = (isLoadingLibrary || isLoadingPlaylists) && !isOffline;
  const combinedError: string | null =
    (libraryError as string | null) || (playlistsError as string | null);
  const errorMessage = combinedError;

  if (isLoading) return <LibraryGridSkeleton />;

  if (errorMessage && !isOffline) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">
          {t("sidebar.library")}
        </h1>
        <p className="text-red-500 mt-4 text-center">
          Error loading library: {errorMessage}
        </p>
      </div>
    );
  }

  const allPlaylistsMap = new Map<string, PlaylistItem>();
  (myPlaylists || []).forEach((playlist) => {
    allPlaylistsMap.set(playlist._id, {
      _id: playlist._id,
      type: "playlist",
      title: playlist.title,
      imageUrl: playlist.imageUrl,
      createdAt: new Date(playlist.updatedAt),
      owner: playlist.owner,
    });
  });
  (playlists || []).forEach((playlist) => {
    if (!allPlaylistsMap.has(playlist._id)) {
      allPlaylistsMap.set(playlist._id, {
        _id: playlist._id,
        type: "playlist",
        title: playlist.title,
        imageUrl: playlist.imageUrl,
        createdAt: new Date(playlist.addedAt),
        owner: playlist.owner,
      });
    }
  });
  const uniquePlaylists = Array.from(allPlaylistsMap.values());

  const libraryItems: LibraryItem[] = [
    ...(albums || []).map(
      (album) =>
        ({
          _id: album._id,
          title: album.title,
          imageUrl: album.imageUrl,
          createdAt: new Date(album.addedAt || 0),
          type: "album" as const,
          artist: album.artist,
          albumType: album.type,
        } as AlbumItem)
    ),
    ...uniquePlaylists,
    ...(savedMixes || []).map(
      (mix) =>
        ({
          _id: mix._id,
          title: mix.name,
          imageUrl: mix.imageUrl,
          createdAt: new Date(mix.addedAt || 0),
          type: "mix",
          sourceName: mix.sourceName,
        } as MixItem)
    ),
    ...(followedArtists || []).map(
      (artist) =>
        ({
          _id: artist._id,
          title: artist.name,
          imageUrl: artist.imageUrl,
          createdAt: new Date(artist.addedAt || artist.createdAt),
          type: "artist",
          artistId: artist._id,
        } as FollowedArtistItem)
    ),
    ...(likedSongs.length > 0
      ? [
          {
            _id: "liked-songs",
            type: "liked-songs",
            title: t("sidebar.likedSongs"),
            imageUrl: "/liked.png",
            createdAt: new Date(likedSongs[0]?.likedAt || Date.now()),
            songsCount: likedSongs.length,
          } as LikedSongsItem,
        ]
      : []),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // ИЗМЕНЕНИЕ: Обновляем логику фильтрации
  const filteredLibraryItems = libraryItems.filter((item) => {
    if (activeFilter === "downloaded") {
      // Исключаем типы, которые не могут быть скачаны
      if (item.type === "liked-songs" || item.type === "artist") {
        return false;
      }
      return isDownloaded(item._id);
    }
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Your Library - Moodify</title>
        <meta
          name="description"
          content="Access your saved albums, playlists, followed artists, and liked songs all in one place on Moodify."
        />
      </Helmet>
      <div className="h-full">
        <ScrollArea className="h-full rounded-md md:pb-0">
          <div className="relative min-h-screen p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-900/80 to-zinc-900 pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <div className="flex justify-between items-baseline">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-6 text-white">
                  {t("sidebar.library")}
                </h1>
                {user &&
                  !isOffline && ( // <-- ИЗМЕНЕНИЕ: Скрываем кнопку оффлайн
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-zinc-800 "
                      onClick={() => setIsCreateDialogOpen(true)}
                      title={t("sidebar.createPlaylist")}
                    >
                      <Plus className="size-6" />
                    </Button>
                  )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                {!isOffline && (
                  <Button
                    onClick={() => setActiveFilter("all")}
                    className={cn(
                      "rounded-full h-8 px-4 text-xs font-semibold",
                      activeFilter === "all"
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                    )}
                  >
                    All
                  </Button>
                )}
                <Button
                  onClick={() => setActiveFilter("downloaded")}
                  className={cn(
                    "rounded-full h-8 px-4 text-xs font-semibold",
                    activeFilter === "downloaded"
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                  )}
                >
                  Downloaded
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {filteredLibraryItems.length === 0 ? (
                  <p className="text-zinc-400 px-2">
                    {activeFilter === "downloaded"
                      ? "You have no downloaded content yet."
                      : t("sidebar.emptyLibrary")}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredLibraryItems.map((item) => {
                      let linkPath: string;
                      let subtitle: string;
                      let coverImageUrl: string | null | undefined =
                        item.imageUrl;
                      let imageClass = "rounded-md";

                      if (item.type === "liked-songs") {
                        const likedItem = item as LikedSongsItem;
                        linkPath = "/liked-songs";
                        subtitle = `${t("sidebar.subtitle.playlist")} • ${
                          likedItem.songsCount
                        } ${
                          likedItem.songsCount !== 1
                            ? t("sidebar.subtitle.songs")
                            : t("sidebar.subtitle.song")
                        }`;
                        coverImageUrl = item.imageUrl;
                      } else if (item.type === "album") {
                        const albumItem = item as AlbumItem;
                        linkPath = `/albums/${albumItem._id}`;
                        subtitle = `${
                          t(`sidebar.subtitle.${albumItem.albumType}`) ||
                          t("sidebar.subtitle.album")
                        } • ${getArtistNames(albumItem.artist)}`;
                        coverImageUrl =
                          item.imageUrl || "/default-album-cover.png";
                      } else if (item.type === "playlist") {
                        const playlistItem = item as PlaylistItem;
                        linkPath = `/playlists/${playlistItem._id}`;
                        subtitle = `${t("sidebar.subtitle.playlist")} • ${
                          playlistItem.owner?.fullName ||
                          t("common.unknownArtist")
                        }`;
                        coverImageUrl =
                          item.imageUrl || "/default-album-cover.png";
                      } else if (item.type === "artist") {
                        const artistItem = item as FollowedArtistItem;
                        linkPath = `/artists/${artistItem._id}`;
                        subtitle = t("sidebar.subtitle.artist");
                        coverImageUrl =
                          item.imageUrl || "/default-artist-cover.png";
                        imageClass = "rounded-full";
                      } else if (item.type === "mix") {
                        linkPath = `/mixes/${item._id}`;
                        subtitle = t("sidebar.subtitle.dailyMix");
                        coverImageUrl =
                          item.imageUrl || "/default-album-cover.png";
                        imageClass = "rounded-md";
                      } else {
                        linkPath = "#";
                        subtitle = "";
                        coverImageUrl = "/default-album-cover.png";
                      }
                      return (
                        <Link
                          key={item._id}
                          to={linkPath}
                          className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all cursor-pointer"
                        >
                          <div className="relative mb-4">
                            <div
                              className={`aspect-square shadow-lg overflow-hidden ${imageClass}`}
                            >
                              <img
                                src={
                                  coverImageUrl || "/default-album-cover.png"
                                }
                                alt={item.title}
                                className="w-auto h-auto object-cover transition-transform duration-300 hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/default-album-cover.png";
                                }}
                              />
                            </div>
                          </div>
                          <h3 className="font-medium mb-1 truncate text-white">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-1.5">
                            {isDownloaded(item._id) && (
                              <Download className="size-3 text-violet-400 flex-shrink-0" />
                            )}
                            <p className="text-sm text-zinc-400 truncate">
                              {subtitle}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <CreatePlaylistDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      </div>
    </>
  );
};

export default LibraryPage;
