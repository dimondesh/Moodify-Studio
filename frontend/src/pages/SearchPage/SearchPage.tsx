// frontend/src/pages/SearchPage/SearchPage.tsx

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import AlbumGrid from "./AlbumGrid";
import { ScrollArea } from "../../components/ui/scroll-area";
import SongGrid from "./SongGrid";
import PlaylistGrid from "./PlaylistGrid";
import ArtistGrid from "./ArtistGrid";
import useDebounce from "../../hooks/useDebounce";
import UserGrid from "./UserGrid";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ
import { Helmet } from "react-helmet-async";

const SearchPage = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const debouncedInputSearchTerm = useDebounce(queryParam, 500);

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

  useEffect(() => {
    if (debouncedInputSearchTerm.trim() !== query) {
      search(debouncedInputSearchTerm.trim());
    }
  }, [debouncedInputSearchTerm, search, query]);

  const title = queryParam ? `Results for "${queryParam}"` : "Search Music";
  const description = queryParam
    ? `Find artists, songs, albums, and playlists for "${queryParam}" on Moodify.`
    : "Search for your favorite songs, artists, albums, playlists, and users on Moodify.";

  return (
    <>
      {" "}
      <Helmet>
        <title>{`${title}`}</title>
        <meta name="description" content={description} />
      </Helmet>
      <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
        <ScrollArea className="h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] md:h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] w-full pb-20 md:pb-0">
          <div className="py-10 px-4 sm:px-6">
            {queryParam ? (
              <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
                {t("searchpage.resultsFor")} "{queryParam}"
              </h1>
            ) : (
              <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-white">
                {t("searchpage.findYourFavorites")}
              </h1>
            )}
            {loading && (
              <p className="text-zinc-400">{t("searchpage.loading")}</p>
            )}
            {error && <p className="text-red-500">{error}</p>}
            {!loading &&
              !error &&
              songs.length === 0 &&
              albums.length === 0 &&
              playlists.length === 0 &&
              artists.length === 0 &&
              users.length === 0 && (
                <p className="text-zinc-400">{t("searchpage.noResults")}</p>
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
                      title={t("searchpage.artists")}
                      artists={artists}
                      isLoading={loading}
                    />
                  )}
                  {songs.length > 0 && (
                    <SongGrid
                      title={t("searchpage.songs")}
                      songs={songs}
                      isLoading={loading}
                    />
                  )}
                  {albums.length > 0 && (
                    <AlbumGrid
                      title={t("searchpage.albums")}
                      albums={albums}
                      isLoading={loading}
                    />
                  )}
                  {playlists.length > 0 && (
                    <PlaylistGrid
                      title={t("searchpage.playlists")}
                      playlists={playlists}
                      isLoading={loading}
                    />
                  )}
                  {users.length > 0 && (
                    <UserGrid
                      title={t("searchpage.users")}
                      users={users}
                      isLoading={loading}
                    />
                  )}
                </>
              )}
          </div>
        </ScrollArea>
      </main>
    </>
  );
};

export default SearchPage;
