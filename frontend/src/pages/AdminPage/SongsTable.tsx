// frontend/src/pages/AdminPage/SongsTable.tsx
import { memo, useEffect } from "react"; // ИЗМЕНЕНО: Добавлен memo
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useMusicStore } from "../../stores/useMusicStore";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button"; // ИЗМЕНЕНО: Убедитесь, что Button импортирован
import EditSongDialog from "./EditSongDialog";
import { Calendar, Trash2 } from "lucide-react"; // ИЗМЕНЕНО: Trash2 снова используется
import { Artist } from "@/types";

// ИЗМЕНЕНО: Обернуть компонент SongsTable в React.memo
const SongsTable = memo(() => {
  console.log("SongsTable RENDERED"); // Оставляем этот лог для отладки
  const {
    songs,
    isLoading,
    error,
    deleteSong,
    artists,
    fetchArtists,
    fetchSongs,
  } = useMusicStore();

  useEffect(() => {
    fetchArtists();
    fetchSongs();
  }, [fetchArtists, fetchSongs]);

  // ИЗМЕНЕНО: Добавлены типы для artistsData и item
  const getArtistNames = (artistsData: string[] | Artist[] | undefined) => {
    if (
      !artistsData ||
      artistsData.length === 0 ||
      !artists ||
      artists.length === 0
    )
      return "N/A";

    const names = artistsData
      .map((item: string | Artist) => {
        // ИЗМЕНЕНО: Добавлен тип для item
        if (typeof item === "string") {
          const artist = artists.find((a) => a._id === item);
          return artist ? artist.name : null;
        } else if (item && typeof item === "object" && "name" in item) {
          return (item as Artist).name; // Приведение типа
        }
        return null;
      })
      .filter(Boolean);

    return names.join(", ") || "N/A";
  };

  if (isLoading && songs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-700/50">
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead>Release Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {songs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-zinc-400">
              No songs found.
            </TableCell>
          </TableRow>
        ) : (
          songs.map((song) => (
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
              <TableCell className="font-medium text-zinc-200">
                {song.title}
              </TableCell>
              <TableCell className="text-zinc-400">
                {getArtistNames(song.artist)}
              </TableCell>
              <TableCell className="text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {song.createdAt.split("T")[0]}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <EditSongDialog song={song} />
                  {/* ИЗМЕНЕНО: Возвращена кнопка удаления */}
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
          ))
        )}
      </TableBody>
    </Table>
  );
}); // ИЗМЕНЕНО: Завершение memo
export default SongsTable;
