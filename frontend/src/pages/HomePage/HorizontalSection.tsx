// src/pages/HomePage/HorizontalSection.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ScrollArea, ScrollBar } from "../../components/ui/scroll-area";
import PlayButton from "./PlayButton";
import { getArtistNames } from "../../lib/utils";
import { useMusicStore } from "../../stores/useMusicStore";
import type {
  Song,
  Album,
  Playlist,
  Mix,
  Artist,
  GeneratedPlaylist,
} from "../../types";
import { useTranslation } from "react-i18next";
import HorizontalSectionSkeleton from "./HorizontalSectionSkeleton";

type DisplayItem =
  | (Song & { itemType: "song" })
  | (Album & { itemType: "album" })
  | (Playlist & { itemType: "playlist" })
  | (Mix & { itemType: "mix" })
  | (Artist & { itemType: "artist" })
  | (GeneratedPlaylist & { itemType: "generated-playlist" });

interface HorizontalSectionProps {
  title: string;
  items: DisplayItem[];
  isLoading: boolean;
  onShowAll?: () => void;
  limit?: number;
}

const HorizontalSection: React.FC<HorizontalSectionProps> = ({
  title,
  items,
  isLoading,
  onShowAll,
  limit = 16,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { artists: allArtists } = useMusicStore();

  if (isLoading) {
    return <HorizontalSectionSkeleton />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  const itemsToShow = items.slice(0, limit);
  const canShowAll = onShowAll && items.length > limit;

  const handleItemClick = (item: DisplayItem) => {
    switch (item.itemType) {
      case "song":
        navigate(`/albums/${(item as Song).albumId}`);
        break;
      case "album":
        navigate(`/albums/${item._id}`);
        break;
      case "playlist":
        navigate(`/playlists/${item._id}`);
        break;
      case "generated-playlist":
        navigate(`/generated-playlists/${item._id}`);
        break;
      case "mix":
        navigate(`/mixes/${item._id}`);
        break;
      case "artist":
        navigate(`/artists/${item._id}`);
        break;
    }
  };

  const getDisplayTitle = (item: DisplayItem): string => {
    if (item.itemType === "artist") return item.name;
    if (item.itemType === "mix") return t(item.name);
    if (item.itemType === "generated-playlist") return t(item.nameKey);
    return item.title;
  };

  const getSubtitle = (item: DisplayItem): string => {
    switch (item.itemType) {
      case "song":
        return getArtistNames((item as Song).artist, allArtists);
      case "album":
        return getArtistNames((item as Album).artist, allArtists);
      case "playlist":
        return `By ${(item as Playlist).owner?.fullName || "user"}`;
      case "generated-playlist":
        return "Playlist • Moodify";
      case "mix":
        return "Daily Mix";
      case "artist":
        return "Artist";
      default:
        return "";
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {canShowAll && (
          <Button
            variant="link"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={onShowAll}
          >
            Show all
          </Button>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex space-x-4 pb-4">
          {itemsToShow.map((item) => (
            <div
              key={`${item.itemType}-${item._id}`}
              className="bg-zinc-800/40 p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer w-40 sm:w-48 flex-shrink-0"
              onClick={() => handleItemClick(item)}
            >
              <div className="relative mb-4">
                <div className="aspect-square rounded-md shadow-lg overflow-hidden">
                  <img
                    src={item.imageUrl || "/default-song-cover.png"}
                    alt={getDisplayTitle(item)}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {item.itemType === "song" && <PlayButton song={item as Song} />}
              </div>
              <h3 className="font-medium truncate">{getDisplayTitle(item)}</h3>
              <p className="text-sm text-zinc-400 truncate">
                {getSubtitle(item)}
              </p>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default HorizontalSection;
