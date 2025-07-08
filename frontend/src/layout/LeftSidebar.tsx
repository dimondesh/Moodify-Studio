// frontend/src/components/LeftSidebar.tsx
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
import { Playlist } from "../types"; // Убедитесь, что Playlist импортируется

const LeftSidebar = () => {
  const {
    albums,
    fetchLibrary,
    isLoading: isLoadingAlbums,
    error: albumsError,
  } = useLibraryStore();
  const {
    myPlaylists,
    fetchMyPlaylists,
    isLoading: isLoadingPlaylists,
    error: playlistsError,
  } = usePlaylistStore();
  const [user, loadingUser, authError] = useAuthState(auth);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (user && !loadingUser) {
      fetchLibrary();
      fetchMyPlaylists();
    }
  }, [fetchLibrary, fetchMyPlaylists, user, loadingUser]);

  const isLoading = isLoadingAlbums || isLoadingPlaylists || loadingUser;
  // Исправление для ошибки 'message'
  const combinedError = albumsError || playlistsError || authError;
  const errorMessage =
    combinedError instanceof Error
      ? combinedError.message
      : typeof combinedError === "string"
      ? combinedError
      : combinedError
      ? String(combinedError)
      : null;

  return (
    <div className="h-full flex flex-col gap-2">
      {" "}
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
        ) : errorMessage ? ( // Используем errorMessage
          <p className="text-red-500 px-2">
            Error loading library: {errorMessage}
          </p>
        ) : !user ? (
          <LoginPrompt className="flex-1" />
        ) : (
          <ScrollArea className="flex-1 h-full pb-7">
            {albums.length === 0 && myPlaylists.length === 0 ? (
              <p className="text-zinc-400 px-2">No items in your library.</p>
            ) : (
              <div className="space-y-2">
                {albums.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-zinc-300 px-2 mt-4">
                      Albums
                    </h3>
                    {albums.map((album) => (
                      <Link
                        to={`/albums/${album._id}`}
                        key={album._id}
                        className="p-2 hover:bg-zinc-800 rounded-md flex items-center gap-3 group cursor-pointer"
                      >
                        <img
                          src={album.imageUrl || "/default-album-cover.png"}
                          alt={album.title}
                          className="size-12 rounded-md flex-shrink-0 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/default-album-cover.png";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-md truncate text-white">
                            {album.title || "Untitled Album"}
                          </p>
                          <p className="text-sm text-zinc-400 truncate">
                            {album.type || "Album"} •{" "}
                            {album.artist || "Unknown Artist"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {myPlaylists.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-zinc-300 px-2 mt-4">
                      Playlists
                    </h3>
                    {myPlaylists.map(
                      (
                        playlist: Playlist // Уточнен тип для playlist
                      ) => (
                        <Link
                      
                          to={`/playlists/${playlist._id}`}
                          key={playlist._id}
                          className="p-2 hover:bg-zinc-800 rounded-md flex items-center gap-3 group cursor-pointer"
                        >
                          <img
                            src={
                              playlist.imageUrl || "/default_playlist_cover.png"
                            }
                            alt={playlist.title}
                            className="size-12 rounded-md flex-shrink-0 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/default_playlist_cover.png";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-md truncate text-white">
                              {playlist.title || "Untitled Playlist"}
                            </p>
                            <p className="text-sm text-zinc-400 truncate">
                              Playlist • {playlist.owner?.fullName || "Unknown"}{" "}
                            </p>
                          </div>
                        </Link>
                      )
                    )}
                  </>
                )}
              </div>
            )}
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
