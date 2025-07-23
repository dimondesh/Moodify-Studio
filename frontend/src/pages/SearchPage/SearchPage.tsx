import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import AlbumGrid from "./AlbumGrid";
import { ScrollArea } from "../../components/ui/scroll-area";
import SongGrid from "./SongGrid";
import PlaylistGrid from "./PlaylistGrid";
import ArtistGrid from "./ArtistGrid";
import useDebounce from "../../hooks/useDebounce"; // Импортируем useDebounce
import UserGrid from "./UserGrid";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  // Состояние для значения в поле ввода
  const [inputSearchTerm, setInputSearchTerm] = useState(queryParam);
  // Дебаунсированное значение для отправки запросов
  const debouncedInputSearchTerm = useDebounce(inputSearchTerm, 500); // Задержка 500 мс

  const {
    query,
    songs,
    albums,
    playlists,
    artists,
    users,
    loading,
    error,
    search,
  } = useSearchStore();

  // Эффект для синхронизации поля ввода с параметром URL
  // Теперь просто обновляем inputSearchTerm при изменении queryParam
  useEffect(() => {
    setInputSearchTerm(queryParam);
  }, [queryParam]); // Зависимость только от queryParam

  // Эффект для вызова поиска после дебаунса
  useEffect(() => {
    // Выполняем поиск только если дебаунсированное значение отличается от текущего запроса в хранилище
    // и если оно не пустое после обрезки пробелов
    if (debouncedInputSearchTerm.trim() !== query) {
      search(debouncedInputSearchTerm.trim());
    }
  }, [debouncedInputSearchTerm, search, query]);

  // Функция для обработки изменений в поле ввода

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <ScrollArea className="h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] md:h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] w-full pb-20 md:pb-0">
        <div className="py-10 px-4 sm:px-6">
          {" "}
          {queryParam ? (
            <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
              {" "}
              Search results for &quot;{queryParam}&quot;
            </h1>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
              {" "}
              Find your favorite songs, albums, and playlists here
            </h1>
          )}
          {loading && <p className="text-zinc-400">Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading &&
            !error &&
            songs.length === 0 &&
            albums.length === 0 &&
            playlists.length === 0 &&
            artists.length === 0 &&
            users.length === 0 && ( // <-- Добавляем users
              <p className="text-zinc-400">No results found.</p>
            )}
          {!loading &&
            !error &&
            (songs.length > 0 ||
              albums.length > 0 ||
              playlists.length > 0 ||
              artists.length > 0 ||
              users.length > 0) && (
              <>
                {artists.length > 0 && (
                  <ArtistGrid
                    title="Artists"
                    artists={artists}
                    isLoading={loading}
                  />
                )}
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
                {playlists.length > 0 && (
                  <PlaylistGrid
                    title="Playlists"
                    playlists={playlists}
                    isLoading={loading}
                  />
                )}
                {/* --- НОВЫЙ КОМПОНЕНТ --- */}
                {users.length > 0 && (
                  <UserGrid title="Users" users={users} isLoading={loading} />
                )}
              </>
            )}
        </div>
      </ScrollArea>
    </main>
  );
};

export default SearchPage;
