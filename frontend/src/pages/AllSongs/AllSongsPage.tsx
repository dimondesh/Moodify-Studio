/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/pages/AllSongs/AllSongsPage.tsx
import { JSX, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PlayButton from "../../pages/HomePage/PlayButton";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import type { Song } from "../../types/index";
import axios from "axios";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import { useMusicStore } from "../../stores/useMusicStore";
import { useTranslation } from "react-i18next";

interface Artist {
  _id: string;
  name: string;
}

const AllSongsPage = () => {
  const { t } = useTranslation();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const initialSongs = location.state?.songs;
  const pageTitle = location.state?.title || t("searchpage.songs");
  const apiEndpoint = location.state?.apiEndpoint;
  const { artists, fetchArtists } = useMusicStore();

  useEffect(() => {
    if (initialSongs && initialSongs.length > 0) {
      setSongs(initialSongs);
      setIsLoading(false);
    } else if (apiEndpoint) {
      const fetchSongs = async () => {
        try {
          const response = await axios.get(apiEndpoint, {
            withCredentials: true,
          });
          const fetchedData = response.data.songs || response.data.albums;
          if (Array.isArray(fetchedData)) {
            setSongs(fetchedData);
          } else {
            setError(t("common.error"));
          }
        } catch (err) {
          setError(t("common.error"));
        } finally {
          setIsLoading(false);
        }
      };
      fetchSongs();
    } else {
      setIsLoading(false);
      setError(t("common.noData"));
    }
    fetchArtists();
  }, [initialSongs, apiEndpoint, fetchArtists, t]);

  const getArtistNamesDisplay = (
    artistsInput: (string | Artist)[] | undefined
  ) => {
    if (!artistsInput || artistsInput.length === 0)
      return <span>{t("common.unknownArtist")}</span>;
    const artistElements: JSX.Element[] = [];
    artistsInput.forEach((artistOrId, index) => {
      let artistName: string | null = null;
      let artistId: string | null = null;
      if (typeof artistOrId === "string") {
        const foundArtist = artists.find((a: Artist) => a._id === artistOrId);
        if (foundArtist) {
          artistName = foundArtist.name;
          artistId = foundArtist._id;
        }
      } else {
        artistName = artistOrId.name;
        artistId = artistOrId._id;
      }
      if (artistName && artistId) {
        artistElements.push(
          <span key={artistId}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToArtist(artistId);
              }}
              className="hover:underline focus:outline-none focus:underline"
            >
              {artistName}
            </button>
            {index < artistsInput.length - 1 && ", "}
          </span>
        );
      }
    });
    return <>{artistElements}</>;
  };

  const handleNavigateToAlbum = (
    e: React.MouseEvent,
    albumId: string | null | undefined
  ) => {
    e.stopPropagation();
    if (albumId) {
      const albumIdStr = String(albumId);
      if (albumIdStr.length > 0) navigate(`/albums/${albumIdStr}`);
    }
  };

  const handleNavigateToArtist = (artistId: string) =>
    navigate(`/artists/${artistId}`);

  if (isLoading) return <SectionGridSkeleton />;
  if (error)
    return (
      <div className="p-4 text-red-500">
        {t("common.error")}: {error}
      </div>
    );
  if (!songs || songs.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>
        <p className="text-zinc-400">{t("common.songsNotFound")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-180px)] w-full rounded-md pr-4 bg-zinc-950">
      <div className="p-4 pt-4 pb-14 md:pb-16">
        <h2 className="text-2xl font-bold mb-6">{pageTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {songs.map((song, index) => (
            <div
              key={song._id}
              className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
              onClick={() => {
                if (song.albumId) {
                  const albumIdStr = String(song.albumId);
                  if (albumIdStr.length > 0) navigate(`/albums/${albumIdStr}`);
                }
              }}
            >
              <div className="relative mb-4">
                <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                  <button
                    onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
                    className="w-full h-full block"
                  >
                    <img
                      src={song.imageUrl || "/default-song-cover.png"}
                      alt={song.title || t("common.noTitle")}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/default-song-cover.png";
                      }}
                    />
                  </button>
                </div>
                <PlayButton song={song} songs={songs} songIndex={index} />
              </div>
              <h3 className="font-medium mb-2 truncate">
                <button
                  onClick={(e) => handleNavigateToAlbum(e, song.albumId)}
                  className="hover:underline focus:outline-none focus:underline text-left w-full"
                >
                  {song.title || t("common.noTitle")}
                </button>
              </h3>
              <p className="text-sm text-zinc-400 truncate">
                {getArtistNamesDisplay(song.artist)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};

export default AllSongsPage;
