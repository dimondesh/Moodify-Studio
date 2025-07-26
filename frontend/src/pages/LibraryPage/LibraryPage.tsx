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
  MixItem, // <-- ДОБАВЬТЕ ЭТОТ ИМПОРТ
} from "../../types";
import { Button } from "@/components/ui/button";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";
import { CreatePlaylistDialog } from "../PlaylistPage/CreatePlaylistDialog";
import { Plus } from "lucide-react";

const LibraryPage = () => {
  const {
    likedSongs,
    albums,
    playlists,
    followedArtists, // НОВОЕ: подписанные артисты
    savedMixes, // <-- ПОЛУЧАЕМ СОХРАНЕННЫЕ МИКСЫ

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

  useEffect(() => {
    fetchLibrary();
    fetchLikedSongs();
    fetchMyPlaylists();
    fetchArtists();
  }, [fetchLibrary, fetchLikedSongs, fetchMyPlaylists, fetchArtists]);

  const isLoading = isLoadingLibrary || isLoadingPlaylists;

  const combinedError: string | null =
    (libraryError as string | null) || (playlistsError as string | null);

  const errorMessage = combinedError;
  const [user] = useAuthState(auth);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getArtistNames = (artistsInput: (string | Artist)[] | undefined) => {
    if (!artistsInput || artistsInput.length === 0) {
      return "Unknown Artist";
    }

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

    return names.join(", ") || "Unknown Artist";
  };

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

  // --- НОВОЕ: Логика дедупликации плейлистов ---
  const allPlaylistsMap = new Map<string, PlaylistItem>();

  // Добавляем плейлисты, созданные пользователем (приоритет)
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

  // Добавляем плейлисты из библиотеки, если их еще нет в Map
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
  // --- КОНЕЦ НОВОЙ ЛОГИКИ ---

  // Объединяем все элементы библиотеки и сортируем по дате добавления
  const libraryItems: LibraryItem[] = [
    ...(albums || []).map(
      (album) =>
        ({
          _id: album._id,
          title: album.title,
          imageUrl: album.imageUrl,
          createdAt: new Date(album.addedAt || 0),
          type: "album",
          artist: album.artist,
        } as AlbumItem)
    ),
    ...uniquePlaylists, // ИСПОЛЬЗУЕМ ДЕДУПЛИЦИРОВАННЫЕ ПЛЕЙЛИСТЫ ЗДЕСЬ
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
          title: artist.name, // Используем artist.name
          imageUrl: artist.imageUrl,
          createdAt: new Date(artist.addedAt || artist.createdAt), // Используем artist.addedAt, если есть, иначе artist.createdAt
          type: "artist",
          artistId: artist._id,
        } as FollowedArtistItem)
    ),
    ...(likedSongs.length > 0
      ? [
          {
            _id: "liked-songs",
            type: "liked-songs",
            title: "Liked Songs",
            imageUrl: "/liked.png",
            createdAt: new Date(likedSongs[0]?.likedAt || Date.now()),
            songsCount: likedSongs.length,
          } as LikedSongsItem,
        ]
      : []),
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
            <div className="flex justify-between items-baseline">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mt-2 mb-6 text-white">
                Your Library
              </h1>
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-zinc-800 "
                  onClick={() => setIsCreateDialogOpen(true)}
                  title="Create new playlist"
                >
                  <Plus className="size-6" />
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {libraryItems.length === 0 ? (
                <p className="text-zinc-400 px-2">
                  No items in your library yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {libraryItems.map((item) => {
                    let linkPath: string;
                    let subtitle: string;
                    let coverImageUrl: string | null | undefined =
                      item.imageUrl;
                    let imageClass = "rounded-md";

                    if (item.type === "liked-songs") {
                      const likedItem = item as LikedSongsItem;
                      linkPath = "/liked-songs";
                      subtitle = `Playlist • ${likedItem.songsCount} ${
                        likedItem.songsCount !== 1 ? "songs" : "song"
                      }`;
                      coverImageUrl = item.imageUrl;
                    } else if (item.type === "album") {
                      const albumItem = item as AlbumItem;
                      linkPath = `/albums/${albumItem._id}`;
                      subtitle = `Album • ${getArtistNames(albumItem.artist)}`;
                      coverImageUrl =
                        item.imageUrl || "/default-album-cover.png";
                    } else if (item.type === "playlist") {
                      const playlistItem = item as PlaylistItem;
                      linkPath = `/playlists/${playlistItem._id}`;
                      subtitle = `Playlist • ${
                        playlistItem.owner?.fullName || "Unknown"
                      }`;
                      coverImageUrl =
                        item.imageUrl ||
                        "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png";
                    } else if (item.type === "artist") {
                      const artistItem = item as FollowedArtistItem;
                      linkPath = `/artists/${artistItem._id}`;
                      subtitle = `Artist`;
                      coverImageUrl =
                        item.imageUrl || "/default-artist-cover.png";
                      imageClass = "rounded-full";
                    } else if (item.type === "mix") {
                      const mixItem = item as MixItem;
                      linkPath = `/mixes/${mixItem._id}`; // Новый роут
                      subtitle = `Daily Mix`;
                      coverImageUrl =
                        item.imageUrl || "/default-album-cover.png";
                      imageClass = "rounded-md";
                    } else {
                      linkPath = "#";
                      subtitle = "";
                      coverImageUrl =
                        "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png";
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
                                coverImageUrl ||
                                "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png"
                              }
                              alt={item.title}
                              className="w-auto h-auto object-cover transition-transform duration-300 hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  item.type === "album" ||
                                  item.type === "artist"
                                    ? "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png"
                                    : "https://res.cloudinary.com/dy9lhvzsl/image/upload/v1752489603/default-album-cover_am249u.png ";
                              }}
                            />
                          </div>
                        </div>
                        <h3 className="font-medium mb-1 truncate text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-zinc-400 truncate">
                          {subtitle}
                        </p>
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
  );
};

export default LibraryPage;
