// frontend/src/pages/AdminPage/AddAlbumDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Upload } from "lucide-react";
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
import { useTranslation } from "react-i18next";

const AddAlbumDialog = () => {
  const { t } = useTranslation();
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { artists, fetchArtists, fetchAlbums } = useMusicStore();
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [newAlbum, setNewAlbum] = useState({
    title: "",
    releaseYear: new Date().getFullYear(),
    type: "Album",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (albumDialogOpen) {
      fetchArtists();
    }
  }, [albumDialogOpen, fetchArtists]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!imageFile) {
        return toast.error("Please upload an image for the album.");
      }
      if (selectedArtistIds.length === 0) {
        return toast.error("Please select at least one artist.");
      }
      const formData = new FormData();
      formData.append("title", newAlbum.title);
      formData.append("artistIds", JSON.stringify(selectedArtistIds));
      formData.append("releaseYear", newAlbum.releaseYear.toString());
      formData.append("type", newAlbum.type);
      formData.append("imageFile", imageFile);
      await axiosInstance.post("/admin/albums", formData);
      setNewAlbum({
        title: "",
        releaseYear: new Date().getFullYear(),
        type: "Album",
      });
      setSelectedArtistIds([]);
      setImageFile(null);
      setAlbumDialogOpen(false);
      toast.success("Album created successfully!");
      fetchAlbums();
    } catch (error: any) {
      toast.error(
        "Failed to create album: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-violet-500 hover:bg-violet-600 text-white">
          <Plus className="mr-0 md:mr-2 h-4 w-4" />
          <p className="hidden md:inline"> {t("admin.albums.add")}</p>{" "}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">
            {t("admin.albums.addDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.albums.addDialogDesc")}
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
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {imageFile ? imageFile.name : t("admin.albums.uploadArtwork")}
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
              value={newAlbum.title}
              onChange={(e) =>
                setNewAlbum({ ...newAlbum, title: e.target.value })
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
              value={newAlbum.releaseYear}
              onChange={(e) =>
                setNewAlbum({
                  ...newAlbum,
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
              value={newAlbum.type}
              onValueChange={(value) =>
                setNewAlbum({ ...newAlbum, type: value })
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
            onClick={() => setAlbumDialogOpen(false)}
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
              !imageFile ||
              !newAlbum.title ||
              selectedArtistIds.length === 0
            }
          >
            {isLoading ? t("admin.common.creating") : t("admin.albums.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AddAlbumDialog;
