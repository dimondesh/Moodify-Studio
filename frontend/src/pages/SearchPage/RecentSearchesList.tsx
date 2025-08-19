/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/pages/SearchPage/RecentSearchesList.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import { RecentSearchItem, Artist } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area"; // Убедитесь, что импорт на месте

interface RecentSearchesListProps {
  onItemClick?: () => void;
}

const RecentSearchesList: React.FC<RecentSearchesListProps> = ({
  onItemClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    recentSearches,
    isRecentLoading,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  const handleItemClick = (item: RecentSearchItem) => {
    let path = "";
    switch (item.itemType) {
      case "Artist":
        path = `/artists/${item._id}`;
        break;
      case "Album":
        path = `/albums/${item._id}`;
        break;
      case "Playlist":
        path = `/playlists/${item._id}`;
        break;
      case "User":
        path = `/users/${item._id}`;
        break;
      case "Mix":
        path = `/mixes/${item._id}`;
        break;
    }
    if (path) navigate(path);
    if (onItemClick) onItemClick();
  };

  const getDisplayData = (item: any) => {
    const title = String(
      item.isTranslatable ? t(item.title, item.title) : item.title
    );

    const subtitleKey =
      item.itemType === "Mix"
        ? "sidebar.subtitle.dailyMix"
        : `sidebar.subtitle.${item.itemType.toLowerCase()}`;

    let subtitle = String(t(subtitleKey, item.itemType));

    if (
      item.itemType === "Album" &&
      Array.isArray(item.artist) &&
      item.artist.length > 0
    ) {
      subtitle += ` • ${item.artist.map((a: Artist) => a.name).join(", ")}`;
    } else if (item.itemType === "Playlist" && item.owner) {
      subtitle += ` • ${item.owner.fullName}`;
    }

    return { title, subtitle };
  };

  if (isRecentLoading) {
    return (
      <div className="flex justify-center items-center p-4 h-24">
        <Loader2 className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (recentSearches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-zinc-500">
        No recent searches.
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-0 ">
      <div className="flex justify-between items-center mb-2 mt-2 px-2 ">
        <h2 className="font-bold text-white text-lg">Recent searches</h2>
        <Button
          variant="link"
          onClick={clearRecentSearches}
          className="text-sm text-zinc-400 hover:text-white px-2 h-auto"
        >
          Clear
        </Button>
      </div>
      {/* ===== ИЗМЕНЕНИЯ ЗДЕСЬ ===== */}{" "}
      {/* Задаем фиксированную максимальную высоту */}
      <div className="flex flex-col gap-1 pr-1">
        {" "}
        {/* Небольшой отступ для скроллбара */}
        <ScrollArea className="max-h-80 overflow-auto hide-scrollbar">
          {recentSearches.map((item: any) => {
            const { title, subtitle } = getDisplayData(item);
            return (
              <div
                key={item.searchId}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800 group"
              >
                <div
                  className="flex items-center gap-3 flex-grow cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <Avatar
                    className={`w-12 h-12 flex-shrink-0 ${
                      item.itemType === "Artist" || item.itemType === "User"
                        ? "rounded-full"
                        : "rounded-md"
                    }`}
                  >
                    <AvatarImage src={item.imageUrl} />
                    <AvatarFallback>{title[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{title}</p>
                    <p className="text-sm text-zinc-400 capitalize truncate">
                      {subtitle}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => removeRecentSearch(item.searchId)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </div>
  );
};

export default RecentSearchesList;
