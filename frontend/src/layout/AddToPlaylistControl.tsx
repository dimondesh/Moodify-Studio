/* eslint-disable @typescript-eslint/no-unused-vars */
// src/layout/AddToPlaylistControl.tsx

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Check, Plus, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlaylistStore } from "../stores/usePlaylistStore";
import { Song } from "../types";
import toast from "react-hot-toast";
import { useUIStore } from "../stores/useUIStore";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";

// Хук для определения мобильного устройства
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);
  return matches;
};

interface AddToPlaylistControlProps {
  song: Song | null;
  className?: string;
  iconClassName?: string;
}

export const AddToPlaylistControl: React.FC<AddToPlaylistControlProps> = ({
  song,
  className,
  iconClassName = "h-5 w-5",
}) => {
  const { isSongLiked, toggleSongLike, likedSongs } = useLibraryStore();
  const {
    ownedPlaylists,
    fetchOwnedPlaylists,
    addSongToPlaylist,
    removeSongFromPlaylist,
  } = usePlaylistStore();
  const { openCreatePlaylistDialog } = useUIStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [isOpen, setIsOpen] = useState(false);
  const [songInPlaylists, setSongInPlaylists] = useState<string[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPlaylists = useMemo(
    () =>
      ownedPlaylists.filter((playlist) =>
        playlist.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [ownedPlaylists, searchTerm]
  );

  useEffect(() => {
    if (song) {
      fetchOwnedPlaylists();
    }
  }, [song, fetchOwnedPlaylists]);

  useEffect(() => {
    if (song) {
      const liked = isSongLiked(song._id);
      const playlistsWithSong = ownedPlaylists
        .filter((p) => p.songs.some((s) => s._id === song._id))
        .map((p) => p._id);

      setIsLiked(liked);
      setSongInPlaylists(playlistsWithSong);
    }
  }, [song, ownedPlaylists, likedSongs, isSongLiked]);

  if (!song) return null;

  const isAdded = isLiked || songInPlaylists.length > 0;

  const handleInitialAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdded) {
      await toggleSongLike(song._id);
      toast.success("Added to Liked Songs");
    }
  };

  const handlePlaylistToggle = async (
    playlistId: string,
    shouldBeInPlaylist: boolean
  ) => {
    try {
      if (shouldBeInPlaylist) {
        await addSongToPlaylist(playlistId, song._id);
        toast.success(`Added to playlist`);
      } else {
        await removeSongFromPlaylist(playlistId, song._id);
        toast.success(`Removed from playlist`);
      }
    } catch (e) {
      toast.error("Could not update playlist.");
    }
  };

  const handleLikeToggle = async (shouldBeLiked: boolean) => {
    if (isLiked !== shouldBeLiked) {
      await toggleSongLike(song._id);
      toast.success(
        shouldBeLiked ? "Added to Liked Songs" : "Removed from Liked Songs"
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isAdded) {
      setIsOpen(open);
      if (!open) {
        setSearchTerm("");
      }
    }
  };

  const CheckboxItem = ({
    checked,
    onCheckedChange,
    imageUrl,
    title,
    subtitle,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    imageUrl?: string;
    title: string;
    subtitle?: string;
  }) => (
    <div
      className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-700 cursor-pointer"
      onClick={() => onCheckedChange(!checked)}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
          checked
            ? "bg-violet-500 border-violet-500"
            : "border-zinc-500 group-hover:border-white"
        )}
      >
        {checked && <Check className="w-4 h-4 text-white" />}
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-12 h-12 object-cover rounded-md"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>
    </div>
  );

  const Content = () => (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Find a playlist"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-zinc-700/80 border-zinc-600 pl-9"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <ScrollArea className="max-h-[300px] pr-3">
        <div className="space-y-1">
          <CheckboxItem
            checked={isLiked}
            onCheckedChange={handleLikeToggle}
            imageUrl="/liked.png"
            title="Liked Songs"
          />
          {filteredPlaylists.map((playlist) => (
            <CheckboxItem
              key={playlist._id}
              checked={songInPlaylists.includes(playlist._id)}
              onCheckedChange={(checked) =>
                handlePlaylistToggle(playlist._id, checked)
              }
              imageUrl={playlist.imageUrl}
              title={playlist.title}
              subtitle={`${playlist.songs.length} songs`}
            />
          ))}
        </div>
      </ScrollArea>

      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          setIsOpen(false);
          openCreatePlaylistDialog();
        }}
      >
        <Plus className="mr-2 h-5 w-5" /> New playlist
      </Button>
    </div>
  );

  const TriggerButton = (
    <Button
      size="icon"
      variant="ghost"
      className={cn(
        "hover:text-white",
        isAdded ? "text-violet-500" : "text-zinc-400",
        className
      )}
      onClick={handleInitialAdd}
      title={isAdded ? "Add to playlist" : "Save to Your Library"}
    >
      {isAdded ? (
        <Check className={cn(iconClassName)} />
      ) : (
        <Plus className={cn(iconClassName)} />
      )}
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={isAdded && isOpen} onOpenChange={handleOpenChange}>
          <SheetTrigger asChild>{TriggerButton}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-zinc-900 border-zinc-800 text-white rounded-t-2xl h-[85vh] z-100"
          >
            <SheetHeader className="text-center mb-4">
              <SheetTitle>Add to playlist</SheetTitle>
            </SheetHeader>
            <Content />
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full mt-4 bg-zinc-700 hover:bg-zinc-600"
            >
              Done
            </Button>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={isAdded && isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-80 bg-zinc-800 border-zinc-700 text-white p-4"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Content />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};
