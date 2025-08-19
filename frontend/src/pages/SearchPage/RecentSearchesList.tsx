/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/pages/SearchPage/RecentSearchesList.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../../stores/useSearchStore";
import { RecentSearchItem } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

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

  const getSubtitle = (item: RecentSearchItem) => {
    let subtitle = t(
      `sidebar.subtitle.${item.itemType.toLowerCase()}` as any,
      item.itemType
    );
    if (
      item.itemType === "Album" &&
      Array.isArray(item.artist) &&
      item.artist.length > 0
    ) {
      subtitle += ` • ${item.artist.map((a: any) => a.name).join(", ")}`;
    } else if (item.itemType === "Playlist" && item.owner) {
      subtitle += ` • ${item.owner.fullName}`;
    }
    return subtitle;
  };

  // 1. Показываем загрузчик, пока идет запрос
  if (isRecentLoading) {
    return (
      <div className="flex justify-center items-center p-4 h-24">
        <Loader2 className="animate-spin text-zinc-400" />
      </div>
    );
  }

  // 2. Показываем сообщение, если запрос завершился и данных нет
  if (recentSearches.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-zinc-500">
        No recent searches.
      </div>
    );
  }

  // 3. Показываем список, если данные есть
  return (
    <div className="p-2 sm:p-0">
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className="font-bold text-white text-lg">Recent searches</h2>
        <Button
          variant="link"
          onClick={clearRecentSearches}
          className="text-sm text-zinc-400 hover:text-white px-2 h-auto"
        >
          Clear
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {recentSearches.map((item) => (
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
                <AvatarFallback>
                  {(item.title || item.name || "M")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {item.itemType === "Mix"
                    ? t(item.name as any)
                    : item.title || item.name}
                </p>
                <p className="text-sm text-zinc-400 capitalize truncate">
                  {getSubtitle(item)}
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
        ))}
      </div>
    </div>
  );
};

export default RecentSearchesList;
