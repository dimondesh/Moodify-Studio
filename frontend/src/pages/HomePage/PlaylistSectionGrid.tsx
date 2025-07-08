import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import AlbumGrid from "../SearchPage/AlbumGrid";
import { ScrollArea } from "../../components/ui/scroll-area";
import SongGrid from "../SearchPage/SongGrid";
import PlaylistGrid from "../SearchPage/PlaylistGrid"; // Импортируем новый компонент

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const { query, songs, albums, playlists, loading, error, setQuery, search } =
    useSearchStore(); // Добавляем playlists

  useEffect(() => {
    if (queryParam !== query) {
      setQuery(queryParam);
      search(queryParam);
    }
  }, [queryParam, query, setQuery, search]);

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <ScrollArea className="h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] md:h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] w-full pb-20 md:pb-0">
        <div className="py-10 px-4 sm:px-6">
          {" "}
          {queryParam ? (
            <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
              {" "}
              {/* Добавил text-white */}
              Search results for &quot;{queryParam}&quot;
            </h1>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
              {" "}
              {/* Добавил text-white */}
              Find your favorite songs, albums, and playlists here
            </h1>
          )}
          {loading && <p className="text-zinc-400">Loading...</p>}{" "}
          {/* Добавил цвет */}
          {error && <p className="text-red-500">{error}</p>}
          {!loading &&
            !error &&
            songs.length === 0 &&
            albums.length === 0 &&
            playlists.length === 0 && ( // Проверяем и плейлисты
              <p className="text-zinc-400">No results found.</p>
            )}
          {!loading &&
            !error &&
            (songs.length > 0 || albums.length > 0 || playlists.length > 0) && ( // Проверяем и плейлисты
              <>
                {songs.length > 0 && (
                  <SongGrid title="Songs" songs={songs} isLoading={loading} />
                )}
                {albums.length > 0 && (
                  <AlbumGrid
                    title="Albums"
                    albums={albums}
                    isLoading={loading}
                  />
                )}
                {playlists.length > 0 && ( // Новая секция для плейлистов
                  <PlaylistGrid
                    title="Playlists"
                    playlists={playlists}
                    isLoading={loading}
                  />
                )}
              </>
            )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default SearchPage;
