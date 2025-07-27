// frontend/src/pages/AdminPage/AddAlbumFromSpotifyDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
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
import { Label } from "../../components/ui/label";
import { useMusicStore } from "../../stores/useMusicStore";
import { useTranslation } from "react-i18next";

const AddAlbumFromSpotifyDialog = () => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [spotifyAlbumUrl, setSpotifyAlbumUrl] = useState("");
  const [albumAudioZip, setAlbumAudioZip] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchAlbums } = useMusicStore();

  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAlbumAudioZip(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!spotifyAlbumUrl)
        return toast.error("Please enter Spotify Album URL.");
      if (!albumAudioZip) return toast.error("Please upload ZIP File.");
      const formData = new FormData();
      formData.append("spotifyAlbumUrl", spotifyAlbumUrl);
      formData.append("albumAudioZip", albumAudioZip);
      await axiosInstance.post("/admin/albums/upload-full-album", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });
      setSpotifyAlbumUrl("");
      setAlbumAudioZip(null);
      setDialogOpen(false);
      toast.success("Album successfully added from Spotify!");
      fetchAlbums();
    } catch (error: any) {
      console.error("Error uploading album from Spotify:", error);
      toast.error(
        "Album wasn't added: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.albums.addFromSpotify")}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">
            {t("admin.albums.addSpotifyTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.albums.addSpotifyDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-zinc-200">
          <div className="space-y-2">
            <Label htmlFor="spotifyUrl">
              {t("admin.albums.fieldSpotifyUrl")}
            </Label>
            <Input
              id="spotifyUrl"
              value={spotifyAlbumUrl}
              onChange={(e) => setSpotifyAlbumUrl(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              placeholder={t("admin.albums.placeholderSpotifyUrl")}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="albumAudioZip">{t("admin.albums.fieldZip")}</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleZipFileSelect}
              accept=".zip"
              className="hidden"
              id="albumAudioZip"
              disabled={isLoading}
            />
            <div
              className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <div className="text-center">
                <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                  <Plus className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="text-sm text-zinc-400 mb-2">
                  {albumAudioZip
                    ? albumAudioZip.name
                    : t("admin.albums.zipPrompt")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isLoading}
                >
                  {t("admin.albums.chooseZip")}
                </Button>
              </div>
            </div>
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
            disabled={isLoading || !spotifyAlbumUrl || !albumAudioZip}
          >
            {isLoading ? t("admin.common.loading") : t("admin.albums.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlbumFromSpotifyDialog;
