import { Button } from "../../components/ui/button";
import { useMusicStore } from "../../stores/useMusicStore";
import { Calendar, Trash2 } from "lucide-react"; // ИЗМЕНЕНО: Удален Pencil, так как он не используется
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Artist } from "../../types"; // ИЗМЕНЕНО: Добавлен импорт Artist

const SongsTable = () => {
  const { songs, isLoading, error, deleteSong, artists, fetchArtists } =
    useMusicStore();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  // ИЗМЕНЕНО: Функция getArtistNames теперь принимает Artist[] | string[]
  const getArtistNames = (artistsData: string[] | Artist[] | undefined) => {
    if (
      !artistsData ||
      artistsData.length === 0 ||
      !artists || // Убедимся, что 'artists' из useMusicStore доступен
      artists.length === 0
    )
      return "N/A";

    const names = artistsData
      .map((item) => {
        if (typeof item === "string") {
          const artist = artists.find((a) => a._id === item);
          return artist ? artist.name : null;
        } else if (item && typeof item === "object" && "name" in item) {
          return (item as Artist).name;
        }
        return null;
      })
      .filter(Boolean);

    return names.join(", ") || "N/A";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-zinc-400">Loading songs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-zinc-800/50 border-zinc-700/50">
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead>Release Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {songs.map((song) => (
          <TableRow
            key={song._id}
            className="hover:bg-zinc-800/50 border-zinc-700/50"
          >
            <TableCell>
              <img
                src={song.imageUrl}
                alt={song.title}
                className="size-10 rounded object-cover"
              />
            </TableCell>
            <TableCell className="font-medium">{song.title}</TableCell>
            <TableCell>{getArtistNames(song.artist)}</TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Calendar className="h-4 w-4" />
                {song.createdAt.split("T")[0]}
              </span>
            </TableCell>

            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                {/* TODO: Добавить кнопку редактирования */}
                {/* <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                >
                  <Pencil className="size-4" />
                </Button> */}
                <Button
                  variant={"ghost"}
                  size={"sm"}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  onClick={() => deleteSong(song._id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
export default SongsTable;
