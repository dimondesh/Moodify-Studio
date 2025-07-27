// frontend/src/pages/AdminPage/EditSongDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "react-hot-toast";
import { useMusicStore } from "../../stores/useMusicStore";
import { useEffect, useRef, useState, memo } from "react";
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
import { Song, Artist, Genre, Mood } from "../../types";
import { useTranslation } from "react-i18next";

interface EditSongDialogProps {
  song: Song;
}

const EditSongDialogComponent = ({ song }: EditSongDialogProps) => {
  const { t } = useTranslation();
  const {
    albums,
    artists,
    fetchAlbums,
    fetchArtists,
    fetchSongs,
    genres,
    moods,
    fetchGenres,
    fetchMoods,
  } = useMusicStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (dialogOpen) {
      fetchArtists();
      fetchAlbums();
      fetchGenres();
      fetchMoods();

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
      setSelectedGenreIds(song.genres.map((genre: Genre) => genre._id));
      setSelectedMoodIds(song.moods.map((mood: Mood) => mood._id));
      setPreviewImageUrl(song.imageUrl);
      setPreviewInstrumentalUrl(song.instrumentalUrl);
      setPreviewVocalsUrl(song.vocalsUrl || null);
      setClearVocals(false);
    }
  }, [dialogOpen, fetchArtists, fetchAlbums, fetchGenres, fetchMoods, song]);

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
      formData.append("genreIds", JSON.stringify(selectedGenreIds));
      formData.append("moodIds", JSON.stringify(selectedMoodIds));

      if (currentSongData.albumId && currentSongData.albumId !== "none") {
        formData.append("albumId", currentSongData.albumId);
      } else {
        formData.append("albumId", "");
      }

      if (files.instrumentalFile)
        formData.append("instrumentalFile", files.instrumentalFile);
      if (files.vocalsFile) formData.append("vocalsFile", files.vocalsFile);
      else if (clearVocals) formData.append("clearVocals", "true");
      if (files.imageFile) formData.append("imageFile", files.imageFile);

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
          <DialogTitle className="text-white">
            {t("admin.songs.editDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.songs.editDialogDesc")} "{song.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                  ? t("admin.albums.changeArtwork")
                  : `${t("admin.songs.uploadArtwork")} ${
                      !isAlbumSelected
                        ? `(${t("admin.songs.artworkRequired")})`
                        : ""
                    }`}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                {t("admin.common.chooseFile")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.instrumentalRequired")}
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
                  ? t("admin.songs.changeInstrumental")
                  : t("admin.songs.chooseInstrumental")}
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
                {t("admin.common.currentFile")}{" "}
                {previewInstrumentalUrl.substring(
                  previewInstrumentalUrl.lastIndexOf("/") + 1
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.vocalsOptional")}
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
                  ? t("admin.songs.changeVocals")
                  : t("admin.songs.chooseVocals")}
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
                {t("admin.common.currentFile")}{" "}
                {previewVocalsUrl.substring(
                  previewVocalsUrl.lastIndexOf("/") + 1
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.fieldTitle")}
            </label>
            <Input
              value={currentSongData.title}
              onChange={(e) =>
                setCurrentSongData({
                  ...currentSongData,
                  title: e.target.value,
                })
              }
              className="bg-zinc-800 border-zinc-700 text-zinc-400"
              placeholder={t("admin.songs.placeholderTitle")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.fieldArtists")}
            </label>
            <MultiSelect
              defaultValue={selectedArtistIds}
              onValueChange={setSelectedArtistIds}
              options={artists.map((artist) => ({
                label: artist.name,
                value: artist._id,
              }))}
              placeholder={t("admin.songs.placeholderArtists")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.fieldGenres")}
            </label>
            <MultiSelect
              defaultValue={selectedGenreIds}
              onValueChange={setSelectedGenreIds}
              options={genres.map((genre) => ({
                label: genre.name,
                value: genre._id,
              }))}
              placeholder={t("admin.songs.placeholderGenres")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.fieldMoods")}
            </label>
            <MultiSelect
              defaultValue={selectedMoodIds}
              onValueChange={setSelectedMoodIds}
              options={moods.map((mood) => ({
                label: mood.name,
                value: mood._id,
              }))}
              placeholder={t("admin.songs.placeholderMoods")}
            />
          </div>

          <ScrollArea className="max-h-[150px]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                {t("admin.songs.fieldAlbumOptional")}
              </label>
              <Select
                value={currentSongData.albumId}
                onValueChange={(value) =>
                  setCurrentSongData({ ...currentSongData, albumId: value })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue
                    placeholder={t("admin.songs.placeholderAlbum")}
                    className="text-zinc-400"
                  />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">
                    {t("admin.songs.noAlbum")}
                  </SelectItem>
                  {albums.map((album) => (
                    <SelectItem key={album._id} value={album._id}>
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ScrollArea>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              {t("admin.songs.fieldLyricsOptional")}
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
              placeholder={t("admin.songs.placeholderLyrics")}
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
            {t("admin.common.cancel")}
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
            {isLoading
              ? t("admin.common.saving")
              : t("admin.common.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditSongDialog = memo(EditSongDialogComponent);
export default EditSongDialog;
