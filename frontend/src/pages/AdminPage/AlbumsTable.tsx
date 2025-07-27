// frontend/src/pages/AdminPage/AlbumsTable.tsx

import { Calendar, Music, Trash2 } from "lucide-react";
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
import { useMusicStore } from "../../stores/useMusicStore";
import { Artist } from "../../types";
import EditAlbumDialog from "./EditAlbumDialog";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ

const AlbumsTable = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const { albums, deleteAlbum, fetchAlbums, artists, fetchArtists } =
    useMusicStore();

  useEffect(() => {
    fetchAlbums();
    fetchArtists();
  }, [fetchAlbums, fetchArtists]);

  const getArtistNames = (artistsData: string[] | Artist[] | undefined) => {
    if (
      !artistsData ||
      artistsData.length === 0 ||
      !artists ||
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

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-zinc-800/50 border-zinc-700/50">
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>{t("admin.albums.tableTitle")}</TableHead>
          <TableHead>{t("admin.albums.tableArtists")}</TableHead>
          <TableHead>{t("admin.albums.tableReleaseYear")}</TableHead>
          <TableHead>{t("admin.albums.tableSongs")}</TableHead>
          <TableHead className="text-right">
            {t("admin.albums.tableActions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {albums.map((album) => (
          <TableRow
            key={album._id}
            className="hover:bg-zinc-800/50 border-zinc-700/50"
          >
            <TableCell>
              <img
                src={album.imageUrl}
                alt={album.title}
                className="h-10 w-10 rounded-md object-cover"
              />
            </TableCell>
            <TableCell className="font-medium text-white">
              {album.title}
            </TableCell>
            <TableCell className="text-zinc-400">
              {getArtistNames(album.artist)}
            </TableCell>
            <TableCell className="text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {album.releaseYear}
              </span>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Music className="h-4 w-4" />
                {album.songs.length}{" "}
                {album.songs.length === 1
                  ? t("sidebar.subtitle.song")
                  : t("sidebar.subtitle.songs")}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <EditAlbumDialog album={album} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlbum(album._id)}
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
export default AlbumsTable;
