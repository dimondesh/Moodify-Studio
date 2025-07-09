// frontend/src/pages/LibraryPage/LibraryPage.tsx

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
// Named imports for stores
import { useLibraryStore } from "../../stores/useLibraryStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import LibraryGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
// Import LibraryItem, Song, Album, Playlist, User from your central types file
import { LibraryItem } from "../../types";

const LibraryPage = () => {
  const {
    likedSongs,
    albums,
    playlists,
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

  useEffect(() => {
    fetchLibrary();
    fetchLikedSongs();
    fetchMyPlaylists();
  }, [fetchLibrary, fetchLikedSongs, fetchMyPlaylists]);

  const isLoading = isLoadingLibrary || isLoadingPlaylists;

  // Assume errors from stores are string | null.
  // Combine errors; if both are null, result is null. If one is a string, it will be the result.
  const combinedError: string | null =
    (libraryError as string | null) || (playlistsError as string | null);

  // Directly use combinedError as the errorMessage, as it's already a string or null
  const errorMessage = combinedError;

  if (isLoading) return <LibraryGridSkeleton />;

  if (errorMessage) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">Ваша библиотека</h1>
        <p className="text-red-500 mt-4 text-center">
          Ошибка загрузки библиотеки: {errorMessage}
        </p>
      </div>
    );
  }

  const libraryItems: LibraryItem[] = [
    {
      _id: "liked-songs",
      type: "liked-songs",
      title: "Liked Songs",
      imageUrl: "/liked.png",
      createdAt: new Date(0), // Placeholder date, can be adjusted if real "liked songs" date is available
      songsCount: likedSongs.length,
    } as LibraryItem, // Use LibraryItem directly here, it will discriminate based on 'type'
    ...albums.map(
      (album) =>
        ({
          _id: album._id,
          title: album.title,
          imageUrl: album.imageUrl,
          createdAt: new Date(album.addedAt),
          type: "album",
          artist: album.artist,
        } as LibraryItem)
    ), // Use LibraryItem directly here
    ...myPlaylists.map(
      (playlist) =>
        ({
          _id: playlist._id,
          title: playlist.title,
          imageUrl: playlist.imageUrl,
          createdAt: new Date(playlist.updatedAt),
          type: "playlist",
          owner: playlist.owner,
        } as LibraryItem)
    ), // Use LibraryItem directly here
    ...playlists.map(
      (playlist) =>
        ({
          _id: playlist._id,
          title: playlist.title,
          imageUrl: playlist.imageUrl,
          createdAt: new Date(playlist.addedAt),
          type: "playlist",
          owner: playlist.owner,
        } as LibraryItem)
    ),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="h-full">
      <ScrollArea className="h-full rounded-md md:pb-0">
        <div className="relative min-h-screen p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-900/80
            to-zinc-900 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-6 text-white">
              Your Library
            </h1>

            <div className="flex flex-col gap-2">
              {libraryItems.length === 0 ? (
                <p className="text-zinc-400 px-2">
                  No items in your library yet.
                </p>
              ) : (
                libraryItems.map((item) => {
                  let linkPath: string;
                  let subtitle: string;
                  let coverImageUrl: string | null | undefined = item.imageUrl;

                  if (item.type === "liked-songs") {
                    linkPath = "/liked-songs";
                    subtitle = `Playlist • ${item.songsCount} ${
                      item.songsCount !== 1 ? "songs" : "song"
                    }`;
                    coverImageUrl = item.imageUrl;
                  } else if (item.type === "album") {
                    linkPath = `/albums/${item._id}`;
                    subtitle = `Album • ${item.artist}`;
                    coverImageUrl = item.imageUrl || "/default-album-cover.png";
                  } else {
                    // item.type === "playlist"
                    linkPath = `/playlists/${item._id}`;
                    subtitle = `Playlist • ${
                      item.owner?.fullName || "Unknown"
                    }`;
                    coverImageUrl =
                      item.imageUrl || "/default_playlist_cover.png";
                  }

                  return (
                    <Link
                      key={item._id}
                      to={linkPath}
                      className="bg-zinc-900 rounded-md p-2 flex items-center gap-4 hover:bg-zinc-800 transition-colors duration-200 cursor-pointer shadow-lg"
                    >
                      <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={coverImageUrl || "/default_playlist_cover.png"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              item.type === "album"
                                ? "/default-album-cover.png"
                                : "/default_playlist_cover.png";
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-base font-bold text-white truncate">
                          {item.title}
                        </h2>
                        <p className="text-sm text-zinc-400">{subtitle}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LibraryPage;
