// frontend/src/pages/AdminPage/ArtistsTable.tsx

import { Music, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react"; // <-- ДОБАВЛЕНО: useState
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { useMusicStore } from "../../stores/useMusicStore";
import { Artist } from "../../types"; // <-- ДОБАВЛЕНО: Импорт Artist
import EditArtistDialog from "./EditArtistDialog"; // <-- НОВЫЙ ИМПОРТ

const ArtistsTable = () => {
  const { artists, fetchArtists, deleteArtist } = useMusicStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Состояние для открытия/закрытия диалога
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null); // Выбранный артист для редактирования

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const handleEditArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedArtist(null); // Сбрасываем выбранного артиста
  };

  return (
    <>
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
                    onClick={() => handleEditArtist(artist)}
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

      {/* Диалог редактирования артиста */}
      <EditArtistDialog
        artist={selectedArtist}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
      />
    </>
  );
};

export default ArtistsTable;
