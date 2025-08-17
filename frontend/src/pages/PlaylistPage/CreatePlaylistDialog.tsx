// frontend/src/pages/PlaylistPage/CreatePlaylistDialog.tsx

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import toast from "react-hot-toast";
import { Playlist } from "../../types";
import { useTranslation } from "react-i18next";

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Playlist | null;
  onSuccess?: () => void;
}

export const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.imageUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createPlaylist, updatePlaylist, isLoading } = usePlaylistStore();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setIsPublic(initialData.isPublic);
      setImagePreviewUrl(initialData.imageUrl || null);
      setImageFile(null);
    } else {
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [initialData, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreviewUrl(initialData?.imageUrl || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!title.trim()) {
      toast.error("Playlist title cannot be empty.");
      setIsSubmitting(false);
      return;
    }
    try {
      if (initialData) {
        await updatePlaylist(
          initialData._id,
          title,
          description,
          isPublic,
          imageFile
        );
        toast.success("Playlist updated successfully!");
      } else {
        await createPlaylist(title, description, isPublic, imageFile);
        toast.success("Playlist created successfully!");
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Playlist operation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = initialData
    ? t("pages.playlist.editDialog.title")
    : t("pages.playlist.createDialog.title");
  const dialogDescription = initialData
    ? t("pages.playlist.editDialog.description")
    : t("pages.playlist.createDialog.description");
  const submitButtonText = initialData
    ? t("pages.playlist.editDialog.save")
    : t("pages.playlist.createDialog.buttonText");
  const submittingText = initialData
    ? t("admin.common.saving")
    : t("admin.common.creating");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-700  z-[120]">
        <DialogHeader className="z-100">
          <DialogTitle className="text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-white">
              {t("pages.playlist.editDialog.fieldTitle")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 focus:ring-green-500"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-white">
              {t("pages.playlist.editDialog.fieldDescription")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 focus:ring-green-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPublic" className="text-right text-white">
              {t("pages.playlist.editDialog.fieldPublic")}
            </Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right text-white">
              {t("pages.playlist.editDialog.fieldCover")}
            </Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="col-span-3 bg-zinc-800 text-white border-zinc-700 file:text-white file:bg-zinc-700 file:border-none hover:file:bg-zinc-600"
            />
          </div>
          {imagePreviewUrl && (
            <div className="flex justify-center">
              <img
                src={imagePreviewUrl}
                alt="Cover preview"
                className="max-w-[150px] max-h-[150px] rounded-md object-cover"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
            >
              {t("admin.common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isSubmitting ? submittingText : submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
