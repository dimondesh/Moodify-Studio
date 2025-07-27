// frontend/src/pages/AdminPage/AddArtistDialog.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, Upload } from "lucide-react";
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
import { Textarea } from "../../components/ui/textarea";
import { useMusicStore } from "../../stores/useMusicStore";
import { useTranslation } from "react-i18next";

const AddArtistDialog = () => {
  const { t } = useTranslation();
  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { fetchArtists } = useMusicStore();
  const [newArtist, setNewArtist] = useState({ name: "", bio: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBannerFile(file);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!imageFile) {
        toast.error("Please upload an image for the artist.");
        setIsLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append("name", newArtist.name);
      formData.append("bio", newArtist.bio);
      formData.append("imageFile", imageFile);
      if (bannerFile) formData.append("bannerFile", bannerFile);
      await axiosInstance.post("/admin/artists", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewArtist({ name: "", bio: "" });
      setImageFile(null);
      setBannerFile(null);
      setArtistDialogOpen(false);
      toast.success("Artist created successfully!");
      fetchArtists();
    } catch (error: any) {
      toast.error(
        "Failed to create artist: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={artistDialogOpen} onOpenChange={setArtistDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.artists.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">
            {t("admin.artists.addDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.artists.addDialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-zinc-200">
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <div
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => imageInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {imageFile
                  ? imageFile.name
                  : t("admin.artists.uploadImageRequired")}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                {t("admin.artists.chooseImage")}
              </Button>
            </div>
          </div>
          <input
            type="file"
            ref={bannerInputRef}
            onChange={handleBannerSelect}
            accept="image/*"
            className="hidden"
          />
          <div
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => bannerInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {bannerFile
                  ? bannerFile.name
                  : t("admin.artists.uploadBannerOptional")}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                {t("admin.artists.chooseBanner")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("admin.artists.fieldName")}
            </label>
            <Input
              value={newArtist.name}
              onChange={(e) =>
                setNewArtist({ ...newArtist, name: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder={t("admin.artists.placeholderName")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("admin.artists.fieldBioOptional")}
            </label>
            <Textarea
              value={newArtist.bio}
              onChange={(e) =>
                setNewArtist({ ...newArtist, bio: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 resize-y"
              placeholder={t("admin.artists.placeholderBio")}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setArtistDialogOpen(false)}
            disabled={isLoading}
            className="text-zinc-200"
          >
            {t("admin.common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-orange-500 hover:bg-orange-600 text-zinc-200"
            disabled={isLoading || !imageFile || !newArtist.name}
          >
            {isLoading ? t("admin.common.creating") : t("admin.artists.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddArtistDialog;
