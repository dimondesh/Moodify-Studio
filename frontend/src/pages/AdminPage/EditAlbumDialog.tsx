// frontend/src/pages/AdminPage/EditAlbumDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pencil, Upload } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
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
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useMusicStore } from "../../stores/useMusicStore";
import { MultiSelect } from "../../components/ui/multi-select";
import { Album, Artist } from "../../types";
import { useTranslation } from "react-i18next";

interface EditAlbumDialogProps {
  album: Album;
}

const EditAlbumDialog = ({ album }: EditAlbumDialogProps) => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { artists, fetchArtists, fetchAlbums } = useMusicStore();
  const [currentAlbumData, setCurrentAlbumData] = useState({
    title: album.title,
    releaseYear: album.releaseYear,
    type: album.type,
  });
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    album.artist.map((artist: Artist | string) =>
      typeof artist === "object" && artist !== null
        ? artist._id
        : String(artist)
    )
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    album.imageUrl
  );

  useEffect(() => {
    if (dialogOpen) {
      fetchArtists();
      setCurrentAlbumData({
        title: album.title,
        releaseYear: album.releaseYear,
        type: album.type,
      });
      setSelectedArtistIds(
        album.artist.map((artist: Artist | string) =>
          typeof artist === "object" && artist !== null
            ? artist._id
            : String(artist)
        )
      );
      setPreviewImageUrl(album.imageUrl);
      setImageFile(null);
    }
  }, [dialogOpen, fetchArtists, album]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (selectedArtistIds.length === 0) {
        return toast.error("Please select at least one artist.");
      }
      const formData = new FormData();
      formData.append("title", currentAlbumData.title);
      formData.append("artistIds", JSON.stringify(selectedArtistIds));
      formData.append("releaseYear", currentAlbumData.releaseYear.toString());
      formData.append("type", currentAlbumData.type);
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }
      await axiosInstance.put(`/admin/albums/${album._id}`, formData);
      setDialogOpen(false);
      toast.success("Album updated successfully!");
      fetchAlbums();
    } catch (error: any) {
      toast.error(
        "Failed to update album: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

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
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">
            {t("admin.albums.editDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.albums.editDialogDesc")} "{album.title}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-zinc-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <div
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Album Artwork Preview"
                className="w-24 h-24 object-cover rounded-md mb-3"
              />
            )}
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {imageFile ? imageFile.name : t("admin.albums.changeArtwork")}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                {t("admin.common.chooseFile")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("admin.albums.fieldTitle")}
            </label>
            <Input
              value={currentAlbumData.title}
              onChange={(e) =>
                setCurrentAlbumData({
                  ...currentAlbumData,
                  title: e.target.value,
                })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder={t("admin.albums.placeholderTitle")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("admin.albums.fieldArtists")}
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
            <label className="text-sm font-medium">
              {t("admin.albums.fieldReleaseYear")}
            </label>
            <Input
              type="number"
              value={currentAlbumData.releaseYear}
              onChange={(e) =>
                setCurrentAlbumData({
                  ...currentAlbumData,
                  releaseYear: parseInt(e.target.value),
                })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder={t("admin.songs.placeholderReleaseYear")}
              min={1900}
              max={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("admin.albums.fieldType")}
            </label>
            <Select
              value={currentAlbumData.type}
              onValueChange={(value) =>
                setCurrentAlbumData({ ...currentAlbumData, type: value })
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Album">
                  {t("admin.albums.typeAlbum")}
                </SelectItem>
                <SelectItem value="EP">{t("admin.albums.typeEP")}</SelectItem>
                <SelectItem value="Single">
                  {t("admin.albums.typeSingle")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isLoading}
            className="text-zinc-200"
          >
            {t("admin.common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-violet-500 hover:bg-violet-600 text-zinc-200"
            disabled={
              isLoading ||
              !currentAlbumData.title ||
              selectedArtistIds.length === 0
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

export default EditAlbumDialog;
