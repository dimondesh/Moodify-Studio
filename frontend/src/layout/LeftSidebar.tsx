// /home/dmytro/VS_Projects/Moodify/frontend/src/layout/LeftSidebar.tsx

import {
  Heart,
  HomeIcon,
  Library,
  MessageCircle,
  Search,
  Plus,
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
import { HeadphonesIcon } from "lucide-react";
import { CreatePlaylistDialog } from "../pages/PlaylistPage/CreatePlaylistDialog";
import { LibraryItem, AlbumItem, PlaylistItem, Artist } from "../types";
import { useMusicStore } from "../stores/useMusicStore";

const LeftSidebar = () => {
  const {
    albums,
    playlists, // добавленные в библиотеку
    fetchLibrary,
    isLoading: isLoadingLibrary,
    error: libraryError,
  } = useLibraryStore();

  const {
    myPlaylists,
    fetchMyPlaylists,
    isLoading: isLoadingPlaylists,
    error: playlistsError,
  } = usePlaylistStore();

  const [user, loadingUser, authError] = useAuthState(auth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    if (user && !loadingUser) {
      fetchLibrary();
      fetchMyPlaylists();
    }
    fetchArtists();
  }, [fetchLibrary, fetchMyPlaylists, user, loadingUser, fetchArtists]);

  // ИЗМЕНЕНО: Обновлено определение функции getArtistNames, чтобы принимать Artist[]
  const getArtistNames = (artistsData: string[] | Artist[] | undefined) => {
    if (!artistsData || artistsData.length === 0) return "Unknown Artist";

    const names = artistsData
      .map((item) => {
        if (typeof item === "string") {
          // Если это ID артиста (строка)
          const artist = artists.find((a) => a._id === item);
          return artist ? artist.name : null;
        } else if (item && typeof item === "object" && "name" in item) {
          // Если это объект Artist
          return (item as Artist).name; // Приводим тип к Artist, чтобы получить доступ к name
        }
        return null;
      })
      .filter(Boolean); // Отфильтровываем null-значения

    return names.join(", ") || "Unknown Artist";
  };

  const isLoading = isLoadingLibrary || isLoadingPlaylists || loadingUser;
  const combinedError = libraryError || playlistsError || authError;
  const errorMessage = combinedError ? String(combinedError) : null;

  // 📌 Объединяем всё в общий список LibraryItem[]
  const libraryItems: LibraryItem[] = [
    ...albums.map((album) => ({
      _id: album._id,
      type: "album" as const,
      title: album.title,
      imageUrl: album.imageUrl,
      createdAt: new Date(album.addedAt ?? new Date()),
      artist: album.artist, // album.artist теперь Artist[], это корректно для AlbumItem
      albumType: album.type,
    })),

    ...myPlaylists.map((playlist) => ({
      _id: playlist._id,
      type: "playlist" as const,
      title: playlist.title,
      imageUrl: playlist.imageUrl,
      createdAt: new Date(playlist.updatedAt ?? new Date()),
      owner: playlist.owner,
    })),

    ...playlists.map((playlist) => ({
      _id: playlist._id,
      type: "playlist" as const,
      title: playlist.title,
      imageUrl: playlist.imageUrl,
      createdAt: new Date(playlist.addedAt ?? new Date()),
      owner: playlist.owner,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
        ) : errorMessage ? (
          <p className="text-red-500 px-2">
            Error loading library: {errorMessage}
          </p>
        ) : !user ? (
          <LoginPrompt className="flex-1" />
        ) : libraryItems.length === 0 ? (
          <p className="text-zinc-400 px-2">No items in your library.</p>
        ) : (
          <ScrollArea className="flex-1 h-full pb-7">
            <div className="space-y-2">
              {libraryItems.map((item) => {
                const linkPath =
                  item.type === "album"
                    ? `/albums/${item._id}`
                    : `/playlists/${item._id}`;

                const subtitle =
                  item.type === "album"
                    ? `${item.albumType || "Album"} • ${
                        // ИЗМЕНЕНО: Удален ненужный 'as string[] | undefined'
                        getArtistNames((item as AlbumItem).artist)
                      }`
                    : item.type === "playlist"
                    ? `Playlist • ${
                        (item as PlaylistItem).owner?.fullName || "Unknown"
                      }`
                    : "";

                const fallbackImage =
                  item.type === "album"
                    ? "/default-album-cover.png"
                    : "/default_playlist_cover.png";

                return (
                  <Link
                    to={linkPath}
                    key={item._id}
                    className="p-2 hover:bg-zinc-800 rounded-md flex items-center gap-3 group cursor-pointer"
                  >
                    <img
                      src={item.imageUrl || fallbackImage}
                      alt={item.title}
                      className="size-12 rounded-md flex-shrink-0 object-cover"
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
        <HeadphonesIcon className="size-8 text-emerald-400" />
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
