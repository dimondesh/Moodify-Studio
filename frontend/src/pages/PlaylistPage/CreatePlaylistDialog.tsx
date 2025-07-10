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
import { Playlist } from "../../types"; // Ensure the Playlist type is imported

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Playlist | null; // Optional prop for editing an existing playlist
  onSuccess?: () => void; // Callback after successful creation/update
}

export const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  ); // Fixed: ensure description is a string
  const [isPublic, setIsPublic] = useState(initialData?.isPublic || false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.imageUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPlaylist, updatePlaylist, isLoading } = usePlaylistStore(); // Use isLoading from the store for general indication

  useEffect(() => {
    // Reset form and update initial data when the dialog opens or initialData changes
    if (initialData) {
      setTitle(initialData.title || ""); // Added || "" for safety, although title is usually required
      setDescription(initialData.description || ""); // FIXED: Safe access to description
      setIsPublic(initialData.isPublic);
      setImagePreviewUrl(initialData.imageUrl || null);
      setImageFile(null); // Clear file input when editing an existing playlist
    } else {
      // Clear form for creation mode
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
      setImagePreviewUrl(URL.createObjectURL(file)); // Create a URL for preview
    } else {
      setImageFile(null);
      setImagePreviewUrl(initialData?.imageUrl || null); // Revert to initial image if cleared
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
        // Editing an existing playlist
        await updatePlaylist(
          initialData._id,
          title,
          description,
          isPublic,
          imageFile
        );
        toast.success("Playlist updated successfully!");
      } else {
        // Creating a new playlist
        await createPlaylist(title, description, isPublic, imageFile);
        toast.success("Playlist created successfully!");
      }
      onClose(); // Close the dialog on success
      if (onSuccess) {
        onSuccess(); // Call the success callback
      }
    } catch (error) {
      // Error handling is already present in usePlaylistStore with toast
      console.error("Playlist operation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = initialData ? "Edit Playlist" : "Create New Playlist";
  const submitButtonText = initialData ? "Save Changes" : "Create Playlist";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {initialData
              ? "Make changes to your playlist."
              : "Enter details for your new playlist."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-white">
              Title
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
              Description
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
              Public
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
              Cover
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
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isSubmitting
                ? initialData
                  ? "Saving..."
                  : "Creating..."
                : submitButtonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
