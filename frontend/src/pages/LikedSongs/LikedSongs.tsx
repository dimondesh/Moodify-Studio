import { useEffect } from "react";
import { useLibraryStore } from "../../stores/useLibraryStore";
import { Music } from "lucide-react";
import { Link } from "react-router-dom";
import { useMusicStore } from "../../stores/useMusicStore";

const LikedSongs = () => {
  const { likedSongs, isLoading, error } = useLibraryStore();
  const { fetchMadeForYouSongs, madeForYouSongs } = useMusicStore();
  useEffect(() => {
    fetchMadeForYouSongs();
  }, [fetchMadeForYouSongs]);

  return (
    <div className="p-6 bg-zinc-900 min-h-screen text-white">
      <h1 className="text-3xl mb-6 font-bold">Liked Songs</h1>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && (
        <>
          {likedSongs.length === 0 ? (
            <p>No liked songs yet.</p>
          ) : (
            <div className="space-y-4">
              {madeForYouSongs.map((song) => (
                <Link
                  to={`/songs/${song._id}`}
                  key={song._id}
                  className="flex items-center gap-4 p-2 hover:bg-zinc-800 rounded"
                >
                  <Music className="w-6 h-6 text-white flex-shrink-0" />
                  <div>
                    <p className="truncate max-w-xs font-medium">
                      {song.title}
                    </p>
                    <p className="text-sm text-zinc-400 truncate max-w-xs">
                      {song.artist}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LikedSongs;
