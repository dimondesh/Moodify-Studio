import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import AlbumGrid from "../SearchPage/AlbumGrid";
import { ScrollArea } from "../../components/ui/scroll-area";
import SongGrid from "./SongGrid";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const { query, songs, albums, loading, error, setQuery, search } =
    useSearchStore();

  useEffect(() => {
    if (queryParam !== query) {
      setQuery(queryParam);
      search(queryParam);
    }
  }, [queryParam, query, setQuery, search]);

  return (
    <main className="flex flex-col items-center justify-start min-h-[calc(100vh-64px)] bg-gradient-to-b from-zinc-900 to-zinc-950  text-white py-10 px-4 w-full max-w-7xl mx-auto rounded-md overflow-hidden">
      <ScrollArea className="h-[calc(100vh-64px)] w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Search results for &quot;{queryParam}&quot;
        </h1>

        {loading && <p>Loading...</p>}

        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && songs.length === 0 && albums.length === 0 && (
          <p className="text-zinc-400">No results found.</p>
        )}

        {!loading && !error && (songs.length > 0 || albums.length > 0) && (
          <>
            {songs.length > 0 && (
              <SongGrid title="Songs" songs={songs} isLoading={loading} />
            )}
            {albums.length > 0 && (
              <AlbumGrid title="Albums" albums={albums} isLoading={loading} />
            )}
          </>
        )}
      </ScrollArea>
    </main>
  );
};

export default SearchPage;
