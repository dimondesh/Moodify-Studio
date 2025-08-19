// frontend/src/pages/SongGrid.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Song } from "../../types";
import PlayButton from "../HomePage/PlayButton";
import SectionGridSkeleton from "../../components/ui/skeletons/PlaylistSkeleton";
import { useMusicStore } from "../../stores/useMusicStore";
import { getArtistNames } from "../../lib/utils";
import { useSearchStore } from "@/stores/useSearchStore";

type SectionGridProps = {
  title: string;
  songs: Song[];
  isLoading: boolean;
};

const SongGrid = ({ title, songs, isLoading }: SectionGridProps) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const { artists, fetchArtists } = useMusicStore();
  const { addRecentSearch } = useSearchStore();

  const handleSongClick = (song: Song) => {
    addRecentSearch(song._id, "Song");
    if (typeof song.albumId === "string" && song.albumId.length > 0) {
      navigate(`/albums/${song.albumId}`);
    } else {
      console.warn("albumId отсутствует или не строка:", song.albumId);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  if (isLoading) return <SectionGridSkeleton />;

  const songsToShow = showAll ? songs : songs.slice(0, 4);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {songs.length > 4 && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : "Show all"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {songsToShow.map((song) => (
          <div
            key={song._id}
            className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer"
            onClick={() => handleSongClick(song)}
          >
            <div className="relative mb-4">
              <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                <img
                  src={song.imageUrl || "/default-song-cover.png"}
                  alt={song.title}
                  className="w-auto h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/default-song-cover.png";
                  }}
                />
              </div>
              <PlayButton song={song} />
            </div>
            <h3 className="font-medium mb-2 truncate">{song.title}</h3>
            <p className="text-sm text-zinc-400 truncate">
              {getArtistNames(
                song.artist.map((artist) => artist._id),
                artists
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongGrid;
