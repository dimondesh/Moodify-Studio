// frontend/src/pages/LibraryPage/LibraryPage.tsx

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useLibraryStore } from "../../stores/useLibraryStore";
import LibraryGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton"; // Переиспользуем скелетон

const LibraryPage = () => {
  // Получаем данные о лайкнутых песнях и альбомах из useLibraryStore
  const {
    likedSongs,
    albums,
    isLoading,
    error,
    fetchLibrary,
    fetchLikedSongs,
  } = useLibraryStore();

  useEffect(() => {
    // Загружаем альбомы и лайкнутые песни при монтировании компонента
    fetchLibrary();
    fetchLikedSongs();
  }, [fetchLibrary, fetchLikedSongs]); // Зависимости для useEffect

  // Отображаем скелетон во время загрузки данных
  if (isLoading) return <LibraryGridSkeleton />;

  // Отображаем сообщение об ошибке, если произошла ошибка загрузки
  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-900 min-h-screen text-white">
        <h1 className="text-2xl sm:text-3xl mb-6 font-bold">Ваша библиотека</h1>
        <p className="text-red-500 mt-4 text-center">
          Ошибка загрузки библиотеки: {error}
        </p>
      </div>
    );
  }

  // Количество лайкнутых песен для отображения на карточке
  const likedSongsCount = likedSongs.length;

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

            {/* Используем flex-col для вертикального списка элементов библиотеки */}
            <div className="flex flex-col gap-2">
              {/* Карточка для "Понравившихся песен" (Liked Songs) */}
              {/* Использует статическую обложку /liked.png */}
              <Link
                to="/liked-songs"
                className="bg-zinc-900 rounded-md p-2 flex items-center gap-4 hover:bg-zinc-800 transition-colors duration-200 cursor-pointer shadow-lg"
              >
                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src="/liked.png" // Обложка для "Понравившихся песен"
                    alt="Liked Songs"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/default-song-cover.png";
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-white truncate">
                    Liked Songs
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Playlist • {likedSongsCount}{" "}
                    {likedSongsCount !== 1 ? "songs" : "song"}
                  </p>
                </div>
              </Link>

              {/* Карточки для альбомов пользователя (Albums) */}
              {/* Используют реальные обложки альбомов из album.imageUrl */}
              {albums.map((album) => (
                <Link
                  key={album._id}
                  to={`/albums/${album._id}`}
                  className="bg-zinc-900 rounded-md p-2 flex items-center gap-4 hover:bg-zinc-800 transition-colors duration-200 cursor-pointer shadow-lg"
                >
                  <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={album.imageUrl || "/default-song-cover.png"} // Реальная обложка альбома
                      alt={album.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/default-song-cover.png";
                      }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-base font-bold text-white truncate">
                      {album.title}
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {album.type} • {album.artist}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LibraryPage;
