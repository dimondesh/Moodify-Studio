// frontend/src/components/playlists/EditPlaylistDialog.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; // Ensure you have Textarea
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { Playlist } from "@/types"; // Import Playlist type
import toast from "react-hot-toast";

interface EditPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null; // Current playlist for editing
  onSuccess: () => void; // Add onSuccess prop
}

export const EditPlaylistDialog: React.FC<EditPlaylistDialogProps> = ({
  isOpen,
  onClose,
  playlist,
  onSuccess, // Accept onSuccess
}) => {
  const [title, setTitle] = useState(playlist?.title || "");
  const [description, setDescription] = useState(playlist?.description || "");
  // Use nullish coalescing operator (??) for isPublic to correctly handle undefined/null
  const [isPublic, setIsPublic] = useState(playlist?.isPublic ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    playlist?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updatePlaylist, isLoading } = usePlaylistStore();

  // Update form state when the playlist prop changes
  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic ?? false); // Ensure it handles undefined/null
      setImageFile(null); // Reset selected file when playlist changes
      setImagePreviewUrl(playlist.imageUrl || null);
    } else {
      // Reset form if playlist becomes null (e.g., when creating a new one)
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [playlist]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file)); // For preview
    } else {
      setImageFile(null);
      setImagePreviewUrl(playlist?.imageUrl || null); // Revert to original if file is canceled
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!playlist) {
      toast.error("No playlist selected for editing.");
      return;
    }
    if (!title.trim()) {
      toast.error("Playlist title cannot be empty.");
      return;
    }

    try {
      const updated = await updatePlaylist(
        playlist._id,
        title,
        description,
        isPublic,
        imageFile
      );
      if (updated) {
        toast.success("Playlist updated successfully!");
        onSuccess(); // Call onSuccess to update data in the parent component
        onClose(); // Close the dialog
      }
    } catch (error) {
      // Error is already handled in usePlaylistStore and toast is shown
      console.error("Error updating playlist in dialog:", error);
    }
  }, [
    playlist,
    title,
    description,
    isPublic,
    imageFile,
    updatePlaylist,
    onClose,
    onSuccess, // Add onSuccess to dependencies
  ]);

  const handleClose = useCallback(() => {
    // Reset form state to initial playlist values when closing without saving
    if (playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic ?? false);
      setImageFile(null);
      setImagePreviewUrl(playlist.imageUrl || null);
    } else {
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setImageFile(null);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear file input
    }
    onClose();
  }, [onClose, playlist]);

  if (!playlist) {
    return null; // Do not render the dialog if no playlist is available for editing
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-700">
        {" "}
        {/* Styles added */}
        <DialogHeader>
          <DialogTitle className="text-white">Edit Playlist</DialogTitle>{" "}
          {/* Translation */}
          <DialogDescription className="text-zinc-400">
            {" "}
            {/* Translation */}
            Make changes to your playlist here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right text-white">
              {" "}
              {/* Translation and text color */}
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
              {" "}
              {/* Translation and text color */}
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 min-h-[80px] bg-zinc-800 text-white border-zinc-700 rounded-md p-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="A brief description of the playlist" // Placeholder added
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right text-white">
              {" "}
              {/* Translation and text color */}
              Cover
            </Label>
            <div className="col-span-3">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:text-sm file:font-medium file:cursor-pointer mb-2 bg-zinc-800 text-white border-zinc-700"
                ref={fileInputRef}
              />
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Cover preview" // Translation
                  className="w-24 h-24 object-cover rounded-md mt-2" // Increased margin
                />
              )}
            </div>
          </div>
          {/* FIXED: For Switch, use flex, not grid-cols */}
          <div className="flex items-center justify-between col-span-full mt-2">
            <Label htmlFor="public" className="text-white">
              {" "}
              {/* Translation and text color */}
              Public
            </Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              className="data-[state=checked]:bg-green-500" // Shadcn styles
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          {" "}
          {/* Increased margin */}
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isLoading}
            className="bg-zinc-700 text-white hover:bg-zinc-600 border-none"
          >
            {" "}
            {/* Styles added */}
            Cancel {/* Translation */}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {" "}
            {/* Styles added */}
            {isLoading ? "Saving..." : "Save Changes"} {/* Translation */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
