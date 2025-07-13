/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "react-hot-toast";
import { useMusicStore } from "../../stores/useMusicStore";
import { useEffect, useRef, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Plus, Upload } from "lucide-react";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ScrollArea } from "../../components/ui/scroll-area";
import { MultiSelect } from "../../components/ui/multi-select";

interface NewSong {
  title: string;
  artistIds: string[];
  album: string;
  releaseYear: number;
}

const AddSongDialog = () => {
  const { albums, artists, fetchAlbums, fetchArtists } = useMusicStore();
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);

  const [newSong, setNewSong] = useState<NewSong>({
    title: "",
    artistIds: [],
    album: "",
    releaseYear: new Date().getFullYear(),
  });

  // ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем instrumentalFile и vocalsFile
  const [files, setFiles] = useState<{
    instrumentalFile: File | null; // <-- ИЗМЕНЕНО
    vocalsFile: File | null; // <-- НОВОЕ: Для вокальной дорожки
    imageFile: File | null; // <-- ИЗМЕНЕНО
  }>({
    instrumentalFile: null,
    vocalsFile: null,
    imageFile: null,
  });

  // ИЗМЕНЕНИЕ ЗДЕСЬ: Отдельные рефы для инструментала и вокала
  const instrumentalInputRef = useRef<HTMLInputElement>(null); // <-- ИЗМЕНЕНО
  const vocalsInputRef = useRef<HTMLInputElement>(null); // <-- НОВОЕ
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (songDialogOpen) {
      fetchArtists();
      fetchAlbums();
    }
  }, [songDialogOpen, fetchArtists, fetchAlbums]);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // ИЗМЕНЕНИЕ ЗДЕСЬ: Проверяем instrumentalFile и imageFile
      if (!files.instrumentalFile || !files.imageFile) {
        return toast.error("Please upload instrumental audio and image files");
      }
      if (selectedArtistIds.length === 0) {
        return toast.error("Please select at least one artist.");
      }

      const formData = new FormData();

      formData.append("title", newSong.title);
      formData.append("artistIds", JSON.stringify(selectedArtistIds));

      if (newSong.album && newSong.album !== "none") {
        formData.append("albumId", newSong.album);
      }
      formData.append("releaseYear", newSong.releaseYear.toString());

      // ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем instrumentalFile и vocalsFile
      formData.append("instrumentalFile", files.instrumentalFile);
      if (files.vocalsFile) {
        formData.append("vocalsFile", files.vocalsFile); // Добавляем вокал только если он выбран
      }
      formData.append("imageFile", files.imageFile);

      await axiosInstance.post("/admin/songs", formData);

      setNewSong({
        title: "",
        artistIds: [],
        album: "",
        releaseYear: new Date().getFullYear(),
      });
      setSelectedArtistIds([]);
      // ИЗМЕНЕНИЕ ЗДЕСЬ: Сброс всех файлов
      setFiles({
        instrumentalFile: null,
        vocalsFile: null,
        imageFile: null,
      });
      setSongDialogOpen(false);
      toast.success("Song added successfully");
    } catch (error: any) {
      toast.error(
        "Failed to add song: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={songDialogOpen} onOpenChange={setSongDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-black">
          <Plus className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-900 border-zinc-700 max-h-[80vh] overflow-auto text-zinc-200 no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Song</DialogTitle>
          <DialogDescription>
            Add a new song to your music library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image upload area */}
          <div
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => imageInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              hidden
              onChange={(e) =>
                setFiles((prev) => ({ ...prev, imageFile: e.target.files![0] }))
              }
            />
            <div className="text-center">
              {files.imageFile ? (
                <div className="space-y-2">
                  <div className="text-sm text-emerald-500">
                    Image selected:
                  </div>
                  <div className="text-xs text-zinc-400">
                    {files.imageFile.name.slice(0, 20)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                    <Upload className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div className="text-sm text-zinc-400 mb-2">
                    Upload artwork
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-zinc-200"
                  >
                    Choose File
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Instrumental Audio upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Instrumental File (Required)
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => instrumentalInputRef.current?.click()}
                className="w-full text-zinc-200"
              >
                {files.instrumentalFile
                  ? files.instrumentalFile.name.slice(0, 20)
                  : "Choose Instrumental File"}
              </Button>
              <input
                type="file"
                accept="audio/*"
                ref={instrumentalInputRef}
                hidden
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    instrumentalFile: e.target.files![0],
                  }))
                }
              />
            </div>
          </div>

          {/* Vocals Audio upload (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Vocals File (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => vocalsInputRef.current?.click()}
                className="w-full text-zinc-200"
              >
                {files.vocalsFile
                  ? files.vocalsFile.name.slice(0, 20)
                  : "Choose Vocals File (Optional)"}
              </Button>
              <input
                type="file"
                accept="audio/*"
                ref={vocalsInputRef}
                hidden
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    vocalsFile: e.target.files![0],
                  }))
                }
              />
              {files.vocalsFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setFiles((prev) => ({ ...prev, vocalsFile: null }))
                  }
                  className="text-red-500 hover:bg-red-900"
                >
                  X
                </Button>
              )}
            </div>
          </div>

          {/* Other fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Title</label>
            <Input
              value={newSong.title}
              onChange={(e) =>
                setNewSong({ ...newSong, title: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-400"
              placeholder="Enter song title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Artists</label>
            <MultiSelect
              defaultValue={selectedArtistIds}
              onValueChange={setSelectedArtistIds}
              options={artists.map((artist) => ({
                label: artist.name,
                value: artist._id,
              }))}
              placeholder="Select artists"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Release Year
            </label>
            <Input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={newSong.releaseYear}
              onChange={(e) =>
                setNewSong({
                  ...newSong,
                  releaseYear: parseInt(e.target.value),
                })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-400"
              placeholder="Enter release year"
            />
          </div>

          <ScrollArea>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Album (Optional)
              </label>
              <Select
                value={newSong.album}
                onValueChange={(value) =>
                  setNewSong({ ...newSong, album: value })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue
                    placeholder="Select album"
                    className="text-zinc-400"
                  />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No Album (Single)</SelectItem>
                  {albums.map((album) => (
                    <SelectItem key={album._id} value={album._id}>
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSongDialogOpen(false);
              setNewSong({
                title: "",
                artistIds: [],
                album: "",
                releaseYear: new Date().getFullYear(),
              });
              setSelectedArtistIds([]);
              // ИЗМЕНЕНИЕ ЗДЕСЬ: Сброс всех файлов
              setFiles({
                instrumentalFile: null,
                vocalsFile: null,
                imageFile: null,
              });
            }}
            disabled={isLoading}
            className="text-zinc-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !newSong.title ||
              selectedArtistIds.length === 0 ||
              !files.instrumentalFile || // <-- ИЗМЕНЕНО
              !files.imageFile
            }
          >
            {isLoading ? "Uploading..." : "Add Song"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AddSongDialog;
