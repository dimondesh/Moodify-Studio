// frontend/src/components/playlists/AddSongToPlaylistDialog.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { Song } from "@/types";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";

interface AddSongToPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  songToAdd: Song | null;
}

export const AddSongToPlaylistDialog: React.FC<
  AddSongToPlaylistDialogProps
> = ({ isOpen, onClose, songToAdd }) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");

  const { myPlaylists, fetchMyPlaylists, addSongToPlaylist, isLoading } =
    usePlaylistStore();

  useEffect(() => {
    if (isOpen) {
      fetchMyPlaylists();
      setSelectedPlaylistId("");
    }
  }, [isOpen, fetchMyPlaylists]);

  const handleSubmit = useCallback(async () => {
    if (!songToAdd) {
      toast.error("No song selected to add.");
      return;
    }
    if (!selectedPlaylistId) {
      toast.error("Please select a playlist.");
      return;
    }

    try {
      await addSongToPlaylist(selectedPlaylistId, songToAdd._id);
      onClose();
    } catch (error) {
      console.error("Error adding song to playlist in dialog:", error);
    }
  }, [songToAdd, selectedPlaylistId, addSongToPlaylist, onClose]);

  const handleClose = useCallback(() => {
    setSelectedPlaylistId("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Song to Playlist</DialogTitle>
          <DialogDescription>
            Select a playlist to add "{songToAdd?.title}" to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold">Song:</h4>
            <p className="text-sm text-gray-500">
              {songToAdd ? `${songToAdd.title} by ${songToAdd.artist}` : "N/A"}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="playlist-select">Select Playlist</Label>
            <Select
              onValueChange={setSelectedPlaylistId}
              value={selectedPlaylistId}
              disabled={isLoading || myPlaylists.length === 0}
            >
              <SelectTrigger id="playlist-select">
                <SelectValue placeholder="Select a playlist" />
              </SelectTrigger>
              <SelectContent>
                {myPlaylists.length === 0 ? (
                  <div className="p-2 text-center text-sm text-gray-500">
                    No playlists available.
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    {myPlaylists.map((playlist) => (
                      <SelectItem key={playlist._id} value={playlist._id}>
                        {playlist.title}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                )}
              </SelectContent>
            </Select>
            {myPlaylists.length === 0 && !isLoading && (
              <p className="text-sm text-red-500 mt-1">
                You don't have any playlists yet.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleClose} variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedPlaylistId}
          >
            {isLoading ? "Adding..." : "Add to Playlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
