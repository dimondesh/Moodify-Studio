// /home/dmytro/VS_Projects/Moodify/frontend/src/layout/LeftSidebar.tsx

import {
  Heart,
  HomeIcon,
  Library,
  MessageCircle,
  Search,
  Plus,
  LibraryIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button, buttonVariants } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import PlaylistSkeleton from "../components/ui/skeletons/PlaylistSkeleton";
import { useEffect, useState } from "react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlaylistStore } from "../stores/usePlaylistStore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { CreatePlaylistDialog } from "../pages/PlaylistPage/CreatePlaylistDialog";
import {
  LibraryItem,
  AlbumItem,
  PlaylistItem,
  Artist,
  LikedSongsItem,
  FollowedArtistItem,
} from "../types";
import { useMusicStore } from "../stores/useMusicStore";

const LeftSidebar = () => {
  const {
    albums,
    playlists, // добавленные в библиотеку
    followedArtists, // Добавлено для подписанных артистов
    fetchLibrary,
    isLoading: isLoadingLibrary,
  } = useLibraryStore();

  const {
    myPlaylists,
    fetchMyPlaylists,
    isLoading: isLoadingPlaylists,
  } = usePlaylistStore();

  const [user, loadingUser] = useAuthState(auth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    if (user && !loadingUser) {
      fetchLibrary();
      fetchMyPlaylists();
    }
    fetchArtists();
  }, [fetchLibrary, fetchMyPlaylists, user, loadingUser, fetchArtists]);

  const getArtistNames = (artistsData: string[] | Artist[] | undefined) => {
    if (!artistsData || artistsData.length === 0) return "Unknown Artist";

    const names = artistsData
      .map((item) => {
        if (typeof item === "string") {
          const artist = artists.find((a) => a._id === item);
          return artist ? artist.name : null;
        } else if (item && typeof item === "object" && "name" in item) {
          return (item as Artist).name;
        }
        return null;
      })
      .filter(Boolean);

    return names.join(", ") || "Unknown Artist";
  };

  const isLoading = isLoadingLibrary || isLoadingPlaylists || loadingUser;

  // --- Логика дедупликации плейлистов ---
  const allPlaylistsMap = new Map<string, PlaylistItem>();

  (myPlaylists || []).forEach((playlist) => {
    allPlaylistsMap.set(playlist._id, {
      _id: playlist._id,
      type: "playlist" as const,
      title: playlist.title,
      imageUrl: playlist.imageUrl,
      createdAt: new Date(playlist.updatedAt ?? new Date()),
      owner: playlist.owner,
    });
  });

  (playlists || []).forEach((playlist) => {
    if (!allPlaylistsMap.has(playlist._id)) {
      allPlaylistsMap.set(playlist._id, {
        _id: playlist._id,
        type: "playlist" as const,
        title: playlist.title,
        imageUrl: playlist.imageUrl,
        createdAt: new Date(playlist.addedAt ?? new Date()),
        owner: playlist.owner,
      });
    }
  });

  const uniquePlaylists = Array.from(allPlaylistsMap.values());
  // --- КОНЕЦ ЛОГИКИ ДЕДУПЛИКАЦИИ ---

  // 📌 Объединяем все элементы библиотеки в общий список LibraryItem[]
  const libraryItems: LibraryItem[] = [
    ...(albums || []).map((album) => ({
      _id: album._id,
      type: "album" as const,
      title: album.title,
      imageUrl: album.imageUrl,
      createdAt: new Date(album.addedAt ?? new Date()),
      artist: album.artist,
      albumType: album.type,
    })),

    ...uniquePlaylists,

    // Добавляем подписанных артистов с использованием addedAt для createdAt
    ...(followedArtists || []).map((artist) => ({
      _id: artist._id,
      type: "artist" as const,
      title: artist.name, // Явно используем artist.name
      imageUrl: artist.imageUrl,
      // ИСПОЛЬЗУЕМ artist.addedAt, которое теперь есть в типе Artist
      createdAt: new Date(artist.addedAt || artist.createdAt), // Используем addedAt, если есть, иначе createdAt артиста
      artistId: artist._id,
    })),
    // УДАЛЕНО: Liked Songs больше не рендерятся в этом списке
    // ...(likedSongs.length > 0
    //   ? [
    //       {
    //         _id: "liked-songs",
    //         type: "liked-songs",
    //         title: "Liked Songs",
    //         imageUrl: "/liked.png",
    //         songsCount: likedSongs.length,
    //         createdAt: new Date(likedSongs[0]?.likedAt || Date.now()),
    //       } as LikedSongsItem,
    //     ]
    //   : []),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Сортируем по дате создания/добавления

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="rounded-lg bg-zinc-900 p-4">
        <div className="space-y-2">
          <Link
            to="/"
            className={cn(
              buttonVariants({
                variant: "ghost",
                className: "w-full justify-start text-white hover:bg-zinc-800",
              })
            )}
          >
            <HomeIcon className="mr-2 size-5" />
            <span>Home</span>
          </Link>

          <Link
            to="/search"
            className={cn(
              buttonVariants({
                variant: "ghost",
                className: "w-full justify-start text-white hover:bg-zinc-800",
              })
            )}
          >
            <Search className="mr-2 size-5" />
            <span>Search</span>
          </Link>

          {user && (
            <Link
              to="/chat"
              className={cn(
                buttonVariants({
                  variant: "ghost",
                  className:
                    "w-full justify-start text-white hover:bg-zinc-800",
                })
              )}
            >
              <MessageCircle className="mr-2 size-5" />
              <span>Messages</span>
            </Link>
          )}

          {user && (
            <Link
              to="/liked-songs"
              className={cn(
                buttonVariants({
                  variant: "ghost",
                  className:
                    "w-full justify-start text-white hover:bg-zinc-800",
                })
              )}
            >
              <Heart className="mr-2 size-5" />
              <span>Liked Songs</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 rounded-lg bg-zinc-900 p-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-white px-2">
            <Library className="size-5 mr-2" />
            <span>Your Library</span>
          </div>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-zinc-800"
              onClick={() => setIsCreateDialogOpen(true)}
              title="Create new playlist"
            >
              <Plus className="size-5" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <PlaylistSkeleton />
        ) : !user ? (
          <LoginPrompt className="flex-1" />
        ) : libraryItems.length === 0 ? (
          <p className="text-zinc-400 px-2">No items in your library.</p>
        ) : (
          <ScrollArea className="flex-1 h-full pb-7">
            <div className="space-y-2">
              {libraryItems.map((item) => {
                let linkPath: string;
                let subtitle: string;
                let fallbackImage: string;
                let imageClass = "rounded-md"; // По умолчанию квадратные

                if (item.type === "album") {
                  const albumItem = item as AlbumItem; // Явное приведение
                  linkPath = `/albums/${albumItem._id}`;
                  subtitle = `${
                    albumItem.albumType || "Album"
                  } • ${getArtistNames(albumItem.artist)}`;
                  fallbackImage = "/default-album-cover.png";
                } else if (item.type === "playlist") {
                  const playlistItem = item as PlaylistItem; // Явное приведение
                  linkPath = `/playlists/${playlistItem._id}`;
                  subtitle = `Playlist • ${
                    playlistItem.owner?.fullName || "Unknown"
                  }`;
                  fallbackImage = "/default-album-cover.png";
                } else if (item.type === "liked-songs") {
                  // Этот блок больше не должен вызываться, т.к. LikedSongsItem удален из libraryItems
                  // Но оставлен для полноты, если вдруг тип попадет сюда
                  const likedItem = item as LikedSongsItem;
                  linkPath = "/liked-songs";
                  subtitle = `Playlist • ${likedItem.songsCount} ${
                    likedItem.songsCount !== 1 ? "songs" : "song"
                  }`;
                  fallbackImage = "/liked.png";
                } else if (item.type === "artist") {
                  const artistItem = item as FollowedArtistItem; // Явное приведение
                  linkPath = `/artists/${artistItem._id}`;
                  subtitle = `Artist`;
                  fallbackImage = "/default-album-cover.png";
                  imageClass = "rounded-full"; // Круглые аватарки для артистов
                } else {
                  // Fallback для неизвестных типов, хотя LibraryItem должен покрывать все
                  linkPath = "#";
                  subtitle = "";
                  fallbackImage = "/default-album-cover.png";
                }

                return (
                  <Link
                    to={linkPath}
                    key={item._id}
                    className="p-2 hover:bg-zinc-800 rounded-md flex items-center gap-3 group cursor-pointer"
                  >
                    <img
                      src={item.imageUrl || fallbackImage}
                      alt={item.title}
                      className={`size-12 object-cover ${imageClass} flex-shrink-0`} // Применяем imageClass
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-md truncate text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-zinc-400 truncate">
                        {subtitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <CreatePlaylistDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
};

export default LeftSidebar;

const LoginPrompt = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center p-6 text-center space-y-4",
      className
    )}
  >
    <div className="relative">
      <div
        className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full blur-lg
       opacity-75 animate-pulse"
        aria-hidden="true"
      />
      <div className="relative bg-zinc-900 rounded-full p-4">
        <LibraryIcon className="size-8 text-emerald-400" />
      </div>
    </div>

    <div className="space-y-2 max-w-[250px]">
      <h3 className="text-lg font-semibold text-white">
        Login to see your Library
      </h3>
      <p className="text-sm text-zinc-400">
        Sign in to manage your music collection
      </p>
    </div>
  </div>
);
