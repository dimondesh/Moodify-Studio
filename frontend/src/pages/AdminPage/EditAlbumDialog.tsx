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
import { Album, Artist } from "../../types"; // Импортируем типы Album и Artist

interface EditAlbumDialogProps {
  album: Album; // Принимаем объект альбома для редактирования
}

const EditAlbumDialog = ({ album }: EditAlbumDialogProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { artists, fetchArtists, fetchAlbums } = useMusicStore();

  // Инициализируем состояние формы данными текущего альбома
  const [currentAlbumData, setCurrentAlbumData] = useState({
    title: album.title,
    releaseYear: album.releaseYear,
    type: album.type,
  });

  // Инициализируем выбранных артистов из данных альбома
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
  ); // Для предпросмотра текущей/новой картинки

  useEffect(() => {
    if (dialogOpen) {
      fetchArtists(); // Загружаем список артистов при открытии диалога
      // Обновляем состояние, если альбом изменился снаружи или при повторном открытии
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
      setImageFile(null); // Сбрасываем выбранный файл при открытии
    }
  }, [dialogOpen, fetchArtists, album]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file)); // Создаем URL для предпросмотра
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
      formData.append("artistIds", JSON.stringify(selectedArtistIds)); // Отправляем как JSON-строку
      formData.append("releaseYear", currentAlbumData.releaseYear.toString());
      formData.append("type", currentAlbumData.type);
      if (imageFile) {
        formData.append("imageFile", imageFile); // Добавляем файл только если он выбран
      }

      await axiosInstance.put(`/admin/albums/${album._id}`, formData);

      setDialogOpen(false);
      toast.success("Album updated successfully!");
      fetchAlbums(); // Обновляем список альбомов после успешного изменения
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
          <DialogTitle className="text-zinc-200">Edit Album</DialogTitle>
          <DialogDescription>
            Modify details of the album "{album.title}"
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
                {imageFile ? imageFile.name : "Click to change album artwork"}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Choose New File
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Album Title</label>
            <Input
              value={currentAlbumData.title}
              onChange={(e) =>
                setCurrentAlbumData({
                  ...currentAlbumData,
                  title: e.target.value,
                })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder="Enter album title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Artists</label>
            <MultiSelect
              // defaultValue должен быть массивом ID
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
            <label className="text-sm font-medium">Release Year</label>
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
              placeholder="Enter release year"
              min={1900}
              max={new Date().getFullYear()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
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
                <SelectItem value="Album">Album</SelectItem>
                <SelectItem value="EP">EP</SelectItem>
                <SelectItem value="Single">Single</SelectItem>
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
            Cancel
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
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAlbumDialog;
