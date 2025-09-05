// frontend/src/pages/HomePage/HorizontalSection.tsx

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
import HorizontalSectionSkeleton from "./HorizontalSectionSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TFunction } from "i18next";

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
  t: TFunction;
}

const HorizontalSection: React.FC<HorizontalSectionProps> = ({
  title,
  items,
  isLoading,
  onShowAll,
  limit = 6,
  t,
}) => {
  const navigate = useNavigate();
  const { artists: allArtists } = useMusicStore();

  if (isLoading) {
    return <HorizontalSectionSkeleton />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  const itemsToShow = items.slice(0, limit);
  const canShowAll = onShowAll && items.length > limit;

  // --- ИЗМЕНЕНИЕ НАЧАЛО: Фильтруем только песни для очереди ---
  const songsOnly = items.filter(
    (item): item is Song & { itemType: "song" } => item.itemType === "song"
  );
  // --- ИЗМЕНЕНИЕ КОНЕЦ ---

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
        return `${t(
          `sidebar.subtitle.${(item as Album).type}`
        )} • ${getArtistNames((item as Album).artist, allArtists)}`;
      case "playlist":
        return t("sidebar.subtitle.byUser", {
          name:
            (item as Playlist).owner?.fullName || t("sidebar.subtitle.user"),
        });
      case "generated-playlist":
        return `${t("sidebar.subtitle.playlist")} • Moodify`;
      case "mix":
        return t("sidebar.subtitle.dailyMix");
      case "artist":
        return t("sidebar.subtitle.artist");
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
            {t("searchpage.showAll")}
          </Button>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex space-x-4 pb-4">
          {itemsToShow.map((item) => {
            if (item.itemType === "mix") {
              return (
                <div
                  key={`${item.itemType}-${item._id}`}
                  onClick={() => handleItemClick(item)}
                  className="group relative cursor-pointer overflow-hidden rounded-md bg-zinc-800/60 hover:bg-zinc-700/80 transition-all w-40 sm:w-48 flex-shrink-0"
                >
                  <img
                    src={item.imageUrl}
                    alt={getDisplayTitle(item)}
                    className="w-full h-full object-cover aspect-square transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-end justify-start p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                    <h3 className="text-white text-lg font-bold drop-shadow-lg break-words whitespace-normal leading-tight">
                      {getDisplayTitle(item)}
                    </h3>
                  </div>
                </div>
              );
            }
            const songIndex =
              item.itemType === "song"
                ? songsOnly.findIndex((s) => s._id === item._id)
                : -1;
            return (
              <div
                key={`${item.itemType}-${item._id}`}
                className="bg-transparent p-4 rounded-md hover:bg-zinc-700/40 transition-all group cursor-pointer w-40 sm:w-48 flex-shrink-0"
                onClick={() => handleItemClick(item)}
              >
                <div className="relative mb-4">
                  <div className="relative aspect-square shadow-lg">
                    {item.itemType === "artist" ? (
                      <Avatar className="absolute inset-0 h-full w-full rounded-full">
                        <AvatarImage
                          src={
                            item.imageUrl ||
                            "https://moodify.b-cdn.net/artist.jpeg"
                          }
                          alt={getDisplayTitle(item)}
                          className="object-cover h-full w-full rounded-full transition-transform duration-300 group-hover:scale-105"
                        />
                        <AvatarFallback>
                          {getDisplayTitle(item)[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <img
                        src={
                          item.imageUrl ||
                          "https://moodify.b-cdn.net/default-album-cover.png"
                        }
                        alt={getDisplayTitle(item)}
                        className="absolute inset-0 h-full w-full object-cover rounded-md transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  {item.itemType === "song" && (
                    <PlayButton
                      song={item as Song}
                      songs={songsOnly}
                      songIndex={songIndex}
                    />
                  )}
                </div>
                <h3 className="font-medium truncate">
                  {getDisplayTitle(item)}
                </h3>
                <p className="text-sm text-zinc-400 truncate">
                  {getSubtitle(item)}
                </p>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </div>
  );
};

export default HorizontalSection;
