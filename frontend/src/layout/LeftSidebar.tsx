import { Heart, HomeIcon, Library, MessageCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { buttonVariants } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import PlaylistSkeleton from "../components/ui/skeletons/PlaylistSkeleton";
import { useEffect } from "react";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { HeadphonesIcon } from "lucide-react";

const LeftSidebar = () => {
  const { albums, fetchLibrary, isLoading, error } = useLibraryStore();
  const [user, loadingUser, authError] = useAuthState(auth);

  useEffect(() => {
    if (user && !loadingUser) {
      fetchLibrary();
    }
  }, [fetchLibrary, user, loadingUser]);

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
        </div>

        {loadingUser ? (
          <PlaylistSkeleton />
        ) : authError ? (
          <p className="text-red-500 px-2">Authentication error.</p>
        ) : !user ? (
          <LoginPrompt className="flex-1" />
        ) : (
          <ScrollArea className="flex-1 h-full pb-7">
            {isLoading && <PlaylistSkeleton />}
            {error && <p className="text-red-500 px-2">{error}</p>}

            {!isLoading && !error && (
              <>
                {albums.length === 0 ? (
                  <p className="text-zinc-400 px-2">
                    No albums in your library.
                  </p>
                ) : (
                  <div className="space-y-2">
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
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        )}
      </div>
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
