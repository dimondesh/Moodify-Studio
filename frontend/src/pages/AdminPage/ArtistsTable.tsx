// src/pages/AdminPage/ArtistsTable.tsx
import { Music, Trash2, Pencil } from "lucide-react";
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { useMusicStore } from "../../stores/useMusicStore"; // Предполагаем, что artists также хранятся здесь

const ArtistsTable = () => {
  const { artists, fetchArtists, deleteArtist } = useMusicStore(); // Добавляем fetchArtists и deleteArtist

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-zinc-800/50 border-zinc-700/50">
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Albums</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {artists.map((artist) => (
          <TableRow
            key={artist._id}
            className="hover:bg-zinc-800/50 border-zinc-700/50"
          >
            <TableCell>
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-10 h-10 rounded object-cover"
              />
            </TableCell>
            <TableCell className="font-medium">{artist.name}</TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Music className="h-4 w-4" />
                {artist.albums.length} albums
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  // onClick={() => handleEditArtist(artist)} // TODO: раскомментировать, когда будет EditArtistDialog
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteArtist(artist._id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ArtistsTable;
