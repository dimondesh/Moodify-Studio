// frontend/src/pages/AllSongsPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PlayButton from "../../pages/HomePage/PlayButton";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import type { Song } from "../../types/index";
import axios from "axios";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import { useMusicStore } from "../../stores/useMusicStore";
import { getArtistNames } from "../../lib/utils"; // <-- Импорт новой функции

const AllSongsPage = () => {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const initialSongs = location.state?.songs;
  const pageTitle = location.state?.title || "Все песни";
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
            console.error("Fetched data is not an array:", fetchedData);
            setError("Некорректный формат данных.");
          }
        } catch (err) {
          console.error("Ошибка при загрузке всех песен:", err);
          setError("Не удалось загрузить песни.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchSongs();
    } else {
      setIsLoading(false);
      setError("Нет доступных данных для отображения.");
    }
    fetchArtists();
  }, [initialSongs, apiEndpoint, fetchArtists]);

  // УДАЛИТЕ эту вспомогательную функцию getArtistNames, она теперь импортируется

  if (isLoading) return <SectionGridSkeleton />;
  if (error) return <div className="p-4 text-red-500">Ошибка: {error}</div>;
  if (!songs || songs.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>
        <p className="text-zinc-400">Нет доступных песен в этой категории.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-190px)] w-full rounded-md pr-4">
      <div className="p-4 pt-0">
        <h2 className="text-2xl font-bold mb-6">{pageTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {songs.map((song) => (
            <div
              key={song._id}
              className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
              onClick={() => {
                if (song.albumId) {
                  const albumIdStr = String(song.albumId);

                  if (albumIdStr.length > 0) {
                    navigate(`/albums/${albumIdStr}`);
                    return;
                  }
                }
                console.warn(
                  "albumId отсутствует или не строка:",
                  song.albumId
                );
              }}
            >
              <div className="relative mb-4">
                <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                  <img
                    src={song.imageUrl || "/default-song-cover.png"}
                    alt={song.title || "No title"}
                    className="w-auto h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/default-song-cover.png";
                    }}
                  />
                </div>
                <PlayButton song={song} />
              </div>
              <h3 className="font-medium mb-2 truncate">
                {song.title || "No title"}
              </h3>
              <p className="text-sm text-zinc-400 truncate">
                {getArtistNames(song.artist, artists)}{" "}
                {/* <-- Передача artists */}
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
