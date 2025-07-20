// frontend/src/pages/AdminPage/EditSongDialog.tsx
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
import { Pencil, Upload, XCircle } from "lucide-react";
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
import { Textarea } from "../../components/ui/textarea";
import { Song, Artist } from "../../types";

// frontend/src/pages/AdminPage/EditSongDialog.tsx
import { memo } from "react"; // <-- ДОБАВЬТЕ ЭТОТ ИМПОРТ

// ... (остальные импорты) ...

interface EditSongDialogProps {
  song: Song;
}

// Переименуем основной компонент для ясности, чтобы обернуть его в memo
const EditSongDialogComponent = ({ song }: EditSongDialogProps) => {
  const { albums, artists, fetchAlbums, fetchArtists, fetchSongs } =
    useMusicStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация состояния на основе props.song
  const [currentSongData, setCurrentSongData] = useState({
    title: song.title,
    albumId: song.albumId || "none",
    lyrics: song.lyrics || "",
  });

  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    song.artist.map((artist: Artist | string) =>
      typeof artist === "object" && artist !== null
        ? artist._id
        : String(artist)
    )
  );

  const [files, setFiles] = useState<{
    instrumentalFile: File | null;
    vocalsFile: File | null;
    imageFile: File | null;
  }>({
    instrumentalFile: null,
    vocalsFile: null,
    imageFile: null,
  });

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    song.imageUrl
  );
  const [previewInstrumentalUrl, setPreviewInstrumentalUrl] = useState<
    string | null
  >(song.instrumentalUrl);
  const [previewVocalsUrl, setPreviewVocalsUrl] = useState<string | null>(
    song.vocalsUrl || null
  );
  const [clearVocals, setClearVocals] = useState(false);

  const instrumentalInputRef = useRef<HTMLInputElement>(null);
  const vocalsInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Логирование монтирования/размонтирования
  useEffect(() => {
    console.log(`[${song._id}] EditSongDialog MOUNTED`);
    return () => {
      console.log(`[${song._id}] EditSongDialog UNMOUNTED`);
    };
  }, []);

  useEffect(() => {
    console.log(`[${song._id}] Dialog open state changed:`, dialogOpen);

    if (dialogOpen) {
      fetchArtists();
      fetchAlbums();
      // Сброс и инициализация при каждом открытии
      setCurrentSongData({
        title: song.title,
        albumId: song.albumId || "none",
        lyrics: song.lyrics || "",
      });
      setSelectedArtistIds(
        song.artist.map((artist: Artist | string) =>
          typeof artist === "object" && artist !== null
            ? artist._id
            : String(artist)
        )
      );
      setFiles({
        instrumentalFile: null,
        vocalsFile: null,
        imageFile: null,
      });
      setPreviewImageUrl(song.imageUrl);
      setPreviewInstrumentalUrl(song.instrumentalUrl);
      setPreviewVocalsUrl(song.vocalsUrl || null);
      setClearVocals(false);
    }
  }, [dialogOpen, fetchArtists, fetchAlbums, song]); // <-- song ДОБАВЛЕН ОБРАТНО В ЗАВИСИМОСТИ

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "instrumental" | "vocals" | "image"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [`${type}File`]: file }));
      if (type === "image") {
        setPreviewImageUrl(URL.createObjectURL(file));
      } else if (type === "instrumental") {
        setPreviewInstrumentalUrl(URL.createObjectURL(file));
      } else if (type === "vocals") {
        setPreviewVocalsUrl(URL.createObjectURL(file));
        setClearVocals(false);
      }
    }
  };

  const handleClearVocals = () => {
    setFiles((prev) => ({ ...prev, vocalsFile: null }));
    setPreviewVocalsUrl(null);
    setClearVocals(true);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!currentSongData.title.trim()) {
        return toast.error("Song title cannot be empty.");
      }
      if (selectedArtistIds.length === 0) {
        return toast.error("Please select at least one artist.");
      }
      if (!isAlbumSelected && !previewImageUrl && !files.imageFile) {
        return toast.error(
          "Please upload an image file for the single or select an album."
        );
      }
      if (!previewInstrumentalUrl && !files.instrumentalFile) {
        return toast.error("Please upload an instrumental audio file.");
      }

      const formData = new FormData();
      formData.append("title", currentSongData.title);
      formData.append("artistIds", JSON.stringify(selectedArtistIds));
      formData.append("lyrics", currentSongData.lyrics || "");

      if (currentSongData.albumId && currentSongData.albumId !== "none") {
        formData.append("albumId", currentSongData.albumId);
      } else {
        formData.append("albumId", "");
      }

      if (files.instrumentalFile) {
        formData.append("instrumentalFile", files.instrumentalFile);
      }
      if (files.vocalsFile) {
        formData.append("vocalsFile", files.vocalsFile);
      } else if (clearVocals) {
        formData.append("clearVocals", "true");
      }
      if (files.imageFile) {
        formData.append("imageFile", files.imageFile);
      }

      await axiosInstance.put(`/admin/songs/${song._id}`, formData);

      setDialogOpen(false);
      toast.success("Song updated successfully!");
      fetchSongs();
    } catch (error: any) {
      toast.error(
        "Failed to update song: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isAlbumSelected =
    currentSongData.albumId && currentSongData.albumId !== "none";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-zinc-900 border-zinc-700 max-h-[80vh] overflow-auto text-zinc-200 no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Song</DialogTitle>
          <DialogDescription>
            Modify details of the song "{song.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image upload area */}
          <div
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer ${
              !isAlbumSelected && !previewImageUrl && !files.imageFile
                ? "border-red-500"
                : "border-zinc-700"
            }`}
            onClick={() => imageInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              hidden
              onChange={(e) => handleFileSelect(e, "image")}
            />
            <div className="text-center">
              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt="Song Artwork Preview"
                  className="w-24 h-24 object-cover rounded-md mb-3"
                />
              )}
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {files.imageFile
                  ? files.imageFile.name
                  : previewImageUrl
                  ? "Click to change artwork"
                  : `Upload artwork ${!isAlbumSelected ? "(Required)" : ""}`}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Choose New File
              </Button>
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
                  ? files.instrumentalFile.name
                  : previewInstrumentalUrl
                  ? "Change Instrumental File"
                  : "Choose Instrumental File"}
              </Button>
              <input
                type="file"
                accept="audio/*"
                ref={instrumentalInputRef}
                hidden
                onChange={(e) => handleFileSelect(e, "instrumental")}
              />
            </div>
            {previewInstrumentalUrl && !files.instrumentalFile && (
              <p className="text-xs text-zinc-500">
                Current:{" "}
                {previewInstrumentalUrl.substring(
                  previewInstrumentalUrl.lastIndexOf("/") + 1
                )}
              </p>
            )}
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
                  ? files.vocalsFile.name
                  : previewVocalsUrl
                  ? "Change Vocals File"
                  : "Choose Vocals File (Optional)"}
              </Button>
              <input
                type="file"
                accept="audio/*"
                ref={vocalsInputRef}
                hidden
                onChange={(e) => handleFileSelect(e, "vocals")}
              />
              {(previewVocalsUrl || files.vocalsFile) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearVocals}
                  className="text-red-500 hover:bg-red-900"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              )}
            </div>
            {previewVocalsUrl && !files.vocalsFile && !clearVocals && (
              <p className="text-xs text-zinc-500">
                Current:{" "}
                {previewVocalsUrl.substring(
                  previewVocalsUrl.lastIndexOf("/") + 1
                )}
              </p>
            )}
          </div>

          {/* Other fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Title</label>
            <Input
              value={currentSongData.title}
              onChange={(e) =>
                setCurrentSongData({
                  ...currentSongData,
                  title: e.target.value,
                })
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

          <ScrollArea className="max-h-[150px]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Album (Optional)
              </label>
              <Select
                value={currentSongData.albumId}
                onValueChange={(value) =>
                  setCurrentSongData({ ...currentSongData, albumId: value })
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

          {/* Lyrics (LRC Format) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Lyrics (LRC Format, Optional)
            </label>
            <Textarea
              value={currentSongData.lyrics}
              onChange={(e) =>
                setCurrentSongData({
                  ...currentSongData,
                  lyrics: e.target.value,
                })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-400 h-32"
              placeholder="Paste lyrics in LRC format here, e.g., [00:01.23]Line 1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isLoading}
            className="text-zinc-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !currentSongData.title.trim() ||
              selectedArtistIds.length === 0 ||
              (!previewInstrumentalUrl && !files.instrumentalFile) ||
              (!isAlbumSelected && !previewImageUrl && !files.imageFile)
            }
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Оберните компонент в React.memo
const EditSongDialog = memo(EditSongDialogComponent);

export default EditSongDialog;
